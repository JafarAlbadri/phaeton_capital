export interface SignalStyle {
    word: string;
    from: string;
    to: string;
    shadow: string;
    bgHero: string;
    gauge: [string, string];
}

// Muted, earthy signal styling on warm-charcoal surfaces. Gradient text runs
// light→mid so the hero word stays readable on dark.
export const SIGNAL_STYLES: Record<string, SignalStyle> = {
    STRONG_BUY:  { word: 'STRONG BUY',  from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(127,168,134,0.35)', bgHero: 'from-emerald-950 via-[#262624] to-[#262624]', gauge: ['#3A4B3C', '#7FA886'] },
    BUY:         { word: 'BUY',         from: 'from-emerald-300', to: 'to-emerald-500', shadow: 'rgba(127,168,134,0.25)', bgHero: 'from-emerald-950/60 via-[#262624] to-[#262624]', gauge: ['#3A4B3C', '#7FA886'] },
    HOLD:        { word: 'HOLD',        from: 'from-amber-300',   to: 'to-amber-500',   shadow: 'rgba(217,119,87,0.25)',  bgHero: 'from-amber-950/60 via-[#262624] to-[#262624]', gauge: ['#4A2E1F', '#D97757'] },
    SELL:        { word: 'SELL',        from: 'from-orange-300',  to: 'to-orange-500',  shadow: 'rgba(219,138,92,0.25)',  bgHero: 'from-orange-950/60 via-[#262624] to-[#262624]', gauge: ['#543630', '#D9776B'] },
    STRONG_SELL: { word: 'STRONG SELL', from: 'from-red-300',     to: 'to-red-500',     shadow: 'rgba(217,119,107,0.35)', bgHero: 'from-red-950 via-[#262624] to-[#262624]', gauge: ['#543630', '#D9776B'] },
};

export function getSignal(s?: string | null): SignalStyle {
    return SIGNAL_STYLES[s ?? ''] ?? SIGNAL_STYLES['HOLD'];
}
