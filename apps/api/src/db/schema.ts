import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
};

export const scrapeRunStatus = pgEnum("scrape_run_status", ["running", "success", "partial", "failed"]);
export const scrapeTargetStatus = pgEnum("scrape_target_status", ["pending", "running", "failed", "paused"]);

export const bookingProviders = pgTable(
  "booking_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps
  },
  (table) => [uniqueIndex("booking_providers_key_unique").on(table.key)]
).enableRLS();

export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    providerId: uuid("provider_id").notNull().references(() => bookingProviders.id),
    providerExternalId: text("provider_external_id"),
    providerConfig: jsonb("provider_config").$type<Record<string, unknown>>().notNull().default({}),
    bookingUrl: text("booking_url").notNull(),
    address: text("address"),
    latitude: numeric("latitude", { precision: 9, scale: 6, mode: "number" }),
    longitude: numeric("longitude", { precision: 9, scale: 6, mode: "number" }),
    timezone: text("timezone").notNull().default("Europe/Prague"),
    active: boolean("active").notNull().default(true),
    ...timestamps
  },
  (table) => [
    uniqueIndex("clubs_slug_unique").on(table.slug),
    uniqueIndex("clubs_provider_external_id_unique")
      .on(table.providerId, table.providerExternalId)
      .where(sql`${table.providerExternalId} is not null`),
    index("clubs_provider_id_idx").on(table.providerId),
    check("clubs_latitude_range_check", sql`${table.latitude} is null or ${table.latitude} between -90 and 90`),
    check("clubs_longitude_range_check", sql`${table.longitude} is null or ${table.longitude} between -180 and 180`)
  ]
).enableRLS();

export const courts = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    indoor: boolean("indoor"),
    surface: text("surface"),
    active: boolean("active").notNull().default(true),
    ...timestamps
  },
  (table) => [
    uniqueIndex("courts_club_external_id_unique").on(table.clubId, table.externalId),
    uniqueIndex("courts_id_club_id_unique").on(table.id, table.clubId),
    index("courts_club_id_idx").on(table.clubId)
  ]
).enableRLS();

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    courtId: uuid("court_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    available: boolean("available").notNull(),
    price: numeric("price", { precision: 10, scale: 2, mode: "number" }),
    currency: text("currency"),
    bookingUrl: text("booking_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull(),
    sourceHash: text("source_hash"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("availability_slots_identity_unique").on(table.clubId, table.courtId, table.startsAt, table.endsAt),
    foreignKey({
      columns: [table.courtId, table.clubId],
      foreignColumns: [courts.id, courts.clubId],
      name: "availability_slots_court_club_fk"
    }).onDelete("cascade"),
    index("availability_slots_starts_available_idx").on(table.startsAt, table.available),
    index("availability_slots_club_starts_idx").on(table.clubId, table.startsAt),
    index("availability_slots_court_club_idx").on(table.courtId, table.clubId),
    index("availability_slots_fetched_at_idx").on(table.fetchedAt),
    check("availability_slots_positive_duration_check", sql`${table.endsAt} > ${table.startsAt}`),
    check("availability_slots_nonnegative_price_check", sql`${table.price} is null or ${table.price} >= 0`),
    check("availability_slots_currency_check", sql`${table.currency} is null or ${table.currency} ~ '^[A-Z]{3}$'`)
  ]
).enableRLS();

export const scrapeRuns = pgTable(
  "scrape_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id").notNull().references(() => bookingProviders.id),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    status: scrapeRunStatus("status").notNull().default("running"),
    durationMs: integer("duration_ms"),
    recordsReceived: integer("records_received").notNull().default(0),
    recordsChanged: integer("records_changed").notNull().default(0),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attempt: integer("attempt").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => [
    index("scrape_runs_club_started_idx").on(table.clubId, table.startedAt),
    index("scrape_runs_provider_started_idx").on(table.providerId, table.startedAt),
    index("scrape_runs_status_started_idx").on(table.status, table.startedAt),
    check("scrape_runs_duration_check", sql`${table.durationMs} is null or ${table.durationMs} >= 0`),
    check("scrape_runs_records_received_check", sql`${table.recordsReceived} >= 0`),
    check("scrape_runs_records_changed_check", sql`${table.recordsChanged} >= 0`),
    check("scrape_runs_attempt_check", sql`${table.attempt} >= 1`),
    check("scrape_runs_completion_check", sql`${table.completedAt} is null or ${table.completedAt} >= ${table.startedAt}`)
  ]
).enableRLS();

export const scrapeTargets = pgTable(
  "scrape_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    priority: integer("priority").notNull().default(0),
    nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true, mode: "date" }).notNull(),
    lastRefreshAt: timestamp("last_refresh_at", { withTimezone: true, mode: "date" }),
    status: scrapeTargetStatus("status").notNull().default("pending"),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    lockedBy: text("locked_by"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("scrape_targets_club_date_unique").on(table.clubId, table.targetDate),
    index("scrape_targets_due_idx").on(table.status, table.nextRefreshAt, table.priority),
    index("scrape_targets_locked_at_idx").on(table.lockedAt),
    check("scrape_targets_attempt_count_check", sql`${table.attemptCount} >= 0`),
    check(
      "scrape_targets_lock_pair_check",
      sql`(${table.lockedAt} is null and ${table.lockedBy} is null) or (${table.lockedAt} is not null and ${table.lockedBy} is not null)`
    )
  ]
).enableRLS();

export const bookingProvidersRelations = relations(bookingProviders, ({ many }) => ({
  clubs: many(clubs),
  scrapeRuns: many(scrapeRuns)
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  provider: one(bookingProviders, { fields: [clubs.providerId], references: [bookingProviders.id] }),
  courts: many(courts),
  availabilitySlots: many(availabilitySlots),
  scrapeRuns: many(scrapeRuns),
  scrapeTargets: many(scrapeTargets)
}));

export const courtsRelations = relations(courts, ({ one, many }) => ({
  club: one(clubs, { fields: [courts.clubId], references: [clubs.id] }),
  availabilitySlots: many(availabilitySlots)
}));

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  club: one(clubs, { fields: [availabilitySlots.clubId], references: [clubs.id] }),
  court: one(courts, { fields: [availabilitySlots.courtId], references: [courts.id] })
}));

export const scrapeRunsRelations = relations(scrapeRuns, ({ one }) => ({
  club: one(clubs, { fields: [scrapeRuns.clubId], references: [clubs.id] }),
  provider: one(bookingProviders, { fields: [scrapeRuns.providerId], references: [bookingProviders.id] })
}));

export const scrapeTargetsRelations = relations(scrapeTargets, ({ one }) => ({
  club: one(clubs, { fields: [scrapeTargets.clubId], references: [clubs.id] })
}));

export type BookingProviderRow = typeof bookingProviders.$inferSelect;
export type ClubRow = typeof clubs.$inferSelect;
export type CourtRow = typeof courts.$inferSelect;
export type AvailabilitySlotRow = typeof availabilitySlots.$inferSelect;
export type ScrapeRunRow = typeof scrapeRuns.$inferSelect;
export type ScrapeTargetRow = typeof scrapeTargets.$inferSelect;
