import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

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

async function findFuzzyMatch(name: string): Promise<any | null> {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    const alphaChunks = lower.split(/[^a-z]+/).filter(w => w.length >= 3);
    let candidates: any[] = [];
    const queries = [];

    if (alphaChunks.length > 0) {
        queries.push({
            where: { OR: alphaChunks.map(c => ({ name: { contains: c } })) },
            take: 100,
        });
    } else {
        queries.push({
            where: { name: { startsWith: lower.substring(0, 3) } },
            take: 100
        });
    }

    for (const q of queries) {
        if (candidates.length > 0) break;
        candidates = await prisma.medicineMaster.findMany({
            where: q.where,
            take: q.take,
            select: { id: true, name: true, dosageForm: true, manufacturer: true, price: true }
        });
    }

    const scored = candidates.map(c => {
        let score = 0;
        const candidateLower = c.name.toLowerCase();

        const baseCandidateName = candidateLower.split(' (')[0]
            .replace(/\s+(tablet|injection|capsule|syrup|suspension|drops|cream|ointment|gel)\b/gi, '').trim();

        const sliceLen = Math.min(baseCandidateName.length, lower.length + 4);
        const namePrefix = baseCandidateName.substring(0, sliceLen);

        const sim = calculateSimilarity(lower, namePrefix);
        score += sim * 100;

        const words = lower.split(/\s+/).filter(w => w.length >= 3);
        const candWords = candidateLower.split(/\s+/);

        for (const w of words) {
            if (candWords.includes(w)) score += 10;
        }

        return { ...c, score, sim, baseCandidateName };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score < 80) return null;
    return best;
}

async function run() {
    const terms = [
        "PR3D FORTE",
        "AMPL1NAK",
        "S0HA LIQUIGEL",
        "PARAMAC 650",
        "RAZ0 20",
        "ALPRAX O.25",
    ];
    let logs = [];
    for (const term of terms) {
        const match = await findFuzzyMatch(term);
        if (match) {
            logs.push(`✅ MATCH: "${term}" -> "${match.name}" (Score: ${match.score.toFixed(1)})`);
        } else {
            logs.push(`❌ NO MATCH: "${term}"`);
        }
    }
    fs.writeFileSync('fuzzy-results.json', JSON.stringify(logs, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
