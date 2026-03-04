import { Router } from 'express';
import { signup, login, changePassword, getMe, updateProfile, sendOtp } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts. Please try again later.' }
});

const router = Router();
// Public Auth Routes
router.post('/send-otp', authLimiter, sendOtp);
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
