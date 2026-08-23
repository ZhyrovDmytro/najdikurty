import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const indexPath = path.join(distDir, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const stylesheetPattern = /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/;
const stylesheetMatch = indexHtml.match(stylesheetPattern);

const criticalStyles = `:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f7f9fb}*{box-sizing:border-box}html,body{min-width:0;margin:0;background:#f7f9fb}body{overflow-x:hidden}.seoPrerender{width:min(960px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}.seoPrerenderHeader{display:flex;align-items:center;justify-content:space-between;gap:20px}.seoPrerenderBrand{color:#111827;font-weight:900;text-decoration:none}.seoPrerenderNav{display:flex;flex-wrap:wrap;gap:16px}.seoPrerenderNav a,.seoPrerenderFooter a{color:#4b5563;font-weight:700;text-decoration:none}.seoPrerender article{margin-top:20px;padding:24px;background:#fff;border:1px solid #dbe1e8;border-radius:8px;box-shadow:0 10px 30px rgb(15 23 42/7%)}.seoPrerender h1{margin:0 0 12px;font-size:clamp(2rem,5vw,3.5rem);line-height:1.08}.seoPrerender h2{margin:28px 0 8px;font-size:1.35rem}.seoPrerender p,.seoPrerender li{color:#5f6b7d;line-height:1.6}.seoPrerender a{color:#1769d2}.seoPrerenderClubs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:18px 0 0;padding:0;list-style:none}.seoPrerenderClubs li,.seoPrerenderFacts li{display:grid;gap:3px;padding:10px;background:#f2f5f8;border-radius:8px}.seoPrerenderClubs a{font-weight:800}.seoPrerenderFacts{display:grid;gap:8px;padding:0;list-style:none}.seoPrerenderCta{display:inline-block;margin-top:10px;padding:11px 16px;color:#fff!important;background:#087f4b;border-radius:8px;font-weight:800;text-decoration:none}.seoPrerenderFooter{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px;padding:0 4px}@media(max-width:600px){.seoPrerenderHeader{align-items:flex-start;flex-direction:column}.seoPrerender article{padding:18px}}`;

if (stylesheetMatch) {
  const stylesheetHref = stylesheetMatch[1];
  const optimizedStyles = `<style id="critical-css">${criticalStyles}</style>
    <link rel="preload" as="style" href="${stylesheetHref}" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="${stylesheetHref}"></noscript>`;
  const optimizedHtml = indexHtml.replace(stylesheetPattern, optimizedStyles);

  await writeFile(indexPath, optimizedHtml);
}
