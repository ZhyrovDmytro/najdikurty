import { describe, expect, it } from "vitest";
import { resources } from "./i18n";

describe("translations", () => {
  it("provides every English message in Czech and Ukrainian", () => {
    const englishKeys = translationKeys(resources.en.translation);
    expect(translationKeys(resources.cz.translation)).toEqual(englishKeys);
    expect(translationKeys(resources.ua.translation)).toEqual(englishKeys);
  });
});

function translationKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => translationKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}
