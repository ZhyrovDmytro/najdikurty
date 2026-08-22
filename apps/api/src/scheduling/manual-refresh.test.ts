import { describe, expect, it, vi } from "vitest";
import type { ScrapeJobRepository } from "./job-repository.js";
import { manualRefreshStatusQuerySchema, queueManualRefreshes } from "./manual-refresh.js";

describe("manual refresh horizon", () => {
  const now = new Date("2026-08-21T12:00:00Z");

  it("allows a refresh exactly seven days ahead", async () => {
    const repository = {
      ensureCatalogClub: vi.fn().mockResolvedValue({ id: "club-id" }),
      requestManualRefresh: vi.fn().mockResolvedValue("queued")
    } as unknown as ScrapeJobRepository;

    await expect(queueManualRefreshes(repository, {
      clubSlugs: ["padel-club-spoje"],
      date: "2026-08-28"
    }, now)).resolves.toEqual([{ clubSlug: "padel-club-spoje", outcome: "queued" }]);
  });

  it("rejects a refresh more than seven days ahead", async () => {
    const repository = {} as ScrapeJobRepository;

    await expect(queueManualRefreshes(repository, {
      clubSlugs: ["padel-club-spoje"],
      date: "2026-08-29"
    }, now)).rejects.toThrow("Refresh date must be between 2026-08-21 and 2026-08-28");
  });
});

describe("manual refresh status query", () => {
  it("parses and deduplicates supported clubs", () => {
    expect(manualRefreshStatusQuerySchema.parse({
      clubSlugs: "padel-club-spoje,padel-club-spoje,padel-prosek",
      date: "2026-08-22"
    })).toEqual({
      clubSlugs: ["padel-club-spoje", "padel-prosek"],
      date: "2026-08-22"
    });
  });

  it("rejects unsupported clubs", () => {
    expect(manualRefreshStatusQuerySchema.safeParse({
      clubSlugs: "unknown-club",
      date: "2026-08-22"
    }).success).toBe(false);
  });
});
