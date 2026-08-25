import { dateKeyInTimezone } from "@mamekurt/scrapers";
import { getIndexedClubRegistration, indexedClubSlugs } from "../indexing/catalog.js";
import type { JobConfig } from "./config.js";
import type { ScrapeJobRepository } from "./job-repository.js";
import { nextScheduledRefresh, targetDates, targetPriority } from "./policy.js";

export async function seedScrapeTargets(
  repository: ScrapeJobRepository,
  settings: JobConfig,
  now = new Date()
): Promise<number> {
  const dates = targetDates(now, settings.horizonDays, settings.timezone);
  await repository.pauseTargetsOutsideRange(dates[0], dates[dates.length - 1], now);
  let seeded = 0;
  for (const slug of indexedClubSlugs()) {
    const registration = getIndexedClubRegistration(slug);
    const club = await repository.ensureCatalogClub(registration);
    for (const date of dates) {
      const nextRefreshAt = nextScheduledRefresh(now, date, {
        timezone: settings.timezone,
        startTime: settings.scheduleStart,
        endTime: settings.scheduleEnd,
        cadenceMinutes: registration.refreshCadenceMinutes
      });
      await repository.ensureTarget(
        club.id,
        date,
        nextRefreshAt,
        targetPriority(date, now, settings.timezone),
        dateKeyInTimezone(nextRefreshAt, settings.timezone) > date ? "paused" : "pending"
      );
      seeded += 1;
    }
  }
  return seeded;
}
