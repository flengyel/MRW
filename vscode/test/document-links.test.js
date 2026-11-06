'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { buildNoteIndex, resolveNoteLink, backlinks } = require('../src/documentLinks');

async function fixture(t, documents) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-note-links-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(documents)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  }
  return root;
}

test('ordinary notes, dotted and index IDs produce exact repeated backlink occurrences without imports', async t => {
  const source = '---\r\nid: 1.2a\r\ntitle: 1.2a A revised title\r\n---\r\n# A revised title\r\n[[00]] Index\r\n[Again](00.md#Index) and [[00]] Index again.\r\n';
  const root = await fixture(t, { '1.2a.md': source, '00.md': '---\nid: 00\ntitle: 00 Index\n---\n# Index\n', 'ordinary note.md': '# Ordinary\n[Read](1.2a.md)\n' });
  const index = await buildNoteIndex(root);
  assert.equal(index.complete, true);
  const byID = await resolveNoteLink(index, path.join(root, 'ordinary note.md'), '1.2a', 'zettel');
  assert.equal(byID.ok, true); assert.equal(byID.path, path.join(root, '1.2a.md'));
  const found = await backlinks(index, path.join(root, '00.md'));
  assert.equal(found.complete, true); assert.equal(found.occurrences.length, 3);
  assert.deepEqual(found.occurrences.map(o => source.slice(o.node.start, o.node.end)), ['[[00]]', '[Again](00.md#Index)', '[[00]]']);
  assert.deepEqual(found.occurrences.map(o => o.node.line), [5, 6, 6]);
  assert.equal(found.occurrences[0].sourceRevision, index.files.get(path.join(root, '1.2a.md')).parsed.revision);
  assert.equal(found.occurrences[0].sourceText, '[[00]]');
  assert.equal(await fs.readFile(path.join(root, '1.2a.md'), 'utf8'), source);
});

test('duplicate filenames and conflicting YAML identity are explained; editable titles never select a substitute', async t => {
  const root = await fixture(t, { 'start.md': '# Start\n', 'a/12a.md': '---\nid: 12a\ntitle: Any title\n---\n# First\n',
    'b/12a.md': '# Second\n', '13b.md': '---\nid: somebody-else\ntitle: 13b A title\n---\n# Heading\n', '14c.md': '# 15d\n' });
  const index = await buildNoteIndex(root), source = path.join(root, 'start.md');
  assert.equal((await resolveNoteLink(index, source, '12a', 'zettel')).code, 'ambiguous_id');
  const conflict = await resolveNoteLink(index, source, '13b', 'zettel');
  assert.equal(conflict.code, 'identity_conflict'); assert.match(conflict.error, /filename ID/);
  assert.equal((await resolveNoteLink(index, source, 'somebody-else', 'zettel')).code, 'missing_id');
  assert.equal((await resolveNoteLink(index, source, '15d', 'zettel')).code, 'missing_id');
  assert.equal((await resolveNoteLink(index, source, '14c', 'zettel')).ok, true);
  // Ordinary Markdown is not required to satisfy Zettel identity conventions.
  assert.equal((await resolveNoteLink(index, source, '13b.md', 'markdown')).ok, true);
});

test('dirty buffers and rebuilding after external edits change backlinks and headings without writing originals', async t => {
  const original = '# Start\n[Old](target.md#old)\n';
  const root = await fixture(t, { 'source.md': original, 'target.md': '# Old\n', 'other.md': '# Other\n' });
  const source = path.join(root, 'source.md'), target = path.join(root, 'target.md'), other = path.join(root, 'other.md');
  const first = await buildNoteIndex(root);
  assert.equal((await backlinks(first, target)).occurrences.length, 1);
  const dirty = await buildNoteIndex(root, { overrides: new Map([[source, '# Unsaved\n[New](other.md#fresh)\n'], [other, '# Fresh\n']]) });
  assert.equal((await backlinks(dirty, target)).occurrences.length, 0);
  const changed = await backlinks(dirty, other);
  assert.equal(changed.occurrences.length, 1);
  assert.equal((await resolveNoteLink(dirty, source, 'other.md#fresh')).heading.line, 0);
  assert.equal(await fs.readFile(source, 'utf8'), original);
  assert.equal(await fs.readFile(other, 'utf8'), '# Other\n');
  await fs.writeFile(source, '# Start\n[[other]] External edit\n');
  const rebuilt = await buildNoteIndex(root);
  assert.equal((await backlinks(rebuilt, target)).occurrences.length, 0);
  assert.equal((await backlinks(rebuilt, other)).occurrences.length, 1);
});

test('Unicode relative links, same-note and duplicate heading fragments, and PDF file opening remain distinct', async t => {
  const root = await fixture(t, { 'a.md': '# Alpha\n# Alpha\n', 'β note.md': '# A heading\n', 'paper.pdf': Buffer.from('%PDF-1.4\n') });
  const source = path.join(root, 'a.md'), index = await buildNoteIndex(root);
  const unicode = await resolveNoteLink(index, source, '%CE%B2%20note.md#a-heading');
  assert.equal(unicode.ok, true); assert.equal(unicode.path, path.join(root, 'β note.md'));
  assert.equal((await resolveNoteLink(index, source, '#alpha-1')).heading.line, 1);
  assert.equal((await resolveNoteLink(index, source, 'paper.pdf')).type, 'pdf');
  assert.equal((await resolveNoteLink(index, source, 'paper.pdf#page=2')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a.md#absent')).code, 'missing_heading');
});

test('no directory symlink is traversed and file symlinks cannot expand the explicitly selected scope', async t => {
  const root = await fixture(t, { 'source.md': '# Source\n', 'real/inside.md': '# Inside\n' });
  const outside = await fixture(t, { 'private.md': '# Outside\n[[source]]\n' });
  await fs.symlink(outside, path.join(root, 'outside-dir'), 'dir');
  await fs.symlink(path.join(root, 'real'), path.join(root, 'inside-dir'), 'dir');
  await fs.symlink(path.join(outside, 'private.md'), path.join(root, 'escape.md'));
  await fs.symlink(path.join(root, 'real/inside.md'), path.join(root, 'alias.md'));
  const index = await buildNoteIndex(root), source = path.join(root, 'source.md');
  assert.equal(index.stats.skippedDirectorySymlinks, 2);
  assert.equal(index.files.size, 2); assert.equal(index.ids.has('alias'), false);
  assert.equal(index.errors.some(e => e.code === 'outside_scope'), true);
  assert.equal((await resolveNoteLink(index, source, 'escape.md')).code, 'outside_scope');
  assert.equal((await resolveNoteLink(index, source, '../private.md')).code, 'outside_scope');
  const inside = await resolveNoteLink(index, source, 'alias.md');
  assert.equal(inside.path, path.join(root, 'real/inside.md'));
});

test('unsupported selectors and schemes are inert data and never become approximate note matches', async t => {
  const root = await fixture(t, { 'a.md': '# A\n', '1a.md': '# Target\n' });
  const index = await buildNoteIndex(root), source = path.join(root, 'a.md');
  for (const target of ['1a#Target', '1a|Title', '1a^block', '../1a', '1 a']) {
    assert.equal((await resolveNoteLink(index, source, target, 'zettel')).code, 'unsupported_selector', target);
  }
  for (const target of ['command:workbench.action.closeWindow', 'https://example.test/', 'file:///tmp/a.md', '//example/a.md', '/tmp/a.md']) {
    assert.equal((await resolveNoteLink(index, source, target)).code, 'unsupported_scheme', target);
  }
  assert.equal((await resolveNoteLink(index, source, '%2Ftmp/a.md')).code, 'unsupported_target');
  assert.equal((await resolveNoteLink(index, source, 'a.md?run=1')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a.md#^block')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a%XX.md')).code, 'invalid_encoding');
  assert.equal((await resolveNoteLink(index, source, 'missing.md')).code, 'missing_target');
  assert.equal((await resolveNoteLink(index, source, 'missing', 'zettel')).code, 'missing_id');
});

test('index bounds, cancellation and read errors are explicit partial states rather than completed empty results', async t => {
  const root = await fixture(t, { 'a.md': '# A\n', 'b.md': '# B\n[[a]]\n' });
  const bounded = await buildNoteIndex(root, { limits: { maxFiles: 1 } });
  assert.equal(bounded.complete, false); assert.equal(bounded.errors[0].code, 'file_limit');
  assert.equal((await resolveNoteLink(bounded, path.join(root, 'a.md'), 'a', 'zettel')).code, 'incomplete_index');
  const token = { isCancellationRequested: true };
  const stopped = await buildNoteIndex(root, { token });
  assert.equal(stopped.cancelled, true); assert.equal(stopped.complete, false);
  assert.equal((await backlinks(stopped, path.join(root, 'a.md'))).complete, false);
  const io = Object.create(fs); io.open = async file => { throw new Error(`Fixture read failure for ${path.basename(file)}`); };
  const failed = await buildNoteIndex(root, { io });
  assert.equal(failed.files.size, 0); assert.equal(failed.complete, false); assert.equal(failed.errors.length, 2);
  const emptyRoot = await fixture(t, { 'paper.pdf': '%PDF-1.4\n' });
  const empty = await buildNoteIndex(emptyRoot);
  assert.equal(empty.complete, true); assert.equal(empty.files.size, 0); assert.deepEqual(empty.errors, []);
});

test('overlarge and invalid UTF-8 notes do not masquerade as an empty completed index', async t => {
  const root = await fixture(t, { 'large.md': '# This is over the chosen limit\n', 'invalid.md': Buffer.from([0xc3, 0x28]) });
  const index = await buildNoteIndex(root, { limits: { maxFileBytes: 16 } });
  assert.equal(index.complete, false); assert.equal(index.files.size, 0);
  assert.equal(index.errors.length, 2);
  assert.match(index.errors.find(e => e.path.endsWith('large.md')).message, /file limit/);
  assert.match(index.errors.find(e => e.path.endsWith('invalid.md')).message, /encoding|encoded/i);
});

test('unresolved local backlink candidates are distinct from a completed empty result, while web citations are excluded', async t => {
  const root = await fixture(t, { 'source.md': '# Source\n[[12a]] Ambiguous\n[[missing]] Missing\n[Web](https://example.test/)\n',
    'a/12a.md': '# First\n', 'b/12a.md': '# Second\n', 'unrelated.md': '# Unrelated\n[Web](https://example.test/)\n' });
  const index = await buildNoteIndex(root), result = await backlinks(index, path.join(root, 'a/12a.md'));
  assert.equal(index.complete, true); assert.equal(result.complete, false); assert.equal(result.occurrences.length, 0);
  assert.equal(result.unresolvedCount, 2); assert.deepEqual(result.unresolved.map(e => e.code), ['ambiguous_id', 'missing_id']);
  assert.match(result.errors[0].message, /Unresolved link/);
  const cleanRoot = await fixture(t, { 'a.md': '# A\n[Web](https://example.test/)\n', 'b.md': '# B\n' });
  const clean = await backlinks(await buildNoteIndex(cleanRoot), path.join(cleanRoot, 'b.md'));
  assert.equal(clean.complete, true); assert.equal(clean.unresolvedCount, 0); assert.deepEqual(clean.occurrences, []);
});

test('backlink hits retain exact indexed revision and syntax when a same-label target is externally replaced', async t => {
  const original = '# Source\n[Same](a.md)\n', changed = '# Source\n[Same](b.md)\n';
  const root = await fixture(t, { 'source.md': original, 'a.md': '# A\n', 'b.md': '# B\n' });
  const result = await backlinks(await buildNoteIndex(root), path.join(root, 'a.md'));
  const hit = result.occurrences[0];
  await fs.writeFile(path.join(root, 'source.md'), changed);
  const updated = await buildNoteIndex(root), current = updated.files.get(hit.sourcePath);
  const node = current.parsed.all.find(n => n.id === hit.node.id);
  assert.equal(node.start, hit.node.start); assert.equal(node.end, hit.node.end);
  assert.notEqual(current.parsed.revision, hit.sourceRevision);
  assert.notEqual(current.text.slice(node.start, node.end), hit.sourceText);
});
