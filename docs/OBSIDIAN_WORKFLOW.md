# Obsidian notes and MRW retained passages

MRW 0.6.1 connects the existing Obsidian Zettelkasten to saved source outlines
and exact retained passages. Obsidian owns note editing, mathematical rendering,
links and attachments. MRW owns its source reader and retained material.
Handwritten derivations can stay handwritten: link scans, PDFs or other ordinary
references from the Obsidian note. No LaTeX transcription is required.

## Link a note to an outline or passage

1. In **Obsidian**, open the existing note you want to return to. Press **Ctrl+P**
   and run **Copy Obsidian URL for current file**. Here “current file” means the
   note open in Obsidian. Its URL is an address such as
   `obsidian://open?vault=Zettelkasten&file=NOTE_ID`; it contains no note prose.
2. In **MRW's source reader**, click **Link an Obsidian note…** under **Whole
   outline**, or in the desired passage card’s **This passage** group. Paste that
   URL and enter a short
   note title or ID. This sets that note as the return destination from the
   selected MRW target.
3. Click **Open linked note in Obsidian** in the same group to return to the note.
   **Manage linked notes…** offers **Replace linked note** or **Remove note
   link**. The **All linked notes and earlier passage ranges** section also
   exposes earlier pinned targets after a range changes.
   One linked note shows its saved label beside its open button. Several notes
   offer a chooser. An empty group says no note is linked yet; use **Link an
   Obsidian note…** to add the return destination.

An Obsidian URL is not copied note text. Existing notes keep their immutable IDs
matching filenames, separate editable titles, YAML front matter, `[[ID]]`
links, `SEE ALSO` and `References`. No MRW note format or conversion is needed.
The [Zettel specification](https://github.com/flengyel/Zettel) and
[templates](https://github.com/flengyel/Zettel/tree/main/templates) remain the
companion conventions, not a location from which MRW discovers a private vault.

## Put an MRW link in the Obsidian note

1. In MRW, click **Copy link to this outline** under **Whole outline**, or
   **Copy link to this passage** in the desired passage’s **This passage** group.
   Alternatively run **MRW: Copy Outline or Passage Link…** from the Command
   Palette and choose an existing saved outline and target. No Markdown editor
   or cursor position is required.
2. Paste the ordinary Markdown link into your Obsidian note, for example under
   **References**, using Obsidian's normal editing and saving.
3. Click the link in Obsidian's reading view, or Ctrl+click while editing. Permit
   Windows to open VS Code if prompted. MRW opens the saved reader; a passage
   link also selects the pinned passage in a read-only retained-source view.

**Copying** supplies the MRW destination for your note. **Linking an Obsidian
note** supplies the return destination from MRW. These are separate explicit
actions; copying a link does not automatically link a note back. Both buttons
have brief tooltips explaining this.

**Whole outline** actions affect the whole source outline. A passage card’s
**This passage** actions use its current range. If a saved link points to an
earlier range, **Earlier linked passage** keeps that original pinned target;
the current passage’s actions stay separate. **All linked notes and earlier
passage ranges** labels each stored target and preserves access after range edits.

## Workspace routing and recovery

The link contains a stable `mrw-outline:v1` reference and a separate workspace
address. WSL normally uses the distribution name and saved folder/workspace
path. For SSH, set **MRW: Navigation Workspace URI** in Remote settings to that
folder or saved `.code-workspace` file's `vscode-remote://ssh-remote+HOST/…`
address. Save an untitled multi-folder workspace before copying a link.
These addresses contain no transient window ID or callback token.

VS Code can deliver a link to the topmost window. If that window has a different
workspace, MRW does not resolve the private target there. Choose **Copy Link and
Open Workspace**, then run **MRW: Open Link from Clipboard** in the intended
workspace. If that window has no MRW handler, open the intended WSL workspace
yourself, copy the Markdown link or its complete URL from Obsidian, and use the
same command. Standard VS Code trust and remote-connection prompts still apply.
Opening the intended workspace uses VS Code's normal window selection. Wait for
the connection and any folder-specific trust prompt before running the clipboard
command; MRW commands remain unavailable in Restricted Mode.
If the warning disappears, open VS Code's **Notifications** to find its recovery
action. A hidden routing warning does not block other MRW commands.

Unavailable private storage or a different private-store scope produces an
error: reopen the original workspace/profile with its original private state.
Do not recreate targets or reset workspace storage. Missing/changed original
sources do not prevent access to retained bytes. Region links keep their old
range when the reading association changes; MRW reports the change explicitly.

Only supplied `obsidian://open` URLs with exactly `vault` and `file` are supported.
The vault must be a name or ID, and the target a whole note; path-form vaults,
heading/block selectors and names containing `?` or `#` are outside this increment.
Dispatch uses Obsidian's documented equivalent `obsidian://vault/…` path form,
so encoded punctuation in a name cannot become a writing query parameter.
Writing, callback, search and other actions/parameters are rejected. Windows/Obsidian
handles note existence and application availability; successful URL dispatch
does not acknowledge that a note opened. If Obsidian reports a missing note or
vault, open the intended existing note there, copy its current Obsidian URL,
and replace the association. MRW does not search for a replacement.

## Persistence and limits

Associations survive normal close/reopen in private
`outlines-…/OUTLINE_ID/obsidian-links.json` beside the existing outline state.
Only bounded labels, Obsidian URLs and exact MRW references are stored: at most
64 associations and 128 KiB per outline. Writes use exact-previous-byte checking,
the existing publication lock, atomic replacement and directory synchronization.
Failed/uncertain publication blocks further outline/association writes until
host reload. Removing an association retains an empty state file; it deletes
neither note nor retained material. Same-project concurrent hosts remain unsupported.

**Copying or synchronizing a Markdown note does not transfer its MRW private
targets.** There is no vault indexing, automatic rewriting, content
synchronization, Obsidian plugin or background server. The existing extension
identity/storage and legacy `mrw-outline:v1` links remain compatible. Native
Windows backend portability remains deferred. Navigation initiates no model,
compiler, notebook, container or mathematical analysis.

See [validation and the tested configuration](OBSIDIAN_VALIDATION.md).
Interoperability does not establish mathematical usefulness.
