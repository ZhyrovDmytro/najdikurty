import {
  AvailabilityProviderError,
  type AvailabilityProvider,
  type Club,
  type ProviderAvailabilityResult
} from "@mamekurt/scrapers";
import { describe, expect, it } from "vitest";
import type { AvailabilityIndexRepository, ReconcileAvailabilityInput } from "../db/repository.js";
import type { BookingProviderRow, ClubRow, CourtRow, ScrapeRunRow, ScrapeTargetRow } from "../db/schema.js";
import { AvailabilityScrapeService } from "./scrape-service.js";

const now = new Date("2026-08-21T08:00:00Z");
const club: Club = {
  id: "club-domain-id",
  slug: "padel-club-spoje",
  name: "Padel Club Spoje",
  providerId: "playtomic",
  providerExternalId: "tenant-1",
  providerConfig: { tenantId: "tenant-1", resourceIds: ["court-a"], sport: "padel" },
  bookingUrl: "https://playtomic.com/clubs/padel-club-spoje",
  timezone: "Europe/Prague",
  active: true
};

describe("AvailabilityScrapeService", () => {
  it("persists normalized courts and slots and completes the scrape run", async () => {
    const harness = repositoryHarness();
    const provider = providerReturning({
      providerId: "playtomic",
      club,
      courts: [{ id: "club-domain-id:court-a", clubId: club.id, externalId: "court-a", name: "Kurt 1", active: true }],
      slots: [{
        clubId: club.id,
        courtId: "club-domain-id:court-a",
        startsAt: new Date("2026-08-21T09:00:00Z"),
        endsAt: new Date("2026-08-21T10:00:00Z"),
        available: true,
        price: 500,
        currency: "CZK",
        bookingUrl: club.bookingUrl,
        fetchedAt: now
      }],
      fetchedAt: now,
      sourceUrl: "https://playtomic.com/api/clubs/availability",
      complete: true
    });
    const service = new AvailabilityScrapeService(harness.repository, provider, "Playtomic");

    const result = await service.scrape({ club, date: "2026-08-21" });

    expect(result).toMatchObject({ recordsReceived: 1, recordsChanged: 1, courts: 1, complete: true });
    expect(harness.reconciliation).toMatchObject({
      clubId: "club-db-id",
      courtIds: ["court-db-id"],
      complete: true
    });
    expect(harness.reconciliation?.slots[0]).toMatchObject({
      clubId: "club-db-id",
      courtId: "court-db-id",
      sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    expect(harness.finishedStatuses).toEqual(["success"]);
  });

  it("logs provider failures before rethrowing them", async () => {
    const harness = repositoryHarness();
    const provider: AvailabilityProvider = {
      id: "playtomic",
      fetchAvailability: async () => {
        throw new AvailabilityProviderError({
          message: "provider unavailable",
          code: "provider_error",
          retryable: true,
          providerId: "playtomic",
          clubId: club.id
        });
      }
    };
    const service = new AvailabilityScrapeService(harness.repository, provider, "Playtomic");

    await expect(service.scrape({ club, date: "2026-08-21" })).rejects.toThrow("provider unavailable");
    expect(harness.finishedStatuses).toEqual(["failed"]);
    expect(harness.finishedErrorCodes).toEqual(["provider_error"]);
  });
});

function providerReturning(result: ProviderAvailabilityResult): AvailabilityProvider {
  return { id: "playtomic", fetchAvailability: async () => result };
}

function repositoryHarness(): {
  repository: AvailabilityIndexRepository;
  reconciliation?: ReconcileAvailabilityInput;
  finishedStatuses: string[];
  finishedErrorCodes: Array<string | null | undefined>;
} {
  const providerRow: BookingProviderRow = {
    id: "provider-db-id",
    key: "playtomic",
    name: "Playtomic",
    active: true,
    createdAt: now,
    updatedAt: now
  };
  const clubRow: ClubRow = {
    id: "club-db-id",
    slug: club.slug,
    name: club.name,
    providerId: providerRow.id,
    providerExternalId: club.providerExternalId ?? null,
    providerConfig: { ...club.providerConfig },
    bookingUrl: club.bookingUrl,
    address: null,
    latitude: null,
    longitude: null,
    timezone: club.timezone,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  const courtRow: CourtRow = {
    id: "court-db-id",
    clubId: clubRow.id,
    externalId: "court-a",
    name: "Kurt 1",
    indoor: null,
    surface: null,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  const runRow: ScrapeRunRow = {
    id: "run-db-id",
    clubId: clubRow.id,
    providerId: providerRow.id,
    startedAt: now,
    completedAt: null,
    status: "running",
    durationMs: null,
    recordsReceived: 0,
    recordsChanged: 0,
    errorCode: null,
    errorMessage: null,
    attempt: 1,
    metadata: {},
    createdAt: now,
    updatedAt: now
  };
  const harness: ReturnType<typeof repositoryHarness> = {
    repository: undefined as unknown as AvailabilityIndexRepository,
    finishedStatuses: [],
    finishedErrorCodes: []
  };
  harness.repository = {
    upsertBookingProvider: async () => providerRow,
    upsertClub: async () => clubRow,
    upsertCourt: async () => courtRow,
    upsertAvailabilitySlots: async () => [],
    reconcileAvailabilitySlots: async (input) => {
      harness.reconciliation = input;
      return { recordsReceived: input.slots.length, recordsChanged: input.slots.length, slots: [] };
    },
    startScrapeRun: async () => runRow,
    finishScrapeRun: async (_id, input) => {
      harness.finishedStatuses.push(input.status);
      harness.finishedErrorCodes.push(input.errorCode);
      return {
        ...runRow,
        status: input.status,
        completedAt: now,
        recordsReceived: input.recordsReceived,
        recordsChanged: input.recordsChanged,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null
      };
    },
    upsertScrapeTarget: async (): Promise<ScrapeTargetRow> => {
      throw new Error("not used by scrape service");
    }
  };
  return harness;
}
