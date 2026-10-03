# Polyglotte — Spanish and French from zero to C1

A self-contained browser app that teaches **Spanish** and **French** from complete beginner
(CEFR A1) to advanced (C1), with English explanations. Choose a language and switch whenever
you like: each language keeps its own progress. It runs entirely on your own computer: no
account, no server, no tracking, and it works offline.

## What's inside

- **Spanish** — 162 lessons across five levels (A1 30, A2 32, B1 36, B2 34, C1 30), in
  Latin American Spanish, built from the Instituto Cervantes *Plan Curricular* inventories,
  the CEFR descriptors and DELE exam specifications, plus frequency-based vocabulary
  (`curriculum/research.md`).
- **French** — 148 lessons across five levels (A1 30, A2 30, B1 32, B2 30, C1 26), in
  standard French as spoken in France. It has its own curriculum, built from references for
  teaching French as a foreign language — the Eaquals/CIEP *Inventaire linguistique des
  contenus clés des niveaux du CECRL*, the Alliance Française programme, the DELF/DALF exam
  regulations and the CEFR — not a translation of the Spanish course. Pronunciation is taught
  throughout, every word has an IPA pronunciation guide, and spelling, genders and
  pronunciations are checked against the Lexique 3.83 database (`curriculum/fr/research.md`).
- **Dashboard** — the whole course in order, with each lesson's objective, your progress
  per level, and what to do next.
- **Lessons** — explanations, tables, vocabulary and at least ten example sentences each,
  all with English translations. Click any Spanish or French to hear it spoken (your
  computer's text-to-speech; French uses a France voice, Spanish a Latin American one).
- **Practice center** — unlimited drills on any lesson you've reached: multiple choice,
  fill in the blank, translation, sentence building and listening. Instant feedback with
  the correct answer. Practice never changes your progress.
- **Quizzes and level tests** — the quiz for lesson N is cumulative: most questions come
  from lesson N, the rest from earlier lessons, favouring items you got wrong before.
  Passing (80% by default, adjustable in Settings) unlocks the next lesson. Each level ends
  with a cumulative level test.
- **Appearance** — light, dark or match-your-computer mode, and a choice of accent colour
  (pink, purple, blue, teal or orange), in Settings.
- **Your data** — started with a launcher, progress for every language is saved
  automatically to `my-progress.json` in the course folder (previous version kept as
  `my-progress.backup.json`), so clearing browser data can't lose it. Settings can also
  export a copy, import one, or reset a language. Your progress files are never committed to
  git.

## Using it

You need **Python 3** (on a Mac it comes with Apple's command-line developer tools; on
Windows install it from python.org or the Microsoft Store; most Linux systems have it). Clone
or download this folder, then:

- **macOS** — double-click **`Start Polyglotte.command`**. (The first time, macOS may ask
  you to confirm opening it — choose Open.)
- **Windows** — double-click **`Start Polyglotte.bat`**.
- **Linux** — in a terminal in the course folder, run **`./start-polyglotte.sh`**.

A small terminal window opens and the course opens in your browser. Keep that window open
while you study; close it when you're done. Your progress is saved to `my-progress.json`
as you go.

You can also just open `app/index.html` directly; it works the same, but progress is then
stored only in that browser.

If your browser's speech voices are limited, install a Spanish or French voice in your
operating system's speech settings for better audio (on a Mac: System Settings →
Accessibility → Spoken Content → System voice → Manage Voices).

## Project layout

```
Start Polyglotte.command / Start Polyglotte.bat / start-polyglotte.sh   launchers
app/                  the app: index.html, app.js, styles.css, course-data-<lang>.js (generated)
content/              Spanish: course.json (levels → lessons → title, objective, items) and lessons/<id>.json
content/fr/           French: the same
curriculum/           Spanish research.md, inventory.json, reviews/<LEVEL>.md
curriculum/fr/        French research.md, inventory.json, reviews/<LEVEL>.md, lexique/ (Lexique 3.83, CC BY-SA)
scripts/build.py      bundles content/ into app/course-data-<lang>.js
scripts/serve.py      the launchers' local server: serves the app, saves progress to a file
scripts/frlex.py      French spelling / gender / pronunciation lookups (Lexique)
checks/               the automated checks (see below)
```

## Editing content

Edit a course outline or a lesson file, then rebuild and check:

```
python3 scripts/build.py
bash checks/content.sh           # Spanish
bash checks/french-content.sh    # French
bash checks/french-accuracy.sh   # French spelling, genders and pronunciation guides
```

`content/README.md` describes the lesson format and the rules the content checks enforce:
minimum sizes, valid answer keys, English only in hints, and no exercise that uses words
not yet taught.

## Credits

French spelling, gender and pronunciation data: **Lexique 3.83**, B. New & C. Pallier et al.,
<http://www.lexique.org>, licensed CC BY-SA 4.0; the trimmed copy in `curriculum/fr/lexique/`
is under the same licence (see its README).

## How it was built

The project was built by an AI agent (Claude) working in long unattended runs. To keep it
on task it used a small governance framework, [constraint-base](https://github.com/ctsapugay/constraint-base):

- `constraints/` — rules that had to stay true throughout (local-only, private data,
  no forward references, answerable exercises, checks never weakened, Spanish kept intact
  while French was added, openly licensed sources, …)
- `goals/` — the outcomes, the goal condition and the measurable criteria (G1–G13), each
  marked met with the evidence that was observed
- `checks/registry.md` — the automated checks that verify both curricula, every lesson, the
  French spelling and pronunciation, the app itself, and a fresh clone
  (`python3 tools/verify.py` runs them all)
- `progress/` — the session log and current-state checkpoint
- `CLAUDE.md` — the agent's entry point; `docs/` explains the framework;
  `tools/` holds its stdlib-only Python tooling (`brief.py`, `validate.py`, `verify.py`, …)

The Spanish and French were written and reviewed level by level by the agent, not by a
native speaker; each review record in `curriculum/reviews/` and `curriculum/fr/reviews/`
lists what was checked and corrected. Where usage genuinely varies between countries, the
lessons say so and the answer keys accept each correct variant.
