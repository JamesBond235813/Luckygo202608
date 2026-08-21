import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src) {
  console.error('Usage: node export-banner-to-public.mjs <source-image>');
  process.exit(1);
}

const dest = path.join(__dirname, '../public/banners/win-big-banner-en.png');
const outW = 720;
const outH = 400;
const bg = { r: 0, g: 75, b: 55, alpha: 1 };

const meta = await sharp(src).metadata();
const ratio = (meta.width || 1) / (meta.height || 1);
const target = outW / outH;

let pipeline = sharp(src);
if (Math.abs(ratio - target) > 0.02) {
  pipeline = pipeline.resize(outW, outH, {
    fit: 'contain',
    position: 'centre',
    background: bg,
  });
} else {
  pipeline = pipeline.resize(outW, outH, { fit: 'fill' });
}

await pipeline.png().toFile(dest);
console.log(`Exported ${meta.width}x${meta.height} -> ${dest} (${outW}x${outH})`);
