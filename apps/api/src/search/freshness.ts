import type { Freshness } from "./types.js";

export interface FreshnessPolicy {
  freshForMs: number;
  acceptableForMs: number;
}

const DEFAULT_POLICY: FreshnessPolicy = {
  freshForMs: 10 * 60_000,
  acceptableForMs: 30 * 60_000
};

export class FreshnessService {
  constructor(private readonly policy: FreshnessPolicy = DEFAULT_POLICY) {}

  evaluate(fetchedAt: Date | null | undefined, now = new Date()): Freshness {
    if (!fetchedAt || Number.isNaN(fetchedAt.getTime())) return "unknown";
    const ageMs = Math.max(0, now.getTime() - fetchedAt.getTime());
    if (ageMs <= this.policy.freshForMs) return "fresh";
    if (ageMs <= this.policy.acceptableForMs) return "acceptable";
    return "stale";
  }
}
