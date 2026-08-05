import { parseISportSystemAvailability } from "./parser.js";
import type { AvailabilityResult } from "../../types.js";

const PRAGUE_TIMEZONE = "Europe/Prague";
const DEFAULT_URL = "https://teniscentrum.isportsystem.cz/?op=tab-id-13";
const PADEL_SPORT_ID = "13";
const DEFAULT_BROWSER_PROFILE_DIR = ".mamekurt/browser-profiles/isportsystem";
const DEFAULT_BROWSER_TIMEOUT_MS = 90_000;

export interface ISportSystemFetchOptions {
  url?: string;
  clubSlug: string;
  date?: string;
  sport?: string;
  fetchImpl?: typeof fetch;
  browser?: ISportSystemBrowserOptions | false;
}

export interface ISportSystemBrowserOptions {
  enabled?: boolean;
  userDataDir?: string;
  channel?: string;
  executablePath?: string;
  headless?: boolean;
  timeoutMs?: number;
  renderer?: ISportSystemBrowserRenderer;
}

export interface ISportSystemBrowserRenderOptions {
  url: string;
  date: string;
  userDataDir: string;
  channel?: string;
  executablePath?: string;
  headless: boolean;
  timeoutMs: number;
}

export interface ISportSystemRenderedHtml {
  html: string;
  sourceUrl: string;
}

export type ISportSystemBrowserRenderer = (
  options: ISportSystemBrowserRenderOptions
) => Promise<ISportSystemRenderedHtml>;

export async function fetchISportSystemAvailability(options: ISportSystemFetchOptions): Promise<AvailabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const date = options.date ?? pragueDateInputValue(new Date());
  const url = options.url ?? DEFAULT_URL;

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      }
    });
    const html = await response.text();

    if (response.ok && !isCloudflareChallenge(html, response)) {
      return parseISportSystemAvailability(html, {
        sourceUrl: response.url || url,
        clubSlug: options.clubSlug,
        date,
        sport: options.sport
      });
    }
  } catch {
    // Browser rendering below is the resilient path for iSportSystem.
  }

  const browserOptions = normalizeBrowserOptions(options.browser);
  if (!browserOptions) {
    throw new Error(
      "Head Tenis Centrum uses iSportSystem behind Cloudflare; direct HTTP scraping is blocked. Enable the browser-backed iSportSystem fetcher."
    );
  }

  const renderer = browserOptions.renderer ?? fetchRenderedHtmlWithBrowser;
  const rendered = await renderer({
    url,
    date,
    userDataDir: browserOptions.userDataDir ?? DEFAULT_BROWSER_PROFILE_DIR,
    channel: browserOptions.channel,
    executablePath: browserOptions.executablePath,
    headless: browserOptions.headless ?? false,
    timeoutMs: browserOptions.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS
  });

  if (isCloudflareChallenge(rendered.html)) {
    throw new Error(
      "Head Tenis Centrum still rendered a Cloudflare challenge in the browser-backed fetcher. Open the persistent browser profile once, pass the check, then retry."
    );
  }

  return parseISportSystemAvailability(rendered.html, {
    sourceUrl: rendered.sourceUrl,
    clubSlug: options.clubSlug,
    date,
    sport: options.sport
  });
}

function normalizeBrowserOptions(options: ISportSystemFetchOptions["browser"]): ISportSystemBrowserOptions | undefined {
  if (options === undefined || options === false || options.enabled === false) {
    return undefined;
  }

  return options;
}

async function fetchRenderedHtmlWithBrowser(
  options: ISportSystemBrowserRenderOptions
): Promise<ISportSystemRenderedHtml> {
  const { chromium } = await import("playwright-core");
  const context = await chromium.launchPersistentContext(options.userDataDir, {
    channel: options.channel ?? (options.executablePath ? undefined : "chrome"),
    executablePath: options.executablePath,
    headless: options.headless,
    viewport: { width: 1600, height: 1200 }
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(options.timeoutMs);

    await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    await page.waitForSelector("table.schema_sport_13", { timeout: options.timeoutMs });

    const ajaxHtml = await fetchTimetableHtmlFromPage(page, options.date);
    if (ajaxHtml && !isCloudflareChallenge(ajaxHtml.html)) {
      return ajaxHtml;
    }

    return {
      html: await page.content(),
      sourceUrl: page.url()
    };
  } finally {
    await context.close();
  }
}

async function fetchTimetableHtmlFromPage(
  page: import("playwright-core").Page,
  date: string
): Promise<ISportSystemRenderedHtml | undefined> {
  const result = await page.evaluate(
    async ({ date, sportId }) => {
      const [year, month, day] = date.split("-").map(Number);
      const params = new URLSearchParams({
        id_sport: sportId,
        day: String(day),
        month: String(month),
        year: String(year),
        event: "init",
        timetableWidth: String(document.documentElement.clientWidth || 1200)
      });

      const response = await fetch("/ajax/ajax.schema.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: params.toString()
      });

      return {
        ok: response.ok,
        sourceUrl: response.url,
        html: await response.text()
      };
    },
    { date, sportId: PADEL_SPORT_ID }
  );

  if (!result.ok || !result.html.includes("schema_sport_13")) {
    return undefined;
  }

  return {
    html: result.html,
    sourceUrl: result.sourceUrl
  };
}

function isCloudflareChallenge(html: string, response?: Response): boolean {
  return (
    response?.headers.get("cf-mitigated") === "challenge" ||
    html.includes("challenges.cloudflare.com") ||
    html.includes("Just a moment") ||
    html.includes("cf-mitigated")
  );
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
