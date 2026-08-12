import * as cheerio from "cheerio";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "padelslavia";
const SLOT_MINUTES = 30;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
}

interface ParsedCell {
  courtIndex: number;
  startMinute: number;
  endMinute: number;
  status: "occupied";
  label?: string;
}

export function parsePadelSlaviaAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const $ = cheerio.load(html);
  const courtCount = $(".tabulka-rezervace table thead th")
    .slice(1)
    .filter((_, element) => normalizeText($(element).text()).length > 0).length;

  if (courtCount === 0) {
    throw new Error("No courts found in Padel Slavia timetable");
  }

  const occupiedUntilByCourt = Array.from({ length: courtCount }, () => 0);
  const freeMinutesByCourt = Array.from({ length: courtCount }, () => new Set<number>());
  const blocks: ParsedCell[] = [];
  const rowStartMinutes: number[] = [];

  $(".tabulka-rezervace table tbody tr").each((_, row) => {
    const cells = $(row).children("td");
    const timeLabel = normalizeText(cells.first().text());
    if (!timeLabel) return;

    const currentMinute = parseClockLabel(timeLabel);
    rowStartMinutes.push(currentMinute);

    let courtIndex = 0;
    cells.slice(1).each((__, cell) => {
      while (courtIndex < courtCount && occupiedUntilByCourt[courtIndex] > currentMinute) {
        courtIndex += 1;
      }

      if (courtIndex >= courtCount) return;

      const className = $(cell).attr("class") ?? "";
      const rowSpan = Number($(cell).attr("rowspan") ?? "1");
      const endMinute = currentMinute + rowSpan * SLOT_MINUTES;

      if (className.includes("volno")) {
        for (let minute = currentMinute; minute < endMinute; minute += SLOT_MINUTES) {
          freeMinutesByCourt[courtIndex].add(minute);
        }
      } else {
        blocks.push({
          courtIndex,
          startMinute: currentMinute,
          endMinute,
          status: "occupied",
          label: "Obsazeno"
        });
      }

      occupiedUntilByCourt[courtIndex] = endMinute;
      courtIndex += 1;
    });
  });

  if (rowStartMinutes.length === 0) {
    throw new Error("No time rows found in Padel Slavia timetable");
  }

  const openingRange = {
    startMinute: Math.min(...rowStartMinutes),
    endMinute: Math.max(...rowStartMinutes) + SLOT_MINUTES
  };

  const courts: CourtAvailability[] = Array.from({ length: courtCount }, (_, courtIndex) => {
    const courtBlocks = blocks
      .filter((block) => block.courtIndex === courtIndex)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map<CourtBlock>((block) => ({
        start: minuteToTime(block.startMinute),
        end: minuteToTime(block.endMinute),
        status: block.status,
        label: block.label
      }));

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court: formatCourtName(courtIndex),
      blocks: courtBlocks,
      freeSlots: mergeFreeSlotMinutes([...freeMinutesByCourt[courtIndex]].sort((a, b) => a - b))
    };
  });

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange: {
      start: minuteToTime(openingRange.startMinute),
      end: minuteToTime(openingRange.endMinute)
    },
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

export function detectPadelSlaviaActiveDayMonth(html: string): string | undefined {
  const $ = cheerio.load(html);
  const activeLabel = normalizeText($(".btn-outline-dark.active").first().text());
  const match = /(\d{1,2})\.(\d{1,2})\./.exec(activeLabel);
  if (!match) return undefined;

  return `${match[2]?.padStart(2, "0")}-${match[1]?.padStart(2, "0")}`;
}

function mergeFreeSlotMinutes(slotMinutes: number[]): TimeRange[] {
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

function parseClockLabel(label: string): number {
  const [hours, minutes = "0"] = normalizeText(label).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function minuteToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatCourtName(courtIndex: number): string {
  return `Kurt ${courtIndex + 1}`;
}
