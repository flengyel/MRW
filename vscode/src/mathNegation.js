(function () {
'use strict';

const negated = new Map([
  ['=', '≠'], ['<', '≮'], ['>', '≯'],
  ['\\approx', '≉'], ['\\sim', '≁'], ['\\simeq', '≄'],
  ['\\cong', '≇'], ['\\equiv', '≢'],
  ['\\lt', '≮'], ['\\gt', '≯'],
  ['\\le', '≰'], ['\\leq', '≰'], ['\\ge', '≱'], ['\\geq', '≱'],
  ['\\in', '∉'], ['\\ni', '∌'], ['\\owns', '∌'],
  ['\\subset', '⊄'], ['\\subseteq', '⊈'], ['\\supset', '⊅'], ['\\supseteq', '⊉'],
  ['\\mid', '∤'], ['\\parallel', '∦'],
  ['\\prec', '⊀'], ['\\preceq', '⋠'], ['\\succ', '⊁'], ['\\succeq', '⋡'],
  ['\\vdash', '⊬'], ['\\vDash', '⊭'],
]);

// KaTeX can emit a standalone U+0338 for `\not`. In MathML it may attach
// to the preceding operand. Use a single relation token before typesetting.
// \char lets strict KaTeX accept glyphs outside its Unicode input table.
function normalizeNegatedRelations(math) {
  return math.replace(/\\\\|\\not(?![A-Za-z])\s*(\\[A-Za-z]+|[=<>])/gu, (original, relation) => {
    const glyph = negated.get(relation);
    return glyph ? '\\mathrel{\\char' + glyph.codePointAt(0) + '}' : original;
  });
}

if (typeof module === 'object' && module?.exports) module.exports = normalizeNegatedRelations;
else window.MRWNormalizeNegatedRelations = normalizeNegatedRelations;
})();
