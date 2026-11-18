# Vision

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

## Mathematical understanding

A paper or a checked Lean proof can leave a mathematical question open for its
reader. Which hypothesis makes this inference valid? What is the governing idea
of the proof? MRW connects the passage in question to definitions, cited results,
examples and the reader’s own explanation. A reader can attempt a step on paper
or in the editor, compare it with the proof and return to it later.
[Study workflow](docs/ACTIVE_STUDY_WORKFLOW.md)

For a paper accompanied by a Lean development, compare the types, hypotheses
and conclusion of the declaration with the statement on the page. Lean checks the
formal declaration. Whether it expresses the intended theorem requires a separate
judgment. Explanation in English and formalization in Lean are intended uses.
[Lean workflow](docs/LEAN_STUDY_WORKFLOW.md)

## Grounds for using a result

A mathematician may have sufficient grounds to use a theorem while still seeking
an explanation of its proof. An exact passage identifies what was cited. An
admission records what was accepted. MRW’s justification engine shows how a
conclusion depends on the admissions and which routes survive withdrawal.
[Euclid’s lemma](docs/JUSTIFICATION_EUCLID_EXAMPLE.md)

## Continuing unfinished work

Keep the attempted argument, a failed approach or a calculation where it was
written. Returning to the work should recover the relevant passage and the open
step. In a proof outline, vertex elimination can shorten the displayed argument
while keeping the omitted steps available for expansion.
[Resuming work](docs/RESEARCH_WORKSTATION_DESIGN.md#research-that-can-be-resumed) ·
[Vertex elimination](docs/PROOF_GRAPH_WORKFLOW.md#vertex-elimination)

## Manuscripts

Two manuscripts with Lean developments are
[*Pointwise provable equality and the failure of composition*](https://arxiv.org/abs/2609.25556)
and [*Maximality of the Došen–Petrić Boolean Category*](https://arxiv.org/abs/2611.19496).
