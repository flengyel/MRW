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
