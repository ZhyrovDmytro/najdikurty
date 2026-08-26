import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock3,
  CloudSun,
  Cookie,
  ExternalLink,
  FileText,
  Info,
  Link2,
  ListOrdered,
  LayoutGrid,
  Menu,
  MapPin,
  Moon,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  SearchCheck,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Scale,
  Sun,
  Timer,
  TriangleAlert,
  UsersRound,
  WalletCards
} from "lucide-react";
import {
  buildBookableSlots,
  buildDurationOptions,
  buildTimeOptions,
  formatDuration,
  toMinutes,
  type AvailabilityResult,
  type BookableSlot,
  type TimeRange
} from "./availability";
import {
  databaseSearchToAvailabilityByClub,
  fetchDatabaseSearchWithRetry
} from "./database-search";
import { browserCoordinates, distanceInKilometers, type Coordinates } from "./distance";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton } from "./ui";
import i18n, { LANGUAGE_OPTIONS, LANGUAGE_STORAGE_KEY, languageFromPathname, type LanguageCode } from "./i18n";
import { hasManualRefreshCompleted, type ManualRefreshStatusResponse } from "./manual-refresh";
import { captureEvent, capturePageView, isAnalyticsEnabled } from "./posthog";
import { approximateCountdown, nextApproximateCheck } from "./refresh-schedule";
import "./styles.css";

const MAX_SEARCH_DAYS_AHEAD = 7;
const initialParams = new URLSearchParams(window.location.search);
const initialCurrentDate = pragueDateInputValue(new Date());
const today = selectableDate(initialParams.get("date"), initialCurrentDate);
const initialTheme = localStorage.getItem("mamekurt-theme") === "dark" ? "dark" : "light";
const initialLanguage = i18n.language as LanguageCode;
const initialResultsView = localStorage.getItem("mamekurt-results-view");
const initialShortInfoMode = initialResultsView === "cards" ? false : true;
const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GITHUB_PAGES_API_BASE_URL = "https://najdikurty.onrender.com";
const API_BASE_URL = (
  CONFIGURED_API_BASE_URL ||
  (import.meta.env.MODE === "production" && window.location.hostname.endsWith("github.io") ? GITHUB_PAGES_API_BASE_URL : "")
).replace(/\/$/, "");
const USE_DATABASE_SEARCH = import.meta.env.VITE_USE_DATABASE_SEARCH === "true";
type Page = "clubs" | "allClubs" | "about" | "privacy" | "terms" | "cookies";
const initialRoute = routeFromLocation(window.location.pathname, initialParams);
const initialPage: Page = initialRoute.page;
type CourtType = "indoor" | "outdoor";
type CourtTypeFilter = CourtType | "all";
type FindCourtSort = "name" | "priceAsc" | "priceDesc" | "multisport" | "indoor" | "outdoor";
type LocationStatus = "idle" | "requesting" | "available" | "denied" | "unavailable";
type ManualRefreshTone = "info" | "success" | "warning";
const TIME_PICKER_RANGE: TimeRange = { start: "00:00", end: "24:00" };
const AVAILABILITY_REQUEST_TIMEOUT_MS = 30_000;
const AVAILABILITY_REQUEST_MAX_ATTEMPTS = 2;
const AVAILABILITY_REQUEST_RETRY_DELAY_MS = 1_000;
const AVAILABILITY_REQUEST_CONCURRENCY = 3;
const DATABASE_SEARCH_REQUEST_TIMEOUT_MS = 20_000;
const DATABASE_SEARCH_REQUEST_MAX_ATTEMPTS = 3;
const DATABASE_SEARCH_MAX_DURATION_MINUTES = 8 * 60;
const MANUAL_REFRESH_POLL_INTERVAL_MS = 5_000;
const MANUAL_REFRESH_WAIT_TIMEOUT_MS = 15 * 60_000;
const databaseBackendWarmup = USE_DATABASE_SEARCH
  ? fetchAvailabilityRequest(`${API_BASE_URL}/api/ready`).then((response) => {
      if (!response.ok) throw new Error(`Database readiness check failed (${response.status})`);
    }).catch(() => undefined)
  : Promise.resolve();
const localeByLanguage: Record<LanguageCode, string> = {
  cz: "cs",
  en: "en",
  ua: "uk"
};
const SITE_ORIGIN = "https://hledejkurty.cz";
const SERVICE_OPERATOR_NAME = "Dmytro Zhyrov";
const SOCIAL_IMAGE_URL = `${SITE_ORIGIN}/logo.png`;
const DEFAULT_META_DESCRIPTION =
  "Find free padel courts in Prague. Search padel court availability by date, time, duration, indoor or outdoor courts, Multisport support, prices, and booking links.";

interface SeoMeta {
  canonicalUrl: string;
  description: string;
  alternateUrls: Record<LanguageCode, string>;
  imageUrl: string;
  jsonLd: Record<string, unknown>;
  locale: string;
  title: string;
}

interface Club {
  slug: string;
  name: string;
  sport: string;
  imageUrl: string;
  address: string;
  coordinates: Coordinates;
  phone: string;
  secondaryPhone?: string;
  priceInfo: string;
  courtCount: number;
  courtTypes: CourtType[];
  courtTypeLabel: string;
  acceptsMultisport?: boolean;
  availabilityEnabled?: boolean;
  openingHours?: Record<number, TimeRange>;
  bookingUrl: (date: string) => string;
}

const CLUBS: Club[] = [
  {
    slug: "tk-sparta-praha",
    name: "TK Sparta Prague",
    sport: "padel",
    imageUrl: assetPath("clubs/tk-sparta-praha.png"),
    address: "Za Císařským mlýnem 1115/2, 170 00 Praha 7-Bubeneč",
    coordinates: { latitude: 50.1103645, longitude: 14.4092412 },
    phone: "+420 731 422 225",
    priceInfo: "1 h: Po-Pá 8-16 520 Kč, 16-21 580 Kč; víkend 540 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    acceptsMultisport: true,
    openingHours: dailyOpeningHours({ start: "08:00", end: "21:00" }),
    bookingUrl: (date: string) =>
      `https://jdemenato.cz/reservation/myportalorganizationcalendar.navigation.daynavigationbar:selectdayinternal/${date}`
  },
  {
    slug: "padel-prosek",
    name: "Padel Prosek",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-prosek.png"),
    address: "Lovosická 559, 190 00 Praha 9-Střížkov",
    coordinates: { latitude: 50.1288187, longitude: 14.4993459 },
    phone: "+420 601 559 559",
    priceInfo: "1 h: Po-Pá 7-22 600 Kč; víkend 480 Kč.",
    courtCount: 4,
    courtTypes: ["outdoor"],
    courtTypeLabel: "4 outdoor courts",
    acceptsMultisport: true,
    openingHours: dailyOpeningHours({ start: "07:00", end: "22:00" }),
    bookingUrl: (date: string) => skySportCityTimelineUrl(date)
  },
  {
    slug: "padel-club-spoje",
    name: "Padel Club Spoje",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-club-spoje.png"),
    address: "Na Balkáně 990/21A, 130 00 Praha",
    coordinates: { latitude: 50.0959695, longitude: 14.4877421 },
    phone: "+420 737 303 003",
    priceInfo: "1 h: Po-Pá 8-14 480 Kč, 14-20 520 Kč; víkend 520 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    openingHours: weekdayOpeningHours({
      0: { start: "09:00", end: "20:00" },
      1: { start: "08:00", end: "21:00" },
      2: { start: "08:00", end: "21:00" },
      3: { start: "08:00", end: "21:00" },
      4: { start: "08:00", end: "21:00" },
      5: { start: "08:00", end: "21:00" },
      6: { start: "09:00", end: "20:00" }
    }),
    bookingUrl: (date: string) => playtomicClubUrl("padel-club-spoje", date)
  },
  {
    slug: "tenis-a-padel-klub-pisecna",
    name: "Tenis & Padel klub Písečná",
    sport: "padel",
    imageUrl: assetPath("clubs/tenis-a-padel-klub-pisecna.png"),
    address: "K Sadu 590/1, Praha 8 - Troja, 182 00 Praha",
    coordinates: { latitude: 50.1241441, longitude: 14.4368368 },
    phone: "+420 725 843 649",
    priceInfo: "1 h: Po-Pá 8-16 540 Kč, 16-22 640 Kč; víkend 540 Kč.",
    courtCount: 4,
    courtTypes: ["indoor", "outdoor"],
    courtTypeLabel: "2 indoor + 2 outdoor courts",
    openingHours: dailyOpeningHours({ start: "08:00", end: "22:00" }),
    bookingUrl: (date: string) => playtomicClubUrl("tenis-a-padel-klub-pisecna", date)
  },
  {
    slug: "sk-slavia-praha-padel",
    name: "SK Slavia Praha Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/sk-slavia-praha-padel.png"),
    address: "Vladivostocká 1460/10, Praha 10",
    coordinates: { latitude: 50.067487, longitude: 14.4797136 },
    phone: "+420 606 030 301",
    priceInfo: "1 h: Po-Pá 8-10 690 Kč, 10-15 550 Kč, 15-22 690 Kč; víkend 550 Kč.",
    courtCount: 4,
    courtTypes: ["outdoor"],
    courtTypeLabel: "4 outdoor courts",
    openingHours: dailyOpeningHours({ start: "08:00", end: "22:00" }),
    bookingUrl: (date: string) => `https://rezervace.padelslavia.cz/cs/rezervace/index/padel/${date}`
  },
  {
    slug: "head-tenis-centrum-vestec",
    name: "Head Tenis Centrum, Vestec",
    sport: "padel",
    imageUrl: assetPath("clubs/head-tenis-centrum-vestec.png"),
    address: "Sportovní 456, 252 42 Vestec-Jesenice u Prahy",
    coordinates: { latitude: 49.9898123, longitude: 14.4882419 },
    phone: "+420 777 773 139",
    priceInfo: "1 h: Po-Pá 7-16 750 Kč, 16-24 900 Kč; víkend 850 Kč.",
    courtCount: 4,
    courtTypes: ["indoor"],
    courtTypeLabel: "4 indoor courts",
    acceptsMultisport: true,
    availabilityEnabled: true,
    openingHours: dailyOpeningHours({ start: "07:00", end: "24:00" }),
    bookingUrl: () => "https://teniscentrum.isportsystem.cz/?op=tab-id-13"
  },
  {
    slug: "padel-radotin",
    name: "Padel Radotín",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-radotin.png"),
    address: "Šárovo kolo 932/1, 153 00 Praha 16",
    coordinates: { latitude: 49.9857783, longitude: 14.3721741 },
    phone: "+420 739 504 053",
    secondaryPhone: "+420 739 504 052",
    priceInfo: "1 h: Po-Pá 7-15 560 Kč, 15-22 640 Kč; víkend 7-22 600 Kč.",
    courtCount: 3,
    courtTypes: ["outdoor"],
    courtTypeLabel: "3 outdoor courts",
    acceptsMultisport: true,
    availabilityEnabled: false,
    openingHours: dailyOpeningHours({ start: "07:00", end: "22:00" }),
    bookingUrl: () => "https://padelradotin.isportsystem.cz/"
  },
  {
    slug: "padel-cakovice",
    name: "Padel Čakovice",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-cakovice.png"),
    address: "Jizerská 328/4, 196 00 Praha-Čakovice",
    coordinates: { latitude: 50.1495813, longitude: 14.5200855 },
    phone: "Not published",
    priceInfo: "1 h: price not published.",
    courtCount: 2,
    courtTypes: ["indoor"],
    courtTypeLabel: "2 indoor courts",
    availabilityEnabled: false,
    openingHours: dailyOpeningHours({ start: "07:00", end: "22:00" }),
    bookingUrl: () => "https://padelautomat.isportsystem.cz/"
  },
  {
    slug: "padel-neride",
    name: "Padel Neride",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-neride.png"),
    address: "V Chotejně 700, 102 00 Praha 15",
    coordinates: { latitude: 50.0587784, longitude: 14.5316941 },
    phone: "+420 272 111 817",
    priceInfo: "1 h: léto Po-Pá 6-16 420 Kč, 16-24 490 Kč, víkend 420 Kč; zima 650-750 Kč.",
    courtCount: 3,
    courtTypes: ["indoor"],
    courtTypeLabel: "3 indoor courts",
    acceptsMultisport: true,
    openingHours: dailyOpeningHours({ start: "06:00", end: "24:00" }),
    bookingUrl: () => "https://padelneride.cz/rezervace/"
  },
  {
    slug: "padel-dzus",
    name: "Padel Džus",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-dzus.png"),
    address: "U Továren 999/31, 102 00 Praha 15-Hostivař",
    coordinates: { latitude: 50.0580035, longitude: 14.5444159 },
    phone: "+420 602 605 905",
    priceInfo: "1 h: Po-Pá 7-16 650-800 Kč, 16-23 750-900 Kč; víkend 700-850 Kč.",
    courtCount: 4,
    courtTypes: ["indoor"],
    courtTypeLabel: "4 indoor courts",
    acceptsMultisport: true,
    openingHours: dailyOpeningHours({ start: "07:00", end: "23:00" }),
    bookingUrl: (date: string) => bookaballUrl(date)
  },
  {
    slug: "padel-powers-smichov",
    name: "Padel Powers Smíchov",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-powers-smichov.png"),
    address: "Křížová 6, 150 00 Praha 5-Smíchov",
    coordinates: { latitude: 50.054572, longitude: 14.405485 },
    phone: "+420 725 521 360",
    priceInfo: "1 h: Po-Pá 7-16 800 Kč, 16-00 900 Kč.",
    courtCount: 8,
    courtTypes: ["indoor"],
    courtTypeLabel: "8 indoor courts",
    acceptsMultisport: true,
    openingHours: dailyOpeningHours({ start: "07:00", end: "24:00" }),
    bookingUrl: () => padelosCompanyUrl()
  },
  {
    slug: "one-padel",
    name: "One Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/one-padel.png"),
    address: "Ringhofferova 115, 155 21 Praha 17-Zličín",
    coordinates: { latitude: 50.0549627, longitude: 14.2934101 },
    phone: "Not published",
    priceInfo: "1 h: from 850 Kč.",
    courtCount: 9,
    courtTypes: ["indoor"],
    courtTypeLabel: "9 indoor courts",
    openingHours: dailyOpeningHours({ start: "06:00", end: "24:00" }),
    bookingUrl: () => "https://onepadel.cz/book"
  },
  {
    slug: "cisarska-louka-padel",
    name: "Císařská louka Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/cisarska-louka-padel.png"),
    address: "Areál Císařská louka, Praha 5-Smíchov",
    coordinates: { latitude: 50.0549172, longitude: 14.41281 },
    phone: "+420 725 795 323",
    priceInfo: "1 h: Po-Pá 9-12 690 Kč, 12-16 790 Kč, 16-23 850 Kč; víkend 11-21:30 850 Kč.",
    courtCount: 3,
    courtTypes: ["outdoor"],
    courtTypeLabel: "3 outdoor courts",
    acceptsMultisport: true,
    openingHours: weekdayOpeningHours({
      0: { start: "11:00", end: "21:30" },
      1: { start: "09:00", end: "23:00" },
      2: { start: "09:00", end: "23:00" },
      3: { start: "09:00", end: "23:00" },
      4: { start: "09:00", end: "23:00" },
      5: { start: "09:00", end: "23:00" },
      6: { start: "11:00", end: "21:30" }
    }),
    bookingUrl: (date: string) => reenioBookingUrl(date)
  },
  {
    slug: "sk-satalice",
    name: "SK Satalice",
    sport: "padel",
    imageUrl: assetPath("clubs/sk-satalice.png"),
    address: "Budovatelská 12, 190 15 Praha-Satalice",
    coordinates: { latitude: 50.1212956, longitude: 14.5647693 },
    phone: "+420 721 069 640",
    priceInfo: "1 h: Po-Pá 8-22 590 Kč; víkend 8-22 540 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    openingHours: dailyOpeningHours({ start: "08:00", end: "22:00" }),
    bookingUrl: (date: string) => rogerOnlineUrl(date)
  }
];

const FETCHABLE_CLUBS = CLUBS.filter((club) => club.availabilityEnabled !== false);
const HOME_FEATURED_CLUB_SLUGS = [
  "padel-prosek",
  "padel-club-spoje",
  "padel-neride",
  "padel-dzus",
  "padel-powers-smichov",
  "one-padel"
] as const;
const ABOUT_FAQ_KEYS = ["availability", "updates", "booking", "trackedClubs", "accuracy", "multisport"] as const;
const CLUB_IMAGE_DIMENSIONS: Record<string, { height: number; width: number }> = {
  "cisarska-louka-padel": { height: 768, width: 1024 },
  "head-tenis-centrum-vestec": { height: 1536, width: 2048 },
  "one-padel": { height: 497, width: 402 },
  "padel-cakovice": { height: 612, width: 900 },
  "padel-club-spoje": { height: 833, width: 1360 },
  "padel-dzus": { height: 640, width: 480 },
  "padel-neride": { height: 500, width: 500 },
  "padel-powers-smichov": { height: 259, width: 389 },
  "padel-prosek": { height: 600, width: 640 },
  "padel-radotin": { height: 300, width: 168 },
  "sk-satalice": { height: 675, width: 900 },
  "sk-slavia-praha-padel": { height: 200, width: 341 },
  "tenis-a-padel-klub-pisecna": { height: 1186, width: 2192 },
  "tk-sparta-praha": { height: 940, width: 1920 }
};
type AvailabilityByClub = Record<string, AvailabilityResult>;
type FailedClub = {
  club: Club;
  reason: string;
};
interface TrackedClub {
  club: Club;
  priceFrom: number;
}

interface LoadProgress {
  completed: number;
  total: number;
}

interface AvailabilityLoadOptions {
  customEndTime?: string | null;
  customStartTime?: string | null;
  date?: string;
  duration?: number;
  selectedClubSlug?: string | null;
  courtTypeFilter?: CourtTypeFilter;
}

async function parseAvailabilityResponse(response: Response): Promise<AvailabilityResult & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(
    response.ok
      ? i18n.t("availability.failedJson")
      : `Availability request failed with ${response.status} ${response.statusText || text.slice(0, 120)}`
  );
}

async function fetchAvailabilityRequest(
  url: string,
  timeoutMs = AVAILABILITY_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(i18n.t("availability.timeout", { seconds: Math.round(timeoutMs / 1000) }));
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchAvailabilityWithRetry(url: string, clubName: string): Promise<AvailabilityResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AVAILABILITY_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchAvailabilityRequest(url);
      const payload = await parseAvailabilityResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to load ${clubName}`);
      }

      return payload;
    } catch (error) {
      lastError = error;
      if (attempt === AVAILABILITY_REQUEST_MAX_ATTEMPTS) break;
      await delay(AVAILABILITY_REQUEST_RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(i18n.t("availability.unknownCheckFailure"));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await task(item);
      }
    })
  );
}

function App() {
  const { t } = useTranslation();
  const [page, setPage] = useState<Page>(initialPage);
  const [date, setDate] = useState(today);
  const [courtsNeeded, setCourtsNeeded] = useState(1);
  const [duration, setDuration] = useState(60);
  const [courtTypeFilter, setCourtTypeFilter] = useState<CourtTypeFilter>("all");
  const [customStartTime, setCustomStartTime] = useState<string | null>(null);
  const [customEndTime, setCustomEndTime] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [availabilityByClub, setAvailabilityByClub] = useState<AvailabilityByClub>({});
  const [selectedClubSlug, setSelectedClubSlug] = useState<string | null>(initialPage === "clubs" ? initialRoute.clubSlug : null);
  const [allClubsSort, setAllClubsSort] = useState<FindCourtSort>("name");
  const [findCourtSort, setFindCourtSort] = useState<FindCourtSort>("name");
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
  const [isShortInfoMode, setIsShortInfoMode] = useState(initialShortInfoMode);
  const [expandedCompactClubSlugs, setExpandedCompactClubSlugs] = useState<Set<string>>(() => new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [failedClubs, setFailedClubs] = useState<FailedClub[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualRefreshMessage, setManualRefreshMessage] = useState<string | null>(null);
  const [manualRefreshTone, setManualRefreshTone] = useState<ManualRefreshTone>("info");
  const [isManualRefreshRequesting, setIsManualRefreshRequesting] = useState(false);
  const [isManualRefreshWaiting, setIsManualRefreshWaiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ completed: 0, total: 0 });
  const [checkedClubSlugs, setCheckedClubSlugs] = useState<Set<string>>(() => new Set());
  const [availabilityCheckClubs, setAvailabilityCheckClubs] = useState<Club[]>([]);
  const [hasSearchedAvailability, setHasSearchedAvailability] = useState(initialPage === "clubs" && Boolean(initialRoute.clubSlug));
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const loadSequenceRef = useRef(0);
  const manualRefreshSequenceRef = useRef(0);
  const currentPragueDate = pragueDateInputValue(now);
  const maximumSelectableDate = addDaysToDateInput(currentPragueDate, MAX_SEARCH_DAYS_AHEAD);
  const trackedClubs = useMemo(() => sortTrackedClubs(buildTrackedClubs(CLUBS), allClubsSort), [allClubsSort]);

  function clearAvailabilityResults() {
    loadSequenceRef.current += 1;
    setAvailabilityByClub({});
    setFailedClubs([]);
    setLoadError(null);
    setIsLoading(false);
    setLoadProgress({ completed: 0, total: 0 });
    setCheckedClubSlugs(new Set());
    setAvailabilityCheckClubs([]);
  }

  async function loadAvailability(options: AvailabilityLoadOptions = {}) {
    const hasOption = (key: keyof AvailabilityLoadOptions) => Object.prototype.hasOwnProperty.call(options, key);
    const searchDate = options.date ?? date;
    const searchStartTime = hasOption("customStartTime") ? options.customStartTime ?? null : customStartTime;
    const searchEndTime = hasOption("customEndTime") ? options.customEndTime ?? null : customEndTime;
    const searchSelectedClubSlug = hasOption("selectedClubSlug") ? options.selectedClubSlug ?? null : selectedClubSlug;
    const searchCourtTypeFilter = options.courtTypeFilter ?? courtTypeFilter;
    const searchDuration = options.duration ?? duration;
    const searchWindow = effectiveTimeWindowForDate(searchDate, searchStartTime, searchEndTime, now);
    const targetClubs = (searchSelectedClubSlug
      ? CLUBS.filter(
          (club) =>
            club.slug === searchSelectedClubSlug &&
            club.availabilityEnabled !== false &&
            clubMatchesCourtType(club, searchCourtTypeFilter)
        )
      : FETCHABLE_CLUBS.filter((club) => clubMatchesCourtType(club, searchCourtTypeFilter))
    ).filter((club) => clubCanMatchSearchWindow(club, searchDate, searchDuration, searchWindow, now));
    const loadId = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadId;

    setIsLoading(true);
    setAvailabilityByClub((currentAvailability) => {
      if (!searchSelectedClubSlug) return {};
      const nextAvailability = { ...currentAvailability };
      delete nextAvailability[searchSelectedClubSlug];
      return nextAvailability;
    });
    setFailedClubs([]);
    setLoadError(null);
    setLoadProgress({ completed: 0, total: targetClubs.length });
    setCheckedClubSlugs(new Set());
    setAvailabilityCheckClubs(targetClubs);

    if (targetClubs.length === 0) {
      setIsLoading(false);
      return;
    }

    if (USE_DATABASE_SEARCH) {
      const params = new URLSearchParams({
        date: searchDate,
        from: searchWindow.start,
        to: searchWindow.end,
        duration: String(searchDuration),
        clubs: targetClubs.map((club) => club.slug).join(",")
      });
      if (searchCourtTypeFilter !== "all") {
        params.set("indoor", String(searchCourtTypeFilter === "indoor"));
      }

      try {
        await databaseBackendWarmup;
        const response = await fetchDatabaseSearchWithRetry(
          `${API_BASE_URL}/api/search?${params}`,
          (url) => fetchAvailabilityRequest(url, DATABASE_SEARCH_REQUEST_TIMEOUT_MS),
          {
            attempts: DATABASE_SEARCH_REQUEST_MAX_ATTEMPTS,
            delay,
            retryDelayMs: AVAILABILITY_REQUEST_RETRY_DELAY_MS
          }
        );
        if (loadSequenceRef.current !== loadId) return;
        const dayRangeByClub = Object.fromEntries(targetClubs.map((club) => [
          club.slug,
          club.openingHours?.[weekdayForDate(searchDate)] ?? TIME_PICKER_RANGE
        ]));
        const databaseAvailability = databaseSearchToAvailabilityByClub(response, {
          date: searchDate,
          durationMinutes: searchDuration,
          dayRangeByClub
        });
        setAvailabilityByClub((currentAvailability) =>
          searchSelectedClubSlug
            ? { ...currentAvailability, ...databaseAvailability }
            : databaseAvailability
        );
        setCheckedClubSlugs(new Set(targetClubs.map((club) => club.slug)));
        setLoadProgress({ completed: targetClubs.length, total: targetClubs.length });
      } catch (error) {
        if (loadSequenceRef.current !== loadId) return;
        const reason = error instanceof Error ? error.message : t("availability.failedLoad");
        setLoadError(reason);
        setFailedClubs(targetClubs.map((club) => ({ club, reason })));
      } finally {
        if (loadSequenceRef.current === loadId) setIsLoading(false);
      }
      return;
    }

    try {
      await runWithConcurrency(
        targetClubs,
        AVAILABILITY_REQUEST_CONCURRENCY,
        async (club) => {
          const params = new URLSearchParams({ club: club.slug, sport: club.sport, date: searchDate });
          try {
            const payload = await fetchAvailabilityWithRetry(`${API_BASE_URL}/api/availability?${params}`, club.name);

            if (loadSequenceRef.current !== loadId) return;
            setAvailabilityByClub((currentAvailability) => ({
              ...currentAvailability,
              [club.slug]: payload
            }));
          } catch (error) {
            if (loadSequenceRef.current !== loadId) return;
            setFailedClubs((currentFailedClubs) => [
              ...currentFailedClubs,
              {
                club,
                reason: error instanceof Error ? error.message : t("availability.unknownCheckFailure")
              }
            ]);
          } finally {
            if (loadSequenceRef.current === loadId) {
              setCheckedClubSlugs((currentSlugs) => {
                const nextSlugs = new Set(currentSlugs);
                nextSlugs.add(club.slug);
                return nextSlugs;
              });
              setLoadProgress((currentProgress) => ({
                ...currentProgress,
                completed: Math.min(currentProgress.completed + 1, currentProgress.total)
              }));
            }
          }
        }
      );
    } catch (loadError) {
      if (loadSequenceRef.current === loadId) {
        setLoadError(loadError instanceof Error ? loadError.message : t("availability.failedLoad"));
      }
    } finally {
      if (loadSequenceRef.current === loadId) {
        setIsLoading(false);
      }
    }
  }

  async function requestLocationForDistances() {
    if (userCoordinates || locationStatus !== "idle") return;
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("requesting");
    try {
      const coordinates = await browserCoordinates(navigator.geolocation);
      setUserCoordinates(coordinates);
      setLocationStatus("available");
      captureEvent("location_permission_result", { result: "granted" });
    } catch (error) {
      const result = geolocationErrorCode(error) === 1 ? "denied" : "unavailable";
      setLocationStatus(result);
      captureEvent("location_permission_result", { result });
    }
  }

  useEffect(() => {
    if (page !== "clubs") return;
    if (!selectedClubSlug) return;
    void loadAvailability();
  }, [courtTypeFilter, date, page, selectedClubSlug]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mamekurt-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = localeByLanguage[language];
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("mamekurt-results-view", isShortInfoMode ? "compact" : "cards");
  }, [isShortInfoMode]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [page, selectedClubSlug]);

  useEffect(() => {
    manualRefreshSequenceRef.current += 1;
    setIsManualRefreshWaiting(false);
    setManualRefreshMessage(null);
  }, [date, selectedClubSlug]);

  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const nextRoute = routeFromLocation(window.location.pathname, params);
      const nextPage = nextRoute.page;
      setLanguage(nextRoute.language);
      setPage(nextPage);
      setDate(selectableDate(params.get("date"), pragueDateInputValue(new Date())));
      setSelectedClubSlug(nextPage === "clubs" ? nextRoute.clubSlug : null);
      setHasSearchedAvailability(nextPage === "clubs" && Boolean(nextRoute.clubSlug));
      if (nextPage === "clubs" && !nextRoute.clubSlug) {
        clearAvailabilityResults();
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const urlDate = new URLSearchParams(window.location.search).get("date");
    const nextSelectableDate = selectableDate(urlDate, currentPragueDate);
    if (page === "clubs" && urlDate && urlDate !== nextSelectableDate) {
      writeUrl({ date: nextSelectableDate, clubSlug: selectedClubSlug, mode: "replace" });
    }
  }, []);

  useEffect(() => {
    const nextSelectableDate = selectableDate(date, currentPragueDate);
    if (date === nextSelectableDate) return;

    setDate(nextSelectableDate);
    if (page === "clubs") {
      writeUrl({ date: nextSelectableDate, clubSlug: selectedClubSlug, mode: "replace" });
    }
  }, [currentPragueDate, date, page, selectedClubSlug]);

  const selectedClub = page === "clubs" ? (CLUBS.find((club) => club.slug === selectedClubSlug) ?? null) : null;
  const selectedAvailability = selectedClub ? availabilityByClub[selectedClub.slug] : null;
  const selectedClubFailure = selectedClub ? failedClubs.find(({ club }) => club.slug === selectedClub.slug) : null;
  const isSelectedClubSlotsLoading =
    selectedClub !== null &&
    selectedClub.availabilityEnabled !== false &&
    clubMatchesCourtType(selectedClub, courtTypeFilter) &&
    !selectedAvailability &&
    !selectedClubFailure;

  useEffect(() => {
    applySeoMeta(buildSeoMeta({ date, language, page, selectedClub }));
  }, [date, language, page, selectedClub]);

  const durationOptions = useMemo(() => {
    const firstAvailability = Object.values(availabilityByClub)[0];
    const options = buildDurationOptions(
      firstAvailability?.dayRange ?? (USE_DATABASE_SEARCH ? TIME_PICKER_RANGE : undefined)
    );
    return USE_DATABASE_SEARCH
      ? options.filter((minutes) => minutes <= DATABASE_SEARCH_MAX_DURATION_MINUTES)
      : options;
  }, [availabilityByClub]);
  const timeOptions = useMemo(() => buildTimeOptions(TIME_PICKER_RANGE), []);
  const minimumStartTime = useMemo(() => defaultStartTimeForDate(date, now), [date, now]);
  const timeWindow = useMemo<TimeRange>(
    () => ({
      start: latestTime(customStartTime ?? minimumStartTime, minimumStartTime),
      end: customEndTime ?? TIME_PICKER_RANGE.end
    }),
    [customEndTime, customStartTime, minimumStartTime]
  );

  useEffect(() => {
    if (durationOptions.length > 0 && !durationOptions.includes(duration)) {
      setDuration(durationOptions[0] ?? 60);
    }
  }, [duration, durationOptions]);

  useEffect(() => {
    const maxCourtCount = Math.max(
      ...Object.values(availabilityByClub).map((availability) => availability.courts.length),
      USE_DATABASE_SEARCH ? Math.max(...FETCHABLE_CLUBS.map((club) => club.courtCount)) : 2
    );
    if (courtsNeeded > maxCourtCount) {
      setCourtsNeeded(maxCourtCount);
    }
  }, [availabilityByClub, courtsNeeded]);

  useEffect(() => {
    if (timeOptions.length === 0) return;

    const firstTime = minimumStartTime;
    const lastTime = timeOptions[timeOptions.length - 1];
    const nextStart =
      customStartTime && timeOptions.includes(customStartTime) && customStartTime >= minimumStartTime ? customStartTime : null;
    const nextEnd = customEndTime && timeOptions.includes(customEndTime) ? customEndTime : null;

    if (customStartTime && !nextStart) {
      setCustomStartTime(firstTime);
    }

    if (customEndTime && !nextEnd) {
      setCustomEndTime(lastTime);
    }

    const effectiveStart = nextStart ?? firstTime;
    const effectiveEnd = nextEnd ?? lastTime;
    if (toComparableTime(effectiveStart) >= toComparableTime(effectiveEnd)) {
      setCustomEndTime(nextTimeOption(effectiveStart, timeOptions) ?? lastTime);
    }
  }, [customEndTime, customStartTime, minimumStartTime, timeOptions]);

  const clubResults = useMemo(() => {
    return CLUBS.map((club) => {
      const availability = availabilityByClub[club.slug];
      const bookableSlots = availability ? buildBookableSlots(availability, duration, courtsNeeded, timeWindow, now) : [];
      return { club, availability, bookableSlots };
    });
  }, [availabilityByClub, duration, courtsNeeded, timeWindow, now]);

  const visibleClubResults = sortClubResults(
    clubResults.filter((result) => result.bookableSlots.length > 0 && clubMatchesCourtType(result.club, courtTypeFilter)),
    findCourtSort
  );
  const selectedSlots =
    selectedClub && selectedAvailability && clubMatchesCourtType(selectedClub, courtTypeFilter)
      ? buildBookableSlots(selectedAvailability, duration, courtsNeeded, timeWindow, now).map((slot) => ({
          ...slot,
          bookingUrl: selectedClub.bookingUrl(selectedAvailability.date)
        }))
      : [];
  const maxCourtCount = selectedClub
    ? selectedClub.courtCount
    : Math.max(
        ...Object.values(availabilityByClub).map((availability) => availability.courts.length),
        USE_DATABASE_SEARCH ? Math.max(...FETCHABLE_CLUBS.map((club) => club.courtCount)) : 2
      );
  const startTimeOptions = timeOptions.filter((time) => time >= minimumStartTime && time < timeWindow.end);
  const endTimeOptions = timeOptions.filter((time) => time > timeWindow.start);
  const visibleClubSlugs = useMemo(() => visibleClubResults.map((result) => result.club.slug), [visibleClubResults]);
  const areAllCompactRowsExpanded =
    visibleClubSlugs.length > 0 && visibleClubSlugs.every((clubSlug) => expandedCompactClubSlugs.has(clubSlug));
  const shouldShowMainResults = Boolean(selectedClub) || hasSearchedAvailability;

  async function requestManualRefresh() {
    const clubSlugs = selectedClubSlug ? [selectedClubSlug] : FETCHABLE_CLUBS.map((club) => club.slug);
    const refreshSequence = manualRefreshSequenceRef.current + 1;
    const requestedAtFallback = new Date().toISOString();
    manualRefreshSequenceRef.current = refreshSequence;
    setIsManualRefreshRequesting(true);
    setIsManualRefreshWaiting(false);
    setManualRefreshTone("info");
    setManualRefreshMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clubSlugs, date })
      });
      const payload = await response.json() as {
        error?: string;
        requestedAt?: string;
        results?: Array<{ outcome: "queued" | "already_queued" | "already_running" }>;
      };
      if (!response.ok) throw new Error(payload.error ?? `Refresh request failed (${response.status})`);
      loadSequenceRef.current += 1;
      setAvailabilityByClub({});
      setFailedClubs([]);
      setLoadError(null);
      setIsLoading(true);
      setLoadProgress({ completed: 0, total: clubSlugs.length });
      setCheckedClubSlugs(new Set());
      setAvailabilityCheckClubs(FETCHABLE_CLUBS.filter((club) => clubSlugs.includes(club.slug)));
      setIsManualRefreshRequesting(false);
      setIsManualRefreshWaiting(true);
      setManualRefreshTone("info");
      setManualRefreshMessage(t("availability.refreshWaiting"));
      captureEvent("availability_refresh_requested", {
        club_count: clubSlugs.length,
        club_slug: selectedClubSlug,
        date
      });
      void waitForManualRefresh(clubSlugs, date, payload.requestedAt ?? requestedAtFallback, refreshSequence);
    } catch {
      setIsManualRefreshRequesting(false);
      setIsManualRefreshWaiting(false);
      setIsLoading(false);
      setManualRefreshTone("warning");
      setManualRefreshMessage(t("availability.refreshFailed"));
    }
  }

  async function waitForManualRefresh(
    clubSlugs: string[],
    refreshDate: string,
    requestedAt: string,
    refreshSequence: number
  ) {
    const deadline = Date.now() + MANUAL_REFRESH_WAIT_TIMEOUT_MS;
    try {
      while (Date.now() < deadline && manualRefreshSequenceRef.current === refreshSequence) {
        const params = new URLSearchParams({ clubSlugs: clubSlugs.join(","), date: refreshDate });
        const response = await fetchAvailabilityRequest(`${API_BASE_URL}/api/refresh/status?${params}`);
        const payload = await response.json() as ManualRefreshStatusResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? `Refresh status failed (${response.status})`);
        if (hasManualRefreshCompleted(payload.results, clubSlugs, requestedAt)) {
          if (manualRefreshSequenceRef.current !== refreshSequence) return;
          await loadAvailability();
          if (manualRefreshSequenceRef.current !== refreshSequence) return;
          setIsManualRefreshWaiting(false);
          setManualRefreshTone("success");
          setManualRefreshMessage(t("availability.refreshComplete"));
          return;
        }
        await delay(MANUAL_REFRESH_POLL_INTERVAL_MS);
      }
      if (manualRefreshSequenceRef.current !== refreshSequence) return;
      setIsManualRefreshWaiting(false);
      setIsLoading(false);
      setManualRefreshTone("warning");
      setManualRefreshMessage(t("availability.refreshDelayed"));
    } catch {
      if (manualRefreshSequenceRef.current !== refreshSequence) return;
      setIsManualRefreshWaiting(false);
      setIsLoading(false);
      setManualRefreshTone("warning");
      setManualRefreshMessage(t("availability.refreshFailed"));
    }
  }

  useEffect(() => {
    capturePageView({
      analytics_enabled: isAnalyticsEnabled(),
      club_slug: selectedClubSlug,
      date: page === "clubs" ? date : undefined,
      language,
      page,
      path: window.location.pathname,
      search: window.location.search
    });
  }, [date, page, selectedClubSlug]);

  const refreshAvailabilityButton = (
      <Button
      aria-label={t("actions.refreshAvailability")}
      icon={<RefreshCw className={isManualRefreshRequesting || isManualRefreshWaiting ? "refreshSpinner" : undefined} size={18} />}
      onClick={() => {
        void requestManualRefresh();
      }}
      size="icon"
      title={t("actions.refreshAvailability")}
      variant="secondary"
      disabled={isLoading || isManualRefreshRequesting || isManualRefreshWaiting}
    />
  );
  const searchAvailabilityButton = (
    <Button
      className="searchSubmitButton"
      disabled={isLoading}
      icon={isLoading ? <RefreshCw className="refreshSpinner" size={18} /> : <SearchCheck size={18} />}
      onClick={() => {
        captureEvent("availability_searched", {
          court_type: courtTypeFilter,
          date,
          duration_minutes: duration,
          selected_club: selectedClubSlug !== null
        });
        setHasSearchedAvailability(true);
        void requestLocationForDistances();
        void loadAvailability();
      }}
      type="button"
      variant="primary"
    >
      {t("actions.searchAvailability")}
    </Button>
  );
  const quickSearchOptions = [
    {
      endTime: "22:00",
      id: "todayEvening",
      label: t("quickSearch.todayEvening"),
      startTime: "18:00",
      targetDate: currentPragueDate
    },
    {
      endTime: "12:00",
      id: "tomorrowMorning",
      label: t("quickSearch.tomorrowMorning"),
      startTime: "08:00",
      targetDate: addDaysToDateInput(currentPragueDate, 1)
    },
    {
      endTime: "22:00",
      id: "weekend",
      label: t("quickSearch.weekend"),
      startTime: "08:00",
      targetDate: nextSaturdayDateInput(currentPragueDate)
    }
  ];
  const clubResultActions = (
    <div className="resultActions">
      <div className="resultSortControl">
        <Select
          aria-label={t("sort.labelMatching")}
          className="resultSortSelect"
          value={findCourtSort}
          onChange={(event) => {
            const nextSort = event.target.value as FindCourtSort;
            captureEvent("matching_clubs_sorted", { sort: nextSort });
            setFindCourtSort(nextSort);
          }}
        >
          <option value="name">{t("sort.name")}</option>
          <option value="priceAsc">{t("sort.lowestPrice")}</option>
          <option value="priceDesc">{t("sort.highestPrice")}</option>
          <option value="multisport">{t("sort.multisport")}</option>
          <option value="indoor">{t("sort.indoorFirst")}</option>
          <option value="outdoor">{t("sort.outdoorFirst")}</option>
        </Select>
      </div>
      {isShortInfoMode && visibleClubSlugs.length > 0 ? (
        <Button
          aria-label={areAllCompactRowsExpanded ? t("actions.hideSlots") : t("actions.showSlots")}
          icon={areAllCompactRowsExpanded ? <ChevronsDownUp size={18} /> : <ChevronsUpDown size={18} />}
          onClick={() => {
            captureEvent("compact_slots_toggled", {
              action: areAllCompactRowsExpanded ? "collapse_all" : "expand_all",
              club_count: visibleClubSlugs.length
            });
            setExpandedCompactClubSlugs(
              areAllCompactRowsExpanded ? new Set() : new Set(visibleClubSlugs)
            );
          }}
          size="icon"
          title={areAllCompactRowsExpanded ? t("actions.hideSlots") : t("actions.showSlots")}
          variant="secondary"
        />
      ) : null}
      <Button
        aria-label={isShortInfoMode ? t("actions.showClubCards") : t("actions.showCompactList")}
        icon={isShortInfoMode ? <LayoutGrid size={18} /> : <ListOrdered size={18} />}
        onClick={() => {
          captureEvent("results_view_changed", { view: isShortInfoMode ? "cards" : "compact" });
          setIsShortInfoMode((currentMode) => !currentMode);
        }}
        size="icon"
        title={isShortInfoMode ? t("actions.showCards") : t("actions.showCompactList")}
        variant="secondary"
      />
      {refreshAvailabilityButton}
    </div>
  );

  return (
    <main className="appShell">
      <nav className="topbar" aria-label={t("nav.pageNavigation")}>
          <a className="brandMark" href={clubsHref(language)} onClick={(event) => handleInternalNavigation(event, () => navigateToClubs("push"))}>
          <LogoImage />
          {t("brand.name")}
        </a>
        {page !== "clubs" || selectedClub ? (
          <Breadcrumbs page={page} selectedClub={selectedClub} onHome={() => navigateToClubs("push")} />
        ) : (
          <span className="topbarSpacer" aria-hidden="true" />
        )}
        <div className={isMobileMenuOpen ? "topbarNav topbarNavOpen" : "topbarNav"} aria-label={t("nav.primaryNavigation")}>
          <a className={page === "clubs" ? "topbarNavLink active" : "topbarNavLink"} href={clubsHref(language)} onClick={(event) => handleInternalNavigation(event, () => navigateToClubs("push"))}>
            {t("nav.findCourt")}
          </a>
          <a className={page === "allClubs" ? "topbarNavLink active" : "topbarNavLink"} href={allClubsHref(language)} onClick={(event) => handleInternalNavigation(event, () => navigateToAllClubs("push"))}>
            {t("nav.allClubs")}
          </a>
          <a className={page === "about" ? "topbarNavLink active" : "topbarNavLink"} href={aboutHref(language)} onClick={(event) => handleInternalNavigation(event, () => navigateToAbout("push"))}>
            {t("nav.about")}
          </a>
        </div>
        <div className="topbarActions">
          <label className="languageSwitch">
            <span className="visuallyHidden">{t("actions.language")}</span>
            <Select
              aria-label={t("actions.language")}
              className="languageSelect"
              value={language}
              onChange={(event) => {
                const nextLanguage = event.target.value as LanguageCode;
                captureEvent("language_changed", { language: nextLanguage, previous_language: language });
                localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
                const currentUrlDate = new URLSearchParams(window.location.search).get("date");
                const nextUrl = localizedPageUrl(page, selectedClubSlug, nextLanguage, currentUrlDate);
                window.location.assign(nextUrl);
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option value={option.code} key={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <Button
            aria-label={theme === "dark" ? t("actions.switchToLightMode") : t("actions.switchToDarkMode")}
            icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            onClick={() => {
              const nextTheme = theme === "dark" ? "light" : "dark";
              captureEvent("theme_changed", { theme: nextTheme });
              setTheme(nextTheme);
            }}
            size="icon"
            title={theme === "dark" ? t("actions.lightMode") : t("actions.darkMode")}
            variant="secondary"
          />
          <Button
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? t("actions.closeMenu") : t("actions.openMenu")}
            className="mobileMenuButton"
            icon={<Menu size={18} />}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            size="icon"
            title={isMobileMenuOpen ? t("actions.closeMenu") : t("actions.openMenu")}
            variant="secondary"
          />
        </div>
      </nav>

      {page === "about" ? (
        <AboutPage onBrowseClubs={() => navigateToClubs("push")} />
      ) : page === "privacy" ? (
        <PrivacyPage />
      ) : page === "terms" ? (
        <TermsPage />
      ) : page === "cookies" ? (
        <CookiePolicyPage />
      ) : page === "allClubs" ? (
        <AllClubsPage
          clubs={trackedClubs}
          sort={allClubsSort}
          onSortChange={setAllClubsSort}
          onSelectClub={(club) => updateSelectedClub(club.slug)}
          userCoordinates={userCoordinates}
        />
      ) : (
        <>
          {!selectedClub ? (
            <section className="searchIntro" aria-labelledby="search-title">
              <h1 id="search-title">{t("home.title")}</h1>
              <p>{t("home.intro")}</p>
            </section>
          ) : null}
          <Card className={`searchPanel ${!selectedClub ? "searchPanel-withSubmit" : ""}`}>
        <div className="uiField searchField searchField-date">
          <span className="uiFieldLabel">
            <span className="uiFieldIcon">
              <CalendarDays size={16} />
            </span>
            {t("club.date")}
          </span>
          <DateCalendarPicker
            value={date}
            minDate={currentPragueDate}
            maxDate={maximumSelectableDate}
            language={language}
            onChange={updateDate}
          />
        </div>
        <Field icon={<UsersRound size={16} />} label={t("club.needed")} className="searchField">
          <Select
            value={courtsNeeded}
            onChange={(event) => {
              const nextCourtsNeeded = Number(event.target.value);
              captureEvent("filters_changed", {
                club_slug: selectedClubSlug,
                date,
                filter: "courts_needed",
                value: nextCourtsNeeded
              });
              setCourtsNeeded(nextCourtsNeeded);
            }}
          >
            {Array.from({ length: maxCourtCount }, (_, index) => index + 1).map((count) => (
              <option value={count} key={count}>
                {count} {t("club.court", { count })}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<SlidersHorizontal size={16} />} label={t("club.duration")} className="searchField">
          <Select
            value={duration}
            onChange={(event) => {
              const nextDuration = Number(event.target.value);
              captureEvent("filters_changed", {
                club_slug: selectedClubSlug,
                date,
                filter: "duration",
                value: nextDuration
              });
              setDuration(nextDuration);
            }}
          >
            {durationOptions.map((minutes) => (
              <option value={minutes} key={minutes}>
                {formatDuration(minutes, selectedAvailability?.dayRange ?? Object.values(availabilityByClub)[0]?.dayRange)}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<CloudSun size={16} />} label={t("club.courtType")} className="searchField searchField-courtType">
          <Select
            value={courtTypeFilter}
            onChange={(event) => {
              const nextCourtType = event.target.value as CourtTypeFilter;
              captureEvent("filters_changed", {
                club_slug: selectedClubSlug,
                date,
                filter: "court_type",
                value: nextCourtType
              });
              if (!selectedClubSlug) {
                setHasSearchedAvailability(false);
                clearAvailabilityResults();
              }
              setCourtTypeFilter(nextCourtType);
            }}
          >
            <option value="all">{t("club.allCourts")}</option>
            <option value="indoor">{t("club.indoor")}</option>
            <option value="outdoor">{t("club.outdoor")}</option>
          </Select>
        </Field>
        <Field icon={<Timer size={16} />} label={t("club.startTime")} className="searchField searchField-startTime">
          <Select value={timeWindow.start} onChange={(event) => updateStartTime(event.target.value)} disabled={timeOptions.length === 0}>
            {startTimeOptions.map((time) => (
              <option value={time} key={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<Timer size={16} />} label={t("club.endTime")} className="searchField searchField-endTime">
          <Select value={timeWindow.end} onChange={(event) => updateEndTime(event.target.value)} disabled={timeOptions.length === 0}>
            {endTimeOptions.map((time) => (
              <option value={time} key={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
        {!selectedClub ? <div className="searchField searchField-submit">{searchAvailabilityButton}</div> : null}
          </Card>

          {!selectedClub ? (
            <section className="quickSearches" aria-label={t("quickSearch.label")}>
              <span>{t("quickSearch.label")}</span>
              <div>
                {quickSearchOptions.map((option) => (
                  <Button
                    disabled={isLoading}
                    key={option.id}
                    onClick={() => runQuickSearch(option.id, option.targetDate, option.startTime, option.endTime)}
                    type="button"
                    variant="ghost"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          {shouldShowMainResults ? (
            <section className="resultBar">
        <div>
          <Search size={18} />
          <strong>
            {selectedClub ? t("club.slots", { count: selectedSlots.length }) : t("club.matchingClubs", { count: visibleClubResults.length })}
          </strong>
        </div>
        {selectedClub ? <div className="resultActions">{refreshAvailabilityButton}</div> : null}
            </section>
          ) : null}

          {shouldShowMainResults && loadError ? <Alert icon={<AlertCircle size={18} />} title={loadError} /> : null}
          {shouldShowMainResults && manualRefreshMessage ? (
            <div
              className={`manualRefreshStatus manualRefreshStatus-${manualRefreshTone}`}
              role={manualRefreshTone === "warning" ? "alert" : "status"}
            >
              <RefreshCw className={isManualRefreshRequesting || isManualRefreshWaiting ? "refreshSpinner" : undefined} size={18} />
              <span>{manualRefreshMessage}</span>
            </div>
          ) : null}
          {shouldShowMainResults && !selectedClub && failedClubs.length > 0 ? <FailedClubAlert failedClubs={failedClubs} date={date} /> : null}

          {selectedClub && selectedAvailability ? (
            <ClubDetail
              club={selectedClub}
              availability={selectedAvailability}
              slots={selectedSlots}
              courtsNeeded={courtsNeeded}
              directBookingUrl={selectedClub.bookingUrl(selectedAvailability.date)}
              userCoordinates={userCoordinates}
            />
          ) : selectedClub && (isLoading || isSelectedClubSlotsLoading) ? (
            <ClubDetail
              club={selectedClub}
              slots={[]}
              courtsNeeded={courtsNeeded}
              directBookingUrl={selectedClub.bookingUrl(date)}
              slotsLoading
              userCoordinates={userCoordinates}
            />
          ) : selectedClub ? (
            <ClubDetail
              club={selectedClub}
              slots={[]}
              courtsNeeded={courtsNeeded}
              availabilityUnavailable
              unavailableReason={selectedClubFailure?.reason}
              directBookingUrl={selectedClub.bookingUrl(date)}
              userCoordinates={userCoordinates}
            />
          ) : shouldShowMainResults ? (
            <ClubList
              results={visibleClubResults}
              isLoading={isLoading}
              loadProgress={loadProgress}
              checkedClubSlugs={checkedClubSlugs}
              failedClubs={failedClubs}
              availabilityCheckClubs={availabilityCheckClubs}
              actions={clubResultActions}
              compact={isShortInfoMode}
              expandedClubSlugs={expandedCompactClubSlugs}
              onExpandedClubSlugsChange={setExpandedCompactClubSlugs}
              onSelectClub={(club) => updateSelectedClub(club.slug)}
              userCoordinates={userCoordinates}
            />
          ) : (
            <HomeDiscovery
              clubs={trackedClubs}
              onBrowseClubs={() => navigateToAllClubs("push")}
              onSelectClub={(club) => updateSelectedClub(club.slug)}
              userCoordinates={userCoordinates}
            />
          )}
        </>
      )}
      <SiteFooter
        currentPage={page}
        onNavigateToClubs={() => navigateToClubs("push")}
        onNavigateToAllClubs={() => navigateToAllClubs("push")}
        onNavigateToAbout={() => navigateToAbout("push")}
        onNavigateToLegalPage={(nextPage) => navigateToLegalPage(nextPage, "push")}
      />
    </main>
  );

  function updateDate(nextDate: string) {
    const nextSelectableDate = selectableDate(nextDate, currentPragueDate);
    captureEvent("filters_changed", {
      club_slug: selectedClubSlug,
      filter: "date",
      value: nextSelectableDate
    });
    setDate(nextSelectableDate);
    if (page === "clubs" && !selectedClubSlug) {
      setHasSearchedAvailability(false);
      clearAvailabilityResults();
    }
    writeUrl({ date: nextSelectableDate, clubSlug: selectedClubSlug, mode: "replace" });
  }

  function runQuickSearch(preset: string, nextDate: string, nextStartTime: string, nextEndTime: string) {
    const nextSelectableDate = selectableDate(nextDate, currentPragueDate);
    captureEvent("quick_search_selected", {
      court_type: courtTypeFilter,
      date: nextSelectableDate,
      duration_minutes: duration,
      end_time: nextEndTime,
      preset,
      start_time: nextStartTime
    });
    setDate(nextSelectableDate);
    setCourtsNeeded(1);
    setDuration(90);
    setCustomStartTime(nextStartTime);
    setCustomEndTime(nextEndTime);
    setHasSearchedAvailability(true);
    void requestLocationForDistances();
    writeUrl({ date: nextSelectableDate, clubSlug: null, mode: "replace" });
    void loadAvailability({
      customEndTime: nextEndTime,
      customStartTime: nextStartTime,
      date: nextSelectableDate,
      duration: 90,
      selectedClubSlug: null
    });
  }

  function updateStartTime(nextStartTime: string) {
    captureEvent("filters_changed", {
      club_slug: selectedClubSlug,
      date,
      filter: "start_time",
      value: nextStartTime
    });
    setCustomStartTime(nextStartTime);
    if (toComparableTime(nextStartTime) >= toComparableTime(timeWindow.end)) {
      setCustomEndTime(nextTimeOption(nextStartTime, timeOptions) ?? timeWindow.end);
    }
  }

  function updateEndTime(nextEndTime: string) {
    captureEvent("filters_changed", {
      club_slug: selectedClubSlug,
      date,
      filter: "end_time",
      value: nextEndTime
    });
    setCustomEndTime(nextEndTime);
    if (toComparableTime(nextEndTime) <= toComparableTime(timeWindow.start)) {
      setCustomStartTime(previousTimeOption(nextEndTime, timeOptions) ?? timeWindow.start);
    }
  }

  function updateSelectedClub(nextClubSlug: string | null) {
    if (nextClubSlug) {
      void requestLocationForDistances();
      captureEvent("club_selected", {
        club_slug: nextClubSlug,
        date,
        source_page: page
      });
    }
    setPage("clubs");
    setSelectedClubSlug(nextClubSlug);
    setHasSearchedAvailability(Boolean(nextClubSlug));
    setFailedClubs([]);
    writeUrl({ date, clubSlug: nextClubSlug, mode: "push" });
    window.scrollTo({ top: 0 });
  }

  function navigateToClubs(mode: "push" | "replace") {
    setPage("clubs");
    setSelectedClubSlug(null);
    setHasSearchedAvailability(false);
    clearAvailabilityResults();
    writeUrl({ date, clubSlug: null, mode });
    window.scrollTo({ top: 0 });
  }

  function navigateToAllClubs(mode: "push" | "replace") {
    setPage("allClubs");
    setSelectedClubSlug(null);
    setHasSearchedAvailability(false);
    writeUrl({ date, clubSlug: null, mode, page: "allClubs" });
    window.scrollTo({ top: 0 });
  }

  function navigateToAbout(mode: "push" | "replace") {
    setPage("about");
    setSelectedClubSlug(null);
    setHasSearchedAvailability(false);
    writeUrl({ date, clubSlug: null, mode, page: "about" });
    window.scrollTo({ top: 0 });
  }

  function navigateToLegalPage(nextPage: "privacy" | "terms" | "cookies", mode: "push" | "replace") {
    setPage(nextPage);
    setSelectedClubSlug(null);
    setHasSearchedAvailability(false);
    writeUrl({ date, clubSlug: null, mode, page: nextPage });
    window.scrollTo({ top: 0 });
  }
}

function handleInternalNavigation(event: React.MouseEvent<HTMLAnchorElement>, navigate: () => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate();
}

function Breadcrumbs({ page, selectedClub, onHome }: { page: Page; selectedClub: Club | null; onHome: () => void }) {
  const { t } = useTranslation();

  return (
    <ol className="breadcrumbs">
      <li>
        <button type="button" onClick={onHome}>
          {t("nav.clubs")}
        </button>
      </li>
      {selectedClub ? (
        <li aria-current="page">
          <span>{selectedClub.name}</span>
        </li>
      ) : null}
      {page === "about" ? (
        <li aria-current="page">
          <span>{t("nav.about")}</span>
        </li>
      ) : null}
      {page === "privacy" ? (
        <li aria-current="page">
          <span>{t("nav.privacy")}</span>
        </li>
      ) : null}
      {page === "terms" ? (
        <li aria-current="page">
          <span>{t("nav.terms")}</span>
        </li>
      ) : null}
      {page === "cookies" ? (
        <li aria-current="page">
          <span>{t("nav.cookies")}</span>
        </li>
      ) : null}
      {page === "allClubs" ? (
        <li aria-current="page">
          <span>{t("nav.allClubs")}</span>
        </li>
      ) : null}
    </ol>
  );
}

function SiteFooter({
  currentPage,
  onNavigateToClubs,
  onNavigateToAllClubs,
  onNavigateToAbout,
  onNavigateToLegalPage
}: {
  currentPage: Page;
  onNavigateToClubs: () => void;
  onNavigateToAllClubs: () => void;
  onNavigateToAbout: () => void;
  onNavigateToLegalPage: (page: "privacy" | "terms" | "cookies") => void;
}) {
  const { t } = useTranslation();

  return (
    <footer className="siteFooter">
      <div className="footerBrand">
        <a className="footerLogo" href={clubsHref()} onClick={(event) => handleInternalNavigation(event, onNavigateToClubs)}>
          <LogoImage />
          <span>{t("brand.name")}</span>
        </a>
        <p>{t("footer.description")}</p>
      </div>

      <nav className="footerNav" aria-label={t("nav.primaryNavigation")}>
        <div>
          <h2>{t("footer.service")}</h2>
          <a href={clubsHref()} aria-current={currentPage === "clubs" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToClubs)}>
            {t("nav.findCourt")}
          </a>
          <a href={allClubsHref()} aria-current={currentPage === "allClubs" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToAllClubs)}>
            {t("nav.allClubs")}
          </a>
          <a href={aboutHref()} aria-current={currentPage === "about" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToAbout)}>
            {t("nav.about")}
          </a>
        </div>
        <div>
          <h2>{t("footer.legal")}</h2>
          <a href={legalHref("privacy")} aria-current={currentPage === "privacy" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("privacy"))}>
            {t("nav.privacy")}
          </a>
          <a href={legalHref("terms")} aria-current={currentPage === "terms" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("terms"))}>
            {t("nav.terms")}
          </a>
          <a href={legalHref("cookies")} aria-current={currentPage === "cookies" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("cookies"))}>
            {t("nav.cookies")}
          </a>
        </div>
      </nav>

      <div className="footerMeta">
        <a href="mailto:dmytrozhyrov@gmail.com">dmytrozhyrov@gmail.com</a>
        <span>{t("footer.availabilityNotice")}</span>
        <span>{t("footer.bookingNotice")}</span>
      </div>
    </footer>
  );
}

function HomeDiscovery({
  clubs,
  onBrowseClubs,
  onSelectClub,
  userCoordinates
}: {
  clubs: TrackedClub[];
  onBrowseClubs: () => void;
  onSelectClub: (club: Club) => void;
  userCoordinates: Coordinates | null;
}) {
  const { t } = useTranslation();
  const availabilityTrackedClubs = clubs.filter(({ club }) => club.availabilityEnabled !== false);
  const totalCourtCount = availabilityTrackedClubs.reduce((total, { club }) => total + club.courtCount, 0);
  const availabilityTrackedCount = availabilityTrackedClubs.length;
  const multisportClubCount = availabilityTrackedClubs.filter(({ club }) => club.acceptsMultisport).length;
  const weekdayLabels = t("date.weekdays", { returnObjects: true }) as string[];
  const featuredClubs = HOME_FEATURED_CLUB_SLUGS.map((slug) => clubs.find(({ club }) => club.slug === slug)).filter(
    (club): club is TrackedClub => Boolean(club)
  );

  return (
    <section className="homeDiscovery" aria-labelledby="home-discovery-title">
      <div className="homeDiscoveryIntro">
        <div>
          <h2 id="home-discovery-title">{t("home.landingTitle")}</h2>
          <p>{t("home.landingBody")}</p>
        </div>
        <a
          className="uiButton uiButton-secondary uiButton-md homeDiscoveryLink"
          href={allClubsHref()}
          onClick={(event) => handleInternalNavigation(event, onBrowseClubs)}
        >
          <span className="uiButtonIcon">
            <ListOrdered size={17} />
          </span>
          <span>{t("home.allClubsCta")}</span>
        </a>
      </div>

      <div className="homeStats" aria-label={t("home.statsLabel")}>
        <Card className="homeStat">
          <SearchCheck size={20} />
          <strong>{t("allClubs.tracked", { count: availabilityTrackedCount })}</strong>
          <span>{t("home.trackedClubsHelp")}</span>
        </Card>
        <Card className="homeStat">
          <Scale size={20} />
          <strong>{t("home.trackedCourts", { count: totalCourtCount })}</strong>
          <span>{t("home.trackedCourtsHelp")}</span>
        </Card>
        <Card className="homeStat">
          <WalletCards size={20} />
          <strong>{t("home.multisportClubs", { count: multisportClubCount })}</strong>
          <span>{t("home.multisportHelp")}</span>
        </Card>
      </div>

      <div className="homeDiscoveryGrid">
        <Card className="homeDiscoveryCard">
          <Clock3 size={21} />
          <h3>{t("home.featureTimeTitle")}</h3>
          <p>{t("home.featureTimeBody")}</p>
        </Card>
        <Card className="homeDiscoveryCard">
          <CloudSun size={21} />
          <h3>{t("home.featureCourtTitle")}</h3>
          <p>{t("home.featureCourtBody")}</p>
        </Card>
        <Card className="homeDiscoveryCard">
          <ExternalLink size={21} />
          <h3>{t("home.featureBookingTitle")}</h3>
          <p>{t("home.featureBookingBody")}</p>
        </Card>
      </div>

      <section className="homeFeaturedClubs" aria-labelledby="home-featured-clubs-title">
        <div>
          <h2 id="home-featured-clubs-title">{t("home.featuredClubsTitle")}</h2>
          <p>{t("home.featuredClubsBody")}</p>
        </div>
        <div className="homeClubCards">
          {featuredClubs.map(({ club, priceFrom }) => (
            <article
              className="homeClubCard"
              key={club.slug}
            >
              <a
                className="homeClubCardLink"
                href={clubHref(club.slug)}
                onClick={(event) => handleInternalNavigation(event, () => onSelectClub(club))}
              >
                <span className="homeClubCardHeader">
                  <span className="homeClubName">
                    <strong>{club.name}</strong>
                    <DistanceBadge club={club} userCoordinates={userCoordinates} />
                  </span>
                  <span className="trackedClubPrice">
                    {t("club.from")} <strong>{formatCzkPerHour(priceFrom)}</strong>
                  </span>
                </span>
                <span className="homeClubMetaLine">
                  <UsersRound size={15} />
                  <span>
                    {club.courtCount} {t("club.court", { count: club.courtCount })}
                  </span>
                  <CourtTypeBadges courtTypes={club.courtTypes} />
                </span>
                <span className="homeClubMetaLine">
                  <WalletCards size={15} />
                  {club.acceptsMultisport ? (
                    <span className="multisportBadge">{t("club.multisport")}</span>
                  ) : (
                    <span className="noMultisportBadge">{t("club.noMultisport")}</span>
                  )}
                </span>
                <span className="homeClubMetaLine">
                  <Clock3 size={15} />
                  <span>
                    {formatOpeningHours(club.openingHours, weekdayLabels, t("club.daily"), t("club.notPublished"))}
                  </span>
                </span>
              </a>
              <a
                className="homeClubMetaLine homeClubAddress"
                href={googleMapsUrl(club.address)}
                target="_blank"
                rel="noreferrer"
                onClick={() => captureEvent("map_opened", { club_slug: club.slug, source: "home_featured_clubs" })}
              >
                <MapPin size={15} />
                <span>{club.address}</span>
              </a>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function AllClubsPage({
  clubs,
  sort,
  onSortChange,
  onSelectClub,
  userCoordinates
}: {
  clubs: TrackedClub[];
  sort: FindCourtSort;
  onSortChange: (sort: FindCourtSort) => void;
  onSelectClub: (club: Club) => void;
  userCoordinates: Coordinates | null;
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleClubs = normalizedSearchQuery
    ? clubs.filter(({ club }) => normalizeSearchText(club.name).includes(normalizedSearchQuery))
    : clubs;

  useEffect(() => {
    if (!normalizedSearchQuery) return;

    const timeout = window.setTimeout(() => {
      captureEvent("all_clubs_searched", {
        query_length: searchQuery.trim().length,
        result_count: visibleClubs.length
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [normalizedSearchQuery, searchQuery, visibleClubs.length]);

  return (
    <section className="allClubsPage" aria-labelledby="all-clubs-title">
      <div className="pageHeader">
        <div>
          <Badge tone="green">
            {visibleClubs.length === clubs.length
              ? `${t("allClubs.tracked", { count: FETCHABLE_CLUBS.length })} · ${t("allClubs.listed", { count: clubs.length })}`
              : `${visibleClubs.length}/${clubs.length} ${t("nav.clubs").toLocaleLowerCase()}`}
          </Badge>
          <h1 id="all-clubs-title">{t("nav.allClubs")}</h1>
        </div>
        <div className="pageHeaderControls">
          <Field icon={<Search size={16} />} label={t("allClubs.searchLabel")} className="allClubsSearchField">
            <Input
              aria-label={t("allClubs.searchAria")}
              placeholder={t("allClubs.searchPlaceholder")}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          <div className="resultSortControl">
            <Select
              aria-label={t("sort.labelClubs")}
              className="resultSortSelect"
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value as FindCourtSort;
                captureEvent("all_clubs_sorted", { sort: nextSort });
                onSortChange(nextSort);
              }}
            >
              <option value="name">{t("sort.name")}</option>
              <option value="priceAsc">{t("sort.lowestPrice")}</option>
              <option value="priceDesc">{t("sort.highestPrice")}</option>
              <option value="multisport">{t("sort.multisport")}</option>
              <option value="indoor">{t("sort.indoorFirst")}</option>
              <option value="outdoor">{t("sort.outdoorFirst")}</option>
            </Select>
          </div>
          <Button
            aria-label={isCompactMode ? t("actions.showClubCards") : t("actions.showCompactList")}
            className="allClubsViewButton"
            icon={isCompactMode ? <LayoutGrid size={18} /> : <ListOrdered size={18} />}
            onClick={() => {
              captureEvent("all_clubs_view_changed", { view: isCompactMode ? "cards" : "compact" });
              setIsCompactMode((currentMode) => !currentMode);
            }}
            size="icon"
            title={isCompactMode ? t("actions.showCards") : t("actions.showCompactList")}
            variant="secondary"
          />
        </div>
      </div>

      <section className={isCompactMode ? "trackedClubList trackedClubList-compact" : "trackedClubList"} aria-label="Tracked clubs">
        {visibleClubs.length > 0 ? (
          visibleClubs.map(({ club, priceFrom }, index) => (
          <Card className={isCompactMode ? "trackedClubCard trackedClubCard-compact" : "trackedClubCard"} interactive key={club.slug}>
            <button className="trackedClubSelect" type="button" onClick={() => onSelectClub(club)}>
              <ClubImage club={club} loading={index < 3 ? "eager" : "lazy"} />
              <div className="trackedClubBody">
                <div>
                  <h2>
                    {club.name}
                    <DistanceBadge club={club} userCoordinates={userCoordinates} />
                  </h2>
                  <p>
                    {club.courtCount} {t("club.court", { count: club.courtCount })}
                  </p>
                </div>
                <div className="trackedClubBadges">
                  {club.acceptsMultisport ? (
                    <span className="multisportBadge">{t("club.multisport")}</span>
                  ) : null}
                  <CourtTypeBadges courtTypes={club.courtTypes} />
                  <span className="trackedClubPrice">
                    {t("club.from")} <strong>{formatCzkPerHour(priceFrom)}</strong>
                  </span>
                </div>
              </div>
            </button>
            <a
              className="addressLink"
              href={googleMapsUrl(club.address)}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureEvent("map_opened", { club_slug: club.slug, source: "all_clubs" })}
            >
              <MapPin size={15} />
              <span>{club.address}</span>
            </a>
          </Card>
          ))
        ) : (
          <EmptyState title={t("allClubs.emptyTitle")}>{t("allClubs.emptyBody")}</EmptyState>
        )}
      </section>
    </section>
  );
}

function AboutPage({ onBrowseClubs }: { onBrowseClubs: () => void }) {
  const { t } = useTranslation();

  return (
    <section className="aboutPage" aria-labelledby="about-title">
      <div className="aboutHero">
        <h1 id="about-title">{t("about.title")}</h1>
        <p>{t("about.body")}</p>
        <Button icon={<SearchCheck size={17} />} onClick={onBrowseClubs}>
          {t("actions.findCourt")}
        </Button>
      </div>

      <div className="aboutGrid">
        <Card className="aboutCard">
          <SearchCheck size={22} />
          <h2>{t("about.cardSearchTitle")}</h2>
          <p>{t("about.cardSearchBody")}</p>
        </Card>
        <Card className="aboutCard">
          <Link2 size={22} />
          <h2>{t("about.cardBookTitle")}</h2>
          <p>{t("about.cardBookBody")}</p>
        </Card>
        <Card className="aboutCard">
          <ShieldCheck size={22} />
          <h2>{t("about.cardLimitsTitle")}</h2>
          <p>{t("about.cardLimitsBody")}</p>
        </Card>
      </div>

      <FaqAccordion />
    </section>
  );
}

function FaqAccordion() {
  const { t } = useTranslation();

  return (
    <section className="faqSection" aria-labelledby="faq-title">
      <div className="faqHeader">
        <h2 id="faq-title">{t("about.faqTitle")}</h2>
      </div>
      <div className="faqList">
        {ABOUT_FAQ_KEYS.map((question) => (
          <details className="faqItem" key={question}>
            <summary>
              <span>{t(`about.faq.${question}.question`)}</span>
              <ChevronDown size={18} />
            </summary>
            <p>{t(`about.faq.${question}.answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <LegalPage
      badgeIcon={<ShieldCheck size={16} />}
      badgeText={t("legal.badgeLegal")}
      title={t("legal.privacyTitle")}
      intro={t("legal.privacyIntro")}
    >
      <LegalSection title={t("legal.privacySection1Title")}>
        <p>
          <strong>{SERVICE_OPERATOR_NAME}</strong>
          <br />
          {t("legal.contact")} <a href="mailto:dmytrozhyrov@gmail.com">dmytrozhyrov@gmail.com</a>.
        </p>
      </LegalSection>
      <LegalSection title={t("legal.privacySection2Title")}>
        <p>
          {t("legal.privacySection2Body1")} <code>mamekurt-theme</code> / <code>{LANGUAGE_STORAGE_KEY}</code>.
        </p>
        <p>{t("legal.privacySection2Body2")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacySection3Title")}>
        <p>{t("legal.privacySection3Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.privacySection4Title")}>
        <p>{t("legal.privacySection4Body")}</p>
      </LegalSection>
    </LegalPage>
  );
}

function TermsPage() {
  const { t } = useTranslation();

  return (
    <LegalPage
      badgeIcon={<Scale size={16} />}
      badgeText={t("legal.badgeTerms")}
      title={t("legal.termsTitle")}
      intro={t("legal.termsIntro")}
    >
      <LegalSection title={t("legal.termsSection1Title")}>
        <p>{t("legal.termsSection1Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.termsSection2Title")}>
        <p>{t("legal.termsSection2Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.termsSection3Title")}>
        <p>{t("legal.termsSection3Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.termsSection4Title")}>
        <p>{t("legal.termsSection4Body")}</p>
      </LegalSection>
    </LegalPage>
  );
}

function CookiePolicyPage() {
  const { t } = useTranslation();

  return (
    <LegalPage
      badgeIcon={<Cookie size={16} />}
      badgeText={t("legal.badgeCookies")}
      title={t("legal.cookiesTitle")}
      intro={t("legal.cookiesIntro")}
    >
      <LegalSection title={t("legal.cookiesSection1Title")}>
        <p>{t("legal.cookiesSection1Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.cookiesSection2Title")}>
        <p>{t("legal.cookiesSection2Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.cookiesSection3Title")}>
        <p>{t("legal.cookiesSection3Body")}</p>
      </LegalSection>
      <LegalSection title={t("legal.cookiesSection4Title")}>
        <p>{t("legal.cookiesSection4Body")}</p>
      </LegalSection>
    </LegalPage>
  );
}

function LegalPage({
  badgeIcon,
  badgeText,
  title,
  intro,
  children
}: {
  badgeIcon: React.ReactNode;
  badgeText: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="legalPage" aria-labelledby="legal-title">
      <div className="legalHero">
        <Badge tone="blue" className="legalBadge">
          {badgeIcon}
          {badgeText}
        </Badge>
        <h1 id="legal-title">{title}</h1>
        <p>{intro}</p>
        <span>{t("legal.lastUpdated")}</span>
      </div>
      <Card className="legalContent">{children}</Card>
    </section>
  );
}

function LegalSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="legalSection">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ClubImage({ club, loading }: { club: Club; loading: "eager" | "lazy" }) {
  return (
    <picture>
      <source srcSet={optimizedClubImageSrcSet(club)} sizes="(max-width: 760px) 100vw, 33vw" type="image/webp" />
      <img
        src={club.imageUrl}
        alt={`${club.name} padel court in Prague`}
        loading={loading}
        decoding="async"
        {...clubImageDimensions(club)}
      />
    </picture>
  );
}

function LogoImage() {
  return (
    <img
      src={assetPath("logo-64.webp")}
      srcSet={`${assetPath("logo-64.webp")} 64w, ${assetPath("logo-128.webp")} 128w`}
      sizes="48px"
      alt=""
      width="48"
      height="48"
      decoding="async"
    />
  );
}

function FailedClubAlert({ failedClubs, date, title }: { failedClubs: FailedClub[]; date: string; title?: string }) {
  const { t } = useTranslation();

  return (
    <Alert aria-label={t("availability.uncheckedClubs", { count: failedClubs.length })} icon={<AlertCircle size={18} />} title={title ?? t("availability.uncheckedClubs", { count: failedClubs.length })}>
      <p>{t("availability.suggestion")}</p>
      <div className="failedLinks">
        {failedClubs.map(({ club }) => (
          <a
            href={club.bookingUrl(date)}
            key={club.slug}
            target="_blank"
            rel="noreferrer"
            onClick={() => captureBookingSystemOpened(club, "availability_error", date)}
          >
            {club.name}
          </a>
        ))}
      </div>
    </Alert>
  );
}

function ClubList({
  results,
  isLoading,
  loadProgress,
  checkedClubSlugs,
  failedClubs,
  availabilityCheckClubs,
  actions,
  compact,
  expandedClubSlugs,
  onExpandedClubSlugsChange,
  onSelectClub,
  userCoordinates
}: {
  results: Array<{ club: Club; availability?: AvailabilityResult; bookableSlots: BookableSlot[] }>;
  isLoading: boolean;
  loadProgress: { completed: number; total: number };
  checkedClubSlugs: Set<string>;
  failedClubs: FailedClub[];
  availabilityCheckClubs: Club[];
  actions: React.ReactNode;
  compact: boolean;
  expandedClubSlugs: Set<string>;
  onExpandedClubSlugsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSelectClub: (club: Club) => void;
  userCoordinates: Coordinates | null;
}) {
  const { t } = useTranslation();
  const resultsToolbar = (
    <div className="clubResultsToolbar">
      <LoadProgressBadge
        availabilityCheckClubs={availabilityCheckClubs}
        checkedClubSlugs={checkedClubSlugs}
        failedClubs={failedClubs}
        isLoading={isLoading}
        loadProgress={loadProgress}
      />
      {actions}
    </div>
  );

  if (isLoading && results.length === 0) {
    return (
      <section
        aria-busy="true"
        aria-label={t("nav.clubs")}
        className={compact ? "clubCompactList" : "clubGrid"}
      >
        {resultsToolbar}
        {Array.from({ length: 6 }, (_, index) => (
          compact ? (
            <Card className="clubCompactRow clubCompactRowSkeleton" key={index}>
              <div className="compactSkeletonMain">
                <Skeleton className="lineSkeleton compactNameSkeleton" />
                <Skeleton className="lineSkeleton compactCountSkeleton" />
              </div>
              <div className="compactSkeletonMeta">
                <Skeleton className="pillSkeleton compactPillSkeleton" />
                <Skeleton className="pillSkeleton compactPillSkeleton" />
                <Skeleton className="pillSkeleton compactChevronSkeleton" />
              </div>
            </Card>
          ) : (
            <Card className="clubCard clubCardSkeleton" key={index}>
              <Skeleton className="imageSkeleton" />
              <div className="clubBody">
                <div className="cardSkeletonTitle">
                  <Skeleton className="lineSkeleton wide" />
                  <Skeleton className="lineSkeleton short" />
                </div>
                <div className="cardSkeletonBadges">
                  <Skeleton className="pillSkeleton widePill" />
                  <Skeleton className="pillSkeleton" />
                </div>
                <Skeleton className="lineSkeleton cardSkeletonMeta" />
              </div>
              <div className="cardSkeletonAddress">
                <Skeleton className="lineSkeleton" />
              </div>
            </Card>
          )
        ))}
      </section>
    );
  }

  if (compact) {
    return (
      <section className="clubCompactList" aria-label={t("club.matchingClubs", { count: results.length })}>
        {resultsToolbar}
        {results.length > 0 ? (
          results.map(({ club, availability, bookableSlots }) => {
            const isExpanded = expandedClubSlugs.has(club.slug);
            const toggleExpanded = () => {
              captureEvent("compact_club_expanded", {
                action: isExpanded ? "collapse" : "expand",
                club_slug: club.slug
              });
              onExpandedClubSlugsChange((currentSlugs) => {
                const nextSlugs = new Set(currentSlugs);
                if (nextSlugs.has(club.slug)) {
                  nextSlugs.delete(club.slug);
                } else {
                  nextSlugs.add(club.slug);
                }
                return nextSlugs;
              });
            };

            return (
              <Card className="clubCompactRow" interactive key={club.slug}>
                <div
                  aria-expanded={isExpanded}
                  className="clubCompactSelect"
                  onClick={toggleExpanded}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleExpanded();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                <div className="clubCompactMain">
                  <button
                    className="clubCompactName"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectClub(club);
                    }}
                  >
                    {club.name}
                  </button>
                  <DistanceBadge club={club} userCoordinates={userCoordinates} />
                  <span className="clubCompactCount">{t("club.slots", { count: bookableSlots.length })}</span>
                </div>
                <div className="clubCompactToggle">
                  <div className="clubCompactMeta">
                    <div className="clubCompactCommercialMeta">
                      <span className="trackedClubPrice">
                        {t("club.from")} <strong>{formatCzkPerHour(lowestPrice(club.priceInfo))}</strong>
                      </span>
                      {club.acceptsMultisport ? <span className="multisportBadge">{t("club.multisport")}</span> : null}
                      <CourtTypeBadges courtTypes={club.courtTypes} />
                    </div>
                    <div className="clubCompactScheduleMeta">
                      <span className="clubMeta">
                        <Clock3 size={15} />
                        {availability?.dayRange.start}-{availability?.dayRange.end}
                      </span>
                      <FreshnessBadge availability={availability} />
                    </div>
                  </div>
                  <ChevronDown className="clubCompactChevron" size={18} />
                </div>
              </div>
              {isExpanded ? (
                <div className="clubCompactSlots">
                  {bookableSlots.map((slot) => {
                    const slotDate = availability?.date ?? today;
                    const bookingUrl = slot.bookingUrl ?? club.bookingUrl(slotDate);
                    const courtNames = formatCourtNames(slot.courts);

                    return (
                      <div className="clubCompactSlot" key={`${club.slug}-${slot.start}-${slot.end}-${slot.courts.join("-")}`}>
                        <div className="slotSummary">
                          <strong>
                            {slot.start} - {slot.end}
                          </strong>
                          <span>{courtNames.join(" + ")}</span>
                        </div>
                        <div className="slotActions">
                          <button
                            className="slotAction slotAction-share"
                            type="button"
                            onClick={() => shareSlot(club, slot, slotDate, bookingUrl, courtNames)}
                          >
                            {t("actions.share")}
                            <Share2 size={13} />
                          </button>
                          <a
                            className="slotAction slotAction-book"
                            href={bookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => captureBookingSystemOpened(club, "matching_slot", slotDate, slot)}
                          >
                            {t("actions.book")}
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              </Card>
            );
          })
        ) : (
          <EmptyState title={t("club.noMatchingTitle")}>{t("club.noMatchingBody")}</EmptyState>
        )}
      </section>
    );
  }

  return (
    <section className="clubGrid" aria-label={t("club.matchingClubs", { count: results.length })}>
      {resultsToolbar}
      {results.length > 0 ? (
        results.map(({ club, availability, bookableSlots }, index) => (
          <Card className="clubCard" interactive key={club.slug}>
            <div
              className="clubSelect"
              onClick={() => onSelectClub(club)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectClub(club);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <ClubImage club={club} loading={index < 2 ? "eager" : "lazy"} />
              <div className="clubBody">
                <div className="clubTitleRow">
                  <div>
                    <h2>
                      <a
                        className="clubExternalTitle"
                        href={club.bookingUrl(availability?.date ?? today)}
                        onClick={(event) => {
                          event.stopPropagation();
                          captureBookingSystemOpened(club, "club_card", availability?.date ?? today);
                        }}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {club.name}
                        <ExternalLink size={15} />
                      </a>
                      <DistanceBadge club={club} userCoordinates={userCoordinates} />
                    </h2>
                    <p>{t("club.matchingSlots", { count: bookableSlots.length })}</p>
                  </div>
                </div>
                <div className="clubCardMetaRow">
                  <span className="trackedClubPrice">
                    {t("club.from")} <strong>{formatCzkPerHour(lowestPrice(club.priceInfo))}</strong>
                  </span>
                  {club.acceptsMultisport ? <span className="multisportBadge">{t("club.multisport")}</span> : null}
                </div>
                <span className="clubMeta">
                  <Clock3 size={15} />
                  {availability?.dayRange.start}-{availability?.dayRange.end}
                </span>
                <FreshnessBadge availability={availability} />
                <CourtTypeBadges courtTypes={club.courtTypes} />
              </div>
            </div>
            <a
              className="addressLink"
              href={googleMapsUrl(club.address)}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureEvent("map_opened", { club_slug: club.slug, source: "matching_clubs" })}
            >
              <MapPin size={15} />
              <span>{club.address}</span>
            </a>
          </Card>
        ))
      ) : (
        <EmptyState title={t("club.noMatchingTitle")}>{t("club.noMatchingBody")}</EmptyState>
      )}
    </section>
  );
}

function DistanceBadge({ club, userCoordinates }: { club: Club; userCoordinates: Coordinates | null }) {
  const { i18n: translation, t } = useTranslation();
  if (!userCoordinates) {
    return <DistanceInfo message={t("location.enableDistanceHelp")} />;
  }

  const distance = distanceInKilometers(userCoordinates, club.coordinates);
  const locale = localeByLanguage[translation.language as LanguageCode] ?? "en";
  const formattedDistance = new Intl.NumberFormat(locale, {
    maximumFractionDigits: distance < 10 ? 1 : 0
  }).format(distance);

  return (
    <span className="distanceIndicator distanceBadge" title={t("club.distanceStraightLine")}>
      <Navigation size={13} />
      {t("club.distanceFromYou", { distance: formattedDistance })}
    </span>
  );
}

function DistanceInfo({ message }: { message: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  function showTooltip() {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const bounds = anchor.getBoundingClientRect();
    const halfTooltipWidth = Math.min(130, Math.max(90, window.innerWidth / 2 - 12));
    setPosition({
      left: Math.min(window.innerWidth - halfTooltipWidth, Math.max(halfTooltipWidth, bounds.left + bounds.width / 2)),
      top: bounds.bottom + 8
    });
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    const closeTooltip = () => setIsOpen(false);
    window.addEventListener("resize", closeTooltip);
    window.addEventListener("scroll", closeTooltip, true);
    return () => {
      window.removeEventListener("resize", closeTooltip);
      window.removeEventListener("scroll", closeTooltip, true);
    };
  }, [isOpen]);

  return (
    <>
      <span
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-label={message}
        className="distanceIndicator distanceInfo"
        onBlur={() => setIsOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isOpen) setIsOpen(false);
          else showTooltip();
        }}
        onFocus={showTooltip}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isOpen) setIsOpen(false);
            else showTooltip();
          }
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setIsOpen(false)}
        ref={anchorRef}
        role="button"
        tabIndex={0}
      >
        <Info size={14} />
      </span>
      {isOpen ? createPortal(
        <span
          className="distanceTooltip"
          id={tooltipId}
          role="tooltip"
          style={{ left: position.left, top: position.top }}
        >
          {message}
        </span>,
        document.body
      ) : null}
    </>
  );
}

function LoadProgressBadge({
  availabilityCheckClubs,
  checkedClubSlugs,
  failedClubs,
  isLoading,
  loadProgress
}: {
  availabilityCheckClubs: Club[];
  checkedClubSlugs: Set<string>;
  failedClubs: FailedClub[];
  isLoading: boolean;
  loadProgress: { completed: number; total: number };
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const failedClubSlugs = new Set(failedClubs.map(({ club }) => club.slug));
  const currentTime = new Date();
  const nextCheck = nextApproximateCheck(pragueDateInputValue(currentTime), currentTime);
  const countdown = approximateCountdown(nextCheck, currentTime);
  const nextCheckTooltip = t("availability.nextCheckTooltip", { duration: countdown });

  if (loadProgress.total === 0) {
    return null;
  }

  return (
    <span className="loadProgressPopover">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={isLoading ? "loadProgressBadge loadProgressBadge-loading" : "loadProgressBadge"}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isLoading ? <span className="loadProgressSpinner" aria-hidden="true" /> : null}
        {loadProgress.completed}/{loadProgress.total} <span className="loadProgressLabel">{t("availability.checkedCount")}</span>
      </button>
      {!isLoading ? (
        <span
          aria-label={`${t("availability.nextCheck", { duration: countdown })}. ${nextCheckTooltip}`}
          className="nextCheckBadge"
          data-tooltip={nextCheckTooltip}
          tabIndex={0}
        >
          {t("availability.nextCheck", { duration: countdown })}
        </span>
      ) : null}
      {isOpen ? (
        <div className="checkedClubsPopover" role="dialog" aria-label={t("availability.checkedClubsTitle")}>
          <strong>{t("availability.checkedClubsTitle")}</strong>
          {availabilityCheckClubs.length > 0 ? (
            <ul>
              {availabilityCheckClubs.map((club) => {
                const isFailed = failedClubSlugs.has(club.slug);
                const isFetched = checkedClubSlugs.has(club.slug);
                const className = isFailed || !isFetched ? "checkedClubItem checkedClubItem-problem" : "checkedClubItem";

                return (
                  <li className={className} key={club.slug}>
                    {club.name}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{t("availability.noCheckedClubs")}</p>
          )}
        </div>
      ) : null}
    </span>
  );
}

function DateCalendarPicker({
  value,
  minDate,
  maxDate,
  language,
  onChange
}: {
  value: string;
  minDate: string;
  maxDate: string;
  language: LanguageCode;
  onChange: (date: string) => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthInputValue(value));
  const pickerRef = useRef<HTMLDivElement>(null);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const previousMonth = addMonthsToMonthInput(visibleMonth, -1);
  const nextMonth = addMonthsToMonthInput(visibleMonth, 1);
  const isPreviousMonthDisabled = monthEndDate(previousMonth) < minDate;
  const isNextMonthDisabled = `${nextMonth}-01` > maxDate;

  useEffect(() => {
    if (isOpen) return;
    setVisibleMonth(monthInputValue(value));
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="datePicker" ref={pickerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="uiControl datePickerButton"
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{formatSelectedDateLabel(value, minDate, language)}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="datePickerPopover" role="dialog" aria-label={t("date.chooseDate")}>
          <div className="datePickerHeader">
            <button
              aria-label={t("date.previousMonth")}
              className="datePickerNavButton"
              disabled={isPreviousMonthDisabled}
              type="button"
              onClick={() => setVisibleMonth(previousMonth)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{formatMonthLabel(visibleMonth, language)}</strong>
            <button
              aria-label={t("date.nextMonth")}
              className="datePickerNavButton"
              disabled={isNextMonthDisabled}
              type="button"
              onClick={() => setVisibleMonth(nextMonth)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="datePickerWeekdays" aria-hidden="true">
            {(t("date.weekdays", { returnObjects: true }) as string[]).map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="datePickerGrid">
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  aria-current={day === minDate ? "date" : undefined}
                  aria-pressed={day === value}
                  className={day === value ? "datePickerDay datePickerDay-selected" : "datePickerDay"}
                  disabled={day < minDate || day > maxDate}
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(day);
                    setIsOpen(false);
                  }}
                >
                  {Number(day.slice(-2))}
                </button>
              ) : (
                <span className="datePickerDaySpacer" key={`spacer-${index}`} aria-hidden="true" />
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CourtTypeBadges({ courtTypes }: { courtTypes: CourtType[] }) {
  const { t } = useTranslation();

  return (
    <div className="courtTypeBadges" aria-label={t("club.courtTypes")}>
      {courtTypes.map((courtType) => (
        <span className={`courtTypeBadge courtTypeBadge-${courtType}`} key={courtType}>
          {courtType === "indoor" ? t("club.indoor") : t("club.outdoor")}
        </span>
      ))}
    </div>
  );
}

function PhoneInfoRow({ phone }: { phone: string }) {
  const { t } = useTranslation();
  const href = phoneHref(phone);

  if (!href) {
    return (
      <span className="detailInfoRow">
        <Phone size={16} />
        <span>{phone === "Not published" ? t("club.notPublished") : phone}</span>
      </span>
    );
  }

  return (
    <a className="detailInfoRow" href={`tel:${href}`}>
      <Phone size={16} />
      <span>{phone}</span>
    </a>
  );
}

function ClubDetail({
  club,
  availability,
  slots,
  courtsNeeded,
  slotsLoading = false,
  availabilityUnavailable = false,
  unavailableReason,
  directBookingUrl,
  userCoordinates
}: {
  club: Club;
  availability?: AvailabilityResult;
  slots: BookableSlot[];
  courtsNeeded: number;
  slotsLoading?: boolean;
  availabilityUnavailable?: boolean;
  unavailableReason?: string;
  directBookingUrl?: string;
  userCoordinates: Coordinates | null;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Card className="clubDetail">
        <ClubImage club={club} loading="eager" />
        <div className="clubDetailBody">
          <div>
            <h1>{club.name}</h1>
            <div className="detailLocationRow">
              <a
                className="detailAddress"
                href={googleMapsUrl(club.address)}
                target="_blank"
                rel="noreferrer"
                onClick={() => captureEvent("map_opened", { club_slug: club.slug, source: "club_detail" })}
              >
                <MapPin size={16} />
                {club.address}
              </a>
              <DistanceBadge club={club} userCoordinates={userCoordinates} />
            </div>
            <div className="detailInfoList">
              <span className="detailInfoRow">
                <CloudSun size={16} />
                <span>{formatCourtTypeSummary(club)}</span>
              </span>
              {club.acceptsMultisport ? (
                <span className="detailInfoRow">
                  <WalletCards size={16} />
                  <span className="multisportBadge">{t("club.multisport")}</span>
                </span>
              ) : null}
              <PhoneInfoRow phone={club.phone} />
              {club.secondaryPhone ? (
                <PhoneInfoRow phone={club.secondaryPhone} />
              ) : null}
              {directBookingUrl ? (
                <a
                  className="detailInfoRow detailBookingLink"
                  href={directBookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => captureBookingSystemOpened(club, "club_detail", availability?.date ?? today)}
                >
                  <ExternalLink size={16} />
                  <span>{t("actions.openBookingSystem")}</span>
                </a>
              ) : null}
              <FreshnessBadge availability={availability} />
              <span className="detailInfoRow priceInfoRow">
                <WalletCards size={16} />
                <span>{renderPriceInfo(formatPriceInfoText(club.priceInfo))}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="slotPanel">
        <div className="panelHeader">
          <div>
            <Badge tone="green">{t("club.slots", { count: slots.length })}</Badge>
            <h2>{t("club.availableTimes")}</h2>
          </div>
          <ExternalLink size={18} />
        </div>
        {slotsLoading ? (
          <SlotListSkeleton />
        ) : slots.length > 0 ? (
          <div className="slotList">
            {slots.map((slot) => {
              const slotDate = availability?.date ?? today;
              const bookingUrl = slot.bookingUrl ?? club.bookingUrl(slotDate);
              const courtNames = formatCourtNames(slot.courts.slice(0, courtsNeeded));

              return (
                <div className="slot" key={`${slot.start}-${slot.end}-${slot.courts.join("-")}`}>
                  <div className="slotSummary">
                    <strong>
                      {slot.start} - {slot.end}
                    </strong>
                    <span>{courtNames.join(" + ")}</span>
                  </div>
                  <div className="slotActions">
                    <button
                      className="slotAction slotAction-share"
                      type="button"
                      onClick={() => shareSlot(club, slot, slotDate, bookingUrl, courtNames)}
                    >
                      {t("actions.share")}
                      <Share2 size={13} />
                    </button>
                    <a
                      className="slotAction slotAction-book"
                      href={bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={t("actions.openBookingSystem")}
                      onClick={() => captureBookingSystemOpened(club, "club_detail_slot", slotDate, slot)}
                    >
                      {t("actions.book")}
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : availabilityUnavailable ? (
          <div className="availabilityWarning" role="status">
            <TriangleAlert size={22} />
            <div>
              <strong>{t("availability.notLoaded")}</strong>
              <p>
                {unavailableReason ?? t("availability.unavailableReason")} {t("availability.unavailableSuffix")}
              </p>
              {directBookingUrl ? (
                <a
                  href={directBookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => captureBookingSystemOpened(club, "availability_unavailable", availability?.date ?? today)}
                >
                  {t("actions.openBookingSystem")}
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState title={t("club.noSlotsTitle")}>{t("club.noSlotsBody")}</EmptyState>
        )}
      </Card>
    </>
  );
}

function SlotListSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="slotList" aria-label={t("club.availableTimes")}>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="slot slotSkeleton" key={index}>
          <div>
            <Skeleton className="lineSkeleton short" />
            <Skeleton className="lineSkeleton" />
          </div>
          <Skeleton className="pillSkeleton" />
        </div>
      ))}
    </div>
  );
}

function ClubDetailSkeleton() {
  const { t } = useTranslation();

  return (
    <>
      <Card className="clubDetail detailSkeleton" aria-label={t("availability.notLoaded")}>
        <Skeleton className="detailImageSkeleton" />
        <div className="clubDetailBody">
          <div className="detailSkeletonStack">
            <Skeleton className="pillSkeleton" />
            <Skeleton className="lineSkeleton titleSkeleton" />
            <Skeleton className="lineSkeleton wide" />
          </div>
          <div className="detailStats">
            <Skeleton className="pillSkeleton" />
            <Skeleton className="pillSkeleton widePill" />
          </div>
        </div>
      </Card>

      <Card className="slotPanel">
        <div className="panelHeader">
          <div className="detailSkeletonStack">
            <Skeleton className="pillSkeleton" />
            <Skeleton className="lineSkeleton short" />
          </div>
        </div>
        <SlotListSkeleton />
      </Card>
    </>
  );
}

function FreshnessBadge({ availability }: { availability?: AvailabilityResult }) {
  const { t } = useTranslation();

  if (!availability) {
    return null;
  }

  const checkedAt = availability.cache?.cachedAt ?? availability.fetchedAt;

  return (
    <span className="freshnessBadge">
      {t("availability.checked")} {formatCheckedTime(checkedAt)}
    </span>
  );
}

function captureBookingSystemOpened(club: Club, source: string, date: string, slot?: BookableSlot) {
  captureEvent("booking_system_opened", {
    club_slug: club.slug,
    date,
    source,
    ...(slot ? { court_count: slot.courts.length, slot_end: slot.end, slot_start: slot.start } : {})
  });
}

async function shareSlot(club: Club, slot: BookableSlot, date: string, bookingUrl: string, courtNames: string[]) {
  const text = `${club.name}\n${date}, ${slot.start}-${slot.end}\n${club.address}\n${googleMapsUrl(club.address)}\n${bookingUrl}`;
  const shareData = { text };

  captureEvent("slot_shared", {
    club_slug: club.slug,
    court_count: courtNames.length,
    date,
    slot_end: slot.end,
    slot_start: slot.start
  });

  if (navigator.share) {
    await navigator.share(shareData).catch(() => undefined);
    return;
  }

  await navigator.clipboard?.writeText(text).catch(() => undefined);
}

function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function geolocationErrorCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "number" ? error.code : null;
}

function phoneHref(phone: string): string {
  const value = phone.replace(/[^\d+]/g, "");
  return /\d/.test(value) ? value : "";
}

function dailyOpeningHours(range: TimeRange): Record<number, TimeRange> {
  return {
    0: range,
    1: range,
    2: range,
    3: range,
    4: range,
    5: range,
    6: range
  };
}

function weekdayOpeningHours(openingHours: Record<number, TimeRange>): Record<number, TimeRange> {
  return openingHours;
}

function formatOpeningHours(
  openingHours: Record<number, TimeRange> | undefined,
  weekdayLabels: string[],
  dailyLabel: string,
  notPublishedLabel: string
): string {
  if (!openingHours) return notPublishedLabel;

  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  const dayEntries = orderedDays.flatMap((day) => {
    const range = openingHours[day];
    return range ? [{ day, range }] : [];
  });

  if (dayEntries.length === 0) return notPublishedLabel;

  const firstRange = dayEntries[0]?.range;
  const sameEveryDay =
    dayEntries.length === 7 &&
    firstRange &&
    dayEntries.every(({ range }) => range.start === firstRange.start && range.end === firstRange.end);

  if (sameEveryDay) {
    return `${dailyLabel} ${firstRange.start}-${firstRange.end}`;
  }

  const groups: Array<{ endDay: number; range: TimeRange; startDay: number }> = [];
  for (const { day, range } of dayEntries) {
    const previousGroup = groups[groups.length - 1];
    if (previousGroup && previousGroup.range.start === range.start && previousGroup.range.end === range.end) {
      previousGroup.endDay = day;
    } else {
      groups.push({ endDay: day, range, startDay: day });
    }
  }

  return groups
    .map(({ endDay, range, startDay }) => {
      const dayLabel = startDay === endDay ? weekdayLabel(startDay, weekdayLabels) : `${weekdayLabel(startDay, weekdayLabels)}-${weekdayLabel(endDay, weekdayLabels)}`;
      return `${dayLabel} ${range.start}-${range.end}`;
    })
    .join(", ");
}

function weekdayLabel(day: number, weekdayLabels: string[]): string {
  if (day === 0) return weekdayLabels[6] ?? "Sun";
  return weekdayLabels[day - 1] ?? String(day);
}

function clubImageDimensions(club: Club): { height?: number; width?: number } {
  return CLUB_IMAGE_DIMENSIONS[club.slug] ?? {};
}

function optimizedClubImageSrcSet(club: Club): string {
  return [
    `${assetPath(`clubs/optimized/${club.slug}-640.webp`)} 640w`,
    `${assetPath(`clubs/optimized/${club.slug}-1200.webp`)} 1200w`
  ].join(", ");
}

function clubMatchesCourtType(club: Club, courtTypeFilter: CourtTypeFilter): boolean {
  return courtTypeFilter === "all" || club.courtTypes.includes(courtTypeFilter);
}

function clubCanMatchSearchWindow(club: Club, date: string, durationMinutes: number, timeWindow: TimeRange, now: Date): boolean {
  const openingRange = openingRangeForDate(club, date);
  if (!openingRange) return club.openingHours ? false : true;

  const earliestStart = Math.max(
    toMinutes(openingRange.start),
    toMinutes(timeWindow.start),
    toMinutes(defaultStartTimeForDate(date, now))
  );
  const latestEnd = Math.min(toMinutes(openingRange.end), toMinutes(timeWindow.end));

  return earliestStart + durationMinutes <= latestEnd;
}

function openingRangeForDate(club: Club, date: string): TimeRange | undefined {
  return club.openingHours?.[weekdayForDate(date)];
}

function effectiveTimeWindowForDate(
  date: string,
  customStartTime: string | null,
  customEndTime: string | null,
  now: Date
): TimeRange {
  const minimumStartTime = defaultStartTimeForDate(date, now);
  return {
    start: latestTime(customStartTime ?? minimumStartTime, minimumStartTime),
    end: customEndTime ?? TIME_PICKER_RANGE.end
  };
}

function formatCourtTypeSummary(club: Club): string {
  const indoorCount = club.courtTypes.includes("indoor") ? club.courtTypeLabel.match(/(\d+) indoor/)?.[1] : undefined;
  const outdoorCount = club.courtTypes.includes("outdoor") ? club.courtTypeLabel.match(/(\d+) outdoor/)?.[1] : undefined;
  const parts = [
    indoorCount ? `${indoorCount} ${i18n.t("club.indoor").toLocaleLowerCase()} ${i18n.t("club.court", { count: Number(indoorCount) })}` : null,
    outdoorCount ? `${outdoorCount} ${i18n.t("club.outdoor").toLocaleLowerCase()} ${i18n.t("club.court", { count: Number(outdoorCount) })}` : null
  ].filter(Boolean);

  return parts.join(" + ");
}

function formatCourtNames(courts: string[]): string[] {
  return courts.map((court) => court.replace(/^Kurt\b/i, i18n.t("club.providerCourtPrefix")));
}

function formatPriceInfoText(priceInfo: string): string {
  const language = i18n.language as LanguageCode;
  const replacements: Array<[RegExp, string]> = [
    [/1 h:/g, language === "ua" ? "1 год:" : "1 h:"],
    [/Po-Pá/g, language === "en" ? "Mon-Fri" : language === "ua" ? "Пн-Пт" : "Po-Pá"],
    [/víkend/g, language === "en" ? "weekend" : language === "ua" ? "вихідні" : "víkend"],
    [/léto/g, language === "en" ? "summer" : language === "ua" ? "літо" : "léto"],
    [/zima/g, language === "en" ? "winter" : language === "ua" ? "зима" : "zima"],
    [/from/g, language === "en" ? "from" : language === "ua" ? "від" : "od"],
    [/price not published/g, language === "en" ? "price not published" : language === "ua" ? "ціна не опублікована" : "cena nezveřejněna"]
  ];

  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), priceInfo);
}

function renderPriceInfo(priceInfo: string) {
  const pricePattern = /(\d+(?:-\d+)?\s*Kč)/g;
  const exactPricePattern = /^\d+(?:-\d+)?\s*Kč$/;
  return priceInfo.split(pricePattern).map((part, index) =>
    exactPricePattern.test(part) ? (
      <strong className="priceValue" key={`${part}-${index}`}>
        {part}
      </strong>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  );
}

function buildTrackedClubs(clubs: Club[]): TrackedClub[] {
  return clubs.map((club) => ({
    club,
    priceFrom: lowestPrice(club.priceInfo)
  }));
}

function sortTrackedClubs(clubs: TrackedClub[], sort: FindCourtSort): TrackedClub[] {
  return [...clubs].sort((firstClub, secondClub) => {
    const nameComparison = firstClub.club.name.localeCompare(secondClub.club.name);

    if (sort === "priceAsc" || sort === "priceDesc") {
      const priceComparison = firstClub.priceFrom - secondClub.priceFrom;
      return (sort === "priceAsc" ? priceComparison : -priceComparison) || nameComparison;
    }

    if (sort === "multisport") {
      return Boolean(secondClub.club.acceptsMultisport) === Boolean(firstClub.club.acceptsMultisport)
        ? nameComparison
        : Number(Boolean(secondClub.club.acceptsMultisport)) - Number(Boolean(firstClub.club.acceptsMultisport));
    }

    if (sort === "indoor" || sort === "outdoor") {
      const firstHasType = firstClub.club.courtTypes.includes(sort);
      const secondHasType = secondClub.club.courtTypes.includes(sort);
      return firstHasType === secondHasType ? nameComparison : Number(secondHasType) - Number(firstHasType);
    }

    return nameComparison;
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function sortClubResults<T extends { club: Club }>(results: T[], sort: FindCourtSort): T[] {
  return [...results].sort((firstResult, secondResult) => {
    const firstClub = firstResult.club;
    const secondClub = secondResult.club;
    const nameComparison = firstClub.name.localeCompare(secondClub.name);

    if (sort === "priceAsc" || sort === "priceDesc") {
      const priceComparison = lowestPrice(firstClub.priceInfo) - lowestPrice(secondClub.priceInfo);
      return (sort === "priceAsc" ? priceComparison : -priceComparison) || nameComparison;
    }

    if (sort === "multisport") {
      return Boolean(secondClub.acceptsMultisport) === Boolean(firstClub.acceptsMultisport)
        ? nameComparison
        : Number(Boolean(secondClub.acceptsMultisport)) - Number(Boolean(firstClub.acceptsMultisport));
    }

    if (sort === "indoor" || sort === "outdoor") {
      const firstHasType = firstClub.courtTypes.includes(sort);
      const secondHasType = secondClub.courtTypes.includes(sort);
      return firstHasType === secondHasType ? nameComparison : Number(secondHasType) - Number(firstHasType);
    }

    return nameComparison;
  });
}

function lowestPrice(priceInfo: string): number {
  const prices = Array.from(priceInfo.matchAll(/(\d+)(?:-\d+)?\s*Kč/g), (match) => Number(match[1]));
  return Math.min(...prices);
}

function formatCzk(price: number): string {
  return Number.isFinite(price) ? `${price} Kč` : i18n.t("club.priceUnknown");
}

function formatCzkPerHour(price: number): string {
  return Number.isFinite(price) ? `${price} Kč/h` : i18n.t("club.priceUnknown");
}

function skySportCityTimelineUrl(date: string): string {
  const params = new URLSearchParams({
    "tc[0].s": "true",
    "_tc[0].s": "on",
    "_tc[1].s": "on",
    "_tc[2].s": "on",
    "_tc[3].s": "on",
    "_tc[4].s": "on",
    criteriaTimestamp: String(pragueLocalMidnightTimestamp(date))
  });

  return `https://rezervace.skysportcity.cz/timeline/day?${params.toString()}#timelineCalendar`;
}

function playtomicClubUrl(clubSlug: string, date: string): string {
  const params = new URLSearchParams({
    date,
    sport: "PADEL"
  });

  return `https://playtomic.com/clubs/${clubSlug}?${params.toString()}`;
}

function bookaballUrl(date: string): string {
  const params = new URLSearchParams({
    startDate: date
  });

  return `https://padeldzus.bookaball.com/cs/bookings/create?${params.toString()}`;
}

function padelosCompanyUrl(): string {
  return "https://player.padelos.co/company/217?clubIds=216927&locale=cs";
}

function reenioBookingUrl(date: string): string {
  return `https://areal-cisarska-louka.reenio.cz/cs/service/hriste-padel-48086/${date};viewMode=7-days`;
}

function rogerOnlineUrl(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const params = new URLSearchParams({
    rok: String(year),
    mesic: String(month),
    den: String(day),
    klub: "197",
    set: "3"
  });

  return `https://www.rogeronline.cz/v2/?${params.toString()}`;
}

function buildSeoMeta({
  date,
  language,
  page,
  selectedClub
}: {
  date: string;
  language: LanguageCode;
  page: Page;
  selectedClub: Club | null;
}): SeoMeta {
  const locale = localeByLanguage[language];
  const canonicalUrl = canonicalUrlFor(page, selectedClub, language);
  const alternateUrls = Object.fromEntries(
    LANGUAGE_OPTIONS.map(({ code }) => [code, canonicalUrlFor(page, selectedClub, code)])
  ) as Record<LanguageCode, string>;
  const imageUrl = selectedClub ? absoluteSiteUrl(selectedClub.imageUrl) : SOCIAL_IMAGE_URL;
  const title = seoTitle(page, selectedClub, language);
  const description = seoDescription(page, selectedClub, language);

  return {
    alternateUrls,
    canonicalUrl,
    description,
    imageUrl,
    jsonLd: buildStructuredData({ canonicalUrl, date, description, imageUrl, language, page, selectedClub, title }),
    locale,
    title
  };
}

function applySeoMeta(meta: SeoMeta) {
  document.title = meta.title;
  document.documentElement.lang = meta.locale;
  setCanonicalUrl(meta.canonicalUrl);
  setAlternateUrls(meta.alternateUrls);
  setMetaTag("name", "description", meta.description);
  setMetaTag("name", "robots", "index,follow");
  setMetaTag("property", "og:site_name", "HLEDEJKURTY");
  setMetaTag("property", "og:type", "website");
  setMetaTag("property", "og:title", meta.title);
  setMetaTag("property", "og:description", meta.description);
  setMetaTag("property", "og:url", meta.canonicalUrl);
  setMetaTag("property", "og:image", meta.imageUrl);
  setMetaTag("property", "og:locale", openGraphLocale(meta.locale));
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", meta.title);
  setMetaTag("name", "twitter:description", meta.description);
  setMetaTag("name", "twitter:image", meta.imageUrl);
  setStructuredData(meta.jsonLd);
}

function seoTitle(page: Page, selectedClub: Club | null, language: LanguageCode): string {
  if (selectedClub) {
    if (language === "cz") return `${selectedClub.name} padel Praha | HLEDEJKURTY`;
    if (language === "ua") return `${selectedClub.name} падел у Празі | HLEDEJKURTY`;
    return `${selectedClub.name} padel court Prague | HLEDEJKURTY`;
  }

  if (page === "allClubs") {
    if (language === "cz") return "Padelové kluby v Praze | HLEDEJKURTY";
    if (language === "ua") return "Падел-клуби у Празі | HLEDEJKURTY";
    return "Padel clubs in Prague | HLEDEJKURTY";
  }

  if (page === "about") {
    if (language === "cz") return "O vyhledávači padelových kurtů | HLEDEJKURTY";
    if (language === "ua") return "Про пошук падел-кортів | HLEDEJKURTY";
    return "About the Prague padel court finder | HLEDEJKURTY";
  }

  if (page === "privacy") return `${i18n.t("legal.privacyTitle")} | HLEDEJKURTY`;
  if (page === "terms") return `${i18n.t("legal.termsTitle")} | HLEDEJKURTY`;
  if (page === "cookies") return `${i18n.t("legal.cookiesTitle")} | HLEDEJKURTY`;

  if (language === "cz") return "Volné padelové kurty Praha | HLEDEJKURTY";
  if (language === "ua") return "Вільні падел-корти у Празі | HLEDEJKURTY";
  return "Find free padel courts in Prague | HLEDEJKURTY";
}

function seoDescription(page: Page, selectedClub: Club | null, language: LanguageCode): string {
  if (selectedClub) {
    const price = formatCzkPerHour(lowestPrice(selectedClub.priceInfo));
    if (language === "cz") {
      return `${selectedClub.name}: ${selectedClub.courtCount} padelové kurty, ${selectedClub.address}. Zkontrolujte volné časy, cenu od ${price} a rezervujte přes oficiální systém.`;
    }
    if (language === "ua") {
      return `${selectedClub.name}: ${selectedClub.courtCount} падел-корти, ${selectedClub.address}. Перевірте вільні часи, ціну від ${price} і бронюйте в офіційній системі.`;
    }
    return `${selectedClub.name}: ${selectedClub.courtCount} padel courts, ${selectedClub.address}. Check available times, prices from ${price}, and book through the official system.`;
  }

  if (page === "allClubs") {
    if (language === "cz") {
      return "Seznam padelových klubů v Praze s adresami, cenami, typy kurtů, podporou Multisport a odkazy na oficiální rezervace.";
    }
    if (language === "ua") {
      return "Список падел-клубів у Празі з адресами, цінами, типами кортів, Multisport і посиланнями на офіційне бронювання.";
    }
    return "Browse Prague padel clubs with addresses, prices, court types, Multisport support, and official booking links.";
  }

  if (page === "about") return i18n.t("about.body");
  if (page === "privacy") return i18n.t("legal.privacyIntro");
  if (page === "terms") return i18n.t("legal.termsIntro");
  if (page === "cookies") return i18n.t("legal.cookiesIntro");

  if (language === "cz") {
    return "Najděte volné padelové kurty v Praze. Porovnejte dostupnost, ceny, vnitřní i venkovní kurty, Multisport, adresy a rezervační odkazy.";
  }
  if (language === "ua") {
    return "Знайдіть вільні падел-корти у Празі. Порівняйте доступність, ціни, криті й відкриті корти, Multisport, адреси та бронювання.";
  }
  return DEFAULT_META_DESCRIPTION;
}

function buildStructuredData({
  canonicalUrl,
  date,
  description,
  imageUrl,
  language,
  page,
  selectedClub,
  title
}: {
  canonicalUrl: string;
  date: string;
  description: string;
  imageUrl: string;
  language: LanguageCode;
  page: Page;
  selectedClub: Club | null;
  title: string;
}): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [
    {
      "@id": `${SITE_ORIGIN}/#website`,
      "@type": "WebSite",
      description: DEFAULT_META_DESCRIPTION,
      inLanguage: localeByLanguage[language],
      name: "HLEDEJKURTY",
      url: SITE_ORIGIN
    },
    {
      "@id": `${SITE_ORIGIN}/#webapp`,
      "@type": "WebApplication",
      applicationCategory: "SportsApplication",
      description: DEFAULT_META_DESCRIPTION,
      image: SOCIAL_IMAGE_URL,
      inLanguage: ["en", "cs", "uk"],
      name: "HLEDEJKURTY",
      operatingSystem: "Web",
      url: SITE_ORIGIN
    },
    {
      "@id": `${canonicalUrl}#webpage`,
      "@type": "WebPage",
      description,
      image: imageUrl,
      inLanguage: localeByLanguage[language],
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      name: title,
      url: canonicalUrl
    }
  ];

  if (selectedClub) {
    graph.push(buildClubStructuredData(selectedClub, date, canonicalUrl));
    graph.push(buildBreadcrumbStructuredData([{ name: "Padel courts", url: SITE_ORIGIN }, { name: selectedClub.name, url: canonicalUrl }]));
  } else if (page === "about") {
    graph.push(buildFaqStructuredData(canonicalUrl, language));
    graph.push(buildBreadcrumbStructuredData([{ name: "Padel courts", url: SITE_ORIGIN }, { name: title.replace(" | HLEDEJKURTY", ""), url: canonicalUrl }]));
  } else if (page === "allClubs" || page === "clubs") {
    graph.push(buildClubItemListStructuredData(CLUBS, language));
  } else {
    graph.push(buildBreadcrumbStructuredData([{ name: "Padel courts", url: SITE_ORIGIN }, { name: title.replace(" | HLEDEJKURTY", ""), url: canonicalUrl }]));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

function buildFaqStructuredData(canonicalUrl: string, language: LanguageCode): Record<string, unknown> {
  return {
    "@id": `${canonicalUrl}#faq`,
    "@type": "FAQPage",
    inLanguage: localeByLanguage[language],
    mainEntity: ABOUT_FAQ_KEYS.map((question) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: i18n.t(`about.faq.${question}.answer`, { lng: language })
      },
      name: i18n.t(`about.faq.${question}.question`, { lng: language })
    }))
  };
}

function buildClubItemListStructuredData(clubs: Club[], language: LanguageCode): Record<string, unknown> {
  return {
    "@id": `${SITE_ORIGIN}/clubs/#itemlist`,
    "@type": "ItemList",
    itemListElement: clubs.map((club, index) => ({
      "@type": "ListItem",
      item: {
        "@id": `${canonicalUrlFor("clubs", club, language)}#club`,
        name: club.name,
        url: canonicalUrlFor("clubs", club, language)
      },
      position: index + 1
    })),
    name: "Padel clubs in Prague"
  };
}

function buildClubStructuredData(club: Club, date: string, canonicalUrl: string): Record<string, unknown> {
  const telephone = phoneHref(club.phone);
  return {
    "@id": `${canonicalUrl}#club`,
    "@type": "SportsActivityLocation",
    address: {
      "@type": "PostalAddress",
      addressCountry: "CZ",
      addressLocality: "Praha",
      streetAddress: club.address
    },
    amenityFeature: club.courtTypes.map((courtType) => ({
      "@type": "LocationFeatureSpecification",
      name: courtType === "indoor" ? "Indoor padel courts" : "Outdoor padel courts",
      value: true
    })),
    image: absoluteSiteUrl(club.imageUrl),
    name: club.name,
    priceRange: formatCzkPerHour(lowestPrice(club.priceInfo)),
    sport: "Padel",
    telephone: telephone || undefined,
    url: canonicalUrl,
    potentialAction: {
      "@type": "ReserveAction",
      target: club.bookingUrl(date)
    }
  };
}

function buildBreadcrumbStructuredData(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: item.url,
      name: item.name,
      position: index + 1
    }))
  };
}

function canonicalUrlFor(page: Page, club: Club | null, language: LanguageCode): string {
  return new URL(pathForRoute(page, club?.slug ?? null, language), SITE_ORIGIN).toString();
}

function absoluteSiteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

function setCanonicalUrl(url: string) {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }
  element.href = url;
}

function setAlternateUrls(urls: Record<LanguageCode, string>) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove());
  const values: Array<[string, string]> = [
    ["cs", urls.cz],
    ["en", urls.en],
    ["uk", urls.ua],
    ["x-default", urls.cz]
  ];
  for (const [hreflang, href] of values) {
    const element = document.createElement("link");
    element.rel = "alternate";
    element.hreflang = hreflang;
    element.href = href;
    document.head.append(element);
  }
}

function setMetaTag(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setStructuredData(data: Record<string, unknown>) {
  let element = document.getElementById("seo-structured-data") as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement("script");
    element.id = "seo-structured-data";
    element.type = "application/ld+json";
    document.head.append(element);
  }
  element.textContent = JSON.stringify(data);
}

function openGraphLocale(locale: string): string {
  if (locale === "cs") return "cs_CZ";
  if (locale === "uk") return "uk_UA";
  return "en_US";
}

function clubsHref(language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  return pathForRoute("clubs", null, language);
}

function clubHref(clubSlug: string, language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  return pathForRoute("clubs", clubSlug, language);
}

function allClubsHref(language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  return pathForRoute("allClubs", null, language);
}

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function aboutHref(language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  return pathForRoute("about", null, language);
}

function legalHref(page: "privacy" | "terms" | "cookies", language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  return pathForRoute(page, null, language);
}

function routeFromLocation(pathname: string, params: URLSearchParams): { page: Page; clubSlug: string | null; language: LanguageCode } {
  const language = languageFromPathname(pathname);
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "en" || segments[0] === "ua") segments.shift();
  if (segments[0] === "clubs" && segments[1]) return { page: "clubs", clubSlug: segments[1], language };
  if (segments[0] === "clubs") return { page: "allClubs", clubSlug: null, language };
  if (segments[0] === "about") return { page: "about", clubSlug: null, language };
  if (segments[0] === "privacy-policy") return { page: "privacy", clubSlug: null, language };
  if (segments[0] === "terms-of-use") return { page: "terms", clubSlug: null, language };
  if (segments[0] === "cookie-policy") return { page: "cookies", clubSlug: null, language };

  const page = pageFromParam(params.get("page"));
  return { page, clubSlug: page === "clubs" ? params.get("club") : null, language };
}

function pageFromParam(page: string | null): Page {
  if (page === "about") return "about";
  if (page === "all-clubs" || page === "courts") return "allClubs";
  if (page === "privacy" || page === "privacy-policy") return "privacy";
  if (page === "terms" || page === "terms-of-use") return "terms";
  if (page === "cookies" || page === "cookie-policy") return "cookies";
  return "clubs";
}

function pathForRoute(page: Page, clubSlug: string | null, language: LanguageCode = languageFromPathname(window.location.pathname)): string {
  const prefix = language === "en" ? "/en" : language === "ua" ? "/ua" : "";
  if (clubSlug) return `${prefix}/clubs/${encodeURIComponent(clubSlug)}/`;
  if (page === "allClubs") return `${prefix}/clubs/`;
  if (page === "about") return `${prefix}/about/`;
  if (page === "privacy") return `${prefix}/privacy-policy/`;
  if (page === "terms") return `${prefix}/terms-of-use/`;
  if (page === "cookies") return `${prefix}/cookie-policy/`;
  return `${prefix}/`;
}

function localizedPageUrl(page: Page, clubSlug: string | null, language: LanguageCode, date: string | null): string {
  const params = new URLSearchParams();
  if (page === "clubs" && date) params.set("date", date);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return `${pathForRoute(page, clubSlug, language)}${query}`;
}

function selectableDate(date: string | null | undefined, currentDate: string): string {
  if (!date || date < currentDate) return currentDate;
  const maximumDate = addDaysToDateInput(currentDate, MAX_SEARCH_DAYS_AHEAD);
  if (date > maximumDate) return maximumDate;
  return date;
}

function formatSelectedDateLabel(date: string, currentDate: string, language: LanguageCode): string {
  if (date === currentDate) {
    return i18n.t("date.today", { date: formatDateLabel(date, language) });
  }

  if (date === addDaysToDateInput(currentDate, 1)) {
    return i18n.t("date.tomorrow", { date: formatDateLabel(date, language) });
  }

  return formatDateLabel(date, language);
}

function formatDateLabel(date: string, language: LanguageCode): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(localeByLanguage[language], {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Prague",
    weekday: "short"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatMonthLabel(month: string, language: LanguageCode): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(localeByLanguage[language], {
    month: "long",
    timeZone: "Europe/Prague",
    year: "numeric"
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1, 12)));
}

function buildCalendarDays(month: string): Array<string | null> {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthIndex - 1, 1, 12));
  const leadingEmptyDays = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0, 12)).getUTCDate();
  const days: Array<string | null> = Array.from({ length: leadingEmptyDays }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(dateInputValue(year, monthIndex, day));
  }

  return days;
}

function addDaysToDateInput(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days, 12));
  return nextDate.toISOString().slice(0, 10);
}

function nextSaturdayDateInput(date: string): string {
  const weekday = weekdayForDate(date);
  return addDaysToDateInput(date, (6 - weekday + 7) % 7);
}

function addMonthsToMonthInput(month: string, months: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthIndex - 1 + months, 1, 12));
  return nextMonth.toISOString().slice(0, 7);
}

function monthInputValue(date: string): string {
  return date.slice(0, 7);
}

function monthEndDate(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0, 12)).getUTCDate();
  return dateInputValue(year, monthIndex, lastDay);
}

function dateInputValue(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayForDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function writeUrl({
  date,
  clubSlug,
  mode,
  page = "clubs"
}: {
  date: string;
  clubSlug: string | null;
  mode: "push" | "replace";
  page?: Page;
}) {
  const params = new URLSearchParams();
  if (page === "clubs") {
    params.set("date", date);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  window.history[mode === "push" ? "pushState" : "replaceState"](
    null,
    "",
    `${pathForRoute(page, clubSlug)}${query}`
  );
}

function nextTimeOption(time: string, options: string[]): string | undefined {
  return options.find((option) => toComparableTime(option) > toComparableTime(time));
}

function previousTimeOption(time: string, options: string[]): string | undefined {
  return [...options].reverse().find((option) => toComparableTime(option) < toComparableTime(time));
}

function toComparableTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function latestTime(firstTime: string, secondTime: string): string {
  return toComparableTime(firstTime) >= toComparableTime(secondTime) ? firstTime : secondTime;
}

function defaultStartTimeForDate(date: string, now: Date): string {
  if (pragueDateInputValue(now) !== date) return TIME_PICKER_RANGE.start;

  const currentMinutes = pragueTimeInMinutes(now);
  const roundedMinutes = Math.ceil(currentMinutes / 30) * 30;
  const latestSelectableMinutes = toMinutes(TIME_PICKER_RANGE.end);
  return minutesToTimeInput(Math.min(roundedMinutes, latestSelectableMinutes));
}

function minutesToTimeInput(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatCheckedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return i18n.t("availability.recent");
  }

  return new Intl.DateTimeFormat(localeByLanguage[i18n.language as LanguageCode] ?? "en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague"
  }).format(date);
}

function pragueDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Prague",
    year: "numeric"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function pragueTimeInMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Prague"
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(valueByType.hour) * 60 + Number(valueByType.minute) + Number(valueByType.second) / 60;
}

function pragueLocalMidnightTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const offsetMinutes = pragueOffsetMinutes(noonUtc);
  return Date.UTC(year, month - 1, day) - offsetMinutes * 60_000;
}

function pragueOffsetMinutes(date: Date): number {
  const timeZoneName = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Prague",
    timeZoneName: "shortOffset"
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = timeZoneName?.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + Math.sign(hours) * minutes;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
