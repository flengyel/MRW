# Note titles, links and Obsidian handoff — 0.22.4

Implementation: `b7245ca62b5660faba8f83c041cc50870adc7b3d`.

The user supplied an EFG Theorem note and its link to the Number Fields outline.
The actual outgoing link names the supplied Number Fields outline; no guessed
replacement, renamed note, generated outline or artificial study was created.
Both original files remain in their vault. No genuine mathematical prose,
annotations, saved sources, studies or history were test fixtures or rewritten.

## Delivered interaction

The preview header and Contents display the YAML title together with the
filename. The filename remains the immutable note identity; a repeated filename
ID at the start of the title is removed only from display. The full YAML title
remains available in the tooltip. Native editor tabs retain their filenames.
A different YAML ID is metadata and no longer prevents opening the exact
filename or redirects it to another file. Duplicate filename IDs remain errors.

Clicking a WikiLink opens the original note in MRW preview. For Windows-mounted
folders in WSL, one bounded read-only Windows filename enumeration replaces a
filesystem round trip for every directory. It enumerates all eligible names to
check uniqueness, then uses the existing resolver for canonical scope and
current matching-note bytes. It stores no filename cache or index database.
Metadata/generated directories, depth/entry bounds and explicit partial results
remain. Unavailable enumeration falls back to the bounded filesystem scan.

**Open in Obsidian** in the preview, or **MRW: Open Note in Obsidian**, dispatches
the exact vault-relative file through the registered URI handler. The selected
notes folder must be its vault root; **MRW: Obsidian Vault** supplies a vault name
or ID and defaults to the folder name. Obsidian receives the saved file, not an
unsent VS Code draft. This handoff does not require the CLI or change saved
source/passage associations. The supplied workspace already selects the Windows
vault through its WSL mount; no import or copy is needed.

An initial native check demonstrated that Windows writes did not update an
already-open clean file in WSL. After explicit MRW navigation, the repair checks
only the displayed note while VS Code is focused. On return from Obsidian, a
changed clean file re-resolves through VS Code's file model and returns to its
preview. The interval is two seconds. Scope, size, UTF-8, active-document and
dirty-buffer guards precede resolution. MRW does not apply editor replacements,
merge, revert, save files, close groups or reload the working window.
Unsaved text remains labelled **Unsaved VS Code changes**.

The narrow `_workbench.openWith` entry point is needed because public open
commands discard the file-input reload option. It supplies no replacement
contents. VS Code's text-file model independently refuses dirty/saving content,
including typing after MRW's preflight guard. This is checked on the installed
VS Code version; it is an internal API limitation for future host updates.
A resolution failure leaves the existing document intact. Polling waits while
VS Code is unfocused, so returning to MRW is part of the acceptance sequence.

## Evidence and checks

- Focused parser/resolver/document/refresh/title/tutorial/study-preservation
  regressions: **74/74** on integrated sources and **74/74** in an isolated
  snapshot of the committed source with the established Python bundle.
- YAML title controller: **1/1** on each source set. Existing focused activation,
  Contents, exact Return, draft/group and ordinary/retained routing: **11/11**
  on integrated sources. Syntax and both diff checks pass.
- Real supplied link lookup: **33.57 seconds before, 1.98 seconds after**.
  The new lookup considers **2,098 eligible filenames / 3,330 candidate entries**
  and reads only the matching note. These timings are backend lookup, not a GUI
  animation or universal latency guarantee.
- An isolated **VS Code 1.144.1 / WSL** host staged from the verified package
  passes **5/5**: Contents title/filename, native Markdown header and Obsidian
  action dispatch, WikiLink opening through the Windows filename provider,
  Windows saved text/title refresh after returning to focused MRW, and unsaved
  VS Code draft preservation during a second Windows write. The packaged native
  link-to-preview observation is **2.62 seconds**.
- Native edits use disposable Windows files, not the genuine vault. The test
  verifies the real editor API and Markdown renderer. Obsidian dispatch is
  intercepted at the native API endpoint; no pointer-click or visual sidebar
  observation is claimed. The test window closes itself after success.
- Two native wrapper setup failures were corrected (read-only API property and
  eager access to a proposed getter). The final focus guard correctly withheld
  a background refresh; the final driver explicitly returned to its own window
  and verified focus before expecting an update. Earlier failed runs are not
  counted as successful acceptance.
- The user's enabled CLI first reported a connection error; later read-only
  probes timed out. Windows accepted opening the supplied note in Obsidian, but
  an active-note confirmation was not obtained. No CLI-driven editing occurred.

## Package and remaining limits

`vscode/mrw-0.22.4.vsix`: **563,229 bytes**, **102 archive entries**.
SHA-256: `7c8a24b3a1c825c86926edf731da7912c1a0f87023be377ca205884af5bbde4d`.
The established verifier matches production/runtime bytes and pinned assets,
excludes development files, and confirms **100 installed files** match the
archive apart from installer-only manifest metadata. Installation through the
WSL extension-host CLI succeeded. Existing command/view IDs and dependency pins
are preserved; one command and one optional vault setting are added.

The package preserves the separate pending reader-orientation work and declares
`localChanges: true`. Its stronger earlier visible-editor acceptance remains
separate. This increment's committed-source checks and packaged native checks
are distinguished above. The working window is preserved; its next normal
reload adopts this runtime and guide.

The new workflow removes repeated long mounted-filesystem lookup, searching for
an Obsidian URL by hand, and closing/reopening a clean note to see Windows saves.
Remaining limits include filename-only native tabs, possible source/preview
transition during file resolution, and dependence on the host file-resolution
entry point. A client Obsidian link does not synchronize a separate remote file
tree. TikZ, LaTeX preambles and Obsidian embeds remain rendering work; the number
theory outline is reused directly.

The bundled tutorial and current document/Obsidian guides are updated.
[Machine-readable evidence](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/note-reading-20261107.json).
