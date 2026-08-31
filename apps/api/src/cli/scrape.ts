import { parseArgs } from "node:util";
import { dateKeyInTimezone } from "@mamekurt/scrapers";
import { config } from "dotenv";
import { z } from "zod";
import { createDatabaseFromEnvironment } from "../db/client.js";
import { DrizzleAvailabilityIndexRepository } from "../db/repository.js";
import { AvailabilityScrapeService } from "../indexing/scrape-service.js";
import { getIndexedClubRegistration, indexedClubSlugs } from "../indexing/catalog.js";

config({ path: [".env.local", ".env"] });

const { values } = parseArgs({
  options: {
    club: { type: "string" },
    date: { type: "string" },
    timeout: { type: "string" }
  }
});
const args = z.object({
  club: z.string().refine((value) => indexedClubSlugs().includes(value), {
    message: `Supported clubs: ${indexedClubSlugs().join(", ")}`
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeout: z.coerce.number().int().positive().max(180_000).optional()
}).parse(values);
const registration = getIndexedClubRegistration(args.club);
const club = registration.club;
const date = args.date ?? dateKeyInTimezone(new Date(), club.timezone);
const timeoutMs = args.timeout ?? 25_000;
const connection = createDatabaseFromEnvironment();
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(new Error(`${club.slug} scrape timed out`)), timeoutMs);

try {
  const repository = new DrizzleAvailabilityIndexRepository(connection.db);
  const service = new AvailabilityScrapeService(repository, registration.provider, registration.providerName);
  const result = await service.scrape({ club, date, signal: controller.signal });
  console.log(JSON.stringify({ ...result, fetchedAt: result.fetchedAt.toISOString() }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await connection.close();
}
