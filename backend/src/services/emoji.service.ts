import prisma from '../utils/prisma';

export async function getEmojis(userId: string) {
  return prisma.emoji.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEmoji(userId: string, imageUrl: string, name: string) {
  return prisma.emoji.create({
    data: { userId, imageUrl, name: name || 'emoji' },
  });
}

export async function deleteEmoji(id: string, userId: string) {
  const emoji = await prisma.emoji.findUnique({ where: { id } });
  if (!emoji) throw new Error('表情不存在');
  if (emoji.userId !== userId) throw new Error('无权删除');
  return prisma.emoji.delete({ where: { id } });
}

export async function batchDeleteEmojis(ids: string[], userId: string) {
  return prisma.emoji.deleteMany({
    where: {
      id: { in: ids },
      userId, // 只删除自己的表情
    },
  });
}
