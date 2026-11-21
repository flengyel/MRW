'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {assertFixture, clearOwnedState, protect} = require('./fixtureGuard');

const proof = 'theorem second_implication_needed : (True → True) ∧ ¬ (True → False) :=\n' +
  '  ⟨fun h => h, fun h => h True.intro⟩\n';
const originText = 'Does P → R still follow if only P → Q is available?';
const noteText = '\n## The second implication\n\n' +
  'Take P = Q = True and R = False. The identity proves P → Q. ' +
  'An implication P → R would send True.intro to a proof of False. ' +
  'See `second_implication_needed` in the working code.\n';

async function activate(context) {
  const {marker, config} = await assertFixture(vscode, context, context.extensionPath);
  const checkpointFile = path.join(marker.root, 'lean-checkpoint.json');
  const reportFile = path.join(marker.root, 'native-result.json');
  let checkpoint;
  try { checkpoint = JSON.parse(await fs.readFile(checkpointFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const book = path.join(config.project, 'Lean Study', 'lean-foundations');
  const codeFile = path.join(book, 'Study', 'Examples.lean');
  const lessonFile = path.join(book, 'lessons', '02-implication.md');
  const notesFile = path.join(book, 'Notes.md');
  const originFile = path.join(config.project, 'reading.md');
  const original = {
    execute: vscode.commands.executeCommand,
    pick: vscode.window.showQuickPick,
    error: vscode.window.showErrorMessage,
  };
  const report = {
    host: vscode.version, remote: vscode.env.remoteName, profile: marker.profile,
    packageVersion: JSON.parse(await fs.readFile(path.join(context.extensionPath, 'package.json'), 'utf8')).version,
    phase: checkpoint ? 'restart' : 'first launch', checks: checkpoint?.checks || [], complete: false,
  };
  const save = () => fs.writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
  const command = (name, ...args) => original.execute('mrw.' + name, ...args);
  const open = file => vscode.workspace.openTextDocument(vscode.Uri.file(file));
  const tab = () => vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
  const hasPreview = file => vscode.window.tabGroups.all.some(group => group.tabs.some(item =>
    item.input?.viewType === 'vscode.markdown.preview.editor' && item.input.uri?.fsPath === file));
  const fileIsActive = file => tab()?.uri?.fsPath === file;
  const wait = async (check, label, timeout = 20000) => {
    const end = Date.now() + timeout;
    while (!check()) {
      if (Date.now() > end) throw Error('Timed out waiting for ' + label);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  };

  let enabledFiles = [], choose, requestedReload = false;
  const returns = [];
  try {
    vscode.commands.executeCommand = (name, ...args) => {
      if (name === 'setContext' && args[0] === 'mrw.leanLessonPaths') enabledFiles = args[1];
      if (name === 'vscode.openWith' && args[0].fsPath === originFile) {
        const editor = vscode.window.visibleTextEditors.find(item => item.document.uri.fsPath === originFile);
        returns.push(editor?.document.getText(editor.selection));
      }
      return original.execute(name, ...args);
    };
    vscode.window.showQuickPick = async choices => {
      const select = choose;
      choose = undefined;
      assert.ok(select, 'Unexpected picker in the lesson route');
      const item = select(await choices);
      assert.ok(item, 'The requested lesson action is missing');
      return item;
    };
    vscode.window.showErrorMessage = async message => { report.commandError = message; await save(); };
    await require('../../src/extension').activate(context);
    await save();

    report.stage = 'open lesson and example';
    if (!checkpoint) {
      assert.equal(context.workspaceState.get('mrw.lightStudy.recent.v1'), undefined);
      await fs.writeFile(originFile, '# A hypothesis in implication composition\n\n' + originText + '\n');
      const doc = await open(originFile);
      const editor = await vscode.window.showTextDocument(doc, {preview: false});
      const start = doc.getText().indexOf(originText);
      editor.selection = new vscode.Selection(doc.positionAt(start), doc.positionAt(start + originText.length));
      await wait(() => fileIsActive(originFile), 'reading document editor');
      choose = rows => rows.find(row => row.lesson?.id === 'implication');
      const opened = await command('studyLean4');
      assert.equal(opened?.lessonId, 'implication');
    } else {
      const resumed = await command('resumeLeanStudy');
      assert.equal(resumed?.lessonId, 'implication');
    }
    await wait(() => hasPreview(lessonFile), 'the implication lesson preview');
    const lean = vscode.extensions.getExtension('leanprover.lean4');
    assert.ok(lean?.isActive, 'The official Lean extension must be active in the fixture');
    report.leanExtension = lean.packageJSON.version;
    await wait(() => vscode.window.tabGroups.all.some(group =>
      group.tabs.some(item => item.input?.viewType === 'mainThreadWebview-lean4_infoview' ||
        item.input?.viewType === 'lean4_infoview' || item.label === 'Lean Infoview')), 'the native InfoView tab');

    const code = await open(codeFile);
    const editor = await vscode.window.showTextDocument(code, {preview: false});
    if (!checkpoint) {
      report.stage = 'check the counterexample in the working copy';
      const seed = code.getText();
      assert.ok(await editor.edit(edit => edit.insert(code.positionAt(seed.length), '\n' + proof +
        '\n#check second_implication_needed\n')));
      // Lean's published diagnostics are native VS Code data.
      await wait(() => vscode.languages.getDiagnostics(code.uri).some(item =>
        item.message.includes('second_implication_needed') && item.message.includes('True → True') &&
        item.severity !== vscode.DiagnosticSeverity.Error), 'Lean’s type for the counterexample');
      assert.ok(!vscode.languages.getDiagnostics(code.uri).some(item => item.severity === vscode.DiagnosticSeverity.Error));
      assert.ok(await code.save());
      const start = code.getText().indexOf('second_implication_needed');
      editor.selection = new vscode.Selection(code.positionAt(start), code.positionAt(start + 'second_implication_needed'.length));
      await wait(() => context.workspaceState.get('mrw.leanStudy.v1')?.code?.start === start, 'persisted Lean selection');
      report.checks.push('The native lesson preview, example editor, InfoView and Lean type message opened. Lean checked the counterexample.');
      report.stage = 'open the working note';
      choose = rows => rows.find(row => row.lesson?.id === 'implication');
      // The examples are shared. Preserve the explicitly selected lesson in that picker.
      const pick = vscode.window.showQuickPick;
      vscode.window.showQuickPick = async (choices, options) => {
        const item = await pick(choices, options);
        if (item.lesson) choose = rows => rows.find(row => row.kind === 'notes');
        return item;
      };
      try { await command('leanStudyActions'); } finally { vscode.window.showQuickPick = pick; }
    } else {
      assert.equal(code.getText(editor.selection), 'second_implication_needed');
      assert.ok(code.getText().includes(proof));
      assert.ok((await fs.readFile(notesFile, 'utf8')).endsWith(noteText));
      await vscode.window.showTextDocument(await open(notesFile), {preview: false});
      report.checks.push('A window reload recovered the same lesson, checked code, exact code selection and saved note.');
    }
    await wait(() => fileIsActive(notesFile), 'the working note editor');
    report.stage = 'use lesson actions from the working note';
    await save();
    assert.ok(enabledFiles.includes(notesFile), 'Lean Study Actions is unavailable from its working note');
    const note = await open(notesFile);
    if (!checkpoint) {
      const notesEditor = vscode.window.activeTextEditor;
      const before = note.getText();
      assert.ok(await notesEditor.edit(edit => edit.insert(note.positionAt(before.length), noteText)));
      assert.ok(note.isDirty);
      choose = rows => rows.find(row => row.kind === 'lesson');
      await command('leanStudyActions', note.uri);
      await wait(() => fileIsActive(lessonFile) && hasPreview(lessonFile), 'return to the selected lesson from its note');
      assert.ok(note.isDirty);
      assert.equal(await fs.readFile(notesFile, 'utf8'), before);
      await vscode.window.showTextDocument(note, {preview: false});
    }
    choose = rows => rows.find(row => row.kind === 'return');
    await command('leanStudyActions', note.uri);
    await wait(() => fileIsActive(originFile) && hasPreview(originFile), 'the original Markdown preview');
    assert.equal(returns.at(-1), originText);
    assert.equal(context.workspaceState.get('mrw.lightStudy.recent.v1'), undefined);
    assert.equal(report.commandError, undefined);
    if (!checkpoint) {
      assert.ok(note.isDirty);
      assert.ok(await note.save());
      report.checks.push('The working note returned to the lesson and the exact original Markdown selection without saving the draft.');
      await fs.writeFile(checkpointFile, JSON.stringify({checks: report.checks}) + '\n', {flag: 'wx'});
      report.stage = 'reload the owned window';
      await save();
      requestedReload = true;
      await original.execute('workbench.action.reloadWindow');
      return;
    }
    report.checks.push('Return from the working note restored the same original Markdown selection after reload.');
    await clearOwnedState(context);
    delete report.stage;
    report.complete = true;
  } catch (error) {
    if (!requestedReload) report.failure = error.stack;
  } finally {
    vscode.commands.executeCommand = original.execute;
    vscode.window.showQuickPick = original.pick;
    vscode.window.showErrorMessage = original.error;
    if (!requestedReload) {
      await save();
      if (!vscode.workspace.textDocuments.some(doc => doc.isDirty)) await original.execute('workbench.action.closeWindow');
    }
  }
}

module.exports = protect({activate}, {vscode, filename: __filename});

