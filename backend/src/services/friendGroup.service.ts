import prisma from '../utils/prisma';

export async function createGroup(userId: string, name: string, color?: string) {
  return prisma.friendGroup.create({ data: { userId, name, color: color || '#6366f1' } });
}

export async function updateGroup(groupId: string, userId: string, data: { name?: string; color?: string }) {
  const group = await prisma.friendGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) throw new Error('无权操作');
  return prisma.friendGroup.update({ where: { id: groupId }, data });
}

export async function deleteGroup(groupId: string, userId: string) {
  const group = await prisma.friendGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) throw new Error('无权操作');
  return prisma.friendGroup.delete({ where: { id: groupId } });
}

export async function addMember(groupId: string, peerId: string, userId: string) {
  const group = await prisma.friendGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) throw new Error('无权操作');
  return prisma.friendGroupMember.upsert({
    where: { groupId_peerId: { groupId, peerId } },
    create: { groupId, peerId },
    update: {},
  });
}

export async function removeMember(groupId: string, peerId: string, userId: string) {
  const group = await prisma.friendGroup.findUnique({ where: { id: groupId } });
  if (!group || group.userId !== userId) throw new Error('无权操作');
  return prisma.friendGroupMember.delete({ where: { groupId_peerId: { groupId, peerId } } });
}

export async function getMyGroups(userId: string) {
  return prisma.friendGroup.findMany({
    where: { userId },
    include: {
      members: {
        include: { peer: { select: { id: true, username: true, nickname: true, avatar: true } } },
      },
    },
  });
}
