# Learnings

Plain-English exam prep guides: chapter notes, memory hooks, flashcards, practice quizzes and timed mock tests. Everything is static HTML with no database and no third-party requests (fonts are self-hosted). Progress is saved only in the visitor's browser (localStorage), and each guide has a "Clear my progress" link.

## Layout

```
index.html              course picker (home page)
build.mjs               assembles the published site into dist/
assets/
  fonts/                self-hosted fonts + their licences (SIL OFL)
  og.png                home page link-preview image
  og-card.html          source for og.png (not published)
<COURSE>/               one folder per course, e.g. NISM-VII/
  site/index.html       the hosted guide (built by builder/)
  site/og.png           the course's link-preview image
  builder/              source of the guide (not published)
    content/chN.json    chapter notes, numbers, flashcards, questions
    template.html       the app; build.py puts the chapter data into it
    build.py            writes ../site/index.html
    validate.py         checks a chapter file against SCHEMA.md
    test.mjs            headless smoke test of the built guide
    og-card.html        source for site/og.png
  private/              official workbook, private links (gitignored, never published)
```

## Editing a guide

```
python NISM-VII/builder/validate.py NISM-VII/builder/content/ch3.json
python NISM-VII/builder/build.py
node NISM-VII/builder/test.mjs
```

Edit a chapter file, validate it, rebuild `site/index.html`, run the test, then commit both the content and the rebuilt `site/index.html`.

**Never reorder or delete questions; only add new ones at the end of a chapter.** Saved progress and sync codes refer to questions by their position. Adding questions changes the guide's fingerprint, so older sync codes are politely refused ("made with a different version"), but nobody's saved progress breaks.

## Progress sync

There's no server. The guide's "Your progress & sync" page packs a visitor's progress into a code of about 110 characters: chapters read, plan days, best quiz scores, mistakes, and questions already used in mocks, plus a version, fingerprint and checksum. It offers the code as a link and a QR code. The code sits after `#` in the link, so it's never sent to the host. Opening the link on another device merges the progress in and never removes or lowers anything. The QR encoder is built into the guide (no library); `test.mjs` checks it against published reference values and decodes every symbol it makes.

## Building the site

```
node build.mjs
```

This copies `index.html` and `assets/` (minus the `*.html` card sources) to `dist/`, and each `<COURSE>/site/` to `dist/<course-lowercase>/` (e.g. `NISM-VII/site/` becomes `/nism-vii/`). Nothing else is published, so `private/` and `builder/` folders stay out of the site. It also replaces `%%SITE_URL%%` in the link-preview tags with the `SITE_URL` environment variable.

You can open `index.html` straight from the folder; its links point at each `<COURSE>/site/index.html`.

## Link-preview images

Each preview image is rendered from its card source with Chrome:

```
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot=<absolute path to og.png> <card source .html>
```

## Adding a course

1. Create `<COURSE>/site/index.html` (and `<COURSE>/private/` for the source material). Give the guide its own localStorage prefix.
2. In `index.html`, copy the course `<li>` and set `data-folder`, `data-key` (that prefix), the chapter count and the text.
3. Commit and push. The host rebuilds automatically.

## Hosting

Cloudflare Pages, connected to this repo:

- Framework preset: None
- Build command: `node build.mjs`
- Build output directory: `dist`
- Environment variable: `SITE_URL` = the site's address, e.g. `https://learnings.pages.dev` (used for link previews)

## Disclaimer

Independent study notes written from the official workbooks. Not affiliated with, or endorsed by, NISM or SEBI.
