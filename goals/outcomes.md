# Outcomes

What this project is for, in terms of what will be true when it exists. Written during
intake on 2026-09-26; amended 2026-10-03 to add French and rename the app Polyglotte. This is the material the goal condition is distilled from — it can be
looser and more human than `goal-condition.md`, but it still describes results, not
construction.

## Problem

Clara wants to learn Spanish, starting from nothing, and get to fluent or near-fluent. She
has no single structured path that teaches the material, lets her drill it, and proves
what she has actually retained — and shows her, at a glance, where she is on the road.

Clara now also wants to learn French in the same app, switching freely between the two
languages without either one's progress affecting the other. The app becomes
**Polyglotte**.

## Who it is for

Clara first, as a learner on her own Mac. Beyond her, anyone who clones the repository
should be able to run it on their own computer and keep their own progress there. English
is the instruction language. There are no accounts, no shared server, and one learner per
copy of the app.

## Outcomes

1. **A local learning app.** Clara opens it in a web browser on her Mac and uses it with no
   internet connection, no account, and no install step beyond what the project tells her
   to run once.
2. **A full curriculum, from zero to near-fluent.** An ordered path from absolute beginner
   through CEFR A1, A2, B1, B2 and C1, grounded in recognised references (the Instituto
   Cervantes *Plan Curricular*, CEFR descriptors, DELE exam expectations, word-frequency
   data), with the sources recorded. It teaches the Spanish most widely spoken — Latin
   American Spanish (ustedes, not vosotros) — and notes where Spain differs.
3. **A dashboard.** Clara sees the whole curriculum and her progress through it: which
   lessons are passed, which is next, and how far through each level and the whole course
   she is.
4. **Lessons.** Every lesson in the curriculum teaches its material — explanation, examples
   with English translations, vocabulary, and audio pronunciation of the Spanish.
5. **A practice center.** Clara can drill any lesson she has reached, as often as she
   likes, with instant feedback. Practice never changes her recorded progress.
6. **A quiz / testing center.** Quizzes are cumulative — the quiz for lesson N draws on
   lessons 1 through N, not just N — so earlier material must stay remembered. Passing a
   quiz is the only thing that advances progress. The passing score defaults to 80% and
   Clara can change it. Each level ends with a cumulative level test.
7. **Progress that lasts.** Progress survives closing the browser and restarting the Mac,
   and Clara can export it to a file and restore it from that file.
8. **Two languages, chosen freely.** The learner picks Spanish or French and can switch at
   any time. Each language has its own progress, kept and restored independently; Clara's
   existing Spanish progress carries over unchanged.
9. **A real French course.** Standard metropolitan French from A1 to C1 (short notes where
   Québec or Belgian usage differs), with its own curriculum taken from recognised
   references for teaching French as a foreign language — the official French level
   inventories, DELF/DALF exam specifications, a recognised French teaching programme, and
   French word-frequency data — not a translation of the Spanish course. Pronunciation is
   taught throughout, and spelling, gender and pronunciation are checked for accuracy.
10. **Usable from a fresh clone.** Anyone who clones the repository can start the app on
    macOS, Windows or Linux by following the README, and their progress stays on their own
    computer and out of git.

## Non-goals

- Grading Clara's spoken Spanish or free-form writing.
- Accounts, logins, sync across devices, or any server-side component.
- A native mobile app, or putting the app online anywhere.
- Content beyond C1 (C2 / mastery level).
- Languages other than Spanish and French; Québec, Belgian or Swiss French beyond short notes.
- Multiple learner profiles in one copy of the app.
- Social features, streak mechanics, gamification, or notifications.
- Polished visual design beyond clean, readable, and easy to use.
- Paid or licensed content copied from textbooks or courses.

## Open questions

- **Content accuracy.** Clara is a beginner and cannot verify Spanish herself. Assumption:
  the agent reviews each level for accuracy and records what it found and fixed; residual
  errors are possible and acceptable, especially at B2/C1.
- **Curriculum review.** Clara may want to look over the curriculum outline before the
  content is written. Assumption: the agent does not wait for her; the outline is written
  first and she can review and redirect it at any time.
