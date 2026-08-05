import { parseSkySportCityAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

export interface SkySportCityFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
}

export async function fetchSkySportCityAvailability(options: SkySportCityFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://rezervace.skysportcity.cz";
  const date = options.date ?? pragueDateInputValue(new Date());
  const url = new URL("/timeline/day", baseUrl);
  url.searchParams.set("tabIdx", "0");
  url.searchParams.set("criteriaTimestamp", String(pragueLocalMidnightTimestamp(date)));
  url.searchParams.set("resetFilter", "true");

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseSkySportCityAvailability(html, {
    sourceUrl: response.url || url.toString(),
    clubSlug: options.clubSlug,
    date,
    sport: options.sport
  });
}

function pragueLocalMidnightTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const offsetMinutes = pragueOffsetMinutes(noonUtc);
  return Date.UTC(year, month - 1, day) - offsetMinutes * 60_000;
}

function pragueOffsetMinutes(date: Date): number {
  const timeZoneName = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Prague",
    timeZoneName: "shortOffset"
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = timeZoneName?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) {
    throw new Error("Could not determine Europe/Prague UTC offset");
  }

  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
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
