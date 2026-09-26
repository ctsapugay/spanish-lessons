# Goal condition

The goal condition is short and stable on purpose. It gives a plain overview of the
project and defines what "done" means **by reference** — it does not list the criteria or
the checks, because those grow long and live in their own files (`goals/criteria.md` and
`checks/registry.md`). It is the contract the work is judged against, and it is not the
agent's to soften: see `constraints/defaults.md` (C-GOVERNED-CHANGE) and
`docs/governance.md`.

## Status

- **state:** draft
- **approved:** _not yet approved by Clara_

## Statement

A Spanish-learning app that Clara runs locally in her browser and uses to go from complete
beginner to near-fluent. It carries a full, research-grounded curriculum from CEFR A1 to C1
in Latin American Spanish; a dashboard showing that curriculum and her progress through it;
a lesson for every point in the curriculum; a practice center for pressure-free drilling;
and a cumulative quiz and testing center whose results — and only whose results — advance
her progress. When it exists, Clara can open it and work through the whole course with
nothing else.

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

- Spanish that a native-speaking teacher could still improve, especially in B2/C1 nuance —
  as long as every level has had its recorded accuracy review.
- Audio quality: pronunciation comes from the voices available on Clara's Mac, not
  recordings.
- Speaking and free-writing practice beyond pointers to outside resources.
- Visual polish beyond clean and usable; browsers other than current Chrome and Safari on
  macOS; phone-sized screens.
- Adaptive features beyond cumulative quizzes weighted toward what Clara has got wrong
  (no full spaced-repetition scheduler).
