/**
 * Availability router for the AI model fallback chain.
 *
 * A 429 from a free-tier model usually means its quota is gone for a while
 * (per-minute or per-day). Without memory, every batch re-tries the dead
 * tier, waits for the 429, then falls through — burning latency and request
 * quota all day. The router remembers: a rate-limited model goes on cooldown
 * and the chain routes around it until the cooldown expires.
 */
export class ModelRouter {
    private cooldowns = new Map<string, number>();

    constructor(private cooldownMs: number) {}

    available(model: string, now: number = Date.now()): boolean {
        return (this.cooldowns.get(model) ?? 0) <= now;
    }

    markRateLimited(model: string, now: number = Date.now()): void {
        this.cooldowns.set(model, now + this.cooldownMs);
    }

    /** Models from `chain` that are currently usable, in priority order. */
    availableChain(chain: string[], now: number = Date.now()): string[] {
        return chain.filter(m => this.available(m, now));
    }

    /** Snapshot for health endpoints / logging. */
    status(chain: string[], now: number = Date.now()): {
        chain: string[];
        active: string | null;
        cooling: { model: string; seconds_left: number }[];
    } {
        return {
            chain,
            active: chain.find(m => this.available(m, now)) ?? null,
            cooling: [...this.cooldowns.entries()]
                .filter(([, until]) => until > now)
                .map(([model, until]) => ({ model, seconds_left: Math.round((until - now) / 1000) })),
        };
    }
}
