"use client";

import { useEffect } from "react";

// Adds .animate-in to [data-animate] elements (and their [data-animate-child]
// descendants) as they scroll into view.
export function useScrollAnimation() {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Find children and animate
                    const children = entry.target.querySelectorAll('[data-animate-child]');
                    children.forEach(c => c.classList.add('animate-in'));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}
