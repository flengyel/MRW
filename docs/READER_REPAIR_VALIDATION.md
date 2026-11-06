# Source display and Return repair — 0.21.1

Date: 2026-11-06. Baseline: `1783b75`, following the delivered 0.21.0 package.
The user supplied a screenshot of broken Kerodon 0009 mathematics and a Return
error. Current Document / Contents terminology is preserved at their request.

## Cause and repair

The exact already-retained Kerodon 0004 page includes the comparison expression
in 0009. HTMLParser produces separate callbacks at literal `<` signs and character
entities. Parsing each callback as complete TeX produced unclosed delimiters,
unsupported prose commands and fragmented raw blocks. The display projection now
coalesces adjacent text callbacks, and bare equation arrays use a bounded inert
MathML recipe. No downloaded HTML, scripts or TeX execute.

Existing v1 acquisition manifests retain their original token projection and
still validate against their exact source. Only after that validation does the
reader derive the repaired presentation, requiring identical item roles and
exact ranges. Source bytes, acquisition metadata, hashes, original paths,
annotations, outline revisions and earlier citations are not rewritten. The
repair works on existing imports without another source acquisition.

Production history showed import record/display completion followed by reader
actions, without an import command completion. Both source import commands
awaited their success notification inside the reader-action lock. A hidden
notification can retain that promise. Completion feedback now returns immediately;
real import choices/publication still finish before releasing the lock. Tests
hold success notifications open through new/reused imports, Return and refresh.

**Open original source ↗** is visible in the reading toolbar. This explicit action
opens today's canonical source page in the external browser. Retained reading
continues to refer to the saved revision. Existing exact HTML remains available.

## Checks and delivery

- Node broader regression: **284/284 passed**. After the final display-only
  equation/spacing changes, the rebundled Stacks/Kerodon command and open-notification
  regressions passed **5/5**. These use real Python services and a VS Code API double.
- Final shared Python regression: **412 run, 350 passed, 62 explicit skips**;
  focused Kerodon checks **10/10 passed**. Skips are opt-in/unavailable checks.
  JavaScript syntax, Python compileall, diff whitespace and 247 local documentation
  links also pass.
- The exact already-retained public Kerodon 0004 page was rendered offline with
  the actual reader scripts in isolated headless Chrome: **170 mathematical
  expressions, zero math display fallbacks, zero remote media elements and zero
  runtime errors**. Original-source and qualified citation/backlink payloads were
  checked. An unsent annotation survives refresh. Wide and 960×680 observations
  show the repaired 0009 formula and compact paragraph spacing. Screenshots and
  browser evidence stay local in `/tmp/mrw-0211-browser/`.
- All **49** inventoried genuine study/source/checkpoint files remain byte-identical.
  No acquisition, source migration, annotation rewrite or provider request was
  performed. Current source-store bindings and the already relocated folders stay
  in place.

The browser observation is separate from native VS Code acceptance. The working
window is preserved during installation; the user activates the completed update
with one normal reload. Existing retained sources then use the repaired display
without importing again.
