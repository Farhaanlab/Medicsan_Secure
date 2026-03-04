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

async function findBestMatch(name: string): Promise<any | null> {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    // ── STAGE 1: Exact / Structured Search ──
    const queries: Array<{ where: any, take: number, scoreBoost: number }> = [
        { where: { name: { startsWith: lower + ' ' } }, take: 10, scoreBoost: 100 },
        { where: { name: { startsWith: lower } }, take: 10, scoreBoost: 90 },
        { where: { name: { contains: lower } }, take: 5, scoreBoost: 70 },
        { where: { name: { contains: ' ' + lower } }, take: 5, scoreBoost: 60 },
    ];

    const words = lower.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 1) {
        queries.unshift({
            where: {
                AND: words.map(w => ({ name: { contains: w } }))
            },
            take: 10,
            scoreBoost: 85
        });
    }

    const seen = new Set<string>();
    const candidates: Array<{ id: string; name: string; score: number; manufacturer: string; dosageForm: string; price: string }> = [];

    for (const q of queries) {
        try {
            const rows = await prisma.medicineMaster.findMany({
                where: q.where,
                take: q.take,
                select: { id: true, name: true, dosageForm: true, manufacturer: true, price: true },
            });

            for (const r of rows) {
                if (seen.has(r.id)) continue;
                seen.add(r.id);

                const lowerDb = r.name.toLowerCase();
                const firstWord = lowerDb.split(/\s+/)[0];

                let score = q.scoreBoost;

                if (firstWord === lower) score += 30;
                else if (lowerDb.startsWith(lower + ' ')) score += 20;
                else if (lowerDb.startsWith(lower)) score += 10;

                score -= Math.max(0, r.name.length - 20) * 0.5;
                score += Math.min(lower.length * 2, 20);

                candidates.push({
                    id: r.id,
                    name: r.name,
                    score,
                    manufacturer: r.manufacturer || 'Unknown',
                    dosageForm: r.dosageForm || 'Tablet',
                    price: r.price || 'N/A',
                });
            }
        } catch { }
    }

    // ── STAGE 2: Fuzzy / Chunked Search Fallback ──
    if (candidates.length === 0) {
        const alphaChunks = lower.split(/[^a-z]+/).filter(w => w.length >= 3);
        let fuzzyCandidates: any[] = [];

        let fuzzyQuery;
        if (alphaChunks.length > 0) {
            fuzzyQuery = { where: { OR: alphaChunks.map(c => ({ name: { contains: c } })) }, take: 100 };
        } else {
            fuzzyQuery = { where: { name: { startsWith: lower.substring(0, 3) } }, take: 100 };
        }

        try {
            fuzzyCandidates = await prisma.medicineMaster.findMany({
                where: fuzzyQuery.where,
                take: fuzzyQuery.take,
                select: { id: true, name: true, dosageForm: true, manufacturer: true, price: true }
            });

            for (const c of fuzzyCandidates) {
                if (seen.has(c.id)) continue;
                seen.add(c.id);

                const candidateLower = c.name.toLowerCase();
                const baseCandidateName = candidateLower.split(' (')[0]
                    .replace(/\s+(tablet|injection|capsule|syrup|suspension|drops|cream|ointment|gel)\b/gi, '').trim();

                const sliceLen = Math.min(baseCandidateName.length, lower.length + 4);
                const namePrefix = baseCandidateName.substring(0, sliceLen);

                const sim = calculateSimilarity(lower, namePrefix);
                let score = sim * 100;

                const candWords = candidateLower.split(/\s+/);
                for (const w of words) {
                    if (candWords.includes(w)) score += 10;
                }

                candidates.push({
                    id: c.id,
                    name: c.name,
                    score,
                    manufacturer: c.manufacturer || 'Unknown',
                    dosageForm: c.dosageForm || 'Tablet',
                    price: c.price || 'N/A',
                });
            }
        } catch { }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    // Only return if score is high enough (>= 70 points) to avoid incorrect mappings
    if (best.score < 70) return null;

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

    for (const term of terms) {
        console.log(`\nTesting "${term}":`);
        const match = await findBestMatch(term);
        if (match) {
            console.log(`✅ RETURNED: "${match.name}" (Score: ${match.score.toFixed(1)})`);
        } else {
            console.log(`❌ RETURNED NULL`);
        }
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
