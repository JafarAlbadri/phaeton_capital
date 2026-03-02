import { labelSentimentAndDetectManipulation, AiInput } from './ai';
import { scrapeReddit, scrapeGoogleNews, scrapeYahooFinanceNews, computeTrustScore, generateDuplicateHash, ScrapedPost } from './scraper';
import { fetchFundamentals } from './fundamentals';
import prisma from '@sentiment-crowd/db';

const aiRpmLimit = parseInt(process.env.AI_RPM_LIMIT || '4', 10);
const delayMs = Math.ceil(60000 / aiRpmLimit);

const targetKeyword = process.env.TARGET_KEYWORD || 'wallstreetbets';

async function processPosts() {
    console.log(`Starting execution of SentimentCrowd worker for keyword: ${targetKeyword}...`);

    // Fetch Fundamentals
    const fundamentals = await fetchFundamentals(targetKeyword);
    if (fundamentals) {
        try {
            await prisma.fundamentalData.upsert({
                where: { ticker: targetKeyword },
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
                    ...fundamentals
                }
            });
            console.log(`Saved fundamentals for ${targetKeyword}`);
        } catch (e) {
            console.error('Failed to save fundamentals to DB:', e);
        }
    }

    const redditPosts = await scrapeReddit(targetKeyword, 15);
    const newsPosts = await scrapeGoogleNews(targetKeyword);
    const yahooPosts = await scrapeYahooFinanceNews(targetKeyword);
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

    // Batch into chunks of 20
    const chunkSize = 20;
    for (let i = 0; i < newPosts.length; i += chunkSize) {
        const batch = newPosts.slice(i, i + chunkSize);

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

        for (const aiResult of aiResults) {
            const post = batch.find(p => p.id === aiResult.id);
            if (!post) continue;

            // 1. Filter: Anti-Slop
            const isTrusted = computeTrustScore(post.author_karma, post.account_age_days);

            // If an account fails trust score, its sentiment weight is 0.
            const finalSentiment = isTrusted ? aiResult.sentiment : 0;
            const duplicateHash = postHashes[post.id];

            // 4. Save to Database
            try {
                await prisma.sentiment.create({
                    data: {
                        ticker: aiResult.ticker,
                        sentiment: finalSentiment,
                        is_manipulation: aiResult.is_manipulation,
                        confidence: aiResult.confidence,
                        author: post.author,
                        author_karma: post.author_karma,
                        account_age_days: post.account_age_days,
                        post_timestamp: post.post_timestamp,
                        content: post.content,
                        duplicate_hash: duplicateHash,
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
}

async function start() {
    // Start server to allow manual trigger via Next.js api proxy
    Bun.serve({
        port: 8080,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === '/trigger' && req.method === 'POST') {
                processPosts(); // Run async
                return new Response(JSON.stringify({ status: 'started' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response('Worker running.');
        }
    });

    console.log('Worker Server listening on port 8080');

    // Trigger one run on startup
    await processPosts();

    // Setup standard repeating cron
    setInterval(processPosts, 15 * 60 * 1000); // 15 minutes
}

start().catch(console.error);
