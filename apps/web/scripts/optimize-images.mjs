import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const clubsDir = path.join(publicDir, "clubs");
const optimizedClubsDir = path.join(clubsDir, "optimized");

const clubImageNames = [
  "cisarska-louka-padel",
  "head-tenis-centrum-vestec",
  "one-padel",
  "padel-cakovice",
  "padel-club-spoje",
  "padel-dzus",
  "padel-neride",
  "padel-powers-smichov",
  "padel-prosek",
  "padel-radotin",
  "sk-satalice",
  "sk-slavia-praha-padel",
  "tenis-a-padel-klub-pisecna",
  "tk-sparta-praha"
];

const clubSizes = [
  { suffix: "640", width: 640, quality: 74 },
  { suffix: "1200", width: 1200, quality: 78 }
];

await mkdir(optimizedClubsDir, { recursive: true });

for (const imageName of clubImageNames) {
  const inputPath = path.join(clubsDir, `${imageName}.png`);

  for (const size of clubSizes) {
    const outputPath = path.join(optimizedClubsDir, `${imageName}-${size.suffix}.webp`);
    await sharp(inputPath)
      .rotate()
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ effort: 6, quality: size.quality })
      .toFile(outputPath);
  }
}

await sharp(path.join(publicDir, "logo.png"))
  .resize({ width: 256, height: 256, fit: "contain", withoutEnlargement: true })
  .webp({ effort: 6, quality: 82 })
  .toFile(path.join(publicDir, "logo-256.webp"));

await sharp(path.join(publicDir, "logo.png"))
  .resize({ width: 128, height: 128, fit: "contain", withoutEnlargement: true })
  .webp({ effort: 6, quality: 82 })
  .toFile(path.join(publicDir, "logo-128.webp"));

await sharp(path.join(publicDir, "logo.png"))
  .resize({ width: 64, height: 64, fit: "contain", withoutEnlargement: true })
  .webp({ effort: 6, quality: 82 })
  .toFile(path.join(publicDir, "logo-64.webp"));

await sharp(path.join(publicDir, "logo.png"))
  .resize({ width: 180, height: 180, fit: "contain", withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(publicDir, "apple-touch-icon.png"));
