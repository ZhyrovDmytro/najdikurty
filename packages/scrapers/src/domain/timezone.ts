const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  from: Date;
  to: Date;
}

export function localDateRange(date: string, timezone: string): DateRange {
  assertDateKey(date);
  const nextDate = addCalendarDays(date, 1);

  return {
    from: localMidnightInstant(date, timezone),
    to: localMidnightInstant(nextDate, timezone)
  };
}

export function localDateTimeInstant(date: string, time: string, timezone: string): Date {
  assertDateKey(date);
  if (time === "24:00") return localMidnightInstant(addCalendarDays(date, 1), timezone);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error(`Invalid local time: ${time}`);
  }

  const [hour, minute] = time.split(":").map(Number);
  return localWallClockInstant(date, hour, minute, timezone);
}

export function dateKeyInTimezone(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(value);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

export function timeInTimezone(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone
  }).formatToParts(value);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.hour}:${valueByType.minute}`;
}

function localMidnightInstant(date: string, timezone: string): Date {
  return localWallClockInstant(date, 0, 0, timezone);
}

function localWallClockInstant(date: string, hour: number, minute: number, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const desiredWallClock = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredWallClock;

  // Re-evaluate after applying the offset because an offset can change near a DST boundary.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const localParts = zonedDateTimeParts(new Date(candidate), timezone);
    const representedWallClock = Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
      localParts.second
    );
    candidate += desiredWallClock - representedWallClock;
  }

  const instant = new Date(candidate);
  const expectedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  if (dateKeyInTimezone(instant, timezone) !== date || timeInTimezone(instant, timezone) !== expectedTime) {
    throw new Error(`Could not resolve ${date} ${expectedTime} in ${timezone}`);
  }

  return instant;
}

function zonedDateTimeParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(value);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(valueByType.year),
    month: Number(valueByType.month),
    day: Number(valueByType.day),
    hour: Number(valueByType.hour),
    minute: Number(valueByType.minute),
    second: Number(valueByType.second)
  };
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function assertDateKey(date: string): void {
  if (!DATE_KEY_PATTERN.test(date) || addCalendarDays(date, 0) !== date) {
    throw new Error(`Invalid calendar date: ${date}`);
  }
}
