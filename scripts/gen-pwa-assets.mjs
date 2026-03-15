import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
const svgBuffer = readFileSync(join(iconsDir, "icon.svg"));

// Mobil screenshot SVG
const mobileSvg = Buffer.from(`<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="844" fill="#059669"/>
  <rect x="0" y="0" width="390" height="64" fill="#047857"/>
  <text x="195" y="41" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">SporPartner</text>
  <text x="195" y="400" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">Spor Ortaginı Bul</text>
  <text x="195" y="445" font-family="Arial,sans-serif" font-size="16" fill="#d1fae5" text-anchor="middle">Rakip - Partner - Antrenor</text>
  <rect x="60" y="510" width="270" height="52" rx="26" fill="white"/>
  <text x="195" y="543" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="#059669" text-anchor="middle">Hemen Basla</text>
</svg>`);

// Masaüstü screenshot SVG
const desktopSvg = Buffer.from(`<svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#f9fafb"/>
  <rect x="0" y="0" width="1280" height="64" fill="#059669"/>
  <text x="640" y="41" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">SporPartner - Spor Ortaginı Bul</text>
  <text x="640" y="380" font-family="Arial,sans-serif" font-size="40" font-weight="bold" fill="#059669" text-anchor="middle">Spor Ortaginı Bul</text>
  <text x="640" y="435" font-family="Arial,sans-serif" font-size="22" fill="#6b7280" text-anchor="middle">Ilan ver, eslest, oyna!</text>
</svg>`);

await sharp(svgBuffer).resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
console.log("✓ icon-192.png");

await sharp(svgBuffer).resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));
console.log("✓ icon-512.png");

// Maskable: SVG'yi %80 boyutuna küçült, #059669 arka planla %10 safe zone padding ekle
await sharp(svgBuffer)
  .resize(154, 154)
  .extend({ top: 19, bottom: 19, left: 19, right: 19, background: { r: 5, g: 150, b: 105, alpha: 1 } })
  .resize(192, 192)
  .png()
  .toFile(join(iconsDir, "icon-192-maskable.png"));
console.log("✓ icon-192-maskable.png");

await sharp(mobileSvg).png().toFile(join(iconsDir, "screenshot-mobile.png"));
console.log("✓ screenshot-mobile.png (390x844)");

await sharp(desktopSvg).png().toFile(join(iconsDir, "screenshot-desktop.png"));
console.log("✓ screenshot-desktop.png (1280x800)");

console.log("\nTüm PWA varlıkları üretildi!");
