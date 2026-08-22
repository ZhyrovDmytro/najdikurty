import { describe, expect, it } from "vitest";
import { databaseSearchToAvailabilityByClub } from "./database-search";

describe("databaseSearchToAvailabilityByClub", () => {
  it("adapts exact database windows to the existing availability view model", () => {
    const result = databaseSearchToAvailabilityByClub({
      results: [{
        club: { slug: "club-1", timezone: "Europe/Prague" },
        court: { name: "Kurt 1" },
        startsAt: "2026-08-22T08:00:00.000Z",
        endsAt: "2026-08-22T09:00:00.000Z",
        bookingUrl: "https://example.test/book",
        lastCheckedAt: "2026-08-22T07:55:00.000Z",
        freshness: "fresh"
      }]
    }, {
      date: "2026-08-22",
      durationMinutes: 60,
      dayRangeByClub: { "club-1": { start: "08:00", end: "22:00" } }
    });

    expect(result["club-1"]).toMatchObject({
      date: "2026-08-22",
      dayRange: { start: "08:00", end: "22:00" },
      durationAvailability: {
        "60": [{ court: "Kurt 1", freeSlots: [{ start: "10:00", end: "11:00" }] }]
      },
      cache: { state: "fresh", stale: false }
    });
  });
});
