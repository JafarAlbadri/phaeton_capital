"use client";

export function ScoreBar({ label, value, variant = 'gold', thick = false }: { label: string; value: number | null; variant?: 'bull'|'bear'|'gold'; thick?: boolean }) {
    const pct = Math.max(0, Math.min(100, value ?? 0));
    const barClass = `score-bar-${variant} ${thick ? 'score-bar-thick' : ''}`;
    const txtClass = variant === 'bull' ? '#4E7D53' : variant === 'bear' ? '#C24E42' : '#C96442';
    return (
        <div className="flex items-center gap-3 py-2 border-b border-[#E5E1D5] last:border-0" data-animate-child>
            <div className="w-1.5 h-1.5 rounded-full bg-[#B9B5A7] flex-shrink-0" />
            <span className="text-[12px] font-500 text-[#57554B] whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px" style={{background: 'repeating-linear-gradient(90deg,#DFDACB 0px,#DFDACB 2px,transparent 2px,transparent 8px)'}} />
            <span className="font-mono text-[13px] font-700 min-w-[36px] text-right" style={{color: txtClass}}>{value != null ? value.toFixed(1) : '–'}</span>
            <div className={`w-28 score-bar-track ${thick ? 'h-[10px]' : ''}`}>
                <div className={`score-bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
