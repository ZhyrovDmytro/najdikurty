# Availability indexing: Phase 1 repository audit

Date: 2026-08-21

Scope: repository audit only. This phase does not change runtime architecture, UI behavior, provider behavior, deployment configuration, or persistence.

## Executive summary

HledejKurty is a small npm-workspaces monorepo with a React/Vite static frontend, an Express API, and a TypeScript scraper package. The frontend is deployed through GitHub Pages. The repository documents the API as running on Render, but contains no Render infrastructure-as-code configuration.

The current public search path is synchronous on a cache miss:

```text
React UI
  -> one GET /api/availability request per eligible club (maximum 3 in flight)
  -> Express club router
  -> external provider HTTP/API/browser retrieval
  -> provider-specific parsing into the current AvailabilityResult shape
  -> in-memory API cache
  -> UI-side duration/time/court-count filtering
```

The API has a useful in-memory cache, stale fallback, request timeout, per-key in-flight deduplication, and an optional cache warmer. These reduce repeat latency inside one live API process, but do not constitute an availability index:

- cold requests still wait for external providers;
- stale entries are returned only after a live refresh fails, rather than immediately;
- cache state disappears on restart/deploy and is not shared across instances;
- the optional warmer runs inside the API process and processes configured club/date pairs serially;
- there is no database, durable job queue, worker, scrape-run history, or reconciliation layer.

The smallest safe path is to preserve the current frontend and endpoint while introducing a domain/provider seam for one low-cost HTTP provider, then add PostgreSQL persistence and a parallel DB-backed endpoint behind a feature flag. Production search should switch only after result parity is demonstrated.

## 1. Repository and tooling

### Monorepo

- Package manager: npm, with `package-lock.json` lockfile version 3.
- Workspace layout: `apps/api`, `apps/web`, and `packages/scrapers`.
- Runtime target: Node.js 22.x.
- Language: strict TypeScript in all workspaces.
- Root scripts: `build`, `test`, `dev:api`, and `dev:web`.
- There is no lint script or lint configuration.

### Frameworks and libraries

| Area | Current technology |
| --- | --- |
| Frontend | React 18, Vite 8, i18next, lucide-react |
| API | Express 4, CORS, Zod |
| Scrapers | native `fetch`, Cheerio, Zod, conditional `playwright-core` |
| Tests | Vitest |
| Analytics | optional PostHog in the browser |
| Database/ORM | none |

## 2. Frontend architecture

The frontend is a client-rendered React application. Most application state, club metadata, routing, filtering, result rendering, SEO metadata, and page composition live in `apps/web/src/main.tsx`. Reusable availability calculations are in `apps/web/src/availability.ts`; small UI primitives are in `apps/web/src/ui.tsx`.

The static `CLUBS` array is currently the source of truth for club name, address, phone, court count/type, opening hours, availability enablement, and booking link construction. It lists 14 clubs, of which 10 are currently eligible for availability searches.

For an all-club search, the browser:

1. filters the static club list by enabled state, court type, opening hours, requested duration, and requested time window;
2. makes one `/api/availability?club=...&sport=padel&date=...` request per remaining club;
3. runs at most three club requests concurrently;
4. retries each failed browser request once after one second, with a 30-second timeout per attempt;
5. updates results and progress incrementally as club requests finish;
6. derives requested-duration booking options in the browser.

Duration, earliest/latest time, court type, and number-of-courts filters are not sent to the backend. The API returns a full club/day availability payload and the browser applies those search semantics. `buildBookableSlots` can synthesize duration windows from free intervals or use exact provider duration groups when supplied (currently Padelos).

The current UI already displays subtle freshness text using `cache.cachedAt`/`cache.state`, falling back to the provider's `fetchedAt`. No redesign is needed for the future indexing architecture.

## 3. Backend/API architecture

The backend is a single Express server in `apps/api/src/server.ts` with:

- `GET /health`;
- `GET /api/availability` validated with Zod;
- a large `if` chain mapping a club slug to a scraper function;
- provider and club-specific timeout/environment handling;
- JSON structured logging for availability requests and warmer runs;
- a global error handler that currently returns status 500 for validation, unknown-club, provider, and internal errors alike.

There is no domain-level `SearchService`. The endpoint returns one club/day payload, not aggregated search results.

### Current caching behavior

- Key: `club|sport|date`.
- Fresh TTL: 15 minutes by default.
- Stale retention: 6 hours by default.
- Maximum entries: 300 by default.
- Storage: a process-local `Map`.
- Concurrent identical cache misses: deduplicated through an in-flight promise map.
- Fresh hit: returned immediately.
- Miss or expired-fresh entry: provider retrieval is awaited.
- Provider failure with a retained stale entry: stale entry is returned.
- Provider success: entry is replaced and marked `live` in the response.

This is cache-aside with stale-on-error, not stale-while-revalidate. A merely stale request still includes provider latency.

### Current cache warmer

An optional timer starts inside the API process after `app.listen`. It refreshes configured clubs for a configurable number of dates at a fixed interval. It is disabled unless explicitly enabled, defaults to an empty club list, and uses nested `for` loops, so every club/date refresh is serial. There is no durable schedule, locking, retry state, abandoned-work recovery, or cross-instance coordination.

## 4. Complete current search trace

```text
Search button / selected-club page effect
  -> App.loadAvailability()
  -> determine eligible static CLUBS
  -> runWithConcurrency(..., 3)
  -> fetchAvailabilityWithRetry() (maximum 2 attempts)
  -> GET Render API /api/availability?club=<slug>&sport=padel&date=<YYYY-MM-DD>
  -> Zod query parsing
  -> in-memory cache lookup
     -> fresh hit: return cached AvailabilityResult
     -> otherwise: per-key in-flight deduplication
        -> abort timeout wrapper
        -> fetchAvailabilityByClub() if-chain
        -> provider client
        -> external HTTP/JSON/HTML or conditional Playwright
        -> parser/current normalization
        -> cache result in process memory
  -> React stores payload by club as each request completes
  -> buildBookableSlots() applies duration, time-window, and courts-needed rules
  -> cards/list render with provider booking links and cache freshness badge
```

### Concurrency and serialization

- Across clubs, the browser allows three API requests at once. The API itself has no global or per-provider concurrency limit.
- Identical API requests inside one API process share a promise.
- The cache warmer is entirely serial.
- CourtyONE fetches all nine court endpoints concurrently with one `Promise.all` and no explicit provider limit.
- Bookaball fetches its four courts serially; each court requires a state-selection request followed by a times request.
- Multi-step HTTP login/session providers perform their dependent requests serially, as required.
- There is no bounded background-worker concurrency because there is no worker yet.

## 5. Clubs and booking providers

| Club | Provider/platform | UI availability | Retrieval path | Notes |
| --- | --- | --- | --- | --- |
| TK Sparta Praha | JdemeNaTo / CentiSport | Disabled | public portal HTTP + HTML; direct authenticated HTTP fallback; conditional Playwright | API route exists; most complex fallback chain |
| Padel Prosek | SkySportCity / CLUBSPIRE | Enabled | one direct HTTP request + HTML parsing | 15-minute source granularity |
| Padel Club Spoje | Playtomic | Enabled | one direct JSON API request | Shares adapter with Písečná |
| Tenis & Padel klub Písečná | Playtomic | Enabled | one direct JSON API request | Shares adapter with Spoje |
| SK Slavia Praha Padel | custom Padel Slavia PHP app | Enabled | cookie-session HTTP/login + HTML; conditional Playwright | Future dates require credentials |
| Head Tenis Centrum, Vestec | iSportSystem | Disabled | API currently throws before scraper; generic scraper supports HTTP then Playwright | Temporarily disabled |
| Padel Radotín | iSportSystem | Disabled | API currently throws before scraper | Cloudflare-protected; intentionally disabled |
| Padel Čakovice | iSportSystem | Disabled | direct HTTP then optional Playwright | Handler exists but UI does not call it |
| Padel Neride | Reservanto | Enabled | form GET then calendar POST + HTML/embedded-data parsing | Two dependent HTTP requests |
| Padel Džus | Bookaball | Enabled | cookie/CSRF bootstrap + JSON API workflow | Optional login; court requests are serial; minimum duration 60 min |
| Padel Powers Smíchov | Padelos | Enabled | one direct JSON API POST | Exact 60/90/120-minute availability groups |
| One Padel | CourtyONE | Enabled | public Next action request per court | Nine requests launched concurrently; response validated by Zod |
| Císařská louka Padel | Reenio | Enabled | one direct JSON API POST | Two bounded attempts for selected network/5xx failures |
| SK Satalice | RogerOnline | Enabled | one direct HTTP request + HTML parsing | Court count is configured by the API |

Provider reuse already exists in code for Playtomic. The generic iSportSystem client can also serve multiple host configurations, although all three listed iSportSystem clubs are disabled in the UI and only Čakovice currently reaches that client. All other current providers have one configured club each.

## 6. Scraper/provider architecture

Scrapers are already grouped by provider directory, which aligns with the target direction. Most expose a provider-specific `fetch...Availability(options)` function and return the shared `AvailabilityResult`/`CourtAvailability` types.

The current shared result is normalized enough for the existing UI (club/date, court name, blocked ranges, free ranges, source URL, and fetch time), but it is not the proposed persistence domain model:

- date and time are local strings rather than timezone-aware instants;
- courts have display names but no stable internal/external IDs;
- slots do not carry availability rows with start/end timestamps;
- prices/currencies and per-slot booking URLs are mostly not represented;
- provider identity remains on every court payload;
- provider configuration is partly embedded in source and partly in the API routing chain;
- there is no common `AvailabilityProvider` interface or error taxonomy.

### Retrieval hierarchy in practice

The repository generally follows the desired least-expensive mechanism:

- Direct JSON/XHR/API: Playtomic, Padelos, Reenio, Bookaball, CourtyONE.
- Direct HTTP + HTML parsing: SkySportCity, RogerOnline, Reservanto, JdemeNaTo, Padel Slavia, iSportSystem when unchallenged.
- Playwright fallback only: JdemeNaTo, Padel Slavia, and iSportSystem.

No provider launches Chromium unconditionally. Browser behavior is conditional on configuration/request path and usually follows a failed HTTP path. The notable exception is that the public API supports `live=1`, which can enable browser options for configured providers; the normal frontend does not send it.

## 7. Persistence, scheduling, deployment, and operations

### Persistence

There is no database client, ORM, schema, migration system, or persistent availability storage. The only server-side state is process memory. There are no `booking_providers`, `clubs`, `courts`, `availability_slots`, `scrape_runs`, or `scrape_targets` equivalents.

### Deployment

- Frontend: GitHub Actions builds `apps/web` on pushes to `main` and deploys `apps/web/dist` to GitHub Pages. The custom domain file is `hledejkurty.cz`.
- API: the README documents Render build/start expectations and the production frontend falls back to `https://najdikurty.onrender.com` when running on a `github.io` hostname. There is no `render.yaml`, Dockerfile, or other checked-in Render service definition, so actual Render plan, process count, health-check, environment, and deploy commands cannot be verified from the repository.
- Playwright: the documented Render build installs Chromium. This increases build size and runtime resource needs but is limited to providers that need the fallback.

The existing Render API is sufficient to remain the public API host during incremental work. The target architecture will additionally need durable PostgreSQL (the stated Supabase direction is compatible) and, by Phase 7, a reliably running worker/scheduler process. Whether the current Render service/plan alone can host that worker cannot be established from this repository; it should be checked before Phase 7 rather than changing hosting now.

### Scheduled work

The in-process fixed-interval warmer is the only scheduled work. There are no GitHub scheduled workflows, external cron definitions, queues, or workers in the repository.

### Observability

The API emits structured JSON for request starts, cache hits/stale fallbacks, successes/failures, JdemeNaTo diagnostics, and warmer activity. It has short request IDs. It does not persist scrape runs or expose latency histograms/p50/p95. Some provider clients log no run-level counts because there is no central run abstraction.

## 8. Environment variables and configuration

Configuration is read directly from environment variables. Provider URLs and identifiers are code-owned rather than user supplied, which limits SSRF exposure in the present API.

Groups currently referenced:

- API runtime: `PORT`, `HOST`.
- Cache: `AVAILABILITY_TIMEOUT_MS`, `AVAILABILITY_CACHE_TTL_MS`, `AVAILABILITY_STALE_TTL_MS`, `AVAILABILITY_CACHE_MAX_ENTRIES`.
- Warmer: `AVAILABILITY_WARMER`, `AVAILABILITY_WARMER_ENABLED`, `AVAILABILITY_WARMER_INTERVAL_MS`, `AVAILABILITY_WARMER_START_DELAY_MS`, `AVAILABILITY_WARMER_DAYS`, `AVAILABILITY_WARMER_CLUBS`.
- TK Sparta/JdemeNaTo: `TK_SPARTA_EMAIL`, `TK_SPARTA_PASSWORD`, `TK_SPARTA_AVAILABILITY_TIMEOUT_MS`, `JDEMENATO_PORTAL_TIMEOUT_MS`, `JDEMENATO_BROWSER`, `JDEMENATO_BROWSER_PROFILE_DIR`, `JDEMENATO_BROWSER_CHANNEL`, `JDEMENATO_BROWSER_EXECUTABLE_PATH`, `JDEMENATO_BROWSER_HEADLESS`, `JDEMENATO_BROWSER_TIMEOUT_MS`, `JDEMENATO_HTTP_TIMEOUT_MS`, and optional browser proxy variables.
- Padel Slavia: credentials, availability/browser timeout, browser enablement/profile/channel/executable/headless variables under the `PADEL_SLAVIA_` prefix.
- iSportSystem: availability/browser timeout, browser enablement/profile/channel/executable/headless variables under the `ISPORTSYSTEM_` prefix.
- Bookaball: `BOOKABALL_EMAIL`, `BOOKABALL_PASSWORD`.
- Playwright build/runtime: `PLAYWRIGHT_BROWSERS_PATH` is documented.
- Web build: `VITE_API_BASE_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, plus GitHub Pages build flags.

Only the web analytics variables are represented in a committed `.env.example`. There is no API `.env.example`; adding a secrets-free one will be appropriate when database/provider configuration is formalized. Local `.env.local` files and `.mamekurt` browser profiles are gitignored.

## 9. Existing tests and validation gaps

Vitest coverage currently includes:

- browser-side booking-slot construction, exact-duration handling, filters, and Prague “already started” behavior;
- parser fixtures for JdemeNaTo, SkySportCity, Playtomic, Padel Slavia, iSportSystem, Reservanto, Reenio, and RogerOnline;
- client request/fallback tests for JdemeNaTo, Padel Slavia, iSportSystem, Reservanto, Reenio, RogerOnline, Padelos, and CourtyONE.

Important gaps for the indexing work:

- no API route tests;
- no cache/warmer tests;
- no database/integration tests;
- no shared provider-contract tests;
- no durable reconciliation tests;
- no exact target contiguous-segment suite covering duplicates, overlaps, gaps, unavailable intermediates, and multiple courts;
- limited explicit daylight-saving-transition coverage;
- no Bookaball client tests in the tracked repository;
- no SkySportCity client test (parser only);
- no Playtomic client test (parser only);
- no lint command;
- no benchmark or query-plan instrumentation.

## 10. Current latency bottlenecks and risks

1. **External I/O is on the user request path.** Every cold/expired club request awaits the provider, including authentication and parsing.
2. **Browser fan-out multiplies tail latency.** An all-club search completes only after up to 10 independent API calls, with only three running at once. Slow providers occupy a browser concurrency slot and prolong total completion.
3. **Browser retries can amplify load.** The frontend may perform two attempts while provider clients may also retry internally (currently notably Reenio and Padel Slavia fetches).
4. **The API cache is ephemeral and instance-local.** Render restarts/deploys cause cold searches; multiple instances would have unrelated caches and in-flight maps.
5. **The stale path still blocks.** A stale value is returned only after live retrieval throws or times out.
6. **The warmer is serial and not durable.** A slow club delays every later target; restarts lose cadence and cache.
7. **Provider work has uneven concurrency.** CourtyONE sends nine concurrent requests without a provider limiter, while Bookaball processes courts serially.
8. **Timeouts are necessarily large for difficult providers.** Defaults reach 45-90 seconds on browser-capable paths. Even though several affected clubs are disabled, this is incompatible with target search latency if kept synchronous.
9. **Club/config data is duplicated across layers.** UI metadata, API routing/config, and provider constants can drift.
10. **No indexed search query exists.** Aggregation and duration filtering happen in the browser over per-club payloads, so backend p50/p95 targets cannot yet be meaningfully measured for search.

Additional operational risks:

- Render deployment details and service limits are not version-controlled.
- A broad `cors()` policy and undifferentiated 500 responses are acceptable MVP debt but should be reviewed as the API matures.
- Some providers rely on credentials or persistent browser profiles; secrets/profile handling must remain outside git and worker concurrency must not corrupt a shared profile.
- Provider disappearance semantics are not centralized, so persistence must not be introduced before provider-specific reconciliation rules are defined.

## 11. Smallest safe refactoring path

This path preserves the current UI and keeps the Render API operational throughout.

1. **Phase 2: add a domain/provider seam without changing transport.** Introduce normalized domain types, provider result/error types, and a common provider interface. Move club/provider selection into typed configuration. Convert one low-risk, single-request provider as a vertical slice; Playtomic is the best initial candidate because it uses a stable structured endpoint, already supports two clubs, has no credentials/browser dependency, and already has parser tests. Adapt its normalized result back to the current API shape so behavior remains unchanged.
2. **Phase 3: add Supabase PostgreSQL via Drizzle.** Add migrations and repositories for providers, clubs, courts, current availability, scrape runs, and targets. Seed from typed club configuration while leaving the frontend's static metadata in place initially to avoid a UI redesign. Use timezone-aware timestamps and `Europe/Prague` only as an explicit default.
3. **Phase 4: persist the Playtomic vertical slice.** Add a manual scrape CLI, court/slot upserts, run logging, and explicit response-completeness/reconciliation rules. Verify both Playtomic clubs and inspect stored rows.
4. **Phase 5: add a parallel DB-backed search endpoint.** Keep `/api/availability` intact. Add `SearchService` and a new endpoint behind a development feature flag. Move provider-independent contiguous-duration logic into the domain and compare DB results with live results. This is also the point to add query indexes, `EXPLAIN ANALYZE`, and representative latency measurements.
5. **Phase 6: migrate remaining unique providers incrementally.** Prefer current direct HTTP/API paths and keep Playwright limited to demonstrated cases. Treat disabled iSportSystem/TK Sparta clubs as explicit unsupported/deferred states rather than allowing them to block the enabled set.
6. **Phase 7: run durable scheduling/work on Render-compatible processes.** Add PostgreSQL `SKIP LOCKED` claiming, lock recovery, bounded retries, error classification, fixed configuration-based refresh policy, and global/per-provider concurrency. Confirm the Render plan/process model before deployment; keep the public API and worker independently restartable even if they share the monorepo/image.
7. **Phase 8: switch search only after parity.** Point normal searches at DB-only `SearchService`; enqueue deduplicated refresh targets without awaiting them. Preserve the existing UI and freshness badge, changing only the data source/loading behavior required to stop waiting for scrapers. Retain legacy live search behind a temporary development/admin flag until confidence is established.

No Redis, queue broker, search engine, or UI rearchitecture is justified for the initial dataset. PostgreSQL should own durable availability and scheduling first; measure before adding another cache tier.

## 12. Phase 1 completion record

- Files changed: this audit document only.
- Runtime architecture changes: none.
- UI changes: none.
- Migrations created: none.
- Tests added: none.
- Commands used for audit: read-only repository/file searches, package-script inspection, `npm test`, `npm run build`, and `git status`.
- Outstanding risks: Render configuration/limits are not represented in the repository; live provider behavior and production latency were not probed because Phase 1 is a repository audit; persistence/reconciliation semantics remain to be designed provider by provider.
- Recommended next step: approve Phase 2 and use Playtomic as the first provider-interface vertical slice.
