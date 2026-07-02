import { logWrapper } from './logger';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    logWrapper.warn('GEMINI_API_KEY is not set. AI labeling will fail.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const aiModel = process.env.AI_MODEL || 'gemini-2.5-flash';

// Gemini-tier fallbacks tried in order when the primary model 429s.
// 2.5-flash-lite is the cheap/fast same-generation tier; 2.0-flash is the
// last-resort older generation. Override with GEMINI_FALLBACK_MODELS.
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash-lite,gemini-2.0-flash')
    .split(',').map(m => m.trim()).filter(Boolean);

// Aggregator fallback (free, fast) when ALL Gemini tiers return 429.
// Auto-adapts based on whether you supply OPENROUTER_API_KEY, TOGETHER_API_KEY, or GROQ_API_KEY.
const fallbackApiKey = process.env.OPENROUTER_API_KEY || process.env.TOGETHER_API_KEY || process.env.GROQ_API_KEY;

let FALLBACK_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
// Multiple model candidates tried in order — if one is upstream-throttled,
// the function falls through to the next. For single-model providers (Groq,
// Together) the array has one entry.
let FALLBACK_MODELS: string[] = ['gemma2-9b-it'];
let fallbackProviderName = 'Groq';

if (process.env.OPENROUTER_API_KEY) {
    FALLBACK_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    // Free OpenRouter chain. All three respond well on JSON sentiment classification.
    FALLBACK_MODELS = [
        'google/gemma-4-31b-it:free',
        'openai/gpt-oss-120b:free',
        'google/gemma-4-26b-a4b-it:free',
    ];
    fallbackProviderName = 'OpenRouter';
} else if (process.env.TOGETHER_API_KEY) {
    FALLBACK_ENDPOINT = 'https://api.together.xyz/v1/chat/completions';
    FALLBACK_MODELS = ['google/gemma-2-9b-it'];
    fallbackProviderName = 'Together AI';
}

if (!fallbackApiKey) {
    logWrapper.warn('No fallback API key (OPENROUTER_API_KEY, TOGETHER_API_KEY, GROQ_API_KEY) set. Gemma fallback disabled — only Gemini tiers available.');
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
    prompt_version: number;
}

/**
 * Strip ```json / ``` markdown code fences that smaller open models often emit
 * around their JSON output.
 */
export function stripCodeFences(s: string): string {
    let out = s.trim();
    if (out.startsWith('```json')) out = out.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (out.startsWith('```')) out = out.replace(/^```\s*/, '').replace(/\s*```$/, '');
    return out.trim();
}

/**
 * Parse a model's raw text into label results. Handles code fences, prose
 * around the array, and object-wrapped arrays ({ "results": [...] }).
 * Returns null when no usable array can be extracted.
 */
export function parseLabelArray(raw: string, modelId: string, promptVersion: number): AiLabelResult[] | null {
    const cleaned = stripCodeFences(raw);

    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        // Some models wrap the array in extra prose. Extract the first
        // [...] block as a last resort.
        const m = cleaned.match(/\[[\s\S]*\]/);
        if (!m) return null;
        try { parsed = JSON.parse(m[0]); } catch { return null; }
    }

    if (!Array.isArray(parsed)) {
        const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        if (!arrKey) return null;
        parsed = parsed[arrKey];
    }

    return parsed.map((item: any) => ({
        id: String(item.id),
        ticker: item.ticker || 'UNKNOWN',
        sentiment: typeof item.sentiment === 'number' ? item.sentiment : 0,
        is_manipulation: !!item.is_manipulation,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0,
        ai_model: modelId,
        prompt_version: promptVersion,
    }));
}

// Structured-output schema: the API guarantees Gemini returns exactly this
// array shape instead of relying on prompt obedience.
const LABEL_RESPONSE_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            ticker: { type: Type.STRING },
            sentiment: { type: Type.NUMBER },
            is_manipulation: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
        },
        required: ['id', 'ticker', 'sentiment', 'is_manipulation', 'confidence'],
    },
};

/**
 * Aggregator fallback: an open-weight model hosted on OpenRouter, Together,
 * or Groq. Selected by which API key is set in the env. Used only when every
 * Gemini tier has returned 429.
 */
async function labelWithFallbackModel(
    systemInstruction: string,
    inputContent: string,
    promptVersion: number,
): Promise<AiLabelResult[] | null> {
    if (!fallbackApiKey) return null;

    logWrapper.warn(`[AI Route] All Gemini tiers exhausted. Falling back to ${fallbackProviderName}...`);

    // Try each candidate model in order. A 429 / upstream-throttle on one
    // model rolls over to the next. Only return null if all candidates fail.
    for (const model of FALLBACK_MODELS) {
        try {
            const resp = await fetch(FALLBACK_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${fallbackApiKey}`,
                    'Content-Type': 'application/json',
                    // Optional headers for OpenRouter analytics, harmlessly ignored elsewhere
                    'HTTP-Referer': 'https://github.com/phaeton-capital',
                    'X-Title': 'Phaeton Capital',
                },
                body: JSON.stringify({
                    model,
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
                // 429 / upstream throttle on this specific model — try the next one
                if (resp.status === 429 || body.includes('rate-limited') || body.includes('temporarily')) {
                    logWrapper.warn(`[AI Route] ${fallbackProviderName} ${model} throttled (${resp.status}). Trying next candidate...`);
                    continue;
                }
                logWrapper.error(`[AI Route] ${fallbackProviderName} ${model} HTTP ${resp.status}: ${body.slice(0, 200)}`);
                continue;
            }

            const data: any = await resp.json();
            const raw = data?.choices?.[0]?.message?.content;
            if (!raw) {
                logWrapper.warn(`[AI Route] ${fallbackProviderName} ${model} returned empty content. Trying next...`);
                continue;
            }

            const results = parseLabelArray(raw, `${fallbackProviderName.toLowerCase().replace(' ', '-')}-${model}`, promptVersion);
            if (!results) {
                logWrapper.warn(`[AI Route] ${fallbackProviderName} ${model} returned unparsable output. Trying next...`);
                continue;
            }

            logWrapper.info(`[AI Route] ${fallbackProviderName} ${model} succeeded (${results.length} labels)`);
            return results;
        } catch (e) {
            logWrapper.warn(`[AI Route] ${fallbackProviderName} ${model} exception. Trying next...`, e);
            continue;
        }
    }

    logWrapper.error(`[AI Route] All ${fallbackProviderName} fallback models exhausted`);
    return null;
}

function isRateLimitError(err: any): boolean {
    return err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('Quota');
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

    const callGemini = async (model: string): Promise<AiLabelResult[] | null> => {
        const isGemma = model.toLowerCase().includes('gemma');

        const requestArgs: any = { model };
        if (isGemma) {
            // Gemma via the Gemini API supports neither system instructions
            // nor structured output — inline everything.
            requestArgs.contents = `${systemInstruction}\n\nPOSTS TO ANALYZE:\n${inputContent}`;
            requestArgs.config = { temperature: 0 };
        } else {
            requestArgs.contents = inputContent;
            requestArgs.config = {
                systemInstruction,
                responseMimeType: 'application/json',
                // Schema-enforced output: parsing failures can then only come
                // from truncation, not from the model improvising a shape.
                responseSchema: LABEL_RESPONSE_SCHEMA,
                temperature: 0,
            };
        }

        const response = await ai.models.generateContent(requestArgs);
        const output = response.text;
        if (!output) return null;

        const results = parseLabelArray(output, model, PROMPT_VERSION);
        if (!results) logWrapper.error(`AI returned unparsable output from ${model}`);
        return results;
    };

    // Primary model, then each Gemini fallback tier on rate limits, then the
    // aggregator providers. Non-rate-limit errors abort (they'd fail everywhere).
    try {
        return await callGemini(aiModel);
    } catch (err: any) {
        if (!isRateLimitError(err)) {
            logWrapper.error('Error calling Gemini:', err);
            return null;
        }
        logWrapper.warn(`[AI Route] Primary model (${aiModel}) rate-limited. Trying Gemini fallbacks: ${GEMINI_FALLBACK_MODELS.join(', ')}`);
    }

    for (const model of GEMINI_FALLBACK_MODELS) {
        if (model === aiModel) continue;
        try {
            const results = await callGemini(model);
            if (results) {
                logWrapper.info(`[AI Route] Gemini fallback ${model} succeeded (${results.length} labels)`);
                return results;
            }
        } catch (err: any) {
            if (!isRateLimitError(err)) {
                logWrapper.error(`[AI Route] Gemini fallback ${model} failed:`, err);
                return null;
            }
            logWrapper.warn(`[AI Route] Gemini fallback ${model} also rate-limited. Trying next...`);
        }
    }

    // All Gemini tiers throttled → aggregator providers
    return await labelWithFallbackModel(systemInstruction, inputContent, PROMPT_VERSION);
}
