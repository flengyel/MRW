# Obsidian and notes in place

This guide describes the optional Obsidian integration. Source annotations and
linked notes remain independently editable. Obsidian owns creation through its
configured template; existing notes may be edited in either application's
native editor. Shared-file refresh is implemented; automatic cross-system
rename/move reconciliation is not claimed.

MRW and Obsidian can open the same Markdown notes. MRW supplies Contents,
links, backlinks and Return in VS Code; Obsidian retains its own editing and
rendering. No conversion, import or special note metadata is required. Handwritten
work can remain in scans, PDFs or other attachments linked from a note.

MRW also supports links between Obsidian notes and separately retained sources
or passages. Those links are optional and are described below.

To start a note from MRW, choose **New Note…** in its **Commands** view or
**MRW Document** menu. MRW brings Obsidian forward and invokes your configured
creation command; see [setup](#new-note). No format is imposed on existing notes.
[Notes applications](NOTE_COMPANIONS.md) describes the supported routes and
proposed adapters for other editors.

## Configure Obsidian with MRW

Use [the general MRW workspace](WORKSPACE_SETUP.md),
`~/mrw-work/MRW.code-workspace`, for a new installation. The vault is an external
notes folder; it need not be the VS Code workspace or move onto Linux. Existing
Obsidian-to-MRW links still route to their recorded workspace. Keep that workspace
available until its retained references and saved work have been accounted for;
setup does not rewrite notes or `.obsidian/mrw.json`.

Open the vault in Obsidian. In MRW, run **Choose Notes Folder…** and select the
same vault root: the folder containing `.obsidian` and the notes, rather than
`.obsidian` itself. Both settings can also be changed in VS Code Settings.

The chooser shows the current folder and recent choices with full paths. Select
a recent vault to switch back, or **Browse for notes folder…** to choose another.
Recent choices are remembered for this workspace after restart. MRW reports the
selected path; cancelling does not change it.

| Setting | Value |
| --- | --- |
| `mrw.notesFolder` | Absolute vault-root path on the extension host. A Windows vault at `C:\Users\<user>\Notes` is `/mnt/c/Users/<user>/Notes` in WSL. |
| `mrw.obsidianVault` | Optional Obsidian vault name or ID. Empty uses the selected folder's name, such as `Notes`. This is not a directory path. |

Open a note through **MRW: Open Document…**, then choose **Open in Obsidian**
above its Markdown preview or run **MRW: Open Note in Obsidian**. This uses the
desktop's registered Obsidian URI handler and requires no Obsidian CLI. If
several vaults share a name, configure the intended vault's ID.

Save edits in Obsidian and return to MRW. While VS Code is focused, MRW checks
the displayed note about every two seconds and refreshes a clean document.
Unsaved VS Code changes prevent replacement; MRW does not save or merge them.
Both applications must address the same files. A link does not synchronize a
separate Linux or SSH copy.

The maintainer's [published note format](https://github.com/flengyel/Zettel) describes
a note format, templates and scripts. Its [wiki](https://github.com/flengyel/Zettel/wiki)
describes Obsidian configuration and conventions. These are optional companion
resources; MRW does not install their plugins or configure the vault. New Note
invokes only the Obsidian command selected in your MRW settings.

MRW's native Markdown preview supports note-local mathematical macros and
explicit rendering of `tikz` fences. See [TikZ diagrams](TIKZ_WORKFLOW.md).
Obsidian embeds and arbitrary LaTeX preambles remain unsupported; a note that
uses them may render differently in the two applications.

## New Note

Since MRW 0.23.24, **New Note** runs an Obsidian command when the selected notes
folder is a vault. Obsidian creates the file and applies its template. MRW does
not ask for another title, prefill a file, insert a source link, or save other
editor buffers. The current document stays open in MRW.

1. Enable **Settings → General → Command line interface** in Obsidian. Use an
   installer that supports the CLI; see [Obsidian's CLI setup](https://help.obsidian.md/cli).
2. In VS Code's workspace settings, set **MRW: Obsidian New Note Command**
   (`mrw.obsidianNewNoteCommand`) to the command that creates a note through
   your vault's template. There is no default command or plain-file fallback.
   For a Templater template called `Templates/NewFileTemplate.md`, use
   `templater-obsidian:create-Templates/NewFileTemplate.md`. Enable the template
   in Templater's template hotkeys so that this command is registered.
3. In MRW, choose **New Note…** or run **MRW: New Note…** from the Command Palette.
   MRW brings Obsidian forward and runs the chosen command. Complete its prompts
   in Obsidian. Use your **Open in MRW**
   command to bring the completed note back. It enters MRW's Recent Documents when
   MRW opens it; that list does not read Obsidian's recent-file history.

Use the creation command, not Templater's `insert-…` command, which edits the
active note. MRW rejects the plain `file-explorer:new-file` command and the
known insert-template commands. Other explicitly configured plugin commands
remain supported; configure one that runs your creation template. MRW can check
that the command is registered, but cannot certify what an arbitrary plugin
command does or that its interactive template has finished.
To inspect the registered IDs, run
`obsidian vault="Your vault" commands` in a terminal where the CLI is available.

MRW checks the vault's actual path and registered commands before dispatch.
An unavailable CLI or command produces an error, without a fallback file.
After an uncertain command timeout, check Obsidian before retrying: the command
may already have run. MRW never retries it automatically.

**MRW: Obsidian Executable** (`mrw.obsidianExecutable`) can name the CLI executable
without arguments. Empty uses `obsidian` on PATH, `Obsidian.com` on Windows,
or the standard Windows user installation from WSL. The vault remains on the
Windows filesystem in the WSL case. A custom installation needs this setting.
The workspace must be trusted before its configured command can run.

For a folder without `.obsidian`, New Note opens a blank Markdown editor in
VS Code. Use Save to choose the filename and location. MRW supplies no template
or generated filename. Obsidian is optional.

## What the handoff does

Three routes are involved:

| Action | Route | What success establishes |
| --- | --- | --- |
| New Note | CLI checks the vault and command, URI handler brings Obsidian forward, CLI invokes the chosen command. | Dispatch completed without a reported error; template prompts and saving still belong to Obsidian. |
| Open in Obsidian | URI names the selected vault and relative note path. | The desktop accepted the address; MRW receives no confirmation that Obsidian found the note. |
| Open in MRW from Obsidian | The optional Templater command opens an MRW URI containing the workspace, notes root and relative Markdown filename. | MRW validates scope and opens that file's current contents. This is not a retained citation. |

For New Note, MRW checks the configured vault and command before invoking it
once. A timeout can leave dispatch uncertain; check Obsidian before retrying.
Obsidian documents its [CLI](https://help.obsidian.md/cli) and
[URI handler](https://help.obsidian.md/uri) separately.

The MRW source passage is not sent to the template. MRW neither receives the
new filename nor waits for the user to finish writing. Complete and save the
note in Obsidian, then use Open in MRW if you want to read it there. For an
already open Markdown note, external edits can refresh its clean MRW preview;
unsaved VS Code text is preserved. This is shared-file access, not synchronization
between separate copies.

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
opened or followed file. A matching saved Markdown selection is restored;
after edits, the current file opens without applying the obsolete range.
Your unsaved text is preserved. Exact Return still checks the originating
occurrence. Native preview scrolling and PDF pages are not restored.

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
**MRW: Import Markdown Text…** from the Command Palette, choose
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

1. In Obsidian, open the note and run **Copy Obsidian URL for current
   file**. The URL has the form
   `obsidian://open?vault=Notes&file=NOTE_ID` and contains no note prose.
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

## Continue a reader annotation

In Reader notes, choose **Link another note…** beside a saved annotation.
Select an existing note, or invoke your
configured Obsidian template creation command. Complete creation in Obsidian
and explicitly select the saved file. Existing notes can also be edited and
saved in the native VS Code editor.

The source annotation remains editable. The linked note may paraphrase it,
combine several sources, or contain independently written work. Multiple notes
can link to one annotation and the same note to several annotations. Source
identity, original attribution, exact retained-passage reference and the snapshot
captured when linking remain available separately.

Copying the annotation and its attribution/return link is optional. Use the copy
actions when useful, then save in the authoring application. **Confirm selected
saved note and link** verifies the saved destination and selected format without
requiring an exact-text replica or special marker. If **Zettel — flengyel/Zettel**
is selected, the existing external validator checks that note only. Other notes
keep their own format. Format validation does not establish intellectual
completeness or useful conceptual links. See [source notes and linked notes](NOTE_COMPANIONS.md#source-notes-and-zettels).

The maintainer's format keeps filename stem equal to YAML id, YAML title as
ID plus human title, a unique H1, SEE ALSO and Research, and a title-appropriate
index link. Preserve reference-section-title: References for exported
bibliographies. MRW does not create or fill that template.

Prior transfer records and snapshots remain readable. After linking, edit the
source annotation or open the external note according to the work being done.
Neither silently overwrites the other. Removing an association does not delete
its external note. Missing targets, dirty buffers and uncertain publication
retain their explicit recovery paths; no retry creates another note.

### Pending transfers and missing notes

The pending record survives MRW restart in the existing private source store.
Resume it beside the annotation. Repeated invocation neither creates another
file nor inserts text. A duplicate optional copy is reported; linking does not require copying. If saving
failed, the annotation remains current. If note text was saved but link
publication failed, keep that text and recover/reload the private store as
instructed; verify the same pending destination without pasting again.

Destination changes are rechecked by saved revision; the two works may develop
independently. Cancellation never removes pasted text. MRW never writes around
an application's unsaved buffer. The authoring application owns editing and Save;
these stores are not a distributed transaction.

A missing or renamed note is labelled in the reader. Manage association offers
explicit relinking to a selected file. Removing a link preserves the external
file and captured source snapshot. Deleting the source annotation leaves vault
files alone. No background title search or recreation runs.

## Put an MRW link in the Obsidian note

1. In the saved-source reader, choose **Copy link to this source** under
   **Whole source**, or **Copy link to this passage** under **This passage**.
   Alternatively run **MRW: Copy Source or Passage Link…** and select a target.
2. Paste and save the Markdown link in an Obsidian note, for example under
   a Research heading.
3. Click the link to open the saved reader. A passage link also selects its
   exact retained range in a read-only source view.

**Copy link** supplies a destination from the note into MRW. **Link an Obsidian
note…** supplies a destination from MRW back to the note. Creating one link
does not create the other.

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
512 KiB per outline, including optional annotation continuations. Removing an association deletes neither the note nor
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
remains unqualified. Ordinary reading does not require closing Obsidian.

MRW does not discover or rewrite a vault, synchronize its contents, or start a
background server. Navigation starts no compiler, model, notebook or container.
