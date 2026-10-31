import { describe, expect, it } from "vitest";
import { czechCourtCount, formatOpeningHours, matchesDirectoryFilters } from "./club-presentation";
import clubs from "./club-facts.json";

describe("club presentation", () => {
  it("inflects Czech court counts including zero and teens", () => {
    expect([0, 1, 2, 3, 4, 5, 12, 21].map(czechCourtCount)).toEqual([
      "0 padelových kurtů", "1 padelový kurt", "2 padelové kurty", "3 padelové kurty",
      "4 padelové kurty", "5 padelových kurtů", "12 padelových kurtů", "21 padelových kurtů"
    ]);
  });
  it("collapses daily hours but keeps missing days separate", () => {
    const range = { start: "07:00", end: "24:00" };
    const labels = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
    expect(formatOpeningHours(Object.fromEntries([0,1,2,3,4,5,6].map(day => [day, range])), labels, "Denně", "—")).toBe("Denně 07:00–24:00");
    expect(formatOpeningHours({ 1: range, 3: range }, labels, "Denně", "—")).toBe("Po 07:00–24:00, St 07:00–24:00");
    expect(formatOpeningHours({}, labels, "Denně", "—")).toBe("—");
  });
  it("combines district, court type, card and accent-insensitive location search", () => {
    const club = clubs.find(club => club.slug === "padel-powers-smichov")!;
    expect(matchesDirectoryFilters(club, { query: "smichov", district: "Praha 5", courtType: "indoor", multisport: false })).toBe(true);
    expect(matchesDirectoryFilters(club, { query: "", district: "Praha 9", courtType: "all", multisport: false })).toBe(false);
    expect(matchesDirectoryFilters(club, { query: "", district: "", courtType: "outdoor", multisport: false })).toBe(false);
    const unknown = clubs.find(club => !club.acceptsMultisport)!;
    expect(matchesDirectoryFilters(unknown, { query: "", district: "", courtType: "all", multisport: true })).toBe(false);
  });
});
