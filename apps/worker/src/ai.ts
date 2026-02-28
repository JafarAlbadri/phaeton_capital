import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. AI labeling will fail.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const aiModel = process.env.AI_MODEL || 'gemini-2.5-flash';

export interface AiInput {
    id: string;
    text: string;
}

export interface AiLabelResult {
    id: string;
    ticker: string;
    sentiment: number; // -1 to 1
    is_manipulation: boolean;
    confidence: number; // 0 to 1
}

export async function labelSentimentAndDetectManipulation(posts: AiInput[]): Promise<AiLabelResult[] | null> {
    if (!ai || posts.length === 0) return null;

    const systemInstruction = `You are a financial sentiment analysis AI.
Your task is to analyze social media posts to detect market sentiment and potential "Pump & Dump" manipulation.
You will be provided with a JSON array of posts, each with an 'id' and 'text'.
Return ONLY a valid JSON array matching this schema for each input post:
[
  {
    "id": "string (the exact same id as the input post)",
    "ticker": "string (the main stock ticker mentioned, e.g., TSLA, NVDA. 'UNKNOWN' if none)",
    "sentiment": number (between -1.0 for extremely bearish and 1.0 for extremely bullish),
    "is_manipulation": boolean (true if the post exhibits bot-like pump&dump behavior, excessive emojis without substance, or coordinated manipulation),
    "confidence": number (between 0.0 and 1.0 representing your confidence in this assessment)
  }
]
No markdown formatting, just the raw JSON. Must be an array even if there is only one post.`;

    const inputContent = JSON.stringify(posts);

    try {
        const isGemma = aiModel.toLowerCase().includes('gemma');

        const requestArgs: any = {
            model: aiModel,
        };

        if (isGemma) {
            requestArgs.contents = `${systemInstruction}\n\nPOSTS TO ANALYZE:\n${inputContent}`;
        } else {
            requestArgs.contents = inputContent;
            requestArgs.config = {
                systemInstruction,
                responseMimeType: 'application/json',
            };
        }

        const response = await ai.models.generateContent(requestArgs);

        let output = response.text;
        if (!output) return null;

        // Clean markdown JSON blocks if the model outputs them (common for Gemma)
        if (output.startsWith('```json')) {
            output = output.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (output.startsWith('```')) {
            output = output.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(output.trim());
        if (!Array.isArray(parsed)) {
            console.error('AI returned unexpected format (not an array):', parsed);
            return null;
        }

        return parsed.map((item: any) => ({
            id: item.id,
            ticker: item.ticker || 'UNKNOWN',
            sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
            is_manipulation: !!item.is_manipulation,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0,
        }));
    } catch (err) {
        console.error('Error calling Gemini:', err);
        return null;
    }
}
