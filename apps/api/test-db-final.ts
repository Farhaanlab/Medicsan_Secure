import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findBestMatch(name: string): Promise<any | null> {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    // Build multiple search queries to maximize finding the right medicine
    // The order matters: most-specific first, broader last
    const queries: Array<{ where: any, take: number, scoreBoost: number }> = [
        // Exact: name starts with "iopar sr" or "pred forte"
        { where: { name: { startsWith: lower + ' ' } }, take: 10, scoreBoost: 100 },
        { where: { name: { startsWith: lower } }, take: 10, scoreBoost: 90 },
        // Multi-word exact: "soha liquigel", "pred forte"
        { where: { name: { contains: lower } }, take: 5, scoreBoost: 70 },
        // Internal word match: " razo" finds " Razo A " etc
        { where: { name: { contains: ' ' + lower } }, take: 5, scoreBoost: 60 },
    ];

    // If it's a multi-word search term (e.g. "pred forte", "razo 20", "para 650") 
    // we want to heavily look for those words anywhere in the name in any order
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
    const candidates: Array<{ id: string; name: string; score: number }> = [];

    for (const q of queries) {
        try {
            const rows = await prisma.medicineMaster.findMany({
                where: q.where,
                take: q.take,
                select: { id: true, name: true },
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

                candidates.push({ id: r.id, name: r.name, score });
            }
        } catch { }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].score >= 80 ? candidates[0] : null;
}

async function run() {
    // These reflect how Gemini will now output them
    const terms = [
        "MILFLODEX",
        "PRED FORTE",
        "AMPLINAK",
        "SOHA LIQUIGEL",
        "PARA 650",
        "RAZO 20",
        "IOPAR SR",
        "ALPRAX 0.25",
        "LUTISIGHT-O"
    ];

    for (const term of terms) {
        const match = await findBestMatch(term);
        if (match) {
            console.log(`✅ MATCH: "${term}" -> "${match.name}" (Score: ${match.score})`);
        } else {
            console.log(`❌ NO MATCH (score < 80 or not found): "${term}"`);
        }
    }
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
