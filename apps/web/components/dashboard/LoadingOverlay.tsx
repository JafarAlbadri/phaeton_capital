"use client";

export function LoadingOverlay({ scanning, label }: { scanning: boolean; label: string }) {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#05050f]/90 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6">
                {/* Spinning rings */}
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-[#1e1e42]" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#f0b429] animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                </div>
                {/* Label */}
                <div className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-[13px] font-700 tracking-[0.2em] uppercase text-[#f0efff]">
                        {scanning ? `Scanning ${label.toUpperCase()}` : 'Loading Data'}
                    </span>
                    <span className="text-[11px] text-[#9090b8] tracking-wider">Fetching market intelligence...</span>
                </div>
                {/* Animated dots progress */}
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-pulse"
                             style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
