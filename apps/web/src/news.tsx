import React from "react";
import { ArticleContents, ArticleLayout } from "./article-layout";
import { ArrowRight, Bot, CalendarDays, ExternalLink, Instagram, Sparkles, Target, Video } from "lucide-react";
import { EditorialArticleCards, EditorialLinks, generatedArticleImage } from "./editorial";
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
  modifiedAt: string;
  imageUrl: string;
  translations: Record<LanguageCode, LocalizedArticle>;
};

const newsCopy: Record<LanguageCode, { title: string; intro: string; latestTitle: string; latestIntro: string; readArticle: string; published: string }> = {
  cz: {
    title: "Články o padelu",
    intro: "Průvodci, výběry klubů, tipy pro hráče i novinky z padelové komunity v Praze a okolí.",
    latestTitle: "Nejnovější z blogu",
    latestIntro: "Novinky z padelových klubů v Praze a okolí.",
    readArticle: "Přečíst článek",
    published: "Publikováno"
  },
  en: {
    title: "Padel blog",
    intro: "Guides, club roundups, player tips, and stories from the padel community in and around Prague.",
    latestTitle: "Latest from the blog",
    latestIntro: "News from padel clubs in Prague and nearby.",
    readArticle: "Read article",
    published: "Published"
  },
  ua: {
    title: "Статті про падел",
    intro: "Гайди, добірки клубів, поради гравцям та історії падел-спільноти Праги й околиць.",
    latestTitle: "Нове в блозі",
    latestIntro: "Новини падел-клубів Праги та околиць.",
    readArticle: "Читати статтю",
    published: "Опубліковано"
  }
};

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    "slug": "the-court-opening",
    "publishedAt": "2026-09-13",
    "modifiedAt": "2026-11-01",
    "imageUrl": "articles/singles-court-1200.webp",
    "translations": {
      "cz": {
        "category": "Nový padelový klub",
        "title": "The Court v Jinočanech: kurty, ceny a první návštěva",
        "excerpt": "The Court u Prahy má dva kryté kurty pro čtyřhru a tréninkový kurt 1vs1. Jak vybrat správný kurt, spočítat cenu a připravit první návštěvu.",
        "intro": "The Court v Jinočanech nabízí dva standardní panoramatické kurty pro čtyřhru a samostatný tréninkový kurt 1vs1. Pokud jedete ze západní části Prahy nebo hledáte místo pro hru ve dvou, porovnejte typ kurtu a jeho tarif ještě před rezervací.",
        "highlights": [
          {
            "title": "Dva kurty pro čtyřhru",
            "body": "Pro skupinu čtyř hráčů vyberte jeden ze dvou standardních krytých kurtů."
          },
          {
            "title": "Samostatný kurt 1vs1",
            "body": "Tréninkový kurt má vlastní cenu. Dostupnost a cenu míčového automatu potvrďte u klubu."
          },
          {
            "title": "Skóre a video podle klubu",
            "body": "Web uvádí automatické skóre a záznam hry do telefonu. Fungování systému jsme osobně netestovali."
          }
        ],
        "sections": [
          {
            "title": "Který kurt rezervovat pro dva a který pro čtyři",
            "paragraphs": [
              "Dva panoramatické kurty mají standardní rozměry pro čtyřhru. Samostatný menší kurt je určený pro 1vs1 a může být volbou pro cílený trénink. Nepočítejte jej jako třetí standardní kurt, když plánujete souběžnou hru několika čtveřic.",
              "Například osm hráčů potřebuje oba standardní kurty ve stejném intervalu. Pro dva, kteří chtějí hrát proti sobě, naopak hledejte označení Super Single 1vs1. Rezervace probíhá přes iSport; vždy si přečtěte označení zvoleného kurtu.",
              "Míčový automat nemáme potvrzený jako dostupnou ani bezplatnou součást rezervace. Pokud jej chcete využít při tréninku, zeptejte se na dostupnost a cenu před zaplacením."
            ]
          },
          {
            "title": "Cena standardního a tréninkového kurtu",
            "paragraphs": [
              "Zveřejněný ceník rozlišuje standardní a single kurt i několik časových pásem. Ve všední den od 7:00 do 13:00 uvádí 800 Kč za hodinu standardního kurtu a 600 Kč za single. Ve čtyřech je 800 Kč za kurt 200 Kč na osobu; dva hráči na single za 600 Kč zaplatí po 300 Kč.",
              "Jde o výpočet ze zveřejněných hodinových sazeb bez dalšího vybavení. Všední standardní kurt od 17:00 do 21:00 stojí podle ceníku 1 200 Kč za hodinu. Levnější ranní částku proto nepoužívejte jako rozpočet pro večerní hru.",
              "Při rezervaci přes hranici cenového pásma si přečtěte výsledný součet. Před úhradou potvrďte také délku bloku, případné půjčovné a storno podmínky."
            ]
          },
          {
            "title": "Záznam hry a zázemí: co uvádí web klubu",
            "paragraphs": [
              "Klub popisuje automatické skóre a video z každé hry do telefonu. Pokud je pro vás záznam důvodem k návštěvě, předem si ověřte, na kterém kurtu funguje, jak k němu získáte přístup a zda je zahrnutý v ceně.",
              "Video lze například projít s trenérem a podívat se na své postavení při konkrétní výměně. Systém jsme osobně netestovali; jeho přesnost ani doručení záznamu do určitého času neposuzujeme.",
              "Web dále uvádí stálou teplotu 22 °C, vodu a ručníky na kurtu, bar, vybavené sprchy a dětský koutek s výhledem na hru. Pokud přijíždíte s dětmi, domluvte si dohled. Dětský koutek sám o sobě není službou hlídání."
            ]
          },
          {
            "title": "Adresa, příjezd a dokončení rezervace",
            "paragraphs": [
              "The Court najdete na adrese Mezi Stromy 507, Jinočany. Klub uvádí provoz denně od 7:00 do půlnoci a orientačně pět minut od dálnice D5 či deset minut od západního okraje Prahy. Cestu plánujte podle výchozího místa a provozu v čase hry.",
              "The Court patří mezi 18 klubů v katalogu HLEDEJKURTY. V profilu porovnáte dostupnost standardních kurtů a Super Single 1vs1, potom přejdete do oficiální rezervace. Nalezený čas kurt neblokuje.",
              "Po zaplacení zkontrolujte potvrzení: správné datum, typ kurtu, začátek a délku hry. Spoluhráčům pošlete adresu a čas setkání před začátkem rezervace, abyste zaplacenou hodinu netrávili hledáním areálu."
            ],
            "clubLinkLabel": "Otevřít profil The Court"
          }
        ],
        "sourceLabel": "The Court (web klubu)",
        "instagramLabel": "The Court na Instagramu",
        "clubLinkLabel": "Zobrazit klub a volné termíny"
      },
      "en": {
        "category": "New padel club",
        "title": "The Court in Jinočany: courts, prices and your first visit",
        "excerpt": "Two indoor doubles courts and a dedicated 1vs1 training court near Prague. Choose a court at The Court, work out the cost and plan your first visit.",
        "intro": "The Court in Jinočany offers two standard panoramic doubles courts and a separate 1vs1 training court. If you travel from western Prague or want a game for two, compare the court type and its tariff before booking.",
        "highlights": [
          {
            "title": "Two doubles courts",
            "body": "For a group of four, choose one of the two standard indoor courts."
          },
          {
            "title": "A separate 1vs1 court",
            "body": "The training court has its own tariff. Confirm ball-machine availability and pricing with the club."
          },
          {
            "title": "Scoring and video described by the club",
            "body": "The website advertises automatic scoring and match video on your phone. We have not tested the system ourselves."
          }
        ],
        "sections": [
          {
            "title": "Which court to book for two or four players",
            "paragraphs": [
              "The two panoramic courts have standard dimensions for doubles. The smaller, separate court is intended for 1vs1 and may suit focused practice. Do not count it as a third standard court when planning simultaneous games for several groups of four.",
              "For example, eight players need both standard courts over the same interval. Two people wanting to play against each other should look for the Super Single 1vs1 label. Bookings use iSport; read the selected court’s label before paying.",
              "We have not confirmed a ball machine as an available or free part of a booking. If you want one for practice, ask about availability and price beforehand."
            ]
          },
          {
            "title": "Standard and training-court prices",
            "paragraphs": [
              "The published price list separates standard and singles courts and uses several time bands. On weekdays from 7:00 to 13:00 it lists 800 CZK per hour for a standard court and 600 CZK for singles. Four players sharing the 800 CZK court pay 200 CZK each; two sharing the 600 CZK singles court pay 300 CZK each.",
              "These calculations use published hourly rates and exclude extra equipment. The standard-court rate on weekdays from 17:00 to 21:00 is 1,200 CZK per hour in the price list. The cheaper morning rate is therefore unsuitable for budgeting an evening game.",
              "For a booking crossing a rate boundary, read the final total. Confirm the session length, any equipment rental and the cancellation terms before payment."
            ]
          },
          {
            "title": "Match recordings and facilities described by the club",
            "paragraphs": [
              "The club describes automatic scoring and video from each game delivered to a phone. If recording is a reason for your visit, ask which court supports it, how to access the video and whether it is included in the price.",
              "For example, you could review a recording with a coach to discuss your position during a particular rally. We have not tested the system and cannot assess scoring accuracy or promise a delivery time.",
              "The website also lists a steady 22 °C, courtside water and towels, a bar, equipped showers and a children’s corner overlooking play. If bringing children, arrange supervision. A children’s corner does not itself provide childcare."
            ]
          },
          {
            "title": "Address, arrival and completing your booking",
            "paragraphs": [
              "The address is Mezi Stromy 507, Jinočany. The club lists daily opening from 7:00 until midnight and approximate journeys of five minutes from the D5 motorway or ten minutes from Prague’s western edge. Plan your route from your actual starting point using conditions at your playing time.",
              "The Court is one of 18 clubs in the HLEDEJKURTY catalog. Its profile lets you compare availability for standard courts and Super Single 1vs1 before continuing to the official booking system. Finding a time does not hold the court.",
              "After paying, check the confirmation for the date, court type, start and duration. Send your group the address and agree to meet before the session begins, so finding the venue does not use up your court time."
            ],
            "clubLinkLabel": "Open The Court club page"
          }
        ],
        "sourceLabel": "Official The Court website",
        "instagramLabel": "The Court on Instagram",
        "clubLinkLabel": "View the club and available times"
      },
      "ua": {
        "category": "Новий падел-клуб",
        "title": "The Court у Їночанах: корти, ціни та перший візит",
        "excerpt": "Два криті корти для парної гри та окремий тренувальний корт 1vs1 біля Праги. Як обрати корт у The Court, порахувати ціну й підготувати перший візит.",
        "intro": "The Court у Їночанах пропонує два стандартні панорамні корти для парної гри та окремий тренувальний корт 1vs1. Якщо їдете із заходу Праги або шукаєте гру для двох, порівняйте тип корту та його тариф до бронювання.",
        "highlights": [
          {
            "title": "Два корти для парної гри",
            "body": "Для чотирьох гравців обирайте один із двох стандартних критих кортів."
          },
          {
            "title": "Окремий корт 1vs1",
            "body": "Тренувальний корт має власний тариф. Наявність і ціну машини для м’ячів уточніть у клубі."
          },
          {
            "title": "Рахунок і відео за описом клубу",
            "body": "Сайт рекламує автоматичний рахунок і відео гри на телефоні. Особисто ми систему не тестували."
          }
        ],
        "sections": [
          {
            "title": "Який корт бронювати для двох і чотирьох",
            "paragraphs": [
              "Два панорамні корти мають стандартні розміри для парної гри. Окремий менший корт призначений для 1vs1 і може підійти для цілеспрямованого тренування. Не рахуйте його третім стандартним кортом для одночасних ігор кількох четвірок.",
              "Наприклад, вісьмом гравцям потрібні обидва стандартні корти на той самий час. Двом, які хочуть грати один проти одного, варто шукати позначку Super Single 1vs1. Бронювання працює через iSport; прочитайте назву обраного корту до оплати.",
              "Ми не підтвердили машину для м’ячів як доступну чи безкоштовну частину бронювання. Якщо хочете використати її для тренування, запитайте про наявність і ціну заздалегідь."
            ]
          },
          {
            "title": "Ціни стандартного й тренувального кортів",
            "paragraphs": [
              "Опублікований прайс розділяє стандартний та одиночний корти й кілька часових тарифів. У будні з 7:00 до 13:00 зазначено 800 Kč за годину стандартного корту та 600 Kč за одиночний. Четверо на корті за 800 Kč платять по 200 Kč; двоє на одиночному за 600 Kč платять по 300 Kč.",
              "Це розрахунок за опублікованими погодинними ставками без додаткового інвентарю. Стандартний корт у будні з 17:00 до 21:00 коштує за прайсом 1 200 Kč на годину. Дешевший ранковий тариф не підходить для бюджету вечірньої гри.",
              "Якщо бронювання перетинає межу тарифів, прочитайте кінцеву суму. До оплати підтвердьте тривалість, можливу оренду інвентарю й умови скасування."
            ]
          },
          {
            "title": "Запис гри та зручності за описом клубу",
            "paragraphs": [
              "Клуб описує автоматичний рахунок і відео кожної гри на телефоні. Якщо запис є причиною візиту, запитайте, на якому корті він працює, як отримати доступ і чи входить у ціну.",
              "Наприклад, запис можна переглянути з тренером і обговорити свою позицію під час конкретного розіграшу. Ми не тестували систему й не оцінюємо точність рахунку або строк отримання відео.",
              "Сайт також зазначає постійні 22 °C, воду й рушники біля корту, бар, обладнані душові та дитячий куточок із видом на гру. Якщо приїжджаєте з дітьми, домовтеся про нагляд. Дитячий куточок сам собою не є послугою догляду."
            ]
          },
          {
            "title": "Адреса, приїзд і завершення бронювання",
            "paragraphs": [
              "Адреса клубу: Mezi Stromy 507, Jinočany. Клуб зазначає щоденну роботу з 7:00 до опівночі та орієнтовно п’ять хвилин від автомагістралі D5 чи десять хвилин від західного краю Праги. Плануйте маршрут від свого місця виїзду з урахуванням руху на час гри.",
              "The Court входить до 18 клубів каталогу HLEDEJKURTY. У профілі можна порівняти доступність стандартних кортів і Super Single 1vs1 та перейти до офіційної системи бронювання. Знайдений час не утримує корт за вами.",
              "Після оплати перевірте в підтвердженні дату, тип корту, початок і тривалість. Надішліть групі адресу й домовтеся зустрітися до початку гри, щоб пошук комплексу не забирав оплачений час."
            ],
            "clubLinkLabel": "Відкрити сторінку The Court"
          }
        ],
        "sourceLabel": "Офіційний сайт The Court",
        "instagramLabel": "The Court в Instagram",
        "clubLinkLabel": "Переглянути клуб і вільний час"
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
  return `${(import.meta.env?.BASE_URL ?? "/")}${article.imageUrl}`;
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
      <EditorialLinks language={language} />
      <div className="newsList">
        <EditorialArticleCards language={language} />
        {NEWS_ARTICLES.map((article) => {
          const post = localizedNewsArticle(article, language);
          return (
            <article className="newsCard" key={article.slug}>
              <a href={newsPostPath(article.slug, language)} onClick={(event) => { event.preventDefault(); onOpenPost(article.slug); }}>
                <img src={articleImageUrl(article)} alt={generatedArticleImage("club-opening", language).alt} srcSet={generatedArticleImage("club-opening", language).srcSet} sizes="(max-width: 700px) 100vw, 600px" width="1200" height="670" />
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

export function LatestNewsCards({ language, onOpenPost }: { language: LanguageCode; onOpenPost: (slug: string) => void }) {
  const copy = newsCopy[language];
  const latestArticles = [...NEWS_ARTICLES]
    .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt))
    .slice(0, 3);

  return (
    <section className="latestNews" aria-labelledby="latest-news-title">
      <EditorialLinks language={language} />
      <header className="latestNewsHeader">
        <div>
          <h2 id="latest-news-title">{copy.latestTitle}</h2>
          <p>{copy.latestIntro}</p>
        </div>
      </header>
      <div className="latestNewsGrid">
        <EditorialArticleCards language={language} limit={2} />
        {latestArticles.map((article) => {
          const post = localizedNewsArticle(article, language);
          const href = newsPostPath(article.slug, language);
          const openPost = (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onOpenPost(article.slug);
          };

          return (
            <article className="latestNewsCard" key={article.slug}>
              <a className="latestNewsImage" href={href} onClick={openPost}>
                <img src={articleImageUrl(article)} alt={generatedArticleImage("club-opening", language).alt} srcSet={generatedArticleImage("club-opening", language).srcSet} sizes="(max-width: 700px) 100vw, 600px" width="1200" height="670" />
              </a>
              <div className="latestNewsCardBody">
                <div className="newsMeta">
                  <span>{post.category}</span>
                  <time dateTime={article.publishedAt}>{formattedDate(article.publishedAt, language)}</time>
                </div>
                <h3><a href={href} onClick={openPost}>{post.title}</a></h3>
                <p>{post.excerpt}</p>
                <a className="newsReadMore" href={href} onClick={openPost}>{copy.readArticle}<ArrowRight size={17} /></a>
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
    <ArticleLayout title={post.title} description={post.excerpt}
      meta={<div className="newsMeta"><span>{post.category}</span><a rel="author" href={language === "cz" ? "/about/" : `/${language}/about/`}>Redakce HLEDEJKURTY · Dmytro Zhyrov</a><time dateTime={article.modifiedAt}>{language === "cz" ? "Aktualizováno" : language === "en" ? "Updated" : "Оновлено"} {formattedDate(article.modifiedAt, language)}</time><time dateTime={article.publishedAt}><CalendarDays size={15} /> {copy.published} {formattedDate(article.publishedAt, language)}</time></div>}
      image={generatedArticleImage("club-opening", language)}>
        <p className="newsLead">{post.intro}</p>
        <ArticleContents headings={post.sections.map(section => section.title)} language={language} />
        <section className="newsHighlights" aria-label={post.category}>
          {post.highlights.map((highlight, index) => (
            <div className="newsHighlight" key={highlight.title}>{icons[index]}<h2>{highlight.title}</h2><p>{highlight.body}</p></div>
          ))}
        </section>
        {post.sections.map((section, index) => (
          <section className="newsArticleSection" aria-labelledby={`section-${index + 1}`} key={section.title}>
            <h2 id={`section-${index + 1}`}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.clubLinkLabel ? (
              <a className="newsInlineLink" href={clubPath("the-court", language)} onClick={(event) => { event.preventDefault(); onOpenClub(); }}>
                {section.clubLinkLabel}<ArrowRight size={16} />
              </a>
            ) : null}
          </section>
        ))}
        <section className="newsArticleSection">
          <h2>{language === "cz" ? "Zdroje a ověření" : language === "en" ? "Sources and verification" : "Джерела та перевірка"}</h2>
          <p>{language === "cz" ? "Popis vychází z webu klubu a jeho ceníku. Zázemí ani kamerový systém jsme osobně netestovali. Podmínky konkrétní hry potvrďte při rezervaci." : language === "en" ? "This description uses the club’s website and price list. We have not personally tested its facilities or camera system. Confirm the terms for your game when booking." : "Опис спирається на сайт клубу та його прайс. Ми особисто не тестували зручності чи систему камер. Умови конкретної гри підтвердьте під час бронювання."}</p>
          <ul>
            <li><a href="https://thecourt.cz/">{post.sourceLabel}</a></li>
            <li><a href="https://thecourt.cz/r-prices-cz">{language === "cz" ? "The Court: ceník standardního a single kurtu" : language === "en" ? "The Court: standard and singles court prices" : "The Court: ціни стандартного й одиночного кортів"}</a></li>
          </ul>
        </section>
        <EditorialLinks language={language} />
        <div className="newsArticleActions">
          <a className="uiButton uiButton-md uiButton-primary" href={clubPath("the-court", language)} onClick={(event) => { event.preventDefault(); onOpenClub(); }}>{post.clubLinkLabel}<ArrowRight size={17} /></a>
          <a className="uiButton uiButton-md" href="https://www.instagram.com/the_court_padel_/" target="_blank" rel="noreferrer">{post.instagramLabel}<Instagram size={16} /></a>
          <a className="uiButton uiButton-md" href="https://thecourt.cz/" target="_blank" rel="noreferrer">{post.sourceLabel}<ExternalLink size={16} /></a>
        </div>
    </ArticleLayout>
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
