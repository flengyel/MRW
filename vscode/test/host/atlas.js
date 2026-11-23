'use strict';

// This entry is launched only with an owned fixture made by prepare-native-host.py.
const vscode = require('vscode');
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { assertFixture, clearOwnedState, protect } = require('./fixtureGuard');

function webviewProbe() {
  const api = acquireVsCodeApi();
  window.acquireVsCodeApi = () => api;
  window.addEventListener('message', event => {
    if (event.data?.type !== 'fixtureAtlasClick') return;
    const control = document.querySelector(event.data.selector);
    control?.focus();
    api.postMessage({ type: 'fixtureAtlasFocus', focused: document.activeElement === control, found: !!control });
    control?.click();
  });
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function activate(context) {
  const scope = await assertFixture(vscode, context, context.extensionPath);
  const root = scope.marker.root, project = scope.config.project;
  const stateFile = path.join(root, 'atlas-restart.json'), resultFile = path.join(root, 'native-result.json');
  const sourceFile = path.join(project, 'topology.tex'), atlasFile = path.join(project, 'closed-fiber.mrw-atlas.json');
  const state = await fs.readFile(stateFile, 'utf8').then(JSON.parse, error => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  const report = { host: vscode.version, remote: vscode.env.remoteName, profile: scope.marker.profile,
    checks: state?.checks || [], errors: [], phase: state ? 'reopen' : 'generate', complete: false };
  const saveReport = () => fs.writeFile(resultFile, JSON.stringify(report, null, 2) + '\n');
  const original = { panel: vscode.window.createWebviewPanel, save: vscode.window.showSaveDialog,
    error: vscode.window.showErrorMessage };
  const panels = [];
  let reloading = false;
  async function wait(predicate, label, timeout = 15000) {
    const until = Date.now() + timeout;
    while (!predicate()) {
      if (Date.now() >= until) throw new Error('Timed out waiting for ' + label);
      await pause(70);
    }
  }
  async function click(record, selector) {
    record.focus = undefined;
    await record.panel.webview.postMessage({ type: 'fixtureAtlasClick', selector });
    await wait(() => record.focus, selector);
    assert.deepEqual(record.focus, { type: 'fixtureAtlasFocus', focused: true, found: true });
  }
  async function focusDocument(doc) {
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    await wait(() => vscode.window.activeTextEditor?.document === doc, doc.uri.path);
    return editor;
  }
  try {
    vscode.window.showErrorMessage = async value => { report.errors.push(value); await saveReport(); };
    vscode.window.showSaveDialog = async () => vscode.Uri.file(atlasFile);
    vscode.window.createWebviewPanel = (...args) => {
      const panel = original.panel(...args);
      if (args[0] !== 'mrw.atlas') return panel;
      const record = { panel };
      panels.push(record);
      const listen = panel.webview.onDidReceiveMessage.bind(panel.webview);
      panel.webview.onDidReceiveMessage = (handler, receiver, disposables) => {
        record.receive = handler;
        return listen(value => {
          if (value.type === 'fixtureAtlasFocus') record.focus = value;
          else return handler.call(receiver, value);
        }, undefined, disposables);
      };
      let owner = panel.webview, html;
      while (owner && !(html = Object.getOwnPropertyDescriptor(owner, 'html'))) owner = Object.getPrototypeOf(owner);
      Object.defineProperty(panel.webview, 'html', {
        configurable: true,
        get: () => html.get.call(panel.webview),
        set(value) {
          const nonce = /<script nonce="([^"]+)"/.exec(value)[1];
          html.set.call(panel.webview,
            value.replace('<script nonce=', '<script nonce="' + nonce + '">(' + webviewProbe.toString() + ')()</script><script nonce='));
        },
      });
      return panel;
    };
    await saveReport();
    require('../../src/extension').activate(context);
    if (!state) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourceFile));
      const originalText = document.getText();
      const editor = await focusDocument(document);
      const mark = 'Reader fixture α😀';
      const label = originalText.indexOf('\\label{lemma-fibre-product-closed}');
      const statement = originalText.lastIndexOf('\\begin{lemma}', label);
      const proof = originalText.indexOf('\\begin{proof}', label);
      assert.ok(statement >= 0 && proof > statement);
      const insertion = proof + '\\begin{proof}'.length;
      assert.ok(await editor.edit(edit => edit.insert(document.positionAt(insertion), '\n% ' + mark)));
      assert.ok(document.isDirty);
      const end = document.getText().indexOf('\\end{proof}', insertion) + '\\end{proof}'.length;
      editor.selection = new vscode.Selection(document.positionAt(statement), document.positionAt(end));
      const current = await vscode.commands.executeCommand('mrw.generateAtlas');
      assert.ok(current?.atlas.source.text.includes(mark));
      assert.equal(await fs.readFile(sourceFile, 'utf8'), originalText);
      assert.equal(current.atlas.extraction.references.find(ref => ref.label === 'lemma-Hausdorff').status, 'resolved');
      const theorem = current.atlas.extraction.entries.find(entry => entry.label === 'lemma-fibre-product-closed');
      const record = panels.at(-1);
      await wait(() => record.panel.active, 'atlas panel focus');
      await click(record, '[data-type="selectComponent"][data-component="' + theorem.id + '"]');
      await wait(() => current.component === theorem.id, 'selected theorem');
      await record.receive({ type: 'edit', change: { type: 'component', component: theorem.id,
        fields: { conclusion: 'Apply the forward implication of 08ZE to the Hausdorff space Z.' } } });
      await click(record, '[data-type="openSource"][data-part="proof"]');
      await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'exact source editor');
      const exact = vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection);
      assert.ok(exact.includes(mark) && exact.includes('lemma-Hausdorff'));
      await vscode.commands.executeCommand('mrw.returnToReadingOutline');
      await wait(() => record.panel.active, 'Return to atlas component');
      assert.ok(document.isDirty);
      assert.equal(current.component, theorem.id);
      const diagonal = current.atlas.extraction.entries.find(entry => entry.label === 'lemma-Hausdorff');
      await record.receive({ type: 'startDraft', component: theorem.id, page: 0, include: [diagonal.id] });
      await record.receive({ type: 'addInference', component: theorem.id, page: 0, change: {
        premises: ['claim-2'], conclusion: 'claim-1', source: 'passage-1',
        author: 'Fixture reader', reason: '08ZE supplies a closed diagonal.',
      } });
      const rule = current.pending.graph.inferences[0];
      const corrected = 'Apply 08ZE to Z. The continuous product map pulls its closed diagonal back to the fiber product.';
      await record.receive({ type: 'editProposal', component: theorem.id, page: 0, change: {
        rule: rule.id, premises: rule.premises, author: 'Fixture reader', reason: corrected,
      } });
      assert.equal(current.pending.graph.inferences[0].explanation.text, corrected);
      assert.equal(current.file, undefined);
      await record.receive({ type: 'acceptProposal', component: theorem.id, page: 0 });
      const accepted = current.atlas.graphs[theorem.id + ':0'];
      const graph = JSON.parse(await fs.readFile(path.join(project, accepted), 'utf8'));
      assert.equal(graph.inferences[0].explanation.text, corrected);
      report.checks.push('The native host corrected a reader-authored inference before publishing, then saved the attributed reason in its proof outline.');
      report.checks.push('Native capture includes dirty TeX and resolves 08ZH to 08ZE; a focused webview control opens exact proof and Return restores the component.');
      // Only this fixture buffer is changed. Set the on-disk revision apart from the retained capture.
      const original = await focusDocument(document);
      const at = document.getText().indexOf(mark);
      assert.ok(await original.edit(edit => edit.replace(new vscode.Range(document.positionAt(at), document.positionAt(at + mark.length)), 'changed source')));
      assert.ok(await document.save());
      assert.ok(!vscode.workspace.textDocuments.some(doc => doc.isDirty));
      await fs.writeFile(stateFile, JSON.stringify({ checks: report.checks, id: theorem.id, mark, exact, atlasFile: current.file }));
      report.reloading = true;
      await saveReport();
      reloading = true;
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
      return;
    }
    const current = await vscode.commands.executeCommand('mrw.openAtlas', vscode.Uri.file(state.atlasFile));
    const record = panels.at(-1);
    assert.ok(current.atlas.source.text.includes(state.mark));
    assert.ok(!(await fs.readFile(sourceFile, 'utf8')).includes(state.mark));
    assert.equal(current.atlas.components.find(item => item.id === state.id).conclusion,
      'Apply the forward implication of 08ZE to the Hausdorff space Z.');
    await wait(() => record.panel.active, 'reopened atlas focus');
    await click(record, '[data-type="selectComponent"][data-component="' + state.id + '"]');
    await wait(() => current.component === state.id, 'restored component');
    await click(record, '[data-type="openSource"][data-part="proof"]');
    await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'reopened exact source');
    assert.equal(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), state.exact);
    await vscode.commands.executeCommand('mrw.returnToAtlas');
    await wait(() => record.panel.active, 'Return after restart');
    report.checks.push('After the fixture window reloaded, the saved atlas reopened the exact earlier proof and kept the attributed correction despite the changed working file.');
    assert.deepEqual(report.errors, []);
    report.complete = true;
    await clearOwnedState(context);
  } catch (error) { report.errors.push(error.stack || String(error)); }
  finally {
    if (!reloading) {
      vscode.window.createWebviewPanel = original.panel;
      vscode.window.showSaveDialog = original.save;
      vscode.window.showErrorMessage = original.error;
      await saveReport();
    }
  }
}

module.exports = { activate };
protect(module.exports, { vscode, filename: __filename });
