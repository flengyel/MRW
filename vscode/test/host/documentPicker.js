'use strict';
// Real VS Code Quick Pick and production controller; disposable files only.
const vscode = require('vscode'), fs = require('node:fs/promises'), path = require('node:path');
async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== config.project) throw Error('Wrong fixture workspace');
  const report = { vscode: vscode.version, remote: vscode.env.remoteName, checks: [], errors: [], complete: false };
  const save = () => fs.writeFile(path.join(config.artifacts, 'native-result.json'), JSON.stringify(report, null, 2));
  const nativePick = vscode.window.showQuickPick, nativeOpen = vscode.window.showOpenDialog, nativeError = vscode.window.showErrorMessage;
  let mode = 'heading', dirty;
  try {
    await vscode.workspace.getConfiguration('mrw').update('notesFolder', config.notes, vscode.ConfigurationTarget.Workspace);
    require('../../src/extension').activate(context);
    vscode.window.showErrorMessage = async message => { report.errors.push(message); await save(); };
    const yaml = vscode.Uri.file(path.join(config.notes, 'ID.md'));
    await vscode.commands.executeCommand('vscode.openWith', yaml, 'default', { preview: false });
    dirty = await vscode.workspace.openTextDocument(yaml);
    report.autoSave = vscode.workspace.getConfiguration('files', yaml).get('autoSave');
    if (report.autoSave !== 'off') throw Error('Fixture resource auto-save must be off');
    const edit = new vscode.WorkspaceEdit();
    edit.replace(yaml, new vscode.Range(2, 0, 2, 100), 'title: ID Unsaved YAML title');
    await vscode.workspace.applyEdit(edit);
    const before = dirty.getText(), disk = await fs.readFile(yaml.fsPath, 'utf8');
    const available = await vscode.commands.getCommands(true);
    if (!available.includes('workbench.action.quickOpenSelectNext') || !available.includes('workbench.action.acceptSelectedQuickOpenItem')) throw Error('Native Quick Pick selection command unavailable');
    vscode.window.showQuickPick = async (entries, options, token) => {
      const items = await entries;
      report.labels = items.map(x => x.label);
      if (!items.some(x => x.label === 'Unsaved YAML title · ID.md') || !items.some(x => x.label === 'H1 fallback · H1.md')) throw Error('Missing identity labels');
      const target = mode === 'heading' ? items.find(x => x.file?.endsWith('/H1.md')) : mode === 'yaml' ? items.find(x => x.file?.endsWith('/ID.md')) : items[0];
      // Control initial row order in the fixture; acceptance/cancellation uses the native UI.
      const ordered = [target, ...items.filter(item => item !== target)];
      const shown = nativePick.call(vscode.window, ordered, options, token);
      setTimeout(() => { void (async () => {
        if (mode === 'cancel') return vscode.commands.executeCommand('workbench.action.closeQuickOpen');
        await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
      })().catch(error => { report.errors.push(String(error)); void save(); }); }, 700);
      return shown;
    };
    const opened = () => context.workspaceState.get('mrw.documents.v1')?.last;
    await vscode.commands.executeCommand('mrw.openDocument');
    if (!opened()?.endsWith('/H1.md')) throw Error('Native selection did not open the H1 note');
    report.checks.push('native chooser displays titles and opens the selected H1 note in place'); await save();
    mode = 'yaml'; await vscode.commands.executeCommand('mrw.openDocument');
    report.dirtyCheck = { opened: opened(), sameText: dirty.getText() === before, isDirty: dirty.isDirty, savedUnchanged: await fs.readFile(yaml.fsPath, 'utf8') === disk };
    if (!opened()?.endsWith('/ID.md') || dirty.getText() !== before || !dirty.isDirty || await fs.readFile(yaml.fsPath, 'utf8') !== disk) throw Error('Dirty note was not preserved');
    report.checks.push('native YAML-title selection preserves the unsaved buffer and saved bytes'); await save();
    const prior = JSON.stringify(context.workspaceState.get('mrw.documents.v1'));
    mode = 'cancel'; await vscode.commands.executeCommand('mrw.openDocument');
    if (JSON.stringify(context.workspaceState.get('mrw.documents.v1')) !== prior) throw Error('Cancellation changed the destination');
    report.checks.push('native chooser cancellation preserves navigation'); await save();
    mode = 'browse'; vscode.window.showOpenDialog = async () => [vscode.Uri.file(path.join(config.project, 'other.txt'))];
    await vscode.commands.executeCommand('mrw.openDocument');
    if (!opened()?.endsWith('/other.txt')) throw Error('Browse did not keep general document opening');
    report.checks.push('Browse keeps the general file-opening route (file-dialog answer injected)');
    report.complete = report.errors.length === 0; await save();
  } catch (error) { report.failure = error.stack; await save(); }
  finally {
    vscode.window.showQuickPick = nativePick; vscode.window.showOpenDialog = nativeOpen; vscode.window.showErrorMessage = nativeError;
    if (dirty?.isDirty) await dirty.save(); // Only the known disposable fixture.
    await save();
    if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath === config.project) await vscode.commands.executeCommand('workbench.action.closeWindow');
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
