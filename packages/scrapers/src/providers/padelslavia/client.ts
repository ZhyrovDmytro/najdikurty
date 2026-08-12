import { detectPadelSlaviaActiveDayMonth, parsePadelSlaviaAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";

export interface PadelSlaviaFetchOptions {
  baseUrl?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  credentials?: PadelSlaviaCredentials;
  fetchImpl?: typeof fetch;
  browser?: PadelSlaviaBrowserOptions | false;
}

export interface PadelSlaviaCredentials {
  email: string;
  password: string;
}

export interface PadelSlaviaBrowserOptions {
  enabled?: boolean;
  userDataDir?: string;
  channel?: string;
  executablePath?: string;
  headless?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  renderer?: PadelSlaviaBrowserRenderer;
}

export interface PadelSlaviaBrowserRenderOptions {
  baseUrl: string;
  channel?: string;
  credentials?: PadelSlaviaCredentials;
  date: string;
  executablePath?: string;
  headless: boolean;
  requiresLogin: boolean;
  signal?: AbortSignal;
  sport?: string;
  timeoutMs: number;
  userDataDir: string;
}

export interface PadelSlaviaRenderedHtml {
  html: string;
  sourceUrl: string;
}

export type PadelSlaviaBrowserRenderer = (
  options: PadelSlaviaBrowserRenderOptions
) => Promise<PadelSlaviaRenderedHtml>;

const DEFAULT_BROWSER_PROFILE_DIR = ".mamekurt/browser-profiles/padelslavia";
const DEFAULT_BROWSER_TIMEOUT_MS = 45_000;

export async function fetchPadelSlaviaAvailability(options: PadelSlaviaFetchOptions): Promise<AvailabilityResult> {
  const baseUrl = options.baseUrl ?? "https://rezervace.padelslavia.cz";
  const date = options.date ?? pragueDateInputValue(new Date());
  const today = pragueDateInputValue(new Date());
  const session = new CookieSession(options.fetchImpl ?? fetch);

  const hasCredentials = Boolean(options.credentials);
  const needsDatedPage = date !== today || hasCredentials;
  const requiresLogin = hasCredentials;

  try {
    if (requiresLogin && options.credentials) {
      await login(session, baseUrl, options.credentials);
    }

    const url = needsDatedPage
      ? new URL(`/cs/rezervace/index/${sportPath(options.sport)}/${date}`, baseUrl)
      : new URL("/cs/rezervace", baseUrl);
    const response = await session.fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url.toString()}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    if (needsDatedPage && !hasCredentials && !isRequestedDateVisible(html, date)) {
      throw new Error("Padel Slavia requires login credentials for non-current dates");
    }

    return parsePadelSlaviaAvailability(html, {
      sourceUrl: response.url || url.toString(),
      clubSlug: options.clubSlug,
      date,
      sport: options.sport
    });
  } catch (error) {
    if (!options.credentials && isPadelSlaviaCredentialsRequired(error)) {
      throw error;
    }

    const browserOptions = normalizeBrowserOptions(options.browser);
    if (!browserOptions) {
      throw error;
    }

    const rendered = await (browserOptions.renderer ?? fetchRenderedHtmlWithBrowser)({
      baseUrl,
      channel: browserOptions.channel,
      credentials: options.credentials,
      date,
      executablePath: browserOptions.executablePath,
      headless: browserOptions.headless ?? true,
      requiresLogin,
      signal: browserOptions.signal,
      sport: options.sport,
      timeoutMs: browserOptions.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS,
      userDataDir: browserOptions.userDataDir ?? DEFAULT_BROWSER_PROFILE_DIR
    });

    return parsePadelSlaviaAvailability(rendered.html, {
      sourceUrl: rendered.sourceUrl,
      clubSlug: options.clubSlug,
      date,
      sport: options.sport
    });
  }
}

function isRequestedDateVisible(html: string, date: string): boolean {
  return detectPadelSlaviaActiveDayMonth(html) === date.slice(5);
}

function isPadelSlaviaCredentialsRequired(error: unknown): boolean {
  return error instanceof Error && error.message.includes("requires login credentials");
}

function normalizeBrowserOptions(options: PadelSlaviaFetchOptions["browser"]): PadelSlaviaBrowserOptions | undefined {
  if (options === undefined || options === false || options.enabled === false) {
    return undefined;
  }

  return options;
}

async function fetchRenderedHtmlWithBrowser(options: PadelSlaviaBrowserRenderOptions): Promise<PadelSlaviaRenderedHtml> {
  throwIfAborted(options.signal);
  const { chromium } = await import("playwright-core");
  const context = await chromium.launchPersistentContext(options.userDataDir, {
    channel: options.channel,
    executablePath: options.executablePath,
    headless: options.headless,
    viewport: { width: 1440, height: 1000 }
  });
  const removeAbortListener = closeContextOnAbort(context, options.signal);

  try {
    throwIfAborted(options.signal);
    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(options.timeoutMs);

    if (options.requiresLogin) {
      if (!options.credentials) {
        throw new Error("Padel Slavia browser login requires credentials");
      }

      await page.goto(new URL("/cs/prihlaseni", options.baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: options.timeoutMs
      });
      await page.fill('input[name="email"]', options.credentials.email);
      await page.fill('input[name="password"]', options.credentials.password);
      await Promise.all([
        page.waitForURL("**/cs/rezervace**", { timeout: options.timeoutMs }),
        page.click('button[type="submit"], input[type="submit"], .form-signin button.btn-success')
      ]);
    }

    const url = options.requiresLogin
      ? new URL(`/cs/rezervace/index/${sportPath(options.sport)}/${options.date}`, options.baseUrl)
      : new URL("/cs/rezervace", options.baseUrl);
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    await page.waitForSelector(".tabulka-rezervace table", { timeout: options.timeoutMs });

    return {
      html: await page.content(),
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
    throw signal.reason instanceof Error ? signal.reason : new Error("Padel Slavia request aborted");
  }
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
    throw new Error(`Padel Slavia login failed: status ${response.status}, location ${sanitizeLoginLocation(location)}`);
  }
}

function sanitizeLoginLocation(location: string): string {
  if (!location) return "none";

  try {
    const parsed = new URL(location, "https://rezervace.padelslavia.cz");
    return parsed.pathname || "none";
  } catch {
    return location.split("?")[0] || "none";
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
