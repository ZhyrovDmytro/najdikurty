import React from "react";
import type { LanguageCode } from "./i18n";

export function ArticleContents({ headings, language }: { headings: string[]; language: LanguageCode }) {
  const label = language === "cz" ? "V článku" : language === "en" ? "In this article" : "У статті";
  return <nav className="articleContents" aria-label={label}>
    <p>{label}</p>
    <ol>{headings.map((heading, index) => <li key={heading}><a href={`#section-${index + 1}`}>{heading}</a></li>)}</ol>
  </nav>;
}

export function ArticleLayout({ title, description, meta, image, children }: {
  title: string;
  description: string;
  meta: React.ReactNode;
  image: { src: string; alt: string; srcSet?: string; caption?: string };
  children: React.ReactNode;
}) {
  return <article className="newsArticle" aria-labelledby="article-title">
    <header className="newsArticleHeader">
      {meta}
      <h1 id="article-title">{title}</h1>
      <p>{description}</p>
    </header>
    <figure className="newsArticleFigure">
      <img className="newsArticleHeroImage" src={image.src} alt={image.alt} srcSet={image.srcSet} sizes="(max-width: 700px) 100vw, 1200px" width="1200" height="670" />
      {image.caption ? <figcaption className="newsArticleImageCaption">{image.caption}</figcaption> : null}
    </figure>
    <div className="newsArticleContent">{children}</div>
  </article>;
}
