// Fills the page template (site/index.html) with content.
import { orderNodes, layoutNodes } from '../../site/js/sphere.js';
import { esc, imageCardHtml, writtenCardHtml } from '../../site/js/cards.js';

const r3 = (n) => Math.round(n * 1000) / 1000;

// entries: published Theory of the Mind entries (sorted). imgs: Map id -> image variants.
export function buildNodes(entries, imgs) {
  const withSize = (e) => ({ ...e, w: imgs.get(e.id).ratio[0], h: imgs.get(e.id).ratio[1] });
  const posters = entries.filter((e) => e.kind === 'poster').map(withSize);
  const photos = entries.filter((e) => e.kind === 'photograph').map(withSize);
  return layoutNodes(orderNodes(posters, photos));
}

export function nodeButtonHtml(n, img) {
  return `    <button type="button" class="tn ${n.kind}" style="width: ${n.bw}%" aria-label="Follow the thread: ${esc(n.title)}" aria-pressed="false">`
    + `<img src="${esc(img.src)}" srcset="${esc(img.srcset)}" sizes="(max-width: 700px) 22vw, 12vw" width="${img.width}" height="${img.height}" alt="" loading="lazy" decoding="async"></button>`;
}

export function postcardHtml(p, img) {
  const image = { ...img, alt: p.alt };
  return '    ' + (p.style === 'written'
    ? writtenCardHtml({ from: p.from, note: p.note, date: p.date, img: image })
    : imageCardHtml({ title: p.title, img: image }));
}

export function optionHtml(o, img) {
  const small = img.srcset.split(', ')[0].split(' ')[0];
  return `          <label class="pick"><input type="radio" name="image" value="${esc(o.id)}">`
    + `<img src="${esc(small)}" width="${img.width}" height="${img.height}" alt="${esc(o.alt)}" loading="lazy" decoding="async"></label>`;
}

// JSON inside <script> must not contain "</script>"; escaping "<" prevents that.
export const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

export function renderPage(template, { collections, tomImgs, cardImgs, optionImgs, buildId }) {
  const nodes = buildNodes(collections['theory-of-the-mind'], tomImgs);
  const options = collections['postcard-options'];
  const data = {
    nodes: nodes.map((n) => ({ title: n.title, caption: n.caption || '', kind: n.kind, x: r3(n.x), y: r3(n.y), z: r3(n.z) })),
    options: options.map((o) => {
      const v = optionImgs.get(o.id);
      return { id: o.id, alt: o.alt, src: v.src, srcset: v.srcset, width: v.width, height: v.height };
    }),
  };
  const fills = {
    '<!--@NODES-->': nodes.map((n) => nodeButtonHtml(n, tomImgs.get(n.id))).join('\n'),
    '<!--@POSTCARDS-->': collections.postcards.map((p) => postcardHtml(p, cardImgs.get(p.id))).join('\n'),
    '<!--@OPTIONS-->': options.map((o) => optionHtml(o, optionImgs.get(o.id))).join('\n'),
    '<!--@DATA-->': safeJson(data),
  };
  let html = template;
  for (const [marker, value] of Object.entries(fills)) {
    if (!html.includes(marker)) throw new Error(`site/index.html is missing the ${marker} marker`);
    html = html.replace(marker, () => value);
  }
  return html.replaceAll('@BUILD@', buildId);
}
