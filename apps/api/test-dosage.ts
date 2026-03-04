import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const POPULAR_MEDICINES = [
    'glycomet', 'vogs', 'corbis', 'huminsulin', 'olmezest',
    'paracetamol', 'dolo', 'azithromycin', 'amoxicillin', 'crocin',
    'cetirizine', 'omeprazole', 'pantoprazole', 'metformin', 'aspirin',
    'atorvastatin', 'amlodipine', 'telmisartan', 'losartan', 'ibuprofen',
    'combiflam', 'allegra', 'calpol', 'augmentin', 'sinarest', 'rantac'
];

function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function normalizeText(text: string): string {
    return text
        .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'take', 'tablet']);

async function testOCRLogic(rawText: string) {
    console.log('Testing text:', rawText);
    const normalizedText = normalizeText(rawText);

    let words = normalizedText
        .split(/\s+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

    words = words.map(word => {
        if (word.length < 4) return word;
        let closestMed = word;
        let bestDistance = 999;

        for (const med of POPULAR_MEDICINES) {
            const dist = levenshtein(word, med);
            const maxAllowedDistance = med.length > 6 ? 3 : 2;
            if (dist <= maxAllowedDistance && dist < bestDistance) {
                bestDistance = dist;
                closestMed = med;
            }
        }
        return closestMed;
    });

    const uniqueWords = [...new Set(words)];
    const potentialMatches: any[] = [];
    const matchedIds = new Set<string>();

    for (let i = 0; i < Math.min(uniqueWords.length, 30); i++) {
        const word = uniqueWords[i];
        if (word.length < 3) continue;

        const matches = await prisma.medicineMaster.findMany({
            where: { name: { contains: word } },
            take: 10,
        });

        for (const match of matches) {
            if (!matchedIds.has(match.id)) {
                matchedIds.add(match.id);
                potentialMatches.push(match);
            }
        }
    }

    // Dosage boosting logic
    const dosageNumbers = rawText.match(/\b\d+(?:\.\d+)?\b/g) || [];
    const uniqueDosages = [...new Set(dosageNumbers)];

    if (uniqueDosages.length > 0) {
        potentialMatches.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            uniqueDosages.forEach(d => {
                const regex = new RegExp(`\\b${d}\\b`);
                if (regex.test(a.name) || (a.composition && regex.test(a.composition))) scoreA += 10;
                if (regex.test(b.name) || (b.composition && regex.test(b.composition))) scoreB += 10;
            });
            return scoreB - scoreA;
        });
    }

    console.log(`Top 5 Matches sorted by dosage logic for parsed dosags ${uniqueDosages.join(', ')}:`);
    potentialMatches.slice(0, 5).forEach(m => console.log(m.name));
    prisma.$disconnect();
}

testOCRLogic("Paracetamol 650mg\nDolo 500");
