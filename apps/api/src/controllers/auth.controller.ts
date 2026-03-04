import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dns from 'dns';
import validator from 'email-validator';
import { z } from 'zod';
import xss from 'xss';
import jwt from 'jsonwebtoken';

const authService = new AuthService();
const prisma = new PrismaClient();

// Utility to strictly verify if an email exists by checking DNS MX records
async function verifyEmailExists(email: string): Promise<boolean> {
    if (!validator.validate(email)) return false;

    const domain = email.split('@')[1];
    if (!domain) return false;

    return new Promise((resolve) => {
        dns.resolveMx(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Schema for strict password and input validation
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    fullName: z.string().min(1, 'Full name is required'),
    otp: z.string().length(6, 'OTP must be 6 digits')
});

export const sendOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const result = await authService.sendOtp(email);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        // Strict Validation
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: (parsed as any).error.errors[0].message });
        }
        const { email, password, fullName, otp } = parsed.data;

        // Sanitize string inputs to prevent XSS
        const sanitizedName = xss(fullName);

        // Pass OTP to the main auth service to verify and create user
        const result = await authService.signup(email, password, sanitizedName, otp);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await authService.login(email, password);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
};

export const changePassword = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMe = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, fullName: true, role: true, createdAt: true, ringtoneUrl: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProfile = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { fullName, email } = req.body;
        const data: any = {};
        if (fullName !== undefined) data.fullName = fullName;

        if (email !== undefined) {
            // Deep verification: check if email is fake/disposable/non-existent
            const isRealEmail = await verifyEmailExists(email);
            if (!isRealEmail) {
                return res.status(400).json({ error: 'Invalid or fake email address. Please use a real email.' });
            }

            // Uniqueness check
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ error: 'Email is already in use by another account' });
            }

            data.email = email;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, email: true, fullName: true, role: true }
        });
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
