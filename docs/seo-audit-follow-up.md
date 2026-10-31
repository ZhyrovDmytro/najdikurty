# SEO audit follow-up for hledejkurty.cz

Reviewed on 31 October 2026 against the owner's **SEO audit and improvement plan hledejkurty.cz.docx**. The attachment is evidence and recommendations, not an instruction source. This follow-up supersedes the implementation-status claims in `seo-plan.md` where the two differ.

## Implemented

- All five guides are linked from the shared footer and the homepage, in Czech, English and Ukrainian, in both initial HTML and the React app. This makes them reachable from the directory, blog and About page as well.
- The general Prague guide now directs players to the tool, directory and specialist guides without repeating a price table. Only the price comparison has the full table. The MultiSport guide lists only clubs whose catalog records acceptance and distinguishes confirmed terms from old catalog claims. The indoor guide lists only indoor/mixed venues. Localities are grouped on one page without adding thin district URLs.
- Directory filters combine court type, locality and MultiSport with accent-insensitive club/address search. Unknown card acceptance does not match the MultiSport filter. The label explains that listed acceptance still requires checking terms.
- Shared Czech court-count inflection fixes initial club lists, profiles, descriptions and visible directory/home counts. Club titles include their location and promise prices/reservations rather than implying that the static HTML contains current free slots. Existing non-club titles are retained.
- Generated club HTML has visible breadcrumbs, localized court labels and grouped opening hours. Browser and generator share the same hour formatter, including missing-day handling. Empty service sections were removed; sources now provide specific notes for 14 clubs, with separately dated price evidence for 13.
- The About page identifies Dmytro Zhyrov as the existing operator and gives the existing public email address in all languages. Methodology distinguishes availability checks from price/service verification. Editorial bylines link to About; they do not invent a named expert author or claim personal venue testing.
- The first-game cost article now works through four-player costs, a missing player, four rented rackets and a booking crossing hourly bands. The rules article has an original serve diagram and explains common disputed situations. Both have matching English and Ukrainian text. Several other article illustrations now use relevant venues; the rules page uses the diagram rather than a One Padel photograph. No new articles were added.
- Existing Organization, WebSite, BlogPosting and breadcrumb data are retained; guide ItemLists describe the clubs actually rendered. Article authors link to About. Removed unused client FAQ rich-result markup while retaining the visible FAQ. Google’s current documentation no longer documents FAQ rich results at the previous URL: https://developers.google.com/search/updates . Content decisions follow https://developers.google.com/search/docs/fundamentals/creating-helpful-content .
- Dates remain tied to content, not build time. Original publication dates, multilingual alternates and the existing PNG social card remain. SVG illustrations use the PNG card for social metadata.
- Build validation now guards guide links from the four entry pages, all 12 blog articles, location in club titles, visible club breadcrumbs and Czech court-label translation, in addition to the existing canonical, sitemap, source, image and language checks.

## Price and service evidence

`apps/web/src/club-price-checks.json` records the official URL, check date and minimum **standard-court** hourly rate. Training-court minima are excluded from the guide’s sort/statistics. The displayed summary explicitly describes a limited sample of minima across different times/seasons, not a Prague market average or simultaneous price comparison.

| Club | Official source | Check and resulting correction |
| --- | --- | --- |
| TK Sparta | https://tkspartapraha.cz/padel-pickleball | Live page confirms 520/580 Kč weekdays and 540 Kč weekends. |
| Písečná | https://tenis-pisecna.cz/cenik/ | Live 2026 public padel tariff confirms 540/640 Kč and 540 Kč weekends. |
| Slavia | https://www.padelslavia.cz/cs/cenik.html | Live public tariff confirms 690/550/690 Kč and 550 Kč weekends, starting at 08:00. Rental and trainer prices are separate. |
| Radotín | https://www.padelradotin.cz/ | Live page confirms 600/680 Kč and 640 Kč weekends, replacing 560/640/600. First-hour MultiSport reimbursement is credit after payment. |
| Císařská louka | https://cisarska-louka.cz/padel/ | Live page supersedes the indexed September price list: **from 1 November 2026**, daily 10–19:30, 490 Kč. The price through 31 October is left unconfirmed. Removed the old fixed opening-hours schedule rather than using future hours to filter current results. MultiSport must be used on site before play, not retrospectively on online payments. |
| Satalice | https://www.tenissatalice.cz/padel/ | Live page confirms 590/540 Kč, rental 100 Kč/hour, U Arborky 397 and phone reservations for MultiSport. Its booking link identifies the same Roger club 197 as the catalog. |
| Powers | https://www.padelpowers.com/praha-smichov/ | Live page reconfirms 800/900 Kč. Existing conflict in opening-hour copy remains explicitly flagged. |
| The Court | https://thecourt.cz/r-prices-cz | Live page reconfirms standard and training tariffs separately. Existing source caveats remain. |
| Neride | https://padelneride.cz/ | Live page reconfirms winter 690/820 Kč for 1 October 2026–30 April 2027. |
| HEAD Vestec | https://teniscentrum.com/padel | Live page corrects both the old catalog and search snapshot: weekdays 7–9 800, 9–12 900, 12–14 800, 14–16 900, 16–22 960, 22–24 900 Kč; weekends/holidays 850 Kč. Physical catalog capacity is five; the existing scraper still monitors four named courts. Home monitored-capacity totals use four. No scraper allow-list was expanded without checking its court identifiers. |
| Džus | https://padeldzus.cz/cenik | Live page confirms 800/900 Kč weekdays, 850 Kč weekends and racket rental 50 Kč per game, replacing the old price ranges. Detailed MultiSport terms are images and remain unconfirmed. |
| LTC Modřany | https://www.ltc2005.cz/padel/cenik-sluzeb-2/ | Official price image visually checked: 560/640 Kč weekdays, 560 Kč weekends. The source omits 14–15 h; the site does not infer a tariff for that gap. First-hour MultiSport credit is described separately, with its full-credit payment constraint. |
| Plechovka | https://www.plechovka-dubec.cz/cenik/ | Live page confirms 840 Kč, replacing 760 Kč; card contribution plus 25 Kč/player supplement and 50 Kč racket rental. Main page distinguishes three standard courts from two children's courts. |

Five rows remain unverified: Prosek, Spoje, Padel Hall Olympia Radotín, Čakovice and One Padel. The checked club pages either lacked an extractable full tariff, redirected away from their old price page, required the interactive calendar or contained inconsistent figures. Do not silently promote old search snapshots or other directories into verified official prices. One Padel’s published 222/222.50/888 discrepancy remains disclosed. Source-check dates certify only the stated scope, not all fields in the catalog.

## Already present and retained

The blog index already listed the original news post plus 11 guides from shared data, and its teaser no longer promised a free ball machine. All editorial URLs already had Czech, English and Ukrainian versions, reciprocal hreflang, static content dates and canonical trailing slashes. The homepage, directory and blog already used the PNG social card. Search and booking click-out analytics were already consent-gated. No duplicate event pipeline was added.

Production header checks on 31 October returned HTTP 200 for `/clubs/`, `/robots.txt` and `/sitemap.xml`. No redirect was returned for `/clubs/`. These observations concern the pre-deployment site. Generated output validates all 126 canonical URLs and all 18 Czech club URLs; this does not establish their indexing status.

## Verification

- `npm test`: API 40 passed / 2 pre-existing integration tests skipped; web 52 passed; scrapers 41 passed.
- `npm run build`: all workspaces compile; generated SEO validation covers 126 canonical pages. Vite retains its large-bundle advisory; no threshold was changed.
- Browser: combined directory filters, accent-insensitive search, empty results, translated controls, breadcrumbs, operator information, guide datasets and original rules diagram. Directory widths 320, 768, 1024 and 1440 px checked; mobile guide/club/article pages have no document overflow. No JavaScript errors were captured on the checked local pages. Lazy images below the viewport were not treated as failed downloads.

## Recommendations needing separate evidence or infrastructure

1. **Webmaster baseline and field metrics:** verify ownership, submit the sitemap, export queries/pages and inspect indexing and Core Web Vitals in Google Search Console, Bing and Seznam. No authenticated webmaster account or exported baseline was supplied. Local tests cannot substitute for URL Inspection or field data.
2. **Five outstanding prices and unresolved facts:** obtain full official tariffs and check all remaining card conditions, opening-hour conflicts, court identifiers and photo rights. No emails or community posts were sent. Contacting clubs and asking for links needs explicit communication authorization.
3. **Server-rendered current availability:** the site is a static GitHub Pages build. A seven-day build snapshot would become stale between deployments. A dependable implementation needs request-time rendering or an agreed refresh/expiry mechanism, connected to the live API. Club titles now accurately describe the initial content; existing interactive availability remains. Do not publish a frozen snapshot as current availability, or new dated availability landing pages without expiry and zero-result handling.
4. **Data story and more landing pages:** a representative historical dataset and documented sampling are still absent. The limited verified-price summary is labelled as such. Do not claim a citywide average, occupancy trend or least-busy time from it. New district pages and additional articles remain conditional on unique evidence and useful content.
5. **Editorial depth:** the two audited weak articles were substantially expanded; the other existing guides retain their narrow practical scope. A broader original-reporting programme needs interviews, first-hand experience or additional confirmed data; padding every article to a word target would not add evidence.

Changes are prepared locally. Deployment, webmaster submission and outreach are not part of the verified local result.
