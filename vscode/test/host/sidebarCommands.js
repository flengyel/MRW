'use strict';
// Native sidebar fixture. Never run against a working study workspace.
const vscode = require('vscode'), fs = require('node:fs/promises'), path = require('node:path');
async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== config.project) throw Error('Wrong fixture workspace');
  const report = { vscode: vscode.version, remote: vscode.env.remoteName, checks: [], errors: [], complete: false };
  const save = () => fs.writeFile(path.join(config.artifacts, 'native-result.json'), JSON.stringify(report, null, 2));
  const nativeDialog = vscode.window.showOpenDialog, nativeError = vscode.window.showErrorMessage;
  let draft;
  async function stage(name) {
    report.stage = name; await save();
    const until = Date.now() + 120000;
    for (;;) {
      try { await fs.stat(path.join(config.artifacts, 'continue-' + name)); return; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (Date.now() > until) throw Error('Timed out awaiting native observation: ' + name);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  try {
    require('../../src/extension').activate(context);
    vscode.window.showErrorMessage = async message => { report.errors.push(message); await save(); };
    await vscode.commands.executeCommand('workbench.view.extension.mrw');
    await vscode.commands.executeCommand('mrw.commands.focus');
    await stage('empty');
    const first = vscode.Uri.file(path.join(config.project, 'first.md'));
    const second = vscode.Uri.file(path.join(config.project, 'second.md'));
    vscode.window.showOpenDialog = async () => [first];
    await vscode.commands.executeCommand('mrw.openDocument');
    await vscode.commands.executeCommand('vscode.openWith', first, 'default', { preview: false });
    draft = await vscode.workspace.openTextDocument(first);
    if (vscode.workspace.getConfiguration('files', first).get('autoSave') !== 'off') throw Error('Fixture auto-save must be off');
    const edit = new vscode.WorkspaceEdit(); edit.insert(first, new vscode.Position(2, 0), 'Unsaved fixture draft\n');
    await vscode.workspace.applyEdit(edit);
    const before = draft.getText(), disk = await fs.readFile(first.fsPath, 'utf8');
    vscode.window.showOpenDialog = async () => [second];
    await vscode.commands.executeCommand('mrw.openDocument');
    if (!context.workspaceState.get('mrw.documents.v1')?.last?.endsWith('/second.md')) throw Error('Second document did not open');
    await vscode.commands.executeCommand('mrw.commands.focus');
    report.checks.push('two production Open Document actions completed');
    await stage('documents');
    await vscode.commands.executeCommand('mrw.openStudyExample');
    if (context.workspaceState.get('mrw.lightStudy.recent.v1')?.length !== 1) throw Error('Disposable saved study missing');
    await vscode.commands.executeCommand('mrw.resumeStudy');
    await vscode.commands.executeCommand('mrw.commands.focus');
    if ((await vscode.commands.getCommands(true)).includes('mrw.research.focus')) throw Error('Studies sidebar remains registered');
    report.checks.push('saved example resumes without a Studies sidebar');
    if (draft.getText() !== before || !draft.isDirty || await fs.readFile(first.fsPath, 'utf8') !== disk) throw Error('Dirty fixture changed');
    report.checks.push('dirty buffer and saved Markdown bytes preserved');
    await stage('study');
    report.complete = report.errors.length === 0; await save();
  } catch (error) { report.failure = error.stack; await save(); }
  finally {
    vscode.window.showOpenDialog = nativeDialog; vscode.window.showErrorMessage = nativeError;
    if (draft?.isDirty) await draft.save(); // Only this known disposable document.
    await save();
    if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath === config.project) await vscode.commands.executeCommand('workbench.action.closeWindow');
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
