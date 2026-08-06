import * as cheerio from "cheerio";
import { parseJdemeNaToAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const DEFAULT_BROWSER_PROFILE_DIR = ".mamekurt/browser-profiles/jdemenato";
const DEFAULT_BROWSER_TIMEOUT_MS = 90_000;
const DEFAULT_HTTP_FALLBACK_TIMEOUT_MS = 5_000;
const DEFAULT_PORTAL_FROM_HOUR = 2;
const DEFAULT_PORTAL_TO_HOUR = 22;

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

export interface JdemeNaToPortalSearchOptions {
  baseUrl?: string;
  browser?: JdemeNaToBrowserOptions | false;
  city?: string;
  clubSlug: string;
  date?: string;
  fetchImpl?: typeof fetch;
  fromHour?: number;
  logger?: JdemeNaToBrowserLogger;
  organizationName: string;
  sport?: string;
  sportId?: string;
  timeoutMs?: number;
  toHour?: number;
}

export async function fetchJdemeNaToAvailability(options: JdemeNaToFetchOptions): Promise<AvailabilityResult> {
  const browserOptions = normalizeBrowserOptions(options.browser);
  try {
    return await fetchJdemeNaToAvailabilityWithHttp(options, {
      logger: browserOptions?.logger,
      timeoutMs: browserOptions && options.credentials
        ? browserOptions.httpTimeoutMs ?? DEFAULT_HTTP_FALLBACK_TIMEOUT_MS
        : undefined
    });
  } catch (error) {
    if (!browserOptions || !options.credentials) {
      throw error;
    }

    browserOptions.logger?.("http.failure", {
      error: error instanceof Error ? error.message : String(error)
    });
    browserOptions.logger?.("browser.fallback.start", {
      clubSlug: options.clubSlug,
      date: options.date,
      sport: options.sport
    });

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
      logger: browserOptions.logger,
      proxy: browserOptions.proxy,
      signal: browserOptions.signal,
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

export async function fetchJdemeNaToPortalSearchAvailability(
  options: JdemeNaToPortalSearchOptions
): Promise<AvailabilityResult> {
  try {
    return await fetchJdemeNaToPortalSearchAvailabilityWithHttp(options);
  } catch (error) {
    const browserOptions = normalizeBrowserOptions(options.browser);
    if (!browserOptions) {
      throw error;
    }

    browserOptions.logger?.("portal.http.failure", {
      error: error instanceof Error ? error.message : String(error)
    });
    browserOptions.logger?.("portal.browser.fallback.start", {
      clubSlug: options.clubSlug,
      date: options.date,
      organizationName: options.organizationName
    });

    return fetchJdemeNaToPortalSearchAvailabilityWithBrowser(options, browserOptions);
  }
}

async function fetchJdemeNaToPortalSearchAvailabilityWithHttp(
  options: JdemeNaToPortalSearchOptions
): Promise<AvailabilityResult> {
  const startedAt = Date.now();
  const baseUrl = options.baseUrl ?? "https://jdemenato.cz";
  const date = options.date ?? todayPrague();
  const sourceUrl = portalSearchUrl(baseUrl, {
    city: options.city ?? "Praha",
    date,
    fromHour: options.fromHour ?? DEFAULT_PORTAL_FROM_HOUR,
    sportId: options.sportId ?? "172791371",
    toHour: options.toHour ?? DEFAULT_PORTAL_TO_HOUR
  });
  const session = new CookieSession(options.fetchImpl ?? fetch, options.timeoutMs);

  options.logger?.("portal.search.start", {
    clubSlug: options.clubSlug,
    date,
    organizationName: options.organizationName,
    sourcePath: sourceUrl.pathname,
    timeoutMs: options.timeoutMs
  });

  const searchResponse = await session.fetch(sourceUrl);
  const searchHtml = await assertTextResponse(searchResponse, sourceUrl.toString());
  const timetableUrl = findPortalTimetableUrl(searchHtml, baseUrl, options.organizationName);
  options.logger?.("portal.search.loaded", {
    durationMs: Date.now() - startedAt,
    foundTimetable: Boolean(timetableUrl),
    htmlLength: searchHtml.length
  });

  if (!timetableUrl) {
    throw new Error(`JdemeNaTo portal search did not find ${options.organizationName}`);
  }

  options.logger?.("portal.timetable.fetch", {
    urlPath: timetableUrl.pathname
  });
  const timetableResponse = await session.fetch(timetableUrl, {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });
  const timetableText = await assertTextResponse(timetableResponse, timetableUrl.toString());
  const timetableHtml = parseTapestryZoneContent(timetableText);
  options.logger?.("portal.timetable.loaded", {
    durationMs: Date.now() - startedAt,
    htmlLength: timetableHtml.length
  });

  return parseJdemeNaToAvailability(timetableHtml, {
    sourceUrl: sourceUrl.toString(),
    clubSlug: options.clubSlug,
    date,
    sport: options.sport
  });
}

async function fetchJdemeNaToPortalSearchAvailabilityWithBrowser(
  options: JdemeNaToPortalSearchOptions,
  browserOptions: JdemeNaToBrowserOptions
): Promise<AvailabilityResult> {
  const startedAt = Date.now();
  const baseUrl = options.baseUrl ?? "https://jdemenato.cz";
  const date = options.date ?? todayPrague();
  const timeoutMs = browserOptions.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS;
  const sourceUrl = portalSearchUrl(baseUrl, {
    city: options.city ?? "Praha",
    date,
    fromHour: options.fromHour ?? DEFAULT_PORTAL_FROM_HOUR,
    sportId: options.sportId ?? "172791371",
    toHour: options.toHour ?? DEFAULT_PORTAL_TO_HOUR
  });

  browserOptions.logger?.("portal.browser.launch.start", {
    clubSlug: options.clubSlug,
    headless: browserOptions.headless ?? true,
    timeoutMs
  });

  const { chromium } = await import("playwright-core");
  throwIfAborted(browserOptions.signal);
  const context = await chromium.launchPersistentContext(browserOptions.userDataDir ?? DEFAULT_BROWSER_PROFILE_DIR, {
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    channel: browserOptions.channel,
    executablePath: browserOptions.executablePath,
    headless: browserOptions.headless ?? true,
    proxy: browserOptions.proxy,
    timeout: timeoutMs,
    viewport: { width: 1440, height: 1000 }
  });
  const removeAbortListener = closeContextOnAbort(context, browserOptions.signal);

  try {
    throwIfAborted(browserOptions.signal);
    browserOptions.logger?.("portal.browser.launch.success", {
      durationMs: Date.now() - startedAt
    });

    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(timeoutMs);

    browserOptions.logger?.("portal.browser.goto", {
      sourcePath: sourceUrl.pathname
    });
    await page.goto(sourceUrl.toString(), { waitUntil: "domcontentloaded", timeout: timeoutMs });

    await submitPortalSearchForm(page, options, date, timeoutMs, browserOptions.logger);

    const card = page
      .locator("[data-search-result]")
      .filter({ has: page.locator("h2", { hasText: options.organizationName }) })
      .first();
    await card.waitFor({ state: "visible", timeout: timeoutMs });
    browserOptions.logger?.("portal.browser.club.found", {
      durationMs: Date.now() - startedAt,
      organizationName: options.organizationName
    });

    await card.locator("a.showTimetable").first().click();
    await page.locator(".reservationCalendarContainer .verticalTimetable").first().waitFor({
      state: "visible",
      timeout: timeoutMs
    });

    const timetableHtml = await page.locator(".reservationCalendarContainer").first().evaluate((element) => element.outerHTML);
    browserOptions.logger?.("portal.browser.timetable.loaded", {
      durationMs: Date.now() - startedAt,
      htmlLength: timetableHtml.length
    });

    return parseJdemeNaToAvailability(timetableHtml, {
      sourceUrl: sourceUrl.toString(),
      clubSlug: options.clubSlug,
      date,
      sport: options.sport
    });
  } finally {
    removeAbortListener();
    await context.close().catch(() => undefined);
  }
}

export interface JdemeNaToBrowserOptions {
  enabled?: boolean;
  userDataDir?: string;
  channel?: string;
  executablePath?: string;
  headless?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  httpTimeoutMs?: number;
  proxy?: JdemeNaToBrowserProxy;
  renderer?: JdemeNaToBrowserRenderer;
  logger?: JdemeNaToBrowserLogger;
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
  signal?: AbortSignal;
  proxy?: JdemeNaToBrowserProxy;
  logger?: JdemeNaToBrowserLogger;
}

export interface JdemeNaToRenderedHtml {
  html: string;
  sourceUrl: string;
}

export type JdemeNaToBrowserRenderer = (options: JdemeNaToBrowserRenderOptions) => Promise<JdemeNaToRenderedHtml>;
export type JdemeNaToBrowserLogger = (event: string, details?: Record<string, unknown>) => void;

interface JdemeNaToHttpDiagnostics {
  logger?: JdemeNaToBrowserLogger;
  timeoutMs?: number;
}

async function fetchJdemeNaToAvailabilityWithHttp(
  options: JdemeNaToFetchOptions,
  diagnostics: JdemeNaToHttpDiagnostics = {}
): Promise<AvailabilityResult> {
  const startedAt = Date.now();
  const baseUrl = options.baseUrl ?? "https://jdemenato.cz";
  const session = new CookieSession(options.fetchImpl ?? fetch, diagnostics.timeoutMs);
  const overviewUrl = options.credentials
    ? new URL("/reservation/myportalorganizationcalendar", baseUrl)
    : new URL(`/reservation/${options.clubSlug}/reservationcalendaroverview`, baseUrl);

  diagnostics.logger?.("http.start", {
    clubSlug: options.clubSlug,
    date: options.date,
    sport: options.sport,
    timeoutMs: diagnostics.timeoutMs
  });

  if (options.credentials) {
    await login(session, baseUrl, options.clubSlug, options.credentials, diagnostics);
  }

  let currentUrl = overviewUrl;
  diagnostics.logger?.("http.calendar.fetch", {
    urlPath: currentUrl.pathname
  });
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
    diagnostics.logger?.("http.date.fetch", {
      date: options.date,
      urlPath: dateUrl.pathname
    });
    response = await session.fetch(currentUrl);
    html = await assertTextResponse(response, dateUrl.toString());
  }

  diagnostics.logger?.("http.success", {
    durationMs: Date.now() - startedAt,
    sourcePath: currentUrl.pathname
  });

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
  credentials: JdemeNaToCredentials,
  diagnostics: JdemeNaToHttpDiagnostics = {}
): Promise<void> {
  const loginUrl = new URL(`/reservation/${clubSlug}/login`, baseUrl);
  diagnostics.logger?.("http.login.page.fetch", {
    urlPath: loginUrl.pathname
  });
  await session.fetch(loginUrl);

  const form = new URLSearchParams({
    j_password: credentials.password,
    j_username: credentials.email
  });
  diagnostics.logger?.("http.login.submit", {
    urlPath: `/reservation/${clubSlug}/j_spring_security_check`
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
  diagnostics.logger?.("http.login.response", {
    location: sanitizeLoginLocation(location),
    status: response.status
  });
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

function portalSearchUrl(
  baseUrl: string,
  options: { city: string; date: string; fromHour: number; sportId: string; toHour: number }
): URL {
  return new URL(
    `/reservation/portalsearch/${options.sportId}_${encodeURIComponent(options.city)}_${options.date}_${options.fromHour}_${options.toHour}_f`,
    baseUrl
  );
}

function findPortalTimetableUrl(html: string, baseUrl: string, organizationName: string): URL | undefined {
  const $ = cheerio.load(html);
  const requestedName = normalizeText(organizationName).toLowerCase();

  const result = $("[data-search-result]")
    .filter((_, element) => normalizeText($(element).find("h2").first().text()).toLowerCase() === requestedName)
    .first();

  const href = result.find("a.showTimetable").first().attr("href");
  return href ? new URL(href, baseUrl) : undefined;
}

function parseTapestryZoneContent(responseText: string): string {
  try {
    const parsed = JSON.parse(responseText) as { content?: unknown };
    if (typeof parsed.content === "string") {
      return parsed.content;
    }
  } catch {
    // Some Tapestry endpoints can return HTML directly when JavaScript headers are ignored.
  }

  return responseText;
}

async function submitPortalSearchForm(
  page: import("playwright-core").Page,
  options: JdemeNaToPortalSearchOptions,
  date: string,
  timeoutMs: number,
  logger?: JdemeNaToBrowserLogger
): Promise<void> {
  logger?.("portal.browser.search.prepare", {
    city: options.city ?? "Praha",
    date,
    fromHour: options.fromHour ?? DEFAULT_PORTAL_FROM_HOUR,
    sportId: options.sportId ?? "172791371",
    toHour: options.toHour ?? DEFAULT_PORTAL_TO_HOUR
  });

  const searchForm = page.locator("#searchForm").first();
  try {
    await searchForm.waitFor({ state: "visible", timeout: timeoutMs });
  } catch (error) {
    logger?.("portal.browser.search.form.missing", await browserPageDiagnostics(page));
    throw error;
  }

  await page.locator("#globalSport").selectOption(options.sportId ?? "172791371");
  await page.locator("#textfield").fill(options.city ?? "Praha");
  await page.locator("#date").fill(formatPortalDate(date));
  await page.locator("#fromHour").evaluate((element, value) => {
    (element as HTMLInputElement).value = String(value);
  }, options.fromHour ?? DEFAULT_PORTAL_FROM_HOUR);
  await page.locator("#toHour").evaluate((element, value) => {
    (element as HTMLInputElement).value = String(value);
  }, options.toHour ?? DEFAULT_PORTAL_TO_HOUR);

  const searchResponsePromise = page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  await page.locator("#searchForm .btnSubmit").click();
  await searchResponsePromise;
  await page.locator("[data-search-result]").first().waitFor({ state: "visible", timeout: timeoutMs });

  logger?.("portal.browser.search.submitted", {
    currentUrl: safePageUrl(page.url())
  });
}

async function browserPageDiagnostics(page: import("playwright-core").Page): Promise<Record<string, unknown>> {
  const title = await page.title().catch(() => "unknown");
  const bodyText = await page.locator("body").innerText({ timeout: 1_000 }).catch(() => "");

  return {
    currentUrl: safePageUrl(page.url()),
    hasCloudflareText: /cloudflare|security verification|verify you are human|not a bot/i.test(bodyText),
    hasSearchForm: await page.locator("#searchForm").count().then((count) => count > 0).catch(() => false),
    pageTitle: title,
    textStart: bodyText.replace(/\s+/g, " ").trim().slice(0, 180)
  };
}

async function fetchRenderedHtmlWithBrowser(options: JdemeNaToBrowserRenderOptions): Promise<JdemeNaToRenderedHtml> {
  const startedAt = Date.now();
  options.logger?.("browser.launch.start", {
    clubSlug: options.clubSlug,
    headless: options.headless,
    hasChannel: Boolean(options.channel),
    hasExecutablePath: Boolean(options.executablePath),
    hasProxy: Boolean(options.proxy),
    timeoutMs: options.timeoutMs
  });

  const { chromium } = await import("playwright-core");
  throwIfAborted(options.signal);
  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>;

  try {
    context = await chromium.launchPersistentContext(options.userDataDir, {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      channel: options.channel,
      executablePath: options.executablePath,
      headless: options.headless,
      proxy: options.proxy,
      timeout: options.timeoutMs,
      viewport: { width: 1440, height: 1000 }
    });
  } catch (error) {
    options.logger?.("browser.launch.failure", {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  const removeAbortListener = closeContextOnAbort(context, options.signal);

  try {
    throwIfAborted(options.signal);
    options.logger?.("browser.launch.success", {
      durationMs: Date.now() - startedAt
    });

    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(options.timeoutMs);

    await browserLogin(page, options);

    const overviewUrl = new URL("/reservation/myportalorganizationcalendar", options.baseUrl);
    options.logger?.("browser.calendar.goto", {
      urlPath: overviewUrl.pathname
    });
    await page.goto(overviewUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    let html = await page.content();
    options.logger?.("browser.calendar.loaded", {
      currentUrl: safePageUrl(page.url()),
      htmlLength: html.length,
      selectedDate: selectedDate(html),
      selectedSport: selectedSport(html)
    });

    if (options.sport && selectedSport(html) !== options.sport.toLowerCase()) {
      const sportUrl = findSportUrl(html, options.baseUrl, options.sport);
      if (sportUrl) {
        options.logger?.("browser.sport.goto", {
          sport: options.sport,
          urlPath: sportUrl.pathname
        });
        await page.goto(sportUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
        html = await page.content();
      }
    }

    if (options.date && selectedDate(html) !== options.date) {
      options.logger?.("browser.date.goto", {
        date: options.date
      });
      await page.goto(authenticatedDateUrl(options.baseUrl, options.date).toString(), {
        waitUntil: "domcontentloaded",
        timeout: options.timeoutMs
      });
      html = await page.content();
    }

    options.logger?.("browser.success", {
      currentUrl: safePageUrl(page.url()),
      durationMs: Date.now() - startedAt,
      htmlLength: html.length,
      selectedDate: selectedDate(html)
    });

    return {
      html,
      sourceUrl: page.url()
    };
  } finally {
    removeAbortListener();
    await context.close().catch(() => undefined);
  }
}

function closeContextOnAbort(context: import("playwright-core").BrowserContext, signal?: AbortSignal): () => void {
  if (!signal) return () => undefined;

  const close = () => {
    void context.close().catch(() => undefined);
  };
  signal.addEventListener("abort", close, { once: true });
  return () => signal.removeEventListener("abort", close);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("JdemeNaTo request aborted");
  }
}

async function browserLogin(
  page: import("playwright-core").Page,
  options: JdemeNaToBrowserRenderOptions
): Promise<void> {
  const startedAt = Date.now();
  const loginUrl = new URL(`/reservation/${options.clubSlug}/login`, options.baseUrl);
  options.logger?.("browser.login.goto", {
    urlPath: loginUrl.pathname
  });
  await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
  options.logger?.("browser.login.page.loaded", {
    currentUrl: safePageUrl(page.url())
  });

  await page.locator('input[name="j_username"]').fill(options.credentials.email);
  await page.locator('input[name="j_password"]').fill(options.credentials.password);

  const loginResponsePromise = page
    .waitForResponse((response) => response.url().includes("/j_spring_security_check"), { timeout: options.timeoutMs })
    .catch(() => undefined);
  const navigationPromise = page.waitForURL(/myportalorganizationcalendar/, { timeout: options.timeoutMs }).catch(() => undefined);

  await page.locator('input[name="j_password"]').press("Enter");
  const loginResponse = await Promise.race([loginResponsePromise, navigationPromise.then(() => undefined)]);
  const location = loginResponse?.headers().location ?? "";
  options.logger?.("browser.login.submitted", {
    currentUrl: safePageUrl(page.url()),
    durationMs: Date.now() - startedAt,
    location: sanitizeLoginLocation(location),
    status: loginResponse?.status() ?? "unknown"
  });
  if (!page.url().includes("/reservation/myportalorganizationcalendar")) {
    throw new Error(`JdemeNaTo browser login failed: status ${loginResponse?.status() ?? "unknown"}, location ${sanitizeLoginLocation(location)}`);
  }
}

function safePageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "unknown";
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

  constructor(
    private readonly fetchImpl: typeof fetch,
    private readonly timeoutMs?: number
  ) {}

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

    const response = await this.fetchWithTimeout(url, {
      ...init,
      headers
    });
    this.storeCookies(response.headers);
    return response;
  }

  private async fetchWithTimeout(url: URL, init: RequestInit): Promise<Response> {
    if (!this.timeoutMs) {
      return this.fetchImpl(url, init);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(url, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`JdemeNaTo HTTP request timed out after ${this.timeoutMs}ms: ${url.pathname}`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
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

function todayPrague(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Prague",
    year: "numeric"
  });

  return formatter.format(new Date());
}

function formatPortalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
