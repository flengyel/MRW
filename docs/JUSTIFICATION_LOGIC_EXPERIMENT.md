# Checking justification derivations

GOLEM XIV checks how reasons for using a result compose under stated premises.
A source passage, computation or Lean check can supply grounds for admitting
a premise. The admission records who accepted those grounds and in which
context. [Euclid's lemma](JUSTIFICATION_EUCLID_EXAMPLE.md) illustrates two
derivations with different premises. The [reader guide](JUSTIFICATION_WORKFLOW.md)
describes how to inspect them.

## Logical basis

The checker implements the non-factive system $J_0$ and its extension
$J(CS)$ by a named constant specification $CS$. The syntax and rules follow
Sergei Artemov and Melvin Fitting, *Justification Logic: Reasoning with Reasons*
(Cambridge University Press, 2019), [Chapter 2](https://doi.org/10.1017/9781108348034.003)
and [Chapter 3](https://doi.org/10.1017/9781108348034.004).

The terms and formulas are given by

$$
t ::= x \mid c \mid (t\cdot t) \mid (t+t)
$$

$$
F ::= P \mid \bot \mid (F\to F) \mid t:F.
$$

Here $x$ is a justification variable, $c$ a justification constant, and $P$
an opaque claim atom with a fixed identity and content hash. The assertion
$t:F$ says that $t$ is a justification for $F$. An atom's mathematical
content is given by its linked representations.

The rules include the classical propositional basis, modus ponens, contextual
premises, Application and Sum. Application derives $(s\cdot t):G$ from
$s:(F\to G)$ and $t:F$. Either $s:F$ or $t:F$ suffices to derive $(s+t):F$.
The calculus is non-factive. The assertion $t:F$ alone does not imply $F$.

A constant specification $CS$ consists of assertions $c_n:\cdots:c_1:A$,
where $n\geq1$, the $c_i$ are justification constants, and $A$ is an axiom
instance. Each positive-depth suffix of a member must also belong to $CS$.
An axiomatically appropriate specification supplies a constant for every axiom
instance and extends each member by a further constant. Such a specification
is infinite. [Artemov, *The Logic of Justification*, p. 484](https://sartemov.ws.gc.cuny.edu/files/2014/01/RSL2008.pdf).

For $J(CS)$ the [checker](../lean/MRW/Justification/ConstantSpecification.lean)
accepts a finite list with unique identifiers and distinct formulas. It checks the axiom
at the end of each chain and closure under positive-depth suffixes. A
certificate records the members used in the derivation. This list of
dependencies need not itself be closed under suffixes. The reader uses $J_0$
and its [bounded Application search](JUSTIFICATION_ROUTE_SEARCH.md) introduces
no constant-specification members.

### Proposed semantics

In a justification awareness model, $\mathsf A(t,F)$ and $\mathsf{KP}(t,F)$
classify a justification for $F$ as accepted or knowledge-producing,
respectively. The checker does not implement these predicates. The underlying
basic $J(CS)$-model $*$ has an axiomatically appropriate $CS$. The
requirements include the fairness biconditionals
$\mathsf A(c,F)\leftrightarrow c:F\in CS$ and
$\mathsf{KP}(c,F)\leftrightarrow c:F\in CS$, both application closures

$$
\mathsf A(s,F\to G)\land\mathsf A(t,F)\Rightarrow
\mathsf A(s\cdot t,G)
$$

and

$$
\mathsf{KP}(s,F\to G)\land\mathsf{KP}(t,F)\Rightarrow
\mathsf{KP}(s\cdot t,G),
$$

plus $\neg\mathsf A(t,\bot)$ for every term $t$ and
$\mathsf{KP}(t,F)\Rightarrow\models_*F$, as stated in
[Chapter 11](https://doi.org/10.1017/9781108348034.012). There is no general
sum-closure condition in that definition. The valuation of every opaque atom
in $*$ must be fixed independently of a proposed $\mathsf{KP}$
classification; it is a model parameter, not a declaration of mathematical
truth.

## Related implementation

[Eigenius](https://eigenius.io/docs/platform/justification-logic/) applies Artemov's justification
logic to scientific records. Its [evidence definitions](https://github.com/eigenius/eigenius/blob/1c0879c3acd1bb6d06f5c5dde97fc2e928f82efc/ontologies/justification/justification.esl)
retain grounds for a claim and compose them through application and alternatives.
Its tutorial distinguishes checking those grounds from proving the claim. This
is a reference for GOLEM XIV's source and inference design; the logical specification
above remains authoritative for GOLEM XIV.

## Grounds and admissions

GOLEM XIV records six distinct kinds of information.

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

## Versioned records

- `ClaimAtomVersion`: an immutable atom identity linked to one or more exact
  representations;
- `JustificationProfile`: the named calculus, syntax and rule versions, named
  constant specification required for $J(CS)$ and absent for $J_0$, and
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
itself. For a packaged bundle the expected digest is kept in the Python
package. For a runtime bundle the application computes a digest over the bytes
returned by the Lean checker and stores it in the immutable `Verification`,
with the bundle identity, environment, profile and context. On reopening the
bundle, Python compares its bytes with that digest.

## Formal proof and manuscript

Let $K$ say that a specified Lean check succeeded, $F_L$ denote the judgment
checked, and $F_M$ the statement in the manuscript. Suppose the context
contains the following three admissions.

- $k:K$ records the check, with its environment and output.
- $p:(K\to F_L)$ records the policy under which that check warrants the formal judgment.
- $a:(F_L\to F_M)$ records the reviewed implication from the formal judgment to the manuscript statement.

Application gives $(p\cdot k):F_L$ and then $(a\cdot(p\cdot k)):F_M$.
This derivation uses no constant-specification axiom and is valid in both
profiles with the same premises. It establishes neither the converse
$F_M\to F_L$ nor the identity of the two statements. Withdrawing the third
admission removes this route to the manuscript statement while preserving the
route to the formal judgment.

## Checker and interface

[The certificate checker](../lean/MRW/Justification/Certificate.lean) validates
each node against the context, logical axioms, constant specification or
earlier steps as its rule requires. Its soundness theorem,
`checkCertificate_sound`, gives a derivation of the conclusion in the
specified profile and context for every accepted certificate.

To build and run the tests with the toolchain pinned in `lean/lean-toolchain`,
run the following from the repository root.

```sh
cd lean
lake build
lake test
```

The Python application validates the bundle schema, profile, dependencies and
expected digest before displaying the derivation. The
[bounded route search](JUSTIFICATION_ROUTE_SEARCH.md) finds Application routes
from admitted premises. The reader can inspect the admissions and their
external bases, the derivation and its dependencies. Withdrawing a premise
changes the active context and preserves the earlier derivation.

## Executable offline documentary bridge

A saved model response can serve as the basis for a claim about what the model
returned. The commands project the quotation, admit the assertion and check
its derivation.

1. `project-response` validates a finalized `ModelCall`, its exact raw-response
   UTF-8 digest, and a lossless half-open byte span. It freezes the corresponding
   `Representation` and constructs the documentary atom $D$ for the claim that
   the model returned those bytes. It creates no premise.
2. `admit-documentary` is the explicit action that creates the admission
   $m:D$. Its basis names the exact call, digest, span, and representation; its
   operational request has `checked_at: null`.
3. `check-documentary` repeats Python's strict digest, span, assertion-hash, and
   cross-link validation, rejects a pre-stamped request, stamps canonical UTC
   from the application clock, and enforces ModelCall finalization ≤ admission
   ≤ check. It verifies the pinned Linux x86-64/WSL source, compiled module,
   and executable identities, then runs the repository-owned Lean executable.
   Its internal transport command is
   `justification_bundle --documentary-warrant REQUEST --stdout`. Lean treats
   atom hashes as opaque identities and constructs and checks a one-node
   contextual-premise certificate whose conclusion is $m:D$; the raw transport
   executable is not an independent provenance-hash validator.
4. Python captures that single emitted byte stream, retains it as the runtime
   bundle, and creates the generic immutable checker `Verification` from those
   same bytes. The external `Verification` records the actual checker-handoff
   time separately from the earlier admission and context time. The bundle
   contains no expected digest of itself.

### Documentary response commands

Use an existing finalized `ModelCall`, fresh record IDs and new output files.
Choose a passage from the retained response. The commands operate offline.
`UTC_ADMISSION_TIME` must be the actual admission time, at or after the call's
finalization and no later than the subsequent check.

```sh
mrw review-response MODEL_CALL
mrw review-response MODEL_CALL --passage PASSAGE_NUMBER

mrw project-response MODEL_CALL --passage PASSAGE_NUMBER \
  --representation-id REPRESENTATION_ID --claim-id DOCUMENTARY_CLAIM_ID \
  --output NEW_PROJECTION_JSON

mrw admit-documentary NEW_PROJECTION_JSON \
  --fixture-id RUN_ID --context-id CONTEXT_ID --admission-id ADMISSION_ID \
  --admitted-by-kind person --admitted-by-id ACTOR_ID \
  --at UTC_ADMISSION_TIME --rationale RATIONALE --scope SCOPE \
  --derivation-id DERIVATION_ID --output NEW_ADMISSION_JSON

mrw check-documentary NEW_PROJECTION_JSON NEW_ADMISSION_JSON \
  NEW_PACKAGE_DIRECTORY --lean-root PATH_TO_LEAN_PROJECT

mrw show-documentary NEW_PACKAGE_DIRECTORY
```

Projection retains the selected bytes and attribution without admitting a
premise. Admission explicitly records only the documentary assertion.
`check-documentary` validates the bindings, invokes this repository's pinned
Lean checker and retains a new package; its destination must not exist.
To inspect the Lean transport directly, use the stamped `package/request.json`
retained by a successful check.

```text
cd lean
lake exe justification_bundle \
  --documentary-warrant PATH/TO/package/request.json \
  --stdout
```

The projection and checker-request files serialize the `ModelCall`, `Representation`, `ClaimAtomVersion`,
`PremiseAdmission`, `JustificationContext`, and `JustificationDerivation`
records.

## What a model response supplies

Given the documentary admission, the offline checker verifies a derivation
of $m:D$. A trial of its mathematical use with a live provider remains open.

Let $C$ be the immutable `ModelCall`, $h$ the SHA-256 digest of its exact
raw-response UTF-8 bytes, $s$ a half-open UTF-8 byte span, and $R$ the
lossless `Representation` extracted from that span. The ordinary opaque atom

$$
D=\mathrm{ModelProduced}(C,h,s,R)
$$

records only the documentary claim that the finalized call returned that exact
proposal. `ModelProduced` is a display convention for an application atom, not
a new predicate language or domain entity. The substantive mathematical atom
$F$ remains distinct.

If the model's production of the proposal itself participates in the warrant,
the context separately admits

$$
m:D,\qquad r:(D\to F),
$$

where $m$ and $r$ are justification variables. The basis for $m$ names
the call, digest, span, and lossless representation. The bridge $r$ names the
exact review or policy under which this particular proposal is used. The checker
may then derive

$$
r\cdot m:F.
$$

No provider-wide version of $r$ is permitted. Provider and model identifiers
do not enter the constant specification, which is reserved for logical axioms.

The model call need not occur in the mathematical derivation. If the proposal
causes the mathematician to reconstruct a proof, retrieve a source, run a
computation, or obtain a formal check that directly warrants $F$, the context
admits the independently based reason $v:F$. Record the call and its contribution in provenance and
`TaskEvidence`. This derivation of $v:F$ uses no premise about the call.

Extraction creates no admission. Reported citations, computations, or proof
checks remain proposals until independently retrieved or run. Withdrawal of
$m$ or $r$ creates a successor context without rewriting the call,
representation, atoms, old context, or certificate. A paraphrase,
normalization, or edit is a separate representation derived from the lossless
span.
