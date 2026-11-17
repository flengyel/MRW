# Bounded search for alternative grounds

The Lean engine can now discover composed reasons from explicit admissions,
retain their separate dependencies and search a successor context after a
withdrawal. **Proofs → Justification…** now presents explicit contexts,
checks and retains routes, shows exact source snapshots, and reopens successors
and predecessors. See the [reader workflow](JUSTIFICATION_WORKFLOW.md#read-search-and-resume-grounds).
The API below also remains available to Lean clients.

For a mathematical introduction, read [Euclid's lemma and its two proof
routes](JUSTIFICATION_EUCLID_EXAMPLE.md).

## What is searched

Fix a checked profile and context. A reason assertion `t:A` says that `t` is
an admitted or derived reason for the exact formula `A`; it does not assert
`A` by itself. The search starts with the reason assertions already admitted
in that context. From `p:(A → B)` and `a:A`, it constructs `p·a:B`, using the
existing Application axiom and two modus ponens steps. Each constructed
certificate passes the ordinary `checkCertificate` before entering the result.

For example, admit the five grounds

```text
a:A    p:(A → B)    q:(B → C)    d:D    r:(D → C).
```

The search finds `q·(p·a):C` and `r·d:C`. Their admission footprints are
separate. Withdrawing the admission for `p` into a new context removes the
first route; the second survives. Both earlier certificates remain valid
in the earlier context. A dependent earlier certificate fails rechecking in
the successor. No admission is added by searching or withdrawing.

The goal is matched as a complete formula, including each opaque atom's
identifier and content hash. Distinct admission IDs are kept even when they
have equal reason formulas. Different routes are not confidence estimates,
independent corroboration or an instruction to combine grounds by sum.

## Scope and bounds

This is forward search over **admitted reasons and Application**, not a complete
Hilbert proof search. It can apply a derived implication as a major premise.
It does not generate arbitrary axiom instances, introduce CS members, infer
bare `A` from `t:A`, admit a paper correspondence or fetch any source.
A valid J₀ or J(CS) profile is required, with the same ID as the context;
the present search has no CS-introduction step.

| Bound | Maximum / behavior |
| --- | --- |
| Explicit admissions | 32; duplicate IDs are rejected by `checkContext` |
| Input formula or term | 256 visited syntax nodes per admission/goal; bounded traversal |
| Names in input syntax | 1,024 UTF-8 bytes |
| Rounds | 6, default 4 |
| Retained intermediate and goal routes | 64 |
| Attempted pairs | 16,384 across the whole search |
| Nodes per constructed certificate | 256, checked before construction |

The result records attempted pairs, completed rounds and every resource limit
encountered. Smaller limits are accepted. Reaching a limit is explicit; it is
not evidence of non-derivability. Even saturation establishes only that this
restricted search found no further routes. Arbitrary sums, other logical
inferences and full J(CS) search remain outside its scope.

## API and verification

The [implementation](../lean/MRWRouteSearch.lean) belongs to
`MRW.Justification.RouteSearch` and calls the existing integral checker. It
uses a separate build profile so the documentary checker's source and binary
pins remain intact. The [tests](../lean/RouteTests.lean) include the existing range-lifting
warrant from the Categorical Rice–Shapiro manuscript (`rs_Appendix_A.tex`),
as well as synthetic alternatives, curried implications,
cycles, changed claim versions, equal-formula leaves, resource limits and
withdrawal. The synthetic grounds are not asserted about a mathematical paper.

From the repository root:

```sh
cd lean
lake -f lakefile-routes.toml build
lake -f lakefile-routes.toml test
lake -f lakefile-routes.toml env lean RouteAudit.lean
```

Lean/elan must provide the repository's pinned Lean 4.32.2. This profile has no
new dependency. It does not run when opening a document or activating MRW.
The ordinary documentary checker continues to use `lakefile.toml` and
`.lake/build`; search uses `.lake/routes-build`.

For a Lean client that has explicitly selected its profile and checked context:

```lean
import MRWRouteSearch
open MRW.Justification MRW.Justification.RouteSearch

-- profile : Profile, context : CheckedContext, goal : Formula
-- search profile context goal : Except String (State profile context)
-- forGoal state goal          : List (Route profile context)
-- admissionIds route.certificate : List String
-- withdraw context successorId removedAdmissionIds : Except String CheckedContext
```

`Route.sound` and `forGoal_sound` provide derivations in the selected profile
and context. `without_subset` and `without_excludes` prove that removing
admissions adds none and leaves no withdrawn admission. The audit prints their
transitive axioms; no admitted proof or new axiom is used.

The reader uses a stricter bounded transport: J₀ only, at most four rounds,
16 retained routes, 4,096 attempted pairs and 64 certificate nodes. The generic
Lean API above retains its wider bounds. The transport never introduces a
premise from a citation or a source title.

## Retained format and setup

A `mrw.route-request`, version 1, carries the profile, exact goal, existing
claim/admission/context records, source snapshots, resource limits and optional
withdrawal. Claim assertions bind to SHA-256 content hashes; formulas select
those complete atom versions. Every claim and admission names its exact source
passage through `basis_refs` or `representation_refs`. Snapshots retain the
qualified `reference`, reported whole-source revision, selected passage hash
and exact text separately. A stable identifier does not freeze its contents.

The Lean JSON adapter decodes the mathematical input, calls the existing
search/checker and emits checked certificates and an exact request echo. Python
checks the metadata bindings and publishes one immutable content-addressed
`mrw.route-result`, version 1. It implements no second inference checker.
Results use the existing artifact coordinator's copy-on-write generations,
writer exclusion and recovery. Relocation includes the complete records;
retained citations are not rewritten. Earlier context records remain required
by successor records. Qualified source identifiers keep their prefixes.

Checker setup is an explicit local build of packaged, pinned sources. Elan's
non-installing run mode and the empty dependency manifest prevent a download.
The current runtime accepts only its verified Linux x86-64/WSL executable
identity. Setup failure changes no study data. Saved results can be read
without that executable or toolchain. Future engine versions must retain
known prior identities in `src/mrw/data/route_runtime.json`; new builds must
not invalidate earlier saved runs.

Operational limits: one input is at most 1 MiB; one retained record at most
8 MiB; source text totals at most 256 KiB. Listing streams at most 128 records
and 64 MiB; a lineage has at most 16 contexts. Reaching a limit preserves
existing work and reports it. No record is discarded or an admission restored.
These bounds do not establish completeness or a worst-case performance proof.

General Hilbert/CS search, arbitrary sum construction and automatic paper–Lean
correspondence review remain outside the current search. Direct assembly from
notes and retained grounds uses the source-selection workflow below.

## Prepare grounds from notes

The [source-selection workflow](SOURCE_GROUNDS_WORKFLOW.md) prepares an exact
clipboard handoff and imports an attributed proposal. Claims and arrows remain
proposals until the reader explicitly admits selected grounds. Accepted claims
are hashed again after summary corrections; all formula atoms bind those exact
versions. Source captures and the original supplied response remain immutable.
The route request and Lean inference profile are unchanged.
