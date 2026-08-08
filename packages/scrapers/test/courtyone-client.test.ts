import { describe, expect, it } from "vitest";
import { fetchCourtyOneAvailability } from "../src/providers/courtyone/client.js";

describe("fetchCourtyOneAvailability", () => {
  it("fetches per-court CourtyONE slots through public Next actions", async () => {
    const requestBodies: unknown[] = [];
    const requestHeaders: Headers[] = [];

    const result = await fetchCourtyOneAvailability({
      baseUrl: "https://onepadel.cz",
      clubSlug: "one-padel",
      courtConfigs: [
        { id: "court-1", name: "Kurt 1" },
        { id: "court-2", name: "Kurt 2" }
      ],
      date: "2026-08-10",
      fetchImpl: async (_input, init) => {
        requestBodies.push(JSON.parse(String(init?.body)));
        requestHeaders.push(new Headers(init?.headers));
        const body = requestBodies.at(-1) as Array<{ courtId: string }>;
        const courtId = body[0]?.courtId;

        return new Response(nextActionResponse(slotsByCourt[courtId] ?? []), {
          headers: { "content-type": "text/x-component" }
        });
      }
    });

    expect(requestHeaders[0]?.get("next-action")).toBe("40df0a7d527c5ebe69466f048cbd25e31f574f51ee");
    expect(requestBodies).toEqual([
      [{ tenantSlug: "onepadel", venueSlug: "praha-zlicin", courtId: "court-1", ymd: "2026-08-10", durationMinutes: 60 }],
      [{ tenantSlug: "onepadel", venueSlug: "praha-zlicin", courtId: "court-2", ymd: "2026-08-10", durationMinutes: 60 }]
    ]);
    expect(result.sourceUrl).toBe("https://onepadel.cz/book");
    expect(result.dayRange).toEqual({ start: "07:00", end: "24:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.minBookingMinutes).toBe(60);
    expect(result.courts).toHaveLength(2);
    expect(result.courts[0]?.court).toBe("Kurt 1");
    expect(result.courts[0]?.freeSlots).toEqual([
      { start: "07:00", end: "08:30" },
      { start: "23:00", end: "24:00" }
    ]);
    expect(result.courts[1]?.freeSlots).toEqual([{ start: "10:00", end: "11:00" }]);
  });
});

const slotsByCourt: Record<string, unknown[]> = {
  "court-1": [
    { startsAt: "2026-08-10T05:00:00.000Z", endsAt: "2026-08-10T06:00:00.000Z", priceMinor: 85000, currency: "CZK" },
    { startsAt: "2026-08-10T05:30:00.000Z", endsAt: "2026-08-10T06:30:00.000Z", priceMinor: 85000, currency: "CZK" },
    { startsAt: "2026-08-10T21:00:00.000Z", endsAt: "2026-08-10T22:00:00.000Z", priceMinor: 85000, currency: "CZK" }
  ],
  "court-2": [
    { startsAt: "2026-08-10T08:00:00.000Z", endsAt: "2026-08-10T09:00:00.000Z", priceMinor: 85000, currency: "CZK" }
  ]
};

function nextActionResponse(slots: unknown[]): string {
  return `0:{"a":"$@1","f":"","q":"","i":false,"b":"test"}\n1:${JSON.stringify({ ok: true, slots })}\n`;
}
