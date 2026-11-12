# Lean tutorial orientation — 12 November 2026

The three lessons explain their constructions and define their technical terms,
but their opening does not tell a new reader how to approach the sequence or
navigate its sections. The repair adds an orientation and linked contents while
retaining the mathematical exposition.

The target was the complete introductory sequence in pack 1.1.0 at
`db22a76d5b4c95cac049114bb3d5f0f05f6a918f`. All three lessons were read in full.
The revised pack is 1.1.1. The lesson IDs and filenames remain unchanged.

## Existing outline and prerequisites

| Lesson and section, in order | Function |
| --- | --- |
| Functions: opening | State the composite-function construction and identify examples and commands. |
| Names, types and binders | Define term, type, binder, scope and universe; explain grouped binders. |
| Application and abstraction | Explain function application, binding and renaming. |
| Defining the composite | Define `compose` with its types and parameters; distinguish argument order from evaluation order. |
| Checking the body | Derive the body's type and apply the abstraction rule. |
| Checking a type and computing a value | Explain `#check`, right-associative arrows and the computation yielding 14. |
| Variation and error | Apply a function three times; diagnose a wrong input type. |
| Implication: opening | Define proposition and proof; name the preceding lesson as a prerequisite. |
| Composing implications | Construct implication composition and explain discharge of an assumption. |
| Constructing the proof with tactics | Define goal and tactic; derive the same proof with `intro`, `have` and `exact`. |
| Variation and error | Supply a proof as a parameter; diagnose a wrong conclusion. |
| Dependent application: opening | Define an indexed proposition family and state prerequisites. |
| A proof for each input | Define universal quantification and dependent function types; construct `specialize`. |
| Substitution in the result type | Explain substitution and the dependent application rule. |
| Variation and error | Specialize along a function; diagnose application at the wrong index. |

The central question is how application and abstraction justify these three
constructions. Function composition requires typed functions. Implication adds
propositions and proofs; dependent application adds a family and a proof for
every input. Their order already respects those dependencies.

## Source and comparison

The governing source was Knuth, Larrabee and Roberts,
[*Mathematical Writing*, Stanford report CS-TR-89-1193](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
Section 1, printed pages 1–6 (PDF pages 3–8), and Section 13, *User Manuals*,
printed pages 28–30 (PDF pages 30–32). The latter records Knuth's discussion in
notes by PMR. The authors' [bibliographic page](https://www-cs-faculty.stanford.edu/~knuth/klr.html)
identifies the report and book. The user's reference to Došen and Petrić is a
preference for economical exposition; no particular passage was supplied or
quoted, and no Lean claim is attributed to them.

| Anchor | Difficulty or retained strength | Source principle or editorial rationale | Repair |
| --- | --- | --- | --- |
| First lesson, opening | The construction appears before the reader knows the scope or expected background. | Section 1, points 12 and 24: prepare the reader and attend to the opening. | State the prerequisites and link the three lessons with their purposes. |
| First lesson, commands | A new reader is given commands without an account of the files and InfoView. | Section 13: a sequence of definitions alone does not orient a novice user. | Explain complete examples, optional variations, notes, InfoView and Return briefly. |
| All three lessons | Neighbor links do not give access to individual sections. | Editorial application of the overview and skimming discussion in Section 13. | Add local section links and a route back to the tutorial contents. |
| Mathematical sections | Definitions and detailed typing explanations already perform distinct jobs. | Section 1, points 10–11 and 26: connected explanations and purposeful terminology. | Preserve the derivations and definitions; do not shorten by removing premises. |

## Definition order and notation

In the first lesson, type and term are explained in the opening paragraph of
*Names, types and binders*. Binder and scope follow, before the complete function
definition. Universe, application and abstraction precede their use in that
definition. Parameter and body accompany declaration syntax; context and typing
judgment precede the inference rules. Their definitions are present and remain
in place.

The second lesson defines proposition and proof before the construction. It
defines implication at the start of *Composing implications*, then discharge;
goal and tactic precede the tactic proof. The third defines a proposition family
in its opening, followed by universal quantifier, dependent function type,
instantiation and substitution at their points of use. Constant families remain
allowed. The explanation distinguishing a family from a proof of all its values
is retained.

The new contents preview section names; they do not introduce new formal
terminology. InfoView receives a brief explanation when first mentioned.
The premises, variable scopes and result types of all displayed rules remain
unchanged, as do `P : Prop` versus `hP : P`, and `S : A → Prop` versus its
universally quantified proof.

## Revised outline and principal wording

The existing mathematical sections stay in their order. Before the first
construction, the reader now finds the expected background, a three-item tutorial
contents list, instructions for using the files and a six-item section list.
The other two lessons gain a short purpose statement, a three-item section list
and contents links. The last lesson also gains end navigation.

The new opening is: “Lean checks definitions and proofs written in its language.
These three lessons assume familiarity with functions and elementary logic; no
Lean syntax is assumed.”

The description of InfoView is: “Lean's **InfoView** is the panel showing the
available assumptions and what remains to be proved at the cursor. The second
lesson explains its display.”

The third lesson's purpose is: “A proof that covers every input can be applied
to a chosen input. We shall account for the result type of this application.”
This wording does not require the family to be nonconstant.

## Checks and scope

The complete revised prose was read for definition order, paragraph function,
dependencies and review commentary. The mathematical sections were retained;
their paragraphs introduce objects, explain constructions or rules, carry out
computations, or diagnose the given errors. Review and delivery commentary
remains in this report. Compiler success and structural checks do not by
themselves establish correspondence with an informal argument.

Both shipped Lean projects built with the pinned Lean 4.33.0 in disposable
copies. The three deliberate errors produced type mismatches; the three
unfinished variations produced the expected incomplete-proof diagnostics.
The ten fenced code/goal blocks and all 55 mathematical expressions in the
lessons match the preceding revision exactly. Eight lesson-workflow tests,
three tutorial tests and the version-title check passed. Markdown/KaTeX rendering
completed without errors; all 42 local links resolved, including 18 fragments.
Rendered HTML was inspected programmatically. Native preview layout and live
InfoView were not observed in this pass. Release verification and the guarded
working-copy update are recorded separately in the delivery report. The scope is these three
introductory lessons. No later course, general Lean metatheory or passage from
Došen and Petrić was reviewed.
