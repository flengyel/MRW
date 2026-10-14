'use strict';
// Test-only bootstrap in a normal WSL Development Host, preserving real state.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function activate(context) {
  const configPath = path.join(context.extensionPath, 'host-test.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const report = { phase: config.phase, outcome: config.outcome, version: vscode.version, remoteName: vscode.env.remoteName,
    platform: process.platform, checks: [] };
  const reportPath = path.join(config.artifacts, `r3-${config.phase}${config.outcome ? `-${config.outcome}` : ''}.json`);
  const check = async (name, action) => {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.stack }); throw error; }
    finally { await fs.writeFile(reportPath, JSON.stringify(report, null, 2)); }
  };
  const inputs = [], opens = [], endings = [], errors = [], requests = [];
  let scenario = 'completed', failedEnd = false, heldResume;
  const originals = { showInputBox: vscode.window.showInputBox, showOpenDialog: vscode.window.showOpenDialog,
    showWarningMessage: vscode.window.showWarningMessage, showErrorMessage: vscode.window.showErrorMessage,
    showInformationMessage: vscode.window.showInformationMessage };
  vscode.window.showInputBox = async () => { assert.ok(inputs.length, 'Unscripted input'); return inputs.shift(); };
  vscode.window.showOpenDialog = async () => { assert.ok(opens.length, 'Unscripted open'); return opens.shift(); };
  vscode.window.showWarningMessage = async () => { assert.ok(endings.length, 'Unscripted ending'); return endings.shift(); };
  vscode.window.showErrorMessage = async message => { errors.push(message); };
  vscode.window.showInformationMessage = async () => {};
  const realBridge = bridge.runBridge;
  bridge.runBridge = async (extension, executable, request, options = {}) => {
    requests.push(request);
    if (failedEnd && request.method === 'end_investigation') return { blocked: true, write_error: 'Injected host publication failure' };
    if (request.method === 'resume_investigation' && heldResume) await heldResume;
    return realBridge(extension, executable, request, { ...options,
      spawn: (exe, args, settings) => spawn(exe, ['-I', path.join(__dirname, 'deterministic_bridge.py'), config.artifacts, scenario], settings) });
  };
  const command = async name => {
    const result = await vscode.commands.executeCommand(`mrw.${name}`);
    await pause(150); // Renderer focus notifications follow command completion.
    return result;
  };
  const active = () => vscode.window.activeTextEditor.document;
  const focus = async (doc, selected) => {
    const record = doc.uri.scheme === 'mrw-record';
    const focusGroup = record ? 'workbench.action.focusSecondEditorGroup' : 'workbench.action.focusFirstEditorGroup';
    await vscode.commands.executeCommand(focusGroup);
    const editor = await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: false,
      viewColumn: record ? vscode.ViewColumn.Two : vscode.ViewColumn.One });
    await vscode.commands.executeCommand(focusGroup);
    if (selected) editor.selection = selected;
    for (let i = 0; i < 300 && vscode.window.activeTextEditor?.document.uri.toString() !== doc.uri.toString(); i++) {
      if (i % 5 === 0) await vscode.commands.executeCommand(focusGroup);
      await pause(100);
    }
    assert.equal(active().uri.toString(), doc.uri.toString());
    return editor;
  };
  const expectedError = async (name, pattern) => {
    const before = errors.length; await command(name);
    assert.equal(errors.length, before + 1); assert.match(errors.pop(), pattern);
  };
  const state = async () => JSON.parse(await fs.readFile(config.pointer, 'utf8'));
  let note, sourceText;
  async function makePair(status = 'completed') {
    scenario = 'completed';
    let work = note;
    if (config.phase === 'sequential') {
      // Independent tasks use independent ordinary saved work documents. This
      // also avoids cached-editor focus notifications deferred by Windows when
      // a development window is in the background.
      const file = path.join(config.project, `work-${status}-${require('node:crypto').randomUUID()}.md`);
      await fs.writeFile(file, sourceText);
      work = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    }
    await focus(work, new vscode.Selection(0, 0, 0, 3));
    inputs.push('Initial local question α😀', 'host-test-model'); await command('ask'); await command('sendRequest');
    const parentDraft = requests.filter(r => r.method === 'send_assistance').at(-1).draft;
    const parent = JSON.parse(await fs.readFile(parentDraft.output));
    inputs.push('2', 'Does the corrected route hold?', 'Human correction α😀', 'host-test-model');
    await command('continueAnswer');
    const prepared = requests.filter(r => r.method === 'prepare_assistance').at(-1).draft;
    const oldPreview = active();
    inputs.push('Unresolved ε estimate'); await command('editIssue');
    await focus(oldPreview); await expectedError('sendRequest', /current exact request preview/);
    await command('previewRequest');
    scenario = status;
    await command('sendRequest');
    assert.deepEqual(errors, []);
    const child = JSON.parse(await fs.readFile(prepared.output));
    assert.equal(child.in_reply_to, parent.id); assert.equal(child.status, status);
    const input = JSON.stringify(child.effective_input);
    assert.ok(input.includes('Second 😀')); assert.ok(!input.includes('First α'));
    assert.ok(input.includes('Human correction α😀')); assert.ok(!input.includes('previous_response_id'));
    config.pointer = path.join(prepared.store, 'active.json');
    config.parent = parentDraft.output; config.child = prepared.output;
    config.parentDigest = digest(await fs.readFile(config.parent)); config.childDigest = digest(await fs.readFile(config.child));
    await command('resumeInvestigation');
    assert.match(active().getText(), new RegExp(`Child terminal status: ${status}`));
    return prepared;
  }
  try {
    require('../../src/extension').activate(context);
    await check('normal WSL activation is inert', async () => {
      assert.equal(vscode.env.remoteName, 'wsl'); assert.equal(process.platform, 'linux'); assert.equal(requests.length, 0);
    });
    note = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(config.project, 'note.md')));
    sourceText = await fs.readFile(note.uri.fsPath, 'utf8');
    if (config.phase === 'seed') {
      await check('R2 parent and one explicitly previewed R3 child with exact selected evidence', async () => { await makePair(); });
      await check('one active slot blocks a branch and human summary is saved separately', async () => {
        await expectedError('continueAnswer', /active investigation/);
        inputs.push('Saved conclusion before restart'); await command('editConclusion');
        await command('saveInvestigationSummary');
        assert.equal((await state()).active.summary.last_conclusion, 'Saved conclusion before restart');
      });
      await check('ending publication failure preserves latest human text, note insertion and records', async () => {
        inputs.push('Latest unsaved issue before failed ending'); await command('editIssue');
        await focus(note, new vscode.Selection(0, 0, 0, 3));
        failedEnd = true; endings.push('Insert handoff and end');
        await expectedError('endInvestigation', /publication failed/);
        assert.match(note.getText(), /Latest unsaved issue before failed ending/);
        assert.notEqual((await state()).active, null);
        await expectedError('endInvestigation', /blocked/);
        await vscode.commands.executeCommand('undo');
        assert.equal(note.getText(), sourceText);
      });
    } else if (config.phase === 'resume_end') {
      await check('restart restores exact records and saved human text without transport', async () => {
        await command('resumeInvestigation');
        assert.match(active().getText(), /Saved conclusion before restart/);
        assert.match(active().getText(), /Unresolved ε estimate/);
        assert.ok(!active().getText().includes('Latest unsaved issue before failed ending'));
        assert.equal(requests.filter(r => r.method === 'send_assistance').length, 0);
        assert.equal(digest(await fs.readFile(config.parent)), config.parentDigest);
        assert.equal(digest(await fs.readFile(config.child)), config.childDigest);
      });
      await check('delayed restore blocks End; changed child preserves task text and exact pin', async () => {
        let release;
        heldResume = new Promise(resolve => { release = resolve; });
        const pending = command('resumeInvestigation');
        for (let i = 0; i < 40 && !requests.some(r => r.method === 'resume_investigation'); i++) await pause(50);
        await expectedError('endInvestigation', /Wait for/);
        release(); await pending; heldResume = undefined;
        const raw = await fs.readFile(config.child);
        await fs.appendFile(config.child, ' ');
        try {
          await command('resumeInvestigation');
          assert.match(active().getText(), /Child record missing or changed/);
          assert.match(active().getText(), /Saved conclusion before restart/);
          assert.equal((await state()).active.child.record_revision, config.childDigest);
        } finally { await fs.writeFile(config.child, raw); }
        await command('resumeInvestigation');
      });
      await check('Cancel preserves state; successful ending inserts latest unsaved summary with real undo', async () => {
        const before = await fs.readFile(config.pointer);
        endings.push('Cancel'); await command('endInvestigation'); assert.deepEqual(await fs.readFile(config.pointer), before);
        inputs.push('Latest visible issue at successful ending'); await command('editIssue');
        await focus(note, new vscode.Selection(0, 0, 0, 3));
        endings.push('Insert handoff and end'); await command('endInvestigation');
        assert.match(note.getText(), /Latest visible issue at successful ending/);
        assert.equal(note.getText().split('[Investigation handoff').length, 2);
        assert.equal((await state()).active, null);
        assert.equal(await fs.readFile(note.uri.fsPath, 'utf8'), sourceText);
        await vscode.commands.executeCommand('undo'); assert.equal(note.getText(), sourceText);
        assert.equal(digest(await fs.readFile(config.child)), config.childDigest);
      });
    } else if (config.phase === 'sequential') {
      await vscode.commands.executeCommand('workbench.action.joinAllGroups');
      await focus(note);
      await check('released slot survives restart and permits fresh independent investigations', async () => {
        await expectedError('resumeInvestigation', /No active investigation/);
      });
      for (const status of config.outcome ? [config.outcome] : ['failed', 'refused', 'incomplete']) {
        await check(`sequential ${status} child is retained, resumed and explicitly ended without insertion`, async () => {
          await makePair(status);
          endings.push('End without insertion'); await command('endInvestigation');
          assert.equal((await state()).active, null); assert.equal(note.getText(), sourceText);
          assert.equal(digest(await fs.readFile(config.child)), config.childDigest);
        });
      }
      await check('comparison stays in one research group during repeated preparation and review', async () => {
        assert.ok(new Set(vscode.window.visibleTextEditors.map(e => e.viewColumn)).size <= 2);
      });
      await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
      await vscode.commands.executeCommand('notifications.hideToasts');
      await vscode.commands.executeCommand('mrw.research.focus');
    } else throw new Error('Unknown R3 host phase');
    await check('ordinary source intact and no unexpected command errors', async () => {
      assert.equal(note.getText(), sourceText); assert.equal(await fs.readFile(note.uri.fsPath, 'utf8'), sourceText);
      assert.deepEqual(errors, []);
    });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    report.complete = true;
    report.sendActions = requests.filter(r => r.method === 'send_assistance').length;
    report.sourceDigest = digest(sourceText);
    report.visibleEditors = vscode.window.visibleTextEditors.map(e => ({ uri: e.document.uri.toString(), column: e.viewColumn }));
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('notifications.hideToasts');
    await fs.writeFile(path.join(config.artifacts, 'r3-ready'), config.phase);
  } catch (error) {
    report.failure = error.stack; report.errors = errors;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  } finally { Object.assign(vscode.window, originals); }
}
// Keep the workbench interactive while the test driver waits for screenshots.
// Production activation still registers the unchanged commands and providers.
module.exports = { activate: context => { void activate(context).catch(error => console.error(error)); } };
