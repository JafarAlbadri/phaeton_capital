import { logWrapper } from './logger';
import { labelSentimentAndDetectManipulation, AiInput } from './ai';
import { scrapeReddit, scrapePolygonNews, scrapeNewsAPI, scrapeStockTwits, scrapeEDGAR, scrapeOptionsFlow, computeTrustScore, generateDuplicateHash, ScrapedPost } from './scraper';
import { fetchFundamentals } from './fundamentals';
import { fetchAndSaveTrends } from './trends';
import { fetchAndSaveCrossListing } from './crosslist';
import { getCulturalProfile, buildCulturalImplications } from './hofstede';

// SSE client registry
type SseClient = { write: (data: string) => void; close: () => void };
const sseClients = new Set<SseClient>();
function broadcastSSE(event: string, data: object) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try { client.write(payload); } catch { sseClients.delete(client); }
    }
}
import { executeQuantModels } from './quant';
import { fetchAndSaveMacro } from './macro';
import { computeRiskProfile } from './risk';
import { computeRecommendation } from './recommendation';
import { computeVelocity } from './velocity';
import { evaluateAlerts } from './alerts/evaluator';
import { screenerQuery } from './screener';
import { sweepUniverse } from './scanner';
import prisma from '@sentiment-crowd/db';

const aiRpmLimit = parseInt(process.env.AI_RPM_LIMIT || '4', 10);
const delayMs = Math.ceil(60000 / aiRpmLimit);

const targetKeyword = process.env.TARGET_KEYWORD || 'wallstreetbets';

let isScraping = false;

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
    lazyConnect: true,
});

// Fail fast if Redis is unreachable at startup
try {
    await redisConnection.connect();
    await redisConnection.ping();
    logWrapper.info('Redis connection established.');
} catch (e) {
    logWrapper.error('Redis connection failed — worker cannot start:', e);
    process.exit(1);
}

const scrapeQueue = new Queue('scrapeQueue', { connection: redisConnection });

const scrapeWorker = new Worker('scrapeQueue', async (job: Job) => {
    if (job.name === 'process') {
        await processPosts(job.data.keyword);
    } else if (job.name === 'sweep') {
        await sweepUniverse(scrapeQueue, {
            minAgeHours: job.data?.minAgeHours ?? 6,
            maxBatch: job.data?.maxBatch ?? 30,
            enqueueSpacingMs: job.data?.spacingMs ?? 750,
        });
    }
}, { connection: redisConnection, concurrency: 1 });

scrapeWorker.on('failed', (job: Job | undefined, err: Error) => {
    logWrapper.error(`Job failed for ${job?.data?.keyword}:`, err);
});

async function syncFundamentals(currentKeyword: string) {
    const fundamentals = await fetchFundamentals(currentKeyword);
    if (!fundamentals) return;

    try {
        await prisma.fundamentalData.upsert({
            where: { ticker: currentKeyword },
            update: {
                current_price: fundamentals.current_price,
                target_price: fundamentals.target_price,
                target_low_price: fundamentals.target_low_price,
                target_high_price: fundamentals.target_high_price,
                recommendation: fundamentals.recommendation,
                pe_ratio: fundamentals.pe_ratio,
                high_52_week: fundamentals.high_52_week,
                low_52_week: fundamentals.low_52_week,
                market_cap: fundamentals.market_cap,
                volume: fundamentals.volume,
                analyst_strong_buy: fundamentals.analyst_strong_buy,
                analyst_buy: fundamentals.analyst_buy,
                analyst_hold: fundamentals.analyst_hold,
                analyst_sell: fundamentals.analyst_sell,
                analyst_strong_sell: fundamentals.analyst_strong_sell,
                next_earnings_date: fundamentals.next_earnings_date ? new Date(fundamentals.next_earnings_date) : null,
                sector: fundamentals.sector,
                industry: fundamentals.industry,
            },
            create: {
                ticker: currentKeyword,
                current_price: fundamentals.current_price,
                target_price: fundamentals.target_price,
                target_low_price: fundamentals.target_low_price,
                target_high_price: fundamentals.target_high_price,
                recommendation: fundamentals.recommendation,
                pe_ratio: fundamentals.pe_ratio,
                high_52_week: fundamentals.high_52_week,
                low_52_week: fundamentals.low_52_week,
                market_cap: fundamentals.market_cap,
                volume: fundamentals.volume,
                analyst_strong_buy: fundamentals.analyst_strong_buy,
                analyst_buy: fundamentals.analyst_buy,
                analyst_hold: fundamentals.analyst_hold,
                analyst_sell: fundamentals.analyst_sell,
                analyst_strong_sell: fundamentals.analyst_strong_sell,
                next_earnings_date: fundamentals.next_earnings_date ? new Date(fundamentals.next_earnings_date) : null,
                sector: fundamentals.sector,
                industry: fundamentals.industry,
            }
        });

        if (fundamentals.technical_indicators) {
            const ti = fundamentals.technical_indicators;
            await prisma.technicalIndicators.upsert({
                where: { ticker: currentKeyword },
                update: {
                    rsi_14: ti.rsi_14,
                    macd: ti.macd,
                    macd_signal: ti.macd_signal,
                    macd_histogram: ti.macd_histogram,
                    bb_upper: ti.bb_upper,
                    bb_middle: ti.bb_middle,
                    bb_lower: ti.bb_lower,
                    sma_20: ti.sma_20,
                    sma_50: ti.sma_50,
                    sma_200: ti.sma_200,
                    ema_12: ti.ema_12,
                    ema_26: ti.ema_26,
                    volume_sma_20: ti.volume_sma_20,
                    atr_14: ti.atr_14,
                    price_vs_bb: ti.price_vs_bb,
                    technical_signal: ti.technical_signal,
                    golden_cross: ti.golden_cross,
                    death_cross: ti.death_cross,
                },
                create: {
                    ticker: currentKeyword,
                    rsi_14: ti.rsi_14,
                    macd: ti.macd,
                    macd_signal: ti.macd_signal,
                    macd_histogram: ti.macd_histogram,
                    bb_upper: ti.bb_upper,
                    bb_middle: ti.bb_middle,
                    bb_lower: ti.bb_lower,
                    sma_20: ti.sma_20,
                    sma_50: ti.sma_50,
                    sma_200: ti.sma_200,
                    ema_12: ti.ema_12,
                    ema_26: ti.ema_26,
                    volume_sma_20: ti.volume_sma_20,
                    atr_14: ti.atr_14,
                    price_vs_bb: ti.price_vs_bb,
                    technical_signal: ti.technical_signal,
                    golden_cross: ti.golden_cross,
                    death_cross: ti.death_cross,
                }
            });
        }

        // Also pass iv_hv_ratio to QuantMetrics
        if (fundamentals.iv_hv_ratio != null) {
            await prisma.quantMetrics.upsert({
                where: { ticker: currentKeyword },
                update: { iv_hv_ratio: fundamentals.iv_hv_ratio },
                create: { ticker: currentKeyword, iv_hv_ratio: fundamentals.iv_hv_ratio }
            });
        }

        if (fundamentals.history && fundamentals.history.length > 0) {
            const historyUpserts = fundamentals.history.map(h => 
                prisma.financialHistory.upsert({
                    where: { ticker_year: { ticker: currentKeyword, year: h.year } },
                    update: { eps: h.eps, revenue_per_share: h.revenue_per_share, roe: h.roe, net_debt_ebitda: h.net_debt_ebitda, pe_ratio: h.pe_ratio, ps_ratio: h.ps_ratio, pb_ratio: h.pb_ratio, ev_ebit: h.ev_ebit },
                    create: { ticker: currentKeyword, year: h.year, eps: h.eps, revenue_per_share: h.revenue_per_share, roe: h.roe, net_debt_ebitda: h.net_debt_ebitda, pe_ratio: h.pe_ratio, ps_ratio: h.ps_ratio, pb_ratio: h.pb_ratio, ev_ebit: h.ev_ebit }
                })
            );
            await prisma.$transaction(historyUpserts);
        }

        if (fundamentals.insiders && fundamentals.insiders.length > 0) {
            await prisma.$transaction([
                prisma.insiderTrade.deleteMany({ where: { ticker: currentKeyword } }),
                prisma.insiderTrade.createMany({
                    data: fundamentals.insiders.map(i => ({
                        ticker: currentKeyword,
                        insider_name: i.insider_name,
                        position: i.position,
                        transaction: i.transaction,
                        shares: i.shares || 0,
                        value: i.value || 0,
                        date: new Date(i.date)
                    }))
                })
            ]);
        }
        logWrapper.info(`Saved fundamentals for ${currentKeyword}`);
    } catch (e) {
        logWrapper.error('Failed to save fundamentals to DB:', e);
    }
}

async function processPosts(keywordOverride?: string) {
    if (isScraping) {
        logWrapper.info('Scrape already in progress.');
        return;
    }
    isScraping = true;
    try {
        let currentKeyword = (keywordOverride || targetKeyword).trim();
        if (currentKeyword.length <= 5) currentKeyword = currentKeyword.toUpperCase();

        await syncFundamentals(currentKeyword);

        // Fetch options flow (non-blocking, best-effort)
        scrapeOptionsFlow(currentKeyword).then(async optionsData => {
            if (!optionsData) return;
            try {
                await (prisma as any).optionsFlow.upsert({
                    where: { ticker: currentKeyword },
                    update: {
                        put_call_ratio: optionsData.put_call_ratio, call_volume: optionsData.call_volume,
                        put_volume: optionsData.put_volume, total_open_interest: optionsData.total_open_interest,
                        iv_percentile: optionsData.iv_percentile, unusual_call_volume: optionsData.unusual_call_volume,
                        unusual_put_volume: optionsData.unusual_put_volume, max_pain_price: optionsData.max_pain_price,
                        nearest_expiry: optionsData.nearest_expiry,
                    },
                    create: {
                        ticker: currentKeyword, put_call_ratio: optionsData.put_call_ratio, call_volume: optionsData.call_volume,
                        put_volume: optionsData.put_volume, total_open_interest: optionsData.total_open_interest,
                        iv_percentile: optionsData.iv_percentile, unusual_call_volume: optionsData.unusual_call_volume,
                        unusual_put_volume: optionsData.unusual_put_volume, max_pain_price: optionsData.max_pain_price,
                        nearest_expiry: optionsData.nearest_expiry,
                    },
                });
                logWrapper.info(`Saved options flow for ${currentKeyword}`);
            } catch { /* model may not exist yet */ }
        }).catch(() => {});

        // Capture the current HMM state before any update so REGIME_CHANGE alerts can diff
        const prevQuantState = await prisma.quantMetrics.findUnique({ where: { ticker: currentKeyword }, select: { hmm_state: true } });
        const prevHmmState = prevQuantState?.hmm_state ?? null;

        // Run quant models immediately to populate UI before the slow sentiment scrape
        await executeQuantModels(currentKeyword);

        // Run Google Trends + cross-listing gap in parallel (non-blocking — both can be slow)
        Promise.allSettled([
            fetchAndSaveTrends(currentKeyword),
            fetchAndSaveCrossListing(currentKeyword),
        ]).catch(() => {});

        // Write Hofstede cultural profile from exchange country
        try {
            const macro = await prisma.macroIndicators.findUnique({ where: { ticker: currentKeyword } });
            const exchange = (macro as any)?.sector_etf as string | undefined;
            const profile = getCulturalProfile(exchange);
            if (profile) {
                const culturalProfile = buildCulturalImplications(profile);
                await prisma.macroIndicators.update({
                    where: { ticker: currentKeyword },
                    data: { country_code: profile.country_code, cultural_profile: culturalProfile } as any,
                });
            }
        } catch (_e) { /* macro data may not exist yet */ }

    const [redditPosts, newsPosts, yahooPosts, stockTwitsPosts, edgarPosts] = await Promise.all([
        scrapeReddit(currentKeyword, 100),
        scrapePolygonNews(currentKeyword),
        scrapeNewsAPI(currentKeyword),
        scrapeStockTwits(currentKeyword),
        scrapeEDGAR(currentKeyword),
    ]);
    const posts = [...redditPosts, ...newsPosts, ...yahooPosts, ...stockTwitsPosts, ...edgarPosts];
    logWrapper.info(`Scraped ${redditPosts.length} Reddit, ${newsPosts.length} GNews, ${yahooPosts.length} Yahoo, ${stockTwitsPosts.length} StockTwits, ${edgarPosts.length} EDGAR.`);

    let count = 0;
    const newPosts: ScrapedPost[] = [];
    const postHashes: Record<string, string> = {};

    for (const post of posts) {
        // 2. Filter: Duplicate Detection
        const duplicateHash = generateDuplicateHash(post.content);

        // Check if duplicate exists via DB
        try {
            const existing = await prisma.sentiment.findUnique({
                where: { duplicate_hash: duplicateHash }
            });

            if (existing) {
                logWrapper.info(`Duplicate detected for hash ${duplicateHash}. Skipping.`);
                continue;
            }
            newPosts.push(post);
            postHashes[post.id] = duplicateHash;
        } catch (dbErr) {
            logWrapper.error('Database connection might not be ready.', dbErr);
            return;
        }
    }

    if (newPosts.length === 0) {
        logWrapper.info('No new posts to process. Executing Quant models periodically...');
        await executeQuantModels(currentKeyword);
        return;
    }

    logWrapper.info(`Found ${newPosts.length} new posts. Batching AI requests...`);

    // 3. Smart Token Batching
    // Build batches based on approximate token count (1 token ~= 4 chars) to prevent API 429 TPM errors
    const MAX_TOKENS_PER_BATCH = 4000;
    const MAX_POSTS_PER_BATCH = 25; // Safety net so the prompt isn't too conceptually giant
    const allBatches: ScrapedPost[][] = [];

    let currentBatch: ScrapedPost[] = [];
    let currentTokens = 0;

    for (const post of newPosts) {
        const estTokens = Math.ceil(post.content.length / 4);

        if (currentBatch.length > 0 && (currentTokens + estTokens > MAX_TOKENS_PER_BATCH || currentBatch.length >= MAX_POSTS_PER_BATCH)) {
            allBatches.push(currentBatch);
            currentBatch = [];
            currentTokens = 0;
        }

        currentBatch.push(post);
        currentTokens += estTokens;
    }

    if (currentBatch.length > 0) {
        allBatches.push(currentBatch);
    }

    logWrapper.info(`Segmented ${newPosts.length} posts into ${allBatches.length} smart token-sized batches.`);

    let consecutiveAiFailures = 0;
    for (let i = 0; i < allBatches.length; i++) {
        if (consecutiveAiFailures >= 2) {
            logWrapper.warn(`[AI Circuit Breaker] Skipping remaining ${allBatches.length - i} batches — quota exhausted this cycle.`);
            break;
        }

        const batch = allBatches[i];

        const aiInputs: AiInput[] = batch.map(p => ({
            id: p.id,
            text: p.content
        }));

        const aiResults = await labelSentimentAndDetectManipulation(aiInputs);

        // Delay to respect AI rate limit based on configured AI_RPM_LIMIT
        await new Promise(r => setTimeout(r, delayMs));

        if (!aiResults) {
            consecutiveAiFailures++;
            logWrapper.info(`AI labeling failed or returned null for batch ${i + 1}/${allBatches.length}. Failures: ${consecutiveAiFailures}`);
            continue;
        }
        consecutiveAiFailures = 0;

        const scrape_batch_id = 'batch_' + Date.now();

        const sentimentsData = aiResults.map(aiResult => {
            const post = batch.find(p => p.id === aiResult.id);
            if (!post) return null;
            
            // 1. Filter: Anti-Slop
            const trustMultiplier = computeTrustScore(post.author_karma, post.account_age_days);
            if (trustMultiplier === 0) return null;

            const finalSentiment = Math.max(-1, Math.min(1, aiResult.sentiment));
            const finalConfidence = Math.max(0, Math.min(1, aiResult.confidence)) * trustMultiplier;
            const duplicateHash = postHashes[post.id];

            return {
                ticker: aiResult.ticker,
                sentiment: finalSentiment,
                is_manipulation: aiResult.is_manipulation,
                confidence: finalConfidence,
                author: post.author,
                author_karma: post.author_karma,
                account_age_days: post.account_age_days,
                post_timestamp: post.post_timestamp,
                content: post.content,
                duplicate_hash: duplicateHash,
                source: post.source,
                ai_model: aiResult.ai_model,
                scrape_batch_id: scrape_batch_id
            };
        }).filter(Boolean);

        if (sentimentsData.length > 0) {
            try {
                await prisma.sentiment.createMany({
                    data: sentimentsData as any,
                    skipDuplicates: true
                });
                logWrapper.info(`Saved ${sentimentsData.length} sentiment records for batch.`);
                count += sentimentsData.length;
            } catch (e) {
                logWrapper.error('Failed to save batch to DB:', e);
            }
        }
    }

    logWrapper.info(`Worker iteration completed. Saved ${count} new data points.`);
    broadcastSSE('sentiment_update', { ticker: currentKeyword, count, timestamp: new Date().toISOString() });

    await executeQuantModels(currentKeyword);
    broadcastSSE('quant_updated', { ticker: currentKeyword, timestamp: new Date().toISOString() });

    await Promise.all([
        fetchAndSaveMacro(currentKeyword),
        computeRiskProfile(currentKeyword),
    ]);
    // Compute recommendations for all three horizons concurrently
    await Promise.allSettled([
        computeRecommendation(currentKeyword, 15),
        computeRecommendation(currentKeyword, 30),
        computeRecommendation(currentKeyword, 90),
    ]);

    // Broadcast final recommendation to all SSE clients
    try {
        const rec = await (prisma.recommendationScore as any).findUnique({ where: { ticker_horizon: { ticker: currentKeyword, horizon: 15 } } });
        if (rec) broadcastSSE('recommendation', {
            ticker: currentKeyword, signal: rec.signal, score: rec.composite_score,
            confidence: rec.confidence, narrative: (rec as any).narrative ?? null,
            timestamp: new Date().toISOString()
        });
    } catch (_e) { /* non-critical */ }

    // Epic 6: Compute sentiment velocity + acceleration
    const velocity = await computeVelocity(currentKeyword).catch(e => { console.error('[velocity] error:', e); return null; });

    // Epic 5: Fetch contrarian signal from Python worker and save
    try {
        const PYTHON = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
        const cRes = await fetch(`${PYTHON}/contrarian/${currentKeyword}`);
        if (cRes.ok) {
            const contrarian = await cRes.json();
            if (!contrarian.error) {
                await (prisma.quantMetrics as any).upsert({
                    where: { ticker: currentKeyword },
                    create: { ticker: currentKeyword, contrarian_signal: contrarian },
                    update: { contrarian_signal: contrarian },
                });
                if (contrarian.isContrarian) {
                    console.log(`[contrarian] ${currentKeyword}: ${contrarian.type} conf=${contrarian.confidence}`);
                }
            }
        }
    } catch (e) { console.error('[contrarian] error:', e); }

    // Epic 2: Evaluate alerts for this ticker
    try {
        const rec = await (prisma.recommendationScore as any).findUnique({
            where: { ticker_horizon: { ticker: currentKeyword, horizon: 15 } },
        });
        const quant = await prisma.quantMetrics.findUnique({ where: { ticker: currentKeyword } });
        await evaluateAlerts(currentKeyword, {
            compositeScore: rec?.composite_score ?? null,
            signal: rec?.signal ?? null,
            hmmState: quant?.hmm_state ?? null,
            prevHmmState,
            sentimentDelta: velocity?.velocity6h ?? null,
        });
    } catch (e) { console.error('[alerts] error:', e); }

    } finally {
        isScraping = false;
    }
}

async function start() {
    Bun.serve({
        port: 8080,
        async fetch(req: Request) {
            const url = new URL(req.url);

            const corsOrigin = process.env.CORS_ORIGIN || '*';
            const corsHeaders = {
                'Access-Control-Allow-Origin': corsOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            };

            if (req.method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            if (url.pathname === '/health' && req.method === 'GET') {
                return new Response(JSON.stringify({ status: 'ok', using_redis: true }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            if (url.pathname === '/ready' && req.method === 'GET') {
                return new Response(JSON.stringify({ status: 'ready', queue_length: await scrapeQueue.count() }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            if (url.pathname === '/queue-status' && req.method === 'GET') {
                const [waiting, active, delayed, failed] = await Promise.all([
                    scrapeQueue.getWaitingCount(),
                    scrapeQueue.getActiveCount(),
                    scrapeQueue.getDelayedCount(),
                    scrapeQueue.getFailedCount(),
                ]);
                const jobs = await scrapeQueue.getJobs(['active', 'waiting'], 0, 10);
                return new Response(JSON.stringify({
                    waiting, active, delayed, failed,
                    jobs: jobs.map(j => ({ id: j.id, name: j.name, ticker: j.data?.keyword, state: j.toJSON().processedOn ? 'active' : 'waiting' })),
                }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
            }

            // AI Calibration Feedback Endpoint
            if (url.pathname === '/feedback' && req.method === 'POST') {
                try {
                    const body = await req.clone().json();
                    if (!body.id || typeof body.admin_sentiment !== 'number') {
                        return new Response("Invalid feedback payload", { status: 400 });
                    }
                    await prisma.sentiment.update({
                        where: { id: body.id },
                        data: {
                            admin_sentiment: body.admin_sentiment,
                            admin_manipulation: body.admin_manipulation
                        }
                    });
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                } catch (e) {
                    logWrapper.error("Failed to save AI feedback", e);
                    return new Response("Server error", { status: 500 });
                }
            }

            if (url.pathname === '/events' && req.method === 'GET') {
                let streamController: ReadableStreamDefaultController<Uint8Array>;
                const encoder = new TextEncoder();
                let client: SseClient;
                const stream = new ReadableStream<Uint8Array>({
                    start(controller) { streamController = controller; },
                    cancel() { sseClients.delete(client); }
                });
                client = {
                    write: (data: string) => { try { streamController.enqueue(encoder.encode(data)); } catch {} },
                    close: () => { try { streamController.close(); } catch {} sseClients.delete(client); }
                };
                sseClients.add(client);
                client.write(`: heartbeat\n\n`);
                const heartbeat = setInterval(() => client.write(`: heartbeat\n\n`), 25000);
                // Clean up heartbeat when stream closes
                stream.pipeTo(new WritableStream({ close() { clearInterval(heartbeat); } })).catch(() => clearInterval(heartbeat));
                return new Response(stream, {
                    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' }
                });
            }

            if (url.pathname === '/trigger' && req.method === 'POST') {
                const workerSecret = process.env.WORKER_SECRET;
                if (workerSecret) {
                    const auth = req.headers.get('Authorization');
                    if (auth !== `Bearer ${workerSecret}`) {
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
                        });
                    }
                }

                let dynamicKeyword = targetKeyword;
                try {
                    const body = await req.clone().json();
                    if (body && body.keyword) dynamicKeyword = body.keyword;
                } catch (e) {}

                // Make sure fundamental data is saved before returning 200 so UI can load it immediately
                let finalKeyword = dynamicKeyword.trim();
                if (finalKeyword.length <= 5) finalKeyword = finalKeyword.toUpperCase();
                await syncFundamentals(finalKeyword);

                // Push to job queue (prevents backlog via dedup if same ticker added within 10 min)
                const jobId = `manual_${finalKeyword}_${Math.floor(Date.now() / 600000)}`;
                scrapeQueue.add('process', { keyword: finalKeyword }, { 
                    jobId,
                    attempts: 5,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: 1000
                }).catch(e => logWrapper.error('Job queue push error:', e));

                return new Response(JSON.stringify({ status: 'started', keyword: finalKeyword }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            // ── Universe scanner trigger (manual sweep) ─────────────────────────────
            if (url.pathname === '/scan-universe' && req.method === 'POST') {
                const workerSecret = process.env.WORKER_SECRET;
                if (workerSecret) {
                    const auth = req.headers.get('Authorization');
                    if (auth !== `Bearer ${workerSecret}`) {
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
                        });
                    }
                }

                let minAgeHours = 6;
                let maxBatch = 30;
                try {
                    const body = await req.clone().json();
                    if (typeof body?.minAgeHours === 'number') minAgeHours = body.minAgeHours;
                    if (typeof body?.maxBatch === 'number') maxBatch = body.maxBatch;
                } catch {}

                scrapeQueue.add('sweep', { minAgeHours, maxBatch, spacingMs: 750 }, {
                    jobId: `sweep_${Math.floor(Date.now() / 60000)}`,
                    removeOnComplete: true,
                    removeOnFail: 1000,
                }).catch(e => logWrapper.error('Sweep enqueue error:', e));

                return new Response(JSON.stringify({ status: 'sweep_queued', minAgeHours, maxBatch }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            // ── Epic 3: Screener ─────────────────────────────────────────────────────
            if (url.pathname === '/screener' && req.method === 'GET') {
                try {
                    const tickersParam = url.searchParams.get('tickers') || '';
                    const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
                    const sortBy  = url.searchParams.get('sortBy') || 'composite15d';
                    const order   = (url.searchParams.get('order') || 'desc') as 'asc' | 'desc';
                    const rows = await screenerQuery(tickers, sortBy, order);
                    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                } catch (e: any) {
                    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                }
            }

            // ── Epic 1: Backtest proxy ────────────────────────────────────────────────
            if (url.pathname.startsWith('/backtest/') && req.method === 'GET') {
                const ticker = url.pathname.split('/')[2]?.toUpperCase();
                if (!ticker) return new Response('Missing ticker', { status: 400 });
                try {
                    const PYTHON = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
                    const qs = url.search;
                    const res = await fetch(`${PYTHON}/backtest/${ticker}${qs}`, { signal: AbortSignal.timeout(35_000) });
                    const data = await res.text();
                    return new Response(data, { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                } catch (e: any) {
                    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                }
            }

            // ── Epic 7: Earnings history proxy ────────────────────────────────────────
            if (url.pathname.startsWith('/earnings-history/') && req.method === 'GET') {
                const ticker = url.pathname.split('/')[2]?.toUpperCase();
                if (!ticker) return new Response('Missing ticker', { status: 400 });
                try {
                    const PYTHON = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
                    const res = await fetch(`${PYTHON}/earnings-history/${ticker}`, { signal: AbortSignal.timeout(20_000) });
                    const data = await res.text();
                    return new Response(data, { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                } catch (e: any) {
                    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
                }
            }

            return new Response('Worker running.', { headers: corsHeaders });

        }
    });

    logWrapper.info('Worker Server listening on port 8080');

    // Startup run
    scrapeQueue.add('process', { keyword: targetKeyword }, {
        jobId: `startup_${targetKeyword}`,
        removeOnComplete: true,
        removeOnFail: 1000,
    }).catch(logWrapper.error);

    // Recurring 15-min interval — upsertJobScheduler prevents duplicate repeat jobs on restart
    scrapeQueue.upsertJobScheduler(
        `recurring_${targetKeyword}`,
        { pattern: '*/15 * * * *' },
        { name: 'process', data: { keyword: targetKeyword }, opts: { removeOnComplete: true, removeOnFail: 1000 } },
    ).catch(logWrapper.error);

    // Universe sweep — every 6 hours, picks tickers stale > 6h, max 30 per sweep.
    // Combined with the per-job 750ms enqueue spacing, this keeps the worker
    // happily chewing through the universe without melting yfinance/Gemini quotas.
    if (process.env.UNIVERSE_SWEEP_ENABLED !== 'false') {
        scrapeQueue.upsertJobScheduler(
            'universe_sweep',
            { pattern: '0 */6 * * *' },
            { name: 'sweep', data: { minAgeHours: 6, maxBatch: 30, spacingMs: 750 }, opts: { removeOnComplete: true, removeOnFail: 1000 } },
        ).catch(logWrapper.error);
        logWrapper.info('Universe sweep scheduled (every 6h, max 30 tickers/sweep).');
    }
}

start().catch(logWrapper.error);
