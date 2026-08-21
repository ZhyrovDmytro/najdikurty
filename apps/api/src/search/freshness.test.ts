import { describe, expect, it } from "vitest";
import { FreshnessService } from "./freshness.js";

describe("FreshnessService", () => {
  const service = new FreshnessService();
  const now = new Date("2026-08-21T12:00:00Z");

  it("centralizes fresh, acceptable, stale, and unknown states", () => {
    expect(service.evaluate(new Date("2026-08-21T11:50:00Z"), now)).toBe("fresh");
    expect(service.evaluate(new Date("2026-08-21T11:30:00Z"), now)).toBe("acceptable");
    expect(service.evaluate(new Date("2026-08-21T11:29:59Z"), now)).toBe("stale");
    expect(service.evaluate(undefined, now)).toBe("unknown");
  });
});
