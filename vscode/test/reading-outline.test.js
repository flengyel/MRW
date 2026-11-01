'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReadingMarkdown } = require('../src/readingMarkdown');
const { trackLocation } = require('../src/readingOutline');

test('Markdown syntax organizes headings and duplicate references, excluding code, comments and images', () => {
  const ref = 'mrw-outline:v1/test';
  const text = `# α😀\r\n\r\n[Book \\[x\\] 😀](${ref})\r\n\r\n## Repeat\r\n[again](${ref})\r\n\r\n## Repeat\r\n[again](${ref})\r\n\r\n\`[example](${ref})\`\r\n\r\n~~~md\r\n# Example\r\n[code](${ref})\r\n~~~\r\n\r\n    # Indented\r\n    [code](${ref})\r\n\r\n<!--\r\n# Hidden\r\n[comment](${ref})\r\n-->\r\n\r\n![image](${ref})\r\n`;
  const m = parseReadingMarkdown(text);
  assert.equal(m.roots.length, 1);
  assert.deepEqual(m.all.map(n => n.label), ['α😀', 'Book [x] 😀', 'Repeat', 'again', 'Repeat', 'again']);
  assert.equal(new Set(m.all.map(n => n.id)).size, 6);
  for (const n of m.all.filter(n => n.kind === 'reference')) assert.ok(text.slice(n.start, n.end).endsWith(`(${ref})`));
});

test('Setext, lists, quoted multiline links, reference definitions and inline code labels have exact positions', () => {
  const ref = 'mrw-outline:v1/test';
  const text = `Title\n=====\n\n- [list](${ref})\n\n> [two\n> lines](${ref})\n\n### A \`term\`\n\n[defined][r]\n\n[r]: ${ref}\n\n<${ref}>\n`;
  const m = parseReadingMarkdown(text);
  assert.deepEqual(m.all.map(n => n.label), ['Title', 'list', 'two lines', 'A term', 'defined', ref]);
  for (const n of m.all.filter(n => n.kind === 'reference')) assert.ok(text.slice(n.start, n.end).includes('[') || text.slice(n.start, n.end).startsWith('<'));
  assert.equal(text.slice(m.all[2].start, m.all[2].end), `[two\n> lines](${ref})`);
});

test('return pins follow external edits, reject overlap and recover only exact original text on undo', () => {
  const pin = { uri: 'file:/a', start: 20, end: 40, revision: 'a', initial: { revision: 'a', start: 20, end: 40 } };
  let p = trackLocation(pin, [{ rangeOffset: 0, rangeLength: 0, text: 'α😀' }, { rangeOffset: 50, rangeLength: 1, text: '' }], 'b');
  assert.deepEqual([p.start, p.end, p.invalid], [23, 43, false]);
  p = trackLocation(p, [{ rangeOffset: 25, rangeLength: 2, text: '' }], 'c'); assert.ok(p.invalid);
  p = trackLocation(p, [], 'a'); assert.deepEqual([p.start, p.end, p.invalid], [20, 40, false]);
  assert.throws(() => parseReadingMarkdown('x'.repeat(4 * 1024 * 1024 + 1)), /4 MiB/);
});
