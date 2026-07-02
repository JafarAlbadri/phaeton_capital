"use client";

export const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-[10px] p-3 min-w-[160px] bg-[#262624]/85 backdrop-blur-md border border-[#D97757]/35 shadow-[0_8px_32px_rgba(31,30,29,0.12)] z-50">
            <p className="text-[11px] text-[#9B9789] mb-2 pb-2 border-b border-white/[0.08] uppercase tracking-wider">{label}</p>
            {payload.map((item: any) => (
                <div key={item.dataKey} className="flex items-center gap-2 justify-between mb-1 last:mb-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[12px] text-[#9B9789]">{item.name || item.dataKey}</span>
                    </div>
                    <span className="font-mono text-[13px] font-600 text-[#F0EEE6] tabular-nums ml-4">
                        {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                    </span>
                </div>
            ))}
        </div>
    );
};
