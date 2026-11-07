'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeNoteLink, parseNoteLink } = require('../src/noteLinks');
const target = { workspace: 'vscode-remote://wsl+Debian/home/reader/Math%20%CE%B1.code-workspace', notes: '/mnt/c/Users/reader/Notes α', file: 'Number theory/ID α&%#(1).md' };
test('ordinary note links survive restart without callbacks, retain Unicode and open live files', () => {
  const link = makeNoteLink(target);
  assert.deepEqual(parseNoteLink(link), target);
  assert.equal(makeNoteLink(parseNoteLink(link)), link);
  assert.deepEqual(parseNoteLink(makeNoteLink(target, 'vscode-insiders'), 'vscode-insiders'), target);
  assert.doesNotMatch(link, /[\s()]|windowId|session|revision/);
});
test('note links reject ambiguous parameters, other extension actions and invalid bytes', () => {
  const good = makeNoteLink(target);
  for(const value of [good + '&v=1', good + '&extra=x', good + '#x', good + ' ',
    good.replace('/note?', '/outline?'), good.replace('flengyel.mrw', 'evil.extension'),
    good.replace('vscode:', 'command:'), good.replace('v=1', 'v=2'),
    good.replace('target=', 'target=%ZZ'), 'vscode://flengyel.mrw/note?v=1&target=_w']) {
    assert.throws(() => parseNoteLink(value));
  }
  for(const notes of ['relative', '/tmp/../notes', '/tmp/notes/', '/tmp/\0notes']) assert.throws(() => makeNoteLink({ ...target, notes }));
  for(const file of ['../outside.md', '/tmp/outside.md', 'a/../../x.md', 'a/./x.md', 'a\\x.md', '.obsidian/private.md', '.trash/old.md', 'a.pdf', 'a.md\0']) assert.throws(() => makeNoteLink({ ...target, file }));
  assert.throws(() => makeNoteLink({ ...target, revision: 'ignored' }));
  assert.throws(() => makeNoteLink({ ...target, workspace: 'command:arbitrary' }));
});
