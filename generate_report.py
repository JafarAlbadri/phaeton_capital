#!/usr/bin/env python3
"""Generate PDF audit report for Phaeton Capital / SentimentCrowd."""

from fpdf import FPDF
from datetime import date


class AuditReport(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Phaeton Capital - Statistical Audit Report", align="L")
        self.cell(0, 8, f"{date.today().isoformat()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def title_page(self):
        self.add_page()
        self.ln(50)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(30, 30, 30)
        self.cell(0, 15, "Phaeton Capital", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(80, 80, 80)
        self.cell(0, 12, "SentimentCrowd", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_draw_color(50, 120, 200)
        self.set_line_width(0.8)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(10)
        self.set_font("Helvetica", "", 16)
        self.set_text_color(60, 60, 60)
        self.cell(0, 10, "Statistical & Mathematical Audit Report", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "Multi-Agent Deep Review", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "5 Specialists + Devil's Advocate", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(30)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 7, f"Date: {date.today().strftime('%B %d, %Y')}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "Prepared by: Claude Opus 4.6 Multi-Agent Team", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "Repository: github.com/JafarAlbadri/phaeton_capital", align="C", new_x="LMARGIN", new_y="NEXT")

    def section_title(self, title, level=1):
        if level == 1:
            self.ln(6)
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(30, 60, 120)
            self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(30, 60, 120)
            self.set_line_width(0.5)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(4)
        elif level == 2:
            self.ln(4)
            self.set_font("Helvetica", "B", 13)
            self.set_text_color(50, 80, 140)
            self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
        elif level == 3:
            self.ln(2)
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(70, 70, 70)
            self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
            self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text, indent=10):
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(x + indent)
        self.cell(5, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(0.5)

    def code_block(self, code):
        self.set_font("Courier", "", 8.5)
        self.set_fill_color(245, 245, 245)
        self.set_text_color(40, 40, 40)
        self.set_draw_color(220, 220, 220)
        x = self.get_x() + 5
        y = self.get_y()
        self.set_x(x)
        lines = code.strip().split("\n")
        h = len(lines) * 4.5 + 6
        if self.get_y() + h > self.h - 25:
            self.add_page()
            y = self.get_y()
        self.rect(x - 2, y, 180, h, style="DF")
        self.ln(3)
        for line in lines:
            self.set_x(x + 2)
            self.cell(0, 4.5, line[:95], new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def severity_badge(self, severity):
        colors = {
            "CRITICAL": (200, 30, 30),
            "HIGH": (220, 100, 30),
            "MEDIUM": (200, 170, 30),
            "LOW": (80, 160, 80),
            "FALSE POSITIVE": (150, 150, 150),
        }
        r, g, b = colors.get(severity, (100, 100, 100))
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(r, g, b)
        self.set_text_color(255, 255, 255)
        w = self.get_string_width(f" {severity} ") + 4
        self.cell(w, 5, f" {severity} ", fill=True)
        self.set_text_color(50, 50, 50)

    def finding_row(self, num, finding, file_ref, severity):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 50)
        self.cell(8, 6, f"{num}.")
        self.severity_badge(severity)
        self.cell(3, 6, "")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        remaining_w = self.w - self.get_x() - 10
        self.multi_cell(remaining_w, 5.5, finding)
        self.set_font("Courier", "", 8)
        self.set_text_color(100, 100, 100)
        self.set_x(21)
        self.cell(0, 5, file_ref, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def table_header(self, cols, widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(40, 70, 130)
        self.set_text_color(255, 255, 255)
        for col, w in zip(cols, widths):
            self.cell(w, 7, f" {col}", fill=True)
        self.ln()
        self.set_text_color(50, 50, 50)

    def table_row(self, cells, widths, fill=False):
        self.set_font("Helvetica", "", 9)
        if fill:
            self.set_fill_color(248, 248, 255)
        else:
            self.set_fill_color(255, 255, 255)
        max_h = 7
        x_start = self.get_x()
        y_start = self.get_y()
        # Calculate max height needed
        for cell, w in zip(cells, widths):
            lines = self.multi_cell(w, 5, f" {cell}", dry_run=True, output="LINES")
            h = len(lines) * 5
            if h > max_h:
                max_h = h
        # Draw cells
        for cell, w in zip(cells, widths):
            self.set_xy(x_start, y_start)
            self.cell(w, max_h, f" {cell}", fill=fill)
            x_start += w
        self.set_xy(10, y_start + max_h)


def build_report():
    pdf = AuditReport()
    pdf.alias_nb_pages()

    # ---- TITLE PAGE ----
    pdf.title_page()

    # ---- TABLE OF CONTENTS ----
    pdf.add_page()
    pdf.section_title("Table of Contents")
    toc = [
        "1. Executive Summary",
        "2. Methodology",
        "3. Architecture Overview",
        "4. Critical Findings (P0)",
        "5. High Priority Findings (P1)",
        "6. Statistical Methodology Issues",
        "7. Data Architecture Issues",
        "8. ML/AI Pipeline Issues",
        "9. Numerical Stability Issues",
        "10. Devil's Advocate: False Positives",
        "11. Devil's Advocate: Missed Issues (False Negatives)",
        "12. Recommended Action Plan",
        "13. Proposed Statistical Methods",
    ]
    for item in toc:
        pdf.bullet(item, indent=5)

    # ---- 1. EXECUTIVE SUMMARY ----
    pdf.add_page()
    pdf.section_title("1. Executive Summary")
    pdf.body_text(
        "This report presents findings from a comprehensive multi-agent statistical and mathematical "
        "audit of the Phaeton Capital / SentimentCrowd codebase. The review was conducted by five "
        "specialist agents (Statistician, Quantitative Financial Analyst, Data Architect, ML/AI Engineer, "
        "Systems Programmer) followed by a Devil's Advocate review to identify false positives and missed issues."
    )
    pdf.ln(2)
    pdf.body_text(
        "The primary goal was to ensure statistical significance across all mathematical computations, "
        "identify flawed assumptions, and recommend rigorous methods for a production-grade sentiment "
        "analysis platform."
    )
    pdf.ln(2)
    pdf.section_title("Key Metrics", level=2)

    metrics = [
        ("Files analyzed", "12"),
        ("Specialist agents", "5 + 1 Devil's Advocate"),
        ("Critical findings (P0)", "3"),
        ("High priority findings (P1)", "5"),
        ("Medium priority findings (P2)", "6"),
        ("False positives identified", "4"),
        ("Missed issues found by Devil's Advocate", "10"),
    ]
    widths = [110, 60]
    pdf.table_header(["Metric", "Value"], widths)
    for i, (m, v) in enumerate(metrics):
        pdf.table_row([m, v], widths, fill=(i % 2 == 0))
    pdf.ln(4)

    pdf.body_text(
        "VERDICT: The system presents AI-generated sentiment scores as if they were validated market data. "
        "The trust scoring mechanism operates on fabricated (random) data, the statistical distribution model "
        "is mathematically inappropriate, and there is no evaluation pipeline to validate AI accuracy. "
        "A user making investment decisions based on this dashboard has no statistical basis to trust the numbers."
    )

    # ---- 2. METHODOLOGY ----
    pdf.add_page()
    pdf.section_title("2. Methodology")
    pdf.body_text("The audit was performed by six specialized AI agents working in parallel:")
    agents = [
        ("Statistician", "Gaussian distributions, significance testing, Bayesian inference, bootstrap methods"),
        ("Quantitative Analyst", "Financial calculations, trust scoring, signal pipeline, fat-tail distributions"),
        ("Data Architect", "Data model, bias analysis, sampling bias, survivorship bias, pipeline architecture"),
        ("ML/AI Engineer", "AI pipeline, prompt engineering, model evaluation, calibration, drift detection"),
        ("Systems Programmer", "Numerical stability, floating point issues, edge cases, algorithmic correctness"),
        ("Devil's Advocate", "False positive screening, false negative identification, practical risk assessment"),
    ]
    widths = [45, 140]
    pdf.table_header(["Agent", "Focus Area"], widths)
    for i, (a, f) in enumerate(agents):
        pdf.table_row([a, f], widths, fill=(i % 2 == 0))

    # ---- 3. ARCHITECTURE OVERVIEW ----
    pdf.add_page()
    pdf.section_title("3. Architecture Overview")
    pdf.body_text(
        "Phaeton Capital / SentimentCrowd is a monorepo sentiment analysis platform consisting of:"
    )
    pdf.bullet("Next.js 15 web dashboard (apps/web) - port 3000")
    pdf.bullet("Bun worker service (apps/worker) - port 8080, scrapes Reddit/Google News/Yahoo Finance")
    pdf.bullet("PostgreSQL 15 database with Prisma ORM (packages/db)")
    pdf.bullet("Google Gemini AI (gemini-2.5-flash) for sentiment classification")
    pdf.bullet("Python subprocess (yfinance) for fundamental financial data")
    pdf.bullet("Docker Compose for orchestration")
    pdf.ln(2)
    pdf.body_text("Data flow: Worker scrapes social media/news every 15 minutes -> AI labels sentiment -> "
                  "stores in PostgreSQL -> Dashboard reads and visualizes with Gaussian distribution curve.")

    # ---- 4. CRITICAL FINDINGS (P0) ----
    pdf.add_page()
    pdf.section_title("4. Critical Findings (P0)")

    pdf.section_title("4.1 Trust Score Based on Math.random()", level=2)
    pdf.body_text(
        "SEVERITY: CRITICAL. The entire anti-manipulation pipeline is rendered meaningless because "
        "author_karma and account_age_days for Reddit posts are generated using Math.random(), not "
        "fetched from the Reddit API."
    )
    pdf.code_block(
        "// scraper.ts:50-51\n"
        "const pseudoKarma = Math.floor(Math.random() * 5000);\n"
        "const pseudoAgeDays = Math.floor(Math.random() * 300);"
    )
    pdf.body_text(
        "computeTrustScore() requires karma > 100 and ageDays > 30. With random values: "
        "P(karma > 100) = 98%, P(age > 30) = 90%. Combined: ~88% of posts pass the trust filter "
        "regardless of whether they are bots or legitimate users. The remaining ~12% are randomly "
        "excluded and their sentiment is set to 0, introducing artificial neutral bias."
    )
    pdf.body_text("Confirmed by: Quantitative Analyst, Data Architect, Systems Programmer, Devil's Advocate.")

    pdf.section_title("4.2 Unauthenticated /api/scrape Endpoint", level=2)
    pdf.body_text(
        "SEVERITY: CRITICAL (discovered by Devil's Advocate - missed by all 5 specialists). "
        "The /api/scrape endpoint accepts POST requests without any authentication or rate limiting. "
        "Each scrape triggers Gemini API calls (which cost money), database writes, and Python subprocesses. "
        "An attacker can trigger unlimited scrapes, exhausting API credits."
    )

    pdf.section_title("4.3 Overly Aggressive AI Fallback Condition", level=2)
    pdf.body_text(
        "SEVERITY: CRITICAL. The fallback to gemini-1.5-flash triggers on ALL HTTP errors, not just 429 rate limits."
    )
    pdf.code_block(
        "// ai.ts:88 - the !!err?.status catches ALL errors with status\n"
        "if (err?.message?.includes('429') || err?.status === 429\n"
        "    || err?.message?.includes('Quota') || !!err?.status) {"
    )
    pdf.body_text(
        "This means authentication errors (401), bad requests (400), and server errors (500) all silently "
        "fall back to a different model with different calibration. No logging records which model generated "
        "each result, making the database non-reproducible."
    )

    # ---- 5. HIGH PRIORITY (P1) ----
    pdf.add_page()
    pdf.section_title("5. High Priority Findings (P1)")

    findings_p1 = [
        ("Missing database index on ticker in Sentiment table",
         "schema.prisma - Sentiment model",
         "Case-insensitive findMany queries on ticker without index cause sequential scans. "
         "Performance degrades exponentially as data grows (hundreds of new posts every 15 minutes)."),
        ("Untrusted posts set to sentiment=0 instead of excluded",
         "index.ts:197",
         "finalSentiment = isTrusted ? aiResult.sentiment : 0. Posts with sentiment=0 are saved to the database "
         "and included in aggregation, artificially pulling the Gaussian mean toward neutral. They should be "
         "excluded entirely or flagged with an 'excluded' field."),
        ("Unhandled Promise in worker HTTP handler",
         "index.ts:248",
         "processPosts() is called fire-and-forget without await or .catch(). Unhandled promise rejections "
         "can crash the Bun worker process."),
        ("Race condition on concurrent /trigger calls",
         "index.ts:248",
         "No mutex or lock prevents concurrent processPosts() executions. Multiple /trigger calls or "
         "cron overlap results in duplicate API calls to Gemini (wasting credits) and potential data corruption."),
        ("No AI model version logged in database",
         "ai.ts, schema.prisma",
         "The database schema has no field for which AI model produced each sentiment score. When fallback "
         "is used, data from different models with different calibrations is mixed without traceability."),
    ]

    for i, (title, ref, desc) in enumerate(findings_p1):
        pdf.section_title(f"5.{i+1} {title}", level=3)
        pdf.set_font("Courier", "", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, ref, new_x="LMARGIN", new_y="NEXT")
        pdf.body_text(desc)

    # ---- 6. STATISTICAL METHODOLOGY ----
    pdf.add_page()
    pdf.section_title("6. Statistical Methodology Issues")

    pdf.section_title("6.1 Gaussian Distribution on Bounded Data", level=2)
    pdf.body_text(
        "The dashboard uses a Gaussian PDF to model sentiment values bounded to [-1, 1]. A normal "
        "distribution has support on (-inf, +inf) and leaks probability mass outside the valid range. "
        "While the Devil's Advocate assessed this as ~80% false positive (acceptable for visualization), "
        "the following sub-issues are real:"
    )
    pdf.bullet("No normality test (Shapiro-Wilk, Kolmogorov-Smirnov) is performed")
    pdf.bullet("Sentiment data is likely bimodal (clusters at bullish/bearish extremes)")
    pdf.bullet("The truncated PDF is not renormalized - integral over [-1,1] != 1")
    pdf.bullet("stdDev fallback to 0.2 is arbitrary and undocumented")

    pdf.section_title("6.2 No Statistical Significance Testing", level=2)
    pdf.body_text(
        "The dashboard labels sentiment as 'Bullish' (mean > 0.2) or 'Bearish' (mean < -0.2) without "
        "any significance test. These arbitrary thresholds have no statistical basis. Required:"
    )
    pdf.bullet("One-sample t-test: show Bullish/Bearish ONLY when p < 0.05")
    pdf.bullet("Bootstrap 95% confidence interval around the mean")
    pdf.bullet("Effect size (Cohen's d) relative to noise level")
    pdf.bullet("Power analysis: with n~100-250 posts, can we detect meaningful shifts?")

    pdf.section_title("6.3 Independence Assumption Violated", level=2)
    pdf.body_text(
        "Standard statistical tests assume independent observations. Reddit posts violate this: "
        "posts in the same thread are correlated, bandwagon effects exist, same authors post multiple times, "
        "and different news sources report the same event. No corrections are applied "
        "(cluster-robust standard errors, HAC estimators)."
    )

    pdf.section_title("6.4 No Confidence Intervals", level=2)
    pdf.body_text(
        "Market Consensus is displayed as a point estimate without uncertainty. A mean of 15% based "
        "on 10 posts should look completely different from the same mean based on 1000 posts. "
        "At minimum: display mean +/- 1.96*SE with sample size n."
    )

    # ---- 7. DATA ARCHITECTURE ----
    pdf.add_page()
    pdf.section_title("7. Data Architecture Issues")

    pdf.section_title("7.1 Sampling Bias", level=2)
    pdf.bullet("Reddit search returns max 100 posts per request with no pagination")
    pdf.bullet("Only 3 English-language sources out of hundreds of possible platforms")
    pdf.bullet("Google News URL hardcoded to hl=en-US&gl=US - blind to non-English sentiment")
    pdf.bullet("15-minute scrape interval can miss intraday sentiment spikes")

    pdf.section_title("7.2 Survivorship Bias", level=2)
    pdf.bullet("Deleted Reddit posts are never captured")
    pdf.bullet("Shadowbanned/banned accounts invisible in search results")
    pdf.bullet("Moderator-removed posts (aggressive in WSB) not captured")
    pdf.bullet("Sample systematically biased toward posts that 'survived' moderation")

    pdf.section_title("7.3 Volume Bias", level=2)
    pdf.bullet("No normalization per time window - 200 posts one day vs 10 posts next day weighted equally")
    pdf.bullet("No normalization per source - Reddit dominates despite potentially lower quality")
    pdf.bullet("take: 250 represents variable time periods depending on activity level")

    pdf.section_title("7.4 Missing Provenance", level=2)
    pdf.bullet("No 'source' column - impossible to distinguish Reddit from news data in retrospect")
    pdf.bullet("No scrape_batch_id - no way to trace data lineage")
    pdf.bullet("No collection_timestamp separate from post_timestamp")
    pdf.bullet("Fabricated metadata (random karma/age) stored as if real")

    pdf.section_title("7.5 Destructive Insider Data Handling", level=2)
    pdf.body_text(
        "index.ts:82-84 uses deleteMany + createMany without a transaction wrapper. "
        "If createMany fails after deleteMany, all insider data is permanently lost."
    )

    # ---- 8. ML/AI PIPELINE ----
    pdf.add_page()
    pdf.section_title("8. ML/AI Pipeline Issues")

    pdf.section_title("8.1 No Ground Truth or Evaluation", level=2)
    pdf.body_text(
        "The AI model labels sentiment without any validation against actual market outcomes. "
        "No precision, recall, F1, confusion matrix, or ROC-AUC metrics exist. While the Devil's Advocate "
        "noted this is acceptable for an MVP, it means the system is an unvalidated hypothesis generator."
    )

    pdf.section_title("8.2 Non-Deterministic Output", level=2)
    pdf.body_text(
        "Temperature is never set in the Gemini API call (ai.ts:47-59). The same post can produce "
        "different sentiment scores on different runs. Setting temperature=0 would ensure reproducibility."
    )

    pdf.section_title("8.3 Circular Confidence Score", level=2)
    pdf.body_text(
        "The model generates its own confidence (ai.ts:37), which is fundamentally flawed from an ML "
        "perspective. LLMs are notoriously overconfident and poorly calibrated. Confidence 0.9 from Gemini "
        "does not mean 90% probability of correctness. No calibration curve has been validated."
    )

    pdf.section_title("8.4 Batch Context Contamination", level=2)
    pdf.body_text(
        "Posts are batched by token count (max 4000 tokens, max 25 posts). Each batch is an isolated API call. "
        "A bearish post in a predominantly bullish batch may receive anchoring bias from surrounding context."
    )

    pdf.section_title("8.5 Confidence Not Used in Aggregation", level=2)
    pdf.body_text(
        "The confidence field is stored in the database but never used in downstream calculations. "
        "All posts are weighted equally regardless of confidence level."
    )

    # ---- 9. NUMERICAL STABILITY ----
    pdf.add_page()
    pdf.section_title("9. Numerical Stability Issues")

    pdf.section_title("9.1 Confirmed Issues", level=2)
    num_issues = [
        ("Gaussian PDF formula", "CORRECT - matches mathematical definition"),
        ("Mean calculation", "CORRECT - empty array check present"),
        ("Variance calculation", "CORRECT - uses Bessel's correction (n-1)"),
        ("SHA-256 hash", "CORRECT - deterministic for same input"),
        ("Date/time handling", "CORRECT - proper UTC conversion"),
        ("safe_float() in Python", "CORRECT - handles None, NaN, Inf"),
    ]
    widths_n = [70, 115]
    pdf.table_header(["Operation", "Status"], widths_n)
    for i, (op, st) in enumerate(num_issues):
        pdf.table_row([op, st], widths_n, fill=(i % 2 == 0))

    pdf.ln(4)
    pdf.section_title("9.2 Issues Found", level=2)

    pdf.section_title("shares_out fallback to 1", level=3)
    pdf.body_text(
        "yfinance_fetcher.py:43 - if both sharesOutstanding and impliedSharesOutstanding are missing, "
        "shares_out defaults to 1. This produces absurd EPS values (e.g., billions per share). "
        "Should return None instead."
    )

    pdf.section_title("Token estimation inaccuracy", level=3)
    pdf.body_text(
        "index.ts:153 estimates 1 token per 4 characters. Unicode/emoji-heavy text can be "
        "1 token per 1-2 characters, causing batches to exceed MAX_TOKENS_PER_BATCH."
    )

    # ---- 10. FALSE POSITIVES ----
    pdf.add_page()
    pdf.section_title("10. Devil's Advocate: False Positives")
    pdf.body_text(
        "The following findings from the specialist agents were assessed as partially or fully overstated:"
    )

    fps = [
        ("Gaussian PDF 'statistically invalid'", "~80%",
         "Used only for visualization, not inference. KDE/Beta-distribution is academically correct "
         "but disproportionate for a dashboard. The visual approximation is adequate."),
        ("'No ground truth' as a blocker", "~60%",
         "Correct as a future improvement, but unreasonable as a P0 requirement for an MVP prototype. "
         "The system uses a well-known LLM with a structured prompt."),
        ("Division by zero at RPM_LIMIT=0", "~90%",
         "Default is 4, configured in docker-compose.yml and .env.example. No sensible user sets RPM=0. "
         "JavaScript returns Infinity (hangs, no crash)."),
        ("NaN propagation corrupts Gaussian", "~50%",
         "PostgreSQL can store NaN in float columns, but Gemini practically never returns NaN. "
         "Possible but extremely unlikely in normal operation."),
    ]
    widths_fp = [55, 20, 110]
    pdf.table_header(["Finding", "FP %", "Assessment"], widths_fp)
    for i, (f, p, a) in enumerate(fps):
        pdf.table_row([f, p, a], widths_fp, fill=(i % 2 == 0))

    # ---- 11. FALSE NEGATIVES ----
    pdf.add_page()
    pdf.section_title("11. Devil's Advocate: Missed Issues")
    pdf.body_text(
        "The following problems were missed by all 5 specialist agents and discovered by the Devil's Advocate:"
    )

    fns = [
        ("Unauthenticated /api/scrape", "HIGH",
         "No auth or rate-limiting. Anyone can trigger costly Gemini API calls."),
        ("Race condition on /trigger", "MEDIUM",
         "No mutex - concurrent calls waste API credits and may corrupt data."),
        ("Missing ticker index", "MEDIUM",
         "Sequential scan on case-insensitive queries. Degrades with data growth."),
        ("Unhandled Promise", "MEDIUM",
         "processPosts() fire-and-forget can crash the worker on errors."),
        ("Cheerio imported but unused", "LOW", "Dead import in fundamentals.ts."),
        ("Playwright dependency unused", "LOW", "~100MB unused dependency in Docker image."),
        ("Hardcoded Docker path", "LOW", "/app/apps/worker/... breaks local development."),
        ("yahoo-finance2 in web pkg", "LOW", "Unused dependency in frontend package.json."),
        ("BigInt serialization risk", "LOW", "Safe now but design weakness for large values."),
        ("Prisma connection pool", "LOW-MED", "Default 5 connections, hundreds of queries per run."),
    ]
    widths_fn = [55, 20, 110]
    pdf.table_header(["Issue", "Severity", "Description"], widths_fn)
    for i, (issue, sev, desc) in enumerate(fns):
        pdf.table_row([issue, sev, desc], widths_fn, fill=(i % 2 == 0))

    # ---- 12. ACTION PLAN ----
    pdf.add_page()
    pdf.section_title("12. Recommended Action Plan")

    pdf.section_title("Phase 1 - Critical (breaks fundamental validity)", level=2)
    pdf.bullet("Fix Math.random() trust score - implement real Reddit OAuth API or remove trust filter entirely")
    pdf.bullet("Add authentication + rate-limiting on /api/scrape endpoint")
    pdf.bullet("Fix AI fallback condition - only trigger on 429, not all HTTP errors")
    pdf.bullet("Add temperature: 0 to Gemini API calls for reproducibility")
    pdf.bullet("Add database index on ticker in Sentiment table")

    pdf.section_title("Phase 2 - High (data quality & rigor)", level=2)
    pdf.bullet("Add source, ai_model, scrape_batch_id columns to Sentiment schema")
    pdf.bullet("Range-validate AI output: sentiment in [-1,1], confidence in [0,1]")
    pdf.bullet("Exclude untrusted posts instead of setting sentiment=0")
    pdf.bullet("Await/catch processPosts() in HTTP handler")
    pdf.bullet("Add mutex against concurrent scrapes")
    pdf.bullet("Wrap destructive insider data operations in transactions")

    pdf.section_title("Phase 3 - Statistical rigor", level=2)
    pdf.bullet("Bootstrap 95% confidence intervals around sentiment mean")
    pdf.bullet("One-sample t-test: show Bullish/Bearish ONLY at p < 0.05")
    pdf.bullet("Confidence-weighted sentiment aggregation")
    pdf.bullet("Exponential decay for temporal weighting (48h half-life)")
    pdf.bullet("Display sample size (n) alongside all statistics")

    pdf.section_title("Phase 4 - Advanced (quantitative edge)", level=2)
    pdf.bullet("Bayesian inference with Beta prior for incremental posterior updates")
    pdf.bullet("Kernel Density Estimation (KDE) instead of parametric Gaussian")
    pdf.bullet("Granger causality test: does sentiment actually lead price?")
    pdf.bullet("Hidden Markov Model for regime detection (bull/bear/sideways)")
    pdf.bullet("Inter-rater reliability: run same posts through 3+ models (Krippendorff's alpha)")
    pdf.bullet("Kelly Criterion for position sizing based on sentiment edge")
    pdf.bullet("Hurst exponent for momentum vs mean-reversion classification")
    pdf.bullet("Monte Carlo stress tests on sentiment signals")
    pdf.bullet("Sector-adjusted Z-scores for financial metrics")

    pdf.section_title("Phase 5 - Cleanup", level=2)
    pdf.bullet("Remove unused dependencies: cheerio, playwright, yahoo-finance2")
    pdf.bullet("Make Python path configurable (not hardcoded Docker path)")
    pdf.bullet("Add NaN filter before sentiment calculations")

    # ---- 13. PROPOSED METHODS ----
    pdf.add_page()
    pdf.section_title("13. Proposed Statistical Methods")

    pdf.section_title("13.1 Beta Distribution (replaces Gaussian)", level=2)
    pdf.body_text(
        "Sentiment [-1,1] transformed to [0,1] via (x+1)/2, modeled with Beta(alpha, beta). "
        "Method of Moments estimation: alpha = mean * C, beta = (1-mean) * C, "
        "where C = (mean*(1-mean)/variance) - 1."
    )

    pdf.section_title("13.2 Bootstrap Confidence Intervals", level=2)
    pdf.body_text(
        "Resample n observations with replacement 10,000 times. Compute mean for each bootstrap sample. "
        "Sort means and take 2.5th and 97.5th percentiles as 95% CI bounds. "
        "Display as: 'Market Consensus: 34% Bullish [95% CI: 21%-47%]'"
    )

    pdf.section_title("13.3 Kernel Density Estimation (KDE)", level=2)
    pdf.body_text(
        "Non-parametric density estimation using Gaussian kernels with Silverman's rule-of-thumb bandwidth: "
        "h = 1.06 * sigma * n^(-1/5). Makes no assumptions about underlying distribution shape. "
        "Captures multimodality (bullish/bearish clusters) that Gaussian misses."
    )

    pdf.section_title("13.4 Logistic Trust Function", level=2)
    pdf.body_text(
        "Replace binary trust score with continuous sigmoid: "
        "trustWeight = sigmoid(karma, 500, 0.01) * sigmoid(ageDays, 60, 0.05). "
        "Produces values in [0, 1] with gradual transition instead of hard cutoff."
    )

    pdf.section_title("13.5 Exponential Decay Weighting", level=2)
    pdf.body_text(
        "Weight = exp(-ln(2) * hoursAgo / halfLife). With 48h half-life: "
        "posts from 2 days ago weigh 50%, 4 days = 25%, 1 week = 6.25%. "
        "Ensures recent sentiment dominates without discarding older data entirely."
    )

    pdf.section_title("13.6 Signal-to-Noise Ratio (SNR)", level=2)
    pdf.body_text(
        "SNR = |mean(sentiment)| / stddev(sentiment). "
        "SNR < 1 means noise dominates and the signal is unreliable. "
        "Display SNR alongside sentiment to indicate confidence in the directional signal."
    )

    pdf.section_title("13.7 Granger Causality", level=2)
    pdf.body_text(
        "Test whether lagged sentiment values improve prediction of price changes beyond "
        "what lagged prices alone provide. Requires time-aligned series at equal frequency. "
        "F-test comparing restricted (price-only) vs unrestricted (price + sentiment) regression. "
        "If p < 0.05, sentiment Granger-causes price movement."
    )

    # ---- FINAL PAGE ----
    pdf.add_page()
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 10, "End of Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 7, "Prepared by Claude Opus 4.6 Multi-Agent Team", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Date: {date.today().strftime('%B %d, %Y')}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "6 agents | 12 files | 24 findings", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(15)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(0, 7, "This report was generated automatically. All findings should be verified", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "against the current state of the codebase before taking action.", align="C", new_x="LMARGIN", new_y="NEXT")

    output_path = "AUDIT_REPORT_Statistical_Review.pdf"
    pdf.output(output_path)
    print(f"Report generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_report()
