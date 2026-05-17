import prisma from '../utils/prisma';

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');
  const { password, ...safe } = user;
  return safe;
}

export async function updateUser(
  userId: string,
  data: { nickname?: string; avatar?: string; status?: string; autoReply?: string; allowStrangerMessage?: boolean; readReceiptsEnabled?: boolean }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  const { password, ...safe } = user;
  return safe;
}

export async function searchUsers(query: string) {
  // 支持按 digitalId 精确匹配 或 username 模糊搜索
  const isNumber = /^\d{6}$/.test(query);
  const users = await prisma.user.findMany({
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
      autoReply: true, allowStrangerMessage: true, readReceiptsEnabled: true,
    },
  });
  return users;
}
