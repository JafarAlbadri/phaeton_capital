import { logWrapper } from './logger';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    logWrapper.warn('GEMINI_API_KEY is not set. AI labeling will fail.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const aiModel = process.env.AI_MODEL || 'gemini-2.5-flash';

// Groq-hosted Gemma 2 9B as third-tier fallback (free, fast, unlimited-ish)
// when both Gemini Flash models return 429.
const groqApiKey = process.env.GROQ_API_KEY;
const GROQ_GEMMA_MODEL = 'gemma2-9b-it';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
if (!groqApiKey) {
    logWrapper.warn('GROQ_API_KEY is not set. Gemma fallback disabled — only Gemini tiers available.');
}

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

/**
 * Strip ```json / ``` markdown code fences that smaller open models often emit
 * around their JSON output.
 */
function stripCodeFences(s: string): string {
    let out = s.trim();
    if (out.startsWith('```json')) out = out.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (out.startsWith('```')) out = out.replace(/^```\s*/, '').replace(/\s*```$/, '');
    return out.trim();
}

/**
 * Third-tier fallback: Groq-hosted Gemma 2 9B IT.
 * Used only when both Gemini 2.5 Flash AND Gemini 2.0 Flash return 429.
 * Quality is meaningfully lower than Flash, but degraded labels beat no labels.
 */
async function labelWithGroqGemma(
    systemInstruction: string,
    inputContent: string,
    promptVersion: number,
): Promise<AiLabelResult[] | null> {
    if (!groqApiKey) return null;

    try {
        logWrapper.warn('[AI Route] Both Gemini tiers exhausted. Falling back to Groq Gemma 2 9B...');

        const resp = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_GEMMA_MODEL,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: `POSTS TO ANALYZE:\n${inputContent}` },
                ],
                temperature: 0,
                max_tokens: 2048,
            }),
        });

        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            logWrapper.error(`[AI Route] Groq Gemma fallback HTTP ${resp.status}: ${body.slice(0, 200)}`);
            return null;
        }

        const data: any = await resp.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) {
            logWrapper.error('[AI Route] Groq Gemma returned empty content');
            return null;
        }

        const cleaned = stripCodeFences(raw);

        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {
            // Gemma sometimes wraps the array in extra text. Try to extract the
            // first [...] block as a last resort.
            const m = cleaned.match(/\[[\s\S]*\]/);
            if (m) {
                try { parsed = JSON.parse(m[0]); } catch { return null; }
            } else {
                logWrapper.error('[AI Route] Groq Gemma JSON parse failed');
                return null;
            }
        }

        // Gemma may wrap the array in an object key like { "results": [...] }
        if (!Array.isArray(parsed)) {
            const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
            if (arrKey) parsed = parsed[arrKey];
            else {
                logWrapper.error('[AI Route] Groq Gemma returned non-array shape');
                return null;
            }
        }

        logWrapper.info(`[AI Route] Groq Gemma fallback succeeded (${parsed.length} labels)`);

        return parsed.map((item: any) => ({
            id: item.id,
            ticker: item.ticker || 'UNKNOWN',
            sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
            is_manipulation: !!item.is_manipulation,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0,
            ai_model: `groq-${GROQ_GEMMA_MODEL}`,
            prompt_version: promptVersion,
        }));
    } catch (e) {
        logWrapper.error('[AI Route] Groq Gemma fallback exception:', e);
        return null;
    }
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
            logWrapper.warn(`[AI Route] Primary model (${aiModel}) hit a Rate Limit/Error (429). Initiating Fallback Route to gemini-2.0-flash...`);
            try {
                // Instantly re-attempt using the free/fast tier fallback model
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: inputContent,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        temperature: 0,
                    }
                });

                let output = response.text;
                if (!output) return null;

                output = stripCodeFences(output);

                const parsed = JSON.parse(output);
                if (!Array.isArray(parsed)) return null;

                return parsed.map((item: any) => ({
                    id: item.id,
                    ticker: item.ticker || 'UNKNOWN',
                    sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
                    is_manipulation: !!item.is_manipulation,
                    confidence: typeof item.confidence === 'number' ? item.confidence : 0,
                    ai_model: 'gemini-2.0-flash',
                    prompt_version: PROMPT_VERSION,
                }));
            } catch (fallbackErr) {
                logWrapper.warn('[AI Route] Secondary Gemini fallback also failed. Trying Groq Gemma...');
                // Third tier: Groq-hosted Gemma 2 9B. Lower quality but unlimited.
                return await labelWithGroqGemma(systemInstruction, inputContent, PROMPT_VERSION);
            }
        } else {
            logWrapper.error('Error calling Gemini:', err);
            return null;
        }
    }
}
