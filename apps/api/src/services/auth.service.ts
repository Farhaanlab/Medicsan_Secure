import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as dns from 'dns';
import validator from 'email-validator';
import disposableDomains from 'disposable-email-domains';
import { sendVerificationEmail } from '../utils/mailer';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export class AuthService {
    // Utility to strictly verify if an email exists by checking DNS MX records
    private async verifyEmailExists(email: string): Promise<boolean> {
        if (!validator.validate(email)) return false;

        const domain = email.split('@')[1];
        if (!domain) return false;

        // Anti-abuse: Block disposable / temporary email addresses
        if (disposableDomains.includes(domain.toLowerCase())) {
            throw new Error('Disposable or temporary email addresses are not permitted.');
        }

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

    async sendOtp(email: string) {
        // 1. Deep verification
        const isRealEmail = await this.verifyEmailExists(email);
        if (!isRealEmail) throw new Error('Invalid or fake email domain. Please use a real email.');

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) throw new Error('Email is already registered');

        // 3. Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 4. Save to OTP table
        await prisma.otpVerification.upsert({
            where: { email },
            update: { otp, expiresAt },
            create: { email, otp, expiresAt }
        });

        // 5. Send Email
        await sendVerificationEmail(email, otp);
        return { message: 'Verification email sent. Please check your inbox (or terminal logs).' };
    }

    async signup(email: string, password: string, fullName: string, otp: string) {
        // 1. Verify OTP
        const otpRecord = await prisma.otpVerification.findUnique({ where: { email } });
        if (!otpRecord) throw new Error('No pending verification found. Please request a new code.');

        if (otpRecord.otp !== otp) throw new Error('Invalid verification code.');
        if (otpRecord.expiresAt < new Date()) throw new Error('Verification code has expired. Please request a new one.');

        // 2. Delete OTP to prevent reuse
        await prisma.otpVerification.delete({ where: { email } });

        // 3. One last check before creating
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) throw new Error('Email is already registered');

        // 4. Create verified user
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role: 'PATIENT'
            }
        });

        return this.generateToken(user);
    }

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error('Email not found. Please sign up first.');

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) throw new Error('Invalid credentials');

        return this.generateToken(user);
    }

    private generateToken(user: User) {
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        return { user: { id: user.id, email: user.email, fullName: user.fullName }, token };
    }
}
