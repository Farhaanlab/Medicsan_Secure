import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function search() {
    const names = ['Glycomet', 'Vogs', 'Corbis', 'Olmezest', 'Homi', 'Homatil', 'Homochek'];
    let out = '';
    for (const name of names) {
        const m = await prisma.medicineMaster.findMany({
            where: { name: { contains: name } },
            take: 2
        });
        out += `Searched ${name}: ` + (m.length ? m.map(x => x.name).join(', ') : 'Not Found') + '\n';
    }
    fs.writeFileSync('test-img.txt', out, 'utf-8');
}
search()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
