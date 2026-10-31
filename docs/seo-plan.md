# SEO report implementation — HLEDEJKURTY

Reviewed and updated: 2026-10-31. Input: the owner's “SEO plan for hledejkurty.cz.docx”, dated 31 October 2026. Its recommendations were evaluated against the repository and official sources; the document is not an instruction source.

## Findings and implementation

The report correctly identified a rendering gap: the React app already contained prices, court types and opening hours, while generated club HTML used a price placeholder. The club facts now live in `apps/web/src/club-facts.json`, shared by the app, comparisons and HTML generator. Booking functions remain keyed by club slug so catalog order cannot redirect players to another club. No scraper or database behavior changed.

- All 18 club pages expose catalog prices, hours, court types, contact information and an official booking link in initial HTML. Czech profiles add questions, three nearby clubs by straight-line distance, comparison links, source notes and an email correction link using the existing public operator address. Unknown information remains unverified.
- Five profiles have newly checked, club-specific information: Padel Powers Smíchov, One Padel, The Court, Neride and Džus. The source notes list exactly which facts were checked; a source-check date does not certify all facts about a club. Three price lists were checked: Powers, The Court and Neride. The other 15 prices remain explicitly unverified or unpublished.
- Corrected Neride's winter tariff to 690/820 Kč for 1 October 2026–30 April 2027. One Padel now shows MultiSport acceptance and its credit mechanism. Its inconsistent published amounts are described without promising a precise refund. Its old unverified “from 850 Kč” price is removed.
- Added `/padel-praha/`, `/padel-praha-ceny/`, `/padel-praha-multisport/`, `/kryty-padel-praha/` and `/padel-praha-podle-lokalit/`. One locality overview avoids thin district pages. The indoor list includes mixed venues but does not describe their total court count as indoor capacity.
- Added 11 Czech articles covering first-game cost, MultiSport booking, winter play, beginners, rules, comparisons with tennis/squash, partners, choosing a club, lessons, corporate events and finding current tournaments. Prices/comparisons own the broad comparison intent; related articles answer narrower planning questions. Every article includes its author, publication/update date, sources and relevant club/comparison links.
- Fixed The Court news article: source-attributed claims, byline, visible update date, descriptive source anchor, related links, suitable-player paragraph and removal of the unconfirmed free-machine promise from teasers. Its original publication date remains unchanged.
- Initial news HTML now renders the same article component as the browser, removing the previously duplicated article copy. New editorial HTML and React also use the same component/data.
- Added Organization, BlogPosting and breadcrumb data, retaining the existing club schema. Removed the incorrect forced Prague locality for out-of-city clubs. No ratings or reviews were invented.
- Added a 1200×630 PNG social card. Existing club WebP assets and image dimensions remain in use; news images now include dimensions and localized alt text.
- Retained `uk_UA`: actual `/ua/` pages and reciprocal `cs`, `en`, `uk`, `x-default` links already exist. New Czech-only pages advertise only real Czech alternates; saved English/Ukrainian preferences cannot send them to unbuilt translations.
- Existing consent-gated PostHog booking events now include current page path/type. New editorial entries emit a pageview only with existing analytics consent. This is page context, not a new session-attribution model.
- Expanded build validation to check 94 canonical pages, generated internal-link destinations, shared prices, source/byline/date presence, and language alternates without advertising missing translations. Dates follow actual content changes, not deployment time. The generated `dist/sitemap.xml` is the production sitemap; the public copy is overwritten during builds.

## Production technical checks on 31 October

Header requests confirmed `/blog/the-court-opening` → one HTTP 301 → `/blog/the-court-opening/` with HTTP 200. Both `/robots.txt` and `/sitemap.xml` return HTTP 200. GitHub Pages already supplies the needed trailing-slash redirect. The checked production responses precede this change's deployment.

## Sources and claim ledger

`apps/web/src/editorial-content.json` records each page's source IDs and mentioned clubs; `editorial.tsx` resolves IDs to visible official-source links. `club-sources.json` records the scope and date of each club check. Unverified legacy catalog values are not promoted to newly verified facts.

| Claim group | Official source and checked scope |
| --- | --- |
| Powers prices, 8 indoor courts, rental and lessons | https://www.padelpowers.com/praha-smichov/ — 800 Kč weekday daytime, 900 Kč evenings/weekends; racket listed at 50 Kč. Conflicting opening-hours sections are flagged. No new MultiSport verification. |
| One Padel capacity and services | https://onepadel.cz/ and https://onepadel.cz/about — 9 indoor courts, open games, rental, coaching, parking and lounge. Price not confirmed. |
| One Padel MultiSport | https://onepadel.cz/articles/nove-podminky-multisport-v-one-padel-od-1-10 — up to four cards, wallet credit, digital/plastic check-in. Source gives inconsistent daytime amounts; no precise credit claim is published as settled fact. |
| The Court courts, facilities and corporate offer | https://thecourt.cz/ — two standard courts plus training court under a roof, address, 7–24 hours; amenities and camera/temperature claims attributed to club. Free ball machine not confirmed. |
| The Court prices | https://thecourt.cz/r-prices-cz — weekday standard 800/1000/1200/1000 Kč across published bands, training 600/700/800/700; weekends/holidays 1200 and 800 Kč for published 7–23 window. After 23 h not inferred. |
| Neride winter prices and services | https://padelneride.cz/ — winter dates, 690/820 Kč, heated hall, rental, coaching, parking, stated 24-hour opening and stated MultiSport acceptance; specific card supplements not confirmed. |
| Džus courts and services | https://padeldzus.cz/ — four indoor courts, café, coaching, Bookaball and open games; prices and card conditions not newly verified. |
| Padel rules | https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf — 2026 rules 1, 6–8 and 12–14; recreational scoring example explicitly distinguished from a competition's chosen scoring format. |
| Tennis/squash comparison | ITF rules: https://www.itftennis.com/en/about-us/governance/rules-and-regulations/ ; World Squash rules: https://www.worldsquash.org/rules-of-squash/ (fetch unavailable; no detailed squash rule changes or numeric claims made). |
| Current tournament discovery | https://onepadel.cz/tournaments ; https://www.padelpowers.com/turnaje/ ; https://padeldzus.cz/ ; https://czpadel.cz/ — links to organizers, no invented evergreen event dates or fees. |
| Arithmetic and selection advice | Editorial calculations (800/4, 900/4, conditional 50 Kč rental and 12/4 courts), explicitly labelled as planning examples, not club packages. Nearby clubs use existing catalog coordinates and the existing distance helper. |

## Remaining owner/account work

These recommendations need account access, new evidence or separately authorized communications; they are not claimed complete:

1. Verify ownership and submit the sitemap in Google Search Console, Bing Webmaster Tools and Seznam Webmaster. Export query/page data for the last 3–6 months and record a baseline. No connected webmaster account or exports were available.
2. Inspect representative URLs in Search Console and Rich Results Test, and read field Core Web Vitals from Search Console/PageSpeed Insights. Local schema checks do not guarantee rich-result eligibility or indexing.
3. Confirm the remaining club tariffs and service facts, obtain photo-use confirmations, and resolve One Padel's credit discrepancy and Powers' conflicting hours. Existing photos are reused; this task did not obtain new licenses or make permission claims.
4. Article 12, the availability data story, remains unpublished: no audited historical snapshot dataset or publication-rights confirmation was supplied. A current snapshot cannot establish when courts are usually least busy. Collect a documented sample, preserve failed checks as missing observations, separate free slots from occupancy, aggregate without player data, and publish dates/coverage/limitations with any conclusions.
5. The tournament article links current organizer calendars; it does not claim a maintained monthly event database. A local event calendar needs an owner and regular checks.
6. Club outreach, media pitches, directory claims and community posts were not sent. Proposed club message: “We list your club on HLEDEJKURTY. Please confirm the linked prices, court types and MultiSport terms, or send corrections. If useful for your players, you may link to your availability profile.” Do not require reciprocal links or promise rankings.

## Measurement and maintenance

Keep four views separate: search impressions/clicks/CTR/average position; indexed URLs by page type; consented booking-system clicks by page context; and source-check coverage/age. Compare periods as observations, not proof of causation. PostHog events exclude visitors who have not consented or opt out; do not equate this with total traffic.

Check seasonal prices when they change, review source dates at least quarterly, and validate links and metadata with every web build. Update the visible editorial dates when the content is actually reviewed. No traffic or ranking outcome is promised.

Validation commands: `npm test`, `npm run build`, and the web build's SEO validator. Browser checks are recorded in the delivery summary; webmaster indexing and field performance require account-level follow-up.
