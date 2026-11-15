# Bounded search for alternative grounds

The Lean engine can now discover composed reasons from explicit admissions,
retain their separate dependencies and search a successor context after a
withdrawal. This is a developer API, not an MRW sidebar command. Retained
inspection, source navigation and Return for these new search results still
need integration. Existing warrant inspection remains available.

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

The API retains typed certificates and immutable predecessor values in memory.
It does not yet publish a durable search-result package, bind new route records
to citations, or present a challenge/withdrawal interaction in VS Code. The
next D15 increment must add those bindings and reopening without changing old
warrants or silently admitting premises. This implementation does not establish
an informal paper–Lean correspondence.
