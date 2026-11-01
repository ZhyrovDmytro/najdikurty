import React from "react";

export function ArticleLayout({ title, description, meta, image, children }: {
  title: string;
  description: string;
  meta: React.ReactNode;
  image: { src: string; alt: string; srcSet?: string; caption?: string };
  children: React.ReactNode;
}) {
  return <article className="newsArticle">
    <header className="newsArticleHeader">
      {meta}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
    <figure className="newsArticleFigure">
      <img className="newsArticleHeroImage" src={image.src} alt={image.alt} srcSet={image.srcSet} sizes="(max-width: 700px) 100vw, 1200px" width="1200" height="670" />
      {image.caption ? <figcaption className="newsArticleImageCaption">{image.caption}</figcaption> : null}
    </figure>
    <div className="newsArticleContent">{children}</div>
  </article>;
}
