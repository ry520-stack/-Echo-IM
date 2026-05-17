"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.searchUsers = searchUsers;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getUser(userId) {
    const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('用户不存在');
    const { password, ...safe } = user;
    return safe;
}
async function updateUser(userId, data) {
    const user = await prisma_1.default.user.update({
        where: { id: userId },
        data,
    });
    const { password, ...safe } = user;
    return safe;
}
async function searchUsers(query) {
    // 支持按 digitalId 精确匹配 或 username 模糊搜索
    const isNumber = /^\d{6}$/.test(query);
    const users = await prisma_1.default.user.findMany({
        where: isNumber
            ? { digitalId: parseInt(query) }
            : {
                OR: [
                    { username: { contains: query } },
                    { email: { contains: query } },
                ],
            },
        take: 10,
        select: {
            id: true, username: true, email: true, digitalId: true,
            nickname: true, avatar: true, status: true, lastSeenAt: true,
            autoReply: true, allowStrangerMessage: true,
        },
    });
    return users;
}
//# sourceMappingURL=user.service.js.map