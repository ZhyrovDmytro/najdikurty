import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseConnection } from "./client.js";
import { DrizzleAvailabilityIndexRepository } from "./repository.js";
import { availabilitySlots, bookingProviders, clubs, courts, scrapeRuns, scrapeTargets } from "./schema.js";

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("DrizzleAvailabilityIndexRepository", () => {
  let connection: DatabaseConnection;
  let repository: DrizzleAvailabilityIndexRepository;
  const providerKey = `integration-${crypto.randomUUID()}`;

  beforeAll(() => {
    connection = createDatabase(connectionString!);
    repository = new DrizzleAvailabilityIndexRepository(connection.db);
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

  it("upserts the indexing graph without creating duplicate slots", async () => {
    const provider = await repository.upsertBookingProvider({ key: providerKey, name: "Integration provider" });
    const sameProvider = await repository.upsertBookingProvider({ key: providerKey, name: "Updated provider" });
    expect(sameProvider.id).toBe(provider.id);

    const club = await repository.upsertClub({
      slug: `integration-${crypto.randomUUID()}`,
      name: "Integration club",
      providerId: provider.id,
      bookingUrl: "https://example.test/book"
    });
    const court = await repository.upsertCourt({ clubId: club.id, externalId: "court-1", name: "Court 1" });
    const startsAt = new Date("2026-08-21T08:00:00.000Z");
    const endsAt = new Date("2026-08-21T09:00:00.000Z");

    const [slot] = await repository.upsertAvailabilitySlots([
      { clubId: club.id, courtId: court.id, startsAt, endsAt, available: true, fetchedAt: new Date() }
    ]);
    const [updatedSlot] = await repository.upsertAvailabilitySlots([
      { clubId: club.id, courtId: court.id, startsAt, endsAt, available: false, fetchedAt: new Date() }
    ]);
    expect(updatedSlot?.id).toBe(slot?.id);
    expect(updatedSlot?.available).toBe(false);

    const restored = await repository.reconcileAvailabilitySlots({
      clubId: club.id,
      courtIds: [court.id],
      from: new Date("2026-08-21T00:00:00.000Z"),
      to: new Date("2026-08-22T00:00:00.000Z"),
      fetchedAt: new Date(),
      complete: true,
      slots: [{ clubId: club.id, courtId: court.id, startsAt, endsAt, available: true, fetchedAt: new Date() }]
    });
    expect(restored).toMatchObject({ recordsReceived: 1, recordsChanged: 1 });

    const reconciledMissing = await repository.reconcileAvailabilitySlots({
      clubId: club.id,
      courtIds: [court.id],
      from: new Date("2026-08-21T00:00:00.000Z"),
      to: new Date("2026-08-22T00:00:00.000Z"),
      fetchedAt: new Date(),
      complete: true,
      slots: []
    });
    expect(reconciledMissing).toMatchObject({ recordsReceived: 0, recordsChanged: 1 });

    const run = await repository.startScrapeRun({ clubId: club.id, providerId: provider.id });
    const finishedRun = await repository.finishScrapeRun(run.id, {
      status: "success",
      recordsReceived: 1,
      recordsChanged: 1
    });
    expect(finishedRun.completedAt).not.toBeNull();

    await repository.upsertScrapeTarget({
      clubId: club.id,
      targetDate: "2026-08-21",
      nextRefreshAt: new Date()
    });

    expect(await connection.db.select().from(clubs).where(eq(clubs.id, club.id))).toHaveLength(1);
    expect(await connection.db.select().from(courts).where(eq(courts.clubId, club.id))).toHaveLength(1);
    expect(await connection.db.select().from(availabilitySlots).where(eq(availabilitySlots.clubId, club.id))).toHaveLength(1);
    expect(await connection.db.select().from(scrapeRuns).where(eq(scrapeRuns.clubId, club.id))).toHaveLength(1);
    expect(await connection.db.select().from(scrapeTargets).where(eq(scrapeTargets.clubId, club.id))).toHaveLength(1);
  });
});
