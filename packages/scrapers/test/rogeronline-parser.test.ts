import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRogerOnlineAvailability } from "../src/providers/rogeronline/parser.js";

describe("parseRogerOnlineAvailability", () => {
  it("normalizes the first two RogerOnline courts and ignores non-padel columns", () => {
    const html = readFileSync(new URL("./fixtures/rogeronline-sk-satalice.html", import.meta.url), "utf8");
    const result = parseRogerOnlineAvailability(html, {
      sourceUrl: "https://www.rogeronline.cz/v2/?rok=2026&mesic=8&den=6&klub=197&set=3",
      clubSlug: "sk-satalice",
      date: "2026-08-06",
      fetchedAt: "2026-08-06T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-06");
    expect(result.dayRange).toEqual({ start: "08:00", end: "09:30" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.minBookingMinutes).toBe(60);
    expect(result.courts).toHaveLength(2);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2"]);
    expect(result.courts[0]?.freeSlots).toEqual([{ start: "08:00", end: "08:30" }]);
    expect(result.courts[1]?.freeSlots).toEqual([{ start: "08:00", end: "09:00" }]);
  });
});
