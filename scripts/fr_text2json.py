#!/usr/bin/env python3
"""Write French lessons from a compact text format into content/fr/lessons/<id>.json.

A writing aid: the JSON it produces is the source of truth. Usage:

    python3 scripts/fr_text2json.py path/to/b2-13.txt [more.txt …]

Format (one lesson per file, named <lesson id>.txt):

    ## Heading          a section; body lines follow; lines starting with | form its table
    #V                  vocabulary: French | English | IPA [| m/f]
    #E                  examples: French | English
    #X                  exercises, one per line:
       mc: prompt || right | wrong | wrong [@fr]   (first option is the right one;
                                                     @fr marks French options)
       fill: prompt with ___ || answer | answer || hint
       tr: English prompt || answer | answer
       build: French sentence || English
    Any exercise may end with  !! explanation

"~?" "~!" "~:" "~;" "~»" and "«~" become French no-break spaces.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "fr" / "lessons"


def convert(src: Path) -> str:
    lid = src.stem
    text = src.read_text(encoding="utf-8")
    text = re.sub(r" ?~([?!:;»])", lambda m: " " + m.group(1), text)
    text = text.replace("«~", "« ")
    sections, vocab, examples, exercises = [], [], [], []
    mode, cur = None, None
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            cur = {"heading": line[3:].strip(), "body": [], "table": []}
            sections.append(cur)
            mode = "S"
            continue
        if line.strip() in ("#V", "#E", "#X"):
            mode = line.strip()[1]
            continue
        if mode == "S":
            if line.startswith("|"):
                cur["table"].append([c.strip() for c in line.strip().strip("|").split("|")])
            else:
                cur["body"].append(line)
        elif not line.strip():
            continue
        elif mode == "V":
            vocab.append([p.strip() for p in line.split(" | ")])
        elif mode == "E":
            fr, en = [p.strip() for p in line.split(" | ")]
            examples.append([fr, en])
        elif mode == "X":
            explain = None
            if " !! " in line:
                line, explain = line.split(" !! ", 1)
            kind, rest = line.split(":", 1)
            kind = kind.strip()
            fields = [f.strip() for f in rest.strip().split(" || ")]
            if kind == "mc":
                lang = fields[-1].endswith(" @fr")
                if lang:
                    fields[-1] = fields[-1][:-4]
                item = {"type": "mc", "prompt": fields[0],
                        "options": [o.strip() for o in fields[1].split(" | ")], "answer": 0}
                if lang:
                    item["lang"] = "fr"
            elif kind == "fill":
                item = {"type": "fill", "prompt": fields[0],
                        "answers": [a.strip() for a in fields[1].split(" | ")]}
                if len(fields) > 2:
                    item["hint"] = fields[2]
            elif kind == "tr":
                item = {"type": "translate", "prompt": fields[0],
                        "answers": [a.strip() for a in fields[1].split(" | ")]}
            elif kind == "build":
                item = {"type": "build", "prompt": f'Put the words in order: "{fields[1]}"',
                        "answer": fields[0]}
            else:
                raise SystemExit(f"{lid}: unknown exercise kind {kind!r}")
            if explain:
                item["explain"] = explain
            exercises.append(item)
    out_secs = []
    for s in sections:
        body = re.sub(r"\n{3,}", "\n\n", "\n".join(s["body"]).strip())
        sec = {"heading": s["heading"], "body": body}
        if s["table"]:
            sec["table"] = {"head": s["table"][0], "rows": s["table"][1:]}
        out_secs.append(sec)
    lesson = {"sections": out_secs, "vocab": vocab, "examples": examples, "exercises": exercises}
    (OUT / f"{lid}.json").write_text(json.dumps(lesson, ensure_ascii=False, indent=1) + "\n",
                                     encoding="utf-8")
    return f"{lid}: {len(out_secs)} sections, {len(vocab)} vocab, {len(examples)} examples, {len(exercises)} exercises"


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(convert(Path(arg)))
