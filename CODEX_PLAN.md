# CODEX_PLAN.md

Plan for the first experimental implementation (Stages −1 through 5), including
one bounded justification-logic slice inside the Appendix A experiment, and a
separately authorized later large-corpus experiment (Stage 6). It inherits the
purposes in `VISION.md`, the entities and invariants in `DOMAIN_MODEL.md`, and
the workflows in `UX_SPEC.md`.

## Governing constraint

The first experimental implementation begins with a substantive mathematical
task. It may not require schema population, a context questionnaire, a
declaration inventory, or a written account of comprehension before an attempt
begins.

Two initial experiments test distinct functions:

1. mathematical re-entry and optional informal/formal correspondence using
   `rs_Appendix_A.tex`, the corresponding Lean declarations, and
   `Lean/docs/AppendixA.md`;
2. problem-centered study in a source with little or no formalization.

Implementation was authorized on 2026-08-25 with Appendix A first. Its first
executable operation is top-down orientation in `rs_Appendix_A.tex`, followed by
selection and study of a result. No session record precedes orientation. The
same Kallenberg order governs the later problem-centered experiment: book or
chapter purpose and organization; central concepts, results, and problem
families; selected problem; proposed method; detailed proof, calculation, or
construction.

Infrastructure is added only when one of these sessions requires it. Evidence
comes from the `WorkArtifact`s and `TaskEvidence` produced by the sessions, not
from asserted states of comprehension.

## Initial-implementation non-goals

Stages 0 through 5 do not attempt:

- general corpus ingestion or complete ingestion of any large reference;
- comprehensive coverage of either experimental source;
- formalization of the problem-centered source;
- a domain map authored before mathematical work begins;
- questionnaires, confidence ratings, or comprehension forms;
- automated correctness decisions for informal proofs;
- a GUI platform, component library, or framework commitment;
- Mathlib-scale Lean analysis;
- simultaneous support for multiple model services, autonomous follow-up calls,
  or a general chat interface;
- encoding the 29-decision taxonomy or predictive-framework schema developed
  for science and engineering [@priceDetailedCharacterizationExpert2021;
  @wiemanHowBecomeSuccessful2022];
- a corpus-wide justification graph, factive justification profile,
  Justification Awareness Model, Fitting semantics, introspection,
  multi-agent epistemic model, or acceptance questionnaire;
- multi-user operation, synchronization, accounts, or deployment.

AI-generated theorems, proofs, explanations, and examples may be studied with
their provenance and verification status. Task-mediated model assistance is
required in Stage 1 because the assistant's-assistant claim is one of the claims
being tested. The first implementation makes one provider request per explicit
user action to one configured model, preserves each `ModelCall` and any raw
response, and records relevant extracted mathematical content as AI proposals.
When selected output participates in a warrant, it uses the existing generic
claim atoms, premise admissions, contexts, and checked justification
derivations; extraction and proposal disposition never create a premise. It
defines only the narrow provider boundary needed to keep canonical records
independent of provider-specific request types; it does not add another adapter,
service selection, routing, or AI-specific trust structure.

## Target

Complete both experimental sessions in `UX_SPEC.md` §9:

- re-enter the mathematics in `rs_Appendix_A.tex`, continue mathematical work,
  and inspect the corresponding Lean declarations and
  `Lean/docs/AppendixA.md` only where they are relevant;
- solve, resume, and later reconstruct selected problems from an unformalized,
  problem-centered source.

The Appendix A target is executed first. It tests reconstruction of prior work
and, only when useful, maintenance of explicit informal/formal relations. The
problem-centered target tests learning, task-mediated model assistance, and
retention. It includes at least one bounded model call attached to an actual
obstruction in the work. Success in either does not establish success in the
other.

The justification-logic work is a bounded vertical slice of the Appendix A
target, not a third corpus experiment. It begins only after the active task has
reached and reviewed the exact selected manuscript--Lean correspondence.

---

## Stage −1 — Repository

**Goal.** Establish the design baseline in one place.

**Completed baseline.** A repository containing `README.md`, `VISION.md`,
`VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`, and `CODEX_PLAN.md`. The README
identified the role of each design document and described the planned first
implementation as experimental. Implementation began only after a later,
separate authorization.

**Non-goals at completion.** No package layout, dependency manifest, CI,
application skeleton, or implementation of any kind.

**Why at all.** These six files form the design baseline against which later
stages will be evaluated.

---

## Stage 0 — Orient in and work the benchmark mathematics

**Goal.** Establish the book or chapter's purpose and organization and its
central concepts, results, and problem families; then select a small coherent
problem cluster from an algebraic number theory text and work on it before
designing storage or navigation around it. No application code for this stage.

**Deliverable.** The mathematical artifacts that ordinary work produces: TeX
proofs or attempts, Sage calculations and diagrams where useful, exact source
locations, and the unresolved step at which work stopped. Also list the system
operations that would have helped during the work, such as locating a
prerequisite, restoring a prior attempt, checking an example, or requesting a
bounded hint. For at least one actual obstruction, identify the mathematical
request and the minimal source and work context that Stage 1 should send to a
model. This list describes operations, not an internal state.

**Acceptance.** The orientation precedes problem selection. At least one
theoretical problem and one computational or example-driven problem have been
attempted. The proposed first problem workflow can be specified from observed
needs without requiring preliminary classification by the mathematician.

**Non-goals.** No YAML front matter, object inventory, domain-map population,
formalization, comprehensive chapter summary, schema, database, parser, or
framework.

**Checkpoint.** If the design cannot support these attempts without preparatory
data entry unrelated to the mathematics, revise the workflow and domain model
before implementation.

---

## Stage 1 — Minimal support for oriented problem work

**Goal.** Support the problem-centered session of `UX_SPEC.md` §9.1 on the Stage
0 cluster.

**Deliverable.** A local experimental application that can:

- open a selected problem with a stable source locator;
- show the relevant definitions, results, examples, and earlier problems;
- open or attach the ordinary work file used for the attempt, whether a TeX
  file, Sage worksheet, or diagram;
- request graduated assistance from one configured model;
- before transmission, show a compact disclosure of the provider, requested
  model, exact versioned source passages and work artifacts selected, and input,
  output, and timeout limits; derive the disclosure from the task, allow context
  removal, and require no purpose or provenance form;
- exclude other workspace history and private notes by default and transmit
  nothing in the background;
- create at most one provider request per explicit user action, with no provider
  tools, automatic retry, or recursive request; record any user-requested retry
  or follow-up as a new `ModelCall` linked to its predecessor;
- preserve every application-supplied instruction and message, requested and
  resolved model identifiers, adapter version, limits, non-secret settings,
  status, response identifier when supplied, and raw response in the
  `ModelCall`, together with the SHA-256 digest of the exact raw-response UTF-8
  bytes;
- define `raw_response` for the first adapter as the exact Unicode mathematical
  response text after transport decoding and before trimming, normalization,
  parsing, or extraction; accept one text payload and do not project unsupported
  multipart or non-text output into a warrant;
- request disabled API response storage when the service supports it, record the
  setting, display any provider retention that cannot be disabled before
  submission, and avoid claiming that this controls every form of provider
  processing or retention;
- provide a deterministic local response-review and selection view that keeps
  attribution
  visible, initially indexes passages rather than flooding the terminal, and
  lets the mathematician select visible exact text without entering byte
  offsets; compute and validate digest-anchored UTF-8 spans internally;
- render every record-derived string through an exact safe terminal renderer;
  emit no terminal hyperlink escapes and never interpret or dispatch returned
  markup, commands, or URLs, while preserving the recorded response unchanged;
- extract only proposals that enter the work or whose correction, rejection, or
  abandonment is recorded, each with
  `Provenance.origin = ai_proposal`, a lossless half-open UTF-8 byte span
  anchored to the response digest, and a link to its `ModelCall`;
- preserve only candidate routes explicitly returned by the provider or
  recorded by the mathematician in `WorkArtifact`s; never claim to retain hidden reasoning,
  chain of thought, internal search, or unreturned alternatives;
- retain any paraphrase or synthesis as a separate derived representation
  linked to its lossless selected sources; a model-produced synthesis requires
  another explicit linked `ModelCall`;
- keep source suggestions proposed until the cited material is independently
  retrieved and identified, and keep reported calculations or checks proposed
  until separately performed or attested;
- for one selected response span, create the documentary opaque atom
  \(D=\operatorname{ModelProduced}(C,h,s,R)\), distinct from the substantive
  mathematical atom \(F\), using the generic `ClaimAtomVersion` record;
- admit \(m:D\) only when its exact call, digest, span, and representation are
  displayed as external basis; if the proposal itself is relied upon, admit the
  separately scoped bridge \(r:(D\to F)\) and check \(r\cdot m:F\) with the
  Task 4.2 \(J_0/J(CS)\) checker;
- when independent reconstruction, retrieval, computation, or formal checking
  instead supplies \(v:F\), preserve that direct warrant and leave the model
  call outside the mathematical derivation;
- treat model output as untrusted content, with no executable markup, command
  execution, link opening, tool invocation, or resubmission without a user
  action;
- keep credentials in secret configuration and exclude them from model inputs,
  records, logs, exports, and error text;
- preserve each attempt, revision, computation, consulted source, proposal
  disposition, and check requested as `WorkArtifact`s and `TaskEvidence`.

The source material and problem relations may be entered only as needed for the
selected cluster. A complete subject model is not a prerequisite. The raw
mathematical response is preserved even if a small structured envelope is used
for status, citations, or suggested checks.

Stage 1 reuses the generic Task 4.2 justification checker after its pinned
profile and executable exist. It does not add a Python checker or an AI-specific
epistemic schema. If that checker has not been compiled and tested, Stage 1 may
preserve calls and proposals but may not describe a model-response documentary
derivation as checked.

**Implemented bridge-mechanics precursor.** Before the provider-backed Stage 1
trial, an executable offline path exercises the generic response-to-warrant
boundary. It validates a finalized call record and exact UTF-8 response span,
freezes the lossless `Representation`, constructs the canonical documentary
atom (D), and requires a separate explicit action to admit (m:D). The
existing Lean checker then checks a one-node contextual-premise certificate for
(m:D), emits a deterministic runtime bundle, and supplies the exact bytes
from which the generic external checker `Verification` is created. The path
creates no substantive (F), no (D\to F) bridge, and no (r\cdot m:F)
route.

The public check path first repeats the strict Python digest, exact-span,
assertion-hash, and cross-link checks, then verifies the pinned Linux
x86-64/WSL identities of the Lean sources, compiled modules, and executable.
The application stamps the actual checker-handoff time in canonical UTC; the
external `Verification` and Lean check record use it separately from the earlier
admission and context time. The external record also binds the exact retained
projection and stamped request bytes. Lean treats atom hashes as opaque
identities and remains solely responsible for checking derivability; its raw
transport executable is not presented as an independent provenance-hash
validator.

Its regression fixture is declared synthetic test data. Passing it establishes
serialization, integrity, and checker integration only. It is not the required
provider request at a genuine obstruction, a proposal disposition, evidence of
subsequent mathematical progress, or Stage 1 acceptance.

**Implemented provider-infrastructure precursor.** One bounded OpenAI Responses
adapter is implemented as a low-level developer integration surface. It
previews and freezes one exact request, requires explicit `SEND`, makes at most
one non-retried request with `store: false`, and retains a terminal `ModelCall`
without automatically projecting, admitting, or invoking Lean. Its transient
JSON envelope is intended to be generated later from active mathematical work,
not authored by the mathematician. This infrastructure does not execute or
complete the genuine-obstruction Stage 1 trial, which remains pending.

**Implemented response-review and selection precursor.** This executable bridge
increment operates only on completed, finalized local `ModelCall` records. It
makes no provider, network, tool, or Lean call. It validates the response digest
and shows attribution plus a deterministic numbered passage index.

For this increment, logical lines are separated only by LF (`U+000A`); an
immediately preceding CR (`U+000D`) belongs to the line terminator, while a
lone CR remains line content. After removing its LF or CRLF terminator, a line is
blank exactly when its content contains only ASCII space (`U+0020`) or
horizontal tab (`U+0009`). A passage is a maximal sequence of nonblank logical
lines. Its span begins at the first line's first code point and includes the
last nonblank line's terminator when present. Surrounding blank lines and their
terminators are excluded. Passages are numbered from 1 in source order. A
response with at least one nonblank logical line and no separating blank line is
one passage; an empty response or a response containing only blank lines has
zero passages and cannot be projected by passage number.

The CLI surface is `review-response MODEL_CALL`. With no selector it shows the
first index page. `--index-start N`, `--passage N`, and `--full` are mutually
exclusive. `project-response --passage N` selects the same computed span and
is mutually exclusive with its existing `--start-byte` and `--end-byte`
developer pair; otherwise both byte arguments remain required.

The default index shows at most 20 passages from a requested starting passage.
Each row puts trusted passage number, UTF-8 byte length, preview scalar count,
and truncation status before a one-line preview of at most the first 120 Unicode
scalar values. Variable-width attribution and request metadata use the same
120-scalar bound and trusted length/truncation-first framing; `--full` expands
only the raw response. One linear scan counts passages while retaining at most
the requested page or selected passage. Further rows require an explicit page
request. Explicit passage and full-response views may be longer.

Every record-derived string, including identifiers, provider and model names,
purpose, request text, and response text, is passed through one renderer. It
maps backslash (`U+005C`) to two ASCII backslashes. It maps each C0 control
(`U+0000`--`U+001F`), DEL (`U+007F`), C1 control
(`U+0080`--`U+009F`), and bidi control (`U+061C`, `U+200E`,
`U+200F`, `U+202A`--`U+202E`, and `U+2066`--`U+2069`) to
the ASCII form `\u{XXXX}`, using four uppercase hexadecimal digits. All other
Unicode scalars are emitted unchanged. Only application-constant framing
supplies control characters. The application emits no OSC-8 or other terminal
hyperlink escape, does not invoke a pager or Markdown renderer, and never
interprets, opens, or dispatches returned links, markup, or commands. A terminal
may still auto-link plain URL text.

The mathematician may select a displayed passage number; the application, not
the mathematician, computes the existing `project-response` span. Merely
viewing or cancelling creates no artifact. This increment also factors the provider-
independent private persistence needed by response-bearing records: mode
`0600`, synchronization, a held synchronized descriptor, descriptor-relative
atomic no-overwrite publication in a stable parent directory, verification that
the installed link names that inode, and failure cleanup. A mismatched new link
is removed only after its identity is verified. This local
filesystem boundary handles accidental and ordinary concurrent replacement,
not arbitrary compromise of the same Unix account.
A successful hard link remains the publication commit point. Every pre-link
failure leaves no destination; after link success, even a directory-sync failure
retains the complete destination, reports a durability error, and removes only
temporary, reservation, or other pre-publication artifacts.

Synthetic fixtures establish mechanics only. This increment does not select
the Stage 1 obstruction, create the active-task request envelope, make a live
request, infer a semantic classification, generate a summary, retrieve a
source, record a proposal disposition, admit a premise, invoke Lean, or satisfy
the genuine-obstruction trial. It is the local selection boundary through which
material may later enter the integral justification layer.

For the designated evaluation fixture, finalize the call, freeze the selected
response representation and admissions, and invoke the Lean justification
checker explicitly in its pinned build environment. The checker emits a
deterministic documentary-warrant bundle. At the trusted handoff, Python computes
SHA-256 over the exact final bytes and atomically retains it in the generic
immutable checker `Verification`, with the bundle identity, checker and
environment revision, profile, and context. Later validation compares the
bundle with that external digest; a runtime bundle cannot be package-pinned in
advance and never contains its own expected digest. Python renders the bundle
later; handling a model response never invokes Lean implicitly, and ordinary
problem work requires neither Lean nor logic entry.

**Acceptance.** A proof problem and a computational or example-driven problem
can each be attempted end to end. Both sessions begin with the Stage 0
top-down orientation; detailed attempts then begin with a selected problem,
work without any formal artifact, and require no comprehension form. At least one
model call is traceable from selected context and exact input through raw
response to a proposal that is used, corrected, rejected, or abandoned. No
generated claim becomes a source fact, verification, or human judgment
automatically. For one exact span, the system also records the documentary atom
and either checks an explicitly admitted \(r\cdot m:F\) route or records that no
AI-to-claim bridge was admitted and displays the independently based \(v:F\)
route used instead, or records rejection or abandonment with no warrant for
\(F\). Tests show that \(m:D\) alone cannot derive \(F\). Withdrawing an
admission deactivates only the dependent current route and preserves the call,
proposal, old context, and certificate. Ordinary mathematical sessions need not
make a model call; the required call exists to evaluate Stage 1.

**Non-goals.** No general ingestion, comprehensive topic map, formal theorem
analysis, graph rendering, support for a second model service or adapter,
automatic model selection, provider tools, autonomous calls, conversation
interface, prompt library, or framework commitment. No capture or reconstruction
of provider-internal reasoning, hidden chain of thought, internal search, or
unreturned alternatives. No `AITrust`, `AIWarrant`, `ModelAuthority`,
provider-wide truth bridge, generic support edge, or trust, reliability,
confidence, acceptance, correctness, authority, weight, integration, or
adoption field on model records.

---

## Stage 2 — Resumption and task-based retention

**Goal.** Resume interrupted work and test retention through later mathematical
performance.

**Deliverable.** Persistence of source location, current attempt, revisions,
computations, unresolved step, and assistance used; `ReviewItem`s derived from
the work; `ReviewState` generated from `TaskEvidence`.

Review tasks include reconstructing a proof, completing a gap, solving a related
problem, varying a hypothesis, producing an example or counterexample, and
repeating a Lean or Sage task. They do not request a confidence rating or a
written description of comprehension.

**Acceptance.** After an interruption, the exact unfinished mathematical step
can be resumed without recreating the surrounding context. After a later
interval, at least one solution is reconstructed or one related problem is
solved, and the resulting artifact updates `ReviewState` mechanically.

**Non-goals.** No scheduling-algorithm research, reference-string grading of
proof ideas, or manually asserted proficiency score.

**Checkpoint.** If stored context does not reduce the work required to resume,
remove or revise the records that failed to help. If a review task does not
exercise mathematics worth retaining, remove that task kind without treating
the result as evidence against the other functions.

---

## Stage 3 — Mathematical re-entry

**Goal.** Re-enter the mathematics of `rs_Appendix_A.tex` and continue
mathematical work after an interruption.

**Deliverable.** The Appendix A path first presents the appendix's purpose and
organization and its central concepts and results. It then selects a result and
proceeds through its role, statement, governing idea, proof skeleton, and
technical detail only as requested. Re-entry may begin from a mathematical
question, manuscript result, unfinished proof, or earlier `WorkArtifact` in
`rs_Appendix_A.tex`. Stable manuscript occurrences, relevant prior artifacts,
unresolved questions, and the source locations and relations needed to resume
are available. The corresponding Lean declarations and
`Lean/docs/AppendixA.md` are available only when relevant. Formal artifacts
remain optional and are not the initial object of the work.

**Acceptance.** The session reconstructs enough specific context to continue a
proof, calculation, exposition, or formalization task. The evidence is the
continued work product and its source use, not a report about comprehension.

**Non-goals.** No comprehensive reconstruction of the project, no requirement
to inspect Lean, and no discrepancy machinery yet.

---

## Stage 4 — Optional formal correspondence and discrepancy

**Goal.** Where corresponding Lean declarations exist, relate them to
`rs_Appendix_A.tex` occurrences and the mathematical work, then test whether
changes can be detected precisely.

**Task 4.0 — reconnaissance.** Run existing tools against the Lean declarations
corresponding to the selected manuscript material and inspect what they emit:
`lean4export`, `doc-gen4`, `ntp-toolkit`, and LeanArchitect. Consume existing
output unless a required formal fact is absent.

**Task 4.1 — minimal extraction, only if required.** Obtain declaration types,
signatures, dependencies, axiom usage, verification status, and environment
revision mechanically. Nothing parses Lean source in Python, and generated facts
are never hand-edited.

**Task 4.2 — bounded explicit-justification experiment.** Begin only after the
selected manuscript and Lean statements and their directional correspondence
have been reviewed. Implement the integral warrant subsystem in Lean as a deep
embedding of pure Artemov--Fitting \(J_0/J(CS)\) term and formula syntax,
immutable premise contexts, contextual Hilbert derivations, constant
specifications, and a decidable certificate checker. Prove that every accepted
certificate denotes a derivation in the represented profile. Do not modify the
Lean kernel or identify Lean proof terms with justification terms.

The Lean implementation is owned by this repository at `lean/` as a standalone
Lake project. Here `standalone` names its build and dependency boundary, not its
architectural status: the warrant subsystem is integral to Theorem Terminal.
Before executable checker code or a checked bundle is committed, pin and test
`lean/lean-toolchain`, `lean/lakefile.toml`, the source directory
`lean/TheoremTerminal/Justification/`, the fixture
`lean/TheoremTerminal/Justification/AppendixA.lean`, and the
`justification_bundle` executable. The canonical commands are:

```text
cd lean
lake build
lake env lean TheoremTerminal/Justification/AppendixA.lean
lake exe justification_bundle --output \
  ../src/theorem_terminal/data/appendix_a_justification.json
```

Also record and reproduce the exact check command in the pinned Categorical
Rice--Shapiro environment that supplies the external basis for \(K\). Stop Task
4.2 before code if that environment, command, and output are unavailable; a
source declaration or an entry in `Lean/check_axioms.lean` is reconnaissance,
not a run attestation.

Use these immutable opaque atoms:

- \(F_M\): the statement at
  `lem:range-lifting-pullback-section`, bound to the reviewed normalized
  manuscript revision;
- \(F_L\): the exact proposition of
  `Dom.exists_total_lift_iff_rangeLiftPullback_section`, bound to a frozen
  Categorical Rice--Shapiro repository and Lean environment; and
- \(K\): a claim describing one exact kernel attestation, including declaration
  type, repository revision, toolchain, imports, options, axiom report, and
  checked artifact identity.

Let \(k\), \(p\), and \(a\) be justification variables and record separate
contextual admissions

\[
k:K,\qquad p:(K\to F_L),\qquad a:(F_L\to F_M),
\]

and check

\[
a\cdot(p\cdot k):F_M.
\]

The checking record supplies the external basis for \(k\), but does not create
the formal-proof-policy bridge \(p\). The reviewed correspondence supplies
relevant basis for considering \(a\), but does not create that directional
implication automatically. The certificate is a \(J_0\) derivation because it
uses only contextual premises and \(J_0\) rules. It is therefore valid in every
\(J(CS)\) profile extending the same \(J_0\) syntax and rule version, with an
empty constant-specification footprint. Both profiles permit constants as
terms. Separate profile-boundary tests must reject a proof step tagged
`constant specification` in \(J_0\), accept it in \(J(CS)\) exactly when its
formula belongs to the named \(CS\), and permit the same formula as a contextual
premise in \(J_0\). They also reject a purported \(CS\) member that does not
terminate in an axiom instance and a membership representation that is not
closed under suffixes.

Emit one deterministic, versioned audit bundle only from a successfully checked
derivation. Ship that frozen bundle with the Python package and pin its exact
byte digest in code. Python validates the known bundle schema, profile, exact
source and environment bindings, and independently retained expected digest,
then renders `theorem-terminal why PATH/TO/rs_Appendix_A.tex`. This is a
cumulative, explicitly requested post-correspondence view that assumes no prior
command or hidden session state and restates the Kallenberg levels before the
warrant. Python does not reproduce the derivation checker. No hand-authored
placeholder may claim checked status. A clean wheel-install smoke test must
confirm that the frozen bundle and expected digest are package data and that
`why` works without a local Lean installation.

The emitted bundle does not serialize a digest of itself. Compute SHA-256 over
the complete final bundle bytes after emission and store the expected value in
separate Python package or code metadata. Validation compares those bytes with
that external value; neither the derivation nor the bundle owns its own digest.
This package-pinned rule applies to the frozen Appendix A fixture. A runtime
bundle in Stage 1 instead retains its handoff digest in the generic immutable
checker `Verification` as specified there.

**Deliverable.** Explicit correspondences between source occurrences and formal
artifacts, plus `Discrepancy` records for an identified mismatch. For Task 4.2,
also the Lean checker and soundness boundary, one checked Appendix A
certificate, its deterministic audit bundle, bundle-integrity and profile tests,
standard-library Python validation and rendering, and an explicit `why` command.
Formal and warrant views do not appear for objects without the corresponding
material.

**Acceptance.** A change such as renaming a declaration or adding a hypothesis
invalidates only the exact affected correspondence or source-linked claim. A
conceptual dependency is not rejected merely because it is absent from the
formal dependency graph. The warrant slice displays the derivation above and
labels it “derivable relative to these admitted premises and policy.” The Lean
checker rejects malformed certificates and unauthorized
constant-specification steps. Python bundle validation rejects schema, profile,
dependency, and independently retained expected-digest mismatches without
checking derivations. A successor context deactivates the dependent current
route while preserving the old checked certificate for its pinned context.
Existing `orient` and `study` behavior remains unchanged, and neither command
requires Lean, a warrant record, or user-authored logic.

**Non-goals.** No Mathlib-scale extraction, elaboration traces, proof-state
archive, automatic repair, notifications, or formal coverage outside the
selected region. No factivity, positive introspection, JAM, Fitting semantics,
quantifiers, multi-agent logic, corpus-wide warrant graph, confidence score, or
Python reimplementation of the checker.

**Checkpoint.** If existing tooling already supplies the required facts and
connections, use it and omit extraction work. If discrepancy detection produces
irrelevant conflicts, narrow or remove it. Task 4.2 determines the certificate
representation, serialization, interface, and appropriate scope for expansion.
If a particular form interrupts the mathematics or fails later reconstruction,
revise that form or halt expansion without collapsing provenance, verification,
admission, and derivability into generic support edges.

---

## Stage 5 — Evaluate the experiment

**Goal.** Decide which components helped actual mathematical work and which
should be removed or revised before another corpus is attempted.

**Deliverable.** An evaluation based on completed and abandoned
`WorkArtifact`s, `TaskEvidence`, source-recovery operations, `ModelCall`s,
outbound context, raw responses, proposals used or rejected, incorrect or
premature assistance, checked warrant paths, bridge admissions, successful
resumptions, and later mathematical tasks. No questionnaire about comprehension
is introduced.

**Acceptance.** Each component receives a decision supported by session
evidence: retain, revise, or remove. Model assistance is retained only if at
least one call improves subsequent mathematical work enough to justify its
correction, provenance, disclosure, and record-keeping costs. Stage 6 may begin
only after the problem-centered and Appendix A experiments have each been
evaluated on their own terms and the large-corpus experiment has been authorized
separately.

The offline documentary fixture cannot be counted as the required model call
or as evidence that assistance improved mathematical work.

The AI-to-warrant projection is retained only if the exact-span documentary
atom and explicit bridge make later inspection or reconstruction clearer than
the pre-existing `ModelCall`, proposal provenance, and `TaskEvidence` alone. An
honest no-bridge outcome is not a failure when independent work warrants the
mathematics; manufacturing a model-authority bridge would be a failure.

The separation of provenance, verification, premise admission, and contextual
derivability, and the source-faithful non-factive \(J_0/J(CS)\) basis, are
architectural commitments. Evaluation may revise or defer the certificate
representation, serialization, `why` interface, and scope of expansion; it must
not collapse the warrant layer into an untyped `supports` edge or another
information class.

**Non-goals.** No scale-up, production deployment, or claim that one successful
session establishes a general theory of mathematical understanding.

---

## Stage 6 — Large-corpus ingestion and study

**Authorization boundary.** This stage is not part of the first experimental
implementation. It may begin only after Stage 5 has been completed and the
large-corpus experiment has been authorized separately.

**Goal.** Test whether Theorem Terminal supports beginning and progressively
studying one large structured mathematical corpus, initially either the Stacks
Project [@stacksprojectauthorsStacksProject2021] or Kerodon.

**Deliverable.** Import the selected corpus's published hierarchy, stable
identifiers, cross-references, and revision information. Beginning from active
mathematical work, obtain and represent the statements, proofs, examples, and
surrounding context that the work requires. Preserve the ordered source
locations consulted, work artifacts, model assistance, unresolved questions,
and later reconstruction tasks.

**Acceptance.** Beginning from a subject-level question, a mathematician can
identify a coherent sequence of relevant source locations, study selected
material, perform associated mathematical work, resume after interruption, and
identify affected records after a source revision without manually classifying
the corpus in advance.

**Non-goals.** No semantic representation of the entire corpus, no preliminary
hand-authored subject map, no simultaneous ingestion of both the Stacks Project
and Kerodon, and no production-scale deployment.

---

## Manuscript prerequisite

The selected warrant experiment already has the stable manuscript locator
`lem:range-lifting-pullback-section`; no new label is required for Task 4.2.
Before correspondence maintenance expands to other positional entries in
`Lean/docs/AppendixA.md`, add `\label`s to the corresponding statements or
sections in `rs_Appendix_A.tex` and reference labels rather than line numbers.
The current correspondence contains roughly fifty positional references to a
manuscript that changes. This is a later manuscript edit; no exporter substitutes
for it.

---

## Not decided here

- Which initial algebraic number theory problem cluster to use.
- Whether the Stacks Project or Kerodon is selected for Stage 6 and which
  published interfaces provide its hierarchy, stable identifiers,
  cross-references, and revision information.
- Storage beyond the files needed by the first sessions.
- Whether the application edits TeX and Sage work directly or opens existing
  tools and records their artifacts.
- Which single model and service supplies Stage 1 assistance; the selection is
  configuration and every call records the exact model used.
- Whether later experiments should add tool-enabled calls, another model service,
  or analysis by research-decision type. None is a Stage 1 requirement.
- How the orientation view differs between a large problem-centered source and
  a small research project.
- Which relations are authored and which may be proposed from source structure
  and prior attempts.

## Order and stopping

Implementation is authorized. The execution order is:

1. Appendix A orientation and mathematical re-entry (Stage 3);
2. resumption of actual Appendix A work (the relevant part of Stage 2);
3. optional formal correspondence and, when explicitly requested after that
   correspondence is reviewed, the bounded Appendix A justification experiment
   (Stage 4);
4. top-down orientation and benchmark work in the problem-centered source
   (Stage 0), followed by only the application support that work requires
   (Stage 1);
5. evaluation of both experiments on their own terms (Stage 5).

Each checkpoint evaluates a specific component. Failure revises or stops that
component unless the evidence bears on the full thesis in `VISION.md`.

Stage 6 does not begin automatically after Stage 5. It requires a separate
decision authorizing the large-corpus experiment.
