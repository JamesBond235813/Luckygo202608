import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../public/banners/win-big-banner-en.png');
const outW = 720;
const outH = 400;

const meta = await sharp(src).metadata();
await sharp(src)
  .resize(outW, outH, { fit: 'cover', position: 'centre' })
  .png()
  .toFile(src + '.tmp');

import fs from 'fs';
fs.renameSync(src + '.tmp', src);
console.log(`Resized ${src} from ${meta.width}x${meta.height} -> ${outW}x${outH}`);
