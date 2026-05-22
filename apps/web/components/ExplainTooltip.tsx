"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

// ── Explanation data ────────────────────────────────────────────────────────────

interface ExplanationEntry {
  title: string;
  explain: string;
  whyMatters: string;
  range?: string;
}

const EXPLANATIONS: Record<string, ExplanationEntry> = {

  // ── Quant Models ──────────────────────────────────────────────────────────────

  hmm: {
    title: "Hidden Markov Model (Regime)",
    explain:
      "The HMM is a statistical engine that reads price and volatility patterns to determine which of three market states — Bear, Neutral, or Bull — the asset is most likely in right now. Think of it as a weather system: the current state is hidden, but the model infers it from observable signals like return sequences and vol levels.",
    whyMatters:
      "Many indicators behave very differently depending on the regime. A BUY signal in a Bear regime carries far more risk than the same signal in a Bull regime. Knowing the regime lets you filter noise and size positions appropriately.",
    range: "State 0 = Bear · State 1 = Neutral · State 2 = Bull",
  },

  kelly: {
    title: "Kelly Criterion",
    explain:
      "The Kelly formula answers: 'Given my edge and the odds, what fraction of my capital should I risk?' It is derived from win rate and win/loss ratio. A full-Kelly bet maximises long-run wealth growth mathematically, but it also maximises short-term volatility.",
    whyMatters:
      "Overbetting destroys compounding. Practitioners typically use half- or quarter-Kelly to smooth the ride. Any raw Kelly reading above 25% is a warning sign — it usually means the edge estimate is noisy or the position is dangerously large.",
    range: "0–100%. Practical cap: 10–25% of capital",
  },

  monte_carlo: {
    title: "Monte Carlo Simulation",
    explain:
      "The model fires 1,000 synthetic price paths forward, each built from the asset's historical drift and volatility, randomised differently each run. The result is a fan of possible futures — not a single forecast, but a probability distribution of outcomes.",
    whyMatters:
      "Single-line forecasts are almost always wrong. Monte Carlo shows you the range of plausible outcomes and the percentile where you'd be in trouble. The 5th percentile path is your stress scenario; the median is your base case.",
    range: "Percentile bands: P5 (bear case) · P50 (base) · P95 (bull case)",
  },

  garch: {
    title: "GARCH Volatility Model",
    explain:
      "GARCH (Generalised Autoregressive Conditional Heteroskedasticity) captures the well-known fact that volatility clusters: calm periods tend to stay calm, turbulent periods tend to stay turbulent. It fits a dynamic model to historical returns to forecast near-term vol.",
    whyMatters:
      "When GARCH signals rising vol, options are likely to become more expensive, position sizes should shrink, and stop-losses should widen. 'Vol begets vol' is the single most reliably tested feature of financial markets.",
    range: "Annualised vol %. Low <20% · Medium 20–40% · High >40%",
  },

  hurst: {
    title: "Hurst Exponent",
    explain:
      "The Hurst Exponent (H) measures whether a price series has memory. H > 0.5 means trends persist — what has been going up tends to continue up. H < 0.5 means the series is mean-reverting — moves get faded. H = 0.5 is a pure random walk with no exploitable structure.",
    whyMatters:
      "Choosing a momentum strategy on a mean-reverting asset (or a mean-reversion strategy on a trending asset) is a fast way to lose money. Hurst tells you which regime applies so you can pick the right playbook.",
    range: "<0.5 mean-reverting · 0.5 random walk · >0.5 trending",
  },

  var: {
    title: "Value at Risk (VaR)",
    explain:
      "VaR answers: 'What is the maximum I should expect to lose on a bad day?' At 95% confidence, the 1-day VaR is the loss level that is exceeded only 5% of trading days. At 99%, it is exceeded only 1% of days. Think of it as the 'once-a-month' and 'once-a-year' loss estimate.",
    whyMatters:
      "VaR is the most widely used risk metric in institutional finance. It gives a single, comparable number for how much downside you are carrying right now, so you can size positions consistently across different assets.",
    range: "Expressed as % of position. 95% VaR · 99% VaR (more extreme)",
  },

  cvar: {
    title: "CVaR / Expected Shortfall",
    explain:
      "CVaR (Conditional VaR), also called Expected Shortfall, goes one step further than VaR: instead of asking 'what is the threshold of bad days?', it asks 'on the days that are worse than that threshold, how bad does it actually get on average?' It averages the losses in the worst 5% of scenarios.",
    whyMatters:
      "VaR tells you the door; CVaR tells you what's behind it. During market dislocations, the tail losses are what kill portfolios. CVaR captures the severity, not just the probability, of bad outcomes.",
    range: "Always worse (larger) than VaR at the same confidence level",
  },

  sharpe: {
    title: "Sharpe Ratio",
    explain:
      "The Sharpe Ratio is the excess return above the risk-free rate divided by the standard deviation of returns. Think of it as 'how much reward am I getting per unit of total volatility I endure?' A ratio of 1.0 means you earned one dollar of excess return for every dollar of risk taken.",
    whyMatters:
      "Two assets with the same return are not equally attractive if one is twice as volatile. Sharpe lets you compare them on a level playing field. It is the universal currency of risk-adjusted performance.",
    range: "<0 poor · 0–1 acceptable · >1 good · >2 excellent",
  },

  sortino: {
    title: "Sortino Ratio",
    explain:
      "The Sortino Ratio is like Sharpe, but it only penalises downside volatility — the bad kind of vol. Upside volatility (big up days) is not counted against you. It divides excess return by the standard deviation of negative returns only.",
    whyMatters:
      "Sharpe can unfairly penalise an asset that has frequent large up-moves alongside occasional down-moves. Sortino gives a fairer picture for skewed return distributions, which is common in equities with strong momentum.",
    range: "<0 poor · 0–1 acceptable · >1 good · >2 excellent",
  },

  calmar: {
    title: "Calmar Ratio",
    explain:
      "The Calmar Ratio divides the annualised return by the maximum drawdown — the biggest peak-to-trough decline in the period. It asks: 'For every dollar of maximum pain I had to sit through, how much did I earn per year?' It is especially popular in trend-following and managed futures.",
    whyMatters:
      "Maximum drawdown is psychologically the hardest thing for most investors to endure. Calmar tells you whether the strategy compensated you adequately for that pain.",
    range: "<0.5 weak · 0.5–1 acceptable · >1 good · >3 excellent",
  },

  adf: {
    title: "ADF Stationarity Test",
    explain:
      "The Augmented Dickey-Fuller (ADF) test checks whether a price series has a stable mean it keeps returning to, or whether it just wanders without bound (a 'random walk'). A stationary series has predictable reverting behaviour; a non-stationary one does not.",
    whyMatters:
      "Mean-reversion strategies only work if there is actually a mean to revert to. Running ADF first prevents you from building a pairs trade or stat-arb on a series that is structurally trending and never comes back.",
    range: "p-value <0.05 = stationary (mean-reverting) · p >0.05 = non-stationary",
  },

  transfer_entropy: {
    title: "Transfer Entropy",
    explain:
      "Transfer Entropy measures how much knowing the history of sentiment helps predict future price moves, beyond what price alone would tell you. It is an information-theoretic measure of directional influence — not just correlation, but actual predictive flow from one series to another.",
    whyMatters:
      "If sentiment Transfer Entropy to price is high, it means social/news data is genuinely leading price action for this asset. That is a green light to weight sentiment signals more heavily in the composite score.",
    range: "0 = no information flow · Higher = stronger sentiment-to-price lead",
  },

  ou: {
    title: "Ornstein-Uhlenbeck Process",
    explain:
      "The OU model fits a mathematical spring to the price series: it measures how strongly and how quickly the price tends to snap back toward its long-run mean. The two key parameters are the speed of mean-reversion (theta) and the equilibrium level (mu).",
    whyMatters:
      "A high theta means fast mean-reversion — tight, short-dated trades. A low theta means slow reversion — you may need weeks or months for the trade to play out. OU quantifies the timing of your mean-reversion hypothesis.",
    range: "Theta >0 = mean-reverting. Higher theta = faster reversion",
  },

  beta: {
    title: "Beta and Alpha",
    explain:
      "Beta measures how much an asset moves for every 1% move in its benchmark (usually the S&P 500). A beta of 1.3 means it tends to move 30% more than the market in both directions. Alpha is the return left over after accounting for beta — the portion attributable to the stock itself rather than the market tide.",
    whyMatters:
      "High-beta stocks amplify both gains and losses. During rallies, you want beta; during selloffs, you want low beta or negative alpha-generators. Understanding both lets you separate skill (alpha) from market exposure (beta) in any strategy.",
    range: "Beta: <0.5 low · 1.0 market-like · >1.5 high. Alpha: >0 = outperformance",
  },

  // ── Technical Indicators ──────────────────────────────────────────────────────

  rsi: {
    title: "RSI 14 (Relative Strength Index)",
    explain:
      "RSI measures the speed and magnitude of recent price changes on a 0–100 scale. It compares average gains to average losses over the past 14 trading sessions. When the asset has been rising much more than falling, RSI climbs toward 100; when falling, it drops toward 0.",
    whyMatters:
      "RSI is one of the most reliable short-term momentum signals. Readings below 30 suggest the asset may be oversold and due for a bounce; above 70 suggests overbought conditions and potential exhaustion. Works best combined with trend filters.",
    range: "<30 oversold · 30–70 neutral · >70 overbought",
  },

  macd: {
    title: "MACD (Moving Average Convergence Divergence)",
    explain:
      "MACD subtracts the 26-period exponential moving average from the 12-period EMA to produce a trend line. A 9-period EMA of that line forms the 'signal line'. The histogram (MACD minus signal) shows whether momentum is accelerating or decelerating.",
    whyMatters:
      "A histogram crossing from negative to positive is an early signal of a momentum shift. MACD crossovers are most powerful in trending markets. Divergence between MACD direction and price direction often precedes reversals.",
    range: "Histogram > 0 = bullish momentum · < 0 = bearish · Crossover = signal",
  },

  bollinger: {
    title: "Bollinger Bands",
    explain:
      "Bollinger Bands draw an envelope around price: a 20-day simple moving average in the middle, with upper and lower bands at 2 standard deviations above and below. About 95% of price action is expected to stay within the bands under normal conditions.",
    whyMatters:
      "A touch of the upper band in a strong trend is continuation; in a choppy market, it is a fade signal. When the bands compress (squeeze), it signals low volatility that often precedes a sharp directional move. Band width is itself a useful vol indicator.",
    range: "Price near upper band = extended · Near lower band = compressed",
  },

  golden_cross: {
    title: "Golden Cross",
    explain:
      "A Golden Cross occurs when the 50-day simple moving average crosses above the 200-day SMA. It signals that short-term momentum has overtaken the long-term trend — a structural shift from bearish to bullish market dynamics.",
    whyMatters:
      "The Golden Cross is one of the most closely watched signals by institutional investors and algorithms alike, which creates a self-fulfilling element. It is a lagging indicator — it confirms a trend that is already underway — but it filters out short-term noise effectively.",
    range: "Binary signal. 50 SMA > 200 SMA = active Golden Cross",
  },

  death_cross: {
    title: "Death Cross",
    explain:
      "The Death Cross is the mirror image of the Golden Cross: the 50-day SMA crosses below the 200-day SMA. It signals that selling pressure has become structurally dominant over the long-term trend — a shift from bullish to bearish market dynamics.",
    whyMatters:
      "Like the Golden Cross, the Death Cross triggers significant institutional repositioning and algorithmic selling. It has historically preceded extended bear markets in broad indices. For individual stocks, it often marks the start of sustained underperformance.",
    range: "Binary signal. 50 SMA < 200 SMA = active Death Cross",
  },

  atr: {
    title: "ATR 14 (Average True Range)",
    explain:
      "ATR measures how much an asset typically moves in a single day, in price units. It averages the 'true range' — the largest of: high-minus-low, high-minus-previous-close, previous-close-minus-low — over 14 trading sessions. Unlike percentage vol, ATR is expressed in actual price.",
    whyMatters:
      "ATR is the standard tool for setting stop-loss distances. A stop placed 1.5× ATR below entry has a statistically meaningful buffer against normal noise. It also helps compare volatility across different price levels — a $2 move means very different things on a $10 stock vs. a $500 stock.",
    range: "Relative to price. Higher ATR = wider daily swings = more risk per share",
  },

  // ── Scoring ───────────────────────────────────────────────────────────────────

  composite_score: {
    title: "Composite Score",
    explain:
      "The Composite Score is Phaeton's master signal: a weighted blend of seven sub-scores — Sentiment, Technical, Fundamental, Quant, Risk, Macro, and Velocity. Each sub-score is normalised to 0–100 before blending. The weights are calibrated to maximise historical Information Coefficient.",
    whyMatters:
      "No single signal is reliably right in all market conditions. The Composite Score synthesises signals across dimensions so that weakness in one area (e.g., poor technicals) can be offset by strength elsewhere (e.g., strong fundamental + bullish regime). Above 60 is bullish, below 40 is bearish.",
    range: "0–100. <40 bearish · 40–60 neutral · >60 bullish",
  },

  sentiment_score: {
    title: "Sentiment Score",
    explain:
      "The Sentiment Score is derived from AI analysis of social media posts, news articles, and earnings call transcripts. Each source is weighted by recency (older posts decay in influence) and credibility (bot-detected or low-karma accounts are filtered). The result is a clean signal of crowd and analyst tone.",
    whyMatters:
      "Retail sentiment often leads price action by 1–3 days on high-attention stocks. Extreme positive sentiment can signal crowded longs and pending reversal; extreme negative sentiment can signal capitulation. The decay weighting ensures the score reflects current mood, not last week's noise.",
    range: "0–100. <35 very bearish · 35–50 cautious · 50–65 positive · >65 very bullish",
  },

  technical_score: {
    title: "Technical Score",
    explain:
      "The Technical Score combines the outputs of RSI, MACD, Bollinger Band position, and short-term vs. long-term moving average alignment. Each indicator votes bullish, neutral, or bearish, and the votes are weighted by their historical reliability for this asset class.",
    whyMatters:
      "Technical signals are the most widely used by active traders and algorithmic systems. A high Technical Score means multiple independent momentum and trend indicators are aligned — a more reliable setup than any single indicator alone.",
    range: "0–100. <40 technically weak · 40–60 mixed · >60 technically strong",
  },

  fundamental_score: {
    title: "Fundamental Score",
    explain:
      "The Fundamental Score assesses the company's financial health and valuation: P/E ratio relative to sector, analyst consensus and revision direction, earnings per share trend over the last four quarters, and the stock's position within its 52-week range.",
    whyMatters:
      "Strong fundamentals anchor a long thesis against short-term volatility. A stock with poor technicals but strong fundamentals may be a dip-buying opportunity. Weak fundamentals in a sell-off often signal genuine deterioration rather than a tradeable bounce.",
    range: "0–100. <40 fundamental concerns · 40–60 fair · >60 fundamentally strong",
  },

  quant_score: {
    title: "Quant Score",
    explain:
      "The Quant Score aggregates the outputs of the quantitative models: HMM regime state, Kelly sizing signal, Hurst trending/mean-reversion character, and short-to-medium-term momentum model outputs. It captures what the statistical models collectively 'think' about the asset's near-term path.",
    whyMatters:
      "Quant models are not biased by narratives or headlines — they only see the numbers. A high Quant Score in a Bear HMM regime is a contradiction worth examining. Agreement between the Quant Score and other sub-scores increases conviction.",
    range: "0–100. <40 quant-bearish · 40–60 neutral · >60 quant-bullish",
  },

  risk_score: {
    title: "Risk Score",
    explain:
      "The Risk Score is an inverse measure of risk: a high score means low risk, low score means high risk. It incorporates VaR, maximum drawdown over the trailing 90 days, current GARCH volatility, and a downside-volatility penalty. High VaR or deep drawdowns push the score down.",
    whyMatters:
      "An asset with a great Composite Score but a very low Risk Score is signalling that the reward comes with significant danger attached. Use Risk Score to calibrate position size — even if you like the trade, a poor Risk Score is a reason to size down.",
    range: "0–100. <30 high risk · 30–60 moderate risk · >60 low risk",
  },

  macro_score: {
    title: "Macro Score",
    explain:
      "The Macro Score reflects the broad market environment: current VIX level (fear gauge), the Fed funds rate trajectory, momentum of the relevant sector ETF, and the CNN Fear & Greed Index. It asks whether the macroeconomic tide is rising or falling for risk assets.",
    whyMatters:
      "Even the best individual stock thesis can be swamped by macro headwinds. A low Macro Score (high VIX, rising rates, weak sector) is a warning to reduce exposure or tighten stops, regardless of the stock-level signals.",
    range: "0–100. <35 macro headwinds · 35–65 neutral · >65 macro tailwinds",
  },

  // ── Other ─────────────────────────────────────────────────────────────────────

  ic: {
    title: "Information Coefficient (IC)",
    explain:
      "The Information Coefficient is the Pearson correlation between the Composite Score at the time of signal and the actual return over the next N days. An IC of 0 means the scores have zero predictive power; IC of 1 means perfect prediction.",
    whyMatters:
      "IC is the ground truth of whether the model is actually working. Backtests look great — IC tells you if the signal was real or lucky. A sustained IC above 0.05 is considered meaningful in quantitative research; above 0.10 is exceptional.",
    range: "<0 harmful · 0–0.05 weak · 0.05–0.10 good · >0.10 exceptional",
  },

  ir: {
    title: "Information Ratio (IR)",
    explain:
      "The Information Ratio is the IC divided by its standard deviation over time — in other words, it measures how consistently the model generates its edge. A high IC average that is wildly variable is far less useful than a moderate IC that is stable and reliable.",
    whyMatters:
      "Consistency is what allows compounding to work. A high IR means you can size positions with confidence that the edge will persist. A low IR — even with a decent average IC — suggests the model gets lucky in bursts and fails in others.",
    range: "<0.3 inconsistent · 0.3–0.5 moderate · >0.5 strong · >1.0 excellent",
  },

  velocity: {
    title: "Sentiment Velocity",
    explain:
      "Sentiment Velocity measures the rate of change of the Sentiment Score — not where sentiment is, but how fast it is moving. A score of +0.8 today that was +0.3 yesterday has high positive velocity. Velocity can detect emerging momentum before it is priced in.",
    whyMatters:
      "Markets often move on the change in sentiment, not the level. A stock where sentiment is rapidly improving from a negative base can be an early entry opportunity. Conversely, rapidly deteriorating sentiment on a high-scoring stock is a leading warning signal.",
    range: "Negative = sentiment deteriorating · Positive = sentiment accelerating",
  },

  manipulation: {
    title: "Manipulation Detection",
    explain:
      "The manipulation flag is raised by an AI classifier that scans for coordinated inauthentic behaviour in social data: accounts created recently posting the same ticker, low-karma accounts generating outsized volume, rapid sentiment spikes with no fundamental trigger, and language patterns matching known pump-and-dump templates.",
    whyMatters:
      "Sentiment signals become dangerously misleading when the underlying data is manipulated. A stock with a high Sentiment Score alongside a manipulation flag is not a buy signal — it is likely a trap. The flag suppresses the sentiment weight in the Composite Score automatically.",
    range: "Binary: Active flag = treat sentiment score with scepticism",
  },

  backtest: {
    title: "Signal Backtesting",
    explain:
      "The backtest runs a walk-forward simulation: it replays historical RSI, MACD, and SMA crossover signals on actual price data, entering and exiting trades as if it were running live. Walk-forward means the model is always tested on data it has never seen — no lookahead bias.",
    whyMatters:
      "Backtesting reveals how a signal strategy would actually have performed, including realistic transaction costs and slippage. It is the first filter before deploying any signal in live conditions. Strategies that look good in backtest but have poor IC are overfitted.",
    range: "Key metrics: Total return · Sharpe · Max drawdown · Win rate · Avg trade",
  },

  pre_earnings: {
    title: "Pre-Earnings Setup",
    explain:
      "The Pre-Earnings Setup detector identifies whether conditions are aligned for a trade into an earnings event. It checks: Implied Volatility Percentile (is IV elevated, making options expensive?), historical earnings drift (does this stock typically move up or down after results?), and whether sentiment direction matches that historical drift.",
    whyMatters:
      "Earnings are the single most volatile recurring event for individual equities. A pre-earnings setup with bullish historical drift, positive sentiment, and reasonable IV gives a probabilistic edge. High IV percentile also indicates the options market is pricing in a large move — potentially a volatility-selling opportunity.",
    range: "Flags: IV Percentile · Historical drift direction · Sentiment alignment",
  },

  squeeze: {
    title: "Short Squeeze Pressure",
    explain:
      "Short Squeeze Pressure combines three factors: short float percentage (what portion of the float is sold short), days-to-cover (how many average trading days it would take all short sellers to buy back their shares), and sentiment velocity. A high score means a large short position is accumulating and sentiment is turning positive — the conditions for a forced short-covering rally.",
    whyMatters:
      "Short squeezes can produce explosive, rapid moves — 20–50% gains in days — that are fundamentally unrelated to the company's value. Identifying squeeze setups early, before the covering begins, is one of the highest-conviction short-term trades. The risk is timing: if sentiment does not materialise into buying pressure, the short sellers are right.",
    range: "Low <30 · Moderate 30–60 · High >60 · Extreme >80",
  },
};

// ── ExplainModal (in-app floating box) ─────────────────────────────────────────

interface ModalProps {
  entry: ExplanationEntry;
  onClose: () => void;
}

function ExplainModal({ entry, onClose }: ModalProps) {
  // ESC closes the box. Lock body scroll while open so the page underneath
  // can't move while the user is reading.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      // Full-viewport dim layer. Very dark + heavy blur so the page behind
      // visibly recedes — this is what makes the box read as a "separate box"
      // rather than text painted onto the website.
      className="fixed inset-0 z-[2147483647] flex items-center justify-center px-4 py-8 bg-black/85 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={entry.title}
    >
      {/* The floating box. Generous size, strong shadow + ring + gold border
          so it visually pops off the dimmed page behind it. */}
      <div
        className={[
          "relative w-full max-w-xl max-h-[85vh] overflow-hidden",
          "bg-[#0a0a1c] rounded-2xl",
          "border border-[#d4a017]/60 ring-1 ring-[#d4a017]/20",
          "shadow-[0_30px_80px_rgba(0,0,0,0.95),0_0_0_1px_rgba(212,160,23,0.15)]",
          "flex flex-col",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar — visually distinct from body so the box reads like
            a window with chrome. */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#d4a017]/25 bg-gradient-to-b from-[#12122a] to-[#0a0a1c]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#fcd97a] shadow-[0_0_8px_rgba(252,217,122,0.6)] flex-shrink-0" />
            <p className="text-[#fcd97a] font-bold text-[15px] leading-snug truncate">
              {entry.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9898c0] hover:text-[#fcd97a] hover:bg-white/5 transition-colors flex-shrink-0 p-1.5 rounded-md border border-[#2a2a4a] hover:border-[#d4a017]/50"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.5 2.5l11 11M13.5 2.5l-11 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <p className="text-[#d8d8ee] text-[14px] leading-[1.65]">
            {entry.explain}
          </p>

          <div>
            <p className="text-[#fcd97a] text-[10.5px] font-bold tracking-[0.10em] uppercase mb-2">
              Why it matters
            </p>
            <p className="text-[#c8c8e0] text-[14px] leading-[1.65]">
              {entry.whyMatters}
            </p>
          </div>

          {entry.range && (
            <div className="bg-[#05051a] border border-[#1a1a3a] rounded-[10px] px-4 py-3 mt-1">
              <p className="text-[#7878a0] text-[10px] font-bold tracking-[0.10em] uppercase mb-1.5">
                Normal range
              </p>
              <p className="text-[#fcd97a] font-mono text-[12px] leading-relaxed">
                {entry.range}
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-[#1a1a3a] bg-[#05051a]/60 text-center">
          <p className="text-[10px] text-[#7878a0]">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a3a] text-[#9898c0] font-mono border border-[#2a2a4a]">
              Esc
            </kbd>{" "}
            or click outside to close
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── ExplainTooltip ─────────────────────────────────────────────────────────────

export interface ExplainTooltipProps {
  topic: string;
  className?: string;
}

export function ExplainTooltip({ topic, className }: ExplainTooltipProps) {
  const [open, setOpen] = useState(false);
  const entry = EXPLANATIONS[topic];

  const close = useCallback(() => setOpen(false), []);

  if (!entry) return null;

  return (
    <span
      className={["inline-flex items-center", className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={`Explain ${topic}`}
        title={entry.title}
        className={[
          "inline-flex items-center justify-center",
          "text-[#5d5d8a] hover:text-[#fcd97a]",
          "transition-colors duration-150",
          open && "text-[#fcd97a]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>

      {open && <ExplainModal entry={entry} onClose={close} />}
    </span>
  );
}

// ── InlineExplain ──────────────────────────────────────────────────────────────

export interface InlineExplainProps {
  topic: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineExplain({ topic, children, className }: InlineExplainProps) {
  return (
    <span className={["inline-flex items-center gap-1", className].filter(Boolean).join(" ")}>
      {children}
      <ExplainTooltip topic={topic} />
    </span>
  );
}
