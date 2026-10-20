'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest, protectedText } = require('./navigation');
const { registerInvestigation } = require('./investigation');

function capture(editor) {
  const doc = editor && editor.document;
  if (!doc || !['file', 'untitled'].includes(doc.uri.scheme) ||
      /\.(ipynb|pdf)$/i.test(doc.uri.path) || protectedText(doc.getText())) {
    throw new Error('Select ordinary source or work text.');
  }
  const all = doc.getText(), selected = doc.getText(editor.selection);
  // Buffer conversion silently substitutes lone surrogates; reject them first.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(all)) {
    throw new Error('Source contains an incomplete Unicode character.');
  }
  if (!selected || selected.includes('\0')) throw new Error('Select a nonempty ordinary-text passage.');
  if (Buffer.byteLength(all, 'utf8') > 4 * 1024 * 1024 || Buffer.byteLength(selected, 'utf8') > 256 * 1024) {
    throw new Error('Selection or source exceeds the assistance limit.');
  }
  const lines = all.split('\n');
  const scalar = point => {
    const prefix = lines[point.line].slice(0, point.character);
    if (/[\uD800-\uDBFF]$/u.test(prefix)) throw new Error('Selection splits a Unicode character.');
    return `${point.line + 1}.${Array.from(prefix).length}`;
  };
  const identity = doc.uri.scheme === 'file' ? doc.uri.fsPath : doc.uri.toString();
  return Object.freeze({ buffer_id: doc.uri.toString(), source_identity: identity,
    source_path: doc.uri.scheme === 'file' ? doc.uri.fsPath : null,
    source_revision: digest(all), saved_revision: null,
    start: scalar(editor.selection.start), end: scalar(editor.selection.end), text: selected,
    state: 'captured visible editor text; disk revision not checked' });
}

function registerAssistance({ vscode, context, register, bridge, show, projectRoot, changed, review, ordinaryEditor, choosePath, getReview, artifactClients }) {
  let draft, prepared, previewUri, busy = false;
  const idle = () => { if (busy) throw new Error('Wait for the current assistance action to finish.'); };
  const invalidate = () => { prepared = undefined; previewUri = undefined; changed.fire(); };
  async function prepare() {
    const snapshot = JSON.parse(JSON.stringify(draft));
    const result = await bridge({ method: 'prepare_assistance', draft: snapshot });
    const uri = await show(result.preview, 'Exact-request-preview');
    prepared = { draft: snapshot, preview: result.preview };
    previewUri = uri.toString();
    changed.fire();
  }
  // Lock before the first await, including dialogs; old previews cannot be sent
  // while a replacement is being prepared or after preparation fails.
  async function change(action, invalidatePreview = true) {
    idle(); busy = true;
    vscode.commands.executeCommand?.('setContext', 'mrw.assistanceBusy', true);
    if (invalidatePreview) invalidate();
    try { await action(); } finally {
      busy = false;
      vscode.commands.executeCommand?.('setContext', 'mrw.assistanceBusy', false);
      changed.fire();
    }
  }
  const investigation = registerInvestigation({ vscode, context, register, bridge, show, projectRoot, changed,
    review, ordinaryEditor, choosePath, getReview, change, prepare,
    getDraft: () => draft, setDraft: value => { draft = value; }, isBusy: () => busy });
  artifactClients?.push({
    async freeze(allowDirty = false) {
      idle();
      if (draft && !allowDirty) throw new Error('Discard or finish the unsent request before moving saved artifacts.');
      investigation.checkStorageChange(allowDirty);
    },
    async release() { investigation.storageChanged(); invalidate(); },
  });
  register('mrw.ask', () => change(async () => {
    const target = capture(vscode.window.activeTextEditor);
    const root = await projectRoot(vscode.window.activeTextEditor);
    draft = undefined;
    const question = await vscode.window.showInputBox({ prompt: 'Mathematical question about the selected work' });
    if (question === undefined) return;
    const configured = vscode.workspace.getConfiguration('mrw').get('model', '');
    const model = configured || await vscode.window.showInputBox({ prompt: 'OpenAI model identifier for this request' });
    if (model === undefined) return;
    if (!context.storageUri || context.storageUri.scheme !== 'file') throw new Error('Open a local workspace for assistance records.');
    const directory = path.join(context.storageUri.fsPath, 'model-calls');
    const id = `assistance-${crypto.randomUUID()}`;
    draft = { project_root: root, target, contexts: [target], question, model,
      output: path.join(directory, `${id}.json`), exchange_id: id };
    await prepare();
  }));
  register('mrw.addContext', () => change(async () => {
    if (!draft) throw new Error('Start with Ask About Selected Work.');
    if (draft.contexts.length >= 8) throw new Error('At most eight contexts can be included.');
    draft.contexts.push(capture(vscode.window.activeTextEditor));
    await prepare();
  }));
  register('mrw.removeContext', () => change(async () => {
    if (!draft) throw new Error('Start with Ask About Selected Work.');
    const selected = await vscode.window.showQuickPick(draft.contexts.map((c, index) => ({
      label: `${index + 1}. ${path.basename(c.source_identity)} ${c.start}–${c.end}`, index,
    })), { placeHolder: 'Remove a selected context from this request' });
    if (selected) draft.contexts.splice(selected.index, 1);
    await prepare();
  }));
  register('mrw.editQuestion', () => change(async () => {
    if (!draft) return investigation.editQuestion();
    const question = await vscode.window.showInputBox({ prompt: 'Mathematical question', value: draft.question });
    if (question !== undefined) draft.question = question;
    await prepare();
  }));
  register('mrw.previewRequest', () => change(async () => {
    if (!draft) throw new Error('Start with Ask About Selected Work.');
    await prepare();
  }));
  register('mrw.discardRequest', () => {
    idle(); draft = undefined; invalidate();
  });
  register('mrw.sendRequest', async () => {
    idle();
    investigation.writable();
    const active = vscode.window.activeTextEditor?.document;
    const displayText = text => text.replace(/\r\n|\r/g, '\n');
    if (!prepared || active?.uri.toString() !== previewUri ||
        displayText(active.getText()) !== displayText(prepared.preview)) {
      throw new Error('Open the current exact request preview before sending.');
    }
    const sending = prepared;
    busy = true; draft = undefined; invalidate();
    vscode.commands.executeCommand?.('setContext', 'mrw.assistanceBusy', true);
    const status = vscode.window.setStatusBarMessage('MRW: sending one request…');
    try {
      let result;
      try {
        result = await bridge({ method: 'send_assistance', ...sending, confirmation: 'SEND' }, { timeout: 90000 });
      } catch (error) {
        if (sending.draft.parent) investigation.uncertain();
        await show(`The assistance outcome is uncertain.\nRecord destination: ${sending.draft.output}\n` +
          'Inspect that destination before preparing another request. No automatic retry was made.', 'Assistance-outcome');
        throw error;
      }
      if (result.status === 'not_sent') {
        // Only an explicit Python preflight result establishes that transport
        // never began. Keep the work, but require a newly displayed preview.
        draft = sending.draft;
      }
      if (result.investigation) investigation.sent(result.investigation);
      await show(result.body, 'Assistance-outcome');
      if (result.investigation?.blocked) await vscode.window.showErrorMessage(
        (result.retained ? 'The terminal outcome is retained. ' : 'The request was not sent. ') +
        'Private investigation publication failed. Reload before further private writes.');
      if (result.status === 'completed' && result.retained) {
        if (typeof result.revision !== 'string' || !/^[0-9a-f]{64}$/.test(result.revision)) {
          throw new Error('The completed record has no valid revision. Inspect the recorded destination.');
        }
        await review({ method: 'review', path: result.path, revision: result.revision, mode: 'index', number: 1 });
      }
    } finally {
      busy = false; status?.dispose();
      vscode.commands.executeCommand?.('setContext', 'mrw.assistanceBusy', false);
      changed.fire();
    }
  });
  return () => {
    const rows = [['Ask about selected work…', 'mrw.ask'], ...investigation.rows()];
    if (draft) rows.push(['Add selected context', 'mrw.addContext'], ['Remove context…', 'mrw.removeContext'],
      ['Edit question…', 'mrw.editQuestion'], ['Show exact request preview', 'mrw.previewRequest'],
      ['Discard unsent request', 'mrw.discardRequest']);
    if (prepared) rows.push(['Send exact preview', 'mrw.sendRequest']);
    return rows;
  };
}
module.exports = { capture, registerAssistance };
