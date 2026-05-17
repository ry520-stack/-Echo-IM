import prisma from '../utils/prisma';
import * as socketService from './socket.service';

let schedulerStarted = false;

export function startDelayedMessageScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    try {
      const now = new Date();
      const dueMessages = await prisma.delayedMessage.findMany({
        where: { cancelled: false, sendAt: { lte: now } },
      });

      for (const delayed of dueMessages) {
        try {
          const msg = await prisma.message.create({
            data: {
              senderId: delayed.senderId,
              receiverId: delayed.receiverId || null,
              groupId: delayed.groupId || null,
              content: delayed.content,
              type: delayed.type,
            },
            include: {
              sender: { select: { id: true, username: true, nickname: true, avatar: true } },
            },
          });

          await prisma.delayedMessage.update({
            where: { id: delayed.id },
            data: { cancelled: true },
          });

          const io = socketService.getIO();
          if (io) {
            if (delayed.receiverId) {
              io.to(`user:${delayed.senderId}`).emit('message:receive', msg);
              io.to(`user:${delayed.receiverId}`).emit('message:receive', msg);
            } else if (delayed.groupId) {
              io.to(`group:${delayed.groupId}`).emit('message:receive', msg);
            }
          }
        } catch {
          // skip failed messages
        }
      }
    } catch {
      // scheduler error — ignore
    }
  }, 3000); // check every 3 seconds
}

export async function scheduleMessage(
  senderId: string,
  data: {
    receiverId?: string;
    groupId?: string;
    content: string;
    type?: string;
    sendAt: string;
  },
) {
  const sendAt = new Date(data.sendAt);
  if (isNaN(sendAt.getTime())) throw new Error('无效的时间格式');
  if (sendAt <= new Date()) throw new Error('发送时间必须在未来');

  return prisma.delayedMessage.create({
    data: {
      senderId,
      receiverId: data.receiverId || null,
      groupId: data.groupId || null,
      content: data.content,
      type: data.type || 'text',
      sendAt,
    },
  });
}

export async function getScheduledMessages(senderId: string) {
  return prisma.delayedMessage.findMany({
    where: { senderId, cancelled: false, sendAt: { gt: new Date() } },
    orderBy: { sendAt: 'asc' },
  });
}

export async function cancelScheduled(id: string, senderId: string) {
  const dm = await prisma.delayedMessage.findUnique({ where: { id } });
  if (!dm || dm.senderId !== senderId) throw new Error('无权取消');
  return prisma.delayedMessage.update({ where: { id }, data: { cancelled: true } });
}
