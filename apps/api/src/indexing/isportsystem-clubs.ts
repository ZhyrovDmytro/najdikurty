export interface ISportSystemClubConfig {
  slug: string;
  name: string;
  baseUrl: string;
  bookingUrl: string;
  sportId: string;
  courtNames: readonly string[];
  courtIndoor: boolean;
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
  "padel-cakovice": {
    slug: "padel-cakovice",
    name: "Padel Čakovice",
    baseUrl: "https://padelautomat.isportsystem.cz",
    bookingUrl: "https://padelautomat.isportsystem.cz/",
    sportId: "1",
    courtNames: ["Indoor kurt Klasik", "Indoor kurt Panorama"],
    courtIndoor: true
  }
} as const;

export function isportSystemClubConfig(slug: string): ISportSystemClubConfig | undefined {
  return ISPORTSYSTEM_CLUBS[slug];
}
