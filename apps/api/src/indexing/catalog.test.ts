import { describe, expect, it } from "vitest";
import { getIndexedClubRegistration, indexedClubSlugs, problematicClubs } from "./catalog.js";

describe("indexed provider catalog", () => {
  it("represents all 10 currently enabled clubs across provider-level adapters", () => {
    const slugs = indexedClubSlugs();
    const registrations = slugs.map(getIndexedClubRegistration);

    expect(slugs).toHaveLength(10);
    expect(new Set(registrations.map(({ provider }) => provider.id))).toEqual(new Set([
      "skysportcity",
      "playtomic",
      "padelslavia",
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

  it("tracks disabled and protected clubs as explicit blockers", () => {
    expect(problematicClubs.map(({ slug }) => slug).sort()).toEqual([
      "head-tenis-centrum-vestec",
      "padel-cakovice",
      "padel-radotin",
      "tk-sparta-praha"
    ]);
    expect(() => getIndexedClubRegistration("padel-radotin")).toThrow("not an enabled indexed club");
  });
});
