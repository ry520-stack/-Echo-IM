import prisma from '../utils/prisma';

export async function getMoments(userId: string, page = 1, limit = 20) {
  // Get friend IDs
  const friendships = await prisma.friend.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
      status: 'accepted',
    },
  });

  const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
  const visibleIds = [userId, ...friendIds]; // include own moments

  const [moments, total] = await Promise.all([
    prisma.moment.findMany({
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
    prisma.moment.count({ where: { userId: { in: visibleIds } } }),
  ]);

  return { moments, total, hasMore: page * limit < total };
}

export async function createMoment(userId: string, content: string, images: string[] = []) {
  return prisma.moment.create({
    data: { userId, content, images: JSON.stringify(images) },
    include: {
      user: { select: { id: true, username: true, nickname: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

export async function toggleLike(momentId: string, userId: string) {
  const existing = await prisma.momentLike.findUnique({
    where: { momentId_userId: { momentId, userId } },
  });

  if (existing) {
    await prisma.momentLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await prisma.momentLike.create({ data: { momentId, userId } });
  return { liked: true };
}

export async function addComment(momentId: string, userId: string, content: string) {
  return prisma.momentComment.create({
    data: { momentId, userId, content },
    include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
  });
}

export async function getComments(momentId: string) {
  return prisma.momentComment.findMany({
    where: { momentId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, username: true, nickname: true, avatar: true } } },
  });
}

export async function deleteMoment(momentId: string, userId: string) {
  const m = await prisma.moment.findUnique({ where: { id: momentId } });
  if (!m || m.userId !== userId) throw new Error('无权删除');
  return prisma.moment.delete({ where: { id: momentId } });
}

export async function deleteComment(commentId: string, userId: string) {
  const c = await prisma.momentComment.findUnique({ where: { id: commentId } });
  if (!c || c.userId !== userId) throw new Error('无权删除');
  return prisma.momentComment.delete({ where: { id: commentId } });
}
