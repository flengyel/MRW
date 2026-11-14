# MRW 0.23.30 — reader-note continuation

Published [release 0.23.30](https://github.com/flengyel/MRW/releases/tag/v0.23.30) as Latest, with the
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.30/mrw-0.23.30.vsix)
and [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.30/SHA256SUMS).
Main contains the focused branch; no PR is outstanding. The working installation
was not replaced and the working VS Code window was not reloaded.

- Source marker A: `224369eebbc9054d91c7f7e78860a02653c8af41`.
- Release commit B/tag `v0.23.30`: `a45111ea505fcc9734a0adeb4715404dfcbb0130`.
- VSIX SHA-256: `c180d3b4658fb0d4066c3a710c0e94b11b595fb1b6dc575d8da91e5846d59da6`.
- Built from clean B; B changes only the marker, recording A and `localChanges: false`.
- Published assets were downloaded through their public versioned URLs. Both
  match the local files byte for byte, and `sha256sum -c SHA256SUMS` passes.

## Interaction and recovery

**Continue this note in Obsidian…** belongs to one saved annotation. Select an
existing note, or create through the configured Obsidian command and explicitly
select the saved file. Two clipboard chunks keep commentary in the body and
attribution/exact-passage return link in Research. The authoring application
performs each edit and Save. MRW checks the saved destination and its original
surrounding text before completing the association.

The external note then owns current editing. The original annotation's exact
text, identity, attribution and outline revision remain available as retained
material. Its attribution does not apply to subsequent external writing. There
is no second current editor or background synchronization.

Pending state lives in the existing Obsidian-association sidecar, using the
existing managed-store publication/recovery. Failed publication after a saved
paste can resume verification without reinsertion. Unsaved or concurrent changes
stop completion. Missing notes are explicit; relink selects a file rather than
guessing. Unlink and annotation deletion never delete external files.

See the [workflow and setup](OBSIDIAN_WORKFLOW.md#continue-a-reader-annotation).

## Checks

| Check | Result |
| --- | --- |
| Final Python suite | 456 ran; 388 passed, 68 existing opt-in/environment skips; no failures |
| Full extension regression | 538 ran; 537 passed, one tutorial section-anchor assertion failed |
| Corrected/affected extension checks | All 35 continuation, reader-view and tutorial tests passed; the corrected checker validates the actual section anchor |
| Final package tutorial, syntax and Markdown links | Passed |
| Existing Zettel validator | Six new/existing/older-layout/index/H1/quotation cases produced their expected accept/reject results |
| Native round trip | Passed with Obsidian 1.15.1 (installer 1.15.0), VS Code 1.146.0 and WSL |
| Clean wheel and extracted package | Isolated import/CLI and Node-to-isolated-Python continuation, retained return and restart checks passed |
| Identity search | Zero superseded-name matches in tracked paths/files and extracted VSIX |
| Package comparison | Three runtime additions; Lean and lesson bytes unchanged |
| Genuine work | 12 retained-payload checksums and 29 ordinary note/template/document hashes verified; private-store HEAD unchanged |
| Dependencies | npm audit: 3 high and 2 moderate findings; pins unchanged |

Tests exercise interrupted managed-store authority publication, pending recovery,
source/destination races, duplicate prevention, qualified Kerodon references,
Unicode/math/TikZ preservation, ordinary Markdown, missing/renamed notes and
unlink/deletion without external-file authority. These are storage/navigation
checks, not mathematical validation.

The actual Zettel revision was
`258cb7b3853e59bc32a2c2227bf64f4d3f23b912`. Its installed NewFileTemplate matched
byte for byte. The native trial invoked that template, observed its missing index,
completed the index through the editor and Save, and validated the resulting
note with the existing tool. PyYAML was installed only in a disposable test
Python environment; no project dependency or working configuration changed.

The packaged controller used native Quick Picks and clipboard, with the fixture
supplying explicit file selection and acknowledgments. Native Obsidian editing
saved the chunks. The actual source-to-note URI selected that note; later edits
survived an isolated MRW host reload, with the original exact and read-only. The
return URI was passed to MRW's native clipboard-link command. This did not test
a manual Windows URI-handler click or a visual inspection of the working window.
Initial harness mode/API/settings errors were corrected before the successful
run. The disposable note's final bytes were retained outside the vault, then it
was moved to Obsidian trash; the original note was reopened. Clipboard state was
restored and removed from temporary test evidence.

The post-release report commit also clarifies User/Remote configuration and
hardens only the native fixture's restoration/clipboard cleanup. It changes no
packaged runtime bytes. Release B and its published assets remain unchanged.

Local logs and exit statuses are retained under
`~/.cache/mrw-annotation-continuation-20261113/` in `evidence`,
`validator-fixture`, `native`, `release-evidence` and `release`. They are not
packaged or committed and contain only bounded fixture/private verification data.

## What remains manual

MRW removes the need to construct a passage return URI, separately register the
reverse association or keep track of which annotation copy remains current.
Creation still uses the author's existing template. Selecting the saved filename,
completing the Zettel index when absent, two paste-and-save operations and final
verification remain. An unrelated concurrent edit requires reconciliation.

Zettel validation needs the separately selected existing validator and its
Python dependencies. Other Markdown needs neither. Opening is at note level;
heading/block routing, identical TikZ rendering, cross-application atomic Save
and synchronization are not implemented. The separate interface/companion
priorities remain in [the current plan](../CODEX_PLAN.md), not completed here.
