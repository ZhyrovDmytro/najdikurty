import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  fetchBookaballAvailability,
  fetchJdemeNaToAvailability,
  fetchJdemeNaToPortalSearchAvailability,
  fetchPadelosAvailability,
  fetchPadelSlaviaAvailability,
  fetchPlaytomicAvailability,
  fetchReenioAvailability,
  fetchReservantoAvailability,
  fetchSkySportCityAvailability,
  isPlaytomicClubSlug
} from "@mamekurt/scrapers";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const DEFAULT_AVAILABILITY_TIMEOUT_MS = 25_000;
const DEFAULT_JDEMENATO_BROWSER_TIMEOUT_MS = 20_000;

const querySchema = z.object({
  club: z.string().default("tk-sparta-praha"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  live: z.string().optional(),
  sport: z.string().default("padel")
});

app.use(cors());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/availability", async (request, response, next) => {
  const startedAt = Date.now();
  const requestId = createRequestId();

  try {
    const query = querySchema.parse(request.query);
    const timeoutMs = providerTimeoutMs(query.club);
    logInfo("availability.start", {
      requestId,
      club: query.club,
      date: query.date,
      sport: query.sport,
      timeoutMs
    });

    const availability = await withTimeout(
      fetchAvailabilityByClub(query),
      timeoutMs,
      `${query.club} availability timed out`
    );

    logInfo("availability.success", {
      requestId,
      club: query.club,
      date: availability.date,
      courts: availability.courts.length,
      durationMs: Date.now() - startedAt,
      sourceUrl: availability.sourceUrl
    });
    response.json(availability);
  } catch (error) {
    const parsedQuery = querySchema.safeParse(request.query);
    logError("availability.failure", error, {
      requestId,
      club: parsedQuery.success ? parsedQuery.data.club : "unknown",
      date: parsedQuery.success ? parsedQuery.data.date : undefined,
      durationMs: Date.now() - startedAt
    });
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  response.status(500).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`Mamekurt API listening on http://${host}:${port}`);
});

async function fetchAvailabilityByClub(query: z.infer<typeof querySchema>) {
  if (query.club === "padel-prosek") {
    return fetchSkySportCityAvailability({
      clubSlug: query.club,
      date: query.date,
      sport: query.sport
    });
  }

  if (isPlaytomicClubSlug(query.club)) {
    return fetchPlaytomicAvailability({
      clubSlug: query.club,
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "sk-slavia-praha-padel") {
    return fetchPadelSlaviaAvailability({
      clubSlug: query.club,
      credentials: padelSlaviaCredentials(),
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "head-tenis-centrum-vestec") {
    throw new Error("Head Tenis Centrum availability is temporarily disabled");
  }

  if (query.club === "padel-neride") {
    return fetchReservantoAvailability({
      clubSlug: query.club,
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "padel-dzus") {
    return fetchBookaballAvailability({
      clubSlug: query.club,
      credentials: bookaballCredentials(),
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "padel-powers-smichov") {
    return fetchPadelosAvailability({
      clubSlug: query.club,
      clubId: "216927",
      companyId: "217",
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "cisarska-louka-padel") {
    return fetchReenioAvailability({
      clubSlug: query.club,
      date: query.date,
      sport: query.sport
    });
  }

  if (query.club === "tk-sparta-praha") {
    return fetchTkSpartaAvailability(query);
  }

  return fetchJdemeNaToAvailability({
    browser: query.club === "tk-sparta-praha" ? jdemenatoBrowserOptions(query.live) : undefined,
    clubSlug: query.club,
    credentials: query.club === "tk-sparta-praha" ? tkSpartaCredentials() : undefined,
    date: query.date,
    sport: query.sport
  });
}

async function fetchTkSpartaAvailability(query: z.infer<typeof querySchema>) {
  try {
    return await fetchJdemeNaToPortalSearchAvailability({
      browser: jdemenatoBrowserOptions(query.live),
      clubSlug: query.club,
      date: query.date,
      logger: jdemenatoBrowserLogger(),
      organizationName: "TK Sparta Praha",
      sport: query.sport,
      timeoutMs: optionalNumber(process.env.JDEMENATO_PORTAL_TIMEOUT_MS) ?? 10_000
    });
  } catch (error) {
    logError("jdemenato.portal.failure", error, {
      club: query.club,
      date: query.date
    });
  }

  return fetchJdemeNaToAvailability({
    browser: jdemenatoBrowserOptions(query.live),
    clubSlug: query.club,
    credentials: tkSpartaCredentials(),
    date: query.date,
    sport: query.sport
  });
}

function padelSlaviaCredentials() {
  const email = process.env.PADEL_SLAVIA_EMAIL;
  const password = process.env.PADEL_SLAVIA_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email, password };
}

function tkSpartaCredentials() {
  const email = process.env.TK_SPARTA_EMAIL;
  const password = process.env.TK_SPARTA_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email, password };
}

function jdemenatoBrowserOptions(live?: string) {
  if (process.env.JDEMENATO_BROWSER === "0") {
    return false;
  }

  if (process.env.JDEMENATO_BROWSER !== "1" && live !== "1") {
    return undefined;
  }

  return {
    enabled: true,
    userDataDir: process.env.JDEMENATO_BROWSER_PROFILE_DIR,
    channel: process.env.JDEMENATO_BROWSER_CHANNEL,
    executablePath: process.env.JDEMENATO_BROWSER_EXECUTABLE_PATH,
    headless: process.env.JDEMENATO_BROWSER_HEADLESS !== "false",
    httpTimeoutMs: optionalNumber(process.env.JDEMENATO_HTTP_TIMEOUT_MS),
    logger: jdemenatoBrowserLogger(),
    timeoutMs: optionalNumber(process.env.JDEMENATO_BROWSER_TIMEOUT_MS) ?? DEFAULT_JDEMENATO_BROWSER_TIMEOUT_MS,
    proxy: jdemenatoBrowserProxy()
  };
}

function jdemenatoBrowserLogger() {
  return (event: string, details: Record<string, unknown> = {}) => {
    logInfo(`jdemenato.${event}`, details);
  };
}

function providerTimeoutMs(clubSlug: string): number {
  const providerSpecificTimeout =
    clubSlug === "tk-sparta-praha" ? optionalNumber(process.env.TK_SPARTA_AVAILABILITY_TIMEOUT_MS) : undefined;

  return providerSpecificTimeout ?? optionalNumber(process.env.AVAILABILITY_TIMEOUT_MS) ?? DEFAULT_AVAILABILITY_TIMEOUT_MS;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function jdemenatoBrowserProxy() {
  const server = process.env.JDEMENATO_BROWSER_PROXY_SERVER;
  if (!server) {
    return undefined;
  }

  return {
    server,
    username: process.env.JDEMENATO_BROWSER_PROXY_USERNAME,
    password: process.env.JDEMENATO_BROWSER_PROXY_PASSWORD
  };
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function logInfo(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, ...details }));
}

function logError(event: string, error: unknown, details: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...details,
      error: error instanceof Error ? error.message : String(error)
    })
  );
}

function bookaballCredentials() {
  const email = process.env.BOOKABALL_EMAIL;
  const password = process.env.BOOKABALL_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email, password };
}
