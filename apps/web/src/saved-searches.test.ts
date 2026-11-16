import { describe, expect, it } from "vitest";
import { readSavedSearches, writeSavedSearches, savedSearchNameError, SAVED_SEARCHES_KEY } from "./saved-searches";
import { normalizeSearchPreferences } from "./search-preferences";
const params = { date: "2026-11-01", endDate: "2026-11-03", clubSlugs: ["a"], duration: 90, courtsNeeded: 2, courtType: "indoor" as const, multisportOnly: true, startTime: "18:00", endTime: "22:00" };
const defaults = { ...params, date: "2026-11-16", endDate: "2026-11-16", clubSlugs: ["a", "b"] };
const first = { id: "one", name: "After work", params };
describe("named saved searches", () => {
  it("keeps multiple named searches and original dates across reloads", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const searches = [first, { ...first, id: "two", name: "Weekend", params: { ...params, duration: 60 } }];
    expect(writeSavedSearches(storage, searches)).toBe(true);
    expect(readSavedSearches(storage, defaults, "Previous search")).toEqual(searches);
    expect(writeSavedSearches(storage, searches.slice(1))).toBe(true);
    expect(readSavedSearches(storage, defaults, "Previous search")).toEqual(searches.slice(1));
  });
  it("migrates the previous preset only when no named list exists", () => {
    const storage = { getItem: (key: string) => key === SAVED_SEARCHES_KEY ? null : JSON.stringify(params) };
    expect(readSavedSearches(storage, defaults, "Previous search")).toEqual([{ id: "legacy", name: "Previous search", params }]);
    expect(readSavedSearches({ getItem: key => key === SAVED_SEARCHES_KEY ? "[]" : JSON.stringify(params) }, defaults, "Previous search")).toEqual([]);
  });
  it("ignores malformed entries and handles blocked storage", () => {
    const data = [first, { ...first, params: { ...params, duration: -5 } }, { ...first, id: "bad", name: " " }, null, { ...first, id: "other", name: "after WORK" }];
    expect(readSavedSearches({ getItem: () => JSON.stringify(data) }, defaults, "Previous search")).toEqual([first]);
    expect(readSavedSearches({ getItem() { throw Error(); } }, defaults, "Previous search")).toEqual([]);
    expect(writeSavedSearches({ setItem() { throw Error(); } }, [first])).toBe(false);
  });
  it("requires a nonempty unique name and allows editing the same entry", () => {
    expect(savedSearchNameError("  ", [first])).toBe("nameRequired");
    expect(savedSearchNameError(" AFTER work ", [first])).toBe("nameExists");
    expect(savedSearchNameError("After work", [first], first.id)).toBe(null);
    expect(savedSearchNameError("x".repeat(61), [])).toBe("nameTooLong");
  });
  it("shifts expired ranges together when applying without changing the stored dates", () => {
    expect(normalizeSearchPreferences(params, defaults, "2026-11-23")).toMatchObject({ date: "2026-11-16", endDate: "2026-11-18" });
    expect(params.date).toBe("2026-11-01");
  });
});
