import { createHash } from "node:crypto";
import {
  AvailabilityProviderError,
  localDateRange,
  type AvailabilityProvider,
  type Club,
  type NormalizedAvailabilitySlot
} from "@mamekurt/scrapers";
import type { AvailabilityIndexRepository, AvailabilitySlotInput } from "../db/repository.js";

export interface ScrapeClubInput {
  club: Club;
  date: string;
  attempt?: number;
  signal?: AbortSignal;
}

export interface ScrapeClubResult {
  clubId: string;
  clubSlug: string;
  providerId: string;
  scrapeRunId: string;
  date: string;
  courts: number;
  recordsReceived: number;
  recordsChanged: number;
  fetchedAt: Date;
  sourceUrl: string;
  complete: boolean;
}

export class AvailabilityScrapeService {
  constructor(
    private readonly repository: AvailabilityIndexRepository,
    private readonly provider: AvailabilityProvider,
    private readonly providerName: string
  ) {}

  async scrape(input: ScrapeClubInput): Promise<ScrapeClubResult> {
    if (input.club.providerId !== this.provider.id) {
      throw new Error(`Club ${input.club.slug} is configured for ${input.club.providerId}, not ${this.provider.id}`);
    }

    const providerRow = await this.repository.upsertBookingProvider({
      key: this.provider.id,
      name: this.providerName,
      active: true
    });
    const clubRow = await this.repository.upsertClub({
      slug: input.club.slug,
      name: input.club.name,
      providerId: providerRow.id,
      providerExternalId: input.club.providerExternalId,
      providerConfig: { ...input.club.providerConfig },
      bookingUrl: input.club.bookingUrl,
      timezone: input.club.timezone,
      active: input.club.active
    });
    const run = await this.repository.startScrapeRun({
      clubId: clubRow.id,
      providerId: providerRow.id,
      attempt: input.attempt,
      metadata: { date: input.date }
    });
    const range = localDateRange(input.date, input.club.timezone);

    try {
      const result = await this.provider.fetchAvailability({
        club: input.club,
        from: range.from,
        to: range.to,
        signal: input.signal
      });
      if (result.providerId !== this.provider.id || result.club.id !== input.club.id) {
        throw new Error(`Provider returned availability for an unexpected provider or club`);
      }
      const courtIdByDomainId = new Map<string, string>();

      for (const court of result.courts) {
        const row = await this.repository.upsertCourt({
          clubId: clubRow.id,
          externalId: court.externalId,
          name: court.name,
          indoor: court.indoor,
          surface: court.surface,
          active: court.active
        });
        courtIdByDomainId.set(court.id, row.id);
      }

      const slots = result.slots.map((slot) => mapSlot(slot, input.club.id, clubRow.id, courtIdByDomainId));
      const reconciliation = await this.repository.reconcileAvailabilitySlots({
        clubId: clubRow.id,
        courtIds: [...courtIdByDomainId.values()],
        from: range.from,
        to: range.to,
        fetchedAt: result.fetchedAt,
        complete: result.complete,
        slots
      });
      const finishedRun = await this.repository.finishScrapeRun(run.id, {
        status: "success",
        recordsReceived: reconciliation.recordsReceived,
        recordsChanged: reconciliation.recordsChanged,
        metadata: {
          date: input.date,
          sourceUrl: result.sourceUrl,
          complete: result.complete,
          courts: result.courts.length
        }
      });

      return {
        clubId: clubRow.id,
        clubSlug: clubRow.slug,
        providerId: providerRow.id,
        scrapeRunId: finishedRun.id,
        date: input.date,
        courts: result.courts.length,
        recordsReceived: reconciliation.recordsReceived,
        recordsChanged: reconciliation.recordsChanged,
        fetchedAt: result.fetchedAt,
        sourceUrl: result.sourceUrl,
        complete: result.complete
      };
    } catch (error) {
      await this.repository.finishScrapeRun(run.id, {
        status: "failed",
        recordsReceived: 0,
        recordsChanged: 0,
        errorCode: error instanceof AvailabilityProviderError ? error.code : "unknown",
        errorMessage: errorMessage(error),
        metadata: {
          date: input.date,
          retryable: error instanceof AvailabilityProviderError ? error.retryable : false
        }
      });
      throw error;
    }
  }
}

function mapSlot(
  slot: NormalizedAvailabilitySlot,
  domainClubId: string,
  databaseClubId: string,
  courtIdByDomainId: ReadonlyMap<string, string>
): AvailabilitySlotInput {
  if (slot.clubId !== domainClubId) {
    throw new Error(`Provider returned availability for unknown club ${slot.clubId}`);
  }
  const databaseCourtId = courtIdByDomainId.get(slot.courtId);
  if (!databaseCourtId) {
    throw new Error(`Provider returned availability for unknown court ${slot.courtId}`);
  }

  const input: AvailabilitySlotInput = {
    clubId: databaseClubId,
    courtId: databaseCourtId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    available: slot.available,
    price: slot.price,
    currency: slot.currency,
    bookingUrl: slot.bookingUrl,
    fetchedAt: slot.fetchedAt
  };
  return { ...input, sourceHash: availabilitySourceHash(input) };
}

function availabilitySourceHash(slot: AvailabilitySlotInput): string {
  return createHash("sha256")
    .update(JSON.stringify({
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      available: slot.available,
      price: slot.price ?? null,
      currency: slot.currency ?? null,
      bookingUrl: slot.bookingUrl ?? null
    }))
    .digest("hex");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected scrape failure";
}
