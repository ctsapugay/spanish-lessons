#!/usr/bin/env python3
"""CHK-002 (Spanish) and CHK-006 (French, --lang fr) — every lesson is complete,
answerable, and taught in order.

Covers G2 / G9, C-NO-FORWARD-REFERENCES and C-ANSWERABLE. For every lesson in the outline:

  completeness   a content file exists; explanation of at least 300 characters; at least
                 10 example sentences with translations; at least 8 vocabulary entries with
                 translations; at least 40 exercise items in total (authored + generated
                 drills), at least 20 of them authored, authored items spanning at least 3
                 exercise types.
  answerable     every item has a well-formed key: multiple choice has >= 2 distinct options
                 and an answer index inside them; fill-in prompts contain a blank and have a
                 non-empty answer list with no duplicates; translations have answers; word
                 builders have at least two words; no two items in a lesson share a prompt.
  in order       every Spanish word an exercise requires appears in the vocabulary, examples, or *italicised*
                 Spanish (in text or tables) of this lesson or an earlier one. Required means:
                 all of a fill-in prompt, a word-builder answer and the correct option of a
                 Spanish multiple-choice item; and for fill-in and translation answers, at
                 least one accepted answer (extra accepted variants may go beyond what was
                 taught — accepting them never requires them). Proper nouns (capitalised
                 mid-sentence) and numbers are exempt.
  French also    every vocabulary entry carries a pronunciation guide (IPA) as its third
                 field, and a gender ("m" / "f") as an optional fourth; nothing else.

    python3 checks/scripts/check_content.py            # whole Spanish course
    python3 checks/scripts/check_content.py a1-05      # one lesson (still uses earlier lessons)
    python3 checks/scripts/check_content.py --lang fr  # the French course
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from courselib import (  # noqa: E402
    AUTHORED_TYPES, ROOT, build_lesson, lang_from_argv, lesson_path, load_course, load_json,
    normalise, ordered_lessons, target_spans_in_body,
)

LANG, args = lang_from_argv(sys.argv[1:])
WORD_RE = LANG.word_re
only = set(args)
if not LANG.course_file.exists():
    print(f"CONTENT CHECK FAILED ({LANG.name}): no course outline yet ({LANG.course_file.relative_to(ROOT)})")
    sys.exit(1)
course = load_course(LANG)
errors: list[str] = []
known: set[str] = set()
earlier_vocab: list = []
checked = 0


def learn(text: str) -> None:
    for t in WORD_RE.findall(text):
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
    path = lesson_path(lid, LANG)
    if not path.exists():
        if not only or lid in only:
            errors.append(f"{lid}: no content file ({path.relative_to(ROOT)})")
        continue
    src = load_json(path)

    # What this lesson teaches becomes known before its exercises are checked.
    for entry in src.get("vocab", []):
        learn(entry[0] if entry else "")
    for es, _en in src.get("examples", []):
        learn(es)
    for sec in src.get("sections", []):
        for span in target_spans_in_body(sec.get("body", "")):
            learn(span)
        table = sec.get("table")
        if table:
            for row in [table.get("head", [])] + table.get("rows", []):
                for cell in row:
                    for span in target_spans_in_body(cell):  # only *italic* target language teaches
                        learn(span)

    built = build_lesson(lid, meta, level, earlier_vocab[-60:], LANG)
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
        e(f"an example sentence is missing its {LANG.name} or English")
    voc = src.get("vocab", [])
    if len(voc) < 8:
        e(f"{len(voc)} vocabulary entries; expected at least 8")
    if LANG.code == "es":
        if any(len(p) != 2 or not p[0].strip() or not p[1].strip() for p in voc):
            e(f"a vocabulary entry is missing its {LANG.name} or English")
    else:
        for p in voc:
            if len(p) not in (3, 4) or not all(isinstance(x, str) and x.strip() for x in p[:3]):
                e(f"vocabulary entry {p!r} needs [{LANG.name}, English, pronunciation guide(, gender)]")
            elif len(p) == 4 and p[3] not in ("m", "f"):
                e(f"vocabulary entry {p!r}: gender must be \"m\" or \"f\"")
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
        spanish: list[str] = []      # every word here must be taught
        alternatives: list[str] = []  # accepted answers: at least one must be fully taught
        if t == "mc":
            opts = it.get("options", [])
            a = it.get("answer")
            if len(opts) < 2:
                e(f"{where}: fewer than 2 options")
            if len({o.strip().lower() for o in opts}) != len(opts):
                e(f"{where}: duplicate options")
            if not isinstance(a, int) or not 0 <= a < len(opts):
                e(f"{where}: answer index {a!r} is not one of the options")
            elif it.get("lang") == LANG.code:
                spanish.append(opts[a])
        elif t == "fill":
            ans = it.get("answers", [])
            if "___" not in prompt:
                e(f"{where}: prompt has no ___ blank")
            if not ans or any(not str(x).strip() for x in ans):
                e(f"{where}: no answers")
            if len({normalise(x) for x in ans}) != len(ans):
                e(f"{where}: duplicate answers")
            spanish.append(prompt)
            alternatives += list(ans)
        elif t == "translate":
            ans = it.get("answers", [])
            if not ans or any(not str(x).strip() for x in ans):
                e(f"{where}: no answers")
            if len({normalise(x) for x in ans}) != len(ans):
                e(f"{where}: duplicate answers")
            alternatives += list(ans)
        elif t == "build":
            ans = it.get("answer", "")
            if len(ans.split()) < 2:
                e(f"{where}: word builder needs at least two words")
            spanish.append(ans)
        def untaught(texts):
            return sorted({normalise(w) for s in texts for w in required_words(s)
                           if not w.isdigit() and normalise(w) not in known})
        unknown = untaught(spanish)
        if alternatives and all(untaught([a]) for a in alternatives):
            unknown = sorted(set(unknown) | set(untaught(alternatives[:1])))
        if unknown:
            e(f"{where}: uses words not yet taught: {', '.join(unknown)}  [{prompt[:50]}]")

if errors:
    print(f"CONTENT CHECK FAILED{'' if LANG.code == 'es' else ' (' + LANG.name + ')'} ({len(errors)} problems, {checked} lessons checked)")
    for msg in errors[:80]:
        print("  -", msg)
    if len(errors) > 80:
        print(f"  ... and {len(errors) - 80} more")
    sys.exit(1)
print(f"{'' if LANG.code == 'es' else LANG.name + ' '}content ok: {checked} lessons complete, answerable and in teaching order")
