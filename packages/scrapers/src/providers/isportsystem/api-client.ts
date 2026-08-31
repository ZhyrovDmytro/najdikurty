import { z } from "zod";
import { dateKeyInTimezone, timeInTimezone } from "../../domain/timezone.js";
import type { AvailabilityResult, CourtAvailability, CourtBlock, CourtStatus, TimeRange } from "../../types.js";

const PROVIDER = "isportsystem";
const PRAGUE_TIMEZONE = "Europe/Prague";
const SLOT_MINUTES = 30;

const laneSchema = z.object({
  lane_name: z.string().min(1),
  lane_id: z.union([z.string(), z.number()]),
  times: z.record(z.enum(["0", "1"]).or(z.union([z.literal(0), z.literal(1)]))),
  prices: z.record(z.number()).optional(),
  event_info: z.record(z.string()).optional()
});

const responseSchema = z.array(laneSchema);

export interface ISportSystemApiFetchOptions {
  baseUrl: string;
  clubSlug: string;
  sportId: string;
  date?: string;
  sport?: string;
  courtNames?: readonly string[];
  fetchImpl?: typeof fetch;
  fetchedAt?: string;
}

interface BlockedSlot {
  minute: number;
  status: Exclude<CourtStatus, "free">;
  label: string;
}

export async function fetchISportSystemApiAvailability(
  options: ISportSystemApiFetchOptions
): Promise<AvailabilityResult> {
  const date = options.date ?? dateKeyInTimezone(new Date(), PRAGUE_TIMEZONE);
  const endpoint = apiEndpoint(options.baseUrl, date, options.sportId);
  const response = await (options.fetchImpl ?? fetch)(endpoint, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`iSportSystem API request failed with HTTP ${response.status}`);
  }

  const lanes = responseSchema.parse(await response.json());
  const allowedCourts = options.courtNames ? new Set(options.courtNames) : undefined;
  const courts = lanes
    .filter((lane) => !allowedCourts || allowedCourts.has(lane.lane_name))
    .map((lane) => laneAvailability(lane, options.clubSlug, date, options.sport ?? "padel"));

  if (courts.length === 0) {
    throw new Error(`No iSportSystem API courts found for ${options.clubSlug} on ${date}`);
  }

  const allMinutes = lanes
    .filter((lane) => !allowedCourts || allowedCourts.has(lane.lane_name))
    .flatMap((lane) => Object.keys(lane.times).map((timestamp) => timestampMinute(timestamp, date)));

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: response.url || endpoint,
    date,
    dayRange: {
      start: minuteToTime(Math.min(...allMinutes)),
      end: minuteToTime(Math.max(...allMinutes) + SLOT_MINUTES)
    },
    slotStepMinutes: SLOT_MINUTES,
    minBookingMinutes: 60,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

function laneAvailability(
  lane: z.infer<typeof laneSchema>,
  clubSlug: string,
  date: string,
  sport: string
): CourtAvailability {
  const freeMinutes: number[] = [];
  const blockedSlots: BlockedSlot[] = [];
  const slotPrices: Record<string, number> = {};

  for (const [timestamp, rawStatus] of Object.entries(lane.times)) {
    const minute = timestampMinute(timestamp, date);
    const price = lane.prices?.[timestamp];
    if (price !== undefined) slotPrices[minuteToTime(minute)] = price;
    const status = Number(rawStatus);
    if (status === 0) {
      freeMinutes.push(minute);
      continue;
    }

    const label = lane.event_info?.[timestamp]?.trim() || "Unavailable";
    blockedSlots.push({ minute, status: blockStatus(label), label });
  }

  return {
    provider: PROVIDER,
    clubSlug,
    sport,
    date,
    court: lane.lane_name,
    blocks: mergeBlockedSlots(blockedSlots),
    freeSlots: mergeSlotMinutes(freeMinutes),
    slotPrices,
    currency: "CZK"
  };
}

function apiEndpoint(baseUrl: string, date: string, sportId: string): string {
  const url = new URL("/api/get-times.php", ensureUrl(baseUrl));
  url.searchParams.set("date", date.replaceAll("-", ""));
  url.searchParams.set("id_sport", sportId);
  return url.toString();
}

function ensureUrl(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function timestampMinute(timestamp: string, expectedDate: string): number {
  if (!/^\d+$/.test(timestamp)) throw new SyntaxError(`Invalid iSportSystem timestamp: ${timestamp}`);
  const instant = new Date(Number(timestamp) * 1_000);
  if (Number.isNaN(instant.getTime()) || dateKeyInTimezone(instant, PRAGUE_TIMEZONE) !== expectedDate) {
    throw new SyntaxError(`iSportSystem timestamp ${timestamp} is outside ${expectedDate}`);
  }

  const [hour, minute] = timeInTimezone(instant, PRAGUE_TIMEZONE).split(":").map(Number);
  return hour * 60 + minute;
}

function blockStatus(label: string): Exclude<CourtStatus, "free"> {
  const normalized = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("zavreno") || normalized.includes("udrzb") || normalized.includes("mimo provoz")) {
    return "closed";
  }
  if (normalized.includes("lekce") || normalized.includes("trenink")) return "lesson";
  return "occupied";
}

function mergeSlotMinutes(slotMinutes: number[]): TimeRange[] {
  const sorted = [...new Set(slotMinutes)].sort((left, right) => left - right);
  const ranges: TimeRange[] = [];
  let start: number | undefined;
  let previous: number | undefined;

  for (const minute of sorted) {
    if (start === undefined || previous === undefined || minute !== previous + SLOT_MINUTES) {
      if (start !== undefined && previous !== undefined) {
        ranges.push({ start: minuteToTime(start), end: minuteToTime(previous + SLOT_MINUTES) });
      }
      start = minute;
    }
    previous = minute;
  }

  if (start !== undefined && previous !== undefined) {
    ranges.push({ start: minuteToTime(start), end: minuteToTime(previous + SLOT_MINUTES) });
  }
  return ranges;
}

function mergeBlockedSlots(slots: BlockedSlot[]): CourtBlock[] {
  const sorted = [...slots].sort((left, right) => left.minute - right.minute);
  const blocks: CourtBlock[] = [];

  for (const slot of sorted) {
    const previous = blocks.at(-1);
    if (previous && previous.end === minuteToTime(slot.minute) && previous.status === slot.status && previous.label === slot.label) {
      previous.end = minuteToTime(slot.minute + SLOT_MINUTES);
      continue;
    }
    blocks.push({
      start: minuteToTime(slot.minute),
      end: minuteToTime(slot.minute + SLOT_MINUTES),
      status: slot.status,
      label: slot.label
    });
  }
  return blocks;
}

function minuteToTime(totalMinutes: number): string {
  if (totalMinutes === 24 * 60) return "24:00";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
