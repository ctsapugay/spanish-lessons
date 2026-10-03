# Checkpoint

The current-state card: where the work is **right now**. Overwrite this whole file in
place at each break and before your context grows large. It is not history — that is
`progress/log.md` — it is a snapshot a cold session reads to reorient fast. Keep it short.

If the session starts drifting, repeating itself, or losing the thread (context rot),
refresh this card and recommend a fresh session: a new one can resume from the repo alone
(constraint C-RESUMABLE), and this card is what makes that cheap.

Everything the tools read is **below the divider**. Overwrite it; leave this header.

---

<!-- Overwrite everything below at each break. Keep it to a handful of lines. -->

**Updated:** 2026-10-03
**Now:** Polyglotte app + French tooling done and committed (CHK-001/002/004/008 green; Spanish CHK-003 scenarios green). French outline (content/fr/course.json, 148 lessons) and inventory exist; NO French lessons written yet.
**Next:** Write French A1 lessons fr a1-01 … a1-30 (content/fr/lessons/<id>.json), each: `python3 scripts/build.py && python3 checks/scripts/check_content.py --lang fr <id> && python3 checks/scripts/check_french_accuracy.py <id>`. Then curriculum/fr/reviews/A1.md (with "## Lexicon notes"), commit; then A2, B1, B2, C1 the same way.
**Watch:** Vocab = [fr, en, ipa(, m/f)]; `python3 scripts/frlex.py ipa "..."` for IPA. French in *italics* in explanations; English only in hints. Metropolitan standard; vous/tu both. Never push without Clara's go-ahead.
