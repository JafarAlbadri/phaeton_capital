"use client";

import { useEffect, useState } from "react";

export function AnimatedNumber({ value, formatter, className }: { value: number, formatter?: (v: number) => string, className?: string }) {
    const [displayVal, setDisplayVal] = useState(0);
    useEffect(() => {
        let startTime: number;
        const duration = 1000;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;
            if (progress < 1) {
                // easeOutExpo
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                setDisplayVal(value * ease);
                requestAnimationFrame(animate);
            } else {
                setDisplayVal(value);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span className={className}>{formatter ? formatter(displayVal) : displayVal.toFixed(0)}</span>;
}
