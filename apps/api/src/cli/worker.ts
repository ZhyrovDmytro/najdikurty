import { hostname } from "node:os";
import { dateKeyInTimezone } from "@mamekurt/scrapers";
import { config as loadEnvironment } from "dotenv";
import { createDatabaseFromEnvironment } from "../db/client.js";
import { DrizzleAvailabilityIndexRepository } from "../db/repository.js";
import { getIndexedClubRegistration } from "../indexing/catalog.js";
import { AvailabilityScrapeService } from "../indexing/scrape-service.js";
import { jobConfig } from "../scheduling/config.js";
import { retryDelayMs, ScrapeJobRepository, type ClaimedScrapeTarget } from "../scheduling/job-repository.js";
import { nextScheduledRefresh } from "../scheduling/policy.js";
import { ProviderConcurrencyLimiter } from "../scheduling/provider-limiter.js";
import { seedScrapeTargets } from "../scheduling/seeder.js";

loadEnvironment({ path: [".env.local", ".env"] });

const settings = jobConfig();
const once = process.argv.includes("--once");
const workerId = `${hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;
const connection = createDatabaseFromEnvironment();
const jobRepository = new ScrapeJobRepository(connection.db);
const indexRepository = new DrizzleAvailabilityIndexRepository(connection.db);
const providerLimiter = new ProviderConcurrencyLimiter(
  settings.providerConcurrency,
  settings.providerConcurrencyOverrides
);
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

console.log(JSON.stringify({ event: "worker.started", workerId, concurrency: settings.workerConcurrency }));

try {
  if (once) {
    const seeded = await seedScrapeTargets(jobRepository, settings);
    console.log(JSON.stringify({ event: "worker.targets_ensured", workerId, targetsEnsured: seeded }));
  }
  while (!stopping) {
    const recovered = await jobRepository.recoverAbandonedLocks(new Date(), settings.lockTimeoutMs);
    if (recovered > 0) console.warn(JSON.stringify({ event: "worker.locks_recovered", workerId, recovered }));
    const targets = await jobRepository.claimDue(workerId, settings.workerConcurrency);
    if (targets.length === 0) {
      if (once) break;
      await delay(settings.pollIntervalMs);
      continue;
    }
    await Promise.all(targets.map((target) => providerLimiter.run(target.providerKey, () => processTarget(target))));
  }
} finally {
  await connection.close();
  console.log(JSON.stringify({ event: "worker.stopped", workerId }));
}

async function processTarget(target: ClaimedScrapeTarget): Promise<void> {
  const startedAt = Date.now();
  try {
    const registration = getIndexedClubRegistration(target.clubSlug);
    if (registration.provider.id !== target.providerKey) {
      throw new Error(`Catalog provider ${registration.provider.id} does not match database provider ${target.providerKey}`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error(`Scrape timed out after ${settings.scrapeTimeoutMs}ms`)),
      settings.scrapeTimeoutMs
    );
    try {
      const service = new AvailabilityScrapeService(indexRepository, registration.provider, registration.providerName);
      await service.scrape({
        club: registration.club,
        date: target.targetDate,
        attempt: target.attemptCount,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    const now = new Date();
    const nextRefreshAt = nextScheduledRefresh(now, target.targetDate, {
      timezone: settings.timezone,
      startTime: settings.scheduleStart,
      endTime: settings.scheduleEnd,
      cadenceMinutes: registration.refreshCadenceMinutes
    });
    await jobRepository.complete(
      target,
      workerId,
      dateKeyInTimezone(nextRefreshAt, settings.timezone) > target.targetDate ? null : nextRefreshAt,
      now
    );
    console.log(JSON.stringify({ event: "worker.scrape_success", workerId, targetId: target.id, club: target.clubSlug, date: target.targetDate, durationMs: Date.now() - startedAt }));
  } catch (error) {
    const now = new Date();
    const exhausted = target.attemptCount >= settings.maxAttempts;
    let nextRefreshAt: Date | null = exhausted
      ? nextScheduledRefresh(now, target.targetDate, {
          timezone: settings.timezone,
          startTime: settings.scheduleStart,
          endTime: settings.scheduleEnd,
          cadenceMinutes: getIndexedClubRegistration(target.clubSlug).refreshCadenceMinutes
        })
      : new Date(now.getTime() + retryDelayMs(target.attemptCount, settings.retryBaseMs, settings.retryMaxMs));
    if (exhausted && dateKeyInTimezone(nextRefreshAt, settings.timezone) > target.targetDate) nextRefreshAt = null;
    await jobRepository.fail(
      target,
      workerId,
      error instanceof Error ? error.message : "Unexpected scrape failure",
      nextRefreshAt,
      exhausted ? 0 : target.attemptCount,
      now
    );
    console.error(JSON.stringify({ event: "worker.scrape_failure", workerId, targetId: target.id, club: target.clubSlug, date: target.targetDate, attempt: target.attemptCount, exhausted, nextRefreshAt: nextRefreshAt?.toISOString() ?? null, error: error instanceof Error ? error.message : String(error) }));
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
