'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { atlasHtml } = require('../src/atlasView');
const { extractAtlasText } = require('../src/atlasText');
const { createAtlas } = require('../src/atlasModel');
const { digest } = require('../src/navigation');
const { preview } = require('../src/atlasPreview');
const normalize = require('../src/mathNegation');

test('the atlas typesets negated relations as single MathML operators', () => {
  const source = String.raw`$g\not\approx_T z$, $a\not= b$, $x\not\in A$ and $A\not\subseteq B$.`;
  const rendered = preview(source, 'latex', 4096);
  assert.match(rendered, /<mi>g<\/mi><msub><mo[^>]*>≉<\/mo><mi>T<\/mi><\/msub>/u);
  for (const glyph of ['≠', '∉', '⊈']) {
    assert.match(rendered, new RegExp(`<mo[^>]*>${glyph}</mo>`, 'u'));
  }
  assert.doesNotMatch(rendered, /\u0338|atlas-raw-math/u);
});

test('unknown and escaped negation tokens are left to normal TeX rendering', () => {
  const source = String.raw`a\not\triangle b, a\not\approximation b, \\not\approx`;
  assert.equal(normalize(source), source);
});

test('the v38 reading list presents Theorem 1 with its negation on the relation', () => {
  const text = fs.readFileSync(path.join(__dirname, 'fixtures/failure-of-composition-v38.tex'), 'utf8');
  const source = { title: 'Pointwise provable equality', uri: 'file:///workspace/v38.tex', language: 'latex', text, revision: digest(text) };
  const atlas = createAtlas({ source, extraction: extractAtlasText(text, 'latex') });
  const rendered = atlasHtml(null, atlas, { view: 'list' });
  assert.match(rendered, />Theorem 1<\/button><\/h2>/u);
  assert.match(rendered, /<mi>g<\/mi><msub><mo[^>]*>≉<\/mo><mi>T<\/mi><\/msub><mi>z<\/mi>/u);
  assert.doesNotMatch(rendered, /\u0338/u);
  assert.ok(atlas.source.text.includes(String.raw`g\not\approx_T z`));
});
