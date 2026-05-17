import { Request, Response } from 'express';
import * as groupService from '../services/group.service';

export async function getMyGroups(req: Request, res: Response) {
  try {
    const groups = await groupService.getMyGroups(req.userId);
    res.json(groups);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function createGroup(req: Request, res: Response) {
  const { name, memberIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '群组名称为必填' });
  }
  try {
    const group = await groupService.createGroup(req.userId, name.trim(), memberIds || []);
    res.status(201).json(group);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function renameGroup(req: Request, res: Response) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '群组名称为必填' });
  }
  try {
    const group = await groupService.renameGroup(req.params.id, req.userId, name.trim());
    res.json(group);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function addMembers(req: Request, res: Response) {
  const { memberIds } = req.body;
  if (!memberIds || !memberIds.length) {
    return res.status(400).json({ error: 'memberIds 为必填' });
  }
  try {
    const group = await groupService.addMembers(req.params.id, req.userId, memberIds);
    res.json(group);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function removeMember(req: Request, res: Response) {
  const { userId: targetUserId } = req.params;
  try {
    await groupService.removeMember(req.params.id, req.userId, targetUserId);
    res.json({ message: '已移出群组' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
