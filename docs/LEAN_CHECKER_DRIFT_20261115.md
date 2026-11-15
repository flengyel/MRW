# Skipped checks and Lean checker drift — 15 November 2026

Baseline: main `0484a926d68c453e96b985d86fa45589ec9066b0`, fetched before work.
The reader reported MRW 0.23.41 active. All 164 installed WSL extension files
match its verified release, allowing VS Code's installer-only manifest metadata.
The source-build defect below is distinct from installation or reload drift.

## Finding and repair

The ordinary Python suite had skipped five real-Lean documentary tests because
that checkout's checker was unbuilt. Building with the pinned Lean 4.32.2
succeeded, but the public documentary bridge rejected the checkout: the added
relocation target had changed `lean/lakefile.toml` from the file trusted by
`src/mrw/documentary_warrant.py`. The eight baseline documentary tests then
reported two errors and one failure. Some negative tests fail before executable
validation, so not every enabled test exposed this same obstruction.

Expected build-configuration SHA-256:
`88335c65f9b47fc22a166cd660c22dd8a0aed0a8f350b6fff55b4cb13da9e0ee`.
Observed baseline SHA-256:
`a782b2118a32657509f0a965615ddf2c91a08e3dffb5e48b68943cf3f967fbbd`.
All other pinned source, module and executable digests matched after a fresh
build. This was an execution-identity rejection, not a counterexample to the
justification proofs or relocation model.

D15 requires the actual checker boundary; D21 keeps the independent contract
pilot from altering its role. The correction restores the exact trusted
`lakefile.toml` bytes, rather than changing accepted digests or admitting a new
runtime identity. `lakefile-contracts.toml` selects the contract target explicitly
and uses `.lake/contracts-build`, separate from the checker's `.lake/build`.
Both profiles use the existing package identity, pinned toolchain and empty
dependency manifest. All 16 trusted checker file digests still match after the
contract build. No proof, new axiom, schema, saved warrant, runtime hash or
serialized field was changed.

The new always-run regression verifies tracked source/configuration pins even
when compiled integrations cannot run. It fails on the original configuration
without invoking Lean, closing the gap that ordinary skips concealed.

## Checks and their limits

| Check | Actual result |
| --- | --- |
| Fresh `lake build` | Passed in 26.40 s; maximum resident set 859,692 KiB. |
| Restored default `lake build` and `lake test` | Passed; the existing justification driver reports success. Certificate soundness, Appendix A and documentary theorem dependencies were printed: only `propext`, `Quot.sound` and `Classical.choice` occur. No Lean proof source changed. |
| Documentary Python checks | All nine passed, with no skips, including the five formerly skipped integrations and the new unconditional pin test. Frozen fixture digest and retained-package reload checks remain intact. |
| Optional contract build/audit | Passed with `lake -f lakefile-contracts.toml build` and `lake -f lakefile-contracts.toml env lean ContractsTests.lean`. Six existing theorem dependencies printed; no new axioms/admitted proofs. Build 6.26 s, maximum resident set 769,040 KiB. |
| Concrete contract comparison | One test, three real bridge/workspace traces: successful move, recovery before publication and recovery after publication. All agree with the Lean vectors; exact references and external-original bytes are preserved. |
| Full Python suite | 470 tests: 407 passed, 63 skipped. Remaining skips are 58 opt-in Qt, four opt-in native TikZ and one Windows-mounted project check without its authorized parent. No Lean checker tests remain skipped in this run. |
| Real Pandoc citation checks | All 14 passed, including the six usually opt-in checks. Zotero metadata responses are scripted; this is not a live attachment trial. |
| Lean lesson controller/pack checks | Ten passed. These are component checks, not native Lean InfoView acceptance. |
| Native fixture guards | 16 passed; all 32 exported native entry points reach preflight. |
| Native documentary inspection | VS Code 1.146.0 / WSL opened a genuinely checked synthetic package through the existing inspector, displayed its exact span/context/checker and documentary-only boundary, and preserved an unrelated unsent fixture draft. Reinspection left all four package files byte-identical. Requests were one read-only artifact-status request and two inspect requests; no new admission, provider request or Lean check occurred during inspection. |
| Syntax, links and package | Python compilation, JavaScript syntax, changed Markdown links and `git diff --check` passed. Existing 0.23.41 VSIX verification still matches all production bytes. No new package is required. |

The native picker choices are scripted; the editors, inspector, Python loader
and package are real. The fixture package was created by this repository's
actual pinned checker. The first native assertion omitted the coordinator's
read-only status request; its failure is retained, and only that test expectation
was corrected. A later focus attempt found the already-completed fixture window
closed; it did not reopen or act on the genuine window. The final inspector
helper and production JavaScript match the successfully tested native copy.

Logs, initial failures, exit statuses, resource observations and native reports
remain in `~/.cache/mrw-lean-boundary-audit-20261115/evidence/`, outside maintained
source. Test material is synthetic and outside genuine stores/vaults. The
working window, notes, source annotations, existing warrants and active
installation were not rewritten or reloaded.

## Current use and remaining work

Use the default `lean/` profile for `lake build` and `lake test`; it supplies the
trusted justification checker. Use the [contract commands](CONTRACT_PILOT.md#implementation-trace-checks)
for the independent model. Lake's [configuration documentation](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/Lake/)
describes `--file` and `buildDir`; the actual commands above were checked with
this repository's 4.32.2 toolchain rather than assuming the latest API.

The fix belongs in a checkout of the Lean sources, not a VSIX update. Pulling
this commit restores the expected source configuration; build that checkout's
checker before explicitly invoking it. Ordinary reading never needs that build.
MRW 0.23.41 remains the current extension release. Its SHA-256 is unchanged:
`af5adcd3ca5205689657368804d7cfd69f1cf060b8e9779c57c5962c10e86b4b`.

The checked documentary conclusion concerns the exact response span under an
explicit admission; it does not admit a mathematical assertion in that span.
The contract model is a proved specification with three tested conformance
samples, not a refinement proof of the runtime. Generic alternative-route
search and the complete interactive justification workflow remain pending.
Native lesson/code/notes/InfoView acceptance, live Zotero attachment work and
broader notebook visual acceptance remain separate items in the register.
