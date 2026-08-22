import { describe, expect, it } from "vitest";
import { approximateCountdown, nextApproximateCheck } from "./refresh-schedule";

describe("availability refresh schedule", () => {
  it("uses the next 20-minute check for today", () => {
    const now = new Date("2026-08-22T08:04:00Z");
    expect(nextApproximateCheck("2026-08-22", now).toISOString()).toBe("2026-08-22T08:20:00.000Z");
    expect(approximateCountdown(nextApproximateCheck("2026-08-22", now), now)).toBe("16 min");
  });

  it("uses a less frequent check for dates farther ahead", () => {
    const now = new Date("2026-08-22T08:04:00Z");
    expect(nextApproximateCheck("2026-08-26", now).toISOString()).toBe("2026-08-22T14:00:00.000Z");
  });

  it("moves the estimate to the next morning outside the active window", () => {
    const now = new Date("2026-08-22T20:01:00Z");
    expect(nextApproximateCheck("2026-08-22", now).toISOString()).toBe("2026-08-23T06:00:00.000Z");
  });
});
