// Visitor postcards: rules and request handling. Storage is a small "repo"
// object (see d1Repo below) so the rules can be tested without Cloudflare.
import { hasFoulLanguage, hasLink } from './profanity.js';

export const LIMITS = {
  from: 40,
  note: 220,
  perVisitor: 3,          // postcards per visitor ...
  perVisitorMinutes: 10,  // ... within this many minutes
  perDay: 300,            // across everyone, protects the free database quota
  listed: 200,            // newest postcards shown on the site
  bodyBytes: 4096,
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

// Plain single-line text: no control characters, runs of spaces squeezed.
export function clean(s) {
  return String(s ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Returns { value } or { error } for a submitted postcard.
export function checkSubmission(body, optionIds) {
  if (!body || typeof body !== 'object') return { error: 'Something went wrong. Please try again.' };
  const from = clean(body.from), note = clean(body.note), image = String(body.image ?? '');
  if (!from) return { error: 'Please add your name.' };
  if (!note) return { error: 'Please write a note.' };
  if (from.length > LIMITS.from) return { error: `Your name can be up to ${LIMITS.from} characters.` };
  if (note.length > LIMITS.note) return { error: `Your note can be up to ${LIMITS.note} characters.` };
  if (!optionIds.includes(image)) return { error: 'Please pick one of the photos.' };
  if (hasFoulLanguage(from) || hasFoulLanguage(note)) return { error: 'Please keep it kind. Some words in your postcard aren’t allowed here.' };
  if (hasLink(from) || hasLink(note)) return { error: 'Links and email addresses can’t go on postcards.' };
  return { value: { from, note, image } };
}

export function publicPostcard(row) {
  return { id: row.id, from: row.sender, note: row.note, image: row.image, created_at: row.created_at };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleList(repo) {
  const rows = await repo.listVisible(LIMITS.listed);
  return json({ postcards: rows.map(publicPostcard) }, 200, { 'cache-control': 'public, max-age=15' });
}

export async function handleCreate(request, repo, { optionIds, salt = '', now = new Date() }) {
  // Only accept posts from this site's own pages.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Not allowed.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > LIMITS.bodyBytes) return json({ error: 'That postcard is too long.' }, 413);

  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ error: 'Something went wrong. Please try again.' }, 400); }

  // Bots fill in the hidden "website" field; pretend it worked and store nothing.
  if (body && body.website) {
    return json({ postcard: { id: 0, from: clean(body.from).slice(0, LIMITS.from), note: clean(body.note).slice(0, LIMITS.note), image: optionIds[0], created_at: now.toISOString() } }, 201);
  }

  const checked = checkSubmission(body, optionIds);
  if (checked.error) return json({ error: checked.error }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = (await sha256(`${salt}|${ip}`)).slice(0, 32);
  const since = new Date(now.getTime() - LIMITS.perVisitorMinutes * 60e3).toISOString();
  if (await repo.countByIpSince(ipHash, since) >= LIMITS.perVisitor) {
    return json({ error: 'You’ve sent a few postcards already. Please wait a few minutes before sending another.' }, 429);
  }
  const dayAgo = new Date(now.getTime() - 864e5).toISOString();
  if (await repo.countSince(dayAgo) >= LIMITS.perDay) {
    return json({ error: 'The postbox is full for today. Please try again tomorrow.' }, 429);
  }

  const row = await repo.insert({ ...checked.value, ipHash, createdAt: now.toISOString() });
  await repo.forgetIpsBefore(dayAgo); // IP hashes are only kept for a day
  return json({ postcard: publicPostcard(row) }, 201);
}

/* ---------- owner-only (admin) ---------- */

// Compares hashes so the time taken doesn't reveal how much of the password matched.
export async function isOwner(request, password) {
  if (!password) return false;
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!given) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(password)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handleAdmin(request, repo, { password, id }) {
  if (!password) return json({ error: 'The admin password has not been set up yet. See DEPLOY.md.' }, 503);
  if (!(await isOwner(request, password))) return json({ error: 'Wrong password.' }, 401);
  const method = request.method;
  if (id === undefined) {
    if (method !== 'GET') return json({ error: 'Not allowed.' }, 405);
    const rows = await repo.listAll(1000);
    return json({ postcards: rows.map((r) => ({ ...publicPostcard(r), hidden: !!r.hidden })) });
  }
  const num = Number(id);
  if (!Number.isInteger(num) || num < 1) return json({ error: 'Unknown postcard.' }, 404);
  if (method === 'DELETE') {
    const ok = await repo.remove(num);
    return ok ? json({ ok: true }) : json({ error: 'Unknown postcard.' }, 404);
  }
  if (method === 'PATCH') {
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!body || typeof body.hidden !== 'boolean') return json({ error: 'Send { "hidden": true } or { "hidden": false }.' }, 400);
    const ok = await repo.setHidden(num, body.hidden);
    return ok ? json({ ok: true }) : json({ error: 'Unknown postcard.' }, 404);
  }
  return json({ error: 'Not allowed.' }, 405);
}

/* ---------- Cloudflare D1 storage ---------- */

export function d1Repo(db) {
  return {
    async listVisible(limit) {
      const { results } = await db.prepare('SELECT id, sender, note, image, created_at FROM postcards WHERE hidden = 0 ORDER BY created_at DESC, id DESC LIMIT ?').bind(limit).all();
      return results;
    },
    async listAll(limit) {
      const { results } = await db.prepare('SELECT id, sender, note, image, created_at, hidden FROM postcards ORDER BY created_at DESC, id DESC LIMIT ?').bind(limit).all();
      return results;
    },
    async countByIpSince(ipHash, since) {
      return (await db.prepare('SELECT COUNT(*) AS n FROM postcards WHERE ip_hash = ? AND created_at >= ?').bind(ipHash, since).first()).n;
    },
    async countSince(since) {
      return (await db.prepare('SELECT COUNT(*) AS n FROM postcards WHERE created_at >= ?').bind(since).first()).n;
    },
    async insert({ from, note, image, ipHash, createdAt }) {
      return db.prepare('INSERT INTO postcards (sender, note, image, ip_hash, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id, sender, note, image, created_at')
        .bind(from, note, image, ipHash, createdAt).first();
    },
    async forgetIpsBefore(before) {
      await db.prepare('UPDATE postcards SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ?').bind(before).run();
    },
    async setHidden(id, hidden) {
      const r = await db.prepare('UPDATE postcards SET hidden = ? WHERE id = ?').bind(hidden ? 1 : 0, id).run();
      return r.meta.changes > 0;
    },
    async remove(id) {
      const r = await db.prepare('DELETE FROM postcards WHERE id = ?').bind(id).run();
      return r.meta.changes > 0;
    },
  };
}
