// Builds the public website into dist/.
//   1. validates content/ (stops with a list of problems if anything is wrong)
//   2. makes web-sized copies of the pictures in images/
//   3. fills the page template in site/ with your content
// Only files copied here are published; nothing else in the project is.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './lib/content.mjs';
import { makeVariants } from './lib/images.mjs';
import { renderPage } from './lib/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'site-images');

// The design's own artwork (from the mockup export), published as-is.
const DESIGN_ASSETS = [
  'f05492ec891399551d0d42fc240f9050.jpg', // hero sky
  '8dfd1009f928f38a1da1c44d98d911f0.png', // "Preeti K" lettering
  '4c8ac84f9eb2c9da7b1628f5982e474f.png', // tiger, left
  'c5f0d00dfc921d646234c29ada3bc6f1.png', // tiger, right
  '748f5cf069b44bed6f92f75589938cee.png', // Thread Theory figure
  '81fb8f164f8e1380a5b5976abd4155bc.png', // "Leave a postcard" lettering
  'af130bde050ed78e47d1f5023b03e171.jpg', // blank postcard
  'bff07bbafe57ad4f6d35083376076786.jpg', // wind sky
  'bec0fc64f969970283fc685e85fc3714.png', // "Notes from the wind" lettering
  '3047f4e46c6508b5986bf1f4c5a373a1.jpg', // wind tree
  'ca8690c1eb0259c379bf191f943a1ea5.jpg', // Indiranagar street
  '1656fed37786323a800c992317f7ccd6.jpg', // ink-wash tiger
  'fc07336bde0a13387bed01353deeb533.png', // Bengaluru line drawing
];

// Equivalent of CSS `drop-shadow(0 8px 26px rgba(120,170,255,.3))` at the tigers'
// typical size: the picture's outline, blurred and tinted, on a canvas 15% larger
// on every side (the page places it at 130% of the tiger's box).
async function makeGlow(src, out) {
  const sharp = (await import('sharp')).default;
  const { width: w, height: h } = await sharp(src).metadata();
  const px = Math.round(w * 0.15), py = Math.round(h * 0.15), dy = Math.round(h * 0.02);
  // sharp applies operations in a fixed order, so outline+blur and the 30% strength are separate passes
  const outline = await sharp(src).ensureAlpha().extractChannel(3)
    .extend({ top: py + dy, bottom: py - dy, left: px, right: px, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(16).png().toBuffer();
  const alpha = await sharp(outline).linear(0.25, 0).png().toBuffer();
  await sharp({ create: { width: w + 2 * px, height: h + 2 * py, channels: 3, background: { r: 120, g: 170, b: 255 } } })
    .joinChannel(alpha).png({ compressionLevel: 9 }).toFile(out);
}

export async function build({ root = ROOT, dist = DIST, log = console.log } = {}) {
  const { collections, errors } = loadContent(root);
  if (errors.length) {
    const e = new Error(`Content has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
    e.contentErrors = errors;
    throw e;
  }

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  // static files: css, js, extra pages, hosting config
  fs.cpSync(path.join(root, 'site'), dist, { recursive: true, filter: (src) => !src.endsWith('index.html') });

  // design artwork
  const assetsOut = path.join(dist, 'assets');
  fs.mkdirSync(assetsOut, { recursive: true });
  for (const f of DESIGN_ASSETS) fs.copyFileSync(path.join(root, 'assets', f), path.join(assetsOut, f));
  // The Thread Theory figure is a large PNG; a WebP copy is ~6x smaller.
  await (await import('sharp')).default(path.join(root, 'assets', '748f5cf069b44bed6f92f75589938cee.png'))
    .webp({ quality: 88, alphaQuality: 90 }).toFile(path.join(assetsOut, '748f5cf069b44bed6f92f75589938cee.webp'));

  // The tigers' soft blue glow, pre-rendered. Applying it as a live CSS filter to
  // an element that rotates and fades on every scroll frame caused clipped,
  // rectangular blue patches in Chrome, so it is baked into an image instead.
  for (const [file, out] of [['4c8ac84f9eb2c9da7b1628f5982e474f.png', 'tiger-l-glow.png'], ['c5f0d00dfc921d646234c29ada3bc6f1.png', 'tiger-r-glow.png']]) {
    await makeGlow(path.join(root, 'assets', file), path.join(assetsOut, out));
  }

  // content images
  const variants = async (dir, entries, widths) => {
    const out = new Map();
    for (const e of entries) {
      out.set(e.id, await makeVariants({
        srcFile: path.join(root, 'images', dir, e.file), id: e.id, widths, cacheDir: CACHE,
        outDir: path.join(dist, 'images', dir), publicDir: `images/${dir}`,
      }));
    }
    return out;
  };
  const tomImgs = await variants('theory-of-the-mind', collections['theory-of-the-mind'], [400, 800]);
  const cardImgs = await variants('postcards', collections.postcards, [760, 1140]);
  const optionImgs = await variants('postcard-options', collections['postcard-options'], [320, 640]);

  const template = fs.readFileSync(path.join(root, 'site', 'index.html'), 'utf8');
  const html = renderPage(template, { collections, tomImgs, cardImgs, optionImgs, buildId: Date.now().toString(36) });
  fs.writeFileSync(path.join(dist, 'index.html'), html);

  // The postcard API only accepts pictures that are on the site.
  const optionIds = collections['postcard-options'].map((o) => o.id);
  fs.mkdirSync(path.join(root, 'functions', '_generated'), { recursive: true });
  fs.writeFileSync(path.join(root, 'functions', '_generated', 'options.js'),
    `// Generated by scripts/build.mjs from content/postcard-options.json. Do not edit.\nexport const OPTION_IDS = ${JSON.stringify(optionIds)};\n`);

  const count = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  log(`Built dist/: ${count(collections['theory-of-the-mind'].length, 'Theory of the Mind picture')}, `
    + `${count(collections.postcards.length, 'postcard')}, ${count(collections['postcard-options'].length, 'postcard picture option')}.`);
  return { collections };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((e) => {
    console.error(`\nBuild stopped. ${e.message}\n`);
    process.exit(1);
  });
}
