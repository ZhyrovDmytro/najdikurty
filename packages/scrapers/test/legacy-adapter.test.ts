import { describe, expect, it, vi } from "vitest";
import type { Club } from "../src/domain/models.js";
import { localDateRange } from "../src/domain/timezone.js";
import { LegacyAvailabilityProviderAdapter, normalizeLegacyAvailability } from "../src/providers/legacy-adapter.js";
import type { AvailabilityResult, CourtAvailability } from "../src/types.js";

const club: Club = {
  id: "club-1",
  slug: "club-1",
  name: "Club 1",
  providerId: "example-provider",
  providerConfig: { courtIndoor: true, minBookingMinutes: 60 },
  bookingUrl: "https://example.test/book",
  timezone: "Europe/Prague",
  active: true
};

describe("LegacyAvailabilityProviderAdapter", () => {
  it("converts merged free coverage into normalized atomic segments", () => {
    const result = normalizeLegacyAvailability(legacyResult({
      courts: [courtAvailability([{ start: "09:00", end: "10:30" }])]
    }), club, "example-provider");

    expect(result.courts).toEqual([
      expect.objectContaining({ externalId: "kurt-1", name: "Kurt 1", indoor: true })
    ]);
    expect(result.slots).toHaveLength(3);
    expect(result.slots[0]).toMatchObject({
      startsAt: new Date("2026-08-21T07:00:00Z"),
      endsAt: new Date("2026-08-21T07:30:00Z"),
      bookingUrl: club.bookingUrl,
      available: true
    });
  });

  it("preserves exact provider duration alternatives instead of merging them", () => {
    const result = normalizeLegacyAvailability(legacyResult({
      durationAvailability: {
        "60": [courtAvailability([{ start: "09:00", end: "10:00" }])],
        "90": [courtAvailability([{ start: "09:00", end: "10:30" }])]
      }
    }), club, "example-provider");

    expect(result.slots.map((slot) => [slot.startsAt.toISOString(), slot.endsAt.toISOString()])).toEqual([
      ["2026-08-21T07:00:00.000Z", "2026-08-21T08:00:00.000Z"],
      ["2026-08-21T07:00:00.000Z", "2026-08-21T08:30:00.000Z"]
    ]);
  });

  it("requires a full local day and forwards the normalized date to retrieval", async () => {
    const fetchLegacy = vi.fn().mockResolvedValue(legacyResult());
    const provider = new LegacyAvailabilityProviderAdapter({ id: "example-provider", fetchLegacy });
    const range = localDateRange("2026-08-21", club.timezone);

    await provider.fetchAvailability({ club, ...range });
    expect(fetchLegacy).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-08-21", club }));

    await expect(provider.fetchAvailability({
      club,
      from: new Date("2026-08-21T08:00:00Z"),
      to: new Date("2026-08-21T20:00:00Z")
    })).rejects.toMatchObject({ code: "configuration_error", providerId: "example-provider" });
  });
});

function legacyResult(overrides: Partial<AvailabilityResult> = {}): AvailabilityResult {
  return {
    fetchedAt: "2026-08-21T06:55:00Z",
    sourceUrl: "https://example.test/source",
    date: "2026-08-21",
    dayRange: { start: "09:00", end: "22:00" },
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    clubSlug: club.slug,
    sport: "padel",
    courts: [courtAvailability([])],
    ...overrides
  };
}

function courtAvailability(freeSlots: CourtAvailability["freeSlots"]): CourtAvailability {
  return {
    provider: "example-provider",
    clubSlug: club.slug,
    sport: "padel",
    date: "2026-08-21",
    court: "Kurt 1",
    blocks: [],
    freeSlots
  };
}
