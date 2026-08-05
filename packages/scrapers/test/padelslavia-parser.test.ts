import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePadelSlaviaAvailability } from "../src/providers/padelslavia/parser.js";

describe("parsePadelSlaviaAvailability", () => {
  it("normalizes the Slavia HTML timetable into four padel courts", () => {
    const html = readFileSync(new URL("./fixtures/padelslavia.html", import.meta.url), "utf8");
    const result = parsePadelSlaviaAvailability(html, {
      sourceUrl: "https://rezervace.padelslavia.cz/cs/rezervace",
      clubSlug: "sk-slavia-praha-padel",
      date: "2026-08-04",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "08:00", end: "22:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts).toHaveLength(4);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "13:00", end: "15:00" });
    expect(result.courts[2]?.freeSlots).toContainEqual({ start: "11:30", end: "15:30" });
    expect(result.courts[3]?.freeSlots).toContainEqual({ start: "21:30", end: "22:00" });
  });
});
