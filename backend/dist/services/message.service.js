"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = getMessages;
exports.getGroupMessages = getGroupMessages;
exports.getConversations = getConversations;
exports.recallMessage = recallMessage;
exports.getConsecutiveDays = getConsecutiveDays;
exports.searchMessages = searchMessages;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getMessages(userId, peerId, before, limit = 50) {
    const messages = await prisma_1.default.message.findMany({
        where: {
            OR: [
                { senderId: userId, receiverId: peerId },
                { senderId: peerId, receiverId: userId },
            ],
            ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            sender: { select: { id: true, username: true, nickname: true, avatar: true } },
            replyTo: {
                select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
            },
            readReceipts: { select: { userId: true, readAt: true } },
        },
    });
    return messages.reverse();
}
async function getGroupMessages(groupId, before, limit = 50) {
    const messages = await prisma_1.default.message.findMany({
        where: {
            groupId,
            ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            sender: { select: { id: true, username: true, nickname: true, avatar: true } },
            replyTo: {
                select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
            },
        },
    });
    return messages.reverse();
}
async function getConversations(userId) {
    // 获取所有最近联系人（私聊）
    const sentMessages = await prisma_1.default.message.findMany({
        where: { senderId: userId, receiverId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { receiverId: true, createdAt: true },
        distinct: ['receiverId'],
    });
    const receivedMessages = await prisma_1.default.message.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        select: { senderId: true, createdAt: true },
        distinct: ['senderId'],
    });
    // 合并去重
    const peerMap = new Map();
    for (const m of sentMessages) {
        if (m.receiverId && (!peerMap.has(m.receiverId) || peerMap.get(m.receiverId) < m.createdAt)) {
            peerMap.set(m.receiverId, m.createdAt);
        }
    }
    for (const m of receivedMessages) {
        if (!peerMap.has(m.senderId) || peerMap.get(m.senderId) < m.createdAt) {
            peerMap.set(m.senderId, m.createdAt);
        }
    }
    const peerIds = Array.from(peerMap.keys());
    const peers = await prisma_1.default.user.findMany({
        where: { id: { in: peerIds } },
        select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true },
    });
    // 获取每个会话的最后一条消息和未读数
    const conversations = await Promise.all(peers.map(async (peer) => {
        const lastMsg = await prisma_1.default.message.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: peer.id },
                    { senderId: peer.id, receiverId: userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true, type: true, createdAt: true, senderId: true },
        });
        const unreadCount = await prisma_1.default.message.count({
            where: {
                senderId: peer.id,
                receiverId: userId,
                isRecalled: false,
                NOT: {
                    readReceipts: { some: { userId } },
                },
            },
        });
        return {
            peer,
            lastMessage: lastMsg,
            unreadCount,
            lastTime: peerMap.get(peer.id)?.toISOString() || '',
        };
    }));
    // 按最后消息时间排序
    conversations.sort((a, b) => {
        const aTime = a.lastTime || '';
        const bTime = b.lastTime || '';
        return bTime.localeCompare(aTime);
    });
    return conversations;
}
async function recallMessage(messageId, userId) {
    const msg = await prisma_1.default.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId)
        throw new Error('无权撤回此消息');
    const elapsed = Date.now() - msg.createdAt.getTime();
    if (elapsed > 2 * 60 * 1000)
        throw new Error('超过2分钟，无法撤回');
    return prisma_1.default.message.update({ where: { id: messageId }, data: { isRecalled: true } });
}
async function getConsecutiveDays(userId, peerId) {
    const messages = await prisma_1.default.message.findMany({
        where: {
            OR: [
                { senderId: userId, receiverId: peerId },
                { senderId: peerId, receiverId: userId },
            ],
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });
    if (messages.length === 0)
        return 0;
    // Group by date (UTC day boundary)
    const activeDays = new Set();
    for (const m of messages) {
        const d = new Date(m.createdAt);
        activeDays.add(d.toISOString().slice(0, 10));
    }
    // Count consecutive days going backwards from today
    let days = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const check = new Date(today);
        check.setDate(check.getDate() - i);
        const key = check.toISOString().slice(0, 10);
        if (activeDays.has(key)) {
            days++;
        }
        else if (i > 0) {
            break; // gap found
        }
        // i=0 (today) — allow starting even if no message today
    }
    return days;
}
async function searchMessages(userId, query, limit = 30) {
    return prisma_1.default.message.findMany({
        where: {
            content: { contains: query },
            isRecalled: false,
            OR: [
                { senderId: userId },
                { receiverId: userId },
            ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            sender: { select: { id: true, username: true, nickname: true, avatar: true } },
        },
    });
}
//# sourceMappingURL=message.service.js.map