#!/usr/bin/env python3
"""French reference lexicon: spelling, gender and pronunciation, from Lexique 3.83.

Used by the French accuracy check (checks/scripts/check_french_accuracy.py) and, while
writing lessons, as a helper:

    python3 scripts/frlex.py ipa "les enfants"     # pronunciation(s) Lexique gives, in IPA
    python3 scripts/frlex.py word maison           # rows for a word: IPA, category, gender
    python3 scripts/frlex.py check "Je m'appelle Camille."   # spelling of each word

Pronunciation guides are compared phoneme by phoneme with Lexique, except where standard
French itself varies, which the comparison treats as one sound: the mid vowels e/ɛ, o/ɔ
and ø/œ (their distribution varies between careful and everyday speech), ɛ̃/œ̃ (merged for
most speakers in France), a/ɑ (merged); and schwa, which may be pronounced (as ə, ø or œ)
or dropped where the lexicon has one.
Liaison consonants (z, t, n, ʁ, p, v) may be shown between words.
"""
from __future__ import annotations

import csv
import itertools
import re
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEXIQUE = ROOT / "curriculum" / "fr" / "lexique" / "lexique383-trimmed.tsv"

# Lexique's phonemic code -> IPA (Lexique 3 manual, "phon").
PHON2IPA = {
    "a": "a", "i": "i", "y": "y", "u": "u", "o": "o", "O": "ɔ", "e": "e", "E": "ɛ",
    "°": "ə", "2": "ø", "9": "œ", "5": "ɛ̃", "1": "œ̃", "@": "ɑ̃", "§": "ɔ̃",
    "p": "p", "b": "b", "t": "t", "d": "d", "k": "k", "g": "ɡ", "f": "f", "v": "v",
    "s": "s", "z": "z", "S": "ʃ", "Z": "ʒ", "m": "m", "n": "n", "N": "ɲ", "G": "ŋ",
    "l": "l", "R": "ʁ", "j": "j", "w": "w", "8": "ɥ", "x": "x",
}
# Elided forms ("l'ami") and how the elided word is pronounced.
ELISIONS = {
    "l": "l", "j": "ʒ", "d": "d", "n": "n", "m": "m", "t": "t", "s": "s", "c": "s",
    "qu": "k", "jusqu": "ʒysk", "lorsqu": "lɔʁsk", "puisqu": "pɥisk", "quoiqu": "kwak",
    "presqu": "pʁɛsk",
}
LIAISON = ("z", "t", "n", "ʁ", "p", "v")
IPA_CHARS = set("aeiouyøœɛɔəɑ̃pbtdkɡgfvszʃʒmnɲŋlʁjwɥx.ˈˌː‿ ()")
LETTER = r"A-Za-zÀ-ÖØ-öø-ÿŒœÆæ"
# A French word as written: letters, with internal apostrophes or hyphens ("aujourd'hui",
# "est-ce", "l'ami"), or an elided word on its own ("l'", "qu'").
WORD_RE = re.compile(rf"[{LETTER}]+(?:['’\-][{LETTER}]+)*['’]?")


def ipa(phon: str) -> str:
    return "".join(PHON2IPA.get(c, c) for c in phon)


def key(word: str) -> str:
    """Lexique stores words in lower case and writes œ as oe."""
    w = unicodedata.normalize("NFC", word).lower().replace("’", "'")
    return w.replace("œ", "oe").replace("æ", "ae")


@lru_cache(maxsize=1)
def lexicon() -> dict[str, list[dict]]:
    rows: dict[str, list[dict]] = {}
    with LEXIQUE.open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            rows.setdefault(r["ortho"], []).append(r)
    return rows




def rows(word: str) -> list[dict]:
    return lexicon().get(key(word), [])


def known(word: str) -> bool:
    """Is this a correctly spelled French word (or elided / hyphenated compound of them)?"""
    w = key(word)
    if w in lexicon():
        return True
    if "'" in w:
        pre, rest = w.split("'", 1)
        return pre in ELISIONS and (rest == "" or known(rest))
    if "-" in w:
        parts = w.split("-")
        return all(p == "t" or known(p) for p in parts if p != "")
    return False


def is_noun_only(word: str) -> bool:
    rs = rows(word)
    return bool(rs) and all(r["cgram"] == "NOM" for r in rs)


def genders(noun: str) -> set[str]:
    """Genders Lexique records for a noun — from the form itself, else from the same word's
    singular or plural (maison has none, maisons is f); empty if unknown. Other forms of the
    lemma are not used: professeure (f) says nothing about professeur."""
    w = key(noun)
    found = {r["genre"] for r in rows(w) if r["cgram"] == "NOM" and r["genre"]}
    if found:
        return found
    for other in (w + "s", w + "x", w[:-1] if w.endswith(("s", "x")) else None):
        if other:
            found |= {r["genre"] for r in lexicon().get(other, []) if r["cgram"] == "NOM" and r["genre"]}
    return found


def pronunciations(word: str, extra: dict[str, str] | None = None) -> set[str]:
    """Every IPA pronunciation Lexique allows for a written word (elisions and compounds too)."""
    extra = extra or {}
    w = key(word)
    if w in extra:
        return {extra[w]}
    found = {ipa(r["phon"]) for r in lexicon().get(w, [])}
    if found:
        return found
    if "'" in w:
        pre, rest = w.split("'", 1)
        if pre in ELISIONS:
            return {ELISIONS[pre]} if rest == "" else {ELISIONS[pre] + p for p in pronunciations(rest, extra)}
        return set()
    if "-" in w:
        options = [{"t"} if p == "t" else pronunciations(p, extra) for p in w.split("-") if p]
        if all(options):
            return {"".join(c) for c in itertools.islice(itertools.product(*options), 200)}
    return set()


def compare_key(s: str, schwa: str = "Œ") -> str:
    """Reduce IPA to what the comparison distinguishes (see the module docstring). A schwa
    becomes `schwa`: the Œ class in a guide, a marker "@" in the lexicon's own forms."""
    s = unicodedata.normalize("NFD", s.strip().strip("/[]"))
    s = s.replace("ɛ̃", "Ẽ").replace("œ̃", "Ẽ").replace("ɑ̃", "Ã").replace("ɔ̃", "Õ").replace("ã", "Ã")
    s = unicodedata.normalize("NFD", s)
    for a, b in (("ɛ", "E"), ("e", "E"), ("ɔ", "O"), ("o", "O"), ("ø", "Œ"), ("œ", "Œ"),
                 ("ɑ", "a"), ("ɡ", "g"), ("ə", schwa)):
        s = s.replace(a, b)
    return re.sub(r"[\s.ˈˌː‿()]", "", s)


def lexicon_keys(p: str) -> set[str]:
    """A lexicon pronunciation as comparison keys: each schwa may be said (as Œ) or dropped."""
    parts = compare_key(p, schwa="@").split("@")
    keys = {""}
    for i, part in enumerate(parts):
        keys = {k + part for k in keys}
        if i < len(parts) - 1:
            keys = {k + x for k in keys for x in ("", "Œ")}
        if len(keys) > 64:
            break
    return keys


def words_of(text: str) -> list[str]:
    return WORD_RE.findall(text)


def guide_matches(written: str, guide: str, extra: dict[str, str] | None = None) -> tuple[bool, str]:
    """Does a pronunciation guide match the written French, word by word, per Lexique?"""
    bad = set(unicodedata.normalize("NFD", guide)) - IPA_CHARS - {"̃", "/"}
    if bad:
        return False, f"not IPA: {''.join(sorted(bad))}"
    alts_w = [a.strip() for a in written.split("/")]
    alts_g = [a.strip() for a in guide.split("/") if a.strip()]
    if len(alts_w) != len(alts_g):
        return False, f"{len(alts_w)} written alternative(s) but {len(alts_g)} pronunciation(s)"
    for w, g in zip(alts_w, alts_g):
        options = []
        for tok in words_of(w):
            if tok.isdigit():
                continue
            ps = pronunciations(tok, extra)
            if not ps:
                return False, f"no pronunciation for «{tok}» in the lexicon"
            ks = set().union(*(lexicon_keys(p) for p in ps))
            options.append(ks | {k + c for k in ks for c in map(compare_key, LIAISON)})
        target = compare_key(g)
        reach = {0}
        for opts in options:
            reach = {i + len(o) for i in reach for o in opts if target.startswith(o, i)}
            if not reach:
                break
        if len(target) not in reach:
            expected = " ".join("|".join(sorted(pronunciations(t, extra))) for t in words_of(w))
            return False, f"«{w}» /{g}/ does not match the lexicon: {expected}"
    return True, ""


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in ("ipa", "word", "check"):
        print(__doc__)
        return 2
    cmd, text = argv[0], " ".join(argv[1:])
    if cmd == "ipa":
        for tok in words_of(text):
            print(f"{tok:20} {' | '.join(sorted(pronunciations(tok))) or '?'}")
    elif cmd == "word":
        for r in rows(text):
            print(f"{r['ortho']:16} /{ipa(r['phon'])}/  {r['cgram']:8} {r['genre'] or '-':2} {r['nombre'] or '-':2} lemme={r['lemme']} freq={r['freqfilms2']}")
        print("genders:", sorted(genders(text)) or "unknown")
    else:
        for tok in words_of(text):
            print(f"{tok:20} {'ok' if known(tok) or (tok[0].isupper() and known(tok.lower())) else 'NOT FOUND'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
