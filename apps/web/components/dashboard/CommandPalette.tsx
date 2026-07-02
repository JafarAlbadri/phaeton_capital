"use client";

import { Search } from 'lucide-react';

export interface TickerSearchResult {
    symbol: string;
    shortname: string;
    exchange: string;
}

export function CommandPalette({ searchQuery, setSearchQuery, searchResults, searchLoading, onClose, onTrigger }: {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchResults: TickerSearchResult[];
    searchLoading: boolean;
    onClose: () => void;
    onTrigger: (symbol?: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-20" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#FFFFFF] rounded-2xl border border-[#D5CFBE] shadow-[0_25px_80px_rgba(31,30,29,0.12)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center px-4 border-b border-[#E5E1D5]">
                    <Search className="w-5 h-5 text-[#7C7A6E]" />
                    <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onTrigger(); }}
                        placeholder="Search ticker or company name..."
                        className="w-full h-14 bg-transparent border-none outline-none px-4 text-lg text-[#1F1E1D] placeholder:text-[#7C7A6E] uppercase" />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-[#EFECE1] rounded text-[10px] text-[#7C7A6E] font-mono border border-[#E5E1D5]">ESC</kbd>
                    </div>
                </div>
                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                    <div className="border-b border-[#E5E1D5]">
                        {searchResults.map((r) => (
                            <button key={r.symbol} onClick={() => onTrigger(r.symbol)}
                                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#EFECE1] transition-colors text-left group">
                                <span className="font-mono text-[14px] font-700 text-[#1F1E1D] w-20 shrink-0">{r.symbol}</span>
                                <span className="text-[13px] text-[#6E6C60] flex-1 truncate group-hover:text-[#1F1E1D] transition-colors">{r.shortname}</span>
                                <span className="text-[10px] font-mono text-[#7C7A6E] border border-[#E5E1D5] px-2 py-0.5 rounded shrink-0">{r.exchange}</span>
                            </button>
                        ))}
                    </div>
                )}
                {searchLoading && (
                    <div className="px-5 py-3 text-[12px] text-[#6E6C60]">Searching...</div>
                )}
                {!searchLoading && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                    <div className="px-5 py-3 text-[12px] text-[#6E6C60]">No results — try a ticker symbol or full company name</div>
                )}

                {/* Popular fallback when no query */}
                {searchQuery.trim().length === 0 && (
                    <div className="p-4">
                        <div className="section-title mb-3">Popular Tickers</div>
                        <div className="flex flex-wrap gap-2">
                            {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GME'].map(t => (
                                <button key={t} onClick={() => onTrigger(t)}
                                    className="px-3 py-1.5 rounded-lg bg-[#EFECE1] border border-[#E5E1D5] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-sm font-mono tracking-wider transition-colors">
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
