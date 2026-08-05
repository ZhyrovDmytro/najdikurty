import * as cheerio from "cheerio";
import type { AvailabilityResult, CourtAvailability, CourtBlock, CourtStatus, TimeRange } from "../../types.js";

const PROVIDER = "jdemenato";
const SLOT_MINUTES = 30;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  fetchedAt?: string;
}

interface ParsedCell {
  courtIndex: number;
  startMinute: number;
  endMinute: number;
  status: Exclude<CourtStatus, "free">;
  label?: string;
}

export function parseJdemeNaToAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const $ = cheerio.load(html);
  const selectedDate = extractSelectedDate($, options.date);
  const sport = options.sport ?? extractSelectedSport($) ?? "unknown";
  const courtNames = $(".verticalTimetable thead .serviceTop")
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);

  if (courtNames.length === 0) {
    throw new Error("No courts found in JdemeNaTo timetable");
  }

  const occupiedUntilByCourt = Array.from({ length: courtNames.length }, () => 0);
  const cells: ParsedCell[] = [];
  let currentMinute = inferFirstMinute($);

  $(".verticalTimetable tbody tr").each((_, row) => {
    const timeLabel = normalizeText($(row).find("th.timeLeft").first().text());
    if (timeLabel) {
      currentMinute = parseClockLabel(timeLabel);
    }

    let courtIndex = 0;
    $(row)
      .children("td")
      .each((__, cell) => {
        while (courtIndex < occupiedUntilByCourt.length && occupiedUntilByCourt[courtIndex] > currentMinute) {
          courtIndex += 1;
        }

        if (courtIndex >= courtNames.length) {
          return;
        }

        const className = $(cell).attr("class") ?? "";
        const title = $(cell).attr("title") ?? "";
        const rowSpan = Number($(cell).attr("rowspan") ?? $(cell).attr("rowSpan") ?? "1");
        const startMinute = parseMinuteFromClass(className) ?? parseStartMinuteFromTitle(title) ?? currentMinute;
        const endMinute = parseEndMinuteFromTitle(title) ?? startMinute + rowSpan * SLOT_MINUTES;
        const status = parseStatus(className);

        if (status !== "free") {
          cells.push({
            courtIndex,
            startMinute,
            endMinute,
            status,
            label: normalizeText($(cell).clone().children().remove().end().text())
          });
        }

        occupiedUntilByCourt[courtIndex] = endMinute;
        courtIndex += 1;
      });

    currentMinute += SLOT_MINUTES;
  });

  const openingRange = inferOpeningRange($, cells);
  const courts: CourtAvailability[] = courtNames.map((_, courtIndex) => {
    const blocks = cells
      .filter((cell) => cell.courtIndex === courtIndex)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map<CourtBlock>((cell) => ({
        start: minuteToTime(cell.startMinute),
        end: minuteToTime(cell.endMinute),
        status: cell.status,
        label: cell.label
      }));

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport,
      date: selectedDate,
      court: formatCourtName(courtIndex),
      blocks,
      freeSlots: buildFreeSlots(openingRange, blocks)
    };
  });

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: selectedDate,
    dayRange: {
      start: minuteToTime(openingRange.startMinute),
      end: minuteToTime(openingRange.endMinute)
    },
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport,
    courts
  };
}

function extractSelectedDate($: cheerio.CheerioAPI, fallbackDate?: string): string {
  const selected = $(".timeNavigation a.selectedDay time").attr("datetime");
  const calendarDate = $("#datePicker").attr("data-date");
  const pageInitDate = $("script")
    .text()
    .match(/"date":"(\d{4}-\d{2}-\d{2})"/)?.[1];

  const date = selected ?? calendarDate ?? pageInitDate ?? fallbackDate;
  if (!date) {
    throw new Error("No selected date found in JdemeNaTo page");
  }

  return date;
}

function extractSelectedSport($: cheerio.CheerioAPI): string | undefined {
  const sport = normalizeText($(".sportNavigation a.selected-sport h2").first().text());
  return sport ? sport.toLowerCase() : undefined;
}

function inferFirstMinute($: cheerio.CheerioAPI): number {
  const firstTime = normalizeText($(".verticalTimetable tbody th.timeLeft").first().text());
  return firstTime ? parseClockLabel(firstTime) : 0;
}

function inferOpeningRange($: cheerio.CheerioAPI, cells: ParsedCell[]): { startMinute: number; endMinute: number } {
  const first = inferFirstMinute($);
  let rowCount = $(".verticalTimetable tbody tr").length;
  if (rowCount === 0) {
    rowCount = Math.ceil((Math.max(...cells.map((cell) => cell.endMinute), first) - first) / SLOT_MINUTES);
  }

  return {
    startMinute: first,
    endMinute: first + rowCount * SLOT_MINUTES
  };
}

function buildFreeSlots(openingRange: { startMinute: number; endMinute: number }, blocks: CourtBlock[]): TimeRange[] {
  const freeSlots: TimeRange[] = [];
  let cursor = openingRange.startMinute;

  for (const block of blocks) {
    const start = parseTime(block.start);
    const end = parseTime(block.end);

    if (start > cursor) {
      freeSlots.push({
        start: minuteToTime(cursor),
        end: minuteToTime(start)
      });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < openingRange.endMinute) {
    freeSlots.push({
      start: minuteToTime(cursor),
      end: minuteToTime(openingRange.endMinute)
    });
  }

  return freeSlots;
}

function parseStatus(className: string): CourtStatus {
  if (className.includes("timetableClosed")) return "closed";
  if (className.includes("timetableLesson")) return "lesson";
  if (className.includes("timetableOccupied")) return "occupied";
  return "free";
}

function parseMinuteFromClass(className: string): number | undefined {
  const value = className.match(/\btime(\d+)\b/)?.[1];
  return value ? Number(value) : undefined;
}

function parseStartMinuteFromTitle(title: string): number | undefined {
  const value = title.split("-")[0]?.trim();
  return value ? parseClockLabel(value) : undefined;
}

function parseEndMinuteFromTitle(title: string): number | undefined {
  const value = title.split("-")[1]?.trim();
  return value ? parseClockLabel(value) : undefined;
}

function parseClockLabel(label: string): number {
  const normalized = label.replace(/\u202f|\u00a0/g, " ").trim();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) {
    throw new Error(`Unsupported time label: ${label}`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatCourtName(courtIndex: number): string {
  return `Kurt ${courtIndex + 1}`;
}
