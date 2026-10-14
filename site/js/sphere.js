// Thread Theory sphere layout. Shared by the build (to emit the buttons in
// order) and the browser (to position them). Ported from the design mockup.

// posters and photos are arrays of { w, h, ... } already sorted by `order`.
// Every third slot is a poster while posters remain; the rest are photos.
export function orderNodes(posters, photos) {
  const n = posters.length + photos.length;
  const order = [];
  let pi = 0, ti = 0;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 1 && pi < posters.length) order.push({ ...posters[pi++], kind: 'post' });
    else if (ti < photos.length) order.push({ ...photos[ti++], kind: 'tile' });
    else order.push({ ...posters[pi++], kind: 'post' });
  }
  return order;
}

// Adds x/y/z (points on a golden-spiral sphere) and bw (button width, % of scene).
export function layoutNodes(order) {
  const n = order.length, golden = Math.PI * (3 - Math.sqrt(5));
  return order.map((it, i) => {
    const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0, r = Math.sqrt(1 - y * y), th = golden * i;
    const R = it.kind === 'post' ? 0.8 : 1.0;
    const jx = Math.sin(i * 12.9898) * 0.06, jy = Math.cos(i * 78.233) * 0.05;
    const big = it.kind === 'post' ? 7.2 : 8.4;
    return {
      ...it,
      idx: i,
      x: (Math.cos(th) * r + jx) * R,
      y: (y * 0.82 + jy) * R,
      z: (Math.sin(th) * r) * R,
      bw: Math.round(big * Math.sqrt(it.w / it.h) * 10) / 10,
    };
  });
}
