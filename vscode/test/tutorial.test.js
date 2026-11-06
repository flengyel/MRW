'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { registerTutorial, renderTutorial } = require('../src/tutorial');

async function fixture(t, version = '0.20.0', marker = { version, commit: 'a'.repeat(40) }) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-help-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, 'media'));
  await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ version: '9.9.9' }));
  await fs.writeFile(path.join(directory, 'media/build-info.json'), JSON.stringify(marker));
  await fs.writeFile(path.join(directory, 'media/first-steps.md'), '# Using MRW\n\nActive package instructions.\n');
  const commands = new Map(), changes = [], previews = [], providers = new Map();
  class EventEmitter {
    constructor() { this.event = listener => { this.listener = listener; return { dispose() {} }; }; }
    fire(value) { changes.push(value); this.listener?.(value); }
    dispose() {}
  }
  const context = { extensionPath: directory, extension: { packageJSON: { version } }, subscriptions: [] };
  const vscode = {
    EventEmitter, Uri: { from: fields => ({ ...fields, toString: () => `${fields.scheme}:${fields.path}?${fields.query}` }) },
    workspace: { registerTextDocumentContentProvider: (scheme, provider) => { providers.set(scheme, provider); return { dispose() {} }; } },
    commands: { executeCommand: async (...args) => { previews.push(args); } },
  };
  return { directory, context, vscode, commands, changes, previews, providers,
    register: (name, handler) => commands.set(name, handler) };
}

test('tutorial reports activation metadata and keeps that build after an on-disk update', async t => {
  const h = await fixture(t);
  const active = registerTutorial(h);
  assert.equal(active.identity.version, '0.20.0');
  assert.match(active.provider.provideTextDocumentContent(), /Active extension: \*\*MRW 0\.20\.0\*\*/);
  assert.match(active.provider.provideTextDocumentContent(), new RegExp('a'.repeat(40)));
  assert.doesNotMatch(active.provider.provideTextDocumentContent(), /9\.9\.9/);
  await fs.writeFile(path.join(h.directory, 'media/first-steps.md'), '# Using MRW\n\nNewly installed instructions.\n');
  await fs.writeFile(path.join(h.directory, 'media/build-info.json'), JSON.stringify({ version: '0.20.1', commit: 'b'.repeat(40) }));
  await h.commands.get('mrw.openTutorial')();
  await h.commands.get('mrw.openTutorial')();
  assert.match(active.provider.provideTextDocumentContent(), /Active package instructions/);
  assert.doesNotMatch(active.provider.provideTextDocumentContent(), /Newly installed|0\.20\.1/);
  assert.equal(h.changes.length, 2, 'each reopen invalidates any cached virtual text');
  assert.ok(h.previews.every(([command, uri]) => command === 'markdown.showPreview' && uri === active.uri));

  h.context.extension.packageJSON.version = '0.20.1';
  const adopted = registerTutorial(h);
  assert.notEqual(adopted.uri.toString(), active.uri.toString(), 'a new activation cannot reuse the previous text model');
  assert.match(adopted.provider.provideTextDocumentContent(), /MRW 0\.20\.1/);
  assert.match(adopted.provider.provideTextDocumentContent(), /Newly installed instructions/);
  assert.match(adopted.provider.provideTextDocumentContent(), new RegExp('b'.repeat(40)));
});

test('a newer marker on disk is not called the active build and help still opens', async t => {
  const h = await fixture(t, '0.19.2', { version: '0.20.0', commit: 'c'.repeat(40) });
  const active = registerTutorial(h);
  await h.commands.get('mrw.openTutorial')();
  const text = active.provider.provideTextDocumentContent();
  assert.match(text, /MRW 0\.19\.2/);
  assert.match(text, /build identity unavailable/);
  assert.doesNotMatch(text, /0\.20\.0|cccccccc/);
  assert.equal(h.previews.length, 1);
});

test('the bundled task-first help resolves every advanced guide from its virtual URI', async () => {
  const text = await fs.readFile(path.join(__dirname, '../media/first-steps.md'), 'utf8');
  const rendered = renderTutorial(text, { version: '0.20.0' });
  assert.ok(rendered.indexOf('**MRW: Open Document…**') < rendered.indexOf('## Work through a difficult step'));
  assert.match(rendered, /Choose Notes Folder/);
  assert.match(rendered, /Show Backlinks/);
  assert.match(rendered, /Return to Document/);
  assert.match(rendered, /PDF page restoration depends on/);
  assert.match(rendered, /Pause \/ save/);
  const targets = [...rendered.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(targets.length >= 6);
  for (const target of targets) {
    assert.match(target, /^https:\/\/github\.com\/flengyel\/MRW\/blob\/main\/docs\/[A-Z_]+\.md$/);
    await fs.access(path.resolve(__dirname, '../../docs', target.split('/').at(-1)));
  }
});
