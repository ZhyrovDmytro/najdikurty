const TIMEZONE = "Europe/Prague";

export function nextApproximateCheck(targetDate: string, now: Date): Date {
  let scheduleDate = dateKeyInTimezone(now);

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const daysAhead = calendarDayDifference(scheduleDate, targetDate);
    for (const time of scheduleTimesForDaysAhead(daysAhead)) {
      const candidate = localDateTimeInstant(scheduleDate, time);
      if (candidate.getTime() > now.getTime()) return candidate;
    }
    scheduleDate = addCalendarDays(scheduleDate, 1);
  }

  throw new Error(`Could not calculate the next availability check after ${now.toISOString()}`);
}

export function approximateCountdown(target: Date, now: Date): string {
  const totalMinutes = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function scheduleTimesForDaysAhead(daysAhead: number): string[] {
  if (daysAhead <= 7) return scheduleTimes("08:00", "22:00", 20);
  return ["14:00"];
}

function scheduleTimes(startTime: string, endTime: string, cadenceMinutes: number): string[] {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  const result: string[] = [];
  for (let minute = start; minute <= end; minute += cadenceMinutes) result.push(formatMinutes(minute));
  if (result.at(-1) !== endTime) result.push(endTime);
  return result;
}

function localDateTimeInstant(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredWallClock = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredWallClock;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = zonedDateTimeParts(new Date(candidate));
    const representedWallClock = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    candidate += desiredWallClock - representedWallClock;
  }

  return new Date(candidate);
}

function zonedDateTimeParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: TIMEZONE,
    year: "numeric"
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function dateKeyInTimezone(value: Date): string {
  const parts = zonedDateTimeParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function calendarDayDifference(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function parseMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
