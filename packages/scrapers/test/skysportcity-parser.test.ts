import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSkySportCityAvailability } from "../src/providers/skysportcity/parser.js";

describe("parseSkySportCityAvailability", () => {
  it("normalizes Padel Prosek court availability from the timeline table", () => {
    const html = readFileSync(new URL("./fixtures/skysportcity-padel-prosek.html", import.meta.url), "utf8");
    const result = parseSkySportCityAvailability(html, {
      sourceUrl: "https://rezervace.skysportcity.cz/timeline/day?tabIdx=0&criteriaTimestamp=1785880800000&resetFilter=true",
      clubSlug: "padel-prosek",
      date: "2026-08-05",
      fetchedAt: "2026-08-05T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-05");
    expect(result.dayRange).toEqual({ start: "09:00", end: "22:00" });
    expect(result.slotStepMinutes).toBe(15);
    expect(result.courts).toHaveLength(4);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "09:00", end: "10:00" });
    expect(result.courts[3]?.freeSlots).toContainEqual({ start: "21:00", end: "22:00" });
  });
});
