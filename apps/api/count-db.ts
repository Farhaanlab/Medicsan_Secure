import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const count = await prisma.medicineMaster.count();
    console.log(`Total medicines in DB: ${count}`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
