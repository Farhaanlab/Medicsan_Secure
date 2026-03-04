require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    const key = process.env.GEMINI_API_KEY;
    console.log('Key present:', !!key, 'Length:', key ? key.length : 0);

    if (!key || key.trim() === '') {
        console.log('NO VALID KEY');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Say hello in one word');
        console.log('GEMINI WORKS! Response:', result.response.text());
    } catch (err) {
        console.log('GEMINI ERROR:', err.message);
        if (err.message.includes('API_KEY_INVALID')) {
            console.log('>>> The API key is INVALID. Please get a new one from https://aistudio.google.com/apikey');
        }
    }
}

test();
