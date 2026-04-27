import type { SignalStyle } from './types';

export const SIGNAL_STYLES: Record<string, SignalStyle> = {
    STRONG_BUY:  { word: 'STRONG BUY',  from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(14,207,138,0.5)', bgHero: 'from-emerald-950 via-[#050508] to-[#050508]', gauge: ['#064d33', '#0ecf8a'] },
    BUY:         { word: 'BUY',         from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(14,207,138,0.5)', bgHero: 'from-emerald-950/60 via-[#050508] to-[#050508]', gauge: ['#064d33', '#0ecf8a'] },
    HOLD:        { word: 'HOLD',        from: 'from-amber-300',   to: 'to-amber-500',   shadow: 'rgba(245,158,11,0.5)', bgHero: 'from-amber-950/60 via-[#050508] to-[#050508]', gauge: ['#92620a', '#fcd97a'] },
    SELL:        { word: 'SELL',        from: 'from-orange-300',  to: 'to-orange-500',  shadow: 'rgba(249,115,22,0.5)', bgHero: 'from-orange-950/60 via-[#050508] to-[#050508]', gauge: ['#4d0a10', '#f5495a'] },
    STRONG_SELL: { word: 'STRONG SELL', from: 'from-red-300',     to: 'to-rose-500',    shadow: 'rgba(239,68,68,0.6)', bgHero: 'from-red-950 via-[#050508] to-[#050508]', gauge: ['#4d0a10', '#f5495a'] },
};

export function getSignal(s?: string | null): SignalStyle {
    return SIGNAL_STYLES[s ?? ''] ?? SIGNAL_STYLES['HOLD'];
}

/** Derive signal from price-change percentage (recommended vs current). */
export function signalFromPct(pct: number): string {
    if (pct > 10) return 'STRONG_BUY';
    if (pct > 2)  return 'BUY';
    if (pct >= -2) return 'HOLD';
    if (pct >= -10) return 'SELL';
    return 'STRONG_SELL';
}

/** Format analyst recommendation string: "strong_buy" → "Strong Buy" */
export function formatRecommendation(rec: string): string {
    return rec.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
