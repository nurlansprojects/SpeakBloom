import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import fs from 'fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure public/uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * File Upload Endpoint with Local Storage
 */
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { filename, fileData } = req.body;
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Missing filename or fileData' });
    }

    const base64Content = fileData.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);
    const downloadUrl = `/uploads/${safeName}`;

    return res.json({
      success: true,
      downloadUrl,
      filename: safeName,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// Initialize Gemini client with server-side environment secret
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

/**
 * Real-time AI Speaking Assistant Endpoint
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { scenario, aiRole, lessonTitle, bloomLevel, turns } = req.body;

    const dialogueHistory = (turns || [])
      .map((t: { speaker: string; text: string }) => `${t.speaker === 'ai' ? 'AI' : 'Student'}: ${t.text}`)
      .join('\n');

    const prompt = `You are a supportive English language speaking tutor role-playing in an educational session for the lesson "${lessonTitle || 'Speaking Practice'}".
Bloom's Taxonomy Thinking Level: Level ${bloomLevel || 3}
Scenario: ${scenario || 'everyday conversation and polite dialogue'}
Your role in character: ${aiRole || 'conversation partner'}

Dialogue History:
${dialogueHistory || 'No previous turns.'}

Instructions:
1. Provide your next concise in-character spoken English response (1-2 sentences maximum, natural conversation).
2. Provide a constructive feedback tip regarding pronunciation, grammar, or phrasing for the student's most recent turn.
3. Provide an estimated fluency score percentage between 65 and 98 based on vocabulary and sentence structure.
DO NOT use any emojis anywhere in your response.

Respond ONLY with valid JSON in this exact structure:
{
  "reply": "Your next dialogue line here",
  "tip": "Constructive advisory tip here",
  "fluencyPercent": 85
}`;

    if (!geminiApiKey) {
      // Safe fallback if API key is not configured in environment
      return res.json({
        reply: "That is very interesting. Could you tell me a little more about that?",
        tip: "Good sentence formation. Try expanding on your reasons using 'because'.",
        fluencyPercent: 82,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      reply: parsed.reply || "I understand. What do you think about that?",
      tip: parsed.tip || "Clear pronunciation. Keep speaking with confidence.",
      fluencyPercent: parsed.fluencyPercent || 85,
    });
  } catch (error) {
    console.error('Gemini chat API error:', error);
    return res.json({
      reply: "Great point! Let's continue practicing.",
      tip: "Good articulation and conversational pace.",
      fluencyPercent: 80,
    });
  }
});

/**
 * Advisory Speech Analysis Endpoint
 */
app.post('/api/ai/analyze-speech', async (req: Request, res: Response) => {
  try {
    const { transcript, taskTitle } = req.body;

    const prompt = `Analyze this spoken English student submission for "${taskTitle || 'Speaking Activity'}":
"${transcript || ''}"

Provide advisory constructive feedback for the student and teacher.
Do NOT use emojis anywhere.

Respond ONLY with JSON:
{
  "fluency": 85,
  "summary": "Brief encouraging summary of strengths and areas to practice",
  "grammarIssues": ["Grammar point 1"],
  "vocabularySuggestions": ["Vocabulary recommendation 1"]
}`;

    if (!geminiApiKey) {
      return res.json({
        fluency: 84,
        summary: "Clear spoken preparation with good conversational cadence.",
        grammarIssues: [],
        vocabularySuggestions: ["Consider incorporating transition phrases like 'furthermore' or 'in addition'."],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err) {
    console.error('Speech analysis error:', err);
    return res.json({
      fluency: 80,
      summary: "Good effort in spoken response.",
      grammarIssues: [],
      vocabularySuggestions: [],
    });
  }
});

// Vite Middleware for Development / Static for Production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakBloom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
