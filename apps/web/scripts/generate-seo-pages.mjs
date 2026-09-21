import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://hledejkurty.cz";
// Keep sitemap dates tied to real content changes. Using the build date here makes
// every URL look newly updated after every deploy and wastes crawler attention.
const SEO_CONTENT_LAST_MODIFIED = "2026-09-21";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const template = await readFile(path.join(distDir, "index.html"), "utf8");

const languages = [
  { code: "cz", html: "cs", hreflang: "cs", prefix: "", og: "cs_CZ" },
  { code: "en", html: "en", hreflang: "en", prefix: "/en", og: "en_US" },
  { code: "ua", html: "uk", hreflang: "uk", prefix: "/ua", og: "uk_UA" }
];

const clubs = [
  ["tk-sparta-praha", "TK Sparta Prague", "Za Císařským mlýnem 1115/2, 170 00 Praha 7-Bubeneč", 2, true],
  ["padel-prosek", "Padel Prosek", "Lovosická 559, 190 00 Praha 9-Střížkov", 4, true],
  ["padel-club-spoje", "Padel Club Spoje", "Na Balkáně 990/21A, 130 00 Praha", 2, false],
  ["tenis-a-padel-klub-pisecna", "Tenis & Padel klub Písečná", "K Sadu 590/1, Praha 8 - Troja, 182 00 Praha", 4, false],
  ["sk-slavia-praha-padel", "SK Slavia Praha Padel", "Vladivostocká 1460/10, Praha 10", 4, false],
  ["head-tenis-centrum-vestec", "Head Tenis Centrum, Vestec", "Sportovní 456, 252 42 Vestec-Jesenice u Prahy", 4, true],
  ["plechovka-dubec", "Plechovka Dubeč", "Kalašova, č.e. 196, 107 00 Praha-Dubeč", 3, true],
  ["padel-radotin", "Padel Radotín", "Šárovo kolo 932/1, 153 00 Praha 16", 3, true],
  ["padel-hall-radotin", "Padel Hall Olympia Radotín", "Ke Zděři 1741/21, 153 00 Praha 16-Radotín", 1, false],
  ["padel-cakovice", "Padel Čakovice", "Jizerská 328/4, 196 00 Praha-Čakovice", 2, false],
  ["padel-neride", "Padel Neride", "V Chotejně 700, 102 00 Praha 15", 3, true],
  ["padel-dzus", "Padel Džus", "U Továren 999/31, 102 00 Praha 15-Hostivař", 4, true],
  ["padel-powers-smichov", "Padel Powers Smíchov", "Křížová 6, 150 00 Praha 5-Smíchov", 8, true],
  ["one-padel", "One Padel", "Ringhofferova 115, 155 21 Praha 17-Zličín", 9, false],
  ["cisarska-louka-padel", "Císařská louka Padel", "Areál Císařská louka, Praha 5-Smíchov", 3, true],
  ["sk-satalice", "SK Satalice", "Budovatelská 12, 190 15 Praha-Satalice", 2, false],
  ["the-court", "The Court", "Mezi Stromy 507, 252 25 Jinočany", 3, false, true],
  ["ltc-modrany-2005", "LTC Modřany", "Komořanská 2229/49, 143 00 Praha 4-Modřany", 3, false]
].map(([slug, name, address, courtCount, multisport, singles]) => ({ slug, name, address, courtCount, multisport, singles }));

const copy = {
  cz: {
    nav: ["Hledat dostupnost", "Kluby", "Články", "Jak to funguje", "Ochrana soukromí", "Podmínky", "Cookies"],
    pages: {
      home: ["Volné padelové kurty Praha na jednom místě | HLEDEJKURTY", "Najděte volné padelové kurty v Praze na jednom místě. Porovnejte dostupnost, ceny, typ kurtu a Multisport a rezervujte přímo u klubu.", "Najděte volné padelové kurty v Praze na jednom místě", "Porovnejte pravidelně aktualizovanou dostupnost podporovaných pražských padelových klubů v jediném přehledu a rezervaci dokončete v oficiálním systému vybraného klubu."],
      allClubs: ["Padelové kluby v Praze | HLEDEJKURTY", "Seznam padelových klubů v Praze s adresami, cenami, typy kurtů, podporou Multisport a odkazy na oficiální rezervace.", "Všechny padelové kluby", "Porovnejte sledované padelové kluby v Praze a okolí. Na detailu najdete adresu, počet kurtů, ceny, dostupnost a odkaz na oficiální rezervaci."],
      about: ["O vyhledávači padelových kurtů | HLEDEJKURTY", "Zjistěte, jak HLEDEJKURTY shromažďuje a zobrazuje dostupnost padelových kurtů v Praze a jak dokončit rezervaci.", "Jak funguje hledání padelových kurtů", "HLEDEJKURTY pravidelně shromažďuje dostupnost z podporovaných rezervačních systémů v Praze. Vyhledávat můžete podle data, délky hry, počtu kurtů, času a typu kurtu."],
      privacy: ["Ochrana osobních údajů | HLEDEJKURTY", "Přečtěte si zásady ochrany soukromí HLEDEJKURTY včetně předvoleb prohlížeče, analytiky, technických logů a práv návštěvníků.", "Ochrana osobních údajů", "Službu HLEDEJKURTY provozuje Dmytro Zhyrov. Služba nevytváří uživatelské účty, nepřijímá platby ani rezervace kurtů. Zásady popisují omezené technické údaje používané k provozu služby."],
      terms: ["Podmínky používání | HLEDEJKURTY", "Přečtěte si podmínky používání HLEDEJKURTY a omezení informací o dostupnosti, cenách a rezervačních odkazech třetích stran.", "Podmínky používání", "HLEDEJKURTY pomáhá vyhledat možné volné termíny, ale kurty neprodává, nerezervuje ani nepotvrzuje. Konečným zdrojem je vždy systém klubu."],
      cookies: ["Zásady cookies | HLEDEJKURTY", "Informace o úložišti prohlížeče, funkčních předvolbách, analytice a externích rezervačních webech používaných se službou HLEDEJKURTY.", "Zásady cookies", "Zásady vysvětlují úložiště prohlížeče používané pro nastavení rozhraní a analytiku i samostatná pravidla na externích rezervačních webech."]
    },
    sections: {
      home: [["Vyhledejte aktuální dostupnost", "Vyberte datum, délku hry, počet potřebných kurtů, typ kurtu a časové rozmezí. HLEDEJKURTY porovná nejnovější uloženou dostupnost podporovaných pražských klubů v jediném přehledu pro dnešek i následujících sedm dní."], ["Porovnejte kurty před rezervací", "Výsledky spojují volné začátky hry, zveřejněné hodinové ceny, vnitřní nebo venkovní kurty, otevírací dobu a podporu Multisport. Dostupnost se během dne pravidelně aktualizuje."], ["Rezervujte u oficiálního klubu", "HLEDEJKURTY je vyhledávací a srovnávací služba, nikoli poskytovatel rezervací. Vždy otevřete oficiální stránku klubu, potvrďte volný termín i konečnou cenu a dokončete rezervaci přímo u provozovatele."]],
      clubs: [["Porovnejte pražské padelové kluby", "Na stránce každého klubu najdete adresu, počet kurtů, zveřejněné ceny, podporu Multisport a odkaz do oficiálního rezervačního systému. Seznam zahrnuje Prahu i vybrané lokality v jejím okolí."], ["Zkontrolujte nedávnou dostupnost", "Výsledky používají dostupnost uloženou z podporovaných klubových systémů pro dnešek a následujících sedm dní. Data se během dne obnovují, konečným zdrojem však zůstává systém klubu."]],
      club: [["Dostupnost a oficiální rezervace", "HLEDEJKURTY ukládá dostupnost pro dnešek a následujících sedm dní a podporované zdroje během dne pravidelně obnovuje. Termíny se mohou mezi kontrolami změnit, proto v oficiálním systému klubu potvrďte kurt, konečnou cenu a podmínky rezervace."], ["Porovnejte padelové kluby v Praze", "Prohlédněte si všechny sledované kluby a porovnejte adresy, počet kurtů, ceny, vybavení, podporu Multisport a poslední dostupnost před výběrem místa pro hru. Rezervaci vždy dokončete u konkrétního provozovatele."], ["Aktuální informace před hrou", "Dostupnost a zveřejněné ceny mají informativní charakter. Před cestou zkontrolujte oficiální systém, provozní dobu a pravidla klubu, protože rezervace ostatních hráčů mohou dostupný termín rychle změnit."]]
    },
    labels: ["Adresa", "Kurty", "Cena", "Aktuální zveřejněné ceny najdete v přehledu klubu", "Klub uvádí podporu Multisport.", "Přijímané platební metody ověřte přímo u klubu.", "Všechny sledované kluby", "Hledat dostupnost kurtů", "Informace o klubu"],
    count: (n) => `${n} padelových kurtů`, clubTitle: (name) => `${name} padel Praha | HLEDEJKURTY`, clubDescription: (club) => `${club.name}: ${club.courtCount} padelových kurtů, ${club.address}. Zkontrolujte volné časy, zveřejněné ceny a rezervujte přes oficiální systém.`
  },
  en: {
    nav: ["Search availability", "Clubs", "Blog", "How it works", "Privacy", "Terms", "Cookies"],
    pages: {
      home: ["Free padel courts in Prague in one place | HLEDEJKURTY", "Find free padel courts in Prague in one place. Compare availability, prices, court types, and Multisport, then book directly with the club.", "Find free padel courts in Prague in one place", "Compare regularly updated availability from supported Prague padel clubs in a single overview, then complete your reservation in the club's official booking system."],
      allClubs: ["Padel clubs in Prague | HLEDEJKURTY", "Browse padel clubs in Prague with addresses, court counts, indoor or outdoor facilities, published prices, Multisport information, and booking links.", "All padel clubs", "Compare tracked padel clubs around Prague and open a detailed page for court information, prices, availability, and official booking links."],
      about: ["About the Prague padel court finder | HLEDEJKURTY", "Learn how HLEDEJKURTY collects and presents padel court availability for supported clubs in Prague and how to confirm a booking.", "How the padel court finder works", "HLEDEJKURTY regularly gathers padel availability from supported club booking systems around Prague. Search by date, duration, court count, time window, and indoor or outdoor preference."],
      privacy: ["Privacy Policy | HLEDEJKURTY", "Read the HLEDEJKURTY privacy policy, including browser preferences, analytics, infrastructure logs, and visitor rights.", "Privacy Policy", "HLEDEJKURTY is operated by Dmytro Zhyrov. The service does not create visitor accounts, take payments, or accept court bookings. This policy explains the limited technical data used to operate the service."],
      terms: ["Terms of Use | HLEDEJKURTY", "Read the terms for using HLEDEJKURTY and the limitations of third-party padel availability, prices, and booking links.", "Terms of Use", "HLEDEJKURTY helps visitors discover possible court times but does not sell, reserve, or confirm bookings. The official club system remains the final source."],
      cookies: ["Cookie Policy | HLEDEJKURTY", "Learn about browser storage, functional preferences, analytics, and third-party booking websites used with HLEDEJKURTY.", "Cookie Policy", "This policy explains browser storage used for interface preferences and analytics, plus separate cookie rules on external booking websites."]
    },
    sections: {
      home: [["Search current padel availability", "Choose a date, playing time, session length, number of courts, and indoor or outdoor preference. HLEDEJKURTY compares the latest saved availability for supported Prague clubs in one search, including today and the following seven days."], ["Compare courts before booking", "Results bring together available start times, published hourly prices, court type, opening hours, and Multisport information. Availability is refreshed throughout the day so you can narrow the options without opening every club's booking system."], ["Book through the official club", "HLEDEJKURTY is a search and comparison service, not a booking provider. Open the official reservation page, confirm that the time is still free, review the final price, and complete the booking directly with the venue."]],
      clubs: [["Compare Prague padel venues", "Use each club page to review its address, number of courts, published pricing, Multisport support, and a direct route to the official booking system. The list covers venues across Prague and selected nearby locations."], ["Check recent court availability", "Search results use availability saved from supported club systems for today and the next seven days. Data is refreshed during the day, but the club's reservation system is always the final source before booking."]],
      club: [["Availability and official booking", "HLEDEJKURTY stores availability for today and the next seven days and refreshes supported sources throughout the day. Times can change between checks, so open the venue's official reservation system to confirm the court, final price, and booking conditions."], ["Compare padel clubs in Prague", "Browse every tracked venue to compare addresses, court counts, prices, facilities, Multisport support, and recent availability before choosing where to play. Complete every reservation directly with the selected venue."], ["Current information before playing", "Availability and published prices are informational. Before travelling, check the official booking system, opening hours, and club rules because reservations made by other players can change an available time quickly."]]
    },
    labels: ["Address", "Courts", "Price", "Check current published prices in the club overview", "The club publishes Multisport support.", "Confirm accepted payment methods with the club.", "All tracked clubs", "Search court availability", "Club information"],
    count: (n) => `${n} padel courts`, clubTitle: (name) => `${name} padel court Prague | HLEDEJKURTY`, clubDescription: (club) => `${club.name}: ${club.courtCount} padel courts at ${club.address}. Check available times, published prices, and book through the official system.`
  },
  ua: {
    nav: ["Пошук доступності", "Клуби", "Статті", "Як це працює", "Конфіденційність", "Умови", "Cookies"],
    pages: {
      home: ["Вільні падел-корти Праги в одному місці | HLEDEJKURTY", "Знайдіть вільні падел-корти Праги в одному місці. Порівнюйте доступність, ціни, типи кортів і Multisport та бронюйте у клубі.", "Знайдіть вільні падел-корти Праги в одному місці", "Порівнюйте регулярно оновлювану доступність підтримуваних падел-клубів Праги в одному огляді та завершуйте бронювання в офіційній системі обраного клубу."],
      allClubs: ["Падел-клуби у Празі | HLEDEJKURTY", "Список падел-клубів у Празі з адресами, цінами, типами кортів, Multisport і посиланнями на офіційне бронювання.", "Усі падел-клуби", "Порівнюйте падел-клуби у Празі та поруч. На сторінці клубу доступні адреса, кількість кортів, ціни, доступність і офіційне бронювання."],
      about: ["Про пошук падел-кортів | HLEDEJKURTY", "Дізнайтеся, як HLEDEJKURTY збирає та показує доступність падел-кортів у Празі і як підтвердити бронювання.", "Як працює пошук падел-кортів", "HLEDEJKURTY регулярно збирає доступність із підтримуваних систем бронювання у Празі. Шукайте за датою, тривалістю, кількістю кортів, часом і типом корту."],
      privacy: ["Політика конфіденційності | HLEDEJKURTY", "Прочитайте політику конфіденційності HLEDEJKURTY про налаштування браузера, аналітику, технічні журнали та права відвідувачів.", "Політика конфіденційності", "Сервіс HLEDEJKURTY керується Dmytro Zhyrov. Сервіс не створює облікових записів, не приймає платежі й не бронює корти. Політика пояснює обмежені технічні дані для роботи сервісу."],
      terms: ["Умови використання | HLEDEJKURTY", "Прочитайте умови використання HLEDEJKURTY та обмеження інформації про доступність, ціни й зовнішні посилання на бронювання.", "Умови використання", "HLEDEJKURTY допомагає знайти можливі вільні години, але не продає, не резервує й не підтверджує бронювання. Остаточним джерелом є система клубу."],
      cookies: ["Політика cookies | HLEDEJKURTY", "Інформація про сховище браузера, функціональні налаштування, аналітику та зовнішні сайти бронювання, пов’язані з HLEDEJKURTY.", "Політика cookies", "Політика пояснює використання сховища браузера для налаштувань інтерфейсу й аналітики та окремі правила на зовнішніх сайтах бронювання."]
    },
    sections: {
      home: [["Шукайте актуальну доступність", "Виберіть дату, тривалість гри, кількість потрібних кортів, тип корту й часовий проміжок. HLEDEJKURTY порівняє найновішу збережену доступність підтримуваних празьких клубів для сьогоднішнього дня та наступних семи днів."], ["Порівнюйте корти перед бронюванням", "Результати поєднують вільний час початку, опубліковані погодинні ціни, криті або відкриті корти, години роботи та підтримку Multisport. Доступність регулярно оновлюється протягом дня."], ["Бронюйте в офіційному клубі", "HLEDEJKURTY є сервісом пошуку та порівняння, а не постачальником бронювань. Відкрийте офіційну сторінку клубу, підтвердьте вільний час і кінцеву ціну та завершіть бронювання безпосередньо у закладі."]],
      clubs: [["Порівнюйте празькі падел-клуби", "На сторінці кожного клубу можна переглянути адресу, кількість кортів, опубліковані ціни, підтримку Multisport і перейти до офіційної системи бронювання. Список охоплює Прагу та вибрані місця поблизу."], ["Перевіряйте нещодавню доступність", "Результати використовують доступність із підтримуваних клубних систем для сьогоднішнього дня та наступних семи днів. Дані оновлюються протягом дня, але остаточним джерелом залишається система клубу."]],
      club: [["Доступність та офіційне бронювання", "HLEDEJKURTY зберігає доступність для сьогоднішнього дня та наступних семи днів і регулярно оновлює підтримувані джерела. Час може змінитися між перевірками, тому підтвердьте корт, кінцеву ціну й умови в офіційній системі клубу."], ["Порівняйте падел-клуби у Празі", "Перегляньте всі відстежувані клуби та порівняйте адреси, кількість кортів, ціни, обладнання, підтримку Multisport й останню доступність перед вибором місця для гри. Завершуйте бронювання безпосередньо в обраному закладі."], ["Актуальна інформація перед грою", "Доступність та опубліковані ціни мають інформаційний характер. Перед поїздкою перевірте офіційну систему, години роботи й правила клубу, адже бронювання інших гравців може швидко змінити вільний час."]]
    },
    labels: ["Адреса", "Корти", "Ціна", "Актуальні опубліковані ціни перевіряйте в огляді клубу", "Клуб повідомляє про підтримку Multisport.", "Уточніть способи оплати безпосередньо в клубі.", "Усі відстежувані клуби", "Шукати доступність кортів", "Інформація про клуб"],
    count: (n) => `${n} падел-кортів`, clubTitle: (name) => `${name} падел у Празі | HLEDEJKURTY`, clubDescription: (club) => `${club.name}: ${club.courtCount} падел-кортів, ${club.address}. Перевірте вільний час, опубліковані ціни та бронюйте в офіційній системі.`
  }
};

const newsContent = {
  publishedAt: "2026-09-13",
  slug: "the-court-opening",
  image: `${SITE_ORIGIN}/clubs/optimized/the-court-1200.webp`,
  cz: {
    index: ["Články o padelu: tipy a kluby v Praze | HLEDEJKURTY", "Průvodci po padelových klubech, výběry nejlepších kurtů, tipy pro hráče, Multisport a novinky z padelové komunity v Praze.", "Články o padelu", "Průvodci, výběry klubů, tipy pro hráče i novinky z padelové komunity v Praze a okolí."],
    title: "The Court přináší padel nové generace kousek za Prahu",
    description: "Dva panoramatické kurty s chytrým sledováním zápasů, samostatný kurt 1vs1 a míčový automat zdarma. Poznejte nový The Court v Jinočanech.",
    sections: [["Single kurt 1vs1", "Samostatný menší kurt je určený pro dynamickou hru jednoho proti jednomu i cílený trénink s míčovým automatem, který bude dostupný zdarma."], ["AI záznam zápasů", "Dva standardní panoramatické kurty využívají chytrý systém pro automatické skóre a videozáznam hry dostupný v telefonu. Záznam lze využít pro sdílení i zpětnou analýzu hry."], ["Komfort po celý rok", "Klub uvádí stálou teplotu 22 °C, vodu a ručníky na kurtu, bar, vybavené sprchy a dětský koutek. Sídlí v Jinočanech a má otevřeno každý den od 7:00 do půlnoci."], ["The Court nově v HLEDEJKURTY", "The Court jsme přidali do sledovaného systému HLEDEJKURTY. Na detailu klubu najdete dostupnost obou standardních kurtů i kurtu Super Single 1vs1. Celkem nyní sledujeme 18 padelových klubů."]]
  },
  en: {
    index: ["Padel blog: guides and clubs in Prague | HLEDEJKURTY", "Padel club guides, indoor-court roundups, player tips, Multisport comparisons, and stories from Prague's padel community.", "Padel blog", "Guides, club roundups, player tips, and stories from the padel community in and around Prague."],
    title: "The Court brings next-generation padel just outside Prague",
    description: "Two panoramic courts with smart match tracking, a dedicated 1vs1 court, and a free ball machine. Meet the new The Court club in Jinočany.",
    sections: [["1vs1 singles court", "The dedicated compact court is made for fast one-on-one games and focused practice with a ball machine that will be available free of charge."], ["AI match recording", "The two standard panoramic courts use a smart system for automatic scoring and match video delivered to your phone. Footage can be shared or used to review movement and positioning."], ["Year-round comfort", "The club advertises a steady 22 °C, courtside water and towels, a bar, equipped showers, and a children's corner. It is based in Jinočany and opens every day from 7:00 until midnight."], ["The Court is now tracked by HLEDEJKURTY", "We have added The Court to HLEDEJKURTY. Its club page shows availability for both standard courts and the Super Single 1vs1 court. The catalog now contains 18 tracked padel clubs."]]
  },
  ua: {
    index: ["Статті про падел: поради та клуби Праги | HLEDEJKURTY", "Гайди по падел-клубах, добірки найкращих кортів, поради гравцям, Multisport та історії падел-спільноти Праги.", "Статті про падел", "Гайди, добірки клубів, поради гравцям та історії падел-спільноти Праги й околиць."],
    title: "The Court відкриває падел нового покоління поруч із Прагою",
    description: "Два панорамні корти з розумним відстеженням матчів, окремий корт 1vs1 і безкоштовна машина для м’ячів у новому The Court.",
    sections: [["Одиночний корт 1vs1", "Окремий компактний корт створений для динамічної гри один на один і тренувань із машиною для м’ячів, яка буде доступна без додаткової оплати."], ["AI-запис матчів", "Два стандартні панорамні корти використовують розумну систему автоматичного рахунку й відеозапису на телефон. Відео можна поширювати або використовувати для аналізу руху й позиції."], ["Комфорт упродовж року", "Клуб повідомляє про постійну температуру 22 °C, воду й рушники біля корту, бар, обладнані душові та дитячий куточок. Він розташований у Їночанах і працює щодня з 7:00 до опівночі."], ["The Court тепер відстежується в HLEDEJKURTY", "Ми додали The Court до HLEDEJKURTY. На сторінці клубу показано доступність двох стандартних кортів і корту Super Single 1vs1. Загалом каталог містить 18 падел-клубів."]]
  }
};

const basePages = [
  ["home", "/"], ["allClubs", "/clubs/"], ["news", "/blog/"], ["newsArticle", `/blog/${newsContent.slug}/`], ["about", "/about/"], ["privacy", "/privacy-policy/"], ["terms", "/terms-of-use/"], ["cookies", "/cookie-policy/"],
  ...clubs.map((club) => ["club", `/clubs/${club.slug}/`, club])
].map(([key, basePath, club]) => ({ key, basePath, club, lastModified: SEO_CONTENT_LAST_MODIFIED }));
const pages = languages.flatMap((language) => basePages.map((page) => localizePage(page, language)));

for (const page of pages) {
  const output = page.path === "/" ? path.join(distDir, "index.html") : path.join(distDir, page.path.slice(1), "index.html");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, renderPage(page));
}
await writeFile(path.join(distDir, "404.html"), renderNotFoundPage(pages.find((page) => page.path === "/")));
await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(pages));

function localizePage(page, language) {
  const localized = copy[language.code];
  const localizedNews = newsContent[language.code];
  if (page.key === "news") {
    const [title, description, h1, body] = localizedNews.index;
    return { ...page, language, path: localPath(page.basePath, language), title, description, h1, body, news: localizedNews };
  }
  if (page.key === "newsArticle") {
    return { ...page, language, path: localPath(page.basePath, language), title: `${localizedNews.title} | HLEDEJKURTY`, description: localizedNews.description, h1: localizedNews.title, body: localizedNews.description, article: localizedNews };
  }
  if (!page.club) {
    const [title, description, h1, body] = localized.pages[page.key];
    return { ...page, language, path: localPath(page.basePath, language), title, description, h1, body };
  }
  return { ...page, language, path: localPath(page.basePath, language), title: localized.clubTitle(page.club.name), description: localized.clubDescription(page.club), h1: page.club.name, body: `${page.club.name}: ${localized.count(page.club.courtCount)} — ${page.club.address}. ${localized.labels[3]}.` };
}

function renderPage(page) {
  const canonical = new URL(page.path, SITE_ORIGIN).toString();
  const image = page.club ? `${SITE_ORIGIN}/clubs/optimized/${page.club.slug}-1200.webp` : page.key === "newsArticle" ? newsContent.image : `${SITE_ORIGIN}/logo.png`;
  let html = template.replace(/<html lang="[^"]*">/, `<html lang="${page.language.html}">`);
  html = replaceTag(html, "title", page.title);
  for (const [attribute, key, value] of [["name", "description", page.description], ["property", "og:type", page.key === "newsArticle" ? "article" : "website"], ["property", "og:title", page.title], ["property", "og:description", page.description], ["property", "og:url", canonical], ["property", "og:image", image], ["property", "og:image:alt", socialAlt(page)], ["property", "og:locale", page.language.og], ["name", "twitter:title", page.title], ["name", "twitter:description", page.description], ["name", "twitter:image", image], ["name", "twitter:image:alt", socialAlt(page)]]) html = replaceMeta(html, attribute, key, value);
  html = html.replace(/\s*<meta property="og:locale:alternate"[^>]*>/g, "");
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+"\s*\/>/g, "");
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  html = html.replace("</head>", `${alternateTags(page)}\n    <script id="seo-structured-data" type="application/ld+json">${safeJson(structuredData(page, canonical, image))}</script>\n  </head>`);
  return html.replace('<div id="root"></div>', `<div id="root">${visibleContent(page)}</div>`);
}

function renderNotFoundPage(homePage) {
  return renderPage(homePage).replace(
    /<meta name="robots" content="[^"]*"\s*\/>/,
    '<meta name="robots" content="noindex,follow" />'
  );
}

function visibleContent(page) {
  const localized = copy[page.language.code];
  const [search, clubsLabel, newsLabel, about, privacy, terms, cookies] = localized.nav;
  const clubLinks = clubs.map((club) => `<li><a href="${localPath(`/clubs/${club.slug}/`, page.language)}">${escapeHtml(club.name)}</a><span>${escapeHtml(localized.count(club.courtCount))} · ${escapeHtml(club.address)}</span></li>`).join("");
  let details = "";
  if (page.key === "home") details = `${sections(localized.sections.home)}<section><h2>${escapeHtml(clubsLabel)}</h2><p>${escapeHtml(localized.sections.clubs[0][1])}</p><ul class="seoPrerenderClubs">${clubLinks}</ul></section>`;
  else if (page.key === "allClubs") details = `${sections(localized.sections.clubs)}<section><h2>${escapeHtml(localized.labels[6])}</h2><ul class="seoPrerenderClubs">${clubLinks}</ul></section>`;
  else if (page.key === "news") details = `<section><h2><a href="${localPath(`/blog/${newsContent.slug}/`, page.language)}">${escapeHtml(page.news.title)}</a></h2><p>${escapeHtml(page.news.description)}</p></section>${sections(page.news.sections)}`;
  else if (page.key === "newsArticle") details = `${sections(page.article.sections)}<p><a class="seoPrerenderCta" href="${localPath("/clubs/the-court/", page.language)}">The Court</a> <a href="https://www.instagram.com/the_court_padel_/">Instagram</a> <a href="https://thecourt.cz/">${escapeHtml(page.article.title)}</a></p>`;
  else if (page.club) details = clubDetails(page.club, page.language);
  else details = `<section><h2>${escapeHtml(about)}</h2><p><a href="${localPath("/clubs/", page.language)}">${escapeHtml(localized.sections.clubs[0][1])}</a></p></section>`;
  return `<main class="seoPrerender"><header class="seoPrerenderHeader"><a class="seoPrerenderBrand" href="${localPath("/", page.language)}">HLEDEJKURTY</a><nav class="seoPrerenderNav" aria-label="Primary navigation"><a href="${localPath("/", page.language)}">${escapeHtml(search)}</a><a href="${localPath("/clubs/", page.language)}">${escapeHtml(clubsLabel)}</a><a href="${localPath("/blog/", page.language)}">${escapeHtml(newsLabel)}</a><a href="${localPath("/about/", page.language)}">${escapeHtml(about)}</a></nav></header><article><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.body)}</p>${details}</article><footer class="seoPrerenderFooter"><a href="${localPath("/blog/", page.language)}">${escapeHtml(newsLabel)}</a><a href="${localPath("/about/", page.language)}">${escapeHtml(about)}</a><a href="${localPath("/privacy-policy/", page.language)}">${escapeHtml(privacy)}</a><a href="${localPath("/terms-of-use/", page.language)}">${escapeHtml(terms)}</a><a href="${localPath("/cookie-policy/", page.language)}">${escapeHtml(cookies)}</a></footer></main>`;
}

function clubDetails(club, language) {
  const localized = copy[language.code];
  const multisport = club.multisport ? localized.labels[4] : localized.labels[5];
  const singles = club.singles ? `<li><strong>1vs1</strong><span>1 single court</span></li>` : "";
  return `<section><h2>${escapeHtml(localized.labels[8])}</h2><ul class="seoPrerenderFacts"><li><strong>${escapeHtml(localized.labels[0])}</strong><span>${escapeHtml(club.address)}</span></li><li><strong>${escapeHtml(localized.labels[1])}</strong><span>${escapeHtml(localized.count(club.courtCount))}</span></li>${singles}<li><strong>${escapeHtml(localized.labels[2])}</strong><span>${escapeHtml(localized.labels[3])}</span></li><li><strong>Multisport</strong><span>${escapeHtml(multisport)}</span></li></ul></section>${sections(localized.sections.club)}<a class="seoPrerenderCta" href="${localPath("/", language)}">${escapeHtml(localized.labels[7])}</a>`;
}

function sections(values) { return values.map(([heading, body]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join(""); }
function socialAlt(page) { return page.club ? `${page.club.name} padel Prague` : page.key === "newsArticle" ? page.h1 : "HLEDEJKURTY padel Prague"; }
function alternateUrls(basePath) { return languages.map((language) => [language.hreflang, new URL(localPath(basePath, language), SITE_ORIGIN).toString()]); }
function alternateTags(page) {
  const og = languages.filter((language) => language.code !== page.language.code).map((language) => `    <meta property="og:locale:alternate" content="${language.og}" />`).join("\n");
  const values = [...alternateUrls(page.basePath), ["x-default", new URL(page.basePath, SITE_ORIGIN).toString()]];
  return `${og}\n${values.map(([lang, href]) => `    <link rel="alternate" hreflang="${lang}" href="${href}" />`).join("\n")}`;
}
function structuredData(page, canonical, image) {
  const content = { "@type": page.key === "newsArticle" ? "Article" : "WebPage", "@id": `${canonical}#webpage`, name: page.title, description: page.description, url: canonical, image, inLanguage: page.language.html, isPartOf: { "@id": `${SITE_ORIGIN}/#website` } };
  if (page.key === "newsArticle") Object.assign(content, { headline: page.h1, datePublished: newsContent.publishedAt, dateModified: page.lastModified, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Dmytro Zhyrov" }, publisher: { "@type": "Organization", name: "HLEDEJKURTY", logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/logo.png` } } });
  const breadcrumb = breadcrumbStructuredData(page, canonical);
  return { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, name: "HLEDEJKURTY", url: `${SITE_ORIGIN}/`, inLanguage: ["cs", "en", "uk"] }, content, ...(page.club ? [{ "@type": "SportsActivityLocation", "@id": `${canonical}#club`, name: page.club.name, address: { "@type": "PostalAddress", streetAddress: page.club.address, addressLocality: "Praha", addressCountry: "CZ" }, image, url: canonical }] : []), ...(breadcrumb ? [breadcrumb] : [])] };
}
function breadcrumbStructuredData(page, canonical) {
  if (page.key === "home") return null;
  const home = new URL(localPath("/", page.language), SITE_ORIGIN).toString();
  const items = [{ name: "HLEDEJKURTY", url: home }];
  if (page.club) items.push({ name: copy[page.language.code].nav[1], url: new URL(localPath("/clubs/", page.language), SITE_ORIGIN).toString() });
  if (page.key === "newsArticle") items.push({ name: copy[page.language.code].nav[2], url: new URL(localPath("/blog/", page.language), SITE_ORIGIN).toString() });
  items.push({ name: page.h1, url: canonical });
  return { "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })) };
}
function buildSitemap(values) {
  const urls = values.map((page) => { const alternates = [...alternateUrls(page.basePath), ["x-default", new URL(page.basePath, SITE_ORIGIN).toString()]]; return `  <url>\n    <loc>${new URL(page.path, SITE_ORIGIN)}</loc>\n${alternates.map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`).join("\n")}\n    <lastmod>${page.lastModified}</lastmod>\n  </url>`; }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}
function localPath(basePath, language) { return language.prefix ? (basePath === "/" ? `${language.prefix}/` : `${language.prefix}${basePath}`) : basePath; }
function replaceTag(html, tag, value) { return html.replace(new RegExp(`<${tag}>[^<]*</${tag}>`), `<${tag}>${escapeHtml(value)}</${tag}>`); }
function replaceMeta(html, attribute, key, value) { const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapeRegex(key)}")[^>]*>`, "i"); return html.replace(pattern, (tag) => tag.replace(/content="[^"]*"/i, `content="${escapeHtml(value)}"`)); }
function safeJson(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
