import React from "react";
import clubs from "./club-facts.json";
import sourceData from "./club-sources.json";
import pages from "./editorial-content.json";
import english from "./editorial-en.json";
import ukrainian from "./editorial-ua.json";
import copy from "./editorial-copy.json";
import translatedPrices from "./editorial-prices.json";
import sourceLabels from "./editorial-source-labels.json";
import { LANGUAGE_STORAGE_KEY, type LanguageCode } from "./i18n";
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
type ClubSource = typeof sourceData[keyof typeof sourceData];
const sources: Record<string, ClubSource> = sourceData;
export const EDITORIAL_SOURCES: Record<string, { label: string; url: string }> = {
  powers: { label: "Padel Powers – ceník a služby", url: "https://www.padelpowers.com/praha-smichov/" },
  one: { label: "One Padel – klub a otevřené hry", url: "https://onepadel.cz/" },
  oneAbout: { label: "One Padel – půjčovna, lekce a zázemí", url: "https://onepadel.cz/about" },
  oneMultisport: { label: "One Padel – MultiSport od 1. 10. 2026", url: "https://onepadel.cz/articles/nove-podminky-multisport-v-one-padel-od-1-10" },
  court: { label: "The Court (web klubu)", url: "https://thecourt.cz/" },
  courtPrices: { label: "The Court – ceník", url: "https://thecourt.cz/r-prices-cz" },
  neride: { label: "Neride – zimní ceník a služby", url: "https://padelneride.cz/" },
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
  return <section className="editorialArticles" aria-label={copy[language].articles}>
    <h2>{copy[language].articles}</h2>
    {EDITORIAL_PAGES.filter(page => page.language === language && page.kind === "article").slice(0, limit).map(page => <article key={page.path}>
      <h3><a href={page.path}>{page.title}</a></h3><p>{page.description}</p>
    </article>)}
  </section>;
}

export function DataMethodology() {
  return <section className="editorialSection">
    <h2>Odkud jsou data a jak je ověřujeme</h2>
    <p>Dostupnost přebíráme z podporovaných rezervačních systémů pro dnešek a dalších sedm dní. Kontroly plánujeme průběžně; u výsledku zobrazujeme skutečný čas poslední úspěšné kontroly. Výpadek zdroje může znamenat starší údaj. Vyhledání termínu kurt neblokuje.</p>
    <p>Ceny, provozní doba a služby jsou oddělené katalogové údaje. Datum ověření uvádíme pouze u konkrétních informací zkontrolovaných proti uvedenému zdroji. Automatická kontrola dostupnosti nepotvrzuje ceník ani podmínky MultiSport. Neověřené údaje označujeme a konečnou cenu vždy určuje klub.</p>
    <p>Opravu lze <a href={correctionUrl("Údaje v katalogu")}>nahlásit provozovateli HLEDEJKURTY e-mailem</a>. Připojte klub, chybný údaj a odkaz na aktuální zdroj; neposílejte osobní údaje hráčů ani přístupové údaje.</p>
  </section>;
}

export function ClubEditorial({ slug }: { slug: string }) {
  const club = clubs.find(item => item.slug === slug);
  if (!club) return null;
  const checked = sources[slug];
  return <div className="clubEditorial">
    {checked ? <section className="editorialSection"><h2>Pro koho se {club.name} hodí</h2><p>{checked.description}</p>
      <p>Kontrola zdrojů: <time dateTime={checked.checkedAt}>31. 10. 2026</time>. {checked.verified}</p>
      <ul>{checked.sources.map(source => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul>
      <dl><dt>Půjčovna</dt><dd>{checked.rental}</dd><dt>Lekce</dt><dd>{checked.lessons}</dd><dt>Doprava a parkování</dt><dd>{checked.transport}</dd></dl>
      {"multisport" in checked ? <p>{checked.multisport}</p> : null}
    </section> : <p className="editorialSection">Ceny, provozní doba, počet kurtů a podpora MultiSport vycházejí z dosavadního katalogu; nová kontrola zdrojů: neověřeno. Půjčovna, lekce, povrch, parkování a MHD: neověřeno.</p>}
    <section className="editorialSection"><h2>Otázky před návštěvou {club.name}</h2>
      <h3>Jakou cenu má {club.name} v katalogu?</h3><p>{club.priceInfo} {priceVerified(slug) ? "Ověřeno v ceníku 31. 10. 2026; konečnou částku potvrďte v rezervaci." : "Aktuální tarif nebyl ověřen; cenu potvrďte v oficiální rezervaci."}</p>
      <h3>Jde o halu, nebo venkovní kurty?</h3><p>{courtLabel(club)}. {club.hasSinglesCourt ? "Celkový počet zahrnuje také jeden tréninkový kurt 1vs1." : "Ve smíšeném areálu ověřte typ konkrétního kurtu."}</p>
      <h3>Lze uplatnit MultiSport?</h3><p>{multisportLabel(club)}. Podmínky, doplatek a storno potvrďte před úhradou.</p>
      <p><a href={correctionUrl(club.name)}>Nahlásit nesrovnalost u {club.name}</a></p>
    </section>
    <section className="editorialSection"><h2>Další kluby v okolí</h2><p>Podle vzdušné vzdálenosti adres v katalogu; nejde o dobu dojezdu.</p>
      <ul>{nearbyClubs(club).map(other => <li key={other.slug}><a href={`/clubs/${other.slug}/`}>{other.name}</a> – {other.courtCount} kurtů. {other.priceInfo} {!priceVerified(other.slug) ? "(katalog, neověřeno)" : ""}</li>)}</ul>
    </section>
    <EditorialLinks />
  </div>;
}

export function EditorialPage({ page }: { page: Editorial }) {
  const language = page.language;
  const text = copy[language];
  const href = (path: string) => editorialPath(path, language);
  const date = new Intl.DateTimeFormat(language === "cz" ? "cs" : language === "ua" ? "uk" : "en", { dateStyle: "long", timeZone: "Europe/Prague" }).format(new Date(`${EDITORIAL_DATE}T12:00:00Z`));
  const selected = clubs.filter(club => page.clubs.includes(club.slug));
  const rows = page.kind === "indoor" ? clubs.filter(club => club.courtTypes.includes("indoor")) : clubs;
  return <main className="seoPrerender editorialPage">
    <header className="seoPrerenderHeader"><a className="seoPrerenderBrand" href={href("/")}>HLEDEJKURTY</a><nav className="seoPrerenderNav" aria-label={text.nav}><a href={href("/")}>{text.search}</a><a href={href("/clubs/")}>{text.clubs}</a><a href={href("/blog/")}>{text.blog}</a><a href={href("/about/")}>{text.about}</a></nav></header>
    <nav className="editorialLinks" aria-label={text.language}>{(["cz", "en", "ua"] as const).map(code => <a key={code} href={editorialPath(page.basePath, code)} onClick={() => localStorage.setItem(LANGUAGE_STORAGE_KEY, code)} hrefLang={code === "cz" ? "cs" : code === "ua" ? "uk" : "en"} lang={code === "cz" ? "cs" : code === "ua" ? "uk" : "en"} aria-current={code === language ? "page" : undefined}>{code === "cz" ? "Čeština" : code === "ua" ? "Українська" : "English"}</a>)}</nav>
    <nav className="editorialBreadcrumbs" aria-label={text.breadcrumbs}><a href={href("/")}>HLEDEJKURTY</a> / {page.basePath !== "/padel-praha/" ? <><a href={href(page.kind === "article" ? "/blog/" : "/padel-praha/")}>{page.kind === "article" ? text.blog : text.hub}</a> / </> : null}<span>{page.title}</span></nav>
    <article><h1>{page.title}</h1><p className="newsMeta">{text.byline} · {text.published} <time dateTime={EDITORIAL_DATE}>{date}</time></p><p className="newsLead">{page.intro}</p>
      {page.sections.map(section => <section className="editorialSection" key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      {["hub", "prices", "indoor", "multisport"].includes(page.kind) ? <div className="editorialTable" tabIndex={0} role="region" aria-label={text.table}><table><caption>{text.caption}</caption><thead><tr><th scope="col">{text.club}</th><th scope="col">{text.courts}</th><th scope="col">{text.price}</th><th scope="col">MultiSport</th><th scope="col">{text.verified}</th></tr></thead><tbody>
        {rows.map(club => <tr key={club.slug}><th scope="row"><a href={href(`/clubs/${club.slug}/`)}>{club.name}</a></th><td>{club.courtCount} {text.total}; {courtLabel(club, language)}</td><td>{language === "cz" ? club.priceInfo : (translatedPrices[language] as Record<string, string>)[club.slug]}</td><td>{multisportLabel(club, language)}</td><td>{priceVerified(club.slug) ? <><time dateTime={EDITORIAL_DATE}>{date}</time><br /><a href={sources[club.slug].sources.at(-1)!.url}>{text.priceSource}</a></> : text.unverified}</td></tr>)}
      </tbody></table></div> : null}
      {page.kind === "areas" ? <section className="editorialSection"><h2>{text.areas}</h2><ul>{clubs.map(club => <li key={club.slug}><a href={href(`/clubs/${club.slug}/`)}>{club.name}</a> – {club.address}</li>)}</ul></section> : null}
      <section className="editorialSection"><h2>{text.mentioned}</h2><ul>{selected.map(club => <li key={club.slug}><a href={href(`/clubs/${club.slug}/`)}>{club.name}: {text.profile}</a></li>)}</ul></section>
      <EditorialLinks language={language} />
      <section className="editorialSection"><h2>{text.sources}</h2><p>{text.sourcesBody}</p><ul>{page.sources.map(id => <li key={id}><a href={EDITORIAL_SOURCES[id].url}>{language === "cz" ? EDITORIAL_SOURCES[id].label : (sourceLabels[language] as Record<string, string>)[id]}</a></li>)}</ul></section>
      {page.kind === "hub" ? <EditorialArticleCards language={language} /> : null}
    </article><footer className="seoPrerenderFooter"><a href={href("/about/")}>{text.methodology}</a><a href={href("/privacy-policy/")}>{text.privacy}</a><a href={href("/terms-of-use/")}>{text.terms}</a></footer>
  </main>;
}

function priceVerified(slug: string) { return ["padel-powers-smichov", "the-court", "padel-neride"].includes(slug); }
function courtLabel(club: CatalogClub, language: LanguageCode = "cz") {
  const text = copy[language];
  return club.courtTypes.length > 1 ? text.mixed : club.courtTypes[0] === "indoor" ? text.indoor : text.outdoor;
}
function multisportLabel(club: CatalogClub, language: LanguageCode = "cz") {
  const text = copy[language];
  if (club.slug === "one-padel") return text.msOne;
  if (club.slug === "padel-neride") return text.msNeride;
  return club.acceptsMultisport ? text.msCatalog : text.unknown;
}
function correctionUrl(name: string) { return `mailto:dmytrozhyrov@gmail.com?subject=${encodeURIComponent(`Oprava údajů: ${name}`)}`; }
