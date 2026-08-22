import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { deduplicateAvailabilitySlots, planAvailabilityReconciliation } from "./reconciliation.js";
import {
  availabilitySlots,
  bookingProviders,
  clubs,
  courts,
  scrapeRuns,
  scrapeTargets,
  type AvailabilitySlotRow,
  type BookingProviderRow,
  type ClubRow,
  type CourtRow,
  type ScrapeRunRow,
  type ScrapeTargetRow
} from "./schema.js";

export type BookingProviderInput = Pick<BookingProviderRow, "key" | "name"> & Partial<Pick<BookingProviderRow, "active">>;
export type ClubInput = Pick<ClubRow, "slug" | "name" | "providerId" | "bookingUrl"> &
  Partial<
    Pick<
      ClubRow,
      "providerExternalId" | "providerConfig" | "address" | "latitude" | "longitude" | "timezone" | "active"
    >
  >;
export type CourtInput = Pick<CourtRow, "clubId" | "externalId" | "name"> &
  Partial<Pick<CourtRow, "indoor" | "surface" | "active">>;
export type AvailabilitySlotInput = Pick<
  AvailabilitySlotRow,
  "clubId" | "courtId" | "startsAt" | "endsAt" | "available" | "fetchedAt"
> &
  Partial<Pick<AvailabilitySlotRow, "price" | "currency" | "bookingUrl" | "sourceHash">>;

export interface ReconcileAvailabilityInput {
  clubId: string;
  courtIds: string[];
  from: Date;
  to: Date;
  fetchedAt: Date;
  complete: boolean;
  slots: AvailabilitySlotInput[];
}

export interface ReconcileAvailabilityResult {
  recordsReceived: number;
  recordsChanged: number;
  slots: AvailabilitySlotRow[];
}

export interface AvailabilityIndexRepository {
  upsertBookingProvider(input: BookingProviderInput): Promise<BookingProviderRow>;
  upsertClub(input: ClubInput): Promise<ClubRow>;
  upsertCourt(input: CourtInput): Promise<CourtRow>;
  upsertAvailabilitySlots(inputs: AvailabilitySlotInput[]): Promise<AvailabilitySlotRow[]>;
  reconcileAvailabilitySlots(input: ReconcileAvailabilityInput): Promise<ReconcileAvailabilityResult>;
  startScrapeRun(input: Pick<ScrapeRunRow, "clubId" | "providerId"> & Partial<Pick<ScrapeRunRow, "attempt" | "metadata">>): Promise<ScrapeRunRow>;
  finishScrapeRun(id: string, input: Pick<ScrapeRunRow, "status" | "recordsReceived" | "recordsChanged"> & Partial<Pick<ScrapeRunRow, "errorCode" | "errorMessage" | "metadata">>): Promise<ScrapeRunRow>;
  upsertScrapeTarget(input: Pick<ScrapeTargetRow, "clubId" | "targetDate" | "nextRefreshAt"> & Partial<Pick<ScrapeTargetRow, "priority" | "status">>): Promise<ScrapeTargetRow>;
}

export class DrizzleAvailabilityIndexRepository implements AvailabilityIndexRepository {
  constructor(private readonly db: Database) {}

  async upsertBookingProvider(input: BookingProviderInput): Promise<BookingProviderRow> {
    const [row] = await this.db
      .insert(bookingProviders)
      .values(input)
      .onConflictDoUpdate({
        target: bookingProviders.key,
        set: {
          name: input.name,
          ...(input.active === undefined ? {} : { active: input.active }),
          updatedAt: new Date()
        }
      })
      .returning();
    return requiredRow(row, "booking provider");
  }

  async upsertClub(input: ClubInput): Promise<ClubRow> {
    const [row] = await this.db
      .insert(clubs)
      .values(input)
      .onConflictDoUpdate({
        target: clubs.slug,
        set: {
          name: input.name,
          providerId: input.providerId,
          bookingUrl: input.bookingUrl,
          ...(input.providerExternalId === undefined ? {} : { providerExternalId: input.providerExternalId }),
          ...(input.providerConfig === undefined ? {} : { providerConfig: input.providerConfig }),
          ...(input.address === undefined ? {} : { address: input.address }),
          ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
          ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
          ...(input.timezone === undefined ? {} : { timezone: input.timezone }),
          ...(input.active === undefined ? {} : { active: input.active }),
          updatedAt: new Date()
        }
      })
      .returning();
    return requiredRow(row, "club");
  }

  async upsertCourt(input: CourtInput): Promise<CourtRow> {
    const [row] = await this.db
      .insert(courts)
      .values(input)
      .onConflictDoUpdate({
        target: [courts.clubId, courts.externalId],
        set: {
          name: input.name,
          ...(input.indoor === undefined ? {} : { indoor: input.indoor }),
          ...(input.surface === undefined ? {} : { surface: input.surface }),
          ...(input.active === undefined ? {} : { active: input.active }),
          updatedAt: new Date()
        }
      })
      .returning();
    return requiredRow(row, "court");
  }

  async upsertAvailabilitySlots(inputs: AvailabilitySlotInput[]): Promise<AvailabilitySlotRow[]> {
    const deduplicatedInputs = deduplicateAvailabilitySlots(inputs);
    if (deduplicatedInputs.length === 0) return [];

    return this.db
      .insert(availabilitySlots)
      .values(deduplicatedInputs)
      .onConflictDoUpdate({
        target: [availabilitySlots.clubId, availabilitySlots.courtId, availabilitySlots.startsAt, availabilitySlots.endsAt],
        set: {
          available: sql`excluded.available`,
          price: sql`excluded.price`,
          currency: sql`excluded.currency`,
          bookingUrl: sql`excluded.booking_url`,
          fetchedAt: sql`excluded.fetched_at`,
          sourceHash: sql`excluded.source_hash`,
          updatedAt: new Date()
        }
      })
      .returning();
  }

  async reconcileAvailabilitySlots(input: ReconcileAvailabilityInput): Promise<ReconcileAvailabilityResult> {
    return this.db.transaction(async (transaction) => {
      const existing = input.courtIds.length === 0
        ? []
        : await transaction
            .select()
            .from(availabilitySlots)
            .where(
              and(
                eq(availabilitySlots.clubId, input.clubId),
                inArray(availabilitySlots.courtId, input.courtIds),
                gte(availabilitySlots.startsAt, input.from),
                lt(availabilitySlots.startsAt, input.to)
              )
            );
      const plan = planAvailabilityReconciliation(existing, input.slots, input.complete);

      const persisted = plan.incoming.length === 0
        ? []
        : await transaction
            .insert(availabilitySlots)
            .values(plan.incoming)
            .onConflictDoUpdate({
              target: [
                availabilitySlots.clubId,
                availabilitySlots.courtId,
                availabilitySlots.startsAt,
                availabilitySlots.endsAt
              ],
              set: {
                available: sql`excluded.available`,
                price: sql`excluded.price`,
                currency: sql`excluded.currency`,
                bookingUrl: sql`excluded.booking_url`,
                fetchedAt: sql`excluded.fetched_at`,
                sourceHash: sql`excluded.source_hash`,
                updatedAt: input.fetchedAt
              }
            })
            .returning();

      if (plan.missingIds.length > 0) {
        await transaction
          .update(availabilitySlots)
          .set({ available: false, fetchedAt: input.fetchedAt, updatedAt: input.fetchedAt })
          .where(inArray(availabilitySlots.id, plan.missingIds));
      }

      return {
        recordsReceived: plan.incoming.length,
        recordsChanged: plan.recordsChanged,
        slots: persisted
      };
    });
  }

  async startScrapeRun(
    input: Pick<ScrapeRunRow, "clubId" | "providerId"> & Partial<Pick<ScrapeRunRow, "attempt" | "metadata">>
  ): Promise<ScrapeRunRow> {
    const [row] = await this.db.insert(scrapeRuns).values(input).returning();
    return requiredRow(row, "scrape run");
  }

  async finishScrapeRun(
    id: string,
    input: Pick<ScrapeRunRow, "status" | "recordsReceived" | "recordsChanged"> &
      Partial<Pick<ScrapeRunRow, "errorCode" | "errorMessage" | "metadata">>
  ): Promise<ScrapeRunRow> {
    const completedAt = new Date();
    const [row] = await this.db
      .update(scrapeRuns)
      .set({
        ...input,
        completedAt,
        durationMs: sql<number>`greatest(0, extract(epoch from (${completedAt}::timestamptz - ${scrapeRuns.startedAt})) * 1000)::integer`,
        updatedAt: completedAt
      })
      .where(sql`${scrapeRuns.id} = ${id}`)
      .returning();
    return requiredRow(row, "scrape run");
  }

  async upsertScrapeTarget(
    input: Pick<ScrapeTargetRow, "clubId" | "targetDate" | "nextRefreshAt"> &
      Partial<Pick<ScrapeTargetRow, "priority" | "status">>
  ): Promise<ScrapeTargetRow> {
    const [row] = await this.db
      .insert(scrapeTargets)
      .values(input)
      .onConflictDoUpdate({
        target: [scrapeTargets.clubId, scrapeTargets.targetDate],
        set: {
          nextRefreshAt: input.nextRefreshAt,
          ...(input.priority === undefined ? {} : { priority: input.priority }),
          ...(input.status === undefined ? {} : { status: input.status }),
          updatedAt: new Date()
        }
      })
      .returning();
    return requiredRow(row, "scrape target");
  }
}

function requiredRow<T>(row: T | undefined, entity: string): T {
  if (!row) throw new Error(`Failed to return ${entity}`);
  return row;
}
