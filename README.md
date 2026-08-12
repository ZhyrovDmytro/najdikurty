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
- One Padel on CourtyONE: https://onepadel.cz/book

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

## Web analytics

The web app uses PostHog only when `VITE_POSTHOG_KEY` is configured. The SDK is lazy-loaded and uses manual event capture only:
page views, filter changes, language/theme changes, club selections, view-mode changes, map clicks, availability refreshes, and booking-link exits.
Autocapture and session recording are disabled.

For local development, copy `apps/web/.env.example` to `apps/web/.env.local` and set your PostHog project token.
For GitHub Pages, set repository variables:

```bash
VITE_POSTHOG_KEY="phc_..."
VITE_POSTHOG_HOST="https://eu.i.posthog.com"
```

Padel Slavia exposes future dates only after login. Configure credentials outside git before starting the API:

```bash
export PADEL_SLAVIA_EMAIL="your-email"
export PADEL_SLAVIA_PASSWORD="your-password"
export PADEL_SLAVIA_AVAILABILITY_TIMEOUT_MS="45000"
```

TK Sparta is fetched through the public JdemeNaTo portal search result first. The logged-in calendar/browser fallback is kept as a backup:

```bash
export TK_SPARTA_EMAIL="your-email"
export TK_SPARTA_PASSWORD="your-password"
export JDEMENATO_PORTAL_TIMEOUT_MS="10000"
```

If the hosting provider blocks the plain HTTP login request, enable the TK Sparta browser-backed fallback:

```bash
export JDEMENATO_BROWSER="1"
export JDEMENATO_BROWSER_PROFILE_DIR="/tmp/mamekurt-jdemenato"
export JDEMENATO_BROWSER_HEADLESS="true"
export JDEMENATO_HTTP_TIMEOUT_MS="5000"
export PLAYWRIGHT_BROWSERS_PATH="0"
export TK_SPARTA_AVAILABILITY_TIMEOUT_MS="25000"
```

On Render, install Chromium during build before starting the API:

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npm ci && PLAYWRIGHT_BROWSERS_PATH=0 npx playwright-core install chromium && npm run build -w @mamekurt/scrapers && npm run build -w @mamekurt/api
```

If you want to route only the browser login through an approved proxy, set `JDEMENATO_BROWSER_PROXY_SERVER` and optionally
`JDEMENATO_BROWSER_PROXY_USERNAME` / `JDEMENATO_BROWSER_PROXY_PASSWORD`.

Padel Džus uses Bookaball. Availability can be read from the booking API, and credentials can be provided for an authenticated session:

```bash
export BOOKABALL_EMAIL="your-email"
export BOOKABALL_PASSWORD="your-password"
```

Padel Radotín uses Cloudflare protection on iSportSystem, so its availability is disabled. The current cache is in memory. For fully reliable unattended scanning of protected booking systems, add persistent storage or use an authorized non-interactive route: ask the club or provider for API/feed access, a server IP allowlist, or another documented integration endpoint.

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
curl "http://localhost:4000/api/availability?club=one-padel&date=2026-08-10&sport=padel"
```
