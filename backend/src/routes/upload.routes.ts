import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../services/upload.service';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

router.use(authenticate);
router.post('/avatar', upload.single('file'), uploadController.uploadAvatar);
router.post('/background', upload.single('file'), uploadController.uploadBackground);
router.post('/chat-image', upload.single('file'), uploadController.uploadChatImage);
router.post('/emoji', upload.single('file'), uploadController.uploadEmoji);

export default router;
