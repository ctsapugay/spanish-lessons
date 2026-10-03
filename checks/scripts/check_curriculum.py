#!/usr/bin/env python3
"""CHK-001 (Spanish) and CHK-005 (French, --lang fr) — the curriculum is complete,
grounded, and reviewed (covers G1, G5, G6 for Spanish; G8, G12 for French).

Fails if:
  - the five levels A1, A2, B1, B2, C1 are not all present, in that order;
  - any lesson lacks an id, title, objective, or at least one covered inventory item;
  - a lesson id is duplicated, or a lesson covers an item that is not in the inventory;
  - any inventory item is not covered by a lesson at or before its own level;
  - the research record cites fewer than five distinct sources (URLs);
  - any level has no level test, or a test with fewer than 20 questions;
  - any level has no accuracy-review record naming every lesson in that level and listing
    concrete findings.

French (--lang fr) must also be grounded in French-teaching references, not the Spanish
course. It additionally fails if:
  - the research record does not define its sources as `[KEY]` entries, each with a URL;
  - any inventory item's source does not cite one of those keys, or cites a Spanish source;
  - the research record lacks a pronunciation strand, or any level has no pronunciation
    (kind "pron") inventory item.

    python3 checks/scripts/check_curriculum.py              # Spanish
    python3 checks/scripts/check_curriculum.py --lang fr    # French
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from courselib import LEVEL_ORDER, ROOT, lang_from_argv, load_course, load_json  # noqa: E402

LANG, _ = lang_from_argv(sys.argv[1:])
INVENTORY_FILE, RESEARCH_FILE, REVIEWS_DIR = LANG.inventory_file, LANG.research_file, LANG.reviews_dir

errors: list[str] = []
if not LANG.course_file.exists() or not INVENTORY_FILE.exists() or not RESEARCH_FILE.exists():
    print(f"CURRICULUM CHECK FAILED ({LANG.name}): no course outline, inventory or research record yet")
    sys.exit(1)
course = load_course(LANG)
inventory = {i["id"]: i for i in load_json(INVENTORY_FILE)["items"]}

levels = [lv["id"] for lv in course["levels"]]
if levels != LEVEL_ORDER:
    errors.append(f"levels are {levels}, expected {LEVEL_ORDER}")

seen: set[str] = set()
covered_at: dict[str, int] = {}
for li, lv in enumerate(course["levels"]):
    if not lv.get("lessons"):
        errors.append(f"{lv['id']}: no lessons")
    for lesson in lv.get("lessons", []):
        lid = lesson.get("id", "")
        if not lid:
            errors.append(f"{lv['id']}: a lesson has no id")
            continue
        if lid in seen:
            errors.append(f"{lid}: duplicate lesson id")
        seen.add(lid)
        for field in ("title", "objective"):
            if len(lesson.get(field, "").strip()) < 5:
                errors.append(f"{lid}: missing {field}")
        if not lesson.get("covers"):
            errors.append(f"{lid}: covers no inventory item")
        for item in lesson.get("covers", []):
            if item not in inventory:
                errors.append(f"{lid}: covers unknown inventory item {item}")
            else:
                covered_at[item] = min(covered_at.get(item, 99), li)
    test = lv.get("test") or {}
    if not test.get("id") or int(test.get("questions", 0)) < 20:
        errors.append(f"{lv['id']}: no level test (or fewer than 20 questions)")

for iid, item in inventory.items():
    if iid not in covered_at:
        errors.append(f"inventory item {iid} ({item['description']}) is not covered by any lesson")
    elif item["level"] in LEVEL_ORDER and covered_at[iid] > LEVEL_ORDER.index(item["level"]):
        errors.append(f"inventory item {iid} is only covered after its level {item['level']}")
    if not item.get("source"):
        errors.append(f"inventory item {iid} has no source")

research = RESEARCH_FILE.read_text(encoding="utf-8")
urls = set(re.findall(r"https?://[^\s)>\]]+", research))
if len(urls) < 5:
    errors.append(f"{RESEARCH_FILE.relative_to(ROOT)} cites {len(urls)} sources; expected at least 5")

if LANG.code == "fr":
    # Sources are defined as "- **[KEY]** ... https://..." lines; items cite them by key.
    keys = {}
    current = None
    for line in research.splitlines():
        m = re.match(r"^\s*[-*]\s+\*\*\[([A-Z0-9-]+)\]\*\*(.*)$", line)
        if m:
            current = m.group(1)
            keys[current] = m.group(2)
        elif current and line.startswith((" ", "\t")) and line.strip():
            keys[current] += " " + line.strip()  # the entry continues on an indented line
        else:
            current = None
    if len(keys) < 5:
        errors.append(f"French research record defines {len(keys)} [KEY] sources; expected at least 5")
    for k, rest in keys.items():
        if not re.search(r"https?://", rest):
            errors.append(f"French source [{k}] has no URL")
    spanish_markers = re.compile(r"PCIC|Cervantes|Davies|español|Spanish", re.I)
    for iid, item in inventory.items():
        cited = re.findall(r"\[([A-Z0-9-]+)\]", item.get("source", ""))
        if not cited:
            errors.append(f"French inventory item {iid} cites no [KEY] source")
        for k in cited:
            if k not in keys:
                errors.append(f"French inventory item {iid} cites undefined source [{k}]")
        if spanish_markers.search(item.get("source", "")):
            errors.append(f"French inventory item {iid} cites a Spanish source: {item['source']}")
    if not re.search(r"^#+ .*(pronunciation|prononciation)", research, flags=re.I | re.M):
        errors.append("French research record has no pronunciation section")
    for lv in LEVEL_ORDER:
        if not any(i["level"] == lv and i.get("kind") == "pron" for i in inventory.values()):
            errors.append(f"French inventory has no pronunciation item at {lv}")

for lv in course["levels"]:
    review = REVIEWS_DIR / f"{lv['id']}.md"
    if not review.exists():
        errors.append(f"{lv['id']}: no accuracy review record ({review.relative_to(ROOT)})")
        continue
    text = review.read_text(encoding="utf-8")
    missing = [l["id"] for l in lv["lessons"] if l["id"] not in text]
    if missing:
        errors.append(f"{lv['id']} review does not name lessons: {', '.join(missing)}")
    findings = re.findall(r"^\s*[-*] .*(?:→|->).*$", text, flags=re.M)
    if len(findings) < 3:
        errors.append(f"{lv['id']} review lists {len(findings)} findings with fixes "
                      "('- problem → fix'); expected at least 3")

total = sum(len(lv["lessons"]) for lv in course["levels"])
if errors:
    print(f"CURRICULUM CHECK FAILED{'' if LANG.code == 'es' else ' (' + LANG.name + ')'} ({len(errors)} problems, {total} lessons in outline)")
    for e in errors[:60]:
        print("  -", e)
    if len(errors) > 60:
        print(f"  ... and {len(errors) - 60} more")
    sys.exit(1)
print(f"{'' if LANG.code == 'es' else LANG.name + ' '}curriculum ok: {len(levels)} levels, {total} lessons, {len(inventory)} inventory items "
      f"covered, {len(urls)} sources, all levels reviewed")
