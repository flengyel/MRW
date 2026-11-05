'use strict';
// The host owns documents/undo. Python owns the private pointer and validators.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const FIELDS = { question: 'Current mathematical question', correction: 'Human correction / changed assumption / alternative',
  last_conclusion: 'Last useful conclusion (human task summary)', unresolved_issue: 'Unresolved issue (human task summary)' };
const passageNumbers = text => {
  if (!/^\s*[1-9][0-9]*(\s*,\s*[1-9][0-9]*){0,7}\s*$/.test(text)) throw new Error('Enter one to eight distinct passage numbers, separated by commas.');
  const numbers = text.split(',').map(Number);
  if (numbers.some(n => !Number.isSafeInteger(n)) || new Set(numbers).size !== numbers.length) throw new Error('Enter distinct positive passage numbers.');
  return numbers;
};

function registerInvestigation({ vscode, context, register, bridge, show, projectRoot, ordinaryEditor,
  choosePath, getReview, review, changed, change, prepare, getDraft, setDraft, isBusy }) {
  let state, human, blocked = false;
  const writable = () => { if (blocked) throw new Error('Private investigation writes are blocked after a failed or uncertain publication. Reload the extension host before resuming.'); };
  function adopt(result, keepHuman = false) {
    if (result.blocked) blocked = true;
    const old = state;
    state = { ...state, revision: result.revision, active: result.active };
    if (!keepHuman || old?.active?.id !== state.active?.id) human = state.active && { ...state.active.summary };
    changed.fire();
  }
  function publication(result) {
    if (result.blocked) {
      blocked = true;
      throw new Error(`Investigation publication failed: ${result.write_error}. The live task state is retained. ` +
        'Insert a handoff into an ordinary note to keep unsaved task edits before reloading for further private writes.');
    }
    adopt(result, true);
  }
  async function load() {
    const root = await projectRoot(vscode.window.activeTextEditor);
    if (!context.storageUri || context.storageUri.scheme !== 'file') throw new Error('Open a local workspace for investigation state.');
    const store = path.join(context.storageUri.fsPath, `investigation-${crypto.createHash('sha256').update(root).digest('hex')}`);
    if (state && state.project_root !== root && human && JSON.stringify(human) !== JSON.stringify(state.active?.summary)) {
      throw new Error('Save or end the current human task summary before changing projects.');
    }
    const result = await bridge({ method: 'investigation_state', store, project_root: root });
    const same = state?.store === store && state?.active?.id === result.active?.id;
    state = { ...state, store, project_root: root };
    adopt(result, same);
    return state;
  }
  function request(method, extra = {}) {
    if (!state?.active) throw new Error('Resume an active investigation first.');
    return { method, store: state.store, project_root: state.project_root, revision: state.revision, ...extra };
  }
  async function display() {
    const result = await bridge(request('investigation_view', { summary: human }));
    await show(result.body, 'Investigation');
  }
  function noteSnapshot() {
    const editor = ordinaryEditor(), document = editor.document;
    return { editor, document, version: document.version, selection: editor.selection };
  }
  function unchanged(target) {
    if (!target || target.document.isClosed || target.document.version !== target.version ||
        vscode.window.activeTextEditor !== target.editor || !target.editor.selection.isEqual(target.selection)) {
      throw new Error('The active note or selection changed. Focus the intended ordinary note and invoke the action again.');
    }
  }
  async function insertHandoff(target) {
    const result = await bridge(request('investigation_handoff', { summary: human }));
    unchanged(target);
    if (!await target.editor.edit(edit => edit.insert(target.selection.active, result.body), { undoStopBefore: true, undoStopAfter: true })) {
      throw new Error('The editor declined handoff insertion; the investigation remains active.');
    }
  }
  async function editField(key, activeOnly = false) {
    const draft = getDraft();
    if (draft?.parent && !activeOnly) {
      const answer = await vscode.window.showInputBox({ prompt: FIELDS[key], value: draft[key] });
      if (answer !== undefined) draft[key] = answer;
      await prepare();
    } else {
      if (!state?.active || !human) throw new Error('Resume an investigation before editing its human task summary.');
      const answer = await vscode.window.showInputBox({ prompt: FIELDS[key], value: human[key] });
      if (answer !== undefined) {
        const candidate = { ...human, [key]: answer };
        const result = await bridge(request('investigation_view', { summary: candidate }));
        human = candidate;
        await show(result.body, 'Investigation');
      }
    }
  }
  register('mrw.continueAnswer', () => change(async () => {
    writable();
    if (state?.active) throw new Error('This project already has one active investigation; end it explicitly first.');
    await load();
    if (state.active) throw new Error('This project already has one active investigation; resume or end it first.');
    const selected = getReview();
    const file = selected?.path || await choosePath('Continue one initial completed ModelCall');
    if (!file) return;
    const parent = await bridge({ method: 'investigation_parent', path: file, ...(selected ? { revision: selected.revision } : {}) });
    await show(parent.body, 'Select-parent-passages');
    const answer = await vscode.window.showInputBox({ prompt: 'Parent response passages (one to eight numbers, separated by commas)', value: String(selected?.number || 1),
      validateInput: text => { try { passageNumbers(text); } catch (e) { return e.message; } } });
    if (answer === undefined) return;
    const question = await vscode.window.showInputBox({ prompt: 'Mathematical follow-up question' });
    if (question === undefined) return;
    const correction = await vscode.window.showInputBox({ prompt: FIELDS.correction, value: '' });
    if (correction === undefined) return;
    const model = vscode.workspace.getConfiguration('mrw').get('model', '') ||
      await vscode.window.showInputBox({ prompt: 'OpenAI model identifier for this request' });
    if (model === undefined) return;
    const directory = path.join(context.storageUri.fsPath, 'model-calls');
    const exchange_id = `continuation-${crypto.randomUUID()}`;
    setDraft({ project_root: state.project_root, store: state.store, state_revision: state.revision,
      parent: parent.parent, passage_numbers: passageNumbers(answer), contexts: [], question,
      correction, last_conclusion: '', unresolved_issue: '', model,
      output: path.join(directory, `${exchange_id}.json`), exchange_id });
    await prepare();
  }));
  register('mrw.selectPriorPassages', () => change(async () => {
    const draft = getDraft();
    if (!draft?.parent) throw new Error('Prepare a linked continuation first.');
    const answer = await vscode.window.showInputBox({ prompt: 'Parent response passage numbers', value: draft.passage_numbers.join(', ') });
    if (answer !== undefined) draft.passage_numbers = passageNumbers(answer);
    await prepare();
  }));
  for (const [name, key] of [['editCorrection', 'correction'], ['editConclusion', 'last_conclusion'], ['editIssue', 'unresolved_issue']]) {
    register(`mrw.${name}`, () => change(() => editField(key)));
  }
  register('mrw.editInvestigationQuestion', () => change(() => editField('question', true), false));
  register('mrw.resumeInvestigation', () => change(async () => {
    writable();
    await load();
    if (!state.active) throw new Error('No active investigation is saved for this project.');
    const result = await bridge(request('resume_investigation'));
    publication(result);
    await display();
  }, false));
  register('mrw.saveInvestigationSummary', () => change(async () => {
    writable();
    const result = await bridge(request('update_investigation', { summary: human }));
    publication(result);
    await display();
  }, false));
  register('mrw.insertInvestigationHandoff', () => change(async () => {
    await insertHandoff(noteSnapshot());
  }, false));
  for (const [name, side] of [['reviewInvestigationParent', 'parent'], ['reviewInvestigationChild', 'child']]) {
    register(`mrw.${name}`, () => change(async () => {
      if (!state?.active) throw new Error('Resume an investigation first.');
      const pointer = state.active[side];
      const revision = side === 'parent' ? pointer.revision : pointer.record_revision;
      if (!revision) throw new Error('The child outcome is unresolved; inspect its destination explicitly.');
      await review({ method: 'review', path: pointer.path, revision, mode: 'index', number: 1 });
    }, false));
  }
  register('mrw.endInvestigation', () => change(async () => {
    writable();
    if (!state?.active) { await load(); if (!state.active) throw new Error('No active investigation is saved for this project.'); }
    const identity = JSON.stringify([state.store, state.revision, state.active.id]);
    let target;
    try { target = noteSnapshot(); } catch { /* Only insertion requires an ordinary note. */ }
    const choice = await vscode.window.showWarningMessage(
      `End investigation ${state.active.id}? Current human question: ${Array.from(human.question.replace(/\s+/gu, ' ')).slice(0, 120).join('')}. ` +
      'Immutable records remain. Ending without insertion discards its private human task text.' +
      (state.active.phase === 'pending' ? ' The child outcome is unresolved; inspect its reserved destination before any new request.' : ''),
      { modal: true }, 'Insert handoff and end', 'End without insertion', 'Cancel');
    if (!choice || choice === 'Cancel') return;
    if (!['Insert handoff and end', 'End without insertion'].includes(choice)) throw new Error('Unknown ending choice.');
    if (JSON.stringify([state.store, state.revision, state.active?.id]) !== identity) throw new Error('The active investigation changed during confirmation.');
    if (choice === 'Insert handoff and end') { unchanged(target); await insertHandoff(target); }
    const result = await bridge(request('end_investigation'));
    publication(result);
    human = undefined;
    changed.fire();
    await vscode.window.showInformationMessage('Investigation ended. Its immutable records were retained.');
  }, false));
  return {
    checkStorageChange: (allowDirty = false) => {
      if (!allowDirty && state?.active && human && JSON.stringify(human) !== JSON.stringify(state.active.summary)) {
        throw new Error('Save the unsaved human investigation summary before moving saved artifacts.');
      }
    },
    storageChanged: () => { /* Stable logical locators remain valid; the next action reads the committed binding. */ },
    editQuestion: () => editField('question'), writable,
    sent: result => { if (result) adopt(result, false); },
    uncertain: () => { blocked = true; },
    rows: () => {
      const rows = [['Continue an initial answer once…', 'mrw.continueAnswer'], ['Resume saved investigation', 'mrw.resumeInvestigation']];
      if (getDraft()?.parent) rows.push(['Select prior passages…', 'mrw.selectPriorPassages'], ['Edit human correction…', 'mrw.editCorrection'],
        ['Edit last useful conclusion…', 'mrw.editConclusion'], ['Edit unresolved issue…', 'mrw.editIssue']);
      if (state?.active) rows.push([`Investigation: ${state.active.phase}`, 'mrw.resumeInvestigation'], ['Edit current question…', 'mrw.editInvestigationQuestion'],
        ['Edit human correction…', 'mrw.editCorrection'], ['Edit last useful conclusion…', 'mrw.editConclusion'], ['Edit unresolved issue…', 'mrw.editIssue'],
        ['Save human task summary', 'mrw.saveInvestigationSummary'], ['Insert task handoff into active note', 'mrw.insertInvestigationHandoff'],
        ['Review exact parent', 'mrw.reviewInvestigationParent'], ['Review completed child', 'mrw.reviewInvestigationChild'],
        ['End investigation…', isBusy() ? undefined : 'mrw.endInvestigation', 'mrw.endInvestigation']);
      return rows;
    },
  };
}
module.exports = { registerInvestigation, passageNumbers };
