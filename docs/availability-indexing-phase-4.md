# Availability indexing — Phase 4

## Scope

Phase 4 connects Playtomic as the first complete indexing pipeline:

```text
Playtomic availability API
→ PlaytomicAvailabilityProvider
→ normalized courts and slots
→ AvailabilityScrapeService
→ DrizzleAvailabilityIndexRepository
→ Supabase/PostgreSQL
```

The existing live-scraping API and frontend are unchanged. Database-backed user search begins only in Phase 5.

## Club configuration

Playtomic remains a provider-level adapter. `createPlaytomicClub` supplies configuration for both existing Playtomic clubs:

- `padel-club-spoje`
- `tenis-a-padel-klub-pisecna`

Tenant and resource identifiers remain club configuration; no club-specific scraper was added.

## Persistence and reconciliation

Each execution upserts the provider, club, and courts, starts a `scrape_runs` row, retrieves normalized provider availability, and reconciles availability by the database identity `(club_id, court_id, starts_at, ends_at)`.

- Duplicate provider records are deduplicated before a PostgreSQL upsert.
- Returned rows refresh `fetched_at` and update current price, availability, URL, and state hash.
- When the provider declares a response complete, previously known slots missing from that club/day/court response are marked unavailable rather than deleted.
- When a response is incomplete, missing database rows are left unchanged.
- Provider failures complete the scrape run as `failed`, preserving error code and retryability metadata.

## Manual operation

With `DATABASE_URL` configured:

```bash
npm run build -w @mamekurt/scrapers
npm run scrape -w @mamekurt/api -- --club=padel-club-spoje --date=2026-08-22
```

The command supports `--timeout=<milliseconds>`. It exits non-zero on retrieval, configuration, or persistence failure and prints a JSON execution summary on success.

## Verification

The live Playtomic adapter was verified for Padel Club Spoje on `2026-08-22`. The connected Supabase project contains:

- one Playtomic provider;
- one indexed club;
- two courts;
- 75 current availability rows with CZK prices, booking URLs, and source hashes;
- one successful scrape run recording 75 received and 75 changed rows.

No Phase 4 schema migration was required.
