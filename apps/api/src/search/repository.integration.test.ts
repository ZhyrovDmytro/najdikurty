import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseConnection } from "../db/client.js";
import { DrizzleAvailabilityIndexRepository } from "../db/repository.js";
import { bookingProviders, clubs } from "../db/schema.js";
import { DrizzleSearchRepository } from "./repository.js";

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleSearchRepository", () => {
  let connection: DatabaseConnection;
  const providerKey = `search-integration-${crypto.randomUUID()}`;

  beforeAll(() => {
    connection = createDatabase(connectionString!);
  });

  afterAll(async () => {
    if (!connection) return;
    const provider = await connection.db.query.bookingProviders.findFirst({
      where: eq(bookingProviders.key, providerKey)
    });
    if (provider) {
      await connection.db.delete(clubs).where(eq(clubs.providerId, provider.id));
      await connection.db.delete(bookingProviders).where(eq(bookingProviders.id, provider.id));
    }
    await connection.close();
  });

  it("reads available segments within the club-local search window", async () => {
    const writeRepository = new DrizzleAvailabilityIndexRepository(connection.db);
    const provider = await writeRepository.upsertBookingProvider({ key: providerKey, name: "Search integration" });
    const club = await writeRepository.upsertClub({
      slug: `search-integration-${crypto.randomUUID()}`,
      name: "Search integration club",
      providerId: provider.id,
      bookingUrl: "https://example.test/club",
      timezone: "Europe/Prague"
    });
    const court = await writeRepository.upsertCourt({
      clubId: club.id,
      externalId: "court-1",
      name: "Court 1",
      indoor: true
    });
    await writeRepository.upsertAvailabilitySlots([{
      clubId: club.id,
      courtId: court.id,
      startsAt: new Date("2026-08-21T16:00:00Z"),
      endsAt: new Date("2026-08-21T17:00:00Z"),
      available: true,
      fetchedAt: new Date()
    }]);

    const rows = await new DrizzleSearchRepository(connection.db).findAvailableSegments({
      date: "2026-08-21",
      from: "18:00",
      to: "19:00",
      durationMinutes: 60,
      clubSlugs: [club.slug],
      indoor: true
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clubSlug: club.slug, courtName: "Court 1", available: true });
    expect(rows[0]?.windowStartsAt).toBeInstanceOf(Date);
    expect(rows[0]?.windowEndsAt).toBeInstanceOf(Date);
  });
});
