export interface SearchPreferences {
  date: string;
  endDate: string;
  clubSlugs: string[];
  duration: number;
  courtsNeeded: number;
  courtType: "all" | "indoor" | "outdoor";
  multisportOnly: boolean;
  startTime: string | null;
  endTime: string | null;
}

export const SEARCH_PREFERENCES_KEY = "mamekurt-search";

export function searchDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let date = start; date <= end && dates.length < 8;) {
    dates.push(date);
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    date = next.toISOString().slice(0, 10);
  }
  return dates;
}

export function parseSearchPreferences(value: unknown, clubSlugs: string[]): SearchPreferences | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const validDate = (date: unknown): date is string => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  const validTime = (time: unknown) => time === null || typeof time === "string" && /^(?:[01]\d|2[0-3]):[03]0$/.test(time);
  if (!validDate(input.date) || !validDate(input.endDate) || input.endDate < input.date ||
    (input.multisportOnly !== undefined && typeof input.multisportOnly !== "boolean") ||
    !Array.isArray(input.clubSlugs) || !input.clubSlugs.every((slug: unknown) => typeof slug === "string") ||
    !Number.isInteger(input.duration) || Number(input.duration) < 30 || Number(input.duration) > 480 || Number(input.duration) % 30 !== 0 ||
    !Number.isInteger(input.courtsNeeded) || Number(input.courtsNeeded) < 1 || Number(input.courtsNeeded) > 20 ||
    !["all", "indoor", "outdoor"].includes(String(input.courtType)) || !validTime(input.startTime) ||
    !(validTime(input.endTime) || input.endTime === "24:00") ||
    (input.startTime && input.endTime && String(input.startTime) >= String(input.endTime))) return null;
  return {
    date: input.date, endDate: input.endDate,
    clubSlugs: [...new Set<string>(input.clubSlugs)].filter(slug => clubSlugs.includes(slug)),
    multisportOnly: input.multisportOnly === true,
    duration: input.duration as number, courtsNeeded: input.courtsNeeded as number,
    courtType: input.courtType as SearchPreferences["courtType"],
    startTime: input.startTime as string | null, endTime: input.endTime as string | null
  };
}

export function normalizeSearchPreferences(value: SearchPreferences, defaults: SearchPreferences, maximumDate: string): SearchPreferences {
  const date = value.date < defaults.date ? defaults.date : value.date > maximumDate ? maximumDate : value.date;
  const rangeDays = Math.round((new Date(`${value.endDate}T12:00:00Z`).getTime() - new Date(`${value.date}T12:00:00Z`).getTime()) / 86_400_000);
  const end = new Date(`${date}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + Math.min(7, rangeDays));
  const endDate = end.toISOString().slice(0, 10);
  return { ...value, date, endDate: endDate > maximumDate ? maximumDate : endDate,
    clubSlugs: value.clubSlugs.filter(slug => defaults.clubSlugs.includes(slug)) };
}
