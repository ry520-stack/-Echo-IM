import prisma from '../utils/prisma';

export async function getMyGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
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

export async function createGroup(userId: string, name: string, memberIds: string[] = []) {
  const group = await prisma.groupChat.create({
    data: {
      name,
      creatorId: userId,
      members: {
        create: [
          { userId, role: 'owner' },
          ...memberIds.map(id => ({ userId: id, role: 'member' as const })),
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

export async function renameGroup(groupId: string, userId: string, name: string) {
  const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('无权修改群名');
  }

  return prisma.groupChat.update({ where: { id: groupId }, data: { name } });
}

export async function addMembers(groupId: string, userId: string, memberIds: string[]) {
  const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!member) throw new Error('你不在该群组中');

  // Get existing members
  const existing = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: memberIds } },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map(e => e.userId));
  const toAdd = memberIds.filter(id => !existingIds.has(id));

  if (toAdd.length === 0) throw new Error('所选用户已在群组中');

  await prisma.groupMember.createMany({
    data: toAdd.map(id => ({ groupId, userId: id, role: 'member' })),
  });

  return prisma.groupChat.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: { userId: true, role: true, user: { select: { id: true, username: true, nickname: true, avatar: true } } },
      },
    },
  });
}

export async function removeMember(groupId: string, operatorId: string, targetUserId: string) {
  const operator = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: operatorId } } });
  if (!operator) throw new Error('你不在该群组中');

  const target = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
  if (!target) throw new Error('目标用户不在群组中');

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

  return prisma.groupMember.delete({ where: { id: target.id } });
}
