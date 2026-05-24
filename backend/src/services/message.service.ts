import prisma from '../utils/prisma';
import { getIO } from './socket.service';

export async function getMessages(
  userId: string,
  peerId: string,
  before?: string,
  limit = 50,
) {
  // Get the conversation clear time for this user-peer pair
  const clearRecord = await prisma.userConversationClear.findUnique({
    where: { userId_peerId: { userId, peerId } },
    select: { clearedAt: true },
  });

  // Get hidden message IDs for this user
  const hiddenIds = await prisma.messageHidden.findMany({
    where: { userId },
    select: { messageId: true },
  });
  const hiddenSet = new Set(hiddenIds.map(h => h.messageId));

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, nickname: true, avatar: true } },
      replyTo: {
        select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
      },
      readReceipts: { select: { userId: true, readAt: true } },
    },
  });

  // Filter out hidden messages and those before conversation clear
  const filtered = messages.filter(m => {
    if (hiddenSet.has(m.id)) return false;
    if (clearRecord && m.createdAt <= clearRecord.clearedAt) return false;
    return true;
  });

  return filtered.reverse();
}

export async function getGroupMessages(
  userId: string,
  groupId: string,
  before?: string,
  limit = 50,
) {
  // 校验用户是否为群成员
  const isMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!isMember) throw new Error('无权访问该群组消息');

  // Get the group conversation clear time
  const clearRecord = await prisma.groupConversationClear.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { clearedAt: true },
  });

  // Get hidden message IDs for this user
  const hiddenIds = await prisma.messageHidden.findMany({
    where: { userId },
    select: { messageId: true },
  });
  const hiddenSet = new Set(hiddenIds.map(h => h.messageId));

  const messages = await prisma.message.findMany({
    where: {
      groupId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, nickname: true, avatar: true } },
      replyTo: {
        select: { id: true, content: true, type: true, sender: { select: { id: true, username: true, nickname: true } } },
      },
    },
  });

  // Filter out hidden messages and those before group conversation clear
  const filtered = messages.filter(m => {
    if (hiddenSet.has(m.id)) return false;
    if (clearRecord && m.createdAt <= clearRecord.clearedAt) return false;
    return true;
  });

  return filtered.reverse();
}

export async function getConversations(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sentMessages = await prisma.message.findMany({
    where: { senderId: userId, receiverId: { not: null }, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
    select: { receiverId: true, createdAt: true },
    distinct: ['receiverId'],
    take: 100,
  });

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: userId, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
    select: { senderId: true, createdAt: true },
    distinct: ['senderId'],
    take: 100,
  });

  const peerMap = new Map<string, Date>();
  for (const m of sentMessages) {
    if (m.receiverId && (!peerMap.has(m.receiverId) || peerMap.get(m.receiverId)! < m.createdAt)) {
      peerMap.set(m.receiverId, m.createdAt);
    }
  }
  for (const m of receivedMessages) {
    if (!peerMap.has(m.senderId) || peerMap.get(m.senderId)! < m.createdAt) {
      peerMap.set(m.senderId, m.createdAt);
    }
  }

  let peerIds = Array.from(peerMap.keys());
  if (peerIds.length === 0) return [];

  // 批量查询拉黑和好友关系
  const [blocks, relations] = await Promise.all([
    prisma.blockList.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: peerIds } },
          { blockerId: { in: peerIds }, blockedId: userId },
        ],
      },
    }),
    prisma.friend.findMany({
      where: {
        OR: [
          { userId, friendId: { in: peerIds } },
          { userId: { in: peerIds }, friendId: userId },
        ],
      },
    }),
  ]);

  // 过滤被拉黑/被删除的会话
  const blockedPeerIds = new Set<string>();
  for (const b of blocks) {
    blockedPeerIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  }

  const deletedByPeerIds = new Set<string>();
  for (const r of relations) {
    if (r.status === 'blocked') {
      const peerId = r.userId === userId ? r.friendId : r.userId;
      blockedPeerIds.add(peerId);
    }
    if (r.status === 'deleted' && r.deletedBy !== userId) {
      const peerId = r.userId === userId ? r.friendId : r.userId;
      deletedByPeerIds.add(peerId);
    }
  }

  // 过滤：移除被拉黑的、被对方删除的
  peerIds = peerIds.filter(id => !blockedPeerIds.has(id) && !deletedByPeerIds.has(id));
  if (peerIds.length === 0) return [];

  const peers = await prisma.user.findMany({
    where: { id: { in: peerIds } },
    select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true },
  });

  // 获取备注（支持双向关系）
  const friendRecords = await prisma.friend.findMany({
    where: {
      OR: [
        { userId, friendId: { in: peerIds } },
        { userId: { in: peerIds }, friendId: userId },
      ],
    },
    select: { userId: true, friendId: true, alias: true },
  });
  const aliasMap = new Map<string, string>();
  for (const f of friendRecords) {
    const peerId = f.userId === userId ? f.friendId : f.userId;
    if (f.alias) aliasMap.set(peerId, f.alias);
  }

  // 获取每个会话的最后一条消息（排除隐藏和清空的消息）和未读数
  // 获取所有隐藏的消息ID
  const allHiddenIds = await prisma.messageHidden.findMany({
    where: { userId },
    select: { messageId: true },
  });
  const allHiddenSet = new Set(allHiddenIds.map(h => h.messageId));

  // 获取所有单聊清空记录
  const allUserClears = await prisma.userConversationClear.findMany({
    where: { userId },
    select: { peerId: true, clearedAt: true },
  });
  const userClearMap = new Map(allUserClears.map(c => [c.peerId, c.clearedAt]));

  const conversationResults = await Promise.all(
    peers.map(async (peer) => {
      const clearTime = userClearMap.get(peer.id);

      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: peer.id },
            { senderId: peer.id, receiverId: userId },
          ],
          ...(clearTime ? { createdAt: { gt: clearTime } } : {}),
          id: { notIn: [...allHiddenSet] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, type: true, createdAt: true, senderId: true },
      });

      if (!lastMsg) return null;

      const unreadCount = await prisma.message.count({
        where: {
          senderId: peer.id,
          receiverId: userId,
          isRecalled: false,
          ...(clearTime ? { createdAt: { gt: clearTime } } : {}),
          id: { notIn: [...allHiddenSet] },
          NOT: {
            readReceipts: { some: { userId } },
          },
        },
      });

      return {
        peer: { ...peer, alias: aliasMap.get(peer.id) || '' },
        lastMessage: lastMsg,
        unreadCount,
        lastTime: lastMsg.createdAt.toISOString(),
      };
    }),
  );

  const conversations = conversationResults.filter((c): c is NonNullable<typeof c> => c !== null);

  // 按最后消息时间排序
  conversations.sort((a, b) => {
    const aTime = a.lastTime || '';
    const bTime = b.lastTime || '';
    return bTime.localeCompare(aTime);
  });

  return conversations;
}

export async function recallMessage(messageId: string, userId: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.senderId !== userId) throw new Error('无权撤回此消息');

  const elapsed = Date.now() - msg.createdAt.getTime();
  if (elapsed > 2 * 60 * 1000) throw new Error('超过2分钟，无法撤回');

  return prisma.message.update({ where: { id: messageId }, data: { isRecalled: true } });
}

export async function getConsecutiveDays(userId: string, peerId: string): Promise<number> {
  // 只查最近365天的消息，避免全量加载
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
      createdAt: { gte: oneYearAgo },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
    take: 1000,
  });

  if (messages.length === 0) return 0;

  // Group by date (UTC day boundary)
  const activeDays = new Set<string>();
  for (const m of messages) {
    const d = new Date(m.createdAt);
    activeDays.add(d.toISOString().slice(0, 10));
  }

  // Count consecutive days going backwards from today
  let days = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    const key = check.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      days++;
    } else if (i > 0) {
      break; // gap found
    }
    // i=0 (today) — allow starting even if no message today
  }

  return days;
}

export async function searchMessages(userId: string, query: string, limit = 30) {
  const hiddenIds = await prisma.messageHidden.findMany({
    where: { userId },
    select: { messageId: true },
  });
  const hiddenSet = new Set(hiddenIds.map(h => h.messageId));

  const messages = await prisma.message.findMany({
    where: {
      content: { contains: query },
      isRecalled: false,
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, nickname: true, avatar: true } },
    },
  });

  return messages.filter(m => !hiddenSet.has(m.id));
}

export async function markAllRead(userId: string, peerId: string) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { readReceiptsEnabled: true },
  });

  const unreadMessages = await prisma.message.findMany({
    where: {
      senderId: peerId,
      receiverId: userId,
      isRecalled: false,
      readReceipts: { none: { userId } },
    },
    select: { id: true },
  });

  if (unreadMessages.length === 0) return 0;

  // 批量插入已读回执（跳过已存在的记录）
  await prisma.$transaction(
    unreadMessages.map(msg =>
      prisma.readReceipt.upsert({
        where: { messageId_userId: { messageId: msg.id, userId } },
        create: { messageId: msg.id, userId, readAt: new Date() },
        update: { readAt: new Date() },
      })
    )
  );

  // 批量通知发送方
  const io = getIO();
  if (io && me?.readReceiptsEnabled !== false) {
    io.to(`user:${peerId}`).emit('read:update_batch', {
      messageIds: unreadMessages.map(m => m.id),
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  return unreadMessages.length;
}

// ——— Message hiding (soft-delete for the requesting user only) ———

export async function hideMessage(userId: string, messageId: string) {
  // Verify the message involves this user
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error('消息不存在');
  const involved = msg.senderId === userId || msg.receiverId === userId;
  if (!involved) throw new Error('无权操作此消息');

  await prisma.messageHidden.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId },
    update: {},
  });
}

export async function batchHideMessages(userId: string, messageIds: string[]) {
  let count = 0;
  for (const messageId of messageIds) {
    try {
      await prisma.messageHidden.upsert({
        where: { userId_messageId: { userId, messageId } },
        create: { userId, messageId },
        update: {},
      });
      count++;
    } catch {
      // Skip messages that don't exist or user isn't involved with
    }
  }
  return count;
}

export async function clearUserConversation(userId: string, peerId: string) {
  // Verify the peer exists
  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer) throw new Error('用户不存在');

  await prisma.userConversationClear.upsert({
    where: { userId_peerId: { userId, peerId } },
    create: { userId, peerId, clearedAt: new Date() },
    update: { clearedAt: new Date() },
  });
}

export async function clearGroupConversation(userId: string, groupId: string) {
  // Verify user is a group member
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error('无权操作此群聊');

  await prisma.groupConversationClear.upsert({
    where: { userId_groupId: { userId, groupId } },
    create: { userId, groupId, clearedAt: new Date() },
    update: { clearedAt: new Date() },
  });
}
