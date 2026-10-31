import React from "react";
import clubs from "./club-facts.json";
import sourceData from "./club-sources.json";
import pages from "./editorial-content.json";
import { distanceInKilometers } from "./distance";

export const EDITORIAL_DATE = "2026-10-31";
export const EDITORIAL_PAGES = pages;
export type Editorial = typeof pages[number];
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

export function EditorialLinks() {
  return <nav className="editorialLinks" aria-label="Průvodce padel Praha">
    {pages.filter(page => page.kind !== "article").map(page => <a key={page.path} href={page.path}>{page.title}</a>)}
  </nav>;
}

export function EditorialArticleCards({ limit }: { limit?: number }) {
  return <section className="editorialArticles" aria-label="Praktické články o padelu">
    <h2>Průvodci pro hráče</h2>
    {pages.filter(page => page.kind === "article").slice(0, limit).map(page => <article key={page.path}>
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
  const selected = clubs.filter(club => page.clubs.includes(club.slug));
  const rows = page.kind === "indoor" ? clubs.filter(club => club.courtTypes.includes("indoor")) : clubs;
  return <main className="seoPrerender editorialPage">
    <header className="seoPrerenderHeader"><a className="seoPrerenderBrand" href="/">HLEDEJKURTY</a><nav className="seoPrerenderNav" aria-label="Hlavní navigace"><a href="/">Hledat dostupnost</a><a href="/clubs/">Kluby</a><a href="/blog/">Články</a><a href="/about/">Jak to funguje</a></nav></header>
    <nav className="editorialBreadcrumbs" aria-label="Drobečková navigace"><a href="/">HLEDEJKURTY</a> / {page.path !== "/padel-praha/" ? <><a href={page.kind === "article" ? "/blog/" : "/padel-praha/"}>{page.kind === "article" ? "Články" : "Padel Praha"}</a> / </> : null}<span>{page.title}</span></nav>
    <article><h1>{page.title}</h1><p className="newsMeta">Redakce HLEDEJKURTY · Publikováno a aktualizováno <time dateTime={EDITORIAL_DATE}>31. 10. 2026</time></p><p className="newsLead">{page.intro}</p>
      {page.sections.map(section => <section className="editorialSection" key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      {["hub", "prices", "indoor", "multisport"].includes(page.kind) ? <div className="editorialTable" tabIndex={0} role="region" aria-label="Srovnání padelových klubů"><table><caption>Katalog klubů – kontrola uvedených zdrojů 31. 10. 2026</caption><thead><tr><th scope="col">Klub</th><th scope="col">Kurty</th><th scope="col">Cena za kurt / hodinu</th><th scope="col">MultiSport</th><th scope="col">Ověření ceny</th></tr></thead><tbody>
        {rows.map(club => <tr key={club.slug}><th scope="row"><a href={`/clubs/${club.slug}/`}>{club.name}</a></th><td>{club.courtCount} celkem; {courtLabel(club)}</td><td>{club.priceInfo}</td><td>{multisportLabel(club)}</td><td>{priceVerified(club.slug) ? <><time dateTime={EDITORIAL_DATE}>31. 10. 2026</time><br /><a href={sources[club.slug].sources.at(-1)!.url}>Zdroj ceny</a></> : "Neověřeno – dosavadní katalog"}</td></tr>)}
      </tbody></table></div> : null}
      {page.kind === "areas" ? <section className="editorialSection"><h2>Všechny lokality v katalogu</h2><ul>{clubs.map(club => <li key={club.slug}><a href={`/clubs/${club.slug}/`}>{club.name}</a> – {club.address}</li>)}</ul></section> : null}
      <section className="editorialSection"><h2>Kluby zmíněné v průvodci</h2><ul>{selected.map(club => <li key={club.slug}><a href={`/clubs/${club.slug}/`}>{club.name}: profil a volné termíny</a></li>)}</ul></section>
      <EditorialLinks />
      <section className="editorialSection"><h2>Zdroje a ověření</h2><p>Klubové služby jsou tvrzení provozovatelů, nikoli náš osobní test. Zdroje jsme kontrolovali 31. 10. 2026. Podmínky se mohou změnit; neověřené katalogové údaje nejsou potvrzenou nabídkou.</p><ul>{page.sources.map(id => <li key={id}><a href={EDITORIAL_SOURCES[id].url}>{EDITORIAL_SOURCES[id].label}</a></li>)}</ul></section>
      {page.kind === "hub" ? <EditorialArticleCards /> : null}
    </article><footer className="seoPrerenderFooter"><a href="/about/">Metodika a opravy údajů</a><a href="/privacy-policy/">Ochrana soukromí</a><a href="/terms-of-use/">Podmínky</a></footer>
  </main>;
}

function priceVerified(slug: string) { return ["padel-powers-smichov", "the-court", "padel-neride"].includes(slug); }
function courtLabel(club: CatalogClub) { return club.courtTypes.length > 1 ? "kryté i venkovní" : club.courtTypes[0] === "indoor" ? "kryté" : "venkovní"; }
function multisportLabel(club: CatalogClub) {
  if (club.slug === "one-padel") return "Ano – vrácení kreditem, podmínky viz zdroj";
  if (club.slug === "padel-neride") return "Klub uvádí ano, doplatek neověřen";
  return club.acceptsMultisport ? "Katalog uvádí ano, nově neověřeno" : "Neověřeno";
}
function correctionUrl(name: string) { return `mailto:dmytrozhyrov@gmail.com?subject=${encodeURIComponent(`Oprava údajů: ${name}`)}`; }
