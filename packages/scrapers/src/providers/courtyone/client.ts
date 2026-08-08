import { z } from "zod";
import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PROVIDER = "courtyone";
const PRAGUE_TIMEZONE = "Europe/Prague";
const DEFAULT_BASE_URL = "https://onepadel.cz";
const DEFAULT_BOOKING_PATH = "/book";
const FETCH_PUBLIC_BOOKING_SLOTS_ACTION_ID = "40df0a7d527c5ebe69466f048cbd25e31f574f51ee";
const DEFAULT_DAY_RANGE: TimeRange = { start: "07:00", end: "24:00" };
const SLOT_STEP_MINUTES = 30;
const MIN_BOOKING_MINUTES = 60;
const DEFAULT_DURATION_MINUTES = 60;

const ONE_PADEL_COURTS = [
  { id: "cmr26l1h1007x01mjtayoq2fn", name: "Kurt 1" },
  { id: "cmrep56bi00av01pkna7dycin", name: "Kurt 2" },
  { id: "cmrep5kih00aw01pk2rju6tzc", name: "Kurt 3" },
  { id: "cmrep5y3z00ax01pk088mc0j1", name: "Kurt 4" },
  { id: "cmrep6hyw00ay01pkylq2zucl", name: "Kurt 5" },
  { id: "cmrep6v8f00az01pk09m266og", name: "Kurt 6" },
  { id: "cmrep78xe00b001pkh4fkx5uz", name: "Kurt 7" },
  { id: "cmrep7jq400b101pkq5hc6hvq", name: "Kurt 8" },
  { id: "cmrep7ugr00b201pkh04tv5o2", name: "Kurt 9" }
] as const;

const courtyOneSlotSchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  priceMinor: z.number().optional(),
  currency: z.string().optional()
});

const courtyOneSlotsResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    slots: z.array(courtyOneSlotSchema)
  }),
  z.object({
    ok: z.literal(false),
    error: z.string().optional()
  })
]);

type CourtyOneSlot = z.infer<typeof courtyOneSlotSchema>;

export interface CourtyOneCourtConfig {
  id: string;
  name: string;
}

export interface CourtyOneFetchOptions {
  baseUrl?: string;
  bookingPath?: string;
  clubSlug: string;
  courtConfigs?: readonly CourtyOneCourtConfig[];
  date?: string;
  durationMinutes?: number;
  fetchImpl?: typeof fetch;
  sport?: string;
  tenantSlug?: string;
  timezone?: string;
  venueSlug?: string;
}

export async function fetchCourtyOneAvailability(options: CourtyOneFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const date = options.date ?? pragueDateInputValue(new Date());
  const sport = options.sport ?? "padel";
  const timezone = options.timezone ?? PRAGUE_TIMEZONE;
  const sourceUrl = courtyOneBookingUrl(options.baseUrl, options.bookingPath);
  const courtConfigs = options.courtConfigs ?? ONE_PADEL_COURTS;
  const durationMinutes = options.durationMinutes ?? DEFAULT_DURATION_MINUTES;

  const courtSlots = await Promise.all(
    courtConfigs.map(async (court) => ({
      court,
      slots: await fetchCourtSlots({
        sourceUrl,
        courtId: court.id,
        date,
        durationMinutes,
        fetchImpl,
        tenantSlug: options.tenantSlug ?? "onepadel",
        venueSlug: options.venueSlug ?? "praha-zlicin"
      })
    }))
  );

  const rawRanges = courtSlots.flatMap(({ slots }) => slots.map((slot) => slotToTimeRange(slot, date, timezone)));
  const dayRange = detectDayRange(rawRanges);
  const courts: CourtAvailability[] = courtSlots.map(({ court, slots }) => {
    const freeSlots = mergeRanges(slots.map((slot) => slotToTimeRange(slot, date, timezone)));

    return {
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport,
      date,
      court: court.name,
      blocks: buildBlockedIntervals(dayRange, freeSlots),
      freeSlots
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    date,
    dayRange,
    slotStepMinutes: SLOT_STEP_MINUTES,
    minBookingMinutes: MIN_BOOKING_MINUTES,
    clubSlug: options.clubSlug,
    sport,
    courts
  };
}

async function fetchCourtSlots({
  sourceUrl,
  courtId,
  date,
  durationMinutes,
  fetchImpl,
  tenantSlug,
  venueSlug
}: {
  sourceUrl: string;
  courtId: string;
  date: string;
  durationMinutes: number;
  fetchImpl: typeof fetch;
  tenantSlug: string;
  venueSlug: string;
}): Promise<CourtyOneSlot[]> {
  const response = await fetchImpl(sourceUrl, {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": FETCH_PUBLIC_BOOKING_SLOTS_ACTION_ID,
      referer: sourceUrl,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    },
    body: JSON.stringify([
      {
        tenantSlug,
        venueSlug,
        courtId,
        ymd: date,
        durationMinutes
      }
    ])
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`CourtyONE availability request failed: ${response.status} ${response.statusText}`);
  }

  const payload = courtyOneSlotsResponseSchema.parse(parseNextActionPayload(text));
  if (!payload.ok) {
    throw new Error(`CourtyONE availability request failed: ${payload.error ?? "unexpected response"}`);
  }

  return payload.slots;
}

function parseNextActionPayload(text: string): unknown {
  const payloadLine = text
    .split(/\r?\n/)
    .find((line) => line.startsWith("1:"))
    ?.slice(2);

  if (!payloadLine) {
    throw new Error("CourtyONE availability response did not include an action payload");
  }

  return JSON.parse(payloadLine);
}

function slotToTimeRange(slot: CourtyOneSlot, date: string, timezone: string): TimeRange {
  return {
    start: minuteToTime(instantToLocalMinute(slot.startsAt, date, timezone)),
    end: minuteToTime(instantToLocalMinute(slot.endsAt, date, timezone))
  };
}

function detectDayRange(ranges: TimeRange[]): TimeRange {
  if (ranges.length === 0) return DEFAULT_DAY_RANGE;

  return {
    start: minuteToTime(Math.min(parseTime(DEFAULT_DAY_RANGE.start), ...ranges.map((range) => parseTime(range.start)))),
    end: minuteToTime(Math.max(parseTime(DEFAULT_DAY_RANGE.end), ...ranges.map((range) => parseTime(range.end))))
  };
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sortedRanges = [...ranges].sort((a, b) => parseTime(a.start) - parseTime(b.start) || parseTime(a.end) - parseTime(b.end));
  const merged: TimeRange[] = [];

  for (const range of sortedRanges) {
    const previous = merged.at(-1);
    if (!previous || parseTime(range.start) > parseTime(previous.end)) {
      merged.push({ ...range });
      continue;
    }

    if (parseTime(range.end) > parseTime(previous.end)) {
      previous.end = range.end;
    }
  }

  return merged;
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

function instantToLocalMinute(isoValue: string, date: string, timezone: string): number {
  const value = new Date(isoValue);
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(value);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
  const dayOffset = dateOffset(localDate, date);

  return dayOffset * 24 * 60 + Number(valueByType.hour) * 60 + Number(valueByType.minute);
}

function dateOffset(localDate: string, baseDate: string): number {
  const [localYear, localMonth, localDay] = localDate.split("-").map(Number);
  const [baseYear, baseMonth, baseDay] = baseDate.split("-").map(Number);
  const localUtc = Date.UTC(localYear, localMonth - 1, localDay);
  const baseUtc = Date.UTC(baseYear, baseMonth - 1, baseDay);

  return Math.round((localUtc - baseUtc) / 86_400_000);
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minuteToTime(totalMinutes: number): string {
  if (totalMinutes >= 24 * 60) return "24:00";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function pragueDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function courtyOneBookingUrl(baseUrl = DEFAULT_BASE_URL, bookingPath = DEFAULT_BOOKING_PATH): string {
  return new URL(bookingPath, baseUrl).toString();
}
