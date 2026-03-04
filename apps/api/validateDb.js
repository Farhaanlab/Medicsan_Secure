// Validate exact DB entries and find best IDs
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function findBest(term) {
    // Strategy: exact startsWith first, then contains
    const r1 = await p.medicineMaster.findMany({ where: { name: { startsWith: term + ' ' } }, take: 5, select: { id: true, name: true, dosageForm: true, price: true } });
    const r2 = await p.medicineMaster.findMany({ where: { name: { startsWith: term } }, take: 5, select: { id: true, name: true, dosageForm: true, price: true } });
    const r3 = await p.medicineMaster.findMany({ where: { name: { contains: ' ' + term + ' ' } }, take: 3, select: { id: true, name: true, dosageForm: true, price: true } });
    const combined = [...r1, ...r2, ...r3];
    const unique = Array.from(new Map(combined.map(r => [r.id, r])).values());
    return unique.slice(0, 3);
}

async function run() {
    const terms = [
        'milflodex', 'pred forte', 'predforte', 'pred', 'amplinak',
        'soha liquigel', 'soha', 'iopar', 'c iopar', 'iopar sr',
        'alprax 0.25', 'alprax', 'razo 20', 'razo',
        'para 650', 'paracetamol 650', 'paracetamol', 'para',
        'lutisight', 'luti'
    ];

    for (const t of terms) {
        const results = await findBest(t);
        if (results.length > 0) {
            console.log(`"${t}" => ${results.map(r => `"${r.name}" [${r.price}]`).join(' | ')}`);
        } else {
            console.log(`"${t}" => NOT FOUND`);
        }
    }
    await p.$disconnect();
}
run();
