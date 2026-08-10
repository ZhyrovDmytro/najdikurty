import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
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
  Link2,
  ListOrdered,
  LayoutGrid,
  Menu,
  MapPin,
  Moon,
  Phone,
  RefreshCw,
  Search,
  SearchCheck,
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
  type AvailabilityResult,
  type BookableSlot,
  type TimeRange
} from "./availability";
import posthog from "./posthog";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton } from "./ui";
import "./styles.css";

const initialParams = new URLSearchParams(window.location.search);
const initialCurrentDate = pragueDateInputValue(new Date());
const today = selectableDate(initialParams.get("date"), initialCurrentDate);
const initialTheme = localStorage.getItem("mamekurt-theme") === "dark" ? "dark" : "light";
const initialResultsView = localStorage.getItem("mamekurt-results-view");
const initialShortInfoMode = initialResultsView === "cards" ? false : true;
const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GITHUB_PAGES_API_BASE_URL = "https://najdikurty.onrender.com";
const API_BASE_URL = (
  CONFIGURED_API_BASE_URL ||
  (import.meta.env.MODE === "production" && window.location.hostname.endsWith("github.io") ? GITHUB_PAGES_API_BASE_URL : "")
).replace(/\/$/, "");
type Page = "clubs" | "allClubs" | "about" | "privacy" | "terms" | "cookies";
type CourtType = "indoor" | "outdoor";
type CourtTypeFilter = CourtType | "all";
type FindCourtSort = "name" | "priceAsc" | "priceDesc" | "multisport" | "indoor" | "outdoor";
const TIME_PICKER_RANGE: TimeRange = { start: "00:00", end: "23:59" };
const AVAILABILITY_REQUEST_TIMEOUT_MS = 15_000;
const initialPage: Page = pageFromParam(initialParams.get("page"));
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Club {
  slug: string;
  name: string;
  sport: string;
  imageUrl: string;
  address: string;
  phone: string;
  secondaryPhone?: string;
  priceInfo: string;
  courtCount: number;
  courtTypes: CourtType[];
  courtTypeLabel: string;
  acceptsMultisport?: boolean;
  availabilityEnabled?: boolean;
  bookingUrl: (date: string) => string;
}

const CLUBS: Club[] = [
  {
    slug: "tk-sparta-praha",
    name: "TK Sparta Prague",
    sport: "padel",
    imageUrl: assetPath("clubs/tk-sparta-praha.png"),
    address: "Za Císařským mlýnem 1115/2, 170 00 Praha 7-Bubeneč",
    phone: "+420 731 422 225",
    priceInfo: "1 h: Po-Pá 8-16 520 Kč, 16-21 580 Kč; víkend 540 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    acceptsMultisport: true,
    availabilityEnabled: false,
    bookingUrl: (date: string) =>
      `https://jdemenato.cz/reservation/myportalorganizationcalendar.navigation.daynavigationbar:selectdayinternal/${date}`
  },
  {
    slug: "padel-prosek",
    name: "Padel Prosek",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-prosek.png"),
    address: "Lovosická 559, 190 00 Praha 9-Střížkov",
    phone: "+420 601 559 559",
    priceInfo: "1 h: Po-Pá 7-22 600 Kč; víkend 480 Kč.",
    courtCount: 4,
    courtTypes: ["outdoor"],
    courtTypeLabel: "4 outdoor courts",
    acceptsMultisport: true,
    bookingUrl: (date: string) => skySportCityTimelineUrl(date)
  },
  {
    slug: "padel-club-spoje",
    name: "Padel Club Spoje",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-club-spoje.png"),
    address: "Na Balkáně 990/21A, 130 00 Praha",
    phone: "+420 737 303 003",
    priceInfo: "1 h: Po-Pá 8-14 480 Kč, 14-20 520 Kč; víkend 520 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    bookingUrl: (date: string) => playtomicClubUrl("padel-club-spoje", date)
  },
  {
    slug: "tenis-a-padel-klub-pisecna",
    name: "Tenis & Padel klub Písečná",
    sport: "padel",
    imageUrl: assetPath("clubs/tenis-a-padel-klub-pisecna.png"),
    address: "K Sadu 590/1, Praha 8 - Troja, 182 00 Praha",
    phone: "+420 725 843 649",
    priceInfo: "1 h: Po-Pá 8-16 540 Kč, 16-22 640 Kč; víkend 540 Kč.",
    courtCount: 4,
    courtTypes: ["indoor", "outdoor"],
    courtTypeLabel: "2 indoor + 2 outdoor courts",
    bookingUrl: (date: string) => playtomicClubUrl("tenis-a-padel-klub-pisecna", date)
  },
  {
    slug: "sk-slavia-praha-padel",
    name: "SK Slavia Praha Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/sk-slavia-praha-padel.png"),
    address: "Vladivostocká 1460/10, Praha 10",
    phone: "+420 606 030 301",
    priceInfo: "1 h: Po-Pá 8-10 690 Kč, 10-15 550 Kč, 15-22 690 Kč; víkend 550 Kč.",
    courtCount: 4,
    courtTypes: ["outdoor"],
    courtTypeLabel: "4 outdoor courts",
    availabilityEnabled: false,
    bookingUrl: (date: string) => `https://rezervace.padelslavia.cz/cs/rezervace/index/padel/${date}`
  },
  {
    slug: "head-tenis-centrum-vestec",
    name: "Head Tenis Centrum, Vestec",
    sport: "padel",
    imageUrl: assetPath("clubs/head-tenis-centrum-vestec.png"),
    address: "Sportovní 456, 252 42 Vestec-Jesenice u Prahy",
    phone: "+420 777 773 139",
    priceInfo: "1 h: Po-Pá 7-16 750 Kč, 16-24 900 Kč; víkend 850 Kč.",
    courtCount: 4,
    courtTypes: ["indoor"],
    courtTypeLabel: "4 indoor courts",
    acceptsMultisport: true,
    availabilityEnabled: false,
    bookingUrl: () => "https://teniscentrum.isportsystem.cz/?op=tab-id-13"
  },
  {
    slug: "padel-radotin",
    name: "Padel Radotín",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-radotin.png"),
    address: "Šárovo kolo 932/1, 153 00 Praha 16",
    phone: "+420 739 504 053",
    secondaryPhone: "+420 739 504 052",
    priceInfo: "1 h: Po-Pá 7-15 560 Kč, 15-22 640 Kč; víkend 7-22 600 Kč.",
    courtCount: 3,
    courtTypes: ["outdoor"],
    courtTypeLabel: "3 outdoor courts",
    acceptsMultisport: true,
    availabilityEnabled: false,
    bookingUrl: () => "https://padelradotin.isportsystem.cz/"
  },
  {
    slug: "padel-cakovice",
    name: "Padel Čakovice",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-cakovice.png"),
    address: "Jizerská 328/4, 196 00 Praha-Čakovice",
    phone: "Not published",
    priceInfo: "1 h: price not published.",
    courtCount: 2,
    courtTypes: ["indoor"],
    courtTypeLabel: "2 indoor courts",
    availabilityEnabled: false,
    bookingUrl: () => "https://padelautomat.isportsystem.cz/"
  },
  {
    slug: "padel-neride",
    name: "Padel Neride",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-neride.png"),
    address: "V Chotejně 700, 102 00 Praha 15",
    phone: "+420 272 111 817",
    priceInfo: "1 h: léto Po-Pá 6-16 420 Kč, 16-24 490 Kč, víkend 420 Kč; zima 650-750 Kč.",
    courtCount: 3,
    courtTypes: ["indoor"],
    courtTypeLabel: "3 indoor courts",
    acceptsMultisport: true,
    bookingUrl: () => "https://padelneride.cz/rezervace/"
  },
  {
    slug: "padel-dzus",
    name: "Padel Džus",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-dzus.png"),
    address: "U Továren 999/31, 102 00 Praha 15-Hostivař",
    phone: "+420 602 605 905",
    priceInfo: "1 h: Po-Pá 7-16 650-800 Kč, 16-23 750-900 Kč; víkend 700-850 Kč.",
    courtCount: 4,
    courtTypes: ["indoor"],
    courtTypeLabel: "4 indoor courts",
    acceptsMultisport: true,
    bookingUrl: (date: string) => bookaballUrl(date)
  },
  {
    slug: "padel-powers-smichov",
    name: "Padel Powers Smíchov",
    sport: "padel",
    imageUrl: assetPath("clubs/padel-powers-smichov.png"),
    address: "Křížová 6, 150 00 Praha 5-Smíchov",
    phone: "+420 725 521 360",
    priceInfo: "1 h: Po-Pá 7-16 800 Kč, 16-00 900 Kč.",
    courtCount: 8,
    courtTypes: ["indoor"],
    courtTypeLabel: "8 indoor courts",
    acceptsMultisport: true,
    bookingUrl: () => padelosCompanyUrl()
  },
  {
    slug: "one-padel",
    name: "One Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/one-padel.png"),
    address: "Ringhofferova 115, 155 21 Praha 17-Zličín",
    phone: "Not published",
    priceInfo: "1 h: from 850 Kč.",
    courtCount: 9,
    courtTypes: ["indoor"],
    courtTypeLabel: "9 indoor courts",
    bookingUrl: () => "https://onepadel.cz/book"
  },
  {
    slug: "cisarska-louka-padel",
    name: "Císařská louka Padel",
    sport: "padel",
    imageUrl: assetPath("clubs/cisarska-louka-padel.png"),
    address: "Areál Císařská louka, Praha 5-Smíchov",
    phone: "+420 725 795 323",
    priceInfo: "1 h: Po-Pá 9-12 690 Kč, 12-16 790 Kč, 16-23 850 Kč; víkend 11-21:30 850 Kč.",
    courtCount: 3,
    courtTypes: ["outdoor"],
    courtTypeLabel: "3 outdoor courts",
    acceptsMultisport: true,
    bookingUrl: (date: string) => reenioBookingUrl(date)
  },
  {
    slug: "sk-satalice",
    name: "SK Satalice",
    sport: "padel",
    imageUrl: assetPath("clubs/sk-satalice.png"),
    address: "Budovatelská 12, 190 15 Praha-Satalice",
    phone: "+420 721 069 640",
    priceInfo: "1 h: Po-Pá 8-22 590 Kč; víkend 8-22 540 Kč.",
    courtCount: 2,
    courtTypes: ["outdoor"],
    courtTypeLabel: "2 outdoor courts",
    bookingUrl: (date: string) => rogerOnlineUrl(date)
  }
];

const FETCHABLE_CLUBS = CLUBS.filter((club) => club.availabilityEnabled !== false);
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

async function parseAvailabilityResponse(response: Response): Promise<AvailabilityResult & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(
    response.ok
      ? "Availability response was not JSON"
      : `Availability request failed with ${response.status} ${response.statusText || text.slice(0, 120)}`
  );
}

async function fetchAvailabilityRequest(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AVAILABILITY_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Availability request timed out after ${Math.round(AVAILABILITY_REQUEST_TIMEOUT_MS / 1000)}s`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function App() {
  const [page, setPage] = useState<Page>(initialPage);
  const [date, setDate] = useState(today);
  const [courtsNeeded, setCourtsNeeded] = useState(1);
  const [duration, setDuration] = useState(60);
  const [courtTypeFilter, setCourtTypeFilter] = useState<CourtTypeFilter>("all");
  const [customStartTime, setCustomStartTime] = useState<string | null>(null);
  const [customEndTime, setCustomEndTime] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [availabilityByClub, setAvailabilityByClub] = useState<AvailabilityByClub>({});
  const [selectedClubSlug, setSelectedClubSlug] = useState<string | null>(initialPage === "clubs" ? initialParams.get("club") : null);
  const [allClubsSort, setAllClubsSort] = useState<FindCourtSort>("name");
  const [findCourtSort, setFindCourtSort] = useState<FindCourtSort>("name");
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [isShortInfoMode, setIsShortInfoMode] = useState(initialShortInfoMode);
  const [expandedCompactClubSlugs, setExpandedCompactClubSlugs] = useState<Set<string>>(() => new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [failedClubs, setFailedClubs] = useState<FailedClub[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ completed: 0, total: 0 });
  const loadSequenceRef = useRef(0);
  const currentPragueDate = pragueDateInputValue(now);
  const trackedClubs = useMemo(() => sortTrackedClubs(buildTrackedClubs(CLUBS), allClubsSort), [allClubsSort]);

  async function loadAvailability() {
    const targetClubs = selectedClubSlug
      ? CLUBS.filter(
          (club) =>
            club.slug === selectedClubSlug &&
            club.availabilityEnabled !== false &&
            clubMatchesCourtType(club, courtTypeFilter)
        )
      : FETCHABLE_CLUBS.filter((club) => clubMatchesCourtType(club, courtTypeFilter));
    const loadId = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadId;

    setIsLoading(true);
    setAvailabilityByClub((currentAvailability) => {
      if (!selectedClubSlug) return {};
      const nextAvailability = { ...currentAvailability };
      delete nextAvailability[selectedClubSlug];
      return nextAvailability;
    });
    setFailedClubs([]);
    setLoadError(null);
    setLoadProgress({ completed: 0, total: targetClubs.length });

    if (targetClubs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      await Promise.all(
        targetClubs.map(async (club) => {
          const params = new URLSearchParams({ club: club.slug, sport: club.sport, date });
          try {
            const response = await fetchAvailabilityRequest(`${API_BASE_URL}/api/availability?${params}`);
            const payload = await parseAvailabilityResponse(response);

            if (!response.ok) {
              throw new Error(payload.error ?? `Failed to load ${club.name}`);
            }

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
                reason: error instanceof Error ? error.message : "Could not be checked"
              }
            ]);
          } finally {
            if (loadSequenceRef.current === loadId) {
              setLoadProgress((currentProgress) => ({
                ...currentProgress,
                completed: Math.min(currentProgress.completed + 1, currentProgress.total)
              }));
            }
          }
        })
      );
    } catch (loadError) {
      if (loadSequenceRef.current === loadId) {
        setLoadError(loadError instanceof Error ? loadError.message : "Failed to load availability");
      }
    } finally {
      if (loadSequenceRef.current === loadId) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (page !== "clubs") return;
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
    localStorage.setItem("mamekurt-results-view", isShortInfoMode ? "compact" : "cards");
  }, [isShortInfoMode]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [page, selectedClubSlug]);

  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const nextPage = pageFromParam(params.get("page"));
      setPage(nextPage);
      setDate(selectableDate(params.get("date"), pragueDateInputValue(new Date())));
      setSelectedClubSlug(nextPage === "clubs" ? params.get("club") : null);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const urlDate = new URLSearchParams(window.location.search).get("date");
    if (page === "clubs" && urlDate && urlDate < currentPragueDate) {
      writeUrl({ date: currentPragueDate, clubSlug: selectedClubSlug, mode: "replace" });
    }
  }, []);

  useEffect(() => {
    if (date >= currentPragueDate) return;

    setDate(currentPragueDate);
    if (page === "clubs") {
      writeUrl({ date: currentPragueDate, clubSlug: selectedClubSlug, mode: "replace" });
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

  const durationOptions = useMemo(() => {
    const firstAvailability = Object.values(availabilityByClub)[0];
    return buildDurationOptions(firstAvailability?.dayRange);
  }, [availabilityByClub]);
  const timeOptions = useMemo(() => buildTimeOptions(TIME_PICKER_RANGE), []);
  const timeWindow = useMemo<TimeRange>(
    () => ({
      start: customStartTime ?? TIME_PICKER_RANGE.start,
      end: customEndTime ?? TIME_PICKER_RANGE.end
    }),
    [customEndTime, customStartTime]
  );

  useEffect(() => {
    if (durationOptions.length > 0 && !durationOptions.includes(duration)) {
      setDuration(durationOptions[0] ?? 60);
    }
  }, [duration, durationOptions]);

  useEffect(() => {
    const maxCourtCount = Math.max(...Object.values(availabilityByClub).map((availability) => availability.courts.length), 2);
    if (courtsNeeded > maxCourtCount) {
      setCourtsNeeded(maxCourtCount);
    }
  }, [availabilityByClub, courtsNeeded]);

  useEffect(() => {
    if (timeOptions.length === 0) return;

    const firstTime = timeOptions[0];
    const lastTime = timeOptions[timeOptions.length - 1];
    const nextStart = customStartTime && timeOptions.includes(customStartTime) ? customStartTime : null;
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
  }, [customEndTime, customStartTime, timeOptions]);

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
    : Math.max(...Object.values(availabilityByClub).map((availability) => availability.courts.length), 2);
  const durationLabel = formatDuration(duration, selectedAvailability?.dayRange ?? Object.values(availabilityByClub)[0]?.dayRange);
  const startTimeOptions = timeOptions.filter((time) => time < timeWindow.end);
  const endTimeOptions = timeOptions.filter((time) => time > timeWindow.start);
  const visibleClubSlugs = useMemo(() => visibleClubResults.map((result) => result.club.slug), [visibleClubResults]);
  const areAllCompactRowsExpanded =
    visibleClubSlugs.length > 0 && visibleClubSlugs.every((clubSlug) => expandedCompactClubSlugs.has(clubSlug));
  const refreshAvailabilityButton = (
    <Button
      aria-label="Refresh availability"
      icon={<RefreshCw size={18} />}
      onClick={() => {
        posthog.capture("availability_refreshed", {
          court_type: courtTypeFilter,
          date,
          selected_club: selectedClubSlug !== null
        });
        void loadAvailability();
      }}
      size="icon"
      title="Refresh availability"
      variant="secondary"
      disabled={isLoading}
    />
  );
  const clubResultActions = (
    <div className="resultActions">
      <div className="resultSortControl">
        <Select
          aria-label="Sort matching clubs"
          className="resultSortSelect"
          value={findCourtSort}
          onChange={(event) => setFindCourtSort(event.target.value as FindCourtSort)}
        >
          <option value="name">Name</option>
          <option value="priceAsc">Lowest price</option>
          <option value="priceDesc">Highest price</option>
          <option value="multisport">Multisport</option>
          <option value="indoor">Indoor first</option>
          <option value="outdoor">Outdoor first</option>
        </Select>
      </div>
      {isShortInfoMode && visibleClubSlugs.length > 0 ? (
        <Button
          aria-label={areAllCompactRowsExpanded ? "Hide slots" : "Show slots"}
          icon={areAllCompactRowsExpanded ? <ChevronsDownUp size={18} /> : <ChevronsUpDown size={18} />}
          onClick={() =>
            setExpandedCompactClubSlugs(
              areAllCompactRowsExpanded ? new Set() : new Set(visibleClubSlugs)
            )
          }
          size="icon"
          title={areAllCompactRowsExpanded ? "Hide slots" : "Show slots"}
          variant="secondary"
        />
      ) : null}
      <Button
        aria-label={isShortInfoMode ? "Show club cards" : "Show compact club list"}
        icon={isShortInfoMode ? <LayoutGrid size={18} /> : <ListOrdered size={18} />}
        onClick={() => setIsShortInfoMode((currentMode) => !currentMode)}
        size="icon"
        title={isShortInfoMode ? "Show cards" : "Show compact list"}
        variant="secondary"
      />
      {refreshAvailabilityButton}
    </div>
  );

  return (
    <main className="appShell">
      <nav className="topbar" aria-label="Page navigation">
        <a className="brandMark" href={clubsHref(date)} onClick={(event) => handleInternalNavigation(event, () => navigateToClubs("push"))}>
          <img src={assetPath("logo.png")} alt="" />
          HLEDEJKURTY
        </a>
        {page !== "clubs" || selectedClub ? (
          <Breadcrumbs page={page} selectedClub={selectedClub} onHome={() => navigateToClubs("push")} />
        ) : (
          <span className="topbarSpacer" aria-hidden="true" />
        )}
        <div className={isMobileMenuOpen ? "topbarNav topbarNavOpen" : "topbarNav"} aria-label="Primary navigation">
          <a className={page === "clubs" ? "topbarNavLink active" : "topbarNavLink"} href={clubsHref(date)} onClick={(event) => handleInternalNavigation(event, () => navigateToClubs("push"))}>
            Find court
          </a>
          <a className={page === "allClubs" ? "topbarNavLink active" : "topbarNavLink"} href={allClubsHref()} onClick={(event) => handleInternalNavigation(event, () => navigateToAllClubs("push"))}>
            All clubs
          </a>
          <a className={page === "about" ? "topbarNavLink active" : "topbarNavLink"} href={aboutHref()} onClick={(event) => handleInternalNavigation(event, () => navigateToAbout("push"))}>
            About us
          </a>
        </div>
        <div className="topbarActions">
          <Button
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
            size="icon"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            variant="secondary"
          />
          <Button
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="mobileMenuButton"
            icon={<Menu size={18} />}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            size="icon"
            title={isMobileMenuOpen ? "Close menu" : "Open menu"}
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
        />
      ) : (
        <>
          <Card className="searchPanel">
        <div className="uiField searchField searchField-date">
          <span className="uiFieldLabel">
            <span className="uiFieldIcon">
              <CalendarDays size={16} />
            </span>
            Date
          </span>
          <DateCalendarPicker value={date} minDate={currentPragueDate} onChange={updateDate} />
        </div>
        <Field icon={<UsersRound size={16} />} label="Courts needed" className="searchField">
          <Select value={courtsNeeded} onChange={(event) => setCourtsNeeded(Number(event.target.value))}>
            {Array.from({ length: maxCourtCount }, (_, index) => index + 1).map((count) => (
              <option value={count} key={count}>
                {count} {count === 1 ? "court" : "courts"}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<SlidersHorizontal size={16} />} label="Duration" className="searchField">
          <Select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {durationOptions.map((minutes) => (
              <option value={minutes} key={minutes}>
                {formatDuration(minutes, selectedAvailability?.dayRange ?? Object.values(availabilityByClub)[0]?.dayRange)}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<CloudSun size={16} />} label="Court type" className="searchField searchField-courtType">
          <Select value={courtTypeFilter} onChange={(event) => setCourtTypeFilter(event.target.value as CourtTypeFilter)}>
            <option value="all">All courts</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </Select>
        </Field>
        <Field icon={<Timer size={16} />} label="Start time" className="searchField searchField-startTime">
          <Select value={timeWindow.start} onChange={(event) => updateStartTime(event.target.value)} disabled={timeOptions.length === 0}>
            {startTimeOptions.map((time) => (
              <option value={time} key={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
        <Field icon={<Timer size={16} />} label="End time" className="searchField searchField-endTime">
          <Select value={timeWindow.end} onChange={(event) => updateEndTime(event.target.value)} disabled={timeOptions.length === 0}>
            {endTimeOptions.map((time) => (
              <option value={time} key={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
          </Card>

          <section className="resultBar">
        <div>
          <Search size={18} />
          <strong>
            {selectedClub ? `${selectedSlots.length} bookable slots` : `${visibleClubResults.length} matching clubs`}
          </strong>
        </div>
        {selectedClub ? <div className="resultActions">{refreshAvailabilityButton}</div> : null}
          </section>

          {loadError ? <Alert icon={<AlertCircle size={18} />} title={loadError} /> : null}
          {!selectedClub && failedClubs.length > 0 ? <FailedClubAlert failedClubs={failedClubs} date={date} /> : null}

          {selectedClub && selectedAvailability ? (
            <ClubDetail
              club={selectedClub}
              availability={selectedAvailability}
              slots={selectedSlots}
              courtsNeeded={courtsNeeded}
              directBookingUrl={selectedClub.bookingUrl(selectedAvailability.date)}
            />
          ) : selectedClub && (isLoading || isSelectedClubSlotsLoading) ? (
            <ClubDetail
              club={selectedClub}
              slots={[]}
              courtsNeeded={courtsNeeded}
              directBookingUrl={selectedClub.bookingUrl(date)}
              slotsLoading
            />
          ) : selectedClub ? (
            <ClubDetail
              club={selectedClub}
              slots={[]}
              courtsNeeded={courtsNeeded}
              availabilityUnavailable
              unavailableReason={selectedClubFailure?.reason}
              directBookingUrl={selectedClub.bookingUrl(date)}
            />
          ) : (
            <ClubList
              results={visibleClubResults}
              isLoading={isLoading}
              loadProgress={loadProgress}
              actions={clubResultActions}
              compact={isShortInfoMode}
              expandedClubSlugs={expandedCompactClubSlugs}
              onExpandedClubSlugsChange={setExpandedCompactClubSlugs}
              onSelectClub={(club) => updateSelectedClub(club.slug)}
            />
          )}
        </>
      )}
      <SiteFooter
        currentPage={page}
        date={date}
        onNavigateToClubs={() => navigateToClubs("push")}
        onNavigateToAllClubs={() => navigateToAllClubs("push")}
        onNavigateToAbout={() => navigateToAbout("push")}
        onNavigateToLegalPage={(nextPage) => navigateToLegalPage(nextPage, "push")}
      />
    </main>
  );

  function updateDate(nextDate: string) {
    const nextSelectableDate = selectableDate(nextDate, currentPragueDate);
    setDate(nextSelectableDate);
    writeUrl({ date: nextSelectableDate, clubSlug: selectedClubSlug, mode: "replace" });
  }

  function updateStartTime(nextStartTime: string) {
    setCustomStartTime(nextStartTime);
    if (toComparableTime(nextStartTime) >= toComparableTime(timeWindow.end)) {
      setCustomEndTime(nextTimeOption(nextStartTime, timeOptions) ?? timeWindow.end);
    }
  }

  function updateEndTime(nextEndTime: string) {
    setCustomEndTime(nextEndTime);
    if (toComparableTime(nextEndTime) <= toComparableTime(timeWindow.start)) {
      setCustomStartTime(previousTimeOption(nextEndTime, timeOptions) ?? timeWindow.start);
    }
  }

  function updateSelectedClub(nextClubSlug: string | null) {
    if (nextClubSlug) {
      posthog.capture("club_selected", { club_slug: nextClubSlug });
    }
    setPage("clubs");
    setSelectedClubSlug(nextClubSlug);
    setFailedClubs([]);
    writeUrl({ date, clubSlug: nextClubSlug, mode: "push" });
    window.scrollTo({ top: 0 });
  }

  function navigateToClubs(mode: "push" | "replace") {
    setPage("clubs");
    setSelectedClubSlug(null);
    writeUrl({ date, clubSlug: null, mode });
    window.scrollTo({ top: 0 });
  }

  function navigateToAllClubs(mode: "push" | "replace") {
    setPage("allClubs");
    setSelectedClubSlug(null);
    writeUrl({ date, clubSlug: null, mode, page: "allClubs" });
    window.scrollTo({ top: 0 });
  }

  function navigateToAbout(mode: "push" | "replace") {
    setPage("about");
    setSelectedClubSlug(null);
    writeUrl({ date, clubSlug: null, mode, page: "about" });
    window.scrollTo({ top: 0 });
  }

  function navigateToLegalPage(nextPage: "privacy" | "terms" | "cookies", mode: "push" | "replace") {
    setPage(nextPage);
    setSelectedClubSlug(null);
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
  return (
    <ol className="breadcrumbs">
      <li>
        <button type="button" onClick={onHome}>
          Clubs
        </button>
      </li>
      {selectedClub ? (
        <li aria-current="page">
          <span>{selectedClub.name}</span>
        </li>
      ) : null}
      {page === "about" ? (
        <li aria-current="page">
          <span>About us</span>
        </li>
      ) : null}
      {page === "privacy" ? (
        <li aria-current="page">
          <span>Privacy Policy</span>
        </li>
      ) : null}
      {page === "terms" ? (
        <li aria-current="page">
          <span>Terms of Use</span>
        </li>
      ) : null}
      {page === "cookies" ? (
        <li aria-current="page">
          <span>Cookie Policy</span>
        </li>
      ) : null}
      {page === "allClubs" ? (
        <li aria-current="page">
          <span>All clubs</span>
        </li>
      ) : null}
    </ol>
  );
}

function SiteFooter({
  currentPage,
  date,
  onNavigateToClubs,
  onNavigateToAllClubs,
  onNavigateToAbout,
  onNavigateToLegalPage
}: {
  currentPage: Page;
  date: string;
  onNavigateToClubs: () => void;
  onNavigateToAllClubs: () => void;
  onNavigateToAbout: () => void;
  onNavigateToLegalPage: (page: "privacy" | "terms" | "cookies") => void;
}) {
  return (
    <footer className="siteFooter">
      <div className="footerBrand">
        <a className="footerLogo" href={clubsHref(date)} onClick={(event) => handleInternalNavigation(event, onNavigateToClubs)}>
          <img src={assetPath("logo.png")} alt="" />
          <span>HLEDEJKURTY</span>
        </a>
        <p>Independent padel court availability finder for Prague, Czech Republic.</p>
      </div>

      <nav className="footerNav" aria-label="Footer navigation">
        <div>
          <h2>Service</h2>
          <a href={clubsHref(date)} aria-current={currentPage === "clubs" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToClubs)}>
            Find court
          </a>
          <a href={allClubsHref()} aria-current={currentPage === "allClubs" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToAllClubs)}>
            All clubs
          </a>
          <a href={aboutHref()} aria-current={currentPage === "about" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, onNavigateToAbout)}>
            About us
          </a>
        </div>
        <div>
          <h2>Legal</h2>
          <a href={legalHref("privacy")} aria-current={currentPage === "privacy" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("privacy"))}>
            Privacy Policy
          </a>
          <a href={legalHref("terms")} aria-current={currentPage === "terms" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("terms"))}>
            Terms of Use
          </a>
          <a href={legalHref("cookies")} aria-current={currentPage === "cookies" ? "page" : undefined} onClick={(event) => handleInternalNavigation(event, () => onNavigateToLegalPage("cookies"))}>
            Cookie Policy
          </a>
        </div>
      </nav>

      <div className="footerMeta">
        <a href="mailto:dmytrozhyrov@gmail.com">dmytrozhyrov@gmail.com</a>
        <span>Availability and prices are informational.</span>
        <span>Book only through each club's official booking system.</span>
      </div>
    </footer>
  );
}

function AllClubsPage({
  clubs,
  sort,
  onSortChange,
  onSelectClub
}: {
  clubs: TrackedClub[];
  sort: FindCourtSort;
  onSortChange: (sort: FindCourtSort) => void;
  onSelectClub: (club: Club) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleClubs = normalizedSearchQuery
    ? clubs.filter(({ club }) => normalizeSearchText(club.name).includes(normalizedSearchQuery))
    : clubs;

  return (
    <section className="allClubsPage" aria-labelledby="all-clubs-title">
      <div className="pageHeader">
        <div>
          <Badge tone="green">
            {visibleClubs.length === clubs.length ? `${clubs.length} clubs tracked` : `${visibleClubs.length}/${clubs.length} clubs`}
          </Badge>
          <h1 id="all-clubs-title">All clubs</h1>
        </div>
        <div className="pageHeaderControls">
          <Field icon={<Search size={16} />} label="Search" className="allClubsSearchField">
            <Input
              aria-label="Search clubs by name"
              placeholder="Club name"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          <div className="resultSortControl">
            <Select
              aria-label="Sort clubs"
              className="resultSortSelect"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as FindCourtSort)}
            >
              <option value="name">Name</option>
              <option value="priceAsc">Lowest price</option>
              <option value="priceDesc">Highest price</option>
              <option value="multisport">Multisport</option>
              <option value="indoor">Indoor first</option>
              <option value="outdoor">Outdoor first</option>
            </Select>
          </div>
          <Button
            aria-label={isCompactMode ? "Show club cards" : "Show compact club list"}
            className="allClubsViewButton"
            icon={isCompactMode ? <LayoutGrid size={18} /> : <ListOrdered size={18} />}
            onClick={() => setIsCompactMode((currentMode) => !currentMode)}
            size="icon"
            title={isCompactMode ? "Show cards" : "Show compact list"}
            variant="secondary"
          />
        </div>
      </div>

      <section className={isCompactMode ? "trackedClubList trackedClubList-compact" : "trackedClubList"} aria-label="Tracked clubs">
        {visibleClubs.length > 0 ? (
          visibleClubs.map(({ club, priceFrom }) => (
          <Card className={isCompactMode ? "trackedClubCard trackedClubCard-compact" : "trackedClubCard"} interactive key={club.slug}>
            <button className="trackedClubSelect" type="button" onClick={() => onSelectClub(club)}>
              <img src={club.imageUrl} alt={`${club.name} padel courts`} />
              <div className="trackedClubBody">
                <div>
                  <h2>{club.name}</h2>
                  <p>
                    {club.courtCount} {club.courtCount === 1 ? "court" : "courts"}
                  </p>
                </div>
                <div className="trackedClubBadges">
                  {club.acceptsMultisport ? (
                    <span className="multisportBadge">Multisport</span>
                  ) : null}
                  <CourtTypeBadges courtTypes={club.courtTypes} />
                  <span className="trackedClubPrice">
                    from <strong>{formatCzkPerHour(priceFrom)}</strong>
                  </span>
                </div>
              </div>
            </button>
            <a className="addressLink" href={googleMapsUrl(club.address)} target="_blank" rel="noreferrer">
              <MapPin size={15} />
              <span>{club.address}</span>
            </a>
          </Card>
          ))
        ) : (
          <EmptyState title="No clubs found">Try another club name.</EmptyState>
        )}
      </section>
    </section>
  );
}

function AboutPage({ onBrowseClubs }: { onBrowseClubs: () => void }) {
  return (
    <section className="aboutPage" aria-labelledby="about-title">
      <div className="aboutHero">
        <Badge tone="green">About us</Badge>
        <h1 id="about-title">Find a free padel court without opening every booking system.</h1>
        <p>
          HLEDEJKURTY gathers available padel slots from club booking systems around Prague and shows the clubs that match your
          date, duration, court count, time window, and indoor/outdoor preference.
        </p>
        <Button icon={<SearchCheck size={17} />} onClick={onBrowseClubs}>
          Find Court
        </Button>
      </div>

      <div className="aboutGrid">
        <Card className="aboutCard">
          <SearchCheck size={22} />
          <h2>One search</h2>
          <p>Instead of checking many calendars manually, filter once and see which clubs currently have matching slots.</p>
        </Card>
        <Card className="aboutCard">
          <Link2 size={22} />
          <h2>Book at the club</h2>
          <p>When you find a suitable slot, the Book action opens the official booking system for that club.</p>
        </Card>
        <Card className="aboutCard">
          <ShieldCheck size={22} />
          <h2>Transparent limits</h2>
          <p>Availability and prices are informational. The club booking page is always the final source before reservation.</p>
        </Card>
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <LegalPage
      badgeIcon={<ShieldCheck size={16} />}
      badgeText="Legal"
      title="Privacy Policy"
      intro="This policy explains what data HLEDEJKURTY uses while helping visitors find padel court availability in Prague."
    >
      <LegalSection title="Who operates this service">
        <p>
          Contact: <a href="mailto:dmytrozhyrov@gmail.com">dmytrozhyrov@gmail.com</a>.
        </p>
      </LegalSection>
      <LegalSection title="What we process">
        <p>
          The app does not create user accounts, take payments, or accept bookings. Your selected date, duration, court count,
          court type, and time window are used to request availability. The theme preference is stored in your browser as
          local storage under <code>mamekurt-theme</code>.
        </p>
        <p>
          Hosting and API infrastructure may process standard technical logs such as IP address, request URL, browser user agent,
          timestamps, and error diagnostics for security and operation.
        </p>
      </LegalSection>
      <LegalSection title="Why we process it">
        <p>
          Data is used to provide the search feature, keep the app secure, diagnose errors, and remember basic interface
          preferences. Club booking pages opened from this app are external services with their own privacy rules.
        </p>
      </LegalSection>
      <LegalSection title="Retention and rights">
        <p>
          The app itself does not store visitor profiles. Technical logs, if enabled by hosting infrastructure, should be kept
          only for a limited operational period. Visitors in the EU can request access, correction, deletion, restriction, or
          objection under GDPR once the production operator contact is published.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

function TermsPage() {
  return (
    <LegalPage
      badgeIcon={<Scale size={16} />}
      badgeText="Terms"
      title="Terms of Use"
      intro="These terms describe how to use HLEDEJKURTY and what limits apply to the availability information shown here."
    >
      <LegalSection title="Service scope">
        <p>
          HLEDEJKURTY aggregates publicly reachable or operator-authorized padel court availability from third-party booking
          systems. It helps you discover possible time slots, but it does not sell, reserve, or confirm court bookings.
        </p>
      </LegalSection>
      <LegalSection title="Availability and prices">
        <p>
          Availability, prices, court types, phone numbers, and Multisport labels are informational and may be delayed or
          incomplete. The official club booking system is always the final source before you reserve or pay.
        </p>
      </LegalSection>
      <LegalSection title="External booking systems">
        <p>
          Booking buttons and club links open third-party websites. Their terms, privacy policies, booking rules, cancellation
          rules, and payment flows apply separately.
        </p>
      </LegalSection>
      <LegalSection title="Fair use">
        <p>
          Do not use the service to overload booking systems, automate abusive traffic, bypass access controls, or copy data for
          a competing service without permission.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

function CookiePolicyPage() {
  return (
    <LegalPage
      badgeIcon={<Cookie size={16} />}
      badgeText="Cookies"
      title="Cookie Policy"
      intro="This page explains browser storage used by HLEDEJKURTY."
    >
      <LegalSection title="Current cookie use">
        <p>
          HLEDEJKURTY currently does not set analytics, advertising, or marketing cookies. The app stores only your theme choice
          in browser local storage so dark mode or light mode persists across visits.
        </p>
      </LegalSection>
      <LegalSection title="Strictly necessary storage">
        <p>
          The theme preference is functional storage and is not used to track you across websites. You can clear it at any time
          from your browser settings.
        </p>
      </LegalSection>
      <LegalSection title="Third-party websites">
        <p>
          When you open a club booking system, that external website may use its own cookies or similar technologies. Check the
          club or booking provider's cookie information before booking there.
        </p>
      </LegalSection>
      <LegalSection title="Future changes">
        <p>
          If analytics, advertising, or other non-essential cookies are added later, the app should request consent before those
          cookies are used.
        </p>
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
  return (
    <section className="legalPage" aria-labelledby="legal-title">
      <div className="legalHero">
        <Badge tone="blue" className="legalBadge">
          {badgeIcon}
          {badgeText}
        </Badge>
        <h1 id="legal-title">{title}</h1>
        <p>{intro}</p>
        <span>Last updated: August 5, 2026</span>
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

function FailedClubAlert({ failedClubs, date, title }: { failedClubs: FailedClub[]; date: string; title?: string }) {
  return (
    <Alert aria-label="Unchecked clubs" icon={<AlertCircle size={18} />} title={title ?? `${failedClubs.length} clubs were not checked`}>
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
  actions,
  compact,
  expandedClubSlugs,
  onExpandedClubSlugsChange,
  onSelectClub
}: {
  results: Array<{ club: Club; availability?: AvailabilityResult; bookableSlots: BookableSlot[] }>;
  isLoading: boolean;
  loadProgress: { completed: number; total: number };
  actions: React.ReactNode;
  compact: boolean;
  expandedClubSlugs: Set<string>;
  onExpandedClubSlugsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSelectClub: (club: Club) => void;
}) {
  const resultsToolbar = (
    <div className="clubResultsToolbar">
      <LoadProgressBadge isLoading={isLoading} loadProgress={loadProgress} />
      {actions}
    </div>
  );

  if (isLoading && results.length === 0) {
    return (
      <section className={compact ? "clubCompactList" : "clubGrid"} aria-label="Loading clubs">
        {resultsToolbar}
        {Array.from({ length: 6 }, (_, index) => (
          compact ? (
            <Card className="clubCompactRow loadingCard" key={index}>
              <Skeleton className="lineSkeleton wide" />
              <Skeleton className="lineSkeleton" />
            </Card>
          ) : (
            <Card className="clubCard loadingCard" key={index}>
              <Skeleton className="imageSkeleton" />
              <div className="clubBody">
                <Skeleton className="lineSkeleton wide" />
                <Skeleton className="lineSkeleton" />
                <Skeleton className="lineSkeleton short" />
              </div>
            </Card>
          )
        ))}
      </section>
    );
  }

  if (compact) {
    return (
      <section className="clubCompactList" aria-label="Matching clubs">
        {resultsToolbar}
        {results.length > 0 ? (
          results.map(({ club, availability, bookableSlots }) => {
            const isExpanded = expandedClubSlugs.has(club.slug);
            const toggleExpanded = () => {
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
                  <span>{bookableSlots.length} slots</span>
                </div>
                <div className="clubCompactToggle">
                  <div className="clubCompactMeta">
                    <span className="trackedClubPrice">
                      from <strong>{formatCzkPerHour(lowestPrice(club.priceInfo))}</strong>
                    </span>
                    {club.acceptsMultisport ? <span className="multisportBadge">Multisport</span> : null}
                    <CourtTypeBadges courtTypes={club.courtTypes} />
                    <span className="clubMeta">
                      <Clock3 size={15} />
                      {availability?.dayRange.start}-{availability?.dayRange.end}
                    </span>
                    <FreshnessBadge availability={availability} />
                  </div>
                  <ChevronDown className="clubCompactChevron" size={18} />
                </div>
              </div>
              {isExpanded ? (
                <div className="clubCompactSlots">
                  {bookableSlots.map((slot) => (
                    <a
                      className="clubCompactSlot"
                      href={slot.bookingUrl ?? club.bookingUrl(availability?.date ?? today)}
                      key={`${club.slug}-${slot.start}-${slot.end}-${slot.courts.join("-")}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => captureBookingSystemOpened(club, "matching_slot", availability?.date ?? today, slot)}
                    >
                      <strong>
                        {slot.start} - {slot.end}
                      </strong>
                      <span>{slot.courts.join(" + ")}</span>
                      <small>
                        Book
                        <ExternalLink size={13} />
                      </small>
                    </a>
                  ))}
                </div>
              ) : null}
              </Card>
            );
          })
        ) : (
          <EmptyState title="No matching clubs">
            Try a shorter duration, fewer courts, or another day.
          </EmptyState>
        )}
      </section>
    );
  }

  return (
    <section className="clubGrid" aria-label="Matching clubs">
      {resultsToolbar}
      {results.length > 0 ? (
        results.map(({ club, availability, bookableSlots }) => (
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
              <img src={club.imageUrl} alt={`${club.name} padel courts`} />
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
                    </h2>
                    <p>{bookableSlots.length} matching slots</p>
                  </div>
                </div>
                <div className="clubCardMetaRow">
                  <span className="trackedClubPrice">
                    from <strong>{formatCzkPerHour(lowestPrice(club.priceInfo))}</strong>
                  </span>
                  {club.acceptsMultisport ? <span className="multisportBadge">Multisport</span> : null}
                </div>
                <span className="clubMeta">
                  <Clock3 size={15} />
                  {availability?.dayRange.start}-{availability?.dayRange.end}
                </span>
                <FreshnessBadge availability={availability} />
                <CourtTypeBadges courtTypes={club.courtTypes} />
              </div>
            </div>
            <a className="addressLink" href={googleMapsUrl(club.address)} target="_blank" rel="noreferrer">
              <MapPin size={15} />
              <span>{club.address}</span>
            </a>
          </Card>
        ))
      ) : (
        <EmptyState title="No matching clubs">
          Try a shorter duration, fewer courts, or another day.
        </EmptyState>
      )}
    </section>
  );
}

function LoadProgressBadge({
  isLoading,
  loadProgress
}: {
  isLoading: boolean;
  loadProgress: { completed: number; total: number };
}) {
  if (loadProgress.total === 0) {
    return null;
  }

  return (
    <span className={isLoading ? "loadProgressBadge loadProgressBadge-loading" : "loadProgressBadge"}>
      {isLoading ? <span className="loadProgressSpinner" aria-hidden="true" /> : null}
      {loadProgress.completed}/{loadProgress.total} <span className="loadProgressLabel">checked</span>
    </span>
  );
}

function DateCalendarPicker({
  value,
  minDate,
  onChange
}: {
  value: string;
  minDate: string;
  onChange: (date: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthInputValue(value));
  const pickerRef = useRef<HTMLDivElement>(null);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const previousMonth = addMonthsToMonthInput(visibleMonth, -1);
  const nextMonth = addMonthsToMonthInput(visibleMonth, 1);
  const isPreviousMonthDisabled = monthEndDate(previousMonth) < minDate;

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
        <span>{formatSelectedDateLabel(value, minDate)}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="datePickerPopover" role="dialog" aria-label="Choose date">
          <div className="datePickerHeader">
            <button
              aria-label="Previous month"
              className="datePickerNavButton"
              disabled={isPreviousMonthDisabled}
              type="button"
              onClick={() => setVisibleMonth(previousMonth)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{formatMonthLabel(visibleMonth)}</strong>
            <button
              aria-label="Next month"
              className="datePickerNavButton"
              type="button"
              onClick={() => setVisibleMonth(nextMonth)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="datePickerWeekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((weekday) => (
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
                  disabled={day < minDate}
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
  return (
    <div className="courtTypeBadges" aria-label="Court types">
      {courtTypes.map((courtType) => (
        <span className={`courtTypeBadge courtTypeBadge-${courtType}`} key={courtType}>
          {courtType === "indoor" ? "Indoor" : "Outdoor"}
        </span>
      ))}
    </div>
  );
}

function PhoneInfoRow({ phone }: { phone: string }) {
  const href = phoneHref(phone);

  if (!href) {
    return (
      <span className="detailInfoRow">
        <Phone size={16} />
        <span>{phone}</span>
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
  directBookingUrl
}: {
  club: Club;
  availability?: AvailabilityResult;
  slots: BookableSlot[];
  courtsNeeded: number;
  slotsLoading?: boolean;
  availabilityUnavailable?: boolean;
  unavailableReason?: string;
  directBookingUrl?: string;
}) {
  return (
    <>
      <Card className="clubDetail">
        <img src={club.imageUrl} alt={`${club.name} padel courts`} />
        <div className="clubDetailBody">
          <div>
            <h2>{club.name}</h2>
            <a className="detailAddress" href={googleMapsUrl(club.address)} target="_blank" rel="noreferrer">
              <MapPin size={16} />
              {club.address}
            </a>
            <div className="detailInfoList">
              <span className="detailInfoRow">
                <CloudSun size={16} />
                <span>{club.courtTypeLabel}</span>
              </span>
              {club.acceptsMultisport ? (
                <span className="detailInfoRow">
                  <WalletCards size={16} />
                  <span className="multisportBadge">Multisport</span>
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
                  <span>Open booking system</span>
                </a>
              ) : null}
              <FreshnessBadge availability={availability} />
              <span className="detailInfoRow priceInfoRow">
                <WalletCards size={16} />
                <span>{renderPriceInfo(club.priceInfo)}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="slotPanel">
        <div className="panelHeader">
          <div>
            <Badge tone="green">{slots.length} slots</Badge>
            <h2>Available times</h2>
          </div>
          <ExternalLink size={18} />
        </div>
        {slotsLoading ? (
          <SlotListSkeleton />
        ) : slots.length > 0 ? (
          <div className="slotList">
            {slots.map((slot) => (
              <a
                className="slot"
                href={slot.bookingUrl}
                key={`${slot.start}-${slot.end}-${slot.courts.join("-")}`}
                target="_blank"
                rel="noreferrer"
                title="Open booking system"
                onClick={() => captureBookingSystemOpened(club, "club_detail_slot", availability?.date ?? today, slot)}
              >
                <div>
                  <strong>
                    {slot.start} - {slot.end}
                  </strong>
                  <span>{slot.courts.slice(0, courtsNeeded).join(" + ")}</span>
                </div>
                <small>
                  Book
                  <ExternalLink size={13} />
                </small>
              </a>
            ))}
          </div>
        ) : availabilityUnavailable ? (
          <div className="availabilityWarning" role="status">
            <TriangleAlert size={22} />
            <div>
              <strong>Court availability is not loaded</strong>
              <p>
                {unavailableReason ?? "We could not check free slots for this club right now."} Open the official booking system to
                check and book directly.
              </p>
              {directBookingUrl ? (
                <a
                  href={directBookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => captureBookingSystemOpened(club, "availability_unavailable", availability?.date ?? today)}
                >
                  Open booking system
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState title="No slots for this club">
            Change the filters or go back to see other matching clubs.
          </EmptyState>
        )}
      </Card>
    </>
  );
}

function SlotListSkeleton() {
  return (
    <div className="slotList" aria-label="Loading available times">
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
  return (
    <>
      <Card className="clubDetail detailSkeleton" aria-label="Loading club availability">
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
  if (!availability) {
    return null;
  }

  const state = availability.cache?.state;
  const isStale = state === "stale";
  const checkedAt = availability.cache?.cachedAt ?? availability.fetchedAt;

  return (
    <span className={isStale ? "freshnessBadge freshnessBadge-stale" : "freshnessBadge"}>
      {isStale ? <TriangleAlert size={14} /> : <SearchCheck size={14} />}
      {isStale ? "Stale" : "Checked"} {formatCheckedTime(checkedAt)}
    </span>
  );
}

function captureBookingSystemOpened(club: Club, source: string, date: string, slot?: BookableSlot) {
  posthog.capture("booking_system_opened", {
    club_slug: club.slug,
    date,
    source,
    ...(slot ? { court_count: slot.courts.length, slot_end: slot.end, slot_start: slot.start } : {})
  });
}

function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function phoneHref(phone: string): string {
  const value = phone.replace(/[^\d+]/g, "");
  return /\d/.test(value) ? value : "";
}

function clubMatchesCourtType(club: Club, courtTypeFilter: CourtTypeFilter): boolean {
  return courtTypeFilter === "all" || club.courtTypes.includes(courtTypeFilter);
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
  return Number.isFinite(price) ? `${price} Kč` : "Price unknown";
}

function formatCzkPerHour(price: number): string {
  return Number.isFinite(price) ? `${price} Kč/h` : "Price unknown";
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

function clubsHref(date: string): string {
  const params = new URLSearchParams({ date });
  return `?${params.toString()}`;
}

function allClubsHref(): string {
  return "?page=all-clubs";
}

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function aboutHref(): string {
  return "?page=about";
}

function legalHref(page: "privacy" | "terms" | "cookies"): string {
  return `?page=${pageToParam(page)}`;
}

function pageFromParam(page: string | null): Page {
  if (page === "about") return "about";
  if (page === "all-clubs" || page === "courts") return "allClubs";
  if (page === "privacy" || page === "privacy-policy") return "privacy";
  if (page === "terms" || page === "terms-of-use") return "terms";
  if (page === "cookies" || page === "cookie-policy") return "cookies";
  return "clubs";
}

function pageToParam(page: Page): string {
  if (page === "allClubs") return "all-clubs";
  if (page === "privacy") return "privacy-policy";
  if (page === "terms") return "terms-of-use";
  if (page === "cookies") return "cookie-policy";
  return page;
}

function selectableDate(date: string | null | undefined, currentDate: string): string {
  if (!date || date < currentDate) return currentDate;
  return date;
}

function formatSelectedDateLabel(date: string, currentDate: string): string {
  if (date === currentDate) {
    return `Today, ${formatDateLabel(date)}`;
  }

  if (date === addDaysToDateInput(currentDate, 1)) {
    return `Tomorrow, ${formatDateLabel(date)}`;
  }

  return formatDateLabel(date);
}

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Prague",
    weekday: "short"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
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
  if (page !== "clubs") {
    params.set("page", pageToParam(page));
  } else {
    params.set("date", date);
    if (clubSlug) params.set("club", clubSlug);
  }
  window.history[mode === "push" ? "pushState" : "replaceState"](null, "", `?${params.toString()}`);
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

function formatCheckedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
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
