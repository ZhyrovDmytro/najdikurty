import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "isportsystem";
const SLOT_MINUTES = 30;
const PADEL_SPORT_ID = "13";

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
}

interface OpeningRange {
  startMinute: number;
  endMinute: number;
}

export function parseISportSystemAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const $ = cheerio.load(html);
  const container = findDateContainer($, options.date);
  const table = container.find("table.schema_sport_13").first();

  if (table.length === 0) {
    throw new Error(`No iSportSystem padel timetable found for ${options.date}`);
  }

  const openingRange = parseOpeningRange($, table.get(0));
  const courts: CourtAvailability[] = [];

  table.find("tbody tr").each((_, row) => {
    const rowElement = $(row);
    if (rowElement.hasClass("prices")) return;

    const timeCells = rowElement.children("td");
    if (timeCells.length === 0) return;

    const freeSlotMinutes = new Set<number>();
    const occupiedSlotMinutes = new Set<number>();
    let slotIndex = 0;

    timeCells.each((__, cell) => {
      const span = Number($(cell).attr("colspan") ?? "1");
      const startMinute = openingRange.startMinute + slotIndex * SLOT_MINUTES;

      for (let offset = 0; offset < span; offset += 1) {
        const minute = startMinute + offset * SLOT_MINUTES;
        if (isFreeCell($, cell)) {
          freeSlotMinutes.add(minute);
        } else {
          occupiedSlotMinutes.add(minute);
        }
      }

      slotIndex += span;
    });

    courts.push({
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court: formatCourtName(courts.length),
      blocks: mergeSlotMinutes([...occupiedSlotMinutes].sort((a, b) => a - b)).map<CourtBlock>((range) => ({
        ...range,
        status: "occupied",
        label: "Unavailable"
      })),
      freeSlots: mergeSlotMinutes([...freeSlotMinutes].sort((a, b) => a - b))
    });
  });

  if (courts.length === 0) {
    throw new Error(`No iSportSystem court rows found for ${options.date}`);
  }

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

function findDateContainer($: cheerio.CheerioAPI, date: string): cheerio.Cheerio<Element> {
  const datedContainer = $(".schemaFullContainer")
    .filter((_, element) => {
      const container = $(element);
      return container.find(`[data-id_sport="${PADEL_SPORT_ID}"][data-date="${date}"]`).length > 0;
    })
    .first();

  if (datedContainer.length > 0) {
    return datedContainer;
  }

  throw new Error(`Date ${date} is not present in the visible iSportSystem week`);
}

function parseOpeningRange($: cheerio.CheerioAPI, table: Element | undefined): OpeningRange {
  if (!table) {
    throw new Error("No iSportSystem timetable table found");
  }

  const timeCells = $(table).find("tr.times td");
  const firstTime = parseClockLabel(normalizeText(timeCells.first().text()));
  const lastCell = timeCells.last();
  const lastTime = parseClockLabel(normalizeText(lastCell.text()));
  const lastSpan = Number(lastCell.attr("colspan") ?? "1");

  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) {
    throw new Error("No iSportSystem hour headers found");
  }

  return {
    startMinute: firstTime,
    endMinute: lastTime + lastSpan * SLOT_MINUTES
  };
}

function isFreeCell($: cheerio.CheerioAPI, cell: Element): boolean {
  const classNames = new Set(($(cell).attr("class") ?? "").split(/\s+/).filter(Boolean));
  return classNames.size === 0 && $(cell).find("a.empty").length > 0;
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
