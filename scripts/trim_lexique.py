#!/usr/bin/env python3
"""Make curriculum/fr/lexique/lexique383-trimmed.tsv from the full Lexique 3.83 table.

Lexique 3.83 (New & Pallier, http://www.lexique.org, licence CC BY-SA 4.0) is the reference
the French accuracy check compares every word against. The repository keeps only the columns
the check uses. To regenerate (needs the full table, ~26 MB, from lexique.org):

    python3 scripts/trim_lexique.py path/to/Lexique383.tsv
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "curriculum" / "fr" / "lexique" / "lexique383-trimmed.tsv"
COLUMNS = ["ortho", "phon", "lemme", "cgram", "genre", "nombre", "freqfilms2"]

src = Path(sys.argv[1])
seen = set()
with src.open(encoding="utf-8") as f, OUT.open("w", encoding="utf-8", newline="") as out:
    w = csv.writer(out, delimiter="\t", lineterminator="\n")
    w.writerow(COLUMNS)
    for row in csv.DictReader(f, delimiter="\t"):
        rec = tuple(row[c] for c in COLUMNS)
        if rec in seen:
            continue
        seen.add(rec)
        w.writerow(rec)
print(f"wrote {OUT.relative_to(ROOT)}: {len(seen)} rows")
