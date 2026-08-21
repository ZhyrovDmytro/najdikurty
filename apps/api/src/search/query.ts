import { z } from "zod";
import type { SearchQuery } from "./types.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isCalendarDate, "Invalid calendar date");
const startTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const endTimeSchema = z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/);

export const searchQuerySchema = z
  .object({
    date: dateSchema,
    from: startTimeSchema.default("00:00"),
    to: endTimeSchema.default("24:00"),
    duration: z.coerce.number().int().min(30).max(8 * 60).default(60),
    clubs: z.preprocess(
      (value) => Array.isArray(value) ? value.join(",") : value,
      z.string().optional()
    ),
    indoor: z.enum(["true", "false"]).optional()
  })
  .superRefine((value, context) => {
    const windowMinutes = timeMinutes(value.to) - timeMinutes(value.from);
    if (windowMinutes <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "to must be later than from", path: ["to"] });
    } else if (value.duration > windowMinutes) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "duration exceeds the requested time window", path: ["duration"] });
    }
  })
  .transform((value): SearchQuery => {
    const clubSlugs = value.clubs
      ?.split(",")
      .map((club) => club.trim())
      .filter(Boolean);

    return {
      date: value.date,
      from: value.from,
      to: value.to,
      durationMinutes: value.duration,
      ...(clubSlugs && clubSlugs.length > 0 ? { clubSlugs: [...new Set(clubSlugs)] } : {}),
      ...(value.indoor === undefined ? {} : { indoor: value.indoor === "true" })
    };
  });

function timeMinutes(value: string): number {
  if (value === "24:00") return 24 * 60;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
