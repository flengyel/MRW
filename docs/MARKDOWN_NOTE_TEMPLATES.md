# Note creation

MRW's note-template engine was removed in 0.23.25. For an Obsidian vault,
**New Note** invokes your configured Obsidian command, including its own template
and naming rules. See [Obsidian setup](OBSIDIAN_WORKFLOW.md#new-note).

For another notes folder, New Note opens a blank Markdown editor. VS Code owns
Save and filename selection. MRW adds no metadata, title, ID or section headings.
The former template and prefix settings are no longer read. Existing settings
files and notes are left intact; no migration is required.

**Recent Notes** continues to reopen notes by title and filename. Reading,
WikiLinks, backlinks and the return location are independent of how a note was
created. The Archive's desktop integration has not been tested. Its support for
ordinary Markdown does not imply that every Obsidian extension is supported.

This page remains at its earlier URL so that links to the removed feature explain
the change. The [0.23.23 report](RELEASE_0_23_23.md) records that release's behavior.
