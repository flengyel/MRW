# Work through an argument in ordinary notes

The [field-trace example](examples/field-trace/trace.md) starts with an incorrect
coefficient formula, keeps its counterexample, and proves the correction in a
linked note. Its SageMath cell checks a degree-four example. This is a pattern
for working with an argument; no study or justification context is required.

Start with the note you already use. Keep the disputed step, counterexample,
calculation and remaining question there. If a supporting calculation is in a
second note, link to its heading. Use **Contents**, a preview link or **Follow
Document Link** to open it, and **Return to Document** to return to the original
link. The source note stays where it is.

Save completed work with the authoring application's normal Save command.
When stopping, leave the next mathematical step in that note. On return, use
**Reopen Document** for the last file or **Recent Documents…** for an earlier
one. MRW uses the native editor's history for earlier per-file selections;
its own exact selection checkpoint belongs to the last document.
A preview scroll offset or PDF page is not a saved mathematical location.

The examples are two ordinary Markdown files. Read them on GitHub, or copy their
folder into an existing workspace for a disposable local trial. They do not need
to be put in a Zettelkasten or selected as a new notes folder. For new personal
notes, **New Note…** invokes the configured authoring application and template;
see [notes applications](NOTE_COMPANIONS.md).

Run the SageMath cell deliberately in the SagePod/Jupyter environment you
already use. Reopening a saved notebook or reading an output does not execute
the cell or recover its live kernel. The trace proof uses linear algebra;
the exact calculation establishes only the displayed example.

An isolated VS Code/WSL trial closed two linked mathematical documents and
reloaded the host. Recent Documents recovered the selected passage through
native editor history, with both saved texts unchanged. That observation
justified retaining the existing navigation for this case. It does not establish
general recovery of every document arrangement, unsaved buffer or kernel.


## The discriminant investigation

The [quadratic-discriminant investigation](../examples/notebook-provenance/README.md)
continues this pattern through two saved calculations and a rejected field
construction. The question is why two rational bases have determinants 5 and
20. Its linked proof determines the full ring of integers. Keep the remaining
step in the working note; the saved calculation links let you inspect evidence
and return without reconstructing filenames or entering the work in a form.
A saved error is part of the investigation, not a successful mathematical result.
