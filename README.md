# Theorem Terminal

Theorem Terminal is a mathematical context system for learning, reconstructing,
integrating, and retaining mathematics. It is intended both for entering and
absorbing a large body of mathematics and for re-entering one’s own research, an
inactive project, or a subject not studied or taught for years.

It is an assistant's assistant. It preserves the mathematical work produced
while consulting source literature and using machine assistants, proof
assistants, and computer algebra systems: source locations, problems attempted,
proof drafts, computations, diagrams, examples, counterexamples, formal checks,
corrections, and provenance. When requested during active work, it may send a
bounded mathematical question and selected context to a configured model. The
request, the exact context sent, and the raw response are preserved
automatically. Material from the response is extracted only when it enters the
mathematical work or is separately studied. Each extracted proposal remains
linked to its exact response span and is recorded as an attributed AI proposal
rather than a fact or human judgment. `ModelCall` remains an operational
provenance record; it acquires no trust, support, correctness, confidence, or
acceptance field. If selected output later participates in a mathematical
warrant, Theorem Terminal uses the same generic justification-logic claim
atoms, premise admissions, contexts, and checked derivations used for every
other reason. The system can restore the state of an interrupted investigation
and select later mathematical tasks that test reconstruction or application. No
one assistant is the authority, and the system does not ask a mathematician to
report an internal mental state.

It is not a proof assistant, a Lean documentation browser, or a replacement for
mathematical judgment.

The design also adopts an explicit warrant layer for tasks that require more
than origin and checking status. A bounded Appendix A experiment uses
non-factive Artemov--Fitting justification logic to record how explicitly
admitted reasons compose. Source provenance, verification, admitted premises,
checked derivability, and human use or rejection remain distinct.

## Motivation

Mathematical context can be lost even when papers, notes, books, or formal
developments remain available. A mathematician may need to reconstruct the
purpose of a definition, the idea of an argument, the dependence of one result
on another, or the state of an unfinished proof. The same requirement arises at
different scales: entering a large corpus such as the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon; studying a problem-centered
text in which exercises develop the theory; returning to one's own research or
an inactive project; and teaching a subject after years away.

A source need not have a machine-checked counterpart, and a complete written
proof need not be present. In a problem-centered source, problems may supply
omitted proof steps, develop examples, establish computational familiarity, or
introduce the next result. Theorem Terminal should therefore support selecting
and solving problems, locating relevant definitions and prior results,
preserving attempts and computations, and resuming unfinished work.

AI adds two demands. It may increase the rate at which mathematical results,
proofs, formalizations, and examples are produced, and it can produce
mathematics that is correct or formally verified without being understood by
the mathematician receiving it. Understanding such a result requires
reconstructing the relevant human-developed mathematics from which current
systems learn and which the result uses or extends. Tao discusses both the
prospect of verified proofs without human understanding and the dependence of
mathematical AI on canonical theories developed and organized by mathematicians
[@taoMathematicsAgeAI2026].

Theorem Terminal supports learning, reconstruction, integration, and retention
across human- and AI-generated mathematics. AI increases the need and supplies
new forms of assistance; it did not create the underlying difficulty.

The design rests on six principles:

- Kallenberg's top-down approach to reading advanced mathematics provides
  orientation before detailed study. Depending on the source, the relevant
  detail may be a theorem, proof, worked example, or problem.
- A problem-centered source is studied through mathematical work. The system
  should help select problems, recover prerequisites, provide optional
  assistance, preserve attempts, and support later reconstruction without
  requiring preliminary data entry.
- Model assistance is requested from active mathematical work. The provider,
  requested and resolved model identifiers, exact submitted request, selected
  context, raw response, and every extracted proposal are recorded
  automatically. A proposal is not a fact or human judgment. No provider-wide
  trust rule or bespoke AI-support status converts it into a premise.
- Justification logic makes the composition of admitted reasons inspectable
  when an active task needs it. The initial non-factive `J0`/`J(CS)` layer does
  not turn a source, model response, formal check, or correspondence into truth;
  each transition requires a separate, versioned premise or bridge.
- Curry's account of mathematical language explains how mathematical discourse
  becomes more precise without attaining absolute precision; formalization
  relocates questions of interpretation into the definitions rather than
  eliminating them [@curryFoundationsMathematicalLogic1977, §1].
- Formal verification is optional and supplies one kind of evidence. A kernel
  check settles whether a proof is correct relative to stated definitions. It
  does not settle why a result matters, what its proof idea is, whether the
  formal statement expresses the intended mathematics, or whether the argument
  can be reconstructed and used.

## Status

Initial experimental implementation has begun. Its first executable path studies
`rs_Appendix_A.tex` in Kallenberg's top-down order. `orient` presents the
appendix's purpose and organization, central concepts and results, and a first
selected result without displaying its statement, proof, or formal counterpart.
`study` then reveals the selected result's role and statement; its governing
idea, proof skeleton, and detailed source proof appear only when requested.

The Appendix A study path is read-only and uses no model service, session
record, database, or network request. Interpretive guide text is marked as an
AI proposal; exact statements and proofs are identified as source text.
`orient` and `study` require no formal artifact and do not load one.

The bounded justification-logic increment in
`docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` is now executable. Justification logic
is an integral warrant subsystem of Theorem Terminal. Its syntax, selected
axiom profiles, contextual derivations, constant specifications, certificate
checker, and certificate-soundness theorem are implemented in the
repository-owned `lean/` Lake project. That Lean implementation checks one
explicit warrant route for `lem:range-lifting-pullback-section` and generates a
deterministic audit bundle. The Python package does not reimplement the
calculus: it retains the bundle's expected SHA-256 outside that bundle,
validates its schema and exact bindings without rechecking the derivation, and
renders it with
`theorem-terminal why PATH/TO/rs_Appendix_A.tex`. `why` is stateless: it
cumulatively presents the Appendix orientation, selected result's role and
statement, idea, proof skeleton, available technical detail, and reviewed
correspondence in Kallenberg order before the admitted premises and checked
warrant. Checker invocation is task-dependent. Running `why` from an installed
package does not require Lean because it consumes the packaged, already checked
bundle.

The first AI-integration bridge mechanics are now executable offline.
`project-response` validates a finalized `ModelCall`, including the SHA-256
digest of its exact raw-response UTF-8 bytes, and selects a lossless half-open
byte span whose endpoints must be UTF-8 boundaries. It writes an immutable
`Representation` projection and the canonical documentary atom
\(D=\operatorname{ModelProduced}(C,h,s,R)\). This operation creates no premise
admission.

`admit-documentary` is a separate, explicit action that creates a request
containing the documentary admission \(m:D\). It creates no substantive
mathematical atom \(F\), no bridge \(D\to F\), and no mathematical warrant
beyond the documentary claim.

`check-documentary` explicitly invokes the repository-owned Lean justification
checker in its pinned environment. Lean checks a one-node \(J_0\) certificate
whose conclusion is \(m:D\) relative to the displayed admission and emits a
deterministic runtime bundle. Python does not reimplement the calculus: it
captures the exact emitted bytes, computes their SHA-256 digest, and records the
artifact identity, checker and environment revisions, profile, context, and
digest in a generic immutable `Verification` outside the bundle.

This offline path establishes response binding, explicit admission, checker
reuse, and trusted runtime handoff. It makes no provider request and does not
satisfy the Stage 1 requirement for assistance at a genuine mathematical
obstruction. It supplies no evidence that model assistance improved
mathematical work.

One provider-backed operation is also implemented, but no live request is made
by installation or testing. `request-assistance` displays the exact bounded
OpenAI Responses API JSON and selected context, requires the user to type
`SEND`, makes at most one request with `store: false`, and atomically creates a
terminal `ModelCall`. Projection, admission, and Lean checking remain separate
explicit commands.

The local response-review and selection precursor is executable over completed
`ModelCall` records. It keeps attribution visible, indexes returned passages
deterministically, and lets the mathematician select visible exact text without
calculating byte offsets. It makes no model call, retrieves no source, performs
no automatic summary, admits no premise, and invokes no Lean process.
Justification logic remains the integral downstream warrant layer; it is not
required merely to view or discard a response. This precursor does not complete
Stage 1 or select its genuine mathematical obstruction.

The implementation is an experiment conducted through actual mathematical
work. It tests which source relations and work artifacts can be
preserved or generated mechanically, whether they support later reconstruction
and application, and whether one bounded call to a configured model supplies
useful assistance without displacing the mathematical attempt or creating more
record keeping than it saves. Evidence will come from attempted proofs, solved
problems, computations, reconstructions, and later use, not from forms asking
what a mathematician believes is understood.

## Install and run

The current implementation is a local command-line program requiring Python
3.11 or later. Installation must run from the repository root, where
`pyproject.toml` is located.

### Install on Windows PowerShell

```powershell
git clone git@github.com:flengyel/theorem_terminal.git
Set-Location theorem_terminal
py -3 --version
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
```

For an existing checkout, begin with `Set-Location` and then create or activate
the virtual environment.

### Install on macOS or Linux

```bash
git clone git@github.com:flengyel/theorem_terminal.git
cd theorem_terminal
python3 --version
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
```

### WSL2 and Codex

For the authorized WSL2 checkout, update `main`, enter the repository, and start
Codex there so it discovers the root `AGENTS.md`:

```bash
cd /home/flengyel/src/theorem_terminal
git pull --ff-only origin main
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
codex
```

The Lean and Lake installation already used by `/home/flengyel/src/PCats` can
supply Elan's toolchain and download cache. Theorem Terminal does not import or
execute the PCats Lake project for this bridge. Its own `lean/lean-toolchain`,
`lean/lakefile.toml`, and `lean/lake-manifest.json` pin the checker build:

```bash
cd /home/flengyel/src/theorem_terminal/lean
lake build
lake test
cd ..
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The current documentary-checker executable identity is pinned for Linux
x86-64, including WSL2. Do not substitute a binary from PCats or another Lake
project. A changed source, compiled module, or executable is rejected until the
repository's identity bindings are deliberately reviewed and updated.
Native Windows and macOS installations may still use `orient`, `study`, and the
packaged `why` view; this increment's runtime `check-documentary` identity is
Linux x86-64/WSL2 only.

### Locate Appendix A

The initial experiment reads `rs_Appendix_A.tex` from a separate checkout of
the private `flengyel/Categorical_Rice_Shapiro` repository. The source file need
not be copied into this repository. Assign its absolute path to a shell variable
so spaces in directory names are handled correctly.

If that repository is not already present, clone it in a chosen parent
directory:

```text
git clone git@github.com:flengyel/Categorical_Rice_Shapiro.git
```

Both repositories are private, so cloning requires GitHub authentication.

PowerShell:

```powershell
$appendixA = 'C:\path with spaces\Categorical_Rice_Shapiro\rs_Appendix_A.tex'
Test-Path -LiteralPath $appendixA
```

macOS or Linux:

```bash
appendix_a='/path with spaces/Categorical_Rice_Shapiro/rs_Appendix_A.tex'
test -f "$appendix_a"
```

### Run the Appendix A experiment

PowerShell:

```powershell
theorem-terminal orient "$appendixA"
theorem-terminal study "$appendixA"
theorem-terminal study "$appendixA" --through idea
theorem-terminal study "$appendixA" --through skeleton
theorem-terminal study "$appendixA" --through details
theorem-terminal why "$appendixA"
```

macOS or Linux:

```bash
theorem-terminal orient "$appendix_a"
theorem-terminal study "$appendix_a"
theorem-terminal study "$appendix_a" --through idea
theorem-terminal study "$appendix_a" --through skeleton
theorem-terminal study "$appendix_a" --through details
theorem-terminal why "$appendix_a"
```

If the installed console command is unavailable, use
`python -m theorem_terminal` in its place, for example:

```text
python -m theorem_terminal orient PATH/TO/rs_Appendix_A.tex
```

The commands reveal cumulative levels of detail:

- `orient` displays the appendix's purpose and organization, its central
  concepts and named results, and the first selected result. It omits theorem
  statements, proofs, and formal counterparts.
- `study` displays the selected result's proposed role and exact source
  statement. The prepared result is
  `lem:range-lifting-pullback-section`.
- `--through idea` also displays the proposed governing idea.
- `--through skeleton` also displays the proposed proof skeleton.
- `--through details` also displays the exact proof from the source.
- `why` first displays all of those mathematical levels and the reviewed
  informal--formal correspondence. It then displays exact claim versions,
  premise admissions and bases, the checked derivation, the pinned external
  Lean attestation, related source bindings, and the separate justification
  verification. Its conclusion is “derivable relative to these admitted
  premises and policy,” not a claim of truth, knowledge, or understanding.

`orient`, `study`, and `why` do not write to the manuscript, create a session
record, contact a model service, or invoke Lean. Only `why` reads the packaged,
Lean-generated Appendix audit bundle; `orient` and `study` remain independent
of it. The explicitly named bridge commands below write only their requested
artifacts. None contacts a model service; only `check-documentary` invokes Lean.

### Run the offline documentary bridge

This synthetic regression exercises the integration mechanics; it makes no
provider request, is not an actual assistance event, and supplies no evidence
of mathematical usefulness. Build the pinned Linux
x86-64/WSL checker first, then run from the repository root with the virtual
environment active:

```bash
cd lean
lake build
lake test
cd ..

bridge_demo="$(mktemp -d)"

theorem-terminal project-response \
  tests/fixtures/mechanical_model_call.json \
  --start-byte 17 \
  --end-byte 26 \
  --representation-id representation-mechanical-span-v1 \
  --representation-version 1 \
  --kind strategic_hint \
  --claim-id claim-model-produced-mechanical-fixture-v1 \
  --output "$bridge_demo/projection.json"

theorem-terminal admit-documentary \
  "$bridge_demo/projection.json" \
  --fixture-id ai-documentary-mechanical-fixture-v1 \
  --context-id ai-documentary-mechanical-context-v1 \
  --admission-id admission-ai-documentary-mechanical-v1 \
  --admitted-by-kind named_policy \
  --admitted-by-id ai-documentary-mechanical-policy-v1 \
  --at 2026-09-01T00:00:00Z \
  --reason-variable m \
  --rationale \
    'Admit only that this synthetic finalized-call fixture contains the exact span.' \
  --scope \
    'Mechanical regression only; no substantive mathematical claim is admitted.' \
  --derivation-id derivation-ai-documentary-mechanical-v1 \
  --output "$bridge_demo/request.json"

cmp "$bridge_demo/request.json" tests/fixtures/mechanical_admission.json

theorem-terminal check-documentary \
  "$bridge_demo/projection.json" \
  "$bridge_demo/request.json" \
  "$bridge_demo/package" \
  --lean-root lean

theorem-terminal show-documentary "$bridge_demo/package"
```

`project-response` requires a completed and finalized `ModelCall`, verifies the
SHA-256 of its exact raw-response UTF-8 bytes, and accepts a half-open byte span
whose endpoints must be UTF-8 boundaries. It creates a lossless
`Representation` and documentary atom \(D\), but no premise. The fixture's
span `[17, 26)` is the nine-byte text `α → β`. Those offsets expose the exact
persistence boundary for testing; they are not intended to be calculated by a
mathematician. The response-review operation computes them from a visible
passage selection.

Review a completed call locally with a bounded first index page, another page,
one complete passage, or the complete response:

```bash
theorem-terminal review-response MODEL_CALL
theorem-terminal review-response MODEL_CALL --index-start 21
theorem-terminal review-response MODEL_CALL --passage 1
theorem-terminal review-response MODEL_CALL --full
```

The three selectors are mutually exclusive. Index pages contain at most 20
rows, and each row previews at most 120 Unicode scalar values before safe
rendering. Record-derived backslashes, terminal controls, and bidi controls are
reversibly escaped as visible ASCII; the command emits no terminal hyperlinks,
invokes no pager or renderer, and does not interpret returned markup, commands,
TeX, or URLs. A terminal emulator may still auto-link plain URL text. Review is
read-only and needs neither `OPENAI_API_KEY`, network access, nor Lean.

Select the same exact passage through the existing documentary projection:

```bash
theorem-terminal project-response MODEL_CALL \
  --passage 1 \
  --representation-id REPRESENTATION_ID \
  --claim-id CLAIM_ID \
  --output projection.json
```

Passage mode derives the existing generic representation kind from the call's
purpose and rejects `--kind` or byte offsets. The developer byte interface
continues to require both offsets and `--kind`. Passage selection creates only
the existing lossless `Representation` and documentary atom; admission and Lean
checking remain separate explicit commands.

`admit-documentary` is the separate action that creates the explicit scoped
premise \(m:D\). It does not invoke Lean and creates no substantive \(F\),
\(D\to F\) bridge, or mathematical acceptance. Projection and request files
are created with no-overwrite semantics.

The admission request records `checked_at: null`. `check-documentary` first
repeats Python's strict response, span, assertion
hash, and cross-link checks. It then verifies every pinned checker source,
compiled module, and executable digest before invoking the repository-owned Lean
checker. Lean checks the one-node contextual-premise certificate and emits the
bundle once on standard output. The command atomically retains
`projection.json`, `request.json`, the exact `bundle.json` bytes, and a separate
generic `verification.json` in the destination directory. Immediately before
invoking Lean, the application—not the caller—stamps canonical UTC
`checked_at`; the retained request, Lean's embedded check record, and the
external `Verification` agree on that handoff time, separately from the earlier
admission time. The external record also binds the exact retained projection
and stamped request bytes. Existing destinations are refused.

`show-documentary` reloads and revalidates those four files without invoking
Lean and deliberately does not display the model's prose. The raw Lean
`--documentary-warrant` interface is an internal transport boundary: Lean
treats claim hashes as opaque atom identities, while the public Python path
establishes the response and assertion hashes before Lean checks derivability.
The retained digest detects changes relative to the immutable external
`Verification`; it is not a digital signature and does not authenticate a
maliciously replaced persistence store.

### Create one finalized OpenAI ModelCall

The current integration surface consumes a low-level developer integration
envelope containing only existing request-side `ModelCall` information. This
transient JSON is intended eventually to be generated from the active task;
mathematicians should not author it, and it is not yet the task-facing live
workflow. A later task-facing operation must derive the initiator, target,
purpose, context references, and limits from the active mathematical work. The
envelope has exactly these fields:

```json
{
  "initiated_by": "person-id",
  "target": {"kind": "WorkArtifact", "id": "attempt-id"},
  "purpose": "strategic_hint",
  "request_text": "The mathematical assistance requested.",
  "context_refs": [
    {"kind": "WorkArtifact", "id": "attempt-id", "revision": "revision-id"}
  ],
  "effective_input": {
    "instructions": "Optional exact application instruction.",
    "input": [
      {
        "role": "user",
        "content": [
          {"type": "input_text", "text": "Exact transmitted mathematical context."}
        ]
      }
    ]
  },
  "limits": {
    "max_request_body_bytes": 262144,
    "max_provider_response_bytes": 1048576,
    "max_output_tokens": 800,
    "timeout_seconds": 60
  },
  "in_reply_to": null
}
```

This is operational input, not a persistent domain schema. `instructions` may
be omitted, and `input` may instead be one nonempty string. The adapter accepts
only text input. Configure the requested model on the command line:

```bash
export OPENAI_API_KEY='...'
theorem-terminal request-assistance prepared-request.json \
  --model MODEL \
  --output model-call.json
```

Before any network operation, the command checks the prepared input, model,
limits, credential presence, and output destination, then freezes and displays
the exact UTF-8 body. The preview includes the fixed endpoint, requested model,
non-secret `Content-Type` header, complete body, context references,
instructions and input, all limits, and destination. Only the exact token
`SEND` authorizes transmission; any other input or interruption creates no file
and sends nothing.

The adapter makes one `POST` to `https://api.openai.com/v1/responses`. The body
allowlist is `model`, optional `instructions`, `input`, `max_output_tokens`, and
`store` fixed to `false`. The authorization header is constructed from
`OPENAI_API_KEY`; the credential is excluded from previews, records, and error
text. Tools, streaming, background mode, remote prompts, previous-response and
conversation state are absent by construction. Redirects and retries are
disabled.

A completed call requires exactly one assistant message with exactly one
nonempty `output_text` block. Auxiliary reasoning items are ignored. Refusals,
incomplete responses, and unsupported output shapes produce terminal
`refused` or `incomplete` records; HTTP, transport, timeout, decoding, and
malformed-response failures produce terminal `failed` records after
transmission when the record can be retained. No error response body is printed.
Every terminal file is flushed, synchronized, and installed atomically without
overwriting an existing or concurrently created destination; temporary files
are removed on success and failure. The atomic link is the publication commit
point. If the subsequent directory durability sync fails, the command reports
that failure while retaining the complete, file-synchronized destination.

The resulting completed file is directly consumable by `project-response`. Nothing in
`request-assistance` automatically projects output, admits a premise, invokes Lean,
or treats the returned text as mathematics. OpenAI's handling of API data is
governed by its current
[data controls](https://developers.openai.com/api/docs/guides/your-data);
`store: false`, as documented for the
[Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses),
disables response retrieval storage but is not presented as control over every
kind of processing or retention.

The system records only the API-visible text accepted by its explicit response
contract. OpenAI documents that raw reasoning tokens are not exposed through
the API and that optional reasoning summaries are summaries rather than raw
chain of thought
([reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)).
This adapter sends no reasoning-summary parameter and ignores auxiliary
reasoning items. Theorem Terminal never labels a returned explanation or
summary as raw chain of thought, reconstructs hidden reasoning, or claims access
to provider-internal search.

Automated tests inject confirmation, IDs, clocks, persistence, and byte-level
HTTP transport. They make no live OpenAI request. A successful completed file
may then be passed explicitly through the unchanged sequence
`project-response` → `admit-documentary` → `check-documentary`.
This adapter infrastructure does not complete Stage 1; the genuine-obstruction
mathematical trial and its live request remain pending.

### Reviewed source revision

The interpretive guide has been reviewed for the normalized SHA-256 revision

```text
51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945
```

Line-ending differences between Windows and Unix checkouts are normalized. Any
other source change causes `orient`, `study`, and `why` to exit with status 2
rather than present an unreviewed guide. Review the changed mathematics, revise
the guide and its tests when necessary, and only then update the reviewed
digest and any affected warrant bindings.

### Verify the checkout

From the repository root with the virtual environment active:

```text
python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The packaged audit bundle is
`src/theorem_terminal/data/appendix_a_justification.json`. Its complete final
bytes have expected SHA-256

```text
3ca6794e8e9f2ec6f7d6bd08662ac19df2a4496287e8559aec556b3febdd81ed
```

The bundle contains no digest of itself. The expected value and the selected
profile, context, checker, environment, attestation, and source bindings are
retained separately in Python code. A digest match detects replacement relative
to that retained value; it is not a signature.

Maintainers with the pinned Lean toolchain can reproduce the checker and bundle
from the repository root:

```text
cd lean
lake build
lake test
lake env lean TheoremTerminal/Justification/AppendixA.lean
bundle_check_dir="$(mktemp -d)"
lake exe justification_bundle --output "$bundle_check_dir/first.json"
lake exe justification_bundle --output "$bundle_check_dir/second.json"
cmp "$bundle_check_dir/first.json" "$bundle_check_dir/second.json"
sha256sum "$bundle_check_dir/first.json"
cmp "$bundle_check_dir/first.json" \
  ../src/theorem_terminal/data/appendix_a_justification.json
```

On macOS, use `shasum -a 256` in place of `sha256sum`.

The generated file and its external expected digest must be updated only after
the full build, fixture check, deterministic double export, and identity audit
succeed. Ordinary installation and use of `why` require none of these commands.

The same order will govern a later experiment with Daniel A. Marcus's *Number
Fields*: orient in the book or chapter and its central concepts, results, and
problem families before selecting a problem.

## Documents

- `VISION.md` — why the project exists.
- `VOCABULARY.md` — controlled terminology used across the design documents.
- `DOMAIN_MODEL.md` — entities, information classes, and invariants.
- `UX_SPEC.md` — the mathematical workflow the system supports.
- `CODEX_PLAN.md` — staged implementation plan.
- `AGENTS.md` — instructions for Codex and other coding agents.
- `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` — the bounded warrant-composition
  experiment and its cut line.

## First corpus

The first corpus is `flengyel/Categorical_Rice_Shapiro`, which is private and
not publicly readable. The named mathematical re-entry and
informal/formal-correspondence test uses `rs_Appendix_A.tex`, the corresponding
Lean declarations, and `Lean/docs/AppendixA.md`. Together they provide a
mathematical manuscript, a formal development, mechanically available
dependency and axiom information, and an existing record of expert
correspondence judgments. A formal counterpart remains optional for every other
corpus.

The hand-written document records expert judgments absent from both the
manuscript and the Lean development: which hypotheses proved unnecessary,
which structures are derivable rather than postulated, and where the same term
has different meanings in different parts of the development. Its positional
references become obsolete as either source changes. The experiment will test
which locators, dependency lists, and checking facts can be regenerated
mechanically; which proposed correspondences can be checked during mathematical
work; and which assessments require mathematical judgment.

The justification-logic slice uses the same selected Appendix A result only
after its mathematical role, statement, proof structure, and relevant formal
counterpart have been inspected. It tests whether a checked reason term makes
the formal-proof-policy and formal--manuscript bridges recoverable without
placing formal logic before study.

The first implementation does not ingest a large reference. After its two
initial experiments have been evaluated, a separately authorized experiment
will ingest and study either the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon. It will import the published
hierarchy, stable identifiers, cross-references, and revision information, then
obtain and represent statements, proofs, examples, and surrounding context as
active mathematical work requires them.

## License

Copyright 2026 F. Lengyel.

Licensed under the Apache License, Version 2.0. See `LICENSE`.
