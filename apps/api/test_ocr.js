const fs = require('fs');

async function testOCR() {
    console.log("Creating dummy 100x100 white pixel image...");
    const dummyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMREwc5Y1T/zAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAc0lEQVR42u3QMQEAAAwCoNk/tIvxg9WQQEHqL1UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHhTdwA1AAEF/2L2AAAAAElFTkSuQmCC', 'base64');
    
    fs.writeFileSync('/tmp/dummy.png', dummyImage);
    
    const formData = new FormData();
    const blob = new Blob([dummyImage], { type: 'image/png' });
    formData.append('image', blob, 'dummy.png');

    console.log("Sending to Render API...");
    try {
        const res = await fetch('https://medicsan-secure.onrender.com/api/ocr/scan', {
            method: 'POST',
            body: formData
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text.substring(0, 500));
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

testOCR();
