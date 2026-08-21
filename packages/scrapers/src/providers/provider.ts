import type { Club, Court, NormalizedAvailabilitySlot } from "../domain/models.js";

export type ProviderErrorCode =
  | "network_error"
  | "timeout"
  | "authentication_error"
  | "parse_error"
  | "rate_limited"
  | "provider_error"
  | "configuration_error"
  | "unknown";

export interface ProviderAvailabilityResult {
  providerId: string;
  club: Club;
  courts: Court[];
  slots: NormalizedAvailabilitySlot[];
  fetchedAt: Date;
  sourceUrl: string;
  complete: boolean;
}

export interface FetchAvailabilityInput {
  club: Club;
  from: Date;
  to: Date;
  signal?: AbortSignal;
}

export interface AvailabilityProvider {
  readonly id: string;
  fetchAvailability(input: FetchAvailabilityInput): Promise<ProviderAvailabilityResult>;
}

export class AvailabilityProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly providerId: string;
  readonly clubId?: string;

  constructor(options: {
    message: string;
    code: ProviderErrorCode;
    retryable: boolean;
    providerId: string;
    clubId?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AvailabilityProviderError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.providerId = options.providerId;
    this.clubId = options.clubId;
  }
}
