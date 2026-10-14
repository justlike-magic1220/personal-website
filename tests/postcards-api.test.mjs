import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCreate, handleList, handleAdmin, checkSubmission, LIMITS } from '../functions/_lib/postcards.js';
import { hasFoulLanguage, hasLink } from '../functions/_lib/profanity.js';

const OPTIONS = ['sea', 'trees'];

// In-memory stand-in for the D1 database.
function memoryRepo() {
  const rows = []; let next = 1;
  return {
    rows,
    async listVisible(limit) { return rows.filter((r) => !r.hidden).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); },
    async listAll(limit) { return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); },
    async countByIpSince(h, since) { return rows.filter((r) => r.ip_hash === h && r.created_at >= since).length; },
    async countSince(since) { return rows.filter((r) => r.created_at >= since).length; },
    async insert({ from, note, image, ipHash, createdAt }) {
      const r = { id: next++, sender: from, note, image, ip_hash: ipHash, created_at: createdAt, hidden: 0 };
      rows.push(r); return r;
    },
    async forgetIpsBefore(before) { rows.forEach((r) => { if (r.created_at < before) r.ip_hash = null; }); },
    async setHidden(id, h) { const r = rows.find((x) => x.id === id); if (!r) return false; r.hidden = h ? 1 : 0; return true; },
    async remove(id) { const i = rows.findIndex((x) => x.id === id); if (i < 0) return false; rows.splice(i, 1); return true; },
  };
}

const post = (body, { ip = '1.1.1.1', origin = 'https://site.test' } = {}) => new Request('https://site.test/api/postcards', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(origin ? { origin } : {}) },
  body: JSON.stringify(body),
});
const good = { from: 'Asha', note: 'Lovely site!', image: 'sea' };

test('a good postcard is saved and listed', async () => {
  const repo = memoryRepo();
  const res = await handleCreate(post(good), repo, { optionIds: OPTIONS });
  assert.equal(res.status, 201);
  const { postcard } = await res.json();
  assert.equal(postcard.from, 'Asha');
  const list = await (await handleList(repo)).json();
  assert.equal(list.postcards.length, 1);
  assert.ok(!('ip_hash' in list.postcards[0]), 'IP hashes are never sent to browsers');
});

test('foul language, links and unknown pictures are refused', async () => {
  const repo = memoryRepo();
  for (const body of [
    { ...good, note: 'you are a b!tch' },
    { ...good, from: 'F U C K' },
    { ...good, note: 'visit www.spam.com' },
    { ...good, image: 'not-an-option' },
    { ...good, from: '   ' },
    { ...good, note: 'x'.repeat(LIMITS.note + 1) },
  ]) {
    const res = await handleCreate(post(body), repo, { optionIds: OPTIONS });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(repo.rows.length, 0);
});

test('posts from other websites are refused', async () => {
  const res = await handleCreate(post(good, { origin: 'https://evil.test' }), memoryRepo(), { optionIds: OPTIONS });
  assert.equal(res.status, 403);
});

test('the hidden bot field fakes success but stores nothing', async () => {
  const repo = memoryRepo();
  const res = await handleCreate(post({ ...good, website: 'http://bot' }), repo, { optionIds: OPTIONS });
  assert.equal(res.status, 201);
  assert.equal(repo.rows.length, 0);
});

test('each visitor is rate limited', async () => {
  const repo = memoryRepo();
  for (let i = 0; i < LIMITS.perVisitor; i++) assert.equal((await handleCreate(post(good), repo, { optionIds: OPTIONS })).status, 201);
  assert.equal((await handleCreate(post(good), repo, { optionIds: OPTIONS })).status, 429);
  assert.equal((await handleCreate(post(good, { ip: '2.2.2.2' }), repo, { optionIds: OPTIONS })).status, 201, 'other visitors are unaffected');
});

test('control characters are stripped and whitespace squeezed', () => {
  const { value } = checkSubmission({ from: ' A\u0000sha ', note: 'hi\n\n  there‮', image: 'sea' }, OPTIONS);
  assert.equal(value.from, 'A sha');
  assert.equal(value.note, 'hi there');
});

test('hidden postcards disappear from the public list', async () => {
  const repo = memoryRepo();
  await handleCreate(post(good), repo, { optionIds: OPTIONS });
  repo.rows[0].hidden = 1;
  assert.equal((await (await handleList(repo)).json()).postcards.length, 0);
});

const admin = (method, password, body) => new Request('https://site.test/api/admin/postcards', {
  method, headers: { authorization: `Bearer ${password}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
});

test('admin needs the right password', async () => {
  const repo = memoryRepo();
  assert.equal((await handleAdmin(admin('GET', 'wrong'), repo, { password: 'right' })).status, 401);
  assert.equal((await handleAdmin(admin('GET', ''), repo, { password: 'right' })).status, 401);
  assert.equal((await handleAdmin(admin('GET', 'x'), repo, { password: undefined })).status, 503);
  assert.equal((await handleAdmin(admin('GET', 'right'), repo, { password: 'right' })).status, 200);
});

test('admin can hide, show and delete', async () => {
  const repo = memoryRepo();
  await handleCreate(post(good), repo, { optionIds: OPTIONS });
  assert.equal((await handleAdmin(admin('PATCH', 'pw', { hidden: true }), repo, { password: 'pw', id: '1' })).status, 200);
  assert.equal(repo.rows[0].hidden, 1);
  assert.equal((await handleAdmin(admin('PATCH', 'pw', { hidden: false }), repo, { password: 'pw', id: '1' })).status, 200);
  assert.equal(repo.rows[0].hidden, 0);
  assert.equal((await handleAdmin(admin('DELETE', 'pw'), repo, { password: 'pw', id: '1' })).status, 200);
  assert.equal(repo.rows.length, 0);
  assert.equal((await handleAdmin(admin('DELETE', 'pw'), repo, { password: 'pw', id: '1' })).status, 404);
  assert.equal((await handleAdmin(admin('DELETE', 'pw'), repo, { password: 'pw', id: 'abc' })).status, 404);
});

test('foul-language filter: catches disguises, allows innocent words', () => {
  for (const t of ['fuck you', 'F U C K', 'f.u.c.k', 'sh1t', '$h!t', 'fuuuuck', 'madarchod', 'b s d k', 'motherfucking'])
    assert.ok(hasFoulLanguage(t), t);
  for (const t of ['this hit me hard', 'I would die for this view', 'I hate goodbyes', 'Scenic Sussex', 'classic', 'assess the cocktail', 'kutti, miss you', 'gubbe on the window', 'i am a cat'])
    assert.ok(!hasFoulLanguage(t), t);
  assert.ok(hasLink('see https://x.y') && hasLink('www.x.com') && hasLink('me@mail.com'));
  assert.ok(!hasLink('see you soon. Bye.'));
});
