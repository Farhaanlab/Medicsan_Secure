import * as dns from 'dns';
import validator from 'email-validator';

async function verifyEmailExists(email: string): Promise<boolean> {
    if (!validator.validate(email)) return false;

    const domain = email.split('@')[1];
    if (!domain) return false;

    return new Promise((resolve) => {
        dns.resolveMx(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                resolve(false);
            } else {
                resolve(true); // Domain has mail servers
            }
        });
    });
}

async function runTests() {
    const testCases = [
        "valid@gmail.com",
        "valid@yahoo.com",
        "invalid@fake-domain-12345.xyz",
        "invalid@notarealdomain.com",
        "bad-format-email",
    ];

    for (const email of testCases) {
        const result = await verifyEmailExists(email);
        console.log(`Email: ${email.padEnd(30)} -> real? ${result}`);
    }
}

runTests();
