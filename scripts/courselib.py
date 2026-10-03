"""Shared helpers for building and checking the course content.

Polyglotte carries one course per language. For each language (see LANGS):

  <content>/course.json          ordered levels -> lessons (id, title, objective, covers) + level tests
  <content>/lessons/<id>.json    the lesson itself: sections, vocab, examples, exercises
  <curriculum>/inventory.json    what the course commits to cover (from <curriculum>/research.md)
  <curriculum>/reviews/<LV>.md   the accuracy review of each level

Spanish lives in content/ and curriculum/; French in content/fr/ and curriculum/fr/.
The build turns each into app/course-data-<lang>.js, adding generated drill items
(vocabulary and listening) to each lesson's authored exercises. Standard library only.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "app"

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1"]
AUTHORED_TYPES = {"mc", "fill", "translate", "build"}

ITALIC_RE = re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)")
BOLD_RE = re.compile(r"\*\*([^*\n]+)\*\*")


@dataclass(frozen=True)
class Lang:
    code: str
    name: str            # English name, used in prompts ("Write in Spanish")
    native: str          # the language's own name, shown in the switcher
    content: Path
    curriculum: Path
    word_re: re.Pattern
    articles: str        # leading articles a generated "write it" drill also accepts without
    speech: str          # BCP 47 language for speech
    voices: tuple        # preferred voices, best first; never a voice of another language
    tagline: str
    sample: str          # a sentence for "Test voice"

    @property
    def course_file(self) -> Path:
        return self.content / "course.json"

    @property
    def lessons_dir(self) -> Path:
        return self.content / "lessons"

    @property
    def inventory_file(self) -> Path:
        return self.curriculum / "inventory.json"

    @property
    def reviews_dir(self) -> Path:
        return self.curriculum / "reviews"

    @property
    def research_file(self) -> Path:
        return self.curriculum / "research.md"

    @property
    def out_file(self) -> Path:
        return APP_DIR / f"course-data-{self.code}.js"


LANGS = {
    "es": Lang(
        code="es", name="Spanish", native="Español",
        content=ROOT / "content", curriculum=ROOT / "curriculum",
        word_re=re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+"),
        articles=r"el|la|los|las|un|una|unos|unas",
        speech="es-MX", voices=("es-MX", "es-US", "es-419", "es-CO", "es-AR"),
        tagline="From complete beginner (A1) to advanced (C1), in Latin American Spanish.",
        sample="Hola, ¿cómo estás? Me llamo Sofía.",
    ),
    "fr": Lang(
        code="fr", name="French", native="Français",
        content=ROOT / "content" / "fr", curriculum=ROOT / "curriculum" / "fr",
        word_re=re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+"),
        articles=r"le|la|les|un|une|des|l'",
        speech="fr-FR", voices=("fr-FR",),
        tagline="From complete beginner (A1) to advanced (C1), in standard French as spoken in France.",
        sample="Bonjour, comment allez-vous ? Je m'appelle Camille.",
    ),
}
ES = LANGS["es"]

# Spanish paths under their original names (the Spanish checks use these).
COURSE_FILE = ES.course_file
LESSONS_DIR = ES.lessons_dir
INVENTORY_FILE = ES.inventory_file
REVIEWS_DIR = ES.reviews_dir
RESEARCH_FILE = ES.research_file
WORD_RE = ES.word_re


def lang_from_argv(argv: list[str]) -> tuple[Lang, list[str]]:
    """`--lang fr` selects a language (default Spanish); returns the remaining arguments."""
    rest, code = [], "es"
    it = iter(argv)
    for a in it:
        if a == "--lang":
            code = next(it, "es")
        elif a.startswith("--lang="):
            code = a.split("=", 1)[1]
        else:
            rest.append(a)
    if code not in LANGS:
        raise SystemExit(f"unknown language {code!r}; expected one of {', '.join(LANGS)}")
    return LANGS[code], rest


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_course(lang: Lang = ES) -> dict:
    return load_json(lang.course_file)


def ordered_lessons(course: dict) -> list[tuple[str, dict]]:
    return [(lv["id"], lesson) for lv in course["levels"] for lesson in lv["lessons"]]


def lesson_path(lesson_id: str, lang: Lang = ES) -> Path:
    return lang.lessons_dir / f"{lesson_id}.json"


def item_id(lesson_id: str, item: dict) -> str:
    key = json.dumps(
        [item.get("type"), item.get("prompt"), item.get("audio")], ensure_ascii=False
    )
    return f"{lesson_id}:{hashlib.sha1(key.encode('utf-8')).hexdigest()[:10]}"


def strip_article(text: str, lang: Lang = ES) -> str:
    return re.sub(rf"^(?:{lang.articles})(?:\s+|(?<='))", "", text.strip(), flags=re.I)


def generated_items(lesson_id: str, lesson: dict, earlier_vocab: list, lang: Lang = ES) -> list[dict]:
    """Vocabulary and listening drills derived from the lesson's own vocab and examples."""
    rng = random.Random(lesson_id)
    items = []
    vocab = lesson.get("vocab", [])
    pool = [v[1] for v in vocab] + [v[1] for v in earlier_vocab]
    for entry in vocab:
        word, en = entry[0], entry[1]
        distractors = [p for p in dict.fromkeys(pool) if p != en]
        rng.shuffle(distractors)
        options = distractors[:3] + [en]
        rng.shuffle(options)
        items.append({
            "type": "mc", "gen": "vocab",
            "prompt": f"What does «{word}» mean?",
            "options": options, "answer": options.index(en), "say": word,
        })
        answers = [a.strip() for a in word.split("/")]
        answers += [strip_article(a, lang) for a in answers]
        items.append({
            "type": "translate", "gen": "vocab",
            "prompt": f"Write in {lang.name}: “{en}”",
            "answers": list(dict.fromkeys(answers)),
        })
    for es, en in lesson.get("examples", []):
        items.append({
            "type": "listen", "gen": "listen",
            "prompt": "Listen and type what you hear.",
            "audio": es, "answers": [es], "translation": en,
        })
    return items


def build_lesson(lesson_id: str, meta: dict, level: str, earlier_vocab: list, lang: Lang = ES) -> dict | None:
    path = lesson_path(lesson_id, lang)
    if not path.exists():
        return None
    src = load_json(path)
    items = [dict(ex) for ex in src.get("exercises", [])]
    items += generated_items(lesson_id, src, earlier_vocab, lang)
    for it in items:
        it["id"] = item_id(lesson_id, it)
    return {
        "id": lesson_id,
        "level": level,
        "title": meta["title"],
        "objective": meta["objective"],
        "sections": src.get("sections", []),
        "vocab": src.get("vocab", []),
        "examples": src.get("examples", []),
        "items": items,
    }


def build_course(lang: Lang = ES) -> dict:
    course = load_course(lang)
    out_levels = []
    earlier_vocab: list = []
    for lv in course["levels"]:
        lessons = []
        for meta in lv["lessons"]:
            built = build_lesson(meta["id"], meta, lv["id"], earlier_vocab[-60:], lang)
            if built:
                lessons.append(built)
                earlier_vocab += built["vocab"]
            else:
                lessons.append({"id": meta["id"], "level": lv["id"], "title": meta["title"],
                                "objective": meta["objective"], "missing": True})
        out_levels.append({"id": lv["id"], "title": lv["title"], "test": lv["test"],
                           "lessons": lessons})
    return {
        "lang": {"code": lang.code, "name": lang.name, "native": lang.native, "speech": lang.speech,
                 "voices": list(lang.voices), "tagline": lang.tagline, "sample": lang.sample},
        "levels": out_levels,
    }


def render_data_js(data: dict, lang: Lang = ES) -> str:
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return (f"// Generated by scripts/build.py from {lang.content.relative_to(ROOT)}/. Do not edit by hand.\n"
            f"(window.COURSES = window.COURSES || {{}}).{lang.code} = " + body + ";\n")


# ---------------------------------------------------------------- answer normalising
# Mirrors normalise() in app/app.js; the app is what actually grades.

def normalise(s: str) -> str:
    s = unicodedata.normalize("NFC", s).lower()
    s = re.sub(r"[¿¡?!.,;:\"“”«»()—–]", " ", s)
    s = s.replace("’", "'")
    s = re.sub(r"'\s+", "'", s)
    return re.sub(r"\s+", " ", s).strip()


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", normalise(s).replace("œ", "oe").replace("æ", "ae"))
                   if unicodedata.category(c) != "Mn")


def tokens(text: str, lang: Lang = ES) -> list[str]:
    return lang.word_re.findall(text)


def spanish_spans_in_body(body: str) -> list[str]:
    """Target-language text in explanations is marked with *italics*. **Bold** is English emphasis."""
    return ITALIC_RE.findall(BOLD_RE.sub(" ", body))


target_spans_in_body = spanish_spans_in_body
