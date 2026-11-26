# Relocation and immutable-citation contract pilot

`MRW.Contracts.Relocation` is an executable, proved **specification** of the
identity boundary in one relocation. The sampled JavaScript traces below test
implementation conformance. They are not a proof or a refinement of the
Python/JavaScript implementation, OS, filesystem or external applications.

## Model and claims

The module `lean/MRW/Contracts/Relocation.lean` imports Std only; it does not
import `MRW.Justification`. `Target` contains opaque logical, capture and revision
identifiers. `Citation` pairs that target with an opaque passage identifier.
Natural numbers are equality-comparable labels, not hash implementations.
Locators and link presence are separate from those immutable identities.

`State` is raw data: its optional candidate can carry an unrelated identity or
revision. `Event` contains requested preparation, verification, publication,
recovery and association removal. `step` returns `none` for rejection. An
accepted preparation creates a candidate at a distinct destination. Verification
compares its target with the current retained target. Publication requires that
verification phase and a matching candidate, then changes the current locator.
Recovery before publication aborts the candidate; recovery after publication
retains the destination. Unlinking changes only association presence.

The separate `Invariant` states preservation of logical/capture/revision
identity, exact citation and the externally maintained original. The checked
proofs establish:

- initialization;
- preservation by every accepted transition, including recovery/unlink;
- preservation for every reachable state;
- a successful relocation for every target/passage and every pair of distinct
  source/destination locators;
- recovery's preservation of the authoritative locator;
- unlink's preservation of the external original, independently of its presence.

The last theorem is an equality for arbitrary raw states, including an already
absent original. It asserts that unlink does not change that state, not that an
external application cannot delete its file.

`ContractsTests.lean` also checks rejected publication before verification,
identical-locator preparation, wrong-revision verification and recovery before
and after publication. It computes success/recovery summaries for comparison
with concrete traces. No invariant proof is stored in a raw state or event.

## Concrete correspondence

| Model | Implementation field or effect | Abstraction boundary |
| --- | --- | --- |
| Logical identity | accepted original reference scope; verified store identity and its preserved `reference_scopes` | Scope encoding/hash computation is not implemented in Lean. |
| Capture identity | retained outline UUID in `outline_reference` / `outline_follow_reference` | An opaque identifier; no UUID generator model. |
| Revision and passage | source SHA-256 and exact retained range in `mrw-outline:v1/v2` | Digests/ranges are opaque; collision resistance and scalar parsing remain implementation assumptions/checks. |
| Current locator | workspace root/private-home mapping in `WorkspaceMove.move` | Paths are abstract labels. Canonical paths, symlinks, permissions and copies are tested in the runtime suite. |
| Prepare/verify | `preparing` authority record, copied files and saved-source inspection, final manifest/source verification | Model `.verified` is the `preparing` record with verified manifest, not an additional persisted runtime phase. |
| Publish | the durable authority write setting `phase: committed` | Atomicity/fsync/lock exclusion are environment and implementation obligations. |
| Rejected operation | thrown validation error with no authority commit | The model returns `none`; the concrete operation may leave a candidate or journal requiring recovery. |
| Crash/fault | no further successful model step; restart reads the recorded authority | An exception after a successful authority write is modeled from committed state, even if the caller never saw success. |
| Recover | `WorkspaceMove.recover`: abort `preparing`, verify/retain committed destination | Recovery failure from changed/corrupt data is rejection, not rollback or success. |
| Unlink | `outline_update_note` removes one local association | `outline_notes.py` does not own or delete the external note. |

Relevant code is `vscode/src/workspaceMove.js`,
`vscode/src/workspaceMoveHost.js`, `src/mrw/outline_references.py` and
`src/mrw/outline_notes.py`. The current-location mapping and accepted original
reference scope remain different fields. A move must not replace an immutable
citation with a citation to newly parsed content.

## Implementation trace checks

`vscode/test/contracts-relocation.test.js` invokes the compiled Lean executable
and compares three computed outcomes with actual isolated workspace moves:

1. successful publication;
2. interruption at `verified`, followed by recovery to the source authority;
3. interruption after `committed`, followed by recovery retaining the destination.

Each case creates a retained source through the real bundled bridge, obtains an
exact reference, adds/removes an external-note association, moves/reopens the
retained source and checks exact outline identity/revision/reference equality.
The source and external original bytes remain unchanged. Only after those
concrete equality checks are scope/outline/revision mapped to the model's labels
1/2/3. One exact retained region/range maps to the opaque passage label 7; the
test is not evidence for every range parser case. Existing `workspace-move.test.js` and
`test_outline_references.py` cover further occupied-target, corruption,
changed-source, abrupt termination, Unicode/range and recovery cases.

The conformance test is optional in ordinary extension testing: without the
explicit executable path it reports a skip. It never builds or invokes Lean
when GOLEM XIV opens. Run from the repository root after bundling the Python core:

```sh
npm run bundle-core --prefix vscode
cd lean
lake -f lakefile-contracts.toml build
lake -f lakefile-contracts.toml env lean ContractsTests.lean
cd ..
MRW_CONTRACT_EXECUTABLE="$PWD/lean/.lake/contracts-build/bin/contracts_tests" \
  node --test vscode/test/contracts-relocation.test.js
```

The build uses the existing `lean/lean-toolchain` (4.32.2), no new dependencies,
and the optional `lakefile-contracts.toml` profile. It uses the same package
identity, pinned toolchain and dependency manifest, but writes only its own
`.lake/contracts-build` artifacts. The original `lakefile.toml` remains byte-for-byte
pinned by the documentary bridge. The main library, justification executables,
test driver and default targets remain intact. Do not add contract targets to
that pinned configuration or silently update its trusted identity.
The six principal theorem dependencies were inspected: only `propext`, plus
`Quot.sound` for the generic success theorem; the unlink theorem uses no axioms.
No additional axioms or admitted proofs discharge the obligations.

## Assumptions and omitted behavior

The abstraction assumes source/private payloads and candidate verification
correspond to the values read, and that the owning runtime honors its locks and
durable authority boundary. Source/candidate changes during preparation are
handled by runtime verification; arbitrary same-account interference is outside
this proof. The model does not prove content-hash authenticity, crash durability,
interprocess fairness, remote synchronization, storage cleanup or scheduling.
It does not model independent edits to linked notes or source notes as text
equality. A source may support several notes and each may develop separately.

Only safety is established. Eventual successful publication/recovery would need
explicit availability and fairness assumptions. Delegated-operation and report
classification proofs remain subsequent bounded work.
