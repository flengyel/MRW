# Lean lesson revision — 12 November 2026

The original lesson explains the three constructions correctly at the intended
level, but repeatedly restates the roles of declaration lines and interrupts
proofs with warnings about topics it has not introduced. Its binder definition
is present, after the first complete code example; it describes scope before
explaining scope. The revision separates the constructions into three lessons
and introduces their terminology at the point where the reader needs it.

The review target was *Functions, proofs and dependent application*, pack 1.0.0,
at `6ddbc55c820bd0fdc82b80df205c8f6cffbbfc00`. The complete lesson, examples,
solutions, three variations and three deliberate errors were read. The revised
pack is 1.1.0. The original lesson filename and first lesson ID are retained.

## Original outline

| Section | Function |
| --- | --- |
| Opening and commands | State the common pattern and locate the book, working examples and controls. |
| A: Composition of functions | Construct `compose` from typed functions. |
| A: The declaration, line by line | Explain binders, parameters, universes and declaration syntax. |
| A: Application and abstraction | Explain function syntax, contexts and the two typing rules. |
| A: Checking a type and evaluating an application | Distinguish type checking from the computation yielding 14; give Variation A and its error. |
| B: Implication as a function on proofs | Construct implication composition and distinguish propositions from their proofs. |
| B: The tactic proof, one step at a time | Relate `intro`, `have` and `exact` to the proof term; give Variation B and its error. |
| C: A genuinely dependent result type | Instantiate a proposition family by substitution in a dependent result type; give Variation C and its error. |
| The next sequence | List later topics and discuss build/checking boundaries. |

The central question is how Lean's application and abstraction rules justify
function composition, implication composition and universal instantiation.
Function composition needs typed functions; implication composition adds
propositions and proofs; instantiation adds an indexed family and a universal
proof. The revised sequence retains those dependencies.

## Source and comparison

The governing source consulted was Knuth, Larrabee and Roberts,
[*Mathematical Writing*, Stanford report CS-TR-89-1193](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf):
Section 1, printed pages 1–6 (PDF pages 3–8), and Sections 4–5, printed pages
9–13 (PDF pages 11–15). These references identify the Stanford report rather
than assuming the pagination of another edition. The authors' [bibliographic
page](https://www-cs-faculty.stanford.edu/~knuth/klr.html) was also consulted.

Section 1, points 10–13, supports connected exposition, complementary
explanations and attention to what the reader knows. Point 17 concerns sentences
readable in order. Sections 4–5 discuss the placement of definitions in context.
The user's stronger requirement here is to define type-theoretic terms before
using them. Splitting the lesson and removing duplicate tables are editorial
applications of that guidance. The comparison with Došen and Petrić supplied a
preference for economical exposition; no specific passage from their work was
quoted or used as evidence for a Lean claim.

| Original anchor | Difficulty | Principle or rationale | Implemented repair |
| --- | --- | --- | --- |
| Opening; A: binder paragraph | `binder` is explained after the example; `scope` remains implicit | Definition order; Section 1, point 11, and Sections 4–5 | Define binder using `(x : A)` and define scope before the complete declaration. |
| A, B and C: code-line tables | Tables repeat adjacent prose without adding a new inference | Independent editorial judgment; complementary explanations need distinct purposes | Keep the expression/type/reason table; explain declaration syntax once and refer to the construction afterward. |
| A: function/space-of-maps analogy | The analogy is followed by a qualification about set membership | Economy convention of the plugin | State directly that `f` is a term and `A → B` its type; retain the distinction between typing and membership at the judgment. |
| B: repeated proof descriptions | A second table repeats the three numbered tactic explanations | Connected argument; Section 1, points 10–11 | Keep the numbered derivation and before/after goal displays. |
| C: final warnings | Claims about Boolean programs and existential notation interrupt instantiation | Independent editorial judgment | Explain the difference between `S` and `h` with the concrete family assigning `n = 0` to `n`. |
| Final sequence | Several future technical terms are named without treatment | Reader preparation; Section 1, point 12 | End each lesson with its variation, explained error and precise book reference. |

## Definition order and notation

The first lesson defines type and term, then binder and scope. Its universe
paragraph defines `Type`, `Type 0`, `Type 1`, `Nat` and `Bool`. Application and
function abstraction precede the complete `compose` declaration. Parameter and
body are explained with declaration syntax. Context and typing judgment precede
the inference rules; premises and conclusion are explained at the first rule.
The abstraction rule requires a new input name and a result type independent of
that input. No undeclared universe-polymorphic convention is assumed.

The second lesson defines proposition and proof before using `Prop` declarations
to explain implication. It defines discharge, goal and tactic before their
subsequent uses. The third defines proposition family, universal quantifier,
dependent function type, dependent function, instantiation and substitution.
Earlier terms are prerequisites identified by links to the preceding lessons.
The symbolic premises, result types and argument order were checked separately
from the wording. Generic families are allowed to be constant.

Mathematical prose uses `f(x)` where appropriate and distinguishes it from Lean's
`f x`. The meaning of the judgment symbol and its use in illustrated goals are
explained. `P : Prop`, `hP : P`, `S : A → Prop` and `h : ∀ x : A, S x` keep their
different roles. Removing the Boolean warning does not identify propositions
with Booleans. The separate `compose` and implication proofs retain the
`Type`/`Prop` distinction.

## Revised outline and consequential wording

1. **Functions and composition**: names and types; binders and scope;
   application and abstraction; `compose`; the typing rules; computation;
   Variation A and its type error.
2. **Implication as a function on proofs**: propositions and proofs;
   composition and discharge; tactics with goal states; Variation B and its
   wrong conclusion.
3. **Dependent application**: indexed proposition family; universal proof;
   instantiation and substitution; Variation C and its wrong index.

Each page links to its neighbors and uses the same working examples, solutions
and associated note. The full code declarations and hypotheses remain unchanged.
The pack gives each lesson its own variation and deliberate-error action. The
main outline changed by dividing A, B and C, without reordering their mathematics.

The principal local repair is: “A **binder** declares a name and its type for use
in part of an expression. For example, `(x : A)` declares the name `x` with type
`A`. The part in which the name refers to this declaration is its **scope**.”

The dependent type explanation now reads: “A **dependent function type** specifies
an input and a result type that may depend on that input.” This preserves constant
families while explaining the role of the bound input. The proof/Boolean warning
is replaced by an example showing that an arbitrary proposition family need not
admit a proof at every index.

## Checks and scope

The revised source was read continuously for definition order, dependencies and
editorial/process remarks. No review commentary was inserted into the lessons.
Book attribution and companion authorship remain in the packaged README and
workflow guide; each lesson links to its relevant book chapters. The three
chapter URLs were checked against the official Lean text.

Lean 4.33.0 built both shipped projects in disposable copies. All three deliberate
errors produced type mismatches and all three variations produced unfinished-goal
or placeholder diagnostics. The lesson-check script now enumerates exercises
and errors across every manifest lesson; it previously inspected only the first.
All eight fenced Lean blocks in the revised text compiled in appropriate contexts.
Separate checks verified bound-variable renaming, the whole implication type,
the stated universe levels and the family `n = 0` counterexample. The completed
Lean files, including all declaration types, retain their original bytes.

Eight focused extension checks passed, including a new test of the three lesson
selections, their individual actions, restart and preservation of shared code and
notes. Three tutorial checks passed. The bundled Markdown and KaTeX parsers
rendered all three lessons and 55 formulas; all 21 local links resolved. HTML
rendering was checked programmatically. Native preview layout and live InfoView
were not observed during this revision; earlier observations are recorded in
[the original delivery report](LEAN_STUDY_VALIDATION.md).

The requested working-copy edit changed only the first lesson and its manifest,
and added two lesson files. The original lesson and manifest were backed up outside
the vault. The other 23 files, including examples, solutions, practice files,
notes and the original reset bytes, matched their preceding hashes. The working
copy metadata continues to identify the original example version for Reset.
This was an explicit revision of the selected lesson; ordinary extension updates
still preserve other working copies.

The checks establish formal declarations, syntax, links and program behavior at
the stated source. The correspondence between each code block and the mathematical
explanation was reviewed as part of editing, rather than inferred from compilation.
No later lesson sequence or general Lean metatheory was reviewed. Logs and backup
files remain under `~/.cache/mrw-lean-writing-20261112/`, outside tracked source.
