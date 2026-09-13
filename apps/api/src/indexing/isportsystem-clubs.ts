import { fetchISportSystemApiAvailability, type AvailabilityResult } from "@mamekurt/scrapers";

export interface ISportSystemAdditionalSportConfig {
  sportId: string;
  courtNames: readonly string[];
  courtNameOverrides?: Readonly<Record<string, string>>;
}

export interface ISportSystemClubConfig {
  slug: string;
  name: string;
  baseUrl: string;
  bookingUrl: string;
  sportId: string;
  courtNames: readonly string[];
  courtIndoor: boolean;
  additionalSports?: readonly ISportSystemAdditionalSportConfig[];
}

export const ISPORTSYSTEM_CLUBS: Readonly<Record<string, ISportSystemClubConfig>> = {
  "head-tenis-centrum-vestec": {
    slug: "head-tenis-centrum-vestec",
    name: "Head Tenis Centrum Vestec",
    baseUrl: "https://teniscentrum.isportsystem.cz",
    bookingUrl: "https://teniscentrum.isportsystem.cz/?op=tab-id-13",
    sportId: "13",
    courtNames: ["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"],
    courtIndoor: true
  },
  "plechovka-dubec": {
    slug: "plechovka-dubec",
    name: "Plechovka Dubeč",
    baseUrl: "https://plechovka.isportsystem.cz",
    bookingUrl: "https://plechovka.isportsystem.cz/?op=tab-id-20",
    sportId: "20",
    courtNames: ["Kurt 1", "Kurt 2", "Kurt 3"],
    courtIndoor: true
  },
  "padel-radotin": {
    slug: "padel-radotin",
    name: "Padel Radotín",
    baseUrl: "https://padelradotin.isportsystem.cz",
    bookingUrl: "https://padelradotin.isportsystem.cz/",
    sportId: "1",
    courtNames: ["Kurt 1", "Kurt 2", "Kurt 3"],
    courtIndoor: false
  },
  "padel-hall-radotin": {
    slug: "padel-hall-radotin",
    name: "Padel Hall Olympia Radotín",
    baseUrl: "https://padelhall.isportsystem.cz",
    bookingUrl: "https://padelhall.isportsystem.cz/",
    sportId: "1",
    courtNames: ["Kurt"],
    courtIndoor: false
  },
  "padel-cakovice": {
    slug: "padel-cakovice",
    name: "Padel Čakovice",
    baseUrl: "https://padelautomat.isportsystem.cz",
    bookingUrl: "https://padelautomat.isportsystem.cz/",
    sportId: "1",
    courtNames: ["Indoor kurt Klasik", "Indoor kurt Panorama"],
    courtIndoor: true
  },
  "the-court": {
    slug: "the-court",
    name: "The Court",
    baseUrl: "https://thecourt.isportsystem.cz",
    bookingUrl: "https://thecourt.isportsystem.cz/",
    sportId: "1",
    courtNames: ["Super 1", "Super 2"],
    courtIndoor: true,
    additionalSports: [{
      sportId: "12",
      courtNames: ["Kurt"],
      courtNameOverrides: { Kurt: "Super Single (1vs1)" }
    }]
  },
  "ltc-modrany-2005": {
    slug: "ltc-modrany-2005",
    name: "LTC Modřany",
    baseUrl: "https://tenismodrany.isportsystem.cz",
    bookingUrl: "https://tenismodrany.isportsystem.cz/?op=tab-id-8",
    sportId: "8",
    courtNames: ["Padel 1", "Padel 2", "Padel 3"],
    courtIndoor: false
  }
} as const;

export function isportSystemClubConfig(slug: string): ISportSystemClubConfig | undefined {
  return ISPORTSYSTEM_CLUBS[slug];
}

export async function fetchISportSystemClubAvailability(options: {
  config: ISportSystemClubConfig;
  clubSlug: string;
  date?: string;
  fetchImpl?: typeof fetch;
  sport?: string;
}): Promise<AvailabilityResult> {
  const sports = [
    { sportId: options.config.sportId, courtNames: options.config.courtNames },
    ...(options.config.additionalSports ?? [])
  ];
  const results: AvailabilityResult[] = [];

  for (const configuredSport of sports) {
    const result = await fetchISportSystemApiAvailability({
      baseUrl: options.config.baseUrl,
      clubSlug: options.clubSlug,
      courtNames: configuredSport.courtNames,
      date: options.date,
      fetchImpl: options.fetchImpl,
      sport: options.sport,
      sportId: configuredSport.sportId
    });
    const courtNameOverrides = "courtNameOverrides" in configuredSport
      ? configuredSport.courtNameOverrides
      : undefined;
    results.push({
      ...result,
      courts: result.courts.map((court) => ({
        ...court,
        court: courtNameOverrides?.[court.court] ?? court.court
      }))
    });
  }

  const [primary, ...additional] = results;
  if (!primary) throw new Error(`No iSportSystem sports configured for ${options.clubSlug}`);
  return {
    ...primary,
    sourceUrl: options.config.bookingUrl,
    dayRange: {
      start: results.reduce((start, result) => result.dayRange.start < start ? result.dayRange.start : start, primary.dayRange.start),
      end: results.reduce((end, result) => result.dayRange.end > end ? result.dayRange.end : end, primary.dayRange.end)
    },
    courts: [primary, ...additional].flatMap((result) => result.courts)
  };
}
