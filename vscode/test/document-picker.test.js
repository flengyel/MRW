'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { documentItem, documentChoices } = require('../src/documentPicker');
const { windowsNoteFiles } = require('../src/noteFiles');
const { DEFAULT_LIMITS } = require('../src/documentLinks');

test('chooser labels prefer YAML title, retain the filename and use the first real H1', () => {
  assert.equal(documentItem('/notes', '/notes/ID.md', '---\ntitle: ID YAML title\n---\n# Different H1\n').label, 'YAML title · ID.md');
  assert.equal(documentItem('/notes', '/notes/ID.md', '```markdown\n# Example\n```\n# Actual heading\n').label, 'Actual heading · ID.md');
  assert.equal(documentItem('/notes', '/notes/ID.md', 'No title.').label, 'ID.md');
  assert.equal(documentItem('/notes', '/notes/nested/ID.md', '# Actual heading\n').description, 'nested');
  assert.equal(documentItem('/notes', '/notes/ID.md', '---\ntitle: first\ntitle: second\n---\n# Body heading\n').label, 'Body heading · ID.md');
});

test('bounded Windows headers are used for presentation and a dirty overlay wins', async () => {
  const catalogue = async (root, options) => {
    assert.equal(options.includeHeaders, true);
    return { paths: ['/notes/ID.md'], headers: new Map([['/notes/ID.md', '# Saved title\n']]), complete: false };
  };
  const result = await documentChoices('/notes', { catalogue, overrides: new Map([['/notes/ID.md', '# Unsaved title\n']]) });
  assert.equal(result.items[0].label, 'Unsaved title · ID.md'); assert.equal(result.complete, false);
  const stopped = await documentChoices('/notes', { catalogue, token: { isCancellationRequested: true } });
  assert.deepEqual(stopped.items, []);
});

test('header catalogue validates its root-relative paths, byte limits and canonical base64', async () => {
  const options = { includeHeaders: true, remoteName: 'wsl', limits: DEFAULT_LIMITS };
  const response = headers => JSON.stringify({ paths: ['ID.md'], headers, complete: true, errors: [] });
  const value = await windowsNoteFiles('/mnt/c/Notes', { ...options, run: async () => response({ 'ID.md': Buffer.from('# α title\n').toString('base64') }) });
  assert.equal(value.headers.get('/mnt/c/Notes/ID.md'), '# α title\n');
  for (const headers of [{ '../outside.md': '' }, { 'ID.md': 'not base64' }, { 'ID.md': Buffer.alloc(65537).toString('base64') }]) {
    assert.equal(await windowsNoteFiles('/mnt/c/Notes', { ...options, run: async () => response(headers) }), undefined);
  }
});
