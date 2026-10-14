# Preeti K — personal website

The live site, built from the design mockup below.

- **Update content:** see [HOW-TO-UPDATE.md](HOW-TO-UPDATE.md)
- **Preview, publish, roll back, free-plan limits:** see [DEPLOY.md](DEPLOY.md)

## Project layout

| Path | What it is |
|---|---|
| `content/` | The three content files (Theory of the Mind, your postcards, postcard picture options) |
| `images/` | Original pictures for the content files (never published as-is) |
| `site/` | Page template (`index.html`), styles, scripts, admin page, 404 page, hosting config |
| `assets/` | The design's artwork from the mockup export (published as-is) |
| `functions/` | The small Cloudflare Function for visitor postcards |
| `migrations/` | The postcard database table |
| `scripts/` | Build and validate scripts |
| `tests/` | Automated tests (`npm test`) |
| `dist/` | Build output, what gets published (generated; not committed) |
| `IomPictures/` | Your original photos (HEIC/MOV, with location data). Local only: not committed, not published |

First time on a new computer: install [Node.js](https://nodejs.org) (LTS), then run `npm install` in this folder.

---

## Original design export notes

# Home — full page — design reference

This is a design mockup created in a visual design tool, exported as a
standalone page. Treat it as a REFERENCE MOCKUP, not production code:
the markup and inline styles carry the design's precise values — colors,
font sizes, spacing, radii, shadows, layout — which an implementation
should replicate faithfully in its own components and styling system
rather than copy wholesale.

## Contents

- `Main.dc.html` — the artboard (a Design Component: an `<x-dc>`
  template + a small logic class). The values to replicate live in its
  inline `style="…"` attributes and the `<helmet><style>` block.
- `assets/` — files uploaded to the design (images, fonts, media)
- `support.js`, `vendor/react*.js` — the runtime that renders the
  component in a browser; not part of the design.

## Uploaded files

Images, fonts and media uploaded to the design are written once each under
`assets/` — 14 in this export — and the exported files refer to them there. A
reference a script puts together while the page runs (for example
`"/_blob/" + id`) is not rewritten and does not load from this folder.

## Viewing

Serve the folder (e.g. `python3 -m http.server`) and open `Main.dc.html`;
some browsers block the scripts over file://.
