'use strict';

const vscode = require('vscode');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { runBridge } = require('./bridge');
const { registerAssistance } = require('./assistance');
const { registerOutlines } = require('./outlines');
const { sourceSnapshot, digest, protectedText, validateMarker, httpsViewer } = require('./navigation');

function activate(context) {
  const documents = new Map();
  const reviewDocuments = new Map();
  const changed = new vscode.EventEmitter();
  // Restored virtual tabs can outlive an extension host. Never reuse their URI
  // for a new preview or a different retained-record review.
  const session = randomUUID();
  let serial = 0, reviewGeneration = 0, currentReview;
  const register = (name, action) => context.subscriptions.push(
    vscode.commands.registerCommand(name, async () => {
      try {
        if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
        return await action();
      } catch (error) { await vscode.window.showErrorMessage(`MRW: ${error.message}`); }
    }));
  const bridge = (request, options) => {
    if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
    return runBridge(context.extensionPath,
      vscode.workspace.getConfiguration('mrw').get('pythonExecutable', 'python3'), request, options);
  };
  const provider = {
    provideTextDocumentContent: uri => documents.get(uri.toString()) ??
      'This research view is no longer available. Open the retained record again, or prepare a new request preview.',
  };
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('mrw-record', provider));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    // VS Code also emits this event when only the language changes; the live
    // document remains open. Its content and exact review identity still apply.
    if (!document.isClosed) return;
    if (document.uri.scheme === 'mrw-record') documents.delete(document.uri.toString());
    reviewDocuments.delete(document.uri.toString());
  }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
    const record = editor && reviewDocuments.get(editor.document.uri.toString());
    if (record) { currentReview = record; changed.fire(); }
    else if (editor?.document.uri.scheme === 'mrw-record' && !documents.has(editor.document.uri.toString())) {
      currentReview = undefined; changed.fire();
    }
  }));
  async function show(body, title, record, presentation = {}) {
    const uri = vscode.Uri.from({ scheme: 'mrw-record', path: `/${session}/${++serial}/${title}.txt` });
    documents.set(uri.toString(), body);
    if (record) reviewDocuments.set(uri.toString(), record);
    let document = await vscode.workspace.openTextDocument(uri);
    document = await vscode.languages.setTextDocumentLanguage(document, 'plaintext');
    documents.set(uri.toString(), body);
    if (record) reviewDocuments.set(uri.toString(), record);
    // Reuse an existing research-view group. Repeated previews/comparisons must
    // not keep splitting the host when their own view already has focus.
    const activeEditor = vscode.window.activeTextEditor;
    const existing = activeEditor?.document.uri.scheme === 'mrw-record' ? activeEditor :
      vscode.window.visibleTextEditors?.find(editor => editor.document.uri.scheme === 'mrw-record');
    await vscode.window.showTextDocument(document, { preview: false,
      viewColumn: presentation.viewColumn ?? existing?.viewColumn ?? vscode.ViewColumn.Beside });
    return uri;
  }
  async function choosePath(title, directory = false) {
    const choices = await vscode.window.showOpenDialog({ title, canSelectMany: false,
      canSelectFiles: !directory, canSelectFolders: directory });
    if (!choices) return undefined;
    if (choices[0].scheme !== 'file') throw new Error('Select a local file on the extension host.');
    return choices[0].fsPath;
  }
  function ordinaryEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme !== 'file' ||
        /\.(ipynb|pdf)$/i.test(editor.document.uri.path) || protectedText(editor.document.getText())) {
      throw new Error('Focus an ordinary text source or note. Use Inspect for retained records.');
    }
    return editor;
  }
  async function projectRoot(editor) {
    let folder = editor && vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!folder) {
      const folders = vscode.workspace.workspaceFolders || [];
      if (folders.length === 1) folder = folders[0];
      else if (folders.length > 1) folder = await vscode.window.showWorkspaceFolderPick();
    }
    if (!folder || folder.uri.scheme !== 'file') throw new Error('Open a local project folder.');
    return fs.realpath(folder.uri.fsPath);
  }
  const markerKey = root => `mrw.return.v1.${digest(root)}`;
  function savedMarkers() {
    return context.workspaceState.keys().filter(key => key.startsWith('mrw.return.v1.'))
      .map(key => ({ key, marker: context.workspaceState.get(key) }));
  }
  async function chooseMarker() {
    const markers = savedMarkers();
    if (!markers.length) throw new Error('No return location is marked in this workspace.');
    if (markers.length === 1) return markers[0];
    return vscode.window.showQuickPick(markers.map(item => ({ ...item,
      label: item.marker.path, description: item.marker.preview })), { placeHolder: 'Choose a return location' });
  }
  async function markEditor(editor) {
    const document = editor.document;
    if (document.isDirty) throw new Error('Save the source before marking a return location.');
    const version = document.version;
    const selection = editor.selection;
    const root = await projectRoot(editor);
    const snapshot = await sourceSnapshot(document.uri.fsPath);
    if (document.isDirty || document.version !== version || snapshot.text !== document.getText()) {
      throw new Error('Source changed while marking. Save or reload it, then mark again.');
    }
    const marker = { version: 1, root, path: snapshot.path, revision: snapshot.revision,
      textRevision: snapshot.textRevision,
      start: [selection.start.line, selection.start.character],
      end: [selection.end.line, selection.end.character],
      preview: Array.from(document.getText(selection).replace(/\s+/gu, ' ').trim()).slice(0, 120).join('') };
    await context.workspaceState.update(markerKey(root), marker);
    changed.fire();
    vscode.window.setStatusBarMessage(`MRW return: ${path.basename(marker.path)}:${marker.start[0] + 1}`, 5000);
    return marker;
  }
  async function returnToMarker() {
    const selected = await chooseMarker();
    if (!selected) return;
    const marker = validateMarker(selected.marker);
    if (markerKey(marker.root) !== selected.key) throw new Error('Saved project identity is invalid.');
    const snapshot = await sourceSnapshot(marker.path);
    if (snapshot.path !== marker.path || snapshot.revision !== marker.revision) {
      throw new Error('Marked source changed or moved. The saved location is retained; no replacement was guessed.');
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(marker.path));
    if (document.isDirty || digest(document.getText()) !== marker.textRevision) {
      throw new Error('Marked source has unsaved or changed editor content. Save or undo it before returning.');
    }
    const range = new vscode.Range(...marker.start, ...marker.end);
    if (!document.validateRange(range).isEqual(range)) throw new Error('Marked range is unavailable.');
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
  async function review(request) {
    const generation = ++reviewGeneration;
    const result = await bridge(request);
    if (generation !== reviewGeneration) return;
    currentReview = { path: request.path, revision: result.revision,
      number: request.mode === 'passage' ? request.number : undefined };
    changed.fire();
    await show(result.body, 'Response-review', currentReview);
  }
  function requireReview() {
    if (!currentReview) throw new Error('Open a completed ModelCall with Review Model Response first.');
    return { ...currentReview };
  }
  async function numberInput(prompt, value = 1) {
    const answer = await vscode.window.showInputBox({ prompt, value: String(value),
      validateInput: text => /^[1-9][0-9]*$/.test(text) && Number.isSafeInteger(Number(text)) ? undefined : 'Enter a positive integer.' });
    return answer === undefined ? undefined : Number(answer);
  }
  register('mrw.mark', () => markEditor(ordinaryEditor()));
  register('mrw.return', returnToMarker);
  register('mrw.clearMark', async () => {
    const selected = await chooseMarker();
    if (!selected) return;
    await context.workspaceState.update(selected.key, undefined);
    changed.fire();
  });
  register('mrw.openProof', async () => {
    const origin = ordinaryEditor();
    const proof = await choosePath('Open Lean proof');
    if (!proof) return;
    if (path.extname(proof).toLowerCase() !== '.lean') throw new Error('Select a .lean source file.');
    const line = await numberInput('Line to inspect in the Lean source', 1);
    if (line === undefined) return;
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(proof));
    if (line > document.lineCount) throw new Error('The selected line is outside this Lean source.');
    await markEditor(origin);
    const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    const point = new vscode.Position(line - 1, 0);
    editor.selection = new vscode.Selection(point, point);
    editor.revealRange(new vscode.Range(point, point), vscode.TextEditorRevealType.InCenter);
  });
  register('mrw.openViewer', async () => {
    const origin = ordinaryEditor();
    const url = httpsViewer(vscode.workspace.getConfiguration('mrw').get('proofViewerUrl'));
    await markEditor(origin);
    if (!await vscode.env.openExternal(vscode.Uri.parse(url))) throw new Error('The external viewer could not be opened; the return location is retained.');
  });
  register('mrw.inspect', async () => {
    const options = [
      { label: 'ModelCall (any terminal outcome)', format: 'terminal_call' },
      { label: 'Response projection', format: 'projection' },
      { label: 'Verification and matching bundle', format: 'verification' },
      { label: 'Documentary warrant package', format: 'documentary_package' },
    ];
    const choice = await vscode.window.showQuickPick(options, { placeHolder: 'Choose the retained record kind' });
    if (!choice) return;
    const file = await choosePath('Inspect retained record', choice.format === 'documentary_package');
    if (!file) return;
    const request = { method: 'inspect', path: file, format: choice.format };
    if (choice.format === 'verification') {
      request.companion = await choosePath('Select the exact bundle described by this Verification');
      if (!request.companion) return;
    }
    const result = await bridge(request);
    const sections = choice.format === 'terminal_call' ? '' :
      result.sections.map(([heading, content]) => `${heading}\n${content}`).join('\n\n');
    await show(sections ? `${result.body}\n\n${sections}` : result.body, 'Retained-record');
  });
  register('mrw.review', async () => {
    const file = await choosePath('Review a completed ModelCall');
    if (file) await review({ method: 'review', path: file, mode: 'index', number: 1 });
  });
  for (const [command, mode] of [['mrw.passage', 'passage'], ['mrw.index', 'index'], ['mrw.fullResponse', 'full']]) {
    register(command, async () => {
      const record = requireReview();
      const number = mode === 'full' ? 1 : await numberInput(mode === 'index' ? 'First passage on this index page' : 'Passage number', record.number || 1);
      if (number !== undefined) await review({ method: 'review', path: record.path, revision: record.revision, mode, number });
    });
  }
  register('mrw.retain', async () => {
    const record = requireReview();
    if (!record.number) throw new Error('Show a response passage before retaining it.');
    const destination = await vscode.window.showSaveDialog({ title: 'Retain exact passage as a new immutable projection', filters: { JSON: ['json'] } });
    if (!destination) return;
    if (destination.scheme !== 'file') throw new Error('Choose a local destination.');
    await bridge({ method: 'project', path: record.path, revision: record.revision,
      number: record.number, destination: destination.fsPath });
    await vscode.window.showInformationMessage(`Retained ${path.basename(destination.fsPath)}. No premise or mathematical verification was created.`);
  });
  register('mrw.insert', async () => {
    const record = requireReview();
    if (!record.number) throw new Error('Show a response passage before inserting it.');
    const editor = ordinaryEditor();
    const document = editor.document, version = document.version;
    const selection = editor.selection;
    if (document.uri.fsPath === record.path) throw new Error('Choose an ordinary work note, not the ModelCall.');
    const result = await bridge({ method: 'contribution', path: record.path, revision: record.revision, number: record.number });
    if (document.isClosed || document.version !== version || vscode.window.activeTextEditor !== editor || !editor.selection.isEqual(selection)) {
      throw new Error('The note or selection changed during preparation. Invoke insertion again at the intended location.');
    }
    // Insert at the cursor; never replace selected work or save the note automatically.
    const applied = await editor.edit(edit => edit.insert(selection.active, result.body), { undoStopBefore: true, undoStopAfter: true });
    if (!applied) throw new Error('The editor declined the insertion. The note was not saved.');
  });
  const assistanceRows = registerAssistance({ vscode, context, register, bridge, show, projectRoot, changed, review,
    ordinaryEditor, choosePath, getReview: () => currentReview && { ...currentReview } });
  const outlineRows = registerOutlines({ vscode, context, register, bridge, show, projectRoot, changed, ordinaryEditor, choosePath });
  const tree = {
    onDidChangeTreeData: changed.event,
    getChildren: () => {
      const rows = [
        ...assistanceRows(),
        ...outlineRows(),
        ...savedMarkers().map(({ marker }) => [`Return: ${path.basename(marker.path)}:${marker.start[0] + 1} ${marker.preview}`, 'mrw.return']),
        ['Open Lean proof…', 'mrw.openProof'],
        ['Open external proof viewer', 'mrw.openViewer'], ['Inspect retained record…', 'mrw.inspect'],
        ['Review model response…', 'mrw.review'],
      ];
      if (currentReview) rows.push([`Review: ${path.basename(currentReview.path)}${currentReview.number ? ` · passage ${currentReview.number}` : ''}`, 'mrw.passage'], ['Show index page…', 'mrw.index'],
        ['Show full response', 'mrw.fullResponse'], ['Retain shown passage…', 'mrw.retain'],
        ['Insert shown passage into active note', 'mrw.insert']);
      return rows.map(([label, command]) => ({ label, command }));
    },
    getTreeItem: row => {
      const item = new vscode.TreeItem(row.label);
      if (row.command) item.command = { command: row.command, title: row.label };
      return item;
    },
  };
  context.subscriptions.push(changed, vscode.window.registerTreeDataProvider('mrw.research', tree));
  // Activation registers UI only: no source reads, writes, subprocess or network.
}

module.exports = { activate };
