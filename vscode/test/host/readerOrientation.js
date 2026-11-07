'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');

function probe() {
  const api = acquireVsCodeApi();
  window.acquireVsCodeApi = () => api;
  window.addEventListener('message', event => {
    if (event.data.type !== 'orientation_probe') return;
    const control = document.querySelector('[data-action="ask-ai"]');
    control.focus();
    const help = document.querySelector('.control-help');
    api.postMessage({ type: 'orientation_probe_reply', value: {
      location: document.querySelector('.source-location')?.textContent,
      returnLabel: document.querySelector('[data-action="reading-return"]')?.textContent,
      toolsClosed: !document.querySelector('.reader-tools')?.open,
      focusedHelp: help?.textContent, helpVisible: !!help && !help.hidden,
      focusDescription: control.getAttribute('aria-description'),
      bodyWidth: document.documentElement.clientWidth
    } });
  });
}

async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  const report = { scope: 'native Extension Development Host; injected file-picker answers and offline acquisition',
    version: vscode.version, remote: vscode.env.remoteName, checks: [], errors: [],
    sidebarObservation: 'record separately from native window screenshots', complete: false };
  const save = () => fs.writeFile(path.join(config.artifacts, 'native.json'), JSON.stringify(report, null, 2));
  const native = { bridge: bridge.runBridge, tree: vscode.window.createTreeView,
    panel: vscode.window.createWebviewPanel, open: vscode.window.showOpenDialog,
    input: vscode.window.showInputBox, warning: vscode.window.showWarningMessage,
    error: vscode.window.showErrorMessage, execute: vscode.commands.executeCommand };
  let tree, provider, readerPanel, inspectReply, chosen, returnSelection;
  const layoutCommands = [];
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function check(name, action) { await action(); report.checks.push(name); await save(); }
  try {
    assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath, config.project);
    vscode.window.showErrorMessage = async message => { report.errors.push(message); await save(); };
    vscode.window.showOpenDialog = async () => chosen;
    vscode.window.showInputBox = async () => '08ZD';
    vscode.window.showWarningMessage = async () => 'Import section';
    bridge.runBridge = async (extension, executable, request, options) => {
      const snapshot = () => {
        const editor = vscode.window.activeTextEditor;
        return editor && { uri: editor.document.uri.toString(), version: editor.document.version,
          start: editor.document.offsetAt(editor.selection.start), end: editor.document.offsetAt(editor.selection.end) };
      };
      const before = snapshot();
      const result = await native.bridge(extension, executable, request,
        { ...options, spawn: (command, args, settings) => spawn(command,
          [args[0], path.join(extension, 'test/stacks_bridge.py')], settings) });
      if (request.method === 'outline_follow_reference') { report.followSnapshots = { before, after: snapshot() }; await save(); }
      return result;
    };
    vscode.window.createTreeView = (id, options) => {
      const value = native.tree(id, options);
      if (id === 'mrw.readingOutline') { tree = value; provider = options.treeDataProvider; }
      return value;
    };
    vscode.window.createWebviewPanel = (...args) => {
      const panel = native.panel(...args);
      if (args[0] !== 'mrw.sourceOutline') return panel;
      readerPanel = panel;
      const receive = panel.webview.onDidReceiveMessage.bind(panel.webview);
      panel.webview.onDidReceiveMessage = (callback, receiver, disposables) => receive(value => {
        if (value.type === 'orientation_probe_reply') { inspectReply?.(value.value); return; }
        return callback.call(receiver, value);
      }, undefined, disposables);
      let prototype = Object.getPrototypeOf(panel.webview), descriptor;
      while (prototype && !(descriptor = Object.getOwnPropertyDescriptor(prototype, 'html'))) prototype = Object.getPrototypeOf(prototype);
      Object.defineProperty(panel.webview, 'html', { configurable: true, set(value) {
        const nonce = /script nonce="([^"]+)"/.exec(value)[1];
        descriptor.set.call(panel.webview, value.replace('<script nonce=', `<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`));
      } });
      return panel;
    };
    vscode.commands.executeCommand = async (name, ...args) => {
      if (/maximize|minimize|Sidebar|sideBar/.test(name)) layoutCommands.push(name);
      if ((name.startsWith('markdown.') || name === 'vscode.openWith' && args[1] === 'vscode.markdown.preview.editor') && vscode.window.activeTextEditor) {
        const editor = vscode.window.activeTextEditor;
        returnSelection = { uri: editor.document.uri.toString(), text: editor.document.getText(editor.selection),
          start: editor.document.offsetAt(editor.selection.start) };
      }
      if (name.startsWith('markdown.') || name === 'vscode.openWith') {
        report.previewCommands = [...(report.previewCommands || []), { name, resource: args[0]?.toString(), viewType: args[1], options: args[2] }];
      }
      return native.execute(name, ...args);
    };
    require('../../src/extension').activate(context);
    const command = async (name, ...args) => {
      const result = await vscode.commands.executeCommand(`mrw.${name}`, ...args);
      assert.deepEqual(report.errors, []); return result;
    };
    const imported = await command('importStacksSection');
    const reference = await native.bridge(context.extensionPath, 'python3', { method: 'outline_reference',
      store: path.join(context.storageUri.fsPath, `outlines-${digest(config.project)}`), project_root: config.project,
      id: imported.outline.id, revision: imported.revision, region: null });
    const retained = reference.markdown;
    const file = path.join(config.project, 'orientation.md');
    const text = `# Orientation fixture\n\n${retained}\n\n## Same citation again\n\n${retained}\n`;
    await fs.writeFile(file, text);
    const document = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Two, preview: false });
    const draft = await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'Untitled draft to preserve' });
    await vscode.window.showTextDocument(draft, { viewColumn: 3, preview: false });
    const unrelatedFile = path.join(config.project, 'unrelated.txt');
    await fs.writeFile(unrelatedFile, 'Unrelated editor');
    const unrelated = await vscode.workspace.openTextDocument(unrelatedFile);
    const unrelatedEditor = await vscode.window.showTextDocument(unrelated, { viewColumn: vscode.ViewColumn.One, preview: false });
    await unrelatedEditor.edit(edit => edit.insert(new vscode.Position(0, 0), 'Unsaved '));
    await vscode.commands.executeCommand('workbench.view.extension.mrw');
    await vscode.commands.executeCommand('workbench.action.focusAuxiliaryBar');
    await vscode.window.showTextDocument(unrelated, { viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    await pause(600);
    assert.equal(vscode.window.activeTextEditor?.document, unrelated);
    assert.ok(vscode.window.visibleTextEditors.some(editor => editor.document === unrelated && editor.viewColumn === vscode.ViewColumn.One));
    report.beforeVisible = vscode.window.visibleTextEditors.map(editor => ({ uri: editor.document.uri.toString(), column: editor.viewColumn }));
    const layout = await vscode.commands.executeCommand('vscode.getEditorLayout');
    chosen = [document.uri];
    const model = await command('chooseReadingOverview'); await pause(400);
    await check('chosen Markdown is visible with matching Contents filename and path', async () => {
      assert.ok(vscode.window.visibleTextEditors.some(editor => editor.document === document));
      assert.ok(tree.description.includes('orientation.md')); assert.ok(tree.message.includes(file));
      assert.equal(provider.getChildren()[0].label, 'Orientation fixture');
    });
    const shown = vscode.window.visibleTextEditors.map(editor => editor.document.uri.toString());
    chosen = undefined; await command('chooseReadingOverview');
    await pause(400);
    assert.deepEqual(vscode.window.visibleTextEditors.map(editor => editor.document.uri.toString()), shown);
    const citation = model.all.filter(node => node.kind === 'reference').at(-1);
    await command('selectReadingOutlineItem', citation); await pause(600);
    const view = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Native webview probe timed out')), 10000);
      inspectReply = value => { clearTimeout(timer); resolve(value); };
      void readerPanel.webview.postMessage({ type: 'orientation_probe' });
    });
    report.reader = view;
    await check('native reader identifies Hausdorff source and exposes focus help', async () => {
      assert.match(view.location, /The Stacks Project.*Topology.*Section 3.*stacks-project:08ZD/);
      assert.match(view.returnLabel, /Return to orientation.md/);
      assert.ok(view.toolsClosed); assert.ok(view.helpVisible); assert.match(view.focusedHelp, /Send is a separate action/);
    });
    await command('returnToReadingOutline');
    await pause(400);
    report.afterVisible = vscode.window.visibleTextEditors.map(editor => ({ uri: editor.document.uri.toString(), column: editor.viewColumn }));
    report.returnSelection = returnSelection;
    await check('Return restores the same repeated citation and preserves groups and dirty documents', async () => {
      assert.equal(returnSelection.uri, document.uri.toString()); assert.equal(returnSelection.text, retained);
      assert.equal(returnSelection.start, citation.start);
      assert.deepEqual(await vscode.commands.executeCommand('vscode.getEditorLayout'), layout);
      assert.equal(unrelated.getText(), 'Unsaved Unrelated editor'); assert.ok(unrelated.isDirty);
      assert.ok(vscode.window.visibleTextEditors.some(editor => editor.document === unrelated && editor.viewColumn === vscode.ViewColumn.One));
      assert.equal(draft.getText(), 'Untitled draft to preserve'); assert.ok(draft.isDirty);
      assert.equal(await fs.readFile(file, 'utf8'), text); assert.deepEqual(layoutCommands, []);
    });
    report.complete = true; await save();
  } catch (error) { report.failure = error.stack; await save(); }
  finally {
    bridge.runBridge = native.bridge;
    for (const [key, value] of Object.entries({ createTreeView: native.tree, createWebviewPanel: native.panel,
      showOpenDialog: native.open, showInputBox: native.input, showWarningMessage: native.warning,
      showErrorMessage: native.error })) vscode.window[key] = value;
    vscode.commands.executeCommand = native.execute;
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
