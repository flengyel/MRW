# Mathematical work and continuity — 16 November 2026

The user is running MRW 0.23.44 and asks to prioritize mathematics over further
Justification Logic expansion. Fetched main
`2f7af35db83dcfaffaaa0c5192524fd16b7f4433`; it was clean and current.
D14 calls for resuming existing documents and reasoning without registration.
The [worked field-trace case](MATHEMATICS_WITH_NOTES.md) uses that route.

## Mathematical result

The coefficient-only trace rule fails in a larger field. For
`1 in Q(sqrt(2))`, the field trace is 2 while the minimal polynomial
`T-1` gives 1. The new [note](examples/field-trace/trace.md) states the
degree factor and gives a second example in a degree-four field; the
[linked proof](examples/field-trace/matrix.md) derives it from repeated
multiplication-matrix blocks. No private note was changed or copied into this
repository.

The exact published SageMath cell passed in the running SagePod container,
using SageMath 10.7. For the element corresponding to `1+sqrt(2)`
in `Q(sqrt(2),sqrt(3))`, Sage found minimal polynomial
`x^2-2*x-1`, degree factor 2, trace 4 and characteristic polynomial
`x^4-4*x^3+2*x^2+4*x+1`. This is a finite computational check of
the example, separate from the general linear-algebra proof.

The calculation used a new process through SagePod's documented
`/sage/sage` entry point and its configured UID, 1000:1000.
An initial assumed account and a PATH-only invocation were unavailable; their
failed statuses remain in the evidence. No container configuration, notebook,
kernel, queue job or companion template was changed. MRW gained no new Sage
adapter from this CLI check.

## Continuity observation

Before proposing a navigation feature, a guarded native VS Code 1.146.0 / WSL
trial opened two mathematical documents, selected an earlier passage, closed
both tabs and reloaded the host. Recent Documents recovered the exact selection
through native editor history. This was not a lost-position defect; no
per-document position store or new resumption control was justified.

The repeatable `sourceReturn` fixture now has an explicit
`continuity` branch. With the published notes as its bounded seed,
it followed the relative proof heading, returned to the original link, selected
the continuation passage, closed both files, reloaded, and recovered the exact
passage through Recent Documents. Both saved file hashes were unchanged, and
the report contained no errors. All operations used a new UUID-owned profile,
dedicated storage and native Mementos. The working window was not reloaded.

This is a scripted native controller/editor/preview observation, not a human
study session or evidence of mathematical novelty. It verifies this bounded
saved-note route. It does not restore live kernels or establish general recovery
of all layouts, preview scroll positions, PDF pages or unsaved text. D14 remains
partial for longer investigations and compressed-argument reconstruction.

To repeat, use the existing preparer with case `sourceReturn`,
a config containing `continuity: true`, and
`docs/examples/field-trace` as the seed. The preparer still requires
a new owned fixture under the cache; it must not target real working notes.
Enable the existing WSL connector only in that new profile, as documented in
[native isolation](NATIVE_TEST_ISOLATION.md).

## Writing review

The reviewed sources were the two complete mathematical notes and their short
navigation guide. The scope did not include a rewrite of the user's Number
Fields outline or another manuscript.

| Source section | Function |
| --- | --- |
| Trace definition and failed coefficient rule | Define the operation and exhibit a counterexample |
| Degree factor | State the correction with its hypotheses and notation |
| Quadratic element in degree-four field | Show the factor in a nontrivial example |
| SageMath cell | Check that particular example independently |
| Repeated-block proof | Derive the general formula and link back |

Knuth, Larrabee and Roberts,
[*Mathematical Writing*, §1](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf)
governed the review: points 5 and 10–13 support statement scope, connected
exposition, definitions at use and motivation. Variables, domains, coefficient
indices and the basis order precede their use. The proof is a block-matrix
argument; it needs no commutative diagram. The prose is independent of the
verification account in this file.

Primary mathematical references were checked: Stacks Project
[0BIH](https://stacks.math.columbia.edu/tag/0BIH),
[0BIG](https://stacks.math.columbia.edu/tag/0BIG), and Brian Conrad's
[Norm and trace, §2](https://math.stanford.edu/~conrad/210BPage/handouts/normtrace.pdf).
These are ordinary source links, not new immutable retained-source records.
The note uses the full Stacks source prefix.

## Checks and delivery scope

- 117 focused document/navigation/native-guard/tutorial checks passed with no skips.
- All 72 formulas rendered through the bundled KaTeX without errors.
- The exact published SageMath cell passed, not merely a similar calculation.
- Relative documentation links and heading anchors passed.
- The native link/Return/restart trial passed with exact source hashes preserved.
- Product Python, Lean, extension JavaScript, manifest/lockfile, bundled README
  and tutorial remain byte-for-byte unchanged.

The patch changes documentation and an isolated test branch. Version 0.23.44
already supplies the demonstrated behavior. No new VSIX or installation is
needed; published tags/assets and the working installation remain unchanged.
The README now opens with a mathematical worked example; the Justification
Logic section and Artemov–Fitting citations remain present.

Private logs, exit statuses, source cells and owned fixture receipts are under
`/home/flengyel/.cache/mrw-document-continuity-20261116`. Broad runtime, dependency and native-window
campaigns beyond this route were not repeated for the documentation/test patch.

Next: evaluate a longer investigation using existing notes and links. Further
engine or display development should address an observed mathematical obstacle.
