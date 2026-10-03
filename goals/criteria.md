# Criteria

The measurable criteria that make up the finish line. The goal condition
(`goals/goal-condition.md`) points here and requires **every** one of these to be met; it
does not repeat them, because this list can grow long.

A criterion is a **checkable statement about the world** — something a skeptic who was not
in the conversation could verify by running or looking at something. It says what is true
at the end, never how to build it. See `docs/goal-conditions.md`.

**Entry format:**

```
## G1 — Short title
- **criterion:** What must be observably true.
- **check:** The specific thing someone runs, opens, or looks at to confirm it.
- **state:** unmet | met
- **evidence:** Empty until met. Then: what was run and what it showed, with a date.
```

Criteria ids are `G` plus a number, unique here. Keep the wording outcome-shaped; put
concrete commands and paths in `check:` (which is not shape-scanned), not in `criterion:`.
Executable checks that run automatically belong in `checks/registry.md` and can reference
a criterion with `covers:`.

G1–G6 were written for the Spanish course and met on 2026-09-26. G7 onward (added
2026-10-03) cover Polyglotte: language switching, the French course, and use from a
fresh clone.

## G1 — A full curriculum, from zero to C1

- **criterion:** The dashboard shows an ordered curriculum spanning CEFR A1, A2, B1, B2 and C1, in which every lesson states its learning objective and level, and every grammar and communicative-function item that the recorded research lists for each level is covered by at least one lesson.
- **check:** Open the dashboard and confirm all five levels and their lessons appear in order with objectives; run the curriculum check (CHK-001), which fails if any level is missing, any lesson lacks an objective or level, any researched item is uncovered, or the research record lacks sources.
- **state:** met
- **evidence:** 2026-09-26 — `python3 tools/verify.py` (CHK-001): "curriculum ok: 5 levels, 162 lessons, 214 inventory items covered, 12 sources, all levels reviewed". Opened the dashboard in a browser (local server): the five levels A1 · Beginner, A2 · Elementary, B1 · Intermediate, B2 · Upper intermediate, C1 · Advanced appear in order, each lesson row showing its number, title and objective.

## G2 — Every lesson is complete and sound

- **criterion:** Every lesson in the curriculum has an explanation, at least ten example sentences with English translations, its vocabulary with translations, and at least forty exercise items spanning at least three exercise types; no exercise is unanswerable or tests material not yet taught.
- **check:** Run the content check (CHK-002), which fails on any lesson below those minimums, any malformed answer key, or any forward reference; open three lessons at random from different levels and confirm they render fully with working audio.
- **state:** met
- **evidence:** 2026-09-26 — CHK-002: "content ok: 162 lessons complete, answerable and in teaching order". Hand check of three randomly chosen lessons from different levels (a1-03, b1-03, c1-01) in the browser: all sections, tables, examples and vocabulary rendered; clicking Spanish text spoke it with a Spanish (Mexico) voice in each lesson (e.g. "Este es Carlos y esta es Ana." [es-MX], "Ojalá" [es-MX], "Entiendo que no quieras hablar de eso." [es-MX]).

## G3 — Practice drills without consequences

- **criterion:** Clara can practise any lesson she has reached, repeatedly, with immediate feedback on whether each answer was right showing the correct answer, and no practice session changes her recorded progress.
- **check:** The app check (CHK-003) drives a browser through practice sessions with both right and wrong answers and fails if feedback is missing or if progress differs before and after; confirm the same by hand once.
- **state:** met
- **evidence:** 2026-09-26 — CHK-003: "practice shows right/wrong feedback with the correct answer", "practice leaves stored progress unchanged" (24/24 app checks ok). Hand check in the browser on c1-01 practice: a wrong multiple-choice answer showed "✘ Not quite. The answer is: I sense someone is watching me."; a correct listening answer showed "✔ Correct!" with the translation; stored progress was byte-for-byte identical before and after the session.

## G4 — Cumulative quizzes drive progress

- **criterion:** The quiz for lesson N draws questions from lessons 1 through N, with most from lesson N and the rest spread across earlier lessons and favouring items Clara previously got wrong; scoring at or above the passing score (default 80%, changeable by Clara in the app) marks the lesson passed and unlocks the next, scoring below it does not, and the result shows on the dashboard and survives a reload.
- **check:** The app check (CHK-003) takes a late-lesson quiz and fails unless its questions come from multiple earlier lessons as well as the current one; takes quizzes above and below the threshold and fails unless only the passing one advances progress; changes the passing score and confirms it takes effect; reloads and confirms progress persists.
- **state:** met
- **evidence:** 2026-09-26 — CHK-003: "a late quiz includes questions from several earlier lessons", "most of a quiz comes from the current lesson", "items previously missed are favoured", "a quiz below the passing score does not pass the lesson", "passing a quiz passes the lesson, and it persists after reload", "passing unlocks the next lesson", "passing score 50%: a ~65% quiz passes", "passing score 80%: a ~65% quiz fails" — all ok.

## G5 — Each level ends in a cumulative test

- **criterion:** Each of the five levels has a level test, reachable once its lessons are passed, covering material from across that level and earlier ones, whose result is recorded on the dashboard.
- **check:** The app check (CHK-003) reaches and passes a level test and fails unless its questions span the level and the result appears on the dashboard; the curriculum check (CHK-001) fails if any level has no test.
- **state:** met
- **evidence:** 2026-09-26 — CHK-003: "C1 level test unlocks when all its lessons are passed", "C1 test spans the level", "C1 test includes earlier levels", "passing the C1 test is recorded on the dashboard" — all ok; CHK-001 ok (fails if any level lacks a test).

## G6 — Each level has been reviewed for accuracy

- **criterion:** Every level's Spanish has had a review pass for accuracy and naturalness, with what was checked, what was wrong, and what was fixed recorded in the repository.
- **check:** Read the review record for each of the five levels and confirm it names the lessons reviewed and lists concrete findings and fixes; CHK-001 fails if any level has no review record.
- **state:** met
- **evidence:** 2026-09-26 — curriculum/reviews/A1.md, A2.md, B1.md, B2.md, C1.md each name every lesson reviewed and list concrete findings and fixes (e.g. B2: camarero→mesero, dialogue dashes in b2-05; C1: cleft-tense item in c1-12). CHK-001: "all levels reviewed".

## G7 — Polyglotte: switch languages, keep each one's progress

- **criterion:** The app presents itself as Polyglotte and lets the learner choose Spanish or French and switch between them at any time; each language keeps its own passed lessons, quiz and level-test results and missed items, which switching never alters; both languages' progress survives a reload, a restart of the local launcher, and an export followed by an import; and Spanish progress recorded before French existed carries over intact.
- **check:** The app check (CHK-003) records different progress in each language, switches back and forth, reloads, restarts the launcher, exports, clears site data and imports, and fails unless each language shows exactly its own progress every time; it also loads a progress file saved by the Spanish-only version and fails unless that progress appears unchanged under Spanish. Confirm switching by hand once.
- **state:** unmet
- **evidence:**

## G8 — A French curriculum from zero to C1, built from French references

- **criterion:** In French, the dashboard shows an ordered curriculum spanning CEFR A1, A2, B1, B2 and C1, in which every lesson states its learning objective and level; every grammar, communicative-function and pronunciation item that the recorded French research lists for each level is covered by at least one lesson; and every one of those items, and the order they are taught in, is traced in the research record to a named reference for teaching French as a foreign language (official French level inventories, the French exam specifications for each level, or a recognised French teaching programme), not to the Spanish course.
- **check:** Open the French dashboard and confirm all five levels and their lessons appear in order with objectives; run the French curriculum check (CHK-005), which fails if any level is missing, any lesson lacks an objective or level, any researched item is uncovered, any inventory item names no French source, or the research record lacks sources; read the French research record and confirm the sources are French-teaching references.
- **state:** unmet
- **evidence:**

## G9 — Every French lesson is complete and sound

- **criterion:** Every French lesson has an explanation, at least ten example sentences with English translations, its vocabulary with translations and a pronunciation guide, and at least forty exercise items spanning at least three exercise types; no exercise is unanswerable or tests French not yet taught.
- **check:** Run the French content check (CHK-006), which fails on any lesson below those minimums, any vocabulary entry without a pronunciation guide, any malformed answer key, or any forward reference; open three French lessons at random from different levels and confirm they render fully and speak with a French voice.
- **state:** unmet
- **evidence:**

## G10 — French spelling, gender and pronunciation are accurate

- **criterion:** Every French word in the course — explanations, vocabulary, examples, exercises and answer keys — is a correct standard spelling, accents included; every noun's stated gender is correct; every vocabulary pronunciation guide matches standard metropolitan pronunciation; and French audio is always spoken with a French voice, never a Spanish or English one.
- **check:** Run the French accuracy check (CHK-007), which fails on any word not found in the recorded French reference lexicon, any noun gender or pronunciation guide that disagrees with it, or any exception not justified in a level review record; the app check (CHK-003) fails if French text is ever spoken with a non-French voice.
- **state:** unmet
- **evidence:**

## G11 — French practice, quizzes and level tests work like Spanish

- **criterion:** In French, practice, cumulative quizzes and level tests behave exactly as G3, G4 and G5 require for Spanish, and French answers are judged fairly — accents, capitalisation, apostrophes and elision handled consistently.
- **check:** The app check (CHK-003) runs the practice, quiz, passing-score and level-test scenarios in French as well as Spanish and fails if any fails in either language, including typed answers with apostrophes and elision.
- **state:** unmet
- **evidence:**

## G12 — Each French level has been reviewed for accuracy

- **criterion:** Every French level has had a review pass for accuracy and naturalness, with what was checked, what was wrong, and what was fixed recorded in the repository.
- **check:** Read the French review record for each of the five levels and confirm it names the lessons reviewed and lists concrete findings and fixes; CHK-005 fails if any French level has no review record.
- **state:** unmet
- **evidence:**

## G13 — Anyone who clones the repository can use it

- **criterion:** Someone with a fresh clone and only the common prerequisite the README names can start the app by following it, on macOS by double-clicking a launcher and on Windows or Linux with one documented step; their progress is saved to a file on their own computer that git ignores, so it is never committed or shared.
- **check:** The fresh-clone check (CHK-008) clones the repository into a temporary folder, starts the app as the README describes, records progress, and fails unless the progress file is written inside that clone and `git status` there shows nothing to commit; read the README and confirm it gives the steps for macOS, Windows and Linux.
- **state:** unmet
- **evidence:**
