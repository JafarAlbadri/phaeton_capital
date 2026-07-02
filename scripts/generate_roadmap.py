from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, ListFlowable, ListItem
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUTPUT = "/Users/jafaralbadri/repos/phaeton_capital/PHAETON_ROADMAP_V2.pdf"

C_BG      = colors.HexColor("#0a0a0f")
C_SURFACE = colors.HexColor("#13131a")
C_GOLD    = colors.HexColor("#d4a017")
C_GOLD2   = colors.HexColor("#f0c040")
C_RED     = colors.HexColor("#e05252")
C_GREEN   = colors.HexColor("#4caf7d")
C_BLUE    = colors.HexColor("#6699ff")
C_PURPLE  = colors.HexColor("#a78bfa")
C_ORANGE  = colors.HexColor("#e07a30")
C_YELLOW  = colors.HexColor("#e0c040")
C_TEXT    = colors.HexColor("#e8e8f0")
C_MUTED   = colors.HexColor("#8888aa")
C_BORDER  = colors.HexColor("#2a2a3a")
C_ACCENT  = colors.HexColor("#1e1e2e")
C_SKIP    = colors.HexColor("#3a1a1a")

def S(name, **kw): return ParagraphStyle(name, **kw)

ST = {
    "cover_title": S("cover_title", fontSize=36, leading=44, textColor=C_GOLD,  fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6),
    "cover_sub":   S("cover_sub",   fontSize=13, leading=18, textColor=C_MUTED, fontName="Helvetica",      alignment=TA_CENTER, spaceAfter=4),
    "cover_meta":  S("cover_meta",  fontSize=10, leading=14, textColor=C_MUTED, fontName="Helvetica",      alignment=TA_CENTER),
    "h1":   S("h1",   fontSize=20, leading=26, textColor=C_GOLD,   fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=8),
    "h2":   S("h2",   fontSize=14, leading=20, textColor=C_GOLD2,  fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6),
    "h3":   S("h3",   fontSize=11, leading=16, textColor=C_TEXT,   fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4),
    "body": S("body", fontSize=9.5, leading=15, textColor=C_TEXT,  fontName="Helvetica",      spaceAfter=6, alignment=TA_JUSTIFY),
    "muted":S("muted",fontSize=8.5, leading=13, textColor=C_MUTED, fontName="Helvetica",      spaceAfter=4),
    "code": S("code", fontSize=8,   leading=12, textColor=C_GOLD2, fontName="Courier",        spaceAfter=4, backColor=C_SURFACE, borderPadding=(4,6,4,6)),
    "tag_p0":   S("tag_p0",   fontSize=8, leading=10, textColor=C_BG,    fontName="Helvetica-Bold", alignment=TA_CENTER),
    "tag_p1":   S("tag_p1",   fontSize=8, leading=10, textColor=C_BG,    fontName="Helvetica-Bold", alignment=TA_CENTER),
    "tag_p2":   S("tag_p2",   fontSize=8, leading=10, textColor=C_BG,    fontName="Helvetica-Bold", alignment=TA_CENTER),
    "tag_skip": S("tag_skip", fontSize=8, leading=10, textColor=C_MUTED, fontName="Helvetica-Bold", alignment=TA_CENTER),
    "tb":   S("tb",   fontSize=8.5, leading=12, textColor=C_TEXT,  fontName="Helvetica"),
    "tb_g": S("tb_g", fontSize=8.5, leading=12, textColor=C_GREEN, fontName="Helvetica-Bold"),
    "tb_r": S("tb_r", fontSize=8.5, leading=12, textColor=C_RED,   fontName="Helvetica-Bold"),
    "tb_y": S("tb_y", fontSize=8.5, leading=12, textColor=C_YELLOW,fontName="Helvetica-Bold"),
    "th":   S("th",   fontSize=8.5, leading=12, textColor=C_GOLD,  fontName="Helvetica-Bold"),
    "verdict_yes":  S("verdict_yes",  fontSize=9.5, leading=14, textColor=C_GREEN,  fontName="Helvetica-Bold", spaceAfter=4),
    "verdict_no":   S("verdict_no",   fontSize=9.5, leading=14, textColor=C_RED,    fontName="Helvetica-Bold", spaceAfter=4),
    "verdict_mod":  S("verdict_mod",  fontSize=9.5, leading=14, textColor=C_YELLOW, fontName="Helvetica-Bold", spaceAfter=4),
}

def p(t, s="body"): return Paragraph(t, ST[s])
def sp(h=6):        return Spacer(1, h)
def hr():           return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=8, spaceBefore=4)
def pb():           return PageBreak()
def h1(t):          return [sp(4), p(t, "h1"), hr()]
def h2(t):          return [p(t, "h2")]
def h3(t):          return [p(t, "h3")]

def bullets(items, color=C_GOLD):
    return [ListFlowable(
        [ListItem(p(i), leftIndent=10, bulletColor=color) for i in items],
        bulletType='bullet', leftIndent=14, spaceAfter=6
    )]

def tbl(data, widths, row_colors=None):
    t = Table(data, colWidths=widths)
    style = [
        ("BACKGROUND", (0,0), (-1,0), C_ACCENT),
        ("GRID",       (0,0), (-1,-1), 0.4, C_BORDER),
        ("VALIGN",     (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("LEFTPADDING",(0,0),(-1,-1),6),
        ("RIGHTPADDING",(0,0),(-1,-1),6),
    ]
    for i in range(1, len(data)):
        if row_colors and i-1 < len(row_colors):
            style.append(("BACKGROUND", (0,i), (-1,i), row_colors[i-1]))
        else:
            bg = C_SURFACE if i % 2 == 1 else C_BG
            style.append(("BACKGROUND", (0,i), (-1,i), bg))
    t.setStyle(TableStyle(style))
    return t

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG)
    canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
    canvas.setFillColor(C_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(20*mm, 12*mm, "PHAETON CAPITAL — PRODUCT ROADMAP V2  |  CONFIDENTIAL")
    canvas.drawRightString(A4[0]-20*mm, 12*mm, f"Page {doc.page}")
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(20*mm, 16*mm, A4[0]-20*mm, 16*mm)
    canvas.restoreState()

def build():
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=22*mm, bottomMargin=22*mm,
        title="Phaeton Capital — Product Roadmap V2", author="Claude Code")
    s = []

    # ── COVER ─────────────────────────────────────────────────────────────────
    s += [sp(40)]
    s += [p("PHAETON CAPITAL", "cover_title")]
    s += [p("PRODUCT ROADMAP  —  V2", "cover_sub")]
    s += [sp(6)]
    s += [HRFlowable(width="60%", thickness=1.5, color=C_GOLD, hAlign="CENTER", spaceAfter=16, spaceBefore=8)]
    s += [p("Prepared by: Claude Code (Anthropic) + Antigravity", "cover_meta")]
    s += [p("Date: 29 March 2026", "cover_meta")]
    s += [p("Scope: P0–P3 Feature Roadmap incl. Cultural Arbitrage Assessment", "cover_meta")]
    s += [sp(30)]
    s += [p("CLASSIFICATION: INTERNAL", "muted")]
    s += [pb()]

    # ── SECTION 1: EXECUTIVE SUMMARY ─────────────────────────────────────────
    s += h1("1. EXECUTIVE SUMMARY")
    s += [p(
        "This document presents the second-generation product roadmap for Phaeton Capital following the "
        "completion of all P0–P3 features from the initial assessment. Four new ideas were evaluated through "
        "rigorous research across academic finance literature, API availability, engineering complexity, and "
        "expected alpha generation. The findings are direct: two ideas are high-value quick wins, one requires "
        "architectural changes but is genuinely differentiated, one is intellectually seductive but empirically "
        "unsupported in its original form — and has been redirected into a stronger variant."
    )]
    s += [sp(6)]
    s += [p("<b>Ideas evaluated:</b>", "body")]
    s += bullets([
        "Cultural dimension / cultural arbitrage trading signals",
        "Smart search bar: company name → ticker autocomplete",
        "Multi-timeframe recommendations (15d / 30d / 90d)",
        "Google Trends integration + Polymarket prediction markets",
    ])
    s += [pb()]

    # ── SECTION 2: IDEA ASSESSMENTS ──────────────────────────────────────────
    s += h1("2. HONEST IDEA ASSESSMENTS")

    # 2.1 Cultural Arbitrage
    s += h2("2.1  Cultural Arbitrage — Redirected")
    s += [p("<b>Original idea:</b> Use Hofstede cultural dimensions to detect tradeable signals across markets "
            "based on how different cultures process the same financial information.", "body")]
    s += [sp(4)]
    s += [p("VERDICT: THEORETICALLY APPEALING — EMPIRICALLY WEAK", "verdict_no")]
    s += [p(
        "Academic research on Hofstede dimensions (Uncertainty Avoidance, Individualism/Collectivism, "
        "Long-Term Orientation, Power Distance) and equity market behaviour exists but is severely limited. "
        "The seminal study most cited — Chui, Titman &amp; Wei (2010) — shows individualism scores predict "
        "momentum profitability cross-nationally. However, every apparent cultural effect in the literature "
        "dissolves when controlling for regulatory regime, market maturity, institutional ownership "
        "concentration, and economic development level. "
        "This is not a minor caveat — it means the cultural signal is likely a <b>proxy variable</b> for "
        "institutional quality, not culture itself."
    )]
    s += [sp(4)]
    s += [p("<b>Why it fails as a trading signal:</b>", "body")]
    s += bullets([
        "Hofstede scores are static or change over decades — markets change daily. Temporal mismatch makes it untradeable.",
        "No consistent out-of-sample alpha has been documented in 20+ years of academic attempts.",
        "The A/H share premium (Shanghai vs Hong Kong) — the most cited real-world example — is fully explained by capital controls, liquidity, and index inclusion. Not culture.",
        "If real and stable, it would have been systematized and arbitraged away long ago.",
        "Academic publication bias: studies finding 'no effect' go unpublished.",
    ], color=C_RED)
    s += [sp(4)]
    s += [p("<b>What to build instead — the real version of this idea:</b>", "body")]
    s += [p(
        "The spirit of cultural arbitrage is correct: different investor communities price the same stock "
        "differently. The mistake is using static Hofstede theory instead of live behavioural data. "
        "Two concrete, measurable alternatives exist:"
    )]
    s += bullets([
        "<b>Regional Sentiment Divergence (P3):</b> Scrape the same ticker across regional Reddit communities "
        "(r/AusFinance, r/UKInvesting, r/EUstocks). When US sentiment is +0.4 and EU is −0.2 for the same "
        "stock, that divergence is real, observable, and potentially tradeable. Your app is already positioned to do this.",
        "<b>ADR / Cross-Listing Gap Monitor (P2):</b> ASML, Toyota, Sony, SAP, HSBC all trade on both "
        "their home exchange and US markets. Real price gaps exist due to timezone asymmetry and liquidity "
        "imbalances — this is mechanical arbitrage, directly observable via yfinance.",
        "<b>Cultural Context Card (P2, static):</b> Non-trading enrichment. Map company's home country to "
        "Hofstede scores, render a plain-English implication card. Zero API calls, 4h build, genuine context for "
        "international stocks.",
    ])
    s += [sp(8)]

    # 2.2 Smart Search
    s += h2("2.2  Smart Search Bar — P0 Quick Win")
    s += [p("VERDICT: BUILD THIS FIRST. HIGHEST IMPACT / LOWEST EFFORT CHANGE IN THE BACKLOG.", "verdict_yes")]
    s += [p(
        "The current UX requires users to know the exact ticker symbol. This is fatal to adoption. "
        "A normal person types 'Apple' or 'Volkswagen' and gets nothing. The fix is trivial and the "
        "infrastructure already exists."
    )]
    s += [sp(4)]
    s += [p("<b>Technical approach:</b>", "body")]
    s += bullets([
        "Yahoo Finance undocumented search: query2.finance.yahoo.com/v1/finance/search?q={query} — free, stable, used by every major finance tool. Returns ticker, name, exchange in ~50ms.",
        "Financial Modeling Prep official fallback: /v3/search?query={q}&apikey=... — 250 req/day free tier, enough for personal use.",
        "New Next.js route: GET /api/search?q={query} — proxies to Yahoo Finance, filters to EQUITY type, returns top 6 results.",
        "Command palette update: debounced keystroke (300ms) → fetch → dropdown replaces static popular tickers list.",
        "On select: triggerScrape(symbol) directly, close palette.",
    ])
    s += [sp(8)]

    # 2.3 Multi-Horizon
    s += h2("2.3  Multi-Timeframe Recommendations — P1 High Value")
    s += [p("VERDICT: NECESSARY. THE CURRENT 15-DAY-ONLY HORIZON IS SILENTLY WRONG FOR MOST USERS.", "verdict_mod")]
    s += [p(
        "Every signal, score, and prediction the app generates is calibrated to a 15-day holding period. "
        "This is never communicated to the user. A day trader and a pension fund manager both see 'BUY' and "
        "interpret it through completely different lenses. The system needs to be explicit about its horizon "
        "and ideally offer multiple."
    )]
    s += [sp(4)]
    s += [p("<b>Implementation strategy:</b>", "body")]
    s += bullets([
        "Schema: Add horizon Int @default(15) to RecommendationScore, making the compound key @@unique([ticker, horizon]).",
        "Logic: computeRecommendation(ticker, horizon) accepts 15 | 30 | 90. Horizon affects Kelly lookback window, prediction resolution threshold, and backtest holding period.",
        "Worker: Run all three horizons per cycle. Adds ~3s per ticker — acceptable.",
        "UI: Three tab pills in hero section (15D / 30D / 90D). State-controlled toggle. Scores will diverge meaningfully — a stock oversold short-term may be weak at 90d.",
        "Immediate fix (1h): Add explicit horizon labels to every signal, backtest result, and prediction table. No logic change needed.",
    ])
    s += [sp(8)]

    # 2.4 Google Trends + Polymarket
    s += h2("2.4  Google Trends — P1.  Polymarket — Skip.")
    s += [p("VERDICT: GOOGLE TRENDS = REAL ALPHA. POLYMARKET = WRONG TOOL FOR THIS JOB.", "verdict_mod")]
    s += [sp(4)]
    s += [p("<b>Google Trends:</b>", "h3")]
    s += [p(
        "Preis, Moat &amp; Stanley (2013, Nature Scientific Reports) demonstrated that Google search volume "
        "for financial keywords preceded market movements. Subsequent research at UCL confirmed search "
        "interest for '{ticker} stock' predicts 2-week forward returns with statistical significance. "
        "This is not hype — it's peer-reviewed with replication."
    )]
    s += bullets([
        "pytrends library (unofficial wrapper): moderate reliability, rate-limited to ~1 req/5s before IP block.",
        "Data resolution: weekly (daily available for recent 3 months only). 1-2 day data lag.",
        "Best keywords: '{ticker} stock', 'buy {ticker}', '{company} earnings' — these outperform generic company name searches.",
        "Engineering risk: unofficial API, no SLA. Mitigate with aggressive caching (6h TTL) and graceful fallback.",
        "Signal: z-score of last week vs 12-week average. trends_score > 70 → +5 to sentimentScore.",
    ])
    s += [sp(4)]
    s += [p("<b>Polymarket:</b>", "h3")]
    s += [p(
        "Polymarket has a REST API but equity-specific prediction markets are nearly nonexistent. "
        "The platform focuses on political events, sports, and macro predictions. "
        "Volume on individual stock markets is too thin to produce reliable probability signals. "
        "<b>Skip entirely</b> unless the app pivots toward event-driven macro trading."
    )]
    s += [pb()]

    # ── SECTION 3: MASTER ROADMAP TABLE ──────────────────────────────────────
    s += h1("3. MASTER ROADMAP TABLE")
    s += [sp(4)]

    headers = [
        p("Priority", "th"), p("Feature", "th"), p("Effort", "th"),
        p("Impact", "th"), p("Status", "th")
    ]
    rows = [
        [p("P0 NOW",  "tb_g"), p("Smart search: company name → ticker autocomplete", "tb"), p("3h",    "tb"), p("★★★★★", "tb_g"), p("Not started", "tb")],
        [p("P0 NOW",  "tb_g"), p("Explicit timeframe labels on all signals (15d clarity)", "tb"), p("1h",    "tb"), p("★★★★☆", "tb_g"), p("Not started", "tb")],
        [p("P1 NEXT", "tb_y"), p("Multi-horizon recommendations (15d / 30d / 90d tabs)", "tb"), p("1 day",  "tb"), p("★★★★★", "tb_y"), p("Not started", "tb")],
        [p("P1 NEXT", "tb_y"), p("Google Trends signal + sparkline chart", "tb"),              p("1 day",  "tb"), p("★★★★☆", "tb_y"), p("Not started", "tb")],
        [p("P2",      "tb"),   p("ADR / Cross-listing price gap monitor", "tb"),               p("2 days", "tb"), p("★★★☆☆", "tb"),   p("Not started", "tb")],
        [p("P2",      "tb"),   p("Cultural context card (static Hofstede data)", "tb"),        p("4h",     "tb"), p("★★★☆☆", "tb"),   p("Not started", "tb")],
        [p("P3",      "tb"),   p("Regional sentiment divergence (multi-community scraping)", "tb"), p("3 days", "tb"), p("★★★★☆", "tb"), p("Not started", "tb")],
        [p("SKIP",    "tb_r"), p("Polymarket integration", "tb"),                              p("—",      "tb"), p("★☆☆☆☆", "tb_r"), p("Rejected", "tb")],
        [p("SKIP",    "tb_r"), p("Hofstede arbitrage trading signals", "tb"),                  p("—",      "tb"), p("★☆☆☆☆", "tb_r"), p("Rejected", "tb")],
    ]

    row_colors = [
        colors.HexColor("#0d1a0d"), colors.HexColor("#0d1a0d"),
        colors.HexColor("#1a1a0d"), colors.HexColor("#1a1a0d"),
        C_SURFACE, C_BG,
        colors.HexColor("#0d0d1a"),
        C_SKIP, C_SKIP,
    ]

    widths = [22*mm, 78*mm, 18*mm, 26*mm, 26*mm]
    s += [tbl([headers] + rows, widths, row_colors=row_colors)]
    s += [sp(8)]
    s += [p("★★★★★ = transformative  ★★★★☆ = high  ★★★☆☆ = medium  ★★☆☆☆ = low  ★☆☆☆☆ = negligible", "muted")]
    s += [pb()]

    # ── SECTION 4: DETAILED SPECS ─────────────────────────────────────────────
    s += h1("4. DETAILED IMPLEMENTATION SPECS")

    # 4.1
    s += h2("4.1  P0-A: Smart Search Bar")
    s += [p("<b>Files to create/edit:</b>", "body")]
    s += bullets([
        "NEW: apps/web/app/api/search/route.ts",
        "EDIT: apps/web/app/DashboardClient.tsx (command palette)",
    ])
    s += [sp(4)]
    s += [p("apps/web/app/api/search/route.ts:", "h3")]
    s += [p(
        "GET /api/search?q={query} handler. Fetch from Yahoo Finance search endpoint with 5s timeout. "
        "Filter results to quoteType === 'EQUITY'. Return array of { symbol, shortname, exchange }. "
        "Add Financial Modeling Prep as fallback if Yahoo fails. Cache results for 60s with simple Map.", "body"
    )]
    s += [p("DashboardClient.tsx — command palette changes:", "h3")]
    s += bullets([
        "Add searchResults state: useState<{symbol,shortname,exchange}[]>([])",
        "Add useEffect debouncing searchQuery → fetch /api/search?q={query} after 300ms",
        "Replace static Popular Tickers buttons with dynamic dropdown list",
        "On item click: triggerScrape(item.symbol), setIsCommandOpen(false)",
        "Show exchange badge next to ticker (NYSE, NASDAQ, LSE etc.)",
    ])
    s += [sp(8)]

    # 4.2
    s += h2("4.2  P0-B: Timeframe Clarity Labels")
    s += [p(
        "Copy-only changes. No logic modifications required. Every place the system shows a signal, "
        "score, prediction, or backtest result must explicitly state its time horizon.", "body"
    )]
    s += bullets([
        "Hero section signal word: add '15-Day Outlook' sub-label below STRONG BUY / BUY / etc.",
        "Prediction audit trail table: rename column 'Outcome' → 'Outcome (15d)'",
        "Backtest stats card: add sub-label '2-Year Walk-Forward · 15-Day Holds'",
        "Score badge in hero: 'Score: 74.2/100' → 'Score: 74.2/100 · 15d'",
    ])
    s += [sp(8)]

    # 4.3
    s += h2("4.3  P1-A: Multi-Horizon Recommendations")
    s += [p("<b>Schema changes (packages/db/prisma/schema.prisma):</b>", "body")]
    s += bullets([
        "Add horizon Int @default(15) field to RecommendationScore model",
        "Change unique constraint from @@unique([ticker]) to @@unique([ticker, horizon])",
        "Add horizon Int @default(15) field to PredictionRecord model",
    ])
    s += [p("<b>Worker changes (apps/worker/src/recommendation.ts):</b>", "body")]
    s += bullets([
        "computeRecommendation(ticker, horizon: 15 | 30 | 90 = 15)",
        "Pass horizon to prisma upsert/create calls",
        "Adjust Kelly lookback: horizon * 2 trading days",
        "Adjust prediction resolution window to match horizon",
    ])
    s += [p("<b>Worker orchestration (apps/worker/src/index.ts):</b>", "body")]
    s += bullets([
        "After existing computeRecommendation(ticker), add calls for 30 and 90 day horizons",
        "Wrap in Promise.allSettled to avoid one horizon failure blocking others",
    ])
    s += [p("<b>Frontend changes:</b>", "body")]
    s += bullets([
        "page.tsx: fetch all three horizons from DB, pass as props",
        "DashboardClient.tsx: add selectedHorizon state (15 | 30 | 90), tab pill UI in hero, derive displayed rec from props based on selected horizon",
    ])
    s += [sp(8)]

    # 4.4
    s += h2("4.4  P1-B: Google Trends Signal")
    s += [p("<b>Python worker (apps/python_worker/main.py):</b>", "body")]
    s += bullets([
        "pip install pytrends — add to requirements.txt",
        "New GET /trends/{ticker} endpoint",
        "build_payload([f'{ticker} stock'], timeframe='today 3-m', geo='US')",
        "Compute z-score: (last_week_interest - 12w_mean) / 12w_std",
        "trends_score = clamp(50 + z_score * 10, 0, 100)",
        "time.sleep(10) between calls — mandatory to avoid IP block",
        "Return: { trends_score, weekly_data: [{week, interest}], direction: 'up'|'down'|'flat' }",
    ])
    s += [p("<b>Schema changes:</b>", "body")]
    s += bullets([
        "Add trends_score Float? to QuantMetrics model",
        "New TrendsHistory model: id, ticker, week_start Date, interest Int, createdAt DateTime",
    ])
    s += [p("<b>Worker (apps/worker/src/trends.ts — new file):</b>", "body")]
    s += bullets([
        "fetchGoogleTrends(ticker): calls python_worker /trends/{ticker} with 30s timeout",
        "Upsert trends_score into QuantMetrics",
        "Batch insert TrendsHistory rows (skip if already exists for that week)",
    ])
    s += [p("<b>Recommendation engine nudge:</b>", "body")]
    s += bullets([
        "If trends_score > 70: sentimentScore = clamp(sentimentScore + 5)",
        "If trends_score < 30: sentimentScore = clamp(sentimentScore - 5)",
    ])
    s += [p("<b>UI (DashboardClient.tsx):</b>", "body")]
    s += bullets([
        "Add Google Trends mini-section inside Quant Models card",
        "12-week sparkline using Recharts AreaChart, color-coded by direction",
        "Single stat tile: 'Search Momentum' with trends_score value",
    ])
    s += [pb()]

    # 4.5
    s += h2("4.5  P2-A: ADR / Cross-Listing Gap Monitor")
    s += [p(
        "Tracks real-time price discrepancy between a stock's home-market listing and its US ADR. "
        "Examples: ASML (AEX + NASDAQ), Toyota (TSE + NYSE), SAP (XETRA + NYSE).", "body"
    )]
    s += bullets([
        "Python endpoint GET /crosslist/{ticker}: fetch both prices via yfinance, apply FX conversion, compute gap_pct",
        "New CrossListingData Prisma model: ticker, home_ticker, home_exchange, home_price, adr_price, fx_rate, gap_pct, updatedAt",
        "Worker: scrape cross-listing data after fundamentals sync",
        "UI: Conditional card in Fundamentals section. If |gap_pct| > 0.5%: show amber alert 'Cross-listing discrepancy: +1.2% (NASDAQ premium vs AEX)'",
    ])
    s += [sp(8)]

    # 4.6
    s += h2("4.6  P2-B: Cultural Context Card")
    s += [p(
        "Static enrichment feature. No trading signal — pure editorial context. Maps company's listed "
        "exchange country to Hofstede dimension scores and renders plain-English market behaviour implications.", "body"
    )]
    s += bullets([
        "Static JSON bundled in worker: Map<country_code, HofstedeScores> for 50 major markets",
        "Worker resolves exchange country from fundamentalData.exchange field",
        "Stores country_code and cultural_profile JSON string in MacroIndicators or new field",
        "UI: Single collapsible card in Macro section. Shows 4 dimension bars (UAI, IDV, LTO, PDI) with 1-sentence implication each",
        "Example: 'Netherlands — Uncertainty Avoidance: 53/100. Implication: moderate sell-off response to ambiguous data vs. high-UAI markets like Japan (92/100).'",
    ])
    s += [sp(8)]

    # 4.7
    s += h2("4.7  P3: Regional Sentiment Divergence")
    s += [p(
        "The real version of cultural arbitrage. Expands the Reddit scraper to pull from regional "
        "finance communities for the same ticker and detects when communities price it differently.", "body"
    )]
    s += bullets([
        "Schema: Add region String @default('US') field to Sentiment model",
        "Scraper: For each ticker, scrape r/investing (US), r/AusFinance (AU), r/UKInvesting (UK), r/EUstocks (EU)",
        "New divergence_score computed in recommendation.ts: max regional sentiment gap",
        "Worker: After sentiment batch, compute regional means and store in new RegionalSentiment table",
        "UI: Radar/spider chart showing sentiment by region. Alert if divergence > 0.3: 'Regional Divergence Detected: US +0.4 vs EU -0.2'",
    ])
    s += [pb()]

    # ── SECTION 5: IMPLEMENTATION ORDER ──────────────────────────────────────
    s += h1("5. RECOMMENDED IMPLEMENTATION ORDER")
    s += [p(
        "The following order maximises user-visible impact at each step while keeping architectural "
        "risk low. P0 items can be done in a single session. P1 items require schema migrations.", "body"
    )]
    s += [sp(6)]

    steps = [
        [p("Step", "th"), p("Feature", "th"), p("Rationale", "th"), p("Est.", "th")],
        [p("1", "tb_g"), p("Smart search autocomplete", "tb"),       p("Makes app usable for any normal person — immediate adoption impact", "tb"),    p("3h", "tb")],
        [p("2", "tb_g"), p("Timeframe labels",           "tb"),       p("Zero logic risk, removes a silent UX lie that misleads every user", "tb"),      p("1h", "tb")],
        [p("3", "tb_y"), p("Google Trends signal",       "tb"),       p("Genuine data edge, differentiates from every other retail tool", "tb"),         p("1d", "tb")],
        [p("4", "tb_y"), p("Multi-horizon recs",         "tb"),       p("Requires schema migration — do after Trends to batch the DB push", "tb"),       p("1d", "tb")],
        [p("5", "tb"),   p("Cultural context card",      "tb"),       p("Static data, zero risk, adds polish for international stocks", "tb"),            p("4h", "tb")],
        [p("6", "tb"),   p("ADR gap monitor",            "tb"),       p("Real mechanical alpha signal — needs yfinance dual-ticker logic", "tb"),         p("2d", "tb")],
        [p("7", "tb"),   p("Regional sentiment divergence", "tb"),    p("Biggest architectural change — expand scraper to 4 communities", "tb"),         p("3d", "tb")],
    ]

    s += [tbl(steps, [12*mm, 60*mm, 80*mm, 18*mm])]
    s += [sp(12)]

    # ── SECTION 6: WHAT NOT TO BUILD ─────────────────────────────────────────
    s += h1("6. WHAT NOT TO BUILD — AND WHY")
    s += [p(
        "Product discipline requires saying no. The following were evaluated and rejected.", "body"
    )]
    s += [sp(4)]

    reject_data = [
        [p("Feature", "th"), p("Why Rejected", "th")],
        [p("Hofstede arbitrage trading signals", "tb_r"),
         p("No consistent out-of-sample alpha in 20+ years of academic research. Every apparent cultural effect "
           "dissolves when controlling for institutional quality and regulation. Building this would create false "
           "credibility for a signal that doesn't work.", "tb")],
        [p("Polymarket integration", "tb_r"),
         p("Prediction market data for individual equities is nearly nonexistent on Polymarket. The platform "
           "is political/sports/macro focused. Equity volume is too thin for reliable probability signals. "
           "Would add complexity with no measurable alpha.", "tb")],
    ]
    s += [tbl(reject_data, [50*mm, 120*mm])]
    s += [pb()]

    # ── SECTION 7: CURRENT STACK ─────────────────────────────────────────────
    s += h1("7. CURRENT STACK STATUS (POST P0–P3)")
    s += [p(
        "All original P0–P3 items from the first assessment have been completed. "
        "The following is the current feature state entering this roadmap.", "body"
    )]
    s += [sp(6)]

    stack_data = [
        [p("Component", "th"), p("Feature", "th"), p("Status", "th")],
        [p("Python Worker", "tb"),  p("Options flow (put/call ratio, max pain, IV percentile)", "tb"),   p("DONE ✓", "tb_g")],
        [p("Python Worker", "tb"),  p("Walk-forward backtest (RSI+MACD+SMA, 15d holds)", "tb"),          p("DONE ✓", "tb_g")],
        [p("Python Worker", "tb"),  p("GARCH, HMM, Monte Carlo, Hurst, Kelly, Bayesian", "tb"),          p("DONE ✓", "tb_g")],
        [p("Worker (TS)",   "tb"),  p("Regime-aware weights (CRISIS/BULL/BEAR/NEUTRAL)", "tb"),          p("DONE ✓", "tb_g")],
        [p("Worker (TS)",   "tb"),  p("Ridge regression weight optimisation from prediction history","tb"),p("DONE ✓", "tb_g")],
        [p("Worker (TS)",   "tb"),  p("Options flow scraping + DB persistence", "tb"),                   p("DONE ✓", "tb_g")],
        [p("Worker (TS)",   "tb"),  p("SSE broadcast on sentiment/quant/recommendation events", "tb"),   p("DONE ✓", "tb_g")],
        [p("Worker (TS)",   "tb"),  p("LLM narrative generation via Gemini (async, non-blocking)", "tb"),p("DONE ✓", "tb_g")],
        [p("Web (Next.js)", "tb"),  p("SSE client replacing 30s polling", "tb"),                         p("DONE ✓", "tb_g")],
        [p("Web (Next.js)", "tb"),  p("Prediction audit trail UI (stats bar + table)", "tb"),            p("DONE ✓", "tb_g")],
        [p("Web (Next.js)", "tb"),  p("LLM narrative display in hero section", "tb"),                    p("DONE ✓", "tb_g")],
        [p("Web (Next.js)", "tb"),  p("Backtest API route (/api/backtest)", "tb"),                       p("DONE ✓", "tb_g")],
        [p("Schema",        "tb"),  p("OptionsFlow model, narrative field on RecommendationScore", "tb"),p("DONE ✓", "tb_g")],
    ]
    s += [tbl(stack_data, [30*mm, 110*mm, 30*mm])]
    s += [sp(12)]
    s += [HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=8)]
    s += [p("End of Document — Phaeton Capital Roadmap V2 — 29 March 2026", "muted")]

    doc.build(s, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF written to {OUTPUT}")

if __name__ == "__main__":
    build()
