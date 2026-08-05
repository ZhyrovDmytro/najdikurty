import { parsePadelSlaviaAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";

export interface PadelSlaviaFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  credentials?: PadelSlaviaCredentials;
  fetchImpl?: typeof fetch;
}

export interface PadelSlaviaCredentials {
  email: string;
  password: string;
}

export async function fetchPadelSlaviaAvailability(options: PadelSlaviaFetchOptions): Promise<AvailabilityResult> {
  const baseUrl = options.baseUrl ?? "https://rezervace.padelslavia.cz";
  const date = options.date ?? pragueDateInputValue(new Date());
  const today = pragueDateInputValue(new Date());
  const session = new CookieSession(options.fetchImpl ?? fetch);

  if (date !== today && !options.credentials) {
    throw new Error("Padel Slavia requires login credentials for non-current dates");
  }

  if (options.credentials) {
    await login(session, baseUrl, options.credentials);
  }

  const url = options.credentials
    ? new URL(`/cs/rezervace/index/${sportPath(options.sport)}/${date}`, baseUrl)
    : new URL("/cs/rezervace", baseUrl);
  const response = await session.fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parsePadelSlaviaAvailability(html, {
    sourceUrl: response.url || url.toString(),
    clubSlug: options.clubSlug,
    date,
    sport: options.sport
  });
}

async function login(session: CookieSession, baseUrl: string, credentials: PadelSlaviaCredentials): Promise<void> {
  const loginUrl = new URL("/cs/prihlaseni", baseUrl);
  await session.fetch(loginUrl);

  const form = new URLSearchParams({
    email: credentials.email,
    password: credentials.password
  });
  const response = await session.fetch(loginUrl, {
    body: form,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    redirect: "manual"
  });

  const location = response.headers.get("location") ?? "";
  if (response.status < 300 || response.status >= 400 || !location.includes("/cs/rezervace")) {
    throw new Error("Padel Slavia login failed");
  }
}

class CookieSession {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly fetchImpl: typeof fetch) {}

  async fetch(url: URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    headers.set("Accept-Language", "cs,en;q=0.8");
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    );

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await fetchWithRetry(() =>
      this.fetchImpl(url, {
        ...init,
        headers
      })
    );
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

async function fetchWithRetry(fetcher: () => Promise<Response>, attempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }

      await delay(250 * attempt);
    }
  }

  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headersWithGetSetCookie.getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function sportPath(sport?: string): string {
  return sport?.toLowerCase() === "padel" || !sport ? "padel" : sport.toLowerCase();
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
