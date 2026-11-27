'use strict';

const { randomBytes } = require('node:crypto');
const { escape, preview, texPreviewContext, texPassageTitle } = require('./atlasPreview');

const aspects = {
  objects: 'Objects and definitions',
  hypotheses: 'Hypotheses',
  quantifiers: 'Quantifiers',
  conclusion: 'Conclusion',
  assumptions: 'Assumptions outside the statement',
};
const verdicts = {
  matches: 'Matches',
  lean_assumes_more: 'Lean assumes more',
  lean_proves_less: 'Lean proves less',
  lean_stronger: 'Lean states more',
  not_comparable: 'Incomparable',
};
const outcomes = { formalizes: 'Formalizes', weakens: 'Weakens', strengthens: 'Strengthens' };
const resolutionLabels = {
  first_revised: 'Revise first reading',
  second_revised: 'Revise second reading',
  open: 'Leave discrepancy open',
};
const discrepancyLabels = {
  manuscript_vs_formalization: 'Manuscript and Lean differ',
  stale_correspondence: 'Source revision changed',
  signature_changed: 'Lean type or axiom dependencies changed',
  declaration_missing: 'Lean declaration missing',
  unfinished_proof: 'Unfinished proof',
};

function button(label, action, value) {
  const parameter = value === undefined ? '' : ' data-value="' + escape(value) + '"';
  return '<button type="button" data-action="' + action + '"' + parameter + '>' + escape(label) + '</button>';
}
function attr(value) { return escape(value); }
function pre(value) { return '<pre>' + escape(value || '') + '</pre>'; }
function disclosure(label, body, open = false) {
  return '<details' + (open ? ' open' : '') + '><summary>' + escape(label) + '</summary>' + body + '</details>';
}
function input(label, name, value, maxlength, required = false) {
  return '<label>' + escape(label) + '<input name="' + name + '" value="' + attr(value) + '" maxlength="' + maxlength + '"' +
    (required ? ' required' : '') + '></label>';
}
function field(label, name, value = '', required = true) {
  return '<label>' + escape(label) + '<textarea name="' + name + '" maxlength="4096" rows="3"' +
    (required ? ' required' : '') + '>' + escape(value) + '</textarea></label>';
}
function options(items, current, blank) {
  const entries = Object.entries(items);
  if (blank) entries.unshift(['', blank]);
  return entries.map(([value, label]) => '<option value="' + attr(value) + '"' + (value === current ? ' selected' : '') + '>' +
    escape(label) + '</option>').join('');
}
function statusText(result) {
  return discrepancyLabels[result?.kind] || ((result?.state || result) === 'current' ? '' : ({
    changed: 'The current revision differs from the retained revision.',
    stale: 'The current revision differs from the retained revision.',
    unavailable: 'The current source is unavailable.',
    missing: 'The current source is unavailable.',
  }[result?.state || result] || ''));
}

function printed(source, previewContext) {
  const text = source.passage ?? source.text.slice(source.start, source.end);
  const latex = ['latex', 'tex'].includes(source.language);
  const tex = previewContext || (latex && source.text ? texPreviewContext(source.text) : undefined);
  const title = source.label || source.title;
  return '<section class="evidence"><h2>Printed statement</h2><p class="source-title">' +
    escape(latex ? texPassageTitle(title) : title) +
    '</p>' + preview(text, source.language, 64 * 1024, tex) + disclosure('Exact text', pre(text)) +
    disclosure('Source revision', '<p>' + escape(source.uri) + '</p><p class="hash">' + escape(source.revision) + '</p>') + '</section>';
}

function leanEvidence(facts) {
  const opening = '<section class="evidence"><h2>Lean declaration</h2>';
  if (!facts) return opening + '<p>Read a declaration from an already built Lean project.</p></section>';
  if (facts.missing) return opening + '<p class="warning">The selected declaration is absent from the built module.</p></section>';
  const axioms = facts.axiom_dependencies || [];
  const binders = facts.signature_hypotheses || [];
  const dependencies = facts.direct_dependencies || [];
  const bindings = binders.length ? '<table><thead><tr><th>Name</th><th>Kind</th><th>Type</th></tr></thead><tbody>' +
    binders.map(row => '<tr><td>' + escape(row.name) + '</td><td>' + escape(row.kind) + '</td><td>' +
      pre(row.type) + '</td></tr>').join('') + '</tbody></table>' : '<p>No binders.</p>';
  const dependencyList = dependencies.length ? '<ul class="dependency-list">' + dependencies.map((dependency, index) =>
    '<li>' + (dependency.source_location ? button(dependency.name, 'open-dependency', index) :
      '<code>' + escape(dependency.name) + '</code>') + '<span class="muted"> ' + escape(dependency.kind) +
      ' · ' + escape(dependency.module) + '</span></li>').join('') + '</ul>' : '<p>No constants in the type.</p>';
  const from = facts.derived_from || {};
  return opening + '<p class="source-title">' + escape(facts.declaration) + '</p>' + pre(facts.declaration_type?.default) +
    (facts.source_location ? button('Open declaration source', 'open-declaration') : '') +
    disclosure('Explicit type and universes', pre(facts.declaration_type?.explicit)) +
    disclosure('Binders (' + binders.length + ')', bindings) +
    '<h3>Axioms</h3>' + (axioms.length ? '<ul>' + axioms.map(name => '<li><code>' + escape(name) + '</code></li>').join('') +
      '</ul>' : '<p>No axiom dependencies reported.</p>') +
    (axioms.includes('sorryAx') ? '<p class="warning">This declaration depends on an unfinished proof.</p>' : '') +
    disclosure('Constants in the type (' + dependencies.length + ')', dependencyList) +
    disclosure('Built environment', '<dl><dt>Module</dt><dd>' + escape(facts.module) + '</dd><dt>Toolchain</dt><dd>' +
      escape(from.toolchain) + '</dd><dt>Project commit</dt><dd class="hash">' + escape(from.commit) +
      '</dd><dt>Manifest digest</dt><dd class="hash">' + escape(from.manifest_digest || 'No manifest') +
      '</dd></dl><p>Facts read from the built environment.</p>') + '</section>';
}
function discrepancyList(values = []) {
  return values.length ? '<ul class="warnings">' + values.map(value => '<li>' +
    escape(discrepancyLabels[value.kind] || value.kind || value) +
    (typeof value.reason === 'string' ? ' · ' + escape(value.reason) : '') + '</li>').join('') + '</ul>' : '';
}
function savedJudgment(review, title = 'Saved review') {
  const verdict = review.kind ? outcomes[review.kind] || review.kind : 'Open discrepancy';
  return '<section><h2>' + escape(title) + '</h2><p><strong>' + escape(verdict) + '</strong> · ' + escape(review.reviewer) +
    ' · ' + escape(review.at) + '</p>' + (review.attribution ? '<p>Attribution ' + escape(review.attribution) + '</p>' : '') +
    (review.verification ? disclosure('Attached verification', '<p>' +
      escape(review.verification.title || review.verification.uri || review.verification.path) + '</p>' +
      '<p class="hash">' + escape(review.verification.revision) + '</p>' + pre(review.verification.text)) : '') +
    '<dl>' + Object.entries(aspects).map(([key, label]) => {
      const entry = review.aspects?.[key];
      if (!entry) return '';
      return '<dt>' + escape(label) + '</dt><dd><strong>' + escape(verdicts[entry.verdict] || entry.verdict) +
        '</strong><div class="reason">' + escape(entry.reason) + '</div></dd>';
    }).join('') + '</dl>' + discrepancyList(review.discrepancies) + '</section>';
}
function reviewForm(state) {
  const prior = state.review;
  const fields = Object.entries(aspects).map(([key, label]) => {
    const entry = state.freshJudgment ? undefined : prior?.aspects?.[key];
    return '<fieldset><legend>' + escape(label) + '</legend><label>Verdict<select name="' + key + '-verdict" required>' +
      options(verdicts, entry?.verdict, 'Choose a verdict') + '</select></label>' +
      field('Reason', key + '-reason', entry?.reason) + '</fieldset>';
  }).join('');
  const verification = state.verification;
  return '<section><h2>Correspondence judgment</h2><form data-action="save" data-draft="review-' +
    attr(prior?.revision || 'new') + '">' + fields + input('Reviewer', 'reviewer', prior?.reviewer, 512, true) +
    input('Attribution (optional)', 'attribution', state.freshJudgment ? '' : prior?.attribution, 512) +
    (verification ? '<p>Attached ' + escape(verification.title || verification.uri || verification.path) + '</p>' +
      button('Remove attachment', 'detach-verification') : button('Attach verification…', 'attach-verification')) +
    '<button type="submit">Save review</button>' + button('Discard draft', 'discard-review-draft') + '</form></section>';
}
function comparison(state) {
  const review = state.review;
  const status = [['Manuscript', state.sourceStatus], ['Lean', state.leanStatus]]
    .map(([side, value]) => [side, statusText(value)]).filter(([, message]) => message);
  const selection = state.selection || {};
  const controls = '<form class="lean-selection" data-action="read" data-draft="lean-selection">' +
    '<div><p class="path">' + escape(selection.project || 'Choose a Lean project') + '</p>' +
    button('Choose Lean project…', 'choose-project') + '</div>' +
    input('Module', 'module', selection.module, 256, true) +
    input('Qualified declaration', 'declaration', selection.declaration, 512, true) +
    '<div>' + button('Suggest names…', 'suggest') + '<button type="submit">Read Lean declaration</button></div></form>';
  return '<h1>Paper–Lean correspondence</h1>' + (status.length ?
    '<ul class="warnings">' + status.map(([side, message]) => '<li><strong>' + side + '</strong> · ' + escape(message) + '</li>').join('') + '</ul>' : '') +
    controls + (state.observation ? discrepancyList([state.observation]) : '') +
    '<div class="two-columns">' + printed(state.source) + leanEvidence(state.facts) + '</div>' +
    (review ? '<div class="toolbar">' + button('Second reading…', 'second-reading', review.revision) +
      button('Report for this pair', 'build-report', review.revision) +
      (review.prior ? button('Previous review', 'open-review', review.prior) : '') +
      (state.freshJudgment ? button('Open earlier evidence', 'show-saved') : '') +
      (!state.editing && !state.facts?.missing ? button('Revise judgment', 'edit') : '') + '</div>' : '') +
    (state.editing && state.facts && !state.facts.missing ? reviewForm(state) : review ? savedJudgment(review) : '');
}

function secondReading(state) {
  const reading = state.reading;
  // Render only the admissible stage. Future evidence must not be sent in
  // the blind mode, including in scripts, hidden controls or initial state.
  const manuscript = printed(reading.source, state.previewContext);
  if (reading.stage === 'blind') {
    return '<h1>Reconstruct the printed statement</h1>' + manuscript +
      '<form data-action="save-reconstruction" data-draft="reconstruct-' + attr(reading.id) + '">' +
      Object.entries(aspects).map(([key, label]) => field(label, key)).join('') +
      input('Reader', 'reviewer', '', 512, true) + '<button type="submit">Save reconstruction</button></form>';
  }
  const reconstruction = '<section><h2>Saved reconstruction</h2><dl>' +
    Object.entries(aspects).map(([key, label]) => '<dt>' + escape(label) + '</dt><dd class="reason">' +
      escape(reading.reconstruction?.[key]) + '</dd>').join('') + '</dl></section>';
  const header = '<h1>Second reading</h1>' + manuscript + reconstruction;
  if (reading.stage === 'saved') return header + button('Reveal Lean evidence', 'reveal');
  const evidence = leanEvidence(reading.facts);
  if (reading.stage === 'facts') return header + evidence + button('Reveal first review', 'reveal');
  const first = reading.review;
  const comparison = header + evidence + (first && typeof first === 'object' ? savedJudgment(first, 'First review') : '');
  if (reading.stage === 'reconciled') {
    return comparison + '<section><h2>Reconciliation</h2><dl>' +
      Object.entries(reading.reconciliation || {}).map(([key, row]) => '<dt>' + escape(aspects[key]) + '</dt><dd>' +
        escape(resolutionLabels[row.resolution]) + '<div class="reason">' + escape(row.reason) + '</div></dd>').join('') +
      '</dl></section>';
  }
  return comparison + '<form data-action="reconcile" data-draft="reconcile-' + attr(reading.id) + '"><h2>Reconcile disagreements</h2>' +
    Object.entries(aspects).map(([key, label]) => '<fieldset><legend>' + escape(label) +
      '</legend><label>Resolution<select name="' + key + '-resolution">' +
      options(resolutionLabels, '', 'No disagreement to record') + '</select></label>' + field('Reason or revised reading', key + '-reason', '', false) +
      '</fieldset>').join('') + '<button type="submit">Save reconciliation</button></form>';
}

function reportRow(row, index, review) {
  const discrepancies = review?.discrepancies || [];
  const readings = review?.second_readings || [];
  const saved = readings.some(reading => reading.stage !== 'blind');
  const revealed = readings.some(reading => reading.saved_before_reveal || ['facts', 'revealed', 'reconciled'].includes(reading.stage));
  const reconciled = readings.some(reading => reading.reconciled);
  const stale = Object.values(review?.status || {}).includes('changed');
  const hasOpen = discrepancies.some(item => typeof item === 'string' || !item.resolution || item.resolution === 'unresolved');
  const flags = { stale, open: hasOpen, 'missing-second': !saved };
  const tags = Object.entries(flags).filter(([, yes]) => yes).map(([name]) => name).join(' ');
  const journal = review?.aspects || {};
  const aspectVerdicts = Object.entries(aspects).filter(([key]) => journal[key]).map(([key, label]) =>
    '<li>' + escape(label) + ' · ' + escape(verdicts[journal[key].verdict] || journal[key].verdict) + '</li>').join('');
  const secondStatus = revealed ? 'Reconstruction saved before reveal' + (reconciled ? ' · reconciled' : '') :
    saved ? 'Reconstruction saved' : readings.length ? 'Reconstruction in progress' : 'Awaiting second reading';
  return '<tr data-report-row="' + attr(tags) + '"><th scope="row">' + escape(row.title) +
    button('Open exact passage', 'report-passage', index) +
    '<div class="hash">' + escape(row.source_revision) + '</div></th><td>' +
    (review ? '<code>' + escape(review.declaration) + '</code>' +
      (review.module ? '<div>Module <code>' + escape(review.module) + '</code></div>' : '') +
      button('Open review', 'report-review', review.revision) : '—') +
    '<div class="hash">' + escape(row.lean_commit) + '</div></td><td>' +
    escape(review ? outcomes[review.kind] || 'Unresolved' : 'Awaiting review') +
    (aspectVerdicts ? disclosure('Aspect verdicts', '<ul>' + aspectVerdicts + '</ul>') : '') +
    '</td><td>' + (stale ? '<p class="warning">Stale</p>' : '') + discrepancyList(discrepancies) +
    '</td><td>' + (review?.axioms?.length ? review.axioms.map(name =>
      '<code class="axiom">' + escape(name) + '</code>').join(' ') : '—') +
    '</td><td>' + escape(secondStatus) + '</td></tr>';
}
function reportView(state) {
  const report = state.report;
  const trash = report.state === 'trash';
  const rows = report.rows || [];
  const controls = report.id ? trash ? button('Restore report', 'restore-report') +
    button('Permanently delete…', 'delete-report') : button('Export report…', 'export-report') +
      button('Delete report…', 'trash-report') : button('Save report', 'save-report');
  const entries = rows.flatMap((row, index) =>
    [row.review, ...(row.alternatives || [])].map(review => reportRow(row, index, review))).join('');
  return '<h1>Correspondence report</h1><p>' + escape(report.scope.source_uri) + '</p>' +
    '<p class="hash">Manuscript ' + escape(report.scope.source_revision) + ' · Lean ' + escape(report.scope.lean_commit) + '</p>' +
    (trash ? '<p>In Trash</p>' : '') + '<div class="toolbar">' + controls + '</div>' +
    '<fieldset class="filters"><legend>Show entries with</legend><label><input type="checkbox" data-filter="open">Open discrepancies</label>' +
    '<label><input type="checkbox" data-filter="stale">Stale revisions</label>' +
    '<label><input type="checkbox" data-filter="missing-second">Missing second reading</label></fieldset>' +
    (rows.length ? '<div class="report-table"><table><thead><tr><th>Printed result</th><th>Lean declaration</th><th>Judgment</th>' +
      '<th>Discrepancies</th><th>Axioms</th><th>Second reading</th></tr></thead><tbody>' + entries +
      '</tbody></table></div><p class="muted" id="filter-summary" aria-live="polite"></p>' : '<p>No printed results in this report.</p>');
}

function renderCorrespondence(state) {
  const notice = state.error ? '<p role="alert" class="warning">' + escape(state.error) + '</p>' : '';
  const body = state.mode === 'second' ? secondReading(state) : state.mode === 'report' ? reportView(state) :
    state.mode === 'deleted' ? '<h1>Report permanently deleted</h1><p>Underlying reviews and exported copies remain available.</p>' :
      comparison(state);
  return notice + (state.busy ? '<p role="status">Working…</p>' : '') + body;
}

const styles = [
  'body{font:var(--vscode-font-weight) var(--vscode-font-size)/1.55 var(--vscode-font-family);color:var(--vscode-foreground);padding:12px 20px;max-width:1460px;margin:auto}',
  'h1,h2,h3{line-height:1.25}h1{font-size:1.5em}h2{font-size:1.22em}h3{font-size:1.06em}',
  '.two-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:18px 0;align-items:start}',
  '@media(max-width:720px){.two-columns{grid-template-columns:minmax(0,1fr)}}',
  '.evidence{border:1px solid var(--vscode-panel-border);padding:10px 16px;min-width:0}',
  '.source-title{font-weight:600;overflow-wrap:anywhere}.path,.hash{overflow-wrap:anywhere}.hash{font-family:var(--vscode-editor-font-family);font-size:.88em}',
  '.atlas-reading{overflow-wrap:anywhere;font-size:1.2em;line-height:1.7}.atlas-reading math{font-size:1.08em}.atlas-math-display{display:block;max-width:100%;overflow:auto}',
  'pre{white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;margin:.5em 0;font-family:var(--vscode-editor-font-family);background:var(--vscode-textCodeBlock-background);padding:.5rem}',
  'details{margin:.65em 0}summary{cursor:pointer;font-weight:500}dl{display:grid;grid-template-columns:minmax(6em,auto) minmax(0,1fr);gap:.4em 1em;margin:.6em 0}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}.reason{white-space:pre-wrap;overflow-wrap:anywhere}',
  'form{max-width:60em}label{display:grid;gap:.25em;margin:.4em 0}input,select,textarea,button{font:inherit;color:inherit}input,select,textarea{background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));padding:.35em .5em;min-width:0;max-width:100%}textarea{resize:vertical}',
  'button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:.35em .7em;margin:.2em .35em .2em 0;cursor:pointer}button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.6;cursor:default}',
  ':focus-visible{outline:2px solid var(--vscode-focusBorder);outline-offset:2px}fieldset{border:1px solid var(--vscode-panel-border);margin:.7em 0}legend{font-weight:600}',
  '.lean-selection{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(13rem,100%),1fr));gap:.55rem;max-width:none;align-items:end}.lean-selection p{margin:0}',
  '.muted{color:var(--vscode-descriptionForeground)}.warning,.warnings{color:var(--vscode-editorWarning-foreground)}',
  '.report-table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.95em}th{text-align:left}td,th{padding:.4em;vertical-align:top;border:1px solid var(--vscode-panel-border);overflow-wrap:anywhere}th .hash,td .hash{max-width:18em}td .axiom{display:inline-block;white-space:normal}',
  '.dependency-list{padding-inline-start:1.3em}.filters label{display:inline-flex;align-items:center;margin:.2em 1em .2em 0}',
].join('\n');
const script = [
  'const api = acquireVsCodeApi();',
  'const root = document.querySelector("main");',
  'let generation = 0, busy = false;',
  'let drafts = api.getState()?.drafts || {};',
  'let filters = api.getState()?.filters || [];',
  'const data = form => Object.fromEntries(new FormData(form).entries());',
  'function remember() { api.setState({ drafts, filters }); }',
  'function updateControls() {',
  '  for (const field of root.querySelectorAll("form input, form select, form textarea, button")) field.disabled = busy;',
  '}',
  'function setDraft(form) {',
  '  const key = form?.dataset.draft;',
  '  if (!key) return;',
  '  drafts = { ...drafts, [key]: data(form) };',
  '  drafts = Object.fromEntries(Object.entries(drafts).slice(-12));',
  '  remember();',
  '}',
  'function applyFilters() {',
  '  for (const field of root.querySelectorAll("[data-filter]")) field.checked = filters.includes(field.dataset.filter);',
  '  const rows = Array.from(root.querySelectorAll("[data-report-row]"));',
  '  for (const row of rows) row.hidden = !filters.every(filter => row.dataset.reportRow.split(" ").includes(filter));',
  '  const summary = root.querySelector("#filter-summary");',
  '  if (summary) summary.textContent = filters.length ? rows.filter(row => !row.hidden).length + " of " + rows.length + " entries" : "";',
  '}',
  'window.addEventListener("message", event => {',
  '  const message = event.data;',
  '  if (message.type === "storage-check") {',
  '    busy = true; updateControls();',
  '    api.postMessage({ type: "storage-status", token: message.token, dirty: Object.keys(drafts).some(key => key !== "lean-selection") });',
  '    return;',
  '  }',
  '  if (message.type !== "state" || message.generation < generation) return;',
  '  generation = message.generation; busy = message.busy;',
  '  for (const key of message.clear || []) delete drafts[key];',
  '  const active = root.contains(document.activeElement) ? document.activeElement : null;',
  '  const name = active?.name, oldForm = active?.form?.dataset.draft;',
  '  const start = active?.selectionStart, end = active?.selectionEnd;',
  '  root.innerHTML = message.html;',
  '  for (const form of root.querySelectorAll("form[data-draft]")) {',
  '    for (const [field, value] of Object.entries(drafts[form.dataset.draft] || {})) {',
  '      const input = form.elements.namedItem(field);',
  '      if (input && typeof value === "string") input.value = value;',
  '    }',
  '    if (oldForm && oldForm === form.dataset.draft && name) {',
  '      const input = form.elements.namedItem(name); input?.focus();',
  '      if (typeof start === "number" && typeof input?.setSelectionRange === "function") input.setSelectionRange(start, end);',
  '    }',
  '  }',
  '  updateControls();',
  '  applyFilters(); remember();',
  '});',
  'root.addEventListener("input", event => setDraft(event.target.form));',
  'root.addEventListener("change", event => {',
  '  const target = event.target;',
  '  if (!target.matches("[data-filter]")) return;',
  '  filters = Array.from(root.querySelectorAll("[data-filter]:checked"), field => field.dataset.filter);',
  '  applyFilters(); remember();',
  '});',
  'root.addEventListener("click", event => {',
  '  const button = event.target.closest("button[data-action]");',
  '  if (!button || busy) return;',
  '  const form = button.form;',
  '  api.postMessage({ type: button.dataset.action, generation, value: button.dataset.value, fields: form ? data(form) : {} });',
  '  busy = true; updateControls();',
  '});',
  'root.addEventListener("submit", event => {',
  '  event.preventDefault();',
  '  if (busy || !event.target.dataset.action) return;',
  '  const form = event.target;',
  '  setDraft(form);',
  '  api.postMessage({ type: form.dataset.action, generation, fields: data(form) });',
  '  busy = true; updateControls();',
  '});',
  'api.postMessage({ type: "ready" });',
].join('\n');

function correspondenceShell() {
  const nonce = randomBytes(24).toString('hex');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'; style-src \'nonce-' +
    nonce + '\'; script-src \'nonce-' + nonce + '\'"><title>Paper–Lean correspondence</title>' +
    '<style nonce="' + nonce + '">' + styles + '</style></head><body><main>Opening correspondence…</main><script nonce="' +
    nonce + '">' + script + '</script></body></html>';
}

module.exports = { aspects, verdicts, resolutionLabels, correspondenceShell, renderCorrespondence };
