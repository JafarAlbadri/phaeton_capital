import { logWrapper } from './logger';
export interface ScrapedPost {
    id: string;
    source: string;
    author: string;
    author_karma: number;
    account_age_days: number;
    post_timestamp: Date;
    content: string;
}

export function computeTrustScore(karma: number, ageDays: number): number {
    // Account Age > 30 days AND Karma > 100
    if (ageDays < 30 || karma < 100) return 0;
    if (karma >= 500) return 1.0;
    // Linear map 100-500 to 0.3-1.0
    return 0.3 + ((karma - 100) / 400) * 0.7;
}

export function generateDuplicateHash(content: string): string {
    // Normalize strings to detect bot farms posting the same thing
    const normalized = content.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(normalized);
    return hasher.digest("hex");
}

import Parser from 'rss-parser';

async function getRedditAccessToken(): Promise<string | null> {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) return null;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    try {
        const res = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'SentimentCrowd/1.0.0'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await res.json();
        return data.access_token || null;
    } catch {
        return null;
    }
}

export async function scrapeReddit(keyword: string, limit = 100): Promise<ScrapedPost[]> {
    const query = encodeURIComponent(keyword);
    const token = await getRedditAccessToken();
    const headers: any = { 'User-Agent': 'SentimentCrowd/1.0.0' };
    
    let url = `https://www.reddit.com/search.json?q=${query}&sort=new&limit=${limit}&t=month`;
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        url = `https://oauth.reddit.com/search?q=${query}&sort=new&limit=${limit}&t=month`;
    }

    logWrapper.info(`Fetching from ${url}`);

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            logWrapper.error(`Reddit API returned ${response.status}: ${await response.text()}`);
            return [];
        }

        const json = await response.json();
        const children = json?.data?.children || [];

        // Fetch user profiles to get real karma/age
        const authorsToFetch = [...new Set(children.map((c: any) => c.data.author))].slice(0, 30);
        const authorCache: Record<string, { karma: number, ageDays: number }> = {};
        
        if (token && authorsToFetch.length > 0) {
            logWrapper.info(`Fetching profiles for ${authorsToFetch.length} Reddit authors...`);
            await Promise.all(authorsToFetch.map(async (author) => {
                if (author === '[deleted]') return;
                try {
                    const uRes = await fetch(`https://oauth.reddit.com/user/${author}/about`, { headers });
                    if (uRes.ok) {
                        const uData = await uRes.json();
                        const createdUnix = uData?.data?.created_utc || Date.now() / 1000;
                        const ageDays = (Date.now() / 1000 - createdUnix) / 86400;
                        authorCache[author as string] = {
                            karma: (uData?.data?.link_karma || 0) + (uData?.data?.comment_karma || 0),
                            ageDays: ageDays
                        };
                    }
                } catch (e) {}
            }));
        }

        return children.map((child: any) => {
            const data = child.data;
            const authorData = authorCache[data.author] || { karma: 500, ageDays: 100 };
            return {
                id: data.id,
                source: 'reddit',
                author: data.author,
                author_karma: authorData.karma,
                account_age_days: authorData.ageDays,
                post_timestamp: new Date(data.created_utc * 1000),
                content: data.title + "
" + (data.selftext || ''),
            };
        }).filter((p: ScrapedPost) => p.content.trim().length > 10);
    } catch (error) {
        logWrapper.error('Failed to scrape Reddit:', error);
        return [];
    }
}

const parser = new Parser();

export async function scrapePolygonNews(keyword: string): Promise<ScrapedPost[]> {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
        logWrapper.warn('POLYGON_API_KEY missing, skipping Polygon News. Please set POLYGON_API_KEY in .env');
        return [];
    }
    const url = `https://api.polygon.io/v2/reference/news?ticker=${keyword.toUpperCase()}&limit=50&apiKey=${apiKey}`;

    logWrapper.info(`Fetching Polygon News for ${keyword}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Polygon API returned ${response.status}`);
        
        const json = await response.json();
        const results = json.results || [];

        return results.map((item: any) => {
            return {
                id: generateDuplicateHash(item.id || item.article_url || Math.random().toString()),
                source: 'polygon_news',
                author: item.publisher?.name || 'Polygon Publisher',
                author_karma: 10000, // Trusted source
                account_age_days: 1000, 
                post_timestamp: item.published_utc ? new Date(item.published_utc) : new Date(),
                content: (item.title || '') + "\n" + (item.description || ''),
            };
        });
    } catch (error) {
        logWrapper.error('Failed to scrape Polygon News:', error);
        return [];
    }
}

export async function scrapeNewsAPI(keyword: string): Promise<ScrapedPost[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
        logWrapper.warn('NEWSAPI_KEY missing, skipping NewsAPI.');
        return [];
    }
    const query = encodeURIComponent(keyword);
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=50&apiKey=${apiKey}`;

    logWrapper.info(`Fetching NewsAPI for ${keyword}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`NewsAPI returned ${response.status}`);
        
        const json = await response.json();
        const articles = json.articles || [];

        return articles.map((item: any) => {
            return {
                id: generateDuplicateHash(item.url || item.title || Math.random().toString()),
                source: 'news_api',
                author: item.source?.name || item.author || 'NewsAPI Source',
                author_karma: 10000,
                account_age_days: 1000,
                post_timestamp: item.publishedAt ? new Date(item.publishedAt) : new Date(),
                content: (item.title || '') + "\n" + (item.description || ''),
            };
        });
    } catch (error) {
        logWrapper.error(`Failed to scrape NewsAPI for ${keyword}:`, error);
        return [];
    }
}

export async function scrapeStockTwits(ticker: string): Promise<ScrapedPost[]> {
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker.toUpperCase()}.json?limit=30`;
    logWrapper.info(`Fetching StockTwits for ${ticker}`);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'SentimentCrowd/1.0.0' },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            logWrapper.error(`StockTwits returned ${response.status}`);
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
        logWrapper.error('StockTwits scrape failed:', err);
        return [];
    }
}

export interface OptionsFlowData {
    ticker: string;
    put_call_ratio: number | null;
    call_volume: bigint | null;
    put_volume: bigint | null;
    total_open_interest: bigint | null;
    iv_percentile: number | null;
    unusual_call_volume: boolean;
    unusual_put_volume: boolean;
    max_pain_price: number | null;
    nearest_expiry: string | null;
}

export async function scrapeOptionsFlow(ticker: string): Promise<OptionsFlowData | null> {
    try {
        const pythonUrl = process.env.PYTHON_WORKER_URL || 'http://python_worker:8000';
        const resp = await fetch(`${pythonUrl}/options/${encodeURIComponent(ticker)}`, {
            signal: AbortSignal.timeout(15000)
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.error) return null;
        return {
            ticker,
            put_call_ratio: data.put_call_ratio ?? null,
            call_volume: data.call_volume != null ? BigInt(data.call_volume) : null,
            put_volume: data.put_volume != null ? BigInt(data.put_volume) : null,
            total_open_interest: data.total_open_interest != null ? BigInt(data.total_open_interest) : null,
            iv_percentile: data.iv_percentile ?? null,
            unusual_call_volume: !!data.unusual_call_volume,
            unusual_put_volume: !!data.unusual_put_volume,
            max_pain_price: data.max_pain_price ?? null,
            nearest_expiry: data.nearest_expiry ?? null,
        };
    } catch {
        return null;
    }
}

export async function scrapeEDGAR(ticker: string): Promise<ScrapedPost[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&dateRange=custom&startdt=${thirtyDaysAgo}&forms=8-K,10-Q`;
    logWrapper.info(`Fetching SEC EDGAR filings for ${ticker}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'SentimentCrowd research@sentimentcrowd.com',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
            logWrapper.error(`EDGAR returned ${response.status}`);
            return [];
        }
        const json = await response.json();
        const hits = json?.hits?.hits || [];
        return hits.slice(0, 10).map((hit: any) => {
            const src = hit._source || {};
            let fullText = hit.highlight?.['full_text.exact']?.[0] || hit.highlight?.['full_text']?.[0] || '';
            fullText = fullText.replace(/<em>/g, '').replace(/<\/em>/g, '');
            const content = `${src.form_type || ''}: ${src.display_names?.join(', ') || ''} - ${src.period_of_report || ''} - ${src.entity_name || ''}\n${fullText}`;
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
        logWrapper.error('SEC EDGAR scrape failed:', err);
        return [];
    }
}
