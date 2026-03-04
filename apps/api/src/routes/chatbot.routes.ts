import { Router } from 'express';
import { chat } from '../controllers/chatbot.controller';

const router = Router();

router.post('/', chat);

export default router;
