import { performance } from "node:perf_hooks";
import { findContiguousAvailability } from "./contiguous-slots.js";
import { FreshnessService } from "./freshness.js";
import type { SearchRepository } from "./repository.js";
import type { ContiguousAvailabilityWindow, SearchQuery, SearchResponse, SearchResult } from "./types.js";

export class SearchService {
  constructor(
    private readonly repository: SearchRepository,
    private readonly freshnessService = new FreshnessService(),
    private readonly now: () => Date = () => new Date()
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startedAt = performance.now();
    const segments = await this.repository.findAvailableSegments(query);
    const queryDurationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const windows = findContiguousAvailability(segments, query.durationMinutes);
    const searchedAt = this.now();

    return {
      query,
      results: windows.map((window) => this.toSearchResult(window, searchedAt)),
      searchedAt: searchedAt.toISOString(),
      queryDurationMs
    };
  }

  private toSearchResult(window: ContiguousAvailabilityWindow, searchedAt: Date): SearchResult {
    const first = window.segments[0]!;
    const lastCheckedAt = new Date(Math.min(...window.segments.map((segment) => segment.fetchedAt.getTime())));
    const currencies = new Set(window.segments.map((segment) => segment.currency).filter((value) => value !== null));
    const hasCompletePricing = window.segments.every((segment) => segment.price !== null) && currencies.size === 1;

    return {
      club: {
        id: first.clubId,
        slug: first.clubSlug,
        name: first.clubName,
        timezone: first.clubTimezone
      },
      court: {
        id: first.courtId,
        name: first.courtName,
        indoor: first.indoor,
        surface: first.surface
      },
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      durationMinutes: (window.endsAt.getTime() - window.startsAt.getTime()) / 60_000,
      price: hasCompletePricing
        ? window.segments.reduce((total, segment) => total + (segment.price ?? 0), 0)
        : null,
      currency: hasCompletePricing ? [...currencies][0] ?? null : null,
      bookingUrl: window.segments.find((segment) => segment.bookingUrl)?.bookingUrl ?? first.clubBookingUrl,
      lastCheckedAt: lastCheckedAt.toISOString(),
      freshness: this.freshnessService.evaluate(lastCheckedAt, searchedAt)
    };
  }
}
