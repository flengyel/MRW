'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { sourceSnapshot, digest } = require('./navigation');

const normalize = text => text.replace(/^\uFEFF/u, '').replace(/\r\n|\r/g, '\n');
const point = p => [p.line, p.character];

function outlineHtml(script) {
  const nonce = crypto.randomBytes(24).toString('base64');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'">
<title>Mathematical source outline</title><style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);padding:12px;max-width:1000px;margin:auto;overflow-wrap:anywhere}
h1{font-size:1.35em}h2{font-size:1.1em}h3{font-size:1em}button,input,select,textarea{font:inherit}
button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:6px 9px;margin:3px;cursor:pointer}
button:disabled{opacity:.55;cursor:default}input,textarea,select{color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border);padding:5px;max-width:100%;box-sizing:border-box}
textarea{display:block;width:100%;min-height:90px;resize:vertical}input{width:100%}label{display:block;margin:6px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext;tab-size:4;font-family:var(--vscode-editor-font-family);font-size:var(--vscode-editor-font-size)}
.region,.context,.evidence,.note{border:1px solid var(--vscode-panel-border);padding:10px;margin:12px 0}.statement{border-left:3px solid var(--vscode-focusBorder);padding-left:9px}.note{border-left:3px solid var(--vscode-editorWarning-foreground)}.muted{opacity:.8;font-size:.9em}.warning{color:var(--vscode-editorWarning-foreground)}.toolbar{display:flex;flex-wrap:wrap;gap:3px}.selected{outline:2px solid var(--vscode-focusBorder)}.metadata{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:8px}
</style></head><body><main id="reader" aria-live="polite">Opening recorded outline…</main>
<script nonce="${nonce}">${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

function registerOutlines({ vscode, context, register, bridge, show, projectRoot, ordinaryEditor, choosePath, changed }) {
  const panels = new Map(), retainedViews = new Map(), blockedStores = new Set();
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    if (document.isClosed) retainedViews.delete(document.uri.toString());
  }));
  let active, busy = false;
  const current = () => {
    const controller = panels.get(active);
    if (!controller) throw new Error('Create or open a source outline first.');
    return controller;
  };
  const request = (c, method, extra = {}) => ({ method, store: c.store, project_root: c.root,
    id: c.result.outline.id, revision: c.result.revision, ...extra });
  const writable = c => {
    if (blockedStores.has(c.store)) throw new Error('Outline writes are blocked after a failed or uncertain publication. '
      + 'Keep unsaved annotation text and reload the extension host before further private writes.');
  };
  async function locked(action) {
    if (busy) throw new Error('Wait for the current outline action to finish.');
    busy = true; changed.fire();
    try { await vscode.commands.executeCommand?.('setContext', 'mrw.outlineBusy', true); return await action(); }
    finally { busy = false; changed.fire(); await vscode.commands.executeCommand?.('setContext', 'mrw.outlineBusy', false); }
  }
  async function send(c, result, clearDraft) {
    if (result.blocked) {
      blockedStores.add(c.store);
      throw new Error(`Outline publication failed: ${result.write_error}. Retained sources remain unchanged. `
        + 'The live view and unsaved annotation text are kept; reload before further private writes.');
    }
    c.result = result;
    if (!c.selected) c.selected = result.outline.regions.at(-1)?.id;
    c.panel.title = `Outline: ${result.outline.source.bibliography.title || path.basename(result.outline.source.path)}`;
    await c.panel.webview.postMessage({ type: 'outline', model: result, selected: c.selected, clearDraft,
      writesBlocked: blockedStores.has(c.store) });
    changed.fire();
    return result;
  }
  async function mutate(c, change, clearDraft) {
    writable(c);
    let result;
    try { result = await bridge(request(c, 'outline_mutate', { change })); }
    catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(c.store); throw error; }
    return send(c, result, clearDraft);
  }
  async function openDocument(c, artifact = null) {
    const result = await bridge(request(c, 'outline_document', { artifact }));
    const uri = await show(artifact ? result.text : result.text.replace(/^\uFEFF/u, ''), artifact ? 'Retained-outline-artifact' : 'Retained-outline-source', undefined,
      { viewColumn: vscode.ViewColumn.One });
    if (!artifact) retainedViews.set(uri.toString(), { id: c.result.outline.id, revision: result.source_revision,
      textRevision: digest(normalize(result.text)) });
  }
  async function navigate(c, extra) {
    const result = await bridge(request(c, 'outline_navigation', { region: null, context: null, statement: false, ...extra }));
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.path));
    const version = document.version;
    const observed = await sourceSnapshot(result.path);
    if (document.isDirty || document.version !== version || observed.path !== result.path ||
        observed.revision !== result.source_revision || digest(normalize(document.getText())) !== result.text_revision) {
      throw new Error('Original source or editor content changed. The retained outline was not remapped; open its retained source.');
    }
    const range = new vscode.Range(...result.start, ...result.end);
    if (!document.validateRange(range).isEqual(range)) throw new Error('The pinned source range is unavailable.');
    const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.One });
    if (document.version !== version || document.isDirty) throw new Error('The source changed while opening; the pinned selection remains retained.');
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
  async function message(c, value) {
    if (!value || typeof value.type !== 'string') return;
    if (value.type === 'ready') return send(c, c.result);
    if (value.type === 'select') {
      if (c.result.outline.regions.some(r => r.id === value.region)) c.selected = value.region;
      active = c.result.outline.id; return;
    }
    if (value.type === 'dirty') { c.panel.title = `${value.dirty ? '• ' : ''}Outline: ${c.result.outline.source.bibliography.title || path.basename(c.result.outline.source.path)}`; return; }
    try {
      await locked(async () => {
        active = c.result.outline.id;
        if (value.type === 'edit') await mutate(c, value.change, value.draft);
        else if (value.type === 'toggle') {
          const region = c.result.outline.regions.find(r => r.id === value.region);
          if (!region) throw new Error('Unknown source region.');
          await mutate(c, { kind: 'region', region: region.id, title: region.title, level: region.level, collapsed: !region.collapsed });
        } else if (value.type === 'source') await openDocument(c);
        else if (value.type === 'artifact') await openDocument(c, value.artifact);
        else if (value.type === 'navigate') await navigate(c, { region: value.region, statement: !!value.statement });
        else if (value.type === 'navigate_context') await navigate(c, { context: value.context });
        else if (value.type === 'refresh') await send(c, await bridge({ method: 'outline_load', store: c.store, project_root: c.root, id: c.result.outline.id }));
        else throw new Error('Unknown reader action.');
      });
    } catch (error) {
      await c.panel.webview.postMessage({ type: 'error', message: error.message, writesBlocked: blockedStores.has(c.store) });
      await vscode.window.showErrorMessage(`MRW: ${error.message}`);
    } finally { await c.panel.webview.postMessage({ type: 'idle' }); }
  }
  async function display(result, store, root) {
    if (result.blocked) { blockedStores.add(store); throw new Error(`Outline publication failed: ${result.write_error}. Reload before further private writes.`); }
    const id = result.outline.id;
    let c = panels.get(id);
    if (!c) {
      // Restart can leave a stale webview tab focused in the research group.
      // Beside would then keep creating additional empty editor groups.
      const column = [...panels.values()].find(p => p.panel.viewColumn)?.panel.viewColumn || vscode.ViewColumn.Two;
      const panel = vscode.window.createWebviewPanel('mrw.sourceOutline', 'Mathematical source outline', column,
        { enableScripts: true, retainContextWhenHidden: true,
          localResourceRoots: [] });
      c = { panel, result, store, root, selected: result.outline.regions.at(-1)?.id };
      panels.set(id, c);
      context.subscriptions.push(panel, panel.webview.onDidReceiveMessage(value => message(c, value)),
        panel.onDidChangeViewState(event => { if (event.webviewPanel.active) active = id; }),
        panel.onDidDispose(() => { panels.delete(id); if (active === id) active = undefined; changed.fire(); }));
      // Trusted bundled code only: no source/annotation text enters this HTML.
      // Inline the nonce script so offline WSL use needs no resource fetch.
      panel.webview.html = outlineHtml(await fs.readFile(path.join(context.extensionPath, 'src', 'outlineView.js'), 'utf8'));
    } else c.panel.reveal(c.panel.viewColumn);
    active = id;
    await send(c, result);
    return c;
  }
  async function storage(editor) {
    const root = await projectRoot(editor);
    if (!context.storageUri || context.storageUri.scheme !== 'file') throw new Error('Open a local workspace for private outlines.');
    return { root, store: path.join(context.storageUri.fsPath, `outlines-${digest(root)}`) };
  }
  async function selection(c) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) throw new Error('Select a nonempty source region in the original or retained text.');
    const document = editor.document, version = document.version, range = editor.selection;
    const retained = retainedViews.get(document.uri.toString());
    if (retained) {
      if (retained.id !== c.result.outline.id || retained.revision !== c.result.outline.source.revision ||
          document.isDirty || digest(normalize(document.getText())) !== retained.textRevision) {
        throw new Error('This view no longer supplies this outline’s exact retained text. Open its retained source again.');
      }
    } else {
      ordinaryEditor();
      if (document.isDirty) throw new Error('Save or undo source edits before selecting a retained quotation.');
      const source = await sourceSnapshot(document.uri.fsPath);
      if (source.path !== c.result.outline.source.path || source.revision !== c.result.outline.source.revision ||
          normalize(source.text) !== normalize(document.getText())) {
        throw new Error('Select from this outline’s exact original or retained source. Changed source is not remapped.');
      }
    }
    if (document.version !== version || !editor.selection.isEqual(range)) throw new Error('Source selection changed during capture.');
    return { start: point(range.start), end: point(range.end) };
  }
  async function selectedRegion(c) {
    if (c.result.outline.regions.some(r => r.id === c.selected)) return c.selected;
    const region = await vscode.window.showQuickPick(c.result.outline.regions.map(r => ({ label: r.title, id: r.id })),
      { placeHolder: 'Choose the region to annotate' });
    if (!region) throw new Error('Select a source region first.');
    c.selected = region.id; return region.id;
  }
  register('mrw.createOutline', () => locked(async () => {
    const editor = ordinaryEditor(), document = editor.document, version = document.version, range = editor.selection;
    if (document.isDirty) throw new Error('Save the source before creating an exact retained outline.');
    const source = await sourceSnapshot(document.uri.fsPath);
    if (document.version !== version || document.isDirty || normalize(source.text) !== normalize(document.getText())) {
      throw new Error('Source changed during capture; save/reload and select it again.');
    }
    const { store, root } = await storage(editor); writable({ store });
    let result;
    try { result = await bridge({ method: 'outline_create', store, project_root: root, path: source.path, source_revision: source.revision }); }
    catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(store); throw error; }
    const c = await display(result, store, root);
    if (!range.isEmpty) {
      const added = await mutate(c, { kind: 'add_region', start: point(range.start), end: point(range.end) });
      c.selected = added.outline.regions.at(-1).id;
      await send(c, added);
    }
    return c.result;
  }));
  register('mrw.openOutline', () => locked(async () => {
    const { store, root } = await storage(vscode.window.activeTextEditor);
    const result = await bridge({ method: 'outline_list', store, project_root: root });
    if (!result.outlines.length) throw new Error('No saved source outlines exist for this project.');
    const picked = await vscode.window.showQuickPick(result.outlines.map(o => ({ label: o.title || path.basename(o.path),
      description: `${o.path} · ${o.revision.slice(0, 12)}`, id: o.id })), { placeHolder: 'Open a retained source outline' });
    if (!picked) return;
    const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: picked.id });
    return (await display(loaded, store, root)).result;
  }));
  register('mrw.addOutlineRegion', () => locked(async () => {
    const c = current(); const selected = await selection(c);
    const result = await mutate(c, { kind: 'add_region', ...selected }); c.selected = result.outline.regions.at(-1).id;
    await send(c, result); c.panel.reveal(c.panel.viewColumn); return result;
  }));
  register('mrw.setOutlineStatement', () => locked(async () => {
    const c = current(), selected = await selection(c), region = await selectedRegion(c);
    const kind = await vscode.window.showQuickPick([{ label: 'Source statement (reader-selected)', kind: 'source_statement' },
      { label: 'Declaration statement (reader-labeled source)', kind: 'declaration_statement' }], { placeHolder: 'Label this exact selected statement' });
    if (kind) { await mutate(c, { kind: 'statement', region, statement_kind: kind.kind, ...selected }); c.panel.reveal(c.panel.viewColumn); }
  }));
  register('mrw.replaceOutlineRegion', () => locked(async () => {
    const c = current(), selected = await selection(c), region = await selectedRegion(c);
    await mutate(c, { kind: 'replace_region', region, ...selected }); c.panel.reveal(c.panel.viewColumn);
  }));
  register('mrw.addOutlineContext', () => locked(async () => {
    const c = current(), selected = await selection(c);
    const choice = await vscode.window.showQuickPick(['hypothesis', 'definition', 'local_assumption', 'cited_result', 'source_reference']
      .map(kind => ({ label: kind.replace(/_/g, ' '), kind })), { placeHolder: 'Keep this source quotation available with collapsed details' });
    if (choice) { await mutate(c, { kind: 'context', context_kind: choice.kind, label: choice.label, ...selected }); c.panel.reveal(c.panel.viewColumn); }
  }));
  register('mrw.replaceOutlineContext', () => locked(async () => {
    const c = current(), editor = vscode.window.activeTextEditor;
    const version = editor?.document.version, range = editor?.selection;
    const selected = await selection(c);
    if (!c.result.outline.contexts.length) throw new Error('This outline has no shared context to replace.');
    const choice = await vscode.window.showQuickPick(c.result.outline.contexts.map(item => ({
      label: item.label, description: item.kind.replace(/_/g, ' '), id: item.id
    })), { placeHolder: 'Replace the range of this shared context with the source selection' });
    if (!choice) return;
    if (vscode.window.activeTextEditor !== editor || editor.document.version !== version || !editor.selection.isEqual(range)) {
      throw new Error('Source selection changed during capture; select it again.');
    }
    await selection(c); // Recheck exact source identity after the chooser.
    await mutate(c, { kind: 'replace_context', context: choice.id, ...selected }); c.panel.reveal(c.panel.viewColumn);
  }));
  register('mrw.attachOutlineEvidence', () => locked(async () => {
    const c = current(); writable(c);
    const file = await choosePath('Attach existing UTF-8 evidence or supporting artifact (no tool invocation)');
    if (!file) return;
    const inspected = await bridge({ method: 'outline_inspect_artifact', path: file });
    const kinds = [{ label: 'Supporting artifact (not rechecked)', kind: 'supporting_artifact' },
      { label: 'Supplied declaration statement (not a tactic goal)', kind: 'declaration_statement' }];
    if (inspected.entries.length) kinds.unshift({ label: 'Recorded tactic goal/context (manual association)', kind: 'goal_context' });
    const choice = await vscode.window.showQuickPick(kinds, { placeHolder: 'Describe the supplied record; this creates no checking evidence' });
    if (!choice) return;
    let selected;
    if (choice.kind === 'goal_context') {
      selected = await vscode.window.showQuickPick(inspected.entries.map(e => ({ label: e.label, index: e.index })),
        { placeHolder: 'Manually associate one recorded snapshot; context is availability, not necessary premises' });
      if (!selected) return;
    }
    let result;
    try { result = await bridge(request(c, 'outline_attach', { path: inspected.path, artifact_revision: inspected.revision,
      kind: choice.kind, label: selected?.label || path.basename(file), region: c.selected || null, selector: selected?.index ?? null })); }
    catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(c.store); throw error; }
    await send(c, result); c.panel.reveal(c.panel.viewColumn);
  }));
  return () => [['Create outline from saved source', 'mrw.createOutline'], ['Open saved source outline…', 'mrw.openOutline'],
    ...(panels.has(active) ? [['Add selected source region', 'mrw.addOutlineRegion'], ['Use selection as exact statement', 'mrw.setOutlineStatement'],
      ['Replace selected region range', 'mrw.replaceOutlineRegion'], ['Keep selected hypothesis / cited result', 'mrw.addOutlineContext'],
      ['Replace shared context with selection…', 'mrw.replaceOutlineContext'], ['Attach recorded evidence…', 'mrw.attachOutlineEvidence']] : [])];
}

module.exports = { registerOutlines, outlineHtml, normalize };
