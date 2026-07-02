# Improvement Roadmap — five-expert first-principles review (2026-07-02)

Five parallel expert reviews (quant researcher, hedge-fund PM/risk, financial
economist, mathematician/statistician, staff engineer) of the whole platform.
This file is the synthesis. Items marked **[n×]** were found independently by
n reviewers — treat convergence as priority signal.

## Tier 0 — bug-level fixes, hours (do first)

| # | Fix | Where | Found by |
|---|-----|-------|----------|
| 0.1 | Kelly clamp is one-sided: `Math.min(k*25, 15)` → range [−25,+15]. Make it `clamp(k*25, −15, 15)` | recommendation.ts:236, main.py:417 | mathematician, quant [2×] |
| 0.2 | optimize-weights uses standardized coefs on raw scores — divide by `scaler.scale_[:6]` before normalizing; cut ML blend 70%→30% until validated | main.py:975-986 | mathematician, quant [2×] |
| 0.3 | Silent wedge chain: Python endpoints `async def` with blocking yfinance/sklearn (→ `def` for threadpool); contrarian fetch missing timeout (index.ts:447); `isScraping` early-return reports SUCCESS (→ throw/delay); DB-error dedup `return` converts failure→success | main.py, index.ts | architect |
| 0.4 | Seed + convergence-check HMM (multi-restart, label by mean/σ, reject if means indistinguishable) and seed Monte Carlo; report MC median not mean (t(4) ⇒ E[e^shock] divergent) | advanced_math.py:110, 242 | mathematician |
| 0.5 | AnalysisSection reads `riskProfile.sharpe_ratio`/`.value_at_risk` — fields don't exist (live in QuantMetrics) → Sharpe/VaR text never renders; liquidity narrative thresholds 0.7/0.4 vs actual scale 0.001-0.02 | AnalysisSection.tsx:183-201 | PM |
| 0.6 | Hofstede fed `macro.sector_etf` ('XLK') instead of an exchange code → profile never written. Wire correctly or delete (economist: decorative for a 100% US universe either way) | index.ts:280, hofstede.ts | economist |
| 0.7 | Unknown Reddit authors (beyond first 30 profile lookups) default karma 500/age 100 ⇒ full trust 1.0 — bot account #31 sails through. Default unknowns to ~0.3 | scraper.ts:81-105 | economist |
| 0.8 | Missing risk profile defaults to rating 1 (safest) — make it 3 + "unrated" flag | recommendation.ts:295 | PM |
| 0.9 | Recurring/scheduled jobs have no `attempts` (manual has 5) — unify retry policy | index.ts:705-716 | architect |
| 0.10 | `mode: 'insensitive'` ticker filters defeat indexes (tickers are canonical uppercase at write); add `@@index([ticker, horizon, createdAt])` on PredictionRecord; Sentiment sorts on post_timestamp but index is createdAt | page.tsx:61, quant.ts:52, schema.prisma | architect |
| 0.11 | Pin all Python deps (yfinance/numpy/pandas/sklearn unpinned — container breaks on rebuild) | requirements.txt | architect |
| 0.12 | Trends z-score includes the latest point in its own baseline; unusual-options-volume flag is a tautology (`vol > 2·vol/n_expiries`) | main.py | economist, mathematician |

## Tier 1 — point-in-time data layer, days **(the unlock)**

**[3×] Prediction resolution uses "price whenever the job next ran"** — outcomes
for a "15d" horizon resolve at 15-25d against possibly stale cached prices.
These mislabeled outcomes feed the audit stats, the IC panel AND the ML weight
training: the platform learns from corrupted labels.

- Add `PriceSnapshot(ticker, date, close)` — append daily in syncFundamentals.
- Resolve predictions against the actual t+N close (fetch from history if needed).
- Resolve ALL pending records past cutoff in a sweep, independent of scan status
  (unresolved tickers = survivorship in the training pool).
- Add `ScoreSnapshot(ticker, horizon, composite, 6 components, createdAt)`
  appended next to the RecommendationScore upsert [2×: architect, PM] —
  enables real score-over-time charts (today faked from PredictionRecords),
  "what changed since yesterday" diffing, and eventually a TRUE composite
  backtest including sentiment (today 60% of composite weight is untested —
  backtest pins sentiment/fundamental/insider/macro at 50).

## Tier 2 — an honest learning loop, ~week

**[3×] /optimize-weights cannot falsify anything today:**
- StratifiedKFold(shuffle) over records whose 15-90d outcome windows overlap
  ~93% ⇒ near-duplicates in train AND test ⇒ accuracy_cv systematically
  optimistic (winner's-curse over 10 C-candidates on top).
- Target "was my own signal CORRECT" conflates direction & magnitude; additive
  direction term can't flip component slopes between BUY/SELL rows; HOLD rows
  mix a volatility target into a direction model.
- Pools all tickers (universe selected on past sentiment fame ⇒ selection on
  the dependent variable) and all horizons; macro has ~no cross-sectional
  variance ⇒ unidentified coefficient.

Rebuild: target = direction-signed forward return (or per-component Spearman
IC), time-ordered purged K-fold with embargo ≥ horizon, per-horizon training,
score×direction interactions, group folds by calendar time, demean per date.

## Tier 3 — signal quality

- **Sentiment (largest weight):** shrink toward 50 by Kish effective sample
  size (today n=11 ≡ n=500), orthogonalize against trailing 5-day return
  (attention/posting follows price — else it's a lagged-momentum echo), fix
  Bayes posterior collapse with the same ESS (posterior std 0.02 from 500
  "independent" posts is dishonest). [economist + mathematician]
- **One datum, one component:** HMM in regime weights only (today: weights +
  quant ±15 + ML feature); one trailing-μ transform in quant (today Kelly +
  MC-mean + HMM ≈ triple momentum); VIX once (today: CRISIS weights + macro
  penalty + 60% of homemade fear_greed); move PCR/Trends out of sentiment into
  a flow component. Delete fear_greed (linear recombination of inputs already
  used). [quant + economist]
- **Insider per the literature:** purchases predict, sales mostly don't
  (10b5-1/diversification). Score cluster buys (distinct insiders), officer >
  director, size vs holdings; treat sales as neutral unless abnormal. Today
  mega-caps sit at a permanent bearish tilt from routine sale programs. [economist]
- **Replace step-nudges with smooth transforms** (percentile/z), calibrate
  thresholds on the panel, keep a 6-month untouched holdout. [quant]
- **Backtest realism:** 10-20bps/side, borrow cost or long-only toggle,
  next-open entry, live outcome definition (±2%√t band), beta-adjusted alpha
  with t-stat, date-aligned dividend-inclusive benchmark. [3×]

## Tier 4 — product (PM lens)

- **Position table + exposure panel** — the "category error": per-ticker Kelly
  advice with no book. `Position(ticker, qty, entry_px, entry_date, stop)` +
  gross/net, per-name weight, portfolio σ/VaR from held-name correlations, cap
  displayed Kelly at min(0.25·Kelly, 10% NAV).
- **Actionability:** stop = entry − 1.5·ATR (field exists), target =
  min(analyst, mc_p75), time-stop = horizon; invalidation levels in Bottom Line
  ("flips SELL below composite 45 ≈ price $X") — composite is linear, solvable.
- **Earnings gating:** event_risk_flag is computed and rendered nowhere; halve
  size + widen stops within 7d of earnings; backtests skip entries near earnings.
- **Confidence that means something:** blend |composite−50|, per-class
  historical hit rate; today a 55.1 coin-flip can print 100% confidence.
- Testing (engineer): extract pure scoring functions from computeRecommendation
  + table-driven tests; pytest via TestClient for optimize-weights/backtests;
  parity test so Python backtest weights can't drift from recommendation.ts.
- page.tsx: parallelize ~16 independent queries (waterfall today), extract data
  layer; observability: end-of-run summary log line, stop swallowing catches.

## Panel votes for "the one change first"
- Architect: the silent wedge chain (0.3) — only failure that halts everything invisibly.
- Quant + mathematician: the honest optimizer (Tier 2 + 0.2) — the loop every metric flows through.
- Economist: sentiment shrinkage + price-orthogonalization — the flagship input.
- PM: the Position table — everything else is calibration; this is the category error.

Synthesis order: Tier 0 (hours, includes the wedge) → Tier 1 (resolution
labels — three reviewers converged on it and every self-evaluation metric
inherits it) → Tier 2 → Tier 3/4 as parallel tracks.
