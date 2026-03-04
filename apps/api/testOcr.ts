// Test script: simulates what Gemini returns for the user's prescription image
// then runs those names through the DB matcher logic

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const NOISE_WORDS = new Set([
    'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'injection', 'cream',
    'ointment', 'drops', 'suspension', 'inhaler', 'lotion', 'powder', 'sachet',
    'take', 'after', 'before', 'food', 'meals', 'daily', 'days', 'times',
    'morning', 'evening', 'night', 'with', 'water', 'empty', 'stomach',
    'doctor', 'patient', 'date', 'name', 'hospital', 'clinic', 'medical',
    'prescription', 'diagnosis', 'complaint', 'advice', 'follow', 'review',
    'the', 'and', 'for', 'not', 'are', 'was', 'were', 'also', 'only',
    'oral', 'route', 'use', 'size', 'each', 'left', 'right', 'eye', 'drop',
    'post', 'operative', 'ophthalmic', 'alternate', 'nights', 'continue',
    'till', 'gets', 'over', 'your', 'next', 'appointment', 'liquigel'
]);

// These are EXACTLY what Gemini would extract from the user's prescription image
const PRESCRIPTION_MEDICINES = [
    "MILFLODEX",
    "PREDFORTE",
    "AMPLINAK",
    "SOHA",
    "PARA",
    "RAZO",
    "IOPAR",
    "ALPRAX",
    "LUTISIGHT",
];

async function matchFromDatabase(input: string[]): Promise<any[]> {
    const topCandidates = input
        .map(w => w.replace(/[^a-zA-Z\s]/g, ' ').trim().toLowerCase())
        .filter(w => w.length >= 3 && !NOISE_WORDS.has(w));

    console.log('🔍 Candidates:', topCandidates);

    interface ScoredMatch {
        medicine_name: string;
        score: number;
        id: string;
    }

    const allMatches: ScoredMatch[] = [];
    const matchedIds = new Set<string>();

    for (const term of topCandidates) {
        if (!term || term.length < 3) continue;

        const results = await prisma.medicineMaster.findMany({
            where: {
                OR: [
                    { name: { startsWith: term + ' ' } },
                    { name: { startsWith: term } },
                    { name: { contains: ' ' + term } },
                ]
            },
            take: 15,
            select: { id: true, name: true }
        });

        for (const r of results) {
            if (matchedIds.has(r.id)) continue;

            const lowerName = r.name.toLowerCase();
            const firstWord = lowerName.split(/\s+/)[0];

            let score = 0;
            if (firstWord === term) score = 100;
            else if (lowerName.startsWith(term)) score = 90;
            else if (firstWord.startsWith(term)) score = 80;
            else score = 40;

            score += term.length * 3;
            score -= Math.max(0, r.name.length - 25);

            matchedIds.add(r.id);
            allMatches.push({ id: r.id, medicine_name: r.name, score });
        }
    }

    allMatches.sort((a, b) => b.score - a.score);
    return allMatches.filter(m => m.score >= 90).slice(0, 8);
}

async function run() {
    console.log('\n=== STANDALONE PRESCRIPTION SCAN TEST ===\n');
    console.log('Testing medicines from user prescription image:', PRESCRIPTION_MEDICINES);
    console.log('');

    const results = await matchFromDatabase(PRESCRIPTION_MEDICINES);

    console.log('\n=== RESULTS ===\n');
    if (results.length === 0) {
        console.log('❌ NO MATCHES FOUND - scoring too strict or data not in DB');
    } else {
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.medicine_name} [score: ${r.score}]`);
        });
    }

    // Also test per-term to see which ones found/didn't find
    console.log('\n=== PER-TERM RESULTS ===\n');
    for (const term of PRESCRIPTION_MEDICINES) {
        const lower = term.toLowerCase();
        const r = await prisma.medicineMaster.findMany({
            where: {
                OR: [
                    { name: { startsWith: lower + ' ' } },
                    { name: { startsWith: lower } },
                    { name: { contains: ' ' + lower } },
                ]
            },
            take: 3,
            select: { name: true }
        });
        console.log(`"${term}" → ${r.length > 0 ? r.map(x => x.name).join(' | ') : '❌ NOT FOUND'}`);
    }

    await prisma.$disconnect();
}

run().catch(console.error);
