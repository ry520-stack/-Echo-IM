import { Request, Response } from 'express';
import * as emojiService from '../services/emoji.service';

export async function getEmojis(req: Request, res: Response) {
  try {
    const emojis = await emojiService.getEmojis(req.userId);
    res.json(emojis);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function createEmoji(req: Request, res: Response) {
  const { imageUrl, name } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl 为必填' });
  try {
    const emoji = await emojiService.createEmoji(req.userId, imageUrl, name);
    res.status(201).json(emoji);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function deleteEmoji(req: Request, res: Response) {
  try {
    await emojiService.deleteEmoji(req.params.id, req.userId);
    res.json({ message: '已删除' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
