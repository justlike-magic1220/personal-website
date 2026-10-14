// Builds the real site into a temporary folder and checks the output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-dist-'));
const result = await build({ dist, log: () => {} });
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

test('every local asset referenced by the page exists in the build', () => {
  const refs = new Set();
  for (const m of html.matchAll(/(src|href|srcset)="([^"]+)"/g)) {
    for (const part of m[1] === 'srcset' ? m[2].split(',') : [m[2]]) {
      const url = part.trim().split(/\s+/)[0];
      if (!url || /^(https?:|#|data:|mailto:)/.test(url)) continue;
      refs.add(url.split('?')[0].replace(/^\//, ''));
    }
  }
  // images listed in the embedded data (for visitor postcards)
  const data = JSON.parse(html.match(/<script type="application\/json" id="site-data">(.*?)<\/script>/s)[1]);
  for (const o of data.options) refs.add(o.src);
  assert.ok(refs.size > 20);
  for (const r of refs) assert.ok(fs.existsSync(path.join(dist, r)), `missing in dist: ${r}`);
});

test('paths are relative to the site, never local file paths', () => {
  assert.ok(!/[A-Z]:\\|file:\/\/|\/Users\/|OneDrive/i.test(html));
});

test('page contains all published content', () => {
  const tom = result.collections['theory-of-the-mind'];
  assert.equal(html.match(/class="tn /g).length, tom.length);
  assert.equal(html.match(/<article class="pc"/g).length, result.collections.postcards.length);
  assert.ok(html.includes('Thread Theory:'));
  assert.ok(!html.includes('<!--@'), 'no unfilled template markers');
});

test('only intended files are published', () => {
  const top = fs.readdirSync(dist).sort();
  assert.deepEqual(top, ['404.html', '_headers', '_routes.json', 'admin.html', 'assets', 'css', 'favicon.svg', 'images', 'index.html', 'js', 'robots.txt']);
  // originals (full-size JPGs) never ship, only web copies
  const imgs = fs.readdirSync(path.join(dist, 'images', 'theory-of-the-mind'));
  assert.ok(imgs.every((f) => f.endsWith('.webp')));
});

test('web images carry no camera metadata', async () => {
  const sharp = (await import('sharp')).default;
  const dir = path.join(dist, 'images', 'theory-of-the-mind');
  for (const f of fs.readdirSync(dir).slice(0, 10)) {
    const meta = await sharp(path.join(dir, f)).metadata();
    assert.equal(meta.exif, undefined, `${f} has EXIF data`);
  }
});

test('the API only accepts the published picture options', async () => {
  const { OPTION_IDS } = await import('../functions/_generated/options.js');
  assert.deepEqual(OPTION_IDS, result.collections['postcard-options'].map((o) => o.id));
});
