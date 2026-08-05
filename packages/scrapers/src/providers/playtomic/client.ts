import { parsePlaytomicAvailability } from "./parser.js";
import type { AvailabilityResult, TimeRange } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";

interface PlaytomicClubConfig {
  tenantId: string;
  resourceIds: string[];
  timezone: string;
  openingHours: Record<number, TimeRange>;
}

const PLAYTOMIC_CLUBS: Record<string, PlaytomicClubConfig> = {
  "padel-club-spoje": {
    tenantId: "61e73f55-98c6-405f-ac6b-e2677af5905f",
    resourceIds: ["cec43977-821d-4881-b95d-e7be9b74aeed", "ac302981-a812-4b3e-b9c9-fbb8da1f1e24"],
    timezone: PRAGUE_TIMEZONE,
    openingHours: {
      0: { start: "09:00", end: "20:00" },
      1: { start: "08:00", end: "21:00" },
      2: { start: "08:00", end: "21:00" },
      3: { start: "08:00", end: "21:00" },
      4: { start: "08:00", end: "21:00" },
      5: { start: "08:00", end: "21:00" },
      6: { start: "09:00", end: "20:00" }
    }
  },
  "tenis-a-padel-klub-pisecna": {
    tenantId: "33257960-acca-4aa4-9f77-b6e5ab56f3e5",
    resourceIds: [
      "20b5ce4e-5c85-4205-b8c3-0a6d1b970181",
      "4968ca89-5a4a-4809-9d93-aecd448a045f",
      "7efed5be-31bd-4e39-a00a-47fb979ffda6",
      "b95bb160-fa7d-464c-a9a2-ab028d305e4f"
    ],
    timezone: PRAGUE_TIMEZONE,
    openingHours: {
      0: { start: "08:00", end: "22:00" },
      1: { start: "08:00", end: "22:00" },
      2: { start: "08:00", end: "22:00" },
      3: { start: "08:00", end: "22:00" },
      4: { start: "08:00", end: "22:00" },
      5: { start: "08:00", end: "22:00" },
      6: { start: "08:00", end: "22:00" }
    }
  }
};

export interface PlaytomicFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  tenantId?: string;
  resourceIds?: string[];
  fetchImpl?: typeof fetch;
}

export function isPlaytomicClubSlug(clubSlug: string): boolean {
  return clubSlug in PLAYTOMIC_CLUBS;
}

export async function fetchPlaytomicAvailability(options: PlaytomicFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://playtomic.com";
  const config = PLAYTOMIC_CLUBS[options.clubSlug] ?? PLAYTOMIC_CLUBS["padel-club-spoje"];
  const date = options.date ?? pragueDateInputValue(new Date());
  const sport = options.sport ?? "padel";
  const tenantId = options.tenantId ?? config.tenantId;
  const resourceIds = options.resourceIds ?? config.resourceIds;
  const url = new URL("/api/clubs/availability", baseUrl);

  url.searchParams.set("tenant_id", tenantId);
  url.searchParams.set("date", date);
  url.searchParams.set("sport_id", sport.toUpperCase());

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return parsePlaytomicAvailability(payload, {
    sourceUrl: response.url || url.toString(),
    clubSlug: options.clubSlug,
    date,
    dayRange: playtomicDayRange(date, config.openingHours),
    resourceIds,
    sport,
    timezone: config.timezone
  });
}

function playtomicDayRange(date: string, openingHours: Record<number, TimeRange>): TimeRange {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayRange = openingHours[weekday];

  if (!dayRange) {
    throw new Error(`No Playtomic opening hours configured for weekday ${weekday}`);
  }

  return dayRange;
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
