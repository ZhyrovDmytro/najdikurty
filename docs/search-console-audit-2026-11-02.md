# Search Console audit — hledejkurty.cz

Reviewed 2 November 2026, Europe/Prague. Authenticated domain property: [Search Console](https://search.google.com/search-console?resource_id=sc-domain%3Ahledejkurty.cz). This replaces the earlier “no webmaster account supplied” limitation in the October SEO notes.

Deployment update, 2 November at 13:12 Prague time: the favicon patch is now live via [PR #4](https://github.com/ZhyrovDmytro/najdikurty/pull/4). GitHub Pages [run 41442630437](https://github.com/ZhyrovDmytro/najdikurty/actions/runs/41442630437) succeeded for commit `3f3986c7efc8243f1ecd4c9779e3c3c8c732d22d`. Production `/favicon.ico` returns HTTP 200, `image/vnd.microsoft.icon`, and exactly matches the 5,231-byte source; its image decodes to 96×96. The production homepage includes the new icon link. This supersedes the prepared-only deployment status below; Search Console account actions remain pending.

## What needs action

1. **Remove the mistaken sitemap submission `https://hledejkurty.cz/padel-praha`.** Search Console reports “Sitemap is HTML”, one instance, zero discovered pages. This URL is a normal guide: one 301 to `/padel-praha/`, then HTML 200. Keep the guide published. In Sitemaps, open this submission → More options → Remove sitemap. Keep `https://hledejkurty.cz/sitemap.xml`: Google successfully read it on 1 November and discovered all 126 URLs. No new sitemap or resubmission is needed.
2. **Prioritize the eight Czech club URLs in the inspection queue.** All are present in the successful sitemap, linked in current HTML, and return indexable 200 pages. Start with Vestec, then Džus, Neride and Císařská louka because their English/legacy URLs already receive impressions. Inspect each canonical, test live, and request indexing if the live test succeeds and the canonical remains unindexed. Record the actual outcome rather than assuming a request guarantees indexing. Continue with Modřany, Plechovka, Satalice and The Court, then the remaining translated pages. Exact URLs are in `search-console/2026-11-02/indexing-queue.csv`.
3. **Favicon fix deployed and verified.** Google previously received repeated 404s at `/favicon.ico`. The patch adds a 96×96 ICO made from the existing Apple touch icon, declares it in the shared HTML template, and guards it in the SEO build validator. Production now returns HTTP 200. This fixes a real missing asset; it is not a proposed cure for the indexing backlog or low CTR.
4. **Keep the intentional redirects and duplicate canonical handling.** `http://hledejkurty.cz/` and `https://www.hledejkurty.cz/` should redirect. Old `?page=` / `?club=` routes should not become separate index targets. Their “failed validation” labels do not mean those duplicate URLs should be made indexable. Do not block them in robots.txt, remove translations, change every canonical to Czech, or repeatedly restart validation.
5. **Measure existing content changes before rewriting titles again.** The available performance window ends 31 October, while production HTML was updated on 1 November. Google has not yet indexed several Czech profiles. The historic data cannot evaluate those changes. After recrawling, compare the same queries, countries, device types and landing pages over complete periods; use impressions, CTR and booking click-outs together.

Account cleanup, indexing requests and outreach were prepared, not executed. The favicon deployment was subsequently completed as recorded above. The live URL test was read-only. No new recurring monitor was created.

## Performance baseline

Selecting the maximum 16-month range returned the same available history as the three-month view: **12 August–31 October 2026**, 81 daily rows. Reviewed all **289 disclosed web-query rows**, **59 web-page rows**, **70 country rows**, all three device rows, daily history and search appearance. CSV export was blocked by Chrome with `ERR_BLOCKED_BY_CLIENT`; these observations come from the rendered report tables, not a successful raw export. Saved baseline tables are transcribed from those tables. Query rows omit anonymized searches and must not be treated as all search activity.

| Search channel | Clicks | Impressions | CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| Web | 55 | 8,674 | 0.634% | 10.2 |
| Image | 8 | 913 | 0.9% | 26.4 |
| Video | 0 | 0 | — | — |
| News | 0 | 0 | — | — |

The exact web impression count is the sum of all daily rows and independently matches the device totals; the headline displays 8.67K. Image results were reviewed across all 122 disclosed queries and 26 landing pages. Do not add page-level impressions to obtain a property total: a search may show more than one URL from the property.

| Web period | Clicks | Impressions | Calculated CTR | Approximate position |
| --- | ---: | ---: | ---: | ---: |
| 12–31 August (partial month) | 4 | 1,349 | 0.297% | 13.07 |
| September | 25 | 3,659 | 0.683% | 10.00 |
| October | 26 | 3,666 | 0.709% | 9.25 |
| 6 September–3 October | 26 | 3,740 | 0.695% | 9.59 |
| 4–31 October | 23 | 3,170 | 0.726% | 9.23 |

The last 28 days have **11.5% fewer clicks** and **15.2% fewer impressions**, while CTR increased by 0.030 percentage points. Position also improved slightly. Positions in this table are reconstructed by weighting the already rounded daily positions by impressions, so they are approximate. Lower visibility is not evidence of a new technical failure, and these small click counts do not support a causal claim about a title, deployment or algorithm update.

### Highest-value landing pages

| Page | Clicks | Impressions | CTR | Position | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| `/clubs/` | 16 | 2,001 | 0.8% | 11.2 | Largest existing landing page; retain and monitor the recent directory improvements. |
| `/` | 10 | 151 | 6.6% | 19.7 | Good observed CTR on a small, mixed query sample; do not compare directly with branded club queries. |
| `/blog/the-court-opening/` | 9 | 393 | 2.3% | 6.3 | Existing article contributes useful traffic; preserve URL and relevant club links. |
| `/clubs/padel-prosek/` | 3 | 693 | 0.4% | 9.4 | High-impression profile; review its post-recrawl snippet and missing official tariff evidence. |
| `/en/clubs/padel-prosek/` | 1 | 655 | 0.2% | 9.3 | Compare language delivery after Czech indexing settles. |
| `/en/clubs/head-tenis-centrum-vestec/` | 0 | 1,057 | 0% | 10.4 | Highest-impression zero-click URL; Czech canonical remains unindexed in URL Inspection. |
| `/clubs/padel-radotin/` | 0 | 354 | 0% | 9.5 | Relevant commercial intent; existing verified tariff and booking information should be recrawled first. |
| `/en/clubs/padel-radotin/` | 0 | 326 | 0% | 9.2 | Keep reciprocal language links; investigate query/country-language combinations. |
| `/en/clubs/padel-dzus/` | 0 | 285 | 0% | 8.5 | Prioritize its Czech alternative for inspection. |
| `/clubs/padel-powers-smichov/` | 1 | 287 | 0.3% | 10.0 | Review current snippet after recrawl; do not invent new price/service claims. |

The directory, homepage and original article receive 35 of 55 web clicks (63.6%). The data is dominated by venue searches, where the official club may better satisfy a direct booking intent. Low CTR alone is not proof that the title is defective.

### Queries that should guide prioritization

| Disclosed query | Clicks | Impressions | Position | Next action |
| --- | ---: | ---: | ---: | --- |
| `padel prosek` | 1 | 893 | 9.4 | Monitor Czech profile and current snippet; confirm official price evidence when available. |
| `prosek padel` | 1 | 229 | 9.5 | Same profile; no duplicate keyword landing page. |
| `padel vestec` | 0 | 420 | 10.6 | Get Czech Vestec processed and monitor language selection. |
| `vestec padel` | 0 | 395 | 10.6 | Same action. |
| `padel radotin` | 0 | 276 | 9.6 | Monitor the existing Radotín profile and distinguish it from Olympia. |
| `padel radotín` | 0 | 161 | 9.6 | Same action; no accent-specific URL. |
| `padel cakovice` | 0 | 130 | 9.9 | Existing profile; tariff remains unverified in the earlier evidence ledger. |
| `the court padel` | 2 | 119 | 6.0 | Preserve relevant article and profile links. |
| `padel dubec` | 0 | 99 | 8.6 | Prioritize Czech Plechovka profile inspection. |
| `padel praha multisport` | 0 | 57 | 9.6 | Existing dedicated MultiSport guide is the right destination; do not create another. |
| `padel dzus rezervace` | 0 | 55 | 6.1 | Inspect Czech Džus and keep the official booking CTA clear. |
| `padel praha` | 0 | 52 | 33.1 | Broader competitive term; evaluate the existing Prague guide after discovery/indexing. |

The English Vestec page receiving impressions while Czech Vestec is unindexed is an observed mismatch, not proof that hreflang is broken. The live pages and sitemap contain reciprocal `cs`, `en`, `uk` and `x-default` alternates. Keep each translated page's self-canonical. Google's [localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions) supports this structure.

### Audience and other search surfaces

- Czechia: **54 clicks, 8,066 impressions**, 0.7% CTR, position 9.8. Greece supplies the remaining click. Prioritize Czech utility and Czech canonical discovery; geography does not prove a visitor's language.
- Mobile: **34 clicks / 5,893 impressions**, 0.6% CTR, position 9.4. Desktop: **20 / 2,758**, 0.7%, position 11.9. Tablet: **1 / 23**, 4.3%, position 9.3. Mobile represents 67.9% of web impressions. Device query mixes differ; this is not a controlled UX comparison.
- Web search appearance: **No data**. This does not imply missing breadcrumb markup: the separate enhancement report finds valid breadcrumbs.
- Generative AI features: **171 impressions**, 31 page rows, same available August–October period. Leading pages: directory 38, The Court article 33, homepage 21. This report showed impressions only; no click/CTR attribution is inferred and these impressions are not added to the web total.
- The Multimodal web filter returns **15 impressions, 0 clicks**, position 1.7, across five page rows (English One Padel 7, English Džus 4, Czech One Padel 2, Ukrainian One Padel 1 and legacy Džus 1). Keep it as a separate filter observation rather than adding overlapping filters to the web total.
- Image search is a secondary source: 8 clicks for the full period, 3 in the last 28 days. Preserve descriptive images/alt text and investigate rights/evidence separately; do not add schema or imagery merely to chase this small sample.

## Indexing: distinguish problems from expected exclusions

The Pages report was last updated **23 October**, predating the 1 November sitemap read and production update. It reports **62 indexed and 27 excluded URLs** out of 89 known URLs. The sitemap's 126 URLs, the Pages report's 89 known URLs, HTTPS's 31 URLs and breadcrumbs' 28 items are different populations and timestamps; their differences are not proof that pages are broken.

| Exclusion | Count | Validation shown | Assessment |
| --- | ---: | --- | --- |
| Discovered, currently not indexed | 17 | Started 23 August | Real canonical pages to inspect; eight are Czech club profiles. |
| Crawled, currently not indexed | 5 | Not started | All five are old query routes, not current clean-path profiles. |
| Page with redirect | 2 | Failed 5 September | Expected www/HTTP redirects. Keep them. |
| Alternate page with proper canonical | 2 | Failed 5 September | Expected old query-route duplicates. Keep canonical consolidation. |
| Redirect error | 1 | Started 2 September | Old no-slash One Padel URL; last crawled 22 August. Current HTTP check is one 301 then 200. |
| Google selected different canonical | 0 | N/A | No current affected URLs reported. |

### All 17 discovered URLs

Czech club paths: `/clubs/cisarska-louka-padel/`, `/clubs/head-tenis-centrum-vestec/`, `/clubs/ltc-modrany-2005/`, `/clubs/padel-dzus/`, `/clubs/padel-neride/`, `/clubs/plechovka-dubec/`, `/clubs/sk-satalice/`, `/clubs/the-court/`.

Other paths: `/en/blog/the-court-opening/`, `/en/clubs/ltc-modrany-2005/`, `/en/clubs/plechovka-dubec/`, `/en/clubs/sk-satalice/`, `/en/cookie-policy/`, `/ua/blog/`, `/ua/clubs/ltc-modrany-2005/`, `/ua/clubs/plechovka-dubec/`, `/ua/clubs/the-court/`.

All examples show no recorded crawl date. **Czech Vestec was separately inspected on 2 November:** the index record says “URL is unknown to Google”, with no recorded referring sitemap or crawl. The live smartphone test, at 12:56 Prague time, says **URL is available to Google / page can be indexed**, fetch successful, crawling and indexing allowed, correct user canonical and one valid breadcrumb. Google-selected canonical is determined only after indexing. Preserve this distinction: neither successful live fetch nor sitemap submission proves indexing.

### Legacy and redirect URLs

Crawled exclusions: `/?club=one-padel`, `/?club=padel-neride`, `/?club=head-tenis-centrum-vestec`, `/?club=padel-prosek`, `/?page=about`. Alternate-canonical exclusions: `/?page=all-clubs` and `/?club=sk-slavia-praha-padel`. Redirect exclusions: `https://www.hledejkurty.cz/` and `http://hledejkurty.cz/`. Redirect-error example: `/clubs/one-padel`.

The static host cannot perform query-aware HTTP redirects from a repository `_redirects` file. The old query URLs serve the homepage's initial canonical before the client resolves the legacy route and updates metadata. This is a known consolidation limitation, not a reason to publish duplicate pages. If old routes continue to receive material impressions after the clean URLs are recrawled, the complete server fix is an edge/host redirect mapping allow-listed club and page aliases to their canonical paths, preserving supported date/filter behavior. That requires a hosting decision; no ineffective redirect file or JavaScript-only SEO workaround was added here.

## Crawl, security and experience

| Report | Observed result | Action |
| --- | --- | --- |
| Crawl stats, updated 31 October | 747 requests, 48.7M bytes, 77 ms average response; both hosts “No problems” | No evidence for a server capacity or crawl-rate change. This is fetch latency, not page LCP. |
| Crawl responses | 88% 200, 6% 304, 3% 404, 2% 301 (rounded) | Inspect actual 404 examples instead of treating every 404 as harmful. |
| Crawl purpose | 90% refresh, 10% discovery | Consistent with limited new-page discovery; does not establish a crawl-budget penalty. |
| robots.txt | All files valid in Settings; production permits crawling and names the correct sitemap | Retain. |
| HTTPS, updated 1 November | 31 HTTPS, 0 non-HTTPS; no issues in 90 days | Retain existing HTTPS redirects. |
| Breadcrumbs, updated 1 November | 28 valid, 0 invalid | No schema repair required from this evidence. |
| Core Web Vitals, updated 1 November | Insufficient usage data in 90 days on mobile and desktop | Neither a pass nor a fail. Use separately scoped lab testing when prioritizing performance work. |
| Manual actions | No issues detected | No reconsideration request. |
| Security issues | No issues detected | No security remediation indicated by this report. |
| Removals | No requests in the last six months in Temporary removals, Outdated content or SafeSearch filtering | No accidental removal request found in the available history. |
| Links | 0 reported external links; 296 internal links | Seek useful, relevant mentions after evidence/relationship checks; no paid links, fabricated reviews or unrequested outreach. Zero reported links does not prove zero links exist. |
| Ownership | Verified owner; property added 13 August | No new verification needed. |

The 404 drilldown reports 25 requests and offers 22 example rows: 13 requests for `/favicon.ico`, eight Apple association probes across `/apple-app-site-association` and `/.well-known/apple-app-site-association`, and one old hashed asset `/assets/index-pbgBXA7f.js` on 4 October. Do not pretend the 22 examples cover all 25 requests. This web project has no iOS Universal Links requirement; returning 404 for those association files is appropriate. A superseded build asset can legitimately disappear; the current production HTML must reference existing assets. Current hashed JS/CSS references were checked separately.

## Prepared patch and verification

Scope: `apps/web/public/favicon.ico`, the shared `apps/web/index.html` template and `apps/web/scripts/validate-seo-build.mjs`. The generator already copies template head metadata to every generated page, and Vite copies public assets; no routing, scraper, database, user data or new dependency changes are required. The icon uses the existing 180×180 Apple touch icon as source, resized to 96×96 and stored as a PNG-compressed ICO. Existing 16/32 PNG and Apple icons remain.

Google supports ICO favicons and recommends a square icon larger than 48px: [official favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search). Existing smaller icons are not described as invalid. Adding the root asset resolves the observed 404 and provides a larger explicit alternative; search-result display is still Google's choice.

- Before the fix, the new build regression check failed with “Missing or unreadable /favicon.ico fallback”.
- A deliberate invalid ICO-header mutation also failed validation; the original built asset was restored and validation passed.
- After the fix, `npm run build -w @mamekurt/web` passed, including TypeScript and SEO validation for all 126 canonical pages. The existing >500 kB Vite advisory remains.
- `npm test -w @mamekurt/web`: 65 tests passed across 13 files.
- Local production preview serves `/favicon.ico` as HTTP 200, `image/x-icon`, 5,231 bytes; served bytes match the source. Embedded PNG independently decodes to 96×96.
- Chrome opens the preview asset as `favicon.ico (96×96)`.
- Live crawl of all 126 sitemap URLs: all HTTP 200, no redirect destinations, matching self-canonical, indexable meta robots, exactly one H1 and all four expected alternates. See `search-console/2026-11-02/live-crawl.json` and the saved production sitemap. This is an HTTP/HTML check, not Google's index state.
- The source icon and generated favicon were inspected; the patch retains the current brand mark. No image generation was used.

## After deployment / account cleanup

1. Verify production `/favicon.ico` returns 200 with an icon content type and confirm the homepage links it.
2. Remove only the erroneous HTML sitemap submission; verify the correct XML sitemap still shows Success and 126 discovered pages. This removes a report submission, not the guide or its search visibility.
3. Work the inspection queue. Start with the eight Czech profiles, followed by the already published Prague/MultiSport/price/indoor guides if they are still unknown, then translations. Avoid spending request quota on policy pages or legacy duplicates first.
4. After roughly one to two weeks, inspect actual crawl/index changes. Compare the baseline against complete matching periods once enough post-recrawl data exists; low volume may require longer. Do not attribute a two-day fluctuation to the patch.
5. If a Czech page remains unindexed despite successful fetches, review its indexed/crawled content, Google-selected canonical, visible language, internal anchors and unique evidence. Existing unverified tariffs should be resolved with official evidence before making stronger pricing claims.
6. Keep the current guides and source-backed profiles useful; pursue relevant club/association mentions only with separately authorized communication. Do not create more thin district or keyword-variant pages from this dataset.

Google's [Page indexing documentation](https://support.google.com/webmasters/answer/7440203) explains why duplicates/redirects can correctly remain excluded, why live inspection differs from index state, and why indexing is not guaranteed.

Not checked: a full raw account export (browser blocked download), every URL's individual Google index record, lab performance, Bing/Seznam, club price re-verification or private analytics conversion attribution. The favicon deployment is complete; no Search Console account mutation was performed.
