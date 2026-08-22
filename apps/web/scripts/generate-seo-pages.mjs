import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://hledejkurty.cz";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const template = await readFile(path.join(distDir, "index.html"), "utf8");

const clubs = [
  { slug: "tk-sparta-praha", name: "TK Sparta Prague", address: "Za Císařským mlýnem 1115/2, Praha 7-Bubeneč", courts: "2 outdoor courts", price: "520–580 Kč per hour on weekdays and 540 Kč on weekends", multisport: true },
  { slug: "padel-prosek", name: "Padel Prosek", address: "Lovosická 559, Praha 9-Střížkov", courts: "4 outdoor courts", price: "600 Kč per hour on weekdays and 480 Kč on weekends", multisport: true },
  { slug: "padel-club-spoje", name: "Padel Club Spoje", address: "Na Balkáně 990/21A, Praha 3", courts: "2 outdoor courts", price: "480–520 Kč per hour", multisport: false },
  { slug: "tenis-a-padel-klub-pisecna", name: "Tenis & Padel klub Písečná", address: "K Sadu 590/1, Praha 8-Troja", courts: "2 indoor and 2 outdoor courts", price: "540–640 Kč per hour", multisport: false },
  { slug: "sk-slavia-praha-padel", name: "SK Slavia Praha Padel", address: "Vladivostocká 1460/10, Praha 10", courts: "4 outdoor courts", price: "550–690 Kč per hour", multisport: false },
  { slug: "head-tenis-centrum-vestec", name: "Head Tenis Centrum, Vestec", address: "Sportovní 456, Vestec-Jesenice u Prahy", courts: "4 indoor courts", price: "750–900 Kč per hour", multisport: true },
  { slug: "padel-radotin", name: "Padel Radotín", address: "Šárovo kolo 932/1, Praha 16", courts: "3 outdoor courts", price: "560–640 Kč per hour on weekdays", multisport: true },
  { slug: "padel-cakovice", name: "Padel Čakovice", address: "Jizerská 328/4, Praha-Čakovice", courts: "2 indoor courts", price: "Price is not currently published", multisport: false },
  { slug: "padel-neride", name: "Padel Neride", address: "V Chotejně 700, Praha 15", courts: "3 indoor courts", price: "Published seasonal prices from 420 Kč per hour", multisport: true },
  { slug: "padel-dzus", name: "Padel Džus", address: "U Továren 999/31, Praha 15-Hostivař", courts: "4 indoor courts", price: "650–900 Kč per hour", multisport: true },
  { slug: "padel-powers-smichov", name: "Padel Powers Smíchov", address: "Křížová 6, Praha 5-Smíchov", courts: "8 indoor courts", price: "800–900 Kč per hour", multisport: true },
  { slug: "one-padel", name: "One Padel", address: "Ringhofferova 115, Praha 17-Zličín", courts: "9 indoor courts", price: "Published prices from 850 Kč per hour", multisport: false },
  { slug: "cisarska-louka-padel", name: "Císařská louka Padel", address: "Areál Císařská louka, Praha 5-Smíchov", courts: "3 outdoor courts", price: "690–850 Kč per hour", multisport: true },
  { slug: "sk-satalice", name: "SK Satalice", address: "Budovatelská 12, Praha-Satalice", courts: "2 outdoor courts", price: "590 Kč per hour on weekdays and 540 Kč on weekends", multisport: false }
];

const staticPages = [
  {
    path: "/",
    title: "Find free padel courts in Prague | HLEDEJKURTY",
    description: "Find free padel courts in Prague. Compare current availability, prices, indoor and outdoor courts, Multisport support, and official booking links.",
    h1: "Find free padel courts in Prague",
    body: "Search regularly updated padel court availability across supported clubs in Prague, then complete your reservation in the club's official booking system."
  },
  {
    path: "/clubs/",
    title: "Padel clubs in Prague | HLEDEJKURTY",
    description: "Browse padel clubs in Prague with addresses, court counts, indoor or outdoor facilities, published prices, Multisport information, and booking links.",
    h1: "All clubs",
    body: "Compare tracked padel clubs around Prague and open a detailed page for court information, prices, availability, and official booking links."
  },
  {
    path: "/about/",
    title: "About the Prague padel court finder | HLEDEJKURTY",
    description: "Learn how HLEDEJKURTY collects and presents padel court availability for supported clubs in Prague and how to confirm a booking.",
    h1: "Find a free padel court without opening every booking system.",
    body: "HLEDEJKURTY regularly gathers padel availability from supported club booking systems around Prague. Search the latest saved results for today and the next seven days by date, duration, court count, time window, and indoor or outdoor preference."
  },
  {
    path: "/privacy-policy/",
    title: "Privacy Policy | HLEDEJKURTY",
    description: "Read the HLEDEJKURTY privacy policy, including browser preferences, analytics, infrastructure logs, and visitor rights.",
    h1: "Privacy Policy",
    body: "HLEDEJKURTY does not create visitor accounts, take payments, or accept court bookings. This policy explains the limited technical data used to operate and improve the service."
  },
  {
    path: "/terms-of-use/",
    title: "Terms of Use | HLEDEJKURTY",
    description: "Read the terms for using HLEDEJKURTY and the limitations of third-party padel availability, prices, and booking links.",
    h1: "Terms of Use",
    body: "HLEDEJKURTY helps visitors discover possible court times but does not sell, reserve, or confirm bookings. The official club system remains the final source."
  },
  {
    path: "/cookie-policy/",
    title: "Cookie Policy | HLEDEJKURTY",
    description: "Learn about browser storage, functional preferences, analytics, and third-party booking websites used with HLEDEJKURTY.",
    h1: "Cookie Policy",
    body: "This policy explains the browser storage used for interface preferences and analytics, plus the separate cookie rules that may apply on external booking websites."
  }
];

const pages = [
  ...staticPages,
  ...clubs.map((club) => ({
    path: `/clubs/${club.slug}/`,
    title: `${club.name} padel court Prague | HLEDEJKURTY`,
    description: `${club.name}: ${club.courts} in Prague. Check the address, published prices, current availability, and the official booking link.`,
    h1: club.name,
    body: `${club.name} is a padel club at ${club.address}. It has ${club.courts}. ${club.price}. ${club.multisport ? "The club publishes Multisport support." : "Check accepted payment methods with the club."}`,
    club
  }))
];

for (const page of pages) {
  const html = renderPage(page);
  const outputPath = page.path === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, page.path.replace(/^\//, ""), "index.html");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

await writeFile(path.join(distDir, "404.html"), renderPage(staticPages[0]));
await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(pages));

function renderPage(page) {
  const canonicalUrl = new URL(page.path, SITE_ORIGIN).toString();
  const imageUrl = page.club
    ? `${SITE_ORIGIN}/clubs/optimized/${page.club.slug}-1200.webp`
    : `${SITE_ORIGIN}/logo.png`;
  const structuredData = buildStructuredData(page, canonicalUrl, imageUrl);
  let html = template;
  html = replaceTagContent(html, "title", page.title);
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:url", canonicalUrl);
  html = replaceMeta(html, "property", "og:image", imageUrl);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", imageUrl);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`);
  html = html.replace("</head>", `<script id="seo-structured-data" type="application/ld+json">${safeJson(structuredData)}</script>\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${renderVisibleContent(page)}</div>`);
  return html;
}

function renderVisibleContent(page) {
  const clubLinks = clubs.map((club) => `<li><a href="/clubs/${escapeAttribute(club.slug)}/">${escapeHtml(club.name)}</a><span>${escapeHtml(club.courts)} · ${escapeHtml(club.address)}</span></li>`).join("");
  const relatedLinks = page.path === "/" || page.path === "/clubs/"
    ? `<ul class="seoPrerenderClubs">${clubLinks}</ul>`
    : page.club
      ? '<p><a href="/clubs/">Compare all padel clubs in Prague</a></p>'
      : '<p><a href="/clubs/">Browse padel clubs in Prague</a></p>';
  return `<main class="seoPrerender">
    <a class="seoPrerenderBrand" href="/">HLEDEJKURTY</a>
    <article>
      <h1>${escapeHtml(page.h1)}</h1>
      <p>${escapeHtml(page.body)}</p>
      ${relatedLinks}
    </article>
  </main>`;
}

function buildStructuredData(page, canonicalUrl, imageUrl) {
  const graph = [
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, name: "HLEDEJKURTY", url: `${SITE_ORIGIN}/` },
    { "@type": "WebPage", "@id": `${canonicalUrl}#webpage`, name: page.title, description: page.description, url: canonicalUrl, image: imageUrl, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } }
  ];
  if (page.club) {
    graph.push({
      "@type": "SportsActivityLocation",
      "@id": `${canonicalUrl}#club`,
      name: page.club.name,
      address: { "@type": "PostalAddress", streetAddress: page.club.address, addressLocality: "Praha", addressCountry: "CZ" },
      amenityFeature: { "@type": "LocationFeatureSpecification", name: page.club.courts, value: true },
      image: imageUrl,
      url: canonicalUrl
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function buildSitemap(values) {
  const lastModified = new Date().toISOString().slice(0, 10);
  const urls = values.map((page) => `  <url>\n    <loc>${escapeXml(new URL(page.path, SITE_ORIGIN).toString())}</loc>\n    <lastmod>${lastModified}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function replaceTagContent(html, tag, value) {
  return html.replace(new RegExp(`<${tag}>[^<]*</${tag}>`), `<${tag}>${escapeHtml(value)}</${tag}>`);
}

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapeRegExp(key)}")[^>]*>`, "i");
  return html.replace(pattern, (tag) => tag.replace(/content="[^"]*"/i, `content="${escapeAttribute(value)}"`));
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
