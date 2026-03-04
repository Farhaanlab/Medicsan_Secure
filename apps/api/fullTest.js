// COMPREHENSIVE TEST SUITE
// Tests: 1) Gemini API key  2) DB matching  3) Full pipeline simulation
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const GEMINI_API_KEY = 'AIzaSyDLujoIY04UPPqoXXM_xh7JKU4W-IMhrSI';

async function testGeminiKey() {
    console.log('\n=== TEST 1: Gemini API Key ===');
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Reply with just the word: OK');
        const text = result.response.text().trim();
        console.log('Gemini response:', text);
        console.log('✅ Gemini API key WORKS');
        return true;
    } catch (e) {
        console.log('❌ Gemini ERROR:', e.message);
        return false;
    }
}

async function testGeminiWithTextPrompt() {
    console.log('\n=== TEST 2: Gemini Medicine Extraction (text simulation) ===');
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `From this prescription text, extract only medicine names as a JSON array.
Strip all prefixes (T., C., I., S.) and remove dosages, frequencies, and dates.
Text: "1. MILFLODEX E/d 1hourly. 2. PREDFORTE E/d 2hourly. 3. AMPLINAK E/d 3times. 4. SOHA LIQUIGEL E/d. TABLETS: T.PARA 650mg 1-1-1. T.RAZO 20mg. C.IOPAR SR. T.ALPRAX 0.25mg. T.LUTISIGHT-O"
Return ONLY a JSON array. No markdown. Example: ["MILFLODEX","PREDFORTE"]`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        console.log('Gemini raw:', raw);
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        console.log('Parsed:', parsed);
        console.log('✅ Gemini text extraction WORKS, got', parsed.length, 'medicines');
        return parsed;
    } catch (e) {
        console.log('❌ Gemini text test ERROR:', e.message);
        return null;
    }
}

async function testDbMatching(medicineNames) {
    console.log('\n=== TEST 3: DB Matching ===');
    const results = [];

    for (const name of medicineNames) {
        const lower = name.toLowerCase().trim();

        // Try multiple search strategies
        let found = null;

        // Strategy 1: exact startsWith (e.g. "milflodex" → "Milflodex BKC...")
        const r1 = await prisma.medicineMaster.findFirst({
            where: { name: { startsWith: lower + ' ' } },
            select: { id: true, name: true, price: true }
        });
        if (r1) { found = r1; }

        // Strategy 2: startsWith (single word like "alprax")
        if (!found) {
            const r2 = await prisma.medicineMaster.findFirst({
                where: { name: { startsWith: lower } },
                select: { id: true, name: true, price: true }
            });
            if (r2) { found = r2; }
        }

        // Strategy 3: contains (e.g. "pred forte" matches "Pred Forte Opthalmic")
        if (!found) {
            const r3 = await prisma.medicineMaster.findFirst({
                where: { name: { contains: lower } },
                select: { id: true, name: true, price: true }
            });
            if (r3) { found = r3; }
        }

        if (found) {
            console.log(`  "${name}" → ✅ "${found.name}" [₹${found.price}]`);
            results.push({ input: name, match: found.name, id: found.id });
        } else {
            console.log(`  "${name}" → ❌ NOT FOUND`);
            results.push({ input: name, match: null });
        }
    }
    return results;
}

async function testApiEndpoint() {
    console.log('\n=== TEST 4: API Health Check ===');
    try {
        const http = require('http');
        await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3001/health', (res) => {
                console.log('API status code:', res.statusCode);
                resolve(res);
            });
            req.on('error', reject);
            req.setTimeout(3000, () => reject(new Error('timeout')));
        });
        console.log('✅ API is responding');
    } catch (e) {
        console.log('❌ API not reachable:', e.message);
        // Try alternate path
        try {
            const http = require('http');
            await new Promise((resolve, reject) => {
                const req = http.get('http://localhost:3001/', (res) => {
                    console.log('API root status:', res.statusCode);
                    resolve(res);
                });
                req.on('error', reject);
                req.setTimeout(3000, () => reject(new Error('timeout')));
            });
        } catch (e2) {
            console.log('❌ API root not reachable:', e2.message);
        }
    }
}

async function runAll() {
    // Test Gemini API key
    const geminiWorks = await testGeminiKey();

    // Test Gemini text extraction
    let medicineNames = ["MILFLODEX", "PREDFORTE", "AMPLINAK", "SOHA LIQUIGEL", "PARA", "RAZO", "IOPAR", "ALPRAX", "LUTISIGHT"];
    if (geminiWorks) {
        const extracted = await testGeminiWithTextPrompt();
        if (extracted && extracted.length > 0) {
            medicineNames = extracted;
        }
    }

    // Test DB matching
    await testDbMatching(medicineNames);

    // Test API endpoint
    await testApiEndpoint();

    console.log('\n=== ALL TESTS DONE ===');
    await prisma.$disconnect();
}

runAll().catch(console.error);
