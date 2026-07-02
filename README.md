# Phaeton Capital

**Sentiment-driven quantitative trading-intelligence platform.**
Phaeton Capital scrapes market discussion from social media, labels sentiment with an LLM, fuses it with live market data, and runs a 20+ model quantitative engine to surface trading signals on a real-time dashboard.

> ⚠️ Educational project — not financial advice.

<!-- Add a dashboard screenshot here — single highest-impact thing for anyone viewing this repo: -->
![Dashboard](docs/screenshot.png)

## What it does

1. **Scrape** — a Bun-native worker continuously scrapes Reddit (and other social sources) for ticker discussion.
2. **Label** — each post is classified for genuine market sentiment using Google Gemini, with social-media noise filtered out.
3. **Store** — sentiment and market data are persisted in PostgreSQL via Prisma.
4. **Analyze** — a Python engine fuses sentiment with live price data and computes a battery of quantitative models.
5. **Surface** — results appear as signals, backtests, screeners and risk metrics on a Next.js dashboard.

## AI model chain (all free-tier)

Sentiment labeling walks a fallback chain and *remembers* rate limits: a
model that returns 429 goes on cooldown (`AI_COOLDOWN_MS`, default 10 min)
and the router skips it until the cooldown expires, instead of re-trying the
exhausted tier on every batch.

```
gemini-2.5-flash            (primary, AI_MODEL)
  → gemini-2.5-flash-lite   (GEMINI_FALLBACK_MODELS, in order)
  → gemini-2.0-flash
  → OpenRouter / Groq / Together  (open-weight aggregators, by API key)
```

Gemini calls use schema-enforced structured output, so the response shape is
API-guaranteed. Live routing state (active model + cooling tiers) is exposed
at the worker's `/health` endpoint under `ai_router`.

## Quantitative engine

The Python engine (`apps/python_worker`) implements 20+ models:

| Category | Models |
|---|---|
| **Forecasting** | Monte Carlo simulation (Student-t / fat-tailed), multi-day price cones |
| **Volatility** | GARCH(1,1), EWMA fallback |
| **Regime detection** | Gaussian Hidden Markov Model (bull / bear / range) |
| **Risk** | Sharpe, Sortino, Calmar, VaR & CVaR (95/99%), max drawdown, rolling beta vs SPY |
| **Position sizing** | Fractional Kelly criterion (with transaction costs) |
| **Time-series / causality** | Granger causality, transfer entropy, Ornstein-Uhlenbeck, ADF stationarity, Hurst exponent (DFA), FFT cycle detection |
| **Sentiment statistics** | Bayesian (Normal-Normal) aggregation, Beta-distribution fit, KDE, z-scores |

## Architecture

A monorepo orchestrated with Docker Compose:

- `apps/web` — Next.js 15 dashboard (TypeScript, Tailwind)
- `apps/worker` — Bun-native scraping + AI sentiment pipeline (TypeScript)
- `apps/python_worker` — quantitative engine (Python: NumPy, pandas, SciPy, statsmodels, hmmlearn, arch)
- `packages/db` — PostgreSQL schema via Prisma

## Quick start

Everything is containerized — no local Node/Bun/Python required.

```bash
cp .env.example .env        # then set your GEMINI_API_KEY
docker-compose up --build
```

Open <http://localhost:3000>.

Trigger a manual scrape:

```bash
curl -X POST http://localhost:3000/api/scrape
```

## Tech stack

Next.js 15 · TypeScript · Bun · Python · PostgreSQL · Prisma · Docker · Google Gemini

## Author

Built by **Jafar Al-Badri** — [GitHub](https://github.com/JafarAlbadri) · [LinkedIn](https://www.linkedin.com/in/jafar-albadri-209670355/)
