import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────
// CLEAN OCR TEXT
// ──────────────────────────────────────────────────────────────
function cleanOcrText(text: string): string {
    return text
        .replace(/[|{}[\]]/g, '')
        .replace(/[_~`]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ──────────────────────────────────────────────────────────────
// INDUSTRY-GRADE DB MATCHER
// Accepts an array of clean medicine names (from Gemini) OR raw OCR text (from Tesseract)
// For each name, performs multiple targeted queries and scores the results
// ──────────────────────────────────────────────────────────────

const OCR_NOISE = new Set([
    'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'injection', 'cream',
    'ointment', 'drops', 'suspension', 'inhaler', 'lotion', 'powder', 'sachet',
    'take', 'after', 'before', 'food', 'meals', 'daily', 'days', 'times',
    'morning', 'evening', 'night', 'with', 'water', 'empty', 'stomach',
    'doctor', 'patient', 'date', 'name', 'hospital', 'clinic', 'medical',
    'prescription', 'diagnosis', 'complaint', 'advice', 'follow', 'review',
    'blood', 'pressure', 'sugar', 'fever', 'pain', 'cold', 'cough',
    'test', 'report', 'address', 'phone', 'mobile', 'email',
    'once', 'twice', 'thrice', 'stat', 'every', 'hour', 'hours',
    'week', 'weeks', 'month', 'months', 'year', 'years', 'dose', 'dosage',
    'this', 'that', 'from', 'have', 'been', 'will', 'should',
    'the', 'and', 'for', 'not', 'are', 'was', 'were', 'also', 'only',
    'film', 'coated', 'filmcoated', 'sandoz', 'manufactured', 'marketed',
    'store', 'keep', 'away', 'children', 'read', 'leaflet', 'pack',
    'contains', 'active', 'ingredient', 'excipient', 'batch', 'expiry',
    'oral', 'route', 'use', 'size', 'each', 'left', 'right', 'eye', 'drop',
    'post', 'operative', 'ophthalmic', 'alternate', 'nights', 'continue',
    'till', 'gets', 'over', 'your', 'next', 'appointment', 'unevenful',
    'uneventful', 'discharge', 'period', 'medication', 'optic', 'hourly',
    'liquigel', 'sos', 'alternate', 'times', 'drop', 'drops',
]);

// ──────────────────────────────────────────────────────────────
// FUZZY MATCHING HELPERS
// ──────────────────────────────────────────────────────────────
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

// Find the best DB match for a single clean medicine name term
async function findBestMatch(name: string): Promise<any | null> {
    const lower = name.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    // ── STAGE 1: Exact / Structured Search ──
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

                // Precision bonuses
                if (firstWord === lower) score += 30;
                else if (lowerDb.startsWith(lower + ' ')) score += 20;
                else if (lowerDb.startsWith(lower)) score += 10;

                // Reward shorter, more specific names (less generic)
                score -= Math.max(0, r.name.length - 20) * 0.5;

                // Reward matching the search term's length
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
        } catch {
            // Ignore single query failures
        }
    }

    // ── STAGE 2: Fuzzy / Chunked Search Fallback ──
    // If the standard queries don't find high-scoring exact matches, 
    // extract alphabetic chunks >= 3 chars to find potential misspellings like "PR3D"
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

            // Score fuzzy candidates using Levenshtein distance
            for (const c of fuzzyCandidates) {
                if (seen.has(c.id)) continue;
                seen.add(c.id);

                const candidateLower = c.name.toLowerCase();
                // Strip common endings that bloat the comparison
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
        } catch {
            // Ignore fuzzy query failures
        }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    // Only return if score is high enough (>= 70 points for fuzzy padding) to avoid incorrect mappings
    if (best.score < 70) return null;

    return best;
}

// ──────────────────────────────────────────────────────────────
// GEMINI VISION — extracts a structured JSON list of medicine names
// ──────────────────────────────────────────────────────────────
async function extractWithGemini(imageBuffer: Buffer, mimeType: string): Promise<string[] | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are analyzing OCR text extracted from a structured medical prescription.

Your task is to identify ALL medicine names present in the document without missing any.

Important Instructions:

The prescription contains structured sections such as:
- Post-operative medications
- Eye drops
- Tablets
- Numbered rows
- Tabular layouts

Every numbered row represents a separate medicine and must be extracted.
Do NOT stop after identifying a few medicines.
You must scan the entire OCR text from top to bottom before producing output.

Pay special attention to:
- Medicines listed under "TABLETS"
- Medicines in tabular format
- Medicines followed by dosage schedules
- Medicines written in uppercase

Treat the following patterns as medicines:
- Words followed by mg (e.g., 650mg, 20mg, 0.25 mg)
- Words followed by E/d
- Entries starting with T. or C.
- Capitalized standalone brand names

Perform a validation pass:
1. Re-scan the OCR text.
2. Count the total numbered medicine rows.
3. Ensure each row has a corresponding extracted medicine.
4. If any row is missing in the output, include it.
5. Do not ignore medicines just because they appear inside tables.

Return the results using the SAME structure currently used by the system (A JSON array of strings).`;

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType || 'image/jpeg',
        },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const raw = result.response.text().trim();
    console.log('🤖 Gemini raw response:', raw);

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Gemini response is not a valid non-empty array');
    }
    return parsed as string[];
}

// ──────────────────────────────────────────────────────────────
// TESSERACT FALLBACK — extract unique medicine names from raw OCR text
// ──────────────────────────────────────────────────────────────
function extractCandidatesFromOcr(rawText: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    // Strategy: extract each line and clean it
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    for (const line of lines) {
        // Remove numbers at start (1. 2. 3.)
        let clean = line
            .replace(/^\d+[\.\)\-\s]+/, '')
            // Remove T. C. I. prefixes
            .replace(/^[TCIS]\.\s*/i, '')
            // Remove dosage amounts
            .replace(/\d+(\.\d+)?\s*(mg|ml|mcg|gm|g|iu|%)/gi, '')
            // Remove frequencies
            .replace(/\d+[-–]\d+[-–]\d+/g, '')
            .replace(/\b(od|bd|tds|qid|sos|hs|prn|stat|sr)\b/gi, '')
            // Remove E/d suffix 
            .replace(/\bE\/d\b/gi, '')
            // Remove leading dashes from first column
            .replace(/^[-–*\s]+/, '')
            .trim();

        // Take only the first "word" of each cleaned line as the candidate
        const firstWord = clean.split(/\s+/)[0];
        if (firstWord && firstWord.length >= 4 && !OCR_NOISE.has(firstWord.toLowerCase())) {
            const lower = firstWord.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                candidates.push(firstWord);
            }
        }
    }

    return candidates;
}

// ──────────────────────────────────────────────────────────────
// LOCAL PYTHON OCR — safely tunnels file via Axios + form-data avoiding 422 boundaries
// ──────────────────────────────────────────────────────────────
async function scanWithLocalPython(imageBuffer: Buffer, mimeType: string): Promise<any | null> {
    try {
        const formData = new FormData();
        // Provide the filename to satisfy FastAPI's strict UploadFile assertions
        formData.append('file', imageBuffer, {
            filename: 'prescription.jpg',
            contentType: mimeType
        });

        const ocrUrlRaw = process.env.PYTHON_OCR_URL || 'http://localhost:8085';
        const ocrUrl = ocrUrlRaw.replace(/\/+$/, '');
        
        const response = await axios.post(`${ocrUrl}/scan`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            // Generous timeout to wait for Python cold-start on Render
            timeout: 90000 
        });

        return response.data;
    } catch (error: any) {
        if (error.response) {
            console.error(`⚠️ Python service returned ${error.response.status}:`, error.response.data);
        } else {
            console.error('⚠️ Python service communication failed:', error.message);
        }
        return null; // Gracefully fallback to Gemini
    }
}

// ──────────────────────────────────────────────────────────────
// MAIN CONTROLLER
// ──────────────────────────────────────────────────────────────
export const scanPrescription = async (req: Request | any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const userId = req.user?.id;
        const imageBuffer: Buffer = req.file.buffer;
        const mimeType: string = req.file.mimetype || 'image/jpeg';

        let medicineNamesList: string[] = [];
        let pythonResults: any = null;

        // ── STEP 1: Extract medicine names ──────────────────────────────
        console.log('\n=== STEP 1: Extracting Medicine Names ===');

        // 1. Try Local Python OCR Service (Port 8085) - High Accuracy
        try {
            console.log('🐍 Calling Local Python OCR Service...');
            pythonResults = await scanWithLocalPython(imageBuffer, mimeType);
            
            if (pythonResults && Array.isArray(pythonResults.extracted_raw) && pythonResults.extracted_raw.length > 0) {
                medicineNamesList = pythonResults.extracted_raw;
                console.log(`✅ Python service extracted ${medicineNamesList.length} raw candidates.`);
            }
        } catch (err: any) {
            console.warn('⚠️ Python service hook failed:', err.message);
        }

        // 2. Fallback: Gemini Vision AI
        if (medicineNamesList.length === 0) {
            try {
                console.log('🤖 Calling Gemini 1.5 Flash Vision Fallback...');
                const aiNames = await extractWithGemini(imageBuffer, mimeType);
                if (aiNames && aiNames.length > 0) {
                    medicineNamesList = aiNames;
                    console.log(`✅ Gemini extracted ${aiNames.length} medicines.`);
                }
            } catch (geminiErr: any) {
                console.warn('⚠️ Gemini fallback failed:', geminiErr.message);
            }
        }

        // TESSERACT MEMORY LEAK REMOVED
        // We purposely omit Tesseract.recognize here because running tesseract.js 
        // with a 4K mobile camera image frequently spikes Node RAM > 500MB, triggering
        // OOM kills (SIGKILL) on Render Free Tier, resulting in 502/503 errors on mobile.
        if (medicineNamesList.length === 0) {
            console.log('⚠️ Both Python and Gemini failed to extract names. Bypassing Tesseract to protect Server RAM.');
        }

        if (medicineNamesList.length === 0) {
            return res.json({
                text: '',
                parsed: { medicines: [] },
                imageUrl: null,
                scanId: null,
            });
        }

        // ── STEP 2: Match each name to the database ──────────────────────
        console.log('\n=== STEP 2: Matching Each Medicine to Database ===');
        const medicines: any[] = [];
        const addedIds = new Set<string>();

        // 1. Process Python's Direct DB Matches
        if (pythonResults && Array.isArray(pythonResults.medicines)) {
            for (const pMed of pythonResults.medicines) {
                if (!pMed.matched_name) continue;

                console.log(`🔍 Python match: "${pMed.extracted_name}" -> "${pMed.matched_name}"`);
                const dbMatch = await prisma.medicineMaster.findFirst({
                    where: { name: pMed.matched_name },
                    select: { id: true, name: true, manufacturer: true, dosageForm: true, price: true }
                });

                if (dbMatch && !addedIds.has(dbMatch.id)) {
                    addedIds.add(dbMatch.id);
                    medicines.push({
                        id: dbMatch.id,
                        medicine_name: dbMatch.name,
                        manufacturer: dbMatch.manufacturer,
                        dosage: dbMatch.dosageForm,
                        price: dbMatch.price,
                    });
                    console.log(`  ✅ Verified in database: "${dbMatch.name}"`);
                }
            }
        }

        // 2. Process ALL Raw Extractions (from Python OR Gemini) through standard Fuzzy Matching Fallback
        for (const name of medicineNamesList) {
            // Skip if we already successfully pulled this medication from Python structured matched_names above
            if (medicines.some(m => m.medicine_name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(m.medicine_name.toLowerCase()))) continue;

            console.log(`🔍 Looking up raw extraction: "${name}"`);
            const match = await findBestMatch(name);
            
            if (match && !addedIds.has(match.id)) {
                addedIds.add(match.id);
                medicines.push({
                    id: match.id,
                    medicine_name: match.name,
                    manufacturer: match.manufacturer,
                    dosage: match.dosageForm,
                    price: match.price,
                });
                console.log(`  ✅ Found via local fuzzy fallback: "${match.name}" (score: ${match.score})`);
            } else {
                console.log(`  🟡 No DB match found for: "${name}". Retaining as Unverified.`);
                const tempId = `unverified-${Math.random().toString(36).substring(7)}`;
                addedIds.add(tempId);
                medicines.push({
                    id: tempId,
                    medicine_name: name.substring(0, 100).trim(),
                    manufacturer: "Unverified Extraction",
                    dosage: "Unknown",
                    price: "N/A",
                });
            }
        }

        console.log(`\n=== STEP 2 COMPLETE: ${medicines.length} medicines matched ===`);

        const parsedData = { medicines };
        const rawTextForLog = medicineNamesList.join(', ');

        // ── STEP 3: Persist scan record ──────────────────────────────────
        let dbRecord = null;
        if (userId) {
            try {
                dbRecord = await prisma.prescriptionScan.create({
                    data: {
                        userId,
                        imageUrl: null,
                        rawText: rawTextForLog,
                        parsedData: JSON.stringify(parsedData),
                    },
                });
            } catch (dbErr: any) {
                console.error('DB save error:', dbErr.message);
            }
        }

        // ── STEP 4: Return response ──────────────────────────────────────
        console.log(`\n✅ Returning ${medicines.length} medicines to frontend`);
        res.json({
            text: rawTextForLog,
            parsed: parsedData,
            imageUrl: null,
            scanId: dbRecord?.id,
        });

    } catch (error: any) {
        console.error('❌ OCR Controller Error:', error);
        res.status(500).json({ error: error.message });
    }
};
