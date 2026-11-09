"""Validate a chapter content JSON file against SCHEMA.md. Usage: python validate.py content/ch3.json"""
import json, re, sys
from collections import Counter

ALLOWED_TAGS = {"b", "i", "br", "sub", "sup"}
BLOCKS = {
    "p": ["text"], "list": ["items"], "steps": ["items"], "table": ["head", "rows"],
    "compare": ["items"], "example": ["text"], "hook": ["text"], "trap": ["text"],
    "key": ["text"], "new": ["text"],
}
errors, warnings = [], []


def err(m): errors.append(m)
def warn(m): warnings.append(m)


def check_text(s, where):
    if not isinstance(s, str) or not s.strip():
        err(f"{where}: empty or non-string text"); return
    for tag in re.findall(r"</?\s*([a-zA-Z0-9]+)[^>]*>", s):
        if tag.lower() not in ALLOWED_TAGS:
            err(f"{where}: tag <{tag}> not allowed")
    for t in ("b", "i", "sub", "sup"):
        if len(re.findall(rf"<{t}>", s)) != len(re.findall(rf"</{t}>", s)):
            err(f"{where}: unbalanced <{t}>")
    if re.search(r"\*\*|__", s):
        warn(f"{where}: markdown emphasis found, use <b>")
    if re.search(r"[\U0001F300-\U0001FAFF☀-➿]", s):
        err(f"{where}: emoji found")


def main(path):
    try:
        d = json.load(open(path, encoding="utf8"))
    except Exception as e:
        print("INVALID JSON:", e); sys.exit(1)
    for k in ["id", "title", "short", "weight", "minutes", "big_picture", "exam_focus",
              "sections", "numbers", "flashcards", "questions"]:
        if k not in d: err(f"missing top-level key: {k}")
    if errors: return report()
    check_text(d["big_picture"], "big_picture")
    for i, x in enumerate(d["exam_focus"]): check_text(x, f"exam_focus[{i}]")
    ids = set()
    for si, s in enumerate(d["sections"]):
        w = f"section[{si}]"
        for k in ("id", "title", "blocks"):
            if k not in s: err(f"{w}: missing {k}")
        if s.get("id") in ids: err(f"{w}: duplicate id {s.get('id')}")
        ids.add(s.get("id"))
        for bi, b in enumerate(s.get("blocks", [])):
            bw = f"{w}({s.get('id')}).block[{bi}]"
            t = b.get("type")
            if t not in BLOCKS: err(f"{bw}: unknown type {t!r}"); continue
            for k in BLOCKS[t]:
                if k not in b: err(f"{bw}: {t} needs {k}")
            if t in ("p", "hook", "trap", "key", "new", "example"):
                check_text(b.get("text"), bw)
            if t == "list":
                for ii, it in enumerate(b.get("items", [])): check_text(it, f"{bw}.items[{ii}]")
            if t == "steps":
                for ii, it in enumerate(b.get("items", [])):
                    if not isinstance(it, dict) or "title" not in it or "text" not in it:
                        err(f"{bw}.items[{ii}]: steps need {{title,text}}")
                    else:
                        check_text(it["title"], bw); check_text(it["text"], bw)
            if t == "table":
                n = len(b.get("head", []))
                for ri, r in enumerate(b.get("rows", [])):
                    if len(r) != n: err(f"{bw}.rows[{ri}]: {len(r)} cells, header has {n}")
                    for c in r:
                        if not isinstance(c, str): err(f"{bw}.rows[{ri}]: non-string cell")
                        elif c.strip(): check_text(c, f"{bw}.rows[{ri}]")
            if t == "compare":
                its = b.get("items", [])
                if not 2 <= len(its) <= 3: err(f"{bw}: compare needs 2-3 items")
                for it in its:
                    if "title" not in it or "points" not in it: err(f"{bw}: compare item needs title, points")
    for i, n in enumerate(d["numbers"]):
        if not all(k in n for k in ("fact", "value")): err(f"numbers[{i}]: needs fact, value")
        else: check_text(n["fact"], f"numbers[{i}]"); check_text(n["value"], f"numbers[{i}]")
    for i, f in enumerate(d["flashcards"]):
        if not all(k in f for k in ("q", "a")): err(f"flashcards[{i}]: needs q, a")
        else: check_text(f["q"], f"flashcards[{i}]"); check_text(f["a"], f"flashcards[{i}]")
    pos = Counter(); seen = set()
    for i, q in enumerate(d["questions"]):
        w = f"questions[{i}]"
        if not all(k in q for k in ("q", "options", "answer", "why", "level")):
            err(f"{w}: needs q, options, answer, why, level"); continue
        check_text(q["q"], w); check_text(q["why"], w)
        o = q["options"]
        if len(o) not in (2, 4): err(f"{w}: needs 4 options (or 2 for True/False)")
        if len(set(map(str, o))) != len(o): err(f"{w}: duplicate options")
        for x in o: check_text(x, w)
        if not isinstance(q["answer"], int) or not 0 <= q["answer"] < len(o): err(f"{w}: answer index out of range")
        if q["level"] not in ("easy", "medium", "hard"): err(f"{w}: bad level")
        if len(o) == 4: pos[q["answer"]] += 1
        key = re.sub(r"\W+", "", q["q"].lower())
        if key in seen: err(f"{w}: duplicate question")
        seen.add(key)
    tot = sum(pos.values())
    if tot and max(pos.values()) / tot > 0.38:
        warn(f"answer positions skewed: {dict(sorted(pos.items()))}")
    print(f"{path}: {len(d['sections'])} sections, {sum(len(s.get('blocks', [])) for s in d['sections'])} blocks, "
          f"{len(d['numbers'])} numbers, {len(d['flashcards'])} flashcards, {len(d['questions'])} questions, "
          f"answer positions {dict(sorted(pos.items()))}")
    report()


def report():
    for w in warnings: print("WARN:", w)
    for e in errors: print("ERROR:", e)
    if errors: sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main(sys.argv[1])
