import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EDITORIAL_PAGES, EditorialPage, nearbyClubs, editorialClubs } from "./editorial";
import translatedPrices from "./editorial-prices.json";
import sourceLabels from "./editorial-source-labels.json";
import clubs from "./club-facts.json";

describe("SEO editorial pages", () => {
  it("keeps published URLs unique and renders sourced, dated content", () => {
    expect(new Set(EDITORIAL_PAGES.map(page => page.path)).size).toBe(EDITORIAL_PAGES.length);
    for (const page of EDITORIAL_PAGES) {
      const html = renderToStaticMarkup(<EditorialPage page={page} />);
      expect(html).toMatch(/datetime="2026-10-31"/i);
      expect(html).toMatch(/datetime="2026-11-01"/i);
      expect(html).toContain("HLEDEJKURTY");
      expect(html).toMatch(/href="\/(?:en\/|ua\/)?clubs\//);
      expect(html).toMatch(/href="\/(?:en\/|ua\/)?padel-praha\//);
      expect(html.match(/<h1/g)).toHaveLength(1);
      const example = page.sections.at(-1)!;
      for (const item of example.items!) expect(html).toContain(`<li>${item}</li>`);
      for (const path of page.related) {
        const related = EDITORIAL_PAGES.find(other => other.basePath === path && other.language === page.language);
        expect(related).toBeDefined();
        expect(related!.path).not.toBe(page.path);
        expect(html).toContain(`href="${related!.path}"`);
      }
    }
  });
  it("publishes every article and guide in all three languages with matching sections", () => {
    const czechPages = EDITORIAL_PAGES.filter(page => page.language === "cz");
    expect(czechPages).toHaveLength(16);
    for (const czech of czechPages) {
      for (const language of ["en", "ua"] as const) {
        const translated = EDITORIAL_PAGES.find(page => page.basePath === czech.basePath && page.language === language)!;
        expect(translated).toBeDefined();
        expect(translated.sections).toHaveLength(czech.sections.length);
        translated.sections.forEach((section, index) => {
          expect(section.heading).not.toBe(czech.sections[index].heading);
          expect(section.body).not.toBe(czech.sections[index].body);
        });
        for (const id of translated.sources) {
          expect((sourceLabels[language] as Record<string, string>)[id]).toBeTruthy();
        }
        expect(translated.title).not.toBe(czech.title);
        expect(translated.intro).not.toBe(czech.intro);
        expect(translated.sources).toEqual(czech.sources);
        const html = renderToStaticMarkup(<EditorialPage page={translated} />);
        expect(html).toContain(`href="/${language}/clubs/`);
        expect(html).not.toContain('href="/clubs/');
        expect(html).toContain(`href="/${language}/padel-praha/`);
      }
    }
  });
  it("compares all clubs without presenting missing prices or Multisport as zero or no", () => {
    const page = EDITORIAL_PAGES.find(page => page.path === "/padel-praha-ceny/")!;
    const html = renderToStaticMarkup(<EditorialPage page={page} />);
    for (const club of clubs) expect(html).toContain(`/clubs/${club.slug}/`);
    expect(html).toContain("Neověřeno");
    expect(html).toContain("13 z 18");
    expect(html).toContain("medián těchto minim: 600 Kč");
    expect(html).toContain("Od 1.11.2026");
    expect(html).not.toContain("Infinity");
  });
  it("preserves all catalog price amounts in the English and Ukrainian tables", () => {
    const amounts = (value: string) => [...value.matchAll(/(\d+(?:[-–]\d+)?)\s*(?:Kč|CZK)/g)].map(match => match[1].replaceAll("-", "–"));
    for (const club of clubs) {
      for (const language of ["en", "ua"] as const) {
        const price = (translatedPrices[language] as Record<string, string>)[club.slug];
        expect(price).toBeTruthy();
        expect(amounts(price)).toEqual(amounts(club.priceInfo));
      }
    }
  });
  it("gives each hub its own dataset and reserves the full price table for prices", () => {
    for (const language of ["cz", "en", "ua"] as const) {
      const find = (kind: string) => EDITORIAL_PAGES.find(page => page.language === language && page.kind === kind)!;
      expect(renderToStaticMarkup(<EditorialPage page={find("hub")} />)).not.toContain("<table>");
      expect(editorialClubs(find("multisport")).every(club => club.acceptsMultisport)).toBe(true);
      expect(editorialClubs(find("multisport")).length).toBeLessThan(clubs.length);
      expect(editorialClubs(find("indoor")).every(club => club.courtTypes.includes("indoor"))).toBe(true);
      expect(renderToStaticMarkup(<EditorialPage page={find("areas")} />)).toContain("Praha 5</h3>");
      const prices = editorialClubs(find("prices"));
      expect(prices.at(-1)!.slug).toBe("padel-cakovice");
      expect(prices.findIndex(club => club.slug === "the-court")).toBeGreaterThan(prices.findIndex(club => club.slug === "padel-neride"));
    }
  });
  it("finds three nearby clubs by distance, excluding the current club", () => {
    const club = clubs.find(club => club.slug === "padel-powers-smichov")!;
    const nearby = nearbyClubs(club);
    expect(nearby).toHaveLength(3);
    expect(nearby[0].slug).toBe("cisarska-louka-padel");
    expect(nearby.some(item => item.slug === club.slug)).toBe(false);
  });
});

describe("article photographs", () => {
  it("uses generated topic images and discloses illustrative scenes in every language", () => {
    for (const page of EDITORIAL_PAGES) {
      const html = renderToStaticMarkup(<EditorialPage page={page} />);
      expect(html).toMatch(/src="\/articles\/[a-z-]+-1200\.webp"/);
      expect(html).toContain("<figcaption");
      expect(html).not.toMatch(/alt="(?:One Padel|The Court) –/);
    }
  });
});
