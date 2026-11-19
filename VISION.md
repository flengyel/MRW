# Vision

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

## Mathematical understanding

An investigation can begin with a question or a calculation before there is
a result to cite. A reader of an unfamiliar paper or an AI-generated proof may
need a definition, the governing idea of the proof, or the hypothesis that
licenses one inference. Follow the cited result, compare its hypotheses with
those at hand, and keep the conclusion or the gap with the argument. To study
the proof, attempt a step and compare it with the original.
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

Leave the last justified step and the open question where the argument was
written. A working note can link directly to a retained calculation, including
a failed one. In a proof outline, vertex elimination can shorten the displayed
argument while keeping the omitted steps available for expansion.
[Resuming work](docs/RESEARCH_WORKSTATION_DESIGN.md#research-that-can-be-resumed) ·
[Vertex elimination](docs/PROOF_GRAPH_WORKFLOW.md#vertex-elimination)

## Manuscripts

Two manuscripts with Lean developments are
[*Pointwise provable equality and the failure of composition*](https://arxiv.org/abs/2609.25556)
and [*Maximality of the Došen–Petrić Boolean Category*](https://arxiv.org/abs/2611.19496).
