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

## G1 — A full curriculum, from zero to C1

- **criterion:** The dashboard shows an ordered curriculum spanning CEFR A1, A2, B1, B2 and C1, in which every lesson states its learning objective and level, and every grammar and communicative-function item that the recorded research lists for each level is covered by at least one lesson.
- **check:** Open the dashboard and confirm all five levels and their lessons appear in order with objectives; run the curriculum check (CHK-001), which fails if any level is missing, any lesson lacks an objective or level, any researched item is uncovered, or the research record lacks sources.
- **state:** unmet
- **evidence:**

## G2 — Every lesson is complete and sound

- **criterion:** Every lesson in the curriculum has an explanation, at least ten example sentences with English translations, its vocabulary with translations, and at least forty exercise items spanning at least three exercise types; no exercise is unanswerable or tests material not yet taught.
- **check:** Run the content check (CHK-002), which fails on any lesson below those minimums, any malformed answer key, or any forward reference; open three lessons at random from different levels and confirm they render fully with working audio.
- **state:** unmet
- **evidence:**

## G3 — Practice drills without consequences

- **criterion:** Clara can practise any lesson she has reached, repeatedly, with immediate feedback on whether each answer was right showing the correct answer, and no practice session changes her recorded progress.
- **check:** The app check (CHK-003) drives a browser through practice sessions with both right and wrong answers and fails if feedback is missing or if progress differs before and after; confirm the same by hand once.
- **state:** unmet
- **evidence:**

## G4 — Cumulative quizzes drive progress

- **criterion:** The quiz for lesson N draws questions from lessons 1 through N, with most from lesson N and the rest spread across earlier lessons and favouring items Clara previously got wrong; scoring at or above the passing score (default 80%, changeable by Clara in the app) marks the lesson passed and unlocks the next, scoring below it does not, and the result shows on the dashboard and survives a reload.
- **check:** The app check (CHK-003) takes a late-lesson quiz and fails unless its questions come from multiple earlier lessons as well as the current one; takes quizzes above and below the threshold and fails unless only the passing one advances progress; changes the passing score and confirms it takes effect; reloads and confirms progress persists.
- **state:** unmet
- **evidence:**

## G5 — Each level ends in a cumulative test

- **criterion:** Each of the five levels has a level test, reachable once its lessons are passed, covering material from across that level and earlier ones, whose result is recorded on the dashboard.
- **check:** The app check (CHK-003) reaches and passes a level test and fails unless its questions span the level and the result appears on the dashboard; the curriculum check (CHK-001) fails if any level has no test.
- **state:** unmet
- **evidence:**

## G6 — Each level has been reviewed for accuracy

- **criterion:** Every level's Spanish has had a review pass for accuracy and naturalness, with what was checked, what was wrong, and what was fixed recorded in the repository.
- **check:** Read the review record for each of the five levels and confirm it names the lessons reviewed and lists concrete findings and fixes; CHK-001 fails if any level has no review record.
- **state:** unmet
- **evidence:**
