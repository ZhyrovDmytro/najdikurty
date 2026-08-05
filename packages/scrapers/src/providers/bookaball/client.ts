import type { AvailabilityResult, CourtAvailability, CourtBlock, TimeRange } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";
const PROVIDER = "bookaball";
const BASE_URL = "https://padeldzus.bookaball.com";
const CREATE_PAGE_URL = `${BASE_URL}/cs/bookings/create`;
const LOCATION_ID = 90;
const MIN_BOOKING_MINUTES = 60;
const SLOT_STEP_MINUTES = 30;

export interface BookaballFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  credentials?: BookaballCredentials;
  fetchImpl?: typeof fetch;
}

export interface BookaballCredentials {
  email: string;
  password: string;
}

interface BookaballCourt {
  id: number;
  type: string;
  size: string;
  sport_type: string;
  sort_order?: number | null;
}

interface BookaballStepResponse {
  prebooking?: {
    location?: {
      courts?: BookaballCourt[];
    };
  };
}

interface BookaballTime {
  time: string;
  disabled: boolean;
  available: boolean;
}

export async function fetchBookaballAvailability(options: BookaballFetchOptions): Promise<AvailabilityResult> {
  const baseUrl = options.baseUrl ?? BASE_URL;
  const apiBaseUrl = new URL("/api/", baseUrl);
  const date = options.date ?? pragueDateInputValue(new Date());
  const session = new CookieSession(options.fetchImpl ?? fetch);
  let csrfToken = await bootstrapSession(session, baseUrl);

  if (options.credentials) {
    await login(session, apiBaseUrl, csrfToken, options.credentials);
    csrfToken = await bootstrapSession(session, baseUrl);
  }

  await resetBooking(session, apiBaseUrl, csrfToken);
  const sizeResponse = await selectLocation(session, apiBaseUrl, csrfToken);
  const courts = selectPadelCourts(sizeResponse);
  if (courts.length === 0) {
    throw new Error("No Bookaball padel courts found");
  }

  const courtAvailabilities: CourtAvailability[] = [];
  let dayRange: TimeRange | undefined;

  for (const [index, court] of courts.entries()) {
    await selectCourt(session, apiBaseUrl, csrfToken, court.id);
    const times = await fetchTimes(session, apiBaseUrl, csrfToken, date);
    if (!dayRange) {
      dayRange = parseDayRange(times);
    }

    const freeSlots = mergeRanges(
      times
        .filter((time) => !time.disabled && time.available)
        .map((time) => {
          const startMinute = parseTime(time.time);
          return { start: minuteToTime(startMinute), end: minuteToTime(startMinute + MIN_BOOKING_MINUTES) };
        })
    );

    courtAvailabilities.push({
      provider: PROVIDER,
      clubSlug: options.clubSlug,
      sport: options.sport ?? "padel",
      date,
      court: `Kurt ${index + 1}`,
      blocks: buildBlockedIntervals(dayRange ?? { start: "00:00", end: "24:00" }, freeSlots),
      freeSlots
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: CREATE_PAGE_URL,
    date,
    dayRange: dayRange ?? { start: "00:00", end: "24:00" },
    slotStepMinutes: SLOT_STEP_MINUTES,
    minBookingMinutes: MIN_BOOKING_MINUTES,
    clubSlug: options.clubSlug,
    sport: options.sport ?? "padel",
    courts: courtAvailabilities
  };
}

async function bootstrapSession(session: CookieSession, baseUrl: string): Promise<string> {
  const response = await session.fetch(new URL("/cs/bookings/create", baseUrl));
  const html = await assertTextResponse(response, CREATE_PAGE_URL);
  const csrfToken = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/)?.[1];
  if (!csrfToken) {
    throw new Error("Bookaball CSRF token not found");
  }

  return csrfToken;
}

async function login(
  session: CookieSession,
  apiBaseUrl: URL,
  csrfToken: string,
  credentials: BookaballCredentials
): Promise<void> {
  const response = await session.fetch(new URL("auth/login", apiBaseUrl), {
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      remember: false
    }),
    headers: apiHeaders(csrfToken),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Bookaball login failed with ${response.status}`);
  }
}

async function resetBooking(session: CookieSession, apiBaseUrl: URL, csrfToken: string): Promise<void> {
  const response = await session.fetch(new URL("bookings/reset", apiBaseUrl), {
    headers: apiHeaders(csrfToken)
  });
  if (!response.ok) {
    throw new Error(`Bookaball reset failed with ${response.status}`);
  }
}

async function selectLocation(session: CookieSession, apiBaseUrl: URL, csrfToken: string): Promise<BookaballStepResponse> {
  const response = await session.fetch(new URL("bookings/create", apiBaseUrl), {
    body: JSON.stringify({
      step: "STEP_LOCATION",
      location_id: LOCATION_ID
    }),
    headers: apiHeaders(csrfToken),
    method: "POST"
  });

  return assertJsonResponse<BookaballStepResponse>(response, "Bookaball location selection failed");
}

async function selectCourt(session: CookieSession, apiBaseUrl: URL, csrfToken: string, courtId: number): Promise<void> {
  const response = await session.fetch(new URL("bookings/create", apiBaseUrl), {
    body: JSON.stringify({
      step: "STEP_SIZE",
      sport_type: "padel",
      court_size: "double",
      court_count: 1,
      court_type: "indoor",
      court_id: courtId
    }),
    headers: apiHeaders(csrfToken),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Bookaball court selection failed with ${response.status}`);
  }
}

async function fetchTimes(
  session: CookieSession,
  apiBaseUrl: URL,
  csrfToken: string,
  date: string
): Promise<BookaballTime[]> {
  const response = await session.fetch(new URL("bookings/times", apiBaseUrl), {
    body: JSON.stringify({
      date,
      duration: MIN_BOOKING_MINUTES
    }),
    headers: apiHeaders(csrfToken),
    method: "POST"
  });

  return assertJsonResponse<BookaballTime[]>(response, "Bookaball times request failed");
}

function selectPadelCourts(response: BookaballStepResponse): BookaballCourt[] {
  return [...(response.prebooking?.location?.courts ?? [])]
    .filter((court) => court.sport_type === "padel" && court.size === "double" && court.type === "indoor")
    .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
    .slice(0, 4);
}

function parseDayRange(times: BookaballTime[]): TimeRange {
  if (times.length === 0) {
    return { start: "00:00", end: "24:00" };
  }

  const starts = times.map((time) => parseTime(time.time));
  return {
    start: minuteToTime(Math.min(...starts)),
    end: minuteToTime(Math.max(...starts) + MIN_BOOKING_MINUTES)
  };
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sortedRanges = [...ranges].sort((a, b) => parseTime(a.start) - parseTime(b.start));
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

  const dayEnd = parseTime(dayRange.end);
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

function apiHeaders(csrfToken: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-CSRF-TOKEN": csrfToken,
    "X-Requested-With": "XMLHttpRequest"
  };
}

async function assertTextResponse(response: Response, url: string): Promise<string> {
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function assertJsonResponse<T>(response: Response, message: string): Promise<T> {
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`${message}: ${response.status}`);
  }

  return payload as T;
}

class CookieSession {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly fetchImpl: typeof fetch) {}

  async fetch(url: URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    );
    headers.set("Accept-Language", "cs,en;q=0.8");

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await this.fetchImpl(url, {
      ...init,
      headers
    });
    this.storeCookies(response.headers);
    return response;
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  private storeCookies(headers: Headers): void {
    for (const setCookie of readSetCookieHeaders(headers)) {
      const firstPart = setCookie.split(";")[0];
      const separatorIndex = firstPart.indexOf("=");
      if (separatorIndex <= 0) continue;
      this.cookies.set(firstPart.slice(0, separatorIndex), firstPart.slice(separatorIndex + 1));
    }
  }
}

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headersWithGetSetCookie.getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? setCookie.split(/,(?=\s*[^;,\s]+=)/) : [];
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
