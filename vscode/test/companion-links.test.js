'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeExternal, parseExternal, workspaceRoute, obsidianTarget } = require('../src/companionLinks');
const target = { project: '/home/reader/Math α 😀', workspace: 'vscode-remote://wsl+Debian/home/reader/Math%20%CE%B1%20%F0%9F%98%80',
  reference: `mrw-outline:v1/${'a'.repeat(64)}/12345678-1234-1234-1234-123456789abc/${'b'.repeat(64)}` };

test('durable external URI encodes Unicode, spaces, percent and Markdown punctuation without callbacks', () => {
  const link = makeExternal(target);
  assert.deepEqual(parseExternal(link), target);
  assert.ok(!/[\s()]/u.test(link)); assert.ok(!link.includes('windowId'));
  assert.equal(makeExternal(parseExternal(link)), link);
  assert.deepEqual(parseExternal(makeExternal(target, 'vscode-insiders'), 'vscode-insiders'), target);
});
test('external URI rejects other schemes, actions, repeated/unknown parameters and invalid encoding', () => {
  const good = makeExternal(target);
  for (const value of [good.replace('flengyel.mrw', 'other.extension'), good.replace('vscode:', 'command:'), good.replace('/outline?', '/run?'), good+'#fragment', good+'&v=1',
    good+'&append=yes', good.replace('target=', 'target=%ZZ'), good+' ', good.replace('target=', 'target=é'),
    'vscode://evil.extension/outline?v=1&target=e30', good.replace('v=1', 'v=2')]) assert.throws(() => parseExternal(value));
  for (const workspace of ['command:evil', 'https://example.com', 'file:///tmp/folder?x=1', 'vscode-remote://evil/tmp',
    'file://other/tmp', 'file:///tmp/%00', 'file:///tmp/%GG']) assert.throws(() => makeExternal({...target, workspace}));
  for (const project of ['/tmp/../bad', '/tmp/\nname', 'relative', null]) assert.throws(() => makeExternal({...target, project}));
});
test('workspace route uses saved workspace identity and rejects an unrelated configured destination', () => {
  const api = { workspace: { workspaceFile: { scheme: 'file', fsPath: '/tmp/Math α.code-workspace' }, getConfiguration: () => ({get: () => ''}) }, env: {} };
  assert.equal(workspaceRoute(api, '/tmp/one'), 'file:///tmp/Math%20%CE%B1.code-workspace');
  api.workspace.getConfiguration = () => ({get: () => 'file:///tmp/wrong'});
  assert.throws(() => workspaceRoute(api, '/tmp/one'), /must name/);
  api.workspace.workspaceFile.scheme = 'untitled';
  assert.throws(() => workspaceRoute(api, '/tmp/one'), /Save/);
});
test('Obsidian dispatch preserves Unicode, spaces and encoded query punctuation as path data', () => {
  const api = { Uri: { from: parts => parts } };
  const uri = obsidianTarget(api, 'obsidian://open?vault=Notes%20%CE%B1%20%26%20%2B&file=Folder%2FMath%20%F0%9F%98%80%26append%3Dx%2B%25');
  assert.equal(uri.authority, 'vault'); assert.equal(uri.scheme, 'obsidian');
  assert.equal(uri.path, '/Notes α & +/Folder/Math 😀&append=x+%');
  assert.equal(uri.query, undefined); assert.equal(uri.fragment, undefined);
  // Match the standard opener's encodeURI(uri.toString(true)) handoff.
  const opened = new URL(encodeURI(`obsidian://${uri.authority}${uri.path}`));
  assert.equal(opened.search, ''); assert.equal(opened.hash, '');
  assert.equal(decodeURIComponent(opened.pathname), uri.path);
});

test('new extension URLs retain qualified source identity, revision and passage under the MRW authority', () => {
  const reference = 'mrw-outline:v2/stacks-project:08ZH/' + 'a'.repeat(64) + '/12345678-1234-1234-1234-123456789abc/' + 'b'.repeat(64) + '/22345678-1234-1234-1234-123456789abc/10.2-14.6';
  const link = makeExternal({...target, reference});
  assert.match(link, /^vscode:\/\/flengyel\.mrw\//);
  assert.equal(parseExternal(link).reference, reference);
  assert.throws(() => parseExternal(link.replace('flengyel.mrw', 'other.extension')), /Unsupported/);
});
