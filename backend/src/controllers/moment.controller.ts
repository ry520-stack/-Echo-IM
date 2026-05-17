import { Request, Response } from 'express';
import * as momentService from '../services/moment.service';

export async function getMoments(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  try {
    const data = await momentService.getMoments(req.userId, page);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function createMoment(req: Request, res: Response) {
  const { content, images } = req.body;
  if (!content?.trim() && (!images || images.length === 0)) return res.status(400).json({ error: '内容或图片不能同时为空' });
  try {
    const moment = await momentService.createMoment(req.userId, content.trim(), images);
    res.status(201).json(moment);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function toggleLike(req: Request, res: Response) {
  try {
    const result = await momentService.toggleLike(req.params.id, req.userId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function addComment(req: Request, res: Response) {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容不能为空' });
  try {
    const comment = await momentService.addComment(req.params.id, req.userId, content.trim());
    res.status(201).json(comment);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function getComments(req: Request, res: Response) {
  try {
    const comments = await momentService.getComments(req.params.id);
    res.json(comments);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteMoment(req: Request, res: Response) {
  try {
    await momentService.deleteMoment(req.params.id, req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function deleteComment(req: Request, res: Response) {
  try {
    await momentService.deleteComment(req.params.id, req.userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
