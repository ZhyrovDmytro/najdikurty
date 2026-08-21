import { z } from "zod";
import { dateKeyInTimezone, localDateRange } from "../../domain/timezone.js";
import {
  AvailabilityProviderError,
  type AvailabilityProvider,
  type FetchAvailabilityInput,
  type ProviderAvailabilityResult,
  type ProviderErrorCode
} from "../provider.js";
import { parsePlaytomicProviderAvailability } from "./parser.js";

const providerConfigSchema = z.object({
  resourceIds: z.array(z.string()).min(1),
  sport: z.string().default("padel"),
  tenantId: z.string().min(1)
});

export interface PlaytomicProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class PlaytomicAvailabilityProvider implements AvailabilityProvider {
  readonly id = "playtomic";
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PlaytomicProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://playtomic.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchAvailability(input: FetchAvailabilityInput): Promise<ProviderAvailabilityResult> {
    if (input.club.providerId !== this.id) {
      throw this.error(input, "configuration_error", false, `Club ${input.club.id} is not configured for ${this.id}`);
    }

    const parsedConfig = providerConfigSchema.safeParse(input.club.providerConfig);
    if (!parsedConfig.success) {
      throw this.error(input, "configuration_error", false, `Invalid Playtomic configuration for ${input.club.id}`, parsedConfig.error);
    }

    let date: string;
    try {
      date = dateKeyInTimezone(input.from, input.club.timezone);
      const expectedRange = localDateRange(date, input.club.timezone);
      if (input.from.getTime() !== expectedRange.from.getTime() || input.to.getTime() !== expectedRange.to.getTime()) {
        throw new Error("range does not match local calendar-day boundaries");
      }
    } catch (error) {
      throw this.error(
        input,
        "configuration_error",
        false,
        "Playtomic provider requires one complete club-local calendar day per request",
        error
      );
    }

    const url = new URL("/api/clubs/availability", this.baseUrl);
    url.searchParams.set("tenant_id", parsedConfig.data.tenantId);
    url.searchParams.set("date", date);
    url.searchParams.set("sport_id", parsedConfig.data.sport.toUpperCase());

    try {
      const response = await this.fetchImpl(url, { signal: input.signal });
      if (!response.ok) {
        throw responseError(response, url.toString(), input, this.id);
      }

      const payload = await response.json();
      return parsePlaytomicProviderAvailability(payload, {
        club: input.club,
        fetchedAt: new Date(),
        resourceIds: parsedConfig.data.resourceIds,
        sourceUrl: response.url || url.toString()
      });
    } catch (error) {
      if (error instanceof AvailabilityProviderError) throw error;

      if (input.signal?.aborted) {
        throw this.error(input, "timeout", true, `Playtomic request aborted for ${input.club.id}`, error);
      }
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        throw this.error(input, "parse_error", false, `Invalid Playtomic response for ${input.club.id}`, error);
      }
      if (error instanceof TypeError) {
        throw this.error(input, "network_error", true, `Playtomic network request failed for ${input.club.id}`, error);
      }

      throw this.error(input, "unknown", false, `Unexpected Playtomic failure for ${input.club.id}`, error);
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

function responseError(
  response: Response,
  url: string,
  input: FetchAvailabilityInput,
  providerId: string
): AvailabilityProviderError {
  const code: ProviderErrorCode = response.status === 429
    ? "rate_limited"
    : response.status === 401 || response.status === 403
      ? "authentication_error"
      : "provider_error";
  const retryable = response.status === 429 || response.status >= 500;

  return new AvailabilityProviderError({
    message: `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    code,
    retryable,
    providerId,
    clubId: input.club.id
  });
}
