import { describe, expect, it } from "vitest";
import { nextScheduledRefresh, refreshCadenceMinutes, scheduleTimes, targetDates } from "./policy.js";

describe("refresh scheduling policy", () => {
  it("refreshes today through the seven-day horizon every 20 minutes", () => {
    const now = new Date("2026-08-21T10:00:00Z");
    expect(refreshCadenceMinutes("2026-08-21", now)).toBe(20);
    expect(refreshCadenceMinutes("2026-08-22", now)).toBe(20);
    expect(refreshCadenceMinutes("2026-08-24", now)).toBe(20);
    expect(refreshCadenceMinutes("2026-08-28", now)).toBe(20);
    expect(refreshCadenceMinutes("2026-08-29", now)).toBe(1_440);
  });

  it("uses the same 20-minute schedule for a date six days ahead", () => {
    const now = new Date("2026-08-23T13:51:00Z");
    expect(nextScheduledRefresh(now, "2026-08-29").toISOString()).toBe("2026-08-23T14:00:00.000Z");
  });

  it("always includes the final 22:00 run", () => {
    expect(scheduleTimes("08:00", "22:00", 180)).toEqual(["08:00", "11:00", "14:00", "17:00", "20:00", "22:00"]);
  });

  it("moves work outside the Prague window to 08:00", () => {
    expect(nextScheduledRefresh(new Date("2026-08-21T04:30:00Z"), "2026-08-21").toISOString()).toBe("2026-08-21T06:00:00.000Z");
    expect(nextScheduledRefresh(new Date("2026-08-21T20:00:01Z"), "2026-08-21").toISOString()).toBe("2026-08-22T06:00:00.000Z");
  });

  it("creates the configured future-date horizon", () => {
    expect(targetDates(new Date("2026-08-21T12:00:00Z"), 3)).toEqual([
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
      "2026-08-24"
    ]);
  });
});
