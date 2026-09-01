# Codex instructions

Read `README.md`, `VISION.md`, `VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`,
`CODEX_PLAN.md`, and `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` before changing
behavior.

Implementation is authorized. The first corpus is `rs_Appendix_A.tex` from
`flengyel/Categorical_Rice_Shapiro`. Begin with top-down mathematical
orientation; do not begin with session bookkeeping.

For every source, including a problem-centered text, preserve this order:

1. purpose and organization of the subject or chapter;
2. central concepts, results, and problem families;
3. a selected theorem, argument, example, or problem;
4. its governing idea or proposed method;
5. detailed proof, calculation, or construction.

An explicitly requested `why` view follows these levels and is never a
substitute for them. In the first stateless CLI, `why` must assume no earlier
command or hidden session state. It cumulatively presents purpose and
organization, central concepts and results, the selected result's role and
statement, governing idea, proof skeleton, available technical detail, and
reviewed formal correspondence in that order before the warrant. Do not expose
justification syntax, Lean material, or premise maintenance before the
mathematical context makes the warrant question relevant.

Apply these levels only to material that exists. No complete proof, solution, or
formal artifact is assumed. Formal material is optional and follows the
informal mathematical context. Never require a comprehension report, confidence
score, subject inventory, or formal declaration before mathematical work.
Ordinary TeX, Sage, code, diagram, and note files remain the primary work
artifacts.

The Python application uses only the standard library. The optional Lean
justification sidecar is a separate checked component. Run the Python checks:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

Do not add model calls, general corpus ingestion, or general Lean analysis until
an active mathematical task supplies an observed requirement. The only newly
authorized formal increment is the bounded \(J_0/J(CS)\) checker and Appendix A
fixture in `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md`. It remains optional, does
not alter `orient` or `study`, and does not require Lean for ordinary use. Do not
commit a checked bundle or the executable sidecar until the pinned Lean command
has actually compiled and checked it; never hand-author a placeholder that
claims checked status.

For the warrant layer:

- terms and formulas are pure syntax and mathematical claims are immutable
  opaque atoms;
- every artifact binding, premise, formal-proof-policy bridge, and
  formal--manuscript bridge is explicit, scoped, and versioned;
- checker output says derivable relative to a context, never true, known,
  understood, or externally verified;
- a `Correspondence`, formal check, source digest, or model response never
  becomes a premise automatically;
- sum is alternative reason availability, not corroboration, confidence,
  independence, or weight;
- Python validates and renders the trusted Lean-generated bundle and never
  reimplements the derivation checker; and
- do not add factivity, introspection, JAM, Fitting semantics, or a corpus-wide
  justification graph in this slice.

Bind the fixture to the exact manuscript revision, Categorical Rice--Shapiro
commit, Lean environment, declaration type, axiom report, admissions, logic
profile, and checker version. A successor context may make a route inactive but
does not invalidate the historical certificate under its original context.

Additional LaTeX labels are needed only when optional correspondence maintenance
expands beyond the already labeled selected result; they are not a prerequisite
for orientation, informal study, or the bounded warrant slice.

The Appendix A interpretive guide is bound to a reviewed normalized source
digest. If the manuscript digest changes, inspect the mathematical changes and
revise the guide and tests where necessary before updating the digest. Never
update the digest alone.
