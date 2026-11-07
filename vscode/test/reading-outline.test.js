'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReadingMarkdown, frontMatterInfo } = require('../src/readingMarkdown');
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

test('leading YAML is excluded without shifting BOM, CRLF or Unicode navigation positions', () => {
  const text = '\uFEFF---\r\nid: 0a1.2\r\ntitle: "A \\"quoted\\" α😀 title"\r\n' +
    'tags: [logic, proof]\r\nlink: "[not prose](hidden.md) [[hidden]]"\r\n---\r\n' +
    '# A α😀 title\r\n\r\n[Next](./β.md#main-result) and [[0a1.2]] Title\r\n';
  const parsed = parseReadingMarkdown(text);
  assert.equal(parsed.frontMatter.id, '0a1.2');
  assert.equal(parsed.frontMatter.title, 'A "quoted" α😀 title');
  assert.deepEqual(parsed.frontMatter.conflicts, []);
  assert.deepEqual(parsed.all.map(n => n.label), ['A α😀 title', 'Next', '0a1.2']);
  const [heading, markdown, zettel] = parsed.all;
  assert.equal(heading.line, 6); assert.equal(heading.start, text.indexOf('# A'));
  assert.equal(markdown.line, 8);
  assert.equal(markdown.target, './%CE%B2.md#main-result');
  assert.equal(text.slice(markdown.start, markdown.end), '[Next](./β.md#main-result)');
  assert.equal(text.slice(zettel.start, zettel.end), '[[0a1.2]]');
  assert.equal(markdown.kind, 'document_link'); assert.equal(markdown.syntax, 'markdown');
  assert.equal(zettel.kind, 'document_link'); assert.equal(zettel.syntax, 'zettel');
});

test('an unterminated front-matter block is reported and does not become document prose', () => {
  const text = '---\nid: 1a\ntitle: Broken\n# Not a heading\n[not a link](other.md)\n[[1b]]';
  const parsed = parseReadingMarkdown(text);
  assert.equal(parsed.frontMatter.present, true); assert.equal(parsed.frontMatter.closed, false);
  assert.equal(parsed.frontMatter.malformed, true); assert.match(parsed.frontMatter.conflicts[0], /closing delimiter/);
  assert.equal(parsed.frontMatter.end, text.length); assert.deepEqual(parsed.all, []);
  const closed = parseReadingMarkdown('---\nid: 1a\n...\n# Visible\n');
  assert.equal(closed.frontMatter.closed, true); assert.equal(closed.all[0].line, 3);
  const ordinary = parseReadingMarkdown('Prose\n---\n\n[visible](next.md)');
  assert.equal(ordinary.frontMatter.present, false);
  assert.deepEqual(ordinary.all.map(n => n.label), ['Prose', 'visible']);
});

test('front-matter identity metadata is bounded, non-executable and conflicting fields remain explicit', () => {
  const valid = frontMatterInfo("---\nid: '0a1.2' # immutable\ntitle: 'Gentzen''s proof'\ntags:\n  - logic\n---\n");
  assert.equal(valid.id, '0a1.2'); assert.equal(valid.title, "Gentzen's proof");
  assert.deepEqual(valid.conflicts, []);
  for (const fields of ['id: a\nid: b', 'id: *alias', 'id: !!js/function x', 'id: |\n  a',
    'id: # absent', 'id: ""', 'title: "\\u0000"', `id: ${'a'.repeat(4097)}`]) {
    const info = frontMatterInfo(`---\n${fields}\n---\n# Still visible\n`);
    assert.equal(info.malformed, true, fields.slice(0, 50)); assert.ok(info.conflicts.length);
    assert.equal(info.id, null);
    assert.equal(parseReadingMarkdown(`---\n${fields}\n---\n# Still visible\n`).all[0].label, 'Still visible');
  }
  assert.equal(frontMatterInfo('# Ordinary note\n').id, null);
});

test('ordinary and Zettel links preserve repeated and multiline source occurrences', () => {
  const text = '# Heading\n\n- [local **note**](../notes/one.md#proof)\n\n' +
    '> [two\n> lines](paper.pdf)\n\n[[1a.2]] label; [[1a.2]] repeated\n\n' +
    '[defined][n]\n\n[n]: ./note.md#heading "Title"\n\n[same place](#heading)\n';
  const nodes = parseReadingMarkdown(text).all.filter(n => n.kind === 'document_link');
  assert.deepEqual(nodes.map(n => n.target), ['../notes/one.md#proof', 'paper.pdf', '1a.2', '1a.2', './note.md#heading', '#heading']);
  assert.deepEqual(nodes.map(n => text.slice(n.start, n.end)), ['[local **note**](../notes/one.md#proof)',
    '[two\n> lines](paper.pdf)', '[[1a.2]]', '[[1a.2]]', '[defined][n]', '[same place](#heading)']);
  assert.equal(nodes[0].label, 'local note'); assert.equal(nodes[1].label, 'two lines');
  assert.equal(new Set(nodes.map(n => n.id)).size, nodes.length);
});

test('note discovery excludes fenced and inline code, HTML comments, images and embeds', () => {
  const text = '# Links\n\n`[[inline]] [inline](inline.md)`\n\n```md\n[[fenced]]\n[fenced](fenced.md)\n```\n\n' +
    '    [[indented]]\n    [indented](indented.md)\n\n<!-- [[comment]] [comment](comment.md) -->\n\n' +
    'before <!-- [[inline-comment]] [comment](comment.md) --> after\n\n' +
    '![image](image.md) ![alt [[image-alt]]](image.png) ![[embedded]] \\[[escaped]]\n\n' +
    '[visible](visible.md) [[visible]]\n';
  assert.deepEqual(parseReadingMarkdown(text).all.filter(n => n.kind === 'document_link').map(n => n.target), ['visible.md', 'visible']);
});

test('heading fragments have distinct anchors and unsupported note selectors remain explicit links', () => {
  const text = '# The **main** result: α\n\n# The main result: α\n\n## A `term`\n\n' +
    '[[1a#Heading]] [[1a|Alias]] [[1a^block]] [PDF page](paper.pdf#page=3)\n' +
    '[exact](mrw-outline:v1/exact)\n';
  const parsed = parseReadingMarkdown(text);
  assert.deepEqual(parsed.all.filter(n => n.kind === 'heading').map(n => n.anchor), ['the-main-result-α', 'the-main-result-α-1', 'a-term']);
  assert.deepEqual(parsed.all.filter(n => n.kind === 'document_link').map(n => n.target), ['1a#Heading', '1a|Alias', '1a^block', 'paper.pdf#page=3']);
  assert.equal(parsed.all.at(-1).kind, 'reference');
  assert.equal(parsed.all.at(-1).reference, 'mrw-outline:v1/exact');
});


test('Obsidian aliases display labels while preserving raw links, source ranges and qualified source authority', () => {
  const text='# See [[a1|A readable title]]\n\n[[a1|Second title]] [[kerodon:0004|A definition]] [[a1|stacks-project:08ZH]]\n' +
    '[[mrw-outline:v2/kerodon:0004/snapshot|Retained]]\n';
  const parsed=parseReadingMarkdown(text),links=parsed.all.filter(node=>node.kind==='document_link');
  assert.equal(parsed.all[0].label,'See A readable title');
  assert.equal(links[0].label,'A readable title');assert.equal(links[0].target,'a1|A readable title');
  assert.equal(text.slice(links[0].start,links[0].end),'[[a1|A readable title]]');
  assert.equal(links[2].qualified_id,'kerodon:0004');assert.equal(links[2].target,'kerodon:0004|A definition');
  assert.equal(links[3].qualified_id,undefined,'a display label cannot supply source authority');
  assert.equal(links[4].qualified_id,undefined,'a retained reference inside wiki syntax must not become a current web citation');
  assert.equal(text.slice(links[4].start,links[4].end),'[[mrw-outline:v2/kerodon:0004/snapshot|Retained]]');
});
