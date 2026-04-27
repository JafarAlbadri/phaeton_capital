"use client";

import { Search } from 'lucide-react';

interface CommandPaletteProps {
    isOpen: boolean;
    searchQuery: string;
    searchResults: { symbol: string; shortname: string; exchange: string }[];
    searchLoading: boolean;
    onClose: () => void;
    onSearchChange: (q: string) => void;
    onSelect: (ticker: string) => void;
}

export default function CommandPalette({ isOpen, searchQuery, searchResults, searchLoading, onClose, onSearchChange, onSelect }: CommandPaletteProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#0d0d24] rounded-2xl border border-[#2d3050] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center px-4 border-b border-[#1a1a3a]">
                    <Search className="w-5 h-5 text-[#8080aa]" />
                    <input autoFocus value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onSelect(searchQuery); }}
                        placeholder="Search ticker or company name..."
                        className="w-full h-14 bg-transparent border-none outline-none px-4 text-lg text-[#f0efff] placeholder:text-[#8080aa] uppercase" />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-[#12122e] rounded text-[10px] text-[#8080aa] font-mono border border-[#1a1a3a]">ESC</kbd>
                    </div>
                </div>
                {searchResults.length > 0 && (
                    <div className="border-b border-[#1a1a3a]">
                        {searchResults.map((r) => (
                            <button key={r.symbol} onClick={() => onSelect(r.symbol)}
                                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#12122e] transition-colors text-left group">
                                <span className="font-mono text-[14px] font-700 text-[#f0efff] w-20 shrink-0">{r.symbol}</span>
                                <span className="text-[13px] text-[#9898c0] flex-1 truncate group-hover:text-[#f0efff] transition-colors">{r.shortname}</span>
                                <span className="text-[10px] font-mono text-[#8080aa] border border-[#1a1a3a] px-2 py-0.5 rounded shrink-0">{r.exchange}</span>
                            </button>
                        ))}
                    </div>
                )}
                {searchLoading && (
                    <div className="px-5 py-3 text-[12px] text-[#9898c0]">Searching...</div>
                )}
                {!searchLoading && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                    <div className="px-5 py-3 text-[12px] text-[#9898c0]">No results — try a ticker symbol or full company name</div>
                )}
                {searchQuery.trim().length === 0 && (
                    <div className="p-4">
                        <div className="section-title mb-3">Popular Tickers</div>
                        <div className="flex flex-wrap gap-2">
                            {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GME'].map(t => (
                                <button key={t} onClick={() => onSelect(t)}
                                    className="px-3 py-1.5 rounded-lg bg-[#12122e] border border-[#1a1a3a] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-sm font-mono tracking-wider transition-colors">
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
