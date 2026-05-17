import prisma from '../utils/prisma';

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error('不能拉黑自己');

  const existing = await prisma.blockList.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) throw new Error('已拉黑该用户');

  return prisma.blockList.create({ data: { blockerId, blockedId } });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const block = await prisma.blockList.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (!block) throw new Error('未拉黑该用户');

  return prisma.blockList.delete({ where: { id: block.id } });
}

export async function getBlockedUsers(blockerId: string) {
  return prisma.blockList.findMany({
    where: { blockerId },
    include: {
      blocked: {
        select: { id: true, username: true, nickname: true, avatar: true, digitalId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function isBlocked(userId: string, targetId: string): Promise<boolean> {
  const block = await prisma.blockList.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: targetId },
        { blockerId: targetId, blockedId: userId },
      ],
    },
  });
  return !!block;
}

export async function isFriend(userId: string, peerId: string): Promise<boolean> {
  const f = await prisma.friend.findFirst({
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
