"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFriends = getFriends;
exports.getPendingRequests = getPendingRequests;
exports.sendRequest = sendRequest;
exports.acceptRequest = acceptRequest;
exports.rejectRequest = rejectRequest;
exports.updateAlias = updateAlias;
exports.removeFriend = removeFriend;
exports.togglePin = togglePin;
exports.setBackground = setBackground;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socket_service_1 = require("./socket.service");
async function getFriends(userId) {
    const friendships = await prisma_1.default.friend.findMany({
        where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'accepted',
        },
        include: {
            user: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true } },
            friend: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return friendships.map(f => {
        const isInitiator = f.userId === userId;
        const peer = isInitiator ? f.friend : f.user;
        return {
            id: f.id,
            peer,
            alias: f.alias,
            isPinned: f.isPinned,
            createdAt: f.createdAt,
        };
    });
}
async function getPendingRequests(userId) {
    const requests = await prisma_1.default.friend.findMany({
        where: {
            friendId: userId,
            status: 'pending',
        },
        include: {
            user: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return requests.map(r => ({
        id: r.id,
        from: r.user,
        alias: r.alias,
        createdAt: r.createdAt,
    }));
}
async function sendRequest(userId, peerId, alias) {
    if (userId === peerId)
        throw new Error('不能添加自己为好友');
    const existing = await prisma_1.default.friend.findFirst({
        where: {
            OR: [
                { userId, friendId: peerId },
                { userId: peerId, friendId: userId },
            ],
        },
    });
    if (existing) {
        if (existing.status === 'accepted')
            throw new Error('已经是好友');
        if (existing.status === 'pending') {
            if (existing.userId === userId)
                throw new Error('已发送过好友申请');
            // 对方已发来申请，直接接受
            await prisma_1.default.friend.update({
                where: { id: existing.id },
                data: { status: 'accepted' },
            });
            return { status: 'accepted', message: '好友添加成功' };
        }
    }
    await prisma_1.default.friend.create({
        data: { userId, friendId: peerId, alias: alias || '', status: 'pending' },
    });
    // Notify via socket
    const io = (0, socket_service_1.getIO)();
    if (io) {
        io.to(`user:${peerId}`).emit('friend:request', { from: userId });
    }
    return { status: 'pending', message: '好友申请已发送' };
}
async function acceptRequest(requestId, userId) {
    const req = await prisma_1.default.friend.findUnique({ where: { id: requestId } });
    if (!req)
        throw new Error('请求不存在');
    if (req.friendId !== userId)
        throw new Error('无权操作');
    if (req.status !== 'pending')
        throw new Error('请求状态不正确');
    return prisma_1.default.friend.update({ where: { id: requestId }, data: { status: 'accepted' } });
}
async function rejectRequest(requestId, userId) {
    const req = await prisma_1.default.friend.findUnique({ where: { id: requestId } });
    if (!req)
        throw new Error('请求不存在');
    if (req.friendId !== userId)
        throw new Error('无权操作');
    return prisma_1.default.friend.delete({ where: { id: requestId } });
}
async function updateAlias(friendshipId, userId, alias) {
    const f = await prisma_1.default.friend.findUnique({ where: { id: friendshipId } });
    if (!f)
        throw new Error('好友关系不存在');
    if (f.userId !== userId && f.friendId !== userId)
        throw new Error('无权操作');
    return prisma_1.default.friend.update({ where: { id: friendshipId }, data: { alias } });
}
async function removeFriend(friendshipId, userId) {
    const f = await prisma_1.default.friend.findUnique({ where: { id: friendshipId } });
    if (!f)
        throw new Error('好友关系不存在');
    if (f.userId !== userId && f.friendId !== userId)
        throw new Error('无权操作');
    return prisma_1.default.friend.delete({ where: { id: friendshipId } });
}
async function togglePin(friendshipId, userId) {
    const f = await prisma_1.default.friend.findUnique({ where: { id: friendshipId } });
    if (!f)
        throw new Error('好友关系不存在');
    if (f.userId !== userId && f.friendId !== userId)
        throw new Error('无权操作');
    return prisma_1.default.friend.update({
        where: { id: friendshipId },
        data: { isPinned: !f.isPinned },
    });
}
async function setBackground(friendshipId, userId, background) {
    const f = await prisma_1.default.friend.findUnique({ where: { id: friendshipId } });
    if (!f)
        throw new Error('好友关系不存在');
    if (f.userId !== userId && f.friendId !== userId)
        throw new Error('无权操作');
    return prisma_1.default.friend.update({
        where: { id: friendshipId },
        data: { chatBackground: background },
    });
}
//# sourceMappingURL=friend.service.js.map