import { z } from "zod";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "playtomic";
const SLOT_MINUTES = 30;

const playtomicAvailabilitySchema = z.array(
  z.object({
    resource_id: z.string(),
    start_date: z.string(),
    slots: z.array(
      z.object({
        start_time: z.string(),
        duration: z.number(),
        price: z.string().nullish()
      })
    )
  })
);

type PlaytomicAvailabilityPayload = z.infer<typeof playtomicAvailabilitySchema>;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  dayRange: TimeRange;
  resourceIds: string[];
  sport?: string;
  timezone?: string;
  fetchedAt?: string;
}

export function parsePlaytomicAvailability(payload: unknown, options: ParseOptions): AvailabilityResult {
  const rows = playtomicAvailabilitySchema.parse(payload);
  const timezone = options.timezone ?? "Europe/Prague";
  const rowsByResourceId = new Map(rows.map((row) => [row.resource_id, row]));

  const courts: CourtAvailability[] = options.resourceIds.map((resourceId, resourceIndex) => {
    const row = rowsByResourceId.get(resourceId);
    const freeSlots = row ? mergeFreeRanges(slotRangesForRow(row, timezone)) : [];

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court: formatCourtName(resourceIndex),
      blocks: buildBlockedIntervals(options.dayRange, freeSlots),
      freeSlots
    };
  });

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange: options.dayRange,
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

function slotRangesForRow(row: PlaytomicAvailabilityPayload[number], timezone: string): TimeRange[] {
  return row.slots.map((slot) => {
    const startMinute = utcClockToLocalMinute(row.start_date, slot.start_time, timezone);
    return {
      start: minuteToTime(startMinute),
      end: minuteToTime(startMinute + slot.duration)
    };
  });
}

function mergeFreeRanges(ranges: TimeRange[]): TimeRange[] {
  const sortedRanges = ranges
    .map((range) => ({ startMinute: parseTime(range.start), endMinute: parseTime(range.end) }))
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
  const mergedRanges: Array<{ startMinute: number; endMinute: number }> = [];

  for (const range of sortedRanges) {
    const previous = mergedRanges.at(-1);
    if (!previous || range.startMinute > previous.endMinute) {
      mergedRanges.push({ ...range });
      continue;
    }

    previous.endMinute = Math.max(previous.endMinute, range.endMinute);
  }

  return mergedRanges.map((range) => ({
    start: minuteToTime(range.startMinute),
    end: minuteToTime(range.endMinute)
  }));
}

function buildBlockedIntervals(dayRange: TimeRange, freeSlots: TimeRange[]): CourtBlock[] {
  const blocks: CourtBlock[] = [];
  let cursor = parseTime(dayRange.start);
  const dayEnd = parseTime(dayRange.end);

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

function utcClockToLocalMinute(date: string, time: string, timezone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const parts = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone
  }).formatToParts(value);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return Number(valueByType.hour) * 60 + Number(valueByType.minute);
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minuteToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatCourtName(courtIndex: number): string {
  return `Kurt ${courtIndex + 1}`;
}
