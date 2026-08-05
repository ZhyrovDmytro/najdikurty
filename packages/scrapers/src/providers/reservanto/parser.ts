import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "reservanto";
const SLOT_MINUTES = 30;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
}

interface ReservantoDay {
  dayFormatted: string;
  locations: Array<{
    sources: ReservantoSource[];
  }>;
}

interface ReservantoSource {
  id: number;
  name: string;
  availability: ReservantoCell[];
}

interface ReservantoCell {
  StartTime: string;
  EndTime: string;
  IsFree: boolean;
  CanBeBooked: boolean;
  IsBooked: boolean;
  IsFullyBooked: boolean;
}

export function parseReservantoAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const days = extractDays(html);
  const day = findDay(days, options.date);

  if (!day) {
    throw new Error(`Date ${options.date} is not present in the Reservanto calendar`);
  }

  const sources = day.locations.flatMap((location) => location.sources).slice(0, 3);
  if (sources.length === 0) {
    throw new Error(`No Reservanto courts found for ${options.date}`);
  }

  const courts = sources.map<CourtAvailability>((source, index) => {
    const bookableCells = source.availability.filter((cell) => cell.CanBeBooked);
    const freeMinutes = source.availability
      .filter((cell) => isFreeCell(cell))
      .map((cell) => startMinute(cell, options.date))
      .sort((a, b) => a - b);
    const occupiedMinutes = bookableCells
      .filter((cell) => !isFreeCell(cell))
      .map((cell) => startMinute(cell, options.date))
      .sort((a, b) => a - b);

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court: formatCourtName(index),
      blocks: mergeSlotMinutes(occupiedMinutes).map<CourtBlock>((range) => ({
        ...range,
        status: "occupied",
        label: "Unavailable"
      })),
      freeSlots: mergeSlotMinutes(freeMinutes)
    };
  });

  const allBookableCells = sources.flatMap((source) => source.availability.filter((cell) => cell.CanBeBooked));
  const dayRange = parseDayRange(allBookableCells, options.date);

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

function extractDays(html: string): ReservantoDay[] {
  const marker = "days: ";
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error("No Reservanto days model found");
  }

  const arrayStart = start + marker.length;
  const arrayEnd = findJsonArrayEnd(html, arrayStart);
  return JSON.parse(html.slice(arrayStart, arrayEnd)) as ReservantoDay[];
}

function findJsonArrayEnd(value: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  throw new Error("Could not parse Reservanto days model");
}

function findDay(days: ReservantoDay[], date: string): ReservantoDay | undefined {
  return days.find((day) =>
    day.locations.some((location) =>
      location.sources.some((source) => source.availability.some((cell) => cell.StartTime.startsWith(`${date}T`)))
    )
  );
}

function isFreeCell(cell: ReservantoCell): boolean {
  return cell.IsFree && cell.CanBeBooked && !cell.IsBooked && !cell.IsFullyBooked;
}

function parseDayRange(cells: ReservantoCell[], date: string): TimeRange {
  if (cells.length === 0) {
    return { start: "00:00", end: "24:00" };
  }

  return {
    start: minuteToTime(Math.min(...cells.map((cell) => startMinute(cell, date)))),
    end: minuteToTime(Math.max(...cells.map((cell) => endMinute(cell, date))))
  };
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

function startMinute(cell: ReservantoCell, date: string): number {
  return isoLocalMinute(cell.StartTime, date);
}

function endMinute(cell: ReservantoCell, date: string): number {
  return isoLocalMinute(cell.EndTime, date);
}

function isoLocalMinute(value: string, date: string): number {
  const [valueDate, timeWithOffset] = value.split("T");
  const [hours, minutes] = timeWithOffset.slice(0, 5).split(":").map(Number);
  const minute = hours * 60 + minutes;

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

function formatCourtName(courtIndex: number): string {
  return `Kurt ${courtIndex + 1}`;
}
