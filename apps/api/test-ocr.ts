import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'take', 'tablet', 'tablets', 'capsule', 'capsules',
    'once', 'twice', 'daily', 'morning', 'evening', 'night', 'after', 'before',
    'food', 'meal', 'days', 'weeks', 'times', 'date', 'name', 'patient',
    'doctor', 'address', 'phone', 'hospital', 'clinic', 'prescribed', 'prescription',
    'this', 'that', 'from', 'have', 'been', 'will', 'should', 'must', 'each',
    'every', 'apply', 'dose', 'dosage', 'quantity', 'strip', 'bottle', 'pack',
]);

function normalizeText(text: string): string {
    return text
        // Fix common OCR misreads in handwritten text
        .replace(/[|]/g, 'l')
        .replace(/0/g, 'o')
        .replace(/1(?=[a-z])/gi, 'l')
        .replace(/5(?=[a-z])/gi, 's')
        // Remove special chars but keep alphanumeric and spaces
        .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function testOCRLogic(rawText: string) {
    console.log('Testing text:', rawText);
    const normalizedText = normalizeText(rawText);
    console.log('Normalized Text:', normalizedText);

    const words = normalizedText
        .split(/\s+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

    const uniqueWords = [...new Set(words)];
    console.log('Candidate words:', uniqueWords);

    const potentialMatches: any[] = [];
    const matchedIds = new Set<string>();

    for (let i = 0; i < Math.min(uniqueWords.length, 30); i++) {
        const word = uniqueWords[i];
        if (word.length < 4) continue;

        const matches = await prisma.medicineMaster.findMany({
            where: { name: { contains: word } },
            take: 3,
        });

        console.log(`Matches for '${word}':`, matches.map(m => m.name));

        if (i + 1 < uniqueWords.length) {
            const twoWord = `${uniqueWords[i]} ${uniqueWords[i + 1]}`;
            const matches2 = await prisma.medicineMaster.findMany({
                where: { name: { contains: twoWord } },
                take: 2,
            });
            console.log(`Matches for '${twoWord}':`, matches2.map(m => m.name));
        }
    }
    prisma.$disconnect();
}

testOCRLogic("Rx\nPatient Name: John Doe\nParacetamol 500mg\nTake once daily\nDolo 650\nAmoxicillin 250mg capsule");
