import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "./query.js";

describe("searchQuerySchema", () => {
  it("normalizes API filters into a SearchQuery", () => {
    expect(searchQuerySchema.parse({
      date: "2026-08-22",
      from: "17:00",
      to: "21:00",
      duration: "90",
      clubs: "padel-club-spoje, tenis-a-padel-klub-pisecna",
      indoor: "false"
    })).toEqual({
      date: "2026-08-22",
      from: "17:00",
      to: "21:00",
      durationMinutes: 90,
      clubSlugs: ["padel-club-spoje", "tenis-a-padel-klub-pisecna"],
      indoor: false
    });
  });

  it("rejects invalid dates and impossible windows", () => {
    expect(searchQuerySchema.safeParse({ date: "2026-02-30" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ date: "2026-08-22", from: "21:00", to: "17:00" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ date: "2026-08-22", from: "18:00", to: "19:00", duration: "90" }).success).toBe(false);
  });
});
