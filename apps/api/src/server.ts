import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  fetchBookaballAvailability,
  fetchCourtyOneAvailability,
  fetchISportSystemAvailability,
  fetchJdemeNaToAvailability,
  fetchJdemeNaToPortalSearchAvailability,
  fetchPadelosAvailability,
  fetchPadelSlaviaAvailability,
  fetchPlaytomicAvailability,
  fetchReenioAvailability,
  fetchReservantoAvailability,
  fetchRogerOnlineAvailability,
  fetchSkySportCityAvailability,
  isPlaytomicClubSlug
} from "@mamekurt/scrapers";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const DEFAULT_AVAILABILITY_TIMEOUT_MS = 25_000;
const DEFAULT_TK_SPARTA_AVAILABILITY_TIMEOUT_MS = 60_000;
const DEFAULT_JDEMENATO_BROWSER_TIMEOUT_MS = 45_000;
const DEFAULT_ISPORTSYSTEM_BROWSER_TIMEOUT_MS = 90_000;
const DEFAULT_PADEL_SLAVIA_AVAILABILITY_TIMEOUT_MS = 45_000;
const DEFAULT_PADEL_SLAVIA_BROWSER_TIMEOUT_MS = 45_000;
const DEFAULT_AVAILABILITY_CACHE_TTL_MS = 15 * 60_000;
const DEFAULT_AVAILABILITY_STALE_TTL_MS = 6 * 60 * 60_000;
const DEFAULT_AVAILABILITY_CACHE_MAX_ENTRIES = 300;
const DEFAULT_AVAILABILITY_WARMER_INTERVAL_MS = 15 * 60_000;
const DEFAULT_AVAILABILITY_WARMER_START_DELAY_MS = 15_000;
const DEFAULT_AVAILABILITY_WARMER_DAYS = 2;
const DEFAULT_AVAILABILITY_WARMER_CLUBS: string[] = [];

type AvailabilityPayload = Awaited<ReturnType<typeof fetchAvailabilityByClub>>;

interface CachedAvailability {
  availability: AvailabilityPayload;
  cachedAt: number;
}

const availabilityCache = new Map<string, CachedAvailability>();
const inFlightAvailability = new Map<string, Promise<AvailabilityPayload>>();

const querySchema = z.object({
  club: z.string().default("tk-sparta-praha"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  live: z.string().optional(),
  sport: z.string().default("padel")
});

app.use(cors());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/availability", async (request, response, next) => {
  const startedAt = Date.now();
  const requestId = createRequestId();

  try {
    const query = querySchema.parse(request.query);
    const timeoutMs = providerTimeoutMs(query.club);
    const cacheKey = availabilityCacheKey(query);
    pruneAvailabilityCache();
    const cachedAvailability = availabilityCache.get(cacheKey);
    const shouldForceLive = query.live === "1";

    logInfo("availability.start", {
      requestId,
      club: query.club,
      date: query.date,
      sport: query.sport,
      timeoutMs,
      cacheKey,
      forceLive: shouldForceLive
    });

    if (!shouldForceLive && isFreshCacheEntry(cachedAvailability)) {
      logInfo("availability.cache.hit", {
        requestId,
        club: query.club,
        cacheKey,
        ageSeconds: cacheAgeSeconds(cachedAvailability.cachedAt)
      });

      response.json(withCacheInfo(cachedAvailability.availability, cachedAvailability.cachedAt, "fresh"));
      return;
    }

    let availability: AvailabilityPayload;

    try {
      availability = await loadAvailabilityPayload(query, timeoutMs, shouldForceLive ? undefined : cacheKey);
    } catch (error) {
      if (!shouldForceLive && isStaleCacheEntry(cachedAvailability)) {
        logError("availability.cache.stale", error, {
          requestId,
          club: query.club,
          cacheKey,
          ageSeconds: cacheAgeSeconds(cachedAvailability.cachedAt)
        });

        response.json(
          withCacheInfo(cachedAvailability.availability, cachedAvailability.cachedAt, "stale", errorMessage(error))
        );
        return;
      }

      throw error;
    }

    const cachedAt = Date.now();
    storeAvailabilityCache(cacheKey, availability, cachedAt);

    logInfo("availability.success", {
      requestId,
      club: query.club,
      date: availability.date,
      courts: availability.courts.length,
      durationMs: Date.now() - startedAt,
      sourceUrl: availability.sourceUrl,
      cacheKey
    });
    response.json(withCacheInfo(availability, cachedAt, "live"));
  } catch (error) {
    const parsedQuery = querySchema.safeParse(request.query);
    logError("availability.failure", error, {
      requestId,
      club: parsedQuery.success ? parsedQuery.data.club : "unknown",
      date: parsedQuery.success ? parsedQuery.data.date : undefined,
      durationMs: Date.now() - startedAt
    });
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  response.status(500).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`Mamekurt API listening on http://${host}:${port}`);
  startAvailabilityWarmer();
});

function startAvailabilityWarmer(): void {
  if (!availabilityWarmerEnabled()) {
    return;
  }

  const intervalMs = availabilityWarmerIntervalMs();
  const startDelayMs = availabilityWarmerStartDelayMs();

  logInfo("availability.warmer.enabled", {
    clubs: availabilityWarmerClubs(),
    days: availabilityWarmerDays(),
    intervalMs,
    startDelayMs
  });

  setTimeout(() => {
    void warmAvailabilityCache();
    setInterval(() => void warmAvailabilityCache(), intervalMs);
  }, startDelayMs);
}

async function warmAvailabilityCache(): Promise<void> {
  const clubs = availabilityWarmerClubs();
  const dates = availabilityWarmerDates();

  for (const club of clubs) {
    for (const date of dates) {
      const requestId = createRequestId();
      const query: z.infer<typeof querySchema> = {
        club,
        date,
        live: "1",
        sport: "padel"
      };
      const cacheKey = availabilityCacheKey(query);
      const startedAt = Date.now();

      try {
        logInfo("availability.warmer.start", {
          requestId,
          club,
          date,
          cacheKey
        });

        const availability = await loadAvailabilityPayload(query, providerTimeoutMs(club), cacheKey);
        const cachedAt = Date.now();
        storeAvailabilityCache(cacheKey, availability, cachedAt);

        logInfo("availability.warmer.success", {
          requestId,
          club,
          date,
          cacheKey,
          courts: availability.courts.length,
          durationMs: Date.now() - startedAt,
          sourceUrl: availability.sourceUrl
        });
      } catch (error) {
        logError("availability.warmer.failure", error, {
          requestId,
          club,
          date,
          cacheKey,
          durationMs: Date.now() - startedAt
        });
      }
    }
  }
}

async function loadAvailabilityPayload(
  query: z.infer<typeof querySchema>,
  timeoutMs: number,
  inFlightKey?: string
): Promise<AvailabilityPayload> {
  if (inFlightKey) {
    const inFlight = inFlightAvailability.get(inFlightKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = fetchAvailabilityWithTimeout(query, timeoutMs);
  if (inFlightKey) {
    inFlightAvailability.set(inFlightKey, promise);
    promise.finally(() => inFlightAvailability.delete(inFlightKey)).catch(() => undefined);
  }

  return promise;
}

async function fetchAvailabilityWithTimeout(query: z.infer<typeof querySchema>, timeoutMs: number): Promise<AvailabilityPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${query.club} availability timed out`)), timeoutMs);

  try {
    return await fetchAvailabilityByClub(query, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${query.club} availability timed out`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAvailabilityByClub(query: z.infer<typeof querySchema>, signal: AbortSignal) {
  const fetchImpl = abortableFetch(signal);

  if (query.club === "padel-prosek") {
    return fetchSkySportCityAvailability({
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (isPlaytomicClubSlug(query.club)) {
    return fetchPlaytomicAvailability({
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "sk-slavia-praha-padel") {
    return fetchPadelSlaviaAvailability({
      browser: padelSlaviaBrowserOptions(query.live, signal),
      clubSlug: query.club,
      credentials: padelSlaviaCredentials(),
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "head-tenis-centrum-vestec") {
    throw new Error("Head Tenis Centrum availability is temporarily disabled");
  }

  if (query.club === "padel-radotin") {
    throw new Error("Padel Radotín availability is disabled because iSportSystem is Cloudflare protected");
  }

  if (query.club === "padel-cakovice") {
    return fetchISportSystemAvailability({
      browser: isportSystemBrowserOptions(query.live, signal),
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport,
      url: "https://padelautomat.isportsystem.cz/"
    });
  }

  if (query.club === "padel-neride") {
    return fetchReservantoAvailability({
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "padel-dzus") {
    return fetchBookaballAvailability({
      clubSlug: query.club,
      credentials: bookaballCredentials(),
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "padel-powers-smichov") {
    return fetchPadelosAvailability({
      clubSlug: query.club,
      clubId: "216927",
      companyId: "217",
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "one-padel") {
    return fetchCourtyOneAvailability({
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "cisarska-louka-padel") {
    return fetchReenioAvailability({
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "sk-satalice") {
    return fetchRogerOnlineAvailability({
      clubSlug: query.club,
      clubId: "197",
      setId: "3",
      courtCount: 2,
      date: query.date,
      fetchImpl,
      sport: query.sport
    });
  }

  if (query.club === "tk-sparta-praha") {
    return fetchTkSpartaAvailability(query, signal, fetchImpl);
  }

  throw new Error(`Unknown club: ${query.club}`);
}

async function fetchTkSpartaAvailability(query: z.infer<typeof querySchema>, signal: AbortSignal, fetchImpl: typeof fetch) {
  try {
    return await fetchJdemeNaToPortalSearchAvailability({
      browser: jdemenatoBrowserOptions(query.live, signal),
      clubSlug: query.club,
      date: query.date,
      fetchImpl,
      logger: jdemenatoBrowserLogger(),
      organizationName: "TK Sparta Praha",
      sport: query.sport,
      timeoutMs: optionalNumber(process.env.JDEMENATO_PORTAL_TIMEOUT_MS) ?? 10_000
    });
  } catch (error) {
    logError("jdemenato.portal.failure", error, {
      club: query.club,
      date: query.date
    });
  }

  return fetchJdemeNaToAvailability({
    browser: jdemenatoBrowserOptions(query.live, signal),
    clubSlug: query.club,
    credentials: tkSpartaCredentials(),
    date: query.date,
    fetchImpl,
    sport: query.sport
  });
}

function padelSlaviaCredentials() {
  const email = process.env.PADEL_SLAVIA_EMAIL;
  const password = process.env.PADEL_SLAVIA_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email: email.trim(), password: password.trim() };
}

function padelSlaviaBrowserOptions(live?: string, signal?: AbortSignal) {
  if (process.env.PADEL_SLAVIA_BROWSER === "0") {
    return false;
  }

  if (process.env.PADEL_SLAVIA_BROWSER !== "1" && live !== "1") {
    return undefined;
  }

  return {
    enabled: true,
    userDataDir: process.env.PADEL_SLAVIA_BROWSER_PROFILE_DIR,
    channel: process.env.PADEL_SLAVIA_BROWSER_CHANNEL,
    executablePath: process.env.PADEL_SLAVIA_BROWSER_EXECUTABLE_PATH,
    headless: process.env.PADEL_SLAVIA_BROWSER_HEADLESS !== "false",
    signal,
    timeoutMs: optionalNumber(process.env.PADEL_SLAVIA_BROWSER_TIMEOUT_MS) ?? DEFAULT_PADEL_SLAVIA_BROWSER_TIMEOUT_MS
  };
}

function tkSpartaCredentials() {
  const email = process.env.TK_SPARTA_EMAIL;
  const password = process.env.TK_SPARTA_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email: email.trim(), password: password.trim() };
}

function jdemenatoBrowserOptions(live?: string, signal?: AbortSignal) {
  if (process.env.JDEMENATO_BROWSER === "0") {
    return false;
  }

  if (process.env.JDEMENATO_BROWSER !== "1" && live !== "1") {
    return undefined;
  }

  return {
    enabled: true,
    userDataDir: process.env.JDEMENATO_BROWSER_PROFILE_DIR,
    channel: process.env.JDEMENATO_BROWSER_CHANNEL,
    executablePath: process.env.JDEMENATO_BROWSER_EXECUTABLE_PATH,
    headless: process.env.JDEMENATO_BROWSER_HEADLESS !== "false",
    httpTimeoutMs: optionalNumber(process.env.JDEMENATO_HTTP_TIMEOUT_MS),
    logger: jdemenatoBrowserLogger(),
    signal,
    timeoutMs: optionalNumber(process.env.JDEMENATO_BROWSER_TIMEOUT_MS) ?? DEFAULT_JDEMENATO_BROWSER_TIMEOUT_MS,
    proxy: jdemenatoBrowserProxy()
  };
}

function jdemenatoBrowserLogger() {
  return (event: string, details: Record<string, unknown> = {}) => {
    logInfo(`jdemenato.${event}`, details);
  };
}

function isportSystemBrowserOptions(live?: string, signal?: AbortSignal) {
  if (process.env.ISPORTSYSTEM_BROWSER === "0") {
    return false;
  }

  if (process.env.ISPORTSYSTEM_BROWSER !== "1" && live !== "1") {
    return undefined;
  }

  return {
    enabled: true,
    userDataDir: process.env.ISPORTSYSTEM_BROWSER_PROFILE_DIR,
    channel: process.env.ISPORTSYSTEM_BROWSER_CHANNEL,
    executablePath: process.env.ISPORTSYSTEM_BROWSER_EXECUTABLE_PATH,
    headless: process.env.ISPORTSYSTEM_BROWSER_HEADLESS === "true",
    signal,
    timeoutMs: optionalNumber(process.env.ISPORTSYSTEM_BROWSER_TIMEOUT_MS) ?? DEFAULT_ISPORTSYSTEM_BROWSER_TIMEOUT_MS
  };
}

function providerTimeoutMs(clubSlug: string): number {
  const providerSpecificTimeout =
    clubSlug === "tk-sparta-praha"
      ? optionalNumber(process.env.TK_SPARTA_AVAILABILITY_TIMEOUT_MS) ?? DEFAULT_TK_SPARTA_AVAILABILITY_TIMEOUT_MS
      : clubSlug === "sk-slavia-praha-padel"
        ? optionalNumber(process.env.PADEL_SLAVIA_AVAILABILITY_TIMEOUT_MS) ?? DEFAULT_PADEL_SLAVIA_AVAILABILITY_TIMEOUT_MS
      : clubSlug === "padel-radotin" || clubSlug === "padel-cakovice"
        ? optionalNumber(process.env.ISPORTSYSTEM_AVAILABILITY_TIMEOUT_MS) ?? DEFAULT_ISPORTSYSTEM_BROWSER_TIMEOUT_MS
      : undefined;

  return providerSpecificTimeout ?? optionalNumber(process.env.AVAILABILITY_TIMEOUT_MS) ?? DEFAULT_AVAILABILITY_TIMEOUT_MS;
}

function availabilityCacheKey(query: z.infer<typeof querySchema>): string {
  return [query.club, query.sport, query.date ?? pragueDateKey()].join("|");
}

function isFreshCacheEntry(entry: CachedAvailability | undefined): entry is CachedAvailability {
  return entry !== undefined && Date.now() - entry.cachedAt <= availabilityCacheTtlMs();
}

function isStaleCacheEntry(entry: CachedAvailability | undefined): entry is CachedAvailability {
  return entry !== undefined && Date.now() - entry.cachedAt <= availabilityStaleTtlMs();
}

function storeAvailabilityCache(cacheKey: string, availability: AvailabilityPayload, cachedAt: number): void {
  availabilityCache.set(cacheKey, {
    availability,
    cachedAt
  });
  pruneAvailabilityCache();
}

function pruneAvailabilityCache(): void {
  const staleTtlMs = availabilityStaleTtlMs();
  const now = Date.now();

  for (const [cacheKey, entry] of availabilityCache) {
    if (now - entry.cachedAt > staleTtlMs) {
      availabilityCache.delete(cacheKey);
    }
  }

  const maxEntries = availabilityCacheMaxEntries();
  while (availabilityCache.size > maxEntries) {
    const oldestKey = [...availabilityCache.entries()].sort(([, a], [, b]) => a.cachedAt - b.cachedAt)[0]?.[0];
    if (!oldestKey) return;
    availabilityCache.delete(oldestKey);
  }
}

function withCacheInfo(
  availability: AvailabilityPayload,
  cachedAt: number,
  state: "live" | "fresh" | "stale",
  error?: string
) {
  return {
    ...availability,
    cache: {
      state,
      cachedAt: new Date(cachedAt).toISOString(),
      ageSeconds: cacheAgeSeconds(cachedAt),
      stale: state === "stale",
      ...(error ? { error } : {})
    }
  };
}

function cacheAgeSeconds(cachedAt: number): number {
  return Math.max(0, Math.round((Date.now() - cachedAt) / 1000));
}

function availabilityCacheTtlMs(): number {
  return optionalNumber(process.env.AVAILABILITY_CACHE_TTL_MS) ?? DEFAULT_AVAILABILITY_CACHE_TTL_MS;
}

function availabilityStaleTtlMs(): number {
  return optionalNumber(process.env.AVAILABILITY_STALE_TTL_MS) ?? DEFAULT_AVAILABILITY_STALE_TTL_MS;
}

function availabilityCacheMaxEntries(): number {
  return optionalNumber(process.env.AVAILABILITY_CACHE_MAX_ENTRIES) ?? DEFAULT_AVAILABILITY_CACHE_MAX_ENTRIES;
}

function availabilityWarmerEnabled(): boolean {
  return process.env.AVAILABILITY_WARMER === "1" || process.env.AVAILABILITY_WARMER_ENABLED === "1";
}

function availabilityWarmerIntervalMs(): number {
  return optionalNumber(process.env.AVAILABILITY_WARMER_INTERVAL_MS) ?? DEFAULT_AVAILABILITY_WARMER_INTERVAL_MS;
}

function availabilityWarmerStartDelayMs(): number {
  return optionalNumber(process.env.AVAILABILITY_WARMER_START_DELAY_MS) ?? DEFAULT_AVAILABILITY_WARMER_START_DELAY_MS;
}

function availabilityWarmerDays(): number {
  const days = optionalNumber(process.env.AVAILABILITY_WARMER_DAYS) ?? DEFAULT_AVAILABILITY_WARMER_DAYS;
  return Math.max(1, Math.min(14, Math.floor(days)));
}

function availabilityWarmerClubs(): string[] {
  const configuredClubs = process.env.AVAILABILITY_WARMER_CLUBS?.split(",")
    .map((club) => club.trim())
    .filter(Boolean);

  return configuredClubs && configuredClubs.length > 0 ? configuredClubs : DEFAULT_AVAILABILITY_WARMER_CLUBS;
}

function availabilityWarmerDates(): string[] {
  return Array.from({ length: availabilityWarmerDays() }, (_, dayOffset) => pragueDateKey(dayOffset));
}

function pragueDateKey(dayOffset = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Prague",
    year: "numeric"
  });

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return formatter.format(date);
}

function abortableFetch(signal: AbortSignal): typeof fetch {
  return (input, init = {}) => {
    const requestSignal = mergeAbortSignals(signal, init.signal);
    return fetch(input, {
      ...init,
      signal: requestSignal
    });
  };
}

function mergeAbortSignals(primarySignal: AbortSignal, secondarySignal?: AbortSignal | null): AbortSignal {
  if (!secondarySignal) return primarySignal;
  if (primarySignal.aborted) return primarySignal;
  if (secondarySignal.aborted) return secondarySignal;

  const controller = new AbortController();
  const abort = (signal: AbortSignal) => {
    controller.abort(signal.reason);
    primarySignal.removeEventListener("abort", onPrimaryAbort);
    secondarySignal.removeEventListener("abort", onSecondaryAbort);
  };
  const onPrimaryAbort = () => abort(primarySignal);
  const onSecondaryAbort = () => abort(secondarySignal);
  primarySignal.addEventListener("abort", onPrimaryAbort, { once: true });
  secondarySignal.addEventListener("abort", onSecondaryAbort, { once: true });

  return controller.signal;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jdemenatoBrowserProxy() {
  const server = process.env.JDEMENATO_BROWSER_PROXY_SERVER;
  if (!server) {
    return undefined;
  }

  return {
    server,
    username: process.env.JDEMENATO_BROWSER_PROXY_USERNAME,
    password: process.env.JDEMENATO_BROWSER_PROXY_PASSWORD
  };
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function logInfo(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, ...details }));
}

function logError(event: string, error: unknown, details: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...details,
      error: error instanceof Error ? error.message : String(error)
    })
  );
}

function bookaballCredentials() {
  const email = process.env.BOOKABALL_EMAIL;
  const password = process.env.BOOKABALL_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email: email.trim(), password: password.trim() };
}
