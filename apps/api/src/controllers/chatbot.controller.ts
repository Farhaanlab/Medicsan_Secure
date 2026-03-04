import { Request, Response } from 'express';

export const chat = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        // Mock AI Response for now
        // In production, integrate with OpenAI API or local LLM
        const mockResponse = `I am a medical assistant (Beta). You asked: "${message}". \n\nDisclaimer: I cannot provide medical advice. Please consult a doctor.`;

        // Simulating delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ response: mockResponse });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
