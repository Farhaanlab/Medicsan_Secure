import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inventory
export const getInventory = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const inventory = await prisma.inventory.findMany({ where: { userId } });
        res.json(inventory);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const importMedicines = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { medicines } = req.body;

        if (!medicines || !Array.isArray(medicines)) {
            return res.status(400).json({ error: 'Invalid medicines format' });
        }

        const items = await prisma.$transaction(
            medicines.map((med: any) => prisma.inventory.create({
                data: {
                    userId,
                    medicineName: med.medicine_name,
                    quantity: 10, // default
                    // Handle dosage and frequency inside notes since inventory doesn't have these columns yet
                    // or maybe we'll just ignore them for now. Let's map them to medicineName if they exist 
                    // or ignore. The schema only has medicineName, quantity, expiryDate.
                }
            }))
        );

        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const addToInventory = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { medicineName, quantity, expiryDate } = req.body;
        const item = await prisma.inventory.create({
            data: {
                userId,
                medicineName,
                quantity: parseInt(quantity) || 10,
                expiryDate: expiryDate ? new Date(expiryDate) : null
            }
        });
        res.json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateInventory = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { quantity } = req.body;
        const item = await prisma.inventory.updateMany({
            where: { id, userId },
            data: { quantity: parseInt(quantity) }
        });
        res.json(item);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteInventory = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        await prisma.inventory.deleteMany({ where: { id, userId } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Intake History
export const getHistory = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const history = await prisma.intakeLog.findMany({
            where: { userId },
            orderBy: { takenAt: 'desc' }
        });
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const logIntake = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { medicineName, status } = req.body;
        const log = await prisma.intakeLog.create({
            data: {
                userId,
                medicineName,
                status // TAKEN, MISSED, SKIPPED
            }
        });
        res.json(log);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const uploadRingtone = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const ringtoneUrl = `/uploads/${req.file.filename}`;

        await prisma.user.update({
            where: { id: userId },
            data: { ringtoneUrl }
        });

        res.json({ ringtoneUrl });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
