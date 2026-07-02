# Phaeton Capital — Full Product Roadmap

> Version: 1.0 | Date: 2026-03-31 | Status: Planning

---

## Overview

Phaeton Capital is a real-time sentiment analysis and quantitative trading intelligence platform. This roadmap covers all planned features across three tiers plus quick wins, organised into discrete epics with full task breakdowns.

---

## EPIC 1 — Backtesting Visualisation

**Goal:** Surface the existing `/backtest` Python endpoint in the UI to show users "if you followed this signal N months ago, what would your return be?" This is the fastest way to build credibility in the recommendation engine.

**Priority:** Critical
**Estimated Effort:** Large

### Tasks

#### 1.1 — Backend: Extend Backtest Endpoint
- Review current `/backtest/{ticker}` FastAPI endpoint in `apps/python_worker/main.py`
- Extend response to include:
  - Entry/exit dates for each signal
  - Signal direction (Buy / Sell / Hold) at each point in time
  - Actual price at signal time
  - Return % if position held to next signal or fixed horizon (15d / 30d / 90d)
  - Cumulative portfolio return curve (normalised to 100)
  - Benchmark comparison (SPY or QQQ cumulative return over same period)
  - Win rate (% of signals that were profitable)
  - Average gain vs average loss
  - Maximum drawdown during backtest window
  - Sharpe ratio of the signal strategy
- Add query params: `?horizon=30&start=2024-01-01&end=2025-01-01`
- Ensure yfinance data is fetched for the full historical window requested

#### 1.2 — Backend: Bun Worker Proxy
- Add `GET /backtest/:ticker` route in `apps/worker/src/index.ts`
- Proxy to Python worker `/backtest/{ticker}` with timeout of 30s
- Cache result in Redis for 1 hour (key: `backtest:{ticker}:{horizon}:{start}:{end}`)
- Return structured JSON with all backtest metrics

#### 1.3 — Frontend: API Route
- Create `apps/web/app/api/backtest/[ticker]/route.ts`
- Proxy to worker `/backtest/:ticker` passing query params through
- Handle errors and timeouts gracefully

#### 1.4 — Frontend: Backtesting Chart Component
- Create `apps/web/components/BacktestChart.tsx`
- Use Recharts `ComposedChart` with:
  - Line: cumulative strategy return (%)
  - Line: benchmark return (%)
  - Scatter or Reference Lines: signal markers (green triangle = buy, red triangle = sell)
  - Area: drawdown shading below 0
- Tooltip showing: signal type, price at signal, return achieved, hold period
- Date range selector: 3M / 6M / 1Y / 2Y
- Horizon selector: 15d / 30d / 90d (matches recommendation horizons)
- Summary stats bar above chart: Win Rate, Avg Return, Max Drawdown, Sharpe

#### 1.5 — Frontend: Dashboard Integration
- Add "Signal Backtest" tab to `DashboardClient.tsx` alongside existing tabs
- Lazy-load backtest data only when tab is active (avoid blocking initial load)
- Show skeleton loader while data fetches
- Add disclaimer: "Past performance does not guarantee future results"

#### 1.6 — Testing
- Unit test backtest calculation logic in Python
- Integration test API chain: web → worker → python worker
- Visual test: verify chart renders correctly with mock data

---

## EPIC 2 — Alert System

**Goal:** Push and email notifications when composite score crosses user-defined thresholds, regime changes, or unusual sentiment spikes are detected. Brings users back to the app passively.

**Priority:** Critical
**Estimated Effort:** Large

### Tasks

#### 2.1 — Database: Alert Schema
- Add to Prisma schema (`packages/db/prisma/schema.prisma`):
  ```
  model Alert {
    id          String    @id @default(cuid())
    userId      String
    ticker      String
    type        AlertType  // SCORE_THRESHOLD | REGIME_CHANGE | SENTIMENT_SPIKE | SCORE_CROSS
    threshold   Float?
    direction   String?    // ABOVE | BELOW
    horizon     String?    // 15d | 30d | 90d
    channel     String     // EMAIL | PUSH | BOTH
    active      Boolean   @default(true)
    lastFired   DateTime?
    cooldownMin Int       @default(60)  // minimum minutes between repeated fires
    createdAt   DateTime  @default(now())
    user        User      @relation(fields: [userId], references: [id])
  }

  model AlertFired {
    id        String   @id @default(cuid())
    alertId   String
    firedAt   DateTime @default(now())
    payload   Json
    alert     Alert    @relation(fields: [alertId], references: [id])
  }

  enum AlertType {
    SCORE_THRESHOLD
    REGIME_CHANGE
    SENTIMENT_SPIKE
    SCORE_CROSS
    EARNINGS_APPROACHING
  }
  ```
- Run `bunx prisma migrate dev --name add_alerts`

#### 2.2 — Alert Evaluation Engine
- Create `apps/worker/src/alerts/evaluator.ts`
- After each ticker analysis cycle completes (end of existing pipeline), call `evaluateAlerts(ticker, newData)`
- Evaluation logic per alert type:
  - `SCORE_THRESHOLD`: composite score for given horizon crosses threshold in given direction
  - `REGIME_CHANGE`: HMM regime output changed since last run (e.g., Neutral → Bear)
  - `SENTIMENT_SPIKE`: sentiment delta in last 6h exceeds 2 standard deviations of 30-day mean
  - `SCORE_CROSS`: composite score crosses 50 (neutral) boundary
  - `EARNINGS_APPROACHING`: earnings date within 5 days
- Respect cooldown: do not re-fire the same alert within `cooldownMin` minutes
- Log all fired alerts to `AlertFired` table

#### 2.3 — Email Notifications
- Install `nodemailer` (or use Resend API for better deliverability)
- Create `apps/worker/src/alerts/emailSender.ts`
- HTML email template per alert type with:
  - Ticker name and current composite score
  - What triggered the alert
  - Current recommendation (Buy/Hold/Sell) for the selected horizon
  - Relevant chart thumbnail (use a sparkline URL or static image)
  - Link back to the dashboard for that ticker
  - One-click unsubscribe link
- Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or `RESEND_API_KEY`) to `.env`

#### 2.4 — Web Push Notifications
- Add service worker to Next.js app: `apps/web/public/sw.js`
- Use `web-push` library in Bun worker to send push payloads
- Store `PushSubscription` object in a new `PushSubscription` DB table linked to userId
- Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to `.env`
- Frontend: request push permission on first alert creation, save subscription to backend

#### 2.5 — Alert Management API
- Create REST endpoints in worker:
  - `POST /alerts` — create alert
  - `GET /alerts?userId=` — list user's alerts
  - `PATCH /alerts/:id` — update (toggle active, change threshold)
  - `DELETE /alerts/:id` — delete alert
- Create corresponding Next.js API routes proxying to worker

#### 2.6 — Frontend: Alert Management UI
- Create `apps/web/components/AlertManager.tsx`
- Alert creation form:
  - Ticker input (reuse search autocomplete)
  - Alert type selector (dropdown)
  - Threshold input (shown/hidden based on type)
  - Direction selector (Above / Below)
  - Horizon selector (15d / 30d / 90d)
  - Channel selector (Email / Push / Both)
  - Cooldown selector (15m / 1h / 4h / 24h)
- Alert list: show all active alerts, toggle on/off, delete
- Alert history: last 10 fired alerts with timestamps
- Add "Alerts" section to dashboard header/nav

#### 2.7 — Testing
- Unit test evaluator logic for each alert type
- Integration test: trigger analysis, confirm correct alert fires and is logged
- End-to-end test email delivery with Mailtrap or similar sandbox

---

## EPIC 3 — Watchlist & Multi-Ticker Screener

**Goal:** Let users track multiple tickers and view them in a ranked grid sorted by composite score, momentum, or sentiment delta — a Bloomberg-style screener.

**Priority:** Critical
**Estimated Effort:** Large

### Tasks

#### 3.1 — Database: Watchlist Schema
- Add to Prisma schema:
  ```
  model Watchlist {
    id        String          @id @default(cuid())
    userId    String          @unique
    tickers   WatchlistItem[]
    user      User            @relation(fields: [userId], references: [id])
  }

  model WatchlistItem {
    id          String    @id @default(cuid())
    watchlistId String
    ticker      String
    addedAt     DateTime  @default(now())
    notes       String?
    watchlist   Watchlist @relation(fields: [watchlistId], references: [id])
    @@unique([watchlistId, ticker])
  }
  ```
- Run migration

#### 3.2 — Screener Data Aggregation Endpoint
- Create `GET /screener?tickers=AAPL,TSLA,NVDA&sortBy=composite30d&order=desc` in worker
- For each ticker, fetch latest data from DB:
  - Composite scores (15d / 30d / 90d)
  - Sentiment score + 24h delta
  - Regime (Bear / Neutral / Bull)
  - Technical signal (RSI, trend direction)
  - Last price + 1d change %
  - Risk rating (1-5)
  - Recommendation direction per horizon
- Return as sorted array
- Cache in Redis for 5 minutes (key: `screener:{sorted_tickers}`)

#### 3.3 — Watchlist API
- `POST /watchlist/add` — add ticker to user's watchlist (trigger background scan if ticker has no recent data)
- `DELETE /watchlist/remove` — remove ticker
- `GET /watchlist` — return watchlist items with latest screener data
- Validate ticker exists via the existing search API before adding

#### 3.4 — Frontend: Screener Grid Component
- Create `apps/web/components/ScreenerGrid.tsx`
- Columns (sortable):
  - Ticker / Company Name
  - Price + 1d Change %
  - Sentiment Score + 24h delta (colour-coded)
  - Composite Score 15d / 30d / 90d (sparkline bar)
  - Regime badge (Bear 🔴 / Neutral 🟡 / Bull 🟢)
  - Recommendation (Strong Buy → Strong Sell badge)
  - Risk Rating (1-5 stars)
  - Last Updated timestamp
- Row click → navigate to full dashboard for that ticker
- Mobile: horizontal scroll with pinned ticker column
- Sorting: click column header to sort asc/desc
- Refresh button: re-fetch all data

#### 3.5 — Frontend: Watchlist Management
- Add/remove ticker from watchlist via star icon in screener grid and in full ticker dashboard
- Empty state: prompt user to add their first ticker with search
- Max 20 tickers per watchlist (enforce in API and show warning in UI)
- Persist selected ticker order preference in localStorage

#### 3.6 — Auto-Scan for Watchlist Tickers
- Extend the BullMQ recurring job scheduler to also enqueue scans for all watchlist tickers
- Prioritise tickers that have active alerts
- Stagger scans to avoid hitting API rate limits simultaneously

#### 3.7 — Testing
- Integration test: add ticker, verify screener returns correct sorted data
- Load test: 20 tickers in watchlist, verify screener response under 2s

---

## EPIC 4 — Portfolio-Level Analysis

**Goal:** Allow users to input a portfolio of holdings and get unified risk/sentiment analysis including correlation matrix, portfolio-level VaR, diversification score, and rebalancing signals.

**Priority:** High
**Estimated Effort:** X-Large

### Tasks

#### 4.1 — Database: Portfolio Schema
- Add to Prisma schema:
  ```
  model Portfolio {
    id        String          @id @default(cuid())
    userId    String
    name      String
    holdings  Holding[]
    createdAt DateTime        @default(now())
    updatedAt DateTime        @updatedAt
    user      User            @relation(fields: [userId], references: [id])
  }

  model Holding {
    id          String    @id @default(cuid())
    portfolioId String
    ticker      String
    shares      Float
    avgCost     Float?
    portfolio   Portfolio @relation(fields: [portfolioId], references: [id])
    @@unique([portfolioId, ticker])
  }
  ```

#### 4.2 — Python Worker: Portfolio Analytics Endpoint
- Create `POST /portfolio/analyze` in FastAPI
- Input: list of `{ticker, shares, avgCost}` objects
- Computations:
  - Fetch historical prices for all tickers (1Y) via yfinance
  - Calculate portfolio weights by current market value
  - Correlation matrix (pairwise Pearson on daily returns)
  - Portfolio daily returns (weighted sum)
  - Portfolio VaR (95% and 99%, parametric and historical)
  - Portfolio CVaR
  - Portfolio Sharpe, Sortino, Max Drawdown
  - Diversification ratio (portfolio vol vs weighted avg individual vols)
  - Concentration risk: Herfindahl-Hirschman Index on weights
  - Sector/geography exposure breakdown
  - Aggregate sentiment exposure (weighted avg composite scores from DB)
  - Rebalancing suggestion: if any ticker weight deviates >5% from equal-weight, flag it
  - Efficient frontier sample (5 portfolios: current, min-vol, max-sharpe, equal-weight, sentiment-weighted)
- Return all above as JSON

#### 4.3 — Bun Worker: Portfolio Proxy Route
- `POST /portfolio/analyze` → proxy to Python worker
- Cache result in Redis for 15 minutes
- Also serve `GET/POST/PATCH/DELETE /portfolios` CRUD routes backed by DB

#### 4.4 — Frontend: Portfolio Input UI
- Create `apps/web/components/PortfolioBuilder.tsx`
- Add holdings form: ticker search + shares + avg cost (optional)
- Import from CSV option (parse ticker, shares columns)
- Show current portfolio value and 1d P&L after holdings entered
- "Analyze" button triggers full portfolio analytics fetch

#### 4.5 — Frontend: Portfolio Dashboard
- Create `apps/web/app/portfolio/page.tsx` (new page route)
- Sections:
  - **Holdings Table**: ticker, shares, market value, weight %, 1d change, composite score badge, risk rating
  - **Correlation Heatmap**: Recharts `ScatterChart` or custom SVG heatmap, colour scale from green (uncorrelated) to red (high correlation)
  - **Risk Metrics Panel**: VaR, CVaR, Sharpe, Max Drawdown, Diversification Ratio, HHI concentration score
  - **Sector Exposure**: Recharts `PieChart` showing sector weights
  - **Efficient Frontier**: scatter plot of 5 portfolio scenarios (risk on X, return on Y)
  - **Rebalancing Suggestions**: table of tickers to buy/sell and target weights
  - **Sentiment Heatmap**: grid of tickers with colour = composite score, size = weight

#### 4.6 — Testing
- Unit test portfolio calculations (correlation, VaR, Sharpe) against known values
- Integration test full pipeline with 5 real tickers

---

## EPIC 5 — Contrarian Signal Detection

**Goal:** When sentiment is in the extreme top/bottom 5% of its historical distribution AND technicals diverge, flag it explicitly as a potential reversal setup.

**Priority:** High
**Estimated Effort:** Medium

### Tasks

#### 5.1 — Historical Percentile Calculation
- In Python worker, add function `compute_sentiment_percentile(ticker, current_score)`
- Fetch last 90 days of sentiment scores from DB for that ticker
- Use `scipy.stats.percentileofscore` to compute where current score falls
- Return percentile (0-100)

#### 5.2 — Divergence Detection
- Add `compute_contrarian_signal(sentiment_percentile, technical_data)` function
- Logic:
  - Sentiment extreme: percentile < 5 (extreme bearish) or > 95 (extreme bullish)
  - Technical divergence: RSI overbought (>70) while sentiment extremely bearish, or RSI oversold (<30) while sentiment extremely bullish
  - MACD divergence: MACD line crossing signal in opposite direction to sentiment trend
  - Price vs sentiment: price up 10%+ in 5 days while sentiment declining (or vice versa)
- Output: `{ isContrarian: bool, type: 'REVERSAL_LONG' | 'REVERSAL_SHORT' | null, confidence: 0-1, reasons: string[] }`

#### 5.3 — Integration Into Scoring Pipeline
- Call contrarian detection after quant model computation in worker pipeline
- Store result in `QuantMetrics` table (add `contrarian_signal Json?` column)
- If contrarian signal detected, boost recommendation confidence modifier by 10%

#### 5.4 — Frontend: Contrarian Signal Badge
- In ticker dashboard, show a "Contrarian Setup" badge with amber/warning styling when detected
- Tooltip explaining: "Sentiment is in the extreme [bullish/bearish] percentile while technicals suggest the opposite — potential reversal setup"
- Show the specific reasons list from the backend
- In screener grid, add "Contrarian" column with badge for rows where signal is active

---

## EPIC 6 — Sentiment Velocity & Acceleration

**Goal:** Surface rate-of-change and acceleration of sentiment so early movers can catch inflection points before they show in the composite score.

**Priority:** High
**Estimated Effort:** Medium

### Tasks

#### 6.1 — Velocity Computation
- In worker pipeline, after saving new sentiment records, compute:
  - `sentiment_velocity_1h`: avg sentiment (now - 1h) minus avg sentiment (1h - 2h)
  - `sentiment_velocity_6h`: avg sentiment (now - 6h) minus avg sentiment (6h - 12h)
  - `sentiment_velocity_24h`: avg sentiment (now - 24h) minus avg sentiment (24h - 48h)
- Store in a new `SentimentVelocity` table:
  ```
  model SentimentVelocity {
    id          String   @id @default(cuid())
    ticker      String
    computedAt  DateTime @default(now())
    velocity1h  Float
    velocity6h  Float
    velocity24h Float
    accel6h     Float    // velocity6h - previous_velocity6h
    accel24h    Float    // velocity24h - previous_velocity24h
    @@index([ticker, computedAt])
  }
  ```

#### 6.2 — Acceleration Computation
- After computing velocity, compute acceleration:
  - `accel6h`: current `velocity6h` minus previous (6h ago) `velocity6h`
  - `accel24h`: current `velocity24h` minus previous (24h ago) `velocity24h`
- Positive acceleration = sentiment improving at an increasing rate (early bullish signal)
- Negative acceleration from peak = potential top (early bearish signal)

#### 6.3 — Frontend: Velocity Panel
- Add "Sentiment Momentum" panel to ticker dashboard
- Three gauges or spark arrows:
  - 1h velocity (arrow up/down, magnitude = colour intensity)
  - 6h velocity
  - 24h velocity
- Acceleration indicator: "Accelerating ↑" / "Decelerating ↓" / "Stable →"
- Mini sparkline of velocity over last 48h
- Tooltip: "Sentiment changed by X points in the last Yh"

#### 6.4 — Alert Integration
- Add `VELOCITY_SPIKE` alert type: fires when `|velocity_6h|` exceeds threshold (e.g., 0.3 change in 6h)
- Add to screener grid as a sortable column

---

## EPIC 7 — Earnings Playbook Mode

**Goal:** Detect upcoming earnings dates and switch to a specialised pre-earnings analysis mode with IV crush risk, historical post-earnings drift, EPS revisions, and recommended options strategies.

**Priority:** High
**Estimated Effort:** Large

### Tasks

#### 7.1 — Earnings Detection
- Python worker already fetches earnings dates via yfinance
- Add logic to flag tickers with earnings within 1 / 3 / 5 / 10 days
- Store in `FundamentalData.earningsDate` (already exists, verify it's populated)
- Add Bun worker periodic check: every 4h, scan all watchlist tickers for upcoming earnings, create `EARNINGS_APPROACHING` alerts automatically if user has them enabled

#### 7.2 — Historical Earnings Drift Analysis
- Add `GET /earnings-history/{ticker}` to Python worker
- Using yfinance, fetch last 8 earnings dates
- For each date, compute:
  - EPS actual vs estimate (beat/miss magnitude)
  - Price change on day of earnings (open → close)
  - Price change over next 5 days, 10 days, 30 days
  - Was the move correlated to sentiment going into earnings?
- Return summary stats: median drift, % times beat caused rally, % times miss caused selloff, average IV crush day-after

#### 7.3 — Options Strategy Recommender
- Add `compute_earnings_strategy(ticker, optionsData, ivPercentile, direction)` to Python worker
- Logic:
  - If IV percentile > 80%: suggest short volatility (short straddle, iron condor)
  - If IV percentile < 30%: suggest long volatility (straddle, strangle)
  - If composite score strongly directional + low IV: suggest directional spread (bull call spread or bear put spread)
  - If composite score neutral: suggest neutral strategies (butterfly, iron condor)
- Output: strategy name, max profit, max loss, breakeven prices, days to expiry recommendation

#### 7.4 — Frontend: Earnings Mode Banner
- When ticker has earnings within 10 days, show a yellow "Earnings in X days" banner at top of dashboard
- Auto-expand "Earnings Playbook" section:
  - Earnings date countdown
  - Consensus EPS estimate vs last actual
  - Historical drift chart (bar chart: price change after each of last 8 earnings)
  - IV percentile gauge
  - Recommended options strategy card with max profit/loss diagram
  - Historical: "When sentiment was [bullish/bearish] going into earnings, stock moved [X]% on average"

---

## EPIC 8 — Cross-Asset Contagion Detection

**Goal:** Detect when correlated assets (sector ETFs, peers) are diverging significantly from the target ticker — flag as mean-reversion opportunity or fundamental divergence.

**Priority:** Medium
**Estimated Effort:** Medium

### Tasks

#### 8.1 — Peer Group Mapping
- Create a static mapping file `apps/worker/src/data/peerGroups.ts`
- Map each ticker to: sector ETF, top 5 peers
- Example: `AAPL → { sectorEtf: 'XLK', peers: ['MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA'] }`
- Source from a curated list of S&P 500 tickers initially (can be extended)

#### 8.2 — Contagion/Divergence Calculation
- Add `compute_cross_asset_divergence(ticker, peers, sectorEtf)` in Python worker
- Fetch 30d returns for ticker, all peers, and sector ETF
- Compute:
  - Z-score of ticker's return relative to peer group (how many std devs away from peer median)
  - Correlation of ticker vs sector ETF (30d rolling)
  - Recent decorrelation: has correlation dropped significantly in last 5d?
- Flag if: z-score > 2 (ticker outperforming peers by 2 std devs) or < -2 (underperforming)
- Classify: `OUTPERFORMING_PEERS` / `UNDERPERFORMING_PEERS` / `IN_LINE`
- Add contagion risk: if sector ETF drops 3%+ while ticker is flat, flag as potential delayed contagion

#### 8.3 — Integration
- Call divergence check in worker pipeline after fundamental data fetch
- Store in `QuantMetrics.crossAssetSignal Json?`

#### 8.4 — Frontend: Peer Comparison Panel
- Add "Peer Comparison" tab in ticker dashboard
- Table: ticker + 4 peers + sector ETF with columns: 1d / 5d / 30d return, composite score, regime
- Highlight ticker row for easy visual comparison
- Divergence badge: "Outperforming peers by 2.3σ" or "Lagging sector ETF by 1.8σ"
- Contagion warning banner: "Sector ETF dropped 3.2% today while this ticker is flat — potential delayed contagion risk"

---

## EPIC 9 — User Accounts

**Goal:** Allow users to register, log in, save analyses, annotate with notes, and review history of past recommendations vs actual outcomes.

**Priority:** High
**Estimated Effort:** X-Large

### Tasks

#### 9.1 — Authentication
- Install NextAuth.js v5 (Auth.js) in the Next.js web app
- Providers: Email (magic link) + Google OAuth
- Add `User`, `Session`, `Account` tables to Prisma (NextAuth adapter)
- Configure `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env`
- Wrap app in `SessionProvider`

#### 9.2 — User Profile
- Add `User` model fields: `displayName`, `emailNotifications`, `pushNotifications`, `timezone`
- `GET/PATCH /api/user/profile` routes
- Settings page: `apps/web/app/settings/page.tsx`
  - Notification preferences
  - Default horizon preference (15d / 30d / 90d)
  - Theme preference

#### 9.3 — Saved Analyses
- Add `SavedAnalysis` model:
  ```
  model SavedAnalysis {
    id          String   @id @default(cuid())
    userId      String
    ticker      String
    savedAt     DateTime @default(now())
    snapshotData Json    // full recommendation + scores at time of save
    notes       String?
    user        User     @relation(fields: [userId], references: [id])
  }
  ```
- "Save Analysis" button in ticker dashboard — saves current data snapshot + optional note
- Saved analyses page: `apps/web/app/saved/page.tsx`
  - List of saved analyses sorted by date
  - For each: ticker, date saved, score at save time, current score, actual price change since save
  - "View" button: loads the snapshot and compares to current data side-by-side
  - "Add Note" inline textarea

#### 9.4 — Outcome Tracking
- Cron job (daily at market close): for each saved analysis, record:
  - Current price vs price at save time
  - Return %
  - Was the recommendation correct? (e.g., saved as "Buy 30d" — is price higher 30d later?)
- Accuracy dashboard: show user's historical recommendation accuracy

#### 9.5 — Auth Guards
- Watchlist, Alerts, Portfolio, Saved Analyses all require auth
- Unauthenticated users can still view the main dashboard for any ticker
- Show "Sign in to save" prompts at appropriate points

---

## EPIC 10 — API Access Tier

**Goal:** Expose the scoring/recommendation engine via a paid API so developers can integrate signals into their own systems.

**Priority:** Medium
**Estimated Effort:** Large

### Tasks

#### 10.1 — API Key Management
- Add `ApiKey` model to Prisma:
  ```
  model ApiKey {
    id          String    @id @default(cuid())
    userId      String
    keyHash     String    @unique  // SHA-256 of the actual key
    keyPreview  String              // first 8 chars for display
    name        String
    tier        ApiTier   // FREE | PRO | ENTERPRISE
    rateLimit   Int       @default(100)  // requests per day
    usageCount  Int       @default(0)
    lastUsed    DateTime?
    active      Boolean   @default(true)
    createdAt   DateTime  @default(now())
    user        User      @relation(fields: [userId], references: [id])
  }

  enum ApiTier {
    FREE
    PRO
    ENTERPRISE
  }
  ```
- API key generation: use `crypto.randomBytes(32).toString('hex')`, store only SHA-256 hash
- Display key to user once on creation — not retrievable after

#### 10.2 — API Authentication Middleware
- Create `apps/worker/src/middleware/apiAuth.ts`
- Validate `Authorization: Bearer <key>` header on protected routes
- Hash incoming key, look up in DB, verify active + not rate-limited
- Increment `usageCount` on each request
- Return 401 if invalid, 429 if rate limit exceeded

#### 10.3 — Public API Endpoints
Expose under `/v1/` prefix:
- `GET /v1/ticker/{ticker}/score` — composite scores for all horizons
- `GET /v1/ticker/{ticker}/sentiment` — latest sentiment data
- `GET /v1/ticker/{ticker}/recommendation` — full recommendation with AI narrative
- `GET /v1/ticker/{ticker}/technicals` — technical indicators
- `GET /v1/ticker/{ticker}/backtest` — backtest results
- `POST /v1/screener` — body `{ tickers: [], sortBy: '' }` — screener results for multiple tickers
- `GET /v1/macro` — current macro indicators

#### 10.4 — Rate Limiting
- Free tier: 100 requests/day, 10 tickers max
- Pro tier: 10,000 requests/day, unlimited tickers, webhook callbacks
- Enterprise: unlimited, dedicated endpoints, SLA
- Implement via Redis counter: `rate:{keyId}:{date}` with 24h TTL

#### 10.5 — API Documentation Page
- Create `apps/web/app/api-docs/page.tsx`
- Interactive API explorer (similar to Swagger UI but custom-built)
- Code examples in Python, JavaScript, curl
- Authentication guide
- Rate limit documentation

#### 10.6 — API Key Management UI
- Settings page section: "API Access"
- Create / revoke / rename keys
- Usage stats: requests today / this month, chart of usage over time
- Tier upgrade prompt with pricing

---

## EPIC 11 — Social Consensus Layer

**Goal:** Show anonymised aggregated user sentiment based on watchlist and portfolio actions — creating a proprietary crowd signal on top of public sources.

**Priority:** Medium
**Estimated Effort:** Medium

### Tasks

#### 11.1 — Signal Collection
- Track user actions as implicit sentiment signals:
  - Adding ticker to watchlist = mild bullish (+0.1)
  - Removing ticker from watchlist = mild bearish (-0.1)
  - Saving a "Buy" analysis = bullish (+0.3)
  - Saving a "Sell" analysis = bearish (-0.3)
  - Portfolio holding with positive weight = bullish
- Add `CrowdSignal` table:
  ```
  model CrowdSignal {
    id         String   @id @default(cuid())
    ticker     String
    signalType String
    value      Float
    recordedAt DateTime @default(now())
    @@index([ticker, recordedAt])
  }
  ```
- Never link `CrowdSignal` to a specific user — privacy by design

#### 11.2 — Crowd Sentiment Aggregation
- Compute crowd metrics per ticker (every 30 min via cron):
  - % of active users with this ticker in watchlist
  - Bullish vs bearish ratio from saved analyses (last 7d)
  - Portfolio exposure: average allocation % among users who hold it
  - Crowd momentum: are users adding or removing it more in last 24h?
- Store in `CrowdMetrics` table

#### 11.3 — Frontend: Crowd Consensus Panel
- Add "Community" panel to ticker dashboard:
  - "X% of tracked portfolios hold this ticker"
  - Bull/Bear ratio bar (e.g., 67% bullish | 33% bearish)
  - "Trending: +23 adds in last 24h" or "Fading: -15 removals in last 24h"
  - Disclosure: "Based on anonymised user activity — not financial advice"
- Show crowd consensus as an optional factor in composite score (opt-in for API users)

---

## EPIC 12 — Scheduled Reports

**Goal:** Weekly "Top 5 signals" reports delivered via email or Slack. Low effort, high retention.

**Priority:** Medium
**Estimated Effort:** Small

### Tasks

#### 12.1 — Report Generation
- Create `apps/worker/src/reports/weeklyReport.ts`
- Every Sunday at 6pm UTC, run report generation for each user with watchlist tickers
- For each user:
  - Rank their watchlist tickers by composite score change (week-over-week)
  - Top 3 movers up, top 2 movers down
  - Any regime changes in their watchlist
  - Any earnings this coming week
  - Any contrarian signals active
  - Macro summary (VIX, SPY, regime)

#### 12.2 — Email Report Template
- Rich HTML email with:
  - Header: "Your Phaeton Capital Weekly — [date]"
  - Section: Top Opportunities (green cards)
  - Section: Watch Out (red cards)
  - Section: Earnings This Week (calendar view)
  - Section: Macro Snapshot (3 key indicators)
  - CTA button: "View Full Dashboard"
  - Footer: unsubscribe link

#### 12.3 — Slack Integration
- Create `SlackWebhook` table: `{ userId, webhookUrl, active }`
- User can add a Slack webhook URL in Settings
- Weekly report also POSTs a formatted Slack Block Kit message to webhook
- Block Kit layout: header, 3 signal cards, macro summary, button link

#### 12.4 — Report Preferences UI
- Settings section: "Reports & Digests"
- Toggle: Weekly Email Report (on/off)
- Toggle: Slack Digest (on/off + webhook URL input)
- Day/time preference for report delivery
- Content preferences: only earnings, only strong signals, all signals

#### 12.5 — BullMQ Cron Job
- Add `reports:weekly` cron job to BullMQ scheduler
- Cron: `0 18 * * 0` (Sunday 6pm UTC)
- Process: fetch all users with email reports enabled, generate and send each

---

## EPIC 13 — PWA & Mobile Enhancements

**Goal:** Make the app installable on mobile and add offline capability.

**Priority:** Medium
**Estimated Effort:** Small

### Tasks

#### 13.1 — PWA Setup
- Create `apps/web/public/manifest.json`:
  - `name`: "Phaeton Capital"
  - `short_name`: "Phaeton"
  - `theme_color`: (match current brand colour)
  - `icons`: 192x192 and 512x512 PNG icons
  - `display`: "standalone"
  - `start_url`: "/"
- Add `<link rel="manifest">` to root layout
- Generate and add app icons

#### 13.2 — Service Worker
- Create `apps/web/public/sw.js`
- Cache strategy: network-first for API calls, cache-first for static assets
- Offline page: show last cached dashboard data with "offline" banner
- Handle push notification events (for EPIC 2)

#### 13.3 — Install Prompt
- Add "Install App" button that appears when `beforeinstallprompt` event fires
- Show in mobile header or as a banner on first visit (after 2 page views)

#### 13.4 — Mobile UX Improvements
- Ensure all new components (screener grid, portfolio, alerts) are mobile-responsive
- Screener grid: horizontal scroll with sticky ticker column on mobile
- Portfolio page: stacked card layout on mobile instead of wide table
- Correlation heatmap: simplified on mobile (top 5 correlations as list)

---

## EPIC 14 — Shareable URLs & Social Sharing

**Goal:** Allow users to share ticker analyses via URL. Drive organic acquisition.

**Priority:** Low
**Estimated Effort:** Small

### Tasks

#### 14.1 — Ticker URL Routing
- Ensure `/?ticker=AAPL` (already partially supported) renders the full dashboard for that ticker
- Make all tab state URL-driven: `/?ticker=AAPL&tab=backtest&horizon=30d`
- Copy-to-clipboard share button in dashboard header

#### 14.2 — OG Image Generation
- Create `apps/web/app/api/og/route.tsx` using `@vercel/og`
- Dynamic OG image showing: ticker, composite score, recommendation, current price, mini chart
- Referenced in `<meta property="og:image">` in page metadata
- So when shared on Twitter/Slack/iMessage, the preview shows the live signal

#### 14.3 — Share Modal
- "Share" button in ticker dashboard
- Options: Copy Link, Share to Twitter (pre-filled tweet with signal summary), Copy Embed Code
- Embed code: `<iframe>` snippet showing a minimal read-only version of the score widget

---

## EPIC 15 — Dark/Light Mode

**Goal:** System-aware theme toggle using Tailwind.

**Priority:** Low
**Estimated Effort:** Small

### Tasks

#### 15.1 — Tailwind Dark Mode Config
- Set `darkMode: 'class'` in `tailwind.config.js`
- Add dark mode variants to all components (`dark:bg-gray-900`, `dark:text-white`, etc.)
- Start with the core layout and gradually propagate to all components

#### 15.2 — Theme Toggle Component
- Create `apps/web/components/ThemeToggle.tsx`
- Uses `localStorage` to persist preference
- Respects `prefers-color-scheme` system setting on first visit
- Sun/Moon icon toggle button, placed in nav header

#### 15.3 — Chart Theme Adaptation
- Recharts charts need explicit colour props for dark mode
- Create a `useChartTheme()` hook returning appropriate colours based on current theme
- Apply to all existing and new charts

---

## EPIC 16 — Confidence Interval Bands on Charts

**Goal:** Visualise uncertainty in sentiment and price predictions.

**Priority:** Low
**Estimated Effort:** Small

### Tasks

#### 16.1 — Confidence Interval Calculation
- Python worker Monte Carlo output already contains distribution data
- Extract 10th/90th percentile of price simulations per future date point
- Return as `{ date, priceP10, priceP50, priceP90 }` array

#### 16.2 — Chart Update
- In sentiment/price chart, add Recharts `Area` components for P10-P90 range
- Semi-transparent fill, same colour as main line but at 20% opacity
- Tooltip: "Expected range: $X – $Y (80% confidence)"

---

## Implementation Phases

### Phase 1 — Foundation (Weeks 1-4)
Deliver: User Accounts (EPIC 9) + Watchlist (EPIC 3) + Alerts (EPIC 2)

Rationale: User accounts unlock personalisation for everything else. Watchlist is the most-used daily feature. Alerts drive retention.

### Phase 2 — Intelligence (Weeks 5-8)
Deliver: Backtesting Visualisation (EPIC 1) + Contrarian Signals (EPIC 5) + Sentiment Velocity (EPIC 6)

Rationale: These make the recommendation engine more trustworthy and differentiated.

### Phase 3 — Breadth (Weeks 9-12)
Deliver: Portfolio Analysis (EPIC 4) + Earnings Playbook (EPIC 7) + Cross-Asset Contagion (EPIC 8)

Rationale: Power features for serious users; increase session depth.

### Phase 4 — Platform (Weeks 13-16)
Deliver: API Access (EPIC 10) + Scheduled Reports (EPIC 12) + Social Consensus (EPIC 11)

Rationale: Monetisation and acquisition channels.

### Phase 5 — Polish (Weeks 17-18)
Deliver: PWA (EPIC 13) + Shareable URLs (EPIC 14) + Dark Mode (EPIC 15) + Confidence Bands (EPIC 16)

Rationale: Quality-of-life improvements that raise the perceived quality of the product.

---

## Tech Debt & Infrastructure

- **Rate limit monitoring dashboard**: track Gemini, Reddit, Polygon API usage against limits
- **Prisma migrations CI**: add `bunx prisma migrate deploy` to Docker build
- **Error budget**: define SLOs (99.5% uptime, <2s P95 latency for screener)
- **Observability**: add OpenTelemetry tracing across Bun worker → Python worker hops
- **E2E test suite**: Playwright tests for critical user journeys (search → analyse → add to watchlist → create alert)
- **Staging environment**: mirror of production with seeded test data for safe QA

---

*Plan generated by Claude Code | Phaeton Capital | 2026-03-31*
