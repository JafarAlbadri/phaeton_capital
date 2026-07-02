export interface SignalStyle {
    word: string;
    from: string;
    to: string;
    shadow: string;
    bgHero: string;
    gauge: [string, string];
}

// Muted, earthy signal styling on light surfaces. Gradient text runs
// dark→mid so the hero word stays readable on ivory.
export const SIGNAL_STYLES: Record<string, SignalStyle> = {
    STRONG_BUY:  { word: 'STRONG BUY',  from: 'from-emerald-700', to: 'to-emerald-400', shadow: 'rgba(78,125,83,0.25)',  bgHero: 'from-emerald-950 via-[#FAF9F5] to-[#FAF9F5]', gauge: ['#C9DCC6', '#4E7D53'] },
    BUY:         { word: 'BUY',         from: 'from-emerald-700', to: 'to-emerald-400', shadow: 'rgba(78,125,83,0.2)',   bgHero: 'from-emerald-950/60 via-[#FAF9F5] to-[#FAF9F5]', gauge: ['#C9DCC6', '#4E7D53'] },
    HOLD:        { word: 'HOLD',        from: 'from-amber-600',   to: 'to-amber-400',   shadow: 'rgba(201,100,66,0.2)',  bgHero: 'from-amber-950/60 via-[#FAF9F5] to-[#FAF9F5]', gauge: ['#EDCDB8', '#C96442'] },
    SELL:        { word: 'SELL',        from: 'from-orange-500',  to: 'to-orange-400',  shadow: 'rgba(192,90,46,0.2)',   bgHero: 'from-orange-950/60 via-[#FAF9F5] to-[#FAF9F5]', gauge: ['#EAC7C0', '#C24E42'] },
    STRONG_SELL: { word: 'STRONG SELL', from: 'from-red-600',     to: 'to-red-400',     shadow: 'rgba(194,78,66,0.25)',  bgHero: 'from-red-950 via-[#FAF9F5] to-[#FAF9F5]', gauge: ['#EAC7C0', '#C24E42'] },
};

export function getSignal(s?: string | null): SignalStyle {
    return SIGNAL_STYLES[s ?? ''] ?? SIGNAL_STYLES['HOLD'];
}
