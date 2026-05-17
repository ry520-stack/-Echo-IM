import { Request, Response } from 'express';
import * as messageService from '../services/message.service';

export async function getMessages(req: Request, res: Response) {
  const { userId } = req.query;
  const before = req.query.before as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId 为必填' });
  }

  try {
    const messages = await messageService.getMessages(req.userId, userId, before, limit);
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getGroupMessages(req: Request, res: Response) {
  const { groupId } = req.query;
  const before = req.query.before as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId 为必填' });
  }

  try {
    const messages = await messageService.getGroupMessages(groupId, before, limit);
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function getConversations(req: Request, res: Response) {
  try {
    const conversations = await messageService.getConversations(req.userId);
    res.json(conversations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function recallMessage(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const msg = await messageService.recallMessage(id, req.userId);
    res.json(msg);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function consecutiveDays(req: Request, res: Response) {
  const { peerId } = req.query;
  if (!peerId || typeof peerId !== 'string') {
    return res.status(400).json({ error: 'peerId 为必填' });
  }
  try {
    const days = await messageService.getConsecutiveDays(req.userId, peerId);
    res.json({ days, userIdA: req.userId, userIdB: peerId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function searchMessages(req: Request, res: Response) {
  const q = req.query.q as string;
  if (!q) {
    return res.status(400).json({ error: 'q 为必填' });
  }
  try {
    const messages = await messageService.searchMessages(req.userId, q);
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function markRead(req: Request, res: Response) {
  const { peerId } = req.body;
  if (!peerId) return res.status(400).json({ error: 'peerId 为必填' });
  try {
    const count = await messageService.markAllRead(req.userId, peerId);
    res.json({ ok: true, count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
