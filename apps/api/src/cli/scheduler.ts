import { config as loadEnvironment } from "dotenv";
import { createDatabaseFromEnvironment } from "../db/client.js";
import { jobConfig } from "../scheduling/config.js";
import { ScrapeJobRepository } from "../scheduling/job-repository.js";
import { seedScrapeTargets } from "../scheduling/seeder.js";

loadEnvironment({ path: [".env.local", ".env"] });

const once = process.argv.includes("--once");
const settings = jobConfig();
const connection = createDatabaseFromEnvironment();
const repository = new ScrapeJobRepository(connection.db);
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

try {
  do {
    const now = new Date();
    const seeded = await seedScrapeTargets(repository, settings, now);
    console.log(JSON.stringify({ event: "scheduler.seeded", targetsEnsured: seeded, at: now.toISOString() }));
    if (once || stopping) break;
    await delay(settings.schedulerIntervalMs);
  } while (!stopping);
} finally {
  await connection.close();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
