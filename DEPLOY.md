# Publishing the website

The site is hosted on **Cloudflare Pages** (free plan). The pages and pictures are static files.
One small **Pages Function** (`functions/`) receives visitor postcards and stores them in a free **Cloudflare D1** database.
There is no server to run: once published, the site works without your laptop.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run validate` | Checks the content files and pictures. |
| `npm test` | Runs the automated tests (includes a full build). |
| `npm run build` | Builds the public site into `dist/`. |
| `npm run preview` | Builds, then runs the site on your laptop at http://localhost:8788, including postcards (local test database). |
| `npm run deploy:preview` | Tests, builds and publishes to a **preview address** (`https://preview.<project>.pages.dev`) without touching the live site. |
| `npm run deploy` | Tests, builds and publishes to the **live site**. |

`deploy` refuses to publish if any test or content check fails.

## What is public

- **Published:** only the contents of `dist/`: the page, styles, scripts, your design artwork (`assets/`),
  web-sized copies of the pictures named in the content files (camera data and GPS stripped), the admin page, and the 404 page.
- **Never published:** your original photos (`images/`, `IomPictures/`), drafts (`status: "draft"`), the content files themselves,
  the design export (`Main.dc.html`, `support.js`, `vendor/`), `.dev.vars`, and anything else in the project folder.
- **Visitor postcards** (name, note, chosen picture, time) are public on the site. A one-way hash of the sender's IP address is kept
  for one day for rate-limiting only, and is never shown.
- There is **no public code repository**. The project is a local Git repository on your laptop only.

## One-time setup (done once, already completed if the site is live)

1. Log in to Cloudflare from the terminal (opens your browser to approve):
   `npx wrangler login`
2. Create the Pages project (pick the free `*.pages.dev` name):
   `npx wrangler pages project create preetikoti --production-branch main`
3. Create the database and copy the `database_id` it prints into `wrangler.toml`:
   `npx wrangler d1 create preetik-postcards`
4. Create the postcards table:
   `npm run db:setup`
5. Set the two secrets (you'll be asked to paste each value):
   `npx wrangler pages secret put ADMIN_PASSWORD --project-name preetikoti` (a long password; store it in your password manager)
   `npx wrangler pages secret put IP_SALT --project-name preetikoti` (any long random text)
6. Publish: `npm run deploy`

Then add the D1 binding in case the dashboard doesn't pick it up from `wrangler.toml`:
Cloudflare dashboard → Workers & Pages → preetikoti → Settings → Bindings → D1 database: name `DB`, database `preetik-postcards`.

## Rolling back

If an update breaks something:

- **Fastest:** Cloudflare dashboard → **Workers & Pages → preetikoti → Deployments**. Find the last good deployment, open its **⋯** menu and choose
  **Rollback to this deployment**. The live site switches back in seconds.
- **Fix in the files:** every published version is also committed to the local Git repository. `git log --oneline` lists versions;
  `git restore --source <version> -- content images` brings back old content, then `npm run deploy`.

Rolling back the site doesn't change visitor postcards; those live in the database. To remove visitor postcards, use the admin page.

## Free-plan limits (checked October 2026)

| Service | Free allowance | What happens at the limit |
|---|---|---|
| Pages static files (all pages and pictures) | Unlimited requests and bandwidth; max 20,000 files, 25 MiB per file; 500 builds/month | — |
| Pages Functions (`/api/postcards` only) | 100,000 requests per day (shared with Workers) | Postcard requests are expected to fail until the reset at midnight UTC (Cloudflare's docs don't describe this case exactly). Static pages don't count towards this limit |
| D1 database | 5 GB storage, 5 million rows read and 100,000 rows written per day | Queries fail until the daily reset at 00:00 UTC. Never charged |

The site also limits itself to 300 new postcards a day and 3 per visitor every 10 minutes, and lists the newest 200.
The account has no payment method and stays on the Free plan, so going past a limit pauses that feature rather than charging you. Never add a card or upgrade the plan unless you decide to.

Sources: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/),
[Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
Cloudflare's [Acceptable Use Policy](https://www.cloudflare.com/website-terms/) applies; a personal site is well within it.

## Custom domain (optional, costs money)

The site starts on the free `https://<project>.pages.dev` address. A custom domain (e.g. `preetikoti.com`) has a yearly registration fee.
Connecting it to Cloudflare Pages is free: dashboard → preetikoti → **Custom domains → Set up a domain**, then follow the DNS steps.
HTTPS certificates are automatic.
