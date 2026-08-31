import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export type LanguageCode = "ua" | "en" | "cz";

export const LANGUAGE_STORAGE_KEY = "mamekurt-language";

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "ua", label: "UA" },
  { code: "en", label: "EN" },
  { code: "cz", label: "CZ" }
];

const initialLanguage = initializeLanguageRoute();

export function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "ua" || value === "en" || value === "cz";
}

export function languageFromPathname(pathname: string): LanguageCode {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (firstSegment === "en") return "en";
  if (firstSegment === "ua") return "ua";
  return "cz";
}

export function pathnameForLanguage(pathname: string, language: LanguageCode): string {
  const hasTrailingSlash = pathname.endsWith("/");
  const segments = pathname.split("/").filter(Boolean);
  if (["en", "ua"].includes(segments[0]?.toLowerCase())) segments.shift();
  const prefix = language === "en" ? ["en"] : language === "ua" ? ["ua"] : [];
  const localizedSegments = [...prefix, ...segments];
  if (localizedSegments.length === 0) return "/";
  return `/${localizedSegments.join("/")}${hasTrailingSlash ? "/" : ""}`;
}

function initializeLanguageRoute(): LanguageCode {
  if (typeof window === "undefined") return "cz";
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const hasExplicitLanguage = firstSegment === "en" || firstSegment === "ua";
  const preferredLanguage = isLanguageCode(storedLanguage) ? storedLanguage : "cz";
  const routeLanguage = hasExplicitLanguage ? languageFromPathname(window.location.pathname) : preferredLanguage;
  const shouldApplySavedPreference = !hasExplicitLanguage && preferredLanguage !== "cz";

  if (shouldApplySavedPreference) {
    const pathname = pathnameForLanguage(window.location.pathname, routeLanguage);
    window.history.replaceState(null, "", `${pathname}${window.location.search}${window.location.hash}`);
  }

  return routeLanguage;
}

export const resources = {
  en: {
    translation: {
      actions: {
        book: "Book",
        closeMenu: "Close menu",
        darkMode: "Dark mode",
        findCourt: "Find Court",
        hideSlots: "Hide slots",
        language: "Language",
        lightMode: "Light mode",
        openBookingSystem: "Open booking system",
        openMenu: "Open menu",
        refreshAvailability: "Refresh availability",
        share: "Share",
        showCards: "Show cards",
        showClubCards: "Show club cards",
        showCompactList: "Show compact list",
        showSlots: "Show slots",
        switchToDarkMode: "Switch to dark mode",
        switchToLightMode: "Switch to light mode",
        searchAvailability: "Search"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      consent: {
        accept: "Accept",
        body: "We use optional analytics to understand which features are useful. It stays off unless you accept.",
        learnMore: "Cookie policy",
        reject: "Reject",
        settings: "Cookie settings",
        title: "Help us improve"
      },
      allClubs: {
        emptyBody: "Try another club name.",
        emptyTitle: "No clubs found",
        searchAria: "Search clubs by name",
        searchLabel: "Search",
        searchPlaceholder: "Club name",
        listed_one: "{{count}} club listed",
        listed_other: "{{count}} clubs listed",
        tracked_one: "{{count}} club tracked",
        tracked_other: "{{count}} clubs tracked"
      },
      about: {
        body: "HLEDEJKURTY regularly gathers padel availability from supported club booking systems around Prague. Search the latest saved results for today and the next seven days by date, duration, court count, time window, and indoor/outdoor preference.",
        cardBookBody: "When you find a suitable slot, the Book action opens the official booking system for that club.",
        cardBookTitle: "Book at the club",
        cardLimitsBody: "Availability and prices are informational. The club booking page is always the final source before reservation.",
        cardLimitsTitle: "Transparent limits",
        cardSearchBody: "Instead of checking many calendars manually, search the latest collected availability and see which clubs have matching slots.",
        cardSearchTitle: "One search",
        faq: {
          accuracy: {
            answer: "Availability can change quickly because reservations happen in each club's own booking system. Use HLEDEJKURTY to find likely free slots, then confirm the final time and price on the official club page.",
            question: "How accurate is the availability?"
          },
          availability: {
            answer: "The app searches the latest availability collected from supported clubs for today and the next seven days, using the date, duration, number of courts, court type, and time window you choose.",
            question: "How does the search work?"
          },
          updates: {
            answer: "Availability for today and the next seven days is refreshed automatically about every 20 minutes between 08:00 and 22:00 Prague time. Individual results show their last check time, while the status beside the checked-club count shows an approximate countdown to the next regular cycle. You can also request a fresh check manually, and the displayed results update automatically when it finishes.",
            question: "How often is availability updated?"
          },
          booking: {
            answer: "No. HLEDEJKURTY does not take payments or reservations. The booking button always sends you to the official booking system for the selected club.",
            question: "Can I book directly here?"
          },
          multisport: {
            answer: "When a club publishes Multisport support, we show it as a label. Always confirm current payment rules with the club before booking.",
            question: "Do you show Multisport support?"
          },
          trackedClubs: {
            answer: "Right now we can check reservations for these 10 clubs: Padel Prosek, Padel Club Spoje, Tenis & Padel klub Písečná, SK Slavia Praha Padel, Padel Neride, Padel Džus, Padel Powers Smíchov, One Padel, Císařská louka Padel, and SK Satalice. You can find the full padel club directory on the All clubs page.",
            question: "Which clubs are tracked?"
          }
        },
        faqTitle: "Frequently asked questions",
        title: "Find a free padel court without opening every booking system."
      },
      availability: {
        checked: "Checked",
        checkedClubsTitle: "Checked clubs",
        checkedCount: "checked",
        failedJson: "Availability response was not JSON",
        failedLoad: "Failed to load availability",
        noCheckedClubs: "No clubs checked yet",
        nextCheck: "Next in ~{{duration}}",
        nextCheckTooltip: "Availability for all tracked dates is checked about every 20 minutes. Next check in ~{{duration}}. Use the refresh button to request fresh data.",
        notLoaded: "Court availability is not loaded",
        recent: "recently",
        refreshAlreadyQueued: "A fresh availability check is already queued or running.",
        refreshComplete: "Fresh availability is ready and the results were updated automatically.",
        refreshDelayed: "The fresh check is taking longer than expected. Please try Search again later.",
        refreshFailed: "Could not request a fresh availability check.",
        refreshQueued: "Fresh availability was requested. New data will be saved after the background check finishes.",
        refreshWaiting: "Refreshing availability in the background. Results will update automatically when it finishes.",
        stale: "Stale",
        suggestion: "Try refreshing the page or selecting a different timeframe.",
        timeout: "Availability request timed out after {{seconds}}s",
        uncheckedClubs_one: "{{count}} club was not checked",
        uncheckedClubs_other: "{{count}} clubs were not checked",
        unknownCheckFailure: "Could not be checked",
        unavailableReason: "We could not check free slots for this club right now.",
        unavailableSuffix: "Open the official booking system to check and book directly."
      },
      club: {
        allCourts: "All courts",
        court_one: "court",
        court_other: "courts",
        courtType: "Court type",
        courtTypes: "Court types",
        daily: "Daily",
        distanceFromYou: "{{distance}} km from you",
        distanceStraightLine: "Approximate straight-line distance",
        providerCourtPrefix: "Court",
        date: "Date",
        duration: "Duration",
        endTime: "End time",
        from: "from",
        indoor: "Indoor",
        matchingClubs_one: "{{count}} matching club",
        matchingClubs_other: "{{count}} matching clubs",
        matchingSlots_one: "{{count}} matching slot",
        matchingSlots_other: "{{count}} matching slots",
        multisport: "Multisport",
        noMultisport: "No Multisport",
        noMatchingBody: "Try a shorter duration, fewer courts, or another day.",
        noMatchingTitle: "No matching clubs",
        noSlotsBody: "Change the filters or go back to see other matching clubs.",
        noSlotsTitle: "No slots for this club",
        notPublished: "Not published",
        openingHours: "Working hours",
        outdoor: "Outdoor",
        priceUnknown: "Price unknown",
        slots_one: "{{count}} slot",
        slots_other: "{{count}} slots",
        startTime: "Start time",
        needed: "Courts needed",
        availableTimes: "Available times"
      },
      date: {
        chooseDate: "Choose date",
        nextMonth: "Next month",
        previousMonth: "Previous month",
        today: "Today, {{date}}",
        tomorrow: "Tomorrow, {{date}}",
        weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      },
      footer: {
        availabilityNotice: "Availability and prices are informational.",
        bookingNotice: "Book only through each club's official booking system.",
        description: "Independent padel court availability finder for Prague, Czech Republic.",
        legal: "Legal",
        service: "Service"
      },
      home: {
        allClubsCta: "Browse all tracked clubs",
        featureBookingBody: "Open the official booking system only after you find a club that matches your search.",
        featureBookingTitle: "Book at the club",
        featureCourtBody: "Filter by indoor or outdoor padel courts, court count, duration, price, and Multisport support.",
        featureCourtTitle: "Compare useful details",
        featureTimeBody: "Pick today, tomorrow, or another date before checking availability, so the app only asks clubs when you are ready.",
        featureTimeTitle: "Choose the right date first",
        featuredClubsBody: "The full club list includes addresses, prices, court types, Multisport labels, and direct booking links.",
        featuredClubsTitle: "Popular tracked padel clubs in Prague",
        intro: "Choose a date, duration, number of courts, court type, and time window, then search real-time padel court availability around Prague.",
        landingBody: "HLEDEJKURTY helps you find free padel courts in Prague without opening every booking system manually. Search by date, start time, duration, number of courts, indoor or outdoor courts, prices, Multisport support, and official booking links.",
        landingTitle: "Search padel court availability",
        multisportClubs_one: "{{count}} Multisport club",
        multisportClubs_other: "{{count}} Multisport clubs",
        multisportHelp: "Easy to spot before booking",
        statsLabel: "Tracked padel court statistics",
        title: "Find free padel courts in Prague",
        trackedClubsHelp: "Across Prague and nearby areas",
        trackedCourts_one: "{{count}} padel court",
        trackedCourts_other: "{{count}} padel courts",
        trackedCourtsHelp: "Actively checked for availability"
      },
      location: {
        enableDistanceHelp: "Enable location access to see how far this club is from you."
      },
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Legal",
        badgeTerms: "Terms",
        cookiesIntro: "This page explains cookies and similar browser storage used by HLEDEJKURTY.",
        cookiesSection1Body: "The app does not currently set its own HTTP cookies. It uses local storage for functional preferences: mamekurt-theme (light or dark theme), mamekurt-language (language), and mamekurt-results-view (results layout). It also stores mamekurt-analytics-consent-v1 so it can respect your analytics choice. Preferences remain until changed or cleared; the consent choice expires after 12 months.",
        cookiesSection1Title: "Functional browser storage",
        cookiesSection2Body: "PostHog product analytics is optional and starts only after you select Accept analytics. We send selected page views and interactions such as filter changes, club selections, searches, sharing actions, and booking-link clicks, together with limited technical context. Autocapture, advertising, session recording, heatmaps, performance capture, surveys, and person profiles are disabled. The analytics identifier is kept in memory only for the current page session and is not persisted in cookies or local storage.",
        cookiesSection2Title: "Optional analytics",
        cookiesSection3Body: "When you open a club booking system, that external website may use its own cookies or similar technologies. Check the club or booking provider's cookie information before booking there.",
        cookiesSection3Title: "Third-party websites",
        cookiesSection4Body: "Rejecting analytics does not limit the service. You can accept, reject, or change your choice at any time using Cookie settings in the footer. Rejecting stops future analytics capture. Clearing browser storage also removes your saved choice, so the app will ask again. Material changes to analytics will require a new choice.",
        cookiesSection4Title: "Your controls",
        cookiesTitle: "Cookie Policy",
        contact: "Contact:",
        lastUpdated: "Last updated: August 30, 2026",
        privacyIntro: "This policy explains what data HLEDEJKURTY uses while helping visitors find padel court availability in Prague.",
        privacySection1Title: "Who operates this service",
        privacySection2Body1: "The app has no user accounts, payments, or booking checkout. Search requests contain the selected date, duration, number and type of courts, time window, and club identifiers. The database stores club, court, price, availability, and scraper-operation data—not visitor profiles. If you grant browser location permission, coordinates stay in browser memory and are used only to calculate approximate distance; they are not sent to HLEDEJKURTY. Interface preferences are stored locally under",
        privacySection2Body2: "GitHub Pages hosting, the Render API, and their infrastructure may receive IP address, request URL and parameters, user agent, timestamps, and security or error logs. If you consent to PostHog analytics, it receives a temporary pseudonymous identifier, page URL and referrer, browser/device context, timestamps, and selected events: page views, search/filter values, result counts and layouts, language/theme changes, club selections, map or booking-link opens, sharing actions, refresh requests, and geolocation permission outcome. Search text, precise coordinates, form text, session recordings, payments, and booking details are not sent to PostHog by this app.",
        privacySection2Title: "What we process",
        privacySection3Body: "Search requests, functional preferences, and essential security logs are processed to provide the requested service and for the operator's legitimate interests in reliable and secure operation (GDPR Article 6(1)(f)). Optional analytics is processed only with consent (Article 6(1)(a)); consent can be withdrawn at any time. Processors may include GitHub (web hosting), Render (API hosting), Supabase (operational database), and—only after consent—PostHog EU Cloud (analytics). These providers may use subprocessors outside the EEA under an adequacy decision or contractual safeguards. External booking, map, and share services receive data only when you choose to open or share through them and apply their own notices.",
        privacySection3Title: "Purposes, legal bases, and recipients",
        privacySection4Body: "Browser preferences remain until changed or cleared; the analytics choice expires after 12 months. Operational availability data follows the service's maintenance needs; infrastructure logs and consented analytics are retained according to limited provider/project retention settings and deleted or aggregated when no longer needed. You may request access, correction, erasure, restriction, portability where applicable, or object to legitimate-interest processing; you may withdraw analytics consent without affecting earlier lawful processing. You may complain to the Czech Office for Personal Data Protection (ÚOOÚ). No solely automated decisions with legal or similarly significant effects are made. Contact the operator above to exercise rights or ask for current retention and transfer details.",
        privacySection4Title: "Retention, choices, and rights",
        privacyTitle: "Privacy Policy",
        termsIntro: "These terms describe how to use HLEDEJKURTY and what limits apply to the availability information shown here.",
        termsSection1Body: "HLEDEJKURTY aggregates publicly reachable or operator-authorized padel court availability from third-party booking systems. It helps you discover possible time slots, but it does not sell, reserve, or confirm court bookings.",
        termsSection1Title: "Service scope",
        termsSection2Body: "Availability, prices, court types, phone numbers, and Multisport labels are informational and may be delayed or incomplete. The official club booking system is always the final source before you reserve or pay.",
        termsSection2Title: "Availability and prices",
        termsSection3Body: "Booking buttons and club links open third-party websites. Their terms, privacy policies, booking rules, cancellation rules, and payment flows apply separately.",
        termsSection3Title: "External booking systems",
        termsSection4Body: "Do not use the service to overload booking systems, automate abusive traffic, bypass access controls, or copy data for a competing service without permission.",
        termsSection4Title: "Fair use",
        termsTitle: "Terms of Use"
      },
      nav: {
        about: "About us",
        allClubs: "All clubs",
        clubs: "Clubs",
        cookies: "Cookie Policy",
        findCourt: "Find court",
        pageNavigation: "Page navigation",
        primaryNavigation: "Primary navigation",
        privacy: "Privacy Policy",
        terms: "Terms of Use"
      },
      quickSearch: {
        label: "Quick searches",
        todayEvening: "Today Evening",
        tomorrowMorning: "Tomorrow Morning",
        weekend: "Weekend"
      },
      sort: {
        highestPrice: "Highest price",
        indoorFirst: "Indoor first",
        labelClubs: "Sort clubs",
        labelMatching: "Sort matching clubs",
        lowestPrice: "Lowest price",
        multisport: "Multisport",
        name: "Name",
        outdoorFirst: "Outdoor first"
      }
    }
  },
  ua: {
    translation: {
      actions: {
        book: "Бронювати",
        closeMenu: "Закрити меню",
        darkMode: "Темна тема",
        findCourt: "Знайти корт",
        hideSlots: "Сховати слоти",
        language: "Мова",
        lightMode: "Світла тема",
        openBookingSystem: "Відкрити систему бронювання",
        openMenu: "Відкрити меню",
        refreshAvailability: "Оновити доступність",
        share: "Поділитися",
        showCards: "Показати картки",
        showClubCards: "Показати картки клубів",
        showCompactList: "Показати компактний список",
        showSlots: "Показати слоти",
        switchToDarkMode: "Перемкнути на темну тему",
        switchToLightMode: "Перемкнути на світлу тему",
        searchAvailability: "Шукати"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      consent: {
        accept: "Прийняти",
        body: "Ми використовуємо необов'язкову аналітику, щоб розуміти, які функції корисні. Вона вимкнена, доки ви не погодитеся.",
        learnMore: "Політика cookies",
        reject: "Відхилити",
        settings: "Налаштування cookies",
        title: "Допоможіть нам стати кращими"
      },
      allClubs: {
        emptyBody: "Спробуйте іншу назву клубу.",
        emptyTitle: "Клубів не знайдено",
        searchAria: "Пошук клубів за назвою",
        searchLabel: "Пошук",
        searchPlaceholder: "Назва клубу",
        listed_one: "{{count}} клуб у списку",
        listed_other: "{{count}} клубів у списку",
        tracked_one: "Відстежується {{count}} клуб",
        tracked_other: "Відстежується {{count}} клубів"
      },
      about: {
        body: "HLEDEJKURTY регулярно збирає доступність кортів для паделу з підтримуваних систем бронювання клубів у Празі. Шукайте серед останніх збережених результатів на сьогодні та наступні сім днів за датою, тривалістю, кількістю кортів, часовим проміжком і типом корту.",
        cardBookBody: "Коли знайдете відповідний слот, дія бронювання відкриє офіційну систему бронювання цього клубу.",
        cardBookTitle: "Бронювання у клубі",
        cardLimitsBody: "Доступність і ціни мають інформаційний характер. Сторінка бронювання клубу завжди є остаточним джерелом перед резервуванням.",
        cardLimitsTitle: "Прозорі обмеження",
        cardSearchBody: "Замість ручної перевірки багатьох календарів перегляньте останню зібрану доступність і знайдіть клуби з відповідними слотами.",
        cardSearchTitle: "Один пошук",
        faq: {
          accuracy: {
            answer: "Доступність може швидко змінюватися, бо бронювання відбувається в системі кожного клубу. Використовуйте HLEDEJKURTY, щоб знайти ймовірно вільні слоти, а фінальний час і ціну підтверджуйте на сторінці клубу.",
            question: "Наскільки точна доступність?"
          },
          availability: {
            answer: "Застосунок шукає в останніх даних, зібраних із підтримуваних клубів на сьогодні та наступні сім днів, за вибраною датою, тривалістю, кількістю кортів, типом корту та часовим проміжком.",
            question: "Як працює пошук?"
          },
          updates: {
            answer: "Доступність на сьогодні та наступні сім днів автоматично оновлюється приблизно кожні 20 хвилин між 08:00 і 22:00 за празьким часом. Окремі результати показують час останньої перевірки, а статус біля кількості перевірених клубів — приблизний відлік до наступного регулярного циклу. Також можна вручну запросити свіжу перевірку, і після її завершення показані результати оновляться автоматично.",
            question: "Як часто оновлюється доступність?"
          },
          booking: {
            answer: "Ні. HLEDEJKURTY не приймає оплату й не створює бронювання. Кнопка бронювання завжди відкриває офіційну систему вибраного клубу.",
            question: "Чи можна бронювати прямо тут?"
          },
          multisport: {
            answer: "Коли клуб публікує підтримку Multisport, ми показуємо це як позначку. Перед бронюванням завжди уточнюйте актуальні правила оплати в клубі.",
            question: "Чи показуєте ви підтримку Multisport?"
          },
          trackedClubs: {
            answer: "Зараз ми можемо перевіряти бронювання для цих 10 клубів: Padel Prosek, Padel Club Spoje, Tenis & Padel klub Písečná, SK Slavia Praha Padel, Padel Neride, Padel Džus, Padel Powers Smíchov, One Padel, Císařská louka Padel і SK Satalice. Повний каталог падел-клубів можна знайти на сторінці всіх клубів.",
            question: "Які клуби відстежуються?"
          }
        },
        faqTitle: "Поширені запитання",
        title: "Знайдіть вільний корт для паделу без відкривання кожної системи бронювання."
      },
      availability: {
        checked: "Перевірено",
        checkedClubsTitle: "Перевірені клуби",
        checkedCount: "перевірено",
        failedJson: "Відповідь про доступність була не у форматі JSON",
        failedLoad: "Не вдалося завантажити доступність",
        noCheckedClubs: "Клуби ще не перевірено",
        nextCheck: "Наступна через ~{{duration}}",
        nextCheckTooltip: "Дані для всіх відстежуваних дат перевіряються приблизно кожні 20 хвилин. Наступна перевірка через ~{{duration}}. Натисніть кнопку оновлення, щоб запросити свіжі дані.",
        notLoaded: "Доступність кортів не завантажена",
        recent: "щойно",
        refreshAlreadyQueued: "Нова перевірка доступності вже в черзі або виконується.",
        refreshComplete: "Свіжі дані готові, а результати оновлено автоматично.",
        refreshDelayed: "Перевірка триває довше, ніж очікувалося. Спробуйте пошукати знову пізніше.",
        refreshFailed: "Не вдалося запросити нову перевірку доступності.",
        refreshQueued: "Запит на оновлення доступності надіслано. Нові дані буде збережено після завершення фонової перевірки.",
        refreshWaiting: "Доступність оновлюється у фоновому режимі. Після завершення результати оновляться автоматично.",
        stale: "Застаріло",
        suggestion: "Спробуйте оновити сторінку або вибрати інший часовий проміжок.",
        timeout: "Запит доступності перевищив ліміт {{seconds}} с",
        uncheckedClubs_one: "{{count}} клуб не було перевірено",
        uncheckedClubs_other: "{{count}} клубів не було перевірено",
        unknownCheckFailure: "Не вдалося перевірити",
        unavailableReason: "Зараз не вдалося перевірити вільні слоти цього клубу.",
        unavailableSuffix: "Відкрийте офіційну систему бронювання, щоб перевірити й забронювати напряму."
      },
      club: {
        allCourts: "Усі корти",
        court_one: "корт",
        court_other: "кортів",
        courtType: "Тип корту",
        courtTypes: "Типи кортів",
        daily: "Щодня",
        distanceFromYou: "{{distance}} км від вас",
        distanceStraightLine: "Приблизна відстань по прямій",
        providerCourtPrefix: "Корт",
        date: "Дата",
        duration: "Тривалість",
        endTime: "Кінець",
        from: "від",
        indoor: "У залі",
        matchingClubs_one: "{{count}} відповідний клуб",
        matchingClubs_other: "{{count}} відповідних клубів",
        matchingSlots_one: "{{count}} відповідний слот",
        matchingSlots_other: "{{count}} відповідних слотів",
        multisport: "Multisport",
        noMultisport: "Без Multisport",
        noMatchingBody: "Спробуйте коротшу тривалість, менше кортів або інший день.",
        noMatchingTitle: "Немає відповідних клубів",
        noSlotsBody: "Змініть фільтри або поверніться, щоб побачити інші відповідні клуби.",
        noSlotsTitle: "Немає слотів для цього клубу",
        notPublished: "Не опубліковано",
        openingHours: "Години роботи",
        outdoor: "Надворі",
        priceUnknown: "Ціна невідома",
        slots_one: "{{count}} слот",
        slots_other: "{{count}} слотів",
        startTime: "Початок",
        needed: "Потрібно кортів",
        availableTimes: "Доступний час"
      },
      date: {
        chooseDate: "Виберіть дату",
        nextMonth: "Наступний місяць",
        previousMonth: "Попередній місяць",
        today: "Сьогодні, {{date}}",
        tomorrow: "Завтра, {{date}}",
        weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
      },
      footer: {
        availabilityNotice: "Доступність і ціни мають інформаційний характер.",
        bookingNotice: "Бронюйте лише через офіційну систему бронювання кожного клубу.",
        description: "Незалежний пошук доступності падел-кортів у Празі, Чехія.",
        legal: "Юридичне",
        service: "Сервіс"
      },
      home: {
        allClubsCta: "Переглянути всі клуби",
        featureBookingBody: "Відкривайте офіційну систему бронювання лише після того, як знайдете клуб під ваш запит.",
        featureBookingTitle: "Бронювання у клубі",
        featureCourtBody: "Фільтруйте криті й відкриті падел-корти, кількість кортів, тривалість, ціну та Multisport.",
        featureCourtTitle: "Порівняйте важливі деталі",
        featureTimeBody: "Оберіть сьогодні, завтра або іншу дату до перевірки доступності, щоб застосунок звертався до клубів тільки коли ви готові.",
        featureTimeTitle: "Спочатку виберіть потрібну дату",
        featuredClubsBody: "Повний список клубів містить адреси, ціни, типи кортів, позначки Multisport і прямі посилання на бронювання.",
        featuredClubsTitle: "Популярні падел-клуби у Празі",
        intro: "Оберіть дату, тривалість, кількість кортів, тип корту й часовий проміжок, а потім перевірте доступність падел-кортів у Празі.",
        landingBody: "HLEDEJKURTY допомагає знаходити вільні падел-корти у Празі без ручного відкривання кожної системи бронювання. Шукайте за датою, часом початку, тривалістю, кількістю кортів, критими чи відкритими кортами, цінами, Multisport і офіційними посиланнями на бронювання.",
        landingTitle: "Перевіряйте доступність падел-кортів",
        multisportClubs_one: "{{count}} клуб з Multisport",
        multisportClubs_other: "{{count}} клубів з Multisport",
        multisportHelp: "Легко побачити перед бронюванням",
        statsLabel: "Статистика відстежуваних падел-кортів",
        title: "Знайдіть вільні падел-корти у Празі",
        trackedClubsHelp: "У Празі та поблизу",
        trackedCourts_one: "{{count}} падел-корт",
        trackedCourts_other: "{{count}} падел-кортів",
        trackedCourtsHelp: "Активно перевіряються на доступність"
      },
      location: {
        enableDistanceHelp: "Увімкніть доступ до геолокації, щоб побачити відстань до цього клубу."
      },
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Юридичне",
        badgeTerms: "Умови",
        cookiesIntro: "Ця сторінка пояснює використання cookies і подібного сховища браузера HLEDEJKURTY.",
        cookiesSection1Body: "Застосунок зараз не встановлює власних HTTP cookies. Для функціональних налаштувань він використовує local storage: mamekurt-theme (світла або темна тема), mamekurt-language (мова) та mamekurt-results-view (вигляд результатів). Також зберігається mamekurt-analytics-consent-v1, щоб дотримуватися вашого вибору щодо аналітики. Налаштування залишаються до зміни чи очищення; вибір аналітики спливає через 12 місяців.",
        cookiesSection1Title: "Функціональне сховище браузера",
        cookiesSection2Body: "Продуктова аналітика PostHog є необов'язковою й запускається лише після вибору «Дозволити аналітику». Ми надсилаємо вибрані перегляди сторінок та взаємодії, як-от зміни фільтрів, вибір клубів, пошуки, поширення й кліки на бронювання, разом з обмеженим технічним контекстом. Автозбір, реклама, запис сесій, теплові карти, вимірювання продуктивності, опитування та профілі осіб вимкнені. Аналітичний ідентифікатор зберігається лише в пам'яті поточної сторінки, а не в cookies чи local storage.",
        cookiesSection2Title: "Необов'язкова аналітика",
        cookiesSection3Body: "Коли ви відкриваєте систему бронювання клубу, цей зовнішній сайт може використовувати власні cookies або подібні технології. Перевірте інформацію клубу чи провайдера бронювання перед бронюванням.",
        cookiesSection3Title: "Сторонні сайти",
        cookiesSection4Body: "Відмова від аналітики не обмежує сервіс. Ви можете дозволити, відхилити або змінити вибір будь-коли через «Налаштування cookies» у футері. Відмова зупиняє майбутній збір аналітики. Очищення сховища браузера також видаляє збережений вибір, тому застосунок запитає знову. Для істотних змін аналітики буде потрібен новий вибір.",
        cookiesSection4Title: "Ваші налаштування",
        cookiesTitle: "Політика cookies",
        contact: "Контакт:",
        lastUpdated: "Останнє оновлення: 30 серпня 2026",
        privacyIntro: "Ця політика пояснює, які дані HLEDEJKURTY використовує, допомагаючи відвідувачам знаходити доступність падел-кортів у Празі.",
        privacySection1Title: "Хто керує сервісом",
        privacySection2Body1: "У застосунку немає облікових записів, платежів чи оформлення бронювання. Пошукові запити містять вибрану дату, тривалість, кількість і тип кортів, часовий проміжок та ідентифікатори клубів. База даних зберігає дані клубів, кортів, цін, доступності й роботи збирачів, а не профілі відвідувачів. Якщо ви дозволите геолокацію браузера, координати залишаються в пам'яті браузера й використовуються лише для приблизної відстані; вони не надсилаються HLEDEJKURTY. Налаштування інтерфейсу зберігаються локально під",
        privacySection2Body2: "Хостинг GitHub Pages, API на Render та їхня інфраструктура можуть отримувати IP-адресу, URL і параметри запиту, user agent, часові позначки та журнали безпеки чи помилок. Після вашої згоди PostHog отримує тимчасовий псевдонімний ідентифікатор, URL і джерело сторінки, контекст браузера/пристрою, час та вибрані події: перегляди сторінок, значення пошуку й фільтрів, кількість і вигляд результатів, зміни мови/теми, вибір клубів, відкриття мап або бронювання, поширення, оновлення даних і результат дозволу геолокації. Текст пошуку, точні координати, текст форм, записи сесій, платежі й деталі бронювання застосунок не надсилає PostHog.",
        privacySection2Title: "Що ми обробляємо",
        privacySection3Body: "Пошукові запити, функціональні налаштування та необхідні журнали безпеки обробляються для надання запитаного сервісу й законного інтересу оператора в надійній та безпечній роботі (стаття 6(1)(f) GDPR). Необов'язкова аналітика обробляється лише за згодою (стаття 6(1)(a)); згоду можна відкликати будь-коли. Обробниками можуть бути GitHub (вебхостинг), Render (API), Supabase (операційна база даних) і, лише після згоди, PostHog EU Cloud (аналітика). Вони можуть залучати субобробників за межами ЄЕЗ на підставі рішення про адекватність або договірних гарантій. Зовнішні сервіси бронювання, мап і поширення отримують дані лише коли ви самі їх відкриваєте чи використовуєте, і застосовують власні повідомлення.",
        privacySection3Title: "Цілі, правові підстави й отримувачі",
        privacySection4Body: "Налаштування браузера зберігаються до зміни чи очищення; вибір аналітики спливає через 12 місяців. Операційні дані доступності зберігаються відповідно до потреб обслуговування; журнали інфраструктури й погоджена аналітика — за обмеженими налаштуваннями зберігання провайдера/проєкту та видаляються або агрегуються, коли більше не потрібні. Ви можете вимагати доступ, виправлення, видалення, обмеження, перенесення, де застосовно, або заперечити проти законного інтересу; згоду на аналітику можна відкликати без впливу на попередню законну обробку. Ви можете подати скаргу до чеського ÚOOÚ. Рішень, повністю автоматизованих і таких, що мають юридичні чи подібно значні наслідки, немає. Зверніться до оператора вище для реалізації прав або уточнення строків і передач.",
        privacySection4Title: "Зберігання, вибір і права",
        privacyTitle: "Політика приватності",
        termsIntro: "Ці умови описують, як користуватися HLEDEJKURTY і які обмеження застосовуються до показаної інформації про доступність.",
        termsSection1Body: "HLEDEJKURTY агрегує публічно доступну або авторизовану оператором доступність падел-кортів із систем бронювання третіх сторін. Він допомагає знаходити можливі часові слоти, але не продає, не резервує і не підтверджує бронювання кортів.",
        termsSection1Title: "Обсяг сервісу",
        termsSection2Body: "Доступність, ціни, типи кортів, телефони й позначки Multisport мають інформаційний характер і можуть бути застарілими або неповними. Офіційна система бронювання клубу завжди є остаточним джерелом перед резервуванням чи оплатою.",
        termsSection2Title: "Доступність і ціни",
        termsSection3Body: "Кнопки бронювання та посилання клубів відкривають сторонні сайти. Їхні умови, політики приватності, правила бронювання, правила скасування та платіжні процеси застосовуються окремо.",
        termsSection3Title: "Зовнішні системи бронювання",
        termsSection4Body: "Не використовуйте сервіс для перевантаження систем бронювання, автоматизації зловживального трафіку, обходу контролю доступу або копіювання даних для конкуруючого сервісу без дозволу.",
        termsSection4Title: "Добросовісне використання",
        termsTitle: "Умови використання"
      },
      nav: {
        about: "Про нас",
        allClubs: "Усі клуби",
        clubs: "Клуби",
        cookies: "Політика cookies",
        findCourt: "Знайти корт",
        pageNavigation: "Навігація сторінкою",
        primaryNavigation: "Основна навігація",
        privacy: "Політика приватності",
        terms: "Умови використання"
      },
      quickSearch: {
        label: "Швидкий пошук",
        todayEvening: "Сьогодні ввечері",
        tomorrowMorning: "Завтра вранці",
        weekend: "Вихідні"
      },
      sort: {
        highestPrice: "Найвища ціна",
        indoorFirst: "Спочатку в залі",
        labelClubs: "Сортувати клуби",
        labelMatching: "Сортувати відповідні клуби",
        lowestPrice: "Найнижча ціна",
        multisport: "Multisport",
        name: "Назва",
        outdoorFirst: "Спочатку надворі"
      }
    }
  },
  cz: {
    translation: {
      actions: {
        book: "Rezervovat",
        closeMenu: "Zavřít menu",
        darkMode: "Tmavý režim",
        findCourt: "Najít kurt",
        hideSlots: "Skrýt časy",
        language: "Jazyk",
        lightMode: "Světlý režim",
        openBookingSystem: "Otevřít rezervační systém",
        openMenu: "Otevřít menu",
        refreshAvailability: "Obnovit dostupnost",
        share: "Sdílet",
        showCards: "Zobrazit karty",
        showClubCards: "Zobrazit karty klubů",
        showCompactList: "Zobrazit kompaktní seznam",
        showSlots: "Zobrazit časy",
        switchToDarkMode: "Přepnout na tmavý režim",
        switchToLightMode: "Přepnout na světlý režim",
        searchAvailability: "Hledat"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      consent: {
        accept: "Přijmout",
        body: "Používáme volitelnou analytiku, abychom zjistili, které funkce jsou užitečné. Dokud ji nepovolíte, zůstává vypnutá.",
        learnMore: "Zásady cookies",
        reject: "Odmítnout",
        settings: "Nastavení cookies",
        title: "Pomozte nám se zlepšovat"
      },
      allClubs: {
        emptyBody: "Zkuste jiný název klubu.",
        emptyTitle: "Žádné kluby nenalezeny",
        searchAria: "Hledat kluby podle názvu",
        searchLabel: "Hledat",
        searchPlaceholder: "Název klubu",
        listed_one: "{{count}} klub v seznamu",
        listed_other: "{{count}} klubů v seznamu",
        tracked_one: "Sleduje se {{count}} klub",
        tracked_other: "Sleduje se {{count}} klubů"
      },
      about: {
        body: "HLEDEJKURTY pravidelně shromažďuje dostupnost padelových kurtů z podporovaných rezervačních systémů klubů v Praze. V nejnovějších uložených výsledcích pro dnešek a následujících sedm dní můžete hledat podle data, délky hry, počtu kurtů, časového okna a typu kurtu.",
        cardBookBody: "Když najdete vhodný čas, akce rezervace otevře oficiální rezervační systém daného klubu.",
        cardBookTitle: "Rezervace u klubu",
        cardLimitsBody: "Dostupnost a ceny jsou informativní. Rezervační stránka klubu je vždy finálním zdrojem před rezervací.",
        cardLimitsTitle: "Transparentní limity",
        cardSearchBody: "Místo ruční kontroly mnoha kalendářů prohledejte nejnovější shromážděnou dostupnost a zjistěte, které kluby mají odpovídající časy.",
        cardSearchTitle: "Jedno hledání",
        faq: {
          accuracy: {
            answer: "Dostupnost se může rychle změnit, protože rezervace probíhají ve vlastním systému každého klubu. HLEDEJKURTY použijte k nalezení pravděpodobně volných časů a finální čas i cenu potvrďte na stránce klubu.",
            question: "Jak přesná je dostupnost?"
          },
          availability: {
            answer: "Aplikace vyhledává v nejnovější dostupnosti shromážděné z podporovaných klubů pro dnešek a následujících sedm dní podle zvoleného data, délky hry, počtu kurtů, typu kurtu a časového okna.",
            question: "Jak vyhledávání funguje?"
          },
          updates: {
            answer: "Dostupnost pro dnešek a následujících sedm dní se mezi 08:00 a 22:00 pražského času automaticky aktualizuje přibližně každých 20 minut. Jednotlivé výsledky ukazují čas poslední kontroly a stav vedle počtu zkontrolovaných klubů přibližný odpočet do dalšího pravidelného cyklu. Novou kontrolu můžete také vyžádat ručně a po jejím dokončení se zobrazené výsledky automaticky aktualizují.",
            question: "Jak často se dostupnost aktualizuje?"
          },
          booking: {
            answer: "Ne. HLEDEJKURTY nepřijímá platby ani nevytváří rezervace. Tlačítko rezervace vás vždy pošle do oficiálního rezervačního systému vybraného klubu.",
            question: "Mohu rezervovat přímo tady?"
          },
          multisport: {
            answer: "Když klub uvádí podporu Multisport, zobrazíme ji jako štítek. Aktuální pravidla platby si před rezervací vždy ověřte u klubu.",
            question: "Zobrazujete podporu Multisport?"
          },
          trackedClubs: {
            answer: "Právě teď umíme kontrolovat rezervace u těchto 10 klubů: Padel Prosek, Padel Club Spoje, Tenis & Padel klub Písečná, SK Slavia Praha Padel, Padel Neride, Padel Džus, Padel Powers Smíchov, One Padel, Císařská louka Padel a SK Satalice. Kompletní katalog padelových klubů najdete na stránce Všechny kluby.",
            question: "Které kluby sledujete?"
          }
        },
        faqTitle: "Časté otázky",
        title: "Najděte volný padelový kurt bez otevírání každého rezervačního systému."
      },
      availability: {
        checked: "Ověřeno",
        checkedClubsTitle: "Zkontrolované kluby",
        checkedCount: "ověřeno",
        failedJson: "Odpověď dostupnosti nebyla JSON",
        failedLoad: "Nepodařilo se načíst dostupnost",
        noCheckedClubs: "Zatím nebyly zkontrolovány žádné kluby",
        nextCheck: "Další za ~{{duration}}",
        nextCheckTooltip: "Dostupnost pro všechny sledované dny se kontroluje přibližně každých 20 minut. Další kontrola za ~{{duration}}. Čerstvá data si vyžádáte tlačítkem obnovení.",
        notLoaded: "Dostupnost kurtů není načtená",
        recent: "nedávno",
        refreshAlreadyQueued: "Nová kontrola dostupnosti už čeká ve frontě nebo právě probíhá.",
        refreshComplete: "Čerstvá dostupnost je připravená a výsledky se automaticky aktualizovaly.",
        refreshDelayed: "Kontrola trvá déle, než se očekávalo. Zkuste hledání později znovu.",
        refreshFailed: "Nepodařilo se vyžádat novou kontrolu dostupnosti.",
        refreshQueued: "Aktualizace dostupnosti byla vyžádána. Nová data se uloží po dokončení kontroly na pozadí.",
        refreshWaiting: "Dostupnost se aktualizuje na pozadí. Po dokončení se výsledky automaticky obnoví.",
        stale: "Zastaralé",
        suggestion: "Zkuste obnovit stránku nebo vybrat jiné časové rozmezí.",
        timeout: "Požadavek na dostupnost vypršel po {{seconds}} s",
        uncheckedClubs_one: "{{count}} klub nebyl zkontrolován",
        uncheckedClubs_other: "{{count}} klubů nebylo zkontrolováno",
        unknownCheckFailure: "Nepodařilo se zkontrolovat",
        unavailableReason: "Právě teď se nepodařilo zkontrolovat volné časy pro tento klub.",
        unavailableSuffix: "Otevřete oficiální rezervační systém a zkontrolujte nebo rezervujte přímo."
      },
      club: {
        allCourts: "Všechny kurty",
        court_one: "kurt",
        court_other: "kurtů",
        courtType: "Typ kurtu",
        courtTypes: "Typy kurtů",
        daily: "Denně",
        distanceFromYou: "{{distance}} km od vás",
        distanceStraightLine: "Přibližná vzdálenost vzdušnou čarou",
        providerCourtPrefix: "Kurt",
        date: "Datum",
        duration: "Délka",
        endTime: "Konec",
        from: "od",
        indoor: "V hale",
        matchingClubs_one: "{{count}} odpovídající klub",
        matchingClubs_other: "{{count}} odpovídajících klubů",
        matchingSlots_one: "{{count}} odpovídající čas",
        matchingSlots_other: "{{count}} odpovídajících časů",
        multisport: "Multisport",
        noMultisport: "Bez Multisport",
        noMatchingBody: "Zkuste kratší délku, méně kurtů nebo jiný den.",
        noMatchingTitle: "Žádné odpovídající kluby",
        noSlotsBody: "Změňte filtry nebo se vraťte a zobrazte jiné odpovídající kluby.",
        noSlotsTitle: "Pro tento klub nejsou žádné časy",
        notPublished: "Nezveřejněno",
        openingHours: "Otevírací doba",
        outdoor: "Venkovní",
        priceUnknown: "Cena neznámá",
        slots_one: "{{count}} čas",
        slots_other: "{{count}} časů",
        startTime: "Začátek",
        needed: "Počet kurtů",
        availableTimes: "Dostupné časy"
      },
      date: {
        chooseDate: "Vybrat datum",
        nextMonth: "Další měsíc",
        previousMonth: "Předchozí měsíc",
        today: "Dnes, {{date}}",
        tomorrow: "Zítra, {{date}}",
        weekdays: ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"]
      },
      footer: {
        availabilityNotice: "Dostupnost a ceny jsou informativní.",
        bookingNotice: "Rezervujte pouze přes oficiální rezervační systém každého klubu.",
        description: "Nezávislý vyhledávač dostupnosti padelových kurtů v Praze, Česká republika.",
        legal: "Právní",
        service: "Služba"
      },
      home: {
        allClubsCta: "Zobrazit všechny kluby",
        featureBookingBody: "Oficiální rezervační systém otevřete až ve chvíli, kdy najdete klub odpovídající vašemu hledání.",
        featureBookingTitle: "Rezervace u klubu",
        featureCourtBody: "Filtrujte vnitřní i venkovní padelové kurty, počet kurtů, délku hry, cenu a podporu Multisport.",
        featureCourtTitle: "Porovnejte důležité detaily",
        featureTimeBody: "Vyberte dnešek, zítřek nebo jiné datum před kontrolou dostupnosti, aby aplikace oslovila kluby až ve chvíli, kdy jste připraveni.",
        featureTimeTitle: "Nejdřív vyberte správné datum",
        featuredClubsBody: "Úplný seznam klubů obsahuje adresy, ceny, typy kurtů, štítky Multisport a přímé odkazy na rezervaci.",
        featuredClubsTitle: "Oblíbené sledované padelové kluby v Praze",
        intro: "Vyberte datum, délku hry, počet kurtů, typ kurtu a časové okno, potom zkontrolujte dostupnost padelových kurtů v Praze.",
        landingBody: "HLEDEJKURTY pomáhá najít volné padelové kurty v Praze bez ručního otevírání každého rezervačního systému. Hledejte podle data, začátku, délky hry, počtu kurtů, vnitřních nebo venkovních kurtů, cen, Multisport a oficiálních rezervačních odkazů.",
        landingTitle: "Zkontrolujte dostupnost padelových kurtů",
        multisportClubs_one: "{{count}} klub s Multisport",
        multisportClubs_other: "{{count}} klubů s Multisport",
        multisportHelp: "Viditelné ještě před rezervací",
        statsLabel: "Statistiky sledovaných padelových kurtů",
        title: "Najděte volné padelové kurty v Praze",
        trackedClubsHelp: "V Praze a okolí",
        trackedCourts_one: "{{count}} padelový kurt",
        trackedCourts_other: "{{count}} padelových kurtů",
        trackedCourtsHelp: "Aktivně kontrolováno pro dostupnost"
      },
      location: {
        enableDistanceHelp: "Povolte přístup k poloze, abyste viděli vzdálenost k tomuto klubu."
      },
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Právní",
        badgeTerms: "Podmínky",
        cookiesIntro: "Tato stránka vysvětluje používání cookies a podobného úložiště prohlížeče službou HLEDEJKURTY.",
        cookiesSection1Body: "Aplikace nyní nenastavuje vlastní HTTP cookies. Pro funkční předvolby používá local storage: mamekurt-theme (světlý nebo tmavý motiv), mamekurt-language (jazyk) a mamekurt-results-view (zobrazení výsledků). Ukládá také mamekurt-analytics-consent-v1, aby respektovala vaši volbu analytiky. Předvolby zůstávají do změny či vymazání; volba analytiky vyprší po 12 měsících.",
        cookiesSection1Title: "Funkční úložiště prohlížeče",
        cookiesSection2Body: "Produktová analytika PostHog je volitelná a spustí se až po volbě „Povolit analytiku“. Odesíláme vybraná zobrazení stránek a interakce, například změny filtrů, výběry klubů, hledání, sdílení a kliknutí na rezervaci, spolu s omezeným technickým kontextem. Automatický sběr, reklama, záznam relací, heatmapy, měření výkonu, průzkumy a profily osob jsou vypnuté. Analytický identifikátor je pouze v paměti aktuální relace stránky a neukládá se do cookies ani local storage.",
        cookiesSection2Title: "Volitelná analytika",
        cookiesSection3Body: "Když otevřete rezervační systém klubu, externí web může používat vlastní cookies nebo podobné technologie. Před rezervací zkontrolujte informace klubu nebo poskytovatele rezervací.",
        cookiesSection3Title: "Weby třetích stran",
        cookiesSection4Body: "Odmítnutí analytiky neomezuje službu. Volbu můžete kdykoli povolit, odmítnout nebo změnit přes Nastavení cookies v patičce. Odmítnutí zastaví budoucí analytický sběr. Vymazání úložiště prohlížeče odstraní i uloženou volbu, takže se aplikace zeptá znovu. Podstatné změny analytiky budou vyžadovat novou volbu.",
        cookiesSection4Title: "Vaše nastavení",
        cookiesTitle: "Zásady cookies",
        contact: "Kontakt:",
        lastUpdated: "Poslední aktualizace: 30. srpna 2026",
        privacyIntro: "Tyto zásady vysvětlují, jaká data HLEDEJKURTY používá při pomoci návštěvníkům najít dostupnost padelových kurtů v Praze.",
        privacySection1Title: "Kdo službu provozuje",
        privacySection2Body1: "Aplikace nemá uživatelské účty, platby ani dokončení rezervace. Vyhledávací požadavky obsahují vybrané datum, délku, počet a typ kurtů, časové okno a identifikátory klubů. Databáze ukládá data klubů, kurtů, cen, dostupnosti a provozu scraperů, nikoli profily návštěvníků. Pokud povolíte polohu v prohlížeči, souřadnice zůstanou v jeho paměti a slouží jen k výpočtu přibližné vzdálenosti; HLEDEJKURTY je neobdrží. Předvolby rozhraní se lokálně ukládají pod",
        privacySection2Body2: "Hosting GitHub Pages, API na Renderu a jejich infrastruktura mohou obdržet IP adresu, URL a parametry požadavku, user agent, časové značky a bezpečnostní nebo chybové logy. Po vašem souhlasu PostHog obdrží dočasný pseudonymní identifikátor, URL a referrer stránky, kontext prohlížeče/zařízení, čas a vybrané události: zobrazení stránek, hodnoty hledání a filtrů, počty a vzhled výsledků, změny jazyka/motivu, výběry klubů, otevření mapy nebo rezervace, sdílení, požadavky na obnovení a výsledek oprávnění k poloze. Text hledání, přesné souřadnice, text formulářů, záznamy relací, platby ani údaje rezervace tato aplikace PostHogu neposílá.",
        privacySection2Title: "Co zpracováváme",
        privacySection3Body: "Vyhledávací požadavky, funkční předvolby a nezbytné bezpečnostní logy se zpracovávají pro poskytnutí požadované služby a oprávněný zájem provozovatele na spolehlivém a bezpečném provozu (čl. 6 odst. 1 písm. f) GDPR). Volitelná analytika se zpracovává jen se souhlasem (písm. a)); souhlas lze kdykoli odvolat. Zpracovateli mohou být GitHub (webhosting), Render (API hosting), Supabase (provozní databáze) a pouze po souhlasu PostHog EU Cloud (analytika). Mohou využívat další zpracovatele mimo EHP na základě rozhodnutí o odpovídající ochraně nebo smluvních záruk. Externí rezervační, mapové a sdílecí služby dostanou data jen tehdy, když je sami otevřete či použijete, a platí jejich vlastní oznámení.",
        privacySection3Title: "Účely, právní základy a příjemci",
        privacySection4Body: "Předvolby prohlížeče zůstávají do změny či vymazání; volba analytiky vyprší po 12 měsících. Provozní data dostupnosti se uchovávají podle potřeb údržby služby; logy infrastruktury a odsouhlasená analytika podle omezených nastavení uchování poskytovatele/projektu a mažou nebo agregují se, když už nejsou potřeba. Můžete žádat přístup, opravu, výmaz, omezení, přenositelnost, kde se uplatní, nebo vznést námitku proti oprávněnému zájmu; souhlas s analytikou lze odvolat bez dopadu na dřívější zákonné zpracování. Můžete podat stížnost Úřadu pro ochranu osobních údajů (ÚOOÚ). Neprobíhá výhradně automatizované rozhodování s právními či obdobně významnými účinky. Pro uplatnění práv nebo aktuální údaje o uchování a předávání kontaktujte provozovatele výše.",
        privacySection4Title: "Uchování, volby a práva",
        privacyTitle: "Zásady ochrany soukromí",
        termsIntro: "Tyto podmínky popisují, jak používat HLEDEJKURTY a jaké limity se vztahují na zobrazené informace o dostupnosti.",
        termsSection1Body: "HLEDEJKURTY agreguje veřejně dostupnou nebo provozovatelem autorizovanou dostupnost padelových kurtů z rezervačních systémů třetích stran. Pomáhá objevovat možné časy, ale neprodává, nerezervuje ani nepotvrzuje rezervace kurtů.",
        termsSection1Title: "Rozsah služby",
        termsSection2Body: "Dostupnost, ceny, typy kurtů, telefonní čísla a štítky Multisport jsou informativní a mohou být opožděné nebo neúplné. Oficiální rezervační systém klubu je vždy finálním zdrojem před rezervací nebo platbou.",
        termsSection2Title: "Dostupnost a ceny",
        termsSection3Body: "Rezervační tlačítka a odkazy klubů otevírají weby třetích stran. Jejich podmínky, zásady ochrany soukromí, pravidla rezervací, storno pravidla a platební procesy platí samostatně.",
        termsSection3Title: "Externí rezervační systémy",
        termsSection4Body: "Nepoužívejte službu k přetěžování rezervačních systémů, automatizaci zneužívajícího provozu, obcházení přístupových kontrol ani kopírování dat pro konkurenční službu bez povolení.",
        termsSection4Title: "Férové použití",
        termsTitle: "Podmínky použití"
      },
      nav: {
        about: "O nás",
        allClubs: "Všechny kluby",
        clubs: "Kluby",
        cookies: "Zásady cookies",
        findCourt: "Najít kurt",
        pageNavigation: "Navigace stránky",
        primaryNavigation: "Hlavní navigace",
        privacy: "Zásady ochrany soukromí",
        terms: "Podmínky použití"
      },
      quickSearch: {
        label: "Rychlé hledání",
        todayEvening: "Dnes večer",
        tomorrowMorning: "Zítra ráno",
        weekend: "Víkend"
      },
      sort: {
        highestPrice: "Nejvyšší cena",
        indoorFirst: "V hale nejdřív",
        labelClubs: "Řadit kluby",
        labelMatching: "Řadit odpovídající kluby",
        lowestPrice: "Nejnižší cena",
        multisport: "Multisport",
        name: "Název",
        outdoorFirst: "Venkovní nejdřív"
      }
    }
  }
} as const;

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  },
  lng: initialLanguage,
  resources
});

export default i18n;
