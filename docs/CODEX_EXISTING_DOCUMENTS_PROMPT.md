# Codex task: existing documents, note navigation, and a usable tutorial

> The creation-command instructions below are superseded by 0.23.26.
> New Reading Document is removed; creation is delegated to the authoring
> application. Preserve existing documents. See [notes applications](NOTE_COMPANIONS.md).

Status: next authorized implementation increment, 2026-11-06.
Reviewed baseline: MRW 0.19.2 at `42b465f2fbdab96445e4c59cc5c3818cb735b4e7`.
Implement increment 2 of [RESEARCH_WORKSTATION_DESIGN](RESEARCH_WORKSTATION_DESIGN.md).
The terminology task is delivered. Preserve newer work when reconciling main.

## Result to deliver

Open an existing mathematical note in place, follow another note and a linked
PDF, inspect which notes link back, and return to the original location. Repeat
after ordinary restart. This must work with an ordinary selected folder without
Obsidian, source import, note conversion or a model account. Then show how the
existing reader/study tools can help with a difficult passage and retain the work.
The tutorial must explain that route in the order it is used.

Read AGENTS.md and its required design documents, then this task and the current
continuation. GPTWork handles review/design; local Codex implements in the existing
VS Code/WSL2 checkout. Inspect the working tree and running development before
editing. Preserve local changes, genuine work, installed packages and later fixes.
Implement in two working steps: host opening and scope first, then links and
backlinks. Keep both within this task; an opening-only patch does not complete it.
Use independent workers for parser/navigation, scoped note links, and tutorial/
acceptance if useful, with explicit file ownership and one integration owner.

## What the review found

These are code findings at the baseline, not native-window acceptance results:

| Finding | Starting point |
| --- | --- |
| Show/Choose Contents selects a Markdown document and focuses the tree; it is not a general opener. | `vscode/src/readingOutline.js`, `openReadingOutline` and `selectOverview` |
| Both selection and Return reject files outside the workspace, even after explicit selection. | `checkFile`, `checkDocument`, and the return handler in the same file |
| Contents emits only MRW retained references; ordinary Markdown links and `[[ID]]` are omitted. | `vscode/src/readingMarkdown.js`, link filtering |
| Leading Zettel YAML is misread as a Setext heading. The exact bundled parser reproduces this despite its three existing unit tests passing. | Same parser: a leading `---`, YAML fields, closing `---`, then `# Title` |
| The text-retention snapshot helper requires bounded UTF-8 text and is unsuitable for opening PDFs. | `vscode/src/navigation.js` |
| The existing Obsidian bridge opens supplied associations; it does not discover arbitrary vaults. | `companionLinks.js`, `outline_notes.py`, `OBSIDIAN_WORKFLOW.md` |
| The tutorial had current labels but led with study/graph controls; it also confused selecting Contents with opening a document. Help comes from the active installed package through a fixed virtual URI. | `vscode/media/first-steps.md`, tutorial provider in `readingOutline.js` |

The accompanying documentation change reorganizes the tutorial for capabilities
already delivered in 0.19.2. Update it again with this implementation. A repository
edit alone does not update installed help. The 0.19.2 report says the working window
was not reloaded; the tutorial actually visible in that window was not observed.

## 1. Open documents through the host

- Add **MRW: Open Document…** as a thin host-opening entry point that actually
  displays the selected original. Markdown uses the existing editor/preview;
  other formats use their registered host editor or reader. Make the primary
  first-use action open existing work. Keep New Document and the optional example
  secondary. Retain the established command/view IDs and retained-reference format.
- Opening Markdown can select its Contents without hiding the document behind
  the tree. **Choose Document…** remains explicitly a choice for Contents. Keep
  opening, retaining a revision, and importing text separate operations.
- Permit an explicitly selected external file and an explicitly selected notes
  folder. Apply that scope consistently to open, Contents, follow, return and
  reopen. Remember the host-appropriate URI and choice in the current workspace;
  cancellation preserves the prior selection and drafts. Missing or relocated
  files require an explicit new choice, never a guessed substitute.
- A Windows vault accessed as `/mnt/c/...` in WSL is ordinary document storage.
  Reading it must not trigger MRW private-store qualification or relocation.
  Preserve the independent trust, private-store and exact retained-reference
  checks. A selected file does not authorize recursively indexing its ancestors;
  a link click does not silently expand the indexed folder. Reuse normal host
  handling and explicit selection without repeated approval for the same scope.
- PDF opening delegates to an available host reader. Provide a clear local
  fallback when none is available; do not open PDF bytes as text or install an
  extension implicitly. File opening, page restoration, bookmarks and extraction
  are separate capabilities. Claim only what the chosen reader exposes. This
  increment requires file-level opening and return, not OCR or a new PDF viewer.

## 2. Navigate existing notes without rewriting them

- Exclude a delimited leading YAML front-matter block from headings and links
  without shifting original line/character positions. Define malformed-block
  behavior. Preserve CommonMark headings, code/comment exclusions, Unicode,
  CRLF, duplicate occurrences, unsaved edits and existing exact MRW references.
- Support ordinary relative Markdown links to notes/files, including heading
  fragments, and Zettel `[[ID]]` links in the advertised reading workflow.
  Reuse VS Code's standard link handling where it supplies the required behavior.
  Do not build another Markdown renderer. Missing, ambiguous or unsupported
  targets receive a local explanation; never choose a similar title or silently
  substitute the whole note for an unsupported exact selector. Link text is data,
  not permission to execute commands, templates, scripts or embedded content.
- Resolve Zettel IDs only within the selected notes folder. Preserve the
  immutable filename/ID, editable titles, YAML, `[[ID]] Title` prose, older dotted
  IDs and reserved index IDs. Report duplicates and conflicting identity metadata.
  Do not require every Markdown file to pass the Zettel validator. The public
  [Zettel repository](https://github.com/flengyel/Zettel) supplies conventions and
  tools, not the private vault. Consult its [specification](https://github.com/flengyel/Zettel/blob/fdce8d73b7d6c947b58d7028e4e4e4e03138f186/README.md)
  and [index navigation](https://github.com/flengyel/Zettel/wiki/Alphanumeric-Index).
- Show backlinks for both supported Markdown links and Zettel ID links as
  source-note occurrences that can be opened. Prefer a
  contextual **Show Backlinks…** picker or an existing suitable native surface;
  Contents still means navigation within a document. Use a bounded, cancellable,
  rebuildable index of the selected folder. Respect dirty editor text and external
  edits. Show incomplete/error state separately from a completed empty result.
  Keep files authoritative; no persistent database or background synchronization
  service is needed. Do not follow directory symlinks outside the selected scope.
- Keep **Open in Obsidian** optional. Reuse a supplied association or explicit
  folder-to-vault mapping; never infer a vault from a folder basename or WSL path.
  Preserve the existing validated URL bridge and whole-note contract. Ordinary
  Markdown opening and navigation must work when Obsidian is absent.
- Preserve return locations through ordinary edits using the existing location
  tracking where applicable. Commit an origin only after a successful follow;
  failed and superseded asynchronous opens preserve the last usable destination.
  Ordinary note navigation must not overwrite an unrelated retained-reader
  return origin. Test each route, including exact undo and restart revision checks.

Follow Microsoft's [Views](https://code.visualstudio.com/api/ux-guidelines/views)
and [Command Palette](https://code.visualstudio.com/api/ux-guidelines/command-palette)
guidance: native content, concise labels, contextual actions and few primary
controls. Use the [host opening APIs](https://code.visualstudio.com/api/references/commands)
rather than a custom editor shell. Preserve user layout and keyboard access.

## 3. Make the tutorial part of the delivered feature

Keep `vscode/media/first-steps.md` task-first and matched to the packaged behavior:

1. Open an existing note or paper. Explain Document and Contents at the point of
   use, and state format-specific limits beside the affected action.
2. Follow a note/PDF link, inspect backlinks, and return. Explain selected-folder
   scope once; show the optional existing-vault route without requiring Obsidian.
3. Retain a passage only when the saved reader/annotation/study workflow needs it.
   Distinguish the original document from a saved source and imported text.
4. Work through one difficult step using a reader explanation or the existing
   question/help/attempt workflow. Show attribution and saving. Do not invent
   a delivered general Research view or automatic reconstruction capability.
5. Close and resume the work with the commands that actually exist. Distinguish
   editor Save, Save annotation, Pause / save, and the two existing study workflows.
   Keep proof graphs, API setup and storage recovery in linked advanced guides.

Display the active extension version (and available build identity) in help,
derived from runtime metadata. Reopening help must show that active build's
contents rather than a stale virtual-document snapshot. Do not label the version
on disk as active if the running host has not adopted it. Keep guide links usable
from the virtual tutorial URI. Test the packaged tutorial, including its first-use
entry and reopen path. Do not force a reload of a working window with drafts.

## Acceptance and delivery

Use disposable notes conforming to the existing conventions, not the private
vault as a destructive fixture. Demonstrate one route: open a front-matter note
outside the repository, follow a second note and PDF, open a backlink, return to
the correct occurrence, edit/undo, and close/reopen. Repeat the ordinary-folder
route without Obsidian. Opening and indexing alone must leave original bytes
unchanged; only explicit host edits may write them. No import is needed to read.

Add focused coverage for front matter and offsets, ordinary/ID links, duplicate
and missing IDs, external folder and symlink boundaries, unsaved/external edits,
cancelled or failed follows, asynchronous open races, stale restart pins and
retained-reference isolation. Check the missing PDF reader case and the tutorial's
active-version/reopen behavior. Reuse representative fixtures; do not mirror the
implementation with superficial assertion counts.

Run the applicable Node/bridge tests and one final broader regression pass as
required by AGENTS.md, with Python coverage for changed shared services. Exercise
the actual extension host when available. If launch fails, report the concrete
host limit separately; API doubles or headless browser checks are not native
observation. Do not repeat an unchanging launch failure or require another manual
study session before completing the authorized work.

Package and verify the VSIX, install through the established WSL workflow, and
record package/build identity and whether the working window adopted it. Preserve
that window and genuine records. Update README, UX_SPEC, relevant document/
Obsidian guides, CODEX_PLAN and CODEX_CONTINUATION together. Commit and push the
completed increment to main without overwriting concurrent work. Report what is
implemented, what was observed, and what remains host-dependent.

Keep source provenance, 0.19.1 repairs, bounded R3 exchange and existing study/
history semantics intact. Extend existing local history only for useful explicit
open/follow/return failures and outcomes; do not create a second recorder or infer
cognitive load from navigation. General research resumption and the integrated
argument-reconstruction session remain increments 3 and 4. No storage migration,
publication, corpus ingestion or new learning framework belongs to this task.
