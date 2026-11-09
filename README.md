# Learnings

Plain-English exam prep guides: chapter notes, memory hooks, flashcards, practice quizzes and timed mock tests. Everything is static HTML with no database; progress is saved in the visitor's browser (localStorage).

## Layout

```
index.html            course picker (home page)
build.mjs             assembles the published site into dist/
<COURSE>/             one folder per course, e.g. NISM-VII/
  site/index.html     the hosted guide
  private/            official workbook, private links (gitignored, never published)
  ...                 other outputs (PDFs, saved copies)
```

## Build and preview

```
node build.mjs
```

This copies `index.html` to `dist/` and each `<COURSE>/site/` to `dist/<course-lowercase>/` (e.g. `NISM-VII/site/` becomes `/nism-vii/`). Nothing else is published, so `private/` folders stay out of the site. You can also open `index.html` straight from the folder; its links point at each `<COURSE>/site/index.html`.

## Adding a course

1. Create `<COURSE>/site/index.html` (and `<COURSE>/private/` for the source material).
2. In `index.html`, copy the course `<li>` and set `data-folder`, `data-key` (the guide's localStorage prefix, unique per course), the chapter count and the text.
3. Commit and push. The host rebuilds automatically.

## Hosting

Cloudflare Pages, connected to this private repo:

- Framework preset: None
- Build command: `node build.mjs`
- Build output directory: `dist`

## Disclaimer

Independent study notes written from the official workbooks. Not affiliated with, or endorsed by, NISM or SEBI.
