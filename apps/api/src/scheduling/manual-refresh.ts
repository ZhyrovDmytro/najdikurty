import { dateKeyInTimezone } from "@mamekurt/scrapers";
import { z } from "zod";
import { getIndexedClubRegistration, indexedClubSlugs } from "../indexing/catalog.js";
import { ScrapeJobRepository, type ManualRefreshOutcome } from "./job-repository.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const manualRefreshRequestSchema = z.object({
  clubSlugs: z.array(z.string()).min(1).max(10).transform((values) => [...new Set(values)]),
  date: z.string().regex(datePattern)
}).superRefine((input, context) => {
  const supported = new Set(indexedClubSlugs());
  input.clubSlugs.forEach((slug, index) => {
    if (!supported.has(slug)) context.addIssue({ code: "custom", path: ["clubSlugs", index], message: `Unsupported club: ${slug}` });
  });
});

export interface ManualRefreshResult {
  clubSlug: string;
  outcome: ManualRefreshOutcome;
}

export async function queueManualRefreshes(
  repository: ScrapeJobRepository,
  input: z.infer<typeof manualRefreshRequestSchema>,
  now = new Date()
): Promise<ManualRefreshResult[]> {
  const today = dateKeyInTimezone(now, "Europe/Prague");
  const lastAllowedDate = addCalendarDays(today, 30);
  if (input.date < today || input.date > lastAllowedDate) {
    throw new Error(`Refresh date must be between ${today} and ${lastAllowedDate}`);
  }

  const results: ManualRefreshResult[] = [];
  for (const clubSlug of input.clubSlugs) {
    const registration = getIndexedClubRegistration(clubSlug);
    const club = await repository.ensureCatalogClub(registration);
    const outcome = await repository.requestManualRefresh(club.id, input.date, now);
    results.push({ clubSlug, outcome });
  }
  return results;
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
