import type { AvailabilityResult, CourtAvailability, TimeRange } from "./availability";

export interface DatabaseSearchResult {
  club: {
    slug: string;
    timezone: string;
  };
  court: {
    name: string;
  };
  startsAt: string;
  endsAt: string;
  bookingUrl: string;
  lastCheckedAt: string;
  freshness: "fresh" | "acceptable" | "stale" | "unknown";
}

export interface DatabaseSearchResponse {
  results: DatabaseSearchResult[];
}

export interface DatabaseSearchRetryOptions {
  attempts?: number;
  delay?: (milliseconds: number) => Promise<void>;
  retryDelayMs?: number;
}

export async function fetchDatabaseSearchWithRetry(
  url: string,
  request: (url: string) => Promise<Response>,
  options: DatabaseSearchRetryOptions = {}
): Promise<DatabaseSearchResponse> {
  const attempts = options.attempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  const delay = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request(url);
      const payload = await parseDatabaseSearchResponse(response);
      if (!response.ok) {
        const error = new Error(payload.error ?? `Database search failed (${response.status})`);
        if (!isRetryableStatus(response.status)) throw new NonRetryableDatabaseSearchError(error);
        lastError = error;
      } else {
        return payload;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof NonRetryableDatabaseSearchError) throw error.cause;
    }

    if (attempt < attempts) await delay(retryDelayMs);
  }

  throw lastError instanceof Error ? lastError : new Error("Database search failed");
}

async function parseDatabaseSearchResponse(
  response: Response
): Promise<DatabaseSearchResponse & { error?: string }> {
  try {
    return await response.json() as DatabaseSearchResponse & { error?: string };
  } catch (error) {
    if (!response.ok && !isRetryableStatus(response.status)) {
      throw new NonRetryableDatabaseSearchError(error);
    }
    throw new Error(`Database search returned an invalid response (${response.status})`);
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

class NonRetryableDatabaseSearchError extends Error {
  constructor(readonly cause: unknown) {
    super("Database search failed with a non-retryable response");
  }
}

export function databaseSearchToAvailabilityByClub(
  response: DatabaseSearchResponse,
  options: {
    date: string;
    durationMinutes: number;
    dayRangeByClub: Record<string, TimeRange>;
  }
): Record<string, AvailabilityResult> {
  const resultsByClub = groupBy(response.results, (result) => result.club.slug);
  const availabilityByClub: Record<string, AvailabilityResult> = {};

  for (const [clubSlug, results] of resultsByClub) {
    const resultsByCourt = groupBy(results, (result) => result.court.name);
    const courts: CourtAvailability[] = [...resultsByCourt.entries()].map(([court, courtResults]) => ({
      court,
      blocks: [],
      freeSlots: courtResults.map((result) => ({
        start: localTime(result.startsAt, result.club.timezone, options.date),
        end: localTime(result.endsAt, result.club.timezone, options.date)
      }))
    }));
    const checkedAt = oldestTimestamp(results.map((result) => result.lastCheckedAt));
    const stale = results.some((result) => result.freshness === "stale" || result.freshness === "unknown");
    const sourceUrl = results.find((result) => result.bookingUrl)?.bookingUrl ?? "";

    availabilityByClub[clubSlug] = {
      fetchedAt: checkedAt,
      sourceUrl,
      date: options.date,
      dayRange: options.dayRangeByClub[clubSlug] ?? { start: "00:00", end: "24:00" },
      slotStepMinutes: 30,
      durationAvailability: { [String(options.durationMinutes)]: courts },
      sport: "padel",
      courts,
      cache: {
        state: stale ? "stale" : "fresh",
        cachedAt: checkedAt,
        ageSeconds: Math.max(0, Math.floor((Date.now() - new Date(checkedAt).getTime()) / 1000)),
        stale
      }
    };
  }

  return availabilityByClub;
}

function localTime(value: string, timezone: string, requestedDate: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Database search returned an invalid timestamp");
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${values.year}-${values.month}-${values.day}`;
  const time = `${values.hour}:${values.minute}`;
  return localDate > requestedDate && time === "00:00" ? "24:00" : time;
}

function oldestTimestamp(values: string[]): string {
  return values.reduce((oldest, value) =>
    new Date(value).getTime() < new Date(oldest).getTime() ? value : oldest
  );
}

function groupBy<T, K>(values: T[], keyFor: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    const group = groups.get(key);
    if (group) group.push(value);
    else groups.set(key, [value]);
  }
  return groups;
}
