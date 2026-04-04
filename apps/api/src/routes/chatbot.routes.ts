import { Router } from 'express';
import { chat, clearChat } from '../controllers/chatbot.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, chat);
router.delete('/clear', authenticate, clearChat);

export default router;
