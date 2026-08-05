import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "skysportcity";
const SLOT_MINUTES = 15;

interface ParseOptions {
  sourceUrl: string;
  clubSlug: string;
  date: string;
  sport?: string;
  fetchedAt?: string;
}

export function parseSkySportCityAvailability(html: string, options: ParseOptions): AvailabilityResult {
  const $ = cheerio.load(html);
  const hourStarts = $("#hours_head td[id^='time_col_']")
    .map((_, element) => parseTimeLabel($(element).text()))
    .get();

  if (hourStarts.length === 0) {
    throw new Error("No hour headers found in SkySportCity schedule");
  }

  const courtNamesByRowId = new Map<string, string>();
  $("#activities_halls li.hall").each((_, element) => {
    const id = $(element).attr("id");
    if (id) {
      courtNamesByRowId.set(id, normalizeText($(element).text()));
    }
  });

  const courts: CourtAvailability[] = [];
  $("#hours_body table.schedule tr[data-row-id]").each((_, row) => {
    const rowId = $(row).attr("data-row-id");
    const court = rowId ? courtNamesByRowId.get(rowId) : undefined;
    if (!court) return;

    const freeSlotMinutes = new Set<number>();
    $(row)
      .children("td[data-time-id]")
      .each((__, hourCell) => {
        const hourIndex = Number(($(hourCell).attr("data-time-id") ?? "").match(/time_col_(\d+)/)?.[1]);
        const hourStart = hourStarts[hourIndex - 1];
        if (hourStart === undefined) return;

        const zoomCells = $(hourCell).find("table.table_zoom tr.zoom_items > td");
        if (zoomCells.length > 0) {
          zoomCells.each((quarterIndex, quarterCell) => {
            if (isBookable($, quarterCell)) {
              freeSlotMinutes.add(hourStart + quarterIndex * SLOT_MINUTES);
            }
          });
          return;
        }

        if (isBookable($, hourCell)) {
          for (let offset = 0; offset < 60; offset += SLOT_MINUTES) {
            freeSlotMinutes.add(hourStart + offset);
          }
        }
      });

    const freeSlots = mergeFreeSlotMinutes([...freeSlotMinutes].sort((a, b) => a - b));
    const openingRange = {
      startMinute: hourStarts[0],
      endMinute: hourStarts[hourStarts.length - 1] + 60
    };

    courts.push({
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date: options.date,
      court: formatCourtName(courts.length),
      blocks: buildBlockedIntervals(openingRange, freeSlots),
      freeSlots
    });
  });

  if (courts.length === 0) {
    throw new Error("No court rows found in SkySportCity schedule");
  }

  return {
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    sourceUrl: options.sourceUrl,
    date: options.date,
    dayRange: {
      start: minuteToTime(hourStarts[0]),
      end: minuteToTime(hourStarts[hourStarts.length - 1] + 60)
    },
    slotStepMinutes: SLOT_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts
  };
}

function isBookable($: cheerio.CheerioAPI, element: AnyNode): boolean {
  const className = $(element).attr("class") ?? "";
  return className.includes("can_book") && $(element).find("a[href*='reservationStartTime']").length > 0;
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

function buildBlockedIntervals(openingRange: { startMinute: number; endMinute: number }, freeSlots: TimeRange[]): CourtBlock[] {
  const blocks: CourtBlock[] = [];
  let cursor = openingRange.startMinute;

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

  if (cursor < openingRange.endMinute) {
    blocks.push({
      start: minuteToTime(cursor),
      end: minuteToTime(openingRange.endMinute),
      status: "occupied",
      label: "Unavailable"
    });
  }

  return blocks;
}

function parseTimeLabel(label: string): number {
  const [hours, minutes = "0"] = normalizeText(label).split(":");
  return Number(hours) * 60 + Number(minutes);
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
