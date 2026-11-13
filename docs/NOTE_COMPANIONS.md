# Notes applications and the MRW handoff

A note is a document used for working thoughts, arguments or references. It is
not a separate MRW file type. A Markdown note can have Contents, links and
backlinks just like another Markdown document.

## Start a note from MRW

Choose **New Note…** in MRW's **Commands** view or **MRW Document** menu, or run
**MRW: New Note…** from the Command Palette.

- For a configured Obsidian vault, MRW brings Obsidian forward and runs your
  selected creation command. Complete its prompts in Obsidian; it supplies the
  template and filename. See [configuration](OBSIDIAN_WORKFLOW.md#new-note).
- For another notes folder, MRW opens a blank VS Code Markdown editor beside
  the current document. Use Save to choose its filename and location.

Your current MRW document stays open. Use **Open in MRW** from Obsidian to return
with the note, or select it through **Open Document**. For other kinds of
documents, use their authoring application or VS Code extension, then open the
file in MRW. The integrations available now are Obsidian and the VS Code editor;
MRW does not yet invoke Emacs or The Archive.

**New Reading Document** and its fixed reading headings were removed in 0.23.26.
Previously created documents remain ordinary Markdown files and continue to open
with Contents, links and Return. There is no data conversion. A custom keybinding
for the removed command should be removed or changed to the chosen application's
creation command.

MRW's saved sources, annotations and research records remain part of its reading
and research functions. Delegating document creation does not remove that saved
work or change its format.

## Obsidian now

[Configure the handoff](OBSIDIAN_WORKFLOW.md#new-note) with a vault root and the
Obsidian command that already creates your notes. A Templater creation command
can run your NewFileTemplate; MRW does not reproduce it. The companion owns the
template, prompts, filename and save operation. MRW keeps the source open and
records where to return.

Creating a note uses the Obsidian CLI. Opening an existing note uses the desktop
URI handler and does not need the CLI. Returning from Obsidian uses the optional
Open in MRW command or an MRW note link. The [handoff details](OBSIDIAN_WORKFLOW.md#what-the-handoff-does)
distinguish these routes. Sending a command does not prove that a note was saved;
MRW does not infer its filename or scan for a newly created file.

## Proposed optional adapters

Obsidian is currently built in. There is no notes-companion registration API,
Emacs adapter or The Archive adapter yet. A small optional adapter should expose
the operations its application can actually perform: create or capture a note,
open a known note, and return a known document location to MRW. These capabilities
need not all be present. Selection should be explicit for a notes folder; a
folder's name or Markdown extension cannot determine its editor.

The application should continue to own editing, templates and naming. MRW should
own source Return locations and its retained research records. Preserve a target
as supplied by the companion, including a heading or entry locator where supported;
a captured note need not be a new file. A dispatched request, a cancelled capture
and a confirmed saved target are different outcomes. An uncertain result must
not trigger a second creation request.

| Companion | Integration route to investigate | Limits |
| --- | --- | --- |
| Obsidian | Extract the current CLI and URI handoff into an optional adapter. | Preserve existing settings and note links. No template rewriting or automatic retry. |
| Emacs with Org mode | Use the user's Org capture configuration through its external capture protocol. | Capture can add an entry to an existing file. MRW currently has no Org reader, Org Contents or Org backlink support; its ordinary-note return links accept Markdown only. |
| The Archive | Use its documented note-opening URLs and, separately, verify a creation/capture route. | Its match and search links are not exact file locators. Desktop behavior and return routing need a macOS test. No MRW adapter is delivered. |

Org documents an external capture protocol using `emacsclient` and the user's
capture templates. That provides a route to investigate without copying those
templates into MRW. See the [capture protocol](https://orgmode.org/manual/The-capture-protocol.html)
and [capture templates](https://orgmode.org/manual/Capture-templates.html).
The Archive documents `match`, `search` and `matchOrCreate` URLs; the last may
create a note and must not be used as an ordinary read action. See
[The Archive's help](https://zettelkasten.de/the-archive/help/).

Opening an application and reading its file format are separate capabilities.
An Emacs handoff alone would not make an Org file render like Markdown in MRW.
Ordinary live-note links also remain distinct from retained citations, which
preserve an exact revision and passage.

Implement and test one additional companion before fixing a general API. Start
with creating or capturing, editing in the companion, reopening the result and
returning to the source. Check cancellation, uncertain dispatch, dirty buffers,
restart and Windows/WSL path mapping without touching genuine notes. Keep this
interface separate from source acquisition plugins: editing a live note is not
importing a retained source snapshot.
