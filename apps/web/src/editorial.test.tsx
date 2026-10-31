import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EDITORIAL_PAGES, EditorialPage, nearbyClubs } from "./editorial";
import clubs from "./club-facts.json";

describe("SEO editorial pages", () => {
  it("keeps published URLs unique and renders sourced, dated content", () => {
    expect(new Set(EDITORIAL_PAGES.map(page => page.path)).size).toBe(EDITORIAL_PAGES.length);
    for (const page of EDITORIAL_PAGES) {
      const html = renderToStaticMarkup(<EditorialPage page={page} />);
      expect(html).toMatch(/datetime="2026-10-31"/i);
      expect(html).toContain("Redakce HLEDEJKURTY");
      expect(html).toContain('href="/clubs/');
      expect(html).toContain('href="/padel-praha/');
      expect(html.match(/<h1/g)).toHaveLength(1);
    }
  });
  it("compares all clubs without presenting missing prices or Multisport as zero or no", () => {
    const page = EDITORIAL_PAGES.find(page => page.path === "/padel-praha-ceny/")!;
    const html = renderToStaticMarkup(<EditorialPage page={page} />);
    for (const club of clubs) expect(html).toContain(`/clubs/${club.slug}/`);
    expect(html).toContain("Neověřeno");
    expect(html).not.toContain("Infinity");
  });
  it("finds three nearby clubs by distance, excluding the current club", () => {
    const club = clubs.find(club => club.slug === "padel-powers-smichov")!;
    const nearby = nearbyClubs(club);
    expect(nearby).toHaveLength(3);
    expect(nearby[0].slug).toBe("cisarska-louka-padel");
    expect(nearby.some(item => item.slug === club.slug)).toBe(false);
  });
});
