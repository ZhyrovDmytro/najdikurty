import { z } from "zod";
import type { Club, Court, NormalizedAvailabilitySlot } from "../../domain/models.js";
import { dateKeyInTimezone, timeInTimezone } from "../../domain/timezone.js";
import type { ProviderAvailabilityResult } from "../provider.js";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "playtomic";
const SLOT_MINUTES = 30;

const playtomicAvailabilitySchema = z.array(
  z.object({
    resource_id: z.string(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z.array(
      z.object({
        start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
        duration: z.number().positive(),
        price: z.string().nullish()
      })
    )
  })
);

interface ParseProviderOptions {
  club: Club;
  fetchedAt: Date;
  resourceIds: string[];
  sourceUrl: string;
}

interface ParseLegacyOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  dayRange: TimeRange;
  resourceIds: string[];
  sport?: string;
  timezone?: string;
  fetchedAt?: string;
}

interface LegacyAdapterOptions {
  date: string;
  dayRange: TimeRange;
  sport: string;
}

export function parsePlaytomicProviderAvailability(
  payload: unknown,
  options: ParseProviderOptions
): ProviderAvailabilityResult {
  const rows = playtomicAvailabilitySchema.parse(payload);
  const courtByExternalId = new Map<string, Court>();
  const courts = options.resourceIds.map((resourceId, resourceIndex) => {
    const court: Court = {
      id: `${options.club.id}:${resourceId}`,
      clubId: options.club.id,
      externalId: resourceId,
      name: formatCourtName(resourceIndex),
      active: true
    };
    courtByExternalId.set(resourceId, court);
    return court;
  });

  const slots: NormalizedAvailabilitySlot[] = rows.flatMap((row) => {
    const court = courtByExternalId.get(row.resource_id);
    if (!court) return [];

    return row.slots.map((slot) => {
      const startsAt = utcSlotInstant(row.start_date, slot.start_time);
      const price = parsePrice(slot.price);

      return {
        clubId: options.club.id,
        courtId: court.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + slot.duration * 60_000),
        available: true,
        price: price.amount,
        currency: price.currency,
        bookingUrl: options.club.bookingUrl,
        fetchedAt: options.fetchedAt
      };
    });
  });

  return {
    providerId: PROVIDER,
    club: options.club,
    courts,
    slots,
    fetchedAt: options.fetchedAt,
    sourceUrl: options.sourceUrl,
    complete: true
  };
}

export function toLegacyPlaytomicAvailability(
  result: ProviderAvailabilityResult,
  options: LegacyAdapterOptions
): AvailabilityResult {
  const courts: CourtAvailability[] = result.courts.map((court) => {
    const freeSlots = mergeFreeRanges(
      result.slots
        .filter((slot) => slot.courtId === court.id && slot.available)
        .map((slot) => ({
          start: legacyTimeForDate(slot.startsAt, options.date, result.club.timezone),
          end: legacyTimeForDate(slot.endsAt, options.date, result.club.timezone)
        }))
    );

    return {
      provider: PROVIDER,
      clubSlug: result.club.slug,
      sport: options.sport,
      date: options.date,
      court: court.name,
      blocks: buildBlockedIntervals(options.dayRange, freeSlots),
      freeSlots
    };
  });

  return {
    fetchedAt: result.fetchedAt.toISOString(),
    sourceUrl: result.sourceUrl,
    date: options.date,
    dayRange: options.dayRange,
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: result.club.slug,
    sport: options.sport,
    courts
  };
}

export function parsePlaytomicAvailability(payload: unknown, options: ParseLegacyOptions): AvailabilityResult {
  const timezone = options.timezone ?? "Europe/Prague";
  const club: Club = {
    id: options.clubSlug,
    slug: options.clubSlug,
    name: options.clubSlug,
    providerId: PROVIDER,
    providerConfig: {},
    bookingUrl: options.sourceUrl,
    timezone,
    active: true
  };
  const result = parsePlaytomicProviderAvailability(payload, {
    club,
    fetchedAt: new Date(options.fetchedAt ?? Date.now()),
    resourceIds: options.resourceIds,
    sourceUrl: options.sourceUrl
  });

  return toLegacyPlaytomicAvailability(result, {
    date: options.date,
    dayRange: options.dayRange,
    sport: options.sport ?? "padel"
  });
}

function utcSlotInstant(date: string, time: string): Date {
  const value = new Date(`${date}T${time}Z`);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid Playtomic slot timestamp: ${date} ${time}`);
  }
  return value;
}

function parsePrice(value: string | null | undefined): { amount: number | null; currency: string | null } {
  if (!value) return { amount: null, currency: null };

  const match = value.trim().match(/^([0-9]+(?:[.,][0-9]+)?)\s+([A-Za-z]{3})$/);
  if (!match) return { amount: null, currency: null };

  return {
    amount: Number(match[1].replace(",", ".")),
    currency: match[2].toUpperCase()
  };
}

function legacyTimeForDate(value: Date, date: string, timezone: string): string {
  const valueDate = dateKeyInTimezone(value, timezone);
  if (valueDate === date) return timeInTimezone(value, timezone);

  const nextDate = new Date(`${date}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  if (valueDate === nextDate.toISOString().slice(0, 10) && timeInTimezone(value, timezone) === "00:00") {
    return "24:00";
  }

  throw new Error(`Playtomic slot timestamp ${value.toISOString()} falls outside ${date} in ${timezone}`);
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
