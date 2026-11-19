'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { referenceAt } = require('../src/outlineReferences');

test('reference caret lookup handles escaped labels, Unicode, adjacent targets and plain data', () => {
  const first = 'mrw-outline:v1/first', second = 'mrw-outline:v1/second';
  const text = `[Book \\[α\\] 😀](${first}) and [Article](${second})`;
  const secondStart = text.indexOf('[Article]');
  assert.deepEqual(referenceAt(text, 4), { reference: first, start: 0, end: secondStart - ' and '.length });
  assert.deepEqual(referenceAt(text, secondStart + 2), { reference: second, start: secondStart, end: text.length });
  assert.deepEqual(referenceAt(first, 2), { reference: first, start: 0, end: first.length });
  assert.throws(() => referenceAt('[not MRW](command:evil)', 4), /cursor/);
  assert.throws(() => referenceAt('x'.repeat(65537), 0), /64 KiB/);
  assert.throws(() => referenceAt('界'.repeat(23000), 0), /64 KiB/);
});
