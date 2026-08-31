export type CourtStatus = "free" | "occupied" | "lesson" | "closed";

export interface TimeRange {
  start: string;
  end: string;
}

export interface CourtBlock extends TimeRange {
  status: Exclude<CourtStatus, "free">;
  label?: string;
}

export interface CourtAvailability {
  provider: string;
  clubSlug: string;
  sport: string;
  date: string;
  court: string;
  blocks: CourtBlock[];
  freeSlots: TimeRange[];
  slotPrices?: Record<string, number>;
  currency?: string;
}

export interface AvailabilityResult {
  fetchedAt: string;
  sourceUrl: string;
  date: string;
  dayRange: TimeRange;
  slotStepMinutes: number;
  minBookingMinutes?: number;
  durationAvailability?: Record<string, CourtAvailability[]>;
  clubSlug: string;
  sport: string;
  courts: CourtAvailability[];
}
