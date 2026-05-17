import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as groupController from '../controllers/group.controller';

const router = Router();

router.use(authenticate);
router.get('/', groupController.getMyGroups);
router.post('/', groupController.createGroup);
router.put('/:id/name', groupController.renameGroup);
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:userId', groupController.removeMember);

export default router;
