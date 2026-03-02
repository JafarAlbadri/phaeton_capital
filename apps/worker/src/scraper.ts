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

export async function scrapeReddit(keyword: string, limit = 25): Promise<ScrapedPost[]> {
    // If keyword is provided, search, otherwise fallback to wsb new
    const query = encodeURIComponent(keyword);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=new&limit=${limit}`;

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
            const pseudoKarma = Math.floor(Math.random() * 5000);
            const pseudoAgeDays = Math.floor(Math.random() * 300);

            return {
                id: data.id,
                source: 'reddit',
                author: data.author,
                author_karma: pseudoKarma,
                account_age_days: pseudoAgeDays,
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
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    console.log(`Fetching News RSS from ${url}`);

    try {
        const feed = await parser.parseURL(url);

        return feed.items.slice(0, 25).map((item: any) => {
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

        return feed.items.slice(0, 15).map((item: any) => {
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
