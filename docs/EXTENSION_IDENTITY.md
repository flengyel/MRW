# MRW extension identity

MRW 0.22.0 uses `flengyel.mrw` and `mrw-0.22.0.vsix`. This is the user's explicit
fresh start under the new application ID. There is no compatibility extension,
forwarder, legacy activation adapter or automatic migration. Install only MRW;
the earlier full `flengyel.theorem-terminal` extension is retired.

VS Code supplies new workspace/global state and storage for the new ID. Old
study checkpoints, history and UI selections are not automatically restored.
Original files are left on disk. Ordinary documents can still be opened in place.
The user separately requested the annotated Hausdorff source: a one-time verified
data copy preserves its exact retained source, reader annotations, provenance,
passage IDs and rendered diagrams through the existing saved-store interface.
That preservation is deployment work, not compatibility code in the extension.

New external links use `vscode://flengyel.mrw/…`; the parser rejects the old
extension authority. Source-qualified IDs, exact `mrw-outline:v1/v2` references,
command/view IDs, settings, existing filenames and Python record schemas remain
independent of the application name. No global replacement rewrites mathematics
or retained source bytes.

Install from the verified `mrw-0.22.0.vsix` in the intended Linux/WSL/SSH host.
Retire the old extension after preserving the requested source. Installation
preserves the working window; a normal later activation adopts the new identity.
Do not run both full extensions together. This release is not a Marketplace
publication or a new mathematical-checking capability.

## Delivery — 2026-11-06

Baseline `07c8d08` already included the completed 0.21.1 reader repair. Its three
local commits were preserved; origin/main remained at `1783b75` during this work.
No reset or history rewrite was used. Implementation: `5ba7abaeda2006f66e2ad0a8fcc7bb88dd23210b`.
Clean package build: `f98eedb5137fd87776c866042da104c38b4a48a8`.

Package: `vscode/mrw-0.22.0.vsix`, **548,038 bytes**.
SHA-256: `818fe026dbd27c952ced9d1de28988d7fdd5b03dc399eb9626055355329c87f1`.
The WSL extension CLI removed `flengyel.theorem-terminal` and installed
`flengyel.mrw@0.22.0`, both exit 0. The registry contains the new ID and no old
extension. All **94 installed package files**, including **91 runtime files**,
match the verified archive. There is no dependency on the old extension and no
compatibility package, URI forwarder or old-ID activation adapter. The artifact
coordination directory also uses `globalStorage/flengyel.mrw`.

Checks: **285/285 Node tests passed**, exit 0. Python: **413 run, 346 passed,
67 explicit skips**, exit 0. Skips cover opt-in Qt/TikZ, the unbuilt pinned Lean
checker and the unavailable authorized Windows-project fixture. New regressions
check strict new-authority URLs with exact source revision/range and exclusion
shared by two workspace homes under the new coordination namespace. Existing
reader, recovery and study checks passed. Python compileall and JavaScript syntax
checks passed. The broader suites used the implementation source; only the
pinned build marker changed afterward. Final production/test bytes match the
clean build and broader-regression tree apart from that marker.

Clean pinned npm installation added 127 packages. The VSIX verifier checked all
96 entries, production manifest and runtime bytes, excluding development files
and private data. Extracted tutorial checks confirm 0.22.0, its implementation
hash, current content, two reopen refreshes and valid guide links.
[Machine-readable evidence](evidence/extension-identity-20261106/delivery.json)
records log hashes; logs and exit statuses remain in `/tmp/mrw-0220-*`.

## Hausdorff preservation

Only **Hausdorff spaces**, `stacks-project:08ZD`, was restored: **9 passages,
2 annotations and 1 rendered diagram**. Its source SHA-256 remains
`c6bac8dcf8ad96dc47416bf34cb45ba4a10b894e40d67d3e1fa68d8ef0d9f872`.
All eight selected source/annotation/diagram files match the original committed
store bytes. The original source store was not rewritten. The copy is at
`~/.local/share/mrw-hausdorff`, explicitly bound through the existing store
interface to the Stacks workspace's new `flengyel.mrw` storage. Retained logical
source/project identities remain provenance; no extension-ID forwarding is used.

The **installed package's own Python bridge and URL formatter** reopened that
copy, loaded both annotations and the SVG, resolved an exact retained passage,
and generated a `vscode://flengyel.mrw/…` link containing the unchanged qualified
reference, revision and range. Its parser rejects the old extension authority.
[Preservation evidence](evidence/extension-identity-20261106/hausdorff.json).
These are structural/persistence checks, not mathematical checking.

Old studies, history and UI state were not restored. A verified inactive archive
of 89 old workspace-record files is kept privately at
`~/.local/share/mrw-before-rename-20261106`. It is not loaded by MRW. No genuine
study prose or private data is included in the Git changes or package.

The working window was not closed, switched or forcibly reloaded. Native
activation and visible command interaction were not observed; the earlier
native launch failure was not repeated. A normal later activation adopts the
new extension. In the Stacks workspace, use **MRW: Open Saved Source… → Hausdorff
spaces**; re-importing is unnecessary. General research resumption remains the
next designed increment.
