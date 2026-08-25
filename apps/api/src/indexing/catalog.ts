import {
  fetchBookaballAvailability,
  fetchCourtyOneAvailability,
  fetchISportSystemAvailabilityWithApify,
  fetchJdemeNaToAvailability,
  fetchJdemeNaToPortalSearchAvailability,
  fetchPadelosAvailability,
  fetchPadelSlaviaAvailability,
  fetchReenioAvailability,
  fetchReservantoAvailability,
  fetchRogerOnlineAvailability,
  fetchSkySportCityAvailability,
  LegacyAvailabilityProviderAdapter,
  PlaytomicAvailabilityProvider,
  createPlaytomicClub,
  type AvailabilityResult,
  type AvailabilityProvider,
  type Club,
  type LegacyProviderFetchInput
} from "@mamekurt/scrapers";

const PRAGUE_TIMEZONE = "Europe/Prague";

export interface IndexedClubRegistration {
  club: Club;
  provider: AvailabilityProvider;
  providerName: string;
}

export interface ProblematicClub {
  slug: string;
  providerId: string;
  reason: string;
}

type RegistrationFactory = () => IndexedClubRegistration;

const REGISTRATIONS: Record<string, RegistrationFactory> = {
  "tk-sparta-praha": () => legacyRegistration(
    club({
      slug: "tk-sparta-praha",
      name: "TK Sparta Praha",
      providerId: "jdemenato",
      providerExternalId: "TK Sparta Praha",
      bookingUrl: "https://jdemenato.cz/reservation/tk-sparta-praha/reservationcalendaroverview",
      courtIndoor: false
    }),
    "JdemeNaTo",
    fetchTkSpartaAvailability
  ),
  "padel-prosek": () => legacyRegistration(
    club({
      slug: "padel-prosek",
      name: "Padel Prosek",
      providerId: "skysportcity",
      providerExternalId: "timeline-tab-0",
      bookingUrl: "https://rezervace.skysportcity.cz/timeline/day?tabIdx=0",
      courtIndoor: false
    }),
    "SkySportCity",
    (input) => fetchSkySportCityAvailability(legacyOptions(input))
  ),
  "padel-club-spoje": () => ({
    club: createPlaytomicClub("padel-club-spoje"),
    provider: new PlaytomicAvailabilityProvider(),
    providerName: "Playtomic"
  }),
  "tenis-a-padel-klub-pisecna": () => ({
    club: createPlaytomicClub("tenis-a-padel-klub-pisecna"),
    provider: new PlaytomicAvailabilityProvider(),
    providerName: "Playtomic"
  }),
  "sk-slavia-praha-padel": () => legacyRegistration(
    club({
      slug: "sk-slavia-praha-padel",
      name: "SK Slavia Praha Padel",
      providerId: "padelslavia",
      providerExternalId: "padel",
      bookingUrl: "https://rezervace.padelslavia.cz/cs/rezervace",
      courtIndoor: false
    }),
    "Padel Slavia",
    (input) => fetchPadelSlaviaAvailability({
      ...legacyOptions(input),
      credentials: padelSlaviaCredentials(),
      browser: padelSlaviaBrowser(input.signal)
    })
  ),
  "head-tenis-centrum-vestec": () => legacyRegistration(
    club({
      slug: "head-tenis-centrum-vestec",
      name: "Head Tenis Centrum Vestec",
      providerId: "isportsystem",
      providerExternalId: "sport-13",
      bookingUrl: "https://teniscentrum.isportsystem.cz/?op=tab-id-13",
      courtIndoor: true
    }),
    "iSportSystem via Apify",
    (input) => fetchISportSystemAvailabilityWithApify({
      ...legacyOptions(input),
      token: apifyToken(),
      actorId: process.env.ISPORTSYSTEM_APIFY_ACTOR_ID?.trim() || undefined,
      apiUrl: process.env.ISPORTSYSTEM_APIFY_API_URL?.trim() || undefined,
      cacheTtlMs: optionalNumber(process.env.ISPORTSYSTEM_APIFY_CACHE_TTL_MS),
      actorTimeoutSecs: optionalNumber(process.env.ISPORTSYSTEM_APIFY_ACTOR_TIMEOUT_SECS)
    })
  ),
  "padel-neride": () => legacyRegistration(
    club({
      slug: "padel-neride",
      name: "Padel Neride",
      providerId: "reservanto",
      providerExternalId: "form-22277-service-99005",
      bookingUrl: "https://padelneride.cz/rezervace/",
      courtIndoor: true
    }),
    "Reservanto",
    (input) => fetchReservantoAvailability(legacyOptions(input))
  ),
  "padel-dzus": () => legacyRegistration(
    club({
      slug: "padel-dzus",
      name: "Padel Džus",
      providerId: "bookaball",
      providerExternalId: "location-90",
      bookingUrl: "https://padeldzus.bookaball.com/cs/bookings/create",
      courtIndoor: true
    }),
    "Bookaball",
    (input) => fetchBookaballAvailability({
      ...legacyOptions(input),
      credentials: bookaballCredentials()
    })
  ),
  "padel-powers-smichov": () => legacyRegistration(
    club({
      slug: "padel-powers-smichov",
      name: "Padel Powers Smíchov",
      providerId: "padelos",
      providerExternalId: "216927",
      bookingUrl: "https://player.padelos.co/company/217?clubIds=216927&locale=cs",
      courtIndoor: true,
      providerConfig: { clubId: "216927", companyId: "217" }
    }),
    "Padelos",
    (input) => fetchPadelosAvailability({
      ...legacyOptions(input),
      clubId: "216927",
      companyId: "217"
    })
  ),
  "one-padel": () => legacyRegistration(
    club({
      slug: "one-padel",
      name: "One Padel",
      providerId: "courtyone",
      providerExternalId: "onepadel-praha-zlicin",
      bookingUrl: "https://onepadel.cz/book",
      courtIndoor: true,
      providerConfig: { tenantSlug: "onepadel", venueSlug: "praha-zlicin" }
    }),
    "CourtyONE",
    (input) => fetchCourtyOneAvailability(legacyOptions(input))
  ),
  "cisarska-louka-padel": () => legacyRegistration(
    club({
      slug: "cisarska-louka-padel",
      name: "Císařská louka Padel",
      providerId: "reenio",
      providerExternalId: "service-48086",
      bookingUrl: "https://areal-cisarska-louka.reenio.cz/cs/service/hriste-padel-48086",
      courtIndoor: false,
      providerConfig: { serviceId: "48086", serviceType: "3" }
    }),
    "Reenio",
    (input) => fetchReenioAvailability(legacyOptions(input))
  ),
  "sk-satalice": () => legacyRegistration(
    club({
      slug: "sk-satalice",
      name: "SK Satalice",
      providerId: "rogeronline",
      providerExternalId: "club-197-set-3",
      bookingUrl: "https://www.rogeronline.cz/v2/?klub=197&set=3",
      courtIndoor: false,
      providerConfig: { clubId: "197", setId: "3", courtCount: 2 }
    }),
    "RogerOnline",
    (input) => fetchRogerOnlineAvailability({
      ...legacyOptions(input),
      clubId: "197",
      setId: "3",
      courtCount: 2
    })
  )
};

export const problematicClubs: readonly ProblematicClub[] = [
  {
    slug: "padel-radotin",
    providerId: "isportsystem",
    reason: "Cloudflare blocks unattended direct HTTP retrieval."
  },
  {
    slug: "padel-cakovice",
    providerId: "isportsystem",
    reason: "Disabled in the current product; retrieval requires a maintained browser profile when Cloudflare is active."
  }
] as const;

export function indexedClubSlugs(): string[] {
  return Object.keys(REGISTRATIONS);
}

export function getIndexedClubRegistration(slug: string): IndexedClubRegistration {
  const registration = REGISTRATIONS[slug];
  if (!registration) {
    throw new Error(`Club ${slug} is not an enabled indexed club. Supported clubs: ${indexedClubSlugs().join(", ")}`);
  }
  return registration();
}

function legacyRegistration(
  configuredClub: Club,
  providerName: string,
  fetchLegacy: (input: LegacyProviderFetchInput) => Promise<AvailabilityResult>
): IndexedClubRegistration {
  return {
    club: configuredClub,
    provider: new LegacyAvailabilityProviderAdapter({ id: configuredClub.providerId, fetchLegacy }),
    providerName
  };
}

function club(options: {
  slug: string;
  name: string;
  providerId: string;
  providerExternalId: string;
  bookingUrl: string;
  courtIndoor: boolean;
  providerConfig?: Record<string, unknown>;
}): Club {
  return {
    id: options.slug,
    slug: options.slug,
    name: options.name,
    providerId: options.providerId,
    providerExternalId: options.providerExternalId,
    providerConfig: {
      sport: "padel",
      courtIndoor: options.courtIndoor,
      minBookingMinutes: 60,
      ...options.providerConfig
    },
    bookingUrl: options.bookingUrl,
    timezone: PRAGUE_TIMEZONE,
    active: true
  };
}

function legacyOptions(input: LegacyProviderFetchInput) {
  return {
    clubSlug: input.club.slug,
    date: input.date,
    sport: "padel",
    fetchImpl: abortableFetch(input.signal)
  };
}

async function fetchTkSpartaAvailability(input: LegacyProviderFetchInput): Promise<AvailabilityResult> {
  try {
    return await fetchJdemeNaToPortalSearchAvailability({
      ...legacyOptions(input),
      organizationName: "TK Sparta Praha",
      timeoutMs: 20_000
    });
  } catch (portalError) {
    const credentials = tkSpartaCredentials();
    if (!credentials) {
      throw portalError;
    }

    return fetchJdemeNaToAvailability({
      ...legacyOptions(input),
      credentials
    });
  }
}

function abortableFetch(signal?: AbortSignal): typeof fetch {
  return (request, init) => fetch(request, { ...init, signal: signal ?? init?.signal });
}

function padelSlaviaCredentials() {
  const email = process.env.PADEL_SLAVIA_EMAIL?.trim();
  const password = process.env.PADEL_SLAVIA_PASSWORD?.trim();
  return email && password ? { email, password } : undefined;
}

function tkSpartaCredentials() {
  const email = process.env.TK_SPARTA_EMAIL?.trim();
  const password = process.env.TK_SPARTA_PASSWORD?.trim();
  return email && password ? { email, password } : undefined;
}

function bookaballCredentials() {
  const email = process.env.BOOKABALL_EMAIL?.trim();
  const password = process.env.BOOKABALL_PASSWORD?.trim();
  return email && password ? { email, password } : undefined;
}

function apifyToken(): string {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) throw new Error("APIFY_TOKEN is required for Head Tenis Centrum availability");
  return token;
}

function padelSlaviaBrowser(signal?: AbortSignal) {
  if (process.env.PADEL_SLAVIA_BROWSER !== "1") return undefined;
  return {
    enabled: true,
    userDataDir: process.env.PADEL_SLAVIA_BROWSER_PROFILE_DIR,
    channel: process.env.PADEL_SLAVIA_BROWSER_CHANNEL,
    executablePath: process.env.PADEL_SLAVIA_BROWSER_EXECUTABLE_PATH,
    headless: process.env.PADEL_SLAVIA_BROWSER_HEADLESS !== "false",
    signal,
    timeoutMs: optionalNumber(process.env.PADEL_SLAVIA_BROWSER_TIMEOUT_MS)
  };
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
