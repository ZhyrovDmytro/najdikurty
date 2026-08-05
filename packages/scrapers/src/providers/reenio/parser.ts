import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "reenio";
const SLOT_MINUTES = 30;
const DEFAULT_COURT_COUNT = 3;
const PRAGUE_TIMEZONE = "Europe/Prague";

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
  courtCount?: number;
}

interface ReenioTermListResponse {
  data?: {
    events?: ReenioEvent[];
  };
}

interface ReenioEvent {
  start: string;
  end: string;
  maxCapacity?: number;
  reservations?: ReenioReservation[];
}

interface ReenioReservation {
  start: string;
  end: string;
  capacity?: number;
}

export function parseReenioAvailability(payload: ReenioTermListResponse, options: ParseOptions): AvailabilityResult {
  const courtCount = options.courtCount ?? DEFAULT_COURT_COUNT;
  const events = (payload.data?.events ?? []).filter((event) => localDate(event.start) === options.date);

  if (events.length === 0) {
    throw new Error(`No Reenio padel events found for ${options.date}`);
  }

  const slotAvailability = buildSlotAvailability(events, options.date, courtCount);
  const dayRange = parseDayRange(slotAvailability);
  const courts = Array.from({ length: courtCount }, (_, index) => buildCourt(index, slotAvailability, options));

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange,
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

function buildSlotAvailability(events: ReenioEvent[], date: string, courtCount: number): Array<{ minute: number; freeCapacity: number }> {
  const slots = new Map<number, number>();

  for (const event of events) {
    const maxCapacity = Math.min(event.maxCapacity ?? courtCount, courtCount);
    const eventStart = localMinute(event.start, date);
    const eventEnd = localMinute(event.end, date);

    for (let minute = eventStart; minute < eventEnd; minute += SLOT_MINUTES) {
      const slotEnd = minute + SLOT_MINUTES;
      const reservedCapacity = (event.reservations ?? [])
        .filter((reservation) => overlaps(minute, slotEnd, localMinute(reservation.start, date), localMinute(reservation.end, date)))
        .reduce((sum, reservation) => sum + (reservation.capacity ?? 1), 0);

      slots.set(minute, Math.max(0, maxCapacity - reservedCapacity));
    }
  }

  return [...slots.entries()]
    .map(([minute, freeCapacity]) => ({ minute, freeCapacity }))
    .sort((a, b) => a.minute - b.minute);
}

function buildCourt(courtIndex: number, slotAvailability: Array<{ minute: number; freeCapacity: number }>, options: ParseOptions): CourtAvailability {
  const freeMinutes = slotAvailability.filter((slot) => courtIndex < slot.freeCapacity).map((slot) => slot.minute);
  const occupiedMinutes = slotAvailability.filter((slot) => courtIndex >= slot.freeCapacity).map((slot) => slot.minute);

  return {
    provider: PROVIDER,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    date: options.date,
    court: `Kurt ${courtIndex + 1}`,
    blocks: mergeSlotMinutes(occupiedMinutes).map<CourtBlock>((range) => ({
      ...range,
      status: "occupied",
      label: "Unavailable"
    })),
    freeSlots: mergeSlotMinutes(freeMinutes)
  };
}

function parseDayRange(slotAvailability: Array<{ minute: number }>): TimeRange {
  const minutes = slotAvailability.map((slot) => slot.minute);

  return {
    start: minuteToTime(Math.min(...minutes)),
    end: minuteToTime(Math.max(...minutes) + SLOT_MINUTES)
  };
}

function overlaps(start: number, end: number, reservationStart: number, reservationEnd: number): boolean {
  return reservationStart < end && reservationEnd > start;
}

function mergeSlotMinutes(slotMinutes: number[]): TimeRange[] {
  const ranges: TimeRange[] = [];
  let rangeStart: number | undefined;
  let previous: number | undefined;

  for (const minute of slotMinutes) {
    if (rangeStart === undefined || previous === undefined || minute !== previous + SLOT_MINUTES) {
      if (rangeStart !== undefined && previous !== undefined) {
        ranges.push({ start: minuteToTime(rangeStart), end: minuteToTime(previous + SLOT_MINUTES) });
      }
      rangeStart = minute;
    }
    previous = minute;
  }

  if (rangeStart !== undefined && previous !== undefined) {
    ranges.push({ start: minuteToTime(rangeStart), end: minuteToTime(previous + SLOT_MINUTES) });
  }

  return ranges;
}

function localDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric"
  }).formatToParts(new Date(value));
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function localMinute(value: string, date: string): number {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric"
  }).formatToParts(new Date(value));
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minute = Number(valueByType.hour) * 60 + Number(valueByType.minute);
  const valueDate = `${valueByType.year}-${valueByType.month}-${valueByType.day}`;

  if (valueDate > date && minute === 0) {
    return 24 * 60;
  }

  return minute;
}

function minuteToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
