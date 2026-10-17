# Obsidian companion navigation validation — 2026-10-17

Baseline: clean `main` at `03d5f89`. Extension identity remains
`flengyel.theorem-terminal`, version **0.6.0**. See
[the workflow](OBSIDIAN_WORKFLOW.md) and [persistence/routing contract](../vscode/README.md#obsidian-companion-notes).

## Configuration and preserved work

The actual arrangement is **Windows VS Code 1.141.2**, **WSL2 Debian** with
Python **3.13.5**, and **Windows Obsidian 1.14.4**. Obsidian's local
`obsidian.json` identified the existing vault as
`C:\Users\fleng\Zettelkasten`; it was not inferred from a repository name,
relocated or copied into WSL. Inspection was limited to that configuration,
the saved active-note selection, that note's format and the temporary fixture.
The public Zettel specification and its three templates were inspected at
`fdce8d7`. Its checkout is a tooling/specification repository, not the vault.
The user reports expected environment-dependent slowness despite the vault
directory being local, and uses Synctrayzor/Syncthing to maintain copies on a
Raspberry Pi 5. This increment changes no synchronization configuration and
does not claim a performance diagnosis or a Pi navigation acceptance check.
Synced vault Markdown carries the links, but does not transfer MRW's private
targets in VS Code workspace storage.

The isolated source fixture is the existing offline Euclid transcription,
copied byte-for-byte to `/tmp/mrw-obsidian-nav-20261017`. It supplies navigation
targets only; no mathematical exposition or exercise was added. The temporary
Windows note is **MRWNav202610171235.md**, titled **Temporary MRW navigation
check**, with matching immutable ID/filename, separate editable title, YAML,
`[[ID]]`, `SEE ALSO` and `References`. It remains visibly labeled temporary.
The two production-command clipboard links were placed into this fixture by a
script that checked its exact previous bytes before writing. This was scripted
file preparation, not a claim of manual Obsidian typing/paste acceptance.

The user's `~/Jupyter/mrw-sagepod-study/overview.md`, accompanying notebook,
source and existing private outlines stayed authoritative. The user continued
editing that work during validation. No earlier snapshot was restored and no
prose was reconstructed from chat. A before/after digest comparison is therefore
not reported as proving that all concurrently used files were unchanged.
The implementation writes only explicit association sidecars, never note prose,
outline source blobs or ordinary study files.

## Automated checks

- **42 Node tests passed**, including command tests against the actual bundled
  Python bridge. The standard npm test command also passed; the final
  non-isolated Node runner exposed all individual test results.
- **326 Python tests: 267 passed, 59 skipped** (58 opt-in Qt widget checks and
  one unavailable external project-parent check). Existing available conditional
  integrations ran as part of regression testing; no new Lean build was needed.
- Focused coverage includes Unicode, spaces, punctuation/encoding, malformed
  schemes/actions/parameters, duplicate keys, missing associations, stale
  revisions, wrong workspace/private scope, no-write following, exact retained
  source/region preservation, multiple associations, replacement/removal,
  publication failure, mode `0600` and offline operation.
- JavaScript syntax and Python compilation pass. The changed Python services
  remain toolkit-independent. Qt widgets were not installed/exercised for this
  extension increment. Pi, R3 and SagePod acceptance campaigns were not repeated.

## Desktop observations and defect correction

A normal WSL Development Host used real production commands, clipboard,
webview reader, Python bridge and persistent workspace storage, with scripted
chooser/input answers. Whole-outline and exact-region links were copied without
an active Markdown editor. Separate explicit note associations were saved for
both targets. A normal close/reopen preserved the same copied links and both
associations. Staged runtime bytes came from the checkout; only the test entry
point/activation/configuration differed.

MRW's reader **Open Obsidian note** action opened the actual temporary note in
Windows Obsidian. The user independently observed that note and its Zettel
format. A window capture was inspected locally; unrelated vault names in the
sidebar were not published. This observation establishes navigation, not
independent mathematical use.

The user's first actual Obsidian return-link click exposed a production defect:
the handler serialized the incoming VS Code URI with default escaping, which
encoded query delimiters before parsing and yielded “Unsupported MRW URI”.
The handler now uses minimal serialization of its bounded base64url payload,
and a command regression reproduces the difference. The saved note links did
not need rewriting. The user's questions also exposed ambiguous “current file”
wording; prompts and the guide now explicitly identify the note open in Obsidian.

Outgoing Obsidian URLs are validated again immediately before dispatch. They
use the documented equivalent path form, avoiding the standard opener's
query-decoding ambiguity for encoded `&`/`+` in names. Tests ensure these stay
path data with no query/action parameters. Whole notes identified by vault
name/ID are supported; heading/block selectors and path-form vaults are rejected.

Keyboard automation stopped when another application took focus. An initial
pointer attempt used resized-capture coordinates and did not establish a link
click. These setup attempts are not counted as passing desktop checks.

An ordinary installed 0.6.0 window then received the same saved region URI through
the Windows protocol handler and opened its retained-source view, selecting
exactly line 5, scalar columns 0–30. An actual pointer click on the region link
in Windows Obsidian opened a **new** retained-source document in that same WSL
test workspace with the same selection. This was observed separately from the
Development Host. With the empty `mrw-obsidian-other-20261017` workspace made
the last active VS Code window, a further actual Obsidian click displayed the
intended workspace address and **Copy Link and Open Workspace**, without
resolving a private target in the empty workspace.

That wrong-window trial exposed another interaction defect: a hidden warning's
pending promise held the reader-action guard. The guard is now released before
waiting for a routing decision. A regression exercises an unresolved warning
and confirms that another MRW command can proceed. The final 42-test pass and
delivered package include this correction. Notifications retains the recovery
action when its toast hides.

The isolated installed VS Code window and Windows Obsidian were then closed
normally, leaving the user's other VS Code windows open. After the final package
was installed, reopening the isolated workspace and following the **same saved
URI** restored the reader and its original pinned-range notice. Its associated
note action restarted Windows Obsidian, but Obsidian stopped at **Loading vault…**
with its ordinary reload/restricted-mode options for several minutes. The
normal **Reload app** action was tried; no plugin, vault or restricted-mode
setting was changed. The user subsequently reported that it had loaded and
explained that slow startup is expected. The correct temporary note was then
observed, and the final installed reader's note-opening action was exercised
again against the loaded app. This completes the post-restart note confirmation;
the startup delay is not treated as a navigation failure. No MRW timeout, vault
repair or plugin change was introduced. A repeat pointer-click trial after
restart did not yield an independently confirmed new retained-source selection,
so that specific Obsidian click check remains **unconfirmed**; reopening the same
saved URI through the Windows protocol handler was observed separately.

The recovery notification was observed in the actual wrong workspace. Attempts
to invoke its button through desktop automation did not complete; the actual
button → workspace → clipboard-command sequence remains **unperformed**.
The command regression verifies the supported `vscode.openFolder` call, copied
URI and intended-workspace resolver separately. Normal clipboard following in
the intended workspace also has bridge/command coverage. These automated
results do not substitute for the remaining desktop sequence.

Seven isolated-fixture files were compared before/after navigation: the source,
retained blob, outline state, association sidecar, two publication locks and
temporary Obsidian note. All digests were unchanged. This narrower check avoids
confusing concurrent user edits with navigation writes.

## Delivered package

Built using the established `vscode/README.md` packaging procedure with Linux
Node 24.21.0, UTC and `SOURCE_DATE_EPOCH=1792094267`:

- `vscode/theorem-terminal-0.6.0.vsix`
- SHA-256: `edb05010ea859e9b3f71c5479936a5a06ab26dcd5263eff5898c1d4922e41a25`
- Installed in the existing WSL Debian host as `flengyel.theorem-terminal@0.6.0`.
  All 44 non-manifest installed extension files match the archive; the installed
  manifest differs only by VS Code's installation `__metadata`.
- Archive verification confirms production runtime/core bytes, manifest and
  exclusion of development entry points. The previous 0.5.0 and 0.4.1 VSIX files
  retain their original digests. No Marketplace publication was performed.

[Machine-readable evidence](evidence/obsidian-20261017/validation.json) records
the distinct automated, Development Host, installed desktop and human results;
[archive verification](evidence/obsidian-20261017/package-verification.json)
records exact packaged files. Raw window captures remain local because the
Obsidian sidebar contains unrelated private note names.

## Scope of the result

Successful automated checks and restart persistence establish mechanics.
Obsidian/Windows acknowledges URL dispatch separately from opening a particular
note; MRW cannot inspect the vault or confirm missing-note recovery. Missing
notes are handled by Obsidian, with an explicit association-replacement route.
Copied Markdown transfers no private targets. Other Linux/SSH hosts and native
Windows backend portability remain separately unvalidated/deferred. There is
no plugin, daemon, automatic rewriting, vault index, synchronization, model
request, notebook execution or mathematical-use claim in this increment.
