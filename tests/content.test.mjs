import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateCollection, loadContent } from '../scripts/lib/content.mjs';

const has = (...names) => (f) => names.includes(f);
const tom = (over = {}) => ({ id: 'a', kind: 'photograph', file: 'a.jpg', title: 'A', alt: 'An a', status: 'published', order: 10, ...over });

test('valid entries are returned sorted by order, then id', () => {
  const { entries, errors } = validateCollection('theory-of-the-mind', {
    entries: [tom({ id: 'c', file: 'c.jpg', order: 20 }), tom({ id: 'b', file: 'b.jpg', order: 10 }), tom({ id: 'a', order: 10 })],
  }, has('a.jpg', 'b.jpg', 'c.jpg'));
  assert.deepEqual(errors, []);
  assert.deepEqual(entries.map((e) => e.id), ['a', 'b', 'c']);
});

test('drafts are left out of the published list', () => {
  const { entries } = validateCollection('theory-of-the-mind', {
    entries: [tom(), tom({ id: 'secret', file: 'b.jpg', status: 'draft' })],
  }, has('a.jpg', 'b.jpg'));
  assert.deepEqual(entries.map((e) => e.id), ['a']);
});

test('optional fields may be missing', () => {
  const { errors } = validateCollection('theory-of-the-mind', { entries: [tom()] }, has('a.jpg'));
  assert.deepEqual(errors, []);
  const pc = validateCollection('postcards', { entries: [{ id: 'p', style: 'image', file: 'p.jpg', alt: 'x', status: 'published', order: 1 }] }, has('p.jpg'));
  assert.deepEqual(pc.errors, []);
});

test('duplicate ids are reported', () => {
  const { errors } = validateCollection('theory-of-the-mind', { entries: [tom(), tom({ file: 'b.jpg' })] }, has('a.jpg', 'b.jpg'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /duplicate id; also used by entry #1/);
});

test('missing images and bad paths are reported', () => {
  const { errors } = validateCollection('theory-of-the-mind', {
    entries: [
      tom({ file: 'missing.jpg' }),
      tom({ id: 'b', file: '../secret/b.jpg' }),
      tom({ id: 'c', file: 'c.heic' }),
      tom({ id: 'd', file: 'images/theory-of-the-mind/d.jpg' }),
    ],
  }, has());
  assert.equal(errors.length, 4);
  assert.match(errors[0], /image not found: images\/theory-of-the-mind\/missing\.jpg/);
  assert.match(errors[1], /just the file name/);
  assert.match(errors[2], /HEIC photos need converting/);
  assert.match(errors[3], /just the file name/);
});

test('invalid values and unknown fields are reported with helpful messages', () => {
  const { errors, entries } = validateCollection('theory-of-the-mind', {
    entries: [tom({ id: 'Bad ID', kind: 'painting', status: 'live', order: '1', date: '2026-02-30', titel: 'typo' })],
  }, has('a.jpg'));
  const all = errors.join('\n');
  assert.match(all, /unknown field "titel"/);
  assert.match(all, /"kind" must be one of: poster, photograph/);
  assert.match(all, /"status" must be "published" or "draft"/);
  assert.match(all, /"order" must be a number/);
  assert.match(all, /real date/);
  assert.match(all, /lowercase letters/);
  assert.deepEqual(entries, [], 'nothing is published while there are errors');
});

test('required fields are reported', () => {
  const { errors } = validateCollection('theory-of-the-mind', { entries: [{ id: 'x' }] }, has());
  for (const f of ['file', 'alt', 'status', 'order', 'kind', 'title']) assert.ok(errors.some((e) => e.includes(`"${f}" is required`)), f);
});

test('written postcards need from, note and date; notes have a length limit', () => {
  const { errors } = validateCollection('postcards', {
    entries: [{ id: 'w', style: 'written', file: 'w.jpg', alt: 'x', status: 'published', order: 1, note: 'n'.repeat(221) }],
  }, has('w.jpg'));
  const all = errors.join('\n');
  assert.match(all, /"from" is required when style is "written"/);
  assert.match(all, /"date" is required/);
  assert.match(all, /"note" is 221 characters; the limit is 220/);
});

test('loadContent reports broken JSON with a hint', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-content-'));
  fs.mkdirSync(path.join(root, 'content'));
  fs.writeFileSync(path.join(root, 'content', 'theory-of-the-mind.json'), '{ "entries": [ { "id": "a", } ] }');
  fs.writeFileSync(path.join(root, 'content', 'postcards.json'), '{ "entries": [] }');
  fs.writeFileSync(path.join(root, 'content', 'postcard-options.json'), '{ "entries": [] }');
  const { errors } = loadContent(root);
  assert.match(errors.join('\n'), /theory-of-the-mind\.json: not valid JSON.*missing comma/);
});

test('the real content files are valid', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const { errors, collections } = loadContent(root);
  assert.deepEqual(errors, []);
  assert.ok(collections['theory-of-the-mind'].length > 1);
  assert.ok(collections['postcard-options'].length > 0);
});
