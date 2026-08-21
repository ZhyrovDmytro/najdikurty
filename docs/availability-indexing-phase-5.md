# Availability indexing — Phase 5

## Scope

Phase 5 adds a database-only search path while preserving the existing live-scraping endpoint and frontend behavior.

```text
GET /api/search
→ SearchService
→ DrizzleSearchRepository
→ Supabase/PostgreSQL
→ provider-independent duration matching
→ normalized search results
```

No external booking provider is contacted by `GET /api/search`.

## API

Example:

```text
GET /api/search?date=2026-08-22&from=17:00&to=21:00&duration=90&clubs=padel-club-spoje
```

Inputs:

- `date`: required club-local calendar date;
- `from`: local earliest start, default `00:00`;
- `to`: local latest end, default `24:00`;
- `duration`: requested minutes, default `60`;
- `clubs`: optional comma-separated club slugs;
- `indoor`: optional `true` or `false`.

Results include normalized club and court identity, UTC start/end instants, duration, price, currency, booking URL, `lastCheckedAt`, and centralized freshness state. Invalid dates, windows, or durations return HTTP 400.

## Duration matching

The provider-independent algorithm groups rows by court, deduplicates identical records, and finds exact requested durations through directly bookable intervals or strictly adjacent segments. It never bridges gaps, combines courts, or treats overlapping alternatives as adjacent segments. Equivalent booking windows are returned once.

Freshness is calculated centrally from the oldest contributing segment:

- up to 10 minutes: `fresh`;
- up to 30 minutes: `acceptable`;
- older: `stale`;
- missing/invalid timestamp: `unknown`.

## Legacy comparison

Representative comparison for Padel Club Spoje on `2026-08-22` matched the live provider coverage exactly:

- Kurt 1: `09:00–13:30` and `15:00–20:00`;
- Kurt 2: `09:00–13:00` and `14:00–20:00`.

For a `09:00–20:00`, 90-minute database search, the duration algorithm returned 25 concrete provider-bookable options: 12 on Kurt 1 and 13 on Kurt 2.

## Query performance

`EXPLAIN (ANALYZE, BUFFERS)` on the connected Supabase project used `clubs_slug_unique` followed by `availability_slots_club_starts_idx`. With the current 75-row representative data set:

- planning time: 1.588 ms;
- database execution time: 0.757 ms;
- rows read into duration matching: 75;
- disk reads: 0; all buffers were cache hits.

These numbers are an initial small-data baseline, not a production load benchmark.

## Recorded scheduler requirement

Background scheduling remains Phase 7. The requested operating policy is configurable refreshes a few times per hour (initially approximately 2–4) during selected `Europe/Prague` operating hours, rather than continuous overnight scraping. The future refresh policy must still allow higher frequency near high-demand dates or times without coupling scraping to user requests.

## Compatibility

`GET /api/availability` and the frontend remain unchanged. Phase 5 introduces no database migration. Switching production search is intentionally deferred.
