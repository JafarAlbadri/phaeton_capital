"use client";

import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary for Recharts / chart components.
 * If malformed data causes a chart to throw, this catches it
 * and renders a graceful fallback instead of crashing the entire page.
 */
export default class ChartErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error("[ChartErrorBoundary]", error.message);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="card rounded-xl p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <span className="text-red-400 text-lg">!</span>
                    </div>
                    <p className="text-[13px] text-[#9898c0] text-center">
                        {this.props.fallbackMessage || "Chart data could not be rendered"}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
