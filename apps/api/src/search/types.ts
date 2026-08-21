export type Freshness = "fresh" | "acceptable" | "stale" | "unknown";

export interface SearchQuery {
  date: string;
  from: string;
  to: string;
  durationMinutes: number;
  clubSlugs?: string[];
  indoor?: boolean;
}

export interface IndexedAvailabilitySegment {
  id: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubTimezone: string;
  clubBookingUrl: string;
  clubMinBookingMinutes: number | null;
  courtId: string;
  courtName: string;
  indoor: boolean | null;
  surface: string | null;
  startsAt: Date;
  endsAt: Date;
  available: boolean;
  price: number | null;
  currency: string | null;
  bookingUrl: string | null;
  fetchedAt: Date;
  windowStartsAt: Date;
  windowEndsAt: Date;
}

export interface ContiguousAvailabilityWindow {
  startsAt: Date;
  endsAt: Date;
  segments: IndexedAvailabilitySegment[];
}

export interface SearchResult {
  club: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
  };
  court: {
    id: string;
    name: string;
    indoor: boolean | null;
    surface: string | null;
  };
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  price: number | null;
  currency: string | null;
  bookingUrl: string;
  lastCheckedAt: string;
  freshness: Freshness;
}

export interface SearchResponse {
  query: SearchQuery;
  results: SearchResult[];
  searchedAt: string;
  queryDurationMs: number;
}
