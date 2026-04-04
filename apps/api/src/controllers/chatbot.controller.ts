import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT — defines the AI Health Assistant's persona
// ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are **MediScan AI**, a professional, empathetic, and knowledgeable health assistant embedded inside the MediScan Secure medical application.

## Your Capabilities
- Explain what medicines do, their common side effects, dosage guidelines, and drug interactions.
- Provide general health and wellness advice (nutrition, exercise, sleep, stress management).
- Help users understand their prescriptions and medications.
- Answer questions about common medical conditions and symptoms.
- Offer first-aid guidance for minor injuries and ailments.
- Support mental health awareness and provide coping strategies.

## Your Personality
- Warm, professional, and reassuring — like a trusted pharmacist or nurse.
- Use clear, simple language. Avoid excessive medical jargon unless the user asks for technical details.
- Be concise. Keep responses focused and actionable (2-4 short paragraphs max).
- Use bullet points and formatting when listing side effects, instructions, or tips.
- Show empathy when users describe symptoms or concerns.

## Critical Safety Rules
1. **NEVER diagnose conditions.** You may discuss symptoms generally, but always recommend consulting a doctor for diagnosis.
2. **NEVER prescribe medications.** You can explain what a medicine does if asked, but never recommend starting, stopping, or changing medication without a doctor.
3. **For any emergency symptoms** (chest pain, difficulty breathing, severe bleeding, stroke signs, allergic reactions, suicidal thoughts), immediately advise calling emergency services (112 in India, 911 in US) and do NOT attempt to treat.
4. **Always include a brief disclaimer** at the end of medical-related responses: "⚕️ *This is general health information, not medical advice. Please consult your doctor for personalized guidance.*"
5. If a user asks something completely unrelated to health (politics, coding, etc.), politely redirect: "I'm your health assistant — I'm best at answering health and medicine questions! 😊"

## Context Awareness
You may receive context about the user's current medicines, reminders, and recent health history from the MediScan app. Use this to personalize your responses when relevant. For example, if a user asks "can I take paracetamol?" and they already have Dolo 650 in their inventory, mention that Dolo 650 already contains paracetamol.`;

// ──────────────────────────────────────────────────────────────
// CONVERSATION HISTORY — in-memory per-user session store
// In production, consider Redis or DB-backed sessions
// ──────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
}

const userSessions = new Map<string, { history: ChatMessage[], lastActive: number }>();

// Clean up stale sessions every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, session] of userSessions) {
        if (now - session.lastActive > 30 * 60 * 1000) {
            userSessions.delete(key);
        }
    }
}, 30 * 60 * 1000);

// ──────────────────────────────────────────────────────────────
// FETCH USER CONTEXT — pulls medicines, reminders, and history
// ──────────────────────────────────────────────────────────────
async function getUserContext(userId: string): Promise<string> {
    try {
        const [inventory, reminders, recentIntake] = await Promise.all([
            prisma.inventory.findMany({
                where: { userId },
                select: { medicineName: true, quantity: true, expiryDate: true },
                take: 20,
            }),
            prisma.reminder.findMany({
                where: { userId, isActive: true },
                select: { medicineName: true, dosage: true, time: true, days: true, foodTiming: true },
                take: 20,
            }),
            prisma.intakeLog.findMany({
                where: { userId },
                select: { medicineName: true, status: true, takenAt: true },
                orderBy: { takenAt: 'desc' },
                take: 10,
            }),
        ]);

        const parts: string[] = [];

        if (inventory.length > 0) {
            parts.push('**User\'s Current Medicines (Inventory):**');
            for (const item of inventory) {
                const expiry = item.expiryDate ? ` | Expires: ${item.expiryDate.toISOString().split('T')[0]}` : '';
                parts.push(`- ${item.medicineName} (Qty: ${item.quantity}${expiry})`);
            }
        }

        if (reminders.length > 0) {
            parts.push('\n**Active Reminders:**');
            for (const r of reminders) {
                parts.push(`- ${r.medicineName} ${r.dosage || ''} at ${r.time} | ${r.foodTiming} | Days: ${r.days}`);
            }
        }

        if (recentIntake.length > 0) {
            parts.push('\n**Recent Intake History (last 10):**');
            for (const log of recentIntake) {
                parts.push(`- ${log.medicineName}: ${log.status} at ${log.takenAt.toISOString().split('T')[0]}`);
            }
        }

        return parts.length > 0
            ? `\n\n--- USER HEALTH CONTEXT (from MediScan app) ---\n${parts.join('\n')}\n--- END CONTEXT ---`
            : '';
    } catch (err) {
        console.warn('Failed to fetch user context for chatbot:', err);
        return '';
    }
}

// ──────────────────────────────────────────────────────────────
// MAIN CHAT CONTROLLER
// ──────────────────────────────────────────────────────────────
export const chat = async (req: Request | any, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ error: 'AI service is not configured. Please set GEMINI_API_KEY.' });
        }

        const userId = req.user?.id || 'anonymous';

        // Fetch user's health context from the database
        const userContext = userId !== 'anonymous' ? await getUserContext(userId) : '';

        // Initialize or retrieve the user's conversation session
        let session = userSessions.get(userId);
        if (!session) {
            session = { history: [], lastActive: Date.now() };
            userSessions.set(userId, session);
        }
        session.lastActive = Date.now();

        // Build the full system instruction with user context
        const systemInstruction = SYSTEM_PROMPT + userContext;

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });

        // Start chat with history
        const chatSession = model.startChat({
            history: session.history,
        });

        // Send the user's message
        const result = await chatSession.sendMessage(message);
        const responseText = result.response.text();

        // Update conversation history (keep last 20 exchanges to prevent token overflow)
        session.history.push(
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [{ text: responseText }] }
        );
        if (session.history.length > 40) {
            session.history = session.history.slice(-40);
        }

        res.json({ response: responseText });
    } catch (error: any) {
        console.error('❌ Chatbot Error:', error);

        // Handle specific Gemini API errors gracefully
        if (error.message?.includes('SAFETY')) {
            return res.json({
                response: "I'm sorry, I can't provide guidance on that topic as it may involve sensitive health information. Please consult your doctor directly for this question. ⚕️"
            });
        }

        res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
    }
};

// ──────────────────────────────────────────────────────────────
// CLEAR CHAT HISTORY
// ──────────────────────────────────────────────────────────────
export const clearChat = async (req: Request | any, res: Response) => {
    const userId = req.user?.id || 'anonymous';
    userSessions.delete(userId);
    res.json({ message: 'Chat history cleared' });
};
