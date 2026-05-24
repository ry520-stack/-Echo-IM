import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './auth.service';
import prisma from '../utils/prisma';
import * as blockService from './block.service';
import { canSendPrivateMessage, canInteractWithUser } from './messagePermission.service';

let io: Server | null = null;

interface OnlineUser {
  socketId: string;
  userId: string;
}

const onlineUsers: OnlineUser[] = [];

async function saveMessage(data: {
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  type: string;
  replyToId?: string;
}) {
  const msg = await prisma.message.create({ data });
  return prisma.message.findUnique({
    where: { id: msg.id },
    include: {
      sender: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true } },
      replyTo: {
        select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
      },
    },
  });
}

export function initSocket(httpServer: HttpServer) {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:8080', 'http://8.140.194.214:8080', 'http://echo-im.cloud', 'https://echo-im.cloud'];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.endsWith('.trycloudflare.com')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = verifyToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;

    const existingIdx = onlineUsers.findIndex(u => u.userId === userId);
    if (existingIdx !== -1) {
      const old = onlineUsers.splice(existingIdx, 1)[0];
      io?.to(old.socketId).emit('force:logout', { message: 'account logged in elsewhere' });
      io?.sockets.sockets.get(old.socketId)?.disconnect(true);
    }

    onlineUsers.push({ socketId: socket.id, userId });
    io?.emit('online:update', { userId, online: true });
    socket.emit('online:list', { userIds: onlineUsers.map(u => u.userId) });

    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});

    socket.join(`user:${userId}`);

    const memberships = await prisma.groupMember.findMany({ where: { userId } });
    memberships.forEach(m => socket.join(`group:${m.groupId}`));

    // --- message:send ---
    socket.on('message:send', async (data: {
      receiverId?: string;
      groupId?: string;
      content: string;
      type?: string;
      replyToId?: string;
    }, ack?: (res: any) => void) => {
      try {
        // 基础校验
        if (!data.content?.trim() && data.type !== 'image' && data.type !== 'voice' && data.type !== 'video') {
          return ack?.({ error: 'EMPTY_MESSAGE', message: '消息内容不能为空' });
        }
        if (data.content && data.content.length > 3000) {
          return ack?.({ error: 'MESSAGE_TOO_LONG', message: '消息内容超出最大限制' });
        }

        // 私聊：统一权限判断
        if (data.receiverId) {
          const perm = await canSendPrivateMessage(userId, data.receiverId);
          if (!perm.ok) {
            return ack?.({ error: perm.code, message: perm.message });
          }

          // 陌生人自动回复（仅当非好友且允许陌生人消息时）
          if (!perm.isFriend) {
            const receiver = await prisma.user.findUnique({
              where: { id: data.receiverId },
              select: { autoReply: true },
            });
            if (receiver?.autoReply) {
              // 30分钟防刷：检查最近一条 Auto 消息
              const recentAuto = await prisma.message.findFirst({
                where: {
                  senderId: data.receiverId,
                  receiverId: userId,
                  content: { startsWith: '[Auto]' },
                  createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
                },
              });
              if (!recentAuto) {
                const autoMsg = await saveMessage({
                  senderId: data.receiverId,
                  receiverId: userId,
                  content: '[Auto] ' + receiver.autoReply,
                  type: 'text',
                });
                if (autoMsg) {
                  io?.to(`user:${userId}`).emit('message:receive', autoMsg);
                }
              }
            }
          }
        }

        // 群聊：校验群成员
        if (data.groupId) {
          const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: data.groupId, userId } },
          });
          if (!membership) {
            return ack?.({ error: 'NOT_MEMBER', message: '你不是该群成员' });
          }
        }

        // 创建消息
        const msg = await saveMessage({
          senderId: userId,
          receiverId: data.receiverId,
          groupId: data.groupId,
          content: data.content,
          type: data.type || 'text',
          replyToId: data.replyToId,
        });

        if (msg) {
          if (data.receiverId) {
            socket.to(`user:${data.receiverId}`).emit('message:receive', msg);
          } else if (data.groupId) {
            socket.to(`group:${data.groupId}`).emit('message:receive', msg);
          }
          ack?.({ ok: true, message: msg });
        }
      } catch (e: any) {
        ack?.({ error: 'INTERNAL_ERROR', message: e.message || 'send failed' });
      }
    });

    // --- typing ---
    socket.on('typing:start', async (data: { receiverId: string }) => {
      const ok = await canInteractWithUser(userId, data.receiverId);
      if (ok) socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: true });
    });
    socket.on('typing:stop', async (data: { receiverId: string }) => {
      const ok = await canInteractWithUser(userId, data.receiverId);
      if (ok) socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: false });
    });

    // --- WebRTC signaling ---
    socket.on('call:request', async (data: { receiverId: string; callerName: string; callerAvatar: string }, ack?: (res: any) => void) => {
      const perm = await canSendPrivateMessage(userId, data.receiverId);
      if (!perm.ok || !perm.isFriend) {
        return ack?.({ ok: false, code: perm.code || 'FRIEND_REQUIRED', message: perm.message || '只有好友才能语音通话' });
      }
      socket.to(`user:${data.receiverId}`).emit('call:invite', {
        senderId: userId, callerName: data.callerName, callerAvatar: data.callerAvatar,
      });
      ack?.({ ok: true });
    });

    socket.on('call:accept', async (data: { targetId: string }) => {
      const ok = await canInteractWithUser(userId, data.targetId);
      if (ok) socket.to(`user:${data.targetId}`).emit('call:accepted');
    });

    socket.on('call:reject', async (data: { targetId: string }) => {
      const ok = await canInteractWithUser(userId, data.targetId);
      if (ok) socket.to(`user:${data.targetId}`).emit('call:rejected');
    });

    socket.on('call:hangup', async (data: { targetId: string }) => {
      const ok = await canInteractWithUser(userId, data.targetId);
      if (ok) socket.to(`user:${data.targetId}`).emit('call:hangedup');
    });

    socket.on('webrtc:signal', async (data: { targetId: string; signal: any }) => {
      const ok = await canInteractWithUser(userId, data.targetId);
      if (ok) socket.to(`user:${data.targetId}`).emit('webrtc:signal', { senderId: userId, signal: data.signal });
    });

    // --- read receipt ---
    socket.on('message:read', async (data: { messageId: string }) => {
      try {
        // 检查用户是否关闭了已读回执
        const me = await prisma.user.findUnique({
          where: { id: userId },
          select: { readReceiptsEnabled: true },
        });
        if (me?.readReceiptsEnabled === false) return;

        // 校验消息确实属于当前用户（receiverId === userId）
        const msg = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { senderId: true, receiverId: true },
        });
        if (!msg || msg.receiverId !== userId) return; // 不是自己的消息，忽略

        const receipt = await prisma.readReceipt.upsert({
          where: { messageId_userId: { messageId: data.messageId, userId } },
          create: { messageId: data.messageId, userId },
          update: { readAt: new Date() },
        });
        if (msg.senderId) {
          socket.to(`user:${msg.senderId}`).emit('read:update', {
            messageId: data.messageId, readBy: userId, readAt: receipt.readAt,
          });
        }
      } catch { /* ignore */ }
    });

    socket.on('disconnect', () => {
      const idx = onlineUsers.findIndex(u => u.socketId === socket.id);
      if (idx !== -1) {
        onlineUsers.splice(idx, 1);
        io?.emit('online:update', { userId, online: false });
      }
    });
  });

  return io;
}

export function getIO(): Server | null { return io; }
