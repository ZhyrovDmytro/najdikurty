import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "rogeronline";
const SLOT_MINUTES = 30;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  courtCount?: number;
  fetchedAt?: string;
}

export function parseRogerOnlineAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const $ = cheerio.load(html);
  const courtCount = options.courtCount ?? 2;
  const freeSlotMinutesByCourt = Array.from({ length: courtCount }, () => new Set<number>());
  const blockedSlotMinutesByCourt = Array.from({ length: courtCount }, () => new Set<number>());
  let firstMinute: number | undefined;
  let lastMinute: number | undefined;

  $(".schedule-row").each((_, row) => {
    const cells = $(row).find(".court-cell").slice(0, courtCount).toArray();
    if (cells.length < courtCount) return;

    const rowStart = parseTimeLabel($(cells[0]).attr("data-time-formatted") ?? $(row).find(".time-cell").text());
    if (rowStart === undefined) return;

    firstMinute = firstMinute === undefined ? rowStart : Math.min(firstMinute, rowStart);
    lastMinute = lastMinute === undefined ? rowStart : Math.max(lastMinute, rowStart);

    cells.forEach((cell, courtIndex) => {
      if (isBookable($, cell)) {
        freeSlotMinutesByCourt[courtIndex]?.add(rowStart);
        return;
      }

      blockedSlotMinutesByCourt[courtIndex]?.add(rowStart);
    });
  });

  if (firstMinute === undefined || lastMinute === undefined) {
    throw new Error("No RogerOnline schedule rows found");
  }

  const courts: CourtAvailability[] = Array.from({ length: courtCount }, (_, courtIndex) => ({
    provider: PROVIDER,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    date: options.date,
    court: formatCourtName(courtIndex),
    blocks: mergeBlockedSlotMinutes([...blockedSlotMinutesByCourt[courtIndex]].sort((a, b) => a - b)),
    freeSlots: mergeFreeSlotMinutes([...freeSlotMinutesByCourt[courtIndex]].sort((a, b) => a - b))
  }));

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange: {
      start: minuteToTime(firstMinute),
      end: minuteToTime(lastMinute + SLOT_MINUTES)
    },
    slotStepMinutes: SLOT_MINUTES,
    minBookingMinutes: 60,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

function isBookable($: cheerio.CheerioAPI, element: AnyNode): boolean {
  return $(element).attr("data-tooltip-book") === "1" && $(element).find("a.slot-price.clickable").length > 0;
}

function mergeFreeSlotMinutes(slotMinutes: number[]): TimeRange[] {
  return mergeSlotMinutes(slotMinutes, SLOT_MINUTES);
}

function mergeBlockedSlotMinutes(slotMinutes: number[]): CourtBlock[] {
  return mergeSlotMinutes(slotMinutes, SLOT_MINUTES).map((range) => ({
    ...range,
    status: "occupied",
    label: "Unavailable"
  }));
}

function mergeSlotMinutes<T extends TimeRange = TimeRange>(slotMinutes: number[], stepMinutes: number): T[] {
  const ranges: TimeRange[] = [];
  let rangeStart: number | undefined;
  let previous: number | undefined;

  for (const minute of slotMinutes) {
    if (rangeStart === undefined || previous === undefined || minute !== previous + stepMinutes) {
      if (rangeStart !== undefined && previous !== undefined) {
        ranges.push({ start: minuteToTime(rangeStart), end: minuteToTime(previous + stepMinutes) });
      }
      rangeStart = minute;
    }
    previous = minute;
  }

  if (rangeStart !== undefined && previous !== undefined) {
    ranges.push({ start: minuteToTime(rangeStart), end: minuteToTime(previous + stepMinutes) });
  }

  return ranges as T[];
}

function parseTimeLabel(label: string): number | undefined {
  const match = normalizeText(label).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
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
