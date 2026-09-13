import React from "react";
import { ArrowRight, Bot, CalendarDays, ExternalLink, Instagram, Sparkles, Target, Video } from "lucide-react";
import type { LanguageCode } from "./i18n";

export const THE_COURT_OPENING_SLUG = "the-court-opening";

type LocalizedArticle = {
  category: string;
  title: string;
  excerpt: string;
  intro: string;
  highlights: Array<{ title: string; body: string }>;
  sections: Array<{ title: string; paragraphs: string[]; clubLinkLabel?: string }>;
  sourceLabel: string;
  instagramLabel: string;
  clubLinkLabel: string;
};

export type NewsArticle = {
  slug: string;
  publishedAt: string;
  imageUrl: string;
  translations: Record<LanguageCode, LocalizedArticle>;
};

const newsCopy: Record<LanguageCode, { title: string; intro: string; readArticle: string; published: string }> = {
  cz: {
    title: "Články o padelu",
    intro: "Průvodci, výběry klubů, tipy pro hráče i novinky z padelové komunity v Praze a okolí.",
    readArticle: "Přečíst článek",
    published: "Publikováno"
  },
  en: {
    title: "Padel blog",
    intro: "Guides, club roundups, player tips, and stories from the padel community in and around Prague.",
    readArticle: "Read article",
    published: "Published"
  },
  ua: {
    title: "Статті про падел",
    intro: "Гайди, добірки клубів, поради гравцям та історії падел-спільноти Праги й околиць.",
    readArticle: "Читати статтю",
    published: "Опубліковано"
  }
};

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: THE_COURT_OPENING_SLUG,
    publishedAt: "2026-09-13",
    imageUrl: "clubs/optimized/the-court-1200.webp",
    translations: {
      cz: {
        category: "Nový klub",
        title: "The Court přináší padel nové generace kousek za Prahu",
        excerpt: "Dva panoramatické kurty s chytrým sledováním zápasů, samostatný kurt 1vs1 a míčový automat zdarma. Poznejte nový klub The Court v Jinočanech.",
        intro: "V Jinočanech západně od Prahy otevírá The Court — nový krytý padelový klub, který spojuje komfortní zázemí s technologiemi pro hráče všech úrovní. Pod jednou střechou nabízí dva plnohodnotné panoramatické kurty a jeden speciální single kurt.",
        highlights: [
          { title: "Single kurt 1vs1", body: "Samostatný menší kurt je určený pro dynamickou hru jednoho proti jednomu i cílený trénink." },
          { title: "Míčový automat zdarma", body: "Na tréninkovém kurtu bude hráčům k dispozici míčový automat bez dalšího poplatku." },
          { title: "AI záznam zápasů", body: "Oba standardní kurty využívají chytrý systém pro automatické skóre a videozáznam hry dostupný v telefonu." }
        ],
        sections: [
          {
            title: "Tři kurty, tři způsoby hry",
            paragraphs: [
              "Dva panoramatické kurty mají klasické rozměry pro čtyřhru. Vedle nich je v klubu single kurt navržený pro 1vs1. Ten se hodí také pro individuální lekce a opakování úderů s míčovým automatem, který má být dostupný zdarma.",
              "Rezervace všech kurtů probíhá přes systém iSport. Single kurt je označený speciálním štítkem 1vs1, takže ho snadno odlišíte od standardních kurtů."
            ]
          },
          {
            title: "Zápas, který se zaznamená sám",
            paragraphs: [
              "Na dvou standardních kurtech má chytrý kamerový systém sledovat průběh hry, automaticky vést skóre a vytvářet video. Klub uvádí, že záznam každé hry dostanou hráči do telefonu ještě před návratem domů.",
              "To otevírá prostor nejen pro sdílení povedených výměn, ale i pro zpětnou analýzu pohybu, postavení a rozhodování během zápasu."
            ]
          },
          {
            title: "Komfort po celý rok",
            paragraphs: [
              "The Court slibuje stálou teplotu 22 °C, vodu a ručníky přímo na kurtu. Po hře je k dispozici bar, plně vybavené sprchy a dětský koutek s výhledem na kurty.",
              "Klub najdete na adrese Mezi Stromy 507 v Jinočanech, přibližně pět minut od dálnice D5 a deset minut od západního okraje Prahy. Otevřeno má denně od 7:00 do půlnoci."
            ]
          },
          {
            title: "The Court nově v HLEDEJKURTY",
            paragraphs: [
              "The Court jsme přidali do sledovaného systému HLEDEJKURTY. Jeho volné termíny tak najdete vedle dalších pražských a okolních klubů — celkem nyní sledujeme 18 padelových klubů.",
              "Na detailu klubu můžete zkontrolovat aktuální dostupnost obou standardních kurtů i kurtu Super Single 1vs1 a poté přejít přímo do oficiální rezervace."
            ],
            clubLinkLabel: "Otevřít profil The Court"
          }
        ],
        sourceLabel: "Oficiální web The Court",
        instagramLabel: "The Court na Instagramu",
        clubLinkLabel: "Zobrazit klub a volné termíny"
      },
      en: {
        category: "New club",
        title: "The Court brings next-generation padel just outside Prague",
        excerpt: "Two panoramic courts with smart match tracking, a dedicated 1vs1 court, and a free ball machine. Meet the new The Court club in Jinočany.",
        intro: "The Court is opening in Jinočany, west of Prague: a new indoor padel club combining comfortable facilities with technology for players of every level. It offers two full-size panoramic courts and one special singles court under one roof.",
        highlights: [
          { title: "1vs1 singles court", body: "The dedicated compact court is made for fast one-on-one games as well as focused practice." },
          { title: "Free ball machine", body: "A ball machine will be available on the training court at no additional charge." },
          { title: "AI match recording", body: "Both standard courts use a smart system for automatic scoring and match video delivered to your phone." }
        ],
        sections: [
          {
            title: "Three courts, three ways to play",
            paragraphs: [
              "The two panoramic courts have the standard dimensions used for doubles. Alongside them, the club has a singles court designed for 1vs1. It is also a practical space for individual coaching and repeating shots with the ball machine, which is planned to be available free of charge.",
              "All courts are booked through iSport. The singles court carries a distinct 1vs1 badge, making it easy to distinguish from the standard courts."
            ]
          },
          {
            title: "A match that records itself",
            paragraphs: [
              "A smart camera system on the two standard courts is designed to follow play, keep score automatically, and create video. The club says players will receive footage from every game on their phone before they arrive home.",
              "That makes it useful not only for sharing a great rally, but also for reviewing movement, positioning, and decisions after the match."
            ]
          },
          {
            title: "Year-round comfort",
            paragraphs: [
              "The Court promises a steady 22 °C, with water and towels available courtside. After playing, guests can use the bar, fully equipped showers, and a children's corner overlooking the courts.",
              "The club is at Mezi Stromy 507 in Jinočany, around five minutes from the D5 motorway and ten minutes from Prague's western edge. It is open daily from 7:00 until midnight."
            ]
          },
          {
            title: "The Court is now tracked by HLEDEJKURTY",
            paragraphs: [
              "We have added The Court to the HLEDEJKURTY tracking system. Its available times now appear alongside other venues in Prague and nearby, bringing our catalog to 18 tracked padel clubs.",
              "On the club page, you can check current availability for both standard courts and the Super Single 1vs1 court, then continue directly to the official booking system."
            ],
            clubLinkLabel: "Open The Court club page"
          }
        ],
        sourceLabel: "Official The Court website",
        instagramLabel: "The Court on Instagram",
        clubLinkLabel: "View the club and available times"
      },
      ua: {
        category: "Новий клуб",
        title: "The Court відкриває падел нового покоління поруч із Прагою",
        excerpt: "Два панорамні корти з розумним відстеженням матчів, окремий корт 1vs1 і безкоштовна машина для м’ячів. Знайомтеся з новим клубом The Court у Їночанах.",
        intro: "У Їночанах на захід від Праги відкривається The Court — новий критий падел-клуб, що поєднує комфортну інфраструктуру з технологіями для гравців будь-якого рівня. Під одним дахом розташовані два повнорозмірні панорамні корти та один спеціальний одиночний корт.",
        highlights: [
          { title: "Одиночний корт 1vs1", body: "Окремий компактний корт створений для динамічної гри один на один і цілеспрямованих тренувань." },
          { title: "Машина для м’ячів безкоштовно", body: "На тренувальному корті машина для подачі м’ячів буде доступна без додаткової оплати." },
          { title: "AI-запис матчів", body: "Обидва стандартні корти використовують розумну систему автоматичного рахунку та відеозапису гри на телефон." }
        ],
        sections: [
          {
            title: "Три корти — три формати гри",
            paragraphs: [
              "Два панорамні корти мають стандартні розміри для парної гри. Поруч розташований одиночний корт для 1vs1. Він також підходить для індивідуальних занять і відпрацювання ударів із машиною для м’ячів, яка має бути доступною безкоштовно.",
              "Бронювання всіх кортів працює через iSport. Одиночний корт має спеціальну позначку 1vs1, тому його легко відрізнити від стандартних."
            ]
          },
          {
            title: "Матч, що записує себе сам",
            paragraphs: [
              "Розумна система камер на двох стандартних кортах має стежити за грою, автоматично вести рахунок і створювати відео. Клуб повідомляє, що запис кожної гри потрапить у телефон ще до повернення додому.",
              "Це корисно не лише для публікації вдалих розіграшів, а й для аналізу руху, позиції та рішень після матчу."
            ]
          },
          {
            title: "Комфорт упродовж року",
            paragraphs: [
              "The Court обіцяє постійну температуру 22 °C, воду й рушники безпосередньо біля корту. Після гри доступні бар, повністю обладнані душові та дитячий куточок із видом на корти.",
              "Клуб розташований за адресою Mezi Stromy 507 у Їночанах — приблизно за п’ять хвилин від автомагістралі D5 і десять хвилин від західної околиці Праги. Він працює щодня з 7:00 до опівночі."
            ]
          },
          {
            title: "The Court тепер відстежується в HLEDEJKURTY",
            paragraphs: [
              "Ми додали The Court до системи відстеження HLEDEJKURTY. Його вільний час тепер відображається поруч з іншими закладами Праги й околиць — загалом ми відстежуємо 18 падел-клубів.",
              "На сторінці клубу можна перевірити актуальну доступність двох стандартних кортів і корту Super Single 1vs1, а потім перейти безпосередньо до офіційного бронювання."
            ],
            clubLinkLabel: "Відкрити сторінку The Court"
          }
        ],
        sourceLabel: "Офіційний сайт The Court",
        instagramLabel: "The Court в Instagram",
        clubLinkLabel: "Переглянути клуб і вільний час"
      }
    }
  }
];

export function newsArticle(slug: string | null): NewsArticle | null {
  return NEWS_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function localizedNewsArticle(article: NewsArticle, language: LanguageCode): LocalizedArticle {
  return article.translations[language];
}

function formattedDate(date: string, language: LanguageCode): string {
  return new Intl.DateTimeFormat(language === "cz" ? "cs" : language === "ua" ? "uk" : "en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague"
  }).format(new Date(`${date}T12:00:00+02:00`));
}

function articleImageUrl(article: NewsArticle): string {
  return `${import.meta.env.BASE_URL}${article.imageUrl}`;
}

export function NewsIndexPage({ language, onOpenPost }: { language: LanguageCode; onOpenPost: (slug: string) => void }) {
  const copy = newsCopy[language];

  return (
    <section className="newsPage" aria-labelledby="news-title">
      <header className="newsHero">
        <span className="newsEyebrow"><Sparkles size={16} /> HLEDEJKURTY</span>
        <h1 id="news-title">{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <div className="newsList">
        {NEWS_ARTICLES.map((article) => {
          const post = localizedNewsArticle(article, language);
          return (
            <article className="newsCard" key={article.slug}>
              <a href={newsPostPath(article.slug, language)} onClick={(event) => { event.preventDefault(); onOpenPost(article.slug); }}>
                <img src={articleImageUrl(article)} alt="The Court padel club" />
              </a>
              <div className="newsCardBody">
                <div className="newsMeta"><span>{post.category}</span><time dateTime={article.publishedAt}>{formattedDate(article.publishedAt, language)}</time></div>
                <h2><a href={newsPostPath(article.slug, language)} onClick={(event) => { event.preventDefault(); onOpenPost(article.slug); }}>{post.title}</a></h2>
                <p>{post.excerpt}</p>
                <a className="newsReadMore" href={newsPostPath(article.slug, language)} onClick={(event) => { event.preventDefault(); onOpenPost(article.slug); }}>
                  {copy.readArticle}<ArrowRight size={17} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function NewsArticlePage({ article, language, onOpenClub }: { article: NewsArticle; language: LanguageCode; onOpenClub: () => void }) {
  const post = localizedNewsArticle(article, language);
  const copy = newsCopy[language];
  const icons = [<Target size={22} />, <Bot size={22} />, <Video size={22} />];

  return (
    <article className="newsArticle">
      <header className="newsArticleHeader">
        <div className="newsMeta"><span>{post.category}</span><time dateTime={article.publishedAt}><CalendarDays size={15} /> {copy.published} {formattedDate(article.publishedAt, language)}</time></div>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
      </header>
      <img className="newsArticleHeroImage" src={articleImageUrl(article)} alt="The Court padel club" />
      <div className="newsArticleContent">
        <p className="newsLead">{post.intro}</p>
        <section className="newsHighlights" aria-label={post.category}>
          {post.highlights.map((highlight, index) => (
            <div className="newsHighlight" key={highlight.title}>{icons[index]}<h2>{highlight.title}</h2><p>{highlight.body}</p></div>
          ))}
        </section>
        {post.sections.map((section) => (
          <section className="newsArticleSection" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.clubLinkLabel ? (
              <a className="newsInlineLink" href={clubPath("the-court", language)} onClick={(event) => { event.preventDefault(); onOpenClub(); }}>
                {section.clubLinkLabel}<ArrowRight size={16} />
              </a>
            ) : null}
          </section>
        ))}
        <div className="newsArticleActions">
          <a className="uiButton uiButton-md uiButton-primary" href={clubPath("the-court", language)} onClick={(event) => { event.preventDefault(); onOpenClub(); }}>{post.clubLinkLabel}<ArrowRight size={17} /></a>
          <a className="uiButton uiButton-md" href="https://www.instagram.com/the_court_padel_/" target="_blank" rel="noreferrer">{post.instagramLabel}<Instagram size={16} /></a>
          <a className="uiButton uiButton-md" href="https://thecourt.cz/" target="_blank" rel="noreferrer">{post.sourceLabel}<ExternalLink size={16} /></a>
        </div>
      </div>
    </article>
  );
}

export function newsPath(language: LanguageCode): string {
  const prefix = language === "en" ? "/en" : language === "ua" ? "/ua" : "";
  return `${prefix}/blog/`;
}

export function newsPostPath(slug: string, language: LanguageCode): string {
  return `${newsPath(language)}${encodeURIComponent(slug)}/`;
}

function clubPath(slug: string, language: LanguageCode): string {
  const prefix = language === "en" ? "/en" : language === "ua" ? "/ua" : "";
  return `${prefix}/clubs/${encodeURIComponent(slug)}/`;
}
