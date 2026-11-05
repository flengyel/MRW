# Using MRW

In a proof graph, click a vertex to read its Stacks tag beside the graph.
**Saved text** shows the retained statement and proof offline. Drag to pan;
use the wheel or **− / Fit / +** to zoom. The graph icon on a proof-outline
JSON editor opens this view directly.

**Proof graphs:** **Open Proof Outline…** opens a `.mrw-proof.json` file.
**Delete vertex** omits an intermediate claim; **Expand original steps** shows
its argument and **Restore** brings it back. **Use AI outline** applies the
file's proposed selection. **Edit summary** uses the ordinary editor; **Refresh**
reads your changes. **Ask AI…** prepares an exact request for separate Send.

## Open a source

Click the **MRW** book icon, then **Open saved source outline…** under
**Research Tools**. Select a source to open its retained text and annotations.
**Research Tools** is sorted alphabetically.
**F1 → MRW: Open Saved Source Outline…** does the same thing.

In the reader:

- **Refresh saved source outline** on the top toolbar reloads saved annotations
  and source status. The same command appears in **Research Tools** while a
  source is open.

- **Show proof** expands a published proof; **Hide proof** folds it.
- **Reader notes** beneath a passage displays its saved annotations.
  **Source notes** near the source heading displays notes about the whole source.
- **Delete note…** below an annotation removes that note after confirmation.
- **Diagram appearance → Theme** follows VS Code. **Paper** and **Dark** override
  the theme for reader diagrams.
- **Source details and tools** contains source information and passage tools.
- **Save annotation** saves a reader form. **Ctrl+S** saves editor files, not
  reader forms.

To add an annotation, expand **Source details and tools → Notes and tools:**
for the passage, then **Add reader explanation / question / repair**. Complete
the form and click **Save annotation**.

If the source list is empty after moving a study folder, use **MRW: Open Saved
Work Directory…** and enter the directory containing its saved MRW records.
Confirm the mapping to the study folder now open in VS Code. This connects
saved work without moving files or importing another copy of the source.

## Import an Obsidian note

Run **Import Obsidian note…** from Research Tools. Choose a destination:

- **Open it as a saved source outline** retains a copy for reading and annotations.
- **Add it as a reader annotation on a passage** saves the text on a chosen passage.
- **Insert it into the reading overview** inserts text at the overview cursor.

Select the note’s Markdown file. The original stays in its vault. For an overview
insertion, save with **Ctrl+S**. Imported wiki links and embeds remain text;
linked notes and attachments are not imported.

## Retain a passage from a file

Open a saved UTF-8 text, Markdown or TeX file, select a passage, then run
**MRW: Create Outline from Saved Source**. MRW retains that revision and selection;
later edits to the file do not replace the retained text. PDF text extraction
is not supported.

For a Stacks Project section, use **MRW: Import Stacks Section…**. Importing
acquires the pinned source; subsequent reading uses the retained copy offline.

## Navigate a Markdown document

The names in the interface mean:

| Name | What it is |
| --- | --- |
| Reading overview | A Markdown file you edit in VS Code |
| Reading Outline | The sidebar navigator for that file's headings and MRW links |
| Source outline | A retained source and its selected passages |

**New Reading Overview…** creates a Markdown file with four headings. It does
not add source content. Choose a filename in the Save dialog.

**Open Reading Outline** uses the active Markdown document, reopens the last
chosen overview, or offers a file picker. **… → Choose Reading Overview…**
selects a different document.

Clicking a heading in Reading Outline selects its location in the editor.
The arrows fold sections in the navigator. Editing Markdown headings updates
the navigator, including before saving.

To add a source link:

1. Place the editor cursor where the link belongs.
2. Run **MRW: Insert Outline Reference…** and choose a source or passage.
3. Click the resulting entry in Reading Outline to open the retained text.
4. Use **Return to reading outline** to reopen the rendered overview. It restores
   the link's source location and recreates a closed preview tab.

Save the Markdown file with **Ctrl+S**. Save reader forms with **Save annotation**.

## Open or move saved work

Ordinary Markdown files and MRW records are stored separately. Copying a
Markdown file does not copy its linked retained sources or annotations.

| Command | Effect |
| --- | --- |
| **Show Artifact Location** | Reports this workspace's record directory |
| **Open Saved Work Directory…** | Connects this workspace to records at the specified directory; moves no files |
| **Move Saved Work Directory…** | Transfers this workspace's saved sources, outlines and annotations to a new directory |

Both Open and Move require confirmation. **Esc** cancels a directory prompt.
A completion notification can remain visible while you continue reading.

## Use Codex or notebooks alongside MRW

For Codex, use **MRW: Copy Outline or Passage Link…** and paste the complete link
and the quoted passage into the chat. The link alone does not supply the text.
To save a reply as a reader annotation, select **Supplied origin: ai proposal**,
enter **Author / attribution: Codex**, and use **Save annotation**.

MRW's **Ask AI about this passage…** uses a separate API connection with its own
credentials. It prepares a request preview; **Send Exact Preview** sends it.

VS Code's Jupyter extension owns `.ipynb` editing, kernel selection and cell
execution. MRW does not start kernels or execute cells. SagePod setup is covered
by the separate installation guide.

Reopen this guide with **MRW: Open Tutorial**.
