# Lean study: introduction and writing review — 13 November 2026

The first lesson had a two-sentence orientation beneath its chapter heading.
It named the prerequisites but did not explain formalization or why the three
constructions form a sequence. The revision places a distinct introduction
before the contents and first chapter, and names the chooser entry
**Introduction and functions**. The mathematical derivations retain their detail.

The reviewed source is the complete Lean foundations pack 1.1.1 at
`cae2b2b09352845f8d43d3bcc0f81b045935b6fb`: all three lessons, the working note,
completed examples and solutions, and six practice files. The revised content
version is 1.1.2. The intended reader knows functions and elementary logic but
has not used Lean.

## Outline before revision

| Sections, in reading order | Function |
| --- | --- |
| Functions: opening, Tutorial contents, working instructions | Identify the sequence, files and commands. |
| Names, types and binders; Application and abstraction | Introduce expressions, types, scope, universes and the two function operations. |
| Defining the composite; Checking the body | Construct composition and derive its type from application and abstraction. |
| Checking a type and computing a value; Variation and error | Inspect the complete function type, compute 14, and diagnose an ill-typed application. |
| Implication: opening; Composing implications | Introduce propositions and proofs; compose implication proofs using the function operations. |
| Constructing the proof with tactics; Variation and error | Explain goals and each tactic, compare the resulting proof terms, and diagnose a wrong conclusion. |
| Dependent application: opening; A proof for each input | Define a proposition family and apply a universally quantified proof to a chosen input. |
| Substitution in the result type; Variation and error | State the dependent application rule and diagnose an incorrect index. |

The common question is how supplying an argument determines the type of the
result. Function composition precedes implication composition; dependent
application then permits the result type to vary with the input. These
prerequisite dependencies require no rearrangement.

## Source and findings

The governing source consulted was Knuth, Larrabee and Roberts,
[*Mathematical Writing*, Stanford CS-TR-89-1193](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
Section 1, Sections 4–5 and the opening discussion of user manuals in Section 13.
Section 1 connects motivation, complementary explanations and careful openings;
Sections 4–5 qualify when definitions are needed. Section 13 records Knuth's
teaching examples in notes by Paul M. Roberts. The repairs below are applications
of that advice, not a format prescribed by the authors. Došen and Petrić supply
the user's preference for economical exposition; no passage from them was
supplied or quoted in this review.

| Anchor | Finding | Principle and repair |
| --- | --- | --- |
| First lesson, opening | Purpose and relation among the lessons are missing from the short orientation. | Section 1, points 12 and 24: explain formalization and the common operation before the chapter. |
| First lesson, heading and chooser label | Both start with a chapter name, making the introduction hard to discover. | Editorial navigation judgment: name the entry Introduction and functions; give the introduction its own heading. |
| Working examples | The first code line uses `namespace`, without explaining the surrounding `end`. | Sections 1 and 13 on terminology: explain that these lines group declaration names. |
| Implication, definition of proposition | “A statement to be proved” ties the notion to a reader's task. | Mathematical wording: use “expresses a mathematical claim,” then retain the exact `Prop` and proof typing. |
| Dependent application, after the typing rule | The examples issue `#print axioms`, but the prose does not explain its output. | Definition-order judgment: define axiom and describe transitive dependencies before directing attention to the output. |

## Definition order and notation

Formalization is explained at its first use in the introduction. The first
lesson still defines type and term before binder, scope and universe; application
and abstraction precede the full declaration. Parameter and body accompany
`def`, while context and typing judgment precede the inference rules. The names
`g` and `f` retain their declared types and their order of application.

The second lesson distinguishes `P : Prop` from `hP : P`, defines implication
before its proof, and explains discharge, goal and tactic before their detailed
use. The third introduces a family before universal quantification, dependent
function type and instantiation; substitution precedes the dependent application
rule. Its example of the proposition that a natural number equals zero retains
the distinction between specifying a family and proving all of its members.

The introduction previews familiar functions and elementary logic without
introducing undeclared Lean notation. The former `binder` difficulty is not
present in this version: the term already has an explanation and example.
The context, type, hypothesis and variable-scope information in the rules is
preserved. No diagram is needed for the two-step composite explained in the text.

## Revision and principal wording

The first entry now has Introduction, Tutorial contents, Working with the
examples, and Functions and composition, in that order. The existing first-lesson
sections become subsections of the last heading; their anchors still work.
Both later lessons link back to the introduction. The lesson IDs and filenames
are unchanged.

The opening begins: “Lean checks a proof against a stated conclusion and its
hypotheses. To use it, one writes the mathematical objects, statement and proof
in Lean's language. This translation is called formalization.” The next
paragraph explains the shared operation: supplying an argument to a function.
The remaining opening gives the expected background and reading order.

All paragraphs were read for their mathematical or instructional purpose.
The retained prose defines objects, explains constructions, derives types,
evaluates terms or diagnoses the deliberate errors. Editing and delivery
commentary remains outside the lessons.

## Verification scope

The pinned Lean 4.33.0 checks compiled both complete lesson projects. The three
deliberate mistakes and three incomplete variations produced their expected
diagnostics. All ten code/goal blocks and 55 mathematical expressions in the
three lessons match the preceding pack. KaTeX rendered all 55 expressions;
47 local lesson links and their targets were checked.

The extension suite passed 541 checks. Python unittest discovery ran 442 tests
with 68 skipped because optional environments were unavailable. Syntax and
compile checks passed. These are regression and compiler results, not a claim
that the informal exposition is mathematically certified.

The user's unchanged working-copy pack and three lesson files were updated
with verified backups; the other 23 non-build files, including code and personal
notes, have unchanged hashes. No editor buffer was saved, closed or reloaded.
A separate native WSL host checked activation, Contents, Lean picker cancellation
and ordinary-note Save. The lesson rendering checks are programmatic; no native
layout observation of the revised introduction is claimed.

The scope is this three-lesson introduction, not a complete Lean course.
