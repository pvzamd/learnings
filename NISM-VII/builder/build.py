"""Builds the NISM VII guide: template.html + content/ch*.json -> ../site/index.html

Usage (from anywhere):  python NISM-VII/builder/build.py
Validate the content first:  python NISM-VII/builder/validate.py NISM-VII/builder/content/ch3.json
"""
import glob
import json
import os

here = os.path.dirname(os.path.abspath(__file__))
chapters = [json.load(open(f, encoding="utf8"))
            for f in sorted(glob.glob(os.path.join(here, "content", "ch[0-9].json")))]
data = json.dumps({"chapters": chapters}, ensure_ascii=False, separators=(",", ":")).replace("</", r"<\/")
page = open(os.path.join(here, "template.html"), encoding="utf8").read().replace("/*__DATA__*/", data)
dst = os.path.normpath(os.path.join(here, "..", "site", "index.html"))
with open(dst, "w", encoding="utf8", newline="\n") as f:
    f.write(page)
print(f"{len(chapters)} chapters, {sum(len(c['questions']) for c in chapters)} questions, "
      f"{sum(len(c['flashcards']) for c in chapters)} flashcards, {sum(len(c['numbers']) for c in chapters)} numbers "
      f"-> {dst} ({len(page) // 1024} KB)")
