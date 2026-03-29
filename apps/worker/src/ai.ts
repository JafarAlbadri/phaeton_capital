import { logWrapper } from './logger';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    logWrapper.warn('GEMINI_API_KEY is not set. AI labeling will fail.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const aiModel = process.env.AI_MODEL || 'gemini-2.5-flash';

export interface AiInput {
    id: string;
    text: string;
}

export interface NarrativeInput {
    ticker: string;
    signal: string;
    composite_score: number;
    confidence: number;
    sentiment_score: number;
    technical_score: number;
    fundamental_score: number;
    quant_score: number;
    macro_score: number;
    insider_score: number;
    rsi?: number | null;
    macd_histogram?: number | null;
    bayes_posterior?: number | null;
    vix?: number | null;
    hurst?: number | null;
    pe_ratio?: number | null;
    target_price?: number | null;
    current_price?: number | null;
    hmm_state?: number | null;
    insider_net_buy?: boolean | null;
    risk_rating?: number | null;
    put_call_ratio?: number | null;
}

export async function generateNarrative(input: NarrativeInput): Promise<string | null> {
    if (!ai) return null;
    try {
        const upside = input.current_price && input.target_price
            ? (((input.target_price - input.current_price) / input.current_price) * 100).toFixed(1)
            : null;
        const prompt = `You are a concise financial analyst. Write 3-4 sentences in plain English summarising this quantitative analysis for ${input.ticker}. Be specific about the strongest signals. No markdown, no asterisks.

Signal: ${input.signal} (score: ${input.composite_score.toFixed(1)}/100, confidence: ${(input.confidence * 100).toFixed(0)}%)
Scores — Sentiment:${input.sentiment_score.toFixed(0)} Technical:${input.technical_score.toFixed(0)} Fundamental:${input.fundamental_score.toFixed(0)} Quant:${input.quant_score.toFixed(0)} Macro:${input.macro_score.toFixed(0)} Insider:${input.insider_score.toFixed(0)}
${input.rsi != null ? `RSI(14): ${input.rsi.toFixed(1)} (${input.rsi < 30 ? 'oversold' : input.rsi > 70 ? 'overbought' : 'neutral'})` : ''}
${input.macd_histogram != null ? `MACD: ${input.macd_histogram > 0 ? 'positive momentum' : 'negative momentum'}` : ''}
${input.hmm_state != null ? `Market regime: ${input.hmm_state === 2 ? 'Bull' : input.hmm_state === 0 ? 'Bear' : 'Neutral'}` : ''}
${input.vix != null ? `VIX: ${input.vix.toFixed(1)} (${input.vix > 30 ? 'high fear' : input.vix < 15 ? 'complacency' : 'normal'})` : ''}
${upside != null ? `Analyst target implies ${upside}% upside` : ''}
${input.hurst != null ? `Hurst: ${input.hurst.toFixed(2)} (${input.hurst > 0.6 ? 'trending' : input.hurst < 0.4 ? 'mean-reverting' : 'random'})` : ''}
${input.insider_net_buy != null ? `Insiders are net ${input.insider_net_buy ? 'buying' : 'selling'}` : ''}
${input.put_call_ratio != null ? `Options P/C ratio: ${input.put_call_ratio.toFixed(2)} (${input.put_call_ratio > 1.2 ? 'bearish hedging' : input.put_call_ratio < 0.7 ? 'bullish call buying' : 'neutral'})` : ''}
${input.risk_rating != null ? `Risk: ${input.risk_rating}/5` : ''}`;

        const response = await ai.models.generateContent({
            model: aiModel,
            contents: prompt,
            config: { temperature: 0.3, maxOutputTokens: 200 },
        });
        return response.text?.trim() || null;
    } catch {
        return null;
    }
}

export interface AiLabelResult {
    id: string;
    ticker: string;
    sentiment: number; // -1 to 1
    is_manipulation: boolean;
    confidence: number; // 0 to 1
    ai_model: string; // The specific model used (main or fallback)
}

export async function labelSentimentAndDetectManipulation(posts: AiInput[]): Promise<AiLabelResult[] | null> {
    if (!ai || posts.length === 0) return null;

    const PROMPT_VERSION = 1;

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
            requestArgs.contents = `${systemInstruction}

POSTS TO ANALYZE:
${inputContent}`;
            requestArgs.config = {
                temperature: 0,
            };
        } else {
            requestArgs.contents = inputContent;
            requestArgs.config = {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0,
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
            logWrapper.error('AI returned unexpected format (not an array):', parsed);
            return null;
        }

        return parsed.map((item: any) => ({
            id: item.id,
            ticker: item.ticker || 'UNKNOWN',
            sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
            is_manipulation: !!item.is_manipulation,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0,
            ai_model: aiModel,
            prompt_version: PROMPT_VERSION,
        }));
    } catch (err: any) {
        // Dynamic Fallback Router
        if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('Quota')) {
            logWrapper.warn(`[AI Route] Primary model (${aiModel}) hit a Rate Limit/Error (429). Initiating Fallback Route to gemini-1.5-flash...`);
            try {
                // Instantly re-attempt using the free/fast tier fallback model
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: inputContent,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        temperature: 0,
                    }
                });

                let output = response.text;
                if (!output) return null;

                if (output.startsWith('```json')) output = output.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                else if (output.startsWith('```')) output = output.replace(/^```\s*/, '').replace(/\s*```$/, '');

                const parsed = JSON.parse(output.trim());
                if (!Array.isArray(parsed)) return null;

                return parsed.map((item: any) => ({
                    id: item.id,
                    ticker: item.ticker || 'UNKNOWN',
                    sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
                    is_manipulation: !!item.is_manipulation,
                    confidence: typeof item.confidence === 'number' ? item.confidence : 0,
                    ai_model: 'gemini-1.5-flash',
                    prompt_version: PROMPT_VERSION,
                }));
            } catch (fallbackErr) {
                logWrapper.error('[AI Route] Secondary fallback model also failed:', fallbackErr);
                return null;
            }
        } else {
            logWrapper.error('Error calling Gemini:', err);
            return null;
        }
    }
}
