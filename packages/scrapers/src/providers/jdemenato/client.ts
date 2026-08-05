import * as cheerio from "cheerio";
import { parseJdemeNaToAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const DEFAULT_BROWSER_PROFILE_DIR = ".mamekurt/browser-profiles/jdemenato";
const DEFAULT_BROWSER_TIMEOUT_MS = 90_000;

export interface JdemeNaToFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  credentials?: JdemeNaToCredentials;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
  browser?: JdemeNaToBrowserOptions | false;
}

export interface JdemeNaToCredentials {
  email: string;
  password: string;
}

export async function fetchJdemeNaToAvailability(options: JdemeNaToFetchOptions): Promise<AvailabilityResult> {
  try {
    return await fetchJdemeNaToAvailabilityWithHttp(options);
  } catch (error) {
    const browserOptions = normalizeBrowserOptions(options.browser);
    if (!browserOptions || !options.credentials) {
      throw error;
    }

    const renderer = browserOptions.renderer ?? fetchRenderedHtmlWithBrowser;
    const baseUrl = options.baseUrl ?? "https://jdemenato.cz";
    const date = options.date;
    const rendered = await renderer({
      baseUrl,
      channel: browserOptions.channel,
      clubSlug: options.clubSlug,
      credentials: options.credentials,
      date,
      executablePath: browserOptions.executablePath,
      headless: browserOptions.headless ?? true,
      proxy: browserOptions.proxy,
      sport: options.sport,
      timeoutMs: browserOptions.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS,
      userDataDir: browserOptions.userDataDir ?? DEFAULT_BROWSER_PROFILE_DIR
    });

    return parseJdemeNaToAvailability(rendered.html, {
      sourceUrl: rendered.sourceUrl,
      clubSlug: options.clubSlug,
      sport: options.sport
    });
  }
}

export interface JdemeNaToBrowserOptions {
  enabled?: boolean;
  userDataDir?: string;
  channel?: string;
  executablePath?: string;
  headless?: boolean;
  timeoutMs?: number;
  proxy?: JdemeNaToBrowserProxy;
  renderer?: JdemeNaToBrowserRenderer;
}

export interface JdemeNaToBrowserProxy {
  server: string;
  username?: string;
  password?: string;
}

export interface JdemeNaToBrowserRenderOptions {
  baseUrl: string;
  clubSlug: string;
  credentials: JdemeNaToCredentials;
  date?: string;
  sport?: string;
  userDataDir: string;
  channel?: string;
  executablePath?: string;
  headless: boolean;
  timeoutMs: number;
  proxy?: JdemeNaToBrowserProxy;
}

export interface JdemeNaToRenderedHtml {
  html: string;
  sourceUrl: string;
}

export type JdemeNaToBrowserRenderer = (options: JdemeNaToBrowserRenderOptions) => Promise<JdemeNaToRenderedHtml>;

async function fetchJdemeNaToAvailabilityWithHttp(options: JdemeNaToFetchOptions): Promise<AvailabilityResult> {
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

function normalizeBrowserOptions(options: JdemeNaToFetchOptions["browser"]): JdemeNaToBrowserOptions | undefined {
  if (options === undefined || options === false || options.enabled === false) {
    return undefined;
  }

  return options;
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
    throw new Error(`JdemeNaTo login failed: status ${response.status}, location ${sanitizeLoginLocation(location)}`);
  }
}

function sanitizeLoginLocation(location: string): string {
  if (!location) {
    return "none";
  }

  return location.replace(/;jsessionid=[^/?#]+/i, ";jsessionid=<redacted>");
}

async function fetchRenderedHtmlWithBrowser(options: JdemeNaToBrowserRenderOptions): Promise<JdemeNaToRenderedHtml> {
  const { chromium } = await import("playwright-core");
  const context = await chromium.launchPersistentContext(options.userDataDir, {
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    channel: options.channel,
    executablePath: options.executablePath,
    headless: options.headless,
    proxy: options.proxy,
    viewport: { width: 1440, height: 1000 }
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(options.timeoutMs);

    await browserLogin(page, options);

    const overviewUrl = new URL("/reservation/myportalorganizationcalendar", options.baseUrl);
    await page.goto(overviewUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    let html = await page.content();

    if (options.sport && selectedSport(html) !== options.sport.toLowerCase()) {
      const sportUrl = findSportUrl(html, options.baseUrl, options.sport);
      if (sportUrl) {
        await page.goto(sportUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
        html = await page.content();
      }
    }

    if (options.date && selectedDate(html) !== options.date) {
      await page.goto(authenticatedDateUrl(options.baseUrl, options.date).toString(), {
        waitUntil: "domcontentloaded",
        timeout: options.timeoutMs
      });
      html = await page.content();
    }

    return {
      html,
      sourceUrl: page.url()
    };
  } finally {
    await context.close();
  }
}

async function browserLogin(
  page: import("playwright-core").Page,
  options: JdemeNaToBrowserRenderOptions
): Promise<void> {
  const loginUrl = new URL(`/reservation/${options.clubSlug}/login`, options.baseUrl);
  await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });

  await page.locator('input[name="j_username"]').fill(options.credentials.email);
  await page.locator('input[name="j_password"]').fill(options.credentials.password);

  const loginResponsePromise = page
    .waitForResponse((response) => response.url().includes("/j_spring_security_check"), { timeout: options.timeoutMs })
    .catch(() => undefined);
  const navigationPromise = page.waitForURL(/myportalorganizationcalendar/, { timeout: options.timeoutMs }).catch(() => undefined);

  await page.locator('input[name="j_password"]').press("Enter");
  const loginResponse = await Promise.race([loginResponsePromise, navigationPromise.then(() => undefined)]);
  const location = loginResponse?.headers().location ?? "";
  if (!page.url().includes("/reservation/myportalorganizationcalendar")) {
    throw new Error(`JdemeNaTo browser login failed: status ${loginResponse?.status() ?? "unknown"}, location ${sanitizeLoginLocation(location)}`);
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
