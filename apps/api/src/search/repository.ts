import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { availabilitySlots, bookingProviders, clubs, courts } from "../db/schema.js";
import type { IndexedAvailabilitySegment, SearchQuery } from "./types.js";

export interface SearchRepository {
  findAvailableSegments(query: SearchQuery): Promise<IndexedAvailabilitySegment[]>;
}

export class DrizzleSearchRepository implements SearchRepository {
  constructor(private readonly db: Database) {}

  async findAvailableSegments(query: SearchQuery): Promise<IndexedAvailabilitySegment[]> {
    const windowStartsAt = sql<Date>`((${query.date}::date + ${query.from}::time) at time zone ${clubs.timezone})`;
    const windowEndsAt = query.to === "24:00"
      ? sql<Date>`(((${query.date}::date + 1)::timestamp) at time zone ${clubs.timezone})`
      : sql<Date>`((${query.date}::date + ${query.to}::time) at time zone ${clubs.timezone})`;
    const clubMinBookingMinutes = sql<number | null>`nullif(${clubs.providerConfig} ->> 'minBookingMinutes', '')::integer`;
    const filters = [
      eq(bookingProviders.active, true),
      eq(clubs.active, true),
      eq(courts.active, true),
      eq(availabilitySlots.available, true),
      sql`${availabilitySlots.startsAt} >= ${windowStartsAt}`,
      lte(availabilitySlots.endsAt, windowEndsAt)
    ];

    if (query.clubSlugs && query.clubSlugs.length > 0) {
      filters.push(inArray(clubs.slug, query.clubSlugs));
    }
    if (query.indoor !== undefined) {
      filters.push(eq(courts.indoor, query.indoor));
    }

    return this.db
      .select({
        id: availabilitySlots.id,
        clubId: clubs.id,
        clubSlug: clubs.slug,
        clubName: clubs.name,
        clubTimezone: clubs.timezone,
        clubBookingUrl: clubs.bookingUrl,
        clubMinBookingMinutes,
        courtId: courts.id,
        courtName: courts.name,
        indoor: courts.indoor,
        surface: courts.surface,
        startsAt: availabilitySlots.startsAt,
        endsAt: availabilitySlots.endsAt,
        available: availabilitySlots.available,
        price: availabilitySlots.price,
        currency: availabilitySlots.currency,
        bookingUrl: availabilitySlots.bookingUrl,
        fetchedAt: availabilitySlots.fetchedAt,
        windowStartsAt,
        windowEndsAt
      })
      .from(availabilitySlots)
      .innerJoin(
        courts,
        and(eq(courts.id, availabilitySlots.courtId), eq(courts.clubId, availabilitySlots.clubId))
      )
      .innerJoin(clubs, eq(clubs.id, availabilitySlots.clubId))
      .innerJoin(bookingProviders, eq(bookingProviders.id, clubs.providerId))
      .where(and(...filters))
      .orderBy(asc(availabilitySlots.startsAt), asc(clubs.slug), asc(courts.name), asc(availabilitySlots.endsAt));
  }
}
