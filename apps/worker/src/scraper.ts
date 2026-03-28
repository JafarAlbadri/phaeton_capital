export interface ScrapedPost {
    id: string;
    source: string;
    author: string;
    author_karma: number;
    account_age_days: number;
    post_timestamp: Date;
    content: string;
}

export function computeTrustScore(karma: number, ageDays: number): boolean {
    // Account Age > 30 days AND Karma > 100
    return ageDays > 30 && karma > 100;
}

export function generateDuplicateHash(content: string): string {
    // Normalize strings to detect bot farms posting the same thing
    const normalized = content.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(normalized);
    return hasher.digest("hex");
}

import Parser from 'rss-parser';

export async function scrapeReddit(keyword: string, limit = 100): Promise<ScrapedPost[]> {
    // If keyword is provided, search, otherwise fallback to wsb new
    const query = encodeURIComponent(keyword);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=new&limit=${limit}&t=month`;

    console.log(`Fetching from ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'SentimentCrowd/1.0.0'
            }
        });

        if (!response.ok) {
            console.error(`Reddit API returned ${response.status}: ${await response.text()}`);
            return [];
        }

        const json = await response.json();
        const children = json?.data?.children || [];

        return children.map((child: any) => {
            const data = child.data;
            return {
                id: data.id,
                source: 'reddit',
                author: data.author,
                author_karma: 500, // Trust filter was removed per audit
                account_age_days: 100, // Trust filter was removed per audit
                post_timestamp: new Date(data.created_utc * 1000),
                content: data.title + "\n" + (data.selftext || ''),
            };
        }).filter((p: ScrapedPost) => p.content.trim().length > 10);
    } catch (error) {
        console.error('Failed to scrape Reddit:', error);
        return [];
    }
}

const parser = new Parser();

export async function scrapeGoogleNews(keyword: string): Promise<ScrapedPost[]> {
    const query = encodeURIComponent(keyword);
    // Added when:30d to Google news query to get past 30 days
    const url = `https://news.google.com/rss/search?q=${query}+when:30d&hl=en-US&gl=US&ceid=US:en`;

    console.log(`Fetching News RSS from ${url}`);

    try {
        const feed = await parser.parseURL(url);

        return feed.items.slice(0, 100).map((item: any) => {
            return {
                id: generateDuplicateHash(item.link || item.title || Math.random().toString()),
                source: 'google_news',
                author: item.creator || item.publisher || 'Unknown Publisher',
                author_karma: 10000, // Inherently trusted source
                account_age_days: 1000, // Inherently trusted source
                post_timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
                content: (item.title || '') + "\n" + (item.contentSnippet || ''),
            };
        });
    } catch (error) {
        console.error('Failed to scrape Google News:', error);
        return [];
    }
}

export async function scrapeYahooFinanceNews(keyword: string): Promise<ScrapedPost[]> {
    const query = encodeURIComponent(keyword);
    // Yahoo Finance RSS Search endpoint
    const url = `https://finance.yahoo.com/rss/headline?s=${query}`;

    console.log(`Fetching Yahoo Finance News RSS from ${url}`);

    try {
        const feed = await parser.parseURL(url);

        return feed.items.slice(0, 50).map((item: any) => {
            return {
                id: generateDuplicateHash(item.link || item.title || Math.random().toString()),
                source: 'yahoo_finance',
                author: item.creator || item.publisher || 'Yahoo Finance',
                author_karma: 10000, // Trusted source
                account_age_days: 1000, // Trusted source
                post_timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
                content: (item.title || '') + "\n" + (item.contentSnippet || ''),
            };
        });
    } catch (error) {
        // Yahoo Finance RSS can sometimes block or fail if the ticker isn't recognized
        console.error(`Failed to scrape Yahoo Finance News for ${keyword}:`, error);
        return [];
    }
}

export async function scrapeStockTwits(ticker: string): Promise<ScrapedPost[]> {
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker.toUpperCase()}.json?limit=30`;
    console.log(`Fetching StockTwits for ${ticker}`);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'SentimentCrowd/1.0.0' },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            console.error(`StockTwits returned ${response.status}`);
            return [];
        }
        const json = await response.json();
        const messages = json?.messages || [];
        return messages.map((msg: any) => ({
            id: String(msg.id),
            source: 'stocktwits',
            author: msg.user?.username || 'unknown',
            author_karma: msg.user?.followers || 0,
            account_age_days: msg.user?.join_date
                ? Math.floor((Date.now() - new Date(msg.user.join_date).getTime()) / (24 * 60 * 60 * 1000))
                : 100,
            post_timestamp: new Date(msg.created_at),
            content: msg.body || '',
        })).filter((p: ScrapedPost) => p.content.trim().length > 5);
    } catch (err) {
        console.error('StockTwits scrape failed:', err);
        return [];
    }
}

export async function scrapeEDGAR(ticker: string): Promise<ScrapedPost[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&dateRange=custom&startdt=${thirtyDaysAgo}&forms=8-K,10-Q`;
    console.log(`Fetching SEC EDGAR filings for ${ticker}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'SentimentCrowd research@sentimentcrowd.com',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
            console.error(`EDGAR returned ${response.status}`);
            return [];
        }
        const json = await response.json();
        const hits = json?.hits?.hits || [];
        return hits.slice(0, 10).map((hit: any) => {
            const src = hit._source || {};
            const content = `${src.form_type || ''}: ${src.display_names?.join(', ') || ''} - ${src.period_of_report || ''} - ${src.entity_name || ''}`;
            return {
                id: hit._id || generateDuplicateHash(content),
                source: 'sec_edgar',
                author: src.entity_name || 'SEC EDGAR',
                author_karma: 10000, // Official filing
                account_age_days: 10000,
                post_timestamp: src.file_date ? new Date(src.file_date) : new Date(),
                content,
            };
        }).filter((p: ScrapedPost) => p.content.trim().length > 10);
    } catch (err) {
        console.error('SEC EDGAR scrape failed:', err);
        return [];
    }
}
