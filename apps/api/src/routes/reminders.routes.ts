import { Router } from 'express';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../controllers/reminders.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getReminders);
router.post('/', createReminder);
router.patch('/:id', updateReminder);
router.delete('/:id', deleteReminder);

export default router;
