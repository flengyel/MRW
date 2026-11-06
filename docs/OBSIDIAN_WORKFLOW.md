# Notes in place and optional Obsidian associations — 0.20.0

MRW opens ordinary notes in place and provides scoped note links and backlinks
without Obsidian or text import. It separately connects supplied Obsidian note
URLs to saved sources and exact retained passages. Obsidian owns its note
editing and rendering; VS Code owns ordinary files opened in MRW. MRW owns its
saved-source reader and retained material.
Handwritten derivations can stay handwritten: link scans, PDFs or other ordinary
references from the Obsidian note. No LaTeX transcription is required.

## Open a notes folder without import

Run **MRW: Open Document…** and choose the original note. **Choose Notes
Folder…** explicitly selects the folder for `[[ID]]` lookup and **Show
Backlinks…**. A vault is just one possible folder: ordinary Markdown works
without Zettel metadata or Obsidian. In WSL, a Windows folder may be selected
through `/mnt/c/…`; reading it does not move MRW private storage there.

Use Contents or **Follow Document Link** at the cursor to follow relative
Markdown note/file links and exact `[[ID]]` links. Heading fragments work for
Markdown; PDF links open the whole file through an available host reader.
PDF page/block selectors are not silently replaced by whole-file targets.
Backlinks open source-note occurrences; **Return to Document** restores the
origin. The selected folder, document and matching return pin survive normal
restart in the same workspace. **Reopen Document** explicitly opens the last
opened/followed file; activation does not reopen it automatically. Dirty buffers
stay under VS Code's save/undo and recovery controls.

The bounded index is rebuilt explicitly from the chosen folder, using dirty
editor text where available. It does not discover a vault, scan ancestors or
follow directory symlinks outside scope. Missing, duplicate and conflicting IDs,
unsupported selectors and incomplete scans receive local explanations. IDs
remain filename stems; editable titles and `[[ID]] Title` prose do not rename
notes. Leading delimited YAML stays metadata rather than Contents. See
[the document workflow](READING_OUTLINE_WORKFLOW.md) for exact limits.

This ordinary-folder route does not infer an Obsidian vault mapping. To open an
Obsidian note from a saved reader, supply its validated association below.

## Import Markdown text

Run **MRW: Import Markdown Text…** from the Studies menu or F1. Choose where its
text should go, then select the note’s `.md` or `.markdown` file:

| Destination | Result |
| --- | --- |
| Retain a source copy | Retains the file and opens its text for reading, passage links and annotations |
| Add text to a passage annotation | Select a saved source and passage; its reader notes receive the note text |
| Insert text into a Markdown document | Inserts text at the active Markdown document cursor, or offers a Markdown document picker |

The source option saves its retained copy during import. Importing the same file
at the same revision reopens that copy and preserves annotations. A changed file
gets a separate copy. Notes up to 2 MiB are supported; longer passages are split
at the reader’s 256 KiB range limit. The source remains readable after the vault
file changes or disappears. The source title initially uses the filename.

Annotation import saves up to 16 KiB of text, with origin and author initially
unknown. Edit its attribution in the reader when known. Document insertion
leaves an unsaved editor change: **Ctrl+S** saves it and ordinary Undo reverses
it. The combined Markdown document retains the 4 MiB navigation limit.

The original note stays unchanged. In the imported copy, YAML, wiki links and
embeds remain in the Markdown text; linked notes and attachments are not copied
or resolved by the saved-source reader. That reader shows retained Markdown as text. Save open note-editor changes
before importing. In WSL, select a Windows vault file through its `/mnt/c/…`
path; no vault discovery or background synchronization runs.

## Link a note to a source or passage

1. In **Obsidian**, open the existing note you want to return to. Press **Ctrl+P**
   and run **Copy Obsidian URL for current file**. Here “current file” means the
   note open in Obsidian. Its URL is an address such as
   `obsidian://open?vault=Zettelkasten&file=NOTE_ID`; it contains no note prose.
2. In **MRW's source reader**, click **Link an Obsidian note…** under **Whole source**, or in the desired passage card’s **This passage** group. Paste that
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

1. In MRW, click **Copy link to this source** under **Whole source**, or
   **Copy link to this passage** in the desired passage’s **This passage** group.
   Alternatively run **MRW: Copy Source or Passage Link…** from the Command
   Palette and choose a saved source and target. No Markdown editor
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

**Whole source** actions affect the whole source. A passage card’s
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
command; MRW commands remain unavailable in Restricted Mode. If no trust prompt
appears, run **Workspaces: Manage Workspace Trust** and trust only the intended
folder; leave any option to trust its parent unchecked.
If the warning disappears, open VS Code's **Notifications** to find its recovery
action. A hidden routing warning does not block other MRW commands.

Unavailable private storage or a different private-store scope produces an
error: reopen the original workspace/profile with its saved state, or explicitly
open a complete synchronized artifact store using the storage guide.
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
neither note nor retained material. Concurrent writing installations remain unsupported; local locks are not distributed.

**Copying or synchronizing a Markdown note does not copy its MRW saved material.**
Here that material means retained sources, saved outlines, annotations and note
associations. The note contains an address, not those separately saved files.
No new Obsidian vault is required. **MRW: Move Saved Work Directory…** separately
moves this workspace's complete saved material; **MRW: Open Saved Work
Directory…** verifies a complete synchronized copy on another installation.
See [storage scope, commands and recovery](ARTIFACT_STORAGE.md). The current
`/mnt/c` mount cannot preserve MRW's private modes and is rejected for MRW
saved-work storage. That restriction does not forbid ordinary note/PDF opening
from a selected Windows folder. No action automatically adds anything to
Syncthing or copies a vault.
The [scoped Windows-backed setup trial](WSL_ARTIFACT_STORAGE_SETUP.md) was
separately approved and configured. A disposable move/save/reopen and local
Windows-created receiving-copy checks passed, but nested replacement denials
remain unresolved; it is not qualified for real work. Displayed `0777` without
metadata alone does not establish Windows access by every account. Receiving
permissions must be verified after both
synchronized creation and replacement. No supported vault-storage handover is
claimed from the current rejection.
The separately approved comparison paused only the Windows client's vault
folder, left note bytes unchanged and verified resumption afterward. Four
paused probes passed, while one probe in each active phase was denied. That
bounded result did not qualify a pause/write/handover procedure. The subsequent
approved paused transaction test failed at its first preflight replacement;
synchronization/configuration were restored and independently verified. See
[both results](WSL_ARTIFACT_STORAGE_COMPARISON.md). No new desktop attempt ran.

The user later normally closed Obsidian for one additional disposable core check.
With its processes absent and Syncthing unpaused/unchanged, move/cleanup,
annotation save and existing reference/association checks passed. No hyperlink
or return action ran in that check, and one pass does not establish that closing
Obsidian is necessary. Obsidian notes stay in place during an MRW artifact move.
The real-store procedure remains unqualified; see
[the separate observations](ARTIFACT_STORAGE_VALIDATION.md#user-requested-obsidian-closed-check--2026-10-20).

The existing moved ext4 navigation fixture completed the physical Obsidian
hyperlink click, fresh exact retained selection and reader return to the linked
note after normal application restart on 2026-10-20. See
[the observed round trip](OBSIDIAN_VALIDATION.md#post-move-desktop-follow-up--2026-10-20).
That result is independent of the still-unqualified Windows-backed setup.

After verified adoption at a different local workspace address, open that mapped
workspace and use **MRW: Open Link from Clipboard** with the existing saved link.
The normal recovery button retains the original saved workspace address; it
cannot guess another computer's corresponding path. Exact stored identity and
scope checks still apply.

 There is no automatic vault discovery, note rewriting, content
synchronization, Obsidian plugin or background server. The explicit bounded
notes-folder index above supplies ordinary link lookup and backlinks only. The existing extension
identity/storage and legacy `mrw-outline:v1` links remain compatible. Native
Windows backend portability remains deferred. Navigation initiates no model,
compiler, notebook, container or mathematical analysis.

On Windows VS Code 1.141.2 / WSL Debian with Windows Obsidian 1.14.4, the same
saved passage link was followed after normal application restart, and the complete
wrong-workspace recovery sequence was observed with the exact retained selection.
These scoped desktop checks used the existing temporary navigation fixture.
See [validation and the tested configuration](OBSIDIAN_VALIDATION.md#desktop-follow-up--2026-10-18).
Interoperability does not establish mathematical usefulness.
