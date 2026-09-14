import { AvailabilityProviderError } from "@mamekurt/scrapers";

export function isRetryableScrapeError(error: unknown): boolean {
  return !(error instanceof AvailabilityProviderError) || error.retryable;
}
