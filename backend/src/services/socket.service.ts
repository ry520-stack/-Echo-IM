import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './auth.service';
import prisma from '../utils/prisma';
import * as blockService from './block.service';

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
      sender: { select: { id: true, username: true, nickname: true, avatar: true } },
      replyTo: {
        select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
      },
    },
  });
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
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
        if (!data.content?.trim() && data.type !== 'image') {
          return ack?.({ error: 'message cannot be empty' });
        }

        // private chat: check block + friend status
        if (data.receiverId) {
          // Check if sender is blocked BY receiver (receiver blocked sender)
          const blockedByReceiver = await prisma.blockList.findUnique({
            where: { blockerId_blockedId: { blockerId: data.receiverId, blockedId: userId } },
          });
          if (blockedByReceiver) {
            return ack?.({ error: '消息已发出，但被对方拒收了' });
          }

          // Check if sender blocked receiver — still allow send, just don't notify
          const blockedBySender = await prisma.blockList.findUnique({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: data.receiverId } },
          });

          // Check friend status
          const friendship = await prisma.friend.findFirst({
            where: {
              status: 'accepted',
              OR: [
                { userId, friendId: data.receiverId },
                { userId: data.receiverId, friendId: userId },
              ],
            },
          });
          const isFriend = !!friendship;

          if (!isFriend) {
            const receiver = await prisma.user.findUnique({
              where: { id: data.receiverId },
              select: { allowStrangerMessage: true, autoReply: true },
            });
            if (receiver && !receiver.allowStrangerMessage) {
              return ack?.({ error: '对方开启了好友验证，你还不是他（她）好友' });
            }
            if (receiver?.autoReply) {
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

          // If blocked by sender, still deliver but don't notify receiver
          if (blockedBySender) {
            // Deliver without notification (receiver won't see popup)
            const msg = await saveMessage({
              senderId: userId,
              receiverId: data.receiverId,
              content: data.content,
              type: data.type || 'text',
              replyToId: data.replyToId,
            });
            if (msg) {
              socket.emit('message:receive', msg);
              // Don't emit to receiver — they blocked the sender
            }
            return ack?.({ ok: true, message: msg });
          }
        }

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
            socket.emit('message:receive', msg);
            socket.to(`user:${data.receiverId}`).emit('message:receive', msg);
          } else if (data.groupId) {
            io?.to(`group:${data.groupId}`).emit('message:receive', msg);
          }
          ack?.({ ok: true, message: msg });
        }
      } catch (e: any) {
        ack?.({ error: e.message || 'send failed' });
      }
    });

    // --- typing ---
    socket.on('typing:start', (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: true });
    });
    socket.on('typing:stop', (data: { receiverId: string }) => {
      socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: false });
    });

    // --- read receipt ---
    socket.on('message:read', async (data: { messageId: string }) => {
      try {
        const receipt = await prisma.readReceipt.upsert({
          where: { messageId_userId: { messageId: data.messageId, userId } },
          create: { messageId: data.messageId, userId },
          update: { readAt: new Date() },
        });
        const msg = await prisma.message.findUnique({ where: { id: data.messageId }, select: { senderId: true } });
        if (msg?.senderId) {
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
