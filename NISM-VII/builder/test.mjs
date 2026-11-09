// Headless smoke test for the built guide: renders every view and runs a quiz, a full mock and "Clear my progress".
// Usage: node NISM-VII/builder/test.mjs [path/to/index.html]   (defaults to ../site/index.html)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = process.argv[2] || fileURLToPath(new URL("../site/index.html", import.meta.url));
const html = readFileSync(file, "utf8");
const data = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = scripts[scripts.length - 1][1];

const els = {}, handlers = {};
const el = id => els[id] || (els[id] = {
  id, innerHTML: "", textContent: id === "#data" ? data : "", hidden: false, dataset: {}, href: "",
  classList: { _s: new Set(), toggle(c, v) { (v === undefined ? !this._s.has(c) : v) ? this._s.add(c) : this._s.delete(c); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  setAttribute() {}, addEventListener() {}, focus() {}, scrollIntoView() {}, getBoundingClientRect: () => ({ top: 0 }), querySelectorAll: () => []
});
let hash = "";
const store = new Map();
globalThis.document = { getElementById: id => el("#" + id), querySelector: s => el(s), querySelectorAll: () => [], addEventListener: (t, f) => { handlers[t] = f; } };
globalThis.location = { protocol: "https:", pathname: "/nism-vii/", get hash() { return hash; } };
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
globalThis.window = { scrollTo() {}, addEventListener: (t, f) => { handlers["w" + t] = f; } };
globalThis.matchMedia = () => ({ matches: false });
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
(0, eval)(js);

const go = h => { hash = h; handlers.whashchange(); return els["#view"].innerHTML; };
const click = ds => handlers.click({ target: { closest: () => ({ dataset: ds, getAttribute: () => hash }) }, preventDefault() {} });
const assert = (ok, msg) => { if (!ok) { console.error("FAIL:", msg); process.exit(1); } };
const out = [];

for (const h of ["#home", "#ch1", "#ch2", "#ch3", "#ch4", "#ch5", "#ch6", "#ch7", "#ch8", "#cards", "#cards-4", "#cards-numbers", "#numbers", "#updates", "#quiz-mistakes"]) {
  const v = go(h);
  assert(v && !v.includes("undefined"), "view " + h + " " + ((v || "").match(/.{60}undefined.{30}/) || [""])[0]);
  out.push(h + " " + v.length);
}
assert(els["#nav"].innerHTML.includes("All courses"), "rail has no All courses link");
for (let i = 0; i < 40; i++) click({ act: i % 3 ? "fc-got" : "fc-again" });

go("#quiz-3"); click({ act: "quiz-go", n: "10" });
for (let i = 0; i < 10; i++) { click({ act: "quiz-pick", i: String(i % 4) }); click({ act: "quiz-next" }); }
assert(/out of 10/.test(els["#view"].innerHTML), "quiz result");
out.push("quiz: " + els["#view"].innerHTML.match(/<h1>(.*?)<\/h1>/)[1]);

go("#mock"); click({ act: "mock-start" });
for (let i = 0; i < 100; i++) { click({ act: "mock-pick", i: String((i * 7) % 4) }); if (i % 5 === 0) click({ act: "mock-mark" }); click({ act: "mock-next" }); }
click({ act: "mock-go", i: "99" }); click({ act: "mock-clear" }); click({ act: "mock-submit" });
assert(/Submit and see my score/.test(els["#confirmbox"].innerHTML), "mock confirm");
click({ act: "mock-confirm" });
assert(/out of 100/.test(els["#view"].innerHTML), "mock result");
const mock = JSON.parse(store.get("nism7:mock"));
const per = {}; mock.ids.forEach(id => { const c = id.split(":")[0]; per[c] = (per[c] || 0) + 1; });
assert(JSON.stringify(per) === JSON.stringify({ 1: 5, 2: 10, 3: 20, 4: 15, 5: 15, 6: 15, 7: 10, 8: 10 }) && new Set(mock.ids).size === 100, "mock mix " + JSON.stringify(per));
out.push("mock mix ok, saved keys: " + [...store.keys()].join(" "));

store.set("other:keep", "1");
click({ act: "clear-ask" }); assert(/Delete my progress/.test(els["#clearwrap"].innerHTML), "clear confirm");
click({ act: "clear-yes" });
assert([...store.keys()].join() === "other:keep", "clear left " + [...store.keys()].join());
assert(/Progress cleared/.test(els["#clearwrap"].innerHTML), "clear message");
out.push("clear progress ok (other sites' keys untouched)");
console.log(out.join("\n") + "\nALL OK");
