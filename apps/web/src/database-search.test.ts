import { describe, expect, it } from "vitest";
import { databaseSearchToAvailabilityByClub, fetchDatabaseSearchWithRetry } from "./database-search";

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

describe("fetchDatabaseSearchWithRetry", () => {
  it("retries a transient failure and returns the warmed response", async () => {
    let calls = 0;
    const result = await fetchDatabaseSearchWithRetry("https://api.test/search", async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("Failed to fetch");
      return Response.json({ results: [] });
    }, { delay: async () => undefined, retryDelayMs: 0 });

    expect(calls).toBe(2);
    expect(result).toEqual({ results: [] });
  });

  it("supports enough attempts for a longer cold start", async () => {
    let calls = 0;
    const result = await fetchDatabaseSearchWithRetry("https://api.test/search", async () => {
      calls += 1;
      if (calls < 3) throw new TypeError("Failed to fetch");
      return Response.json({ results: [] });
    }, { attempts: 3, delay: async () => undefined, retryDelayMs: 0 });

    expect(calls).toBe(3);
    expect(result).toEqual({ results: [] });
  });

  it("retries a transient server response", async () => {
    let calls = 0;
    const result = await fetchDatabaseSearchWithRetry("https://api.test/search", async () => {
      calls += 1;
      return calls === 1
        ? Response.json({ error: "Starting" }, { status: 503 })
        : Response.json({ results: [] });
    }, { delay: async () => undefined, retryDelayMs: 0 });

    expect(calls).toBe(2);
    expect(result).toEqual({ results: [] });
  });

  it("does not retry a rejected search query", async () => {
    let calls = 0;
    await expect(fetchDatabaseSearchWithRetry("https://api.test/search", async () => {
      calls += 1;
      return Response.json({ error: "Invalid search query" }, { status: 400 });
    }, { delay: async () => undefined, retryDelayMs: 0 })).rejects.toThrow("Invalid search query");

    expect(calls).toBe(1);
  });
});
