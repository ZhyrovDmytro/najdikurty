import { describe, expect, it, vi } from "vitest";
import type { ScrapeJobRepository } from "./job-repository.js";
import { jobConfig } from "./config.js";
import { seedScrapeTargets } from "./seeder.js";

describe("seedScrapeTargets", () => {
  it("skips hundreds of catalog upserts when the complete target set already exists", async () => {
    const repository = {
      hasCompleteTargetSet: vi.fn().mockResolvedValue(true),
      pauseTargetsOutsideRange: vi.fn(),
      ensureCatalogClub: vi.fn(),
      ensureTarget: vi.fn()
    } as unknown as ScrapeJobRepository;

    await expect(seedScrapeTargets(repository, jobConfig({}), new Date("2026-09-14T10:00:00Z"))).resolves.toBe(0);
    expect(repository.hasCompleteTargetSet).toHaveBeenCalledOnce();
    expect(repository.pauseTargetsOutsideRange).not.toHaveBeenCalled();
    expect(repository.ensureCatalogClub).not.toHaveBeenCalled();
    expect(repository.ensureTarget).not.toHaveBeenCalled();
  });
});
