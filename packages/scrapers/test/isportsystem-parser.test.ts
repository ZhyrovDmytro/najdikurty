import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseISportSystemAvailability } from "../src/providers/isportsystem/parser.js";

describe("parseISportSystemAvailability", () => {
  it("normalizes the Head Tenis Centrum weekly timetable into four padel courts", () => {
    const html = readFileSync(new URL("./fixtures/isportsystem-head-teniscentrum.html", import.meta.url), "utf8");
    const result = parseISportSystemAvailability(html, {
      sourceUrl: "https://teniscentrum.isportsystem.cz/?op=tab-id-13",
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-04",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "06:00", end: "24:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts).toHaveLength(4);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "14:00", end: "15:30" });
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "21:00", end: "24:00" });
    expect(result.courts[1]?.freeSlots).toContainEqual({ start: "11:30", end: "16:00" });
    expect(result.courts[3]?.freeSlots).toContainEqual({ start: "23:00", end: "24:00" });
  });
});
