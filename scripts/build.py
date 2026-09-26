#!/usr/bin/env python3
"""Build app/course-data.js from content/. Run after editing any lesson.

    python3 scripts/build.py          # write app/course-data.js
    python3 scripts/build.py --check  # exit 1 if app/course-data.js is out of date
"""
import sys
from courselib import OUT_FILE, build_course, render_data_js

text = render_data_js(build_course())
if "--check" in sys.argv:
    current = OUT_FILE.read_text(encoding="utf-8") if OUT_FILE.exists() else ""
    if current != text:
        print("app/course-data.js is out of date -- run python3 scripts/build.py")
        sys.exit(1)
    print("app/course-data.js is up to date")
else:
    OUT_FILE.write_text(text, encoding="utf-8")
    print(f"wrote {OUT_FILE.relative_to(OUT_FILE.parents[1])} ({len(text)//1024} KB)")
