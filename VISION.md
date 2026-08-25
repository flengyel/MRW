# VISION.md

Why Theorem Terminal exists. Companion to `DOMAIN_MODEL.md` (entities and
invariants), `UX_SPEC.md` (the human workflow), and `CODEX_PLAN.md` (staged
implementation).

## Thesis

## Thesis

* Learning a large body of mathematics requires orientation, understanding,
  integration, and retention.
* Returning to mathematics after a lapse requires reconstructing context that
  the surviving sources do not themselves preserve.
* AI may increase the rate of mathematical production and the amount of work
  requiring evaluation, understanding, and integration.
* Kallenberg's top-down approach provides the learning model.
* Curry's precision ladder provides the representation model.
* Theorem Terminal explores tools for learning, reconstructing, integrating,
  and retaining mathematics.

Theorem Terminal is intended both for navigating and learning from a large
corpus, such as the Stacks Project
[@stacksprojectauthorsStacksProject2021], and for returning to one's own
research, an inactive project, or a subject not studied or taught for years.
AI increases these demands and supplies new forms of assistance, but did not
create them. Tao observes that the growth of the literature, the increasing
length and specialization of major proofs, and the strain on the refereeing
system all predate modern AI [@taoMathematicsAgeAI2026].

The first implementation will be experimental, not a completed system or a
product specification. It will test whether recording sources,
correspondences, explanations, formal facts, and review history helps a
mathematician learn, reconstruct, integrate, and retain mathematics during
actual work. It will also determine which records can be produced or
maintained mechanically and which require mathematical judgment.

Theorem Terminal is an assistant's assistant. It does not replace mathematical
assistants, proof assistants, or formal systems, and it does not compete with
them. It supplies the persistent context in which work done with those systems is
organized, attributed, reviewed, and retained. A mathematician may use several
machine assistants for exploration and critique, a proof assistant for
verification, a computer algebra system for computation, and the literature for
exposition; Theorem Terminal holds what was learned, where each idea came from,
which claims are checked, which explanations are human and which machine, and
what needs review — without making any one assistant the authority. The
valuable artifact is not any assistant's answer. It is the corrected
understanding that accumulates around it, which at present survives only in
chat logs and in memory.

---

## 1. The additional pressure from AI

The mathematical workflow now in use — read the literature, follow references,
reconstruct arguments, remember what matters — was built for a world in which
the production of mathematical results was limited by the number of people
capable of producing them. Every downstream habit assumes that limit: the pace
of refereeing, the size of a literature one can hope to follow, the expectation
that a serious result will be read by someone before it is used.

The premise of this project is conditional and does not require predicting how
far machine assistance will go: *if* the production of proofs, formalizations,
conjectures, and examples ceases to be human-limited, then the binding
constraint moves from finding results to orienting among them, verifying them,
understanding them, and integrating them with what is already known. Nothing
about that shift is automatic — it is a claim about where effort goes, and the
project exists to build instruments for the new bottleneck rather than to
predict its arrival date.

One consequence is immediate and already visible. When announcement is cheap and
checking is expensive, the epistemic status of a claim stops being inferable
from its visibility. A result posted publicly, a result checked by a kernel, a
result refereed, and a result independently reproduced are four different
things. A workstation for this environment must keep them four different things
at the level of its data model, not merely in the prose of its interface.

## 2. What the bottleneck actually consists of

Four activities, none of which a proof-producing system performs on the
mathematician's behalf.

**Orientation.** Before studying individual results, a mathematician needs to
identify the subject's organizing concepts, principal results, dependencies,
and sources. A table of contents or declaration index does not by itself
provide this understanding.

**Understanding.** Knowing that a theorem holds is not knowing why its proof
works, which hypothesis is doing the work, what the argument reduces to, or what
would break if a condition were dropped. A verified statement can be entirely
opaque.

**Integration.** A result matters relative to a surrounding structure: what it
generalizes, what depends on it, which earlier idea it makes precise, where it
sits in a subject. Integration is the difference between a collection of true
statements and a field one can work in.

**Retention.** Understanding reached and then lost is a cost paid repeatedly.
This is the least discussed of the three and the most mechanical to address. It
is also the only one that yields observable data: intervals, lapses, and whether
a proof can be reconstructed are recorded automatically, whereas understanding
and integration are assessed by judgment. That makes retention the likeliest
place to demonstrate value early — with the caveat that retention data measures
retention of whatever the prompts happen to test, so a well-scheduled bad prompt
set produces clean numbers and no understanding.

## 3. Kallenberg: the learning model

Kallenberg prescribes a reading method for advanced mathematics and contrasts it
with reading a novel front to back: gain a general overview first, work down
gradually to individual theorems, and reach proofs and their logical structure
last [@kallenbergFoundationsModernProbability2021, 1].

Two further points from the same passage shape the design more than the
top-down slogan does.

The first is why proofs come before exercises. Learning to prove theorems comes
from studying proofs, in quantity; forgotten hypotheses in the statement of a
theorem can simply be looked up. That is a direct claim about which
mathematical content rewards retention effort and which does not, and the
project adopts it: conditions are lookup, and lookup is a solved problem.

The second is that the top-down method applies inside a proof as well as across
a subject. The reader is to look for the ideas that make the proof work, then
break the argument down into minor details and eventually calculations. The
gaps an author leaves are, on this account, the natural exercises — identifying
and filling them is the work.

This project takes that order as the organizing principle of the interface,
because the default gravity of software runs the other way. Tooling built from a
formal development upward produces a declaration browser: enter a name, read a
type, follow a dependency edge. That serves lookup. It does not serve someone
trying to find out what a subject is about, which results carry weight in it,
and why.

Concretely, the order determines what a theorem view opens with. Not the
statement, and certainly not the formal statement: why one is looking at this
result at all, and what it accomplishes. The default entry point for learning is
not the formal proof.

That is a claim about study, not about discovery. In research, formalization
often runs the other way and produces the mathematics: the Appendix A
development records that two isomorphisms turn out to be provable rather than
assumed, that an identity needs only the range axioms, that a restriction axiom
requires neither the associator nor the symmetry, and that a result holds
without a hypothesis the paper carried. None of that was visible before the
formalization. A system organized around the learning order must therefore
accommodate work that arrives from the bottom, which is why the rungs are a
study trajectory and not a dependency chain.

## 4. Curry: the representation model

Curry's subject is the U language — the unformalized language in which
mathematics is actually discussed, carrying its technical terminology and
notational conventions. Three features of it matter here
[Curry, *Foundations of Mathematical Logic*, §1].

It grows. New terms and symbols are introduced, old terms are given new senses
or abandoned, and the use of the language becomes more precise as work proceeds.

It begins vague and can be sharpened without limit in practice. Curry's analogy
is measurement: instruments made by human hands and brains nevertheless measure
to millionths of an inch.

And precision has no terminus. Curry is explicit that "absolute precision is not
attainable" in measurement and that there is no reason to expect otherwise of
the U language.

The third point is the one this project must not lose. A precision ladder ending
in a kernel check would suggest that formalization escapes the informal — that
at the top rung the vagueness is gone. It is not gone; it has moved. A machine
verifies a proof relative to definitions, and those definitions were written in
the U language by someone deciding what the notions were. That is why §5 treats
adequacy of formalization as an open question no kernel answers, and why the
model records correspondences between manuscript and formalization as claims
with a provenance rather than as identities.

The working consequence is that a coarse representation is a first-class object
and not a placeholder for a missing formal one. An outline with no formalization
is a legitimate and often final state. So is a formal proof with no human
explanation, which is a different kind of incompleteness and one the system
should make visible. The rungs are a study trajectory, not a dependency chain:
nothing requires a lower level to exist before a higher one is written.

This is also where machine assistance is genuinely useful — moving between
levels, proposing an outline for a formal proof or a formalization target for an
informal argument — provided every product of that assistance stays labelled as
what it is.

## 5. Formal verification is one aspect

Lean settles a question of unusual sharpness: whether a proof is correct
relative to stated definitions and a recorded set of axioms. That is worth
having and is not the whole problem.

What a kernel check does not settle: whether the statement formalized is the
statement intended; why the result matters; what the proof's idea is; which
hypotheses are essential; how the argument relates to the surrounding
mathematics; and whether any human understands it. A formal development is
therefore the best available substrate for the lower rungs and supplies nothing
for the upper ones.

Two rules follow. Formal facts — types, dependencies, axiom usage, checking
status — are obtained mechanically, from one canonical generator, and never
maintained by hand. And verification is an attestation about a claim, not the
origin of the claim: a proof written by a human, or proposed by a machine, and
then checked, has one origin and one or more attestations.

## 6. Why spaced repetition

Retention is included because it is the part of the bottleneck that scheduling
demonstrably addresses, and because the alternative is rereading, which does not
scale in the regime the thesis describes.

The distinctive requirement is that review targets kinds of understanding rather
than statements, and Kallenberg supplies the criterion: what can be looked up
need not be retained. A prompt asking for a type signature or a list of
hypotheses tests exactly the material he sets aside. Prompts worth scheduling
ask for the role of a result, the idea that makes its proof work, the crucial
reduction, why a hypothesis is needed, an example or counterexample.

Proof-completion items have the same source. Kallenberg treats the gaps an
author leaves as the natural exercises, which makes a missing-step prompt the
generated form of something a reader would otherwise construct by hand — and a
formal development is unusually good at exposing where the gaps are.

Mastery is tracked per level, so the scheduler can present the weakest due level
of an object rather than the object as a unit — orientation secure, statement
secure, proof idea weak, formal proof unseen.

## 7. What this is not

Not a Lean documentation browser. Not a theorem database. Not a proof assistant,
a search engine, or a formalization tool.

This is recorded as a design hazard rather than a slogan, because the project
has already drifted this way once. The sequence was: mathematical learning
system, then Lean integration, then an exporter, then a documentation
consistency checker. Each step was locally defensible and the composite lost the
research question, because the infrastructure end of the problem is the part
that is easiest to specify.

The rule is not that infrastructure is forbidden. Infrastructure is justified
when it serves the learning model: extracting formal dependencies because they
explain proof structure is warranted, and building a dependency extractor
because extraction is an interesting engineering problem is not. The test is
whether a rung of the ladder becomes reachable that was not reachable before.
Where existing tools
supply what is needed, they are used rather than rebuilt.

## 8. The first corpus

`flengyel/Categorical_Rice_Shapiro` is the first corpus because it carries every
aspect the project must connect: a mathematical manuscript, a formal development,
proofs, dependency and axiom information, and a hand-written document relating
the manuscript to the formalization.

That last artifact is the most useful thing about it. `Lean/docs/AppendixA.md`
demonstrates both that expert correspondence between informal and formal
mathematics is valuable and that it decays: it carries real mathematical
judgment — conceptual roles, which hypotheses are absent, where formalization
departs from the paper — alongside roughly fifty positional references into a
manuscript that keeps moving, and it has fallen behind the formal corpus.
Maintaining that bridge by hand does not scale past one development and one
person. The project is an attempt to find out which parts of it can be
maintained mechanically and which are irreducibly mathematical.

Decay is the weaker half of the argument. The stronger half is that expert
translation between informal and formal mathematics is itself valuable data and
is almost never recorded. Knowing that a hypothesis in the paper turned out to
be unnecessary, that a symmetry is derivable rather than postulated, that
Heller's naturalizer clause has no formalization but that two lemmas carry its
content in usable form, that "section" in one part of the development is not
"section" in another — none of this is recoverable from the manuscript or the
formal development separately, and no extraction produces it. The project
preserves and extends that judgment; repairing decay is what makes preserving
it possible.

The system does not replace mathematical judgment. It records, organizes, and
assists the processes by which judgment is formed, which is why every field it
holds carries an origin and why an adopted machine proposal never becomes
indistinguishable from a mathematician's own conclusion.

## 9. What would disappoint

Stated so the project can be judged by its own standard rather than by
enthusiasm.

- If the mechanically derivable share of expert correspondence turns out to be
  negligible, the automation premise is wrong.
- If review at the level of proof ideas cannot be constructed in a form worth
  repeating, the retention leg fails and the system is a browser after all.
- If existing formal tooling already supplies the translation between formal
  artifacts and mathematical understanding, the project has nothing in
  between to build.
- If the effort of authoring understanding fields dominates the benefit of
  having them, a system that merely stores notes has failed, and the burden
  shifts to assistance: proposing roles, outlines, and review items well enough
  that adopting or correcting one costs less than writing it. That is the
  central question about what machine assistance is for here, and it is settled
  by use rather than by argument.
- If maintaining the knowledge model costs more attention than it returns on the
  first corpus, it will cost more on every corpus.

None of these is decidable in advance. Each is answerable from use on the first
laboratory.
