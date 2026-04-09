/**
 * Seeds the TrackedTicker table with a curated universe of liquid US stocks.
 * Run with: bun run packages/db/seed-universe.ts
 */
import prisma from './index';

// Curated universe: S&P 100 + popular high-volume names across sectors.
// Priority tiers: 2 = mega-cap / very liquid, 1 = standard, 0 = experimental.
const UNIVERSE: Array<{ ticker: string; name: string; sector: string; priority: number }> = [
    // Mega-cap tech (priority 2)
    { ticker: 'AAPL',  name: 'Apple',              sector: 'Technology',          priority: 2 },
    { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology',          priority: 2 },
    { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Communication',       priority: 2 },
    { ticker: 'AMZN',  name: 'Amazon',             sector: 'Consumer Cyclical',   priority: 2 },
    { ticker: 'NVDA',  name: 'Nvidia',             sector: 'Technology',          priority: 2 },
    { ticker: 'META',  name: 'Meta Platforms',     sector: 'Communication',       priority: 2 },
    { ticker: 'TSLA',  name: 'Tesla',              sector: 'Consumer Cyclical',   priority: 2 },
    { ticker: 'AVGO',  name: 'Broadcom',           sector: 'Technology',          priority: 2 },
    { ticker: 'AMD',   name: 'AMD',                sector: 'Technology',          priority: 2 },
    { ticker: 'NFLX',  name: 'Netflix',            sector: 'Communication',       priority: 2 },

    // Tech (priority 1)
    { ticker: 'CRM',   name: 'Salesforce',         sector: 'Technology',          priority: 1 },
    { ticker: 'ORCL',  name: 'Oracle',             sector: 'Technology',          priority: 1 },
    { ticker: 'ADBE',  name: 'Adobe',              sector: 'Technology',          priority: 1 },
    { ticker: 'CSCO',  name: 'Cisco',              sector: 'Technology',          priority: 1 },
    { ticker: 'INTC',  name: 'Intel',              sector: 'Technology',          priority: 1 },
    { ticker: 'IBM',   name: 'IBM',                sector: 'Technology',          priority: 1 },
    { ticker: 'QCOM',  name: 'Qualcomm',           sector: 'Technology',          priority: 1 },
    { ticker: 'TXN',   name: 'Texas Instruments',  sector: 'Technology',          priority: 1 },
    { ticker: 'INTU',  name: 'Intuit',             sector: 'Technology',          priority: 1 },
    { ticker: 'NOW',   name: 'ServiceNow',         sector: 'Technology',          priority: 1 },
    { ticker: 'PLTR',  name: 'Palantir',           sector: 'Technology',          priority: 1 },
    { ticker: 'MU',    name: 'Micron',             sector: 'Technology',          priority: 1 },
    { ticker: 'PANW',  name: 'Palo Alto Networks', sector: 'Technology',          priority: 1 },
    { ticker: 'SNOW',  name: 'Snowflake',          sector: 'Technology',          priority: 1 },
    { ticker: 'SHOP',  name: 'Shopify',            sector: 'Technology',          priority: 1 },

    // Financials (priority 1-2)
    { ticker: 'JPM',   name: 'JPMorgan Chase',     sector: 'Financial Services',  priority: 2 },
    { ticker: 'BAC',   name: 'Bank of America',    sector: 'Financial Services',  priority: 1 },
    { ticker: 'WFC',   name: 'Wells Fargo',        sector: 'Financial Services',  priority: 1 },
    { ticker: 'GS',    name: 'Goldman Sachs',      sector: 'Financial Services',  priority: 1 },
    { ticker: 'MS',    name: 'Morgan Stanley',     sector: 'Financial Services',  priority: 1 },
    { ticker: 'C',     name: 'Citigroup',          sector: 'Financial Services',  priority: 1 },
    { ticker: 'BRK-B', name: 'Berkshire Hathaway', sector: 'Financial Services',  priority: 2 },
    { ticker: 'V',     name: 'Visa',               sector: 'Financial Services',  priority: 2 },
    { ticker: 'MA',    name: 'Mastercard',         sector: 'Financial Services',  priority: 2 },
    { ticker: 'AXP',   name: 'American Express',   sector: 'Financial Services',  priority: 1 },
    { ticker: 'BLK',   name: 'BlackRock',          sector: 'Financial Services',  priority: 1 },
    { ticker: 'SCHW',  name: 'Charles Schwab',     sector: 'Financial Services',  priority: 1 },

    // Healthcare (priority 1-2)
    { ticker: 'UNH',   name: 'UnitedHealth',       sector: 'Healthcare',          priority: 2 },
    { ticker: 'JNJ',   name: 'Johnson & Johnson',  sector: 'Healthcare',          priority: 2 },
    { ticker: 'LLY',   name: 'Eli Lilly',          sector: 'Healthcare',          priority: 2 },
    { ticker: 'PFE',   name: 'Pfizer',             sector: 'Healthcare',          priority: 1 },
    { ticker: 'MRK',   name: 'Merck',              sector: 'Healthcare',          priority: 1 },
    { ticker: 'ABBV',  name: 'AbbVie',             sector: 'Healthcare',          priority: 1 },
    { ticker: 'TMO',   name: 'Thermo Fisher',      sector: 'Healthcare',          priority: 1 },
    { ticker: 'ABT',   name: 'Abbott Labs',        sector: 'Healthcare',          priority: 1 },
    { ticker: 'DHR',   name: 'Danaher',            sector: 'Healthcare',          priority: 1 },
    { ticker: 'BMY',   name: 'Bristol-Myers',      sector: 'Healthcare',          priority: 1 },
    { ticker: 'AMGN',  name: 'Amgen',              sector: 'Healthcare',          priority: 1 },
    { ticker: 'GILD',  name: 'Gilead Sciences',    sector: 'Healthcare',          priority: 1 },
    { ticker: 'CVS',   name: 'CVS Health',         sector: 'Healthcare',          priority: 1 },
    { ticker: 'NVO',   name: 'Novo Nordisk',       sector: 'Healthcare',          priority: 1 },

    // Consumer (priority 1-2)
    { ticker: 'WMT',   name: 'Walmart',            sector: 'Consumer Defensive',  priority: 2 },
    { ticker: 'COST',  name: 'Costco',             sector: 'Consumer Defensive',  priority: 2 },
    { ticker: 'PG',    name: 'Procter & Gamble',   sector: 'Consumer Defensive',  priority: 1 },
    { ticker: 'KO',    name: 'Coca-Cola',          sector: 'Consumer Defensive',  priority: 1 },
    { ticker: 'PEP',   name: 'PepsiCo',            sector: 'Consumer Defensive',  priority: 1 },
    { ticker: 'MCD',   name: "McDonald's",         sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'NKE',   name: 'Nike',               sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'SBUX',  name: 'Starbucks',          sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'HD',    name: 'Home Depot',         sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'LOW',   name: "Lowe's",             sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'TGT',   name: 'Target',             sector: 'Consumer Defensive',  priority: 1 },
    { ticker: 'DIS',   name: 'Disney',             sector: 'Communication',       priority: 1 },

    // Energy (priority 1)
    { ticker: 'XOM',   name: 'Exxon Mobil',        sector: 'Energy',              priority: 1 },
    { ticker: 'CVX',   name: 'Chevron',            sector: 'Energy',              priority: 1 },
    { ticker: 'COP',   name: 'ConocoPhillips',     sector: 'Energy',              priority: 1 },
    { ticker: 'SLB',   name: 'Schlumberger',       sector: 'Energy',              priority: 1 },
    { ticker: 'OXY',   name: 'Occidental',         sector: 'Energy',              priority: 1 },

    // Industrials (priority 1)
    { ticker: 'BA',    name: 'Boeing',             sector: 'Industrials',         priority: 1 },
    { ticker: 'CAT',   name: 'Caterpillar',        sector: 'Industrials',         priority: 1 },
    { ticker: 'GE',    name: 'GE Aerospace',       sector: 'Industrials',         priority: 1 },
    { ticker: 'HON',   name: 'Honeywell',          sector: 'Industrials',         priority: 1 },
    { ticker: 'UPS',   name: 'UPS',                sector: 'Industrials',         priority: 1 },
    { ticker: 'RTX',   name: 'RTX',                sector: 'Industrials',         priority: 1 },
    { ticker: 'LMT',   name: 'Lockheed Martin',    sector: 'Industrials',         priority: 1 },
    { ticker: 'DE',    name: 'Deere',              sector: 'Industrials',         priority: 1 },

    // Communications & Media (priority 1)
    { ticker: 'T',     name: 'AT&T',               sector: 'Communication',       priority: 1 },
    { ticker: 'VZ',    name: 'Verizon',            sector: 'Communication',       priority: 1 },
    { ticker: 'TMUS',  name: 'T-Mobile',           sector: 'Communication',       priority: 1 },
    { ticker: 'CMCSA', name: 'Comcast',            sector: 'Communication',       priority: 1 },

    // Real estate / utilities (priority 1)
    { ticker: 'AMT',   name: 'American Tower',     sector: 'Real Estate',         priority: 1 },
    { ticker: 'PLD',   name: 'Prologis',           sector: 'Real Estate',         priority: 1 },
    { ticker: 'NEE',   name: 'NextEra Energy',     sector: 'Utilities',           priority: 1 },
    { ticker: 'DUK',   name: 'Duke Energy',        sector: 'Utilities',           priority: 1 },

    // Materials (priority 1)
    { ticker: 'LIN',   name: 'Linde',              sector: 'Basic Materials',     priority: 1 },
    { ticker: 'FCX',   name: 'Freeport-McMoRan',   sector: 'Basic Materials',     priority: 1 },

    // High-volume retail / meme favorites (priority 1)
    { ticker: 'GME',   name: 'GameStop',           sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'AMC',   name: 'AMC Entertainment',  sector: 'Communication',       priority: 1 },
    { ticker: 'COIN',  name: 'Coinbase',           sector: 'Financial Services',  priority: 1 },
    { ticker: 'HOOD',  name: 'Robinhood',          sector: 'Financial Services',  priority: 1 },
    { ticker: 'RIVN',  name: 'Rivian',             sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'LCID',  name: 'Lucid Motors',       sector: 'Consumer Cyclical',   priority: 0 },
    { ticker: 'NIO',   name: 'NIO',                sector: 'Consumer Cyclical',   priority: 0 },
    { ticker: 'SOFI',  name: 'SoFi Technologies',  sector: 'Financial Services',  priority: 1 },
    { ticker: 'UBER',  name: 'Uber',               sector: 'Technology',          priority: 1 },
    { ticker: 'LYFT',  name: 'Lyft',               sector: 'Technology',          priority: 0 },
    { ticker: 'ABNB',  name: 'Airbnb',             sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'PYPL',  name: 'PayPal',             sector: 'Financial Services',  priority: 1 },
    { ticker: 'SQ',    name: 'Block',              sector: 'Technology',          priority: 1 },
    { ticker: 'F',     name: 'Ford',               sector: 'Consumer Cyclical',   priority: 1 },
    { ticker: 'GM',    name: 'General Motors',     sector: 'Consumer Cyclical',   priority: 1 },
];

async function seed() {
    console.log(`Seeding TrackedTicker with ${UNIVERSE.length} tickers...`);

    const before = await (prisma as any).trackedTicker.count();

    for (const t of UNIVERSE) {
        await (prisma as any).trackedTicker.upsert({
            where: { ticker: t.ticker },
            update: { name: t.name, sector: t.sector, priority: t.priority, active: true },
            create: { ticker: t.ticker, name: t.name, sector: t.sector, priority: t.priority },
        });
    }

    const after = await (prisma as any).trackedTicker.count();
    console.log(`Done. ${after - before} new, ${UNIVERSE.length - (after - before)} updated. Total in universe: ${after}`);
    await prisma.$disconnect();
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
