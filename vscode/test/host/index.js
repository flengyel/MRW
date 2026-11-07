'use strict';
// Run by --extensionTestsPath in a genuine VS Code Extension Development Host.
// Only prompts and HTTP transport are scripted. Documents, commands, virtual
// providers, language changes, undo and workspace state use the actual host API.
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { digest } = require('../../src/navigation');
const bridgeModule = require('../../src/bridge');

const repo = path.resolve(__dirname, '../../..');
const configPath = path.join(repo, '.codex-work/vscode-host/config.json');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  assert.equal(config.phase, 'initial', 'Use the normal-host persistence bootstrap for restart checks');
  const artifacts = config.artifacts;
  const root = config.project;
  const report = { phase: config.phase, version: vscode.version, platform: process.platform,
    remoteName: vscode.env.remoteName, trusted: vscode.workspace.isTrusted, checks: [] };
  const reportPath = path.join(artifacts, `${config.phase}.json`);
  const check = async (name, action) => {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.stack }); throw error; }
    finally { await fs.writeFile(reportPath, JSON.stringify(report, null, 2)); }
  };
  const originals = new Map();
  const replace = (object, key, value) => {
    originals.set(key, [object, object[key]]); object[key] = value;
  };
  const inputs = [], opens = [], picks = [], saves = [], errors = [], requests = [];
  let scenario = 'completed', duringContribution, expectedCount = 0;
  replace(vscode.window, 'showInputBox', async () => {
    assert.ok(inputs.length, 'Unscripted input dialog'); return inputs.shift();
  });
  replace(vscode.window, 'showOpenDialog', async () => {
    assert.ok(opens.length, 'Unscripted file dialog'); return opens.shift();
  });
  replace(vscode.window, 'showSaveDialog', async () => {
    assert.ok(saves.length, 'Unscripted save dialog'); return saves.shift();
  });
  replace(vscode.window, 'showQuickPick', async options => {
    assert.ok(picks.length, 'Unscripted choice dialog'); return options[picks.shift()];
  });
  replace(vscode.window, 'showErrorMessage', async message => { errors.push(message); });
  replace(vscode.window, 'showInformationMessage', async () => {});
  const realBridge = bridgeModule.runBridge;
  bridgeModule.runBridge = async (extensionPath, executable, request, options = {}) => {
    requests.push(request);
    const result = await realBridge(extensionPath, executable, request, { ...options,
      spawn: (exe, args, settings) => spawn(exe,
        ['-I', path.join(__dirname, 'deterministic_bridge.py'), artifacts, scenario], settings) });
    if (request.method === 'contribution' && duringContribution) await duringContribution();
    return result;
  };
  const command = async name => {
    const before = errors.length - expectedCount;
    const result = await vscode.commands.executeCommand(`mrw.${name}`);
    assert.equal(errors.length - expectedCount, before, `Unexpected command error: ${errors.at(-1)}`);
    return result;
  };
  const focus = async (document, selection) => {
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: false, viewColumn: vscode.ViewColumn.One });
    if (selection) editor.selection = selection;
    for (let i = 0; i < 40 && vscode.window.activeTextEditor?.document.uri.toString() !== document.uri.toString(); i++) await pause(100);
    assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), document.uri.toString(), 'Expected editor focus');
    await pause(150); // Active-editor notifications cross the renderer boundary.
    return editor;
  };
  const selection = (a, b, c, d) => new vscode.Selection(a, b, c, d);
  const active = () => vscode.window.activeTextEditor.document;
  const expectError = async (name, pattern) => {
    const before = errors.length; await vscode.commands.executeCommand(`mrw.${name}`);
    assert.equal(errors.length, before + 1); assert.match(errors.at(-1), pattern);
    expectedCount++;
  };
  const ask = async doc => {
    await focus(doc, selection(0, 0, 0, 3));
    inputs.push('Explain this selected α😀.', 'host-test-model');
    await command('ask');
    assert.equal(active().uri.scheme, 'mrw-record');
    assert.match(active().getText(), /Exact|exact/);
  };
  const notePath = path.join(root, 'note.md');
  try {
    await check('real WSL workspace host and activation without bridge work', async () => {
      assert.equal(process.platform, 'linux'); assert.equal(vscode.env.remoteName, 'wsl');
      assert.equal(vscode.workspace.isTrusted, true);
      assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath, root);
      await vscode.extensions.getExtension('flengyel.mrw').activate();
      assert.equal(requests.length, 0);
    });
    const note = await vscode.workspace.openTextDocument(vscode.Uri.file(notePath));
    {
      await check('mark, Lean source handoff beside note, and exact return', async () => {
        await focus(note, selection(0, 0, 0, 7));
        opens.push([vscode.Uri.file(path.join(root, 'example.lean'))]); inputs.push('2');
        await command('openProof');
        assert.equal(active().uri.fsPath, path.join(root, 'example.lean'));
        assert.equal(vscode.window.activeTextEditor.selection.start.line, 1);
        assert.ok(vscode.window.visibleTextEditors.some(e => e.document === note));
        await command('return');
        assert.equal(active().uri.fsPath, notePath);
        assert.ok(vscode.window.activeTextEditor.selection.isEqual(selection(0, 0, 0, 7)));
        assert.equal(errors.length, 0);
      });
      await check('unsaved CRLF Unicode selection, frozen preview, remove/add context and question edit', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'α😀\r\nPRIVATE UNSELECTED\r\n', language: 'plaintext' });
        await ask(doc);
        const initial = active(), frozen = initial.getText();
        assert.equal(requests.at(-1).draft.target.end, '1.2');
        assert.equal(requests.at(-1).draft.contexts[0].text, 'α😀');
        assert.ok(!frozen.includes('PRIVATE UNSELECTED'));
        const ed = await focus(doc);
        await ed.edit(edit => edit.insert(new vscode.Position(1, 0), 'later edits '));
        assert.equal(initial.getText(), frozen);
        picks.push(0); await command('removeContext');
        assert.equal(requests.at(-1).draft.contexts.length, 0);
        await focus(doc, selection(0, 0, 1, 1)); await command('addContext');
        assert.equal(requests.at(-1).draft.contexts[0].text, 'α😀\r\nl');
        inputs.push('Edited mathematical question'); await command('editQuestion');
        assert.match(active().getText(), /Edited mathematical question/);
        await focus(initial); await expectError('sendRequest', /current exact request preview/);
        await command('discardRequest');
        await expectError('sendRequest', /current exact request preview/);
        assert.ok(requests.every(r => r.method !== 'send_assistance'));
        // Discard test-only unsaved content without affecting an ordinary file.
        await focus(doc); await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
      });
      await check('completed deterministic Send, duplicate prevention and concurrent note edits', async () => {
        await ask(note);
        const pending = command('sendRequest');
        await expectError('sendRequest', /Wait for/);
        const ed = await focus(note, selection(1, 0, 1, 0));
        await ed.edit(edit => edit.insert(new vscode.Position(1, 0), 'CONCURRENT NOTE EDIT\n'));
        await pending;
        assert.match(note.getText(), /CONCURRENT NOTE EDIT/);
        assert.match(active().getText(), /Response|response/);
        assert.equal(active().languageId, 'plaintext');
        config.completed = requests.find(r => r.method === 'send_assistance').draft.output;
        assert.equal(requests.filter(r => r.method === 'send_assistance').length, 1);
        await focus(note); await vscode.commands.executeCommand('undo');
        assert.equal(note.getText(), await fs.readFile(notePath, 'utf8'));
      });
      await check('inert passage view, attributed insertion, real undo and immutable projection', async () => {
        inputs.push('2'); await command('passage');
        const passage = active(); config.oldReview = passage.uri.toString();
        assert.equal(passage.languageId, 'plaintext');
        assert.match(passage.getText(), /<script>inert<\/script>/);
        const visible = passage.getText();
        await vscode.commands.executeCommand('type', { text: 'bad' });
        assert.equal(passage.getText(), visible, 'Ordinary typing must not edit a virtual record view');
        const before = note.getText();
        await focus(note, selection(0, 0, 0, 7)); await command('insert');
        assert.match(note.getText(), /unverified editable copy/);
        assert.ok(note.getText().startsWith(before.slice(0, 7)));
        assert.equal(await fs.readFile(notePath, 'utf8'), before);
        await vscode.commands.executeCommand('undo'); assert.equal(note.getText(), before);
        const destination = path.join(artifacts, `projection-${Date.now()}.json`);
        saves.push(vscode.Uri.file(destination)); await command('retain');
        const raw = await fs.readFile(destination);
        assert.equal((await fs.stat(destination)).mode & 0o777, 0o600);
        assert.match(raw.toString(), /Second 😀/);
        saves.push(vscode.Uri.file(destination)); await expectError('retain', /exists/);
        assert.deepEqual(await fs.readFile(destination), raw);
        config.projection = destination;
      });
      await check('real language changes retain old response identity across tabs', async () => {
        const first = await vscode.workspace.openTextDocument(vscode.Uri.parse(config.oldReview));
        opens.push([vscode.Uri.file(path.join(repo, 'tests/fixtures/mechanical_model_call.json'))]);
        await command('review'); inputs.push('1'); await command('passage');
        const changed = await vscode.languages.setTextDocumentLanguage(first, 'markdown');
        await focus(changed); await focus(note); await command('insert');
        assert.equal(requests.at(-1).path, config.completed);
        assert.equal(requests.at(-1).number, 2);
        assert.match(note.getText(), /Second 😀/);
        await vscode.commands.executeCommand('undo');
      });
      await check('concurrent note changes cancel prepared insertion', async () => {
        await focus(note, selection(1, 0, 1, 0));
        const before = note.getText();
        duringContribution = async () => {
          const ed = vscode.window.activeTextEditor;
          await ed.edit(edit => edit.insert(new vscode.Position(1, 0), 'later work\n'));
        };
        await expectError('insert', /changed during preparation/); duringContribution = undefined;
        assert.equal(note.getText(), before.replace('\n', '\nlater work\n'));
        await vscode.commands.executeCommand('undo');
      });
      await check('all terminal outcomes retained and inspectable without retry', async () => {
        for (const status of ['failed', 'refused', 'incomplete']) {
          scenario = status; await ask(note); await command('sendRequest');
          assert.match(active().getText(), new RegExp(`assistance: ${status}`));
          const sent = requests.filter(r => r.method === 'send_assistance').at(-1);
          const raw = JSON.parse(await fs.readFile(sent.draft.output, 'utf8'));
          assert.equal(raw.status, status);
          picks.push(0); opens.push([vscode.Uri.file(sent.draft.output)]); await command('inspect');
          assert.match(active().getText(), new RegExp(status));
          await expectError('sendRequest', /current exact request preview/);
        }
        assert.equal(requests.filter(r => r.method === 'send_assistance').length, 4);
      });
      await check('known-unsent preflight preserves draft and requires a fresh preview', async () => {
        scenario = 'not_sent'; await ask(note);
        const draft = requests.at(-1).draft;
        await command('sendRequest'); assert.match(active().getText(), /not sent/);
        await expectError('sendRequest', /current exact request preview/);
        await command('previewRequest'); assert.deepEqual(requests.at(-1).draft, draft);
        await assert.rejects(fs.stat(draft.output), { code: 'ENOENT' });
        await command('discardRequest');
      });
      await check('dirty and changed saved source block return without moving the editor', async () => {
        const ed = await focus(note); await ed.edit(edit => edit.insert(new vscode.Position(1, 0), 'unsaved\n'));
        await expectError('return', /unsaved or changed/);
        await vscode.commands.executeCommand('undo');
        const before = await fs.readFile(notePath);
        await fs.writeFile(notePath, 'changed disk\n');
        try { await expectError('return', /changed or moved/); }
        finally { await fs.writeFile(notePath, before); }
      });
    }
    await check('ordinary project sources unchanged', async () => {
      assert.equal(await fs.readFile(notePath, 'utf8'), 'α😀 → β\nNext question.\n');
      assert.equal(await fs.readFile(path.join(root, 'example.lean'), 'utf8'), '-- Local source handoff only\nexample : True := True.intro\n');
    });
    report.requests = requests.map(r => ({ method: r.method, path: r.path, output: r.draft?.output }));
    report.expectedRejections = errors;
    assert.equal(errors.length, expectedCount);
    report.complete = true;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    await command('return');
    // Renderer remains available for a separate screenshot/visible inspection.
    await fs.writeFile(path.join(artifacts, 'ready'), config.phase);
    for (let i = 0; i < 240 && !(await fs.stat(path.join(artifacts, 'finish')).catch(() => null)); i++) await pause(250);
  } catch (error) {
    report.failure = error.stack; report.errors = errors;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    bridgeModule.runBridge = realBridge;
    for (const [key, [object, original]] of originals) object[key] = original;
  }
}
module.exports = { run };
