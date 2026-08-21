import { describe, expect, it, vi } from "vitest";
import type { Club } from "../src/domain/models.js";
import { localDateRange } from "../src/domain/timezone.js";
import { AvailabilityProviderError } from "../src/providers/provider.js";
import { PlaytomicAvailabilityProvider } from "../src/providers/playtomic/provider.js";

const RESOURCE_IDS = ["court-a", "court-b"];
const club: Club = {
  id: "padel-club-spoje",
  slug: "padel-club-spoje",
  name: "Padel Club Spoje",
  providerId: "playtomic",
  providerExternalId: "tenant-1",
  providerConfig: {
    tenantId: "tenant-1",
    resourceIds: RESOURCE_IDS,
    sport: "padel"
  },
  bookingUrl: "https://playtomic.com/clubs/padel-club-spoje",
  timezone: "Europe/Prague",
  active: true
};

describe("PlaytomicAvailabilityProvider", () => {
  it("fetches and normalizes provider records into domain courts and timestamped slots", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            resource_id: "court-b",
            start_date: "2026-08-04",
            slots: [{ start_time: "10:00:00", duration: 90, price: "720 CZK" }]
          },
          {
            resource_id: "court-a",
            start_date: "2026-08-04",
            slots: [{ start_time: "09:00:00", duration: 60, price: "480 CZK" }]
          }
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const provider = new PlaytomicAvailabilityProvider({ fetchImpl });
    const range = localDateRange("2026-08-04", club.timezone);

    const result = await provider.fetchAvailability({ club, ...range });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const requestedUrl = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(Object.fromEntries(requestedUrl.searchParams)).toEqual({
      tenant_id: "tenant-1",
      date: "2026-08-04",
      sport_id: "PADEL"
    });
    expect(result.providerId).toBe("playtomic");
    expect(result.complete).toBe(true);
    expect(result.courts).toEqual([
      {
        id: "padel-club-spoje:court-a",
        clubId: "padel-club-spoje",
        externalId: "court-a",
        name: "Kurt 1",
        active: true
      },
      {
        id: "padel-club-spoje:court-b",
        clubId: "padel-club-spoje",
        externalId: "court-b",
        name: "Kurt 2",
        active: true
      }
    ]);
    expect(result.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clubId: "padel-club-spoje",
          courtId: "padel-club-spoje:court-a",
          startsAt: new Date("2026-08-04T09:00:00.000Z"),
          endsAt: new Date("2026-08-04T10:00:00.000Z"),
          available: true,
          price: 480,
          currency: "CZK",
          bookingUrl: club.bookingUrl
        }),
        expect.objectContaining({
          courtId: "padel-club-spoje:court-b",
          startsAt: new Date("2026-08-04T10:00:00.000Z"),
          endsAt: new Date("2026-08-04T11:30:00.000Z"),
          price: 720,
          currency: "CZK"
        })
      ])
    );
  });

  it("classifies malformed provider payloads as non-retryable parse errors", async () => {
    const provider = new PlaytomicAvailabilityProvider({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    });
    const range = localDateRange("2026-08-04", club.timezone);

    const error = await provider.fetchAvailability({ club, ...range }).catch((caught) => caught);

    expect(error).toBeInstanceOf(AvailabilityProviderError);
    expect(error).toMatchObject({ code: "parse_error", retryable: false, providerId: "playtomic" });
  });

  it("rejects partial-day ranges instead of silently fetching broader availability", async () => {
    const provider = new PlaytomicAvailabilityProvider({ fetchImpl: vi.fn<typeof fetch>() });

    const error = await provider
      .fetchAvailability({
        club,
        from: new Date("2026-08-04T15:00:00.000Z"),
        to: new Date("2026-08-04T19:00:00.000Z")
      })
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(AvailabilityProviderError);
    expect(error).toMatchObject({ code: "configuration_error", retryable: false });
  });
});
