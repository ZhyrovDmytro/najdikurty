import { and, asc, desc, eq, gt, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { IndexedClubRegistration } from "../indexing/catalog.js";
import type { Database } from "../db/client.js";
import { bookingProviders, clubs, scrapeTargets, type ScrapeTargetRow } from "../db/schema.js";
import { DrizzleAvailabilityIndexRepository } from "../db/repository.js";

export interface ClaimedScrapeTarget {
  id: string;
  clubId: string;
  clubSlug: string;
  providerKey: string;
  targetDate: string;
  attemptCount: number;
}

export type ManualRefreshOutcome = "queued" | "already_queued" | "already_running";

export interface ManualRefreshStatus {
  clubSlug: string;
  status: ScrapeTargetRow["status"];
  lastRefreshAt: Date | null;
}

export class ScrapeJobRepository {
  private readonly indexRepository: DrizzleAvailabilityIndexRepository;

  constructor(private readonly db: Database) {
    this.indexRepository = new DrizzleAvailabilityIndexRepository(db);
  }

  async ensureCatalogClub(registration: IndexedClubRegistration) {
    const provider = await this.indexRepository.upsertBookingProvider({
      key: registration.provider.id,
      name: registration.providerName,
      active: true
    });
    return this.indexRepository.upsertClub({
      slug: registration.club.slug,
      name: registration.club.name,
      providerId: provider.id,
      providerExternalId: registration.club.providerExternalId,
      providerConfig: { ...registration.club.providerConfig },
      bookingUrl: registration.club.bookingUrl,
      timezone: registration.club.timezone,
      active: registration.club.active
    });
  }

  async ensureTarget(
    clubId: string,
    targetDate: string,
    nextRefreshAt: Date,
    priority: number,
    status: "pending" | "paused" = "pending"
  ): Promise<void> {
    await this.db
      .insert(scrapeTargets)
      .values({ clubId, targetDate, nextRefreshAt, priority, status })
      .onConflictDoNothing({ target: [scrapeTargets.clubId, scrapeTargets.targetDate] });
  }

  async pauseTargetsOutsideRange(firstDate: string, lastDate: string, now = new Date()): Promise<number> {
    const rows = await this.db
      .update(scrapeTargets)
      .set({
        status: "paused",
        lockedAt: null,
        lockedBy: null,
        updatedAt: now
      })
      .where(
        and(
          or(eq(scrapeTargets.status, "pending"), eq(scrapeTargets.status, "failed")),
          or(lt(scrapeTargets.targetDate, firstDate), gt(scrapeTargets.targetDate, lastDate))
        )
      )
      .returning({ id: scrapeTargets.id });
    return rows.length;
  }

  async requestManualRefresh(
    clubId: string,
    targetDate: string,
    now = new Date(),
    cooldownMs = 5 * 60_000
  ): Promise<ManualRefreshOutcome> {
    return this.db.transaction(async (transaction) => {
      const [target] = await transaction
        .select()
        .from(scrapeTargets)
        .where(and(eq(scrapeTargets.clubId, clubId), eq(scrapeTargets.targetDate, targetDate)))
        .for("update");

      if (!target) {
        await transaction.insert(scrapeTargets).values({ clubId, targetDate, nextRefreshAt: now, priority: 1_000 });
        return "queued";
      }
      if (target.status === "running") return "already_running";
      if (target.nextRefreshAt <= now && target.updatedAt.getTime() >= now.getTime() - cooldownMs) return "already_queued";

      await transaction
        .update(scrapeTargets)
        .set({
          status: "pending",
          nextRefreshAt: now,
          priority: Math.max(target.priority, 1_000),
          attemptCount: 0,
          lastError: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: now
        })
        .where(eq(scrapeTargets.id, target.id));
      return "queued";
    });
  }

  async getManualRefreshStatuses(clubSlugs: string[], targetDate: string): Promise<ManualRefreshStatus[]> {
    if (clubSlugs.length === 0) return [];
    return this.db
      .select({
        clubSlug: clubs.slug,
        status: scrapeTargets.status,
        lastRefreshAt: scrapeTargets.lastRefreshAt
      })
      .from(scrapeTargets)
      .innerJoin(clubs, eq(scrapeTargets.clubId, clubs.id))
      .where(and(inArray(clubs.slug, clubSlugs), eq(scrapeTargets.targetDate, targetDate)));
  }

  async recoverAbandonedLocks(now: Date, lockTimeoutMs: number): Promise<number> {
    const rows = await this.db
      .update(scrapeTargets)
      .set({
        status: "failed",
        lockedAt: null,
        lockedBy: null,
        nextRefreshAt: now,
        lastError: "Recovered an abandoned worker lock",
        updatedAt: now
      })
      .where(and(eq(scrapeTargets.status, "running"), lte(scrapeTargets.lockedAt, new Date(now.getTime() - lockTimeoutMs))))
      .returning({ id: scrapeTargets.id });
    return rows.length;
  }

  async claimDue(workerId: string, limit: number, now = new Date()): Promise<ClaimedScrapeTarget[]> {
    return this.db.transaction(async (transaction) => {
      const candidates = await transaction
        .select({ id: scrapeTargets.id })
        .from(scrapeTargets)
        .where(
          and(
            or(eq(scrapeTargets.status, "pending"), eq(scrapeTargets.status, "failed")),
            lte(scrapeTargets.nextRefreshAt, now)
          )
        )
        .orderBy(desc(scrapeTargets.priority), asc(scrapeTargets.nextRefreshAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      if (candidates.length === 0) return [];

      const ids = candidates.map(({ id }) => id);
      await transaction
        .update(scrapeTargets)
        .set({
          status: "running",
          lockedAt: now,
          lockedBy: workerId,
          attemptCount: sql`${scrapeTargets.attemptCount} + 1`,
          updatedAt: now
        })
        .where(inArray(scrapeTargets.id, ids));

      const claimed = await transaction
        .select({
          id: scrapeTargets.id,
          clubId: scrapeTargets.clubId,
          clubSlug: clubs.slug,
          providerKey: bookingProviders.key,
          targetDate: scrapeTargets.targetDate,
          attemptCount: scrapeTargets.attemptCount
        })
        .from(scrapeTargets)
        .innerJoin(clubs, eq(scrapeTargets.clubId, clubs.id))
        .innerJoin(bookingProviders, eq(clubs.providerId, bookingProviders.id))
        .where(inArray(scrapeTargets.id, ids));

      return claimed;
    });
  }

  async complete(target: ClaimedScrapeTarget, workerId: string, nextRefreshAt: Date | null, now = new Date()): Promise<void> {
    await this.updateOwnedTarget(target.id, workerId, {
      status: nextRefreshAt ? "pending" : "paused",
      lastRefreshAt: now,
      ...(nextRefreshAt ? { nextRefreshAt } : {}),
      priority: 0,
      attemptCount: 0,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      updatedAt: now
    });
  }

  async fail(
    target: ClaimedScrapeTarget,
    workerId: string,
    error: string,
    nextRefreshAt: Date | null,
    nextAttemptCount: number,
    now = new Date()
  ): Promise<void> {
    await this.updateOwnedTarget(target.id, workerId, {
      status: nextRefreshAt ? "failed" : "paused",
      ...(nextRefreshAt ? { nextRefreshAt } : {}),
      attemptCount: nextAttemptCount,
      lastError: error.slice(0, 2_000),
      lockedAt: null,
      lockedBy: null,
      updatedAt: now
    });
  }

  private async updateOwnedTarget(
    id: string,
    workerId: string,
    values: Partial<typeof scrapeTargets.$inferInsert>
  ): Promise<void> {
    const rows = await this.db
      .update(scrapeTargets)
      .set(values)
      .where(and(eq(scrapeTargets.id, id), eq(scrapeTargets.status, "running"), eq(scrapeTargets.lockedBy, workerId)))
      .returning({ id: scrapeTargets.id });
    if (rows.length !== 1) throw new Error(`Worker ${workerId} no longer owns scrape target ${id}`);
  }
}

export function retryDelayMs(attempt: number, baseMs: number, maxMs: number, random = Math.random): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitterMultiplier = 0.8 + random() * 0.4;
  return Math.max(1, Math.round(exponential * jitterMultiplier));
}
