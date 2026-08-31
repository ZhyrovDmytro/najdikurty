import { z } from "zod";
import { dateKeyInTimezone, localDateRange, localDateTimeInstant } from "../domain/timezone.js";
import type { Club, Court, NormalizedAvailabilitySlot } from "../domain/models.js";
import type { AvailabilityResult, CourtAvailability, TimeRange } from "../types.js";
import {
  AvailabilityProviderError,
  type AvailabilityProvider,
  type FetchAvailabilityInput,
  type ProviderAvailabilityResult,
  type ProviderErrorCode
} from "./provider.js";

export interface LegacyProviderFetchInput extends FetchAvailabilityInput {
  date: string;
}

export interface LegacyAvailabilityProviderOptions {
  id: string;
  fetchLegacy: (input: LegacyProviderFetchInput) => Promise<AvailabilityResult>;
}

export class LegacyAvailabilityProviderAdapter implements AvailabilityProvider {
  readonly id: string;
  private readonly fetchLegacy: LegacyAvailabilityProviderOptions["fetchLegacy"];

  constructor(options: LegacyAvailabilityProviderOptions) {
    this.id = options.id;
    this.fetchLegacy = options.fetchLegacy;
  }

  async fetchAvailability(input: FetchAvailabilityInput): Promise<ProviderAvailabilityResult> {
    if (input.club.providerId !== this.id) {
      throw this.error(input, "configuration_error", false, `Club ${input.club.id} is not configured for ${this.id}`);
    }

    let date: string;
    try {
      date = dateKeyInTimezone(input.from, input.club.timezone);
      const expected = localDateRange(date, input.club.timezone);
      if (expected.from.getTime() !== input.from.getTime() || expected.to.getTime() !== input.to.getTime()) {
        throw new Error("range does not match a complete club-local day");
      }
    } catch (error) {
      throw this.error(input, "configuration_error", false, "Legacy adapter requires one complete club-local day", error);
    }

    try {
      const result = await this.fetchLegacy({ ...input, date });
      if (result.clubSlug !== input.club.slug || result.date !== date) {
        throw new SyntaxError("Provider returned unexpected club or date");
      }
      return normalizeLegacyAvailability(result, input.club, this.id);
    } catch (error) {
      if (error instanceof AvailabilityProviderError) throw error;
      if (input.signal?.aborted) {
        throw this.error(input, "timeout", true, `${this.id} request aborted for ${input.club.id}`, error);
      }
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        throw this.error(input, "parse_error", false, `Invalid ${this.id} response for ${input.club.id}`, error);
      }
      if (error instanceof TypeError) {
        throw this.error(input, "network_error", true, `${this.id} network request failed for ${input.club.id}`, error);
      }
      throw this.error(input, "provider_error", false, `${this.id} failed for ${input.club.id}: ${errorMessage(error)}`, error);
    }
  }

  private error(
    input: FetchAvailabilityInput,
    code: ProviderErrorCode,
    retryable: boolean,
    message: string,
    cause?: unknown
  ): AvailabilityProviderError {
    return new AvailabilityProviderError({
      message,
      code,
      retryable,
      providerId: this.id,
      clubId: input.club.id,
      cause
    });
  }
}

export function normalizeLegacyAvailability(
  result: AvailabilityResult,
  club: Club,
  providerId: string
): ProviderAvailabilityResult {
  const fetchedAt = new Date(result.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) throw new SyntaxError(`Invalid fetchedAt: ${result.fetchedAt}`);

  const durationCourts = result.durationAvailability ? Object.values(result.durationAvailability).flat() : [];
  const courtNames = [...new Set([...result.courts, ...durationCourts].map((court) => court.court))];
  const indoor = typeof club.providerConfig.courtIndoor === "boolean" ? club.providerConfig.courtIndoor : null;
  const courts = courtNames.map((name): Court => ({
    id: `${club.id}:${stableExternalId(name)}`,
    clubId: club.id,
    externalId: stableExternalId(name),
    name,
    indoor,
    active: true
  }));
  const courtByName = new Map(courts.map((court) => [court.name, court]));
  const slots = result.durationAvailability
    ? exactDurationSlots(result.durationAvailability, courtByName, club, fetchedAt)
    : atomicCoverageSlots(result.courts, result.slotStepMinutes, courtByName, club, fetchedAt, result.date);

  return {
    providerId,
    club,
    courts,
    slots: deduplicateSlots(slots),
    fetchedAt,
    sourceUrl: result.sourceUrl,
    complete: true
  };
}

function exactDurationSlots(
  durationAvailability: Record<string, CourtAvailability[]>,
  courtByName: ReadonlyMap<string, Court>,
  club: Club,
  fetchedAt: Date
): NormalizedAvailabilitySlot[] {
  return Object.values(durationAvailability).flatMap((courtAvailabilities) =>
    courtAvailabilities.flatMap((availability) =>
      availability.freeSlots.map((range) =>
        slotFromRange(range, availability.date, courtByName, availability.court, club, fetchedAt)
      )
    )
  );
}

function atomicCoverageSlots(
  courtAvailabilities: CourtAvailability[],
  stepMinutes: number,
  courtByName: ReadonlyMap<string, Court>,
  club: Club,
  fetchedAt: Date,
  date: string
): NormalizedAvailabilitySlot[] {
  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) throw new SyntaxError(`Invalid slot step: ${stepMinutes}`);

  return courtAvailabilities.flatMap((availability) =>
    availability.freeSlots.flatMap((range) => {
      const rangeStart = timeMinutes(range.start);
      const rangeEnd = timeMinutes(range.end);
      const slots: NormalizedAvailabilitySlot[] = [];
      for (let cursor = rangeStart; cursor + stepMinutes <= rangeEnd; cursor += stepMinutes) {
        slots.push(slotFromRange(
          { start: minuteTime(cursor), end: minuteTime(cursor + stepMinutes) },
          date,
          courtByName,
          availability.court,
          club,
          fetchedAt,
          availability.slotPrices?.[minuteTime(cursor)] ?? null,
          availability.currency ?? null
        ));
      }
      return slots;
    })
  );
}

function slotFromRange(
  range: TimeRange,
  date: string,
  courtByName: ReadonlyMap<string, Court>,
  courtName: string,
  club: Club,
  fetchedAt: Date,
  price: number | null = null,
  currency: string | null = null
): NormalizedAvailabilitySlot {
  const court = courtByName.get(courtName);
  if (!court) throw new SyntaxError(`Availability references unknown court ${courtName}`);
  return {
    clubId: club.id,
    courtId: court.id,
    startsAt: localDateTimeInstant(date, range.start, club.timezone),
    endsAt: localDateTimeInstant(date, range.end, club.timezone),
    available: true,
    price,
    currency,
    bookingUrl: club.bookingUrl,
    fetchedAt
  };
}

function deduplicateSlots(slots: NormalizedAvailabilitySlot[]): NormalizedAvailabilitySlot[] {
  return [...new Map(slots.map((slot) => [
    [slot.clubId, slot.courtId, slot.startsAt.toISOString(), slot.endsAt.toISOString()].join("|"),
    slot
  ])).values()];
}

function stableExternalId(name: string): string {
  const value = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!value) throw new SyntaxError(`Cannot derive court ID from ${name}`);
  return value;
}

function timeMinutes(value: string): number {
  if (value === "24:00") return 24 * 60;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new SyntaxError(`Invalid time: ${value}`);
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minuteTime(total: number): string {
  if (total === 24 * 60) return "24:00";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unexpected error";
}
