import { describe, expect, it } from "vitest";
import { languageFromPathname, pathnameForLanguage, resources } from "./i18n";

describe("translations", () => {
  it("provides every English message in Czech and Ukrainian", () => {
    const englishKeys = translationKeys(resources.en.translation);
    expect(translationKeys(resources.cz.translation)).toEqual(englishKeys);
    expect(translationKeys(resources.ua.translation)).toEqual(englishKeys);
  });
});

describe("language routes", () => {
  it("uses Czech at the root and recognizes localized URL prefixes", () => {
    expect(languageFromPathname("/")).toBe("cz");
    expect(languageFromPathname("/clubs/padel-prosek/")).toBe("cz");
    expect(languageFromPathname("/en/clubs/padel-prosek/")).toBe("en");
    expect(languageFromPathname("/ua/about/")).toBe("ua");
  });

  it("builds Ukrainian URLs with the ua prefix", () => {
    expect(pathnameForLanguage("/clubs/padel-prosek/", "ua")).toBe("/ua/clubs/padel-prosek/");
    expect(pathnameForLanguage("/ua/about/", "cz")).toBe("/about/");
  });
});

function translationKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => translationKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}
