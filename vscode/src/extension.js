'use strict';

const vscode = require('vscode');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { runBridge } = require('./bridge');
const { registerAssistance } = require('./assistance');
const { registerOutlines } = require('./outlines');
const { registerReadingOutline } = require('./readingOutline');
const { registerProofGraph } = require('./proofGraph');
const { registerProofStudy } = require('./proofStudy');
const { createArtifactStorage } = require('./artifactStorage');
const { sourceSnapshot, digest, protectedText, validateMarker, httpsViewer } = require('./navigation');

const researchTooltips = Object.freeze({
  "mrw.prepareProofStudy": "Select a retained proof and prerequisite passages, then save one exact handoff for Codex.",
  "mrw.resumeProofStudy": "Reopen the saved study question, handoff and proposed outline.",
  "mrw.ask": "Use the selected editor text to prepare a question for the AI model. Review the request before choosing Send exact preview.",
  "mrw.addContext": "Include the current editor selection in the unsent AI request and update its preview.",
  "mrw.removeContext": "Choose a quoted passage to remove from the unsent AI request, then update its preview.",
  "mrw.editQuestion": "Change the question in the unsent AI request and update its preview.",
  "mrw.previewRequest": "Display the question, quoted passages and model that will be sent. Sending is a separate action.",
  "mrw.discardRequest": "Discard the unsent request and its preview. Saved response records remain available.",
  "mrw.sendRequest": "Send the currently displayed request preview to the chosen AI model and retain the returned outcome. Requires a configured API key.",
  "mrw.continueAnswer": "Choose passages from a completed AI response and prepare one follow-up question. Review the preview before sending.",
  "mrw.selectPriorPassages": "Choose which numbered passages from the earlier AI response to include in the follow-up request.",
  "mrw.editCorrection": "Edit a correction, changed assumption or alternative for the follow-up request or active investigation. Use Save human task summary to save investigation edits.",
  "mrw.editConclusion": "Edit the last useful conclusion for the follow-up request or active investigation. Use Save human task summary to save investigation edits.",
  "mrw.editIssue": "Edit the unresolved issue for the follow-up request or active investigation. Use Save human task summary to save investigation edits.",
  "mrw.resumeInvestigation": "Reopen this project's saved investigation and show its current question, task summary and request status.",
  "mrw.editInvestigationQuestion": "Change the active investigation's mathematical question. Use Save human task summary to save the change.",
  "mrw.saveInvestigationSummary": "Save the active investigation's edited question, correction, last useful conclusion and unresolved issue.",
  "mrw.insertInvestigationHandoff": "Insert the investigation's current task summary and record references at the active note's cursor. Save the note with Ctrl+S.",
  "mrw.reviewInvestigationParent": "Review the earlier AI response used to start this investigation, beginning with its numbered passage index.",
  "mrw.reviewInvestigationChild": "Review the completed response to this investigation's follow-up request, beginning with its numbered passage index.",
  "mrw.endInvestigation": "Close the active investigation after choosing whether to insert its task summary into a note. Response records remain saved.",
  "mrw.newReadingOverview": "Choose a filename and create a Markdown overview with headings for your question, sources, notes and next step.",
  "mrw.openReadingOutline": "Show headings and source links from the active or last chosen Markdown overview. Choose a file if needed.",
  "mrw.openTutorial": "Read the bundled guide to source reading, annotations, links and saved-work directories.",
  "mrw.returnToReadingOutline": "Open the rendered reading overview. When a source link opened the reader, return to that exact link; otherwise reopen the selected overview or choose one.",
  "mrw.importStacksSection": "Enter a Stacks Project tag or URL to download and retain that section at a recorded Git revision.",
  "mrw.importObsidianNote": "Choose a Markdown note and import it as a saved source, a passage annotation, or text at the reading overview’s cursor.",
  "mrw.createOutline": "Retain the active saved text, Markdown or TeX file as a source outline. A selected passage becomes its first region.",
  "mrw.openOutline": "Choose one of this project's saved sources and open its retained text, passages and annotations.",
  "mrw.openProofOutline": "Open a proof graph with attributed summaries, joint premises, source links and reversible vertex deletion.",
  "mrw.refreshSourceOutline": "Reload saved annotations and source status in the open source reader. Unsaved annotation text stays in its editing form.",
  "mrw.copyOutlineLink": "Choose a saved source or passage and copy its Markdown link for use in an overview or Obsidian note.",
  "mrw.openLinkFromClipboard": "Read an MRW source link from the clipboard and open its saved outline or passage.",
  "mrw.associateObsidianNote": "Choose a saved source or passage, then paste an Obsidian note URL to add a return link from MRW to that note.",
  "mrw.insertOutlineReference": "Choose a saved source or passage and insert its Markdown link at the active overview's cursor.",
  "mrw.followOutlineReference": "Follow the MRW source link at the editor cursor to its saved outline or passage.",
  "mrw.addOutlineRegion": "Add the current source selection as a passage in the open source outline.",
  "mrw.setOutlineStatement": "Mark the current source selection as the exact statement for a chosen outline region.",
  "mrw.replaceOutlineRegion": "Replace a chosen outline region's source range with the current source selection.",
  "mrw.addOutlineContext": "Keep the selected source quotation as a hypothesis, definition, assumption, cited result or reference alongside the outline.",
  "mrw.replaceOutlineContext": "Choose a shared context quotation and replace its source range with the current selection.",
  "mrw.attachOutlineEvidence": "Choose a saved evidence record or supporting text file and associate it with the source or selected passage.",
  "mrw.artifactLocation": "Show the directory holding this workspace's saved MRW sources, outlines, annotations and investigation records.",
  "mrw.moveArtifactDirectory": "Transfer this workspace's saved MRW records to a chosen directory and reconnect the workspace to it.",
  "mrw.openArtifactDirectory": "Connect this workspace to saved MRW records in a chosen directory. Files stay in that directory.",
  "mrw.prepareFolderRename": "Place saved MRW work outside the study folder before you rename that folder with your file tools.",
  "mrw.reconnectRenamedFolder": "After renaming a study folder, select its prepared saved work and connect it to the folder now open.",
  "mrw.return": "Choose a saved return location and jump back to its editor selection.",
  "mrw.openProof": "Choose a Lean file and line to open beside your work. MRW saves your current editor location for return.",
  "mrw.openViewer": "Open the proof viewer URL configured in MRW settings and save your current editor location for return.",
  "mrw.inspect": "Choose a saved response, projection, verification bundle or documentary package to inspect its contents and attribution.",
  "mrw.review": "Choose a completed AI response record and open its numbered passage index.",
  "mrw.passage": "Choose a numbered passage from the AI response currently under review.",
  "mrw.index": "Show a page of numbered passages from the response under review, starting at a passage number you choose.",
  "mrw.fullResponse": "Display the complete saved AI response currently under review.",
  "mrw.retain": "Save the displayed response passage as a separate record, keeping its source and AI attribution.",
  "mrw.insert": "Insert the displayed response passage with its attribution at the active note's cursor. Save the note with Ctrl+S."
});

function activate(context) {
  const documents = new Map();
  const reviewDocuments = new Map();
  const changed = new vscode.EventEmitter();
  // Restored virtual tabs can outlive an extension host. Never reuse their URI
  // for a new preview or a different retained-record review.
  const session = randomUUID();
  let serial = 0, reviewGeneration = 0, currentReview;
  const register = (name, action) => context.subscriptions.push(
    vscode.commands.registerCommand(name, async (...args) => {
      try {
        if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
        return await action(...args);
      } catch (error) { void vscode.window.showErrorMessage(`MRW: ${error.message}`); }
    }));
  const rawBridge = (request, options) => {
    if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
    return runBridge(context.extensionPath,
      vscode.workspace.getConfiguration('mrw').get('pythonExecutable', 'python3'), request, options);
  };
  const artifactClients = [];
  const artifactStorage = createArtifactStorage({ vscode, context, rawBridge });
  const bridge = artifactStorage.bridge;
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
    ordinaryEditor, choosePath, getReview: () => currentReview && { ...currentReview }, artifactClients });
  const outlineRows = registerOutlines({ vscode, context, register, bridge, show, projectRoot, changed, ordinaryEditor, choosePath, artifactClients,
    askRetained: assistanceRows.askRetained });
  registerReadingOutline({ vscode, context, register, followReference: outlineRows.followReference });
  registerProofGraph({ vscode, context, register, bridge: rawBridge, projectRoot, choosePath, show,
    askProof: assistanceRows.askProof, followPinned: outlineRows.followPinned, readPinned: outlineRows.readPinned });
  artifactStorage.registerCommands({ register, clients: artifactClients, projectRoot, changed });
  registerProofStudy({ vscode, context, register, bridge: rawBridge, projectRoot, choosePath,
    selectPassages: outlineRows.selectStudyPassages, readPassage: outlineRows.studyPassage });
  const tree = {
    onDidChangeTreeData: changed.event,
    getChildren: () => {
      const rows = [
        ...assistanceRows(),
        ...outlineRows(),
        ['Open proof outline…', 'mrw.openProofOutline'],
        ['Prepare proof study…', 'mrw.prepareProofStudy'], ['Resume proof study', 'mrw.resumeProofStudy'],
        ['Show saved artifact location', 'mrw.artifactLocation'],
        ['Move saved work directory…', 'mrw.moveArtifactDirectory'],
        ['Open saved work directory…', 'mrw.openArtifactDirectory'],
        ['Prepare folder rename…', 'mrw.prepareFolderRename'],
        ['Reconnect saved work after folder rename…', 'mrw.reconnectRenamedFolder'],
        ...savedMarkers().map(({ marker }) => [`Return: ${path.basename(marker.path)}:${marker.start[0] + 1} ${marker.preview}`, 'mrw.return']),
        ['Open Lean proof…', 'mrw.openProof'],
        ['Open external proof viewer', 'mrw.openViewer'], ['Inspect retained record…', 'mrw.inspect'],
        ['Review model response…', 'mrw.review'],
      ];
      if (currentReview) rows.push([`Review: ${path.basename(currentReview.path)}${currentReview.number ? ` · passage ${currentReview.number}` : ''}`, 'mrw.passage'], ['Show index page…', 'mrw.index'],
        ['Show full response', 'mrw.fullResponse'], ['Retain shown passage…', 'mrw.retain'],
        ['Insert shown passage into active note', 'mrw.insert']);
      return rows.sort(([a], [b]) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map(([label, command, tooltipKey = command]) => ({ label, command, tooltip: researchTooltips[tooltipKey] }));
    },
    getTreeItem: row => {
      const item = new vscode.TreeItem(row.label);
      item.tooltip = row.tooltip;
      if (row.command) item.command = { command: row.command, title: row.label };
      return item;
    },
  };
  context.subscriptions.push(changed, vscode.window.registerTreeDataProvider('mrw.research', tree));
  // Activation registers UI only: no source reads, writes, subprocess or network.
}

module.exports = { activate };
