// Test which Gemini model works
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = 'AIzaSyDLujoIY04UPPqoXXM_xh7JKU4W-IMhrSI';

async function testModel(modelName) {
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Reply with: ["TEST"]');
        const text = result.response.text().trim();
        console.log(`✅ ${modelName} WORKS: ${text.substring(0, 60)}`);
    } catch (e) {
        console.log(`❌ ${modelName}: ${e.message.substring(0, 120)}`);
    }
}

async function run() {
    console.log('Testing Gemini model names...\n');
    await testModel('gemini-2.0-flash');
    await testModel('gemini-2.0-flash-exp');
    await testModel('gemini-1.5-flash-latest');
    await testModel('gemini-1.5-flash-8b');
    await testModel('gemini-pro-vision');
    await testModel('gemini-1.0-pro-vision');
    await testModel('gemini-1.5-pro');
    await testModel('gemini-1.5-pro-latest');
}
run();
