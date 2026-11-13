'use strict';
// Run only in a disposable Extension Development Host workspace. This test
// observes native activation; it does not replace the host API with a double.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
async function run() {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(root && path.basename(root) === 'mrw-activation-fixture', 'Use the isolated activation fixture');
  const report = {version: vscode.version, remoteName: vscode.env.remoteName, checks: []};
  try {
    const extension = vscode.extensions.getExtension('flengyel.mrw');
    assert.ok(extension);
    await extension.activate();
    assert.ok(extension.isActive);
    report.packageVersion = extension.packageJSON.version;
    report.extensionPath = extension.extensionPath;
    const commands = new Set(await vscode.commands.getCommands(true));
    const expected = extension.packageJSON.contributes.commands.map(c => c.command);
    assert.deepEqual(expected.filter(id => !commands.has(id)), []);
    report.checks.push({name: 'native activation registers every contributed command', count: expected.length, passed: true});
    const note = await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root, 'reading.md')));
    await vscode.window.showTextDocument(note);
    await vscode.commands.executeCommand('mrw.openReadingOutline', note.uri);
    report.checks.push({name: 'Show Contents completes in the native host', passed: true});
    // Dismiss only this disposable window's lesson picker. No lesson is copied
    // and no Lean process is started. Opening then cancellation must settle.
    const timer = setInterval(() => { void vscode.commands.executeCommand('workbench.action.closeQuickOpen'); }, 1000);
    const timeout = new Promise((_, reject) => { report.timeout = setTimeout(() => reject(Error('Lean chooser did not settle')), 15000); });
    try { await Promise.race([vscode.commands.executeCommand('mrw.studyLean4'), timeout]); }
    finally { clearInterval(timer); clearTimeout(report.timeout); delete report.timeout; }
    report.checks.push({name: 'Study Lean command settles after chooser cancellation', passed: true});
  } catch (error) { report.error = error.stack; throw error; }
  finally { await fs.writeFile(path.join(root, 'activation-report.json'), JSON.stringify(report, null, 2)); }
}
module.exports = {run};
