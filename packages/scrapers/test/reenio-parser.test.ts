import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReenioAvailability } from "../src/providers/reenio/parser.js";

describe("parseReenioAvailability", () => {
  it("normalizes Reenio aggregate capacity into three synthetic courts", () => {
    const payload = JSON.parse(readFileSync(new URL("./fixtures/reenio-cisarska-louka.json", import.meta.url), "utf8"));
    const result = parseReenioAvailability(payload, {
      sourceUrl: "https://areal-cisarska-louka.reenio.cz/cs/service/hriste-padel-48086/2026-08-04;viewMode=7-days",
      clubSlug: "cisarska-louka-padel",
      date: "2026-08-04",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "06:30", end: "23:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3"]);
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "06:30", end: "17:00" });
    expect(result.courts[0]?.blocks).toContainEqual({
      start: "17:00",
      end: "22:00",
      status: "occupied",
      label: "Unavailable"
    });
    expect(result.courts[2]?.freeSlots).toContainEqual({ start: "06:30", end: "11:00" });
    expect(result.courts[2]?.blocks).toContainEqual({
      start: "11:00",
      end: "14:30",
      status: "occupied",
      label: "Unavailable"
    });
  });
});
