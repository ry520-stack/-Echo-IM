import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as messageController from '../controllers/message.controller';

const router = Router();

router.use(authenticate);
router.get('/conversations', messageController.getConversations);
router.get('/', messageController.getMessages);
router.get('/group', messageController.getGroupMessages);
router.get('/search', messageController.searchMessages);
router.get('/consecutive-days', messageController.consecutiveDays);
router.put('/:id/recall', messageController.recallMessage);
router.put('/read', messageController.markRead);

export default router;
