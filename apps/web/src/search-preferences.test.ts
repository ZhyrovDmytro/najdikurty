import { describe, expect, it } from "vitest";
import { searchDates, parseSearchPreferences, normalizeSearchPreferences } from "./search-preferences";

const defaults = { date: "2026-11-16", endDate: "2026-11-16", clubSlugs: ["a", "b"], duration: 60, courtsNeeded: 1, courtType: "all" as const, multisportOnly: false, startTime: null, endTime: null };

describe("advanced search parameters", () => {
  it("includes both ends of a range across a month boundary", () => {
    expect(searchDates("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(searchDates("2026-12-02", "2026-11-30")).toEqual([]);
  });
  it("normalizes dates and removes unknown clubs without changing the source", () => {
    const saved = { ...defaults, date: "2026-11-01", endDate: "2026-12-01", clubSlugs: ["b", "removed"], duration: 90 };
    expect(normalizeSearchPreferences(saved, defaults, "2026-11-23")).toEqual({ ...saved, date: defaults.date, endDate: "2026-11-23", clubSlugs: ["b"] });
    expect(saved.date).toBe("2026-11-01");
  });
  it("rejects malformed dates, duration and time windows", () => {
    for (const value of [null, { ...defaults, duration: -1 }, { ...defaults, date: "2026-02-30" }, { ...defaults, startTime: "22:00", endTime: "20:00" }]) {
      expect(parseSearchPreferences(value, defaults.clubSlugs)).toBeNull();
    }
  });
  it("restores the card filter and accepts older parameters", () => {
    expect(parseSearchPreferences({ ...defaults, multisportOnly: true }, defaults.clubSlugs)?.multisportOnly).toBe(true);
    const { multisportOnly, ...oldSearch } = defaults;
    expect(parseSearchPreferences(oldSearch, defaults.clubSlugs)?.multisportOnly).toBe(false);
    expect(parseSearchPreferences({ ...defaults, multisportOnly: "true" }, defaults.clubSlugs)).toBeNull();
  });
  it("preserves an empty selection instead of searching all clubs", () => {
    expect(parseSearchPreferences({ ...defaults, clubSlugs: [] }, defaults.clubSlugs)?.clubSlugs).toEqual([]);
  });
});
