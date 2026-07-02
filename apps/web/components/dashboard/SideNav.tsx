"use client";

import {
    Activity, Award, BarChart2, Bot, Briefcase, Calendar, DollarSign,
    Globe, LayoutGrid, Radio, Scale, Shield, TrendingUp, Zap,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
    { icon: Radio, label: 'Signals', id: '#hero' },
    { icon: DollarSign, label: 'Fundamentals', id: '#fundamentals' },
    { icon: BarChart2, label: 'Technicals', id: '#technical' },
    { icon: Globe, label: 'Macro Environment', id: '#macro' },
    { icon: LayoutGrid, label: 'Quant Models', id: '#quant' },
    { icon: Shield, label: 'Risk Analysis', id: '#risk' },
    { icon: TrendingUp, label: 'Sentiment Flow', id: '#sentiment' },
    { icon: Briefcase, label: 'Insider Flow', id: '#insider' },
    { icon: Award, label: 'Full Analysis', id: '#helhetsanalys' },
    { icon: Calendar, label: 'Predictions', id: '#predictions' },
    { icon: Activity, label: 'Alpha Attribution', id: '#alpha' },
    { icon: Zap, label: 'Squeeze', id: '#squeeze' },
    { icon: Scale, label: 'Bottom Line', id: '#bottomline' },
];

const MOBILE_ITEMS = [
    { icon: Radio, label: 'Signals', id: '#hero' },
    { icon: DollarSign, label: 'Fundamentals', id: '#fundamentals' },
    { icon: BarChart2, label: 'Technicals', id: '#technical' },
    { icon: Bot, label: 'Quant', id: '#quant' },
    { icon: TrendingUp, label: 'Sentiment', id: '#sentiment' },
];

export function SideNav() {
    return (
        <>
            {/* Desktop sidebar */}
            <div className="fixed left-0 top-14 bottom-0 w-16 xl:w-64 border-r border-[#3A3833] bg-[#1F1E1D]/50 backdrop-blur-md z-40 flex flex-col py-6 overflow-hidden hover:w-64 transition-all duration-300 group">
                <nav className="flex flex-col gap-2 px-3">
                    {SIDEBAR_ITEMS.map((item, i) => (
                        <a key={i} href={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A6A296] hover:text-[#F0EEE6] hover:bg-[#33312C] transition-colors whitespace-nowrap relative">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] font-500 opacity-0 xl:opacity-100 group-hover:opacity-100 transition-opacity">{item.label}</span>
                        </a>
                    ))}
                </nav>
            </div>

            {/* Mobile bottom nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#262624]/90 backdrop-blur-xl border-t border-[#3A3833] flex items-center justify-around px-2 py-2">
                {MOBILE_ITEMS.map((item, i) => (
                    <a key={i} href={item.id} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[#A6A296] hover:text-[#F0EEE6] hover:bg-[#33312C] transition-colors">
                        <item.icon className="w-4 h-4" />
                        <span className="text-[9px] font-500 tracking-wide">{item.label}</span>
                    </a>
                ))}
            </nav>
        </>
    );
}
