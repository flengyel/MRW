# Document navigation repair — 0.23.1

Baseline: fetched clean main `5f5335836e388c70db845a1d7ee322d7882ceab9`.
This repair addresses ordinary note navigation while the user defers problem
work. It changes no command/view ID, setting, note, citation, study record or
storage format. The delivered document-learning interaction remains available.

## Confirmed defects and repair

Three regressions failed against the baseline; a fourth was reproduced after
the native check exposed a displaced pane:

- A link's originating occurrence could change while its target editor opened.
  The invalid new origin then replaced the preceding usable Return destination.
- Backlink navigation could likewise commit an origin invalidated during opening.
- A new note could open in an unrelated visible text editor's group when a
  Markdown preview was active but its text-editor acknowledgement lagged.
- A backlink selected from an earlier index could be redirected outside its
  allowed scope. The host text loader was called before the later scope check
  rejected that path.

Opening now validates the tracked origin after asynchronous host work and
before committing the display or Return destination. Edits wholly outside an
occurrence still shift its pin and allow a successful follow. A changed origin
produces an error and retains the previous Return. The target may already be
visible when host opening finishes; the repair does not pretend to undo that
host action. A closed source also prevents committing an exact origin.

After a backlink is selected, current scope is checked before asking the host
to load its pathname. Exact indexed-text/revision checks remain in place, and
superseded operations stop before further loading. A picker snapshot is neither
permission to read a redirected path nor an immutable source citation.

New destinations now prefer the active native preview group over a stale
text-editor acknowledgement. Already-open documents retain their own group.
Contents opening delegates to the same existing presentation helper.

## Checks and observation

The initial four targeted checks produced **three failures and one pass** on the
baseline. The pane regression failed before its fix. The final document-controller
suite, including that case and an additional PDF handoff race, passed
**32/32**, exit 0. The PDF check confirms Return preservation and no text loading of its binary fixture; it is not a native PDF-reader check.
The final broader extension pass completed **345/345 tests**, exit 0, no skips.
The initial broader pass was interrupted to fix the additional native pane
finding; the final full pass includes all repairs.
Shared Python study-question **2/2** and editor-bridge **11/11** checks passed,
exit 0. JavaScript syntax and whitespace checks passed. Test files and state
are disposable; genuine notes, research, annotations and study history were not
used as fixtures or rewritten.

A separate Windows VS Code **1.144.1 / WSL Debian** host completed **six native
checks**. It verified ordinary follow/Return, overlapping and outside origin
edits during opening, changed backlink-return selection, rejection before host
loading of a redirected backlink, and preservation of dirty saved-note bytes,
two editor groups and a visible unrelated dirty editor. The initial native run
exposed the pane-displacement defect; its final assertion is retained and passes
with the presentation fix. Production issued no layout-changing commands.
A high-contrast window capture confirms both sidebars, bordered Commands and
the unrelated dirty pane. The final preview surface is blank in that capture,
so it does not establish rendered-text refresh after the test rename/restore;
exact editor selection and group preservation were checked separately.
The native fixture injects picker choices and deterministic opening delays;
file operations, edits, scope checks and native editors/preview use final
production JavaScript. It is an automated Extension Development Host check,
not a human acceptance or learning study. Other themes/platforms, live Obsidian,
PDF readers, AI, Lean and Sage were not exercised. No mathematical correctness
or comprehension claim follows from these checks. Earlier validation reports
remain unchanged.

## Package and delivery

Verified package: `vscode/mrw-0.23.1.vsix`, **577,901 bytes**, SHA-256
`3e9abb3ed27e6f55702c72a3c1a8a09cf98153e663285c6423c361b7e4200b63`.
The verifier checked **106 archive files**, the production manifest and runtime
bytes, and exclusion of development files. The native fixture uses matching
production JavaScript. Packaged tutorial/source README match the checkout;
vsce expands relative README links. The isolated package marker records base
`5f53358` plus local changes; the root's previous marker is preserved.
Installed through the established WSL `code-server --install-extension … --force`
route, exit 0. All **104 installed payload files** match the verified
VSIX, excluding installer-only manifest metadata. The registry selects
**flengyel.mrw 0.23.1**. Working-window adoption was not forced or asserted.

[Machine evidence](evidence/document-navigation-repair-20261108.json) records
source/package hashes, exit statuses and native results. Logs and screenshots
remain locally under the ignored
`.codex-work/vscode-host-navigation-repair/evidence` directory. The working
window is not switched, rearranged or reloaded. Updated controls/code become
active at its next normal extension activation.

The tutorial and current document workflow describe the changed-origin behavior.
No manual problem session is required. General research resumption and argument
reconstruction remain subsequent product work; this patch adds neither feature.
