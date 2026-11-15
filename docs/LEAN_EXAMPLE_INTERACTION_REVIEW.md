# Lean examples: interaction instructions

The lessons explained the constructions but left the first editor action
implicit. Lean foundations pack 1.1.3 now identifies the editable file, the
InfoView output and one reversible experiment before the first construction.
Completed Lean code, statements, practice files and toolchain remain unchanged.

## Outline and findings

The complete three lessons and their linked examples, solutions and practice
files were reviewed against pack 1.1.2. The existing order remains useful:

| Location | Function |
| --- | --- |
| Introduction, contents, working instructions | Explain formalization, the three constructions and how to begin. |
| Functions: names/types/binders, application/abstraction, composite, typing rules, computation, variation | Define function composition and derive its type; evaluate at 2. |
| Implication: propositions/proofs, implication composition, tactics, variation | Construct a proof term and inspect the corresponding tactic states. |
| Dependent application: family, universal quantifier, substitution, variation | Derive the result type at a supplied input. |

| Anchor | Difficulty | Repair |
| --- | --- | --- |
| Working with the examples | “Keep the examples beside the text” does not say what to edit or whether to run anything. | Identify Examples.lean, automatic checking and the existing InfoView command; compute 14, change the input and observe 16, then undo. |
| Checking a type and computing a value | Types, computed messages and unfinished proof goals can be confused. | Explain which output comes from #check and #eval; a completed definition has no unfinished goal. |
| Constructing the proof with tactics | An illustrated goal does not explain how to inspect successive live states. | Locate implication_comp_tactic and describe cursor positions around intro, have and exact. |
| Dependent application | The direct proof term has no tactic sequence. | Inspect the declared types of h and a and the later #check message. |
| Variations | The completed file and unfinished Practice files serve different purposes. | Identify the separate files, the underscore to replace, expected diagnostics and Undo. |

The source consulted was Knuth, Larrabee and Roberts,
[*Mathematical Writing*, Stanford CS-TR-89-1193](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
Section 1, points 11–12, and Section 13, printed pages 28–29 (PDF pages 30–31).
Section 1 relates definitions to reader knowledge and motivation. Section 13,
notes by Paul M. Roberts, discusses unexplained interface vocabulary, a useful
first demonstration, and recovery after mistakes. The steps above apply that
advice to the observed confusion. Their particular wording and arrangement
are editorial choices. Došen and Petrić supply the requested preference for
economical prose; no passage from them is quoted or newly attributed.

## Definitions and scope

InfoView is explained as a panel before its command is used. Its message output
is distinguished from a remaining proof goal. The mathematical order is kept:
type and term before binder/scope, application and abstraction before the
composite, proposition and proof before implication, and family and quantifier
before dependent application. Parameters, hypotheses and quantifiers remain.
No replacement outline is needed; no new lesson, exercise record or runtime
control was added. Editing commentary remains outside the lessons.

The installed official Lean extension 0.0.242 describes lean4.displayGoal as
displaying the goal and messages at the current position. The instructions also
use the primary [Lean interaction guide](https://lean-lang.org/theorem_proving_in_lean4/Interacting-with-Lean/#messages).
Compiler checks, rendering checks and delivery observations are recorded in
the versioned release report. Existing working copies are not overwritten by
the extension update; the same interaction instructions apply to their code.
