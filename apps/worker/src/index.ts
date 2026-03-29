import { logWrapper } from './logger';
import { labelSentimentAndDetectManipulation, AiInput } from './ai';
import { scrapeReddit, scrapeGoogleNews, scrapeYahooFinanceNews, scrapeStockTwits, scrapeEDGAR, computeTrustScore, generateDuplicateHash, ScrapedPost } from './scraper';
import { fetchFundamentals } from './fundamentals';
import { executeQuantModels } from './quant';
import { fetchAndSaveMacro } from './macro';
import { computeRiskProfile } from './risk';
import { computeRecommendation } from './recommendation';
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
    maxRetriesPerRequest: null
});

const scrapeQueue = new Queue('scrapeQueue', { connection: redisConnection });

const scrapeWorker = new Worker('scrapeQueue', async (job: Job) => {
    if (job.name === 'process') {
        await processPosts(job.data.keyword);
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

        // --- PHASE 4 FIX: Instantly generate institutional price models (HMM, Hurst, MC) 
        // to populate the UI dashboard immediately, before the 60+ second LLM sentiment scrape begins.
        await executeQuantModels(currentKeyword);

    const [redditPosts, newsPosts, yahooPosts, stockTwitsPosts, edgarPosts] = await Promise.all([
        scrapeReddit(currentKeyword, 100),
        scrapeGoogleNews(currentKeyword),
        scrapeYahooFinanceNews(currentKeyword),
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

    for (let i = 0; i < allBatches.length; i++) {
        const batch = allBatches[i];

        const aiInputs: AiInput[] = batch.map(p => ({
            id: p.id,
            text: p.content
        }));

        const aiResults = await labelSentimentAndDetectManipulation(aiInputs);

        // Delay to respect AI rate limit based on configured AI_RPM_LIMIT
        await new Promise(r => setTimeout(r, delayMs));

        if (!aiResults) {
            logWrapper.info('AI labeling failed or returned null for batch. Skipping.');
            continue;
        }

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

    // Final Step: Execute advanced Python quantitative models with newly scraped data
    await executeQuantModels(currentKeyword);

    // Run macro, risk, and recommendation in parallel
    await Promise.all([
        fetchAndSaveMacro(currentKeyword),
        computeRiskProfile(currentKeyword),
    ]);
    await computeRecommendation(currentKeyword);

    } finally {
        isScraping = false;
    }
}

async function start() {
    Bun.serve({
        port: 8080,
        async fetch(req: Request) {
            const url = new URL(req.url);

            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
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

            if (url.pathname === '/trigger' && req.method === 'POST') {
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
            return new Response('Worker running.', { headers: corsHeaders });
        }
    });

    logWrapper.info('Worker Server listening on port 8080');

    // Startup run
    scrapeQueue.add('process', { keyword: targetKeyword }, { 
        jobId: `startup_${targetKeyword}`,
        removeOnComplete: true, 
        removeOnFail: 1000 
    }).catch(logWrapper.error);
    
    // Recurring 15-min interval
    scrapeQueue.add('process', { keyword: targetKeyword }, { 
        repeat: { pattern: '*/15 * * * *' },
        jobId: `recurring_${targetKeyword}`,
        removeOnComplete: true, 
        removeOnFail: 1000 
    }).catch(logWrapper.error);
}

start().catch(logWrapper.error);
