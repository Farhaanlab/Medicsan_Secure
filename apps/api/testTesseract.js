// Test Tesseract OCR on the prescription image with different PSM modes
// PSM 4 = single column, PSM 6 = single block, PSM 1 = auto with OSD
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imagePath = 'C:\\Users\\faarh\\.gemini\\antigravity\\brain\\5c3a89b3-4d46-44b7-9f25-ced730128185\\media__1772471097240.png';

const OCR_NOISE = new Set([
    'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'injection', 'cream',
    'ointment', 'drops', 'suspension', 'inhaler', 'lotion', 'powder', 'sachet',
    'take', 'after', 'before', 'food', 'meals', 'daily', 'days', 'times',
    'morning', 'evening', 'night', 'with', 'water', 'empty', 'stomach',
    'doctor', 'patient', 'date', 'name', 'hospital', 'clinic', 'medical',
    'the', 'and', 'for', 'not', 'are', 'was', 'were', 'also', 'only',
    'oral', 'route', 'use', 'size', 'each', 'left', 'right', 'eye', 'drop',
    'post', 'operative', 'ophthalmic', 'alternate', 'nights', 'continue',
    'till', 'gets', 'over', 'your', 'next', 'appointment', 'unevenful',
    'uneventful', 'discharge', 'period', 'medication', 'optic', 'hourly',
    'liquigel', 'sos', 'alternate', 'times', 'tablets', 'once',
    'strident', 'please', 'call', 'immediately', 'contact',
]);

function extractMedicineNamesFromOcr(rawText) {
    console.log('\n--- RAW OCR TEXT ---');
    console.log(rawText);
    console.log('--- END RAW TEXT ---\n');

    const candidates = [];
    const seen = new Set();

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 1);

    for (const line of lines) {
        // 1. Remove leading numbers/bullets: "1." "2." "1 -" etc.
        let clean = line.replace(/^\d+[\s\.\)\-—]+/, '').trim();

        // 2. Remove prefixes like T., C., I., S.
        clean = clean.replace(/^[TCISJtcisj][\.\,]\s*/i, '').trim();

        // 3. Remove dosages
        clean = clean.replace(/\d+(\.\d+)?\s*(mg|ml|mcg|gm|g|iu|%|units?)/gi, '').trim();

        // 4. Remove frequency patterns
        clean = clean.replace(/\d+[-–—]\d+[-–—]\d+/g, '').trim();
        clean = clean.replace(/\*\s*\d+\s*(days?|months?|sos|week)/gi, '').trim();
        clean = clean.replace(/\b(od|bd|tds|qid|sos|hs|prn|stat|sr|0)\b/gi, '').trim();
        clean = clean.replace(/\bE\/d\b/gi, '').trim();

        // 5. Remove date patterns
        clean = clean.replace(/\d{2}[\/\.]\d{2}[\/\.]\d{4}/g, '').trim();

        // 6. Remove column separators (dashes used as alignment)
        clean = clean.replace(/[-–—]{3,}/g, ' ').trim();
        clean = clean.replace(/[|\t]+/g, ' ').trim();

        // 7. Remove trailing numbers and asterisks
        clean = clean.replace(/\s+\d+\s*$/, '').trim();
        clean = clean.replace(/^\*+\s*/, '').trim();

        // 8. Collapse whitespace
        clean = clean.replace(/\s+/g, ' ').trim();

        if (!clean || clean.length < 3) continue;

        // Extract potential medicine name(s) from the cleaned line
        // Typically the medicine name is the first valid word(s) in a line
        const words = clean.split(/\s+/);
        const medicineParts = [];

        for (const w of words) {
            if (w.length < 2) continue;
            // Stop at frequency/noise words
            if (OCR_NOISE.has(w.toLowerCase())) break;
            // Stop at purely numeric content
            if (/^\d+$/.test(w)) break;
            // Stop at frequency indicators
            if (/^(1|2|3|4)$/.test(w)) break;
            medicineParts.push(w);
            // Usually medicine name is 1-2 words max for Indian prescriptions
            if (medicineParts.length >= 2) break;
        }

        if (medicineParts.length === 0) continue;
        const medicineName = medicineParts.join(' ').trim();

        // Filter out very short single-letter results and noise words
        if (medicineName.length < 3) continue;
        if (OCR_NOISE.has(medicineName.toLowerCase())) continue;
        // Filter pure numbers
        if (/^\d+$/.test(medicineName)) continue;

        const key = medicineName.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            candidates.push(medicineName);
        }
    }

    return candidates;
}

async function findBestDbMatch(name) {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    const queries = [
        await prisma.medicineMaster.findFirst({ where: { name: { startsWith: lower + ' ' } }, select: { id: true, name: true, price: true, manufacturer: true, dosageForm: true } }),
        await prisma.medicineMaster.findFirst({ where: { name: { startsWith: lower } }, select: { id: true, name: true, price: true, manufacturer: true, dosageForm: true } }),
        await prisma.medicineMaster.findFirst({ where: { name: { contains: lower } }, select: { id: true, name: true, price: true, manufacturer: true, dosageForm: true } }),
    ];

    for (const r of queries) {
        if (r) return r;
    }
    return null;
}

async function run() {
    if (!fs.existsSync(imagePath)) {
        console.log('Image not found at:', imagePath);
        return;
    }

    console.log('Testing Tesseract OCR with PSM 6 (single uniform block)...');

    const ocrResult = await Tesseract.recognize(imagePath, 'eng', {
        tessedit_pageseg_mode: '6',
        logger: m => {
            if (m.status === 'recognizing text') {
                process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
            }
        }
    });

    console.log('\n');
    const rawText = ocrResult.data.text;

    const candidates = extractMedicineNamesFromOcr(rawText);
    console.log('\n=== EXTRACTED CANDIDATES ===');
    console.log(candidates);

    console.log('\n=== DB MATCHING ===');
    for (const name of candidates) {
        const match = await findBestDbMatch(name);
        if (match) {
            console.log(`✅ "${name}" → "${match.name}" [₹${match.price}]`);
        } else {
            console.log(`❌ "${name}" → NOT FOUND`);
        }
    }

    await prisma.$disconnect();
}

run().catch(console.error);
