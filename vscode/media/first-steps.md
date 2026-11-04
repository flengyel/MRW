# First steps with Mathematical Research Workstation

Start with something you are already doing: reading a passage, working through
an argument, or pursuing a question from your notebook or blackboard. MRW gives
that work a place to continue on the computer, with source passages and notes
you can return to. Keep using paper wherever it helps you think.

This first session needs the installed MRW extension and your existing study
folder. Computation, AI assistance and formal proof tools can be added when the
mathematics calls for them.

## Start with your current question

Choose one place to resume: a definition you want to use, a step in an argument,
an example to test, or an unfinished calculation. For example, your question
might be “Where does this proof use its hypothesis?”

Keep the book, paper or handwritten page beside you. Write down its author,
title, edition or revision, and page, section or theorem number. A photograph
of a blackboard or handwritten calculation can remain an ordinary attachment
beside your notes; MRW does not transcribe it automatically.

| Familiar mathematical work | A place for it on the computer |
| --- | --- |
| The page where you organize your study | A reading overview that you edit like an ordinary text file |
| A bookmark and a precise citation | A retained source passage and its MRW reference |
| A margin question or explanation | A reader annotation, kept separately from the source |
| A scratch calculation | Paper, or an optional notebook with executable cells |
| A note about where to begin next time | A short next step with its source location |

## Create your reading overview

A **reading overview** is your own page of questions, explanations and source
references. Its headings appear in MRW's **Reading Outline** navigator. A
**source outline** belongs to a retained text and its selected passages. You can
use either one before connecting them.

1. Click the **MRW** book icon in the Activity Bar. In the empty Reading Outline
   view, choose **New Reading Overview**. It is also available in the view's
   **…** menu and as **F1 → MRW: New Reading Overview…**.
2. In the Save dialog, choose a new `.md` filename inside this study folder.
   `reading-overview.md` is a suggested name. MRW creates and saves a small
   starting page, opens it for editing, and selects it in Reading Outline.
3. Under **Current question**, write what you want to work on. Under
   **Working notes**, record your own attempt or a useful observation from paper.
   Change or remove any of the supplied headings to suit your work.
4. Use **File → Save** or **Ctrl+S** to save later edits. Markdown is ordinary
   text: `#` begins a heading, `##` a smaller heading, and a blank line separates
   paragraphs. You can write prose immediately and learn other notation later.

If you already have a Markdown overview, use **Open Reading Outline**. From a
reader or another view, that command reopens your chosen overview; if none is
available it offers a file picker. **Choose Reading Overview…** always offers
a different file choice.

## Keep a source passage

For an existing retained text, choose **Open Saved Source Outline…** from the
MRW starting view or **…** menu and select the source. Continue with its saved
passages and annotations.

To retain a new passage from an existing text file:

1. Open the saved UTF-8 source excerpt in this study folder. MRW accepts ordinary
   text, Markdown and TeX among its source formats. Keep its citation with the
   excerpt. A PDF can be read through your existing PDF viewer; MRW does not
   extract its text. You can record its page reference in your overview and
   continue working from the PDF or printed page.
2. Select the passage you want to study. Then use **… → Create Outline from Saved
   Source**, or **F1 → MRW: Create Outline from Saved Source**. The source must
   be saved so the reader can retain its exact revision.
3. Read the retained passage in the source reader. **Source details and tools**
   contains the source information and passage tools. Expand **Reader notes**
   to see any saved annotations.

The source reader keeps the quotation and its revision separate from your notes.
An exact retained passage gives you a stable place to return; it does not say
that the passage has been proved or checked.

## Connect the source to your working page

Return to your overview's editor tab and place the cursor under **Sources and
passages**, or wherever the reference belongs. Run **MRW: Insert Outline
Reference…**, choose the saved source, and choose the whole source or the exact
passage. MRW inserts a readable link at the cursor. Save the overview normally.

Reading Outline shows that reference under its heading. Select the reference to
open the retained source. Use **Return to reading outline** in the reader to
return to the occurrence you followed. You can cite the same passage in several
places, with a separate return location for each occurrence.

Click a heading in Reading Outline to go directly to its place in your overview.
Use the small arrows to fold sections while you concentrate on another part.
The navigator follows your current text, including unsaved edits. Ordinary
editing and undo remain VS Code operations.

## Write an explanation or question

Your overview is a useful place for a developing argument across several
sources. To attach a note to one retained passage, open its tools under **Source
details and tools**, choose an annotation purpose such as a question or
explanation, and write your note. Use **Save annotation** in that form. Wait for
**Annotation saved** before closing it. **Ctrl+S** saves ordinary editor files;
reader forms have their own Save annotation button.

Distinguish a quotation from your explanation, a conjecture from a result you
are using, and an AI contribution from your own work. A useful note can say
exactly which step still needs explanation. There is no requirement to finish
the proof or report a confidence score before continuing.

## Add computation when it helps

A calculation might test examples, reveal a counterexample, or help you examine
a construction. Keep it on paper if that is sufficient. When executable work
helps, an ordinary Jupyter notebook can accompany or replace a Markdown work
note. You do not need to maintain duplicate accounts of the same calculation.

With a notebook environment already configured, open a `.ipynb` file, choose its
intended kernel, and run cells explicitly. VS Code's Jupyter extension handles
notebook editing and execution; an existing SagePod setup can supply a SageMath
kernel. Opening MRW starts no kernel or container. The separate installation
guide covers that setup when you need it.

Keep the inputs, relevant outputs and the conclusion you draw together. Saved
outputs let you read earlier work; reproducing a calculation requires an
explicit rerun in an appropriate fresh kernel. A successful computation applies
to what was actually calculated and does not establish an arbitrary theorem.

## Use AI assistance when you choose

You can ask an assistant about a selected passage or your current attempt. With
an external assistant such as Codex beside MRW, manually supply the exact
quotation and its complete MRW passage reference. Review the reply and retain
useful material with AI attribution in your overview, notebook or a new reader
annotation. A link alone does not transfer the retained source text.

MRW's direct **Ask AI about this passage…** route requires its own configured
API access. It shows an exact request preview and uses a separate **Send Exact
Preview** action. Reading, creating an overview and opening this tutorial make
no AI request. Either route is optional for ordinary mathematical work.

## Leave a place to resume

At a natural stopping point, record the next action and its source location:
which passage to reread, which case to calculate, or which hypothesis to examine.
Save your overview or notebook, and save any open reader annotations with their
own button. An unfinished argument is still work worth keeping.

Next time, return to this same study workspace and use **Open Reading Outline**
or **Open Saved Source Outline…**. Your overview is an ordinary file; retained
sources and reader annotations are saved separately for this workspace.
Copying the overview alone does not copy those retained records.

You can reopen this guide at any time with **… → Open Tutorial**, or
**F1 → MRW: Open Tutorial**. Use the parts that serve
your current question and return to the mathematics whenever you are ready.
