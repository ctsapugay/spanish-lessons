#!/usr/bin/env python3
"""CHK-002 — every lesson is complete, answerable, and taught in order.

Covers G2, C-NO-FORWARD-REFERENCES and C-ANSWERABLE. For every lesson in the outline:

  completeness   a content file exists; explanation of at least 300 characters; at least
                 10 example sentences with translations; at least 8 vocabulary entries with
                 translations; at least 40 exercise items in total (authored + generated
                 drills), at least 20 of them authored, authored items spanning at least 3
                 exercise types.
  answerable     every item has a well-formed key: multiple choice has >= 2 distinct options
                 and an answer index inside them; fill-in prompts contain a blank and have a
                 non-empty answer list with no duplicates; translations have answers; word
                 builders have at least two words; no two items in a lesson share a prompt.
  in order       every Spanish word an exercise requires (fill-in prompts and answers,
                 translation answers, word-builder answers, the correct option of a Spanish
                 multiple-choice item) appears in the vocabulary, examples, tables or
                 *italicised* Spanish of this lesson or an earlier one. Proper nouns
                 (capitalised mid-sentence) and numbers are exempt.

    python3 checks/scripts/check_content.py            # whole course
    python3 checks/scripts/check_content.py a1-05      # one lesson (still uses earlier lessons)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from courselib import (  # noqa: E402
    AUTHORED_TYPES, build_lesson, lesson_path, load_course, load_json, normalise,
    ordered_lessons, spanish_spans_in_body, tokens, WORD_RE,
)

only = set(sys.argv[1:])
course = load_course()
errors: list[str] = []
known: set[str] = set()
earlier_vocab: list = []
checked = 0


def learn(text: str) -> None:
    for t in tokens(text):
        known.add(normalise(t))


def required_words(text: str) -> list[str]:
    """Words a learner must know, minus proper nouns (capitalised, not sentence-initial)."""
    out = []
    for sentence in __import__("re").split(r"[.!?¿¡\n]+", text):
        words = WORD_RE.findall(sentence)
        for i, w in enumerate(words):
            if i > 0 and w[0].isupper():
                continue
            out.append(w)
    return out


for level, meta in ordered_lessons(course):
    lid = meta["id"]
    path = lesson_path(lid)
    if not path.exists():
        if not only or lid in only:
            errors.append(f"{lid}: no content file (content/lessons/{lid}.json)")
        continue
    src = load_json(path)

    # What this lesson teaches becomes known before its exercises are checked.
    for es, _en in src.get("vocab", []):
        learn(es)
    for es, _en in src.get("examples", []):
        learn(es)
    for sec in src.get("sections", []):
        for span in spanish_spans_in_body(sec.get("body", "")):
            learn(span)
        table = sec.get("table")
        if table:
            for row in [table.get("head", [])] + table.get("rows", []):
                for cell in row:
                    learn(cell)

    built = build_lesson(lid, meta, level, earlier_vocab[-60:])
    earlier_vocab += src.get("vocab", [])
    if only and lid not in only:
        continue
    checked += 1
    e = lambda msg: errors.append(f"{lid}: {msg}")  # noqa: E731

    body_len = sum(len(s.get("body", "")) for s in src.get("sections", []))
    if body_len < 300:
        e(f"explanation is {body_len} characters; expected at least 300")
    ex = src.get("examples", [])
    if len(ex) < 10:
        e(f"{len(ex)} example sentences; expected at least 10")
    if any(len(p) != 2 or not p[0].strip() or not p[1].strip() for p in ex):
        e("an example sentence is missing its Spanish or English")
    voc = src.get("vocab", [])
    if len(voc) < 8:
        e(f"{len(voc)} vocabulary entries; expected at least 8")
    if any(len(p) != 2 or not p[0].strip() or not p[1].strip() for p in voc):
        e("a vocabulary entry is missing its Spanish or English")
    if len({normalise(v[0]) for v in voc}) != len(voc):
        e("duplicate vocabulary entries")

    authored = src.get("exercises", [])
    items = built["items"]
    if len(items) < 40:
        e(f"{len(items)} exercise items in total; expected at least 40")
    if len(authored) < 20:
        e(f"{len(authored)} authored exercises; expected at least 20")
    types = {a.get("type") for a in authored}
    if len(types & AUTHORED_TYPES) < 3:
        e(f"authored exercises span {sorted(types)}; expected at least 3 types")

    ids = [it["id"] for it in items]
    if len(set(ids)) != len(ids):
        dups = {it.get("prompt") or it.get("audio") for it in items if ids.count(it["id"]) > 1}
        e(f"two exercises share the same prompt (duplicate items): {sorted(dups)}")

    for n, it in enumerate(authored, start=1):
        where = f"exercise {n} ({it.get('type')})"
        t = it.get("type")
        prompt = it.get("prompt", "")
        if t not in AUTHORED_TYPES:
            e(f"{where}: unknown type")
            continue
        if not prompt.strip():
            e(f"{where}: empty prompt")
        spanish: list[str] = []
        if t == "mc":
            opts = it.get("options", [])
            a = it.get("answer")
            if len(opts) < 2:
                e(f"{where}: fewer than 2 options")
            if len({o.strip().lower() for o in opts}) != len(opts):
                e(f"{where}: duplicate options")
            if not isinstance(a, int) or not 0 <= a < len(opts):
                e(f"{where}: answer index {a!r} is not one of the options")
            elif it.get("lang") == "es":
                spanish.append(opts[a])
        elif t == "fill":
            ans = it.get("answers", [])
            if "___" not in prompt:
                e(f"{where}: prompt has no ___ blank")
            if not ans or any(not str(x).strip() for x in ans):
                e(f"{where}: no answers")
            if len({normalise(x) for x in ans}) != len(ans):
                e(f"{where}: duplicate answers")
            spanish += [prompt] + list(ans)
        elif t == "translate":
            ans = it.get("answers", [])
            if not ans or any(not str(x).strip() for x in ans):
                e(f"{where}: no answers")
            if len({normalise(x) for x in ans}) != len(ans):
                e(f"{where}: duplicate answers")
            spanish += list(ans)
        elif t == "build":
            ans = it.get("answer", "")
            if len(ans.split()) < 2:
                e(f"{where}: word builder needs at least two words")
            spanish.append(ans)
        unknown = sorted({normalise(w) for s in spanish for w in required_words(s)
                          if not w.isdigit() and normalise(w) not in known})
        if unknown:
            e(f"{where}: uses words not yet taught: {', '.join(unknown)}  [{prompt[:50]}]")

if errors:
    print(f"CONTENT CHECK FAILED ({len(errors)} problems, {checked} lessons checked)")
    for msg in errors[:80]:
        print("  -", msg)
    if len(errors) > 80:
        print(f"  ... and {len(errors) - 80} more")
    sys.exit(1)
print(f"content ok: {checked} lessons complete, answerable and in teaching order")
