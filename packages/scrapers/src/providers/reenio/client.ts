import { parseReenioAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const BASE_URL = "https://areal-cisarska-louka.reenio.cz";
const SERVICE_ID = "48086";
const SERVICE_TYPE = "3";
const COURT_COUNT = 3;
const NETWORK_RETRY_DELAY_MS = 2_000;

export interface ReenioFetchOptions {
  clubSlug: string;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export async function fetchReenioAvailability(options: ReenioFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const date = options.date ?? pragueDateInputValue(new Date());
  const baseUrl = options.baseUrl ?? BASE_URL;
  const sourceUrl = reenioBookingUrl(baseUrl, date);
  const response = await fetchTermListWithRetry(fetchImpl, baseUrl, date, sourceUrl);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Reenio availability request failed: ${response.status} ${response.statusText}`);
  }

  return parseReenioAvailability(payload, {
    sourceUrl,
    clubSlug: options.clubSlug,
    date,
    sport: options.sport,
    courtCount: COURT_COUNT
  });
}

async function fetchTermListWithRetry(fetchImpl: typeof fetch, baseUrl: string, date: string, sourceUrl: string): Promise<Response> {
  try {
    return await fetchTermList(fetchImpl, baseUrl, date, sourceUrl);
  } catch (error) {
    if (!isFetchFailedError(error)) {
      throw error;
    }

    await delay(NETWORK_RETRY_DELAY_MS);
    return fetchTermList(fetchImpl, baseUrl, date, sourceUrl);
  }
}

function fetchTermList(fetchImpl: typeof fetch, baseUrl: string, date: string, sourceUrl: string): Promise<Response> {
  return fetchImpl(`${baseUrl}/cs/api/Term/List`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "cs,en;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: baseUrl,
      Referer: sourceUrl
    },
    body: buildPayload(date).toString()
  });
}

function isFetchFailedError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "fetch failed";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function buildPayload(date: string): URLSearchParams {
  return new URLSearchParams({
    date,
    viewMode: "7-days",
    page: "0",
    "filter.resource[0].id": SERVICE_ID,
    "filter.resource[0].type": SERVICE_TYPE,
    includeColors: "false",
    findNearestAvailable: "false"
  });
}

function reenioBookingUrl(baseUrl: string, date: string): string {
  return `${baseUrl}/cs/service/hriste-padel-${SERVICE_ID}/${date};viewMode=7-days`;
}

function pragueDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Prague",
    year: "numeric"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}
