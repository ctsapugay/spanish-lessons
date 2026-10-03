# Goal condition

The goal condition is short and stable on purpose. It gives a plain overview of the
project and defines what "done" means **by reference** — it does not list the criteria or
the checks, because those grow long and live in their own files (`goals/criteria.md` and
`checks/registry.md`). It is the contract the work is judged against, and it is not the
agent's to soften: see `constraints/defaults.md` (C-GOVERNED-CHANGE) and
`docs/governance.md`.

## Status

- **state:** approved
- **approved:** 2026-09-26, by Clara in chat; amended 2026-10-03 (French, Polyglotte), approved by Clara in chat

## Statement

**Polyglotte**, a language-learning app that Clara — or anyone who clones the repository —
runs locally in a browser to learn Spanish, French, or both, from complete beginner to
near-fluent. The learner chooses a language and can switch at any time; each language keeps
its own progress. Each language carries its own full, research-grounded curriculum from
CEFR A1 to C1 — Latin American Spanish, and standard metropolitan French built from
recognised French-as-a-foreign-language references rather than adapted from the Spanish
course — with accurate spelling and pronunciation; a dashboard showing that curriculum and
the learner's progress through it; a lesson for every point in the curriculum; a practice
center for pressure-free drilling; and a cumulative quiz and testing center whose results —
and only whose results — advance progress. When it exists, a learner can open it and work
through either whole course with nothing else.

## What completion requires

This project is carried out **within** the constraint system, not alongside it. Throughout
the run the agent stays bound by every constraint in `constraints/` and works the way
`CLAUDE.md` describes — re-grounding with `tools/brief.py`, recording evidence, surfacing
outcome-changing ambiguity to Clara, and changing nothing governed (a constraint, a
criterion, a check, the goal condition) except through a proposal Clara approved. Reaching
the criteria by ignoring the constraint system, violating a constraint, or bypassing
governance is **not** "done".

The task is complete only when **all** of the following hold, and the work is judged
**only** against these. None may be softened, removed, or reinterpreted except through the
governance process in `docs/governance.md`.

1. **Every criterion in `goals/criteria.md` is `met`, each with recorded evidence.**
   Check their live status with `python3 tools/brief.py --goal` or `python3 tools/status.py`.
2. **`python3 tools/verify.py` is green** — every check in `checks/registry.md` is passing,
   or waived with Clara's countersignature.
3. **Every constraint in `constraints/` held throughout** — none was violated, and any
   waiver is one Clara approved. See what binds with `python3 tools/brief.py`.

This section is standing and identical for every project. `tools/validate.py` enforces it:
marking the goal `met` while any criterion is unmet, the check suite is not green, or a
waiver is unbacked is an error. The finish line is these three files together, not a
description repeated here.

## Out of scope for "done"

- Spanish or French that a native-speaking teacher could still improve, especially in B2/C1
  nuance — as long as every level has had its recorded accuracy review and the French has
  passed its automated spelling and pronunciation checks.
- Audio quality: pronunciation comes from the speech voices available on the learner's
  computer, not recordings. The written pronunciation guidance is what must be accurate.
- Speaking and free-writing practice beyond pointers to outside resources.
- Visual polish beyond clean and usable; browsers other than current Chrome and Safari;
  phone-sized screens. Starting the app on Windows and Linux is documented and provided
  for, but is only verified automatically on macOS.
- Adaptive features beyond cumulative quizzes weighted toward what the learner has got
  wrong (no full spaced-repetition scheduler).
- Languages other than Spanish and French; Québec, Belgian or Swiss French beyond short
  notes; multiple learner profiles on one computer.
