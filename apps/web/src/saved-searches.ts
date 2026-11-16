import { parseSearchPreferences, SEARCH_PREFERENCES_KEY, type SearchPreferences } from "./search-preferences";

export interface SavedSearch {
  id: string;
  name: string;
  params: SearchPreferences;
}
export const SAVED_SEARCHES_KEY = "mamekurt-saved-searches";

export function savedSearchNameError(name: string, searches: SavedSearch[], editingId?: string): "nameRequired" | "nameTooLong" | "nameExists" | null {
  const trimmed = name.trim();
  if (!trimmed) return "nameRequired";
  if (trimmed.length > 60) return "nameTooLong";
  if (searches.some(search => search.id !== editingId && search.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return "nameExists";
  return null;
}

export function readSavedSearches(storage: Pick<Storage, "getItem">, defaults: SearchPreferences, legacyName: string): SavedSearch[] {
  try {
    const stored = storage.getItem(SAVED_SEARCHES_KEY);
    if (stored === null) {
      const params = parseSearchPreferences(JSON.parse(storage.getItem(SEARCH_PREFERENCES_KEY) ?? "null"), defaults.clubSlugs);
      return params ? [{ id: "legacy", name: legacyName, params }] : [];
    }
    const values: unknown = JSON.parse(stored);
    if (!Array.isArray(values)) return [];
    const searches: SavedSearch[] = [];
    for (const value of values) {
      if (!value || typeof value.id !== "string" || !value.id || typeof value.name !== "string" ||
        searches.some(search => search.id === value.id) || savedSearchNameError(value.name, searches)) continue;
      const params = parseSearchPreferences(value.params, defaults.clubSlugs);
      if (params) searches.push({ id: value.id, name: value.name.trim(), params });
    }
    return searches;
  } catch { return []; }
}

export function writeSavedSearches(storage: Pick<Storage, "setItem">, searches: SavedSearch[]): boolean {
  try {
    storage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
    return true;
  } catch { return false; }
}
