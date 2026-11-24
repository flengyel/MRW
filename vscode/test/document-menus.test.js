"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const { contributes: c } = require('../package.json');

test('PDF and text readers have navigation without Markdown or study controls', () => {
  const entry = c.menus['editor/title'].find(item => item.submenu === 'mrw.documentNavigation');
  assert.equal(entry.group, 'navigation@10');
  assert.match(entry.when, /pdf\|txt/);
  const menu = c.menus[entry.submenu];
  assert.deepEqual(menu.filter(item => !item.when).map(item => item.command),
    ['mrw.showBacklinks', 'mrw.newZettel', 'mrw.recentNotes']);
  assert.match(menu.find(item => item.command === 'mrw.refreshCitations').when, /md\|markdown/);
  assert.deepEqual(menu.filter(item => /study|ask|create/i.test(item.command)).map(item => item.command),
    ['mrw.leanStudyActions']);
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
    .every(([, key, expression, flags]) => new RegExp(expression, flags).test(key === 'resourceScheme' ? scheme : extension)) &&
    [...when.matchAll(/(resourceScheme|resourceExtname) == ([^ &()]+)/g)].every(([,key,value]) => (key === 'resourceScheme' ? scheme : extension) === value);
  assert.equal([...entry.when.matchAll(/ =~ /g)].length, 2);
  for (const scheme of ['file', 'vscode-remote']) {
    for (const extension of ['.pdf', '.PDF', '.md', '.markdown', '.txt']) assert.equal(visible(entry.when, scheme, extension), true);
    const noteOnly = c.menus[entry.submenu].filter(item => item.when?.includes('resourceExtname'));
    for (const item of noteOnly) {
      assert.equal(visible(item.when, scheme, '.md'), true);
      assert.equal(visible(item.when, scheme, '.pdf'), false);
    }
  }
  for (const scheme of ['mrw-record', 'untitled', 'git', 'vscode-userdata']) assert.equal(visible(entry.when, scheme, '.md'), false);
});


test('Recent Documents is directly available and keeps its existing command identity',()=>{
 assert.equal(c.commands.find(x=>x.command==='mrw.recentNotes').title,'Recent Documents…');
 assert.ok(c.viewsWelcome.find(x=>x.view==='mrw.commands').contents.includes('(command:mrw.recentNotes '));
});


test('Return and companion commands have the same scope in the Document menu and Command Palette', () => {
  const expected = {
    'mrw.returnToReadingOutline': 'mrw.canReturnToDocument || resourceScheme == mrw-atlas-source',
    'mrw.openDocumentInObsidian': 'resourcePath in mrw.obsidianNotePaths',
    'mrw.copyDocumentLink': 'resourcePath in mrw.noteLinkPaths',
    'mrw.leanStudyActions': 'resourcePath in mrw.leanLessonPaths',
  };
  for (const [command, when] of Object.entries(expected)) {
    for (const menu of ['mrw.documentNavigation', 'commandPalette']) {
      assert.equal(c.menus[menu].find(row => row.command === command).when, when);
    }
  }
  assert.equal(c.submenus.find(menu => menu.id === 'mrw.documentNavigation').icon, '$(list-selection)');
  assert.equal(c.commands.find(row => row.command === 'mrw.openOutline').icon, '$(book)');
  assert.equal(c.menus['editor/title'].find(row => row.command === 'mrw.returnToAtlas').when,
    'resourceScheme == mrw-atlas-source');
});

test('Notes and Examples is the visible entry for the three sample routes', () => {
  const command = c.commands.find(item => item.command === 'mrw.openLearningMaterials');
  assert.equal(command.title, 'Notes and Examples…');
  assert.equal(c.menus.commandPalette.some(item => item.command === command.command && item.when === 'false'), false);
  assert.match(c.viewsWelcome.find(item => item.view === 'mrw.commands').contents,
    /\[Notes and Examples…\]\(command:mrw\.openLearningMaterials /);
  for (const command of ['mrw.openOperadsNotes', 'mrw.openStudyExample', 'mrw.studyLean4']) {
    assert.equal(c.menus.commandPalette.find(item => item.command === command).when, 'false');
  }
  const { GROUPS } = require('../src/companionTools');
  assert.deepEqual(GROUPS.readingTools.find(([, id]) => id === 'openLearningMaterials'),
    ['Notes and Examples…', 'openLearningMaterials']);
  assert.deepEqual(GROUPS.proofTools.filter(([, command]) => /Lean|leanStudy/.test(command)).map(([, command]) => command),
    ['resumeLeanStudy', 'leanStudyActions']);
});

test('the Notes and Examples picker opens only the chosen material and permits cancelling', async () => {
  const { registerCompanionTools } = require('../src/companionTools');
  const handlers = new Map();
  const opened = [];
  const routes = new Map([
    ['Operads from finite lists', 'mrw.openOperadsNotes'],
    ['Sums of odd integers', 'mrw.openStudyExample'],
    ['Lean 4 lessons', 'mrw.studyLean4'],
  ]);
  let choice;
  const vscode = {
    window: { async showQuickPick(items, options) {
      assert.equal(options.title, 'Notes and Examples');
      assert.equal(options.placeHolder, 'Choose a note, example, or lesson');
      assert.equal(options.matchOnDescription, true);
      assert.deepEqual(items.map(item => item.label), [...routes.keys()]);
      assert.ok(items.every(item => item.description));
      return items.find(item => item.label === choice);
    } },
    commands: { async executeCommand(command) {
      opened.push(command);
      return command;
    } },
  };
  registerCompanionTools({vscode, register: (id, handler) => handlers.set(id, handler)});
  const pick = handlers.get('mrw.openLearningMaterials');
  assert.equal(await pick(), undefined);
  assert.deepEqual(opened, []);
  for (const [label, command] of routes) {
    choice = label;
    assert.equal(await pick(), command);
  }
  choice = undefined;
  assert.equal(await pick(), undefined);
  assert.deepEqual(opened, [...routes.values()]);
});
