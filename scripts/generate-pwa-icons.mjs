import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = path.join(root, "public", "images", "logo.png");
const cropped = await sharp(logoPath)
  .extract({ left: 40, top: 1, width: 190, height: 238 })
  .png()
  .toBuffer();
const source = await sharp(cropped)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

async function renderIcon(size, filename, markRatio = 0.78) {
  const markSize = Math.round(size * markRatio);
  const mark = await sharp(source)
    .resize(markSize, markSize, {
      fit: "contain",
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "public", filename));
}

await Promise.all([
  renderIcon(192, "pwa-icon-192.png"),
  renderIcon(512, "pwa-icon-512.png"),
  renderIcon(180, "apple-touch-icon.png", 0.74),
]);
