"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const { contributes: c } = require('../package.json');

test('PDF and text readers have navigation without Markdown or study controls', () => {
  const entry = c.menus['editor/title'].find(item => item.submenu === 'mrw.documentNavigation');
  assert.equal(entry.group, 'navigation@10');
  assert.match(entry.when, /pdf\|txt/);
  const menu = c.menus[entry.submenu];
  assert.deepEqual(menu.filter(item => !item.when).map(item => item.command), ['mrw.returnToReadingOutline', 'mrw.showBacklinks']);
  assert.ok(menu.filter(item => item.when).every(item => item.when.includes('(md|markdown)')));
  assert.equal(menu.some(item => /study|ask|create/i.test(item.command)), false);
  const toolbar = c.menus['editor/title'].filter(item => item.group.startsWith('navigation'));
  for (const command of ['mrw.copyDocumentLink', 'mrw.openDocumentInObsidian', 'mrw.editDocumentSource', 'mrw.studyCurrent', 'mrw.leanStudyInfo']) {
    assert.equal(toolbar.some(item => item.command === command), false);
  }
  for (const item of menu) assert.ok(c.commands.some(command => command.command === item.command));
});


test('document menu conditions admit local, WSL and SSH files without admitting virtual records', () => {
  const entry = c.menus['editor/title'].find(item => item.submenu === 'mrw.documentNavigation');
  // Evaluate the two regex predicates contributed to VS Code, including flags.
  const visible = (when, scheme, extension) => [...when.matchAll(/(resourceScheme|resourceExtname) =~ \/((?:\\.|[^/])+)\/([a-z]*)/g)]
    .every(([, key, expression, flags]) => new RegExp(expression, flags).test(key === 'resourceScheme' ? scheme : extension));
  assert.equal([...entry.when.matchAll(/ =~ /g)].length, 2);
  for (const scheme of ['file', 'vscode-remote']) {
    for (const extension of ['.pdf', '.PDF', '.md', '.markdown', '.txt']) assert.equal(visible(entry.when, scheme, extension), true);
    const noteOnly = c.menus[entry.submenu].filter(item => item.when);
    for (const item of noteOnly) {
      assert.equal(visible(item.when, scheme, '.md'), true);
      assert.equal(visible(item.when, scheme, '.pdf'), false);
    }
  }
  for (const scheme of ['mrw-record', 'untitled', 'git', 'vscode-userdata']) assert.equal(visible(entry.when, scheme, '.md'), false);
});
