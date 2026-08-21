# Availability indexing: Phase 2 domain and provider abstraction

Date: 2026-08-21

## Scope and outcome

Phase 2 introduces provider-independent domain contracts and converts Playtomic as the first vertical slice. The existing Express endpoint and frontend payload remain unchanged. No database, migration, worker, scheduler, deployment, or UI work is included.

## Architecture changes

The scraper package now exposes:

- normalized `Club`, `Court`, and `NormalizedAvailabilitySlot` domain models;
- an `AvailabilityProvider` interface accepting a club and timezone-aware `from`/`to` range;
- a `ProviderAvailabilityResult` containing normalized courts and timestamped slots;
- classified `AvailabilityProviderError` values with retryability metadata;
- central timezone helpers for local calendar-day ranges and local date/time formatting.

Playtomic now follows this flow:

```text
Playtomic JSON endpoint
  -> PlaytomicAvailabilityProvider
  -> Zod response validation
  -> normalized Club/Court/AvailabilitySlot records
  -> legacy Playtomic compatibility adapter
  -> existing AvailabilityResult
  -> unchanged Express API and frontend
```

The normalized Playtomic records include:

- stable club and court identifiers;
- provider external court IDs;
- UTC `Date` start/end/fetch timestamps;
- availability state;
- parsed price and currency when present;
- the authoritative club booking URL.

The provider currently accepts exactly one club-local calendar day per call. That matches the existing API and keeps scheduling granularity explicit for future scrape targets.

## Error contract

The common error taxonomy supports:

- `network_error`;
- `timeout`;
- `authentication_error`;
- `parse_error`;
- `rate_limited`;
- `provider_error`;
- `configuration_error`;
- `unknown`.

Playtomic classifies malformed payloads as non-retryable parse failures, network/abort failures as retryable, rate limits and server errors as retryable, and configuration/authentication failures as non-retryable.

## Compatibility

- `fetchPlaytomicAvailability` retains its existing signature and return shape.
- Court ordering remains driven by configured Playtomic resource IDs.
- Court names remain `Kurt 1`, `Kurt 2`, and so on.
- Overlapping Playtomic duration offers are still merged into the same legacy free intervals.
- The API route requires no changes.
- The frontend requires no changes.
- Both currently configured Playtomic clubs continue to share one provider implementation.

## Tests added

- Normalized Playtomic provider mapping, stable court IDs, UTC timestamps, price/currency, request parameters, and booking URL.
- Playtomic parse-error classification.
- End-to-end Playtomic client compatibility through the new provider and legacy adapter.
- Prague standard-time and summer-time date boundaries.
- Prague 23-hour spring DST day and 25-hour autumn DST day.
- Invalid local calendar-date rejection.

Existing Playtomic parser tests continue to verify the legacy result shape.

## Phase 2 completion record

- Runtime architecture changes: provider/domain abstraction inside `@mamekurt/scrapers` only.
- UI changes: none.
- API contract changes: none.
- Migrations created: none.
- Infrastructure added: none.
- Commands executed: scraper tests/build during implementation, followed by root `npm test`, root `npm run build`, `git diff --check`, and `git status --short`.
- Outstanding risks:
  - only Playtomic implements the new interface;
  - Playtomic exposes overlapping duration offers as normalized records, which is faithful to the provider but will require deliberate persistence/reconciliation semantics in Phase 4;
  - the normalized models are compile-time TypeScript contracts; database constraints and runtime persistence validation belong to Phase 3;
  - provider configuration still originates in the existing Playtomic client configuration until club records are introduced in the database.
- Recommended next step: Phase 3, adding Supabase/PostgreSQL persistence and migrations using Drizzle while keeping production reads on the legacy endpoint.
