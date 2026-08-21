import { describe, expect, it, vi } from "vitest";
import { fetchPlaytomicAvailability } from "../src/providers/playtomic/client.js";

describe("fetchPlaytomicAvailability", () => {
  it("preserves the legacy API result while fetching through the normalized provider", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            resource_id: "cec43977-821d-4881-b95d-e7be9b74aeed",
            start_date: "2026-08-04",
            slots: [
              { start_time: "09:00:00", duration: 60, price: "480 CZK" },
              { start_time: "09:00:00", duration: 120, price: "960 CZK" }
            ]
          },
          {
            resource_id: "ac302981-a812-4b3e-b9c9-fbb8da1f1e24",
            start_date: "2026-08-04",
            slots: [{ start_time: "10:00:00", duration: 60, price: "480 CZK" }]
          }
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const result = await fetchPlaytomicAvailability({
      clubSlug: "padel-club-spoje",
      date: "2026-08-04",
      fetchImpl,
      sport: "padel"
    });

    expect(result).toMatchObject({
      clubSlug: "padel-club-spoje",
      date: "2026-08-04",
      dayRange: { start: "08:00", end: "21:00" },
      slotStepMinutes: 30,
      sport: "padel"
    });
    expect(result.courts.map((court) => ({ court: court.court, freeSlots: court.freeSlots }))).toEqual([
      { court: "Kurt 1", freeSlots: [{ start: "11:00", end: "13:00" }] },
      { court: "Kurt 2", freeSlots: [{ start: "12:00", end: "13:00" }] }
    ]);
  });
});
