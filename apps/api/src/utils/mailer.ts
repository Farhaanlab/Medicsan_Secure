import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter() {
    if (transporter) return transporter;

    // For local testing, use Ethereal Email which intercepts emails and provides a preview URL
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass,
        },
    });

    console.log('Ethereal Mailer configured.');
    return transporter;
}

export async function sendVerificationEmail(to: string, otp: string) {
    try {
        const tp = await getTransporter();
        const info = await tp.sendMail({
            from: '"Elysian Health" <verify@elysianhealth.app>',
            to,
            subject: 'Verify your email address - Elysian Health',
            text: `Your Verification Code is: ${otp}. It expires in 10 minutes.`,
            html: `<h3>Welcome to Elysian Health!</h3><p>Your Verification Code is: <b>${otp}</b></p><p>It expires in 10 minutes.</p>`
        });

        console.log('--- VERIFICATION EMAIL SENT ---');
        console.log(`To: ${to}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

        return info;
    } catch (e) {
        console.error('Error sending email:', e);
        throw new Error('Failed to send verification email');
    }
}
