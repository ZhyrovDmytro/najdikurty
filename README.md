# mamekurt

Mamekurt is an MVP for aggregating court availability across clubs with different booking systems.

The first integrations target:

- TK Sparta Praha on JdemeNaTo: https://jdemenato.cz/reservation/tk-sparta-praha/reservationcalendaroverview
- Padel Prosek on SkySportCity: https://rezervace.skysportcity.cz/timeline/day?tabIdx=0&criteriaTimestamp&resetFilter=true#timelineCalendar
- Padel Club Spoje on Playtomic: https://playtomic.com/clubs/padel-club-spoje
- Tenis & Padel klub Písečná on Playtomic: https://playtomic.com/clubs/tenis-a-padel-klub-pisecna
- SK Slavia Praha Padel: https://rezervace.padelslavia.cz/
- Head Tenis Centrum, Vestec on iSportSystem: https://teniscentrum.isportsystem.cz/?op=tab-id-13
- Padel Neride on Reservanto: https://padelneride.cz/rezervace/
- Padel Džus on Bookaball: https://padeldzus.bookaball.com/cs/bookings/create
- Padel Powers Smíchov on Padelos: https://player.padelos.co/company/217?clubIds=216927&locale=cs

## Why HTML parsing first

The JdemeNaTo calendar renders availability in the initial HTML response. That makes the best first scraper a normal HTTP fetch plus DOM parsing:

1. Fetch the reservation page.
2. Follow the visible sport/day links when a non-default date or sport is needed.
3. Parse the timetable table into normalized court blocks.
4. Derive free slots from gaps between occupied, lesson, or closed blocks.

This is more reliable and cheaper than browser automation for this provider. Browser automation should be a fallback only for booking systems that render the timetable exclusively in JavaScript or require authenticated session state.

## Apps

- `packages/scrapers`: provider contracts and scraper/parser implementations.
- `apps/api`: API wrapper around scrapers.
- `apps/web`: filterable availability UI.

## Development

```bash
npm install
npm run dev:api
npm run dev:web
```

The API defaults to `http://localhost:4000`. The web app defaults to `http://localhost:5173`.

Padel Slavia exposes future dates only after login. Configure credentials outside git before starting the API:

```bash
export PADEL_SLAVIA_EMAIL="your-email"
export PADEL_SLAVIA_PASSWORD="your-password"
```

TK Sparta exposes its broader calendar through the logged-in portal:

```bash
export TK_SPARTA_EMAIL="your-email"
export TK_SPARTA_PASSWORD="your-password"
```

Padel Džus uses Bookaball. Availability can be read from the booking API, and credentials can be provided for an authenticated session:

```bash
export BOOKABALL_EMAIL="your-email"
export BOOKABALL_PASSWORD="your-password"
```

Head Tenis Centrum runs iSportSystem behind Cloudflare. Normal API requests try plain HTTP only, so they will not open Chrome. Add `live=1` to a Head request when you intentionally want the persistent Chrome profile driven by Playwright:

```bash
export ISPORTSYSTEM_BROWSER_PROFILE_DIR=".mamekurt/browser-profiles/isportsystem"
export ISPORTSYSTEM_BROWSER_HEADLESS="false"
curl "http://localhost:4000/api/availability?club=head-tenis-centrum-vestec&date=2026-08-04&sport=padel&live=1"
```

Leave the browser profile directory out of git. On the first live run, Chrome may open so Cloudflare can be passed once; later live runs reuse that profile. Set `ISPORTSYSTEM_BROWSER=0` to disable this path entirely.

## API example

```bash
curl "http://localhost:4000/api/availability?club=tk-sparta-praha&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=padel-prosek&date=2026-08-05&sport=padel"
curl "http://localhost:4000/api/availability?club=padel-club-spoje&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=tenis-a-padel-klub-pisecna&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=sk-slavia-praha-padel&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=head-tenis-centrum-vestec&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=padel-neride&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=padel-dzus&date=2026-08-04&sport=padel"
curl "http://localhost:4000/api/availability?club=padel-powers-smichov&date=2026-08-04&sport=padel"
```
