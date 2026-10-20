'use strict';
(() => {
// Inert text only. Source quotations never pass through HTML or Markdown.
const api = acquireVsCodeApi();
const root = document.getElementById('reader');
const levels = ['orientation', 'concepts_results', 'governing_idea', 'argument', 'technical_detail'];
const purposes = ['explanation', 'orientation', 'governing_idea', 'intermediate_claim', 'reconstruction',
  'intended_inference', 'cited_dependency', 'reusable_lemma', 'question', 'suspected_gap', 'proposed_repair'];
let model, selected, reference, filter = '', busy = false, blocked = false, error = '';
let notes = [], noteTargets = {}, noteError;
let storageFrozen = false;
const drafts = new Map();
const submittedDrafts = new Map();
const label = value => value.replace(/_/g, ' ');
function el(tag, text, parent = root, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  parent.append(node); return node;
}
function post(value) {
  if (value.draft) submittedDrafts.set(value.draft, drafts.get(value.draft));
  busy = true; controls(); api.postMessage(value);
}
function controls() {
  for (const button of root.querySelectorAll('button')) button.disabled = storageFrozen || busy || button.dataset.empty === 'true' || (blocked && button.dataset.write === 'true');
  for (const input of root.querySelectorAll('input,textarea,select')) input.disabled = storageFrozen;
}
function button(parent, title, value, action, write = false) {
  const node = el('button', title, parent); node.type = 'button';
  node.dataset.action = action; node.dataset.write = String(write);
  node.addEventListener('click', () => post(typeof value === 'function' ? value() : value));
  return node;
}
function form(parent, key, values) {
  const node = el('form', undefined, parent); node.dataset.draft = key;
  node.addEventListener('submit', event => event.preventDefault());
  const current = drafts.get(key) || values;
  node.addEventListener('input', () => {
    drafts.set(key, Object.fromEntries(new FormData(node))); api.postMessage({ type: 'dirty', dirty: true });
  });
  node.addEventListener('change', () => {
    drafts.set(key, Object.fromEntries(new FormData(node))); api.postMessage({ type: 'dirty', dirty: true });
  });
  return { node, current, read: () => Object.fromEntries(new FormData(node)) };
}
function field(f, name, title, options) {
  const container = el('label', title, f.node);
  const node = el(options ? 'select' : name === 'text' ? 'textarea' : 'input', undefined, container);
  node.name = name;
  if (options) for (const option of options) { const o = el('option', label(option), node); o.value = option; }
  node.value = f.current[name] ?? ''; return node;
}
function noteForm(parent, region, note) {
  const key = `note:${region || 'overview'}:${note?.id || 'new'}`;
  const box = el('details', undefined, parent, 'note'); box.open = !!note;
  el('summary', note ? `Reader annotation: ${label(note.kind)}` : 'Add reader explanation / question / repair', box);
  el('p', 'Reader reconstruction and supplied attribution. This text carries no proof-checking status.', box, 'muted');
  if (note) el('p', `${label(note.provenance.origin)} · author: ${note.provenance.author || 'unknown'} · recorded ${note.provenance.at}`, box, 'muted');
  const f = form(box, key, { purpose: note?.kind || 'explanation', text: note?.text || '',
    origin: note?.provenance.origin || 'human_work', author: note?.provenance.author || '' });
  field(f, 'purpose', 'Purpose', purposes);
  field(f, 'origin', 'Supplied origin', ['human_work', 'ai_proposal', 'source_quotation', 'unknown']);
  field(f, 'author', 'Author / attribution (blank means unknown)'); field(f, 'text', 'Explanation or other reader material');
  button(f.node, 'Save annotation', () => {
    const v = f.read(); return { type: 'edit', draft: key, change: { kind: 'annotation', region,
      id: note?.id || null, purpose: v.purpose, text: v.text, origin: v.origin, author: v.author || null } };
  }, 'save-note', true);
}
function spanLocation(span) { return `Lines ${span.start_line}:${span.start_col}–${span.end_line}:${span.end_col} (scalar columns)`; }
const sameSpan = (a, b) => a && b && ['source_revision', 'start_line', 'start_col', 'end_line', 'end_col'].every(k => a[k] === b[k]);
function targetNotes(region, pinned) {
  if (pinned) return notes.filter(n => n.reference === reference.uri);
  const current = model.outline.regions.find(r => r.id === region);
  return notes.filter(n => {
    const target = noteTargets[n.reference];
    return target && target.region === region && (!region || sameSpan(target.span, current?.span));
  });
}
function companionActions(parent, region = null, pinned = false) {
  const data = { region, pinned };
  const passage = pinned || region !== null;
  const box = el('section', undefined, parent, 'companion');
  box.dataset.linkScope = pinned ? 'pinned' : passage ? 'passage' : 'outline';
  el('h3', pinned ? 'Earlier linked passage' : passage ? 'This passage' : 'Whole outline', box);
  if (pinned) el('p', 'These actions keep the earlier range from the saved link. Passage actions below use the current range.', box, 'muted');
  else el('p', passage ? 'Links here apply to this passage’s current range.' : 'Links here apply to the whole outline.', box, 'muted');
  const directions = el('div', undefined, box, 'companion-directions');
  const into = el('div', undefined, directions);
  el('p', 'From your note to MRW', into);
  button(into, passage ? 'Copy link to this passage' : 'Copy link to this outline', { type: 'copy_link', ...data }, 'copy-link').title =
    'Copy an MRW destination to paste into an Obsidian note. This does not set a return note.';
  const back = el('div', undefined, directions);
  el('p', 'From MRW to your note', back);
  const linked = targetNotes(region, pinned);
  if (noteError) el('p', 'Linked notes unavailable. Refresh source status to retry.', back, 'muted');
  else if (!linked.length) el('p', `No Obsidian note linked to ${pinned ? 'this earlier range' : passage ? 'this passage' : 'this outline'} yet. Link a note to add the return destination.`, back, 'muted');
  else el('p', linked.length === 1 ? linked[0].label : `${linked.length} linked notes — choose when opening`, back, linked.length === 1 ? 'linked-note' : 'muted');
  const open = button(back, 'Open linked note in Obsidian', { type: 'open_note', ...data }, 'open-note');
  open.dataset.empty = String(!linked.length || !!noteError);
  button(back, 'Link an Obsidian note…', { type: 'associate_note', ...data }, 'associate-note', true).title =
    'Set the return destination from MRW by pasting an existing note’s Obsidian URL. Copying an MRW link does not set this destination.';
  const manage = button(back, 'Manage linked notes…', { type: 'manage_notes', ...data }, 'manage-notes', true);
  manage.dataset.empty = String(!linked.length || !!noteError);
}
function noteScope(note) {
  const target = noteTargets[note.reference];
  if (!target) return 'Retained target';
  if (!target.region) return 'Whole outline';
  const current = model.outline.regions.find(r => r.id === target.region);
  return `${sameSpan(target.span, current?.span) ? 'Current passage range' : 'Earlier passage range'} · ${spanLocation(target.span)}`;
}
function evidence(parent, artifacts) {
  for (const a of artifacts) {
    const box = el('details', undefined, parent, 'evidence'); box.open = a.kind === 'goal_context';
    box.dataset.artifact = a.id;
    el('summary', `${label(a.kind)}: ${a.label}`, box);
    el('p', `Supplied artifact, unchanged; ${a.region ? 'manual association with this region' : 'retained outline-level reference; no region association'}. Not rechecked.`, box, 'muted');
    el('p', `${a.path} · SHA-256 ${a.revision}`, box, 'muted');
    if (a.kind === 'goal_context') {
      el('p', 'Intermediate tactic goal and recorded local context. Context lists available assumptions and definitions; it does not identify necessary or joint premises.', box);
      for (const goal of a.goals || []) el('pre', goal, box).dataset.goal = a.id;
    }
    if (a.error) el('p', a.error, box, 'warning');
    button(box, 'Open retained artifact', { type: 'artifact', artifact: a.id }, 'artifact');
    const key = `evidence:${a.id}`, f = form(box, key, { region: a.region || '', selector: a.selector ?? '' });
    const regions = field(f, 'region', 'Manual region association', []);
    for (const [value, title] of [['', 'No region association (retain reference)'],
      ...model.outline.regions.map(r => [r.id, r.title])]) {
      const option = el('option', title, regions); option.value = value;
    }
    regions.value = f.current.region;
    if (a.kind === 'goal_context') {
      const snapshots = field(f, 'selector', 'Supplied tactic snapshot (goal and available local context)', []);
      for (const e of a.entries || []) { const option = el('option', e.label, snapshots); option.value = String(e.index); }
      snapshots.value = String(f.current.selector);
    }
    el('p', 'Saving or removing this manual association changes only the reading view. Original statements, hypotheses and supplied checking evidence stay unchanged; no correspondence or proof edge is verified.', f.node, 'muted');
    button(f.node, 'Save manual association', () => {
      const v = f.read(); return { type: 'edit', draft: key, change: { kind: 'evidence_association', artifact: a.id,
        region: v.region || null, selector: a.kind === 'goal_context' && v.selector !== '' ? Number(v.selector) : null } };
    }, 'save-evidence', true);
    if (a.region) button(f.node, 'Remove region association', { type: 'edit', draft: key,
      change: { kind: 'remove_evidence_association', artifact: a.id } }, 'remove-evidence', true);
  }
}
function render() {
  if (!model) return;
  const o = model.outline; root.replaceChildren();
  el('h1', o.source.bibliography.title || 'Mathematical source outline');
  el('p', 'Source argument · reader reconstruction · supplied checking evidence are separate. A faithful outline does not establish correctness.', root, 'muted');
  el('p', `${o.source.path} · SHA-256 ${o.source.revision}`, root, 'muted');
  el('p', `Original source: ${o.source_status}. Selections refer to the retained revision.`, root,
    o.source_status === 'unchanged' ? 'muted' : 'warning');
  if (reference) el('p', reference.notice, root, reference.status === 'changed or removed' ? 'warning' : 'muted').dataset.reference = 'true';
  if (o.retained_error) el('p', `Retained source unavailable: ${o.retained_error}. No source text was guessed.`, root, 'warning');
  if (error) el('p', error, root, 'warning').dataset.error = 'true';
  if (blocked) el('p', 'Private writes are blocked. Keep unsaved annotation text and reload the host before further writes.', root, 'warning');
  const toolbar = el('div', undefined, root, 'toolbar');
  button(toolbar, 'Open retained source', { type: 'source' }, 'source');
  button(toolbar, 'Refresh source status', { type: 'refresh' }, 'refresh');
  companionActions(root);
  if (reference?.status === 'changed or removed') {
    companionActions(root, null, true);
  }
  if (noteError) el('p', `Obsidian associations unavailable: ${noteError}. Refresh the reader to retry.`, root, 'warning');
  if (notes.length) {
    const linked = el('details'); el('summary', 'All linked notes and earlier passage ranges', linked);
    for (const note of notes) {
      const row = el('div', undefined, linked, 'linked-note-row'); el('p', note.label, row, 'linked-note');
      el('p', noteScope(note), row, 'muted');
      button(row, 'Open linked note in Obsidian', { type: 'open_note', note: note.id }, 'open-note');
      button(row, 'Manage linked notes…', { type: 'manage_notes', note: note.id }, 'manage-notes', true);
    }
  }
  el('p', 'Select text in the saved original or retained source, then use MRW: Add Selected Source Region, Use Selection as Exact Statement, or Keep Selected Hypothesis / Cited Result. Save annotations explicitly before closing or restarting.', root, 'muted');
  const metadata = el('details'); el('summary', 'Bibliographic identity and source authorship', metadata);
  const f = form(metadata, 'metadata', { ...o.source.bibliography, authorship: o.source.authorship });
  f.node.className = 'metadata';
  for (const key of ['title', 'authors', 'edition', 'revision', 'locator', 'reference']) field(f, key, `${label(key)} (blank means unknown)`);
  field(f, 'authorship', 'Supplied source authorship', ['unknown', 'human', 'ai_generated', 'ai_assisted']);
  button(f.node, 'Save source description', () => {
    const v = f.read(), bibliography = {};
    for (const key of ['title', 'authors', 'edition', 'revision', 'locator', 'reference']) bibliography[key] = v[key] || null;
    return { type: 'edit', draft: 'metadata', change: { kind: 'metadata', bibliography, authorship: v.authorship } };
  }, 'save-metadata', true);
  el('h2', 'Orientation and governing ideas');
  for (const n of o.annotations) noteForm(root, null, n);
  noteForm(root, null, null);
  if (o.contexts.length) {
    el('h2', 'Available source context and cited results');
    el('p', 'Reader-selected quotations remain accessible when argument details are hidden. These are available context, not an analysis of required premises.', root, 'muted');
    for (const c of o.contexts) {
      const box = el('details', undefined, root, 'context'); box.open = true;
      box.dataset.contextItem = c.id;
      el('summary', `${label(c.kind)}: ${c.label}`, box); el('p', spanLocation(c.span), box, 'muted');
      if (c.text !== null) el('pre', c.text, box).dataset.context = c.id;
      button(box, 'Go to source context', { type: 'navigate_context', context: c.id }, 'navigate-context');
      const key = `context:${c.id}`, cf = form(box, key, { context_kind: c.kind, label: c.label });
      field(cf, 'context_kind', 'Reading role', ['hypothesis', 'definition', 'local_assumption', 'cited_result', 'source_reference']);
      field(cf, 'label', 'Reader label (quotation above stays source-derived)');
      button(cf.node, 'Save context description', () => ({ type: 'edit', draft: key, change: {
        kind: 'edit_context', context: c.id, context_kind: cf.read().context_kind, label: cf.read().label
      } }), 'save-context', true);
      el('p', 'To replace its quoted range, select original or retained source text and run MRW: Replace Shared Context with Selection…. Removing shared context changes only this reading association; the original statement and hypotheses remain in Open retained source.', box, 'muted');
      button(box, 'Remove shared context', { type: 'edit', draft: key,
        change: { kind: 'remove_context', context: c.id } }, 'remove-context', true);
    }
  }
  evidence(root, o.artifacts.filter(a => !a.region));
  el('h2', 'Selected source regions');
  const nav = el('label', 'Reading level (freely navigable)'); const select = el('select', undefined, nav);
  for (const key of ['', ...levels]) { const op = el('option', key ? label(key) : 'All levels', select); op.value = key; }
  select.value = filter; select.dataset.readingLevel = 'true';
  select.addEventListener('change', () => { filter = select.value; render(); });
  if (!o.regions.length) el('p', 'Select a passage in the source and add a region. Formal evidence is optional.');
  for (const r of o.regions.filter(r => !filter || r.level === filter)) {
    const box = el('section', undefined, root, `region${selected === r.id ? ' selected' : ''}`); box.dataset.region = r.id;
    el('h3', `${r.title} · ${label(r.level)}`, box); el('p', spanLocation(r.span), box, 'muted');
    const actions = el('div', undefined, box, 'toolbar');
    const choose = button(actions, selected === r.id ? 'Selected for statement / evidence' : 'Select this region', { type: 'select', region: r.id }, 'select');
    // Selection is local view state, not a publication; it requires no idle reply.
    choose.addEventListener('click', () => { selected = r.id; busy = false; render(); });
    button(actions, r.collapsed ? 'Expand exact source' : 'Hide argument detail', { type: 'toggle', region: r.id }, 'toggle', true);
    button(actions, 'Go to original source', { type: 'navigate', region: r.id }, 'navigate');
    companionActions(box, r.id);
    if (r.statement) {
      const statement = el('div', undefined, box, 'statement');
      el('p', r.statement.kind === 'declaration_statement' ? 'Exact declaration statement (reader-labeled source selection)' : 'Exact source statement (reader-selected)', statement);
      if (r.statement_text !== null) el('pre', r.statement_text, statement).dataset.statement = r.id;
      button(statement, 'Go to statement', { type: 'navigate', region: r.id, statement: true }, 'navigate-statement');
    } else el('p', 'No separate exact statement selected. Reader explanations below do not supply a checked claim.', box, 'muted');
    if (r.collapsed) el('p', 'Argument detail hidden; expand against the retained source.', box, 'muted');
    else if (r.argument_text !== null) el('pre', r.argument_text, box).dataset.argument = r.id;
    evidence(box, o.artifacts.filter(a => a.region === r.id));
    const settings = el('details', undefined, box); el('summary', 'Edit region title / reading level', settings);
    const key = `region:${r.id}`, rf = form(settings, key, { title: r.title, level: r.level });
    field(rf, 'title', 'Region title'); field(rf, 'level', 'Reading level', levels);
    button(rf.node, 'Save region description', () => ({ type: 'edit', draft: key, change: { kind: 'region', region: r.id,
      title: rf.read().title, level: rf.read().level, collapsed: r.collapsed } }), 'save-region', true);
    for (const n of r.annotations) noteForm(box, r.id, n);
    noteForm(box, r.id, null);
  }
  controls();
}
window.addEventListener('message', event => {
  const value = event.data;
  if (value.type === 'storageCheck') {
    storageFrozen = true; controls(); api.postMessage({ type: 'storageStatus', dirty: drafts.size > 0 }); return;
  }
  if (value.type === 'storageRelease') { storageFrozen = false; controls(); return; }
  if (value.type === 'outline') {
    model = value.model; selected = value.selected; reference = value.reference; blocked = !!value.writesBlocked; busy = false; error = '';
    notes = value.notes || []; noteTargets = value.noteTargets || {}; noteError = value.noteError;
    if (value.clearDraft) {
      // Text fields stay editable while publication is in flight. A reply may
      // clear only the submitted draft, not newer typing in the same form.
      if (drafts.get(value.clearDraft) === submittedDrafts.get(value.clearDraft)) drafts.delete(value.clearDraft);
      submittedDrafts.delete(value.clearDraft);
    }
    api.postMessage({ type: 'dirty', dirty: drafts.size > 0 }); render();
    if (reference) root.querySelector('[data-reference]')?.scrollIntoView({ block: 'start' });
  } else if (value.type === 'error') { error = value.message; blocked = !!value.writesBlocked; busy = false; render(); }
  else if (value.type === 'idle') { busy = false; controls(); }
});
api.postMessage({ type: 'ready' });
})();
