# How to update your website

Everything on the site comes from three small files in `content/` and the pictures in `images/`.
You never need to touch the page code to add, change, hide or remove things.

| What | Content file | Pictures go in |
|---|---|---|
| Theory of the Mind (the Thread Theory sphere) | `content/theory-of-the-mind.json` | `images/theory-of-the-mind/` |
| Your own postcards | `content/postcards.json` | `images/postcards/` |
| Pictures visitors can choose for their postcard | `content/postcard-options.json` | `images/postcard-options/` |

**The routine, every time:**

1. Put the picture in the right folder.
2. Add an entry for it in the right content file (copy an existing entry and change it).
3. Check it: `npm run validate`
4. Look at it on your laptop: `npm run preview`, then open http://localhost:8788
5. Publish: `npm run deploy` (details in `DEPLOY.md`)
6. Open your live site and check the change is there.

Run the commands in a terminal opened in the project folder (in VS Code: **Terminal → New Terminal**).

---

## Pictures: naming, formats and sizes

- **Name files** with lowercase letters, numbers and dashes only: `beach-sunset-2.jpg`. No spaces, no capitals.
  Spelling and capitals must match the content file exactly.
- **Formats:** `.jpg`, `.jpeg`, `.png` or `.webp`.
  **iPhone photos (`.HEIC`)** must be converted first. Either set **iPhone Settings → Camera → Formats → Most Compatible**,
  or open the photo in the Windows Photos app and **Save as → JPG**.
- **Size:** anything from about 1200 to 2400 pixels on the long side is ideal. Bigger is fine but slows down building.
  You don't need to shrink or compress anything: the build makes small, fast web copies automatically
  and **removes hidden camera data (including GPS location)** from them. Your files in `images/` are never changed.
- **Shape:**
  - Theory of the Mind pictures can be any shape; the sphere keeps each picture's proportions.
  - Postcard pictures (`style: "written"`) and postcard options are cropped into the landscape window of the postcard,
    so landscape photos work best.
  - Whole-image postcards (`style: "image"`) should be 736 × 889 proportions (portrait, like the first postcard).
- **Where the file name goes:** in the content file you write *just the file name*, e.g. `"file": "beach-sunset-2.jpg"`,
  never a path like `images/...`.

---

## Theory of the Mind pictures

Each entry in `content/theory-of-the-mind.json` looks like this:

```json
{ "id": "beach-sunset-2", "kind": "photograph", "file": "beach-sunset-2.jpg", "title": "Beach at sunset", "alt": "Waves rolling onto a beach under an orange sky.", "status": "published", "order": 570 },
```

| Field | Required? | What it does |
|---|---|---|
| `id` | yes | A unique name for the entry: lowercase letters, numbers, dashes. Never reuse one. |
| `kind` | yes | `"poster"` (red thread, sits closer in) or `"photograph"` (white thread). |
| `file` | yes | The picture's file name in `images/theory-of-the-mind/`. |
| `title` | yes | Shown when someone opens the picture. |
| `alt` | yes | A one-sentence description for people using screen readers. Describe what's in the picture. |
| `status` | yes | `"published"` shows it; `"draft"` hides it. |
| `order` | yes | A number. Lower numbers come first. Counting in tens (10, 20, 30…) leaves room to slot things in between. |
| `caption` | no | A longer note (up to 400 characters) shown under the title. |
| `date` | no | `"2026-10-14"` (year-month-day). |
| `collection` | no | A label for your own grouping; not shown yet. |

### Add a picture
1. Copy `beach-sunset-2.jpg` into `images/theory-of-the-mind/`.
2. In `content/theory-of-the-mind.json`, copy the last entry, paste it below, and change the values.
   Every entry except the last one in the list ends with a comma `,`.
3. `npm run validate`, then `npm run preview`.

### Edit a picture's text
Change the `title`, `alt` or `caption` and save.

### Reorder
Change the `order` numbers. In the sphere, posters and photographs are woven together:
every third spot is a poster, and each kind keeps its own order.

### Hide (keep for later)
Change `"status": "published"` to `"status": "draft"`.

### Remove
Delete the entry from the content file (watch the commas), then delete the picture from the folder if you like.

---

## Your own postcards

There are two styles. Entries go in `content/postcards.json`.

**A whole picture that *is* the postcard** (like the first one):

```json
{ "id": "kyoto-card", "style": "image", "file": "kyoto-card.jpg", "title": "A postcard from Kyoto", "alt": "A postcard of a temple gate; on the back, a note about rain.", "status": "published", "order": 20 },
```

**A written postcard:** your photo goes in the postcard's window, with your note handwritten on the back:

```json
{ "id": "note-to-self", "style": "written", "file": "lalbagh.jpg", "alt": "Morning light in Lalbagh.", "from": "Preeti", "note": "Remember this morning when the week gets loud.", "date": "2026-10-14", "status": "published", "order": 30 },
```

| Field | Required? | What it does |
|---|---|---|
| `id`, `file`, `alt`, `status`, `order` | yes | As above; files go in `images/postcards/`. |
| `style` | yes | `"image"` or `"written"`. |
| `from`, `note`, `date` | for `"written"` | Sender (up to 40 characters), note (up to 220) and the stamped date. |
| `title` | no | Read out by screen readers for `"image"` cards. |
| `tags` | no | e.g. `["travel", "friends"]`; not shown yet. |
| `link` | no | An `https://` address; not shown yet. |

Add, edit, reorder, hide and remove work exactly like Theory of the Mind above.
Your postcards appear after visitors' postcards in the row.

---

## Visitors' postcards

Visitors write these on the site. They choose a picture, write their name and a note, and the postcard appears straight away.
Notes with foul language, links or email addresses are refused automatically, and each visitor can send three postcards every ten minutes.

**To hide or delete one:** go to `https://<your-site>/admin`, enter your admin password, and press **Hide** (you can bring
it back later) or **Delete** (tap twice; it's gone for good). The admin page is not linked from the site and search engines are told to ignore it.

**To change the pictures visitors can choose from:** add or remove entries in `content/postcard-options.json`
(pictures in `images/postcard-options/`), then publish. Postcards already sent with a picture you remove will show the first picture instead.

**To block more words:** add them, lowercase, to the `BLOCKED` list in `functions/_lib/profanity.js`, then publish.

---

## When validate finds a problem

`npm run validate` lists every problem, with the file and the entry number, for example:

```
- theory-of-the-mind.json entry #51 ("beach-sunset-2"): image not found: images/theory-of-the-mind/beach-sunset-2.JPG (check the spelling and capital letters)
- postcards.json: not valid JSON. Unexpected token } ... Look for a missing comma, quote or bracket near there
```

Fix them and run it again. Nothing can be published while there are problems, so a typo can't break the live site.

---

## Design pictures (`images/design/`)

| File | What it does |
|---|---|
| `plum-branch.jpg` | The ink branch in **Notes from the wind**. The build lifts it off its paper automatically, so it must be dark ink on a plain, even, light background. To use a different painting, replace this file (same name) and rebuild. |
| `hero-wide.jpg` *(optional)* | A wider version of the night-field painting at the top of the page. If this file exists, it's used instead of the original, and the blurred sides on wide screens disappear. |

### Making `hero-wide.jpg`
1. Open `assets/f05492ec891399551d0d42fc240f9050.jpg` (the original painting) in an AI image tool with a "generative expand" / "outpaint" feature.
2. Extend the canvas **left and right only** to about **2000 × 1019 pixels** (keep the height). Leave the top and bottom alone.
3. Prompt along the lines of: *"continue the deep blue night sky with small stars, the distant snowy hills, village lights and the ploughed field rows in the same woodblock-print style"*.
4. Check the seams: the field rows should keep fanning outwards, and the middle of the picture must be unchanged.
5. Save it as `images/design/hero-wide.jpg`, then `npm run preview` to check, and `npm run deploy` to publish.
