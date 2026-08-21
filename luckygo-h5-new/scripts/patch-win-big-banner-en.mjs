import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '../public/banners/win-big-banner-en.source.png');
const bannerPath = path.join(__dirname, '../public/banners/win-big-banner-en.png');

const { data, info } = await sharp(sourcePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: w, height: h, channels: c } = info;
const out = Buffer.from(data);

// Old subtitle band only — uniform green, no sparkles in this strip
const subX = 16;
const subY = 155;
const subW = 405;
const subH = 56;
for (let y = subY; y < subY + subH; y++) {
  for (let x = subX; x < subX + subW; x++) {
    const i = (y * w + x) * c;
    out[i] = 1;
    out[i + 1] = 58;
    out[i + 2] = 17;
    if (c === 4) out[i + 3] = 255;
  }
}

const subtitleGold = '#FCD34D';
const subtitleWhite = '#FFFFFF';
const greenDark = '#003C2D';
const gold = '#FCD34D';
const goldDeep = '#C9A227';

const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="digitGold" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${gold}"/>
      <stop offset="100%" stop-color="${goldDeep}"/>
    </radialGradient>
  </defs>

  <text x="20" y="178" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600" fill="${subtitleWhite}">
    <tspan fill="${subtitleGold}" font-weight="700">5 GHS =</tspan> stand a chance to win
  </text>
  <text x="20" y="196" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="600" fill="${subtitleWhite}">
    any phone you stake
  </text>

  <circle cx="659" cy="82" r="15" fill="url(#digitGold)"/>
  <text x="659" y="88" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="${greenDark}">5</text>
</svg>
`;

await sharp(out, { raw: { width: w, height: h, channels: c } })
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toFile(bannerPath);

console.log(`Patched ${bannerPath} from source (${w}x${h}).`);
