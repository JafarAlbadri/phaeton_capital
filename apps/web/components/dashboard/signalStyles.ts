export interface SignalStyle {
    word: string;
    from: string;
    to: string;
    shadow: string;
    bgHero: string;
    gauge: [string, string];
}

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
