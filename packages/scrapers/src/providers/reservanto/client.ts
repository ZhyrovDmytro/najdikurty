import * as cheerio from "cheerio";
import { parseReservantoAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";
const BASE_URL = "https://booking.reservanto.cz";
const DEFAULT_FORM_URL = `${BASE_URL}/form/?id=22277`;
const CALENDAR_URL = `${BASE_URL}/PlaceRentalLike/Step2_Calendar`;
const PADEL_SERVICE_ID = "99005";

export interface ReservantoFetchOptions {
  formUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
}

export async function fetchReservantoAvailability(options: ReservantoFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const date = options.date ?? pragueDateInputValue(new Date());
  const formUrl = options.formUrl ?? DEFAULT_FORM_URL;

  const formResponse = await fetchImpl(formUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "cs,en;q=0.8"
    }
  });
  const formHtml = await formResponse.text();

  if (!formResponse.ok) {
    throw new Error(`Reservanto form request failed with ${formResponse.status}`);
  }

  const payload = buildCalendarPayload(formHtml, date);
  const calendarResponse = await fetchImpl(CALENDAR_URL, {
    method: "POST",
    headers: {
      Accept: "text/html,*/*;q=0.8",
      "Accept-Language": "cs,en;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader(formResponse),
      Referer: formUrl,
      "X-Requested-With": "XMLHttpRequest"
    },
    body: payload.toString()
  });
  const calendarHtml = await calendarResponse.text();

  if (!calendarResponse.ok) {
    throw new Error(`Reservanto calendar request failed with ${calendarResponse.status}`);
  }

  return parseReservantoAvailability(calendarHtml, {
    sourceUrl: calendarResponse.url || CALENDAR_URL,
    clubSlug: options.clubSlug,
    date,
    sport: options.sport
  });
}

function buildCalendarPayload(formHtml: string, date: string): URLSearchParams {
  const $ = cheerio.load(formHtml);
  const payload = new URLSearchParams();

  $("#BookingModel input").each((_, element) => {
    const name = $(element).attr("name");
    if (!name) return;
    payload.append(name, $(element).attr("value") ?? "");
  });

  const weekStart = weekStartDateParts(date);
  payload.set("BookingServiceViewModel.BookingServiceId", PADEL_SERVICE_ID);
  payload.set("BookingTimeViewModel.LastMondayDay", String(weekStart.day));
  payload.set("BookingTimeViewModel.LastMondayMonth", String(weekStart.month));
  payload.set("BookingTimeViewModel.LastMondayYear", String(weekStart.year));

  return payload;
}

function cookieHeader(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headers.getSetCookie?.() ?? splitSetCookieHeader(headers.get("set-cookie"));
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function splitSetCookieHeader(value: string | null): string[] {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,\s]+=)/);
}

function weekStartDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - daysSinceMonday);

  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  };
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
