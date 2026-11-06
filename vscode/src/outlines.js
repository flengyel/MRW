'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { sourceSnapshot, digest } = require('./navigation');
const { referenceAt } = require('./outlineReferences');
const { makeExternal, parseExternal, workspaceRoute, obsidianTarget } = require('./companionLinks');

const normalize = text => text.replace(/^\uFEFF/u, '').replace(/\r\n|\r/g, '\n');
const point = p => [p.line, p.character];

function outlineHtml(script, support = [], diagramStyle = '', options = {}) {
  const caption = ({ proof: 'Proof outline', proofStudy: 'Proof study', study: 'Study' })[options.kind] || 'Saved source';
  script = [...support, script].join('\n;\n');
  const nonce = crypto.randomBytes(24).toString('base64');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; ${options.stacksFrame ? 'frame-src https://stacks.math.columbia.edu; ' : ''}base-uri 'none'; form-action 'none'">
<title>${caption}</title><style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);padding:12px;max-width:1000px;margin:auto;overflow-wrap:anywhere}
h1{font-size:1.35em}h2{font-size:1.1em}h3{font-size:1em}button,input,select,textarea{font:inherit}
button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:6px 9px;margin:3px;cursor:pointer}
button:disabled{opacity:.55;cursor:default}input,textarea,select{color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border);padding:5px;max-width:100%;box-sizing:border-box}
textarea{display:block;width:100%;min-height:90px;resize:vertical}input{width:100%}label{display:block;margin:6px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext;tab-size:4;font-family:var(--vscode-editor-font-family);font-size:var(--vscode-editor-font-size)}
.region,.context,.evidence,.note{border:1px solid var(--vscode-panel-border);padding:10px;margin:12px 0}.statement{border-left:3px solid var(--vscode-focusBorder);padding-left:9px}.note{border-left:3px solid var(--vscode-editorWarning-foreground)}.muted{opacity:.8;font-size:.9em}.warning{color:var(--vscode-editorWarning-foreground)}.toolbar{display:flex;flex-wrap:wrap;gap:3px}.selected{outline:2px solid var(--vscode-focusBorder)}.metadata{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:8px}
.companion{border:1px solid var(--vscode-panel-border);padding:10px;margin:12px 0}.companion h3{margin:0 0 6px}.companion p{margin:6px 0}.companion-directions{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px}.linked-note{font-weight:600;unicode-bidi:plaintext}.linked-note-row{padding:8px 0;border-bottom:1px solid var(--vscode-panel-border)}
.published-content{line-height:1.65;font-size:1.05em;margin:12px 0}.published-math math{font-size:1.15em}.source-reference{display:inline;padding:1px 4px;margin:0 2px}.published-toc{display:flex;flex-wrap:wrap;margin:12px 0}.source-slogan{border-left:2px solid var(--vscode-panel-border);padding:8px;margin:10px 0}
.reading-bar{position:sticky;top:0;z-index:2;background:var(--vscode-editor-background);padding:4px 0}.reading-bar button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);padding:5px 8px}.reader-tools{margin:10px 0 20px}.reader-tools>summary,.passage-tools>summary{cursor:pointer;font-size:.9em;opacity:.8}.region{scroll-margin-top:60px;border:0;border-top:1px solid var(--vscode-panel-border);padding:12px 0;margin:18px 0}.region>h2{font-size:1.15em}.passage-tools{margin:12px 0}.published-content{font-size:1.15em;line-height:1.75}
.proof-navigation{display:flex;gap:12px;margin:10px 0}.proof-navigation button{background:none;color:var(--vscode-textLink-foreground);padding:3px 0;margin:0;text-decoration:underline}.reader-note-text{white-space:pre-wrap;line-height:1.6}
.save-feedback{min-height:1.2em}.save-confirmation{color:var(--vscode-testing-iconPassed,var(--vscode-foreground))}
.region.compact-proof{border:0;margin:0;padding:2px 0}.proof-disclosure{background:none;color:var(--vscode-textLink-foreground);padding:2px 0;margin:0;text-align:left}.reader-notes{margin:14px 0}.reader-notes>summary{cursor:pointer;font-weight:600;padding:4px 0}
.reader-diagram{margin:14px 0}.reader-diagram img{max-width:100%;height:auto;background:white;padding:6px;box-sizing:border-box}.reader-diagram figcaption{margin:4px 0}
.reader-diagram[data-appearance="dark"] img{background:#1e1e1e}.reader-diagram label{display:inline-block;margin-right:8px}
.proof-map{overflow:auto;max-width:100%;margin:12px 0}.proof-map svg{display:block}.proof-map text{cursor:pointer}
${diagramStyle}
</style></head><body><main id="reader" aria-live="polite">Opening ${caption.toLowerCase()}…</main>
<script nonce="${nonce}">${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

function registerOutlines({ vscode, context, register, bridge, show, projectRoot, ordinaryEditor, choosePath, changed, artifactClients, askRetained, recorder, onMaterial, checkDocument }) {
  const panels = new Map(), retainedViews = new Map(), blockedStores = new Set();
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    if (document.isClosed) retainedViews.delete(document.uri.toString());
  }));
  let active, busy = false, focusSerial = 0;
  artifactClients?.push({
    async freeze(allowDirty = false) {
      if (busy) throw new Error('Wait for the current reader action before moving artifacts.');
      for (const c of panels.values()) {
        const dirty = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { c.storageCheck = undefined; reject(new Error('Reader did not confirm its draft state. Keep its text and try again.')); }, 5000);
          c.storageCheck = value => { clearTimeout(timer); c.storageCheck = undefined; resolve(value); };
          c.panel.webview.postMessage({ type: 'storageCheck' });
        });
        if (dirty && !allowDirty) throw new Error('Save the unsaved reader annotations before moving or opening an artifact directory. Your text is retained.');
      }
    },
    async release() {
      for (const c of panels.values()) {
        await c.panel.webview.postMessage({ type: 'storageRelease' });
        try { await send(c, await bridge({ method: 'outline_load', store: c.store, project_root: c.root, id: c.result.outline.id })); }
        catch (error) { await c.panel.webview.postMessage({ type: 'error', message: error.message, writesBlocked: true }); }
      }
    },
  });
  const current = () => {
    const controller = panels.get(active);
    if (!controller) throw new Error('Retain a document as a source or open a saved source first.');
    return controller;
  };
  const request = (c, method, extra = {}) => ({ method, store: c.store, project_root: c.root,
    id: c.result.outline.id, revision: c.result.revision, ...extra });
  const writable = c => {
    if (blockedStores.has(c.store)) throw new Error('Saved source writes are blocked after a failed or uncertain publication. '
      + 'Keep unsaved annotation text and reload the extension host before further private writes.');
  };
  async function locked(action) {
    if (busy) throw new Error('Wait for the current saved source action to finish.');
    busy = true; changed.fire();
    try { await vscode.commands.executeCommand?.('setContext', 'mrw.outlineBusy', true); return await action(); }
    finally { busy = false; changed.fire(); await vscode.commands.executeCommand?.('setContext', 'mrw.outlineBusy', false); }
  }
  async function send(c, result, clearDraft, annotationSaved = false, deletedAnnotation) {
    if (result.blocked) {
      blockedStores.add(c.store);
      throw new Error(`Saved source publication failed: ${result.write_error}. Retained sources remain unchanged. `
        + 'The live view and unsaved annotation text are kept; reload before further private writes.');
    }
    c.result = result;
    try {
      c.notes = await bridge({ method: 'outline_notes', store: c.store, project_root: c.root, id: result.outline.id });
      c.noteError = null;
    } catch (error) { c.notes = null; c.noteError = error.message; }
    if (c.selected === undefined) c.selected = result.outline.regions.at(-1)?.id;
    c.panel.title = `Source: ${result.outline.source.bibliography.title || path.basename(result.outline.source.path)}`;
    await c.panel.webview.postMessage({ type: 'outline', model: result, selected: c.selected, clearDraft, annotationSaved, deletedAnnotation,
      proofsHidden: context.workspaceState.get('mrw.readerProofsHidden.v1', false) === true,
      diagramAppearance: context.workspaceState.get('mrw.diagramAppearance.v2', 'theme'),
      reference: c.reference, readingFocus: c.readingFocus, notes: c.notes?.links || [], noteTargets: c.notes?.targets || {}, noteError: c.noteError, writesBlocked: blockedStores.has(c.store) });
    changed.fire();
    return result;
  }
  async function refresh(c) {
    return send(c, await bridge({ method: 'outline_load', store: c.store, project_root: c.root, id: c.result.outline.id }));
  }
  async function mutate(c, change, clearDraft) {
    writable(c);
    let result;
    try { result = await bridge(request(c, 'outline_mutate', { change })); }
    catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(c.store); throw error; }
    const deleted = change.kind === 'remove_annotation' ? { region: change.region, id: change.id } : undefined;
    const saved = await send(c, result, clearDraft, change.kind === 'annotation', deleted);
    if (change.kind === 'annotation') vscode.window.setStatusBarMessage('MRW: Submitted annotation saved.', 6000);
    if (deleted) vscode.window.setStatusBarMessage('MRW: Reader note deleted.', 6000);
    return saved;
  }
  async function deleteAnnotation(c, value) {
    writable(c);
    const region = value.region === null ? null : c.result.outline.regions.find(r => r.id === value.region);
    if (value.region !== null && !region) throw new Error('Unknown passage.');
    const notes = region ? region.annotations : c.result.outline.annotations;
    const note = notes.find(n => n.id === value.annotation);
    if (!note) throw new Error('Reader note changed; refresh the saved source.');
    const revision = c.result.revision;
    const excerpt = Array.from(note.text.replace(/\s+/gu, ' ').trim()).slice(0, 180).join('');
    const choice = await vscode.window.showWarningMessage(
      `Delete this reader note from ${region?.title || 'Source notes'}?\n${excerpt}`
      + (value.unsaved ? '\nUnsaved edits to this note will also be discarded.' : ''),
      { modal: true }, 'Delete note');
    if (choice !== 'Delete note') return;
    if (c.result.revision !== revision) throw new Error('The saved source changed while confirming deletion; refresh and choose the note again.');
    return mutate(c, { kind: 'remove_annotation', region: value.region, id: note.id });
  }
  async function openDocument(c, artifact = null, pinned) {
    const result = pinned || await bridge(request(c, 'outline_document', { artifact }));
    const uri = await show(artifact ? result.text : result.text.replace(/^\uFEFF/u, ''), artifact ? 'Retained-outline-artifact' : 'Retained-outline-source', undefined,
      { viewColumn: vscode.ViewColumn.One });
    if (!artifact) retainedViews.set(uri.toString(), { id: c.result.outline.id, revision: result.source_revision,
      textRevision: digest(normalize(result.text)) });
    if (pinned) {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.toString() !== uri.toString()) throw new Error('The retained view lost focus; follow the reference again.');
      const range = new vscode.Range(...pinned.start, ...pinned.end);
      if (!editor.document.validateRange(range).isEqual(range)) throw new Error('Referenced retained range is unavailable.');
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }
  async function navigate(c, extra) {
    const result = await bridge(request(c, 'outline_navigation', { region: null, context: null, statement: false, ...extra }));
    if (result.retained) return openDocument(c, null, result);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.path));
    const version = document.version;
    const observed = await sourceSnapshot(result.path);
    if (document.isDirty || document.version !== version || observed.path !== result.path ||
        observed.revision !== result.source_revision || digest(normalize(document.getText())) !== result.text_revision) {
      throw new Error('Original source or editor content changed. The saved source was not remapped; open its retained source.');
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
    if (value.type === 'storageStatus') { c.storageCheck?.(!!value.dirty); return; }
    if (value.type === 'ready') return send(c, c.result);
    if (value.type === 'diagram_appearance') {
      if (!['theme', 'paper', 'dark'].includes(value.value)) return;
      try { await context.workspaceState.update('mrw.diagramAppearance.v2', value.value); }
      catch (error) { void vscode.window.showErrorMessage(`MRW: Could not save the diagram appearance: ${error.message}`); }
      return;
    }
    if (value.type === 'proofVisibility') {
      if (typeof value.hidden !== 'boolean') return;
      recorder?.record('source.visibility',{outline:c.result.outline.id,hidden:value.hidden,meaning:'Exposure opportunity only.'});
      try { await context.workspaceState.update('mrw.readerProofsHidden.v1', value.hidden); }
      catch (error) { void vscode.window.showErrorMessage(`MRW: Could not save the proof visibility preference: ${error.message}`); }
      return;
    }
    if (value.type === 'select') {
      if (c.result.outline.regions.some(r => r.id === value.region)) c.selected = value.region;
      active = c.result.outline.id; onMaterial?.({ root:c.root, outline:c.result.outline.id, region:c.selected }); recorder?.record('navigation.reader_select',{outline:c.result.outline.id,region:c.selected,source_revision:c.result.outline.source.revision}); return;
    }
    if (value.type === 'dirty') { c.panel.title = `${value.dirty ? '• ' : ''}Source: ${c.result.outline.source.bibliography.title || path.basename(c.result.outline.source.path)}`; return; }
    c.pending++;
    recorder?.record('navigation.reader_action',{action:value.type,outline:c.result.outline.id,region:c.selected,source_revision:c.result.outline.source.revision});
    try {
      await locked(async () => {
        active = c.result.outline.id;
        if (value.type === 'ask_ai') await askPassage(c, value);
        else if (value.type === 'edit') await mutate(c, value.change, value.draft);
        else if (value.type === 'delete_annotation') await deleteAnnotation(c, value);
        else if (value.type === 'render_diagram') {
          writable(c);
          let result;
          try { result = await bridge(request(c, 'outline_render_diagram', { annotation: value.annotation, code: value.code })); }
          catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(c.store); throw error; }
          await send(c, result);
          vscode.window.setStatusBarMessage('MRW: Diagram rendered and retained.', 6000);
        }
        else if (value.type === 'toggle') {
          const region = c.result.outline.regions.find(r => r.id === value.region);
          if (!region) throw new Error('Unknown passage.');
          await mutate(c, { kind: 'region', region: region.id, title: region.title, level: region.level, collapsed: !region.collapsed });
        } else if (value.type === 'source') await openDocument(c);
        else if (value.type === 'study_current') { const ref=await bridge(request(c,'outline_reference',{region:c.selected||null})); await vscode.commands.executeCommand('mrw.studyCurrent',{reference:ref.reference}); }
        else if (value.type === 'proof_study') await vscode.commands.executeCommand('mrw.prepareProofStudy');
        else if (value.type === 'reading_return') await vscode.commands.executeCommand('mrw.returnToReadingOutline', { retained: true });
        else if (value.type === 'artifact') await openDocument(c, value.artifact);
        else if (value.type === 'navigate') await navigate(c, { region: value.region, statement: !!value.statement });
        else if (value.type === 'navigate_context') await navigate(c, { context: value.context });
        else if (value.type === 'stacks_reference') {
          const result = await bridge(request(c, c.result.outline.acquisition?.kind === 'kerodon-section' ? 'outline_kerodon_reference' : 'outline_stacks_reference', { tag: value.tag }));
          c.reference = result.reference; c.selected = result.reference.region;
          await send(c, result);
          await openDocument(c, null, result.document);
          await c.panel.webview.postMessage({ type: 'publishedFocus', region: c.selected });
        } else if (value.type === 'stacks_citation') {
          const source = c.result.outline.published;
          const allowed = new Set([source?.tag, source?.chapter_tag, source?.previous?.tag,
            source?.next?.tag, ...(source?.reference_tags || [])]);
          const sourceId = source?.source_id || 'stacks-project';
          const qualified = require('./sourceIdentifiers').qualifiedIdentifier(value.tag) || (/^[A-Z0-9]{4}$/.test(value.tag) ? sourceId + ':' + value.tag : undefined);
          if (!qualified || !qualified.startsWith(sourceId + ':') || !allowed.has(qualified.split(':')[1])) {
            throw new Error('This is not an identified citation in the retained section.');
          }
          if (!await vscode.env.openExternal(vscode.Uri.parse(require('./sourceIdentifiers').canonicalCitation(qualified)))) {
            throw new Error('The canonical source citation could not be opened.');
          }
        }
        else if (value.type === 'published_backlinks') {
          const pub = c.result.outline.published;
          const id = pub?.parts?.[c.selected]?.qualified_tag || pub?.qualified_tag;
          if (!id) throw new Error('This source has no qualified identifier.');
          await vscode.commands.executeCommand('mrw.showBacklinks', id);
        }
        else if (value.type === 'refresh') await refresh(c);
        else if (['copy_link', 'associate_note', 'open_note', 'manage_notes'].includes(value.type)) {
          const target = await readerTarget(c, value);
          await companionAction(value.type, c, target);
        }
        else throw new Error('Unknown reader action.');
      });
    } catch (error) {
      await c.panel.webview.postMessage({ type: 'error', message: error.message, draft: value.draft, writesBlocked: blockedStores.has(c.store) });
      void vscode.window.showErrorMessage(`MRW: ${error.message}`);
    } finally {
      c.pending--;
      if (!c.pending) await c.panel.webview.postMessage({ type: 'idle' });
    }
  }
  async function display(result, store, root, reference = null, presentation = {}) {
    if (result.blocked) { blockedStores.add(store); throw new Error(`Saved source publication failed: ${result.write_error}. Reload before further private writes.`); }
    const id = result.outline.id;
    let c = panels.get(id);
    if (c && (c.store !== store || c.root !== root)) throw new Error('This saved source identity is already open in a different private-storage scope. Close that reader before opening this reference.');
    if (!c) {
      // Restart can leave a stale webview tab focused in the research group.
      // Beside would then keep creating additional empty editor groups.
      const column = [...panels.values()].find(p => p.panel.viewColumn)?.panel.viewColumn || vscode.ViewColumn.Two;
      const panel = vscode.window.createWebviewPanel('mrw.sourceOutline', 'Saved source', column,
        { enableScripts: true, retainContextWhenHidden: true,
          localResourceRoots: [] });
      c = { panel, result, store, root, selected: result.outline.regions.at(-1)?.id, pending: 0 };
      panels.set(id, c);
      context.subscriptions.push(panel, panel.webview.onDidReceiveMessage(value => message(c, value)),
        panel.onDidChangeViewState(event => {
          if (event.webviewPanel.active) active = id;
          if (event.webviewPanel.visible && !c.pending) void panel.webview.postMessage({ type: 'idle' });
        }),
        panel.onDidDispose(() => { panels.delete(id); if (active === id) active = undefined; changed.fire(); }));
      // Trusted bundled code only: no source/annotation text enters this HTML.
      // Inline the nonce script so offline WSL use needs no resource fetch.
      const support = [];
      for (const name of ['media/katex/katex.min.js', 'media/katex/auto-render.min.js', 'src/annotationView.js']) {
        support.push(await fs.readFile(path.join(context.extensionPath, name), 'utf8'));
      }
      if (['stacks-section','kerodon-section'].includes(result.outline.acquisition?.kind)) {
        support.push(await fs.readFile(path.join(context.extensionPath, 'src/stacksView.js'), 'utf8'));
      }
      const diagramStyle = await fs.readFile(path.join(context.extensionPath, 'media', 'diagram-theme.css'), 'utf8');
      panel.webview.html = outlineHtml(await fs.readFile(path.join(context.extensionPath, 'src', 'outlineView.js'), 'utf8'), support, diagramStyle);
    } else c.panel.reveal(c.panel.viewColumn);
    c.reference = reference;
    if (reference) c.selected = reference.region;
    c.readingFocus = presentation.reading ? { serial: ++focusSerial,
      region: reference?.status === 'changed or removed' ? null : reference?.region || null } : undefined;
    active = id;
    onMaterial?.({root:c.root,outline:id,region:c.selected});
    recorder?.record('navigation.source_open',{outline:id,region:c.selected,source_revision:result.outline.source.revision});
    await send(c, result);
    return c;
  }
  async function storage(editor) {
    const root = await projectRoot(editor);
    if (!context.storageUri || context.storageUri.scheme !== 'file') throw new Error('Open a local workspace for private saved sources.');
    return { root, store: path.join(context.storageUri.fsPath, `outlines-${digest(root)}`) };
  }
  async function readerTarget(c, value) {
    if (value.note) {
      const note = c.notes?.links.find(n => n.id === value.note);
      if (!note) throw new Error('Note association missing. Refresh the reader.');
      return { reference: note.reference, label: note.label };
    }
    if (value.pinned) {
      if (!c.reference?.uri) throw new Error('No originally linked passage is open.');
      return { reference: c.reference.uri, label: c.reference.label };
    }
    return bridge(request(c, 'outline_reference', { region: value.region ?? null }));
  }
  async function askPassage(c, value = {}) {
    let region = value.region;
    if (!value.pinned && region === undefined) {
      if (!c.result.outline.regions.length) throw new Error('Add a retained source passage before asking the AI.');
      const choice = await vscode.window.showQuickPick(c.result.outline.regions.map(r => ({
        label: r.title, description: `Lines ${r.span.start_line}:${r.span.start_col}–${r.span.end_line}:${r.span.end_col}`, region: r.id,
      })), { placeHolder: 'Choose the exact retained passage to ask about' });
      if (!choice) return;
      region = choice.region;
    }
    if (!value.pinned && !region) throw new Error('Add or select a retained source passage first.');
    const target = await readerTarget(c, { region, pinned: value.pinned === true });
    const result = await bridge({ method: 'outline_assistance_context', store: c.store,
      project_root: c.root, reference: target.reference });
    await askRetained(result.context, c.root);
  }
  register('mrw.askReader', () => locked(() => askPassage(current())));
  async function chooseTarget(passagesOnly = false, location) {
    const { root, store } = location || await storage();
    const listed = await bridge({ method: 'outline_list', store, project_root: root });
    if (!listed.outlines.length) throw new Error('No saved sources exist for this project.');
    const outline = await vscode.window.showQuickPick(listed.outlines.map(o => ({ label: o.title || path.basename(o.path), description: o.locator || o.path, detail: o.upstream_revision || undefined, id: o.id })),
      { placeHolder: 'Choose a saved source' });
    if (!outline) return;
    const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: outline.id });
    if (passagesOnly && !loaded.outline.regions.length) throw new Error('This source has no passages. Add a passage before importing an annotation.');
    const choice = await vscode.window.showQuickPick([...(passagesOnly ? [] : [{ label: 'Whole saved source', region: null }]),
      ...loaded.outline.regions.map(r => ({ label: r.title, description: `Lines ${r.span.start_line}:${r.span.start_col}–${r.span.end_line}:${r.span.end_col}`, region: r.id }))],
    { placeHolder: passagesOnly ? 'Choose the passage for the imported annotation' : 'Choose a saved source or exact retained passage' });
    if (!choice) return;
    const target = await bridge({ method: 'outline_reference', store, project_root: root, id: outline.id, revision: loaded.revision, region: choice.region });
    const c = await display(loaded, store, root);
    if (passagesOnly) c.selected = choice.region;
    return { c, target, region: choice.region };
  }
  async function companionAction(action, c, target) {
    if (action === 'copy_link') {
      const uri = makeExternal({ workspace: workspaceRoute(vscode, c.root), project: c.root, reference: target.reference }, vscode.env.uriScheme);
      const markdown = `[${target.label}](${uri})`;
      await vscode.env.clipboard.writeText(markdown);
      vscode.window.setStatusBarMessage('MRW link copied. Paste it into the Obsidian note.', 6000);
      return markdown;
    }
    if (c.noteError) throw new Error(`Obsidian associations unavailable: ${c.noteError}. Refresh the reader; retained material remains accessible.`);
    const previousNotes = c.notes;
    const selectedNotes = await bridge({ method: 'outline_notes', store: c.store, project_root: c.root,
      id: c.result.outline.id, reference: target.reference });
    if (selectedNotes.revision !== previousNotes.revision) throw new Error('Obsidian associations changed. Refresh the reader before choosing a linked note.');
    const links = selectedNotes.selected_links;
    let existing;
    if (action === 'open_note' || action === 'manage_notes') {
      if (!links.length) throw new Error('No Obsidian note is linked to this exact target. Choose Link an Obsidian note… in the reader.');
      existing = links.length === 1 ? links[0] : await vscode.window.showQuickPick(links.map(n => ({ ...n, description: n.url })), { placeHolder: 'Choose a linked Obsidian note' });
      if (!existing) return;
      if (action === 'open_note') {
        // Revalidate stored URL through the core immediately before dispatch.
        const fresh = await bridge({ method: 'outline_notes', store: c.store, project_root: c.root, id: c.result.outline.id });
        const selected = fresh.links.find(n => n.id === existing.id && n.reference === existing.reference && n.url === existing.url);
        if (!selected) throw new Error('Note association changed or is missing. Refresh the reader and choose it again.');
        if (!await vscode.env.openExternal(obsidianTarget(vscode, selected.url))) throw new Error('Obsidian could not open the URL. Start Windows Obsidian, then try Open linked note in Obsidian again.');
        vscode.window.setStatusBarMessage('Sent to Obsidian. If it reports a missing note/vault, replace this association using that note’s current Obsidian URL.', 12000);
        return;
      }
    }
    writable(c);
    let choice = 'Replace linked note';
    if (existing) choice = await vscode.window.showQuickPick(['Replace linked note', 'Remove note link'], { placeHolder: existing.label });
    if (!choice) return;
    let url = null, label = null;
    if (choice !== 'Remove note link') {
      url = await vscode.window.showInputBox({ prompt: 'In Obsidian, open the note to link and run “Copy Obsidian URL for current file”. Paste that URL here to link this MRW target.', value: existing?.url || '', ignoreFocusOut: true });
      if (url === undefined) return;
      label = await vscode.window.showInputBox({ prompt: 'Short title or ID of that Obsidian note (navigation label)', value: existing?.label || '', ignoreFocusOut: true });
      if (label === undefined) return;
    }
    let result;
    try {
      result = await bridge({ method: 'outline_update_note', store: c.store, project_root: c.root, id: c.result.outline.id,
        revision: previousNotes.revision, change: { id: existing?.id || null, reference: existing?.reference || target.reference, url, label } });
    } catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(c.store); throw error; }
    if (result.blocked) { blockedStores.add(c.store); throw new Error(`Obsidian association publication failed: ${result.write_error}. Reload before further private writes.`); }
    await send(c, c.result);
  }
  for (const [command, action] of [['mrw.copyOutlineLink', 'copy_link'], ['mrw.associateObsidianNote', 'associate_note'],
    ['mrw.openObsidianNote', 'open_note'], ['mrw.manageObsidianNotes', 'manage_notes']]) {
    register(command, () => locked(async () => { const picked = await chooseTarget(); if (picked) return companionAction(action, picked.c, picked.target); }));
  }
  async function openExternalLink(value) {
    const target = parseExternal(value, vscode.env.uriScheme);
    await bridge({ method: 'outline_parse_reference', reference: target.reference });
    let location;
    for (const folder of vscode.workspace.workspaceFolders || []) {
      if (folder.uri.scheme === 'file' && await fs.realpath(folder.uri.fsPath) === target.project) {
        location = await storage({ document: { uri: folder.uri } }); break;
      }
    }
    if (!location || workspaceRoute(vscode, location.root) !== target.workspace) {
      // Only an explicitly adopted, verified store can translate old routing
      // to this computer. Matching folder names alone never establishes identity.
      location = undefined;
      for (const folder of vscode.workspace.workspaceFolders || []) {
        if (folder.uri.scheme !== 'file') continue;
        const local = await storage({ document: { uri: folder.uri } });
        const match = await bridge({ method: 'artifact_match_reference', reference: target.reference,
          project: target.project, local_root: local.root });
        if (match.matches) { location = local; break; }
      }
      if (!location) return { recovery: target.workspace, link: value };
    }
    const result = await bridge({ method: 'outline_follow_reference', ...{ store: location.store, project_root: location.root }, reference: target.reference });
    const c = await display(result, location.store, location.root, result.reference);
    if (result.document) await openDocument(c, null, result.document);
    return result.reference;
  }
  async function followExternalLink(value) {
    const result = await locked(() => openExternalLink(value));
    if (result?.recovery) {
      // A notification can hide without resolving its promise. Release the
      // reader-action guard before waiting for the user's routing decision.
      const choice = await vscode.window.showWarningMessage(`This MRW link belongs to ${result.recovery}. This window has not resolved its private target. `
        + 'Choose Copy Link and Open Workspace, then run MRW: Open Link from Clipboard. Hidden warnings remain in Notifications.', 'Copy Link and Open Workspace');
      if (choice === 'Copy Link and Open Workspace') {
        await vscode.env.clipboard.writeText(result.link);
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(result.recovery));
      }
      return;
    }
    return result;
  }
  register('mrw.openLinkFromClipboard', async () => {
    const value = (await vscode.env.clipboard.readText()).trim();
    const match = /^\[(?:\\.|[^\\\]])*\]\(([^\s)]+)\)$/u.exec(value);
    return followExternalLink(match ? match[1] : value);
  });
  context.subscriptions.push(vscode.window.registerUriHandler({ handleUri: async uri => {
    try {
      if (!vscode.workspace.isTrusted) throw new Error('Open and trust the intended workspace before following the MRW link.');
      // VS Code's default serializer escapes the whole query, including its
      // '=' and '&' delimiters. Our payload is already restricted to base64url;
      // preserve those delimiters when passing it to the strict URL parser.
      await followExternalLink(uri.toString(true));
    } catch (error) { void vscode.window.showErrorMessage(`MRW: ${error.message}`); }
  } }));
  async function markdown(editor = vscode.window.activeTextEditor) {
    const document = editor?.document;
    if (!document || document.languageId !== 'markdown' || !['file', 'untitled'].includes(document.uri.scheme)) {
      throw new Error('Focus an ordinary Markdown document in this workspace.');
    }
    if (!checkDocument && document.uri.scheme === 'file' && !vscode.workspace.getWorkspaceFolder(document.uri)) {
      throw new Error('The Markdown document must belong to the current workspace.');
    }
    if (document.uri.scheme === 'file' && checkDocument) await checkDocument(document.uri);
    const location = await storage(editor);
    if (!checkDocument && document.uri.scheme === 'file') {
      const relative = path.relative(location.root, await fs.realpath(document.uri.fsPath));
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error('The Markdown document resolves outside this workspace.');
      }
    }
    return { editor, ...location };
  }
  register('mrw.insertOutlineReference', () => locked(async () => {
    const { editor, store, root } = await markdown();
    const document = editor.document, version = document.version, selection = editor.selection;
    const listed = await bridge({ method: 'outline_list', store, project_root: root });
    if (!listed.outlines.length) throw new Error('No saved sources exist for this project.');
    const outline = await vscode.window.showQuickPick(listed.outlines.map(o => ({ label: o.title || path.basename(o.path),
      description: o.locator || o.path, detail: o.upstream_revision || o.revision.slice(0, 12), id: o.id })), { placeHolder: 'Open a saved source' });
    if (!outline) return;
    const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: outline.id });
    const target = await vscode.window.showQuickPick([{ label: 'Whole saved source', region: null },
      ...loaded.outline.regions.map(r => ({ label: r.title,
        description: `Lines ${r.span.start_line}:${r.span.start_col}–${r.span.end_line}:${r.span.end_col} (scalar columns)`, region: r.id }))],
    { placeHolder: 'Choose the whole source or an exact saved passage' });
    if (!target) return;
    const result = await bridge({ method: 'outline_reference', store, project_root: root, id: outline.id,
      revision: loaded.revision, region: target.region });
    if (vscode.window.activeTextEditor !== editor || document.version !== version || !editor.selection.isEqual(selection)) {
      throw new Error('Markdown or cursor changed during selection; no reference was inserted.');
    }
    if (!await editor.edit(edit => edit.insert(selection.active, result.markdown), { undoStopBefore: true, undoStopAfter: true })) {
      throw new Error('VS Code could not insert the source or passage link.');
    }
    return result;
  }));
  async function followReference(reference, originEditor, presentation = {}) {
    return locked(async () => {
    const { editor, store, root } = await markdown(originEditor);
    const document = editor.document, version = document.version, selection = editor.selection;
    const result = await bridge({ method: 'outline_follow_reference', store, project_root: root, reference });
    if (document.isClosed || vscode.window.activeTextEditor !== editor || document.version !== version || !editor.selection.isEqual(selection)) {
      throw new Error('Markdown or cursor changed during navigation; follow the reference again.');
    }
    const c = await display(result, store, root, result.reference, presentation);
    const region = result.outline.regions.find(r => r.id === result.reference.region);
    const part = result.outline.published?.parts?.[region?.id];
    const renderedExact = presentation.reading && result.reference.status === 'unchanged' && part && !region.collapsed &&
      ['source_revision', 'start_line', 'start_col', 'end_line', 'end_col'].every(key => part.span[key] === region.span[key]);
    // Changed/removed associations still open their original pinned text. A
    // current rendered region is used only after the existing resolver accepts it.
    if (result.document && !renderedExact) await openDocument(c, null, result.document);
    return result.reference;
    });
  }
  register('mrw.followOutlineReference', async () => {
    const { editor } = await markdown();
    const line = editor.document.getText().split(/\r\n|\r|\n/)[editor.selection.active.line] || '';
    return followReference(referenceAt(line, editor.selection.active.character), editor);
  });
  async function selection(c) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) throw new Error('Select a nonempty passage in the original or retained text.');
    const document = editor.document, version = document.version, range = editor.selection;
    const retained = retainedViews.get(document.uri.toString());
    if (retained) {
      if (retained.id !== c.result.outline.id || retained.revision !== c.result.outline.source.revision ||
          document.isDirty || digest(normalize(document.getText())) !== retained.textRevision) {
        throw new Error('This view no longer supplies this source’s exact retained text. Open its retained source again.');
      }
    } else {
      ordinaryEditor();
      if (document.isDirty) throw new Error('Save or undo source edits before selecting a retained quotation.');
      const source = await sourceSnapshot(document.uri.fsPath);
      if (source.path !== c.result.outline.source.path || source.revision !== c.result.outline.source.revision ||
          normalize(source.text) !== normalize(document.getText())) {
        throw new Error('Select from this source’s exact original or retained source. Changed source is not remapped.');
      }
    }
    if (document.version !== version || !editor.selection.isEqual(range)) throw new Error('Source selection changed during capture.');
    return { start: point(range.start), end: point(range.end) };
  }
  async function selectedRegion(c) {
    if (c.result.outline.regions.some(r => r.id === c.selected)) return c.selected;
    const region = await vscode.window.showQuickPick(c.result.outline.regions.map(r => ({ label: r.title, id: r.id })),
      { placeHolder: 'Choose the passage to annotate' });
    if (!region) throw new Error('Select a passage first.');
    c.selected = region.id; return region.id;
  }
  register('mrw.importStacksSection', () => locked(async () => {
    const input = await vscode.window.showInputBox({ title: 'Import a Stacks Project section',
      prompt: 'Section tag, stacks-project:TAG or official HTTPS URL. Downloads one pinned source revision.',
      value: 'stacks-project:08ZD', ignoreFocusOut: true,
      validateInput: value => /^(?:(?:stacks-project:)?[A-Za-z0-9]{4}|https:\/\/stacks\.math\.columbia\.edu\/tag\/[A-Za-z0-9]{4}\/?)$/.test(value.trim())
        ? undefined : 'Enter a section tag or its official HTTPS URL, without query or fragment.' });
    if (input === undefined) return;
    const { store, root } = await storage(); writable({ store });
    const download = () => bridge({ method: 'outline_stacks_prepare', store, project_root: root, input }, { timeout: 120000 });
    const prepared = vscode.window.withProgress
      ? await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification,
        title: 'MRW: obtaining one Stacks Project section and its matching source metadata', cancellable: false }, download)
      : await download();
    const destination = await bridge({ method: 'artifact_status' });
    const section = prepared.section;
    const choice = section.limitation ? 'Retain source only' : 'Import section';
    const statements = section.parts.filter(p => p.role === 'statement').length;
    const proofs = section.parts.filter(p => p.role === 'proof').length;
    const confirm = await vscode.window.showWarningMessage(
      'Import The Stacks Project Authors — ' + section.title.slice(0, 200) + ' (stacks-project:' + section.tag + ')?\n'
      + section.chapter.slice(0, 200) + ' · section ' + section.section_number + '\n'
      + 'Git revision: ' + prepared.packet.commit + '\n'
      + 'Destination: ' + destination.location + '\nProject: ' + root + '\n'
      + (section.limitation ? 'Source retained only: ' + section.limitation
        : statements + ' statements and ' + proofs + ' proofs, with exact retained source and explicit citations.')
      + '\nEarlier revisions, annotations and ordinary notes are preserved. No TeX or remote script is executed.',
      { modal: true }, choice);
    if (confirm !== choice) return;
    let result;
    try {
      result = await bridge({ method: 'outline_stacks_import', store, project_root: root,
        ticket: prepared.ticket, packet: prepared.packet });
    } catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(store); throw error; }
    if (result.blocked) {
      blockedStores.add(store);
      throw new Error('Stacks import publication failed: ' + result.write_error
        + '. Existing work is preserved. Reload the host before retrying.');
    }
    const controller = await display(result, store, root);
    await vscode.window.showInformationMessage(result.reused
      ? 'This section at this Git revision was already imported. Its saved annotations and links were kept.'
      : 'Stacks Project section retained. Reading, internal references and annotations work offline. Reopen with MRW: Open Saved Source…');
    return controller.result;
  }));
  register('mrw.importKerodonSection', () => locked(async () => {
    const input = await vscode.window.showInputBox({ title: 'Import a Kerodon section',
      prompt: 'Section or subsection tag, kerodon:TAG or official HTTPS URL. Retains one page snapshot.',
      value: 'kerodon:0004', ignoreFocusOut: true,
      validateInput: value => /^(?:kerodon:)?[A-Za-z0-9]{4}$/.test(value.trim()) || /^https:\/\/kerodon\.net\/tag\/[A-Za-z0-9]{4}\/?$/.test(value.trim()) ? undefined : 'Enter a Kerodon section tag or its official URL.' });
    if (input === undefined) return;
    const { store, root } = await storage(); writable({ store });
    const download = () => bridge({ method: 'outline_kerodon_prepare', store, project_root: root, input }, { timeout: 120000 });
    const prepared = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Obtaining one Kerodon section', cancellable: false }, download);
    const destination = await bridge({ method: 'artifact_status' }), section = prepared.section;
    const confirm = await vscode.window.showWarningMessage('Import Jacob Lurie — ' + section.title + ' (kerodon:' + section.tag + ')?\n'
      + 'Page SHA-256: ' + prepared.source_revision + '\nDestination: ' + destination.location
      + '\nRetains this section page, not its linked subsections. Reading and annotations work offline.', { modal: true }, 'Import section');
    if (confirm !== 'Import section') return;
    let result;
    try { result = await bridge({ method: 'outline_kerodon_import', store, project_root: root, ticket: prepared.ticket, packet: prepared.packet }); }
    catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(store); throw error; }
    if (result.blocked) { blockedStores.add(store); throw new Error('Kerodon import publication failed: ' + result.write_error + '. Existing work is preserved. Reload the host before retrying.'); }
    const controller = await display(result, store, root);
    await vscode.window.showInformationMessage(result.reused ? 'This Kerodon page snapshot is already retained. Its annotations and links were kept.' : 'Kerodon section retained. Reopen with Open Saved Source.');
    return controller.result;
  }));
  register('mrw.importObsidianNote', () => locked(async () => {
    const choice = await vscode.window.showQuickPick([
      { label: 'Retain a source copy', kind: 'source', description: 'Retain a copy for reading, passages and annotations' },
      { label: 'Add text to a passage annotation', kind: 'annotation', description: 'Choose a saved passage; up to 16 KiB of note text' },
      { label: 'Insert text into a Markdown document', kind: 'overview', description: 'Insert Markdown at the document cursor; save with Ctrl+S' },
    ], { placeHolder: 'Where should the imported Markdown text go?' });
    if (!choice) return;
    let overview;
    if (choice.kind === 'overview') {
      let editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown' || !['file', 'untitled'].includes(editor.document.uri.scheme)
          || (editor.document.uri.scheme === 'file' && !vscode.workspace.getWorkspaceFolder(editor.document.uri))) {
        const selected = await vscode.window.showOpenDialog({ title: 'Choose a Markdown document for insertion',
          canSelectFiles: true, canSelectFolders: false, canSelectMany: false, filters: { Markdown: ['md', 'markdown'] } });
        if (!selected?.length) return;
        if (selected[0].scheme !== 'file' || !/\.(md|markdown)$/i.test(selected[0].path)) throw new Error('Choose a Markdown document in this workspace.');
        await markdown({ document: { uri: selected[0], languageId: 'markdown' } });
        const doc = await vscode.workspace.openTextDocument(selected[0]);
        await markdown({ document: doc });
        editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
      }
      await markdown(editor);
      overview = { editor, document: editor.document, version: editor.document.version, selection: editor.selection };
    }
    const destination = choice.kind === 'overview' ? null : await storage(vscode.window.activeTextEditor);
    const selected = await vscode.window.showOpenDialog({ title: 'Import Markdown text', openLabel: 'Import Text',
      canSelectFiles: true, canSelectFolders: false, canSelectMany: false, filters: { Markdown: ['md', 'markdown'] } });
    if (!selected?.length) return;
    const uri = selected[0];
    if (uri.scheme !== 'file' || !/\.(md|markdown)$/i.test(uri.path)) throw new Error('Choose a .md or .markdown note on this workspace host.');
    const savedNote = canonical => {
      if ((vscode.workspace.textDocuments || []).some(d => d.isDirty && d.uri.scheme === 'file'
          && [uri.fsPath, canonical].includes(d.uri.fsPath))) throw new Error('Save the Markdown document’s editor changes before importing its text.');
    };
    savedNote(uri.fsPath);
    const note = await sourceSnapshot(uri.fsPath);
    savedNote(note.path);
    if (!note.text.trim()) throw new Error('The selected note is empty.');
    const unchanged = async () => {
      savedNote(note.path);
      if ((await sourceSnapshot(uri.fsPath)).revision !== note.revision) throw new Error('The note changed during import. Select it again.');
      savedNote(note.path);
    };
    if (choice.kind === 'source') {
      writable(destination);
      let result;
      try { result = await bridge({ method: 'outline_import_note', store: destination.store, project_root: destination.root,
        path: note.path, source_revision: note.revision }); }
      catch (error) { if (error.code !== 'ACTION_REJECTED') blockedStores.add(destination.store); throw error; }
      await display(result, destination.store, destination.root);
      vscode.window.setStatusBarMessage(result.reused ? 'MRW: Opened the saved copy of this note.' : 'MRW: Note imported as a saved source.', 6000);
      return result;
    }
    if (choice.kind === 'annotation') {
      if (Buffer.byteLength(note.text, 'utf8') > 16384) throw new Error('A reader annotation holds up to 16 KiB. Import this note as a saved source or into the document.');
      const picked = await chooseTarget(true, destination);
      if (!picked) return;
      await unchanged();
      const saved = await mutate(picked.c, { kind: 'annotation', region: picked.region, id: null, purpose: 'explanation',
        text: note.text, origin: 'unknown', author: null });
      picked.c.panel.reveal(picked.c.panel.viewColumn);
      await picked.c.panel.webview.postMessage({ type: 'publishedFocus', region: picked.region });
      return saved;
    }
    await unchanged();
    const { editor, document, version, selection } = overview;
    if (document.isClosed || document.version !== version || vscode.window.activeTextEditor !== editor || !editor.selection.isEqual(selection)) {
      throw new Error('The document or cursor changed during import. Run import again at the intended location.');
    }
    if (Buffer.byteLength(document.getText(), 'utf8') + Buffer.byteLength(note.text, 'utf8') > 4 * 1024 * 1024) throw new Error('The combined Markdown document exceeds the 4 MiB navigation limit.');
    const applied = await editor.edit(edit => edit.insert(selection.active, note.text), { undoStopBefore: true, undoStopAfter: true });
    if (!applied) throw new Error('The editor declined the note insertion.');
    vscode.window.setStatusBarMessage('MRW: Note inserted into the document. Save with Ctrl+S.', 6000);
  }));
  async function createFromSelection(invocation){
    const {editor,document,version,range}=invocation;
    if(document.isClosed||document.version!==version)throw new Error('The selected source changed before retention.');
    if (document.isDirty) throw new Error('Save the source before creating an exact saved source.');
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
  }
  register('mrw.createOutline', () => locked(async()=>{const editor=ordinaryEditor();return createFromSelection({editor,document:editor.document,version:editor.document.version,range:editor.selection});}));
  register('mrw.refreshSourceOutline', () => locked(() => refresh(current())));
  register('mrw.openOutline', () => locked(async () => {
    const { store, root } = await storage(vscode.window.activeTextEditor);
    const result = await bridge({ method: 'outline_list', store, project_root: root });
    if (!result.outlines.length) throw new Error('No saved sources exist for this project.');
    const picked = await vscode.window.showQuickPick(result.outlines.map(o => ({ label: o.title || path.basename(o.path),
      description: o.locator || o.path, detail: o.upstream_revision || o.revision.slice(0, 12), id: o.id })), { placeHolder: 'Open a saved source' });
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
    if (!c.result.outline.contexts.length) throw new Error('This source has no shared context to replace.');
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
  const rows = () => [['Open document…', 'mrw.openDocument'], ['Choose notes folder…', 'mrw.chooseNotesFolder'],
    ['Follow document link', 'mrw.followDocumentLink'], ['Show backlinks…', 'mrw.showBacklinks'], ['Reopen document', 'mrw.reopenDocument'], ['New document…', 'mrw.newReadingOverview'], ['Show contents', 'mrw.openReadingOutline'],
    ['Open tutorial', 'mrw.openTutorial'],
    ['Return to document', 'mrw.returnToReadingOutline'], ['Import Stacks Project section…', 'mrw.importStacksSection'], ['Import Kerodon section…', 'mrw.importKerodonSection'],
    ['Import Markdown text…', 'mrw.importObsidianNote'],
    ['Retain document as source', 'mrw.createOutline'], ['Open saved source…', 'mrw.openOutline'],
    ['Copy source or passage link…', 'mrw.copyOutlineLink'], ['Open link from clipboard', 'mrw.openLinkFromClipboard'],
    ['Link an Obsidian note…', 'mrw.associateObsidianNote'],
    ['Insert source or passage link…', 'mrw.insertOutlineReference'], ['Follow source or passage link at cursor', 'mrw.followOutlineReference'],
    ...(panels.has(active) ? [['Refresh saved source', 'mrw.refreshSourceOutline'],
      ['Add selected passage', 'mrw.addOutlineRegion'], ['Use selection as exact statement', 'mrw.setOutlineStatement'],
      ['Replace selected passage range', 'mrw.replaceOutlineRegion'], ['Keep selected hypothesis / cited result', 'mrw.addOutlineContext'],
      ['Replace shared context with selection…', 'mrw.replaceOutlineContext'], ['Attach recorded evidence…', 'mrw.attachOutlineEvidence']] : [])];
  rows.resolveReferenceIdentities = async references => { const {store,root} = await storage(); return bridge({method:'outline_reference_identities',store,project_root:root,references}); };
  rows.studyPassage = async (reference, root) => {
    const store = path.join(context.storageUri.fsPath, `outlines-${digest(root)}`);
    const followed = await bridge({ method: 'outline_follow_reference', store, project_root: root, reference });
    const { context: selected } = await bridge({ method: 'outline_assistance_context', store, project_root: root, reference });
    const pub = followed.outline.published, bib = followed.outline.source.bibliography;
    const url = pub && /^[a-f0-9]{40}$/.test(pub.commit) ? `https://github.com/stacks/stacks-project/blob/${pub.commit}/${pub.source_file}` : bib.reference;
    const part = pub?.parts?.[followed.reference.region];
    return { reference, qualified_id: followed.reference.qualified_id || pub?.qualified_tag, label: part ? `${part.qualified_tag || part.tag} ${part.role} · ${bib.title}` : followed.reference.label, text: selected.text, source_revision: selected.source_revision,
      url, authors: pub?.authors || bib.authors || null, license: pub?.license || null, review: pub ? 'published' : 'awaiting_human_review' };
  };
  rows.selectStudyPassages = async root => {
    const store = path.join(context.storageUri.fsPath, `outlines-${digest(root)}`);
    const listed = await bridge({ method: 'outline_list', store, project_root: root }), choices = [];
    for (const item of listed.outlines) {
      const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: item.id });
      for (const region of loaded.outline.regions) choices.push({ label: region.title, description: item.title || item.path,
        id: item.id, revision: loaded.revision, region: region.id, role: loaded.outline.published?.parts?.[region.id]?.role });
    }
    if (!choices.length) throw new Error('Retain a proof passage before preparing a study.');
    const proofs = choices.filter(c => c.role === 'proof');
    const proof = await vscode.window.showQuickPick(proofs.length ? proofs : choices, { placeHolder: 'Choose the retained proof' });
    if (!proof) return;
    const prerequisites = await vscode.window.showQuickPick(choices.filter(c => c !== proof),
      { canPickMany: true, placeHolder: 'Select prerequisite passages to include; no others will be copied' });
    if (!prerequisites) return;
    if (prerequisites.length > 15) throw new Error('Select at most fifteen prerequisites.');
    const result = [];
    for (const selected of [proof, ...prerequisites]) {
      const target = await bridge({ method: 'outline_reference', store, project_root: root,
        id: selected.id, revision: selected.revision, region: selected.region });
      result.push(await rows.studyPassage(target.reference, root));
    }
    return result;
  };
  rows.selectStudyPrerequisites = async (root,existing) => {
    const store=path.join(context.storageUri.fsPath,`outlines-${digest(root)}`),listed=await bridge({method:'outline_list',store,project_root:root}),choices=[];
    for(const item of listed.outlines){const loaded=await bridge({method:'outline_load',store,project_root:root,id:item.id});
      for(const r of loaded.outline.regions)choices.push({label:r.title,description:item.title||item.path,id:item.id,revision:loaded.revision,region:r.id});}
    const selected=await vscode.window.showQuickPick(choices,{canPickMany:true,placeHolder:'Add explicitly selected prerequisite passages'});if(!selected)return null;
    const result=[];for(const choice of selected){const target=await bridge({method:'outline_reference',store,project_root:root,id:choice.id,revision:choice.revision,region:choice.region});
      if(!existing.some(p=>p.reference===target.reference))result.push(await rows.studyPassage(target.reference,root));}
    if(existing.length+result.length>16)throw new Error('Keep at most sixteen selected passages.');return result;
  };
  rows.currentStudyPassage = async root => {
    const c=panels.get(active); if(!c || c.root!==root)return null;
    const target=await bridge(request(c,'outline_reference',{region:c.selected||null}));
    return rows.studyPassage(target.reference,root);
  };
  rows.loadStudyExample = () => locked(async () => {
    const {store,root}=await storage(vscode.window.activeTextEditor);writable({store});
    const source=await sourceSnapshot(path.join(context.extensionPath,'media/study-example.md'));
    const result=await bridge({method:'outline_import_note',store,project_root:root,path:source.path,source_revision:source.revision});
    const target=await bridge({method:'outline_reference',store,project_root:root,id:result.outline.id,revision:result.revision,region:result.outline.regions[0].id});
    return {root,passage:{...await rows.studyPassage(target.reference,root),authors:'Codex companion (OpenAI)',license:'CC0-1.0'}};
  });
  rows.captureStudySelection = async (root,invocation) => {
    const result=await locked(()=>createFromSelection(invocation));
    if(!result)return null;
    const store=path.join(context.storageUri.fsPath,`outlines-${digest(root)}`);
    const target=await bridge({method:'outline_reference',store,project_root:root,id:result.outline.id,revision:result.revision,region:result.outline.regions.at(-1)?.id||null});
    return rows.studyPassage(target.reference,root);
  };
  rows.followReference = followReference;
  rows.readPinned = (reference, root) => bridge({ method: 'outline_follow_reference',
    store: path.join(context.storageUri.fsPath, `outlines-${digest(root)}`), project_root: root, reference });
  rows.followPinned = (reference, root) => locked(async () => {
    const store = path.join(context.storageUri.fsPath, `outlines-${digest(root)}`);
    const result = await bridge({ method: 'outline_follow_reference', store, project_root: root, reference });
    const c = await display(result, store, root, result.reference, { reading: true });
    if (result.document && result.reference.status !== 'unchanged') await openDocument(c, null, result.document);
    return result.reference;
  });
  return rows;
}

module.exports = { registerOutlines, outlineHtml, normalize };
