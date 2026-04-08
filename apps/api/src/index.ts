import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
import authRoutes from './routes/auth.routes';
import medicineRoutes from './routes/medicines.routes';
import ocrRoutes from './routes/ocr.routes';
import userDataRoutes from './routes/user-data.routes';
import chatbotRoutes from './routes/chatbot.routes';
import remindersRoutes from './routes/reminders.routes';

app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/user', userDataRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/reminders', remindersRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'MediScan Secure Go API is running', timestamp: new Date() });
});

// Temporary debug - check env vars (REMOVE AFTER DEBUGGING)
app.get('/debug-env', (req, res) => {
    res.json({
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        geminiKeyPrefix: process.env.GEMINI_API_KEY?.substring(0, 8) || 'NOT_SET',
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPythonOcrUrl: !!process.env.PYTHON_OCR_URL,
    });
});

// Health Check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', db: 'disconnected', error });
    }
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
