# French curriculum — research record

How the French course (A1–C1, standard metropolitan French, English instruction) was
derived, and from what. It is built from references for teaching **French as a foreign
language (FLE)**. It is not an adaptation of the Spanish course: its levels, the content of
each level, and the order things are taught in come from the French sources below.
Researched 2026-10-03.

## Sources

Each inventory item (`curriculum/fr/inventory.json`) cites the source(s) it comes from by key.

- **[INV]** Eaquals, CIEP, Eurocentres & ACPLS/CASLT, coord. B. North (2015). *Inventaire
  linguistique des contenus clés des niveaux du CECRL*. Annexe D (référentiel des contenus
  clés), Annexe E (vue d'ensemble par niveau, A1–C1), Annexe F (réalisations langagières).
  <https://www.eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf> — the backbone of
  the course. It is a consensus (80 % agreement) drawn from Beacco's *Niveau A1.1 / A1 / A2 /
  B1 / B2 pour le français* référentiels, the Alliance française *Référentiel de programmes*
  (A1–C2), Eaquals-accredited FLE programmes, and a survey of 150 FLE teachers, and assigns
  each function, grammar point, discourse marker, sociocultural point and vocabulary theme
  to the level where it is first taught.
- **[AF-A1]** Alliance Française Paris Île-de-France (2018). *Cours de français — MOOC
  « Vivre en France » A1, guide pédagogique* (tableau des contenus: 16 sequences with their
  objectives, grammar, vocabulary and **phonetics**).
  <https://lms.fun-mooc.fr/asset-v1:dgef-interieur+134003+session01+type@asset+block/Guide_pedagogique_A1_V5_BD.pdf>
  — used for the order of A1 and for the A1 pronunciation strand.
- **[DELF]** Ministère de l'Éducation nationale (2005). *Règlement des épreuves du DELF et du
  DALF* (Annexe 1, BO n° 29): the tasks each exam sets at A1, A2, B1, B2 (DELF) and C1 (DALF).
  <https://www.education.gouv.fr/bo/BoAnnexes/2005/29/DELF_DALF.pdf>
- **[CECR]** Council of Europe (2001). *Common European Framework of Reference for Languages*,
  global scale and level descriptions. <https://www.coe.int/en/web/common-european-framework-reference-languages>
- **[CECR-CV]** Council of Europe (2020). *CEFR Companion Volume*, including the redeveloped
  **phonological control** scale (overall control, sound articulation, prosodic features).
  <https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4>
- **[LEX]** B. New & C. Pallier et al. *Lexique 3.83*, a database of ~140,000 French word
  forms with phonemic transcription, gender, category and frequency (CC BY-SA 4.0).
  <http://www.lexique.org> — used to choose high-frequency vocabulary and as the reference
  for spelling, gender and pronunciation (see "Accuracy" below and
  `curriculum/fr/lexique/README.md`).

Background, not consulted directly (they are paid books): J.-C. Beacco et al., *Niveau A1.1,
A1, A2, B1, B2 pour le français* (Didier, 2004–2011,
<https://eboutique.didierfle.com/fr/US/t/authors/jean-claude-beacco/>), and A. Chauvet et al.,
*Référentiel de l'Alliance française pour le Cadre européen commun* (CLE International, 2008,
<https://www.cle-international.com/adultes/referentiel-de-l-alliance-francaise-pour-le-cadre-europeen-commun-livre-9782090352795.html>).
They reach this course through [INV], which is built from them.

## How the curriculum was derived

1. **What each level must cover** — the inventory — is [INV]'s Annexe E for that level:
   its functions, discourse, sociocultural, grammar and vocabulary-theme lists. Every key
   grammar point and function there is an inventory item at the level [INV] assigns it.
   A few points [INV] lists under two levels (e.g. the passé composé / imparfait contrast at
   A2 and B1) are an item at the first level and revisited later.
2. **The order within a level** follows how FLE programmes sequence it. For A1 this is
   [AF-A1]'s sequence (greetings and *tu/vous* → *être, avoir, s'appeler* → *-er* verbs →
   articles → questions → quantities and demonstratives → adjectives → imperative →
   possessives → negation → *passé composé* → pronominal verbs → *futur proche*), with [INV]
   A1 points placed where they are needed. From A2 on, [INV]'s points are grouped into lessons
   so that each builds only on what came before.
3. **What learners must be able to do** at each level is checked against the exam tasks in
   [DELF]: e.g. A1 filling in a form and writing a postcard, A2 a friendly letter that
   invites, thanks or apologises, B1 an opinion essay or letter, B2 an argued position
   (*prise de position*), C1 a *synthèse* of several documents and an *essai argumenté*.
4. **Pronunciation** is a strand of its own (see below).
5. **Vocabulary** for each lesson is drawn from [INV]'s vocabulary themes for the level and
   chosen by frequency in [LEX] (film-subtitle frequencies, the best estimate of everyday
   spoken use), so early lessons teach the commonest words.

### How this differs from the Spanish course

The two courses share only the CEFR levels. French follows its own FLE sequence, so for
example: the *passé composé* (with *avoir* and *être*) and pronominal verbs are A1, as in
[INV] and [AF-A1]; the partitive (*du, de la, des*) and *ne… pas de* are A1; object pronouns,
*y* and *en* are A2; the subjunctive starts at B1 with *il faut que*; the *passé simple* is
taught for reading at C1. Pronunciation — silent letters, nasal vowels, liaison, elision and
*enchaînement* — is taught from the first lessons, because written and spoken French differ so
much; Spanish needed very little of this.

## Pronunciation strand

- **A1** follows [AF-A1]'s phonetics, one point per unit: rhythm groups and final-syllable
  stress; intonation of questions and answers; *enchaînement*, elision and liaison; the
  contrasts [i]/[y], [y]/[u], [s]/[z], [e]/[ɛ], [ø]/[œ]/[o], nasal [ɛ̃], [ɑ̃], [ɔ̃]; consonant
  clusters; [ʃ]/[ʒ]. A dedicated lesson covers the alphabet, accents and silent letters.
- **A2–C1** follow the [CECR-CV] phonological-control scale: from intelligible pronunciation
  of a limited repertoire (A1–A2), through generally clear articulation and intonation that
  supports meaning (B1), to prosody used deliberately for emphasis, nuance and register
  (B2–C1). The sound points chosen at each level are those the level's grammar makes
  necessary — e.g. *j'ai parlé* /e/ vs *je parlais* /ɛ/ with the imparfait (A2), *je
  parlerai* vs *je parlerais* with the conditional (B1), dropped *ne* and schwa in informal
  speech with registers (B2), regional accents with the varieties of French (C1).
- Every vocabulary entry has an IPA pronunciation guide, checked against [LEX]; audio comes
  from the computer's French (France) voice.

## Variety of French

Standard metropolitan French, as in [INV] and [AF-A1]. Where Québec, Belgian or Swiss
French differ in common, useful ways (*septante / nonante*, *déjeuner / dîner / souper*,
*courriel*), lessons add a short note; exercises only require the standard form.

## Accuracy

- **Spelling, gender, pronunciation**: `checks/french-accuracy.sh` (CHK-007) looks every French
  word in the course up in [LEX]: spelling (accents included), the gender of nouns, and each
  vocabulary entry's IPA guide. The only exceptions are lexicon notes in a level's review
  record, each with its reason.
- **Naturalness and correctness beyond the word**: each level gets a written review pass
  (`curriculum/fr/reviews/<LEVEL>.md`) listing what was checked, what was wrong and what was
  fixed.
- The author of the content is an AI, not a native speaker; residual non-native phrasing is
  possible, especially at B2/C1, which is why each level's review is recorded.
