import React from "react";

export function ArticleLayout({ title, description, meta, image, children }: {
  title: string;
  description: string;
  meta: React.ReactNode;
  image: { src: string; alt: string };
  children: React.ReactNode;
}) {
  return <article className="newsArticle">
    <header className="newsArticleHeader">
      {meta}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
    <img className="newsArticleHeroImage" src={image.src} alt={image.alt} width="1200" height="670" />
    <div className="newsArticleContent">{children}</div>
  </article>;
}
