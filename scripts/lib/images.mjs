// Makes web-sized WebP copies of content images. Originals are never changed.
// Output names contain a hash of the source, so browsers can cache them forever
// and a replaced picture always gets a new URL. Results are cached between builds.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const QUALITY = 82;
const VERSION = 'v1'; // bump to force every image to be regenerated

export async function makeVariants({ srcFile, id, outDir, publicDir, widths, cacheDir }) {
  const buf = fs.readFileSync(srcFile);
  const hash = crypto.createHash('sha1').update(buf).update(VERSION + QUALITY + widths.join()).digest('hex').slice(0, 10);
  const meta = await sharp(buf).metadata();
  // EXIF orientations 5-8 swap width and height once rotated.
  const [ow, oh] = meta.orientation >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
  const sizes = [...new Set(widths.map((w) => Math.min(w, ow)))].sort((a, b) => a - b);

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  const out = [];
  for (const w of sizes) {
    const name = `${id}-${hash}-${w}.webp`;
    const cached = path.join(cacheDir, name);
    if (!fs.existsSync(cached)) {
      // .rotate() applies EXIF orientation; sharp drops all metadata (incl. GPS) by default.
      await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(cached);
    }
    fs.copyFileSync(cached, path.join(outDir, name));
    out.push({ w, url: `${publicDir}/${name}` });
  }
  const largest = out[out.length - 1];
  return {
    src: largest.url,
    srcset: out.map((o) => `${o.url} ${o.w}w`).join(', '),
    width: largest.w,
    height: Math.round((largest.w * oh) / ow),
    ratio: [ow, oh],
  };
}
