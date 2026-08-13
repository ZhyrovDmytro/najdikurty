import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const indexPath = path.join(distDir, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const stylesheetPattern = /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/;
const stylesheetMatch = indexHtml.match(stylesheetPattern);

if (stylesheetMatch) {
  const stylesheetHref = stylesheetMatch[1];
  const stylesheetPath = path.join(distDir, stylesheetHref.replace(/^\//, ""));
  const stylesheet = await readFile(stylesheetPath, "utf8");
  const inlinedHtml = indexHtml.replace(stylesheetPattern, `<style>${stylesheet}</style>`);

  await writeFile(indexPath, inlinedHtml);
  await rm(stylesheetPath);
}
