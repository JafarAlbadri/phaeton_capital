"use client";

import { useState, useEffect } from "react";

// ─── Animations Hook ──────────────────────────────────────────────────────────
export function useScrollAnimation() {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    const children = entry.target.querySelectorAll('[data-animate-child]');
                    children.forEach(c => c.classList.add('animate-in'));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}

// ─── Number Counter ──────────────────────────────────────────────────────
export function AnimatedNumber({ value, formatter, className }: { value: number; formatter?: (v: number) => string; className?: string }) {
    const [displayVal, setDisplayVal] = useState(0);
    useEffect(() => {
        let startTime: number;
        const duration = 1000;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;
            if (progress < 1) {
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                setDisplayVal(value * ease);
                requestAnimationFrame(animate);
            } else {
                setDisplayVal(value);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span className={className}>{formatter ? formatter(displayVal) : displayVal.toFixed(0)}</span>;
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
export function Tile({ label, value, sub, variant = 'gold', icon: Icon }: { label: string; value: string; sub?: string; variant?: 'bull' | 'bear' | 'gold'; icon?: any }) {
    const vClass = variant === 'bull' ? 'text-emerald-400 border-emerald-500/15 bg-emerald-500/10' :
                   variant === 'bear' ? 'text-red-400 border-red-500/15 bg-red-500/10' :
                   'text-gold-base border-[#d4a017]/15 bg-[rgba(212,160,23,0.08)]';
    const valClass = variant === 'bull' ? 'text-emerald-400' : variant === 'bear' ? 'text-red-400' : 'text-[#fcd97a]';

    return (
        <div className="card rounded-[14px] p-5 relative overflow-hidden group" data-animate-child>
            <div className={`absolute bottom-[-20px] right-[-20px] w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl ${variant === 'bull' ? 'bg-emerald-500/20' : variant === 'bear' ? 'bg-red-500/20' : 'bg-gold-base/20'}`} />
            <div className="flex items-start gap-4 z-10 relative">
                <div className={`w-9 h-9 rounded-[10px] border flex items-center justify-center shrink-0 transition-colors ${vClass}`}>
                    {Icon && <Icon size={18} strokeWidth={1.5} />}
                </div>
                <div className="flex-1">
                    <div className="section-title mb-1.5">{label}</div>
                    <div className={`font-mono text-[18px] xl:text-[20px] font-700 leading-none tracking-[-0.02em] transition-transform duration-200 group-hover:scale-[1.02] origin-left ${valClass}`}>
                        {value}
                    </div>
                    {sub && <div className="text-[11px] text-[#7878a0] mt-1.5">{sub}</div>}
                </div>
            </div>
        </div>
    );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
export function ScoreBar({ label, value, variant = 'gold', thick = false }: { label: string; value: number | null; variant?: 'bull' | 'bear' | 'gold'; thick?: boolean }) {
    const pct = Math.max(0, Math.min(100, value ?? 0));
    const barClass = `score-bar-${variant} ${thick ? 'score-bar-thick' : ''}`;
    const txtClass = variant === 'bull' ? '#0ecf8a' : variant === 'bear' ? '#f5495a' : '#f0b429';
    return (
        <div className="flex items-center gap-3 py-2 border-b border-[#1a1a3a] last:border-0" data-animate-child>
            <div className="w-1.5 h-1.5 rounded-full bg-[#4a4a7a] flex-shrink-0" />
            <span className="text-[12px] font-500 text-[#b0b0d0] whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px" style={{background: 'repeating-linear-gradient(90deg,#2a2a50 0px,#2a2a50 2px,transparent 2px,transparent 8px)'}} />
            <span className="font-mono text-[13px] font-700 min-w-[36px] text-right" style={{color: txtClass}}>{value != null ? value.toFixed(1) : '–'}</span>
            <div className={`w-28 score-bar-track ${thick ? 'h-[10px]' : ''}`}>
                <div className={`score-bar-fill ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ─── Confidence Arc Gauge ─────────────────────────────────────────────────────
export function ConfidenceGauge({ value, colors }: { value: number; colors: string[] }) {
    const pct = Math.max(0, Math.min(100, value));
    const dashoffset = 283 - (283 * pct) / 100;
    const rotate = -90 + (180 * pct) / 100;

    return (
        <div className="relative w-full max-w-[200px] flex flex-col items-center">
            <svg viewBox="0 0 200 110" className="w-full overflow-visible">
                <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={colors[0]} />
                        <stop offset="100%" stopColor={colors[1]} />
                    </linearGradient>
                </defs>
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a1a3a" strokeWidth="10" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283}
                      className="animate-[barFillIn_1.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                      style={{ animationName: 'dash', '--dash-to': dashoffset } as any} />
                <line x1="100" y1="100" x2="100" y2="30" stroke="#f0efff" strokeWidth="2" strokeLinecap="round"
                      className="origin-[100px_100px] transition-transform duration-1000 ease-out"
                      style={{ transform: `rotate(${rotate}deg)` }} />
                <circle cx="100" cy="100" r="4" fill="#f0efff" />
                <text x="100" y="85" textAnchor="middle" className="font-mono font-700 text-[28px]" fill="#fcd97a">{pct.toFixed(0)}%</text>
                <text x="100" y="105" textAnchor="middle" className="font-sans font-600 text-[9px] tracking-[0.15em] uppercase" fill="#5d5d8a">CONFIDENCE</text>
            </svg>
            <style jsx>{`
                @keyframes dash {
                    to { stroke-dashoffset: var(--dash-to); }
                }
            `}</style>
        </div>
    );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
export const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-[10px] p-3 min-w-[160px] bg-[#08081a]/85 backdrop-blur-md border border-[#f59e0b]/35 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50">
            <p className="text-[11px] text-[#94a3b8] mb-2 pb-2 border-b border-white/[0.06] uppercase tracking-wider">{label}</p>
            {payload.map((item: any) => (
                <div key={item.dataKey} className="flex items-center gap-2 justify-between mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[12px] text-[#94a3b8]">{item.name || item.dataKey}</span>
                    </div>
                    <span className="font-mono text-[13px] font-600 text-[#f1f5f9] tabular-nums ml-4">
                        {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                    </span>
                </div>
            ))}
        </div>
    );
};
