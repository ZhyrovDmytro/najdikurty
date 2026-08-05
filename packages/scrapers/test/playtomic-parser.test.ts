import { describe, expect, it } from "vitest";
import { parsePlaytomicAvailability } from "../src/providers/playtomic/parser.js";

const SPOJE_RESOURCE_IDS = ["cec43977-821d-4881-b95d-e7be9b74aeed", "ac302981-a812-4b3e-b9c9-fbb8da1f1e24"];

const payload = [
  {
    resource_id: "ac302981-a812-4b3e-b9c9-fbb8da1f1e24",
    start_date: "2026-08-04",
    slots: [
      { start_time: "10:00:00", duration: 60, price: "480 CZK" },
      { start_time: "10:00:00", duration: 90, price: "720 CZK" },
      { start_time: "11:00:00", duration: 60, price: "480 CZK" }
    ]
  },
  {
    resource_id: "cec43977-821d-4881-b95d-e7be9b74aeed",
    start_date: "2026-08-04",
    slots: [
      { start_time: "09:00:00", duration: 60, price: "480 CZK" },
      { start_time: "09:00:00", duration: 120, price: "960 CZK" },
      { start_time: "11:30:00", duration: 60, price: "500 CZK" }
    ]
  }
];

describe("parsePlaytomicAvailability", () => {
  it("normalizes Playtomic UTC slots into Prague court availability", () => {
    const result = parsePlaytomicAvailability(payload, {
      sourceUrl:
        "https://playtomic.com/api/clubs/availability?tenant_id=61e73f55-98c6-405f-ac6b-e2677af5905f&date=2026-08-04&sport_id=PADEL",
      clubSlug: "padel-club-spoje",
      date: "2026-08-04",
      dayRange: { start: "08:00", end: "21:00" },
      resourceIds: SPOJE_RESOURCE_IDS,
      sport: "padel",
      timezone: "Europe/Prague",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "08:00", end: "21:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts).toHaveLength(2);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2"]);
    expect(result.courts[0]?.freeSlots).toEqual([
      { start: "11:00", end: "13:00" },
      { start: "13:30", end: "14:30" }
    ]);
    expect(result.courts[1]?.freeSlots).toEqual([{ start: "12:00", end: "14:00" }]);
  });
});
