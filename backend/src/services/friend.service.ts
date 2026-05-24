import prisma from '../utils/prisma';
import { getIO } from './socket.service';

export async function getFriends(userId: string) {
  const friendships = await prisma.friend.findMany({
    where: {
      AND: [
        { OR: [{ userId }, { friendId: userId }] },
        {
          OR: [
            { status: 'accepted' },
            { status: 'deleted', deletedBy: { not: userId } },
          ],
        },
      ],
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

async function findAcceptedRelation(userId: string, peerId: string) {
  const relation = await prisma.friend.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { userId, friendId: peerId },
        { userId: peerId, friendId: userId },
      ],
    },
  });
  if (!relation) throw new Error('好友关系不存在');
  return relation;
}

async function calculateRelationshipScore(userId: string, peerId: string) {
  const [messageCount, likeCount, commentCount] = await Promise.all([
    prisma.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
    }),
    prisma.momentLike.count({
      where: {
        OR: [
          { userId, moment: { userId: peerId } },
          { userId: peerId, moment: { userId } },
        ],
      },
    }),
    prisma.momentComment.count({
      where: {
        OR: [
          { userId, moment: { userId: peerId } },
          { userId: peerId, moment: { userId } },
        ],
      },
    }),
  ]);

  return messageCount + likeCount * 2 + commentCount * 3;
}

async function getLastConnectionAt(userId: string, peerId: string) {
  const [lastMessage, lastLike, lastComment] = await Promise.all([
    prisma.message.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.momentLike.findFirst({
      where: {
        OR: [
          { userId, moment: { userId: peerId } },
          { userId: peerId, moment: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.momentComment.findFirst({
      where: {
        OR: [
          { userId, moment: { userId: peerId } },
          { userId: peerId, moment: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return [lastMessage?.createdAt, lastLike?.createdAt, lastComment?.createdAt]
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
}

export async function getRelationshipSummary(userId: string, peerId: string) {
  const relation = await findAcceptedRelation(userId, peerId);
  const groups = await prisma.friendGroup.findMany({
    where: { userId, members: { some: { peerId } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, color: true },
  });
  const displayGroup = groups.find(g => g.id === relation.displayGroupId) || groups[0] || null;
  const [echoValue, lastConnectionAt] = await Promise.all([
    calculateRelationshipScore(userId, peerId),
    getLastConnectionAt(userId, peerId),
  ]);

  return {
    friendshipId: relation.id,
    friendSince: relation.createdAt,
    realMetAt: relation.realMetAt,
    displayGroupId: displayGroup?.id || '',
    displayGroup,
    groups,
    echoValue,
    lastConnectionAt,
  };
}

export async function updateRelationshipSettings(
  userId: string,
  peerId: string,
  data: { displayGroupId?: string | null; realMetAt?: string | null },
) {
  const relation = await findAcceptedRelation(userId, peerId);
  const update: { displayGroupId?: string | null; realMetAt?: Date | null } = {};

  if ('displayGroupId' in data) {
    if (data.displayGroupId) {
      const group = await prisma.friendGroup.findFirst({
        where: { id: data.displayGroupId, userId, members: { some: { peerId } } },
      });
      if (!group) throw new Error('展示星域无效');
      update.displayGroupId = data.displayGroupId;
    } else {
      update.displayGroupId = null;
    }
  }

  if ('realMetAt' in data) {
    update.realMetAt = data.realMetAt ? new Date(data.realMetAt) : null;
  }

  await prisma.friend.update({ where: { id: relation.id }, data: update });
  return getRelationshipSummary(userId, peerId);
}

export async function getEchoRankings(userId: string) {
  const friends = await getFriends(userId);
  const ranked = await Promise.all(friends.map(async f => ({
    peer: f.peer,
    echoValue: await calculateRelationshipScore(userId, f.peer.id),
    lastConnectionAt: await getLastConnectionAt(userId, f.peer.id),
  })));
  return ranked.sort((a, b) => b.echoValue - a.echoValue);
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

  // 检查拉黑
  const blocked = await prisma.blockList.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: peerId },
        { blockerId: peerId, blockedId: userId },
      ],
    },
  });
  if (blocked) throw new Error('无法发送好友申请，存在拉黑关系');

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
        data: { status: 'accepted', deletedBy: null, deletedAt: null, blockedBy: null, blockedAt: null },
      });
      const io = getIO();
      if (io) {
        io.to(`user:${peerId}`).emit('friend:accepted', { by: userId });
        io.to(`user:${userId}`).emit('friend:accepted', { by: peerId });
      }
      return { status: 'accepted', message: '好友添加成功' };
    }

    if (existing.status === 'deleted' || existing.status === 'rejected') {
      // 复用旧记录，改为 pending
      await prisma.friend.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          userId,
          friendId: peerId,
          deletedBy: null,
          deletedAt: null,
          blockedBy: null,
          blockedAt: null,
        },
      });
      const io = getIO();
      if (io) {
        io.to(`user:${peerId}`).emit('friend:request', { from: userId });
      }
      return { status: 'pending', message: '好友申请已发送' };
    }

    if (existing.status === 'blocked') {
      throw new Error('无法发送好友申请，存在拉黑关系');
    }
  }

  await prisma.friend.create({
    data: { userId, friendId: peerId, alias: alias || '', status: 'pending' },
  });

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

  const updated = await prisma.friend.update({
    where: { id: requestId },
    data: { status: 'accepted', deletedBy: null, deletedAt: null, blockedBy: null, blockedAt: null },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${req.userId}`).emit('friend:accepted', { by: userId });
  }

  return updated;
}

export async function rejectRequest(requestId: string, userId: string) {
  const req = await prisma.friend.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('请求不存在');
  if (req.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({
    where: { id: requestId },
    data: { status: 'rejected' },
  });
}

export async function updateAlias(friendshipId: string, userId: string, alias: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  return prisma.friend.update({ where: { id: friendshipId }, data: { alias } });
}

/**
 * 删除好友（软删除）
 */
export async function removeFriend(friendshipId: string, userId: string) {
  const f = await prisma.friend.findUnique({ where: { id: friendshipId } });
  if (!f) throw new Error('好友关系不存在');
  if (f.userId !== userId && f.friendId !== userId) throw new Error('无权操作');

  const peerId = f.userId === userId ? f.friendId : f.userId;

  if (f.status === 'deleted' && f.deletedBy && f.deletedBy !== userId) {
    const deleted = await prisma.friend.delete({ where: { id: friendshipId } });
    const io = getIO();
    if (io) {
      io.to(`user:${peerId}`).emit('friend:removed', { by: userId, friendshipId });
    }
    return deleted;
  }

  const updated = await prisma.friend.update({
    where: { id: friendshipId },
    data: {
      status: 'deleted',
      deletedBy: userId,
      deletedAt: new Date(),
    },
  });

  // 通知对方
  const io = getIO();
  if (io) {
    io.to(`user:${peerId}`).emit('friend:removed', { by: userId, friendshipId });
  }

  return updated;
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
    data: f.userId === userId ? { chatBackgroundUser: background } : { chatBackgroundFriend: background },
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
