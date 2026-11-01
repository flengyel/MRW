'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { sourceSnapshot, digest } = require('./navigation');
const { referenceAt } = require('./outlineReferences');
const { makeExternal, parseExternal, workspaceRoute, obsidianTarget } = require('./companionLinks');

const normalize = text => text.replace(/^\uFEFF/u, '').replace(/\r\n|\r/g, '\n');
const point = p => [p.line, p.character];

function outlineHtml(script, support = []) {
  script = [...support, script].join('\n;\n');
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
.companion{border:1px solid var(--vscode-panel-border);padding:10px;margin:12px 0}.companion h3{margin:0 0 6px}.companion p{margin:6px 0}.companion-directions{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px}.linked-note{font-weight:600;unicode-bidi:plaintext}.linked-note-row{padding:8px 0;border-bottom:1px solid var(--vscode-panel-border)}
.published-content{line-height:1.65;font-size:1.05em;margin:12px 0}.published-math math{font-size:1.15em}.source-reference{display:inline;padding:1px 4px;margin:0 2px}.published-toc{display:flex;flex-wrap:wrap;margin:12px 0}.source-slogan{border-left:2px solid var(--vscode-panel-border);padding:8px;margin:10px 0}
.reading-bar{position:sticky;top:0;z-index:2;background:var(--vscode-editor-background);padding:4px 0}.reading-bar button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);padding:5px 8px}.reader-tools{margin:10px 0 20px}.reader-tools>summary,.passage-tools>summary{cursor:pointer;font-size:.9em;opacity:.8}.region{scroll-margin-top:60px;border:0;border-top:1px solid var(--vscode-panel-border);padding:12px 0;margin:18px 0}.region>h2{font-size:1.15em}.passage-tools{margin:12px 0}.published-content{font-size:1.15em;line-height:1.75}
</style></head><body><main id="reader" aria-live="polite">Opening recorded outline…</main>
<script nonce="${nonce}">${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

function registerOutlines({ vscode, context, register, bridge, show, projectRoot, ordinaryEditor, choosePath, changed, artifactClients }) {
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
    try {
      c.notes = await bridge({ method: 'outline_notes', store: c.store, project_root: c.root, id: result.outline.id });
      c.noteError = null;
    } catch (error) { c.notes = null; c.noteError = error.message; }
    if (c.selected === undefined) c.selected = result.outline.regions.at(-1)?.id;
    c.panel.title = `Outline: ${result.outline.source.bibliography.title || path.basename(result.outline.source.path)}`;
    await c.panel.webview.postMessage({ type: 'outline', model: result, selected: c.selected, clearDraft,
      reference: c.reference, readingFocus: c.readingFocus, notes: c.notes?.links || [], noteTargets: c.notes?.targets || {}, noteError: c.noteError, writesBlocked: blockedStores.has(c.store) });
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
    if (value.type === 'storageStatus') { c.storageCheck?.(!!value.dirty); return; }
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
        else if (value.type === 'reading_return') await vscode.commands.executeCommand('mrw.returnToReadingOutline');
        else if (value.type === 'artifact') await openDocument(c, value.artifact);
        else if (value.type === 'navigate') await navigate(c, { region: value.region, statement: !!value.statement });
        else if (value.type === 'navigate_context') await navigate(c, { context: value.context });
        else if (value.type === 'stacks_reference') {
          const result = await bridge(request(c, 'outline_stacks_reference', { tag: value.tag }));
          c.reference = result.reference; c.selected = result.reference.region;
          await send(c, result);
          await openDocument(c, null, result.document);
          await c.panel.webview.postMessage({ type: 'publishedFocus', region: c.selected });
        } else if (value.type === 'stacks_citation') {
          const source = c.result.outline.published;
          const allowed = new Set([source?.tag, source?.chapter_tag, source?.previous?.tag,
            source?.next?.tag, ...(source?.reference_tags || [])]);
          if (typeof value.tag !== 'string' || !/^[A-Z0-9]{4}$/.test(value.tag) || !allowed.has(value.tag)) {
            throw new Error('This is not an identified citation in the retained section.');
          }
          if (!await vscode.env.openExternal(vscode.Uri.parse('https://stacks.math.columbia.edu/tag/' + value.tag))) {
            throw new Error('The canonical Stacks citation could not be opened.');
          }
        }
        else if (value.type === 'refresh') await send(c, await bridge({ method: 'outline_load', store: c.store, project_root: c.root, id: c.result.outline.id }));
        else if (['copy_link', 'associate_note', 'open_note', 'manage_notes'].includes(value.type)) {
          const target = await readerTarget(c, value);
          await companionAction(value.type, c, target);
        }
        else throw new Error('Unknown reader action.');
      });
    } catch (error) {
      await c.panel.webview.postMessage({ type: 'error', message: error.message, writesBlocked: blockedStores.has(c.store) });
      await vscode.window.showErrorMessage(`MRW: ${error.message}`);
    } finally { await c.panel.webview.postMessage({ type: 'idle' }); }
  }
  async function display(result, store, root, reference = null, presentation = {}) {
    if (result.blocked) { blockedStores.add(store); throw new Error(`Outline publication failed: ${result.write_error}. Reload before further private writes.`); }
    const id = result.outline.id;
    let c = panels.get(id);
    if (c && (c.store !== store || c.root !== root)) throw new Error('This outline identity is already open in a different private-storage scope. Close that reader before opening this reference.');
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
      const support = [];
      if (result.outline.acquisition?.kind === 'stacks-section') {
        for (const name of ['media/katex/katex.min.js', 'src/stacksView.js']) {
          support.push(await fs.readFile(path.join(context.extensionPath, name), 'utf8'));
        }
      }
      panel.webview.html = outlineHtml(await fs.readFile(path.join(context.extensionPath, 'src', 'outlineView.js'), 'utf8'), support);
    } else c.panel.reveal(c.panel.viewColumn);
    c.reference = reference;
    if (reference) c.selected = reference.region;
    c.readingFocus = presentation.reading ? { serial: ++focusSerial,
      region: reference?.status === 'changed or removed' ? null : reference?.region || null } : undefined;
    active = id;
    await send(c, result);
    return c;
  }
  async function storage(editor) {
    const root = await projectRoot(editor);
    if (!context.storageUri || context.storageUri.scheme !== 'file') throw new Error('Open a local workspace for private outlines.');
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
  async function chooseTarget() {
    const { root, store } = await storage();
    const listed = await bridge({ method: 'outline_list', store, project_root: root });
    if (!listed.outlines.length) throw new Error('No saved source outlines exist for this project.');
    const outline = await vscode.window.showQuickPick(listed.outlines.map(o => ({ label: o.title || path.basename(o.path), description: o.locator || o.path, detail: o.upstream_revision || undefined, id: o.id })),
      { placeHolder: 'Choose an existing saved outline' });
    if (!outline) return;
    const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: outline.id });
    const choice = await vscode.window.showQuickPick([{ label: 'Whole retained source outline', region: null },
      ...loaded.outline.regions.map(r => ({ label: r.title, description: `Lines ${r.span.start_line}:${r.span.start_col}–${r.span.end_line}:${r.span.end_col}`, region: r.id }))],
    { placeHolder: 'Choose outline or exact retained passage' });
    if (!choice) return;
    const target = await bridge({ method: 'outline_reference', store, project_root: root, id: outline.id, revision: loaded.revision, region: choice.region });
    const c = await display(loaded, store, root);
    return { c, target };
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
    } catch (error) { await vscode.window.showErrorMessage(`MRW: ${error.message}`); }
  } }));
  async function markdown(editor = vscode.window.activeTextEditor) {
    const document = editor?.document;
    if (!document || document.languageId !== 'markdown' || !['file', 'untitled'].includes(document.uri.scheme)) {
      throw new Error('Focus an ordinary Markdown document in this workspace.');
    }
    if (document.uri.scheme === 'file' && !vscode.workspace.getWorkspaceFolder(document.uri)) {
      throw new Error('The Markdown document must belong to the current workspace.');
    }
    const location = await storage(editor);
    if (document.uri.scheme === 'file') {
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
    if (!listed.outlines.length) throw new Error('No saved source outlines exist for this project.');
    const outline = await vscode.window.showQuickPick(listed.outlines.map(o => ({ label: o.title || path.basename(o.path),
      description: o.locator || o.path, detail: o.upstream_revision || o.revision.slice(0, 12), id: o.id })), { placeHolder: 'Open a retained source outline' });
    if (!outline) return;
    const loaded = await bridge({ method: 'outline_load', store, project_root: root, id: outline.id });
    const target = await vscode.window.showQuickPick([{ label: 'Whole retained source outline', region: null },
      ...loaded.outline.regions.map(r => ({ label: r.title,
        description: `Lines ${r.span.start_line}:${r.span.start_col}–${r.span.end_line}:${r.span.end_col} (scalar columns)`, region: r.id }))],
    { placeHolder: 'Choose the whole outline or an exact saved region' });
    if (!target) return;
    const result = await bridge({ method: 'outline_reference', store, project_root: root, id: outline.id,
      revision: loaded.revision, region: target.region });
    if (vscode.window.activeTextEditor !== editor || document.version !== version || !editor.selection.isEqual(selection)) {
      throw new Error('Markdown or cursor changed during selection; no reference was inserted.');
    }
    if (!await editor.edit(edit => edit.insert(selection.active, result.markdown), { undoStopBefore: true, undoStopAfter: true })) {
      throw new Error('VS Code could not insert the outline reference.');
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
  register('mrw.importStacksSection', () => locked(async () => {
    const input = await vscode.window.showInputBox({ title: 'Import a Stacks Project section',
      prompt: 'Official section URL or four-character tag. This explicit action downloads one pinned source revision.',
      value: '08ZD', ignoreFocusOut: true,
      validateInput: value => /^(?:[A-Za-z0-9]{4}|https:\/\/stacks\.math\.columbia\.edu\/tag\/[A-Za-z0-9]{4}\/?)$/.test(value.trim())
        ? undefined : 'Enter a section tag or its official HTTPS URL, without query or fragment.' });
    if (input === undefined) return;
    const { store, root } = await storage(); writable({ store });
    const download = () => bridge({ method: 'outline_stacks_prepare', store, project_root: root, input }, { timeout: 120000 });
    const prepared = vscode.window.withProgress
      ? await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification,
        title: 'MRW: obtaining one Stacks section and its matching source metadata', cancellable: false }, download)
      : await download();
    const destination = await bridge({ method: 'artifact_status' });
    const section = prepared.section;
    const choice = section.limitation ? 'Retain source only' : 'Import section';
    const statements = section.parts.filter(p => p.role === 'statement').length;
    const proofs = section.parts.filter(p => p.role === 'proof').length;
    const confirm = await vscode.window.showWarningMessage(
      'Import The Stacks Project Authors — ' + section.title.slice(0, 200) + ' (' + section.tag + ')?\n'
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
      : 'Stacks section retained. Reading, internal references and annotations work offline. Reopen with MRW: Open Saved Source Outline…');
    return controller.result;
  }));
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
      description: o.locator || o.path, detail: o.upstream_revision || o.revision.slice(0, 12), id: o.id })), { placeHolder: 'Open a retained source outline' });
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
  const rows = () => [['Open reading outline', 'mrw.openReadingOutline'],
    ['Return to reading outline', 'mrw.returnToReadingOutline'], ['Import Stacks section…', 'mrw.importStacksSection'],
    ['Create outline from saved source', 'mrw.createOutline'], ['Open saved source outline…', 'mrw.openOutline'],
    ['Copy outline or passage link…', 'mrw.copyOutlineLink'], ['Open link from clipboard', 'mrw.openLinkFromClipboard'],
    ['Link an Obsidian note…', 'mrw.associateObsidianNote'],
    ['Insert outline reference…', 'mrw.insertOutlineReference'], ['Follow outline reference at cursor', 'mrw.followOutlineReference'],
    ...(panels.has(active) ? [['Add selected source region', 'mrw.addOutlineRegion'], ['Use selection as exact statement', 'mrw.setOutlineStatement'],
      ['Replace selected region range', 'mrw.replaceOutlineRegion'], ['Keep selected hypothesis / cited result', 'mrw.addOutlineContext'],
      ['Replace shared context with selection…', 'mrw.replaceOutlineContext'], ['Attach recorded evidence…', 'mrw.attachOutlineEvidence']] : [])];
  rows.followReference = followReference;
  return rows;
}

module.exports = { registerOutlines, outlineHtml, normalize };
