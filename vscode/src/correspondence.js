'use strict';

const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { hostStoragePath } = require('./hostStorage');
const { digest } = require('./navigation');
const { extractAtlasText } = require('./atlasText');
const { writtenLeanDeclarations } = require('./atlasLean');
const { texPreviewContext } = require('./atlasPreview');
const { aspects, verdicts, resolutionLabels, correspondenceShell, renderCorrespondence } = require('./correspondenceView');

const MAX_SOURCE = 2 * 1024 * 1024;
const MAX_MANUSCRIPT = 1024 * 1024;
const MAX_PASSAGE = 256 * 1024;
const MAX_VERIFICATION = 128 * 1024;
const RESULT_KINDS = new Set(['statement', 'theorem', 'lemma', 'proposition', 'corollary',
  'definition', 'claim', 'fact', 'axiom', 'conjecture']);
const COMPARISON_ACTIONS = new Set(['choose-project', 'suggest', 'read', 'edit', 'save',
  'attach-verification', 'detach-verification', 'discard-review-draft', 'open-declaration', 'open-dependency',
  'open-review', 'show-saved', 'second-reading', 'build-report']);
const REPORT_ACTIONS = new Set(['save-report', 'export-report', 'trash-report', 'restore-report',
  'delete-report', 'report-review', 'report-passage']);
const READING_ACTIONS = {
  blind: new Set(['save-reconstruction']),
  saved: new Set(['reveal']),
  facts: new Set(['reveal', 'open-declaration', 'open-dependency']),
  revealed: new Set(['reconcile', 'open-declaration', 'open-dependency']),
  reconciled: new Set(['open-declaration', 'open-dependency']),
};

async function smallFile(filename, limit) {
  const handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) throw Error('The selected file exceeds the read limit or is unavailable.');
    const buffer = Buffer.alloc(stat.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, size);
      if (!bytesRead) break;
      size += bytesRead;
    }
    const after = await handle.stat();
    if (size !== stat.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) {
      throw Error('The selected file changed while reading it.');
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size));
  } finally {
    await handle.close();
  }
}

function sourcePacket(source) {
  const { title, uri, revision, text, language, start, end, label, reference } = source;
  if (typeof title !== 'string' || typeof uri !== 'string' || typeof language !== 'string' ||
      typeof text !== 'string' || Buffer.byteLength(text) > MAX_MANUSCRIPT || digest(text) !== revision ||
      !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= end || end > text.length) {
    throw Error('Choose an exact pinned passage from a manuscript of at most 1 MiB.');
  }
  const locator = new URL(uri);
  if (!['file:', 'https:'].includes(locator.protocol) || locator.username || locator.password) {
    throw Error('Save the manuscript as a file or retain an HTTPS manuscript before reviewing it.');
  }
  if (Buffer.byteLength(text.slice(start, end)) > MAX_PASSAGE) throw Error('Choose a passage of at most 256 KiB.');
  return { title, uri, revision, text, language, start, end,
    ...(label ? { label } : {}), ...(reference ? { reference } : {}) };
}

function reportScope(review) {
  const source = review.source;
  const language = source.language === 'tex' ? 'latex' : source.language;
  const results = ['latex', 'markdown'].includes(language)
    ? extractAtlasText(source.text, language).entries.filter(entry => RESULT_KINDS.has(entry.kind)).map(entry => {
      const span = entry.statement || entry;
      return { title: entry.printedTitle || entry.title, start: span.start, end: span.end };
    })
    : [];
  return { source_uri: source.uri, source_revision: source.revision,
    lean_project: review.facts.project, lean_commit: review.facts.derived_from.commit,
    ...(results.length ? { results } : {}) };
}

function chooseIndex(value, entries) {
  if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) throw Error('Choose a displayed item.');
  const selected = entries?.[Number(value)];
  if (!selected) throw Error('The selected item is unavailable.');
  return selected;
}

function required(fields, key, limit) {
  const value = fields[key];
  if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value) > limit || value.includes('\0')) {
    throw Error('Fill in the required fields before continuing.');
  }
  return value.trim();
}

function reviewAspects(fields) {
  return Object.fromEntries(Object.keys(aspects).map(key => {
    const verdict = fields[key + '-verdict'];
    if (!Object.hasOwn(verdicts, verdict)) throw Error('Choose a verdict for each aspect.');
    return [key, { verdict, reason: required(fields, key + '-reason', 4096) }];
  }));
}

function reconciledAspects(fields) {
  const result = {};
  for (const key of Object.keys(aspects)) {
    const resolution = fields[key + '-resolution'];
    if (!resolution) continue;
    if (!Object.hasOwn(resolutionLabels, resolution)) throw Error('Choose a reconciliation outcome.');
    result[key] = { resolution, reason: required(fields, key + '-reason', 4096) };
  }
  return result;
}

function selectionFrom(facts) {
  return { project: facts.project, module: facts.module, declaration: facts.declaration };
}

function sameTarget(review, target) {
  return review && ['project', 'module', 'declaration'].every(key => review.facts[key] === target[key]);
}

function reviewLabel(row) {
  return row.source.label || row.source.title;
}

function registerCorrespondence({ vscode, context, register, bridge, rawBridge, projectRoot, artifactClients, show }) {
  const views = new Set();
  let opening = 0, storageSerial = 0, frozen = false;

  async function scope(root) {
    const home = hostStoragePath(vscode, context.storageUri);
    if (!home) throw Error('Open a saved workspace to retain correspondence reviews.');
    root ||= await projectRoot();
    return { root, store: path.join(home, 'correspondence-' + digest(root)) };
  }
  function call(c, method, fields = {}) {
    if (frozen) throw Error('Wait for the saved-work move to finish.');
    return bridge({ method: 'correspondence_' + method, store: c.store, project_root: c.root, ...fields });
  }
  function send(c) {
    if (c.disposed) return;
    const clear = c.clear.splice(0);
    void c.panel.webview.postMessage({ type: 'state', generation: ++c.generation,
      html: renderCorrespondence(c), busy: c.busy || frozen, clear });
  }

  async function display({ root, store }, state, title) {
    if (frozen) throw Error('Wait for the saved-work move to finish.');
    const panel = vscode.window.createWebviewPanel('mrw.correspondence', title,
      vscode.ViewColumn.Active ?? vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    const c = { root, store, ...state, panel, busy: false, generation: 0, clear: [], disposed: false };
    views.add(c);
    context.subscriptions.push(panel,
      panel.onDidDispose(() => {
        c.disposed = true;
        c.storageCheck?.finish(false);
        c.readController?.abort();
        if (!c.busy) views.delete(c);
      }),
      panel.webview.onDidReceiveMessage(value => message(c, value)),
      panel.onDidChangeViewState(event => {
        if (event.webviewPanel.visible) send(c);
      }));
    panel.webview.html = correspondenceShell();
    send(c);
    return c;
  }

  async function begin({ root, source }) {
    const packet = sourcePacket(source);
    return display(await scope(root), { mode: 'review', source: packet, selection: {}, editing: false },
      'Correspondence · ' + (packet.label || packet.title));
  }

  async function openReview(owner, revision) {
    const review = await call(owner, 'review', { revision });
    const original = vscode.workspace.textDocuments?.find(document =>
      document.uri.toString() === review.source.uri);
    const sourceStatus = original && digest(original.getText()) !== review.source.revision ? 'changed' : review.status?.manuscript;
    return display(owner, { mode: 'review', source: review.source, facts: review.facts, review,
      selection: selectionFrom(review.facts), sourceStatus, leanStatus: review.status?.lean,
      verification: review.verification, editing: false }, 'Correspondence · ' + reviewLabel(review));
  }

  async function startSecondReading(owner, revision, known) {
    const review = known || await call(owner, 'review', { revision });
    const options = [{ label: 'Begin reconstruction', begin: true }];
    for (const reading of review.readings || []) {
      const status = { blind: 'In progress', saved: 'Saved', facts: 'Lean evidence revealed',
        revealed: 'First review revealed', reconciled: 'Reconciled' }[reading.stage] || '';
      options.push({ label: reading.reviewer || 'Unfinished reconstruction', description: status, id: reading.id });
    }
    const selection = options.length === 1 ? options[0] :
      await vscode.window.showQuickPick(options, { title: 'Second reading' });
    if (!selection) return;
    const reading = selection.begin
      ? await call(owner, 'reconstruction_begin', { review: revision })
      : await call(owner, 'reconstruction_read', { id: selection.id });
    const previewContext = ['tex', 'latex'].includes(reading.source.language) ?
      texPreviewContext(review.source.text) : undefined;
    return display(owner, { mode: 'second', reading, previewContext }, 'Second reading · ' + reviewLabel(reading));
  }

  function matchingReviews(rows, uri) {
    if (!uri) return rows;
    return rows.filter(row => row.source.uri === uri);
  }

  async function openReviews(options = {}) {
    const generation = ++opening, owner = await scope(options?.root);
    const uri = options?.uri?.toString() || vscode.window.activeTextEditor?.document.uri.toString();
    const { reviews } = await call(owner, 'list');
    if (generation !== opening) return;
    const matched = matchingReviews(reviews, uri);
    const choices = (matched.length ? matched : reviews).map(row => ({
      label: reviewLabel(row), description: row.source.title === reviewLabel(row) ? '' : row.source.title, row,
    }));
    if (!choices.length) {
      void vscode.window.showInformationMessage('Open an atlas component or saved passage and choose Compare with Lean declaration….');
      return;
    }
    const picked = await vscode.window.showQuickPick(choices, {
      title: matched.length ? 'Correspondence reviews for this manuscript' : 'Correspondence reviews',
      matchOnDescription: true,
    });
    if (!picked || generation !== opening) return;
    const action = await vscode.window.showQuickPick(['Open review', 'Second reading', 'Build report'],
      { title: reviewLabel(picked.row) });
    if (!action || generation !== opening) return;
    if (action === 'Second reading') return startSecondReading(owner, picked.row.revision);
    if (action === 'Build report') return buildReport(owner, picked.row.revision);
    return openReview(owner, picked.row.revision);
  }

  async function buildReport(owner, revision, existing) {
    const review = existing || await call(owner, 'review', { revision });
    if (review.revision !== revision) throw Error('Open the saved review to build a report.');
    const report = await call(owner, 'report_build', { scope: reportScope(review) });
    return display(owner, { mode: 'report', report }, 'Correspondence report · ' + review.source.title);
  }

  async function openReports(options = {}) {
    const generation = ++opening, owner = await scope(options?.root);
    const { reviews, reports } = await call(owner, 'list');
    if (generation !== opening) return;
    const choices = reports.map(row => ({ label: 'Correspondence report',
      description: row.state === 'trash' ? 'In Trash · ' + row.at : row.at,
      detail: row.scope.source_uri + ' · ' + row.scope.lean_commit, id: row.id }));
    if (reviews.length) choices.unshift({ label: 'Build from a reviewed manuscript…', build: true });
    if (!choices.length) {
      void vscode.window.showInformationMessage('Save a correspondence review to build a report.');
      return;
    }
    const selected = await vscode.window.showQuickPick(choices, { title: 'Correspondence reports', matchOnDetail: true });
    if (!selected || generation !== opening) return;
    if (selected.id) {
      const report = await call(owner, 'report_read', { id: selected.id });
      if (generation !== opening) return;
      return display(owner, { mode: 'report', report }, 'Correspondence report');
    }
    const pairs = new Map();
    for (const row of reviews) {
      const key = JSON.stringify([row.source.uri, row.source.revision, row.lean_project, row.lean_commit]);
      if (!pairs.has(key)) pairs.set(key, { label: row.source.title,
        description: row.source.revision.slice(0, 12) + ' · Lean ' + row.lean_commit.slice(0, 12),
        detail: row.lean_project, revision: row.revision });
    }
    const pair = await vscode.window.showQuickPick([...pairs.values()], { title: 'Manuscript revision and Lean commit', matchOnDetail: true });
    if (pair && generation === opening) return buildReport(owner, pair.revision);
  }

  async function chooseLeanProject(c, fields) {
    const picked = await vscode.window.showOpenDialog({ title: 'Choose a trusted, built Lean project', canSelectFiles: false,
      canSelectFolders: true, canSelectMany: false, defaultUri: vscode.Uri.file(c.selection.project || c.root) });
    if (!picked?.length) return;
    if (picked[0].scheme !== 'file') throw Error('Choose a Lean project on this workspace host.');
    c.selection = { project: await fs.realpath(picked[0].fsPath), module: fields.module || '', declaration: fields.declaration || '' };
  }

  async function suggest(c, fields) {
    if (!c.selection.project) throw Error('Choose the Lean project first.');
    const module = required(fields, 'module', 256);
    if (!/^[\p{L}_][\p{L}\p{N}_']*(?:\.[\p{L}_][\p{L}\p{N}_']*)*$/u.test(module)) {
      throw Error('Enter a Lean module such as MyProject.Results.');
    }
    const filename = path.join(c.selection.project, ...module.split('.')) + '.lean';
    let source;
    try {
      const resolved = await fs.realpath(filename);
      const relative = path.relative(c.selection.project, resolved);
      if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('The module leaves the selected project.');
      source = await smallFile(resolved, MAX_SOURCE);
    } catch {
      throw Error('The module source was not found at its project-relative path. Enter the qualified declaration name.');
    }
    const choices = writtenLeanDeclarations(source).slice(0, 500)
      .map(value => ({ label: value.name, description: 'Name as written in the module' }));
    if (!choices.length) throw Error('This module contains no theorem or lemma names that MRW can suggest.');
    const choice = await vscode.window.showQuickPick(choices, { title: 'Suggested names',
      placeHolder: 'Confirm and qualify the name before reading it in Lean' });
    if (choice) {
      c.selection = { ...c.selection, module, declaration: choice.label };
      c.clear.push('lean-selection');
    }
  }

  async function readLean(c, fields) {
    if (c.editing && (c.unsavedReceipt || await checkDraft(c))) {
      throw Error('Save or discard the review draft before reading a Lean declaration again.');
    }
    if (!c.selection.project) throw Error('Choose the Lean project first.');
    const selection = { ...c.selection, module: required(fields, 'module', 256),
      declaration: required(fields, 'declaration', 512) };
    const controller = new AbortController();
    c.readController = controller;
    let facts;
    try {
      facts = await vscode.window.withProgress({ title: 'MRW: Reading Lean declaration',
        location: vscode.ProgressLocation.Notification, cancellable: true }, async (_progress, token) => {
        const subscription = token.onCancellationRequested(() => controller.abort());
        if (token.isCancellationRequested) controller.abort();
        try {
          if (controller.signal.aborted) return;
          return await rawBridge({ method: 'correspondence_collect', ...selection },
            { timeout: 120000, signal: controller.signal });
        } catch (error) {
          if (!controller.signal.aborted) throw error;
          return undefined;
        } finally { subscription.dispose(); }
      });
    } finally { c.readController = undefined; }
    if (c.disposed) return;
    if (!facts || controller.signal.aborted) throw Error('Lean declaration read cancelled.');
    if (!sameTarget({ facts }, selection)) throw Error('The returned Lean declaration differs from the selection.');

    const previous = c.review;
    const same = sameTarget(previous, selection);
    const observation = same ? await call(c, 'refresh', { revision: previous.revision, facts }) : undefined;
    if (c.disposed) return;
    if (!same) {
      c.review = undefined;
      c.verification = undefined;
      c.unsavedReceipt = false;
    }
    c.freshJudgment = !!same && (c.leanStatus !== 'current' || observation?.kind !== 'same_signature');
    if (c.freshJudgment) {
      c.clear.push('review-' + previous.revision);
      c.verification = undefined;
      c.unsavedReceipt = false;
    }
    c.selection = selection;
    c.facts = facts;
    c.observation = observation?.kind === 'same_signature' ? undefined : observation;
    c.editing = !facts.missing;
    c.leanStatus = facts.missing ? 'unavailable' : 'current';
  }

  async function attachVerification(c) {
    const selected = await vscode.window.showOpenDialog({ title: 'Choose a verification receipt',
      canSelectMany: false, canSelectFiles: true, canSelectFolders: false });
    if (!selected?.length) return;
    const uri = selected[0];
    if (uri.scheme !== 'file') throw Error('Choose a verification receipt on this workspace host.');
    const text = await smallFile(await fs.realpath(uri.fsPath), MAX_VERIFICATION);
    c.verification = { title: path.basename(uri.fsPath), uri: uri.toString(), revision: digest(text), text };
    c.unsavedReceipt = true;
  }

  async function openLeanLocation(location) {
    if (!location?.path || !location.revision || !location.start || !location.end) {
      throw Error('This built environment did not provide an exact source location.');
    }
    let text;
    try { text = await smallFile(location.path, MAX_SOURCE); } catch { /* old source can remain readable below */ }
    if (text === undefined || digest(text) !== location.revision) {
      if (location.text && show) return show(location.text, 'Retained Lean source');
      throw Error('The Lean source changed or is unavailable. The retained facts remain in this review.');
    }
    const uri = vscode.Uri.file(location.path);
    const document = await vscode.workspace.openTextDocument(uri);
    if (digest(document.getText()) !== location.revision) throw Error('The open Lean buffer differs from the captured source.');
    function position(point) {
      const line = document.lineAt(point.line).text;
      const prefix = Array.from(line).slice(0, point.column).join('');
      return new vscode.Position(point.line, prefix.length);
    }
    return vscode.window.showTextDocument(document, { selection: new vscode.Range(position(location.start), position(location.end)) });
  }

  async function saveReview(c, fields) {
    if (!c.editing || !c.facts || c.facts.missing) throw Error('Read a Lean declaration before saving a review.');
    const reviewer = required(fields, 'reviewer', 512);
    const attribution = typeof fields.attribution === 'string' ? fields.attribution.trim() : undefined;
    if (attribution && Buffer.byteLength(attribution) > 512) throw Error('Attribution is too long.');
    const previous = c.review;
    const review = await call(c, 'save', { source: sourcePacket(c.source), facts: c.facts,
      aspects: reviewAspects(fields), reviewer, ...(previous ? { prior: previous.revision } : {}),
      ...(attribution ? { attribution } : {}), ...(c.verification ? { verification: c.verification } : {}) });
    c.clear.push('review-' + (previous?.revision || 'new'));
    Object.assign(c, { review, source: review.source, facts: review.facts, editing: false,
      sourceStatus: review.status?.manuscript, leanStatus: review.status?.lean, freshJudgment: false, unsavedReceipt: false, observation: undefined });
  }

  async function compareAction(c, type, value, fields) {
    switch (type) {
      case 'choose-project': return chooseLeanProject(c, fields);
      case 'suggest': return suggest(c, fields);
      case 'read': return readLean(c, fields);
      case 'edit':
        if (!c.review || !c.facts || c.facts.missing) throw Error('Open a saved review before revising its judgment.');
        c.editing = true;
        return;
      case 'save': return saveReview(c, fields);
      case 'discard-review-draft': {
        if (!c.editing) return;
        const choice = await vscode.window.showWarningMessage('Discard the unsaved correspondence draft?',
          { modal: true }, 'Discard draft');
        if (choice !== 'Discard draft') return;
        c.clear.push('review-' + (c.review?.revision || 'new'));
        c.verification = c.freshJudgment ? undefined : c.review?.verification;
        c.unsavedReceipt = false;
        return;
      }
      case 'attach-verification': return attachVerification(c);
      case 'detach-verification':
        c.verification = undefined;
        c.unsavedReceipt = Boolean(c.review?.verification);
        return;
      case 'second-reading':
        if (!c.review || c.review.revision !== value) throw Error('Save the review before starting a second reading.');
        return startSecondReading(c, value, c.review);
      case 'open-review':
        if (!c.review?.prior || c.review.prior !== value) throw Error('No earlier review is available here.');
        return openReview(c, value);
      case 'show-saved':
        if (!c.review || !c.freshJudgment) throw Error('No earlier review is available here.');
        return openReview(c, c.review.revision);
      case 'build-report':
        if (!c.review || c.review.revision !== value) throw Error('Save the review to build a report.');
        return buildReport(c, value, c.review);
      case 'open-declaration': return openLeanLocation(c.facts?.source_location);
      case 'open-dependency': return openLeanLocation(chooseIndex(value, c.facts?.direct_dependencies).source_location);
    }
  }

  async function readingAction(c, type, value, fields) {
    const { id, revision, facts } = c.reading;
    if (type === 'save-reconstruction') {
      const reconstruction = Object.fromEntries(Object.keys(aspects).map(key => [key, required(fields, key, 4096)]));
      c.reading = await call(c, 'reconstruction_save', { id, revision, reconstruction,
        reviewer: required(fields, 'reviewer', 512) });
      c.clear.push('reconstruct-' + id);
    } else if (type === 'reveal') {
      c.reading = await call(c, 'reconstruction_reveal', { id, revision });
    } else if (type === 'reconcile') {
      c.reading = await call(c, 'reconstruction_reconcile', { id, revision, reconciliation: reconciledAspects(fields) });
      c.clear.push('reconcile-' + id);
    } else if (type === 'open-declaration') {
      return openLeanLocation(facts?.source_location);
    } else if (type === 'open-dependency') {
      return openLeanLocation(chooseIndex(value, facts?.direct_dependencies).source_location);
    }
  }

  async function reportAction(c, type, value) {
    const { id, revision, state, scope: pair, rows } = c.report;
    if (type === 'save-report' && !id) {
      c.report = await call(c, 'report_save', { scope: pair, expected: revision });
      return;
    }
    if (type === 'report-review') {
      if (!rows.some(row => row.review?.revision === value || row.alternatives?.some(review => review.revision === value))) {
        throw Error('This printed result does not have that saved review.');
      }
      return openReview(c, value);
    }
    if (type === 'report-passage') {
      const row = chooseIndex(value, rows);
      const representative = row.review || rows.find(candidate => candidate.review)?.review;
      if (!representative) throw Error('This report has no retained manuscript review.');
      const reviewed = await call(c, 'review', { revision: representative.revision });
      const source = sourcePacket({ ...reviewed.source, start: row.start, end: row.end, reference: undefined });
      if (source.revision !== pair.source_revision || source.uri !== pair.source_uri) {
        throw Error('The retained manuscript differs from the report.');
      }
      return show(source.text.slice(source.start, source.end), 'Retained · ' + row.title);
    }
    if (!id) throw Error('Save the report first.');
    if (type === 'export-report' && state !== 'trash') {
      const chosen = await vscode.window.showSaveDialog({ title: 'Export correspondence report',
        defaultUri: vscode.Uri.file(path.join(c.root, 'correspondence-review.md')), filters: { Markdown: ['md'] } });
      if (!chosen) return;
      if (chosen.scheme !== 'file') throw Error('Choose an export path on this workspace host.');
      await call(c, 'report_export', { id, destination: chosen.fsPath });
      void vscode.window.showInformationMessage('Correspondence report exported.');
    } else if (type === 'trash-report' && state !== 'trash') {
      const confirmed = await vscode.window.showWarningMessage('Move this saved report to Trash?',
        { modal: true, detail: 'This action applies to one snapshot. Reviews and exported files remain available.' }, 'Move to Trash');
      if (confirmed === 'Move to Trash') c.report = await call(c, 'report_trash', { id, revision });
    } else if (type === 'restore-report' && state === 'trash') {
      c.report = await call(c, 'report_restore', { id, revision });
    } else if (type === 'delete-report' && state === 'trash') {
      const confirmed = await vscode.window.showWarningMessage('Permanently delete this report snapshot?',
        { modal: true, detail: 'The snapshot cannot be restored. The underlying reviews and export copies remain.' }, 'Permanently delete');
      if (confirmed === 'Permanently delete') {
        await call(c, 'report_delete', { id, revision });
        c.mode = 'deleted';
      }
    }
  }

  async function message(c, data) {
    if (c.disposed) return;
    if (data?.type === 'ready') { send(c); return; }
    if (data?.type === 'storage-status') {
      if (c.storageCheck?.token === data.token) c.storageCheck.finish(data.dirty === true);
      return;
    }
    if (c.busy || frozen || data?.generation !== c.generation) return;
    const allowed = c.mode === 'review' ? COMPARISON_ACTIONS : c.mode === 'report' ? REPORT_ACTIONS :
      c.mode === 'second' ? READING_ACTIONS[c.reading.stage] : undefined;
    if (!allowed?.has(data.type)) return;
    c.busy = true;
    c.error = '';
    send(c);
    try {
      const fields = data.fields && typeof data.fields === 'object' ? data.fields : {};
      if (c.mode === 'review') await compareAction(c, data.type, data.value, fields);
      else if (c.mode === 'second') await readingAction(c, data.type, data.value, fields);
      else await reportAction(c, data.type, data.value);
    } catch (error) { c.error = error.message; }
    finally {
      c.busy = false;
      if (c.disposed) views.delete(c);
      else send(c);
    }
  }

  register('mrw.correspondenceReview', openReviews);
  register('mrw.correspondenceReports', openReports);
  function releaseViews() {
    frozen = false;
    for (const view of views) send(view);
  }

  function checkDraft(c) {
    return new Promise((resolve, reject) => {
      const token = ++storageSerial;
      const timer = setTimeout(() => {
        c.storageCheck = undefined;
        reject(Error('The correspondence panel did not confirm its draft state.'));
      }, 5000);
      c.storageCheck = { token, finish(dirty) {
        clearTimeout(timer);
        c.storageCheck = undefined;
        resolve(dirty);
      } };
      void c.panel.webview.postMessage({ type: 'storage-check', token });
    });
  }

  artifactClients.push({
    async freeze(allowDirty = false) {
      if ([...views].some(c => c.busy)) throw Error('Finish or cancel the correspondence action before moving saved work.');
      frozen = true;
      try {
        for (const c of views) {
          if (c.disposed || !['review', 'second'].includes(c.mode)) continue;
          const dirty = await checkDraft(c);
          if (!allowDirty && (dirty || c.unsavedReceipt)) {
            throw Error('Save the correspondence draft before moving or switching workspaces.');
          }
        }
      } catch (error) {
        releaseViews();
        throw error;
      }
    },
    async cancelFreeze() { releaseViews(); },
    async release() { releaseViews(); },
  });
  return { begin, openReviews, openReports };
}

module.exports = { registerCorrespondence, reportScope, sourcePacket };
