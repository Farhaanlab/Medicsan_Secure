import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bhctrpzryyeebgshppsa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dFGfHHb8uOQw2zBy_barnw_SMW6R74_';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const authenticate = async (req: Request | any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Try verifying against legacy local JWT secret first
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (error) {
        // Fallback: This might be a Supabase JWT! Verify it against the Supabase Auth API
        const { data, error: supaErr } = await supabase.auth.getUser(token);
        if (!supaErr && data.user) {
            req.user = { id: data.user.id, email: data.user.email };
            
            // Sync the user to the public schema to satisfy Prisma foreign key constraints
            try {
                await prisma.user.upsert({
                    where: { id: data.user.id },
                    update: {},
                    create: {
                        id: data.user.id,
                        email: data.user.email || '',
                        passwordHash: 'supabase_auth', // Handled externally
                        fullName: data.user.user_metadata?.name || null,
                    }
                });
            } catch (syncErr) {
                console.warn('Failed to sync Supabase user to public schema', syncErr);
            }

            return next();
        }

        res.status(401).json({ error: 'Invalid token' });
    }
};
