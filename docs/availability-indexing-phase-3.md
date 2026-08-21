# Availability indexing — Phase 3

## Scope

Phase 3 introduces Supabase/PostgreSQL persistence while leaving the existing live-scraping API and web UI unchanged. The database layer is deliberately not wired into request handling yet; Phase 4 can add the first end-to-end indexed provider without changing the provider contracts from Phase 2.

## Data model

- `booking_providers`: provider identity and activation state.
- `clubs`: normalized club metadata plus provider-specific external ID/configuration.
- `courts`: provider court identity scoped to a club.
- `availability_slots`: idempotent court/time availability snapshots and booking metadata.
- `scrape_runs`: per-club execution status, counts, duration, and diagnostics.
- `scrape_targets`: refresh schedule, priority, attempts, and worker lock ownership.

The schema uses UUID keys, timestamp-with-time-zone values, foreign keys, uniqueness constraints, validation checks, and query-oriented indexes. A composite court/club foreign key prevents storing a slot against a court owned by another club. Row-level security is enabled on every application table with no browser-facing policies.

## Application boundary

`AvailabilityIndexRepository` is the storage contract. `DrizzleAvailabilityIndexRepository` implements idempotent upserts for providers, clubs, courts, slots, and targets, plus scrape-run lifecycle writes. Database connection creation is explicit and lazy so adding the module does not alter the deployed API until Phase 4 opts into it.

## Migration workflow

Drizzle schema and generated SQL live under `apps/api/src/db` and `apps/api/drizzle`. Supabase MCP applies the same checked-in SQL to the connected project and records the matching Drizzle migration hash, so future `drizzle-kit migrate` runs do not repeat it.

## Operations

Render should use the Supabase Session pooler URL as `DATABASE_URL`. Schema migrations should prefer the direct database URL when the runner supports IPv6; otherwise use the Session pooler URL. Do not use the transaction pooler for a long-running Render service.

The repository integration test requires an explicit disposable `TEST_DATABASE_URL` and is skipped by default. This avoids inserting test rows into production or a shared development project.
