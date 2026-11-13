# Markdown note templates

Available in MRW 0.23.23. **New Zettel** creates an ordinary Markdown draft in
the selected notes folder. Its layout is configurable; no particular YAML
fields, ID convention or section headings are required for reading notes.

## Set the template

1. Run **MRW: Choose Notes Folder…** and select the folder in which new notes
   should be saved. An Obsidian vault or an ordinary folder both work.
2. Open VS Code **Settings** (`Ctrl+,`) and select the **Workspace** tab to use
   this template for the current MRW workspace.
3. Search for **MRW Zettel Template**. Paste Markdown text into **MRW: Zettel
   Template** (`mrw.zettelTemplate`). This setting holds the template text,
   not a path to a template file.
4. While reading, run **MRW: New Zettel…** from the Command Palette or the
   document's **MRW Document** menu. Enter a title, write the note and save
   with **Ctrl+S**. The draft opens beside the source document.

Changing the setting affects subsequent drafts. It does not rewrite saved notes
or open buffers. VS Code owns editing, Save, Undo and unsaved-draft recovery.

## Placeholders

| Placeholder | Result |
| --- | --- |
| `{{title}}` | The title entered for the new note, with surrounding whitespace removed. Use it in ordinary Markdown. |
| `{{titleYaml}}` | The same title as a quoted YAML scalar, including escapes for embedded quotes and backslashes. Write `title: {{titleYaml}}` without adding another pair of quotes. |
| `{{id}}` | The proposed filename without `.md`, including any collision suffix. This does not add an `id` property unless the template requests one. |
| `{{source}}` | A Markdown link to the originating document, relative to the new note's folder. Empty when no ordinary source document is selected. |
| `{{cursor}}` | The initial typing position; the marker is removed from the draft. If omitted, typing starts at the end. If repeated, the first marker sets the position and all are removed. |

Substitution happens once. Unknown placeholders remain literal text; no
JavaScript, shell code, Obsidian Templater code or other template engine runs.
For example, `{{date}}` is not an MRW placeholder. The template must contain
nonblank text and may contain at most 65,536 characters. Titles must occupy one
line and may contain at most 500 characters.

## Examples

### Plain Markdown

This is the default. The blank line containing `{{cursor}}` becomes the place
to start writing:

```markdown
# {{title}}

{{cursor}}

{{source}}
```

For a title of `A calculation` and a source named `paper.pdf` in the notes
folder, the saved text begins with `# A calculation` and contains
`[paper.pdf](<paper.pdf>)` below the writing area. No front matter or named
sections are inserted.

### Optional YAML title

Use this if your own note format stores the title in YAML:

```markdown
---
title: {{titleYaml}}
---
# {{title}}

{{cursor}}

{{source}}
```

For the entered title `A "quoted" calculation`, the property becomes
`title: "A \"quoted\" calculation"`. Keep `{{source}}` in the note body when it
should be a Markdown link; it is not a YAML-escaped value.

### Identifier in the body

An identifier can remain visible as ordinary text, without requiring YAML:

```markdown
# {{title}}

ID: {{id}}

{{cursor}}

{{source}}
```

These examples are starting points. Add or remove headings to suit the note;
MRW does not require `SEE ALSO`, `Research` or any other section name.

## Filenames and links

**MRW: Zettel Prefix** (`mrw.zettelPrefix`, default `Note`) controls the prefix
of the proposed filename. It must start with a letter and contain only ASCII
letters, digits, dots, underscores or hyphens, with at most 32 characters.
MRW appends local date and time as `YYYYMMDDHHmm`: for example,
`Note202611130930.md`. Occupied filenames and open drafts receive suffixes such
as `-2` or `-3`. The body template does not change this filename pattern.

`{{source}}` links to the document file, not to an inferred PDF page or an exact
quotation. It does not copy the source or embed it in the note. Preserve the
relative locations of the files, or update the link if one moves independently.
Source files outside an application's vault or archive remain subject to that
application's file-access and link-handling rules.

**Recent Notes** reopens notes by title and filename in this workspace. MRW uses
the YAML title when present, otherwise the first H1, otherwise the filename.
The list survives restart and stays associated with its recorded notes folder.
See [document navigation](DOCUMENT_NAVIGATION.md#zettels-and-recent-notes).

## Obsidian and The Archive

The resulting notes are plain Markdown files. The template setting belongs to
MRW; copying its unexpanded text into another application's template folder
does not make the two template engines equivalent.

**Obsidian** supports both Markdown file links and WikiLinks. Its documentation
recommends Markdown links when interoperability matters. Optional YAML fields
can appear as Obsidian properties. MRW's `{{source}}` produces a Markdown link;
MRW does not install plugins or change the vault's settings.
[Obsidian links](https://help.obsidian.md/links) ·
[Obsidian properties](https://help.obsidian.md/properties).

Obsidian's core Templates plugin has its own variables, including `{{title}}`,
`{{date}}` and `{{time}}`. MRW supports only the placeholders listed above.
Its `{{title}}` comes from MRW's title prompt; it does not acquire Obsidian's
template semantics. [Obsidian Templates](https://help.obsidian.md/plugins/templates).

**The Archive** documents plain-text notes, Markdown formatting and WikiLinks
that perform a search. Its link `[[some-ID]]` therefore has different semantics
from Obsidian's filename link. A full basename, such as `[[Note202611130930]]`
for `Note202611130930.md`, gives Obsidian a filename and The Archive a search
term; do not assume that every search produces one result. MRW does not emulate
The Archive's search-based links or configure its identifier generation.
[The Archive help](https://zettelkasten.de/the-archive/help/#how-do-i-create-links-between-notes).

These interoperability notes are based on the applications' documented formats.
No The Archive desktop test was run. They do not claim identical rendering,
attachment handling, link resolution or template execution across applications.

The independent [flengyel/Zettel specification](https://github.com/flengyel/Zettel)
describes one set of note conventions. It is optional, not MRW's note schema or
a runtime dependency. MRW's template and interoperability instructions live here.
