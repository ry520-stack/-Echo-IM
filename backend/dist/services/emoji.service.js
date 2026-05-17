"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmojis = getEmojis;
exports.createEmoji = createEmoji;
exports.deleteEmoji = deleteEmoji;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getEmojis(userId) {
    return prisma_1.default.emoji.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}
async function createEmoji(userId, imageUrl, name) {
    return prisma_1.default.emoji.create({
        data: { userId, imageUrl, name: name || 'emoji' },
    });
}
async function deleteEmoji(id, userId) {
    const emoji = await prisma_1.default.emoji.findUnique({ where: { id } });
    if (!emoji)
        throw new Error('表情不存在');
    if (emoji.userId !== userId)
        throw new Error('无权删除');
    return prisma_1.default.emoji.delete({ where: { id } });
}
//# sourceMappingURL=emoji.service.js.map