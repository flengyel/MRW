'use strict';

const {registerLeanStudy}=require('./leanStudy');
const hostVscode = require('vscode');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { runBridge } = require('./bridge');
const { registerAssistance } = require('./assistance');
const { registerOutlines } = require('./outlines');
const { registerSourcePlugins } = require('./sourcePlugins');
const { registerReadingOutline } = require('./readingOutline');
const { registerProofGraph } = require('./proofGraph');
const { registerProofStudy } = require('./proofStudy');
const { registerActiveStudy } = require('./activeStudy');
const { StudyHistory } = require('./studyHistory');
const { createArtifactStorage } = require('./artifactStorage');
const { sourceSnapshot, digest, protectedText, validateMarker, httpsViewer } = require('./navigation');

let deactivateAction=async()=>{};
function activate(nativeContext) {
  const moveHost=require("./workspaceMoveHost");
  const moveSession=moveHost.session(hostVscode,nativeContext);
  const context=moveSession.context;
  let recorder;
  if(moveSession.blocked){
    moveHost.registerWorkspaceMove({vscode:hostVscode,context,session:moveSession,register:(id,fn)=>context.subscriptions.push(hostVscode.commands.registerCommand(id,async()=>{try{return await fn();}catch(e){void hostVscode.window.showErrorMessage(e.message);}}))});
    void hostVscode.window.showWarningMessage("MRW workspace relocation needs attention. Run MRW: Recover Workspace Move.");
    return {extendMarkdownIt:md=>md};
  }
  // Only MRW sees this facade; no instrumentation of other extensions' dialogs.
  const dialogs=new Set(['showInputBox','showQuickPick','showOpenDialog','showSaveDialog','showWarningMessage']);
  const nativeWindow=moveHost.guardWindow(hostVscode.window,moveSession);
  const windowFacade=new Proxy({},{get(_target,key){
    const value=Reflect.get(nativeWindow,key,nativeWindow);
    if(!dialogs.has(key)||typeof value!=='function')return value;
    return async(...args)=>{const result=await value.apply(nativeWindow,args);
      if(result===undefined||Array.isArray(result)&&!result.length)recorder?.operations.cancel();return result;};
  }});
  const workspaceFacade=moveHost.hostFacade(hostVscode.workspace,{get(target,key){const value=target[key];if(typeof value==='function'&&String(key).startsWith('onDid'))return(fn,...args)=>value.call(target,moveSession.guardEvent(fn),...args);return typeof value==='function'?value.bind(target):value;}});
  const vscode={...hostVscode,workspace:workspaceFacade,window:windowFacade};
  // Welcome buttons disappear when a tree gains rows or a message. Keep this
  // native command view empty so document/study updates never replace buttons.
  context.subscriptions.push(vscode.window.registerTreeDataProvider('mrw.commands', {
    getChildren: () => [], getTreeItem: item => item,
  }));
  const documents = new Map();
  const reviewDocuments = new Map();
  const changed = new vscode.EventEmitter();
  // Restored virtual tabs can outlive an extension host. Never reuse their URI
  // for a new preview or a different retained-record review.
  const session = randomUUID();
  let serial = 0, reviewGeneration = 0, currentReview;
  const software=JSON.parse(require('node:fs').readFileSync(path.join(context.extensionPath,'media/build-info.json'),'utf8'));
  recorder=new StudyHistory(path.join(context.storageUri?.fsPath||context.globalStorageUri?.fsPath||'/tmp/mrw-unavailable-storage','study-history-v1'),software,{origin:context.extensionMode!==undefined&&context.extensionMode===vscode.ExtensionMode?.Test?'automated_test':context.extensionMode!==undefined&&context.extensionMode===vscode.ExtensionMode?.Development?'developer_fixture':'production',onGap:message=>vscode.window.setStatusBarMessage?.('MRW: '+message)});
  if(context.globalStorageUri?.fsPath)recorder.shared=new (require('./sharedHistory').SharedHistory)(path.join(recorder.directory,'sharing-v1'),path.join(context.globalStorageUri.fsPath,'history-host-v1'),{onStatus:message=>{if(message)vscode.window.setStatusBarMessage?.('MRW: '+message);}});
  context.subscriptions.push({dispose(){void recorder.close();}});
  let currentMaterial;
  const onMaterial=value=>{currentMaterial=value;};
  const registered=[];
  const register = (name, action) => {registered.push(name);return context.subscriptions.push(
    vscode.commands.registerCommand(name, async (...args) => {
      try {
        if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
        if(['mrw.moveWorkspace','mrw.recoverWorkspaceMove'].includes(name))return await action(...args);
        return await moveSession.run(async()=>{void recorder.init();return await recorder.operations.run(name,()=>action(...args));});
      } catch (error) { void vscode.window.showErrorMessage(`MRW: ${error.message}`); }
    }));};
  const rawBridge = async (request, options) => {
    if (!vscode.workspace.isTrusted) throw new Error('This action requires a trusted workspace.');
    await moveSession.ready;moveSession.assertWritable();
    const operation='bridge.'+request.method;
    const identity={...recorder.context,source_record:{outline:request.id,reference:request.reference,revision:request.source_revision||request.revision}};
    return recorder.operations.run(operation,()=>runBridge(context.extensionPath,
      vscode.workspace.getConfiguration('mrw').get('pythonExecutable', 'python3'), request, options),identity);
  };
  require('./workspaceSetup').registerWorkspaceSetup({vscode, register,resolveDefault:moveSession.defaultWorkspace,beforeSwitch:async()=>{
    if(moveHost.hasDirty(vscode))throw Error('Save your unsaved documents before switching workspaces.');
    const settled=[];try{for(const client of artifactClients){try{await client.freeze(false);settled.push(client);}catch(e){await client.cancelFreeze?.();throw e;}}
      await studyController.prepareMove();await recorder.flush();if(recorder.gap)throw Error(recorder.gap);
    }finally{for(const client of settled)await client.release();}
  }});
  const artifactClients = [];
  require('./historyCommands').registerHistory({vscode,context,register,recorder});
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
    if(editor?.document.uri.scheme==='file'&&!/\.mrw-(proof|study)\.json$/.test(editor.document.uri.fsPath))currentMaterial={editor:editor.document.uri.toString()};
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
    if (presentation.show !== false) await vscode.window.showTextDocument(document, { preview: false,
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
  const sourcePlugins=registerSourcePlugins({vscode,register,rawBridge});
  const outlineRows = registerOutlines({sourcePlugins, vscode, context, register, bridge, show, projectRoot, changed, ordinaryEditor, choosePath, artifactClients,
    askRetained: assistanceRows.askRetained, recorder, onMaterial, checkDocument: uri => readingController.checkFile(uri),
    readingDestination: location => readingController.returnDestination(location),
    handleDocumentUri: async uri => await notebooks.handleUri(uri) || await zotero.handleUri(uri) || readingController.handleDocumentUri(uri), relocateRoute:moveSession.rebaseRoute });
  const readingController = registerReadingOutline({ vscode, context, register, followReference: outlineRows.followReference,
    compile: rawBridge, sourcePlugins,
    savedDocuments: outlineRows.savedDocuments, resolveReferences: outlineRows.resolveReferenceIdentities, onReturnChanged: outlineRows.updateReturnDestinations, onDocumentChange: event => studyController.documentChanged(event) });
  const notebooks = require('./notebookResults').registerNotebookResults({vscode,context,register,bridge:rawBridge,show,recorder});
  const zotero = require('./zotero').registerZotero({vscode,context,register,reading:readingController,show,onCancel:()=>recorder.operations.cancel()});
  registerLeanStudy({vscode,context,register,trackLocation:require('./readingOutline').trackLocation,
    readingLocation:()=>readingController.currentLocation(),
    returnToDocument:location=>vscode.commands.executeCommand('mrw.returnToReadingOutline',{retained:true,location})});
  registerProofGraph({ vscode, context, register, bridge: rawBridge, projectRoot, choosePath, show,
    askProof: assistanceRows.askProof, followPinned: outlineRows.followPinned, readPinned: outlineRows.readPinned, recorder, onMaterial });
  artifactStorage.registerCommands({ register, clients: artifactClients, projectRoot, changed });
  registerProofStudy({ vscode, context, register, bridge: rawBridge, projectRoot, choosePath,
    selectPassages: outlineRows.selectStudyPassages, readPassage: outlineRows.studyPassage, recorder, startStudy:(...args)=>studyController.start(...args) });
  const studyController=registerActiveStudy({vscode,context,register,recorder,projectRoot,show,bridge:rawBridge,
    readPassage:outlineRows.studyPassage,followPassage:outlineRows.followPinned,
    returnToDocument: (origin, fileOnly) => readingController.returnToStudy(origin, fileOnly),selectPrerequisites:outlineRows.selectStudyPrerequisites,loadExample:outlineRows.loadStudyExample,
    getCurrent:async(root,invocation)=>{
      const editor=invocation?.editor;
      if(editor?.document.uri.scheme==='file'&&!invocation.range.isEmpty&&!editor.document.uri.fsPath.endsWith('.mrw-proof.json')&&!editor.document.uri.fsPath.endsWith('.mrw-study.json'))return outlineRows.captureStudySelection(root,invocation);
      if(currentMaterial?.root===root&&currentMaterial.reference)return outlineRows.studyPassage(currentMaterial.reference,root);
      if(currentMaterial?.root===root&&currentMaterial.outline)return outlineRows.currentStudyPassage(root);
      return null;
    }});
  moveHost.registerWorkspaceMove({vscode,context,register,session:moveSession,clients:artifactClients,study:studyController,recorder,bridge:request=>runBridge(context.extensionPath,vscode.workspace.getConfiguration('mrw').get('pythonExecutable','python3'),request,{timeout:300000})});
  recorder.coverage=[...registered.map(id=>({id,status:vscode.workspace.isTrusted?'available':'unavailable'})),
    {id:'reader.webview.directActions',status:'uninstrumented'},
    {id:'proofGraph.webview.directActions',status:'uninstrumented'},
    {id:'study.typing',status:'uninstrumented'}];
  deactivateAction=async()=>{if(!moveSession.frozen){await studyController.flush();await recorder.close();}};
  context.subscriptions.push(changed);
  void moveSession.restoreTabs().catch(e=>vscode.window.showErrorMessage('MRW: '+e.message));
  // Activation registers UI and checks local relocation authority. No source acquisition or network access.
  return { extendMarkdownIt: readingController.extendMarkdownIt };
}

module.exports = { activate, deactivate:()=>deactivateAction() };
