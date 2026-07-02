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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#2A2927] rounded-2xl border border-[#52504A] shadow-[0_25px_80px_rgba(31,30,29,0.12)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center px-4 border-b border-[#3A3833]">
                    <Search className="w-5 h-5 text-[#9B9789]" />
                    <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') onTrigger(); }}
                        placeholder="Search ticker or company name..."
                        className="w-full h-14 bg-transparent border-none outline-none px-4 text-lg text-[#F0EEE6] placeholder:text-[#9B9789] uppercase" />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-[#33312C] rounded text-[10px] text-[#9B9789] font-mono border border-[#3A3833]">ESC</kbd>
                    </div>
                </div>
                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                    <div className="border-b border-[#3A3833]">
                        {searchResults.map((r) => (
                            <button key={r.symbol} onClick={() => onTrigger(r.symbol)}
                                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#33312C] transition-colors text-left group">
                                <span className="font-mono text-[14px] font-700 text-[#F0EEE6] w-20 shrink-0">{r.symbol}</span>
                                <span className="text-[13px] text-[#A6A296] flex-1 truncate group-hover:text-[#F0EEE6] transition-colors">{r.shortname}</span>
                                <span className="text-[10px] font-mono text-[#9B9789] border border-[#3A3833] px-2 py-0.5 rounded shrink-0">{r.exchange}</span>
                            </button>
                        ))}
                    </div>
                )}
                {searchLoading && (
                    <div className="px-5 py-3 text-[12px] text-[#A6A296]">Searching...</div>
                )}
                {!searchLoading && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                    <div className="px-5 py-3 text-[12px] text-[#A6A296]">No results — try a ticker symbol or full company name</div>
                )}

                {/* Popular fallback when no query */}
                {searchQuery.trim().length === 0 && (
                    <div className="p-4">
                        <div className="section-title mb-3">Popular Tickers</div>
                        <div className="flex flex-wrap gap-2">
                            {['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GME'].map(t => (
                                <button key={t} onClick={() => onTrigger(t)}
                                    className="px-3 py-1.5 rounded-lg bg-[#33312C] border border-[#3A3833] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-sm font-mono tracking-wider transition-colors">
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
