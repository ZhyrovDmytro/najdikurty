import { describe, expect, it } from "vitest";
import type { Database } from "../db/client.js";
import { DrizzleSearchRepository } from "./repository.js";

describe("DrizzleSearchRepository", () => {
  it("normalizes calculated PostgreSQL timestamps before duration matching", async () => {
    const rawRow = {
      id: "slot-1",
      clubId: "club-1",
      clubSlug: "club-1",
      clubName: "Club 1",
      clubTimezone: "Europe/Prague",
      clubBookingUrl: "https://example.test/club",
      clubMinBookingMinutes: 60,
      courtId: "court-1",
      courtName: "Court 1",
      indoor: true,
      surface: null,
      startsAt: new Date("2026-08-22T06:00:00Z"),
      endsAt: new Date("2026-08-22T07:00:00Z"),
      available: true,
      price: null,
      currency: null,
      bookingUrl: null,
      fetchedAt: new Date("2026-08-22T05:55:00Z"),
      windowStartsAt: "2026-08-22 06:00:00+00",
      windowEndsAt: "2026-08-22 20:00:00+00"
    };
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      orderBy: async () => [rawRow]
    };
    const db = { select: () => chain } as unknown as Database;

    const rows = await new DrizzleSearchRepository(db).findAvailableSegments({
      date: "2026-08-22",
      from: "08:00",
      to: "22:00",
      durationMinutes: 60
    });

    expect(rows[0]?.windowStartsAt).toEqual(new Date("2026-08-22T06:00:00Z"));
    expect(rows[0]?.windowEndsAt).toEqual(new Date("2026-08-22T20:00:00Z"));
  });
});
