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
const PORT = parseInt(process.env.PORT || '3001', 10);

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

// Health Check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', db: 'disconnected', error });
    }
});

// Helper: kill process on port (Windows)
function killPortProcess(port: number) {
    try {
        const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
        const lines = result.trim().split('\n');
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                console.log(`Killing process ${pid} on port ${port}...`);
                try {
                    execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf-8' });
                    console.log(`Killed PID ${pid}`);
                } catch (e) {
                    // Process may already be gone
                }
            }
        }
    } catch (e) {
        // No process found on port - that's fine
    }
}

// Start Server with auto-retry on port conflict
function startServer(port: number, retried = false) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:${port}`);
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && !retried) {
            console.log(`Port ${port} is in use. Attempting to kill blocking process...`);
            killPortProcess(port);
            // Wait a moment then retry once
            setTimeout(() => {
                startServer(port, true);
            }, 1500);
        } else if (err.code === 'EADDRINUSE' && retried) {
            console.error(`Port ${port} is still in use after killing. Exiting.`);
            process.exit(1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
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
}

startServer(PORT);

export default app;
