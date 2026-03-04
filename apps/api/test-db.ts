import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function run() {
    const terms = [
        "pred forte", "predforte",
        "amplinak", "amplinac",
        "soha", "soha liquigel",
        "para", "tpara", "para 650",
        "razo", "trazo",
        "iopar", "ciopar",
        "alprax", "talprax",
        "lutisight", "tlutisight",
        "milflodex"
    ];

    const results: any = {};
    for (const term of terms) {
        const lower = term.toLowerCase();
        const res = await prisma.medicineMaster.findMany({
            where: { name: { contains: lower } },
            take: 3,
            select: { id: true, name: true, dosageForm: true }
        });
        results[term] = res;
    }
    fs.writeFileSync('db-test-results.json', JSON.stringify(results, null, 2));
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
