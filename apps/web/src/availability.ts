export interface TimeRange {
  start: string;
  end: string;
}

export interface CourtAvailability {
  court: string;
  blocks: Array<TimeRange & { status: "occupied" | "lesson" | "closed"; label?: string }>;
  freeSlots: TimeRange[];
}

export interface AvailabilityResult {
  fetchedAt: string;
  sourceUrl: string;
  date: string;
  dayRange: TimeRange;
  slotStepMinutes?: number;
  minBookingMinutes?: number;
  durationAvailability?: Record<string, CourtAvailability[]>;
  sport: string;
  courts: CourtAvailability[];
  cache?: {
    state: "live" | "fresh" | "stale";
    cachedAt: string;
    ageSeconds: number;
    stale: boolean;
    error?: string;
  };
}

export interface BookableSlot extends TimeRange {
  courts: string[];
  bookingUrl?: string;
}

export const SLOT_STEP_MINUTES = 30;

export function buildBookableSlots(
  availability: AvailabilityResult,
  durationMinutes: number,
  courtsNeeded: number,
  timeWindow: TimeRange = availability.dayRange,
  now?: Date
): BookableSlot[] {
  if (availability.minBookingMinutes && durationMinutes < availability.minBookingMinutes) {
    return [];
  }

  const durationCourts = availability.durationAvailability?.[String(durationMinutes)];
  if (availability.durationAvailability) {
    return durationCourts
      ? filterSlotsToBookableWindow(buildExactDurationSlots(durationCourts, courtsNeeded), timeWindow, availability.date, now)
      : [];
  }

  const dayStart = ceilToStep(
    Math.max(toMinutes(availability.dayRange.start), toMinutes(timeWindow.start), minimumStartMinutes(availability.date, now)),
    SLOT_STEP_MINUTES
  );
  const dayEnd = Math.min(toMinutes(availability.dayRange.end), toMinutes(timeWindow.end));
  const slots: BookableSlot[] = [];

  for (let start = dayStart; start + durationMinutes <= dayEnd; start += SLOT_STEP_MINUTES) {
    const end = start + durationMinutes;
    const courts = availability.courts
      .filter((court) => court.freeSlots.some((freeSlot) => toMinutes(freeSlot.start) <= start && toMinutes(freeSlot.end) >= end))
      .map((court) => court.court);

    if (courts.length >= courtsNeeded) {
      slots.push({
        start: toTime(start),
        end: toTime(end),
        courts
      });
    }
  }

  return slots;
}

export function buildTimeOptions(dayRange?: TimeRange): string[] {
  if (!dayRange) return [];

  const options: string[] = [];
  for (let minutes = toMinutes(dayRange.start); minutes <= toMinutes(dayRange.end); minutes += SLOT_STEP_MINUTES) {
    options.push(toTime(minutes));
  }

  if (options.at(-1) !== dayRange.end) {
    options.push(dayRange.end);
  }

  return options;
}

export function formatTimeWindow(timeWindow: TimeRange, dayRange?: TimeRange): string {
  if (dayRange && timeWindow.start === dayRange.start && timeWindow.end === dayRange.end) {
    return "Whole day";
  }

  return `${timeWindow.start}-${timeWindow.end}`;
}

function buildExactDurationSlots(courts: CourtAvailability[], courtsNeeded: number): BookableSlot[] {
  const slotsByRange = new Map<string, BookableSlot>();

  for (const court of courts) {
    for (const freeSlot of court.freeSlots) {
      const key = `${freeSlot.start}-${freeSlot.end}`;
      const slot = slotsByRange.get(key) ?? { ...freeSlot, courts: [] };
      slot.courts.push(court.court);
      slotsByRange.set(key, slot);
    }
  }

  return [...slotsByRange.values()]
      .filter((slot) => slot.courts.length >= courtsNeeded)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));
}

export function buildDurationOptions(dayRange?: TimeRange): number[] {
  if (!dayRange) return [60, 90, 120];

  const fullDayMinutes = toMinutes(dayRange.end) - toMinutes(dayRange.start);
  const options: number[] = [];
  for (let minutes = 60; minutes <= fullDayMinutes; minutes += SLOT_STEP_MINUTES) {
    options.push(minutes);
  }

  return options;
}

export function formatDuration(minutes: number, dayRange?: TimeRange): string {
  if (dayRange && minutes === toMinutes(dayRange.end) - toMinutes(dayRange.start)) {
    return "Whole day";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

export function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function filterSlotsToBookableWindow(slots: BookableSlot[], timeWindow: TimeRange, date: string, now?: Date): BookableSlot[] {
  const startLimit = toMinutes(timeWindow.start);
  const endLimit = toMinutes(timeWindow.end);
  const minimumStart = minimumStartMinutes(date, now);
  return slots.filter((slot) => toMinutes(slot.start) >= startLimit && toMinutes(slot.start) >= minimumStart && toMinutes(slot.end) <= endLimit);
}

function minimumStartMinutes(date: string, now?: Date): number {
  if (!now || pragueDateInputValue(now) !== date) return 0;
  return pragueTimeInMinutes(now);
}

function ceilToStep(minutes: number, stepMinutes: number): number {
  return Math.ceil(minutes / stepMinutes) * stepMinutes;
}

function pragueDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Prague",
    year: "numeric"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function pragueTimeInMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Prague"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(valueByType.hour) * 60 + Number(valueByType.minute) + Number(valueByType.second) / 60;
}
