#!/usr/bin/env python3
"""Build app/course-data-<lang>.js for every language. Run after editing any lesson.

    python3 scripts/build.py                 # write every language's course data
    python3 scripts/build.py --check         # exit 1 if any course data file is out of date
    python3 scripts/build.py --lang fr ...   # just one language
"""
import sys
from courselib import LANGS, build_course, lang_from_argv, render_data_js

args = sys.argv[1:]
langs = [lang_from_argv(args)[0]] if any(a.startswith("--lang") for a in args) else list(LANGS.values())
stale = False
for lang in langs:
    if not lang.course_file.exists():
        continue
    text = render_data_js(build_course(lang), lang)
    out = lang.out_file
    if "--check" in args:
        current = out.read_text(encoding="utf-8") if out.exists() else ""
        if current != text:
            print(f"{out.relative_to(out.parents[1])} is out of date -- run python3 scripts/build.py")
            stale = True
        else:
            print(f"{out.relative_to(out.parents[1])} is up to date")
    else:
        out.write_text(text, encoding="utf-8")
        print(f"wrote {out.relative_to(out.parents[1])} ({len(text)//1024} KB)")
sys.exit(1 if stale else 0)
