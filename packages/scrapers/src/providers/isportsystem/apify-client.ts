import { z } from "zod";
import { dateKeyInTimezone } from "../../domain/timezone.js";
import type { AvailabilityResult } from "../../types.js";
import { isISportSystemDateInMarkdown, parseISportSystemApifyMarkdown } from "./apify-markdown-parser.js";

const PRAGUE_TIMEZONE = "Europe/Prague";
const DEFAULT_BOOKING_URL = "https://teniscentrum.isportsystem.cz/?op=tab-id-13";
const DEFAULT_ACTOR_ID = "vietaro~cloudflare-bypass-scraper";
const DEFAULT_APIFY_API_URL = "https://api.apify.com/v2";
const DEFAULT_CACHE_TTL_MS = 15 * 60_000;
const DEFAULT_ACTOR_TIMEOUT_SECS = 300;
const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

export interface ISportSystemApifyFetchOptions {
  token: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  bookingUrl?: string;
  actorId?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  cacheTtlMs?: number;
  actorTimeoutSecs?: number;
  now?: Date;
}

interface ActorDatasetItem {
  url: string;
  fetchedAt: string;
  success: boolean;
  statusCode: number;
  markdown: string;
  error?: string;
}

interface CachedActorBatch {
  expiresAt: number;
  promise: Promise<ActorDatasetItem[]>;
}

const actorBatchCache = new Map<string, CachedActorBatch>();

const actorStartSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    defaultDatasetId: z.string().min(1),
    status: z.string()
  })
});

const actorRunSchema = z.object({
  data: z.object({ status: z.string() })
});

const actorDatasetSchema = z.array(z.object({
  url: z.string().url(),
  fetchedAt: z.string().min(1),
  success: z.boolean(),
  statusCode: z.number(),
  markdown: z.string(),
  error: z.string().optional()
}));

export async function fetchISportSystemAvailabilityWithApify(
  options: ISportSystemApifyFetchOptions
): Promise<AvailabilityResult> {
  const token = options.token.trim();
  if (!token) throw new Error("APIFY_TOKEN is required for Head Tenis Centrum availability");

  const now = options.now ?? new Date();
  const date = options.date ?? dateKeyInTimezone(now, PRAGUE_TIMEZONE);
  const today = dateKeyInTimezone(now, PRAGUE_TIMEZONE);
  const horizonEnd = addCalendarDays(today, 7);
  const anchorDate = date >= today && date <= horizonEnd ? today : date;
  const bookingUrl = options.bookingUrl ?? DEFAULT_BOOKING_URL;
  const actorId = options.actorId ?? DEFAULT_ACTOR_ID;
  const apiUrl = (options.apiUrl ?? DEFAULT_APIFY_API_URL).replace(/\/$/, "");
  const cacheKey = [apiUrl, actorId, bookingUrl, anchorDate].join("|");
  const items = await cachedActorBatch(cacheKey, now.getTime(), options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS, () =>
    runActorBatch({
      actorId,
      actorTimeoutSecs: options.actorTimeoutSecs ?? DEFAULT_ACTOR_TIMEOUT_SECS,
      apiUrl,
      bookingUrl,
      fetchImpl: options.fetchImpl ?? fetch,
      token,
      dates: [anchorDate, addCalendarDays(anchorDate, 7)]
    })
  );

  const item = items.find((candidate) => candidate.success && isISportSystemDateInMarkdown(candidate.markdown, date));
  if (!item) {
    const actorError = items.find((candidate) => !candidate.success)?.error;
    throw new Error(actorError ?? `Date ${date} is not present in the Head Tenis Centrum Actor output`);
  }

  return parseISportSystemApifyMarkdown(item.markdown, {
    sourceUrl: item.url,
    clubSlug: options.clubSlug,
    date,
    sport: options.sport,
    fetchedAt: item.fetchedAt
  });
}

async function cachedActorBatch(
  cacheKey: string,
  now: number,
  ttlMs: number,
  load: () => Promise<ActorDatasetItem[]>
): Promise<ActorDatasetItem[]> {
  pruneActorBatchCache(now);
  const cached = actorBatchCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = load();
  const entry = { expiresAt: now + Math.max(0, ttlMs), promise };
  actorBatchCache.set(cacheKey, entry);
  promise.catch(() => {
    if (actorBatchCache.get(cacheKey) === entry) actorBatchCache.delete(cacheKey);
  }).catch(() => undefined);
  return promise;
}

function pruneActorBatchCache(now: number): void {
  for (const [key, entry] of actorBatchCache) {
    if (entry.expiresAt <= now) actorBatchCache.delete(key);
  }
}

async function runActorBatch(options: {
  actorId: string;
  actorTimeoutSecs: number;
  apiUrl: string;
  bookingUrl: string;
  fetchImpl: typeof fetch;
  token: string;
  dates: string[];
}): Promise<ActorDatasetItem[]> {
  const actorUrls = [...new Set(options.dates.map((date) => datedBookingUrl(options.bookingUrl, date)))];
  const startUrl = new URL(`${options.apiUrl}/acts/${encodeURIComponent(options.actorId)}/runs`);
  startUrl.searchParams.set("memory", "1024");
  startUrl.searchParams.set("timeout", String(options.actorTimeoutSecs));

  const started = await apifyJson(options.fetchImpl, startUrl, options.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: actorUrls.map((url) => ({ url })),
      extractionSchema: [],
      forceStealth: true,
      markdownThreshold: 0,
      // The Actor runs a full stealth browser per URL. Keep the two weekly
      // anchor pages sequential so they fit reliably in its 1 GB container.
      maxConcurrency: 1,
      maxUrlsPerRun: actorUrls.length,
      fetchTimeoutSecs: Math.min(options.actorTimeoutSecs, 120),
      proxyConfiguration: { useApifyProxy: true }
    })
  });
  const run = actorStartSchema.parse(started).data;

  let status = run.status;
  for (let attempt = 0; !TERMINAL_STATUSES.has(status) && attempt < 4; attempt += 1) {
    const runUrl = new URL(`${options.apiUrl}/actor-runs/${encodeURIComponent(run.id)}`);
    runUrl.searchParams.set("waitForFinish", "45");
    const current = actorRunSchema.parse(await apifyJson(options.fetchImpl, runUrl, options.token)).data;
    status = current.status;
  }
  if (status !== "SUCCEEDED") throw new Error(`Apify Actor run ${run.id} ended with status ${status}`);

  const datasetUrl = new URL(`${options.apiUrl}/datasets/${encodeURIComponent(run.defaultDatasetId)}/items`);
  datasetUrl.searchParams.set("clean", "true");
  datasetUrl.searchParams.set("format", "json");
  datasetUrl.searchParams.set("limit", String(actorUrls.length));
  const items = actorDatasetSchema.parse(await apifyJson(options.fetchImpl, datasetUrl, options.token));
  if (items.length !== actorUrls.length) {
    throw new Error(`Apify Actor returned ${items.length} of ${actorUrls.length} expected timetable pages`);
  }
  return items;
}

async function apifyJson(fetchImpl: typeof fetch, url: URL, token: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  const response = await fetchImpl(url, { ...init, headers });
  if (!response.ok) throw new Error(`Apify API request failed with HTTP ${response.status}`);
  return response.json();
}

function datedBookingUrl(bookingUrl: string, date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const url = new URL(bookingUrl);
  url.searchParams.set("op", "tab-id-13");
  url.searchParams.set("day", String(day));
  url.searchParams.set("month", String(month));
  url.searchParams.set("year", String(year));
  return url.toString();
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
