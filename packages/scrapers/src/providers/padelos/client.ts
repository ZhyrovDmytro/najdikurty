import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "padelos";
const API_BASE_URL = "https://api.padelos.co";
const PLAYER_BASE_URL = "https://player.padelos.co";
const COMPANY_ID = "217";
const PRAGUE_SMICHOV_CLUB_ID = "216927";
const COURT_IDS = ["60030", "60031", "60032", "60033", "60034", "60035", "60036", "60037"];
const DAY_RANGE = { start: "07:00", end: "24:00" };
const MIN_BOOKING_MINUTES = 60;
const SLOT_STEP_MINUTES = 30;

export interface PadelosFetchOptions {
  apiBaseUrl?: string;
  clubSlug: string;
  companyId?: string;
  clubId?: string;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
}

interface PadelosSearchResponse {
  success: boolean;
  data?: unknown;
}

interface PadelosClubPayload {
  id: string;
  availability?: PadelosDurationAvailability[];
}

interface PadelosDurationAvailability {
  duration: string;
  slots?: PadelosSlot[];
}

interface PadelosSlot {
  startTime: string;
  endTime: string;
  courts?: PadelosCourt[];
}

interface PadelosCourt {
  id: string;
}

export async function fetchPadelosAvailability(options: PadelosFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBaseUrl = options.apiBaseUrl ?? API_BASE_URL;
  const companyId = options.companyId ?? COMPANY_ID;
  const clubId = options.clubId ?? PRAGUE_SMICHOV_CLUB_ID;
  const date = options.date ?? pragueDateInputValue(new Date());
  const sport = options.sport ?? "padel";
  const sourceUrl = padelosBookingUrl(companyId, clubId);
  const response = await fetchImpl(new URL("/customers/searchByDate", apiBaseUrl), {
    body: JSON.stringify({
      date,
      sport,
      courtType: "",
      courtSize: "",
      courtTurf: "",
      courtFeature: "",
      searchTerm: "",
      limit: "",
      offset: "",
      type: ""
    }),
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      referer: `${PLAYER_BASE_URL}/`,
      version: "2.4",
      "x-client-route": `/company/${companyId}?clubIds=${clubId}&locale=cs`,
      "x-clubos-channel": "CLUBOS-WEB",
      "x-clubos-club-info": clubId,
      "x-clubos-company": companyId,
      "x-clubos-domain": "PADELOSCO"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Padelos availability: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as PadelosSearchResponse;
  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error(`Padelos availability request failed: ${typeof payload.data === "string" ? payload.data : "unexpected response"}`);
  }

  const club = payload.data.find((item): item is PadelosClubPayload => isRecord(item) && item.id === clubId);
  if (!club) {
    throw new Error(`Padelos club ${clubId} not found in availability response`);
  }

  const availabilityGroups = Array.isArray(club.availability) ? club.availability : [];
  const courtIds = collectCourtIds(availabilityGroups);
  const courtNameById = new Map(courtIds.map((courtId, index) => [courtId, `Kurt ${index + 1}`]));
  const durationAvailability = Object.fromEntries(
    availabilityGroups.map((group) => [
      String(group.duration),
      buildCourtAvailabilities({
        availabilityGroups: [group],
        clubSlug: options.clubSlug,
        courtIds,
        courtNameById,
        date,
        mergeFreeSlots: false,
        sport
      })
    ])
  );
  const courts = buildCourtAvailabilities({
    availabilityGroups,
    clubSlug: options.clubSlug,
    courtIds,
    courtNameById,
    date,
    mergeFreeSlots: true,
    sport
  });

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    date,
    dayRange: detectDayRange(availabilityGroups),
    slotStepMinutes: SLOT_STEP_MINUTES,
    minBookingMinutes: MIN_BOOKING_MINUTES,
    durationAvailability,
    clubSlug: options.clubSlug,
    sport,
    courts
  };
}

function buildCourtAvailabilities({
  availabilityGroups,
  clubSlug,
  courtIds,
  courtNameById,
  date,
  mergeFreeSlots,
  sport
}: {
  availabilityGroups: PadelosDurationAvailability[];
  clubSlug: string;
  courtIds: string[];
  courtNameById: Map<string, string>;
  date: string;
  mergeFreeSlots: boolean;
  sport: string;
}): CourtAvailability[] {
  return courtIds.map((courtId) => {
    const rawFreeSlots = availabilityGroups.flatMap((group) =>
      (group.slots ?? []).flatMap((slot) =>
        (slot.courts ?? []).some((court) => court.id === courtId)
          ? [{ start: normalizeTime(slot.startTime), end: normalizeTime(slot.endTime) }]
          : []
      )
    );
    const freeSlots = mergeFreeSlots ? mergeRanges(rawFreeSlots) : sortRanges(rawFreeSlots);

    return {
      provider: PROVIDER,
      clubSlug,
      sport,
      date,
      court: courtNameById.get(courtId) ?? `Kurt ${courtIds.indexOf(courtId) + 1}`,
      blocks: buildBlockedIntervals(detectDayRange(availabilityGroups), freeSlots),
      freeSlots
    };
  });
}

function collectCourtIds(availabilityGroups: PadelosDurationAvailability[]): string[] {
  const foundCourtIds = new Set(COURT_IDS);
  for (const group of availabilityGroups) {
    for (const slot of group.slots ?? []) {
      for (const court of slot.courts ?? []) {
        foundCourtIds.add(String(court.id));
      }
    }
  }

  return [...foundCourtIds].sort((a, b) => Number(a) - Number(b));
}

function detectDayRange(availabilityGroups: PadelosDurationAvailability[]): TimeRange {
  const ranges = availabilityGroups.flatMap((group) =>
    (group.slots ?? []).map((slot) => ({ start: normalizeTime(slot.startTime), end: normalizeTime(slot.endTime) }))
  );
  if (ranges.length === 0) return DAY_RANGE;

  return {
    start: minuteToTime(Math.min(...ranges.map((range) => parseTime(range.start)))),
    end: minuteToTime(Math.max(...ranges.map((range) => parseTime(range.end))))
  };
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sortedRanges = sortRanges(ranges);
  const merged: TimeRange[] = [];

  for (const range of sortedRanges) {
    const previous = merged.at(-1);
    if (!previous || parseTime(range.start) > parseTime(previous.end)) {
      merged.push({ ...range });
      continue;
    }

    if (parseTime(range.end) > parseTime(previous.end)) {
      previous.end = range.end;
    }
  }

  return merged;
}

function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((a, b) => parseTime(a.start) - parseTime(b.start) || parseTime(a.end) - parseTime(b.end));
}

function buildBlockedIntervals(dayRange: TimeRange, freeSlots: TimeRange[]): CourtBlock[] {
  const blocks: CourtBlock[] = [];
  let cursor = parseTime(dayRange.start);

  for (const freeSlot of freeSlots) {
    const start = parseTime(freeSlot.start);
    const end = parseTime(freeSlot.end);

    if (start > cursor) {
      blocks.push({
        start: minuteToTime(cursor),
        end: minuteToTime(start),
        status: "occupied",
        label: "Unavailable"
      });
    }

    cursor = Math.max(cursor, end);
  }

  const dayEnd = parseTime(dayRange.end);
  if (cursor < dayEnd) {
    blocks.push({
      start: minuteToTime(cursor),
      end: minuteToTime(dayEnd),
      status: "occupied",
      label: "Unavailable"
    });
  }

  return blocks;
}

function normalizeTime(value: string): string {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function parseTime(value: string): number {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function minuteToTime(totalMinutes: number): string {
  if (totalMinutes >= 24 * 60) return "24:00";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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

function padelosBookingUrl(companyId: string, clubId: string): string {
  return `${PLAYER_BASE_URL}/company/${companyId}?clubIds=${clubId}&locale=cs`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
