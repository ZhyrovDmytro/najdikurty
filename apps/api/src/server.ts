import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  fetchBookaballAvailability,
  fetchJdemeNaToAvailability,
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
  try {
    const query = querySchema.parse(request.query);
    const availability = await fetchAvailabilityByClub(query);

    response.json(availability);
  } catch (error) {
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

  return fetchJdemeNaToAvailability({
    clubSlug: query.club,
    credentials: query.club === "tk-sparta-praha" ? tkSpartaCredentials() : undefined,
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

function bookaballCredentials() {
  const email = process.env.BOOKABALL_EMAIL;
  const password = process.env.BOOKABALL_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email, password };
}
