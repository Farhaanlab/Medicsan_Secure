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
    await prisma.$executeRawUnsafe(`DELETE FROM MedicineMaster`);
    console.log('Cleared existing medicines.');

    // Insert in batches using raw SQL
    const BATCH_SIZE = 200;
    let inserted = 0;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);

        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 0;

        for (const row of batch) {
            const comp1 = row.short_composition1 || '';
            const comp2 = row.short_composition2 || '';
            const composition = comp2 ? `${comp1} + ${comp2}` : comp1;
            const name = (row.name || 'Unknown').trim();
            const manufacturer = (row.manufacturer_name || '').trim() || null;
            const price = row['price(₹)'] ? String(row['price(₹)']).trim() : null;
            const dosageForm = (row.type || '').trim() || null;
            const packSizeLabel = (row.pack_size_label || '').trim() || null;
            const description = `Type: ${row.type || 'N/A'}, Pack: ${row.pack_size_label || 'N/A'}`;
            const id = randomUUID();

            values.push(`('${id.replace(/'/g, "''")}', '${name.replace(/'/g, "''")}', ${manufacturer ? `'${manufacturer.replace(/'/g, "''")}'` : 'NULL'}, ${composition.trim() ? `'${composition.trim().replace(/'/g, "''")}'` : 'NULL'}, ${description ? `'${description.replace(/'/g, "''")}'` : 'NULL'}, ${dosageForm ? `'${dosageForm.replace(/'/g, "''")}'` : 'NULL'}, ${price ? `'${price.replace(/'/g, "''")}'` : 'NULL'}, ${packSizeLabel ? `'${packSizeLabel.replace(/'/g, "''")}'` : 'NULL'})`);
        }

        if (values.length > 0) {
            const sql = `INSERT INTO MedicineMaster (id, name, manufacturer, composition, description, dosageForm, price, packSizeLabel) VALUES ${values.join(', ')}`;
            try {
                await prisma.$executeRawUnsafe(sql);
                inserted += values.length;
            } catch (e: any) {
                // If batch fails, try one by one
                for (const v of values) {
                    try {
                        await prisma.$executeRawUnsafe(`INSERT INTO MedicineMaster (id, name, manufacturer, composition, description, dosageForm, price, packSizeLabel) VALUES ${v}`);
                        inserted++;
                    } catch (e2: any) {
                        // Skip bad row
                    }
                }
            }
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
