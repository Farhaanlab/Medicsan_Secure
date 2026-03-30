const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function stressTestOCR() {
    console.log("Generating 2MB dummy 4K resolution buffer...");
    // A 2MB Buffer of random binary data, but we'll try sending actual JPEG magic bytes if possible
    const dummyImage = Buffer.alloc(2 * 1024 * 1024);
    
    // Fake JPEG header
    dummyImage.write('FFD8FFE000104A46494600010101006000600000', 0, 'hex');

    const formData = new FormData();
    formData.append('image', dummyImage, { filename: 'test.jpg', contentType: 'image/jpeg' });

    console.log("POSTing directly to internal Express Scanner via node-fetch...");
    try {
        const res = await fetch('http://localhost:3001/api/ocr/scan', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders() // Needed for older node-fetch
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text.substring(0, 800));
    } catch (err) {
        console.error("Fetch failed hard:", err.message);
    }
}

stressTestOCR();
