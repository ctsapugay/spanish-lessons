# Lexique 3.83 (trimmed)

`lexique383-trimmed.tsv` is derived from **Lexique 3.83**, a lexical database of French by
Boris New and Christophe Pallier, with Ronald Peereman, Sophie Dufour, Christian Lachaud and
others — <http://www.lexique.org> ·
<https://github.com/chrplr/openlexicon/tree/master/datasets-info/Lexique383>.

- New, B., Pallier, C., Brysbaert, M. & Ferrand, L. (2004). Lexique 2: A New French Lexical
  Database. *Behavior Research Methods, Instruments, & Computers*, 36(3), 516–524.
- New, B., Pallier, C., Ferrand, L. & Matos, R. (2001). Une base de données lexicales du
  français contemporain sur internet : LEXIQUE. *L'Année Psychologique*, 101, 447–462.

**Licence.** Lexique 3.83 is distributed under the Creative Commons Attribution-ShareAlike 4.0
International licence (CC BY-SA 4.0, <https://creativecommons.org/licenses/by-sa/4.0/>).
`lexique383-trimmed.tsv` is an adaptation of it and is released under the same licence.

**Changes made.** Only the columns `ortho`, `phon`, `lemme`, `cgram`, `genre`, `nombre` and
`freqfilms2` are kept, and exact duplicate rows are removed. Nothing else is altered.
`scripts/trim_lexique.py` regenerates the file from the original table.

**How the course uses it.** The French accuracy check (`checks/french-accuracy.sh`) looks up
every French word in the course for its spelling, every noun's gender, and every vocabulary
entry's pronunciation guide, which is compared with Lexique's phonemic transcription
(converted to IPA). See `curriculum/fr/research.md`.
