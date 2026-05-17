import { Request, Response } from 'express';
import * as delayedService from '../services/delayed.service';

export async function schedule(req: Request, res: Response) {
  const { receiverId, groupId, content, type, sendAt } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '消息内容不能为空' });
  if (!sendAt) return res.status(400).json({ error: '发送时间为必填' });
  if (!receiverId && !groupId) return res.status(400).json({ error: 'receiverId 或 groupId 为必填' });

  try {
    const dm = await delayedService.scheduleMessage(req.userId, {
      receiverId,
      groupId,
      content: content.trim(),
      type: type || 'text',
      sendAt,
    });
    res.status(201).json(dm);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function getScheduled(req: Request, res: Response) {
  try {
    const messages = await delayedService.getScheduledMessages(req.userId);
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    await delayedService.cancelScheduled(req.params.id, req.userId);
    res.json({ message: '已取消定时消息' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
