"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoments = getMoments;
exports.createMoment = createMoment;
exports.toggleLike = toggleLike;
exports.addComment = addComment;
exports.getComments = getComments;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getMoments(userId, page = 1, limit = 20) {
    // Get friend IDs
    const friendships = await prisma_1.default.friend.findMany({
        where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'accepted',
        },
    });
    const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
    const visibleIds = [userId, ...friendIds]; // include own moments
    const [moments, total] = await Promise.all([
        prisma_1.default.moment.findMany({
            where: { userId: { in: visibleIds } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { id: true, username: true, nickname: true, avatar: true } },
                likes: { select: { userId: true } },
                _count: { select: { likes: true, comments: true } },
            },
        }),
        prisma_1.default.moment.count({ where: { userId: { in: visibleIds } } }),
    ]);
    return { moments, total, hasMore: page * limit < total };
}
async function createMoment(userId, content, images = []) {
    return prisma_1.default.moment.create({
        data: { userId, content, images: JSON.stringify(images) },
        include: {
            user: { select: { id: true, username: true, nickname: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
        },
    });
}
async function toggleLike(momentId, userId) {
    const existing = await prisma_1.default.momentLike.findUnique({
        where: { momentId_userId: { momentId, userId } },
    });
    if (existing) {
        await prisma_1.default.momentLike.delete({ where: { id: existing.id } });
        return { liked: false };
    }
    await prisma_1.default.momentLike.create({ data: { momentId, userId } });
    return { liked: true };
}
async function addComment(momentId, userId, content) {
    return prisma_1.default.momentComment.create({
        data: { momentId, userId, content },
        include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
    });
}
async function getComments(momentId) {
    return prisma_1.default.momentComment.findMany({
        where: { momentId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
    });
}
//# sourceMappingURL=moment.service.js.map