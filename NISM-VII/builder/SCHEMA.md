# NISM Series VII study guide: chapter content schema

Each chapter is one JSON file: `content/chN.json` (N = chapter number). An HTML study app renders it.
The reader is preparing for the NISM Series VII (Securities Operations & Risk Management) exam
and finds the official workbook dull. The aim is to help them pass on the first attempt.
Exam: 100 MCQs x 1 mark, 2 hours, pass mark 50, negative marking 0.25 per wrong answer.

## Top-level object

```json
{
  "id": 3,
  "title": "Introduction to Securities Broking Operations",
  "short": "Broking Operations",            // 1-3 words, used in the sidebar
  "weight": 20,                              // exam weightage in %
  "minutes": 60,                             // honest reading-time estimate for YOUR notes
  "big_picture": "2-4 sentences. What this chapter is really about, in plain words, ideally as a mini story or analogy.",
  "exam_focus": ["4-7 bullets: what the exam loves to ask from this chapter"],
  "sections": [ { "id": "3.1", "title": "The Trade Life Cycle", "blocks": [ /* blocks */ ] } ],
  "numbers":    [ { "fact": "Settlement cycle for equity cash segment", "value": "T+1", "ref": "5.1" } ],
  "flashcards": [ { "q": "Who issues the contract note?", "a": "The stock broker, within 24 hours of the trade" } ],
  "questions":  [ { "q": "...", "options": ["...", "...", "...", "..."], "answer": 2,
                    "why": "1-2 sentences explaining why that answer is right.", "ref": "3.2", "level": "easy" } ]
}
```

- `sections`: follow the workbook's numbered sections (x.1, x.2 ...). You may merge tiny sub-sections or
  add sub-structure inside blocks. Use the workbook numbering in `id`.
- `numbers`: EVERY testable number in the chapter: timelines (T+1, 7:30 am, within 24 hours, 30 days),
  percentages, rupee limits, counts, years of acts, thresholds, validity periods. This becomes the cheat sheet,
  so it must be complete and exact. Keep `fact` short; `value` is the thing to memorise.
- `flashcards`: quick recall pairs (definitions, who-does-what, abbreviations, numbers). Answers <= 25 words.
- `questions`: exam-style MCQs. Usually 4 options; True/False questions use exactly 2 options ["True","False"].
  `answer` is the 0-based index of the correct option. Vary the correct position across 0-3 (no position
  should hold more than ~35% of answers). `level` is "easy", "medium" or "hard".
  Include rewritten versions of the workbook's own "Sample Questions" for the chapter.
  Every answer must be clearly supported by the workbook text. Avoid ambiguous questions.
  Use "All of the above" / "Both (a) and (b)" sparingly (options are never shuffled, so they are safe).

## Block types (inside a section's `blocks` array)

| type      | fields                                         | use for |
|-----------|------------------------------------------------|---------|
| `p`       | `text`                                         | a short explanatory paragraph (2-5 sentences) |
| `list`    | `items` (array of strings)                     | unordered points |
| `steps`   | `items` (array of `{title, text}`)             | ONLY a real sequence where order matters (a process, a timeline) |
| `table`   | `head` (array), `rows` (array of arrays), optional `caption` | structured comparisons, timelines, numbers |
| `compare` | `items` (2-3 of `{title, points: [..]}`)        | side-by-side of things students confuse |
| `example` | optional `title`, `text`                       | worked example / mini-story with realistic numbers (₹) |
| `hook`    | `text`                                         | memory trick / mnemonic / analogy that makes it stick |
| `trap`    | `text`                                         | exam trap: a commonly confused point or a typical wrong option |
| `key`     | `text`                                         | a one-line must-remember fact |
| `new`     | `text`                                         | content that is NEW/UPDATED in the July 2026 workbook (yellow-highlighted) |

Inline HTML allowed inside any text string: `<b>`, `<i>`, `<br>`, `<sub>`, `<sup>`. Nothing else
(no other tags, no markdown, no emoji). Use the ₹ sign for rupees.

## Writing style

- Write like a sharp senior colleague at a broking firm explaining things to a new joiner over chai:
  plain English, short sentences, active voice, concrete examples. Not a legal document.
- Explain WHY things exist (e.g. why margins, why netting, why a contract note) so facts hang on logic.
- Use realistic Indian examples (a client buying 100 shares of a company at ₹500 on NSE, etc.).
- Never drop a testable fact. Cut legal padding, repeated circular numbers and boilerplate instead.
  Keep a circular date only when the date itself is likely to be asked or it marks something new.
- Hooks must actually help memory (acronyms, contrasts, visual pictures). 0-3 per section, never forced.
- Traps: where the exam is likely to use a distractor (e.g. T+1 vs T+2, who vs whom, 30 vs 21 days).
- Follow the workbook as the source of truth for facts. You may add outside context only to EXPLAIN,
  never to contradict the workbook (the exam is set from it).
- No emoji. No "In this chapter we will..." filler.

## Validate before finishing

    python validate.py content/chN.json

It must print OK. Fix every error. Treat warnings seriously.
