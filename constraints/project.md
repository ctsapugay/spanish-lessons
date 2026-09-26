# Project constraints

Constraints specific to this project. Written during intake, edited by hand whenever.
Defaults live in `defaults.md` and are inherited automatically — do not copy them here.

Before adding an entry, read `docs/outcome-vs-implementation.md`. A constraint says what
must remain true. It does not say how to build anything.

Use the same entry format as `defaults.md`:

```
## ID — Short title
- **source:** project
- **status:** active | waived
- **rule:** One sentence. What must remain true.
- **check:** How anyone can tell, from the outside, whether the rule held.
- **why:** Optional. Required when the rule names a specific technology.
```

IDs are `C-` plus a short slug, unique across both constraint files.

## C-PRIVATE — Clara's learning data stays with her

- **source:** project
- **status:** active
- **rule:** Using the app sends nothing off Clara's machine: it needs no network connection once set up, contacts no outside host, and has no accounts, analytics, or tracking.
- **check:** Loading and using the app with outside network access blocked produces no failed or attempted requests to any host other than the local one, and every feature still works.

## C-PROGRESS-SAFE — Progress is never silently lost

- **source:** project
- **status:** active
- **rule:** Clara's recorded progress and settings survive closing the browser and restarting the machine, survive the app being updated to a newer version of the course, and can be exported to a file and restored from it.
- **check:** Pass a quiz, reload the app, and confirm the progress is still shown; export it, clear the browser's site data, import the file, and confirm the progress returns intact; do the same across a change to the course content.

## C-NO-FORWARD-REFERENCES — Nothing is tested before it is taught

- **source:** project
- **status:** active
- **rule:** A lesson, practice set, or quiz never requires vocabulary or grammar that has not yet been taught at or before that point in the curriculum.
- **check:** The automated content check reports, for every lesson, no exercise answer that depends on vocabulary introduced only in a later lesson.

## C-ANSWERABLE — Every question is fair

- **source:** project
- **status:** active
- **rule:** Every exercise has at least one correct answer that the app accepts, accepts all standard correct variants a learner could reasonably give (accents, capitalisation, and punctuation handled consistently), and never marks a correct answer wrong because of a malformed key.
- **check:** The automated content check finds no exercise with a missing, empty, duplicated, or self-contradictory answer key, and no multiple-choice item whose correct answer is absent from its options.

## C-CHECKS-NOT-WEAKENED — The checks keep their teeth

- **source:** project
- **status:** active
- **rule:** The scripts behind the registered checks are never loosened to make them pass — no assertion removed, threshold lowered, or case skipped — without Clara's sign-off; they may only be made stricter or fixed where they are genuinely wrong, and such a fix is recorded with its reason.
- **check:** `git log -p` over the check scripts shows no removed or relaxed assertion without a matching entry in `progress/log.md` quoting Clara's approval or explaining a genuine bug in the check.
