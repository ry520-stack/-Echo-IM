"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyGroups = getMyGroups;
exports.createGroup = createGroup;
exports.renameGroup = renameGroup;
exports.addMembers = addMembers;
exports.removeMember = removeMember;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getMyGroups(userId) {
    const memberships = await prisma_1.default.groupMember.findMany({
        where: { userId },
        include: {
            group: {
                include: {
                    members: {
                        select: { userId: true, role: true, user: { select: { id: true, username: true, nickname: true, avatar: true } } },
                    },
                    _count: { select: { members: true } },
                },
            },
        },
        orderBy: { joinedAt: 'desc' },
    });
    return memberships.map(m => ({
        id: m.groupId,
        name: m.group.name,
        creatorId: m.group.creatorId,
        role: m.role,
        memberCount: m.group._count.members,
        members: m.group.members,
        createdAt: m.group.createdAt,
    }));
}
async function createGroup(userId, name, memberIds = []) {
    const group = await prisma_1.default.groupChat.create({
        data: {
            name,
            creatorId: userId,
            members: {
                create: [
                    { userId, role: 'owner' },
                    ...memberIds.map(id => ({ userId: id, role: 'member' })),
                ],
            },
        },
        include: {
            members: {
                select: { userId: true, role: true, user: { select: { id: true, username: true, nickname: true, avatar: true } } },
            },
        },
    });
    return group;
}
async function renameGroup(groupId, userId, name) {
    const member = await prisma_1.default.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('无权修改群名');
    }
    return prisma_1.default.groupChat.update({ where: { id: groupId }, data: { name } });
}
async function addMembers(groupId, userId, memberIds) {
    const member = await prisma_1.default.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!member)
        throw new Error('你不在该群组中');
    // Get existing members
    const existing = await prisma_1.default.groupMember.findMany({
        where: { groupId, userId: { in: memberIds } },
        select: { userId: true },
    });
    const existingIds = new Set(existing.map(e => e.userId));
    const toAdd = memberIds.filter(id => !existingIds.has(id));
    if (toAdd.length === 0)
        throw new Error('所选用户已在群组中');
    await prisma_1.default.groupMember.createMany({
        data: toAdd.map(id => ({ groupId, userId: id, role: 'member' })),
    });
    return prisma_1.default.groupChat.findUnique({
        where: { id: groupId },
        include: {
            members: {
                select: { userId: true, role: true, user: { select: { id: true, username: true, nickname: true, avatar: true } } },
            },
        },
    });
}
async function removeMember(groupId, operatorId, targetUserId) {
    const operator = await prisma_1.default.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: operatorId } } });
    if (!operator)
        throw new Error('你不在该群组中');
    const target = await prisma_1.default.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
    if (!target)
        throw new Error('目标用户不在群组中');
    // Owner can remove anyone, admin can remove members
    if (operator.role !== 'owner' && operator.role !== 'admin') {
        throw new Error('无权移除成员');
    }
    if (target.role === 'owner') {
        throw new Error('不能移除群主');
    }
    if (operator.role === 'admin' && target.role === 'admin') {
        throw new Error('管理员不能移除其他管理员');
    }
    return prisma_1.default.groupMember.delete({ where: { id: target.id } });
}
//# sourceMappingURL=group.service.js.map