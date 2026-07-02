"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface QueueJob {
    id: string | undefined;
    name: string;
    ticker: string;
    state: "active" | "waiting";
}

interface QueueData {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    jobs: QueueJob[];
}

export default function QueueStatus() {
    const [data, setData] = useState<QueueData | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState(false);

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/queue-status");
            if (!res.ok) throw new Error();
            const json = await res.json();
            if (json.error) throw new Error();
            setData(json);
            setError(false);
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        poll();
        const id = setInterval(poll, 5_000);
        return () => clearInterval(id);
    }, [poll]);

    const total = (data?.waiting ?? 0) + (data?.active ?? 0);
    const busy = (data?.active ?? 0) > 0;

    if (error || !data) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#262624] border border-[#3A3833] hover:border-[#52504A] transition-all text-[11px]"
            >
                {busy ? (
                    <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                ) : total > 0 ? (
                    <Clock className="w-3 h-3 text-amber-400" />
                ) : data.failed > 0 ? (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
                <span className="text-[#A6A296] font-mono">
                    {busy ? `Scanning ${data.jobs.find(j => j.state === "active")?.ticker ?? "…"}` :
                     total > 0 ? `${total} queued` :
                     data.failed > 0 ? `${data.failed} failed` : "Idle"}
                </span>
                {expanded ? <ChevronUp className="w-3 h-3 text-[#8F8C80]" /> : <ChevronDown className="w-3 h-3 text-[#8F8C80]" />}
            </button>

            {expanded && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-[#262624] border border-[#3A3833] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] z-[100] p-3">
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                            { label: "Active", value: data.active, color: "text-indigo-400" },
                            { label: "Waiting", value: data.waiting, color: "text-amber-400" },
                            { label: "Delayed", value: data.delayed, color: "text-[#A6A296]" },
                            { label: "Failed", value: data.failed, color: "text-red-400" },
                        ].map(s => (
                            <div key={s.label} className="bg-[#262624] rounded-lg p-2 text-center border border-[#3A3833]">
                                <div className={`font-mono text-[14px] font-700 ${s.color}`}>{s.value}</div>
                                <div className="text-[9px] text-[#8F8C80] mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {data.jobs.length > 0 ? (
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-[0.08em] text-[#8F8C80] mb-2">Jobs</div>
                            {data.jobs.slice(0, 6).map((job, i) => (
                                <div key={job.id ?? i} className="flex items-center gap-2 text-[11px]">
                                    {job.state === "active"
                                        ? <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                                        : <Clock className="w-3 h-3 text-amber-400/60 shrink-0" />
                                    }
                                    <span className="font-mono text-[#F0EEE6] font-700">{job.ticker}</span>
                                    <span className={`ml-auto text-[10px] ${job.state === "active" ? "text-indigo-400" : "text-[#8F8C80]"}`}>
                                        {job.state}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-2 text-[11px] text-[#8F8C80]">Queue is empty</div>
                    )}
                </div>
            )}
        </div>
    );
}
