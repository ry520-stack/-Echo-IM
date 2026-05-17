"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const auth_service_1 = require("./auth.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const blockService = __importStar(require("./block.service"));
let io = null;
const onlineUsers = [];
async function saveMessage(data) {
    const msg = await prisma_1.default.message.create({ data });
    return prisma_1.default.message.findUnique({
        where: { id: msg.id },
        include: {
            sender: { select: { id: true, username: true, nickname: true, avatar: true } },
            replyTo: {
                select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
            },
        },
    });
}
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingInterval: 25000,
        pingTimeout: 20000,
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('No token'));
        try {
            const payload = (0, auth_service_1.verifyToken)(token);
            socket.userId = payload.userId;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const userId = socket.userId;
        const existingIdx = onlineUsers.findIndex(u => u.userId === userId);
        if (existingIdx !== -1) {
            const old = onlineUsers.splice(existingIdx, 1)[0];
            io?.to(old.socketId).emit('force:logout', { message: 'account logged in elsewhere' });
            io?.sockets.sockets.get(old.socketId)?.disconnect(true);
        }
        onlineUsers.push({ socketId: socket.id, userId });
        io?.emit('online:update', { userId, online: true });
        prisma_1.default.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => { });
        socket.join(`user:${userId}`);
        const memberships = await prisma_1.default.groupMember.findMany({ where: { userId } });
        memberships.forEach(m => socket.join(`group:${m.groupId}`));
        // --- message:send ---
        socket.on('message:send', async (data, ack) => {
            try {
                if (!data.content?.trim() && data.type !== 'image') {
                    return ack?.({ error: 'message cannot be empty' });
                }
                // private chat: check block + stranger permission + auto-reply
                if (data.receiverId) {
                    const blocked = await blockService.isBlocked(userId, data.receiverId);
                    if (blocked) {
                        return ack?.({ error: 'blocked' });
                    }
                    const isFriend = await blockService.isFriend(userId, data.receiverId);
                    if (!isFriend) {
                        const receiver = await prisma_1.default.user.findUnique({
                            where: { id: data.receiverId },
                            select: { allowStrangerMessage: true, autoReply: true },
                        });
                        if (receiver && !receiver.allowStrangerMessage) {
                            return ack?.({ error: 'stranger messages disabled' });
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
                    }
                    else if (data.groupId) {
                        io?.to(`group:${data.groupId}`).emit('message:receive', msg);
                    }
                    ack?.({ ok: true, message: msg });
                }
            }
            catch (e) {
                ack?.({ error: e.message || 'send failed' });
            }
        });
        // --- typing ---
        socket.on('typing:start', (data) => {
            socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: true });
        });
        socket.on('typing:stop', (data) => {
            socket.to(`user:${data.receiverId}`).emit('typing:update', { userId, typing: false });
        });
        // --- read receipt ---
        socket.on('message:read', async (data) => {
            try {
                const receipt = await prisma_1.default.readReceipt.upsert({
                    where: { messageId_userId: { messageId: data.messageId, userId } },
                    create: { messageId: data.messageId, userId },
                    update: { readAt: new Date() },
                });
                const msg = await prisma_1.default.message.findUnique({ where: { id: data.messageId }, select: { senderId: true } });
                if (msg?.senderId) {
                    socket.to(`user:${msg.senderId}`).emit('read:update', {
                        messageId: data.messageId, readBy: userId, readAt: receipt.readAt,
                    });
                }
            }
            catch { /* ignore */ }
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
function getIO() { return io; }
//# sourceMappingURL=socket.service.js.map