'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { referenceAt } = require('../src/outlineReferences');

test('reference caret lookup handles escaped labels, Unicode, adjacent targets and plain data', () => {
  const first = 'mrw-outline:v1/first', second = 'mrw-outline:v1/second';
  const text = `[Book \\[α\\] 😀](${first}) and [Article](${second})`;
  assert.equal(referenceAt(text, 4), first);
  assert.equal(referenceAt(text, text.indexOf('Article') + 1), second);
  assert.equal(referenceAt(first, 2), first);
  assert.throws(() => referenceAt('[not MRW](command:evil)', 4), /cursor/);
  assert.throws(() => referenceAt('x'.repeat(65537), 0), /64 KiB/);
  assert.throws(() => referenceAt('界'.repeat(23000), 0), /64 KiB/);
});
