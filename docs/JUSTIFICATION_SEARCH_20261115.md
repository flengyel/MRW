# Checked alternative-route search — 15 November 2026

Baseline: main `d780da723efa0a4ab01d49f072595c2a620a09c6`, fetched before work.
Tested implementation and example: `bdf17bdc878b060a95268285b3d9bca743fcda99`. The following report changes
no tested Lean or Python source. Evidence and exact source hashes remain in
`~/.cache/mrw-justification-routes-20261115/evidence/`, outside maintained source.

## Central roadmap increment

The integral justification engine now has bounded forward search over explicit
reason admissions and Application. Every retained route carries a certificate
accepted by the existing checker. Distinct admission leaves remain distinct;
exact formula keys include content revisions. Resource limits are explicit,
and neither an empty result nor saturation establishes non-derivability.

Withdrawal produces a successor context with a new ID. It removes selected
admissions, preserves its predecessor, and permits search/rechecking there.
The test with two composed alternatives leaves one after withdrawal; a dependent
earlier certificate fails in the successor and remains valid in its original
context. No source, premise admission or correspondence is created by searching.

Four general Lean theorems cover route soundness, matching the selected goal,
subset preservation under removal, and exclusion of withdrawn admissions.
Their transitive axioms are limited to `propext`, `Classical.choice` and
`Quot.sound`. No new axiom or admitted proof is used.

The optional `lakefile-routes.toml` uses `.lake/routes-build`. The existing
checker configuration, toolchain, dependency manifest, checked modules and
executable pins remain unchanged. All 16 trusted digests match after both
profiles have been built.

## Recognizable public example

At the author's request, [Euclid's lemma](JUSTIFICATION_EUCLID_EXAMPLE.md)
replaces the changing Rice–Shapiro manuscript as the public introduction.
The walkthrough gives proofs using Bézout and unique prime factorization.
Executable examples check the conditional composition of their admitted
grounds and the surviving factorization route after the Bézout bridge is
withdrawn. They do not formalize the arithmetic proofs in Lean.

The range-lifting warrant from `rs_Appendix_A.tex` remains an internal
regression. Its earlier evidence and immutable citations were preserved.
The author-selected Došen–Petrić paper/Lean comparison is
[deferred on the roadmap](DESIGN_RECONCILIATION.md#current-implementation-order--15-november-2026).
The untested source-selection prototype is preserved on the separate local
branch `feature/formalization-review-20261115`, commit `f1fac79`; it was not
merged into main or included in a package.

## Actual checks

| Check | Result |
| --- | --- |
| Fresh optional search build, then final-source rebuild | Passed with pinned Lean 4.32.2 and warnings as errors. |
| `lake -f lakefile-routes.toml test` | All 30 checks passed: composed alternatives, footprints, equal-formula leaves, curried implications, cycles, non-factivity, exact revisions, invalid contexts/profiles, bounds, withdrawal, range-lifting regression and Euclid illustration. |
| `lake -f lakefile-routes.toml env lean RouteAudit.lean` | All four theorem audits passed; only the three permitted axioms occur. |
| Existing default `lake build` and `lake test` | Passed; original checker inputs and all 16 trusted digests match. |
| Full Python suite | 472 tests: 409 passed, 63 skipped, no failures. Both new tests passed; compiled checks run twice in fresh processes with identical results. |
| Changed Markdown links | 132 local links checked before this report, no missing files/anchors; final report links checked separately. |
| Maintained paths/text and existing VSIX identity scan | Zero superseded-name matches; final inventory also includes this report. |
| Existing 0.23.41 VSIX verification | Production manifest, exact runtime inventory and bytes match. SHA-256 `af5adcd3ca5205689657368804d7cfd69f1cf060b8e9779c57c5962c10e86b4b`. |

The 63 Python skips are 58 opt-in Qt widget cases, four isolated native TikZ
cases and one check requiring an authorized Windows project parent. None is a
new search test. The measured search-test invocation, including Lake, peaked
at 109516 KiB resident memory; this small test run is not a worst-case resource
proof. Logs retain commands and exit statuses, including the fresh build.

No extension runtime, packaged tutorial or manifest changed. A new VSIX,
installation, reload, extension-suite rerun and native-window campaign were
not needed for this source-only Lean increment. The verifier confirms that
0.23.41 still matches the packaged inputs. The working window, genuine notes,
source annotations, saved research and existing warrant records were not used
as test fixtures or rewritten. No new native-host observation is claimed.

## Remaining central work

This is a typed Lean API, not a delivered reader comparison interface.
The next increment must bind its context/admission IDs and certificates to exact
retained sources and existing records, publish durable results, reopen them,
and support an explicit challenge/withdrawal with source navigation and Return.
Ordinary reading must remain free of registration forms. General Hilbert/CS
search, arbitrary sum construction, independent arithmetic formalization and
paper–Lean correspondence review remain outside this batch.
