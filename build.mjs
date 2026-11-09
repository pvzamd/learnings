// Builds the published site into dist/:
//   index.html            -> dist/index.html          (course picker)
//   <COURSE>/site/        -> dist/<course-lowercase>/  (one guide per course)
// Only these are copied, so private/ folders and other course files are never published.
// Run locally with:  node build.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const out = join(root, "dist");

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(root, "index.html"), join(out, "index.html"));

const courses = readdirSync(root).filter(
  (d) => !d.startsWith(".") && d !== "dist" && d !== "node_modules" &&
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
console.log(`Built ${courses.length} course(s) into dist/`);
