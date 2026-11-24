'use strict';

// This entry is launched only with an owned fixture made by prepare-native-host.py.
const vscode = require('vscode');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { assertFixture, clearOwnedState, protect } = require('./fixtureGuard');

function webviewProbe(generation) {
  const api = acquireVsCodeApi();
  window.acquireVsCodeApi = () => api;
  window.addEventListener('DOMContentLoaded', () => api.postMessage({ type: 'fixtureAtlasReady', generation }));
  window.addEventListener('message', event => {
    if (event.data?.generation !== generation) return;
    if (event.data?.type === 'fixtureAtlasDiagram') {
      const boxes = [...document.querySelectorAll('[data-type="selectNode"][data-node]')].map(control => {
        const { x, y, width, height } = control.getBoundingClientRect();
        return { id: control.dataset.node, x, y, width, height };
      });
      const edges = [...document.querySelectorAll('path[data-relation]')].map(edge => edge.dataset.relation);
      const actions = [...document.querySelectorAll('[data-type]')].map(control => control.dataset.type);
      const changes = [...document.querySelectorAll('form[data-change]')].map(control => control.dataset.change);
      api.postMessage({ type: 'fixtureAtlasDiagram', boxes, edges, actions, changes,
        focus: document.activeElement?.id, generation, request: event.data.request });
      return;
    }
    if (event.data?.type !== 'fixtureAtlasClick') return;
    const control = document.querySelector(event.data.selector);
    control?.focus();
    api.postMessage({ type: 'fixtureAtlasFocus', focused: document.activeElement === control, found: !!control, generation });
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
    error: vscode.window.showErrorMessage, customEditor: vscode.window.registerCustomEditorProvider };
  const panels = [], observed = new WeakMap();
  let reloading = false;
  async function wait(predicate, label, timeout = 15000) {
    const until = Date.now() + timeout;
    while (!predicate()) {
      if (Date.now() >= until) throw new Error('Timed out waiting for ' + label);
      await pause(70);
    }
  }
  async function click(record, selector) {
    await wait(() => record.ready, 'ready webview for ' + selector);
    record.focus = undefined;
    await record.panel.webview.postMessage({ type: 'fixtureAtlasClick', selector, generation: record.generation });
    await wait(() => record.focus, selector);
    assert.deepEqual(record.focus, { type: 'fixtureAtlasFocus', focused: true, found: true });
  }
  async function measure(record, expectedFocus) {
    const until = Date.now() + 5000;
    let measured;
    do {
      await wait(() => record.ready, 'ready diagram', 3000);
      const generation = record.generation, request = (record.request || 0) + 1; record.request = request;
      record.measurement = undefined;
      await record.panel.webview.postMessage({ type: 'fixtureAtlasDiagram', generation, request });
      await wait(() => record.generation !== generation || record.measurement?.request === request, 'rendered diagram', 3000);
      if (record.generation !== generation) continue;
      measured = record.measurement;
      if (!expectedFocus || measured.focus === expectedFocus) return measured;
      // Production focus is scheduled after the new HTML's DOMContentLoaded.
      // Observe its eventual keyboard destination; never focus it from a probe.
      await pause(90);
    } while (Date.now() < until);
    assert.equal(measured?.focus, expectedFocus, 'The rendered atlas restores keyboard focus');
    return measured;
  }
  async function focusDocument(doc) {
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    await wait(() => vscode.window.activeTextEditor?.document === doc, doc.uri.path);
    return editor;
  }
  function assertSeparateNodes(first, second) {
    assert.ok(first?.width > 80 && second?.width > 80, 'Both graph nodes have readable width');
    assert.ok(first.x + first.width <= second.x || second.x + second.width <= first.x ||
      first.y + first.height <= second.y || second.y + second.height <= first.y,
      'Graph nodes occupy separate positions');
  }
  function observePanel(panel, kind = 'command') {
    if (observed.has(panel)) return observed.get(panel);
    const record = { panel, kind }; observed.set(panel, record); panels.push(record);
    panel.onDidDispose(() => { record.disposed = true; });
    const listen = panel.webview.onDidReceiveMessage.bind(panel.webview);
    panel.webview.onDidReceiveMessage = (handler, receiver, disposables) => {
      record.receive = handler;
      return listen(value => {
        if (typeof value?.type === 'string' && value.type.startsWith('fixtureAtlas') && value.generation !== record.generation) return;
        if (value.type === 'fixtureAtlasReady') record.ready = true;
        else if (value.type === 'fixtureAtlasFocus') record.focus = { type: value.type, focused: value.focused, found: value.found };
        else if (value.type === 'fixtureAtlasDiagram') record.measurement = value;
        else return handler.call(receiver, value);
      }, undefined, disposables);
    };
    let owner = panel.webview, html;
    while (owner && !(html = Object.getOwnPropertyDescriptor(owner, 'html'))) owner = Object.getPrototypeOf(owner);
    assert.ok(html, 'Native webview exposes its HTML property');
    Object.defineProperty(panel.webview, 'html', {
      configurable: true, get: () => html.get.call(panel.webview),
      set(value) {
        record.ready = false; record.generation = (record.generation || 0) + 1;
        const nonce = /<script nonce="([^"]+)"/.exec(value);
        html.set.call(panel.webview, nonce ? value.replace('<script nonce=', '<script nonce="' + nonce[1] + '">(' +
          webviewProbe.toString() + ')(' + record.generation + ')</script><script nonce=') : value);
      },
    });
    return record;
  }
  async function normalOpen(uri) {
    // This is deliberately the normal editor-resolution command. Only the
    // explicit Text Editor control below may request an editor override.
    const activeAtlas = record => !record.disposed && record.kind === 'custom' &&
      record.customUri?.toString() === uri.toString() && record.current?.atlas && record.panel.active;
    await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
    await wait(() => panels.some(activeAtlas), 'default atlas custom editor');
    const record = panels.findLast(activeAtlas);
    await wait(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input?.viewType === 'mrw.atlasEditor' &&
      vscode.window.tabGroups.activeTabGroup.activeTab.input.uri.toString() === uri.toString(), 'native atlas tab identity');
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.equal(tab.input?.viewType, 'mrw.atlasEditor'); assert.equal(tab.input.uri.toString(), uri.toString());
    await wait(() => record.ready, 'default atlas webview');
    return record;
  }
  async function closeFixtureEditors() {
    assert.ok(!vscode.workspace.textDocuments.some(document => document.isDirty), 'Only clean fixture editors may be closed');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await wait(() => vscode.window.tabGroups.all.every(group => group.tabs.length === 0), 'closed fixture editors');
  }
  async function inventory(directory, ignore = new Set()) {
    const files = [];
    async function walk(folder, relative = '') {
      for (const name of (await fs.readdir(folder)).sort()) {
        const local = path.join(relative, name); if (!relative && ignore.has(name)) continue;
        const file = path.join(folder, name), stat = await fs.lstat(file);
        assert.ok(!stat.isSymbolicLink(), 'Fixture snapshots do not follow symlinks');
        if (stat.isDirectory()) await walk(file, local);
        else { assert.ok(stat.isFile()); files.push([local, createHash('sha256').update(await fs.readFile(file)).digest('hex')]); }
      }
    }
    await walk(directory); return files;
  }
  try {
    vscode.window.showErrorMessage = async value => { report.errors.push(value); await saveReport(); };
    vscode.window.showSaveDialog = async () => vscode.Uri.file(atlasFile);
    vscode.window.createWebviewPanel = (...args) => {
      const panel = original.panel(...args);
      if (args[0] === 'mrw.atlas') observePanel(panel);
      return panel;
    };
    vscode.window.registerCustomEditorProvider = (viewType, provider, ...options) => {
      if (viewType === 'mrw.atlasEditor') {
        const resolve = provider.resolveCustomEditor.bind(provider);
        provider.resolveCustomEditor = async (document, panel, token) => {
          const record = observePanel(panel, 'custom'); record.customUri = document.uri;
          const current = await resolve(document, panel, token); record.current = current;
          return current;
        };
      }
      return original.customEditor.call(vscode.window, viewType, provider, ...options);
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
      const diagonal = current.atlas.extraction.entries.find(entry => entry.label === 'lemma-Hausdorff');
      const record = panels.at(-1);
      await wait(() => record.panel.active, 'atlas panel focus');
      assert.equal(current.view, 'map');
      const map = await measure(record);
      const nodeBox = id => map.boxes.find(box => box.id === 'component:' + id);
      assertSeparateNodes(nodeBox(diagonal.id), nodeBox(theorem.id));
      assert.ok(map.edges.includes('citation'));
      assert.equal(current.diagram.selected, 'component:' + theorem.id);
      await click(record, '[data-type="openSource"][data-part="statement"]');
      await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'exact map statement');
      assert.doesNotMatch(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), /\\begin\{proof\}/);
      await vscode.commands.executeCommand('mrw.returnToAtlas');
      await wait(() => record.panel.active, 'Return to the Proof map');
      assert.equal((await measure(record, 'diagram-node-component:' + theorem.id)).focus, 'diagram-node-component:' + theorem.id);
      await click(record, '[data-type="selectView"][data-view="blueprint"]');
      await wait(() => current.view === 'blueprint', 'Blueprint view');
      const blueprint = await measure(record);
      const proofId = 'entry:' + theorem.id + ':proof';
      const proofBox = blueprint.boxes.find(box => box.id === proofId);
      const statementBox = blueprint.boxes.find(box => box.id === 'entry:' + theorem.id + ':statement');
      assertSeparateNodes(proofBox, statementBox);
      assert.ok(blueprint.edges.includes('proof') && blueprint.edges.includes('citation'));
      await click(record, '[data-type="selectNode"][data-node="' + proofId + '"]');
      await wait(() => current.diagram.selected === proofId, 'selected Blueprint proof');
      await click(record, '[data-type="openSource"][data-part="proof"]');
      await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'exact Blueprint proof');
      assert.ok(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection).includes(mark));
      await vscode.commands.executeCommand('mrw.returnToAtlas');
      await wait(() => record.panel.active, 'Return to the Blueprint');
      assert.equal((await measure(record, 'diagram-node-' + proofId)).focus, 'diagram-node-' + proofId);
      report.checks.push('The Proof map draws a citation from 08ZE toward 08ZH. The Blueprint draws the 08ZH proof and statement separately. Opening the proof selects the retained text and Return restores focus to its node.');
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
    const opened = await vscode.commands.executeCommand('mrw.openAtlas', vscode.Uri.file(state.atlasFile));
    await wait(() => panels.some(record => record.panel.active && (opened?.atlas || record.current?.atlas)), 'Open Atlas command result');
    const record = panels.findLast(record => record.panel.active && (opened?.atlas || record.current?.atlas));
    const current = opened?.atlas ? opened : record.current;
    record.current ||= current;
    assert.ok(current.atlas.source.text.includes(state.mark));
    assert.ok(!(await fs.readFile(sourceFile, 'utf8')).includes(state.mark));
    assert.equal(current.atlas.components.find(item => item.id === state.id).conclusion,
      'Apply the forward implication of 08ZE to the Hausdorff space Z.');
    await wait(() => record.panel.active, 'reopened atlas focus');
    assert.equal(current.view, 'map');
    await click(record, '[data-type="selectNode"][data-node="component:' + state.id + '"]');
    await wait(() => current.diagram.selected === 'component:' + state.id, 'restored map node');
    await click(record, '[data-type="selectComponent"][data-component="' + state.id + '"]');
    await wait(() => current.component === state.id, 'restored component');
    await click(record, '[data-type="openSource"][data-part="proof"]');
    await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'reopened exact source');
    assert.equal(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), state.exact);
    await vscode.commands.executeCommand('mrw.returnToAtlas');
    await wait(() => record.panel.active, 'Return after restart');
    report.checks.push('After the fixture window reloaded, the saved atlas reopened the exact earlier proof and kept the attributed correction despite the changed working file.');

    const originalProject = await inventory(project);
    const sourceBytes = await fs.readFile(sourceFile), atlasBytes = await fs.readFile(state.atlasFile);
    const privateBefore = await inventory(context.storageUri.fsPath, new Set(['study-history-v1']));
    const globalBefore = await inventory(context.globalStorageUri.fsPath);
    await closeFixtureEditors();

    // Reproduce an ordinary file/link open, with no MRW command or editor override.
    const direct = await normalOpen(vscode.Uri.file(state.atlasFile));
    assert.equal(direct.current.customEditor, true); assert.equal(direct.current.readOnly, false);
    assert.equal(direct.current.view, 'map');
    assert.ok((await measure(direct)).edges.includes('citation'));
    await click(direct, '[data-type="selectView"][data-view="blueprint"]');
    await wait(() => direct.current.view === 'blueprint', 'default editor Blueprint');
    const proofId = 'entry:' + state.id + ':proof';
    await click(direct, '[data-type="selectNode"][data-node="' + proofId + '"]');
    await wait(() => direct.current.diagram.selected === proofId, 'default editor proof selection');
    await click(direct, '[data-type="openSource"][data-part="proof"]');
    await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'default editor exact proof');
    assert.equal(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), state.exact);
    assert.ok(vscode.window.tabGroups.all.some(group => group.tabs.some(tab => tab.input?.viewType === 'mrw.atlasEditor' &&
      tab.input.uri.fsPath === state.atlasFile)), 'Opening exact evidence keeps its default atlas tab');
    await vscode.commands.executeCommand('mrw.returnToAtlas');
    await wait(() => direct.panel.active, 'Return to default custom editor');
    assert.equal((await measure(direct, 'diagram-node-' + proofId)).focus, 'diagram-node-' + proofId);
    report.checks.push('Normal vscode.open resolves a saved atlas URI to the default Mathematical Atlas editor. Its Proof map and Blueprint open retained evidence and Return restores the exact proof node without replacing the atlas tab.');

    // This override is intentional: it is the native alternate Text Editor route.
    await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(state.atlasFile), 'default', { preview: false });
    await wait(() => vscode.window.activeTextEditor?.document.uri.fsPath === state.atlasFile, 'explicit Text Editor');
    assert.equal(vscode.window.activeTextEditor.document.getText(), atlasBytes.toString('utf8'));
    assert.equal(vscode.window.activeTextEditor.document.isDirty, false);
    assert.deepEqual(await fs.readFile(state.atlasFile), atlasBytes);
    report.checks.push('Explicitly reopening in native Text Editor displays the unchanged saved JSON; the default atlas association does not rewrite the record.');
    await closeFixtureEditors();

    // This is outside the workspace, but still within the receipt-owned root.
    // It grants inspection of one saved capture and no private-store authority.
    const externalFolder = path.join(root, 'external-readonly');
    await fs.mkdir(externalFolder, { recursive: true });
    const externalFile = path.join(externalFolder, 'external.mrw-atlas.json');
    try { await fs.writeFile(externalFile, atlasBytes, { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; assert.deepEqual(await fs.readFile(externalFile), atlasBytes); }
    assert.equal(vscode.workspace.getWorkspaceFolder(vscode.Uri.file(externalFile)), undefined);
    const externalBefore = await inventory(externalFolder), external = await normalOpen(vscode.Uri.file(externalFile));
    assert.equal(external.current.readOnly, true); assert.equal(external.current.root, null);
    const readOnlyMap = await measure(external);
    for (const type of ['saveAtlas', 'regenerate', 'copyHandoff', 'startDraft', 'importProposal', 'acceptProposal', 'openGraph', 'openOriginal', 'openPrevious']) {
      assert.ok(!readOnlyMap.actions.includes(type), 'Read-only inspection hides ' + type);
    }
    assert.deepEqual(readOnlyMap.changes, []);
    await click(external, '[data-type="selectView"][data-view="blueprint"]');
    await wait(() => external.current.view === 'blueprint', 'external read-only Blueprint');
    await click(external, '[data-type="selectNode"][data-node="' + proofId + '"]');
    await wait(() => external.current.diagram.selected === proofId, 'external read-only proof selection');
    await click(external, '[data-type="openSource"][data-part="proof"]');
    await wait(() => vscode.window.activeTextEditor?.document.uri.scheme === 'mrw-atlas-source', 'external captured proof');
    assert.equal(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), state.exact);
    await vscode.commands.executeCommand('mrw.returnToAtlas');
    await wait(() => external.panel.active, 'Return to external read-only atlas');
    assert.equal((await measure(external, 'diagram-node-' + proofId)).focus, 'diagram-node-' + proofId);
    assert.deepEqual(await inventory(externalFolder), externalBefore);
    assert.deepEqual(await inventory(project), originalProject);
    assert.deepEqual(await fs.readFile(sourceFile), sourceBytes); assert.deepEqual(await fs.readFile(state.atlasFile), atlasBytes);
    assert.deepEqual(await inventory(context.storageUri.fsPath, new Set(['study-history-v1'])), privateBefore);
    assert.deepEqual(await inventory(context.globalStorageUri.fsPath), globalBefore);
    report.checks.push('An explicitly opened atlas outside the workspace but inside the owned fixture opens read-only. Source diagrams and exact capture/Return work without importing, rewriting files, following sibling outlines or changing private artifact storage. Normal operation history is excluded from the private-artifact comparison.');
    assert.deepEqual(report.errors, []);
    report.complete = true;
    await clearOwnedState(context);
  } catch (error) {
    report.errors.push(error.stack || String(error));
    // Only this test's synthetic source receives edits. Do not leave a dirty
    // fixture buffer prompting on close, and never discard another document.
    const dirtySource = vscode.workspace.textDocuments.find(document => document.isDirty && document.uri.scheme === 'file' && document.uri.fsPath === sourceFile);
    if (dirtySource) {
      try {
        await focusDocument(dirtySource);
        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
        await wait(() => dirtySource.isClosed || !dirtySource.isDirty, 'reverted owned synthetic source');
        report.cleanup = ['Reverted and closed only the dirty synthetic topology.tex fixture buffer.'];
      } catch (cleanupError) { report.errors.push('Owned fixture cleanup: ' + (cleanupError.stack || String(cleanupError))); }
    }
  }
  finally {
    if (!reloading) {
      vscode.window.createWebviewPanel = original.panel;
      vscode.window.registerCustomEditorProvider = original.customEditor;
      vscode.window.showSaveDialog = original.save;
      vscode.window.showErrorMessage = original.error;
      await saveReport();
    }
  }
}

module.exports = { activate };
protect(module.exports, { vscode, filename: __filename });
