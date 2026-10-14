// Loads and validates the content files in content/. Every problem is
// collected and reported together, so one run shows everything to fix.
import fs from 'node:fs';
import path from 'node:path';

export const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['published', 'draft'];

const common = {
  id: { required: true },
  file: { required: true },
  alt: { required: true },
  status: { required: true },
  order: { required: true },
};

// Field rules per collection. Unknown fields are reported, which catches typos.
export const COLLECTIONS = {
  'theory-of-the-mind': {
    contentFile: 'theory-of-the-mind.json',
    imageDir: 'theory-of-the-mind',
    fields: {
      ...common,
      kind: { required: true, oneOf: ['poster', 'photograph'] },
      title: { required: true, max: 120 },
      caption: { max: 400 },
      collection: { max: 60 },
      date: { date: true },
    },
  },
  postcards: {
    contentFile: 'postcards.json',
    imageDir: 'postcards',
    fields: {
      ...common,
      style: { required: true, oneOf: ['image', 'written'] },
      title: { max: 120 },
      from: { max: 40 },
      note: { max: 220 },
      date: { date: true },
      tags: { list: true },
      link: { url: true },
    },
    check(entry, err) {
      if (entry.style === 'written') {
        if (!isText(entry.from)) err('"from" is required when style is "written"');
        if (!isText(entry.note)) err('"note" is required when style is "written"');
        if (!isText(entry.date)) err('"date" is required when style is "written" (it is stamped on the card)');
      }
    },
  },
  'postcard-options': {
    contentFile: 'postcard-options.json',
    imageDir: 'postcard-options',
    fields: { ...common },
  },
};

function isText(v) { return typeof v === 'string' && v.trim() !== ''; }

function validDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Validates already-parsed data. `imageExists(name)` reports whether a file is
// present in the collection's image folder. Returns { entries, errors }, where
// entries holds only published items, sorted by order then id.
export function validateCollection(name, data, imageExists) {
  const spec = COLLECTIONS[name];
  const errors = [];
  if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
    return { entries: [], errors: [`${spec.contentFile}: must contain an "entries" list`] };
  }
  const seen = new Map();
  data.entries.forEach((entry, i) => {
    const where = `${spec.contentFile} entry #${i + 1}${entry && isText(entry.id) ? ` ("${entry.id}")` : ''}`;
    const err = (msg) => errors.push(`${where}: ${msg}`);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { err('must be an object { ... }'); return; }

    for (const key of Object.keys(entry)) {
      if (!(key in spec.fields)) err(`unknown field "${key}" (allowed: ${Object.keys(spec.fields).join(', ')})`);
    }
    for (const [key, rule] of Object.entries(spec.fields)) {
      const v = entry[key];
      if (v === undefined || v === null || v === '') {
        if (rule.required) err(`"${key}" is required`);
        continue;
      }
      if (key === 'order') { if (typeof v !== 'number' || !Number.isFinite(v)) err('"order" must be a number, like 10'); continue; }
      if (rule.list) { if (!Array.isArray(v) || !v.every(isText)) err(`"${key}" must be a list of words, like ["travel", "friends"]`); continue; }
      if (typeof v !== 'string') { err(`"${key}" must be text in "quotes"`); continue; }
      if (rule.max && v.length > rule.max) err(`"${key}" is ${v.length} characters; the limit is ${rule.max}`);
      if (rule.oneOf && !rule.oneOf.includes(v)) err(`"${key}" must be one of: ${rule.oneOf.join(', ')} (got "${v}")`);
      if (rule.date && !validDate(v)) err(`"${key}" must be a real date written YYYY-MM-DD (got "${v}")`);
      if (rule.url && !/^https:\/\/[^\s]+$/.test(v)) err(`"${key}" must start with https:// (got "${v}")`);
    }

    if (isText(entry.id)) {
      if (!ID_RE.test(entry.id)) err('"id" may only use lowercase letters, numbers and single dashes, like "beach-day-2"');
      if (seen.has(entry.id)) err(`duplicate id; also used by entry #${seen.get(entry.id)}`);
      else seen.set(entry.id, i + 1);
    }
    if (isText(entry.status) && !STATUSES.includes(entry.status)) err(`"status" must be "published" or "draft" (got "${entry.status}")`);
    if (isText(entry.file)) {
      const f = entry.file;
      if (f.includes('/') || f.includes('\\') || f.startsWith('.')) {
        err(`"file" should be just the file name, like "beach.jpg" (not a path). Put the image in images/${spec.imageDir}/`);
      } else if (!IMAGE_EXTS.includes(path.extname(f).toLowerCase())) {
        err(`"file" must be a ${IMAGE_EXTS.join(', ')} image (got "${f}"). iPhone HEIC photos need converting to JPG first`);
      } else if (!imageExists(f)) {
        err(`image not found: images/${spec.imageDir}/${f} (check the spelling and capital letters)`);
      }
    }
    if (spec.check) spec.check(entry, err);
  });

  const entries = errors.length ? [] : data.entries
    .filter((e) => e.status === 'published')
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { entries, errors };
}

// Reads every collection from disk. Returns { collections, errors }.
export function loadContent(root) {
  const collections = {};
  const errors = [];
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    const file = path.join(root, 'content', spec.contentFile);
    const dir = path.join(root, 'images', spec.imageDir);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(e.code === 'ENOENT'
        ? `content/${spec.contentFile}: file is missing`
        : `content/${spec.contentFile}: not valid JSON. ${e.message}. Look for a missing comma, quote or bracket near there`);
      collections[name] = [];
      continue;
    }
    // Exact, case-sensitive match so a build on Linux behaves like Windows.
    const present = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : []);
    const res = validateCollection(name, data, (f) => present.has(f));
    collections[name] = res.entries;
    errors.push(...res.errors);
  }
  if (!errors.length && collections['postcard-options'].length === 0) {
    errors.push('content/postcard-options.json: publish at least one picture so visitors can write a postcard');
  }
  return { collections, errors };
}
