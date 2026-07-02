"use client";

export function ConfidenceGauge({ value, colors }: { value: number; colors: string[] }) {
    const pct = Math.max(0, Math.min(100, value));
    const dashoffset = 283 - (283 * pct) / 100; // 180 deg arc is ~283 length
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
                {/* Background arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#3A3833" strokeWidth="10" strokeLinecap="round" />
                {/* Value arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283}
                      className="animate-[barFillIn_1.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                      style={{ animationName: 'dash', '--dash-to': dashoffset } as React.CSSProperties} />
                {/* Needle */}
                <line x1="100" y1="100" x2="100" y2="30" stroke="#F0EEE6" strokeWidth="2" strokeLinecap="round"
                      className="origin-[100px_100px] transition-transform duration-1000 ease-out"
                      style={{ transform: `rotate(${rotate}deg)` }} />
                <circle cx="100" cy="100" r="4" fill="#F0EEE6" />

                <text x="100" y="85" textAnchor="middle" className="font-mono font-700 text-[28px]" fill="#E0906F">{pct.toFixed(0)}%</text>
                <text x="100" y="105" textAnchor="middle" className="font-sans font-600 text-[9px] tracking-[0.15em] uppercase" fill="#8F8C80">CONFIDENCE</text>
            </svg>
            <style jsx>{`
                @keyframes dash {
                    to { stroke-dashoffset: var(--dash-to); }
                }
            `}</style>
        </div>
    );
}
