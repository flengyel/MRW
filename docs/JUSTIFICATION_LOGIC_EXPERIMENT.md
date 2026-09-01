# Justification-logic experiment

Status: accepted bounded augmentation to the Appendix A experiment. This
document specifies the first slice; it does not claim that every mathematical
reason should be encoded in justification logic.

## Purpose

The current model records where a claim came from and what checks were run, but
it does not express how admitted reasons compose. The experiment adds an
explicit warrant layer for that purpose. Its first question is concrete: can a
later reader reconstruct why the selected Appendix A claim was admitted, which
bridges were required, and which revisions those bridges depended on?

This layer follows mathematical study. It does not precede `orient`, the
theorem landscape, the statement, the proof idea, the proof skeleton, or the
relevant technical detail. It is reached only when an active Appendix A task
uses the manuscript--Lean correspondence.

## Logical basis

The initial family is the non-factive Artemov--Fitting system \(J_0\),
parameterized as \(J(CS)\) when a proof may introduce members of a named constant
specification as axioms. Both profiles admit justification constants as terms.
The authoritative reference is Artemov and Fitting,
*Justification Logic: Reasoning with Reasons*
([book](https://doi.org/10.1017/9781108348034),
[Chapter 2](https://doi.org/10.1017/9781108348034.003),
[Chapter 3](https://doi.org/10.1017/9781108348034.004)).

Terms and formulas in the first slice are:

\[
t ::= x \mid c \mid (t\cdot t) \mid (t+t)
\]

\[
F ::= P \mid \bot \mid (F\to F) \mid t:F,
\]

where \(P\) is an immutable opaque claim atom. The mathematical content of an
atom remains in its LaTeX, Lean, prose, or other representation; the logic does
not attempt to formalize all mathematical language.

The checker represents the classical propositional basis, the Application and
Sum axiom schemes, modus ponens, contextual premises, and, for \(J(CS)\), exactly
the formulas belonging to the selected constant specification.

Application composes a reason for \(F\to G\) with a reason for \(F\). Sum means
that either summand is available as a reason for the same formula. Sum is not
corroboration, probability, independence, consensus, or evidential weight.

A constant specification concerns axioms of the logic, not trusted books,
authors, model providers, or theorem provers. Formally, \(CS\) is a
downward-closed set of nested assertions
\(c_n:\cdots:c_1:A\), where \(n\geq 1\) and \(A\) is an axiom instance: whenever
a nested assertion belongs to \(CS\), every shorter suffix belongs as well. An
axiomatically appropriate \(CS\) supplies every axiom instance at every positive
nesting depth and therefore cannot be finite. The implementation gives a named
\(CS\) a versioned, decidable membership scheme whose constructor or checked
certificate enforces both the axiom-instance endpoint and suffix closure. A
certificate's footprint is only the finite subset of \(CS\) members actually
invoked as axioms. It is not thereby a constant specification; even if it is
downward-closed and hence forms a finite constant specification, it is not
axiomatically appropriate.

The first slice adds no global factivity axiom \(t:F\to F\), positive
introspection, Fitting-world semantics, quantifiers, multi-agent syntax, or
probabilistic evidence. Justification Awareness Models are deferred. If later
considered, the starting point is a basic \(J(CS)\)-model \(*\) for an
axiomatically appropriate \(CS\), together with both fairness biconditionals
\(\mathsf A(c,F)\leftrightarrow c:F\in CS\) and
\(\mathsf{KP}(c,F)\leftrightarrow c:F\in CS\), both application closures

\[
\mathsf A(s,F\to G)\land\mathsf A(t,F)\Rightarrow
\mathsf A(s\cdot t,G)
\]

and

\[
\mathsf{KP}(s,F\to G)\land\mathsf{KP}(t,F)\Rightarrow
\mathsf{KP}(s\cdot t,G),
\]

plus \(\neg\mathsf A(t,\bot)\) for every term \(t\) and
\(\mathsf{KP}(t,F)\Rightarrow\models_*F\), as stated in
[Chapter 11](https://doi.org/10.1017/9781108348034.012). There is no general
sum-closure condition in that definition. The valuation of every opaque atom
in \(*\) must be fixed independently of a proposed \(\mathsf{KP}\)
classification; it is a model parameter, not a declaration of mathematical
truth.

## Separation invariant

Six things remain distinct:

1. a source, model response, proof term, computation, or other artifact;
2. provenance identifying the artifact's origin and revision;
3. an external check or attestation, such as a pinned Lean kernel run;
4. a scoped premise admission;
5. a checked justification derivation relative to a context; and
6. a human decision to use, reject, qualify, or withdraw a reason.

No arrow between these classes is automatic. A digest identifies bytes; it
does not show that a passage expresses a mathematical claim. A kernel run
attests to a formal judgment in a pinned environment; it does not establish
that the formal statement expresses the manuscript statement. A
`Correspondence` of kind `formalizes` records a reviewed relation; it does not
silently create a logical implication. A model response supplies attributed
material; it does not supply truth or an admitted premise.

The same separation later governs the Stage 1 model-assistance trial. The
Appendix A slice itself still requires no model call.

## Versioned experiment records

The first slice needs only these records:

- `ClaimAtomVersion`: an immutable atom identity linked to one or more exact
  representations;
- `JustificationProfile`: the named calculus, syntax and rule versions, named
  constant specification required for \(J(CS)\) and absent for \(J_0\), and
  checker identity;
- `JustificationTerm` and `JustificationFormula`: pure syntax, with no embedded
  provenance or mutable bindings;
- `PremiseAdmission`: an immutable, scoped admission of a justification
  formula, with its exact external bases, actor or policy, scope, time, and
  optional replacement link;
- `JustificationContext`: an immutable selection of active admissions;
- `JustificationDerivation`: a checked conclusion, derivation DAG, profile,
  context, constant-specification footprint, certificate, and dependencies,
  with the checker result recorded by a separate `Verification`.

Withdrawal creates a new context without the admission. It does not make the
old derivation invalid in its old context. The successor records its
predecessor, additions, removals, actor or policy, rationale, and time. Only the
derivation DAG must be acyclic; mathematical claim and correspondence graphs
may contain legitimate cycles.

A bundle hash detects substitution only when compared with an independently
trusted expected digest. It is not a signature and does not authenticate a
self-contained replacement bundle. The emitted bundle contains no digest of
itself. For the frozen Appendix A fixture, Python package or code metadata stores
the expected SHA-256 computed over the complete emitted bytes. For a bundle
created at runtime, the application computes that digest over the final bytes
received at the trusted sidecar handoff and atomically stores it outside the
bundle in the immutable checker `Verification`, together with the artifact
identity, checker and environment revision, profile, and context.

## Appendix A slice

The selected manuscript occurrence remains
`lem:range-lifting-pullback-section`, currently reviewed at normalized SHA-256
`51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945`.
The candidate formal claim is the exact proposition of
`Dom.exists_total_lift_iff_rangeLiftPullback_section`, with
`Dom.rangeLiftPullback_isPullbackSquare` and
`Dom.exists_total_lift_iff_exists_section` available as surrounding formal
facts. Repository reconnaissance on 2026-09-01 found the specialization at
Categorical Rice--Shapiro commit
`fdd1a01b893b125a802ea375aee051ab640c3be7` in
`Lean/PCats/DomPullbacks.lean` blob
`dc6ea0ec50c29c9006b78adb088d4713508487ed`; `Lean/docs/AppendixA.md` maps it
to Lemma A.4, and `Lean/check_axioms.lean` lists it for audit. Those source
records are reconnaissance, not a kernel attestation. The experiment pins the
repository commit actually checked, Lean environment, declaration type,
imports, options, axiom report, checker output, and checked artifact identity.
It does not infer the manuscript--Lean bridge from matching names or from the
mapping document alone.

Let \(k\), \(p\), and \(a\) be justification variables, and let:

- \(K\) be the exact pinned kernel-attestation claim;
- \(F_L\) be the exact formal judgment;
- \(F_M\) be the immutable manuscript claim;
- \(k:K\) be admitted with the pinned checking event as its external basis;
- \(p:(K\to F_L)\) be separately admitted as a scoped formal-proof-policy
  bridge; and
- \(a:(F_L\to F_M)\) be separately admitted as a reviewed directional
  formal--manuscript bridge.

The first certificate checks the application route

\[
a\cdot(p\cdot k):F_M.
\]

This is a \(J_0\) derivation because it uses only contextual premises and
\(J_0\) rules. Its constant-specification footprint is empty, so it remains
derivable in every \(J(CS)\) profile extending the same \(J_0\) syntax and rule
version. Separate profile-boundary tests must show that a proof step tagged
`constant specification` is rejected in \(J_0\) and is accepted in \(J(CS)\)
exactly when its formula belongs to the named \(CS\). Tests also reject a
purported member that does not terminate in an axiom instance and a membership
representation that is not closed under suffixes. The same formula may occur
in \(J_0\) as a contextual premise.

The output says only that \(F_M\) is derivable relative to the displayed
admissions, context, profile, and checker. It does not label \(F_M\) true,
known, understood, or accepted without qualification. Neither the converse
bridge nor identity of \(F_L\) and \(F_M\) is inferred.

## Interface

The first interface is a bounded `why` view for this claim. It is cumulative,
explicitly requested, and post-correspondence. The first CLI is stateless, so
`why` assumes no prior command or hidden session state: in one response it
presents the Appendix's purpose and organization, central concepts and results,
the selected result's role and statement, governing idea, proof skeleton,
available technical detail, and reviewed formal correspondence in that order
before displaying the warrant. The warrant displays:

- the exact claim versions and representations;
- the admitted premises and their external bases;
- the justification term, rules, and checked derivation;
- the pinned source and Lean environment;
- the formal--manuscript bridge and its author or policy;
- stale, superseded, rejected, or withdrawn items separately.

It displays no confidence, truth, or aggregate credibility score. It does not
ask the mathematician to populate formal-logic fields before doing mathematics.
Ordinary notes and task evidence continue to record use, correction, rejection,
or qualification.

## Implementation prerequisite

The sidecar belongs to this repository under a standalone `lean/` Lake project.
Before executable sidecar code or a checked bundle is committed, the repository
must contain and test:

- `lean/lean-toolchain`, pinning the exact Lean toolchain;
- `lean/lakefile.toml`, pinning the Lake environment and dependencies;
- the source path `lean/TheoremTerminal/Justification/`;
- the checked Appendix fixture
  `lean/TheoremTerminal/Justification/AppendixA.lean`; and
- the `justification_bundle` Lake executable.

The canonical compile, fixture-check, and export commands are:

```text
cd lean
lake build
lake env lean TheoremTerminal/Justification/AppendixA.lean
lake exe justification_bundle --output \
  ../src/theorem_terminal/data/appendix_a_justification.json
```

The formal-attestation basis also records the exact command actually run in the
pinned Categorical Rice--Shapiro environment. Task 4.2 stops before code if that
environment, command, and output cannot be reproduced; a source file or audit
list is not a substitute for the run.

## Implementation order

1. Complete the relevant Appendix A study and inspect the exact manuscript and
   Lean statements.
2. Freeze the atom identities, source revision, formal environment, and bridge
   admissions for one route.
3. Implement a separate Lean deep embedding of the syntax and selected
   \(J_0/J(CS)\) derivability fragment, a decidable certificate checker, and a
   theorem that accepted certificates denote derivations.
4. Check the one Appendix A certificate and emit a deterministic versioned
   audit bundle.
5. Let the standard-library Python application validate the bundle schema,
   known profile, exact dependencies, and trusted expected digest, then render
   it. Python does not reimplement the logical checker. A clean wheel-install
   smoke test must show that the frozen bundle and expected digest are packaged
   and that `theorem-terminal why PATH/TO/rs_Appendix_A.tex` works without a
   local Lean installation.
6. Test source, environment, and bridge changes and confirm that a new context
   deactivates exactly the dependent current route while preserving history.
7. Evaluate later reconstruction before adding another theorem or richer
   semantics.

Lean proof terms and justification terms remain different objects. The Lean
sidecar does not modify the kernel. Existing `orient` and `study` commands
remain read-only and work without Lean installed.

## Reuse by the AI-interaction experiment

After this slice has produced a compiled generic checker and pinned profile,
Stage 1 reuses them for one selected response span at a genuine mathematical
obstruction. It does not create an AI-specific logic or epistemic data model.
After the call is finalized and the selected representation and admissions are
frozen, the Lean sidecar is invoked explicitly in its pinned build environment
and emits a separate deterministic AI-warrant bundle. Model-response handling
does not invoke Lean implicitly; Python later validates and renders the frozen
bundle. Because this bundle is produced after a runtime call, its expected
digest cannot be package-pinned in advance. At the trusted sidecar handoff, the
application computes SHA-256 over the exact final bundle bytes and atomically
retains it in the generic immutable checker `Verification`, with the bundle
identity, checker and environment revision, profile, and context. Later reads
compare the bytes with that retained digest; the bundle never asserts its own
expected digest.

Let \(C\) be the immutable `ModelCall`, \(h\) the SHA-256 digest of its exact
raw-response UTF-8 bytes, \(s\) a half-open UTF-8 byte span, and \(R\) the
lossless `Representation` extracted from that span. The ordinary opaque atom

\[
D=\operatorname{ModelProduced}(C,h,s,R)
\]

records only the documentary claim that the finalized call returned that exact
proposal. `ModelProduced` is a display convention for an application atom, not
a new predicate language or domain entity. The substantive mathematical atom
\(F\) remains distinct.

If the model's production of the proposal itself participates in the warrant,
the context separately admits

\[
m:D,\qquad r:(D\to F),
\]

where \(m\) and \(r\) are justification variables. The basis for \(m\) names
the call, digest, span, and lossless representation. The bridge \(r\) names the
exact review or policy under which this particular proposal is used. The checker
may then derive

\[
r\cdot m:F.
\]

No provider-wide version of \(r\) is permitted. Provider and model identifiers
do not enter the constant specification, which remains reserved for logical
axioms.

The model call need not occur in the mathematical derivation. If the proposal
causes the mathematician to reconstruct a proof, retrieve a source, run a
computation, or obtain a formal check that directly warrants \(F\), the context
admits the independently based reason \(v:F\). The honest warrant is then
\(v:F\); the call remains attributed causal assistance in provenance and
`TaskEvidence`. The experiment must not manufacture \(D\to F\) merely to credit
the model.

Extraction creates no admission. Reported citations, computations, or proof
checks remain proposals until independently retrieved or run. Withdrawal of
\(m\) or \(r\) creates a successor context without rewriting the call,
representation, atoms, old context, or certificate. A paraphrase,
normalization, or edit is a separate representation derived from the lossless
span.

This reuse adds no `AITrust`, `AIWarrant`, `ModelAuthority`, generic support
edge, confidence score, acceptance flag, or other bespoke epistemic shortcut.
If acceptance or knowledge-production semantics are later required, they need a
separately specified justification-logic extension; they are not fields added
to `ModelCall` or `Representation`.

The Stage 1 reuse is accepted only when:

- the call, raw-response digest, span, and lossless representation identify one
  immutable documentary atom;
- \(m:D\) alone cannot derive \(F\);
- the displayed outcome is either an explicitly admitted and checked
  \(r\cdot m:F\) route or a no-bridge decision with the independently based
  \(v:F\) route actually used, or rejection or abandonment with no bridge and
  no warrant for \(F\);
- rejected or unused spans remain attributed proposals outside the active
  justification context;
- changing the call, digest, span, representation, bridge, or admission
  deactivates exactly the dependent current route without rewriting history;
  and
- ordinary orientation, study, and problem work require neither a model call
  nor logic entry.

## Acceptance and cut line

The slice is accepted when:

- every implemented rule belongs to the named logic profile;
- the displayed route exposes the formal-proof-policy and
  formal--manuscript bridges rather than laundering them through provenance or
  verification;
- changing the manuscript revision, formal environment, or a bridge admission
  deactivates the corresponding current route without rewriting history;
- the Lean checker rejects malformed certificates and unauthorized
  constant-specification steps;
- Python bundle validation rejects schema, profile, dependency, or expected
  digest mismatches without attempting to check a derivation;
- the existing Appendix A commands and tests are unchanged in behavior;
- no Lean installation, logic entry, model call, or questionnaire is required
  for orientation and informal study; and
- the retained route materially helps reconstruct or inspect the theorem's
  warrant in later mathematical work.

The first slice determines the useful representation, interface, and scope of
the warrant layer. Failure of a particular interface or bundle format calls for
revision or a halt to expansion; it does not collapse provenance,
verification, and warrant back into one status.

No JAM, general `why` database, corpus-wide justification graph, model-call
requirement inside the Appendix A slice, Stacks/Kerodon change, or
nonmathematical application belongs to this slice. The subsequent Stage 1 reuse
above is a separate fixture over the same generic checker.
