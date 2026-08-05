import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReservantoAvailability } from "../src/providers/reservanto/parser.js";

describe("parseReservantoAvailability", () => {
  it("normalizes Reservanto padel courts into 30-minute free slots", () => {
    const html = readFileSync(new URL("./fixtures/reservanto-padel-neride.html", import.meta.url), "utf8");
    const result = parseReservantoAvailability(html, {
      sourceUrl: "https://booking.reservanto.cz/PlaceRentalLike/Step2_Calendar",
      clubSlug: "padel-neride",
      date: "2026-08-04",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "15:00", end: "24:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3"]);
    expect(result.courts[0]?.freeSlots).toEqual([
      { start: "15:00", end: "16:00" },
      { start: "23:30", end: "24:00" }
    ]);
    expect(result.courts[0]?.blocks).toContainEqual({
      start: "16:00",
      end: "16:30",
      status: "occupied",
      label: "Unavailable"
    });
  });
});
