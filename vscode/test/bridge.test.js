'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runBridge } = require('../src/bridge');
const { sourceSnapshot, digest, validateMarker, protectedText, httpsViewer } = require('../src/navigation');
const extension = path.resolve(__dirname, '..');
const fixture = path.resolve(extension, '../tests/fixtures/mechanical_model_call.json');

test('real isolated bridge reviews, copies, and retains the same exact Unicode passage', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-bridge-'));
  try {
    const reviewed = await runBridge(extension, 'python3', { method: 'review', path: fixture, mode: 'passage', number: 1 });
    assert.match(reviewed.body, /α → β/);
    const contribution = await runBridge(extension, 'python3', {
      method: 'contribution', path: fixture, number: 1, revision: reviewed.revision,
    });
    assert.match(contribution.body, /unverified editable copy/);
    const destination = path.join(directory, 'retained.json');
    const request = { method: 'project', path: fixture, revision: reviewed.revision, number: 1, destination };
    await runBridge(extension, 'python3', request);
    const retained = await fs.readFile(destination, 'utf8');
    assert.match(retained, /mrw.documentary-projection/);
    await assert.rejects(runBridge(extension, 'python3', request), /already exists/);
    assert.equal(await fs.readFile(destination, 'utf8'), retained);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('bridge rejects changed records, unavailable Python, and oversized requests', async () => {
  await assert.rejects(runBridge(extension, 'python3', { method: 'review', path: fixture,
    mode: 'passage', number: 1, revision: '0'.repeat(64) }), /changed/);
  await assert.rejects(runBridge(extension, '/unavailable/mrw-python', {}), /Cannot start/);
  await assert.rejects(runBridge(extension, 'python3', { value: 'x'.repeat(4 * 1024 * 1024) }), /too large/);
});

test('source snapshot detects byte changes and rejects binary, large, and symlink files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-navigation-'));
  try {
    const file = path.join(directory, 'α.lean');
    await fs.writeFile(file, 'theorem α : True := by trivial\r\n');
    const original = await sourceSnapshot(file);
    assert.equal(original.revision, digest(await fs.readFile(file)));
    await fs.writeFile(file, original.text.replace('\r\n', '\n'));
    assert.notEqual((await sourceSnapshot(file)).revision, original.revision);
    const link = path.join(directory, 'link.lean');
    await fs.symlink(file, link);
    await assert.rejects(sourceSnapshot(link), /non-symlink/);
    await fs.writeFile(file, Buffer.from([0xff, 0x00]));
    await assert.rejects(sourceSnapshot(file));
    await fs.writeFile(file, Buffer.alloc(4 * 1024 * 1024 + 1, 65));
    await assert.rejects(sourceSnapshot(file), /4 MiB/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('navigation state is typed and proof viewer URLs cannot execute commands', () => {
  const marker = { version: 1, root: '/project', path: '/project/a.lean', preview: 'α',
    revision: 'a'.repeat(64), textRevision: 'b'.repeat(64), start: [0, 0], end: [1, 2] };
  assert.deepEqual(validateMarker(marker), marker);
  assert.throws(() => validateMarker({ ...marker, end: [-1, 0] }));
  assert.throws(() => validateMarker({ ...marker, start: [4, 0] }));
  for (const url of ['command:workbench.action.terminal.new', 'file:///tmp/a', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    assert.throws(() => httpsViewer(url));
  }
  assert.equal(httpsViewer('https://example.com/proofs/#a'), 'https://example.com/proofs/#a');
  assert.equal(protectedText('{"schema":"mrw.model-call"}'), true);
  assert.equal(protectedText('ordinary mathematical prose'), false);
});
