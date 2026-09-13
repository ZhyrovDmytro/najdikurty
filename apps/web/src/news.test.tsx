import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NEWS_ARTICLES, NewsArticlePage, localizedNewsArticle, newsPath, newsPostPath } from "./news";

describe("localized news", () => {
  it("provides complete Czech, English, and Ukrainian versions of every post", () => {
    for (const article of NEWS_ARTICLES) {
      for (const language of ["cz", "en", "ua"] as const) {
        const post = localizedNewsArticle(article, language);
        expect(post.title.length).toBeGreaterThan(20);
        expect(post.excerpt.length).toBeGreaterThan(70);
        expect(post.highlights).toHaveLength(3);
        expect(post.sections).toHaveLength(4);
        expect(post.sections.every((section) => section.paragraphs.length >= 2)).toBe(true);
        expect(JSON.stringify(post.sections)).toContain("18");
      }
    }
  });

  it("builds localized index and article routes", () => {
    expect(newsPath("cz")).toBe("/blog/");
    expect(newsPath("en")).toBe("/en/blog/");
    expect(newsPostPath("the-court-opening", "ua")).toBe("/ua/blog/the-court-opening/");
  });

  it("links the opening article to The Court's Instagram profile", () => {
    const markup = renderToStaticMarkup(
      <NewsArticlePage article={NEWS_ARTICLES[0]} language="en" onOpenClub={() => undefined} />
    );
    expect(markup).toContain('href="https://www.instagram.com/the_court_padel_/"');
  });
});
