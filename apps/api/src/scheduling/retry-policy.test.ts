import { AvailabilityProviderError } from "@mamekurt/scrapers";
import { describe, expect, it } from "vitest";
import { isRetryableScrapeError } from "./retry-policy.js";

describe("isRetryableScrapeError", () => {
  it("does not retry permanent provider failures", () => {
    expect(isRetryableScrapeError(providerError(false))).toBe(false);
  });

  it("retries transient provider and unknown failures", () => {
    expect(isRetryableScrapeError(providerError(true))).toBe(true);
    expect(isRetryableScrapeError(new Error("database connection dropped"))).toBe(true);
  });
});

function providerError(retryable: boolean): AvailabilityProviderError {
  return new AvailabilityProviderError({
    code: retryable ? "network_error" : "authentication_error",
    message: "provider failed",
    providerId: "test-provider",
    retryable
  });
}
