# Phaeton Capital — Design Overhaul Master Plan
> Prepared for Antigravity | March 2026

---

## Overview

This is a full visual redesign of the Phaeton Capital trading intelligence dashboard. The goal is to move from "professional dark dashboard" to **precision instrument** — a high-end trading terminal aesthetic that communicates serious intelligence. No features change; only the look and feel.

**Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS 3.4, Recharts 2.13, Lucide React

**Key files to touch:**
- `apps/web/app/globals.css` — CSS variables, keyframes, base styles
- `apps/web/tailwind.config.ts` — design tokens, custom shadows, animations
- `apps/web/app/layout.tsx` — shell structure, fonts
- `apps/web/app/DashboardClient.tsx` — all component markup and classes

---

## Phase 0 — Foundation (do this first, everything else depends on it)

### 0.1 Add Syne Font

In `layout.tsx`, import from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet" />
```

Or via `next/font/google`:
```ts
import { Inter, JetBrains_Mono, Syne } from 'next/font/google'
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' })
```

### 0.2 Replace Design Tokens in `tailwind.config.ts`

Replace the entire `theme.extend` block with:

```ts
theme: {
  extend: {
    colors: {
      // Backgrounds
      'bg-void':    '#05050f',
      'bg-base':    '#080818',
      'bg-raised':  '#0d0d24',
      'bg-overlay': '#12122e',
      // Borders
      'border-dim':     '#1a1a3a',
      'border-default': '#252550',
      'border-bright':  '#3a3a7a',
      // Gold spectrum (brand signature)
      'gold-deep':    '#92620a',
      'gold-muted':   '#b8860b',
      'gold-base':    '#d4a017',
      'gold-bright':  '#f0b429',
      'gold-pale':    '#fcd97a',
      'gold-shimmer': '#fff3c4',
      // Signals
      'bull':         '#0ecf8a',
      'bull-dim':     '#064d33',
      'bear':         '#f5495a',
      'bear-dim':     '#4d0a10',
      'neutral-sig':  '#8b9cb5',
      'warn':         '#f5a623',
      // Text
      'text-primary':   '#f0efff',
      'text-secondary': '#9898c0',
      'text-tertiary':  '#5d5d8a',
      'text-disabled':  '#2d2d55',
    },
    fontFamily: {
      sans:    ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
      mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      display: ['Syne', 'system-ui', 'sans-serif'],
    },
    boxShadow: {
      'card':       '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.7)',
      'card-hover': '0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.8)',
      'card-bull':  '0 0 40px rgba(14,207,138,0.08), 0 0 0 1px rgba(14,207,138,0.15)',
      'card-bear':  '0 0 40px rgba(245,73,90,0.08), 0 0 0 1px rgba(245,73,90,0.15)',
      'card-gold':  '0 0 40px rgba(212,160,23,0.08), 0 0 0 1px rgba(212,160,23,0.15)',
      'glow-bull':  '0 0 20px rgba(14,207,138,0.5)',
      'glow-bear':  '0 0 20px rgba(245,73,90,0.5)',
      'glow-gold':  '0 0 20px rgba(212,160,23,0.5)',
    },
    animation: {
      'pulse-slow':    'pulse 4s ease-in-out infinite',
      'fade-in':       'fadeIn 0.3s ease-out forwards',
      'slide-up':      'slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
      'hero-enter':    'heroEnter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
      'bar-fill':      'barFillIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
      'shimmer-sweep': 'shimmerSweep 1.2s ease 1s forwards',
      'ticker':        'ticker 20s linear infinite',
      'live-pulse':    'livePulse 2.5s ease-out infinite',
      'orbit':         'orbit 30s linear infinite',
    },
    keyframes: {
      fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
      slideUp:     { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      heroEnter:   { from: { opacity: '0', transform: 'scale(0.97) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
      barFillIn:   { from: { width: '0%', opacity: '0.5' }, to: { opacity: '1' } },
      shimmerSweep:{ from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
      ticker:      { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      livePulse: {
        '0%':   { boxShadow: '0 0 0 0 rgba(14,207,138,0.5)' },
        '70%':  { boxShadow: '0 0 0 8px transparent' },
        '100%': { boxShadow: '0 0 0 0 transparent' },
      },
      orbit: {
        from: { transform: 'rotate(0deg) translateX(200px) rotate(0deg)' },
        to:   { transform: 'rotate(360deg) translateX(200px) rotate(-360deg)' },
      },
    },
  }
}
```

### 0.3 Rewrite `globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Page background ───────────────────────────────────────────── */
body {
  background-color: #05050f;
  color: #f0efff;
  font-family: 'Inter var', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Dot grid overlay */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* Film grain */
body::after {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px;
}

/* All content above bg layers */
#__next, main { position: relative; z-index: 1; }

/* ─── Ambient orbs ───────────────────────────────────────────────── */
.bg-orb-indigo {
  position: fixed; z-index: 0; pointer-events: none;
  width: 800px; height: 800px;
  top: -200px; left: -200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%);
  filter: blur(40px);
}
.bg-orb-gold {
  position: fixed; z-index: 0; pointer-events: none;
  width: 600px; height: 600px;
  bottom: -100px; right: -100px; border-radius: 50%;
  background: radial-gradient(circle, rgba(212,160,23,0.05) 0%, transparent 70%);
  filter: blur(40px);
  animation: float 20s ease-in-out infinite alternate;
}
@keyframes float {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(-40px, -40px); }
}

/* ─── Card system ────────────────────────────────────────────────── */
.card {
  background: linear-gradient(145deg, #0e0e26 0%, #080818 60%, #0a0a1e 100%);
  border: 1px solid #1e1e42;
  border-radius: 16px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.7);
  transition: transform 280ms cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 280ms ease,
              border-color 280ms ease,
              background 280ms ease;
}
.card:hover {
  transform: translateY(-2px);
  border-color: #2e2e62;
  background: linear-gradient(145deg, #141435 0%, #0d0d2a 60%, #0b0b22 100%);
  box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.8), 0 0 0 1px rgba(85,85,170,0.15);
}
.card-gold {
  border-color: rgba(212,160,23,0.15);
  box-shadow: 0 1px 0 rgba(212,160,23,0.08) inset, 0 0 60px rgba(212,160,23,0.04), 0 8px 32px rgba(0,0,0,0.6);
}
.card-gold:hover {
  border-color: rgba(212,160,23,0.30);
  box-shadow: 0 1px 0 rgba(212,160,23,0.12) inset, 0 0 80px rgba(212,160,23,0.08), 0 12px 48px rgba(0,0,0,0.7);
}

/* Card corner accent */
.card-accent::before {
  content: ''; position: absolute; top: 0; left: 0;
  width: 80px; height: 1px;
  background: linear-gradient(135deg, #92620a 0%, #d4a017 35%, #fcd97a 65%, #d4a017 80%, #92620a 100%);
  border-radius: 16px 0 0 0;
}
.card-accent::after {
  content: ''; position: absolute; top: 0; left: 0;
  width: 1px; height: 60px;
  background: linear-gradient(180deg, #d4a017 0%, transparent 100%);
}

/* ─── Section headers ────────────────────────────────────────────── */
.section-title {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: #5d5d8a;
}

/* ─── Score bars ─────────────────────────────────────────────────── */
.score-bar-track {
  height: 6px; border-radius: 100px;
  background: #12122e;
  box-shadow: 0 1px 3px rgba(0,0,0,0.6) inset;
  position: relative; overflow: hidden;
}
.score-bar-fill {
  height: 100%; border-radius: 100px; position: relative;
  animation: barFillIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards;
}
.score-bar-fill::after {
  content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shimmerSweep 1.2s ease 1s forwards;
}
.score-bar-bull { background: linear-gradient(90deg, #064d33 0%, #0a9a65 60%, #0ecf8a 100%); box-shadow: 4px 0 12px rgba(14,207,138,0.4); }
.score-bar-bear { background: linear-gradient(90deg, #4d0a10 0%, #c02030 60%, #f5495a 100%); box-shadow: 4px 0 12px rgba(245,73,90,0.4); }
.score-bar-gold { background: linear-gradient(90deg, #92620a 0%, #c4880e 50%, #f0b429 100%); box-shadow: 4px 0 14px rgba(240,180,41,0.5); }
.score-bar-thick { height: 10px; }

/* ─── Badges ─────────────────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.badge-bull  { color: #0ecf8a; background: rgba(14,207,138,0.10); border: 1px solid rgba(14,207,138,0.25); box-shadow: 0 0 12px rgba(14,207,138,0.08); }
.badge-bear  { color: #f5495a; background: rgba(245,73,90,0.10); border: 1px solid rgba(245,73,90,0.25); box-shadow: 0 0 12px rgba(245,73,90,0.08); }
.badge-hold  { color: #8b9cb5; background: rgba(139,156,181,0.10); border: 1px solid rgba(139,156,181,0.20); }
.badge-gold  { color: #f0b429; background: rgba(212,160,23,0.10); border: 1px solid rgba(212,160,23,0.25); }
.badge-dot   { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; animation: badgeDotPulse 2s ease-in-out infinite; }
@keyframes badgeDotPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
  50%       { opacity: 0.6; box-shadow: 0 0 2px currentColor; }
}

/* ─── Live status dot ────────────────────────────────────────────── */
.status-live { width: 6px; height: 6px; border-radius: 50%; background: #0ecf8a; animation: livePulse 2.5s ease-out infinite; }

/* ─── Gradient text ──────────────────────────────────────────────── */
.text-gradient-gold {
  background: linear-gradient(135deg, #b8860b 0%, #fcd97a 50%, #f0b429 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ─── Skeleton / loading ─────────────────────────────────────────── */
.skeleton {
  border-radius: 6px;
  background: linear-gradient(90deg, #0d0d24 0%, #12122e 25%, #1a1a3a 50%, #12122e 75%, #0d0d24 100%);
  background-size: 400% 100%;
  animation: skeletonWave 2.2s ease-in-out infinite;
}
@keyframes skeletonWave {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Scroll animations ──────────────────────────────────────────── */
[data-animate] { opacity: 0; transform: translateY(16px); transition: opacity 500ms ease, transform 500ms ease; }
[data-animate].animate-in { opacity: 1; transform: translateY(0); }
[data-animate-child] { opacity: 0; transform: translateY(12px); transition: opacity 400ms ease, transform 400ms ease; }
[data-animate-child].animate-in { opacity: 1; transform: translateY(0); }
[data-animate-child]:nth-child(1) { transition-delay: 0ms; }
[data-animate-child]:nth-child(2) { transition-delay: 60ms; }
[data-animate-child]:nth-child(3) { transition-delay: 120ms; }
[data-animate-child]:nth-child(4) { transition-delay: 180ms; }
[data-animate-child]:nth-child(5) { transition-delay: 240ms; }
[data-animate-child]:nth-child(6) { transition-delay: 300ms; }

/* ─── Table ──────────────────────────────────────────────────────── */
.data-table tr { transition: background 180ms ease; }
.data-table tr:hover { background: rgba(255,255,255,0.025); }
.data-table tr:hover td:first-child { border-left: 2px solid rgba(212,160,23,0.3); }

/* ─── Reduced motion ─────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Phase 1 — Shell Layout

### 1.1 New top-level layout structure in `layout.tsx`

Replace the current `<body>` content with a three-zone shell:

```
Fixed top bar (h-14, z-50, blur backdrop)
  ├── Logo zone (left)
  ├── Search trigger — opens Command Palette overlay (center)
  └── Action zone: live ticker strip + Scan button (right)

Fixed sidebar (left, top-14 to bottom, w-16 → xl:w-64)
  ├── Icon-only nav pills (collapsed)
  ├── Icon + label nav (xl+ expanded)
  └── Active item: indigo-400 color, left border accent, inset glow

Main content area (ml-16 → xl:ml-64, pt-14)
  └── max-w-[1600px] mx-auto p-4 xl:p-6
```

**Top bar spec:**
- `fixed top-0 left-0 right-0 z-50 h-14`
- `bg-[#080818]/80 backdrop-blur-xl border-b border-[#1a1a3a]`
- Logo: `PHAETON` in `font-display font-800 tracking-[0.15em]` with `text-gradient-gold` + `CAPITAL` below in `text-[10px] tracking-[0.3em] text-[#5d5d8a]`
- Search bar: `rounded-xl bg-white/[0.03] border border-[#1e1e42] h-9 px-4 text-sm` — clicking opens full Command Palette overlay
- Live ticker strip: scrolling `animation-ticker` marquee, positive deltas `text-[#0ecf8a]`, negative `text-[#f5495a]`, monospace 11px
- Scan button: `bg-indigo-600 hover:bg-indigo-500 px-4 h-9 rounded-xl text-sm font-600 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]`

**Sidebar nav items (in order):**
Signal | Fundamentals | Technical | Macro | Quant | Risk | Financials | Sentiment | Insider

**Active detection:** `IntersectionObserver` on each `<section id="...">`, threshold `0.3`.

**Command Palette overlay** (⌘K or click search):
- `fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm`
- Panel: `top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[#0d0d24] rounded-2xl border border-[#2d3050] shadow-[0_25px_80px_rgba(0,0,0,0.6)]`
- Input: `text-lg h-14 border-b border-[#1a1a3a]`
- Results: ticker badge + company name + exchange, `hover:bg-[#12122e]`
- Recent searches section header + popular tickers row

---

## Phase 2 — Hero Section

The most important section. Full dramatic treatment.

### 2.1 Container

```
col-span-12 rounded-2xl overflow-hidden relative min-h-[280px] xl:min-h-[320px]
```

Signal-dependent full-bleed background:
- `STRONG_BUY`: `bg-gradient-to-br from-emerald-950 via-[#050508] to-[#050508]` + 400px emerald blur orb top-left at `opacity-20 animate-pulse`
- `BUY`: same but `from-emerald-950/60`
- `HOLD`: `from-amber-950/60`
- `SELL`: `from-orange-950/60`
- `STRONG_SELL`: `from-red-950` + red orb

### 2.2 Layout inside hero: 2 columns at md+

**Left column (`p-8 xl:p-10 flex flex-col justify-center gap-4`):**
- Ticker badge: `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 font-mono text-[13px] font-700 tracking-[0.15em] text-white` + pulsing `status-live` dot
- Company name: `text-[15px] text-[#9898c0]`
- **Signal word:** `font-display text-[64px] xl:text-[80px] font-800 leading-none tracking-[-0.04em] bg-gradient-to-r [signal-from] [signal-to] bg-clip-text text-transparent animate-hero-enter`
  - `STRONG_BUY/BUY`: `from-emerald-300 to-emerald-500`
  - `HOLD`: `from-amber-300 to-amber-500`
  - `SELL`: `from-orange-300 to-orange-500`
  - `STRONG_SELL`: `from-red-300 to-rose-500`
  - Text shadow glow matching signal color at 40-70% opacity
- Sub-row: signal pill badge + `"Confidence: 87.3%"` in `font-mono text-[13px] text-[#9898c0]`

**Right column (`p-8 xl:p-10 border-l border-white/5 flex flex-col gap-6`):**
- 3 mini stat cards (grid-cols-3): Price, P/E, Market Cap
  - Each: `bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/8`
  - Label: `text-[10px] tracking-[0.1em] uppercase text-[#5d5d8a]`
  - Value: `text-[22px] font-700 text-slate-100 font-mono`
  - Delta: color-coded `text-[12px] font-500`
- **Confidence arc gauge** (SVG semicircle, 180°):
  - Background arc: `stroke="#1a1a3a"` 8px
  - Animated fill arc: gradient `#064d33 → #0ecf8a` (bull) or `#4d0a10 → #f5495a` (bear)
  - `stroke-linecap="round"`, stroke-dashoffset animation `1200ms cubic-bezier(0.34,1.56,0.64,1)`
  - Center: value in `font-mono font-700 28px`, label `"CONFIDENCE"` 10px tracked
- AI summary line: `p-4 rounded-xl bg-black/30 border border-white/8` with sparkle icon + italic `text-[13px] text-slate-300`

### 2.3 Hero Entrance Animation

```css
.hero-enter { animation: heroEnter 600ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
```
Signal text staggered 100ms after card, with additional `scale` bounce.

---

## Phase 3 — Section Structure Pattern

Every section below the hero uses this wrapper:

```jsx
<section id="fundamentals" className="col-span-12 scroll-mt-20" data-animate>
  {/* Section header */}
  <div className="flex items-center gap-3 mb-4">
    <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-indigo-400" />
    </div>
    <span className="section-title">Section Name</span>
    <div className="flex-1 h-px bg-gradient-to-r from-[#1a1a3a] to-transparent" />
    {/* optional badge/timestamp */}
  </div>

  {/* Cards grid */}
  <div className="grid grid-cols-12 gap-4 xl:gap-5">
    {/* cards as col-span-* children with data-animate-child */}
  </div>
</section>
```

**Scroll animation:** Add `IntersectionObserver` hook that adds `animate-in` class when section enters viewport (threshold 0.1, rootMargin `0px 0px -40px 0px`). Fire once, then unobserve.

---

## Phase 4 — Stat Tiles

Replace current tile design with:

```
border-radius: 14px (rounded-[14px])
padding: p-5
background: card gradient
border: border-[#1e1e42]
position: relative; overflow: hidden;
```

**Icon container:** `w-9 h-9 rounded-[10px] bg-[rgba(212,160,23,0.08)] border border-[rgba(212,160,23,0.15)] flex items-center justify-center`
- Icon: 18px Lucide icon, `text-gold-base`, stroke-width 1.5

**Label:** `section-title` style (11px, 600, tracking-wide, uppercase, `text-[#5d5d8a]`)

**Value:** `font-mono text-[32px] xl:text-[36px] font-700 leading-none tracking-[-0.02em] text-[#fcd97a]`
- Numbers count up from 0 on enter (`requestAnimationFrame`, easeOutExpo, 1000ms)

**Background corner glow:**
```css
.tile::before {
  content: ''; position: absolute; bottom: -20px; right: -20px;
  width: 80px; height: 80px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%);
}
```

**Hover:** icon container brightens, value scales `1.02` and shifts toward `#fff3c4`, `transition 200ms ease`

**Variants:** `.tile-bull` (emerald icon/border/value), `.tile-bear` (red), `.tile-gold` (default)

---

## Phase 5 — Score Bars

Replace all existing score bar implementations with:

```jsx
<div className="flex items-center gap-3 py-2 border-b border-[#1a1a3a] last:border-0">
  <Icon className="w-3.5 h-3.5 text-[#5d5d8a] flex-shrink-0" />
  <span className="text-[12px] font-500 text-[#9898c0] whitespace-nowrap">{label}</span>
  <div className="flex-1 h-px" style={{background: 'repeating-linear-gradient(90deg,#1e1e42 0px,#1e1e42 2px,transparent 2px,transparent 8px)'}} />
  <span className="font-mono text-[13px] font-600 min-w-[32px] text-right" style={{color: fillColor}}>{value}</span>
  <div className="w-28 score-bar-track">
    <div className={`score-bar-fill ${variant}`} style={{'--bar-target': `${pct}%`, width: `${pct}%`}} />
  </div>
</div>
```

Variants: `score-bar-bull`, `score-bar-bear`, `score-bar-gold`

Thick variant for headline scores: add `score-bar-thick` class.

---

## Phase 6 — Charts

### 6.1 Chart Card Container

```jsx
<div className="card card-accent relative overflow-hidden p-0">
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a3a]">
    <div>
      <h3 className="text-[13px] font-600 text-[#e2e8f0] tracking-[0.02em]">{title}</h3>
      <p className="text-[11px] text-[#5d5d8a] mt-0.5">{subtitle}</p>
    </div>
    {/* Period pills: 7D | 30D | 90D | ALL */}
    <div className="flex gap-1">
      {periods.map(p => (
        <button key={p} className={active===p
          ? 'px-3 py-1.5 rounded-md text-[11px] font-600 bg-[rgba(245,158,11,0.15)] text-[#f0b429] border border-[rgba(245,158,11,0.3)]'
          : 'px-3 py-1.5 rounded-md text-[11px] font-500 text-[#475569] hover:text-[#9898c0]'}>
          {p}
        </button>
      ))}
    </div>
  </div>
  {/* Chart */}
  <div className="px-4 pb-4 pt-6">
    <ResponsiveContainer width="100%" height={260}>
      ...
    </ResponsiveContainer>
  </div>
  {/* Footer legend */}
  <div className="flex items-center justify-between px-6 py-3 border-t border-[#1a1a3a]">
    ...
  </div>
</div>
```

### 6.2 Sentiment Timeline AreaChart

Key Recharts props:
```jsx
<AreaChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
  <defs>
    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.35} />
      <stop offset="40%"  stopColor="#f59e0b" stopOpacity={0.12} />
      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="1 8" stroke="#1e1e42" vertical={false} />
  <XAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} tickMargin={8} />
  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} orientation="right" width={35} domain={[0,1]} />
  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeOpacity: 0.3 }} />
  {/* Color zones (barely visible) */}
  <ReferenceArea y1={0.6} y2={1.0} fill="#0ecf8a" fillOpacity={0.04} />
  <ReferenceArea y1={0.0} y2={0.4} fill="#f5495a" fillOpacity={0.04} />
  {/* Threshold lines */}
  <ReferenceLine y={0.6} stroke="#0ecf8a" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BULLISH', position: 'insideTopRight', style: { fill: '#0ecf8a', fontSize: 10, letterSpacing: '0.08em' } }} />
  <ReferenceLine y={0.4} stroke="#f5495a" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'BEARISH', position: 'insideBottomRight', style: { fill: '#f5495a', fontSize: 10, letterSpacing: '0.08em' } }} />
  <Area
    type="monotone" dataKey="sentiment"
    stroke="#f59e0b" strokeWidth={2.5}
    fill="url(#sentGrad)"
    dot={false}
    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#05050f', strokeWidth: 2 }}
  />
</AreaChart>
```

### 6.3 Custom Tooltip Component

```jsx
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] p-3 min-w-[160px]"
         style={{ background: 'rgba(8,8,26,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <p className="text-[11px] text-[#94a3b8] mb-2 pb-2 border-b border-white/[0.06]">{label}</p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
            <span className="text-[12px] text-[#94a3b8]">{item.name}</span>
          </div>
          <span className="font-mono text-[13px] font-600 text-[#f1f5f9] tabular-nums ml-4">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
```

### 6.4 Gaussian Distribution Chart

- Use `monotone` AreaChart over pre-computed Gaussian PDF points
- Stroke color: dynamic based on mean (emerald if >0.6, gold if 0.4-0.6, red if <0.4)
- Fill: horizontal linearGradient `#ef4444` (left/bearish) → signal color (center peak) → `#0ecf8a` (right/bullish)
- Mean vertical `ReferenceLine`: stroke = signal color, `strokeWidth={2}`, label `"μ"`
- ±1σ and ±2σ vertical reference lines, dashed, muted
- `ReferenceArea` from `mean-σ` to `mean+σ`: `fillOpacity={0.06}` gold — the 68% confidence zone

### 6.5 Insider Volume Bar Chart

Use `ComposedChart` with grouped bars + net line overlay:
```jsx
<ComposedChart>
  <Bar dataKey="buys"  fill="#0ecf8a" fillOpacity={0.8} barSize={10} shape={<RoundedBar />} />
  <Bar dataKey="sells" fill="#f5495a" fillOpacity={0.8} barSize={10} shape={<RoundedBar />} />
  <Line dataKey="net" type="monotone" stroke="#f59e0b" strokeWidth={2} dot={false} />
  <ReferenceLine y={0} stroke="#2d3050" strokeWidth={1} />
</ComposedChart>
```

`RoundedBar` is a custom shape component using SVG `<rect>` with `rx={3} ry={3}` applied only to top corners.

### 6.6 New Gauge Components (add these)

**Confidence Arc Gauge** (`components/ConfidenceGauge.tsx`):
- SVG semicircle (180°), `viewBox="0 0 200 110"`
- Background arc: `stroke="#1a1a3a"` 10px strokeWidth
- Value arc: animated `stroke-dashoffset`, gradient fill (`#064d33 → #0ecf8a` for bull, `#4d0a10 → #f5495a` for bear)
- `strokeLinecap="round"`, `filter: drop-shadow(0 0 8px currentColor)` glow
- Needle: 2px SVG line, rotates -90° to +90° across 180° span, `cubic-bezier(0.34,1.56,0.64,1)` transition
- Center: value in `font-mono font-700 28px #fcd97a`, `"CONFIDENCE"` label 10px

**Sentiment Donut** (`components/SentimentDonut.tsx`):
- `RadialBarChart` with two concentric rings (bull outer, bear inner)
- `startAngle={90} endAngle={-270}`, `cornerRadius={4}`
- Center label: net delta (Bulls-Bears) color-coded, `"Net Sentiment"` subtitle

### 6.7 Sparkline Tiles

For the 4-column historical financials grid:
- No axes, no grid, tight margin `{top:4,right:4,bottom:4,left:4}`
- Trend-based color: upward=`#0ecf8a`, downward=`#f5495a`, flat=`#8b9cb5`
- Matching linearGradient fill from 30% opacity to 0%
- `dot={false}` for all; final point only: custom dot = filled 3px circle + pulsing outer ring
- Tile header shows: value in gold bold + `▲/▼` delta + `%` change muted

---

## Phase 7 — Insider Transactions Table

```
col-span-12 bg-[#0d0d24] rounded-2xl border border-[#1e1e42] overflow-hidden
```

**Card header:** `px-6 py-4 flex items-center justify-between border-b border-[#1a1a3a]`
- Filter pills right: "All" | "Buy" | "Sell" — active: `bg-indigo-500/15 text-indigo-400 border-indigo-500/30`

**Table head:** `bg-[#0a0b12] border-b border-[#1a1a3a]`
- Th cells: `px-6 py-3 text-[11px] font-600 tracking-[0.08em] uppercase text-[#5d5d8a] text-left`
- Sortable: add `ChevronUpDown` icon, hover `text-[#9898c0]`, active sort `text-indigo-400`

**Table body:**
- Even rows: `bg-[#0d0d24]`, Odd: `bg-[#0a0b10]`
- Hover: `bg-[#111320] transition-colors duration-100` + `border-l-2 border-[rgba(212,160,23,0.3)]`
- Td: `px-6 py-4 text-[13px]`

**Column treatments:**
- **Insider:** Name `text-[#e2e8f0] font-500` + Title below `text-[11px] text-[#5d5d8a]`
- **Date:** `font-mono text-[12px] text-[#9898c0]` + relative time below
- **Type:** `badge badge-bull` / `badge badge-bear` pill
- **Shares/Price/Value:** `font-mono text-[13px] font-600 text-right` — abbreviate large amounts (`$227.4M`)
- **Largest value row:** `border-l-2 border-[rgba(245,158,11,0.4)]` heat indicator

---

## Phase 8 — Fundamentals & Technical Upgrades

### Analyst Target Range Visualization

Full-width card showing:
- Left: grouped analyst rating bars (Buy/Overweight/Hold/Underweight/Sell) as a mini bar chart
- Center: horizontal range slider showing Low → Current → Mean Target → High
  - Track: `h-2 rounded-full`, left of current `bg-[#1e1e42]`, right to mean `bg-indigo-500/40`
  - Current price dot: `w-4 h-4 rounded-full bg-white border-2 border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]`
  - Mean target: vertical tick with label
- Right: consensus badge `bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[28px] font-700`

### RSI Gauge

Replace plain text RSI value with:
- Large number colored by zone (<30 emerald, 30-50 amber, 50-70 slate, >70 red)
- Horizontal gauge track with embedded gradient background (emerald → slate → red)
- Needle dot positioned at RSI value
- Zone markers at 30 and 70 (`w-px h-full bg-white/20 absolute`)

### MACD Mini-Histogram

Replace text values with:
- Row of tiny bars for last 12 periods: `w-3 h-full rounded-sm`, emerald if positive, red if negative
- Most recent: full opacity; previous: 60%
- Crossover pill badge below

---

## Phase 9 — Empty & Loading States

### Empty State (no ticker searched)

Replace content area entirely with centered layout:
- Ambient orbiting gradient blobs behind (CSS `@keyframes orbit`, 3-4 orbs, different speeds/colors, `opacity-[0.04] blur-[100px]`)
- Centered content: logo mark (indigo gradient circle 80px) + "Intelligence awaits." headline (`font-display text-[36px] font-700 text-slate-200`) + subtext + large search trigger button
- Popular tickers row: `AAPL NVDA TSLA MSFT AMZN` as clickable pills

### Loading/Skeleton State

Each card shows skeleton elements mirroring its populated layout:
```css
.skeleton { animation: skeletonWave 2.2s ease-in-out infinite; }
```
- Hero: ticker skeleton + large signal text block + gauge outline
- Stat tiles: icon square + label bar + value bar
- Tables: header + 6 row skeletons with varying column widths
- Charts: label + full-width rectangle

Cards resolve independently as data arrives:
- Skeleton: `opacity: 0` (200ms)
- Real content: `opacity: 0 → 1` simultaneously + `translateY(-8px → 0)` + score bars animate

---

## Phase 10 — Typography Upgrades

Apply throughout:
- **Dashboard title / logo:** `font-display font-800 tracking-[-0.04em]` + `text-gradient-gold`
- **Hero signal word:** `font-display text-[64px] xl:text-[80px] font-800 leading-none tracking-[-0.04em]`
- **Section headers:** `font-display text-[18px] font-700 tracking-[-0.02em] text-[#f0efff]`
- **Card header labels:** `text-[11px] font-600 tracking-[0.12em] uppercase text-[#5d5d8a]`  (etched look: `text-shadow: 0 1px 0 rgba(255,255,255,0.08)`)
- **Large stat values:** `font-mono text-[36px] font-700 leading-none tracking-[-0.02em] text-[#fcd97a] tabular-nums`
- **Body:** `text-[14px] leading-[1.65] text-[#9898c0]`
- **All numbers in tables:** `font-mono tabular-nums`

---

## Page Load Sequence

```
T+0ms    → Header renders (real content, no skeleton)
T+0ms    → Ambient background orbs appear
T+100ms  → Card skeletons fade in simultaneously
T+200ms  → (data arrives) → Hero fades in with animate-hero-enter
T+300ms  → Hero signal text bounces in (staggered 100ms)
T+500ms  → Confidence gauge arc draws (1200ms)
T+600ms  → Row 1 cards: staggered slide-up (80ms stagger)
T+900ms  → Score bars fill with shimmer (staggered 60ms)
T+1100ms → Row 2 cards
T+1300ms → Table rows stagger in (20ms per row)
T+1500ms → Number counters complete
T+1800ms → Live pulse animations begin
```

---

## Implementation Priority Order

| # | Change | Visual Impact | Effort |
|---|--------|--------------|--------|
| 1 | CSS tokens + globals.css rewrite | Transforms everything | Low |
| 2 | Shell layout (topbar + sidebar) | Structural foundation | Medium |
| 3 | Page background (dots + orbs + grain) | Immediate premium feel | Low |
| 4 | Font: add Syne, apply type scale | Premium typography | Low |
| 5 | Card glass/shadow system | Entire dashboard depth | Medium |
| 6 | Hero section full redesign | Crown jewel | Medium-High |
| 7 | Score bars (gradient + animation) | Charts feel alive | Low |
| 8 | Badges redesign | Polish | Low |
| 9 | Stat tiles (icon treatment + hover) | Tactile quality | Medium |
| 10 | Confidence arc gauge SVG | Hero WOW factor | Medium |
| 11 | Chart containers + custom tooltip | Chart polish | Medium |
| 12 | Sentiment timeline (gradient zones) | Chart beauty | Medium |
| 13 | Insider table | Very visible improvement | Medium |
| 14 | Fundamentals (range slider, P/E bar) | Data clarity | Medium |
| 15 | Empty + loading states | Production quality | Medium |
| 16 | Scroll entrance animations | Polish layer | Low-Medium |
| 17 | Number count-up animations | Delight | Low |
| 18 | Command palette search | UX delight | Medium-High |
| 19 | New gauge components (confidence, risk) | Additional WOW | Medium |

---

## Accessibility Requirements

- **Contrast:** All text must pass AA minimum. `#9898c0` on `#05050f` ≈ 4.8:1 ✓. `#fcd97a` on deep navy ≈ 9.2:1 ✓
- **Focus rings:** `box-shadow: 0 0 0 2px #05050f, 0 0 0 4px #d4a017` gold double-ring on all interactive elements
- **Color-only data:** Signal types always pair color with text label AND `▲/▼` arrow icon
- **Reduced motion:** The `@media (prefers-reduced-motion: reduce)` block in globals.css disables all transforms and complex keyframes
- **Keyboard:** Command palette must be fully keyboard-navigable (arrow keys, Enter, Escape)

---

*End of Master Plan — Phaeton Capital Design Overhaul v2.0*
