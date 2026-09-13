import { describe, expect, it } from "vitest";
import { getIndexedClubRegistration, indexedClubSlugs, problematicClubs } from "./catalog.js";

describe("indexed provider catalog", () => {
  it("represents all 18 currently enabled clubs across provider-level adapters", () => {
    const slugs = indexedClubSlugs();
    const registrations = slugs.map(getIndexedClubRegistration);

    expect(slugs).toHaveLength(18);
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
    expect(() => getIndexedClubRegistration("padel-hall-radotin")).not.toThrow();
    expect(() => getIndexedClubRegistration("padel-cakovice")).not.toThrow();
    expect(() => getIndexedClubRegistration("the-court")).not.toThrow();
    expect(() => getIndexedClubRegistration("ltc-modrany-2005")).not.toThrow();

    for (const slug of ["head-tenis-centrum-vestec", "plechovka-dubec", "padel-radotin", "padel-hall-radotin", "padel-cakovice", "the-court", "ltc-modrany-2005"]) {
      expect(getIndexedClubRegistration(slug).providerName).toBe("iSportSystem public API");
    }
    const externalIds = ["head-tenis-centrum-vestec", "plechovka-dubec", "padel-radotin", "padel-hall-radotin", "padel-cakovice", "the-court", "ltc-modrany-2005"]
      .map((slug) => getIndexedClubRegistration(slug).club.providerExternalId);
    expect(new Set(externalIds).size).toBe(externalIds.length);
    expect(getIndexedClubRegistration("the-court").club.providerConfig).toMatchObject({
      sportIds: ["1", "12"],
      courtNames: ["Super 1", "Super 2", "Super Single (1vs1)"]
    });
    expect(getIndexedClubRegistration("ltc-modrany-2005").club).toMatchObject({
      bookingUrl: "https://tenismodrany.isportsystem.cz/?op=tab-id-8",
      providerConfig: {
        sportId: "8",
        courtNames: ["Padel 1", "Padel 2", "Padel 3"],
        courtIndoor: false
      }
    });
  });
});
