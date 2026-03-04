import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReminders = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const reminders = await prisma.reminder.findMany({ where: { userId } });
        res.json(reminders);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createReminder = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { medicineName, time, days, foodTiming, dosage } = req.body;

        const reminder = await prisma.reminder.create({
            data: {
                userId,
                medicineName,
                dosage: dosage || null,
                time: String(time),
                days: typeof days === 'string' ? days : JSON.stringify(days),
                foodTiming: foodTiming || 'ANY',
            }
        });
        res.json(reminder);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateReminder = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { medicineName, time, days, foodTiming, dosage, isActive } = req.body;

        const existing = await prisma.reminder.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Reminder not found' });

        const updated = await prisma.reminder.update({
            where: { id },
            data: {
                ...(medicineName !== undefined && { medicineName }),
                ...(time !== undefined && { time: String(time) }),
                ...(days !== undefined && { days: typeof days === 'string' ? days : JSON.stringify(days) }),
                ...(foodTiming !== undefined && { foodTiming }),
                ...(dosage !== undefined && { dosage }),
                ...(isActive !== undefined && { isActive }),
            }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteReminder = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const existing = await prisma.reminder.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Reminder not found' });

        await prisma.reminder.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
