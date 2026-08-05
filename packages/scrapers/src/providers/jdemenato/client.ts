import * as cheerio from "cheerio";
import { parseJdemeNaToAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

export interface JdemeNaToFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  credentials?: JdemeNaToCredentials;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
}

export interface JdemeNaToCredentials {
  email: string;
  password: string;
}

export async function fetchJdemeNaToAvailability(options: JdemeNaToFetchOptions): Promise<AvailabilityResult> {
  const baseUrl = options.baseUrl ?? "https://jdemenato.cz";
  const session = new CookieSession(options.fetchImpl ?? fetch);
  const overviewUrl = options.credentials
    ? new URL("/reservation/myportalorganizationcalendar", baseUrl)
    : new URL(`/reservation/${options.clubSlug}/reservationcalendaroverview`, baseUrl);

  if (options.credentials) {
    await login(session, baseUrl, options.clubSlug, options.credentials);
  }

  let currentUrl = overviewUrl;
  let response = await session.fetch(currentUrl);
  let html = await assertTextResponse(response, overviewUrl.toString());

  if (options.sport && selectedSport(html) !== options.sport.toLowerCase()) {
    const sportUrl = findSportUrl(html, baseUrl, options.sport);
    if (sportUrl) {
      currentUrl = sportUrl;
      response = await session.fetch(currentUrl);
      html = await assertTextResponse(response, sportUrl.toString());
    }
  }

  if (options.date && selectedDate(html) !== options.date) {
    const dateUrl = options.credentials ? authenticatedDateUrl(baseUrl, options.date) : findDateUrl(html, baseUrl, options.date);
    if (!dateUrl) {
      throw new Error(`Date ${options.date} is not available in visible JdemeNaTo navigation`);
    }

    currentUrl = dateUrl;
    response = await session.fetch(currentUrl);
    html = await assertTextResponse(response, dateUrl.toString());
  }

  return parseJdemeNaToAvailability(html, {
    sourceUrl: currentUrl.toString(),
    clubSlug: options.clubSlug,
    sport: options.sport
  });
}

async function login(
  session: CookieSession,
  baseUrl: string,
  clubSlug: string,
  credentials: JdemeNaToCredentials
): Promise<void> {
  const loginUrl = new URL(`/reservation/${clubSlug}/login`, baseUrl);
  await session.fetch(loginUrl);

  const form = new URLSearchParams({
    j_password: credentials.password,
    j_username: credentials.email
  });
  const response = await session.fetch(new URL(`/reservation/${clubSlug}/j_spring_security_check`, baseUrl), {
    body: form,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    redirect: "manual"
  });

  const location = response.headers.get("location") ?? "";
  if (response.status < 300 || response.status >= 400 || !location.includes("/reservation/myportalorganizationcalendar")) {
    throw new Error("JdemeNaTo login failed");
  }
}

async function assertTextResponse(response: Response, url: string): Promise<string> {
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

class CookieSession {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly fetchImpl: typeof fetch) {}

  async fetch(url: URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    headers.set("Accept-Language", "en,cs;q=0.8");
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    );

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
  return setCookie ? [setCookie] : [];
}

function findSportUrl(html: string, baseUrl: string, sport: string): URL | undefined {
  const $ = cheerio.load(html);
  const requestedSport = sport.toLowerCase();
  const href = $(".sportNavigation a")
    .filter((_, element) => $(element).find("h2").text().trim().toLowerCase() === requestedSport)
    .first()
    .attr("href");

  return href ? new URL(href, baseUrl) : undefined;
}

function authenticatedDateUrl(baseUrl: string, date: string): URL {
  return new URL(`/reservation/myportalorganizationcalendar.navigation.daynavigationbar:selectdayinternal/${date}`, baseUrl);
}

function findDateUrl(html: string, baseUrl: string, date: string): URL | undefined {
  const $ = cheerio.load(html);
  const href = $(`#selectDay-${date}`).attr("href");
  return href ? new URL(href, baseUrl) : undefined;
}

function selectedSport(html: string): string | undefined {
  const $ = cheerio.load(html);
  return $(".sportNavigation a.selected-sport h2").first().text().trim().toLowerCase() || undefined;
}

function selectedDate(html: string): string | undefined {
  const $ = cheerio.load(html);
  return $(".timeNavigation a.selectedDay time").first().attr("datetime");
}
