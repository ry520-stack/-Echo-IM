"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.getBlockedUsers = getBlockedUsers;
exports.isBlocked = isBlocked;
exports.isFriend = isFriend;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function blockUser(blockerId, blockedId) {
    if (blockerId === blockedId)
        throw new Error('不能拉黑自己');
    const existing = await prisma_1.default.blockList.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing)
        throw new Error('已拉黑该用户');
    return prisma_1.default.blockList.create({ data: { blockerId, blockedId } });
}
async function unblockUser(blockerId, blockedId) {
    const block = await prisma_1.default.blockList.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!block)
        throw new Error('未拉黑该用户');
    return prisma_1.default.blockList.delete({ where: { id: block.id } });
}
async function getBlockedUsers(blockerId) {
    return prisma_1.default.blockList.findMany({
        where: { blockerId },
        include: {
            blocked: {
                select: { id: true, username: true, nickname: true, avatar: true, digitalId: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function isBlocked(userId, targetId) {
    const block = await prisma_1.default.blockList.findFirst({
        where: {
            OR: [
                { blockerId: userId, blockedId: targetId },
                { blockerId: targetId, blockedId: userId },
            ],
        },
    });
    return !!block;
}
async function isFriend(userId, peerId) {
    const f = await prisma_1.default.friend.findFirst({
        where: {
            status: 'accepted',
            OR: [
                { userId, friendId: peerId },
                { userId: peerId, friendId: userId },
            ],
        },
    });
    return !!f;
}
//# sourceMappingURL=block.service.js.map