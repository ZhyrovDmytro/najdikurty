# Availability indexing — Phase 6

## Scope

The indexed catalog represents all 12 clubs currently enabled in the product through eleven provider-level adapters.

| Provider | Retrieval | Configured clubs | Live verification |
| --- | --- | --- | --- |
| JdemeNaTo | Public portal search + timetable HTML; authenticated fallback when configured | TK Sparta Praha | 2 courts across all 8 indexed dates |
| SkySportCity | HTTP + HTML parser | Padel Prosek | 4 courts / 94 normalized segments |
| Playtomic | JSON API | Padel Club Spoje; Tenis & Padel klub Písečná | 2/4 courts; 75/24 options |
| Padel Slavia | HTTP + HTML parser; authenticated/browser fallback when configured | SK Slavia Praha Padel | Public current day completed; future dates require credentials |
| iSportSystem via Apify | Two concurrent stealth-rendered week pages, Markdown parser, and a shared 15-minute batch cache | Head Tenis Centrum Vestec | 4 courts across the rolling indexed horizon |
| Reservanto | HTTP form + calendar XHR/HTML | Padel Neride | 3 courts / 97 segments |
| Bookaball | JSON API with optional authenticated session | Padel Džus | 4 courts / 39 segments |
| Padelos | JSON API | Padel Powers Smíchov | 8 courts / 107 exact options |
| CourtyONE | public server-action endpoint | One Padel | 9 courts / 170 segments |
| Reenio | JSON API | Císařská louka Padel | 3 courts / 19 segments |
| RogerOnline | HTTP + HTML parser | SK Satalice | 2 courts / 46 segments |

Counts are a point-in-time verification for `2026-08-22`, not fixed expectations.

## Adapter architecture

Existing provider-specific clients and parsers remain the source of retrieval truth. `LegacyAvailabilityProviderAdapter` translates their common legacy availability result into the Phase 2 normalized provider contract. This avoids duplicating already tested network and parsing behavior.

- Providers with exact duration data preserve exact booking alternatives.
- Providers exposing continuous free ranges are normalized into their native step-sized segments for provider-independent duration composition.
- Club configuration supplies provider IDs, external IDs, booking URLs, timezone, court indoor/outdoor defaults, and minimum booking duration.
- Court names receive deterministic provider-scoped external IDs where the legacy response does not expose a resource ID.
- Complete responses use the Phase 4 reconciliation behavior; failures are recorded in `scrape_runs`.

## Manual refresh

```bash
npm run build -w @mamekurt/scrapers
npm run scrape -w @mamekurt/api -- --club=padel-neride --date=2026-08-22
```

The same command works for every enabled slug listed in the root README. `DATABASE_URL` is required. Padel Slavia requires credentials for non-current dates; Padel Džus credentials remain optional while its public flow works.

## Explicit blockers

These clubs are not counted among the 12 enabled sources and are not silently advertised as indexed:

- `padel-radotin` / iSportSystem: Cloudflare blocks unattended direct HTTP retrieval.
- `padel-cakovice` / iSportSystem: disabled; Cloudflare may require a maintained browser profile.

The safe resolution is provider/club API access, an allowlisted server route, or a deliberately maintained authorized browser session. Phase 6 does not attempt to bypass these controls.

## Database and search compatibility

No migration was required. The database search repository now reads `minBookingMinutes` from club provider configuration, preventing an atomic provider segment from being presented as a booking shorter than that provider permits.
