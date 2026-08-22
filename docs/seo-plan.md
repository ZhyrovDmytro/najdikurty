# HLEDEJKURTY SEO Audit And Action Plan

Last updated: 2026-08-22

## Current Site Snapshot

HLEDEJKURTY is a Vite/React single-page app for finding padel court availability around Prague. Production is configured for the custom domain `https://hledejkurty.cz` via `apps/web/public/CNAME`, with GitHub Pages deployment in `.github/workflows/deploy-pages.yml`.

The app exposes these crawlable views through stable path routes:

- `/` for the main availability finder.
- `/clubs/` for the club directory.
- `/clubs/<club-slug>/` for club detail canonicals.
- `/about/`, `/privacy-policy/`, `/terms-of-use/`, and `/cookie-policy/`.

The previous query-string routes remain compatible for existing links, but canonical metadata and all new internal links point to the stable paths.

Google can render JavaScript, but the initial HTML still matters for discovery, sharing, and resilience. Google Search Central recommends crawlable resources, descriptive titles and snippets, sitemaps for important URLs, canonical handling for duplicates, and validation of structured data with Search Console and Rich Results Test.

References:

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags)
- [Google image SEO best practices](https://developers.google.com/search/docs/appearance/google-images)
- [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google structured data with JavaScript](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript)

## Audit Findings

### Critical findings resolved

- Every sitemap URL now has generated initial HTML with a unique title, description, canonical, social metadata, visible `h1`, internal links, and JSON-LD before JavaScript runs.
- `robots.txt` permits crawling and declares the production sitemap.
- The sitemap contains only canonical stable paths, not date filters or query-string routes.
- A build validation step checks every canonical page and fails deployment on missing or duplicate SEO signals.

### High findings resolved

- Static pages and each club now receive distinct initial metadata and page content.
- Date/filter variants canonicalize to the corresponding stable page without the date parameter.
- Internal navigation uses descriptive path routes while preserving the SPA experience.
- Club images had descriptive filenames, but image `alt` text was generic and image elements did not provide intrinsic dimensions.
- The directory and club summaries are present in the generated HTML and then hydrated by React.

### Medium

- Large PNG assets, including several multi-megabyte club images, can hurt LCP and mobile performance.
- The app supports English, Czech, and Ukrainian, but language selection is handled through local storage rather than crawlable localized URLs.
- Search Console must be revalidated after the path-route build is deployed; indexing is controlled by Google and is not immediate.
- There is no Search Console verification or deployment-time sitemap freshness automation in the repo.

### Low

- Footer and navigation links are crawlable anchors, which is good.
- Legal pages are present, which helps trust, but the operator identity could become stronger once the production entity is final.
- Analytics exists through PostHog, but no SEO dashboard or Search Console workflow is documented yet.

## Implemented

- Added base SEO metadata to `apps/web/index.html`:
  - Unique title.
  - Meta description.
  - Canonical URL.
  - Robots directive.
  - Theme color.
  - Open Graph and Twitter card tags.
  - Apple touch icon.
- Added `apps/web/public/robots.txt` with a sitemap directive.
- Added `apps/web/public/sitemap.xml` with the home page, directory, legal/about pages, and all stable club detail URLs.
- Added dynamic SPA metadata in `apps/web/src/main.tsx`:
  - Per-page title and description.
  - Stable canonical URLs.
  - Per-club social image.
  - Open Graph and Twitter updates.
  - JSON-LD graph for `WebSite`, `WebApplication`, `WebPage`, `ItemList`, `BreadcrumbList`, and `SportsActivityLocation` club details.
- Added visible, localized home-page `h1` and intro copy.
- Promoted club detail page heading from `h2` to `h1`.
- Improved club image `alt` text and added intrinsic width/height hints.
- Added localized home-page copy in English, Czech, and Ukrainian.
- Added stable trailing-slash routes for the home, directory, club, about, privacy, terms, and cookie pages.
- Added build-time prerendering for all 20 canonical URLs and a matching `404.html` fallback.
- Regenerated the sitemap on every production build using the build date.
- Added a deployment-time SEO validator covering sitemap parity, robots directives, canonical/OG URLs, unique titles, descriptions, initial headings, non-empty server HTML, social images, and valid JSON-LD.

## Target Search Intent

Primary commercial/local intent:

- `padel Praha`
- `padelové kurty Praha`
- `volné padelové kurty Praha`
- `rezervace padel Praha`
- `padel courts Prague`
- `padel court booking Prague`

Secondary modifiers:

- indoor padel Prague
- outdoor padel Prague
- Multisport padel Prague
- cheap padel Prague
- padel court near me Prague
- club-specific searches, for example `Padel Prosek volné časy`, `Padel Neride rezervace`, `SK Slavia Praha padel`.

## Prioritized Roadmap

### Phase 1: Technical SEO Foundation

Status: mostly implemented.

- Keep `robots.txt` permissive for public content.
- Keep `sitemap.xml` synced with every indexable page.
- Submit `https://hledejkurty.cz/sitemap.xml` in Google Search Console.
- Verify the home page and 2-3 club pages in URL Inspection after deployment.
- Validate structured data in Rich Results Test.
- Watch the Page Indexing report for duplicate/canonical issues.

### Phase 2: URL And Rendering Improvements

Status: implemented for the existing default-language routes.

- Path routes:
  - `/`
  - `/clubs`
  - `/clubs/padel-prosek`
  - `/about`
  - `/privacy-policy`
  - `/terms-of-use`
  - `/cookie-policy`
- Canonical compatibility is kept for current query URLs. True HTTP redirects for those legacy query URLs require edge/hosting redirect support and should be added if hosting moves to a platform that supports query-based redirect rules.
- Add crawlable localized routes:
  - `/cs/`
  - `/en/`
  - `/uk/`
  - `/cs/clubs/padel-prosek`, etc.
- Add `hreflang` tags once localized URLs exist.
- Build-time prerendering is enabled for all directory, club, informational, and legal URLs.

### Phase 3: Content Expansion

Recommended after path routing or prerendering.

- Add an indexable club detail content block for every club:
  - address and district.
  - number of indoor/outdoor courts.
  - price summary.
  - Multisport support.
  - phone/contact.
  - how booking works.
  - nearest public transport or parking if available and verified.
- Add category pages:
  - `/clubs/indoor-padel-prague`
  - `/clubs/outdoor-padel-prague`
  - `/clubs/multisport-padel-prague`
  - `/clubs/cheap-padel-prague`
- Add a concise FAQ section on the home or about page:
  - how availability is checked.
  - whether booking happens on HLEDEJKURTY.
  - how often data updates.
  - what to do when a club cannot be checked.
- Add Czech-first copy if the strategic market is local Czech search. English can remain strong, but Czech should become the primary crawlable version.

### Phase 4: Performance And Image SEO

Recommended before aggressive content scaling.

- Convert large PNG club photos to AVIF/WebP with PNG fallback only where needed.
- Generate responsive image sizes for list cards and detail pages.
- Preload only the likely LCP image when a club detail page is opened directly.
- Add an automated image size budget in CI.
- Run Lighthouse on mobile after deployment and track:
  - LCP.
  - CLS.
  - INP.
  - total JavaScript.
  - image transfer size.

### Phase 5: Authority, Trust, And Measurement

- Set up Google Search Console for `hledejkurty.cz`.
- Submit sitemap and inspect representative URLs.
- Create a monthly SEO dashboard:
  - impressions.
  - clicks.
  - CTR.
  - average position.
  - indexed pages.
  - top queries.
  - top landing pages.
- Add public contact/operator details when business ownership is finalized.
- Ask listed clubs for backlinks from their websites if they are comfortable being included.
- Add a changelog or data freshness explanation if users need confidence in availability accuracy.

## Validation Checklist

Run locally before shipping SEO changes:

```bash
npm run build -w @mamekurt/web
npm test -w @mamekurt/web
```

After deployment:

- Open `https://hledejkurty.cz/robots.txt`.
- Open `https://hledejkurty.cz/sitemap.xml`.
- Inspect `https://hledejkurty.cz/` in Search Console.
- Inspect at least one club URL, for example `https://hledejkurty.cz/clubs/padel-prosek/`.
- Test structured data with Rich Results Test.
- Test a social preview with Open Graph/Twitter card tooling.

## Definition Of Done For Strong SEO

- Every indexable page has one canonical URL, one descriptive title, one useful meta description, and one visible `h1`.
- Important pages are listed in the sitemap.
- Duplicate filter/date URLs canonicalize to stable pages.
- Club pages expose crawlable facts without depending solely on API availability.
- Localized versions have dedicated URLs and `hreflang`.
- Image assets are responsive, compressed, and have useful `alt` text.
- Search Console confirms pages are indexed and no structured-data or canonical issues are growing.
