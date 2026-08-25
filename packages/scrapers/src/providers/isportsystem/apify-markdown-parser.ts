import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "isportsystem";
const SLOT_MINUTES = 30;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
}

export function parseISportSystemApifyMarkdown(markdown: string, options: ParseOptions): AvailabilityResult {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => headingMatchesDate(line, options.date));
  if (headingIndex < 0) {
    throw new Error(`Date ${options.date} is not present in the iSportSystem Actor output`);
  }

  const nextHeadingOffset = lines.slice(headingIndex + 1).findIndex((line) => /^###\s+/.test(line));
  const endIndex = nextHeadingOffset < 0 ? lines.length : headingIndex + 1 + nextHeadingOffset;
  const dayLines = lines.slice(headingIndex + 1, endIndex);
  const timeHeader = dayLines.find((line) => /^\|/.test(line) && /\b\d{1,2}:\d{2}\b/.test(line));
  const firstTime = timeHeader ? firstClockMinute(splitMarkdownRow(timeHeader)) : undefined;
  if (firstTime === undefined) {
    throw new Error(`No iSportSystem hour header found for ${options.date}`);
  }

  const courtRows = dayLines
    .map(splitMarkdownRow)
    .filter((cells) => /^Kurt\s+\d+/i.test(cells[0] ?? ""));
  if (courtRows.length === 0) {
    throw new Error(`No iSportSystem court rows found for ${options.date}`);
  }

  const slotCount = Math.max(...courtRows.map((cells) => cells.length - 1));
  const endMinute = firstTime + slotCount * SLOT_MINUTES;
  const courts = courtRows.map((cells): CourtAvailability => {
    const court = cells[0]?.trim();
    if (!court) throw new Error(`Invalid iSportSystem court row for ${options.date}`);

    const freeMinutes: number[] = [];
    const unavailableMinutes: number[] = [];
    for (let index = 0; index < slotCount; index += 1) {
      const minute = firstTime + index * SLOT_MINUTES;
      if (isFreeMarkdownCell(cells[index + 1] ?? "")) {
        freeMinutes.push(minute);
      } else {
        unavailableMinutes.push(minute);
      }
    }

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court,
      blocks: mergeSlotMinutes(unavailableMinutes).map<CourtBlock>((range) => ({
        ...range,
        status: "occupied",
        label: "Unavailable"
      })),
      freeSlots: mergeSlotMinutes(freeMinutes)
    };
  });

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange: { start: minuteToTime(firstTime), end: minuteToTime(endMinute) },
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

export function isISportSystemDateInMarkdown(markdown: string, date: string): boolean {
  return markdown.split(/\r?\n/).some((line) => headingMatchesDate(line, date));
}

function headingMatchesDate(line: string, date: string): boolean {
  const [, expectedMonth, expectedDay] = date.split("-").map(Number);
  const match = /^###\s+.+?\s+(\d{1,2})\.(\d{1,2})\./.exec(line.trim());
  return match !== null && Number(match[1]) === expectedDay && Number(match[2]) === expectedMonth;
}

function splitMarkdownRow(line: string): string[] {
  if (!line.trim().startsWith("|")) return [];
  const cells = line.split("|");
  return cells.slice(1, cells.at(-1)?.trim() === "" ? -1 : undefined).map((cell) => cell.trim());
}

function firstClockMinute(cells: string[]): number | undefined {
  for (const cell of cells) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(cell);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
  }
  return undefined;
}

function isFreeMarkdownCell(cell: string): boolean {
  return /\[\s*\]\([^)]*\)/.test(cell);
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

function minuteToTime(totalMinutes: number): string {
  if (totalMinutes === 24 * 60) return "24:00";
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}
