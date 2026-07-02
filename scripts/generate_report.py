from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, ListFlowable, ListItem
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUTPUT = "/Users/jafaralbadri/repos/phaeton_capital/PHAETON_CAPITAL_ASSESSMENT.pdf"

C_BG      = colors.HexColor("#0a0a0f")
C_SURFACE = colors.HexColor("#13131a")
C_GOLD    = colors.HexColor("#d4a017")
C_GOLD2   = colors.HexColor("#f0c040")
C_RED     = colors.HexColor("#e05252")
C_ORANGE  = colors.HexColor("#e07a30")
C_YELLOW  = colors.HexColor("#e0c040")
C_GREEN   = colors.HexColor("#4caf7d")
C_TEXT    = colors.HexColor("#e8e8f0")
C_MUTED   = colors.HexColor("#8888aa")
C_BORDER  = colors.HexColor("#2a2a3a")
C_ACCENT  = colors.HexColor("#3a3a5a")

def S(name, **kw): return ParagraphStyle(name, **kw)

ST = {
    "cover_title": S("cover_title", fontSize=34, leading=42, textColor=C_GOLD, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6),
    "cover_sub":   S("cover_sub",   fontSize=13, leading=18, textColor=C_MUTED, fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4),
    "cover_meta":  S("cover_meta",  fontSize=10, leading=14, textColor=C_MUTED, fontName="Helvetica", alignment=TA_CENTER),
    "h1":  S("h1",  fontSize=20, leading=26, textColor=C_GOLD,  fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=8),
    "h2":  S("h2",  fontSize=14, leading=20, textColor=C_GOLD2, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6),
    "h3":  S("h3",  fontSize=11, leading=16, textColor=C_TEXT,  fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4),
    "body": S("body", fontSize=9.5, leading=15, textColor=C_TEXT, fontName="Helvetica", spaceAfter=6, alignment=TA_JUSTIFY),
    "muted": S("muted", fontSize=8.5, leading=13, textColor=C_MUTED, fontName="Helvetica", spaceAfter=4),
    "code": S("code", fontSize=8, leading=12, textColor=C_GOLD2, fontName="Courier", spaceAfter=4, backColor=C_SURFACE, borderPadding=(4,6,4,6)),
    "tb":   S("tb",   fontSize=8.5, leading=12, textColor=C_TEXT, fontName="Helvetica"),
    "th":   S("th",   fontSize=8.5, leading=12, textColor=C_GOLD, fontName="Helvetica-Bold"),
}

def p(t, s="body"): return Paragraph(t, ST[s])
def sp(h=6):        return Spacer(1, h)
def hr():           return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=8, spaceBefore=4)
def pb():           return PageBreak()

def h1(t): return [sp(4), p(t,"h1"), hr()]
def h2(t): return [p(t,"h2")]

def bullets(items):
    return [ListFlowable(
        [ListItem(p(i), leftIndent=10, bulletColor=C_GOLD) for i in items],
        bulletType='bullet', leftIndent=14, spaceAfter=6
    )]

def tbl(data, widths, bg_alt=True):
    t = Table(data, colWidths=widths)
    style = [
        ("BACKGROUND",(0,0),(-1,0), C_ACCENT),
        ("GRID",(0,0),(-1,-1), 0.4, C_BORDER),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("TOPPADDING",(0,0),(-1,-1),5),
        ("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("LEFTPADDING",(0,0),(-1,-1),6),
        ("RIGHTPADDING",(0,0),(-1,-1),6),
    ]
    if bg_alt:
        for i in range(1, len(data)):
            bg = C_SURFACE if i % 2 == 1 else C_BG
            style.append(("BACKGROUND",(0,i),(-1,i), bg))
    t.setStyle(TableStyle(style))
    return t

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG)
    canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
    canvas.setFillColor(C_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(20*mm, 12*mm, "PHAETON CAPITAL — TECHNICAL ASSESSMENT  |  CONFIDENTIAL")
    canvas.drawRightString(A4[0]-20*mm, 12*mm, f"Page {doc.page}")
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(20*mm,16*mm,A4[0]-20*mm,16*mm)
    canvas.restoreState()

def build():
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=22*mm, bottomMargin=22*mm,
        title="Phaeton Capital — Technical Assessment", author="Claude Code")
    s = []

    # COVER
    s += [sp(40), p("PHAETON CAPITAL","cover_title"), p("TECHNICAL ASSESSMENT & ROADMAP","cover_sub"), sp(6)]
    s += [HRFlowable(width="60%",thickness=1.5,color=C_GOLD,hAlign="CENTER",spaceAfter=16,spaceBefore=8)]
    s += [p("Prepared for: Antigravity Development Team","cover_meta")]
    s += [p("Date: 29 March 2026","cover_meta")]
    s += [p("Specialists: Quant Analyst  ·  Backend Engineer  ·  Frontend Engineer  ·  Data/AI Pipeline","cover_meta")]
    s += [sp(30), p("CLASSIFICATION: INTERNAL — DO NOT DISTRIBUTE","muted"), pb()]

    # EXECUTIVE SUMMARY
    s += h1("EXECUTIVE SUMMARY")
    s += [p("Phaeton Capital has the right vision, an exceptional visual design, and a technically ambitious foundation. "
            "Four specialist reviews were conducted in parallel across quantitative finance, backend architecture, "
            "frontend/UX, and data/AI pipeline. The findings are consistent: the system creates the <b>appearance of "
            "predictive rigour</b> without the substance. Several models contain mathematical errors. The data pipeline "
            "silently loses records in production. The AI sentiment pipeline has no calibration. The frontend displays "
            "hardcoded fictional market data.")]
    s += [p("This document details every issue found, its severity, and the exact fix required. "
            "It is structured as a prioritised engineering backlog. Nothing here requires an architectural rewrite — "
            "these are targeted, concrete fixes that can be completed in two sprints.")]

    grades = [
        ("HMM Regime Detection","F","Lookahead bias — trained and tested on the same data"),
        ("Hurst Exponent","D","Formula mathematically wrong; lag range 2–20 days is too short"),
        ("Kelly Criterion","D","Formula is mean/var — this is not Kelly criterion"),
        ("Monte Carlo","C-","Correct structure; naive GBM; no jumps, no vol clustering"),
        ("GARCH / Volatility","B-","Mostly correct; needs Student-t dist and convergence checks"),
        ("Sentiment Pipeline","D+","Overstated weight; LLM confidence uncalibrated; no test set"),
        ("Technical Indicators","B","Calculations correct; misused (lagging signals treated as leading)"),
        ("Fundamental Analysis","C","Basic metrics only; P/E not growth-adjusted; no quality screens"),
        ("Macro Framework","C-","VIX/yield concepts sound; fear/greed index is ad-hoc"),
        ("Recommendation Engine","D","Arbitrary weights; no backtest; no ablation; no alpha proof"),
        ("Backend Architecture","D+","Race conditions; silent data loss; Python zombie processes"),
        ("Data Pipeline","D","Bot-contaminated; RSS fragility; no authentication; no fallback"),
        ("AI Pipeline","D+","No ground truth; no prompt versioning; fallback silently changes model"),
        ("Frontend / UX","C+","Exceptional design; fake live data; 987-line god component; no mobile"),
    ]
    gc_map = {"A":C_GREEN,"B":C_GREEN,"B-":C_GREEN,"C":C_YELLOW,"C-":C_YELLOW,"C+":C_YELLOW,
              "D":C_ORANGE,"D+":C_ORANGE,"D-":C_RED,"F":C_RED}
    hrow = [p("Area","th"), p("Grade","th"), p("Core Problem","th")]
    rows = [hrow] + [
        [p(a,"tb"),
         Paragraph(g, ParagraphStyle("gx",fontSize=9,leading=12,textColor=gc_map.get(g,C_TEXT),fontName="Helvetica-Bold")),
         p(n,"tb")] for a,g,n in grades
    ]
    s += [tbl(rows,[52*mm,18*mm,100*mm]), sp(8), pb()]

    # SECTION 1 QUANT
    s += h1("1.  QUANTITATIVE MODELS")
    s += [p("The app implements HMM, Hurst exponent, Monte Carlo, Kelly Criterion, GARCH, Granger causality, "
            "Bayesian aggregation, Ornstein-Uhlenbeck, and ADF stationarity tests. Several contain fundamental "
            "errors. None have been validated out-of-sample.")]

    s += h2("1.1  Hidden Markov Model — Lookahead Bias")
    s += [p("<b>File:</b> apps/worker/src/advanced_math.py  lines 102–116","muted")]
    s += [p("model.fit(returns)  →  model.predict(returns)   # same data = data leakage","code")]
    s += [p("The model is trained and tested on identical data. It will always appear to identify regimes correctly "
            "while being useless on future data. 126 trading days is also too short for regime structure to stabilise.")]
    s += bullets([
        "<b>Fix:</b> Expanding-window training — fit on data up to day T, predict day T+1 only.",
        "<b>Fix:</b> Use 3–4 states with economically labelled transition matrices.",
        "<b>Fix:</b> Remove random_state=42 from production code.",
        "<b>Fix:</b> Require minimum 2 years of daily data before running.",
    ])

    s += h2("1.2  Hurst Exponent — Wrong Formula")
    s += [p("<b>File:</b> apps/worker/src/advanced_math.py  lines 118–128","muted")]
    s += [p("lags = range(2, 20)          # too short — minimum 50+ required\nhurst_exponent = poly[0] * 2.0  # constant is unjustified","code")]
    s += [p("The scaling formula applies sqrt(std) where raw variance is required. The lag range 2–20 is far below "
            "the minimum (50+) needed for the estimate to stabilise. The ×2.0 multiplier is unexplained.")]
    s += bullets([
        "<b>Fix:</b> Implement DFA (Detrended Fluctuation Analysis) with lags from 10 to N/4.",
        "<b>Fix:</b> Detrend the price series before computing.",
        "<b>Fix:</b> Require minimum 500 observations; flag result as inconclusive if CI spans 0.3–0.7.",
    ])

    s += h2("1.3  Kelly Criterion — Mathematically Incorrect")
    s += [p("<b>File:</b> apps/worker/src/advanced_math.py  lines 130–137","muted")]
    s += [p("kelly_fraction = mean_ret / var_ret   # NOT Kelly\n# Correct: f* = (bp - q) / b  where b=odds, p=win_prob, q=loss_prob","code")]
    s += [p("The formula computed is mean/variance. Kelly requires win/loss odds and probabilities. "
            "Full Kelly on 6 months of non-stationary returns also implies ~40% max drawdown even with edge.")]
    s += bullets([
        "<b>Fix:</b> Implement correct continuous Kelly (μ/σ²) with explicit documentation of assumptions.",
        "<b>Fix:</b> Apply fractional Kelly ×0.25 to limit drawdown.",
        "<b>Fix:</b> Subtract estimated transaction costs from μ before computing.",
    ])

    s += h2("1.4  Monte Carlo — No Fat Tails")
    s += [p("<b>File:</b> apps/worker/src/advanced_math.py  lines 165–208","muted")]
    s += [p("shock = sigma * np.random.normal()   # thin-tailed — underestimates downside","code")]
    s += bullets([
        "<b>Fix:</b> Replace normal shocks with Student-t (df=4–6) to capture fat tails.",
        "<b>Fix:</b> Propagate GARCH vol forward through each path — not just today's vol for all 15 days.",
        "<b>Fix:</b> Add Poisson jump component for earnings/news gap risk.",
    ])

    s += h2("1.5  Granger, TE, ADF — Computed but Discarded")
    s += [p("Granger p-value, transfer entropy, ADF stationarity, and OU calibration are all computed in "
            "advanced_math.py and stored, but recommendation.ts never reads them. The ADF test on bounded "
            "[-1,1] sentiment is trivially stationary — it adds nothing.")]
    s += bullets([
        "<b>Fix:</b> Incorporate Granger p-value into signal score (downweight sentiment when p > 0.1) or delete the computation.",
        "<b>Fix:</b> Delete ADF stationarity test on sentiment.",
        "<b>Fix:</b> Replace transfer entropy with Pearson correlation — simpler and more interpretable.",
    ])

    s += h2("1.6  Recommendation Weights — Arbitrary Guesses")
    s += [p("sentiment:0.25  technical:0.20  fundamental:0.20  quant:0.20  insider:0.10  macro:0.05","code")]
    s += [p("No backtest, no regression, no factor study proves sentiment is 5× more important than macro. "
            "These are guesses codified as science.")]
    s += bullets([
        "<b>Fix:</b> Run 2-year walk-forward backtest. Use ridge regression to learn optimal weights from prediction outcomes.",
        "<b>Fix:</b> Add regime-conditional weights: in high-VIX, macro → 0.30, sentiment → 0.10.",
        "<b>Fix:</b> Ablation study: measure Sharpe with and without each signal source.",
    ])
    s += [pb()]

    # SECTION 2 BACKEND
    s += h1("2.  BACKEND ARCHITECTURE")
    s += [p("The worker is a monolith coordinating scraping, AI batching, DB writes, Python subprocesses, "
            "risk computation, and scheduling in a single process with in-memory state. "
            "It will fail silently and frequently in production.")]

    s += h2("2.1  Race Conditions & Silent Data Loss")
    s += [p("<b>File:</b> apps/worker/src/index.ts  lines 196–210 and 285–313","muted")]
    s += [p("// findUnique() then create() — another worker inserts same hash in between\n"
            "// P2002 unique constraint fires → record silently dropped, no retry","code")]
    s += bullets([
        "<b>Fix:</b> Use createMany({ skipDuplicates: true }) — one atomic operation eliminates the race entirely.",
        "<b>Fix:</b> Wrap all financial history upserts in prisma.$transaction() — currently a crash mid-loop leaves permanent partial data.",
        "<b>Fix:</b> Log every skipped record to an audit table with reason code.",
    ])

    s += h2("2.2  Python Subprocess Resource Leak")
    s += [p("<b>Files:</b> fundamentals.ts, quant.ts, macro.ts","muted")]
    s += [p("Bun.spawn([\"python3\", ...])  // spawned per request, no guaranteed cleanup\nsetTimeout(() => proc.kill(), 30000)  // SIGTERM often ignored by Python","code")]
    s += [p("Three modules each spawn a Python process per request. After thousands of calls, zombie processes "
            "accumulate until the system exhausts file descriptors and crashes.")]
    s += bullets([
        "<b>Fix:</b> Replace all three Python callers with a single persistent FastAPI service exposing /fundamentals, /quant, /macro.",
        "<b>Fix:</b> Add to docker-compose.yml as a dedicated python_worker service. Call over HTTP from TypeScript.",
        "<b>Fix:</b> This also eliminates stdout buffering issues, JSON split reads, and timeout ambiguity.",
    ])

    s += h2("2.3  In-Memory Job Queue — Lost on Restart")
    s += [p("<b>File:</b> apps/worker/src/index.ts  lines 17–19","muted")]
    s += [p("let jobQueue: string[] = [];  // lost on pod restart\nlet isRunning = false;         // not thread-safe","code")]
    s += bullets([
        "<b>Fix:</b> Replace with BullMQ backed by the Redis instance already in docker-compose.yml.",
        "<b>Fix:</b> Add dead-letter queue with exponential backoff for failed jobs.",
        "<b>Fix:</b> De-duplicate jobs: same ticker within 10 minutes should not re-queue.",
    ])

    s += h2("2.4  500 Individual DB Inserts Per Scrape")
    s += bullets([
        "<b>Fix:</b> Collect all validated sentiment objects, call prisma.sentiment.createMany() once per batch.",
        "<b>Fix:</b> Set explicit pool in DATABASE_URL: ?connection_limit=20&pool_timeout=30",
    ])

    s += h2("2.5  Zero Observability")
    s += bullets([
        "<b>Fix:</b> Add /health and /ready HTTP endpoints for container orchestration.",
        "<b>Fix:</b> Replace console.log/error with structured JSON logging (pino) with correlation IDs.",
        "<b>Fix:</b> Expose Prometheus metrics: sentiment_saved_total, ai_batch_duration_ms, queue_depth, python_errors_total.",
    ])
    s += [pb()]

    # SECTION 3 DATA
    s += h1("3.  DATA SOURCES & AI PIPELINE")

    s += h2("3.1  Reddit — Trust Filter Removed")
    s += [p("<b>File:</b> apps/worker/src/scraper.ts  lines 54–55","muted")]
    s += [p("author_karma: 500,       // HARDCODED FAKE — comment says 'removed per audit'\nauthor_age_days: 100,   // HARDCODED FAKE","code")]
    s += [p("Every Reddit post — bots, pump-and-dump campaigns, spam — is now ingested as valid signal. "
            "The entire sentiment pipeline is contaminated at the source.")]
    s += bullets([
        "<b>Fix:</b> Implement Reddit OAuth2 and use the authenticated API (real karma, real age).",
        "<b>Fix:</b> Soft-score trust: karma 100–500 maps linearly to 0.3–1.0 weight multiplier.",
        "<b>Fix:</b> Detect coordinated bursts: >20 similar posts within 1 hour → flag as manipulation.",
    ])

    s += h2("3.2  3 of 5 Sources Are Unofficial RSS")
    s += [p("Google News RSS and Yahoo Finance RSS are undocumented endpoints. Google has deprecated RSS "
            "feeds before without notice. No fallback exists if a source goes down.")]
    s += bullets([
        "<b>Fix:</b> Replace Google News RSS with NewsAPI.org (free tier: 100 req/day) or Polygon.io News.",
        "<b>Fix:</b> Add source-health monitoring: 0 results for 3 consecutive cycles → alert.",
        "<b>Fix:</b> Tag every sentiment record with its source for credibility-weighted aggregation.",
    ])

    s += h2("3.3  Gemini Sentiment — No Calibration")
    s += [p("LLM confidence scores are used directly. There is no test set, no F1 score, no calibration curve. "
            "An LLM claiming 0.95 confidence does not mean 95% accuracy. You don't know if this is better than random.")]
    s += bullets([
        "<b>Fix:</b> Label 500 posts manually. Measure Gemini precision/recall against labels.",
        "<b>Fix:</b> Apply Platt scaling or isotonic regression to calibrate confidence scores.",
        "<b>Fix:</b> Consider FinBERT as supplement — domain-specific model with published accuracy benchmarks.",
        "<b>Fix:</b> Add prompt_version column to Sentiment table. Bump on every prompt change.",
    ])

    s += h2("3.4  Fallback Model Changes Signal Silently")
    s += [p("<b>File:</b> apps/worker/src/ai.ts  lines 94–128","muted")]
    s += [p("On 429 → instantly retry with gemini-1.5-flash → ai_model field updated\n"
            "// But Bayesian aggregation treats both models as equivalent. They are not.","code")]
    s += bullets([
        "<b>Fix:</b> Add exponential backoff with jitter before trying fallback.",
        "<b>Fix:</b> Apply a calibrated discount factor (e.g. 0.7×) to fallback model scores until equivalence is empirically proven.",
        "<b>Fix:</b> Track fallback rate as a metric — >20% of batches falling back = primary quota insufficient.",
    ])

    s += h2("3.5  EDGAR — Metadata Only, No Content")
    s += bullets([
        "<b>Fix:</b> Use SEC EDGAR Full-Text Search API to retrieve filing content.",
        "<b>Fix:</b> Apply LLM sentiment to filing text, weighted at 3× Reddit (higher credibility tier).",
        "<b>Fix:</b> Flag 8-K filings containing material keywords: restatement, CEO, SEC, investigation, default.",
    ])

    s += h2("3.6  Critical Missing Data Sources")
    s += bullets([
        "<b>Options Flow:</b> Put/call ratio and unusual options volume — leading institutional indicator. Source: CBOE free data or Unusual Whales API.",
        "<b>Short Interest:</b> Borrow rate spikes predict squeezes. Source: FINRA short interest reports (free, bi-weekly).",
        "<b>Earnings Transcripts:</b> Q&A tone is highly predictive. Source: SEC EDGAR 8-K full text or Motley Fool API.",
        "<b>Analyst Revision Momentum:</b> Are targets rising or falling? Capture upgrades_downgrades from yfinance.",
        "<b>Dark Pool / Block Trades:</b> Institutional positioning. Source: FINRA OTC Transparency data.",
    ])
    s += [pb()]

    # SECTION 4 FRONTEND
    s += h1("4.  FRONTEND & UX")

    s += h2("4.1  Hardcoded Fake Market Data — Remove Immediately")
    s += [p("<b>File:</b> apps/web/app/DashboardClient.tsx  lines 327–333","muted")]
    s += [p('<span>NVDA +2.4%</span>  <span>TSLA -1.2%</span>   // fictional, hardcoded, displayed as live','code')]
    s += [p("This is fictional data displayed as live market movement on a financial application. "
            "This is the single most damaging credibility issue in the entire codebase.",
            "muted")]
    s += bullets(["<b>Fix:</b> Delete immediately. Either fetch real price data (Polygon.io, yfinance JS) or remove the ticker tape."])

    s += h2("4.2  Bootstrap CI Bands — Computed but Never Shown")
    s += [p("<b>File:</b> apps/web/app/page.tsx  lines 79–80","muted")]
    s += [p("1,000 bootstrap iterations run on every page request. lowerBound + upperBound computed, passed "
            "as props, and never rendered. The most statistically honest feature in the app is invisible "
            "while burning CPU on every load.")]
    s += bullets([
        "<b>Fix:</b> Render lowerBound and upperBound as a shaded ReferenceArea on the Gaussian distribution chart.",
        "<b>Fix:</b> Move bootstrap computation to the worker — pre-compute and store in DB, not on every page render.",
    ])

    s += h2("4.3  987-Line God Component — all typed 'any'")
    s += [p("<b>File:</b> apps/web/app/DashboardClient.tsx","muted")]
    s += [p("export default function DashboardClient({ ...14 props... }: any)  // zero type safety","code")]
    s += bullets([
        "<b>Fix:</b> Split into: SentimentPanel, FundamentalsPanel, TechnicalPanel, QuantPanel, InsiderPanel, MacroPanel, RiskPanel, RecommendationPanel.",
        "<b>Fix:</b> Define TypeScript interfaces for all props. Remove every instance of 'any'.",
    ])

    s += h2("4.4  force-dynamic + 7 DB Queries on Every Request")
    s += bullets([
        "<b>Fix:</b> Change revalidate=0 to revalidate=60 — data only updates every 15 minutes.",
        "<b>Fix:</b> Cache fundamental data in Redis with 5-minute TTL.",
        "<b>Fix:</b> Replace 30-second client polling with Server-Sent Events — push updates only when new sentiment arrives.",
    ])

    s += h2("4.5  Language Inconsistency")
    s += [p("Section labels are in Swedish (Helhetsanalys, Insynshandel) while navigation and errors are English. "
            "Pick one language. English is recommended for broader market reach.")]

    s += h2("4.6  Mobile Is Broken")
    s += bullets([
        "Search bar is hidden md:block — invisible on phones.",
        "Sidebar hover-expansion does not work on touch.",
        "<b>Fix:</b> Add bottom navigation bar for mobile. Test on iPhone SE (375×667).",
    ])

    s += h2("4.7  Missing Key Visualizations")
    s += bullets([
        "<b>Price chart with sentiment overlay</b> — the core product vision; completely absent.",
        "<b>Prediction audit trail</b> — last 20 predictions vs. actual outcomes with hit rate and Sharpe.",
        "<b>Volatility regime indicator</b> — animated state machine (Calm / Normal / Stressed / Crisis).",
        "<b>Insider trade price-impact chart</b> — annotate price chart with insider events; show what happened next.",
        "<b>Sector/peer percentile ranking</b> — 'This stock is 85th percentile in its sector by momentum.'",
    ])
    s += [pb()]

    # SECTION 5 NEXT LEVEL
    s += h1("5.  WHAT WILL TAKE THIS TO THE NEXT LEVEL")
    s += [p("Beyond fixing the issues above, these five features separate a prototype from a tool "
            "people actually rely on.")]

    s += h2("① Price + Sentiment Causality Chart  (Highest Impact)")
    s += [p("Show stock price over time with the rolling sentiment score overlaid on the same axis. Annotate "
            "moments where Granger causality was statistically significant. This makes the entire ML pipeline "
            "visible and verifiable. It is also the most compelling demo possible — users can see whether "
            "sentiment led price in the past.")]

    s += h2("② Regime-Aware Signal Weighting")
    s += [p("Change which signals are highlighted based on current market regime. Trending market → emphasise "
            "momentum and MACD. Ranging market → RSI mean-reversion and Bollinger bands. Crisis (VIX > 30) → "
            "suppress technical signals, amplify macro and liquidity. This is what separates a system from a dashboard.")]

    s += h2("③ Prediction Audit Trail")
    s += [p("Show users the last 20 predictions for the current ticker and what actually happened: hit rate, "
            "average return, maximum loss, Sharpe ratio. If the model is right 55% of the time, show it. "
            "If 40%, show that too. This is the single most trust-building feature possible.")]

    s += h2("④ The 'Why' Narrative — LLM Synthesis")
    s += [p("Replace the wall of 50 metrics with 3 sentences generated by the LLM: "
            "'RSI is oversold at 28. Insiders purchased $2.1M in the last 14 days. Sentiment turned positive "
            "after the earnings beat. Model confidence: 68%.' "
            "This is what separates a decision tool from a data museum.")]

    s += h2("⑤ Options Flow Integration")
    s += [p("Put/call ratio and unusual options activity is the single most powerful leading indicator available "
            "publicly. Unusual call buying at strikes 10–20% above current price signals institutional bullish "
            "positioning before it appears in price. Source: CBOE free feed or Unusual Whales API. "
            "Add this and you have something institutional traders actually pay for.")]
    s += [pb()]

    # SECTION 6 PRIORITY TABLE
    s += h1("6.  PRIORITISED ACTION TABLE")

    def ptbl(rows):
        col_colors = {
            "P0": C_RED, "P1": C_ORANGE, "P2": C_YELLOW, "P3": C_GREEN
        }
        hdr = [p("Priority","th"), p("Fix","th"), p("Why","th")]
        data = [hdr]
        for (pri, fix, why) in rows:
            col = col_colors.get(pri, C_TEXT)
            data.append([
                Paragraph(f"🔴 {pri}" if pri=="P0" else f"🟠 {pri}" if pri=="P1" else f"🟡 {pri}" if pri=="P2" else f"🟢 {pri}",
                          ParagraphStyle("pc", fontSize=8, leading=11, textColor=col, fontName="Helvetica-Bold")),
                p(fix,"tb"),
                p(why,"tb"),
            ])
        return [tbl(data,[22*mm,68*mm,80*mm]), sp(6)]

    s += h2("P0 — Before Anything Else")
    s += ptbl([
        ("P0","Delete hardcoded fake ticker tape","DashboardClient.tsx:327–333 — fictional data on a finance app destroys credibility"),
        ("P0","Restore Reddit OAuth authentication","scraper.ts:54–55 — trust filter gutted; entire signal is bot-contaminated"),
        ("P0","Wrap all related DB writes in prisma.$transaction()","index.ts:128–136 — crash leaves permanently incomplete financial history"),
        ("P0","Replace in-memory jobQueue with BullMQ on Redis","index.ts:17–19 — every pod restart loses all queued work"),
        ("P0","Replace individual create() loop with createMany(skipDuplicates)","index.ts:285–313 — 500 round-trips + race condition drops records silently"),
    ])

    s += h2("P1 — First Sprint")
    s += ptbl([
        ("P1","Fix HMM: expanding-window (fit T, predict T+1)","advanced_math.py:102–116 — lookahead bias makes it actively misleading"),
        ("P1","Fix Kelly formula (mean/var is not Kelly)","advanced_math.py:130–137 — wrong math in a financial app"),
        ("P1","Add prompt_version column to Sentiment table","ai.ts — every prompt change makes historical scores incomparable"),
        ("P1","Render bootstrap CI as shaded bands on distribution chart","page.tsx:79–80 — computed, burns CPU, never shown"),
        ("P1","Convert Python subprocesses to persistent FastAPI service","fundamentals.ts, quant.ts, macro.ts — zombie process accumulation"),
        ("P1","Add structured JSON logging + correlation IDs","All worker files — production outages are currently invisible"),
        ("P1","Add /health and /ready endpoints to worker","Required for container orchestration and incident response"),
    ])

    s += h2("P2 — Second Sprint")
    s += ptbl([
        ("P2","Label 500 posts; calibrate Gemini confidence scores","ai.ts — unknown if LLM scores are better than random"),
        ("P2","Build price + sentiment overlay chart","DashboardClient.tsx — the killer feature; completely absent"),
        ("P2","Replace Google/Yahoo RSS with NewsAPI or Polygon.io","scraper.ts — unofficial RSS can disappear overnight"),
        ("P2","Parse EDGAR filing content, not just metadata","scraper.ts:154–189 — material events look identical to routine filings"),
        ("P2","Fix Hurst exponent: DFA with 50+ lags on detrended series","advanced_math.py:118–128 — current formula is wrong"),
        ("P2","Monte Carlo: Student-t shocks + GARCH path propagation","advanced_math.py:165–208 — GBM underestimates downside"),
        ("P2","Commit to English throughout the frontend","Mixed Swedish/English is unprofessional"),
        ("P2","Fix mobile navigation","App is unusable on phones"),
    ])

    s += h2("P3 — Strategic")
    s += ptbl([
        ("P3","Add options flow data (CBOE or Unusual Whales)","Biggest single signal quality upgrade available"),
        ("P3","Build walk-forward backtest pipeline (5 years, annual retest)","No evidence any model outperforms buy-and-hold without this"),
        ("P3","Build prediction audit trail UI","Most trust-building feature; almost no retail tool does this honestly"),
        ("P3","Optimise recommendation weights via ridge regression on outcomes","recommendation.ts:3–10 — current weights are guesses"),
        ("P3","Regime-aware signal weighting (high-VIX → amplify macro)","Makes the system adaptive to market conditions"),
        ("P3","Replace polling with Server-Sent Events","Push updates only when new data arrives; eliminate wasted polling"),
        ("P3","Add LLM 'Why' narrative synthesis per ticker","Replace 50 metrics with 3 sentences answering: should I buy?"),
    ])
    s += [pb()]

    # SECTION 7 FAILURE FORECAST
    s += h1("7.  PRODUCTION FAILURE FORECAST")
    s += [p("If P0 and P1 items are not addressed, the following failures are predictable in order of occurrence:")]

    failures = [
        ("Week 1",   C_RED,    "DB connection pool exhaustion",
         "500 individual inserts per scrape cycle exhaust the default pool. Worker appears alive but writes nothing."),
        ("Week 1–2", C_RED,    "Python zombie process accumulation",
         "SIGTERM does not reliably kill Python. After ~10,000 spawns the system runs out of process slots. Worker crashes."),
        ("Week 2",   C_ORANGE, "Sentiment loss from race conditions",
         "Parallel workers cause duplicate hash collisions. Records silently dropped. AI spend wasted. Backtest sample biased."),
        ("Week 2–3", C_ORANGE, "AI rate limit cascade",
         "Token estimation off by 2–5× for emoji-heavy posts. Primary 429s. Fallback also 429s. Entire batch discarded."),
        ("Month 1",  C_YELLOW, "Prediction accuracy data corruption",
         "Prediction updates without transactions. Partial writes on crash corrupt accuracy metrics. False 95% accuracy reported."),
        ("Month 1+", C_YELLOW, "Bot-contaminated signal degrades recommendations",
         "Without auth + trust filters, coordinated P&D campaigns flood the DB. App follows manipulation, not fundamentals."),
    ]
    hdr = [p("When","th"), p("Failure","th"), p("What Happens","th")]
    frows = [hdr]
    for (when, col, title, desc) in failures:
        frows.append([
            Paragraph(when, ParagraphStyle("fw", fontSize=8, textColor=col, fontName="Helvetica-Bold")),
            Paragraph(title, ParagraphStyle("ft", fontSize=8.5, textColor=col, fontName="Helvetica-Bold")),
            p(desc,"tb"),
        ])
    s += [tbl(frows,[22*mm,55*mm,93*mm]), sp(8), pb()]

    # CLOSING
    s += h1("8.  CLOSING ASSESSMENT")
    s += [p("Phaeton Capital has the right vision, an exceptional visual design, and an architecturally "
            "sound foundation. The gap is between the surface appearance and the underlying rigour.")]
    s += [p("The quant models need correct implementation or removal. The data pipeline needs authentication, "
            "calibration, and reliability. The backend needs transactions, proper queuing, and observability. "
            "The frontend needs to remove fictional data and add the features that make the ML pipeline "
            "visible and trustworthy.")]
    s += [p("None of these are rewrites. They are targeted, concrete fixes — the P0 and P1 items can be "
            "completed in a single sprint. Once done, the app crosses from impressive prototype to credible product.")]
    s += [p("The price + sentiment overlay chart, the prediction audit trail, and the regime-aware signal "
            "weighting are the three features that will define whether this becomes a tool people rely on "
            "or a dashboard they visit once.")]
    s += [sp(20)]
    s += [HRFlowable(width="40%",thickness=1,color=C_GOLD,hAlign="CENTER",spaceAfter=12)]
    s += [p("END OF ASSESSMENT","cover_meta")]
    s += [p("Phaeton Capital Technical Review — 29 March 2026","cover_meta")]

    doc.build(s, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF written to: {OUTPUT}")

build()
