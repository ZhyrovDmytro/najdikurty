import { dateKeyInTimezone, localDateTimeInstant, timeInTimezone } from "@mamekurt/scrapers";

export const DEFAULT_SCHEDULE_TIMEZONE = "Europe/Prague";
export const DEFAULT_SCHEDULE_START = "08:00";
export const DEFAULT_SCHEDULE_END = "22:00";
export const DEFAULT_TARGET_HORIZON_DAYS = 7;

export interface RefreshPolicyOptions {
  timezone?: string;
  startTime?: string;
  endTime?: string;
}

export function refreshCadenceMinutes(targetDate: string, now: Date, timezone = DEFAULT_SCHEDULE_TIMEZONE): number {
  const daysAhead = calendarDayDifference(dateKeyInTimezone(now, timezone), targetDate);
  if (daysAhead <= DEFAULT_TARGET_HORIZON_DAYS) return 20;
  return 1_440;
}

export function targetPriority(targetDate: string, now: Date, timezone = DEFAULT_SCHEDULE_TIMEZONE): number {
  const daysAhead = Math.max(0, calendarDayDifference(dateKeyInTimezone(now, timezone), targetDate));
  return Math.max(0, 100 - daysAhead * 5);
}

export function nextScheduledRefresh(
  now: Date,
  targetDate: string,
  options: RefreshPolicyOptions = {}
): Date {
  const timezone = options.timezone ?? DEFAULT_SCHEDULE_TIMEZONE;
  const startTime = options.startTime ?? DEFAULT_SCHEDULE_START;
  const endTime = options.endTime ?? DEFAULT_SCHEDULE_END;
  let scheduleDate = dateKeyInTimezone(now, timezone);

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const daysAhead = calendarDayDifference(scheduleDate, targetDate);
    for (const time of policyScheduleTimes(daysAhead, startTime, endTime)) {
      const candidate = localDateTimeInstant(scheduleDate, time, timezone);
      if (candidate.getTime() > now.getTime()) return candidate;
    }
    scheduleDate = addCalendarDays(scheduleDate, 1);
  }

  throw new Error(`Could not calculate the next refresh after ${now.toISOString()}`);
}

export function policyScheduleTimes(daysAhead: number, startTime = DEFAULT_SCHEDULE_START, endTime = DEFAULT_SCHEDULE_END): string[] {
  if (daysAhead <= DEFAULT_TARGET_HORIZON_DAYS) return scheduleTimes(startTime, endTime, 20);
  const onceDaily = laterTime(startTime, "14:00");
  return onceDaily <= endTime ? [onceDaily] : [endTime];
}

export function scheduleTimes(startTime: string, endTime: string, cadenceMinutes: number): string[] {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  if (start >= end) throw new Error("Schedule start must be before schedule end");
  if (!Number.isInteger(cadenceMinutes) || cadenceMinutes <= 0) throw new Error("Cadence must be positive");

  const result: string[] = [];
  for (let minute = start; minute <= end; minute += cadenceMinutes) result.push(formatMinutes(minute));
  if (result.at(-1) !== endTime) result.push(endTime);
  return result;
}

export function targetDates(now: Date, horizonDays = DEFAULT_TARGET_HORIZON_DAYS, timezone = DEFAULT_SCHEDULE_TIMEZONE): string[] {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 31) {
    throw new Error("Target horizon must be between 1 and 31 days");
  }
  const today = dateKeyInTimezone(now, timezone);
  return Array.from({ length: horizonDays + 1 }, (_, index) => addCalendarDays(today, index));
}

export function isInsideScheduleWindow(now: Date, options: RefreshPolicyOptions = {}): boolean {
  const timezone = options.timezone ?? DEFAULT_SCHEDULE_TIMEZONE;
  const current = timeInTimezone(now, timezone);
  return current >= (options.startTime ?? DEFAULT_SCHEDULE_START) && current <= (options.endTime ?? DEFAULT_SCHEDULE_END);
}

function calendarDayDifference(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function parseMinutes(time: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Invalid schedule time: ${time}`);
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function laterTime(left: string, right: string): string {
  return left >= right ? left : right;
}
