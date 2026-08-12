import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export type LanguageCode = "ua" | "en" | "cz";

export const LANGUAGE_STORAGE_KEY = "mamekurt-language";

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "ua", label: "UA" },
  { code: "en", label: "EN" },
  { code: "cz", label: "CZ" }
];

const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage = isLanguageCode(storedLanguage) ? storedLanguage : "en";

export function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "ua" || value === "en" || value === "cz";
}

const resources = {
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
        switchToLightMode: "Switch to light mode"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      allClubs: {
        emptyBody: "Try another club name.",
        emptyTitle: "No clubs found",
        searchAria: "Search clubs by name",
        searchLabel: "Search",
        searchPlaceholder: "Club name",
        tracked_one: "{{count}} club tracked",
        tracked_other: "{{count}} clubs tracked"
      },
      about: {
        body: "HLEDEJKURTY gathers available padel slots from club booking systems around Prague and shows the clubs that match your date, duration, court count, time window, and indoor/outdoor preference.",
        cardBookBody: "When you find a suitable slot, the Book action opens the official booking system for that club.",
        cardBookTitle: "Book at the club",
        cardLimitsBody: "Availability and prices are informational. The club booking page is always the final source before reservation.",
        cardLimitsTitle: "Transparent limits",
        cardSearchBody: "Instead of checking many calendars manually, filter once and see which clubs currently have matching slots.",
        cardSearchTitle: "One search",
        title: "Find a free padel court without opening every booking system."
      },
      availability: {
        checked: "Checked",
        checkedClubsTitle: "Checked clubs",
        checkedCount: "checked",
        failedJson: "Availability response was not JSON",
        failedLoad: "Failed to load availability",
        noCheckedClubs: "No clubs checked yet",
        notLoaded: "Court availability is not loaded",
        recent: "recently",
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
        noMatchingBody: "Try a shorter duration, fewer courts, or another day.",
        noMatchingTitle: "No matching clubs",
        noSlotsBody: "Change the filters or go back to see other matching clubs.",
        noSlotsTitle: "No slots for this club",
        notPublished: "Not published",
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
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Legal",
        badgeTerms: "Terms",
        cookiesIntro: "This page explains browser storage used by HLEDEJKURTY.",
        cookiesSection1Body: "HLEDEJKURTY may use PostHog product analytics to understand anonymous usage, such as page views, filter changes, club selections, and booking-link clicks. The app also stores your theme and language choices in browser local storage so preferences persist across visits.",
        cookiesSection1Title: "Current cookie use",
        cookiesSection2Body: "Theme and language preferences are functional storage. Analytics storage is used only to understand use of this app and is not used for advertising. You can clear browser storage at any time from your browser settings.",
        cookiesSection2Title: "Strictly necessary storage",
        cookiesSection3Body: "When you open a club booking system, that external website may use its own cookies or similar technologies. Check the club or booking provider's cookie information before booking there.",
        cookiesSection3Title: "Third-party websites",
        cookiesSection4Body: "If analytics, advertising, or other non-essential cookies are added later, the app should request consent before those cookies are used.",
        cookiesSection4Title: "Future changes",
        cookiesTitle: "Cookie Policy",
        contact: "Contact:",
        lastUpdated: "Last updated: August 5, 2026",
        privacyIntro: "This policy explains what data HLEDEJKURTY uses while helping visitors find padel court availability in Prague.",
        privacySection1Title: "Who operates this service",
        privacySection2Body1: "The app does not create user accounts, take payments, or accept bookings. Your selected date, duration, court count, court type, and time window are used to request availability. Theme and language preferences are stored in your browser as local storage under",
        privacySection2Body2: "Hosting, API infrastructure, and PostHog analytics may process standard technical data such as IP address, request URL, browser user agent, timestamps, error diagnostics, page views, filter changes, club selections, and booking-link clicks for security, operation, and product improvement.",
        privacySection2Title: "What we process",
        privacySection3Body: "Data is used to provide the search feature, keep the app secure, diagnose errors, remember basic interface preferences, and understand which parts of the app are useful. Club booking pages opened from this app are external services with their own privacy rules.",
        privacySection3Title: "Why we process it",
        privacySection4Body: "The app itself does not store visitor profiles. Technical logs, if enabled by hosting infrastructure, should be kept only for a limited operational period. Visitors in the EU can request access, correction, deletion, restriction, or objection under GDPR once the production operator contact is published.",
        privacySection4Title: "Retention and rights",
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
        switchToLightMode: "Перемкнути на світлу тему"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      allClubs: {
        emptyBody: "Спробуйте іншу назву клубу.",
        emptyTitle: "Клубів не знайдено",
        searchAria: "Пошук клубів за назвою",
        searchLabel: "Пошук",
        searchPlaceholder: "Назва клубу",
        tracked_one: "Відстежується {{count}} клуб",
        tracked_other: "Відстежується {{count}} клубів"
      },
      about: {
        body: "HLEDEJKURTY збирає доступні слоти для паделу із систем бронювання клубів у Празі та показує клуби, що відповідають вашій даті, тривалості, кількості кортів, часовому вікну та бажанню грати в залі чи надворі.",
        cardBookBody: "Коли знайдете відповідний слот, дія бронювання відкриє офіційну систему бронювання цього клубу.",
        cardBookTitle: "Бронювання у клубі",
        cardLimitsBody: "Доступність і ціни мають інформаційний характер. Сторінка бронювання клубу завжди є остаточним джерелом перед резервуванням.",
        cardLimitsTitle: "Прозорі обмеження",
        cardSearchBody: "Замість перевірки багатьох календарів вручну задайте фільтри один раз і побачте, де зараз є відповідні слоти.",
        cardSearchTitle: "Один пошук",
        title: "Знайдіть вільний корт для паделу без відкривання кожної системи бронювання."
      },
      availability: {
        checked: "Перевірено",
        checkedClubsTitle: "Перевірені клуби",
        checkedCount: "перевірено",
        failedJson: "Відповідь про доступність була не у форматі JSON",
        failedLoad: "Не вдалося завантажити доступність",
        noCheckedClubs: "Клуби ще не перевірено",
        notLoaded: "Доступність кортів не завантажена",
        recent: "щойно",
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
        noMatchingBody: "Спробуйте коротшу тривалість, менше кортів або інший день.",
        noMatchingTitle: "Немає відповідних клубів",
        noSlotsBody: "Змініть фільтри або поверніться, щоб побачити інші відповідні клуби.",
        noSlotsTitle: "Немає слотів для цього клубу",
        notPublished: "Не опубліковано",
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
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Юридичне",
        badgeTerms: "Умови",
        cookiesIntro: "Ця сторінка пояснює використання сховища браузера HLEDEJKURTY.",
        cookiesSection1Body: "HLEDEJKURTY може використовувати продуктову аналітику PostHog, щоб розуміти анонімне використання: перегляди сторінок, зміни фільтрів, вибір клубів і кліки на посилання бронювання. Застосунок також зберігає вибір теми та мови у local storage браузера, щоб налаштування зберігалися між візитами.",
        cookiesSection1Title: "Поточне використання cookies",
        cookiesSection2Body: "Налаштування теми та мови є функціональним сховищем. Аналітичне сховище використовується лише для розуміння використання цього застосунку й не використовується для реклами. Ви можете очистити сховище браузера будь-коли в налаштуваннях браузера.",
        cookiesSection2Title: "Строго необхідне сховище",
        cookiesSection3Body: "Коли ви відкриваєте систему бронювання клубу, цей зовнішній сайт може використовувати власні cookies або подібні технології. Перевірте інформацію клубу чи провайдера бронювання перед бронюванням.",
        cookiesSection3Title: "Сторонні сайти",
        cookiesSection4Body: "Якщо пізніше буде додано аналітику, рекламу чи інші необов'язкові cookies, застосунок має запросити згоду перед їх використанням.",
        cookiesSection4Title: "Майбутні зміни",
        cookiesTitle: "Політика cookies",
        contact: "Контакт:",
        lastUpdated: "Останнє оновлення: 5 серпня 2026",
        privacyIntro: "Ця політика пояснює, які дані HLEDEJKURTY використовує, допомагаючи відвідувачам знаходити доступність падел-кортів у Празі.",
        privacySection1Title: "Хто керує сервісом",
        privacySection2Body1: "Застосунок не створює облікові записи, не приймає платежі й не приймає бронювання. Вибрана дата, тривалість, кількість кортів, тип корту та часове вікно використовуються для запиту доступності. Налаштування теми та мови зберігаються у браузері як local storage під",
        privacySection2Body2: "Хостингова й API-інфраструктура, а також аналітика PostHog можуть обробляти стандартні технічні дані: IP-адресу, URL запиту, user agent браузера, часові позначки, діагностику помилок, перегляди сторінок, зміни фільтрів, вибір клубів і кліки на посилання бронювання для безпеки, роботи сервісу та покращення продукту.",
        privacySection2Title: "Що ми обробляємо",
        privacySection3Body: "Дані використовуються для роботи пошуку, безпеки застосунку, діагностики помилок, запам'ятовування базових налаштувань інтерфейсу та розуміння, які частини застосунку корисні. Сторінки бронювання клубів, відкриті із застосунку, є зовнішніми сервісами з власними правилами приватності.",
        privacySection3Title: "Навіщо ми це обробляємо",
        privacySection4Body: "Сам застосунок не зберігає профілі відвідувачів. Технічні журнали, якщо вони ввімкнені хостинговою інфраструктурою, мають зберігатися лише протягом обмеженого операційного періоду. Відвідувачі в ЄС можуть запитувати доступ, виправлення, видалення, обмеження або заперечення згідно з GDPR після публікації контакту оператора.",
        privacySection4Title: "Зберігання та права",
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
        switchToLightMode: "Přepnout na světlý režim"
      },
      brand: {
        name: "HLEDEJKURTY"
      },
      allClubs: {
        emptyBody: "Zkuste jiný název klubu.",
        emptyTitle: "Žádné kluby nenalezeny",
        searchAria: "Hledat kluby podle názvu",
        searchLabel: "Hledat",
        searchPlaceholder: "Název klubu",
        tracked_one: "Sleduje se {{count}} klub",
        tracked_other: "Sleduje se {{count}} klubů"
      },
      about: {
        body: "HLEDEJKURTY shromažďuje volné padelové časy z rezervačních systémů klubů v Praze a ukazuje kluby, které odpovídají vašemu datu, délce hry, počtu kurtů, časovému oknu a volbě hry v hale nebo venku.",
        cardBookBody: "Když najdete vhodný čas, akce rezervace otevře oficiální rezervační systém daného klubu.",
        cardBookTitle: "Rezervace u klubu",
        cardLimitsBody: "Dostupnost a ceny jsou informativní. Rezervační stránka klubu je vždy finálním zdrojem před rezervací.",
        cardLimitsTitle: "Transparentní limity",
        cardSearchBody: "Místo ruční kontroly mnoha kalendářů nastavíte filtr jednou a uvidíte, které kluby mají odpovídající časy.",
        cardSearchTitle: "Jedno hledání",
        title: "Najděte volný padelový kurt bez otevírání každého rezervačního systému."
      },
      availability: {
        checked: "Ověřeno",
        checkedClubsTitle: "Zkontrolované kluby",
        checkedCount: "ověřeno",
        failedJson: "Odpověď dostupnosti nebyla JSON",
        failedLoad: "Nepodařilo se načíst dostupnost",
        noCheckedClubs: "Zatím nebyly zkontrolovány žádné kluby",
        notLoaded: "Dostupnost kurtů není načtená",
        recent: "nedávno",
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
        noMatchingBody: "Zkuste kratší délku, méně kurtů nebo jiný den.",
        noMatchingTitle: "Žádné odpovídající kluby",
        noSlotsBody: "Změňte filtry nebo se vraťte a zobrazte jiné odpovídající kluby.",
        noSlotsTitle: "Pro tento klub nejsou žádné časy",
        notPublished: "Nezveřejněno",
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
      legal: {
        badgeCookies: "Cookies",
        badgeLegal: "Právní",
        badgeTerms: "Podmínky",
        cookiesIntro: "Tato stránka vysvětluje používání úložiště prohlížeče službou HLEDEJKURTY.",
        cookiesSection1Body: "HLEDEJKURTY může používat produktovou analytiku PostHog, aby rozuměl anonymnímu používání, například zobrazením stránek, změnám filtrů, výběrům klubů a kliknutím na rezervační odkazy. Aplikace také ukládá volbu tématu a jazyka do local storage prohlížeče, aby nastavení přetrvalo mezi návštěvami.",
        cookiesSection1Title: "Aktuální použití cookies",
        cookiesSection2Body: "Nastavení tématu a jazyka jsou funkční úložiště. Analytické úložiště se používá pouze k porozumění používání této aplikace a ne pro reklamu. Úložiště prohlížeče můžete kdykoli vymazat v nastavení prohlížeče.",
        cookiesSection2Title: "Nezbytné úložiště",
        cookiesSection3Body: "Když otevřete rezervační systém klubu, externí web může používat vlastní cookies nebo podobné technologie. Před rezervací zkontrolujte informace klubu nebo poskytovatele rezervací.",
        cookiesSection3Title: "Weby třetích stran",
        cookiesSection4Body: "Pokud budou později přidány analytické, reklamní nebo jiné nepovinné cookies, aplikace by měla před jejich použitím vyžádat souhlas.",
        cookiesSection4Title: "Budoucí změny",
        cookiesTitle: "Zásady cookies",
        contact: "Kontakt:",
        lastUpdated: "Poslední aktualizace: 5. srpna 2026",
        privacyIntro: "Tyto zásady vysvětlují, jaká data HLEDEJKURTY používá při pomoci návštěvníkům najít dostupnost padelových kurtů v Praze.",
        privacySection1Title: "Kdo službu provozuje",
        privacySection2Body1: "Aplikace nevytváří uživatelské účty, nepřijímá platby ani rezervace. Vybrané datum, délka, počet kurtů, typ kurtu a časové okno se používají k načtení dostupnosti. Nastavení tématu a jazyka jsou uložena ve vašem prohlížeči jako local storage pod",
        privacySection2Body2: "Hostingová a API infrastruktura a analytika PostHog mohou zpracovávat standardní technická data, jako je IP adresa, URL požadavku, user agent prohlížeče, časové značky, diagnostika chyb, zobrazení stránek, změny filtrů, výběry klubů a kliknutí na rezervační odkazy pro bezpečnost, provoz a zlepšování produktu.",
        privacySection2Title: "Co zpracováváme",
        privacySection3Body: "Data se používají k poskytnutí vyhledávání, zabezpečení aplikace, diagnostice chyb, zapamatování základních nastavení rozhraní a porozumění tomu, které části aplikace jsou užitečné. Rezervační stránky klubů otevřené z aplikace jsou externí služby s vlastními pravidly ochrany soukromí.",
        privacySection3Title: "Proč to zpracováváme",
        privacySection4Body: "Aplikace sama neukládá profily návštěvníků. Technické logy, pokud jsou v hostingové infrastruktuře zapnuté, by měly být uchovávány jen po omezenou provozní dobu. Návštěvníci v EU mohou požádat o přístup, opravu, výmaz, omezení nebo námitku podle GDPR po zveřejnění kontaktu provozovatele.",
        privacySection4Title: "Uchování a práva",
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
