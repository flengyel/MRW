# Public readiness — 2026-11-05

MRW remains **private**. This task prepares inspection; it does not authorize a
visibility change, release upload, Marketplace publication, credential rotation,
history rewrite or contact with testers. No such action was performed.

## Reviewed scope

Review baseline: `923539a31f350a45d2ebaffcd945448550a3f758` (the new task over
reviewed implementation `098f2579e26e224b124369f9ffc4192199f2c722`).

- All 351 tracked paths at the baseline, including 130 files under `docs/evidence/`.
- All 110 commits reachable from the available local heads/remotes: `main`,
  `review/openai-responses-adapter`, `origin/main` and `origin/HEAD`. No local tags.
- All 1,223 unique reachable blobs: 1,215 text blobs (38,476,831 bytes) scanned
  for common provider tokens, private keys, credential-bearing URLs and literal
  credential assignments; eight unique PNG blobs inspected visually. Commit
  objects were also scanned for credential patterns; normal author metadata is
  present in the history. This was a bounded custom
  pattern/content review, not an exhaustive secret detector or security audit.
- Read the retained Jupyter/extension/build logs, source-fixture provenance,
  dependency license notices and evidence accompanying the screenshots.
- GitHub repository metadata confirmed private visibility. The published ref
  listing showed only `main`, no tags; the release listing was empty. The
  repository-wide Actions run listing returned `total_count: 0`, so there were
  no enumerable run logs or run artifacts to download. The connector rejects
  direct repository artifact/tag endpoints; published tags were checked with
  `git ls-remote --heads --tags origin` instead.

### Implementation delta reviewed

The integrated staging delta against `923539a` contained 30 changed/added text
paths at this review: 11 runtime JavaScript modules, six test files, two package
manifests, the offline example and ten documentation/notice files. All were
scanned again with the credential patterns above (including Google-style API
keys); there were no candidate matches. Generated build caches, dependencies
and private session output were excluded from this source delta.

Content review covered `activeStudy.js`, `activeStudyView.js`, `studyModel.js`,
`studyHistory.js`, `studyScheduler.js`, the new `studyEvidence.js`, `studyHelp.js`
and `studyExample.js`, and the changes to `extension.js`, `outlines.js` and
`annotationView.js`. The new capture is scoped to selected passages, current work,
explicit requests and pasted replies in the study's private checkpoint/snapshot
storage. The copied handoff identifies unsent work and the latest immutable
submission. Export adds labeled linked attempt context, rather than exporting
whole supporting sessions. Copying/pasting is explicit; no new provider call,
clipboard monitoring or unrelated editor/application capture was introduced.
This is source inspection, not a native-host execution or a correctness proof.

The two example questions and `media/study-example.md` contain original elementary
material attributed to Codex companion. The source carries a CC0-1.0 dedication;
question proposals keep AI attribution. Test passages/replies are synthetic.
No genuine study text, history, private note or screenshot was added in this
delta. `practice_demo` stays distinct from production and automated-test origins.
Local documentation targets and referenced anchors were checked; inline example
filenames are examples, not missing repository documents. The source review also
identified a literal escaped newline in the example's welcome action; it was
reported for correction before packaging. Final build/version metadata, any
subsequent documentation edits and archive contents remain covered by the
[delivery validation](docs/ACTIVE_STUDY_VALIDATION.md), not this staged snapshot.

The review excludes unreachable/dangling Git objects, local reflogs, other
repositories, ignored private study stores, account/organization secrets,
deleted/expired server artifacts and surfaces not available through this access.
It does not assert that those surfaces are empty. The final package is covered
separately by [delivery validation](docs/ACTIVE_STUDY_VALIDATION.md).

## Findings and ordinary repairs

**Credentials:** no plausible credential was found in the reviewed material.
The 18 pattern candidates were consent-description fields named `authorization`,
deliberate test-only API-key sentinels, or a prohibited credential URL on
`example.com` used by rejection tests. No candidate value is reproduced here.
The Jupyter log contains localhost/kernel identifiers and failed-authentication
messages, but no login token. No credential was visible in the eight screenshots.
This finding is limited to the methods and scope above.

**Local identity:** 54 baseline text files contain the maintainer's Linux/Windows
paths; screenshots include workspace names, MRW references and local paths.
Examples are `docs/evidence/sagepod-notebook-20261016/jupyter.log`,
`docs/evidence/overview-20261016/host-exthost*.txt`, and
`docs/evidence/reading-outline-20261101/installed-reader-whole.png`.
They document validation and contain no observed private chat. Publication would
make this host/workspace information public. No history was erased for containing
failed experiments, interface defects or embarrassing development detail.

**Attribution repaired:** added the pinned Equational Theories contributor notice
and Apache-2.0 license beside the retained Lean excerpt and derived tool outputs:
[ATTRIBUTION.md](docs/evidence/proof-outline-20261014/ATTRIBUTION.md).
Existing exact bytes/digests remain unchanged. KaTeX, markdown-it and its bundled
dependencies, and ts-fsrs have local license/notice files under `vscode/media/`.
The Stacks fixtures identify the authors, source revision, bounded excerpt and
modification, and retain upstream GFDL in `tests/fixtures/stacks/COPYING`.
The original offline study example has its own CC0 attribution; it is not copied
from the unresolved Euclid translation.

**Documentation repaired:** the root README now describes the current study
session; [CHANGELOG.md](CHANGELOG.md) and
[extension history](docs/VS_CODE_DEVELOPMENT_HISTORY.md) retain older accounts.
Installation, extension README, bundled tutorial and optional SagePod build steps
use 0.19.0 and the same package path. Legacy Qt/CLI setup is separate from first use.

## Remaining publication decisions

1. **Euclid translation attribution/reuse is unresolved.**
   `docs/evidence/source-outline-20261014/euclid-page.html`, its
   `euclid-ix20.txt`, and the copied text under `docs/evidence/overview-20261016/`
   come from the Clay Mathematics Institute page identified in the retained
   provenance. That provenance explicitly leaves translator/edition unknown;
   the repo has no supplied reuse notice for this English transcription.
   Ancient authorship does not identify the rights in this particular translation.
   Establish the edition and permission/license, then add attribution; otherwise
   propose a separately authorized replacement or distribution exclusion while
   retaining the private evidence. Do not mark it cleared merely because MRW is
   Apache-2.0. Screenshots showing this text need the same decision.
2. **Private research disclosure needs owner confirmation.**
   `src/theorem_terminal/appendix_a.py` contains interpretive summaries of the
   private `Categorical_Rice_Shapiro` manuscript. The bundled
   `src/theorem_terminal/data/appendix_a_justification.json`,
   `appendix_a_warrant.py`, `lean/TheoremTerminal/Justification/Bundle.lean` and
   development documents retain declaration/label names, repository revisions,
   hashes and correspondence bindings. The full manuscript is not tracked here.
   Review this specific derived material and confirm permission/intended disclosure
   before a public source repository **or VSIX**, which includes the Python data.
   Keep the genuine source and checked bundle unchanged during that decision.
3. **Approve disclosure of maintainer host/path metadata** above, or define a
   minimal redaction plan with retained private provenance. Removing a current
   file would not remove its reachable historical versions. Any history change
   requires separate authorization; no rewrite is proposed for ordinary mistakes.

No live third-party service, mathematical correctness or learning-effect claim
was established by this exposure review. User study histories and new screenshots
must be reviewed independently before sharing; this report does not clear future data.

## Proposed release contents

After the decisions above and a separate publication request: source and candid
history, current install/study documentation, reviewed fixture notices, and a
verified 0.19.0 VSIX with bundled Python core, licensed renderers/scheduler and the
small offline example. Publish validation limits and the exact package digest
with it. Do not include private study stores, generated session histories,
credential-bearing URLs or unreviewed host artifacts. No public release is created
by building, locally installing or privately pushing this increment.
