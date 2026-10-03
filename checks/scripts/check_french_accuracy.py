#!/usr/bin/env python3
"""CHK-007 — French spelling, gender and pronunciation match the reference lexicon (G10).

The reference is Lexique 3.83 (curriculum/fr/lexique/, CC BY-SA 4.0). For every French
lesson that has been written, this fails if:

  spelling       any French word in the lesson — vocabulary, examples, *italic* French in
                 explanations, tables, prompts, hints and explanations, multiple-choice
                 options marked French, fill-in prompts and answers, translation answers,
                 word-builder answers — is not in the lexicon (accents included; elided
                 forms such as l', qu', jusqu' and hyphenated compounds are checked part by
                 part), unless it is a lexicon note (below);
  gender         a vocabulary noun's gender — shown by its article (le, la, un, une, ce,
                 cette, du, au, ma, ta, sa, quelle) or given as the entry's fourth field —
                 disagrees with the lexicon, or the lexicon records no gender for it and no
                 lexicon note confirms one; or, anywhere in the lesson's French, one of those
                 articles stands directly before a word that is only ever a noun and has the
                 other gender in the lexicon (wrong multiple-choice options are exempt from
                 this: they may be ungrammatical on purpose, but are still spell-checked);
  pronunciation  a vocabulary entry's pronunciation guide is not valid IPA, or does not
                 match the lexicon's pronunciation of its words (see scripts/frlex.py for
                 the few differences that standard French allows and the comparison ignores).

Lexicon notes are the only exceptions. They live in a "## Lexicon notes" section of a French
level review (curriculum/fr/reviews/<LEVEL>.md), one per line, each with its reason:

    - `après-midi` /a.pʁɛ.mi.di/ (m) — missing from Lexique; spelling, gender and
      pronunciation as in Le Robert and Larousse.
    - `Camille` — a first name.

A note without a reason of at least a few words does not count.

    python3 checks/scripts/check_french_accuracy.py            # every French lesson
    python3 checks/scripts/check_french_accuracy.py a1-05      # one lesson
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import frlex  # noqa: E402
from courselib import LANGS, ROOT, lesson_path, load_course, load_json, ordered_lessons, target_spans_in_body  # noqa: E402

FR = LANGS["fr"]
only = set(sys.argv[1:])
errors: list[str] = []

NOTE_RE = re.compile(
    r"^\s*[-*]\s+`([^`]+)`\s*(?:/([^/]+)/)?\s*(?:\((m|f|m/f)\))?\s*[—–-]+\s*(.+)$")
ARTICLE_GENDER = {"le": "m", "un": "m", "ce": "m", "cet": "m", "du": "m", "au": "m",
                  "la": "f", "une": "f", "cette": "f", "ma": "f", "ta": "f", "sa": "f",
                  "quelle": "f"}

# ---------------------------------------------------------------- lexicon notes
notes: dict[str, dict] = {}
for review in sorted(FR.reviews_dir.glob("*.md")) if FR.reviews_dir.exists() else []:
    in_section = False
    for line in review.read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            in_section = bool(re.match(r"^#+\s*Lexicon notes", line, re.I))
            continue
        m = NOTE_RE.match(line) if in_section else None
        if not m:
            continue
        word, ipa, gender, reason = m.groups()
        if len(reason.split()) < 3:
            errors.append(f"{review.relative_to(ROOT)}: lexicon note for `{word}` gives no real reason")
            continue
        notes[frlex.key(word)] = {"ipa": ipa, "gender": gender, "file": review.name}
extra_ipa = {k: v["ipa"] for k, v in notes.items() if v["ipa"]}


def noted(word: str) -> bool:
    w = frlex.key(word)
    if w in notes:
        return True
    if "'" in w:  # an elided word before a noted one: d'Ottawa, l'Espagne
        pre, rest = w.split("'", 1)
        return pre in frlex.ELISIONS and rest in notes
    return False


# ---------------------------------------------------------------- text gathering
def italic(text: str) -> list[str]:
    return target_spans_in_body(text or "")


def french_texts(src: dict) -> list[tuple[str, str]]:
    out = []
    for v in src.get("vocab", []):
        out.append(("vocab", v[0]))
    for ex in src.get("examples", []):
        out.append(("example", ex[0]))
    for sec in src.get("sections", []):
        out += [("explanation", s) for s in italic(sec.get("body", ""))]
        table = sec.get("table") or {}
        for row in [table.get("head", [])] + table.get("rows", []):
            for cell in row:
                out += [("table", s) for s in italic(cell)]
    for n, it in enumerate(src.get("exercises", []), start=1):
        where = f"exercise {n}"
        t = it.get("type")
        for field in ("prompt", "hint", "explain"):
            if t == "fill" and field == "prompt":
                out.append((where, it.get("prompt", "").replace("___", " ")))
            else:
                out += [(where, s) for s in italic(it.get(field, ""))]
        if t == "mc" and it.get("lang") == "fr":
            for k, o in enumerate(it.get("options", [])):
                # Wrong options may be wrong on purpose (sa père) but must still be spelled right.
                out.append((where if k == it.get("answer") else where + " (wrong option)", o))
        if t in ("fill", "translate"):
            out += [(where, a) for a in it.get("answers", [])]
        if t == "build":
            out.append((where, it.get("answer", "")))
    return out


def check_spelling(lid: str, where: str, text: str) -> None:
    for tok in frlex.WORD_RE.findall(text):
        if frlex.known(tok) or noted(tok):
            continue
        if tok[0].isupper() and (frlex.known(tok.lower()) or noted(tok.lower())):
            continue  # a capitalised ordinary word; names need a lexicon note
        errors.append(f"{lid}: {where}: «{tok}» is not in the lexicon  [{text[:60]}]")


def check_bigram_genders(lid: str, where: str, text: str) -> None:
    words = frlex.WORD_RE.findall(text)
    for a, b in zip(words, words[1:]):
        g = ARTICLE_GENDER.get(a.lower())
        if not g or not frlex.is_noun_only(b):
            continue
        known = frlex.genders(b)
        note = notes.get(frlex.key(b), {}).get("gender")
        if note:
            known = set(note.split("/"))
        if known and g not in known:
            errors.append(f"{lid}: {where}: «{a} {b}» — the lexicon gives «{b}» as {'/'.join(sorted(known))}")


def check_vocab(lid: str, entry: list) -> None:
    written, guide = entry[0], entry[2] if len(entry) > 2 else ""
    ok, why = frlex.guide_matches(written, guide, extra_ipa)
    if not ok:
        errors.append(f"{lid}: vocab «{written}»: pronunciation guide {why}")
    for alt in [a.strip() for a in written.split("/")]:
        words = frlex.WORD_RE.findall(alt)
        if not words:
            continue
        first = words[0].lower()
        stated = None
        noun = None
        if first in ARTICLE_GENDER and len(words) > 1:
            stated, noun = ARTICLE_GENDER[first], words[1]
        elif re.match(r"^(l'|les\b|des\b|d')", alt, re.I):
            noun = re.sub(r"^(l'|les\s+|des\s+|d')", "", alt, flags=re.I).split()[0] if alt else None
            stated = entry[3] if len(entry) > 3 else None
            if noun and frlex.is_noun_only(noun) and not stated:
                errors.append(f"{lid}: vocab «{alt}»: the article doesn't show the gender; add \"m\" or \"f\" as a fourth field")
                continue
        elif len(entry) > 3:
            stated, noun = entry[3], words[0]
        if not stated or not noun:
            continue
        if not any(r["cgram"] == "NOM" for r in frlex.rows(noun)) and not noted(noun):
            continue
        note = notes.get(frlex.key(noun), {}).get("gender")
        known = set(note.split("/")) if note else frlex.genders(noun)
        if not known:
            errors.append(f"{lid}: vocab «{alt}»: the lexicon records no gender for «{noun}»; confirm it in a lexicon note")
        elif stated not in known:
            errors.append(f"{lid}: vocab «{alt}»: given as {stated}, but the lexicon gives «{noun}» as {'/'.join(sorted(known))}")


# ---------------------------------------------------------------- run
if not FR.course_file.exists():
    print("FRENCH ACCURACY CHECK FAILED: no French course yet")
    sys.exit(1)
checked = words = vocab = 0
for level, meta in ordered_lessons(load_course(FR)):
    lid = meta["id"]
    if only and lid not in only:
        continue
    path = lesson_path(lid, FR)
    if not path.exists():
        continue
    src = load_json(path)
    checked += 1
    for where, text in french_texts(src):
        words += len(frlex.WORD_RE.findall(text))
        check_spelling(lid, where, text)
        if not where.endswith("(wrong option)"):
            check_bigram_genders(lid, where, text)
    for entry in src.get("vocab", []):
        vocab += 1
        check_vocab(lid, entry)

if checked == 0:
    errors.append("no French lessons have been written yet")
if errors:
    print(f"FRENCH ACCURACY CHECK FAILED ({len(errors)} problems, {checked} lessons checked)")
    for msg in errors[:80]:
        print("  -", msg)
    if len(errors) > 80:
        print(f"  ... and {len(errors) - 80} more")
    sys.exit(1)
print(f"French accuracy ok: {checked} lessons, {words} words spelled as in the lexicon, "
      f"{vocab} vocabulary genders and pronunciation guides match, {len(notes)} lexicon notes")
