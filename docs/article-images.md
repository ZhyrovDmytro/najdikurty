# Article photographs

Generated on 1 November 2026 using the built-in image_gen tool. The requested direction was ordinary iPhone-style photography with normal lighting, exposure, white balance and contrast. No API key or new package was used.

Twelve topic-specific photographs replace the covers of all twelve blog articles. The five guide pages reuse the relevant generated photograph. The shared rendering also updates blog cards, homepage previews, social metadata and all three language versions. Existing club profile photographs remain unchanged. The rules diagram stays inside its article as an explanatory illustration rather than the cover.

The photographs depict generic people and venues, including the cover of the article about The Court. Captions explicitly identify the pictures as AI-generated illustrations, and alt text describes the scene without naming a real venue. They are not documentary evidence of club facilities or events.

Saved assets: `apps/web/public/articles/`, with 640px and 1200px WebP versions of each image, 24 files in total. The complete prompt set is in `docs/article-image-prompts.json`; localized descriptions and the image manifest are in `apps/web/src/article-images.json`. Source PNGs remain in the built-in generator's original output directory outside the repository. No exposure or contrast processing was applied after generation; only resizing, aspect-ratio fitting and WebP compression.

The twelve subjects are equipment costs, reception/booking, winter indoor play, beginners, underhand serving, racket-sport comparison, finding players, choosing a club, coaching, company outings, local tournaments and a generic indoor club overview.

All twelve outputs were visually checked for everyday lighting, usable framing, plausible equipment, faces/hands and fit with the article topic. Web tests cover shared image rendering, illustration captions and localized pages. Build validation requires both image sizes and verifies all 126 canonical pages. Browser checks cover desktop/mobile covers, card crops, the rules diagram and localized captions. The image directory totals approximately 2.1 MB.

The club-opening cover was regenerated on 1 November 2026 as an empty indoor singles court. Its replacement files are `singles-court-640.webp` and `singles-court-1200.webp`; the new filenames avoid reuse of cached covers. The manifest, localized alt text, news/social image URL and prompt record use the replacement. The original cover is retained in Git history. The replacement was checked for a single net, straight enclosure posts, coherent markings and natural lighting. It remains an AI-generated illustration of a generic venue.
