import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length, len2 = s2.length;
    let prevRow = Array.from({ length: len2 + 1 }, (_, i) => i);
    let currRow = new Array(len2 + 1);

    for (let i = 1; i <= len1; i++) {
        currRow[0] = i;
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,
                currRow[j - 1] + 1,
                prevRow[j - 1] + cost
            );
        }
        const temp = prevRow;
        prevRow = currRow;
        currRow = temp;
    }
    return prevRow[len2];
}

function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

function getTrigrams(text: string): string[] {
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const trigrams: string[] = [];
    if (clean.length < 3) return [clean];
    for (let i = 0; i <= clean.length - 3; i++) {
        trigrams.push(clean.substring(i, i + 3));
    }
    return trigrams;
}

async function findFuzzyMatch(name: string): Promise<any | null> {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    console.time(`DB Query for ${name}`);

    // First, try exact word prefix logic as it's the fastest and safest
    const words = lower.split(/\s+/).filter(w => w.length > 2);
    let candidates: any[] = [];

    if (words.length > 0) {
        // Try to find by the first word's prefix or second word's prefix
        candidates = await prisma.medicineMaster.findMany({
            where: {
                OR: words.map(w => ({ name: { startsWith: w.slice(0, 3) } }))
            },
            take: 200,
            select: { id: true, name: true, dosageForm: true, manufacturer: true, price: true }
        });
    }

    // Fallback: If no heavy candidates, do a trigram search
    if (candidates.length < 10) {
        const trigrams = getTrigrams(lower);
        // Take at most 5 trigrams to avoid excessive DB load
        const selectedTrigrams = trigrams.slice(0, 5);

        candidates = await prisma.medicineMaster.findMany({
            where: {
                OR: selectedTrigrams.map(t => ({ name: { contains: t } }))
            },
            take: 200,
            select: { id: true, name: true, dosageForm: true, manufacturer: true, price: true }
        });
    }

    console.timeEnd(`DB Query for ${name}`);
    console.log(`Fetched ${candidates.length} candidates for "${name}"`);

    // Score all candidates
    const scored = candidates.map(c => {
        let score = 0;
        const candidateLower = c.name.toLowerCase();

        // 1. Overall string similarity (Levenstein on full strings)
        // Only run on the first corresponding characters of the candidate to the search term
        // e.g. if we search "PREOFOPTE", we compare it with "pred forte opthalmic..." sliced to 9 chars

        // Let's strip the dosage form for cleaner similarity matching ("pred forte" vs "pred forte opthalmic")
        const baseCandidateName = candidateLower.split(' (')[0].split(' tablet')[0].split(' injection')[0];

        const sliceLen = Math.min(baseCandidateName.length, lower.length + 3);
        const namePrefix = baseCandidateName.substring(0, sliceLen);

        const sim = calculateSimilarity(lower, namePrefix);
        score += sim * 100; // max 100 points

        // 2. Contains words bonus
        for (const w of words) {
            if (candidateLower.includes(w)) score += 15;
        }

        return { ...c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score < 80) return null;
    return best;
}

async function run() {
    const terms = [
        "PR3D FORTE",    // typo
        "AMPL1NAK",      // typo
        "S0HA LIQUIGEL", // typo
        "PARAMAC 650",   // valid but different
        "RAZ0 20",       // typo
        "ALPRAX O.25",   // typo (O instead of 0)
    ];

    for (const term of terms) {
        const match = await findFuzzyMatch(term);
        if (match) {
            console.log(`✅ MATCH: "${term}" -> "${match.name}" (Score: ${match.score.toFixed(1)})`);
        } else {
            console.log(`❌ NO MATCH: "${term}"`);
        }
        console.log("---");
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
