import prisma from '../utils/prisma';
import { getIO } from './socket.service';

export async function getFriends(userId: string) {
  const friendships = await prisma.friend.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
      status: 'accepted',
    },
    include: {
      user: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true } },
      friend: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  return friendships.map(f => {
    const isInitiator = f.userId === userId;
    const peer = isInitiator ? f.friend : f.user;
    return {
      id: f.id,
      peer,
      alias: f.alias,
      isPinned: f.isPinned,
      createdAt: f.createdAt,
    };
  });
}

export async function getPendingRequests(userId: string) {
  const requests = await prisma.friend.findMany({
    where: {
      friendId: userId,
      status: 'pending',
    },
    include: {
      user: { select: { id: true, username: true, nickname: true, avatar: true, digitalId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map(r => ({
    id: r.id,
    from: r.user,
    alias: r.alias,
    createdAt: r.createdAt,
  }));
}

export async function sendRequest(userId: string, peerId: string, alias?: string) {
  if (userId === peerId) throw new Error('不能添加自己为好友');

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId: peerId },
        { userId: peerId, friendId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'accepted') throw new Error('已经是好友');
    if (existing.status === 'pending') {
      if (existing.userId === userId) throw new Error('已发送过好友申请');
      // 对方已发来申请，直接接受
      await prisma.friend.update({
        where: { id: existing.id },
        data: { status: 'accepted' },
      });
      return { status: 'accepted', message: '好友添加成功' };
    }
  }

  await prisma.friend.create({
    data: { userId, friendId: peerId, alias: alias || '', status: 'pending' },
  });

  // Notify via socket
  const io = getIO();
  if (io) {
    io.to(`user:${peerId}`).emit('friend:request', { from: userId });
  }

  return { status: 'pending', message: '好友申请已发送' };
}

export async function acceptRequest(requestId: string, userId: string) {
  const req = await prisma.friend.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('请求不存在');
  if (req.friendId !== userId) throw new Error('无权操作');
  if (req.status !== 'pending') throw new Error('请求状态不正确');

  return prisma.friend.update({ where: { id: requestId }, data: { status: 'accepted' } });
}

export async function rejectRequest(requestId: string, userId: string) {
  const req = await prisma.friend.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('请求不存在');
  if (req.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.delete({ where: { id: requestId } });
}

export async function updateAlias(friendshipId: string, userId: string, alias: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({ where: { id: friendshipId }, data: { alias } });
}

export async function removeFriend(friendshipId: string, userId: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.delete({ where: { id: friendshipId } });
}

export async function togglePin(friendshipId: string, userId: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({
    where: { id: friendshipId },
    data: { isPinned: !f.isPinned },
  });
}

export async function setBackground(friendshipId: string, userId: string, background: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({
    where: { id: friendshipId },
    data: { chatBackground: background },
  });
}

export async function toggleMute(friendshipId: string, userId: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({
    where: { id: friendshipId },
    data: { muted: !f.muted },
  });
}

export async function toggleHidden(friendshipId: string, userId: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({
    where: { id: friendshipId },
    data: { hidden: !f.hidden },
  });
}
