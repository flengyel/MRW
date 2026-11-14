# Saved-source access repair, 14 November 2026

The installed core is MRW 0.23.32; Diagnostics 0.1.0 is also installed in
WSL Debian. The working window uses the default `MRW.code-workspace`.

## Finding and correction

The current binding already listed and loaded **Hausdorff spaces**, Stacks
Project section 08ZD, with both reader annotations on the proofs of 08ZG and
08ZH. Its retained TeX, supporting material and annotations were intact.
The reported inability to open it was not reproduced through the installed
bridge or the supported external-link handler. The reader was opened in the
existing window.

**Simplicial Sets**, Kerodon 0004, was retained in a separate workspace's private
store, associated with an older disposable project. It was absent from the
working workspace's saved-source list. This separation explains that missing
entry; it should not have been left as the user's filing problem.

Recovered that exact capture into the current managed store, using the installed
storage coordinator and its generation publication. Preserved the original
capture separately and retained its source hash, display mappings, passage IDs,
attribution and acquisition time. Only its project association was changed in
the recovered copy. No new website acquisition or source reparse occurred.

Added direct retained links to both sources in the existing workspace README.
Both are also available through **Open Saved Source…**. This is a repair of the
user's current saved data and navigation, not an automatic cross-workspace
catalogue or a new storage format. Other workspaces are not scanned or merged.

## Verification

- Verified a complete backup outside active storage before publication.
- Rehearsed recovery against a private clone, including repeated recovery and
  an injected interruption before publication; the interrupted operation left
  HEAD unchanged and no recovery journal.
- All 12 previously saved payload files remain byte-identical, including the
  Hausdorff annotations, source and diagrams. The original Kerodon capture
  remains unchanged.
- A fresh storage instance loaded the published generation. Both exact retained
  references follow; the reader models report no missing source or supporting
  artifacts. Hausdorff has nine passages and two reader notes; Kerodon has
  27 passages and no reader notes.
- The installed native VS Code window reports both **Source: Hausdorff spaces**
  and **Source: Simplicial Sets** tabs in Editor Group 2. The working window was
  neither reloaded nor switched to another workspace. Existing note tabs remain.

The first post-publication verification tried to acquire the same workspace
lock while it was still held. That check failed; publication had already
completed. Rechecked after releasing the lock, without repeating publication.
The first Windows batch-launch attempt also split a URI at its ampersand; using
VS Code's native executable dispatched the complete URI correctly. These were
recovery-tool errors, not observed application defects.

Private backup, rehearsal and recovery receipt are outside the repository under
`~/.cache/mrw-source-recovery-20261114/`. No vault notes or authoring templates
were changed. Runtime source and installed packages are unchanged; no new VSIX
or installation is needed for this data repair. These checks establish saved
bytes and navigation, not mathematical correctness.
