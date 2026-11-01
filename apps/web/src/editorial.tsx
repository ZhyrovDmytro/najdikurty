import React from "react";
import { ArrowRight } from "lucide-react";
import { ArticleLayout } from "./article-layout";
import articleImages from "./article-images.json";
import priceChecksData from "./club-price-checks.json";
import { lowestPrice } from "./pricing";
import { czechCourtCount } from "./club-presentation";
import clubs from "./club-facts.json";
import sourceData from "./club-sources.json";
import pages from "./editorial-content.json";
import english from "./editorial-en.json";
import ukrainian from "./editorial-ua.json";
import copy from "./editorial-copy.json";
import translatedPrices from "./editorial-prices.json";
import sourceLabels from "./editorial-source-labels.json";
import { type LanguageCode } from "./i18n";
import { distanceInKilometers } from "./distance";

export const EDITORIAL_DATE = "2026-10-31";
type ArticleCopy = Pick<typeof pages[number], "title" | "description" | "intro" | "sections">;
const translations: Record<"en" | "ua", Record<string, ArticleCopy>> = { en: english, ua: ukrainian };
export const EDITORIAL_PAGES = (["cz", "en", "ua"] as const).flatMap(language => pages.map(page => {
  const translated = language === "cz" ? page : translations[language][page.path];
  if (!translated) throw new Error(`Missing ${language} editorial translation: ${page.path}`);
  return { ...page, ...translated, language, basePath: page.path, path: editorialPath(page.path, language) };
}));
export type Editorial = typeof EDITORIAL_PAGES[number];

export function editorialPath(basePath: string, language: LanguageCode): string {
  return language === "cz" ? basePath : `/${language}${basePath}`;
}
type CatalogClub = typeof clubs[number];
type ClubSource = { checkedAt: string; sources: Array<{ label: string; url: string }>; verified: string; description: string; rental?: string; lessons?: string; transport?: string; multisport?: string };
export const priceChecks: Record<string, { checkedAt: string; url: string; standardMinimum: number }> = priceChecksData;
const sources: Record<string, ClubSource> = sourceData;
export const EDITORIAL_SOURCES: Record<string, { label: string; url: string }> = {
  powers: { label: "Padel Powers – ceník a služby", url: "https://www.padelpowers.com/praha-smichov/" },
  one: { label: "One Padel – klub a otevřené hry", url: "https://onepadel.cz/" },
  oneAbout: { label: "One Padel – půjčovna, lekce a zázemí", url: "https://onepadel.cz/about" },
  oneMultisport: { label: "One Padel – MultiSport od 1. 10. 2026", url: "https://onepadel.cz/articles/nove-podminky-multisport-v-one-padel-od-1-10" },
  court: { label: "The Court (web klubu)", url: "https://thecourt.cz/" },
  courtPrices: { label: "The Court – ceník", url: "https://thecourt.cz/r-prices-cz" },
  neride: { label: "Neride – zimní ceník a služby", url: "https://padelneride.cz/" },
  dzusPrices: { label: "Padel Džus – ceník kurtů a raket", url: "https://padeldzus.cz/cenik" },
  dzus: { label: "Padel Džus – klub a lekce", url: "https://padeldzus.cz/" },
  fip: { label: "FIP – Rules of Padel 2026", url: "https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf" },
  itf: { label: "ITF – pravidla tenisu", url: "https://www.itftennis.com/en/about-us/governance/rules-and-regulations/" },
  squash: { label: "World Squash – pravidla", url: "https://www.worldsquash.org/rules-of-squash/" },
  oneTournaments: { label: "One Padel – aktuální turnaje", url: "https://onepadel.cz/tournaments" },
  powersEvents: { label: "Padel Powers – turnaje", url: "https://www.padelpowers.com/turnaje/" },
  dzusEvents: { label: "Padel Džus – aktuální akce na webu klubu", url: "https://padeldzus.cz/" },
  cpf: { label: "Česká padelová federace – aktuální soutěže", url: "https://czpadel.cz/" }
};

export function nearbyClubs(club: Pick<CatalogClub, "slug" | "coordinates">) {
  return clubs.filter(other => other.slug !== club.slug)
    .sort((a, b) => distanceInKilometers(club.coordinates, a.coordinates) - distanceInKilometers(club.coordinates, b.coordinates))
    .slice(0, 3);
}

export function EditorialLinks({ language = "cz" }: { language?: LanguageCode }) {
  return <nav className="editorialLinks" aria-label={copy[language].guideNav}>
    {EDITORIAL_PAGES.filter(page => page.language === language && page.kind !== "article").map(page => <a key={page.path} href={page.path}>{page.title}</a>)}
  </nav>;
}

export function EditorialArticleCards({ limit, language = "cz" }: { limit?: number; language?: LanguageCode }) {
  const latest = limit !== undefined;
  const Heading = latest ? "h3" : "h2";
  const cards = EDITORIAL_PAGES.filter(page => page.language === language && page.kind === "article").slice(0, limit).map(page => <article className={latest ? "latestNewsCard" : "newsCard"} key={page.path}>
        <a className={latest ? "latestNewsImage" : undefined} href={page.path}><img src={editorialImage(page).src} alt={editorialImage(page).alt} srcSet={editorialImage(page).srcSet} sizes="(max-width: 700px) 100vw, 600px" width="1200" height="670" loading="lazy" /></a>
        <div className={latest ? "latestNewsCardBody" : "newsCardBody"}>
          <div className="newsMeta"><span>{copy[language].articles}</span><time dateTime={EDITORIAL_DATE}>{editorialDate(language)}</time></div>
          <Heading><a href={page.path}>{page.title}</a></Heading><p>{page.description}</p>
          <a className="newsReadMore" href={page.path}>{language === "cz" ? "Přečíst článek" : language === "en" ? "Read article" : "Читати статтю"}<ArrowRight size={17} /></a>
        </div>
      </article>);
  return <>{cards}</>;
}

export function generatedArticleImage(id: keyof typeof articleImages, language: LanguageCode) {
  const image = articleImages[id];
  const base = import.meta.env?.BASE_URL ?? "/";
  return { src: `${base}${image.file}`, srcSet: `${base}${image.file.replace("-1200", "-640")} 640w, ${base}${image.file} 1200w`, alt: image.alt[language], caption: copy[language].imageCaption };
}

export function editorialImage(page: Editorial) {
  const images: Record<string, keyof typeof articleImages> = {
    "/padel-praha/": "choose-club",
    "/padel-praha-ceny/": "first-game-cost",
    "/padel-praha-multisport/": "multisport-booking",
    "/kryty-padel-praha/": "winter-indoor",
    "/padel-praha-podle-lokalit/": "choose-club",
    "/blog/kolik-stoji-padel-praha/": "first-game-cost",
    "/blog/multisport-padel-jak-rezervovat/": "multisport-booking",
    "/blog/padel-v-zime-praha/": "winter-indoor",
    "/blog/padel-pro-zacatecniky-praha/": "beginners",
    "/blog/pravidla-padelu/": "padel-rules",
    "/blog/padel-tenis-squash/": "padel-tennis-squash",
    "/blog/spoluhraci-padel-praha/": "find-players",
    "/blog/jak-vybrat-padelovy-klub-praha/": "choose-club",
    "/blog/padel-lekce-treneri-praha/": "coaching",
    "/blog/padel-firmy-teambuilding-praha/": "company-padel",
    "/blog/padel-turnaje-praha/": "local-tournament"
  };
  return generatedArticleImage(images[page.basePath], page.language);
}

export function ClubPriceEvidence({ slug, language = "cz" }: { slug: string; language?: LanguageCode }) {
  const check = priceChecks[slug];
  const text = copy[language];
  return <p className="editorialSection">{text.verified}: {check ? <><time dateTime={check.checkedAt}>{check.checkedAt}</time> · <a href={check.url}>{text.priceSource}</a></> : text.unverified}</p>;
}

function editorialDate(language: LanguageCode) {
  return new Intl.DateTimeFormat(language === "cz" ? "cs" : language === "ua" ? "uk" : "en", { dateStyle: "long", timeZone: "Europe/Prague" }).format(new Date(`${EDITORIAL_DATE}T12:00:00Z`));
}

export function DataMethodology({ language = "cz" }: { language?: LanguageCode }) {
  const text = copy[language];
  return <><section className="editorialSection"><h2>{text.operator}</h2><p>{text.operatorBody} <a href="mailto:dmytrozhyrov@gmail.com">dmytrozhyrov@gmail.com</a></p></section>{language === "cz" ? <section className="editorialSection">
    <h2>Odkud jsou data a jak je ověřujeme</h2>
    <p>Dostupnost přebíráme z podporovaných rezervačních systémů pro dnešek a dalších sedm dní. Kontroly plánujeme průběžně; u výsledku zobrazujeme skutečný čas poslední úspěšné kontroly. Výpadek zdroje může znamenat starší údaj. Vyhledání termínu kurt neblokuje.</p>
    <p>Ceny, provozní doba a služby jsou oddělené katalogové údaje. Datum ověření uvádíme pouze u konkrétních informací zkontrolovaných proti uvedenému zdroji. Automatická kontrola dostupnosti nepotvrzuje ceník ani podmínky MultiSport. Neověřené údaje označujeme a konečnou cenu vždy určuje klub.</p>
    <p>Opravu lze <a href={correctionUrl("Údaje v katalogu")}>nahlásit provozovateli HLEDEJKURTY e-mailem</a>. Připojte klub, chybný údaj a odkaz na aktuální zdroj; neposílejte osobní údaje hráčů ani přístupové údaje.</p>
  </section> : <section className="editorialSection"><h2>{text.methodology}</h2><p>{language === "en" ? "Availability comes from supported booking systems for today and the next seven days. Results show the last successful check; outages can leave older data. Searching does not reserve a court. Prices and club services are checked separately against official sources. A source-check date confirms only the stated facts; unverified catalog information remains labelled. Send corrections with the club name and a source link to the contact above." : "Доступність надходить із підтримуваних систем бронювання на сьогодні та наступні сім днів. Результати показують останню успішну перевірку; збої можуть залишати старі дані. Пошук не резервує корт. Ціни та послуги перевіряємо окремо за офіційними джерелами. Дата перевірки підтверджує лише зазначені факти; неперевірені дані каталогу позначені. Надсилайте виправлення з назвою клубу та посиланням на джерело на контакт вище."}</p></section>}</>;
}

export function ClubEditorial({ slug }: { slug: string }) {
  const club = clubs.find(item => item.slug === slug);
  if (!club) return null;
  const checked = sources[slug];
  return <div className="clubEditorial">
    <ClubPriceEvidence slug={slug} />
    {checked ? <section className="editorialSection"><h2>Pro koho se {club.name} hodí</h2><p>{checked.description}</p>
      <p>Kontrola zdrojů: <time dateTime={checked.checkedAt}>31. 10. 2026</time>. {checked.verified}</p>
      <ul>{checked.sources.map(source => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul>
      <dl>{checked.rental ? <><dt>Půjčovna</dt><dd>{checked.rental}</dd></> : null}{checked.lessons ? <><dt>Lekce</dt><dd>{checked.lessons}</dd></> : null}{checked.transport ? <><dt>Doprava a parkování</dt><dd>{checked.transport}</dd></> : null}</dl>
      {checked.multisport ? <p>{checked.multisport}</p> : null}
    </section> : <p className="editorialSection">Provozní doba a služby bez uvedeného zdroje vycházejí z dosavadního katalogu a nebyly nově ověřeny. </p>}
    <section className="editorialSection"><h2>Otázky před návštěvou {club.name}</h2>
      <h3>Jakou cenu má {club.name} v katalogu?</h3><p>{club.priceInfo} {priceVerified(slug) ? "Ověřeno v ceníku 31. 10. 2026; konečnou částku potvrďte v rezervaci." : "Aktuální tarif nebyl ověřen; cenu potvrďte v oficiální rezervaci."}</p>
      <h3>Jde o halu, nebo venkovní kurty?</h3><p>{courtLabel(club)}. {club.hasSinglesCourt ? "Celkový počet zahrnuje také jeden tréninkový kurt 1vs1." : club.courtTypes.length > 1 ? "Ve smíšeném areálu ověřte typ konkrétního kurtu." : ""}</p>
      <h3>Lze uplatnit MultiSport?</h3><p>{multisportLabel(club)}. Podmínky, doplatek a storno potvrďte před úhradou.</p>
      <p><a href={correctionUrl(club.name)}>Nahlásit nesrovnalost u {club.name}</a></p>
    </section>
    <section className="editorialSection"><h2>Další kluby v okolí</h2><p>Podle vzdušné vzdálenosti adres v katalogu; nejde o dobu dojezdu.</p>
      <ul>{nearbyClubs(club).map(other => <li key={other.slug}><a href={`/clubs/${other.slug}/`}>{other.name}</a> – {czechCourtCount(other.courtCount)}. {other.priceInfo} {!priceVerified(other.slug) ? "(katalog, neověřeno)" : ""}</li>)}</ul>
    </section>
    <EditorialLinks />
  </div>;
}

export function EditorialPage({ page }: { page: Editorial }) {
  const language = page.language;
  const text = copy[language];
  const href = (path: string) => editorialPath(path, language);
  const date = editorialDate(language);
  const selected = clubs.filter(club => page.clubs.includes(club.slug));
  const rows = editorialClubs(page);
  return <ArticleLayout title={page.title} description={page.description} image={editorialImage(page)}
    meta={<div className="newsMeta"><span>{text.articles}</span><a href={href("/about/")}>{text.byline}</a><time dateTime={EDITORIAL_DATE}>{text.published} {date}</time></div>}>
      <p className="newsLead">{page.intro}</p>
      {page.basePath === "/blog/pravidla-padelu/" ? <img className="newsArticleDiagram" src={`${import.meta.env?.BASE_URL ?? "/"}padel-serve.svg`} alt={language === "cz" ? "Schéma diagonálního podání: od hráče 1 do pole 2" : language === "en" ? "Diagonal serve diagram: from player 1 into service box 2" : "Схема діагональної подачі: від гравця 1 у поле 2"} width="1200" height="670" loading="lazy" /> : null}
      {page.sections.map(section => <section className="newsArticleSection" key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      {page.kind === "prices" ? <div className="editorialTable" tabIndex={0} role="region" aria-label={text.table}><table><caption>{text.caption}</caption><thead><tr><th scope="col">{text.club}</th><th scope="col">{text.courts}</th><th scope="col">{text.price}</th><th scope="col">MultiSport</th><th scope="col">{text.verified}</th></tr></thead><tbody>
        {rows.map(club => <tr key={club.slug}><th scope="row"><a href={href(`/clubs/${club.slug}/`)}>{club.name}</a></th><td>{club.courtCount} {text.total}; {courtLabel(club, language)}</td><td>{language === "cz" ? club.priceInfo : (translatedPrices[language] as Record<string, string>)[club.slug]}</td><td>{multisportLabel(club, language)}</td><td>{priceVerified(club.slug) ? <><time dateTime={priceChecks[club.slug].checkedAt}>{priceChecks[club.slug].checkedAt}</time><br /><a href={priceChecks[club.slug].url}>{text.priceSource}</a></> : text.unverified}</td></tr>)}
      </tbody></table></div> : null}
      {page.kind === "hub" ? <section className="newsArticleSection"><h2>{text.choose}</h2><ul>{[["/padel-praha-ceny/", text.pricesLink], ["/clubs/", text.directoryLink], ["/padel-praha-multisport/", text.msLink], ["/kryty-padel-praha/", text.indoorLink], ["/padel-praha-podle-lokalit/", text.areasLink]].map(([path, label]) => <li key={path}><a href={href(path)}>{label}</a></li>)}</ul></section> : null}
      {page.kind === "prices" ? <section className="newsArticleSection"><h2>{text.sample}</h2><p>{priceSample(language)}</p></section> : null}
      {page.kind === "multisport" || page.kind === "indoor" ? <section className="newsArticleSection"><h2>{page.kind === "multisport" ? "MultiSport" : text.indoorLink}</h2><p>{page.kind === "multisport" ? text.msCaption : text.indoorCaption}</p><ul>{rows.map(club => <li key={club.slug}><a href={href(`/clubs/${club.slug}/`)}>{club.name}</a> – {page.kind === "multisport" ? multisportLabel(club, language) : `${club.courtCount} ${text.total}; ${courtLabel(club, language)}`} {(multisportSources[club.slug] || club.slug === "one-padel" || club.slug === "padel-neride") && page.kind === "multisport" ? <a href={multisportSources[club.slug]?.url ?? (club.slug === "one-padel" ? EDITORIAL_SOURCES.oneMultisport.url : EDITORIAL_SOURCES.neride.url)}>{text.msSource} (31. 10. 2026)</a> : null}</li>)}</ul></section> : null}
      {page.kind === "areas" ? <section className="newsArticleSection"><h2>{text.areas}</h2>{[...new Set(clubs.map(club => club.district))].sort((a,b) => a.localeCompare(b, "cs", { numeric: true })).map(district => <section key={district}><h3>{district}</h3><ul>{clubs.filter(club => club.district === district).map(club => <li key={club.slug}><a href={href(`/clubs/${club.slug}/`)}>{club.name}</a> – {club.address}</li>)}</ul></section>)}</section> : null}
      <section className="newsArticleSection"><h2>{text.mentioned}</h2><ul>{selected.map(club => <li key={club.slug}><a href={href(`/clubs/${club.slug}/`)}>{club.name}: {text.profile}</a></li>)}</ul></section>
      <EditorialLinks language={language} />
      <section className="newsArticleSection"><h2>{text.sources}</h2><p>{text.sourcesBody}</p><ul>{page.sources.map(id => <li key={id}><a href={EDITORIAL_SOURCES[id].url}>{language === "cz" ? EDITORIAL_SOURCES[id].label : (sourceLabels[language] as Record<string, string>)[id]}</a></li>)}</ul></section>
      {page.kind === "hub" ? <section aria-label={text.articles}><div className="newsList"><EditorialArticleCards language={language} /></div></section> : null}
  </ArticleLayout>;
}

function priceVerified(slug: string) { return Boolean(priceChecks[slug]); }
export const multisportSources: Record<string, { url: string; cz: string; en: string; ua: string }> = {
  "plechovka-dubec": { url: "https://www.plechovka-dubec.cz/cenik/", cz: "Karta hradí 25 % kurtu; ceník uvádí doplatek 25 Kč na hráče", en: "A card covers 25% of the court; the price list states a 25 CZK supplement per player", ua: "Картка покриває 25% корту; прайс зазначає доплату 25 Kč за гравця" },
  "head-tenis-centrum-vestec": { url: "https://teniscentrum.com/padel", cz: "Klub uvádí přijetí na recepci; doplatek a počet karet ověřte", en: "Club lists acceptance at reception; confirm supplements and card count", ua: "Клуб зазначає прийом на рецепції; уточніть доплату і кількість карток" },
  "padel-radotin": { url: "https://www.padelradotin.cz/", cz: "Ano – 25 % ceny první hodiny za kartu zpět kreditem; nejprve platba, poté check-in", en: "Yes – 25% of the first hour per card returned as credit; pay first, then check in", ua: "Так – 25% першої години за картку повертається кредитом; спочатку оплата, потім реєстрація" },
  "ltc-modrany-2005": { url: "https://www.ltc2005.cz/padel/cenik-sluzeb-2/", cz: "Ano – kredit 25 % první hodiny za kartu, do 24 hodin; příští rezervaci musí kredit pokrýt celou", en: "Yes – 25% of the first hour per card as credit within 24 hours; credit must cover the next booking in full", ua: "Так – 25% першої години за картку кредитом протягом 24 годин; кредит має покрити наступне бронювання повністю" },
  "cisarska-louka-padel": { url: "https://cisarska-louka.cz/padel/", cz: "Ano – 25 % hodiny za kartu; uplatnit na místě před hrou, ne zpětně po online platbě", en: "Yes – 25% of one hour per card; apply on site before play, not after online payment", ua: "Так – 25% години за картку; на місці до гри, не після онлайн-оплати" },
  "sk-satalice": { url: "https://www.tenissatalice.cz/padel/", cz: "Ano – pro MultiSport pouze telefonická rezervace; doplatek ověřte", en: "Yes – MultiSport requires a phone booking; confirm any supplement", ua: "Так – для MultiSport потрібне телефонне бронювання; уточніть доплату" }
};
export function editorialClubs(page: Editorial) {
  if (page.kind === "indoor") return clubs.filter(club => club.courtTypes.includes("indoor"));
  if (page.kind === "multisport") return clubs.filter(club => club.acceptsMultisport);
  if (page.kind === "prices") return [...clubs].sort((a, b) => {
    const rate = (club: CatalogClub) => priceChecks[club.slug]?.standardMinimum ?? lowestPrice(club.priceInfo);
    return rate(a) - rate(b) || a.name.localeCompare(b.name, "cs");
  });
  return clubs.filter(club => page.clubs.includes(club.slug));
}
function priceSample(language: LanguageCode) {
  const values = Object.values(priceChecks).map(check => check.standardMinimum).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  return copy[language].sampleBody.replace("{count}", String(values.length)).replace("{min}", String(values[0])).replace("{max}", String(values.at(-1))).replace("{median}", String(median));
}
function courtLabel(club: CatalogClub, language: LanguageCode = "cz") {
  const text = copy[language];
  return club.courtTypes.length > 1 ? text.mixed : club.courtTypes[0] === "indoor" ? text.indoor : text.outdoor;
}
function multisportLabel(club: CatalogClub, language: LanguageCode = "cz") {
  const text = copy[language];
  if (multisportSources[club.slug]) return multisportSources[club.slug][language];
  if (club.slug === "one-padel") return text.msOne;
  if (club.slug === "padel-neride") return text.msNeride;
  return club.acceptsMultisport ? text.msCatalog : text.unknown;
}
function correctionUrl(name: string) { return `mailto:dmytrozhyrov@gmail.com?subject=${encodeURIComponent(`Oprava údajů: ${name}`)}`; }
