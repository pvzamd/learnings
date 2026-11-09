// Builds the published site into dist/:
//   index.html            -> dist/index.html          (course picker)
//   404.html              -> dist/404.html            (page for unknown addresses)
//   assets/               -> dist/assets/             (fonts, preview images; card sources (*.html) are skipped)
//   <COURSE>/site/        -> dist/<course-lowercase>/  (one guide per course)
// Only these are copied, so private/ and builder/ folders are never published.
// Link previews need absolute URLs: "%%SITE_URL%%" in HTML files becomes the SITE_URL environment
// variable (set it in Cloudflare Pages, e.g. https://learnings.pages.dev), falling back to Cloudflare's
// CF_PAGES_URL, or to "" (root-relative) for a local build.
// Run locally with:  node build.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const out = join(root, "dist");
const siteUrl = (process.env.SITE_URL || process.env.CF_PAGES_URL || "").replace(/\/+$/, "");

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(root, "index.html"), join(out, "index.html"));
// With a top-level 404.html, Cloudflare Pages answers unknown addresses with a real 404
// instead of treating the site as a single-page app and serving the home page.
cpSync(join(root, "404.html"), join(out, "404.html"));
if (existsSync(join(root, "assets"))) {
  cpSync(join(root, "assets"), join(out, "assets"), { recursive: true, filter: (src) => !src.endsWith(".html") });
}

const courses = readdirSync(root).filter(
  (d) => !d.startsWith(".") && !["dist", "assets", "node_modules"].includes(d) &&
    statSync(join(root, d)).isDirectory() && existsSync(join(root, d, "site", "index.html"))
);
if (!courses.length) {
  console.error("No <COURSE>/site/index.html found.");
  process.exit(1);
}
for (const d of courses) {
  cpSync(join(root, d, "site"), join(out, d.toLowerCase()), { recursive: true });
  console.log(`${d}/site  ->  dist/${d.toLowerCase()}/`);
}

const htmlFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []);
for (const f of htmlFiles(out)) {
  const s = readFileSync(f, "utf8");
  if (s.includes("%%SITE_URL%%")) writeFileSync(f, s.replaceAll("%%SITE_URL%%", siteUrl));
}
console.log(`Built ${courses.length} course(s) into dist/` + (siteUrl ? ` for ${siteUrl}` : " (no SITE_URL: preview links are relative)"));
