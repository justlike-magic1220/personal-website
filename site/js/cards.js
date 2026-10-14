// Postcard markup shared by the build (your postcards) and the browser
// (visitors' postcards), so both render identically.

export const BLANK_CARD = 'assets/af130bde050ed78e47d1f5023b03e171.jpg';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "2026-10-14" or a Date -> "'26 10 14", the stamp printed on the card.
export function stamp(d) {
  const s = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, dd] = s.split('-');
  return `'${y.slice(2)} ${m} ${dd}`;
}

// img: { src, srcset?, alt, width?, height? }
function imgAttrs(img, extra = '') {
  return `src="${esc(img.src)}"${img.srcset ? ` srcset="${esc(img.srcset)}" sizes="(max-width: 480px) 80vw, 380px"` : ''}`
    + `${img.width ? ` width="${img.width}" height="${img.height}"` : ''} alt="${esc(img.alt)}"${extra}`;
}

// A whole-image postcard (the file is the finished postcard).
export function imageCardHtml({ title, img }) {
  return `<article class="pc" role="listitem" aria-label="${esc(title || 'A postcard')}">`
    + `<img ${imgAttrs(img, ' loading="lazy" decoding="async"')}></article>`;
}

// A written postcard: photo, date, note and sender on the blank card.
export function writtenCardHtml({ from, note, date, img, extraClass = '' }) {
  return `<article class="pc${extraClass ? ' ' + extraClass : ''}" role="listitem" aria-label="Postcard from ${esc(from)}">`
    + `<img src="${BLANK_CARD}" width="736" height="889" alt="" loading="lazy" decoding="async">`
    + `<img class="pc-photo" ${imgAttrs(img, ' loading="lazy" decoding="async"')}>`
    + `<span class="pc-date">${esc(stamp(date))}</span>`
    + `<div class="pc-msgwrap"><p class="pc-msg">${esc(note)}</p></div>`
    + `<p class="pc-to"><span>to Preeti K,</span><span>somewhere on the internet</span><span class="from">— ${esc(from)}</span></p>`
    + `</article>`;
}
