import prisma from '../utils/prisma';

export async function getMessages(
  userId: string,
  peerId: string,
  before?: string,
  limit = 50,
) {
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

  return messages.reverse();
}

export async function getGroupMessages(
  groupId: string,
  before?: string,
  limit = 50,
) {
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

  return messages.reverse();
}

export async function getConversations(userId: string) {
  // 获取所有最近联系人（私聊）
  const sentMessages = await prisma.message.findMany({
    where: { senderId: userId, receiverId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { receiverId: true, createdAt: true },
    distinct: ['receiverId'],
  });

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: 'desc' },
    select: { senderId: true, createdAt: true },
    distinct: ['senderId'],
  });

  // 合并去重
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

  const peerIds = Array.from(peerMap.keys());

  const peers = await prisma.user.findMany({
    where: { id: { in: peerIds } },
    select: { id: true, username: true, nickname: true, avatar: true, digitalId: true, lastSeenAt: true, status: true },
  });

  // 获取每个会话的最后一条消息和未读数
  const conversations = await Promise.all(
    peers.map(async (peer) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: peer.id },
            { senderId: peer.id, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, type: true, createdAt: true, senderId: true },
      });

      const unreadCount = await prisma.message.count({
        where: {
          senderId: peer.id,
          receiverId: userId,
          isRecalled: false,
          NOT: {
            readReceipts: { some: { userId } },
          },
        },
      });

      return {
        peer,
        lastMessage: lastMsg,
        unreadCount,
        lastTime: peerMap.get(peer.id)?.toISOString() || '',
      };
    }),
  );

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
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
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
  return prisma.message.findMany({
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
}

export async function markAllRead(userId: string, peerId: string) {
  const unreadMessages = await prisma.message.findMany({
    where: {
      senderId: peerId,
      receiverId: userId,
      isRecalled: false,
      readReceipts: { none: { userId } },
    },
    select: { id: true },
  });

  for (const msg of unreadMessages) {
    await prisma.readReceipt.upsert({
      where: { messageId_userId: { messageId: msg.id, userId } },
      create: { messageId: msg.id, userId },
      update: { readAt: new Date() },
    });
  }

  return unreadMessages.length;
}
