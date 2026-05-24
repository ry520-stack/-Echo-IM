import { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import { getIO } from '../services/socket.service';

export async function getMessages(req: Request, res: Response) {
  const { userId } = req.query;
  const before = req.query.before as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId 为必填' });
  }

  try {
    const messages = await messageService.getMessages(req.userId, userId, before, limit);
    res.json(messages);
  } catch (e: any) {
    console.error('[getMessages Error]', e);
    res.status(500).json({ error: '获取消息失败，请稍后重试' });
  }
}

export async function getGroupMessages(req: Request, res: Response) {
  const { groupId } = req.query;
  const before = req.query.before as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId 为必填' });
  }

  try {
    const messages = await messageService.getGroupMessages(req.userId, groupId, before, limit);
    res.json(messages);
  } catch (e: any) {
    console.error('[getGroupMessages Error]', e);
    res.status(500).json({ error: '获取消息失败，请稍后重试' });
  }
}

export async function getConversations(req: Request, res: Response) {
  try {
    const conversations = await messageService.getConversations(req.userId);
    res.json(conversations);
  } catch (e: any) {
    console.error('[getConversations Error]', e);
    res.status(500).json({ error: '获取会话失败，请稍后重试' });
  }
}

export async function recallMessage(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const msg = await messageService.recallMessage(id, req.userId);
    // 广播撤回事件给相关用户
    const io = getIO();
    if (io) {
      if (msg.receiverId) {
        io.to(`user:${msg.receiverId}`).emit('message:recalled', { messageId: msg.id });
      } else if (msg.groupId) {
        io.to(`group:${msg.groupId}`).emit('message:recalled', { messageId: msg.id });
      }
    }
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
    console.error('[consecutiveDays Error]', e);
    res.status(500).json({ error: '获取连续天数失败' });
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
    console.error('[searchMessages Error]', e);
    res.status(500).json({ error: '搜索失败，请稍后重试' });
  }
}

export async function markRead(req: Request, res: Response) {
  const { peerId } = req.body;
  if (!peerId) return res.status(400).json({ error: 'peerId 为必填' });
  try {
    const count = await messageService.markAllRead(req.userId, peerId);
    res.json({ ok: true, count });
  } catch (e: any) {
    console.error('[markRead Error]', e);
    res.status(500).json({ error: '标记已读失败' });
  }
}

// ——— Message hiding (soft-delete for requesting user only) ———

export async function deleteMessage(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await messageService.hideMessage(req.userId, id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function batchDelete(req: Request, res: Response) {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids 为必填（字符串数组）' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ error: '单次最多删除100条消息' });
  }
  try {
    const count = await messageService.batchHideMessages(req.userId, ids);
    res.json({ ok: true, count });
  } catch (e: any) {
    console.error('[batchDelete Error]', e);
    res.status(500).json({ error: '批量删除失败' });
  }
}

export async function clearConversation(req: Request, res: Response) {
  const { peerId, groupId } = req.body;
  if (!peerId && !groupId) {
    return res.status(400).json({ error: 'peerId 或 groupId 为必填' });
  }
  if (peerId && groupId) {
    return res.status(400).json({ error: 'peerId 和 groupId 只能提供一个' });
  }
  try {
    if (peerId) {
      await messageService.clearUserConversation(req.userId, peerId);
    } else {
      await messageService.clearGroupConversation(req.userId, groupId);
    }
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[clearConversation Error]', e);
    res.status(400).json({ error: e.message });
  }
}
