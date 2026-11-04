'use strict';
// Disposable normal Development Host lifecycle. Production commands and real
// workspace/global storage are used; choices are scripted, with no provider.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');

async function activate(context) {
  const configPath = path.join(context.extensionPath, 'host-test.json');
  const cfg = JSON.parse(await fs.readFile(configPath, 'utf8'));
  if (cfg.phase === 'complete') return require('../../src/extension').activate(context);
  const reportPath = path.join(cfg.artifacts, 'host-folder-rename.json');
  const report = cfg.phase === 'reconnect' ? JSON.parse(await fs.readFile(reportPath, 'utf8'))
    : { vscode: vscode.version, remote: vscode.env.remoteName, checks: [], requests: [], errors: [] };
  const save = () => fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  const originals = { pick: vscode.window.showQuickPick, warning: vscode.window.showWarningMessage,
    info: vscode.window.showInformationMessage, error: vscode.window.showErrorMessage,
    panel: vscode.window.createWebviewPanel, bridge: bridge.runBridge };
  const panels = [];
  let model;
  vscode.window.showQuickPick = async rows => rows.find(row => row.region) || rows[0];
  vscode.window.showWarningMessage = async (_text, _options, ...choices) => choices[0];
  vscode.window.showInformationMessage = async () => {};
  vscode.window.showErrorMessage = async text => { report.errors.push(text); await save(); };
  vscode.window.createWebviewPanel = (...args) => {
    const panel = originals.panel(...args), post = panel.webview.postMessage.bind(panel.webview);
    panel.webview.postMessage = value => { if (value.type === 'outline') model = value.model; return post(value); };
    panels.push(panel); return panel;
  };
  bridge.runBridge = (...args) => {
    assert.match(args[2].method, /^(artifact_|outline_)/); report.requests.push(args[2].method);
    return originals.bridge(...args);
  };
  let reopen;
  try {
    assert.equal(vscode.env.remoteName, 'wsl');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.equal(root, cfg.project);
    assert.equal(path.dirname(root), cfg.artifacts, 'Only the disposable fixture directory may be renamed');
    assert.ok(context.globalStorageUri.fsPath.includes('profiles'), 'Use the isolated validation profile');
    require('../../src/extension').activate(context);
    if (cfg.phase === 'prepare') {
      const text = 'α😀 retained\nproof α\n', source = path.join(root, 'source.txt');
      await fs.writeFile(source, text, { flag: 'wx' });
      const doc = await vscode.workspace.openTextDocument(source);
      const editor = await vscode.window.showTextDocument(doc, { preview: false });
      editor.selection = new vscode.Selection(0, 1, 1, 5);
      const created = await vscode.commands.executeCommand('mrw.createOutline');
      assert.ok(created?.outline.id); cfg.outline = created.outline.id;
      const overview = await vscode.workspace.openTextDocument(path.join(root, 'overview.md'));
      await vscode.window.showTextDocument(overview, { preview: false });
      await vscode.commands.executeCommand('mrw.insertOutlineReference');
      assert.match(overview.getText(), /mrw-outline:v1/); await overview.save(); cfg.overview = overview.getText();
      for (const panel of panels) panel.dispose();
      const result = await vscode.commands.executeCommand('mrw.prepareFolderRename');
      assert.ok(result?.committed); assert.equal(result.cleanup_pending, false); assert.deepEqual(report.errors, []);
      cfg.store = result.store_id; cfg.location = result.location;
      report.checks.push('real commands prepared a verified store and persisted the reconnect shortcut');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      const renamed = path.join(cfg.artifacts, 'renamed-study');
      await fs.rename(root, renamed);
      report.checks.push('ordinary fixture directory actually renamed; source and overview preserved');
      cfg.project = renamed; cfg.phase = 'reconnect';
      await fs.writeFile(configPath, JSON.stringify(cfg, null, 2)); await save(); reopen = renamed;
    } else {
      assert.equal(cfg.phase, 'reconnect');
      const result = await vscode.commands.executeCommand('mrw.reconnectRenamedFolder');
      assert.equal(result?.store_id, cfg.store); assert.deepEqual(report.errors, []);
      report.checks.push('reopened workspace recovered the real persisted global-state shortcut and reconnected the same identity');
      const overview = await vscode.workspace.openTextDocument(path.join(root, 'overview.md'));
      assert.equal(overview.getText(), cfg.overview);
      const editor = await vscode.window.showTextDocument(overview, { preview: false });
      const point = overview.positionAt(overview.getText().indexOf('mrw-outline:v1') + 5);
      editor.selection = new vscode.Selection(point, point);
      await vscode.commands.executeCommand('mrw.followOutlineReference');
      assert.deepEqual(report.errors, []); assert.equal(model?.outline.id, cfg.outline);
      const retained = vscode.window.activeTextEditor;
      assert.equal(retained.document.getText(retained.selection), '😀 retained\nproof');
      assert.equal(await fs.readFile(path.join(root, 'source.txt'), 'utf8'), 'α😀 retained\nproof α\n');
      report.checks.push('unchanged ordinary Markdown reference reopened the exact retained Unicode passage after the rename');
      report.complete = true; cfg.phase = 'complete';
      await fs.writeFile(configPath, JSON.stringify(cfg, null, 2));
      // A later reload activates production normally and never reseeds work.
      const manifestPath = path.join(context.extensionPath, 'package.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      manifest.main = './src/extension.js'; delete manifest.activationEvents;
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2)); await save();
    }
  } catch (error) { report.failure = error.stack; await save(); }
  finally {
    vscode.window.showQuickPick = originals.pick; vscode.window.showWarningMessage = originals.warning;
    vscode.window.showInformationMessage = originals.info; vscode.window.showErrorMessage = originals.error;
    vscode.window.createWebviewPanel = originals.panel; bridge.runBridge = originals.bridge;
  }
  if (reopen) await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(reopen), { forceReuseWindow: true });
}
module.exports = { activate };
