#!/usr/bin/env python3
"""CHK-001 — the curriculum is complete, grounded, and reviewed (covers G1, G5, G6).

Fails if:
  - the five levels A1, A2, B1, B2, C1 are not all present, in that order;
  - any lesson lacks an id, title, objective, or at least one covered inventory item;
  - a lesson id is duplicated, or a lesson covers an item that is not in the inventory;
  - any inventory item is not covered by a lesson at or before its own level;
  - the research record cites fewer than five distinct sources (URLs);
  - any level has no level test, or a test with fewer than 20 questions;
  - any level has no accuracy-review record naming every lesson in that level and listing
    concrete findings.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from courselib import (  # noqa: E402
    INVENTORY_FILE, LEVEL_ORDER, RESEARCH_FILE, REVIEWS_DIR, load_course, load_json,
)

errors: list[str] = []
course = load_course()
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

urls = set(re.findall(r"https?://[^\s)>\]]+", RESEARCH_FILE.read_text(encoding="utf-8")))
if len(urls) < 5:
    errors.append(f"curriculum/research.md cites {len(urls)} sources; expected at least 5")

for lv in course["levels"]:
    review = REVIEWS_DIR / f"{lv['id']}.md"
    if not review.exists():
        errors.append(f"{lv['id']}: no accuracy review record ({review.relative_to(REVIEWS_DIR.parents[1])})")
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
    print(f"CURRICULUM CHECK FAILED ({len(errors)} problems, {total} lessons in outline)")
    for e in errors[:60]:
        print("  -", e)
    if len(errors) > 60:
        print(f"  ... and {len(errors) - 60} more")
    sys.exit(1)
print(f"curriculum ok: {len(levels)} levels, {total} lessons, {len(inventory)} inventory items "
      f"covered, {len(urls)} sources, all levels reviewed")
