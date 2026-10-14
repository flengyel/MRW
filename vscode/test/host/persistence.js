'use strict';
// Test-only main in a staged development extension. A normal Development Host
// is essential here: --extensionTestsPath makes VS Code storage memory-only.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');

async function activate(context) {
  const configPath = path.join(context.extensionPath, 'host-test.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const report = { phase: config.phase, version: vscode.version, platform: process.platform,
    remoteName: vscode.env.remoteName, checks: [] };
  const reportPath = path.join(config.artifacts, `persistence-${config.phase}.json`);
  const check = async (name, action) => {
    await action(); report.checks.push({ name, passed: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  };
  const errors = [], requests = [], opens = [], inputs = [];
  const realBridge = bridge.runBridge;
  bridge.runBridge = (...args) => {
    requests.push(args[2].method);
    assert.notEqual(args[2].method, 'send_assistance', 'Send is forbidden in persistence checks');
    return realBridge(...args);
  };
  const originals = { showOpenDialog: vscode.window.showOpenDialog,
    showInputBox: vscode.window.showInputBox, showErrorMessage: vscode.window.showErrorMessage };
  vscode.window.showOpenDialog = async () => { assert.ok(opens.length); return opens.shift(); };
  vscode.window.showInputBox = async () => { assert.ok(inputs.length); return inputs.shift(); };
  vscode.window.showErrorMessage = async message => { errors.push(message); };
  const command = name => vscode.commands.executeCommand(`mrw.${name}`);
  try {
    require('../../src/extension').activate(context);
    const note = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(config.project, 'note.md')));
    await check('production commands activated without bridge work', async () => {
      assert.equal(requests.length, 0); assert.equal(process.platform, 'linux');
      assert.equal(vscode.env.remoteName, 'wsl'); assert.equal(vscode.workspace.isTrusted, true);
    });
    if (config.phase === 'seed') {
      await check('mark through actual workspaceState in a normal development host', async () => {
        const editor = await vscode.window.showTextDocument(note, { preview: false, viewColumn: vscode.ViewColumn.One });
        editor.selection = new vscode.Selection(0, 0, 0, 7);
        await command('mark');
        assert.equal(context.workspaceState.keys().filter(k => k.startsWith('mrw.return.')).length, 1);
      });
    } else {
      await check('marker persisted across closing and reopening the normal development host', async () => {
        assert.equal(context.workspaceState.keys().filter(k => k.startsWith('mrw.return.')).length, 1);
        await command('return');
        const editor = vscode.window.activeTextEditor;
        assert.equal(editor.document.uri.fsPath, note.uri.fsPath);
        assert.ok(editor.selection.isEqual(new vscode.Selection(0, 0, 0, 7)));
        assert.equal(requests.length, 0);
      });
    }
    await command('return');
    opens.push([vscode.Uri.file(config.completed)]); await command('review');
    inputs.push('2'); await command('passage');
    const passage = vscode.window.activeTextEditor.document;
    if (config.phase === 'seed') {
      config.oldReview = passage.uri.toString();
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } else {
      await check('restored virtual URI stays unavailable and cannot select a different record', async () => {
        assert.notEqual(passage.uri.toString(), config.oldReview);
        const old = await vscode.workspace.openTextDocument(vscode.Uri.parse(config.oldReview));
        assert.match(old.getText(), /no longer available/);
        await vscode.window.showTextDocument(old, { preview: false });
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
        await vscode.window.showTextDocument(note, { preview: false, viewColumn: vscode.ViewColumn.One });
        await command('insert');
        assert.match(errors.pop(), /Review Model Response first/);
        assert.equal(note.getText(), await fs.readFile(note.uri.fsPath, 'utf8'));
      });
    }
    await check('only read-only record bridge actions; no unexpected errors or ordinary-file changes', async () => {
      assert.ok(requests.every(r => r === 'review'));
      assert.deepEqual(errors, []);
      assert.equal(await fs.readFile(note.uri.fsPath, 'utf8'), 'α😀 → β\nNext question.\n');
    });
    // Present two genuine editor groups and the extension's own visible shelf.
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('notifications.hideToasts');
    await vscode.commands.executeCommand('workbench.action.joinAllGroups');
    await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    await vscode.window.showTextDocument(note, { preview: false, viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');
    await vscode.window.showTextDocument(passage, { preview: false, viewColumn: vscode.ViewColumn.Two });
    await vscode.commands.executeCommand('mrw.research.focus');
    await new Promise(resolve => setTimeout(resolve, 1000));
    report.complete = true;
    report.view = passage.uri.toString();
    report.visibleEditors = vscode.window.visibleTextEditors.map(e => ({ uri: e.document.uri.toString(), column: e.viewColumn }));
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(config.artifacts, 'persistence-ready'), config.phase);
  } catch (error) {
    report.failure = error.stack; report.errors = errors;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  } finally {
    Object.assign(vscode.window, originals);
    // Keep the test-only Send prohibition for this entire disposable host.
  }
}
module.exports = { activate };
