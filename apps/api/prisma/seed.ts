// apps/api/prisma/seed.ts
// Uses raw SQL for maximum SQLite compatibility

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const csvFilePath = path.join(__dirname, 'seeds', 'dataset.csv');

    if (!fs.existsSync(csvFilePath)) {
        console.error('Dataset CSV not found at:', csvFilePath);
        return;
    }

    console.log('Starting seed from:', csvFilePath);

    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data: any) => results.push(data))
            .on('end', () => resolve())
            .on('error', (err: any) => reject(err));
    });

    console.log(`Parsed ${results.length} rows.`);

    // Clear existing
    await prisma.medicineMaster.deleteMany({});
    console.log('Cleared existing medicines.');

    // Insert in batches using Prisma
    const BATCH_SIZE = 2000;
    let inserted = 0;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        const dataToInsert = batch.map(row => {
            const comp1 = row.short_composition1 || '';
            const comp2 = row.short_composition2 || '';
            const composition = comp2 ? `${comp1} + ${comp2}` : comp1;
            
            return {
                id: randomUUID(),
                name: (row.name || 'Unknown').trim(),
                manufacturer: (row.manufacturer_name || '').trim() || null,
                composition: composition.trim() || null,
                description: `Type: ${row.type || 'N/A'}, Pack: ${row.pack_size_label || 'N/A'}`,
                dosageForm: (row.type || '').trim() || null,
                price: row['price(₹)'] ? String(row['price(₹)']).trim() : null,
                packSizeLabel: (row.pack_size_label || '').trim() || null
            };
        });

        try {
            const created = await prisma.medicineMaster.createMany({
                data: dataToInsert,
                skipDuplicates: true
            });
            inserted += created.count;
        } catch (e: any) {
            console.error('Batch error on index', i);
        }

        if (i % 10000 === 0) {
            console.log(`Progress: ${inserted} inserted / ${results.length} total (${Math.round(inserted / results.length * 100)}%)`);
        }
    }

    console.log(`\nSeeding completed! Total inserted: ${inserted} medicines out of ${results.length} rows.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
