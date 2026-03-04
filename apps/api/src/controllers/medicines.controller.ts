import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded common medicines as fallback if DB is empty
const FALLBACK_MEDICINES = [
    { id: 'f1', name: 'Dolo 650mg Tablet', manufacturer: 'Micro Labs Ltd', composition: 'Paracetamol (650mg)', price: '30.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Fever & Pain relief' },
    { id: 'f2', name: 'Dolo 500mg Tablet', manufacturer: 'Micro Labs Ltd', composition: 'Paracetamol (500mg)', price: '25.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Fever & Pain relief' },
    { id: 'f3', name: 'Crocin 650mg Tablet', manufacturer: 'GlaxoSmithKline', composition: 'Paracetamol (650mg)', price: '28.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Fever & Pain relief' },
    { id: 'f4', name: 'Azithral 500mg Tablet', manufacturer: 'Alembic Pharmaceuticals', composition: 'Azithromycin (500mg)', price: '119.00', dosageForm: 'tablet', packSizeLabel: 'strip of 5 tablets', description: 'Antibiotic' },
    { id: 'f5', name: 'Amoxyclav 625mg Tablet', manufacturer: 'Cipla Ltd', composition: 'Amoxicillin (500mg) + Clavulanic Acid (125mg)', price: '210.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Antibiotic' },
    { id: 'f6', name: 'Pan 40mg Tablet', manufacturer: 'Alkem Laboratories', composition: 'Pantoprazole (40mg)', price: '85.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Acidity & Ulcers' },
    { id: 'f7', name: 'Cetirizine 10mg Tablet', manufacturer: 'Cipla Ltd', composition: 'Cetirizine (10mg)', price: '18.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Allergy relief' },
    { id: 'f8', name: 'Metformin 500mg Tablet', manufacturer: 'USV Pvt Ltd', composition: 'Metformin (500mg)', price: '22.00', dosageForm: 'tablet', packSizeLabel: 'strip of 20 tablets', description: 'Diabetes management' },
    { id: 'f9', name: 'Amlodipine 5mg Tablet', manufacturer: 'Cipla Ltd', composition: 'Amlodipine (5mg)', price: '30.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Blood pressure control' },
    { id: 'f10', name: 'Atorvastatin 10mg Tablet', manufacturer: 'Cipla Ltd', composition: 'Atorvastatin (10mg)', price: '110.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Cholesterol management' },
    { id: 'f11', name: 'Paracetamol 500mg Tablet', manufacturer: 'GSK', composition: 'Paracetamol (500mg)', price: '12.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Fever & Pain relief' },
    { id: 'f12', name: 'Ibuprofen 400mg Tablet', manufacturer: 'Abbott', composition: 'Ibuprofen (400mg)', price: '35.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Pain & Inflammation' },
    { id: 'f13', name: 'Omeprazole 20mg Capsule', manufacturer: 'Sun Pharma', composition: 'Omeprazole (20mg)', price: '48.00', dosageForm: 'capsule', packSizeLabel: 'strip of 15 capsules', description: 'Acid reflux' },
    { id: 'f14', name: 'Montelukast 10mg Tablet', manufacturer: 'Sun Pharma', composition: 'Montelukast (10mg)', price: '155.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Asthma & Allergies' },
    { id: 'f15', name: 'Losartan 50mg Tablet', manufacturer: 'Torrent Pharma', composition: 'Losartan (50mg)', price: '55.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Blood pressure' },
    { id: 'f16', name: 'Allegra 120mg Tablet', manufacturer: 'Sanofi India', composition: 'Fexofenadine (120mg)', price: '218.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Allergy relief' },
    { id: 'f17', name: 'Augmentin 625mg Tablet', manufacturer: 'GlaxoSmithKline', composition: 'Amoxicillin (500mg) + Clavulanic Acid (125mg)', price: '245.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Antibiotic' },
    { id: 'f18', name: 'Ciprofloxacin 500mg Tablet', manufacturer: 'Cipla Ltd', composition: 'Ciprofloxacin (500mg)', price: '42.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Antibiotic' },
    { id: 'f19', name: 'Vitamin D3 60000 IU', manufacturer: 'USV Pvt Ltd', composition: 'Cholecalciferol (60000IU)', price: '120.00', dosageForm: 'capsule', packSizeLabel: 'strip of 4 capsules', description: 'Vitamin D supplement' },
    { id: 'f20', name: 'Shelcal 500mg Tablet', manufacturer: 'Torrent Pharma', composition: 'Calcium (500mg) + Vitamin D3 (250IU)', price: '142.00', dosageForm: 'tablet', packSizeLabel: 'bottle of 30 tablets', description: 'Calcium supplement' },
    { id: 'f21', name: 'Combiflam Tablet', manufacturer: 'Sanofi India', composition: 'Ibuprofen (400mg) + Paracetamol (325mg)', price: '38.00', dosageForm: 'tablet', packSizeLabel: 'strip of 20 tablets', description: 'Pain & Fever relief' },
    { id: 'f22', name: 'Zincovit Tablet', manufacturer: 'Apex Laboratories', composition: 'Multivitamin + Zinc', price: '115.00', dosageForm: 'tablet', packSizeLabel: 'strip of 15 tablets', description: 'Multivitamin supplement' },
    { id: 'f23', name: 'Limcee 500mg Tablet', manufacturer: 'Abbott', composition: 'Ascorbic Acid (500mg)', price: '32.00', dosageForm: 'tablet', packSizeLabel: 'bottle of 100 tablets', description: 'Vitamin C supplement' },
    { id: 'f24', name: 'ORS Electral Powder', manufacturer: 'FDC Ltd', composition: 'Oral Rehydration Salts', price: '20.00', dosageForm: 'powder', packSizeLabel: 'packet of 4.4g', description: 'Rehydration' },
    { id: 'f25', name: 'Disprin Tablet', manufacturer: 'Reckitt Benckiser', composition: 'Aspirin (350mg)', price: '8.00', dosageForm: 'tablet', packSizeLabel: 'strip of 10 tablets', description: 'Headache relief' },
];

export const searchMedicines = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        // Try DB first
        const medicines = await prisma.medicineMaster.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { composition: { contains: q } }
                ]
            },
            take: 20
        });

        // If DB has results, return them
        if (medicines.length > 0) {
            return res.json(medicines);
        }

        // DB case-insensitive fallback
        const allMeds = await prisma.medicineMaster.findMany({ take: 500 });
        if (allMeds.length > 0) {
            const lowerQ = q.toLowerCase();
            const filtered = allMeds.filter(m =>
                m.name.toLowerCase().includes(lowerQ) ||
                (m.composition && (m.composition as string).toLowerCase().includes(lowerQ))
            );
            if (filtered.length > 0) {
                return res.json(filtered.slice(0, 20));
            }
        }

        // Final fallback: use hardcoded medicines
        const lowerQ = q.toLowerCase();
        const fallbackResults = FALLBACK_MEDICINES.filter(m =>
            m.name.toLowerCase().includes(lowerQ) ||
            m.composition.toLowerCase().includes(lowerQ)
        );
        return res.json(fallbackResults.slice(0, 20));

    } catch (error: any) {
        // If DB errors out entirely, still return fallback results
        try {
            const lowerQ = (req.query.q as string).toLowerCase();
            const fallbackResults = FALLBACK_MEDICINES.filter(m =>
                m.name.toLowerCase().includes(lowerQ) ||
                m.composition.toLowerCase().includes(lowerQ)
            );
            return res.json(fallbackResults.slice(0, 20));
        } catch {
            res.status(500).json({ error: error.message });
        }
    }
};

export const getMedicineById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check DB first
        const medicine = await prisma.medicineMaster.findUnique({
            where: { id }
        });
        if (medicine) return res.json(medicine);

        // Check fallback
        const fallback = FALLBACK_MEDICINES.find(m => m.id === id);
        if (fallback) return res.json(fallback);

        return res.status(404).json({ error: 'Medicine not found' });
    } catch (error: any) {
        // Fallback on error too
        const fallback = FALLBACK_MEDICINES.find(m => m.id === req.params.id);
        if (fallback) return res.json(fallback);
        res.status(500).json({ error: error.message });
    }
};
