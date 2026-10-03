# Progress log

Append-only. Newest entries at the bottom. One entry per working session, plus an entry
any time a default constraint is exercised (an approval given, an assumption made, an
irreversible action taken).

This file exists so a session with no memory can resume the work. Write it for that
reader: state, not narrative.

**Entry format:**

```
## YYYY-MM-DD — short title

- **state:** where the project actually is right now
- **done:** what became true this session
- **next:** what the next session should pick up
- **decisions:** choices made and why, including assumptions made without asking
- **approvals:** anything Clara explicitly approved this session, quoted
- **proposals:** any proposal raised this session, and its status
- **dead ends:** what was tried and abandoned, so it is not retried
```

---

## 2026-09-26 — Repository created from constraint-base; intake

- **state:** Fresh clone of github.com/ctsapugay/constraint-base (template history removed, new git repo). Intake drafted: outcomes, 5 project constraints, goal condition, 6 criteria, 4 registered checks. Goal condition is a draft awaiting Clara's approval. No app code yet.
- **done:** Intake written from the 2026-09-26 conversation. Repo git email set to ctsapugay@gmail.com so approvals match `governance/approvers.txt`. Slash commands copied into `.claude/commands/`.
- **next:** Clara approves the goal condition in chat → record baseline with `approve.py --baseline --on-behalf-of-clara`. Then goal mode.
- **decisions:** Latin American Spanish ("the more commonly used one", per Clara). Passing score 80% by default, changeable in the app (Clara). Scope ends at C1. Checks registered up front behind stable entry points so goal mode need not stop to get each new check approved.
- **approvals:** Clara, on the approval process: "I don't want that anymore. Just assume, like you can show things to me and ask me for my approval and I'll just grant you that verbatim. I don't need that manual approval process. I don't want to have to run commands to do that." → CLAUDE.md, C-GOVERNED-CHANGE, docs/intake.md and README now say approval is given in chat and recorded by the agent with --on-behalf-of-clara. Clara: "make a new GitHub repo that we will be pushing to as we work on this." → C-LOCAL now carries a standing exception for pushing to private repo ctsapugay/spanish-lessons.
- **proposals:** none.
- **dead ends:** none.

## 2026-09-26 — Signed approvals turned off (Clara's instruction)

- **state:** Pre-baseline. The template shipped with Clara's SSH key in `governance/allowed_signers`, which forces signed approval commits; that blocked recording her chat approval.
- **done:** Removed `governance/allowed_signers` in a forward commit (history not rewritten — a rewrite + force-push was declined by the permission system). Added governed `governance/signing-disabled.txt` recording why; `validate.py` now treats a signer file that disappeared as a deliberate downgrade (a note) only when that record exists, and as tampering otherwise. The record is in the trust digest, so removing it later shows as drift.
- **approvals:** Clara: "if putting this project in unsigned mode means you are freely able to allow this approval when I just say it verbatim and don't need all these, I don't know, extra steps, then do that."

## 2026-09-26 — Delegated approval (agent-executed)

- APPROVED: BASELINE
- Clara's stated authority, verbatim: "I approve the goal condition. Go ahead and seed yourself with it and start working towards this in goal mode."
- Attribution mode makes this an audit record, not proof the authority was real. Enable signing (docs/governance.md) for approval the agent cannot forge.

## 2026-09-26 — Goal mode: research, outline, app, checks

- **state:** Governance engaged (baseline 1dd20d5). Curriculum outline: 162 lessons (A1 30, A2 32, B1 36, B2 34, C1 30) in `content/course.json`, 214 inventory items in `curriculum/inventory.json`, sources in `curriculum/research.md`. App in `app/` (open `app/index.html`), built from `content/` by `scripts/build.py`. Lesson a1-01 written.
- **done:** CHK-001 (`checks/curriculum.sh`) fails only on missing level reviews. CHK-002 (`checks/content.sh`) passes for a1-01 (fails for unwritten lessons). CHK-003 (`checks/app.sh`, Playwright driving installed Chrome) passes 17/19; the two failures need more content (cumulative quiz needs 4+ lessons; level test needs a complete level).
- **next:** Write a1-02 … a1-30, then the A1 review record, then A2 onwards.
- **decisions:** Content authored as JSON, bundled into `app/course-data.js` so the app works from file:// with no server. Generated drills per lesson: 2 per vocab word + 1 listening per example. Quiz = 60% current lesson + earlier lessons visited round-robin, weighted toward past misses; level test = 70% this level + 30% earlier. Accents: a missing accent is accepted with a note. "I was right" override on typed answers records the item in Settings → Flagged answers. Playwright installed in node_modules (project-local); the test uses installed Chrome, so no browser download outside the project. Preview server port 8777 (8765 was taken).
- **dead ends:** Check bug fixed before first commit: duplicate-option check normalised away punctuation, treating "¿" and "?" as duplicates.

## 2026-09-26 — Check tightened (C-CHECKS-NOT-WEAKENED record)

- **decisions:** CHK-002 made stricter: table cells now teach only their *italic* Spanish (before, English header words like "this" counted as taught Spanish, a loophole). Duplicate-prompt errors now name the prompt. All existing lessons still pass.

## 2026-09-26 — A1 finished and reviewed

- **state:** A1 (a1-01…a1-30) written; CHK-002 passes for all 30; CHK-003 green (24/24) now that a full level exists; A1 review recorded (curriculum/reviews/A1.md). CHK-001 fails only for A2–C1 reviews; CHK-002 fails only for unwritten lessons.
- **done:** A1 review found and fixed 9 issues (markup, punctuation, an unfair distractor, unnatural examples, missing regional notes). App: re-reads progress on every navigation (keeps tabs in sync, fixed test harness), strips dialogue dashes when grading, renderer strips tags from speakable text.
- **decisions:** CHK-002 answer semantics clarified (C-CHECKS-NOT-WEAKENED record): fill-in prompts, word-builder answers and Spanish MC answers must be fully taught; for fill-in/translation answer *lists*, at least one accepted answer must be fully taught — extra accepted variants (e.g. *acá*, *hable*) may go beyond, because accepting a variant never requires it. Reason: the check was flagging correct extra variants, which would force removing them and make grading stricter than fair (C-ANSWERABLE). CHK-003 weak-item test uses misses=1000 (was 50) so it isn't a ~1-in-6 coin flip; same property tested.
- **next:** A2.

## 2026-09-26 — A2 finished and reviewed

- **state:** A1 + A2 (62 lessons) written; CHK-002 passes for all 62; CHK-003 green (25/25, now including an A2 level test that pulls from A1). A2 review recorded (curriculum/reviews/A2.md, 9 findings fixed).
- **next:** B1 (36 lessons), then its review.

## 2026-09-26 — B1 finished and reviewed

- **state:** A1–B1 (98 lessons) written; CHK-002 passes for all 98; CHK-003 green (25/25). B1 review recorded (curriculum/reviews/B1.md, 10 findings fixed — notably regional: *coger* avoided, *estar por* for "about to").
- **next:** B2 (34 lessons), B2 review, C1 (30), C1 review, final verification and criteria evidence.

## 2026-09-26 — Check tightened again (C-CHECKS-NOT-WEAKENED record)

- **decisions:** CHK-002 made stricter: **bold** text in explanations is English emphasis and no longer counts as taught Spanish (previously English words like "hypothetical" inside bold slipped through as "known"). Only *italic* spans teach. Fallout: one nested-bold span in b1-02 rewritten; all 103 lessons pass.

## 2026-09-26 — B2 finished and reviewed
- Wrote b2-16 … b2-34 (nominalisation through regional variation); CHK-002 green for all 34 B2 lessons.
- B2 accuracy review done: curriculum/reviews/B2.md (Spain-isms camarero/guapa/"lo pasamos"/"está negro" replaced, dialogue dashes in b2-05, an answer key widened in b2-13, a give-away prompt in b2-29, a duplicate table entry and the queísmo label in b2-19).
- No check was changed. Next: C1 lessons c1-01 … c1-30, then C1 review, then final verification.

## 2026-09-26 — C1 finished; finish line reached
- Wrote c1-01 … c1-30; CHK-002 green for all 162 lessons ("content ok: 162 lessons complete, answerable and in teaching order").
- C1 accuracy review: curriculum/reviews/C1.md (cleft-tense item in c1-12, dialogue dashes in c1-29, participle note in c1-08, unsuitable slang removed from c1-15, a non-working pun removed from c1-28, prompt/option fixes).
- `python3 tools/verify.py`: GREEN, 4/4 (CHK-001 "5 levels, 162 lessons, 214 inventory items covered, 12 sources, all levels reviewed"; CHK-002 as above; CHK-003 "app ok: 24 checks passed"; CHK-004 "Ran 33 tests … OK").
- Hand checks in the browser pane (local server, test progress seeded in the pane then cleared): dashboard shows all five levels in order; a1-03, b1-03, c1-01 (random, different levels) render fully and speak Spanish with an es-MX voice; practice on c1-01 gave wrong-answer feedback with the correct answer and "Correct!" with translation, and stored progress was identical before/after.
- goals/criteria.md: G1–G6 marked met with this evidence. No check or constraint was changed. Stopping at the finish line.

## 2026-09-26 — Delegated approval (agent-executed)

- APPROVED: BASELINE
- Clara's stated authority, verbatim: "Ok I made the repo public so from now on do not push without my explicit go ahead."
- Attribution mode makes this an audit record, not proof the authority was real. Enable signing (docs/governance.md) for approval the agent cannot forge.

## 2026-09-26 — Push approved by Clara
- Clara said "push it"; pushed c381533..f72a581 (C-LOCAL change recording + README rewrite) to ctsapugay/spanish-lessons.

## 2026-09-27 — README trimmed; push approved by Clara
- Removed the Checks section from README.md (kept "How it was built"; its registry line now says what the checks do). Clara said "then push".

## 2026-09-27 — Launcher: progress saved to a file
- Clara: "yes, build the launcher" (after being told it would add a test and change how progress is stored).
- Added `Start Spanish.command` (double-click) → `scripts/serve.py`: serves app/ on 127.0.0.1 only, saves progress to my-progress.json (atomic write, previous version kept as my-progress.backup.json), refuses other hosts/origins. Both files gitignored so personal progress is never pushed.
- app.js: when served by the launcher, the file is the source of truth on startup and every save also goes to the file; opening index.html directly still uses browser storage only. Settings says which mode is active; a banner appears if a file save fails.
- CHK-003 strengthened (not weakened): +5 scenarios run the real launcher — progress saved to file, survives a brand-new browser profile, backup kept, foreign-origin write refused. `bash checks/app.sh`: "app ok: 29 checks passed". No baseline drift (registry entry unchanged). README "Using it" updated.
- Committed locally only; not pushed (repo is public — push needs Clara's go-ahead).

## 2026-09-27 — Push approved by Clara
- Clara said "push it"; pushed the launcher commit and this log entry to ctsapugay/spanish-lessons.

## 2026-09-27 — Practice fixes from Clara's feedback
- Clara reported: Enter skipped the result on typed answers; no way to go back to see a previous result; "Practise again" did nothing.
- Causes/fixes (app/app.js): Enter checked the answer and the same key press then clicked the newly focused Continue button → Enter now only checks (preventDefault); a second Enter continues. Sessions (practice, quizzes, tests) now have "← Previous" / "Next →" / "Back to current question" to review answered questions read-only (answers can't be changed; scores unaffected). "Practise again" / "Try again" linked to the page already open, so no hashchange fired → a link to the current page now restarts it.
- CHK-003 strengthened: +6 scenarios (Enter shows result, Enter advances, Previous shows earlier result, return to current, Practise again, Try again). Confirmed they FAIL on the previous app code (5 failing) and pass on the new: "app ok: 35 checks passed". Registry entry unchanged; no baseline drift.
- Committed locally only; not pushed.

## 2026-09-27 — Appearance: light/dark mode and accent colour
- Clara: doesn't like the orange; wants a choosable accent colour including pink, and both light and dark mode.
- Settings → Appearance: theme (Match my computer / Light / Dark) and accent (Pink default, Purple, Blue, Teal, Orange), applied instantly and saved with progress (so also in my-progress.json). Each accent has a darker shade for light mode and a lighter one for dark mode. No green/red accents, to keep right/wrong feedback distinct.
- CHK-003 strengthened: +4 scenarios (pink offered, both modes work, every accent×mode has contrast ≥ 4.5 for text and button labels, choices survive reload). Also made the review-navigation scenario independent of question shuffle order (it was skipping its check when a typed question came second). "app ok: 39 checks passed" three runs in a row. README mentions Appearance.
- Committed locally only; not pushed.

## 2026-09-27 — Push approved by Clara
- Clara said "push it"; pushed the practice fixes, the appearance settings and this log entry to ctsapugay/spanish-lessons.

## 2026-10-03 — Delegated approval (agent-executed)

- APPROVED: BASELINE
- Clara's stated authority, verbatim: "I approve, go ahead and write yourself a goal condition and seed yourself in goal mode to build it"
- Attribution mode makes this an audit record, not proof the authority was real. Enable signing (docs/governance.md) for approval the agent cannot forge.

## 2026-10-03 — Scope extended: Polyglotte (Spanish + French)
- Clara asked to add French (standard metropolitan, A1–C1, from a French curriculum, not a translation of the Spanish one), with switching between languages and separate saved progress, usable by anyone who clones the repo. Name chosen by Clara: Polyglotte.
- Drafted and shown to Clara in chat: outcomes 8–10; goal statement; G7–G13; C-PRIVATE/C-PROGRESS-SAFE/C-NO-FORWARD-REFERENCES/C-ANSWERABLE generalised; new C-SPANISH-INTACT and C-OPEN-SOURCES; CHK-003 extended, CHK-005..008 registered. Clara approved ("I approve, go ahead and write yourself a goal condition and seed yourself in goal mode to build it"); recorded as APPROVED: BASELINE (agent-executed).
- Assumptions (reversible): one learner per copy (profiles out of scope); appearance and passing score are shared across languages; Windows/Linux launchers documented but only macOS verified automatically.

## 2026-10-03 — French research, tooling, multi-language app
- Research (curriculum/fr/research.md): backbone is the Eaquals/CIEP *Inventaire linguistique des contenus clés des niveaux du CECRL* (2015; a consensus of Beacco's référentiels + the Alliance française Référentiel), plus the Alliance Française Paris A1 programme (order + phonetics), the DELF/DALF regulations (BO 2005), CEFR + Companion Volume (phonological control), Lexique 3.83. Inventory 233 items; outline 148 lessons (A1 30, A2 30, B1 32, B2 30, C1 26).
- Downloaded Lexique 3.83 (Lexique383.tsv, 25.9 MB, lexique.org) with Clara's go-ahead in chat (AskUserQuestion: "Yes, download and commit"); committed a trimmed copy (5.7 MB, CC BY-SA 4.0, credited in curriculum/fr/lexique/README.md and README.md).
- Checks: check_curriculum.py / check_content.py take --lang fr (Spanish behaviour unchanged; Spanish data rebuilt byte-identical); new check_french_accuracy.py (spelling, gender, IPA vs Lexique; exceptions only via "Lexicon notes" in reviews), check_fresh_clone.py. Fixed my own new French curriculum check reading only the first line of multi-line source entries (bug in a check written this session, not a loosening).
- App: Polyglotte name; language chooser + header switch; progress format 2 (settings shared, one record per language), format 1 read as Spanish unchanged; French only spoken with a French voice; IPA shown; launchers for macOS/Windows/Linux (Start Spanish.command renamed Start Polyglotte.command — Clara: double-click the new name).
- CHK-003 rewritten per language: all 29 Spanish scenarios kept ([es] prefix), all pass ("app ok: 30 checks passed" with --lang es, twice). Test-plumbing fixes (not loosening): wait for rows to be attached rather than visible (collapsed level sections), wait for the rendered view's language (same lesson ids in both languages).
- CHK-008: "fresh clone ok". CHK-005/006/007 and French CHK-003 scenarios fail until French content exists — correct.
- Assumption (reversible): the localStorage key stays "spanish-lessons.progress" so existing browser progress is kept.

## 2026-10-03 — Fix: multiple-choice answers were always the first option
- Found while preparing French content: all 961 authored Spanish multiple-choice items have the correct answer at index 0, and the app showed options in authored order — so the right answer was always the first button (generated vocab items were already shuffled at build time).
- Fix (app/app.js renderQuestion): options shown in a fresh random order each time; data-option keeps the original index. No Spanish content changed (C-SPANISH-INTACT).
- CHK-003 strengthened: "the right multiple-choice answer is not always in the same position" (authored items). Confirmed it FAILS on the previous app code (positions 0,0,0,0,0,0,0,0,0,0) and passes with the fix; "app ok: 31 checks passed" (--lang es). To mention to Clara.

## 2026-10-03 — French A1 written and reviewed
- 30 lessons (content/fr/lessons/a1-01 … a1-30), written in a scratch text format and converted to the canonical JSON. `check_content.py --lang fr`: "French content ok: 30 lessons complete, answerable and in teaching order"; `check_french_accuracy.py`: "30 lessons, 10839 words spelled as in the lexicon, 498 vocabulary genders and pronunciation guides match, 37 lexicon notes".
- Accuracy-check refinements during A1 (each a bug or scope fix in a check written this session, none a loosening of an approved check): schwa may be said (ə/ø/œ) or dropped where Lexique has one; gender fallback only from the same word's singular/plural (it wrongly borrowed *professeure*'s f for *professeur*); notes cover elided names (d'Ottawa); a vocab entry that is itself one lexicon word (d'abord, d'accord) isn't parsed as article + noun; wrong multiple-choice options are spell-checked but exempt from the gender-bigram rule (they may be ungrammatical on purpose).
- App: word-order tiles split on ordinary spaces only, so French "va ?" (no-break space) stays one tile (Spanish has no no-break spaces: no change).
- Review: curriculum/fr/reviews/A1.md — 12 findings with fixes (e.g. outdated metro terminus, *midi et demi*, *bel*, invented misspellings used as distractors) and 37 justified lexicon notes.

## 2026-10-03 — CHK-003 with French: fixes to my own new scenarios
- With French A1 present, all [fr] per-language scenarios pass ("app ok: 32 checks passed", --lang fr). Whole-app scenarios hung: my new voice/typing scenarios tried an MC click on every question and waited out a 30 s timeout on typed ones → added answerAnyhow (looks at the question type first). Also waited for the app to finish loading after a reload in the language-switching scenario. Now "app ok: 26 checks passed" (--whole), ~40 s. Test-plumbing fixes only; no assertion removed.
- Added `--whole` (only whole-app scenarios) and APP_TEST_TIMING for diagnosis.

## 2026-10-03 — French A2 written and reviewed
- 30 lessons a2-01 … a2-30. "French content ok: 30 lessons"; accuracy "30 lessons, 12770 words … 440 vocabulary genders and pronunciation guides match, 58 lexicon notes".
- Checker refinements (my own new check, bug/scope fixes): lexicon notes add a pronunciation rather than replace Lexique's; a schwa shown in a guide may be absent from Lexique (quelque /kɛl.kə/); liaison may link the parts of a hyphenated word (allons-y). Verified each still rejects real errors (deux /d/, invented consonants).
- Review curriculum/fr/reviews/A2.md: 12 findings with fixes (wrong liaison rule for quand, ambiguous PC/imparfait items, a wrong answer key, invented distractors…).

## 2026-10-03 — French B1 written and reviewed
- 32 lessons b1-01 … b1-32; all 92 French lessons: content ok; accuracy "92 lessons, 37467 words … 1370 vocabulary genders and pronunciation guides match, 74 lexicon notes".
- Found that bold inside italic French hid words from the checks (112 places across A1–B1) → removed; this exposed a lookup gap (hyphen + elision, Donne-m'en) → fixed in frlex.py (check made able to see more, not less).
- Review curriculum/fr/reviews/B1.md: 13 findings with fixes. Spanish content check still "162 lessons" ok.

## 2026-10-03 — Session paused (usage limit)
- B2 lessons b2-01…b2-12 written; each batch passed check_content --lang fr and check_french_accuracy before commit. Remaining: b2-13…b2-30, B2 review, C1 (26 lessons + review), final verify and criteria evidence. Not pushed.
