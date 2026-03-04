import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function run() {
    const terms = [
        "luti", "sight", "pred", "forte", "ampli", "nak",
        "iopar", "ciopar", "piopar", "biopar",
        "alp", "prax",
        "razo", "para", "650", "20"
    ];

    const results: any = {};
    for (const term of terms) {
        const res = await prisma.medicineMaster.findMany({
            where: { name: { contains: term.toLowerCase() } },
            take: 5,
            select: { id: true, name: true }
        });
        results[term] = res;
    }
    fs.writeFileSync('db-test-broad.json', JSON.stringify(results, null, 2));
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
