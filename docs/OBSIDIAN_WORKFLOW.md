# Obsidian and notes in place — 0.23.5

MRW and Obsidian can open the same Markdown notes. MRW supplies Contents,
links, backlinks and Return in VS Code; Obsidian retains its own editing and
rendering. No conversion, import or Zettel metadata is required. Handwritten
work can remain in scans, PDFs or other attachments linked from a note.

MRW also supports links between Obsidian notes and separately retained sources
or passages. Those links are optional and are described below.

## Configure Obsidian with MRW

Open the vault in Obsidian. In MRW, run **Choose Notes Folder…** and select the
same vault root: the folder containing `.obsidian` and the notes, rather than
`.obsidian` itself. Both settings can also be changed in VS Code Settings.

| Setting | Value |
| --- | --- |
| `mrw.notesFolder` | Absolute vault-root path on the extension host. A Windows vault at `C:\Users\<user>\Zettelkasten` is `/mnt/c/Users/<user>/Zettelkasten` in WSL. |
| `mrw.obsidianVault` | Optional Obsidian vault name or ID. Empty uses the selected folder's name, such as `Zettelkasten`. This is not a directory path. |

Open a note through **MRW: Open Document…**, then choose **Open in Obsidian**
above its Markdown preview or run **MRW: Open Note in Obsidian**. This uses the
desktop's registered Obsidian URI handler and requires no Obsidian CLI. If
several vaults share a name, configure the intended vault's ID.

Save edits in Obsidian and return to MRW. While VS Code is focused, MRW checks
the displayed note about every two seconds and refreshes a clean document.
Unsaved VS Code changes prevent replacement; MRW does not save or merge them.
Both applications must address the same files. A link does not synchronize a
separate Linux or SSH copy.

The maintainer's [Zettel repository](https://github.com/flengyel/Zettel) describes
a note format, templates and scripts. Its [wiki](https://github.com/flengyel/Zettel/wiki)
describes Obsidian configuration and conventions. These are optional companion
resources; MRW does not install their plugins, run their scripts or configure
the vault.

MRW's native Markdown preview supports note-local mathematical macros and
explicit rendering of `tikz` fences. See [TikZ diagrams](TIKZ_WORKFLOW.md).
Obsidian embeds and arbitrary LaTeX preambles remain unsupported; a note that
uses them may render differently in the two applications.

## Open a notes folder without import

Use **Open Document…** to browse original notes and papers. The picker starts
in the selected notes folder, lists one directory at a time, and offers
**Search subfolders…** for a wider search. Titles arrive progressively without
blocking **Browse for another document…**. The preview and Contents show the
title beside the filename; neither is rewritten.

Click a WikiLink in preview, select a link in Contents, or use **Follow Document
Link** at the source cursor. Supported links include `[[ID]]`, aliases such as
`[[ID|Label]]`, exact headings, paragraph/list block IDs and scoped paths.
**Show Backlinks…** opens an incoming source occurrence; **Return to Document**
returns to the originating occurrence. **Reopen Document** restores the last
opened or followed file and its exact Markdown selection after restart.
Native preview scrolling and PDF pages are not restored.

Lookup and backlinks stay inside the explicitly selected notes folder and use
unsaved editor text where available. Missing or duplicate targets and incomplete
searches are reported. Filename stems determine note identity; YAML metadata
or a display alias does not redirect a link. `.obsidian`, `.trash`, `.git`,
`.lake`, `node_modules`, `.venv` and `__pycache__` are excluded. For supported
syntax, search bounds and Return behavior, see the
[document workflow](READING_OUTLINE_WORKFLOW.md).

Ordinary-note navigation does not change the separately stored Obsidian
associations on retained sources or passages.

## Open the current note from Obsidian

The optional [OpenInMRW template and setup](https://github.com/flengyel/Zettel/blob/main/doc/OpenInMRW.md)
provide **Templater: Open in MRW**. After that setup, run the command from a
note in Obsidian to open its current file in MRW's Markdown preview and select
it for Contents. No per-note link or clipboard transfer is needed.

The startup template registers the command; it does not automatically open
MRW or insert text. Vault-local `.obsidian/mrw.json` selects the MRW workspace
and the same notes root used by **Choose Notes Folder…**. The action requires
MRW 0.22.5 or later and uses neither the Obsidian CLI nor a note import.
It reads the current filename in reading or editing view, without transferring
cursor positions, selections or YAML.

### Keep a note link

1. In the note's MRW preview, click **Copy MRW link**, or run **MRW: Copy Note
   Link for Obsidian**. The copied Markdown label contains the title and filename.
2. Paste and save the link in an Obsidian note.
3. Click it in Obsidian's reading view, or Ctrl+click while editing. Allow the
   desktop to open VS Code if prompted.

The link records the workspace, selected notes folder and relative filename.
It opens the file's current contents, not a pinned revision, and does not save
or replace unsaved VS Code text. A moved or renamed file needs a new link;
the title is only a label. A link cannot grant a different notes-folder scope.
For a link delivered to the wrong VS Code window, see
[workspace routing and recovery](#workspace-routing-and-recovery).

<a id="import-note-text-0140"></a>

## Import Markdown text

Import only when a separate retained copy or text insertion is useful. Run
**MRW: Import Markdown Text…** from the Studies menu or Command Palette, choose
a destination, then select a `.md` or `.markdown` file.

| Destination | Result |
| --- | --- |
| Retain a source copy | Saves a revision for passage links and reader annotations |
| Add text to a passage annotation | Saves the text as an annotation on a selected source passage |
| Insert text into a Markdown document | Inserts at the active Markdown cursor, or offers a document picker |

Importing the same file revision reopens its saved copy with annotations intact.
A changed revision gets a separate copy. Notes up to 2 MiB are supported;
longer passages are split at the reader's 256 KiB range limit. The source title
initially uses the filename, and the retained copy remains readable after the
original changes or disappears.

Annotation import accepts up to 16 KiB, with origin and author initially unknown;
edit that attribution when known. Document insertion remains unsaved until
ordinary Save and can be undone. The combined Markdown document retains the
4 MiB navigation limit.

The original note is unchanged. Retained Markdown is displayed as text:
YAML, WikiLinks and embeds remain in that text, but linked notes and attachments
are not copied or resolved by the saved-source reader. Save source-editor
changes before importing, and select Windows files through their `/mnt/c/…`
paths when working in WSL.

## Link a note to a source or passage

1. In Obsidian, open the existing note and run **Copy Obsidian URL for current
   file**. The URL has the form
   `obsidian://open?vault=Zettelkasten&file=NOTE_ID` and contains no note prose.
2. In MRW's saved-source reader, expand **Source details and tools** and, for a
   published source, **Source links and Obsidian notes**. Choose **Link an
   Obsidian note…** under **Whole source**, or use a passage's **This passage**
   group. Paste the URL and enter a short label.
3. Use **Open linked note in Obsidian** in that group to open it.
   **Manage linked notes…** offers **Replace linked note** and **Remove note link**.

The stored association contains an address, a label and an exact MRW reference,
not a copy of the note. Multiple notes produce a chooser. **All linked notes
and earlier passage ranges** retains access to associations whose passage
range has since changed.

## Put an MRW link in the Obsidian note

1. In the saved-source reader, choose **Copy link to this source** under
   **Whole source**, or **Copy link to this passage** under **This passage**.
   Alternatively run **MRW: Copy Source or Passage Link…** and select a target.
2. Paste and save the Markdown link in an Obsidian note, for example under
   References.
3. Click the link to open the saved reader. A passage link also selects its
   exact retained range in a read-only source view.

**Copy link** supplies a destination from the note into MRW. **Link an Obsidian
note…** supplies a destination from MRW back to the note. Each action is explicit;
copying one does not create the other.

Whole-source actions address the entire saved source. **This passage** addresses
its current range. **Earlier linked passage** preserves the range from an older
link when that range differs from the current passage.

## Workspace routing and recovery

MRW links carry their target separately from the workspace address. Retained
links use `mrw-outline:v1` or source-qualified `mrw-outline:v2` references;
ordinary-note links identify current files. WSL routing uses the distribution
name and saved folder/workspace path. For SSH, set **MRW: Navigation Workspace
URI** in Remote settings to the intended folder or `.code-workspace` file's
`vscode-remote://ssh-remote+HOST/…` address. Save an untitled multi-folder workspace
before copying a link.

If VS Code delivers a link to a different workspace, choose **Copy Link and Open
Workspace**, then run **MRW: Open Link from Clipboard** in the intended window.
The command accepts either the Markdown link or its complete URL. If no handler
is available in the receiving window, open the intended WSL workspace and use
the clipboard command there. A dismissed routing warning remains in VS Code's
Notifications. Standard workspace-trust and remote-connection prompts apply;
MRW commands are unavailable in Restricted Mode.

For unavailable private storage, reopen the original workspace/profile or use
the [storage guide](ARTIFACT_STORAGE.md) to open a complete saved-work copy.
Do not reset storage or recreate targets to repair a link. Retained sources
remain readable if the original file changes or disappears. After a supported
store transfer to another workspace address, open the mapped workspace and use
**Open Link from Clipboard**; the original link cannot guess the new address.

Supplied Obsidian associations accept only `obsidian://open` URLs with `vault`
and `file`, addressing a whole note. Path-form vaults, heading/block selectors,
names containing `?` or `#`, and write/search/callback actions are unsupported.
Dispatch uses the equivalent `obsidian://vault/…` form. Successful dispatch
means the desktop accepted the URL, not that Obsidian confirmed the target.
For a missing note or vault, copy the intended note's current Obsidian URL and
replace the association.

## Persistence and limits

Associations persist beside saved-source state in
`outlines-…/OUTLINE_ID/obsidian-links.json`, with up to 64 associations and
128 KiB per outline. Removing an association deletes neither the note nor
retained material. Failed or uncertain publication blocks further private
writes until host reload; keep unsaved text before reloading. Concurrent writing
from multiple installations is unsupported.

**Copying a Markdown note does not copy MRW's retained sources, annotations or
associations.** **Move Saved Work Directory…** and **Open Saved Work Directory…**
handle the supported saved-work store separately; see
[storage scope and recovery](ARTIFACT_STORAGE.md). Current-study checkpoints
and interaction history are outside that transfer.

Opening ordinary Windows-vault notes through `/mnt/c` does not qualify that
location for MRW's private saved-work store. Windows-backed store placement
remains unqualified. Neither pausing synchronization nor closing Obsidian is
an established remedy for the recorded replacement failures. The
[storage comparison](WSL_ARTIFACT_STORAGE_COMPARISON.md) and
[Obsidian-closed observation](ARTIFACT_STORAGE_VALIDATION.md#user-requested-obsidian-closed-check--2026-10-20)
record those limited tests; they do not impose a requirement to close Obsidian
for ordinary reading.

MRW does not discover or rewrite a vault, synchronize its contents, or start a
background server. Navigation starts no compiler, model, notebook or container.
The [Obsidian validation report](OBSIDIAN_VALIDATION.md) records desktop
round-trip and routing checks. [Reading repairs](READING_REPAIRS.md) describes
the newer note navigation and rendering checks and their remaining limits.
