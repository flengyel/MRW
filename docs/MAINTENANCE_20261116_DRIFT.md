# Drift review — 16 November 2026

The review started from clean main
`2cbe85ca936f61bcab74a4df0860ec183f9520ed`.
After fetching, origin/main named the same commit. This is a maintenance
review, not a new feature increment or a new mathematical result.

## Findings and disposition

| Observation | Design comparison and action | Verification and limits |
| --- | --- | --- |
| Main has changes after release 0.23.44 | Expected: the field-trace notes, documentation and one native-test branch changed. Preserve them. | The complete diff from tag v0.23.44 contains no production Python, Lean, extension JavaScript, manifest/lockfile or packaged media change. No new package is needed for this review. |
| Source, release and installed version | D19 requires separate claims. GitHub Latest is 0.23.44; the registered WSL extension is also 0.23.44. | GitHub's release API identifies tag B `8d5b228c6dda63b20b686ab0d39c9964437a6abe` and the expected core asset digest. The registered extension marker names source A `d6ec200f497efe235342bd3e1fbfc2f6b4a94b36`. Registration does not independently observe every active window. |
| Roadmap contains literal backslash-n sequences | D19 instruction consistency: restore paragraph/heading line breaks in the register and research design. | The same text, links and existing implementation-order anchor remain. No requirement or completion status is changed. |
| Supported native cases omit justification | D20 requires accurate, isolated testing instructions. Add the implemented case to the list. | Compared with prepare-native-host.py's allowed set; the existing runtime-fixture section remains. No preparer behavior changes. |
| User closed three fixture windows | Preserve the working window and test isolation. This observation does not identify which fixtures remained open or why. | Both retained field-trace reports say complete with no errors; current sourceReturn requests closure outside reload when buffers are clean. Actual closure was not recorded, so report completion is not closure evidence. No new windows were opened and no working process was closed during this review. Future native trials must verify closure of their owned window after preserving their report. |
| Work remains outside main | Preserve it; do not merge an old snapshot over current code or promote a deferred feature. | The paper–Lean prototype is committed separately as `f1fac79aa3b65fe6c12fb540bcd5cdb8b68d485b`. The older notebook validation checkout remains dirty and untouched. All other existing worktree heads are ancestors of main. |
| The last mathematical corrections were only checked locally for rendering | D15 distinguishes evidence scopes. Keep the published source fixes without treating local KaTeX as GitHub browser acceptance. | The three trace commands use upright roman text and the degree factor uses explicit multiplication. The earlier check rendered 72 formulas locally; GitHub client-side rendering remains unobserved. The user's screenshots supplied the actual display defects. |

The full maintained-tree scan at the starting revision covered 662 tracked paths
and their bytes, with zero previous-identity matches. Existing published assets,
private notes, annotated sources, studies, drafts and history were untouched.
No whole-suite, native-window or mathematical-verification result is inferred
from this maintenance review.

## Next work

D14 remains the next central item: continue an argument through ordinary linked
notes, a source and a deliberate calculation; retain a failed approach and its
correction, stop, and resume the actual unfinished reasoning. Existing editor
history, Return, Recent Documents and saved calculation tools are the starting
point. Add code only for a demonstrated missing recovery or navigation action.
Do not add question registration, another note format or a new context form.

The existing field-trace example establishes one bounded navigation and restart
route. It does not establish recovery of an entire investigation, every preview
position or a live computational kernel. Wider Justification Logic search and
the Dosen–Petric paper–Lean comparison remain deferred. The optional companion
and native-observation gaps in D08, D12 and D13 also remain open.

## Checks for this patch

Changed Markdown links and anchors, repaired heading rendering, native-case list
agreement and whitespace were checked. Production runtime and package inputs
remain unchanged from 0.23.44. Runtime, Lean and extension suites were not rerun
for these documentation changes. No installation or reload was performed.
