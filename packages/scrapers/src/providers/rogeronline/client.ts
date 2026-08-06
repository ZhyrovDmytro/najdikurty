import { parseRogerOnlineAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";
const BASE_URL = "https://www.rogeronline.cz/v2/";

export interface RogerOnlineFetchOptions {
  clubSlug: string;
  clubId: string;
  setId: string;
  courtCount?: number;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
}

export async function fetchRogerOnlineAvailability(options: RogerOnlineFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const date = options.date ?? pragueDateInputValue(new Date());
  const url = rogerOnlineUrl({
    clubId: options.clubId,
    date,
    setId: options.setId
  });

  const response = await fetchImpl(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "cs,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    }
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`RogerOnline request failed with ${response.status}`);
  }

  return parseRogerOnlineAvailability(html, {
    sourceUrl: response.url || url,
    clubSlug: options.clubSlug,
    date,
    sport: options.sport,
    courtCount: options.courtCount
  });
}

function rogerOnlineUrl(options: { clubId: string; setId: string; date: string }): string {
  const [year, month, day] = options.date.split("-").map(Number);
  const url = new URL(BASE_URL);
  url.searchParams.set("rok", String(year));
  url.searchParams.set("mesic", String(month));
  url.searchParams.set("den", String(day));
  url.searchParams.set("klub", options.clubId);
  url.searchParams.set("set", options.setId);
  return url.toString();
}

function pragueDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}
