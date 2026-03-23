import { labelSentimentAndDetectManipulation, AiInput } from './ai';
import { scrapeReddit, scrapeGoogleNews, scrapeYahooFinanceNews, computeTrustScore, generateDuplicateHash, ScrapedPost } from './scraper';
import { fetchFundamentals } from './fundamentals';
import prisma from '@sentiment-crowd/db';

const aiRpmLimit = parseInt(process.env.AI_RPM_LIMIT || '4', 10);
const delayMs = Math.ceil(60000 / aiRpmLimit);

const targetKeyword = process.env.TARGET_KEYWORD || 'wallstreetbets';

let isScraping = false;

async function syncFundamentals(currentKeyword: string) {
    const fundamentals = await fetchFundamentals(currentKeyword);
    if (!fundamentals) return;

    try {
        await prisma.fundamentalData.upsert({
            where: { ticker: currentKeyword },
            update: {
                current_price: fundamentals.current_price,
                target_price: fundamentals.target_price,
                recommendation: fundamentals.recommendation,
                pe_ratio: fundamentals.pe_ratio,
                high_52_week: fundamentals.high_52_week,
                low_52_week: fundamentals.low_52_week,
                market_cap: fundamentals.market_cap,
                volume: fundamentals.volume,
            },
            create: {
                ticker: fundamentals.ticker,
                current_price: fundamentals.current_price,
                target_price: fundamentals.target_price,
                recommendation: fundamentals.recommendation,
                pe_ratio: fundamentals.pe_ratio,
                high_52_week: fundamentals.high_52_week,
                low_52_week: fundamentals.low_52_week,
                market_cap: fundamentals.market_cap,
                volume: fundamentals.volume,
            }
        });

        if (fundamentals.history && fundamentals.history.length > 0) {
            for (const h of fundamentals.history) {
                await prisma.financialHistory.upsert({
                    where: { ticker_year: { ticker: currentKeyword, year: h.year } },
                    update: { eps: h.eps, revenue_per_share: h.revenue_per_share, roe: h.roe, net_debt_ebitda: h.net_debt_ebitda, pe_ratio: h.pe_ratio, ps_ratio: h.ps_ratio, pb_ratio: h.pb_ratio, ev_ebit: h.ev_ebit },
                    create: { ticker: currentKeyword, year: h.year, eps: h.eps, revenue_per_share: h.revenue_per_share, roe: h.roe, net_debt_ebitda: h.net_debt_ebitda, pe_ratio: h.pe_ratio, ps_ratio: h.ps_ratio, pb_ratio: h.pb_ratio, ev_ebit: h.ev_ebit }
                });
            }
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
        console.log(`Saved fundamentals for ${currentKeyword}`);
    } catch (e) {
        console.error('Failed to save fundamentals to DB:', e);
    }
}

async function processPosts(keywordOverride?: string) {
    if (isScraping) {
        console.log('Scrape already in progress.');
        return;
    }
    isScraping = true;
    try {
        let currentKeyword = (keywordOverride || targetKeyword).trim();
        if (currentKeyword.length <= 5) currentKeyword = currentKeyword.toUpperCase();

        await syncFundamentals(currentKeyword);

    const redditPosts = await scrapeReddit(currentKeyword, 100);
    const newsPosts = await scrapeGoogleNews(currentKeyword);
    const yahooPosts = await scrapeYahooFinanceNews(currentKeyword);
    const posts = [...redditPosts, ...newsPosts, ...yahooPosts];
    console.log(`Scraped ${redditPosts.length} from Reddit, ${newsPosts.length} from Google News, and ${yahooPosts.length} from Yahoo. Processing...`);

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
                console.log(`Duplicate detected for hash ${duplicateHash}. Skipping.`);
                continue;
            }
            newPosts.push(post);
            postHashes[post.id] = duplicateHash;
        } catch (dbErr) {
            console.error('Database connection might not be ready.', dbErr);
            return;
        }
    }

    if (newPosts.length === 0) {
        console.log('No new posts to process.');
        return;
    }

    console.log(`Found ${newPosts.length} new posts. Batching AI requests...`);

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

    console.log(`Segmented ${newPosts.length} posts into ${allBatches.length} smart token-sized batches.`);

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
            console.log('AI labeling failed or returned null for batch. Skipping.');
            continue;
        }

        const scrape_batch_id = 'batch_' + Date.now();

        for (const aiResult of aiResults) {
            const post = batch.find(p => p.id === aiResult.id);
            if (!post) continue;

            // 1. Filter: Anti-Slop
            const isTrusted = computeTrustScore(post.author_karma, post.account_age_days);

            if (!isTrusted) {
                continue; // Phase 2: Exclude untrusted instead of saving sentiment=0
            }

            // Phase 2: Range Validate AI outputs
            const finalSentiment = Math.max(-1, Math.min(1, aiResult.sentiment));
            const finalConfidence = Math.max(0, Math.min(1, aiResult.confidence));
            const duplicateHash = postHashes[post.id];

            // 4. Save to Database
            try {
                await prisma.sentiment.create({
                    data: {
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
                    }
                });
                console.log(`Saved sentiment for ${aiResult.ticker} (${finalSentiment}) by ${post.author}`);
                count++;
            } catch (e: any) {
                if (e.code === 'P2002') {
                    // Unique constraint failed
                    console.log(`Prisma: Duplicate hash ${duplicateHash}. Skipping.`);
                } else {
                    console.error('Failed to save to DB:', e);
                }
            }
        }
    }

    console.log(`Worker iteration completed. Saved ${count} new data points.`);
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

                // Run slow sentiment analysis backwards in background
                processPosts(finalKeyword).catch(e => console.error('Unhandled processPosts error:', e));

                return new Response(JSON.stringify({ status: 'started', keyword: finalKeyword }), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            return new Response('Worker running.', { headers: corsHeaders });
        }
    });

    console.log('Worker Server listening on port 8080');

    // Trigger one run on startup
    await processPosts();

    // Setup standard repeating cron
    setInterval(processPosts, 15 * 60 * 1000); // 15 minutes
}

start().catch(console.error);
