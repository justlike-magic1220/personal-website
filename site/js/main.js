// Preeti K — page behaviour: hero tigers, Thread Theory sphere, postcards,
// Notes from the wind. Ported from the design mockup's logic, without the
// design tool's runtime or React.
import { TG } from './tiger-digits.js';
import { writtenCardHtml } from './cards.js';

const DATA = JSON.parse(document.getElementById('site-data').textContent);
const NODES = DATA.nodes;
const OPTIONS = new Map(DATA.options.map((o) => [o.id, o]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const cl = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function hash(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
function inView(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
  return r.bottom > -50 && r.top < vh + 50;
}

/* ---------------- animation loop ---------------- */
const t0 = performance.now();
let raf = 0;
function kick() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0;
  let busy = heroFrame(now);
  busy = threadFrame(now) || busy;
  busy = windFrame(now) || busy;
  if (busy) kick();
}

/* ---------------- 01 · hero: pounce, dissolve to digits, dive ---------------- */
const hero = $('.hero'), stick = $('.hero-stick'), tigerL = $('.tg.l');
let digitsOn = false;

function heroFrame(now) {
  const r = hero.getBoundingClientRect();
  const total = Math.max(1, hero.offsetHeight - stick.offsetHeight);
  const p = cl(-r.top / total);
  const a = ease(cl(p / 0.4)), g = cl((p - 0.3) / 0.16), d = ease(cl((p - 0.52) / 0.48)), arc = Math.sin(Math.PI * cl(p / 0.4));
  const sw = stick.clientWidth, sh = stick.clientHeight;
  const mx = tigerL ? sw / 2 - (tigerL.offsetLeft + tigerL.offsetWidth * 0.9) : 300;
  const s = hero.style;
  s.setProperty('--p', p.toFixed(4)); s.setProperty('--a', a.toFixed(4)); s.setProperty('--g', g.toFixed(4)); s.setProperty('--d', d.toFixed(4));
  s.setProperty('--arc', arc.toFixed(4)); s.setProperty('--mx', mx.toFixed(1)); s.setProperty('--rise', (sh * 0.14).toFixed(1)); s.setProperty('--dy', (sh * 0.95).toFixed(1));
  if (g > 0.001 && inView(stick) && r.bottom > 0) {
    drawDigits('.tg-cv-l', TG.L, 406, g, d, now);
    drawDigits('.tg-cv-r', TG.R, 402, g, d, now);
    return d < 0.999;
  }
  if (digitsOn) { clearCanvas('.tg-cv-l'); clearCanvas('.tg-cv-r'); digitsOn = false; }
  return false;
}
// The digit canvases are hidden whenever they're not in use, so a stale frame can never show over the tiger.
function clearCanvas(sel) { const c = $(sel); if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.classList.remove('on'); } }
function drawDigits(sel, grid, iw, g, d, now) {
  const c = $(sel); if (!c || !c.width) return;
  digitsOn = true; c.classList.add('on');
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  const ox = W * 0.1875, oy = H * 0.1875, bw = W * 0.625, bh = H * 0.625;
  const cell = (bw * 8) / iw, t = reduceMotion.matches ? 0 : (now - t0) / 1000;
  ctx.font = (cell * 1.25).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rows = grid.rows.split('|');
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row.charAt(i); if (ch === ' ') continue;
      const h = hash(i, j);
      const ap = cl((g * 1.7 - h * 0.7) / 0.35); if (ap <= 0) continue;
      const fall = Math.pow(d, 1.5) * (0.35 + h) * bh * 1.1, drift = Math.sin(h * 40 + j) * d * cell * 6;
      let al = ap * (1 - d * 0.9), col;
      if (ch === 'r') col = '255,112,98';
      else { const b = +ch; col = b <= 3 ? '176,232,255' : (b <= 6 ? '120,178,246' : '92,132,226'); al *= b <= 3 ? 1 : (b <= 6 ? 0.85 : 0.5); }
      ctx.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
      ctx.fillText(ch === 'r' ? '1' : String((i * 7 + j * 13 + Math.floor(t * 6 + h * 10)) % 10), ox + (i + 0.5) * cell + drift, oy + (j + 0.5) * cell + fall);
    }
  }
}

/* ---------------- 02 · Thread Theory: 3D index ---------------- */
const scene = $('.scene'), note = $('.th-note');
const tnEls = $$('.tn', scene);
// The scene is the original composition (height H0) plus room above for the
// threads' curves and room below for the title. Keep in sync with .scene in site.css.
const SCENE = { scale: 1.4, top: 0.25 };
// The sphere is laid out inside a box with the reference (tablet) proportions,
// so wide screens don't stretch it into a flat band. Pictures are sized from that
// box, and stop growing past PIC_BASE so they stay small on big screens.
const SCENE_RATIO = 0.84, PIC_BASE = 1100;
let sphereW = 0, H0 = 0;
const nodeW = [], nodeH = [];
function sizeSphere() {
  H0 = scene.clientHeight / SCENE.scale;
  sphereW = Math.min(scene.clientWidth, H0 / SCENE_RATIO);
  const base = Math.min(sphereW, PIC_BASE);
  tnEls.forEach((el, i) => { el.style.width = ((NODES[i].bw / 100) * base).toFixed(1) + 'px'; });
  tnEls.forEach((el, i) => { nodeW[i] = el.offsetWidth; nodeH[i] = el.offsetHeight; });
}
const cam = { yaw: 0.35, pitch: -0.12, k: 1, vy: 0, vp: 0, tYaw: null, tPitch: null, tK: 1, gap: 1 };
let active = null, dragInfo = null, justDragged = false, dragging = false;

function setActive(i, { focusNote = false } = {}) {
  active = i;
  scene.classList.toggle('focus', i !== null);
  tnEls.forEach((el, k) => {
    el.classList.toggle('act', k === i);
    el.setAttribute('aria-pressed', String(k === i));
  });
  // The focused picture is zoomed 2.3x, so ask for the sharper file.
  if (i !== null) tnEls[i].querySelector('img').sizes = '(max-width: 700px) 60vw, 30vw';
  if (i === null) {
    note.hidden = true;
    cam.tYaw = null; cam.tPitch = null; cam.tK = 1;
  } else {
    const n = NODES[i];
    $('.th-idx', note).textContent = `Thread ${String(i + 1).padStart(2, '0')} / ${NODES.length}`;
    $('.th-kind', note).textContent = n.kind === 'post' ? 'poster' : 'photograph';
    $('#th-note-title').textContent = n.title;
    const cap = $('.th-cap', note);
    cap.textContent = n.caption || '';
    cap.hidden = !n.caption;
    if (note.hidden) { note.hidden = false; }
    if (focusNote) $('.th-close', note).focus({ preventScroll: true });
    // focus the camera on the node
    const rr = Math.sqrt(n.x * n.x + n.z * n.z);
    const yaw = Math.atan2(n.x, -n.z), pitch = -Math.atan2(n.y, rr);
    let dy = yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cam.tYaw = cam.yaw + dy; cam.tPitch = pitch; cam.tK = 2.3;
  }
  kick();
}

function threadFrame() {
  if (!inView(scene)) return false;
  const c = cam;
  if (c.tYaw !== null) { c.yaw += (c.tYaw - c.yaw) * 0.07; c.pitch += (c.tPitch - c.pitch) * 0.07; }
  else if (!dragging) {
    c.yaw += c.vy; c.pitch += c.vp; c.vy *= 0.94; c.vp *= 0.9;
    if (!reduceMotion.matches && Math.abs(c.vy) < 0.0009) c.yaw += 0.0011;
    c.pitch += (-0.12 - c.pitch) * 0.01;
  }
  c.k += (c.tK - c.k) * 0.07;
  c.pitch = Math.max(-0.9, Math.min(0.9, c.pitch));
  const W = scene.clientWidth, H = scene.clientHeight, cx = W / 2, cy = H0 * (SCENE.top + 0.39);
  const Rx = sphereW * 0.43, Ry = H0 * 0.34, f = 2.4;
  const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const girl = $('.girl', scene), gr = girl.getBoundingClientRect(), sr = scene.getBoundingClientRect();
  const hx = gr.left - sr.left + gr.width * 0.37, hy = gr.top - sr.top + gr.height * 0.01;
  // Keep a clear column around the figure so her face and body stay visible.
  // It opens while browsing and closes when a picture is focused (she fades then).
  c.gap += ((active === null ? 1 : 0) - c.gap) * 0.07;
  const gapHalf = gr.width * 0.62 * c.gap, gTop = gr.top - sr.top, gBot = gr.bottom - sr.top;
  const cv = $('.th-cv', scene), ctx = cv.width ? cv.getContext('2d') : null, dpr = cv._dpr || 1;
  if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); }
  const proj = [];
  for (let i = 0; i < NODES.length && i < tnEls.length; i++) {
    const n = NODES[i];
    const x1 = n.x * cyw + n.z * syw, z1 = -n.x * syw + n.z * cyw;
    const y2 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp;
    const sc = f / (f + z2);
    const span = sc * Rx * c.k; // furthest this picture can sit from the centre line
    const py = cy + y2 * sc * Ry * c.k;
    let dx = x1 * span, fade = 1;
    const halfH = (nodeH[i] || 0) * sc * c.k / 2;
    if (gapHalf > 1 && py + halfH > gTop && py - halfH < gBot) {
      // squeeze the sphere outwards past the column; pictures cross it quickly (tanh)
      const g = gapHalf + (nodeW[i] || 0) * sc * c.k / 2;
      if (span > g) {
        const t = Math.tanh(dx / 14);
        dx = g * t + dx * (span - g) / span;
        fade = Math.min(1, Math.abs(t) * 1.15) ** 2;
      }
    }
    proj.push({ i, px: cx + dx, py, z: z2, sc: sc * c.k, fade });
  }
  for (const P of proj) {
    const el = tnEls[P.i];
    const tilt = Math.max(-40, Math.min(40, ((P.px - cx) / W) * -50));
    el.style.transform = `translate(${P.px.toFixed(1)}px,${P.py.toFixed(1)}px) translate(-50%,-50%) perspective(700px) rotateY(${tilt.toFixed(1)}deg) scale(${P.sc.toFixed(3)})`;
    const depth = (P.z + 1) / 2;
    const blur = active === null ? Math.max(0, depth - 0.35) * 4 : (P.i === active ? 0 : 3.2);
    const bri = active === null ? 1.1 - depth * 0.55 : (P.i === active ? 1.05 : 0.35);
    el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bri.toFixed(2)})`;
    el.style.zIndex = String(P.z < 0.05 ? 20 + Math.round((1 - depth) * 10) : 1 + Math.round((1 - depth) * 10));
    el.style.opacity = P.fade.toFixed(3);
  }
  if (ctx) {
    for (const Q of proj) {
      const red = NODES[Q.i].kind === 'post';
      const on = active === Q.i, dim = active !== null && !on;
      const mx = (hx + Q.px) / 2, my = Math.min(hy, Q.py) - H0 * 0.18 - Math.abs(Q.px - hx) * 0.12;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, Q.px, Q.py);
      const al = (dim ? 0.12 : (on ? 1 : 0.55 - ((Q.z + 1) / 2) * 0.25)) * Q.fade;
      ctx.lineWidth = on ? 2 : 1.1;
      ctx.strokeStyle = red ? `rgba(232,74,62,${al.toFixed(3)})` : `rgba(236,240,255,${(al * 0.8).toFixed(3)})`;
      ctx.shadowColor = red ? 'rgba(255,60,50,.8)' : 'rgba(255,255,255,.7)'; ctx.shadowBlur = on ? 10 : 5;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  scene.classList.add('ready');
  return true;
}

tnEls.forEach((el, i) => el.addEventListener('click', (e) => {
  if (justDragged) return;
  // keyboard activation (detail === 0) moves focus into the note for screen readers
  setActive(active === i ? null : i, { focusNote: e.detail === 0 });
}));
$('.th-prev', note).addEventListener('click', () => setActive((active + NODES.length - 1) % NODES.length));
$('.th-next', note).addEventListener('click', () => setActive((active + 1) % NODES.length));
$('.th-close', note).addEventListener('click', () => { const i = active; setActive(null); tnEls[i]?.focus({ preventScroll: true }); });
note.addEventListener('pointerdown', (e) => e.stopPropagation());
note.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') $('.th-prev', note).click();
  if (e.key === 'ArrowRight') $('.th-next', note).click();
});
scene.addEventListener('pointerdown', (e) => {
  dragInfo = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, id: e.pointerId };
  cam.vy = 0; cam.vp = 0;
});
scene.addEventListener('pointermove', (e) => {
  const d = dragInfo; if (!d) return;
  const dx = e.clientX - d.lx, dy = e.clientY - d.ly; d.lx = e.clientX; d.ly = e.clientY;
  if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
    d.moved = true; dragging = true; scene.classList.add('drag');
    try { scene.setPointerCapture(d.id); } catch { /* pointer already released */ }
    if (active !== null) setActive(null);
  }
  if (d.moved) { cam.yaw += dx * 0.006; cam.pitch += dy * 0.004; cam.vy = dx * 0.006; cam.vp = dy * 0.002; cam.tYaw = null; kick(); }
});
function endDrag() {
  const d = dragInfo; dragInfo = null;
  if (d && d.moved) {
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    dragging = false; scene.classList.remove('drag');
  }
}
scene.addEventListener('pointerup', endDrag);
scene.addEventListener('pointercancel', endDrag);

/* ---------------- 03 · postcards ---------------- */
const track = $('.pc-track');
const scrollTrack = (dir) => track.scrollBy({ left: dir * Math.min(400, track.clientWidth * 0.8), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
$('.pc-left').addEventListener('click', () => scrollTrack(-1));
$('.pc-right').addEventListener('click', () => scrollTrack(1));

// Visitors' postcards go before your own, newest first.
const visitorAnchor = Array.from(track.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE && n.data.includes('visitor postcards'));
function optionImg(id) {
  const o = OPTIONS.get(id) || DATA.options[0];
  return { src: o.src, srcset: o.srcset, alt: o.alt, width: o.width, height: o.height };
}
function visitorCardHtml(p, extraClass) {
  return writtenCardHtml({ from: p.from, note: p.note, date: p.created_at, img: optionImg(p.image), extraClass });
}
function insertVisitorCards(html, atStart) {
  const frag = document.createRange().createContextualFragment(html);
  if (atStart) track.insertBefore(frag, track.firstElementChild);
  else track.insertBefore(frag, visitorAnchor);
}
async function loadVisitorCards() {
  try {
    const res = await fetch('/api/postcards', { headers: { accept: 'application/json' } });
    if (!res.ok) return;
    const { postcards } = await res.json();
    if (postcards.length) insertVisitorCards(postcards.map((p) => visitorCardHtml(p)).join(''), false);
  } catch { /* no API (e.g. plain static preview): show only your own postcards */ }
}
loadVisitorCards();

// The "write a postcard" form
const modalWrap = $('.pc-modal'), form = $('.modal', modalWrap), addBtn = $('.pc-add');
const fromInp = $('#pcfrom'), noteInp = $('#pcnote'), sendBtn = $('button[type=submit]', form), msg = $('.form-msg', form);
const firstPick = $('input[name=image]', form);
if (firstPick) firstPick.checked = true;

function syncForm() {
  $('.count', form).textContent = `${noteInp.value.length} / 220`;
  sendBtn.disabled = !(fromInp.value.trim() && noteInp.value.trim() && $('input[name=image]:checked', form)) || sendBtn.getAttribute('aria-busy') === 'true';
}
function openModal() {
  modalWrap.hidden = false;
  msg.textContent = ''; msg.className = 'form-msg';
  syncForm();
  ($('input[name=image]:checked', form) || fromInp).focus();
  document.addEventListener('keydown', modalKeys);
}
function closeModal() {
  modalWrap.hidden = true;
  document.removeEventListener('keydown', modalKeys);
  addBtn.focus({ preventScroll: true });
}
function modalKeys(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  // keep keyboard focus inside the form while it is open
  const f = $$('input:not([tabindex="-1"]), textarea, button:not([disabled])', form).filter((el) => el.offsetParent !== null && !(el.type === 'radio' && !el.checked));
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
addBtn.addEventListener('click', openModal);
$('.modal-bg', modalWrap).addEventListener('click', closeModal);
$('.pc-cancel', form).addEventListener('click', closeModal);
form.addEventListener('input', syncForm);
form.addEventListener('change', syncForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sendBtn.disabled) return;
  const body = {
    from: fromInp.value.trim(),
    note: noteInp.value.trim(),
    image: $('input[name=image]:checked', form).value,
    website: form.elements.website.value,
  };
  sendBtn.setAttribute('aria-busy', 'true'); syncForm();
  msg.className = 'form-msg ok'; msg.textContent = 'Sending…';
  try {
    const res = await fetch('/api/postcards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Your postcard could not be sent. Please try again in a moment.');
    insertVisitorCards(visitorCardHtml(out.postcard, 'pc-sent'), true);
    fromInp.value = ''; noteInp.value = '';
    closeModal();
    track.scrollTo({ left: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  } catch (err) {
    msg.className = 'form-msg';
    msg.textContent = err instanceof TypeError ? 'Postcards can’t be sent right now. Please try again later.' : err.message;
  } finally {
    sendBtn.removeAttribute('aria-busy'); syncForm();
  }
});

/* ---------------- 04 · notes from the wind ---------------- */
const WIND = [
  { jp: '七転び八起き', ro: 'nana korobi ya oki', en: 'Fall seven times, stand up eight.' },
  { jp: '一期一会', ro: 'ichi-go ichi-e', en: 'One time, one meeting — this moment will not come again.' },
  { jp: '雨降って地固まる', ro: 'ame futte ji katamaru', en: 'After the rain, the earth hardens.' },
  { jp: '塵も積もれば山となる', ro: 'chiri mo tsumoreba yama to naru', en: 'Even dust, piled up, becomes a mountain.' },
  { jp: '猿も木から落ちる', ro: 'saru mo ki kara ochiru', en: 'Even monkeys fall from trees.' },
  { jp: '待てば海路の日和あり', ro: 'mateba kairo no hiyori ari', en: 'If you wait, the weather turns fair for the voyage.' },
];
const wind = $('#wind'), stage = $('.stage', wind), floaters = $('.floaters', wind), bubble = $('.bubble', wind);
const tps = $$('.tp', wind), rbg = $$('.rbg', wind);
const branches = $$('img[src$="wind-branch.png"]', wind);
const TRUNK_X = 625; // trunk base in the branch picture's 1472 x 952 space
let windOpen = null, windOpener = null;

function openWind(i, opener) {
  windOpen = i; windOpener = opener || null;
  const w = WIND[i];
  $('.jp', bubble).textContent = w.jp; $('.ro', bubble).textContent = w.ro; $('.en', bubble).textContent = w.en;
  bubble.setAttribute('aria-label', w.en);
  floaters.hidden = true;
  // restart the bubble's grow-in animation
  bubble.hidden = true; void bubble.offsetWidth; bubble.hidden = false;
}
function closeWind() {
  if (windOpen === null) return;
  windOpen = null; bubble.hidden = true; floaters.hidden = false;
  if (windOpener && windOpener.isConnected && windOpener.offsetParent !== null) windOpener.focus({ preventScroll: true });
}
$$('.fb', floaters).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openWind(+b.dataset.w, b); }));
$$('.rb-hit', wind).forEach((p) => p.addEventListener('click', (e) => { e.stopPropagation(); openWind(+p.dataset.w); }));
wind.addEventListener('click', (e) => { if (!e.target.closest('.bubble, .fb, .rb-hit')) closeWind(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeWind(); if (active !== null && modalWrap.hidden) setActive(null); } });

const lens = $('.lens', stage), lensIn = $('.lens-in', stage);
function moveLens(e) {
  const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, L = 170, Z = 2.3;
  lens.style.transform = `translate(${x - L / 2}px,${y - L / 2}px)`;
  lensIn.style.transform = `translate(${L / 2 - x * Z}px,${L / 2 - y * Z}px)`;
}
stage.addEventListener('pointermove', (e) => { moveLens(e); stage.classList.add('hov'); });
stage.addEventListener('pointerdown', (e) => { moveLens(e); stage.classList.add('hov'); });
stage.addEventListener('pointerenter', (e) => { moveLens(e); stage.classList.add('hov'); });
stage.addEventListener('pointerleave', () => stage.classList.remove('hov'));

let windStill = false;
function windFrame(now) {
  if (!inView(stage)) return false;
  if (reduceMotion.matches) {
    if (!windStill) { tps.forEach((tp, i) => tp.setAttribute('startOffset', (-(7 + 7 * Math.sin((i % 17) * 1.7))).toFixed(2) + '%')); windStill = true; }
    return false;
  }
  windStill = false;
  const t = (now - t0) / 1000;
  tps.forEach((tp, i) => {
    const k = i % 17, sp = 0.8 + ((k * 37) % 10) / 14;
    tp.setAttribute('startOffset', (-(7 + 7 * Math.sin(t * 0.22 * sp + k * 1.7))).toFixed(2) + '%');
  });
  const sway = Math.sin(t * 0.6) * 0.5;
  // the branch and its sentences sway together, pivoting at the trunk's base
  rbg.forEach((g) => g.setAttribute('transform', `rotate(${sway.toFixed(3)} ${TRUNK_X} 952)`));
  branches.forEach((b) => { b.style.transform = `rotate(${sway.toFixed(3)}deg)`; });
  return true;
}

/* ---------------- sizing ---------------- */
function sizeCanvases() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const sel of ['.tg-cv-l', '.tg-cv-r', '.th-cv']) {
    const c = $(sel); if (!c) continue;
    c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr); c._dpr = dpr;
  }
}
// The hero painting is square and covers a box 165% as tall as the screen. On wide
// screens it is scaled by width, leaving extra height to crop: crop from the top so
// the first screen ends ~60% down the painting (just below the hills and village
// lights), like the original composition, without ever cropping the field's bottom.
function frameHero() {
  const bg = $('.hero-bg'); if (!bg) return;
  const W = bg.clientWidth, B = bg.clientHeight, H = stick.clientHeight;
  const ratio = (bg.naturalWidth || 2000) / (bg.naturalHeight || 2000);
  const shown = Math.max(B, W / ratio); // displayed image height under object-fit: cover
  const crop = Math.max(0, Math.min(0.6 * shown - H, shown - B));
  bg.style.objectPosition = `50% ${(-crop).toFixed(1)}px`;
}
function onResize() {
  frameHero();
  lensIn.style.width = stage.clientWidth * 2.3 + 'px';
  lensIn.style.height = stage.clientHeight * 2.3 + 'px';
  // magnified copy of the section's sky, lined up with the real one (lens zoom is 2.3x)
  const sky = $('.wind-sky', wind), lensSky = $('.lens-sky', lensIn);
  if (sky && lensSky) {
    const k = sky.getBoundingClientRect(), t = stage.getBoundingClientRect(), Z = 2.3;
    Object.assign(lensSky.style, { left: (k.left - t.left) * Z + 'px', top: (k.top - t.top) * Z + 'px', width: k.width * Z + 'px', height: k.height * Z + 'px' });
  }
  sizeSphere(); sizeCanvases(); kick();
}
window.addEventListener('scroll', kick, { passive: true });
window.addEventListener('resize', onResize);
window.addEventListener('pageshow', (e) => { if (e.persisted) onResize(); });
reduceMotion.addEventListener?.('change', kick);
// Fonts change the digit glyphs; redraw once they're ready.
document.fonts?.ready.then(kick);
onResize();
