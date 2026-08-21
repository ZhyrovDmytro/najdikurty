import { describe, expect, it } from "vitest";
import type { SearchRepository } from "./repository.js";
import { SearchService } from "./search-service.js";
import type { IndexedAvailabilitySegment, SearchQuery } from "./types.js";

describe("SearchService", () => {
  it("returns normalized DB results with aggregated price and oldest contributing freshness", async () => {
    const repository: SearchRepository = {
      findAvailableSegments: async () => [segment("18:00", "18:30", 200, "11:55"), segment("18:30", "19:00", 250, "11:40")]
    };
    const service = new SearchService(repository, undefined, () => new Date("2026-08-21T12:00:00Z"));
    const query: SearchQuery = { date: "2026-08-21", from: "18:00", to: "21:00", durationMinutes: 60 };

    const response = await service.search(query);

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      startsAt: "2026-08-21T18:00:00.000Z",
      endsAt: "2026-08-21T19:00:00.000Z",
      durationMinutes: 60,
      price: 450,
      currency: "CZK",
      lastCheckedAt: "2026-08-21T11:40:00.000Z",
      freshness: "acceptable"
    });
  });
});

function segment(start: string, end: string, price: number, fetchedTime: string): IndexedAvailabilitySegment {
  return {
    id: `${start}-${end}`,
    clubId: "club-1",
    clubSlug: "club-1",
    clubName: "Club 1",
    clubTimezone: "UTC",
    clubBookingUrl: "https://example.test/club",
    clubMinBookingMinutes: 60,
    courtId: "court-1",
    courtName: "Court 1",
    indoor: true,
    surface: "hard",
    startsAt: new Date(`2026-08-21T${start}:00Z`),
    endsAt: new Date(`2026-08-21T${end}:00Z`),
    available: true,
    price,
    currency: "CZK",
    bookingUrl: "https://example.test/book",
    fetchedAt: new Date(`2026-08-21T${fetchedTime}:00Z`),
    windowStartsAt: new Date("2026-08-21T18:00:00Z"),
    windowEndsAt: new Date("2026-08-21T21:00:00Z")
  };
}
