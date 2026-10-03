# Writing lessons

There is one course per language: Spanish in `content/` (`course.json`, `lessons/`) and
French in `content/fr/` (same layout). Everything below applies to both, plus the French
additions at the end.

`course.json` is the outline (levels → lessons → title, objective, inventory items covered,
and each level's test). Each lesson's content is `lessons/<id>.json`. After editing, run
`python3 scripts/build.py` to regenerate `app/course-data.js`, then
`bash checks/content.sh` (or `python3 checks/scripts/check_content.py <id>` for one lesson).

## Lesson file

```json
{
  "sections": [
    {"heading": "…", "body": "English explanation. Spanish is written in *italics*.",
     "table": {"head": ["…"], "rows": [["…"]]}}
  ],
  "vocab":    [["el libro", "the book"], …],        // >= 8; "a / b" gives alternatives
  "examples": [["Spanish sentence.", "English."], …], // >= 10; also become listening drills
  "exercises": [ … ]                                  // >= 20 authored, >= 3 types
}
```

Exercise types:

| type | fields | notes |
|---|---|---|
| `mc` | `prompt`, `options`, `answer` (index), optional `lang: "es"` | set `lang: "es"` when the options are Spanish |
| `fill` | `prompt` with `___`, `answers` (list), optional `hint` | anything in the prompt, including `(hablar)` hints, must be Spanish; put English in `hint` |
| `translate` | `prompt` (English), `answers` (every acceptable Spanish version) | keep sentences short and controlled; list all natural variants (with/without subject pronoun, etc.) |
| `build` | `prompt`, `answer` (Spanish sentence; words become tiles) | unambiguous word order only |

Any item may have `explain` (shown after answering). The build adds generated drills: two
per vocabulary entry (meaning, and writing it in Spanish) and one listening item per example.

## Rules the content check enforces

- Every Spanish word an exercise requires must already be taught — in the vocab, examples,
  tables, or *italic* Spanish of this lesson or an earlier one. Proper nouns and numbers are
  exempt. If the check flags a word, teach it (add it to vocab or an example) rather than
  working around it.
- Answer keys: no duplicates, multiple-choice answer present in its options, fill-ins have a
  blank, no two items with the same prompt.

## House style

- Latin American Spanish: *ustedes* only in exercises; Spain differences as notes.
- Explanations in plain English, short paragraphs, one idea per section; tables for paradigms.
- Examples are natural, useful sentences, not linguistics-textbook oddities.
- Translations: accept every reasonable answer a learner at that point could give.

## French additions

- **Vocabulary entries** are `[French, English, IPA]`, or `[French, English, IPA, gender]`:

  ```json
  ["la maison", "the house", "la mɛ.zɔ̃"],
  ["l'arbre", "the tree", "laʁbʁ", "m"],
  ["les enfants", "the children", "le.z‿ɑ̃.fɑ̃"]
  ```

  The IPA is checked against Lexique 3.83 (`python3 scripts/frlex.py ipa "les enfants"` shows
  what it expects). Mark liaison with ‿; syllable dots are optional. When the article doesn't
  show a noun's gender (*l'*, *les*, *des*), give it as the fourth field.
- `mc` items whose options are French use `"lang": "fr"`.
- Standard metropolitan French in exercises; Québec, Belgian or Swiss usage only as notes.
- `bash checks/french-accuracy.sh` checks every French word's spelling, nouns' genders and
  the IPA guides. A word Lexique lacks (or a name) must be justified in the level review's
  `## Lexicon notes` section — see `checks/scripts/check_french_accuracy.py`.
