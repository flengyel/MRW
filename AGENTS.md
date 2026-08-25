# Codex instructions

Read `README.md`, `VISION.md`, `VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`,
and `CODEX_PLAN.md` before changing behavior.

Implementation is authorized. The first corpus is `rs_Appendix_A.tex` from
`flengyel/Categorical_Rice_Shapiro`. Begin with top-down mathematical
orientation; do not begin with session bookkeeping.

For every source, including a problem-centered text, preserve this order:

1. purpose and organization of the subject or chapter;
2. central concepts, results, and problem families;
3. a selected theorem, argument, example, or problem;
4. its governing idea or proposed method;
5. detailed proof, calculation, or construction.

Apply these levels only to material that exists. No complete proof, solution, or
formal artifact is assumed. Formal material is optional and follows the
informal mathematical context. Never require a comprehension report, confidence
score, subject inventory, or formal declaration before mathematical work.
Ordinary TeX, Sage, code, diagram, and note files remain the primary work
artifacts.

The initial implementation uses only the Python standard library. Run:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

Do not add model calls, general corpus ingestion, or Lean analysis until an
active mathematical task supplies an observed requirement. Additional LaTeX
labels are needed only when optional correspondence maintenance is implemented;
they are not a prerequisite for orientation or informal study.

The Appendix A interpretive guide is bound to a reviewed normalized source
digest. If the manuscript digest changes, inspect the mathematical changes and
revise the guide and tests where necessary before updating the digest. Never
update the digest alone.
