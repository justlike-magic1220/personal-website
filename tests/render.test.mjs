import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNodes, renderPage, safeJson } from '../scripts/lib/render.mjs';
import { stamp, writtenCardHtml } from '../site/js/cards.js';

const img = (id, w = 800, h = 600) => ({ src: `images/x/${id}-800.webp`, srcset: `images/x/${id}-400.webp 400w, images/x/${id}-800.webp 800w`, width: w, height: h, ratio: [w, h] });
const TEMPLATE = '<div><!--@NODES--></div><ol><!--@POSTCARDS--></ol><form><!--@OPTIONS--></form><script id="site-data"><!--@DATA--></script>@BUILD@';

function fixture({ toms = 4, cards = 3 } = {}) {
  const tom = Array.from({ length: toms }, (_, i) => ({ id: `t${i}`, kind: i % 2 ? 'poster' : 'photograph', title: `T${i}`, alt: '', order: i }));
  const postcards = Array.from({ length: cards }, (_, i) => (i === 0
    ? { id: `p${i}`, style: 'written', from: 'Asha <b>', note: 'Hi & bye', date: '2026-10-14', alt: 'photo', order: i }
    : { id: `p${i}`, style: 'image', title: `Card ${i}`, alt: `alt ${i}`, order: i }));
  const options = [{ id: 'o1', alt: 'Option one' }, { id: 'o2', alt: 'Option two' }];
  return {
    collections: { 'theory-of-the-mind': tom, postcards, 'postcard-options': options },
    tomImgs: new Map(tom.map((t) => [t.id, img(t.id)])),
    cardImgs: new Map(postcards.map((p) => [p.id, img(p.id, 760, 918)])),
    optionImgs: new Map(options.map((o) => [o.id, img(o.id)])),
    buildId: 'b1',
  };
}

test('renders one button per Theory of the Mind entry, posters interleaved', () => {
  const html = renderPage(TEMPLATE, fixture({ toms: 6 }));
  assert.equal(html.match(/class="tn /g).length, 6);
  assert.equal(html.match(/class="tn post"/g).length, 3);
  const data = JSON.parse(html.match(/<script id="site-data">(.*?)<\/script>/)[1]);
  assert.equal(data.nodes.length, 6);
  assert.equal(data.nodes[1].kind, 'post', 'every third slot (index 1, 4, ...) is a poster');
});

test('sphere layout handles a single picture and keeps order', () => {
  const f = fixture({ toms: 1 });
  const nodes = buildNodes(f.collections['theory-of-the-mind'], f.tomImgs);
  assert.equal(nodes.length, 1);
  assert.ok(Number.isFinite(nodes[0].x) && Number.isFinite(nodes[0].y));
});

test('renders multiple postcards in content order, both styles', () => {
  const html = renderPage(TEMPLATE, fixture({ cards: 3 }));
  assert.equal(html.match(/<article class="pc"/g).length, 3);
  assert.ok(html.indexOf('Postcard from Asha') < html.indexOf('Card 1'));
  assert.ok(html.indexOf('Card 1') < html.indexOf('Card 2'));
});

test('content text is escaped', () => {
  const html = renderPage(TEMPLATE, fixture());
  assert.ok(html.includes('Asha &lt;b&gt;'));
  assert.ok(html.includes('Hi &amp; bye'));
  assert.ok(!html.includes('<b>'));
});

test('renders a picker choice per postcard option', () => {
  const html = renderPage(TEMPLATE, fixture());
  assert.equal(html.match(/type="radio" name="image"/g).length, 2);
  assert.ok(html.includes('value="o2"'));
});

test('missing template markers fail loudly', () => {
  assert.throws(() => renderPage('<html></html>', fixture()), /missing the <!--@NODES--> marker/);
});

test('embedded JSON cannot close its script tag', () => {
  assert.ok(!safeJson({ t: '</script><script>alert(1)</script>' }).includes('</script>'));
});

test('postcard date stamp format', () => {
  assert.equal(stamp('2026-10-04'), "'26 10 04");
  assert.equal(stamp('2026-01-31T23:00:00.000Z'), "'26 01 31");
  assert.match(writtenCardHtml({ from: 'A', note: 'n', date: '2026-10-14', img: { src: 'x', alt: '' } }), /&#39;26 10 14/);
});
