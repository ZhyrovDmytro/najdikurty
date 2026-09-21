import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://hledejkurty.cz";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const distDir = path.join(appDir, "dist");
const sitemap = await readFile(path.join(distDir, "sitemap.xml"), "utf8");
const robots = await readFile(path.join(distDir, "robots.txt"), "utf8");
const notFound = await readFile(path.join(distDir, "404.html"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapDates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
const errors = [];
const titles = new Map();
const appSource = await readFile(path.join(appDir, "src/main.tsx"), "utf8");
const sourceClubSlugs = new Set([...appSource.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]));
const sourceClubs = new Map([...appSource.matchAll(/slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?address:\s*"([^"]+)"[\s\S]*?courtCount:\s*(\d+)/g)].map((match) => [match[1], { name: match[2], address: match[3], courtCount: Number(match[4]) }]));
const expectedLocationCount = (8 + sourceClubSlugs.size) * 3;

check(locations.length === expectedLocationCount, `Expected ${expectedLocationCount} sitemap URLs, found ${locations.length}`);
check(new Set(locations).size === locations.length, "Sitemap contains duplicate URLs");
check(sourceClubs.size === sourceClubSlugs.size, "Could not read every club's SEO facts from the app catalog");
check(sitemapDates.length === locations.length, "Every sitemap URL must have one lastmod value");
check(sitemapDates.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)), "Sitemap lastmod values must use YYYY-MM-DD");
check(!sitemapDates.some((value) => value > new Date().toISOString().slice(0, 10)), "Sitemap contains a future lastmod value");
check(robots.includes("User-agent: *"), "robots.txt is missing the general user-agent rule");
check(robots.includes("Allow: /"), "robots.txt does not allow the public site");
check(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`), "robots.txt has the wrong sitemap URL");
check(!/^\s*Disallow:/m.test(robots), "robots.txt unexpectedly blocks crawling");
check(/<meta name="robots" content="noindex,follow"\s*\/>/.test(notFound), "404 fallback must be noindex,follow");
check(
  appSource.includes('setMetaTag("name", "robots", isIndexablePath(window.location.pathname) ? "index,follow" : "noindex,follow")'),
  "The client must preserve noindex on unknown and malformed paths"
);
check(!appSource.includes('segments[0] === "news"'), "The removed /news/ alias must not render indexable content on the 404 shell");

for (const location of locations) {
  const url = new URL(location);
  check(url.origin === SITE_ORIGIN, `Wrong sitemap origin: ${location}`);
  check(!url.search && !url.hash, `Sitemap URL is not canonical: ${location}`);
  check(url.pathname.endsWith("/"), `Canonical path needs a trailing slash: ${location}`);

  const htmlPath = url.pathname === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, url.pathname.replace(/^\//, ""), "index.html");
  let html;
  try {
    html = await readFile(htmlPath, "utf8");
  } catch {
    errors.push(`Missing generated HTML for ${location}`);
    continue;
  }

  const title = match(html, /<title>([^<]+)<\/title>/i);
  const description = metaContent(html, "name", "description");
  const canonical = match(html, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/>/i);
  const htmlLanguage = match(html, /<html\s+lang="([^"]+)"/i);
  const hreflangs = new Map([...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/gi)].map((entry) => [entry[1], entry[2]]));
  const ogUrl = metaContent(html, "property", "og:url");
  const ogImageAlt = metaContent(html, "property", "og:image:alt");
  const h1Count = (html.match(/<h1(?:\s[^>]*)?>/gi) ?? []).length;
  const h2Count = (html.match(/<h2(?:\s[^>]*)?>/gi) ?? []).length;
  const structuredData = match(html, /<script id="seo-structured-data" type="application\/ld\+json">([^<]+)<\/script>/i);
  const stylesheetHref = match(html, /<link rel="preload" as="style" href="([^"]+\.css)"/i);
  const criticalCss = match(html, /<style id="critical-css">([^<]+)<\/style>/i);
  const initialContent = match(html, /<div id="root">([\s\S]*)<\/div>\s*<\/body>/i);
  const initialWordCount = initialContent.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const languagePrefix = url.pathname.match(/^\/(en|ua)(?:\/|$)/)?.[1] ?? "cs";
  const expectedLanguage = languagePrefix === "en" ? "en" : languagePrefix === "ua" ? "uk" : "cs";
  const expectedLanguageHome = new URL(languagePrefix === "cs" ? "/" : `/${languagePrefix}/`, SITE_ORIGIN).toString();
  const basePath = url.pathname.replace(/^\/(?:en|ua)(?=\/)/, "") || "/";
  const localizedUrl = (prefix) => new URL(prefix ? `${prefix}${basePath}` : basePath, SITE_ORIGIN).toString();
  const isAuditedContentPage = /^(?:\/(?:en|ua))?\/$/.test(url.pathname) || /^(?:\/(?:en|ua))?\/clubs\/$/.test(url.pathname) || /^(?:\/(?:en|ua))?\/clubs\/[^/]+\/$/.test(url.pathname);

  check(Boolean(title), `${location} has no title`);
  check(Boolean(description), `${location} has no meta description`);
  check(description.length >= 70 && description.length <= 180, `${location} description length is ${description.length}`);
  check(canonical === location, `${location} canonical is ${canonical || "missing"}`);
  check(htmlLanguage === expectedLanguage, `${location} html language is ${htmlLanguage || "missing"}`);
  check(hreflangs.get("cs") === localizedUrl(""), `${location} has a wrong Czech alternate`);
  check(hreflangs.get("en") === localizedUrl("/en"), `${location} has a wrong English alternate`);
  check(hreflangs.get("uk") === localizedUrl("/ua"), `${location} has a wrong Ukrainian alternate`);
  check(hreflangs.get("x-default") === localizedUrl(""), `${location} has a wrong x-default alternate`);
  check(ogUrl === location, `${location} Open Graph URL is ${ogUrl || "missing"}`);
  check(Boolean(ogImageAlt), `${location} has no Open Graph image description`);
  check(h1Count === 1, `${location} has ${h1Count} initial HTML h1 elements`);
  check(!html.includes('<div id="root"></div>'), `${location} has an empty initial app shell`);
  check(Boolean(stylesheetHref), `${location} does not preload the full stylesheet`);
  check(html.includes(`<noscript><link rel="stylesheet" href="${stylesheetHref}"></noscript>`), `${location} has no stylesheet fallback without JavaScript`);
  check(criticalCss.length > 0 && criticalCss.length < 5000, `${location} has missing or oversized critical CSS`);

  if (isAuditedContentPage) {
    check(html.includes('<nav class="seoPrerenderNav"'), `${location} has no initial semantic navigation`);
    check(h2Count >= 3, `${location} has only ${h2Count} initial HTML h2 elements`);
    check(initialWordCount >= 120, `${location} has only ${initialWordCount} visible initial words`);
  }

  if (stylesheetHref) {
    try {
      await access(path.join(distDir, stylesheetHref.replace(/^\//, "")));
    } catch {
      errors.push(`${location} references a missing stylesheet: ${stylesheetHref}`);
    }
  }

  if (title) {
    if (titles.has(title)) errors.push(`Duplicate title on ${locations[titles.get(title)]} and ${location}: ${title}`);
    titles.set(title, locations.indexOf(location));
  }

  try {
    const data = JSON.parse(structuredData);
    check(data["@context"] === "https://schema.org", `${location} has an invalid structured-data context`);
    check(Array.isArray(data["@graph"]), `${location} structured data has no graph`);
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [];
    const article = graph.find((item) => item["@type"] === "Article");
    const breadcrumb = graph.find((item) => item["@type"] === "BreadcrumbList");
    const clubSchema = graph.find((item) => item["@type"] === "SportsActivityLocation");
    const clubSlug = url.pathname.match(/^\/(?:en\/|ua\/)?clubs\/([^/]+)\/$/)?.[1];
    if (clubSlug) {
      const sourceClub = sourceClubs.get(decodeURIComponent(clubSlug));
      check(Boolean(sourceClub), `${location} has no matching app catalog entry`);
      check(clubSchema?.name === sourceClub?.name, `${location} club name disagrees with the app catalog`);
      check(clubSchema?.address?.streetAddress === sourceClub?.address, `${location} club address disagrees with the app catalog`);
    }
    if (url.pathname.includes("/blog/") && !url.pathname.endsWith("/blog/")) {
      check(Boolean(article?.author?.name), `${location} article has no author`);
      check(Boolean(article?.publisher?.name), `${location} article has no publisher`);
      check(Boolean(article?.publisher?.logo?.url), `${location} article publisher has no logo`);
      check(Boolean(article?.dateModified), `${location} article has no modification date`);
    }
    if (url.pathname !== "/" && url.pathname !== "/en/" && url.pathname !== "/ua/") {
      const items = breadcrumb?.itemListElement ?? [];
      check(items.length >= 2, `${location} has no useful breadcrumb structured data`);
      check(items[0]?.item === expectedLanguageHome, `${location} breadcrumb starts at the wrong language home`);
      check(items.at(-1)?.item === location, `${location} breadcrumb does not end at its canonical URL`);
    }
  } catch {
    errors.push(`${location} has invalid JSON-LD`);
  }

  const image = metaContent(html, "property", "og:image");
  if (image?.startsWith(`${SITE_ORIGIN}/`)) {
    const imagePath = new URL(image).pathname.replace(/^\//, "");
    try {
      await access(path.join(distDir, imagePath));
    } catch {
      errors.push(`${location} references a missing social image: ${image}`);
    }
  }
}

const sitemapClubSlugs = new Set(locations.flatMap((location) => {
  const match = new URL(location).pathname.match(/^\/clubs\/([^/]+)\/$/);
  return match ? [decodeURIComponent(match[1])] : [];
}));
check(sameSet(sourceClubSlugs, sitemapClubSlugs), "Sitemap club pages do not match the club catalog");

if (errors.length > 0) {
  console.error(`SEO validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${locations.length} canonical pages.`);

function check(condition, message) {
  if (!condition) errors.push(message);
}

function match(value, pattern) {
  return value.match(pattern)?.[1]?.trim() ?? "";
}

function metaContent(html, attribute, key) {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapeRegExp(key)}")[^>]*>`, "i"))?.[0] ?? "";
  return tag.match(/content="([^"]*)"/i)?.[1]?.trim() ?? "";
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
