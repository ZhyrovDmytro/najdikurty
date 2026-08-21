import { describe, expect, it } from "vitest";
import { findContiguousAvailability } from "./contiguous-slots.js";
import type { IndexedAvailabilitySegment } from "./types.js";

describe("findContiguousAvailability", () => {
  it.each([
    [60, 2],
    [90, 3],
    [120, 4]
  ])("builds a %i-minute option from adjacent segments", (duration, segmentCount) => {
    const input = Array.from({ length: segmentCount }, (_, index) =>
      segment(minutes(18, index * 30), minutes(18, (index + 1) * 30))
    );

    const results = findContiguousAvailability(input, duration);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      startsAt: new Date("2026-08-21T18:00:00Z"),
      endsAt: new Date(new Date("2026-08-21T18:00:00Z").getTime() + duration * 60_000)
    });
  });

  it("rejects a chain containing a gap", () => {
    const results = findContiguousAvailability([
      segment("18:00", "18:30"),
      segment("19:00", "19:30"),
      segment("19:30", "20:00")
    ], 90);
    expect(results).toEqual([]);
  });

  it("does not treat overlapping booking alternatives as adjacent segments", () => {
    const results = findContiguousAvailability([
      segment("18:00", "19:00"),
      segment("18:30", "19:30")
    ], 90);
    expect(results).toEqual([]);
  });

  it("never combines segments from different courts", () => {
    const results = findContiguousAvailability([
      segment("18:00", "18:30", { courtId: "court-1" }),
      segment("18:30", "19:00", { courtId: "court-2" })
    ], 60);
    expect(results).toEqual([]);
  });

  it("rejects a chain with an unavailable intermediate segment", () => {
    const results = findContiguousAvailability([
      segment("18:00", "18:30"),
      segment("18:30", "19:00", { available: false }),
      segment("19:00", "19:30")
    ], 90);
    expect(results).toEqual([]);
  });

  it("respects exact requested window boundaries", () => {
    const bounds = { windowStartsAt: at("18:00"), windowEndsAt: at("19:30") };
    const results = findContiguousAvailability([
      segment("17:30", "18:00", bounds),
      segment("18:00", "18:30", bounds),
      segment("18:30", "19:00", bounds),
      segment("19:00", "19:30", bounds),
      segment("19:30", "20:00", bounds)
    ], 90);
    expect(results.map((result) => [result.startsAt.toISOString(), result.endsAt.toISOString()])).toEqual([
      ["2026-08-21T18:00:00.000Z", "2026-08-21T19:30:00.000Z"]
    ]);
  });

  it("deduplicates equivalent provider records and booking alternatives", () => {
    const duplicate = segment("18:00", "19:30", { id: "slot-a" });
    const results = findContiguousAvailability([
      duplicate,
      { ...duplicate, id: "slot-b" },
      segment("18:00", "18:30", { id: "slot-c" }),
      segment("18:30", "19:00", { id: "slot-d" }),
      segment("19:00", "19:30", { id: "slot-e" })
    ], 90);
    expect(results).toHaveLength(1);
    expect(results[0]?.segments).toHaveLength(1);
  });

  it("respects the configured provider minimum booking duration", () => {
    const results = findContiguousAvailability([
      segment("18:00", "18:30", { clubMinBookingMinutes: 60 })
    ], 30);
    expect(results).toEqual([]);
  });
});

function segment(
  start: string,
  end: string,
  overrides: Partial<IndexedAvailabilitySegment> = {}
): IndexedAvailabilitySegment {
  return {
    id: overrides.id ?? `${overrides.courtId ?? "court-1"}-${start}-${end}`,
    clubId: "club-1",
    clubSlug: "club-1",
    clubName: "Club 1",
    clubTimezone: "UTC",
    clubBookingUrl: "https://example.test/club",
    clubMinBookingMinutes: null,
    courtId: "court-1",
    courtName: "Court 1",
    indoor: true,
    surface: null,
    startsAt: at(start),
    endsAt: at(end),
    available: true,
    price: 100,
    currency: "CZK",
    bookingUrl: "https://example.test/book",
    fetchedAt: new Date("2026-08-21T17:55:00Z"),
    windowStartsAt: at("00:00"),
    windowEndsAt: new Date("2026-08-22T00:00:00Z"),
    ...overrides
  };
}

function at(time: string): Date {
  return new Date(`2026-08-21T${time}:00Z`);
}

function minutes(hour: number, minuteOffset: number): string {
  const total = hour * 60 + minuteOffset;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
