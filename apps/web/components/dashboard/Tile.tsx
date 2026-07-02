"use client";

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Tile({ label, value, sub, variant = 'gold', icon: Icon }: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    variant?: 'bull' | 'bear' | 'gold';
    icon?: LucideIcon;
}) {
    const vClass = variant === 'bull' ? 'text-emerald-400 border-emerald-500/15 bg-emerald-500/10' :
                   variant === 'bear' ? 'text-red-400 border-red-500/15 bg-red-500/10' :
                   'text-gold-base border-[#D97757]/15 bg-[rgba(201,100,66,0.08)]';

    const valClass = variant === 'bull' ? 'text-emerald-400' : variant === 'bear' ? 'text-red-400' : 'text-[#E0906F]';

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
