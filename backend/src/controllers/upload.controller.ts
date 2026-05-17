import { Request, Response } from 'express';
import { getUploadUrl } from '../services/upload.service';
import prisma from '../utils/prisma';

// POST /api/upload/avatar
export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }
  const url = getUploadUrl(req.file.filename);
  await prisma.user.update({ where: { id: req.userId }, data: { avatar: url } });
  res.json({ url });
}

// POST /api/upload/background
export async function uploadBackground(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }
  const url = getUploadUrl(req.file.filename);
  res.json({ url });
}

// POST /api/upload/chat-image
export async function uploadChatImage(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }
  const url = getUploadUrl(req.file.filename);
  res.json({ url });
}

// POST /api/upload/emoji
export async function uploadEmoji(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }
  const url = getUploadUrl(req.file.filename);
  const name = req.body.name || 'emoji';
  const emoji = await prisma.emoji.create({
    data: { userId: req.userId, imageUrl: url, name },
  });
  res.status(201).json(emoji);
}
