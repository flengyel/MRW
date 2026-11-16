# Use grounds from existing notes

A proof may use a theorem, an argument connecting that theorem to a conclusion,
and alternative arguments for the same conclusion. MRW can retain the selected
passages, prepare a Codex handoff and display the proposed grounds for review.
The note stays in its original file.

## Select, propose and review

1. Select text in an ordinary Markdown editor. Choose **Proofs → Justification…
   → Use selected Markdown text**. MRW captures the buffer text, including unsaved
   edits, without saving the note. Alternatively, choose **Choose saved passages…**
   and select the retained passages to include. This supports several sources.
2. Choose **Copy passages for Codex**. Paste the handoff into your companion chat.
   It contains only the selected text, references, revisions and proposal schema.
   Ask for the claims and grounds you want to examine. Copy the returned JSON.
3. Choose **Import proposal from clipboard**. Each claim and ground must cite a
   selected source ID; a response for another selection is rejected. Read the
   claims beside their exact sources. **Edit summary** and **Edit title** correct
   the proposed text without editing JSON. The supplied response remains saved.
4. Select the grounds you accept for this context and choose **Admit selected
   grounds**. No ground is preselected. Admission records the local reader and
   time, separately from the response's supplied attribution.
5. Choose **Search under these admissions** to run the bounded Lean checker.
   Read the routes, withdraw a ground to examine a successor, or return to the
   original document location.

A ground names its reason, premises, conclusion, scope and rationale. For
example, premises $A,B$ and conclusion $C$ propose a reason for
$A\to(B\to C)$. With reasons for $A$ and $B$, two Application steps give a
reason for $C$. A ground without premises proposes a reason for its conclusion.
Importing either kind does not admit it. The checker verifies the composition
under the selected admissions; the mathematical assertions and implications
require review.

Source selections and corrections are saved in MRW's existing private artifact
store. Reopen **Justification…** to continue **Selected sources: …**, **Review
proposal: …** or **Unfinished: …** after closure or restart. A failed correction
leaves the earlier view intact. An interrupted acceptance can be retried without
creating another context. Reopening never sends text or runs Lean.

**Inspect supplied and reviewed proposal** preserves the response and corrections
beside accepted grounds. Supplied attribution identifies the producer as reported
in the response; MRW has not authenticated that identity. A source hash binds
bytes, not authorship or mathematical truth.

## A second argument: composition of injections

Let $A,B,C$ be sets, and let $f:A\to B$ and $g:B\to C$ be injective functions.
Then $g\circ f:A\to C$ is injective. Indeed, if $x,y\in A$ satisfy
$g(f(x))=g(f(y))$, injectivity of $g$ gives $f(x)=f(y)$, and injectivity of $f$
gives $x=y$.

Select that passage from your own note. A proposal can distinguish the
injectivity hypotheses from the conclusion and cite the argument for their
implication. Correct a summary, admit the chosen grounds and search. This uses
the same workflow as [Euclid's lemma](JUSTIFICATION_EUCLID_EXAMPLE.md); no
prepared number-theory context is needed. The Lean route check treats these
assertions as atoms and checks the admitted implication, rather than formalizing
the set-theoretic proof.

## Current limits

The companion must return the bounded schema included in the handoff. MRW does
not parse an arbitrary prose response into implications. Changes to premises,
conclusions, scope or the selected goal require a revised proposal; summary and
title corrections are available directly in the reader. A text selection covers
one Markdown buffer; use retained passages to combine several documents.
The reader does not follow changes to a captured passage automatically.

At most 32 sources, claims and grounds are accepted; the existing source-byte,
search and storage bounds still apply. Preparations allow 32 revisions and 128
records within the shared 64-MiB justification limit. Reaching a limit preserves
existing work and reports it. Checker setup remains an explicit local build;
see the [runtime requirements](JUSTIFICATION_ROUTE_SEARCH.md).
