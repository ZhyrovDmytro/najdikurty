import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EDITORIAL_PAGES, EditorialPage, EditorialArticleCards } from "./editorial";
import { NEWS_ARTICLES, NewsArticlePage, NewsIndexPage } from "./news";

describe("shared article design", () => {
  it("renders every guide and article with the original article layout", () => {
    const opening = renderToStaticMarkup(<NewsArticlePage article={NEWS_ARTICLES[0]} language="en" onOpenClub={() => undefined} />);
    expect(opening).toContain("articles/club-opening-1200.webp");
    expect(opening).toContain("AI-generated illustrative photograph");
    for (const page of EDITORIAL_PAGES) {
      const html = renderToStaticMarkup(<EditorialPage page={page} />);
      for (const className of ["newsArticle", "newsArticleHeader", "newsArticleHeroImage", "newsArticleContent", "newsArticleSection"]) {
        expect(opening).toContain(`class="${className}"`);
        expect(html).toContain(`class="${className}"`);
      }
      expect(html).not.toContain("<main");
      expect(html).not.toContain("seoPrerender");
      expect(html).not.toContain("<footer");
    }
  });
  it("uses the original image-card styles for lists and home previews in every language", () => {
    for (const language of ["cz", "en", "ua"] as const) {
      const index = renderToStaticMarkup(<NewsIndexPage language={language} onOpenPost={() => undefined} />);
      expect(index.match(/class="newsList"/g)).toHaveLength(1);
      expect(index.match(/class="newsCard"/g)).toHaveLength(12);
      const list = renderToStaticMarkup(<EditorialArticleCards language={language} />);
      expect(list.match(/class="newsCard"/g)).toHaveLength(11);
      expect(list.match(/<img /g)).toHaveLength(11);
      const latest = renderToStaticMarkup(<EditorialArticleCards language={language} limit={2} />);
      expect(latest.match(/class="latestNewsCard"/g)).toHaveLength(2);
    }
  });
});
