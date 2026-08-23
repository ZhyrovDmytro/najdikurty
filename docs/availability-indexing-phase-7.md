# Availability indexing — Phase 7

Phase 7 adds a database-backed scheduler and worker without changing the existing search architecture.

## Refresh policy

- Timezone: `Europe/Prague`
- Active window: 08:00–22:00 inclusive
- Today through 7 days ahead: every 20 minutes from 08:00 through 22:00
- A target is paused after its target date's final run; a manual request can still reactivate it.
- Default target horizon: today through 7 days ahead (8 calendar dates) for every enabled catalog club.
- Targets outside the configured horizon are paused and are not claimed by the worker.
- Manual refreshes can be queued at any time, including outside the active window.

The scheduler uses local Prague wall-clock times, so UTC execution times move correctly when daylight saving time changes.

## Safety and failure handling

- Due targets are claimed transactionally with PostgreSQL `FOR UPDATE SKIP LOCKED`.
- A target has one database lock owner at a time.
- Locks older than `WORKER_LOCK_TIMEOUT_MS` are recovered automatically.
- Global concurrency defaults to 4.
- Per-provider concurrency defaults to 1 and supports JSON overrides.
- Each provider call has a 45-second timeout by default.
- Failures retry at most 3 times using exponential backoff capped at 15 minutes with ±20% jitter.
- Exhausted retries remain recorded as failed, then become eligible at the next normal scheduled interval.
- Every provider attempt is also persisted in `scrape_runs` by the indexing service.

## Manual refresh API

`POST /api/refresh` accepts:

```json
{
  "clubSlugs": ["padel-club-spoje"],
  "date": "2026-08-22"
}
```

It returns HTTP 202 after queueing or deduplicating the request. It never waits for a provider scrape. Repeated requests for the same club/date are deduplicated for five minutes, and a running target is not interrupted.

The existing UI refresh button calls this endpoint and displays queue feedback. It does not perform the scrape inside the browser request.

The UI then polls `GET /api/refresh/status` while showing a background-refresh spinner. When every requested club has completed a newer refresh, the UI automatically reloads the saved database results. The browser still never calls club booking providers directly in database-search mode.

## Local commands

```bash
npm run scheduler:once -w @mamekurt/api
npm run scheduler -w @mamekurt/api
npm run worker -w @mamekurt/api
npm run jobs:once -w @mamekurt/api
```

## Production commands

Build command:

```bash
npm install && npm run build
```

Scheduler process:

```bash
npm run start:scheduler -w @mamekurt/api
```

Worker process:

```bash
npm run start:worker -w @mamekurt/api
```

Low-cost Render Cron command (recommended for the initial deployment):

```bash
npm run start:jobs:once -w @mamekurt/api
```

The initial Render deployment runs every ten minutes during the daytime window. Render evaluates cron expressions in UTC, so use `*/10 6-20 * * *` during Prague summer time (CEST) and `*/10 7-21 * * *` during standard time (CET). This covers the final 22:00 Prague refresh; invocations after that final target find no regular work. The command seeds missing targets, accelerates targets that still carry an older, slower schedule, drains all work that is currently due, and exits. Manual targets queued outside this window wait for the next daytime invocation.

Both processes require `DATABASE_URL` and the provider credentials already documented in `apps/api/.env.example`. The scheduler and worker are separate from the API web process so a slow provider cannot consume web request capacity.

## Main configuration

See `apps/api/.env.example`. Important settings are:

- `SCRAPE_SCHEDULE_START=08:00`
- `SCRAPE_SCHEDULE_END=22:00`
- `SCRAPE_TARGET_HORIZON_DAYS=7`
- `WORKER_CONCURRENCY=4`
- `WORKER_PROVIDER_CONCURRENCY=1`
- `WORKER_PROVIDER_CONCURRENCY_OVERRIDES={"playtomic":2,"padelslavia":1}`
- `WORKER_MAX_ATTEMPTS=3`
