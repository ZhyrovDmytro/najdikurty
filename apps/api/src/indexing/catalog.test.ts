import { describe, expect, it } from "vitest";
import { getIndexedClubRegistration, indexedClubSlugs, problematicClubs } from "./catalog.js";

describe("indexed provider catalog", () => {
  it("represents all 15 currently enabled clubs across provider-level adapters", () => {
    const slugs = indexedClubSlugs();
    const registrations = slugs.map(getIndexedClubRegistration);

    expect(slugs).toHaveLength(15);
    expect(new Set(registrations.map(({ provider }) => provider.id))).toEqual(new Set([
      "skysportcity",
      "jdemenato",
      "playtomic",
      "padelslavia",
      "isportsystem",
      "reservanto",
      "bookaball",
      "padelos",
      "courtyone",
      "reenio",
      "rogeronline"
    ]));
    for (const registration of registrations) {
      expect(registration.provider.id).toBe(registration.club.providerId);
      expect(registration.club.providerConfig).toMatchObject({ sport: "padel", minBookingMinutes: 60 });
    }
  });

  it("enables every configured iSportSystem club through the public API", () => {
    expect(problematicClubs).toEqual([]);
    expect(() => getIndexedClubRegistration("head-tenis-centrum-vestec")).not.toThrow();
    expect(getIndexedClubRegistration("head-tenis-centrum-vestec").refreshCadenceMinutes).toBeUndefined();
    expect(() => getIndexedClubRegistration("plechovka-dubec")).not.toThrow();
    expect(() => getIndexedClubRegistration("tk-sparta-praha")).not.toThrow();
    expect(() => getIndexedClubRegistration("padel-radotin")).not.toThrow();
    expect(() => getIndexedClubRegistration("padel-cakovice")).not.toThrow();

    for (const slug of ["head-tenis-centrum-vestec", "plechovka-dubec", "padel-radotin", "padel-cakovice"]) {
      expect(getIndexedClubRegistration(slug).providerName).toBe("iSportSystem public API");
    }
    const externalIds = ["head-tenis-centrum-vestec", "plechovka-dubec", "padel-radotin", "padel-cakovice"]
      .map((slug) => getIndexedClubRegistration(slug).club.providerExternalId);
    expect(new Set(externalIds).size).toBe(externalIds.length);
  });
});
