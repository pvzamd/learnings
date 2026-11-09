// Headless smoke test for the built guide: renders every view; runs a quiz, a full mock, progress sync
// (encode, decode, merge, bad codes), "Clear my progress"; and checks the built-in QR encoder against
// published reference values plus a full read-back of the generated symbol.
// Usage: node NISM-VII/builder/test.mjs [path/to/index.html]   (defaults to ../site/index.html)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = process.argv[2] || fileURLToPath(new URL("../site/index.html", import.meta.url));
const html = readFileSync(file, "utf8");
const data = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = scripts[scripts.length - 1][1];
const assert = (ok, msg) => { if (!ok) { console.error("FAIL:", msg); process.exit(1); } };
const out = [];

/* ---------- QR encoder against reference values ---------- */
const qrSrc = js.match(/\/\* QR-BEGIN \*\/([\s\S]*?)\/\* QR-END \*\//)[1];
const QR = new Function(qrSrc + "; return { makeQR, rsDivisor, rsRemainder, qrRawModules, QR_ECC, QR_BLOCKS };")();
// Reed-Solomon: the classic "HELLO WORLD" 1-M example (16 data codewords -> 10 EC codewords).
const hello = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
assert(QR.rsRemainder(hello, QR.rsDivisor(10)).join() === "196,35,39,119,235,215,231,226,93,23", "Reed-Solomon reference vector");
// Byte-mode capacities at level M from the QR standard (versions 1-10).
const capM = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
capM.forEach((cap, i) => {
  const v = i + 1, data = Math.floor(QR.qrRawModules(v) / 8) - QR.QR_ECC[v] * QR.QR_BLOCKS[v];
  assert(Math.floor((data * 8 - 4 - (v < 10 ? 8 : 16)) / 8) === cap, "capacity v" + v);
});
const FORMAT_M = ["101010000010010", "101000100100101", "101111001111100", "101101101001011", "100010111111001", "100000011001110", "100111110010111", "100101010100000"];
const VERSION_INFO = { 7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3 };
function readBack(q) {
  const n = q.size, v = q.version, dark = (x, y) => q.isDark(x, y);
  // format info, first copy, and the second copy must agree with the standard table
  let f1 = 0, f2 = 0;
  const p1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  p1.forEach(([x, y], i) => { if (dark(x, y)) f1 |= 1 << i; });
  for (let i = 0; i < 8; i++) if (dark(n - 1 - i, 8)) f2 |= 1 << i;
  for (let i = 8; i < 15; i++) if (dark(8, n - 15 + i)) f2 |= 1 << i;
  assert(f1 === f2, "format copies differ");
  const mask = FORMAT_M.findIndex(s => parseInt(s, 2) === f1);
  assert(mask >= 0, "format bits are not a valid level-M format word");
  if (VERSION_INFO[v]) {
    let vb = 0;
    for (let i = 0; i < 18; i++) if (dark(n - 11 + i % 3, Math.floor(i / 3))) vb |= 1 << i;
    assert(vb === VERSION_INFO[v], "version info v" + v);
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const bits = [];
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - k : k;
      if (!q.isFunction(x, y)) bits.push(dark(x, y) !== MASKS[mask](x, y) ? 1 : 0);
    }
  }
  const raw = Math.floor(QR.qrRawModules(v) / 8), cw = [];
  for (let i = 0; i < raw; i++) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]; cw.push(b); }
  const nb = QR.QR_BLOCKS[v], ecl = QR.QR_ECC[v], nShort = nb - raw % nb, shortData = Math.floor(raw / nb) - ecl;
  const blocks = Array.from({ length: nb }, (_, j) => ({ d: [], e: [], len: shortData + (j < nShort ? 0 : 1) }));
  let k = 0;
  for (let i = 0; i <= shortData; i++) blocks.forEach(b => { if (i < b.len) b.d.push(cw[k++]); });
  for (let i = 0; i < ecl; i++) blocks.forEach(b => b.e.push(cw[k++]));
  const div = QR.rsDivisor(ecl);
  blocks.forEach((b, j) => assert(QR.rsRemainder(b.d, div).join() === b.e.join(), "EC block " + j));
  const dbits = blocks.flatMap(b => b.d).flatMap(b => [7, 6, 5, 4, 3, 2, 1, 0].map(i => (b >> i) & 1));
  let p = 0; const take = m => { let r = 0; for (let i = 0; i < m; i++) r = (r << 1) | dbits[p++]; return r; };
  assert(take(4) === 4, "byte mode indicator");
  const len = take(v < 10 ? 8 : 16), bytes = [];
  for (let i = 0; i < len; i++) bytes.push(take(8));
  return new TextDecoder().decode(new Uint8Array(bytes));
}
const samples = ["NISM", "https://learnings.pages.dev/nism-vii/#sync-nism7.", "x".repeat(110), "https://learnings.pages.dev/nism-vii/#sync-nism7." + "AbC-_9".repeat(18), "y".repeat(200)];
for (const t of samples) { const q = QR.makeQR(t); assert(readBack(q) === t, "QR read-back for length " + t.length); out.push("QR v" + q.version + " mask " + q.mask + " (" + t.length + " chars) reads back ok"); }

/* ---------- the app ---------- */
const els = {}, handlers = {};
const el = id => els[id] || (els[id] = {
  id, innerHTML: "", textContent: id === "#data" ? data : "", hidden: false, dataset: {}, href: "", value: "",
  classList: { _s: new Set(), toggle(c, v) { (v === undefined ? !this._s.has(c) : v) ? this._s.add(c) : this._s.delete(c); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  setAttribute() {}, addEventListener() {}, focus() {}, scrollIntoView() {}, getBoundingClientRect: () => ({ top: 0 }), querySelectorAll: () => []
});
let hash = "";
const store = new Map();
globalThis.document = { getElementById: id => el("#" + id), querySelector: s => el(s), querySelectorAll: () => [], addEventListener: (t, f) => { handlers[t] = f; } };
globalThis.location = { protocol: "https:", pathname: "/nism-vii/", search: "", get hash() { return hash; }, set hash(h) { hash = h.startsWith("#") ? h : "#" + h; handlers.whashchange(); }, get href() { return "https://learnings.pages.dev/nism-vii/" + hash; } };
globalThis.history = { replaceState(_s, _t, url) { hash = url.slice(url.indexOf("#")); } };
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
globalThis.window = { scrollTo() {}, addEventListener: (t, f) => { handlers["w" + t] = f; } };
globalThis.matchMedia = () => ({ matches: false });
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
(0, eval)(js);

const go = h => { hash = h; handlers.whashchange(); return els["#view"].innerHTML; };
const click = ds => handlers.click({ target: { closest: () => ({ dataset: ds, getAttribute: () => hash, textContent: "" }) }, preventDefault() {} });

for (const h of ["#home", "#ch1", "#ch2", "#ch3", "#ch4", "#ch5", "#ch6", "#ch7", "#ch8", "#cards", "#cards-4", "#cards-numbers", "#numbers", "#updates", "#quiz-mistakes", "#progress"]) {
  const v = go(h);
  assert(v && !v.includes("undefined") && !v.includes("NaN"), "view " + h + " " + ((v || "").match(/.{60}(undefined|NaN).{30}/) || [""])[0]);
}
out.push("all 16 views render");
assert(els["#nav"].innerHTML.includes("All courses") && els["#nav"].innerHTML.includes("#progress"), "rail links");
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
out.push("mock: 100 questions in exam weightage");

/* ---------- sync ---------- */
store.set("nism7:read", JSON.stringify({ 1: true, 3: true, 8: true }));
store.set("nism7:plan", JSON.stringify({ 0: true, 2: true }));
store.set("nism7:best", JSON.stringify({ 3: 70 }));
const snapshot = () => ({
  read: Object.keys(JSON.parse(store.get("nism7:read") || "{}")).sort().join(),
  plan: Object.keys(JSON.parse(store.get("nism7:plan") || "{}")).sort().join(),
  best: store.get("nism7:best") || "{}",
  wrong: JSON.parse(store.get("nism7:wrong") || "[]").sort().join(),
  seen: JSON.parse(store.get("nism7:mockSeen") || "[]").sort().join()
});
// reload the app so it picks up the seeded storage
(0, eval)(js);
const before = snapshot();
let page = go("#progress");
assert(page.includes("<svg") && page.includes("QR code"), "progress page shows a QR code");
const code = page.match(/id="synccode">([^<]+)</)[1];
assert(/^nism7\.[A-Za-z0-9_-]+$/.test(code), "code format " + code);
out.push("sync code: " + code.length + " characters");
const link = "https://learnings.pages.dev/nism-vii/#sync-" + code;

// another device: empty storage, open the link, add it
store.clear(); (0, eval)(js);
page = go("#sync-" + code);
assert(page.includes("Add to this device") && page.includes("chapters marked as read (Ch 1, Ch 3, Ch 8)"), "sync preview");
click({ act: "sync-apply" });
assert(hash === "#progress" && els["#view"].innerHTML.includes("Added to this device"), "sync applied and moved to progress page");
const after = snapshot();
for (const k of Object.keys(before)) assert(before[k] === after[k], "sync round trip: " + k + "\n  before " + before[k] + "\n  after  " + after[k]);
out.push("sync round trip: read, plan, best, mistakes, mock-seen all identical");

// merge never lowers: a better local score and an extra local chapter survive
store.set("nism7:best", JSON.stringify({ 3: 90 })); store.set("nism7:read", JSON.stringify({ 1: true, 3: true, 8: true, 5: true }));
(0, eval)(js);
page = go("#sync-" + code);
assert(page.includes("nothing to add"), "re-applying the same link adds nothing");
assert(JSON.parse(store.get("nism7:best"))[3] === 90 && JSON.parse(store.get("nism7:read"))[5], "merge kept the better local values");
out.push("merge keeps higher local scores and extra chapters");

// the pasted-link path, and broken codes
el("#syncinput").value = "  " + link + "  ";
go("#progress"); click({ act: "sync-check" });
assert(hash === "#sync-" + code, "pasted link is accepted");
const bad = [
  ["nism7.AAAA", "incomplete"],
  [code.slice(0, -3) + (code.slice(-3, -2) === "A" ? "B" : "A") + code.slice(-2), "typo"],
  ["nism8." + code.slice(6), "different course"],
  ["hello", "doesn't look like"],
  ["nism7.@@@@", "characters that don't belong"]
];
for (const [c, msg] of bad) { page = go("#sync-" + c); assert(page.includes("didn't work") && page.includes(msg), "bad code (" + msg + ") -> " + page.slice(0, 300)); }
out.push("bad codes rejected with a clear reason (" + bad.length + " cases)");

/* ---------- clear ---------- */
store.set("other:keep", "1");
click({ act: "clear-ask" }); assert(/Delete my progress/.test(els["#clearwrap"].innerHTML), "clear confirm");
click({ act: "clear-yes" });
assert([...store.keys()].join() === "other:keep", "clear left " + [...store.keys()].join());
out.push("clear progress ok (other sites' keys untouched)");
console.log(out.join("\n") + "\nALL OK");
