# ¡Español! — Spanish from zero to C1

A self-contained browser app that teaches Spanish from complete beginner (CEFR A1) to
advanced (C1), in Latin American Spanish with English explanations. It runs entirely on
your own machine: no account, no server, no tracking, and it works offline.

## What's inside

- **A full curriculum** — 162 lessons across five levels (A1 30, A2 32, B1 36, B2 34,
  C1 30), built from the Instituto Cervantes *Plan Curricular* inventories, the CEFR
  descriptors and DELE exam specifications, plus frequency-based vocabulary. The research
  and sources are in `curriculum/research.md`.
- **Dashboard** — the whole course in order, with each lesson's objective, your progress
  per level, and what to do next.
- **Lessons** — explanations, tables, vocabulary and at least ten example sentences each,
  all with English translations. Click any Spanish to hear it spoken (browser
  text-to-speech, preferring a Latin American voice).
- **Practice center** — unlimited drills on any lesson you've reached: multiple choice,
  fill in the blank, translation, sentence building and listening. Instant feedback with
  the correct answer. Practice never changes your progress.
- **Quizzes and level tests** — the quiz for lesson N is cumulative: most questions come
  from lesson N, the rest from earlier lessons, favouring items you got wrong before.
  Passing (80% by default, adjustable in Settings) unlocks the next lesson. Each level ends
  with a cumulative level test.
- **Your data** — started with the launcher, progress is saved automatically to
  `my-progress.json` in the course folder (previous version kept as
  `my-progress.backup.json`), so clearing browser data can't lose it. Settings can also
  export a copy, import one, or reset. Your progress files are never committed to git.

## Using it

Double-click **`Start Spanish.command`** in the course folder. A small Terminal window
opens and the course opens in your browser. Keep that window open while you study; close
it when you're done. Your progress is saved to `my-progress.json` as you go.

(The first time, macOS may ask to confirm opening it — choose Open. Needs Python 3, which
comes with Apple's command-line developer tools.)

You can also just open `app/index.html` directly; it works the same, but progress is then
stored only in that browser.

If your browser's speech voices are limited, install a Spanish voice in your operating
system's speech settings for better audio.

## Project layout

```
Start Spanish.command double-click launcher
app/                  the app: index.html, app.js, styles.css, course-data.js (generated)
content/
  course.json         the outline: levels → lessons (title, objective, items covered) and tests
  lessons/<id>.json   each lesson's explanation, vocabulary, examples and exercises
  README.md           how to write or edit a lesson
curriculum/
  research.md         sources and how the curriculum was derived
  inventory.json      the grammar / function / vocabulary items each level must cover
  reviews/<LEVEL>.md  the accuracy review for each level: what was checked and fixed
scripts/build.py      bundles content/ into app/course-data.js
scripts/serve.py      the launcher's local server: serves the app, saves progress to a file
checks/               the automated checks (see below)
```

## Editing content

Edit `content/course.json` or a file in `content/lessons/`, then rebuild and check:

```
python3 scripts/build.py
bash checks/content.sh
```

`content/README.md` describes the lesson format and the rules the content check enforces:
minimum sizes, valid answer keys, English only in hints, and no exercise that uses Spanish
not yet taught.

## How it was built

The project was built by an AI agent (Claude) working in long unattended runs. To keep it
on task it used a small governance framework, [constraint-base](https://github.com/ctsapugay/constraint-base):

- `constraints/` — rules that had to stay true throughout (local-only, private data,
  no forward references, answerable exercises, checks never weakened, …)
- `goals/` — the outcomes, the goal condition and the measurable criteria (G1–G6), each
  marked met with the evidence that was observed
- `checks/registry.md` — the automated checks that verify the curriculum, every lesson and
  the app itself (`python3 tools/verify.py` runs them all)
- `progress/` — the session log and current-state checkpoint
- `CLAUDE.md` — the agent's entry point; `docs/` explains the framework;
  `tools/` holds its stdlib-only Python tooling (`brief.py`, `validate.py`, `verify.py`, …)

The Spanish was written and reviewed level by level by the agent, not by a native speaker;
each review record in `curriculum/reviews/` lists what was checked and corrected. Where
usage genuinely varies between countries, the lessons say so and the answer keys accept
each correct variant.
