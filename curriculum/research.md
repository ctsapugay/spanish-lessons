# Curriculum research record

How the A1 → C1 curriculum was decided, and from what. Written 2026-09-26.

## Sources

1. **Instituto Cervantes, *Plan Curricular del Instituto Cervantes (PCIC) — Niveles de referencia para el español*.**
   The official, level-by-level specification of what a learner of Spanish should know at
   each CEFR level. Used as the primary backbone for grammar and communicative functions.
   - Index: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/indice.htm
   - Grammar inventory A1–A2: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_a1-a2.htm
   - Grammar inventory B1–B2: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_b1-b2.htm
   - Grammar inventory C1–C2: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/02_gramatica_inventario_c1-c2.htm
   - Functions inventory A1–A2: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/05_funciones_inventario_a1-a2.htm
   - Functions inventory B1–B2: https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/niveles/05_funciones_inventario_b1-b2.htm
2. **Council of Europe, *Common European Framework of Reference for Languages (CEFR)*** —
   the global level descriptors (what "A1", "B2", etc. mean in terms of what a learner can
   do). https://www.coe.int/en/web/common-european-framework-reference-languages
3. **Instituto Cervantes, DELE exam specifications** — what the official diplomas test at
   each level; used to sanity-check scope per level. https://examenes.cervantes.es/es/dele/que-es
4. **Mark Davies, *A Frequency Dictionary of Spanish: Core Vocabulary for Learners*
   (Routledge)** — the 5,000 most frequent Spanish words, drawn from Spain and Latin
   America. Used to prioritise vocabulary: early lessons draw on the highest-frequency words.
   https://books.google.com/books?id=SVq9tjgBTVwC
5. **Level overviews used as a cross-check** on typical sequencing in teaching practice:
   - https://www.tellmeinspanish.com/learning/levels-of-spanish/
   - https://spanishgrammar.net/spanish-levels-overview/
   - https://espanol.com/cefr-a1-c2/

## Key findings

- The PCIC lists **only new material per level** (B2 does not repeat B1), so a course that
  covers each level's inventory in order covers everything cumulatively.
- Typical study load (cross-check sources): A1 ≈ 80–100 h, A2 ≈ 100–120 h, B1 ≈ 150–180 h,
  B2 ≈ 200–250 h, C1 ≈ 300–400 h beyond B2. The lesson counts per level grow accordingly.
- Rough grammatical spine by level:
  - **A1** — present tense (regular, stem-changing, key irregulars), ser/estar/hay, articles,
    gender/number, possessives, demonstratives, gustar, ir a + infinitive, basic questions,
    tú imperative.
  - **A2** — preterite and imperfect and their contrast, present perfect, object pronouns
    (direct, indirect, combined), comparisons, formal/irregular imperatives, periphrases
    (acabar de, volver a…), future and conditional basics, por/para.
  - **B1** — present and imperfect subjunctive and their main triggers (wishes, influence,
    emotion, value judgments, doubt, time/purpose clauses, relative clauses), pluperfect,
    real and hypothetical *si*-clauses, reported speech, values of *se*, connectors.
  - **B2** — full mood contrast, concessives, advanced time clauses, pluperfect subjunctive
    and past unreal conditionals, compound future/conditional, relative pronouns (el cual,
    cuyo), sequence of tenses, passive voice, advanced periphrases, discourse markers.
  - **C1** — mood alternation that changes meaning, advanced concessive/conditional/final/
    consecutive clauses, absolute constructions, gerund uses, stylistic tense uses
    (historical present, rumour conditional), clefts and emphasis, register (formal and
    colloquial), idioms, collocations.
- Communicative functions (PCIC §5) grow from social formulas and basic information
  exchange (A1) to describing/narrating and preferences (A2), to a full range of opinions,
  feelings, and argument (B1–B2), and nuance, persuasion, and register control (C1).

## Decisions

- **Variety:** Latin American Spanish, the most widely spoken variety. *Ustedes* is the only
  second-person plural used in exercises; *vosotros* and *voseo* are taught for recognition
  (B1/B2), and Spain-specific usage is noted where it differs (e.g., present perfect use,
  vocabulary like *coche/carro*, *móvil/celular*).
- **Order deviations from the PCIC, and why:**
  - The PCIC places a first taste of the preterite, imperfect, and present perfect in A1.
    This course teaches the past tenses at the start of A2 so that A1 can fully consolidate
    the present tense. Those A1 PCIC items are therefore listed under A2 in the inventory.
  - Because Latin American Spanish prefers the preterite for recent past actions, the
    preterite is taught before the present perfect.
- **Inventory:** `curriculum/inventory.json` distils the sources above into the items this
  course commits to covering, with level, kind (grammar / function / vocabulary topic), and
  source. Every item is covered by at least one lesson (checked automatically).
- **Out of scope:** C2 material; items in the PCIC that are purely metalinguistic or rare in
  Latin American usage are covered for recognition only, or omitted where they would not
  help a learner reach C1.
