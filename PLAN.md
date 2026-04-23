# Phaeton Capital — Implementation Plan

**Status:** Ready for execution
**Created:** 2026-04-24
**Context:** 2,039-line monolithic DashboardClient.tsx, zero tests, signal/price mismatch bugs, simplified backtest not using real composite score. This plan addresses all four issues in priority order.

---

## Overview

| # | Task | Impact | Est. Files Changed |
|---|------|--------|-------------------|
| 1 | Refactor DashboardClient.tsx into components | Maintainability | ~10 new files, 1 rewritten |
| 2 | Wire composite backtest to UI | Correctness | 2 files |
| 3 | Add tests for core signal/scoring logic | Reliability | ~3 new files, 1 config |
| 4 | Enable TypeScript strict mode | Safety | 1 config, ~5-10 files with fixes |

---

## Task 1: Refactor DashboardClient.tsx

### Goal
Break the 2,039-line `apps/web/app/DashboardClient.tsx` into ~10 focused components. Each section is currently delimited by comment blocks like `{/* ── SECTION NAME ── */}`.

### Section Map (current line numbers)

| Lines | Section | Extract To |
|-------|---------|------------|
| 1–92 | Imports + utility functions (AnimatedNumber, SIGNAL_STYLES, getSignal, signalFromPct, formatRecommendation) | `components/dashboard/utils.ts` |
| 93–176 | Tile, ScoreBar, ConfidenceGauge, CustomTooltip | `components/dashboard/shared.tsx` |
| 396–477 | Loading overlay + Command palette | `components/dashboard/CommandPalette.tsx` |
| 479–577 | Top bar + Sidebar + Mobile nav | `components/dashboard/Navigation.tsx` |
| 582–793 | Hero section (signal display, horizon tabs, recommended price, confidence gauge, score weights) | `components/dashboard/HeroSignal.tsx` |
| 795–861 | Fundamentals tiles + Analyst target range + Cross-listing | `components/dashboard/FundamentalsSection.tsx` |
| 863–959 | Pre-earnings setup + Short squeeze indicator | `components/dashboard/EarningsAndSqueeze.tsx` |
| 961–1062 | Technical analysis (indicators grid + risk profile) | `components/dashboard/TechnicalSection.tsx` |
| 1064–1223 | Macro & Quant section + Backtest panel | `components/dashboard/MacroQuantBacktest.tsx` |
| 1225–1346 | Charts (sentiment distribution, Gaussian, trends, velocity) | `components/dashboard/SentimentCharts.tsx` |
| 1348–1411 | Insider trades table + monthly flow chart | `components/dashboard/InsiderSection.tsx` |
| 1413–1679 | Comprehensive Analysis (HELHETSANALYS — narrative text + dimension cards + verdict) | `components/dashboard/ComprehensiveAnalysis.tsx` |
| 1681–1692 | Watchlist Screener (just wraps ScreenerGrid) | Keep inline (3 lines) |
| 1694–1804 | Prediction audit trail table | `components/dashboard/PredictionHistory.tsx` |
| 1806–2034 | Alpha attribution (IC, hit-rate table, transfer entropy, Granger) | `components/dashboard/AlphaAttribution.tsx` |

### How to execute

1. Create directory `apps/web/components/dashboard/`
2. Create `utils.ts` — move these pure functions:
   - `SIGNAL_STYLES` (line 68–74)
   - `getSignal()` (line 75–77)
   - `signalFromPct()` (line 79–86)
   - `formatRecommendation()` (line 88–91)
   - Export all as named exports
3. Create `shared.tsx` — move these small UI components:
   - `AnimatedNumber` (line 45–64)
   - `Tile` (line 93–118)
   - `ScoreBar` (line 120–136)
   - `ConfidenceGauge` (line 138–176)
   - `CustomTooltip` (line 178–197)
   - Each needs its own props interface (replace `any` types)
4. For each section component:
   - Accept only the props it needs (not the entire `any` blob)
   - Define a typed props interface
   - Import shared components and utils
5. Rewrite `DashboardClient.tsx` to:
   - Import all section components
   - Keep state and hooks (lines 200–392) in the main component
   - Pass props down to each section
   - The main component should be ~150-200 lines: state + layout grid

### Props typing

Currently the main component takes `any` for all props. Define an interface:

```typescript
// types.ts
export interface DashboardProps {
  recentSentiments: Sentiment[];
  manipulationStats: { organicCount: number; manipulatedCount: number; totalCount: number } | null;
  targetKeyword: string;
  fundamentalData: FundamentalData | null;
  financialHistory: FinancialHistory[];
  gaussianData: { mean: number; stdDev: number; bins: { x: number; y: number }[] } | null;
  insiderTrades: InsiderTrade[];
  quantMetrics: QuantMetrics | null;
  technicalIndicators: TechnicalIndicators | null;
  macroIndicators: MacroIndicators | null;
  riskProfile: RiskProfile | null;
  recommendationScore: RecommendationScore | null;
  recommendationScores: { h15: RecommendationScore | null; h30: RecommendationScore | null; h90: RecommendationScore | null } | null;
  predictionAccuracy: number | null;
  predictionCount: number;
  predictionHistory: PredictionRecord[];
  auditStats: any;
  trendsHistory: { week_start: string; interest: number }[];
  crossListingData: CrossListingData | null;
  regionalSentiment: RegionalSentiment[];
  signalAttribution: SignalAttribution | null;
  scoreHistory: ScoreHistoryPoint[];
  peerTickers: string[];
  earningsSetup: EarningsSetup | null;
}
```

Use Prisma generated types where possible (`import type { FundamentalData, ... } from '@sentiment-crowd/db'`).

### Validation
After refactoring, the app should render identically. Verify by:
- Running `bun run build` in `apps/web`
- Opening the dashboard and checking every section renders
- Checking the TypeScript compiler: `apps/web/node_modules/.bin/tsc --noEmit`

---

## Task 2: Wire Composite Backtest to UI

### Problem
The backtest panel in the dashboard calls `/api/backtest/[ticker]` which proxies to the Python worker's `/backtest/{ticker}` endpoint. This endpoint uses a **simplified 3-indicator model** (RSI + MACD + SMA only).

The Python worker also has `/composite-backtest/{ticker}` at `apps/python_worker/main.py:252` which uses the **full multi-factor scoring** (technical + fundamental + quant + HMM regime) — much closer to the actual live signal.

### What to change

#### File 1: `apps/web/app/api/backtest/[ticker]/route.ts`
Currently line 34 calls:
```
${WORKER_URL}/backtest/${ticker}?${qs}
```
Change to:
```
${WORKER_URL}/composite-backtest/${ticker}?${qs}
```

That's it. The response format is the same — the composite endpoint returns the same JSON shape (equity_curve, trades, hit_rate, sharpe, etc.) plus extra fields (tech_score, fund_score, quant_score per trade).

#### File 2: `apps/web/app/DashboardClient.tsx` (or `MacroQuantBacktest.tsx` after refactor)
The backtest results display (around lines 1095-1220) already handles the response correctly. But you can enhance it:
- Show the per-trade component scores (tech_score, fund_score, quant_score) in the trade table
- The composite-backtest returns these extra fields in each trade object

#### Verification
- Run a backtest for any ticker (e.g., AAPL)
- Confirm the equity curve renders
- Check that the hit rate and Sharpe make sense
- Compare the composite backtest results against the simple backtest to see if the composite model outperforms

### Note about the composite backtest endpoint
- It uses `years: int = 3` as default (vs 2 for simple)
- It accounts for HMM regime detection, Hurst exponent, Kelly fraction, Bollinger band position, golden/death cross
- Fundamental score uses current `targetMeanPrice` — this is a lookahead bias. The weight is reduced to 0.10 to compensate, but this is an acknowledged limitation documented in the code at line 366

---

## Task 3: Add Tests for Core Logic

### Setup
The project uses Bun. Bun has a built-in test runner (`bun test`).

No test configuration exists yet. Create:

#### File: `apps/worker/src/__tests__/signal.test.ts`

Test the core signal functions extracted from `recommendation.ts`:

```typescript
import { describe, test, expect } from 'bun:test';

// These functions are defined in recommendation.ts lines 17-27
// They may need to be exported first

describe('clamp', () => {
  test('clamps to range', () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(50)).toBe(50);
  });
});

describe('signalFromScore', () => {
  test('STRONG_BUY for score > 65', () => {
    expect(signalFromScore(70)).toBe('STRONG_BUY');
    expect(signalFromScore(100)).toBe('STRONG_BUY');
  });
  test('BUY for 55 < score <= 65', () => {
    expect(signalFromScore(60)).toBe('BUY');
  });
  test('HOLD for 45 < score <= 55', () => {
    expect(signalFromScore(50)).toBe('HOLD');
  });
  test('SELL for 35 < score <= 45', () => {
    expect(signalFromScore(40)).toBe('SELL');
  });
  test('STRONG_SELL for score <= 35', () => {
    expect(signalFromScore(20)).toBe('STRONG_SELL');
  });
});
```

**To make this work**, export `clamp`, `signalFromScore`, and `selectRegimeWeights` from `recommendation.ts`. Currently they're module-private. Add `export` keyword to:
- `clamp` (line 17)
- `signalFromScore` (line 21)
- `selectRegimeWeights` (line 29)

#### File: `apps/web/app/__tests__/signalFromPct.test.ts`

Test the frontend signal derivation:

```typescript
import { describe, test, expect } from 'bun:test';
import { signalFromPct, formatRecommendation } from '../DashboardClient';
// These also need to be exported

describe('signalFromPct', () => {
  test('positive percentage → BUY signals', () => {
    expect(signalFromPct(15)).toBe('STRONG_BUY');
    expect(signalFromPct(5)).toBe('BUY');
  });
  test('near zero → HOLD', () => {
    expect(signalFromPct(0)).toBe('HOLD');
    expect(signalFromPct(-1.5)).toBe('HOLD');
    expect(signalFromPct(1.9)).toBe('HOLD');
  });
  test('negative percentage → SELL signals', () => {
    expect(signalFromPct(-5)).toBe('SELL');
    expect(signalFromPct(-2.87)).toBe('SELL');  // The exact bug case
    expect(signalFromPct(-15)).toBe('STRONG_SELL');
  });
});

describe('formatRecommendation', () => {
  test('replaces underscores and capitalizes', () => {
    expect(formatRecommendation('strong_buy')).toBe('Strong Buy');
    expect(formatRecommendation('under_perform')).toBe('Under Perform');
    expect(formatRecommendation('hold')).toBe('Hold');
  });
});
```

#### File: `apps/worker/src/__tests__/recommendedPrice.test.ts`

Test that `computeRecommendedPrice` produces sane output. This needs DB mocking — keep it simple:

```typescript
// Test the pure math parts:
// - Weighted average of estimates
// - Clamping (target shouldn't be >3x or <0.1x current)
// - Confidence band logic
```

### Running tests
Add to root `package.json` scripts:
```json
"test": "bun test --recursive"
```

Or per-workspace:
```json
// apps/worker/package.json
"test": "bun test"
```

---

## Task 4: Enable TypeScript Strict Mode

### File: `apps/web/tsconfig.json`

Change:
```json
"strict": false
```
To:
```json
"strict": true
```

### Expected errors and how to fix them

1. **Implicit `any` on component props** — The `DashboardClient` takes `any` props. After Task 1 (refactoring), all components should have typed props interfaces. If Task 1 isn't done yet, add `any` explicitly where needed:
   ```typescript
   // Before: function Tile({ label, value, sub, variant = 'gold', icon: Icon }: any)
   // After:  explicitly type the props or use an interface
   ```

2. **Null checks** — Strict mode enables `strictNullChecks`. Many places access optional fields without `?.` or `!= null` guards. Most of the dashboard already uses optional chaining (`?.`) so this should be minimal.

3. **`(prisma as any)` casts** — These exist in `apps/worker/src/recommendation.ts:317` and `apps/worker/src/index.ts:450` because `RecommendationScore` and `OptionsFlow` aren't fully typed in the generated Prisma client. Fix by running `bunx prisma generate` to regenerate types, or keep the casts if the schema is ahead of the generated client.

4. **Event handler types** — Some Recharts callbacks and DOM event handlers use implicit any. Add explicit types:
   ```typescript
   onClick={(e: React.MouseEvent) => ...}
   ```

### Strategy
- Enable strict mode
- Run `apps/web/node_modules/.bin/tsc --noEmit 2>&1 | head -100` to see errors
- Fix them category by category (implicit any first, then null checks)
- The worker app (`apps/worker`) should also get strict mode eventually, but start with web

---

## Execution Order

**Do Task 1 first** — the refactoring makes everything else easier:
- Task 3 (tests) is easier when functions are exported from small modules
- Task 4 (strict mode) produces fewer errors when props are typed
- Task 2 (composite backtest) is a 1-line change that can be done anytime

**Recommended order:** 1 → 2 → 3 → 4

---

## Bugs Already Fixed (in current working tree, not yet committed)

These changes are already made in `DashboardClient.tsx` and ready to commit:

1. **Signal derived from price percentage** — `derivedSignal` (line 332-340) uses `signalFromPct()` to derive BUY/SELL/HOLD from `(recommended_price - current_price) / current_price` instead of blindly using the composite score signal. This fixes the "BUY with -2.87%" bug.

2. **Analyst View formatting** — Line 810: `formatRecommendation()` converts `"strong_buy"` → `"Strong Buy"`. Also added proper variant coloring (sell recommendations show red).

3. **Broken field references in Comprehensive Analysis** — Lines 1437-1440: Fixed `analyst_consensus` → `recommendation`, `target_price_low` → `target_low_price`, `target_price_high` → `target_high_price`, `target_price_mean` → `target_price`. These fields didn't exist in the Prisma schema and were silently `undefined`.

4. **Comprehensive Analysis signal** — Line 1426: Uses `derivedSignal` instead of raw `activeRec?.signal`, so the narrative text, verdict badge, and executive summary all match the corrected signal.

**These should be committed before starting the refactor.**

---

## File Reference

Key files you'll need to read/modify:

| File | Lines | Role |
|------|-------|------|
| `apps/web/app/DashboardClient.tsx` | 2,039 | Main target for refactoring |
| `apps/web/app/page.tsx` | 405 | Server component, DB queries, passes props |
| `apps/worker/src/recommendation.ts` | 428 | Composite scoring + signal logic |
| `apps/worker/src/recommendedPrice.ts` | 167 | Price target synthesis |
| `apps/python_worker/main.py` | 977 | `/composite-backtest/{ticker}` endpoint |
| `apps/web/app/api/backtest/[ticker]/route.ts` | 43 | Backtest API proxy |
| `packages/db/prisma/schema.prisma` | 369 | Database schema (26 models) |
| `apps/web/tsconfig.json` | — | TypeScript config |
