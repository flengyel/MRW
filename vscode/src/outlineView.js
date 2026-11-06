'use strict';
(() => {
// Prose stays inert. Imported math and explicitly delimited annotation equations
// use bundled, restricted MathML rendering; their exact text stays accessible.
const api = acquireVsCodeApi();
const root = document.getElementById('reader');
const levels = ['orientation', 'concepts_results', 'governing_idea', 'argument', 'technical_detail'];
const purposes = ['explanation', 'orientation', 'governing_idea', 'intermediate_claim', 'reconstruction',
  'intended_inference', 'cited_dependency', 'reusable_lemma', 'question', 'suspected_gap', 'proposed_repair'];
let model, selected, reference, filter = '', busy = false, blocked = false, error = '';
let notes = [], noteTargets = {}, noteError, lastReadingFocus;
let storageFrozen = false;
let deletingDraft;
const drafts = new Map();
const submittedDrafts = new Map();
const revealed = new Set();
const hiddenDetails = new Set();
let proofsHidden = false, proofPreferenceLoaded = false;
let diagramAppearance = 'theme', diagramPreferenceLoaded = false;
const openDetails = new Map(), saveFeedback = new Map(), feedbackNodes = new Map();
const noteDraft = key => typeof key === 'string' && key.startsWith('note:');
function feedback(key, text, kind) {
  saveFeedback.set(key, { text, kind });
  const node = feedbackNodes.get(key);
  if (node) {
    node.textContent = text;
    node.className = `save-feedback ${kind === 'error' || kind === 'newer' ? 'warning' : kind === 'saved' ? 'save-confirmation' : 'muted'}`;
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }
}
function keepOpen(node, key) {
  node.dataset.disclosure = key;
  node.open = openDetails.get(key) || false;
}
const label = value => value.replace(/_/g, ' ');
function el(tag, text, parent = root, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  parent.append(node); return node;
}
function post(value) {
  if (value.type === 'delete_annotation') {
    deletingDraft = `note:${value.region || 'overview'}:${value.annotation}`;
    value.unsaved = drafts.has(deletingDraft);
  }
  if (value.draft) {
    submittedDrafts.set(value.draft, drafts.get(value.draft));
    if (noteDraft(value.draft)) feedback(value.draft, 'Saving annotation…', 'pending');
  }
  if (value.type !== 'reading_return') { busy = true; controls(); }
  api.postMessage(value);
}
function controls() {
  for (const button of root.querySelectorAll('button')) button.disabled = storageFrozen || busy || !!deletingDraft || button.dataset.empty === 'true' || (blocked && button.dataset.write === 'true');
  for (const input of root.querySelectorAll('input,textarea,select')) input.disabled = storageFrozen;
  if (deletingDraft) for (const form of root.querySelectorAll('form')) {
    if (form.dataset.draft === deletingDraft) for (const input of form.querySelectorAll('input,textarea,select')) input.disabled = true;
  }
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
    drafts.set(key, Object.fromEntries(new FormData(node)));
    if (noteDraft(key)) feedback(key, 'Unsaved changes.', 'draft');
    api.postMessage({ type: 'dirty', dirty: true });
  });
  node.addEventListener('change', () => {
    drafts.set(key, Object.fromEntries(new FormData(node)));
    if (noteDraft(key)) feedback(key, 'Unsaved changes.', 'draft');
    api.postMessage({ type: 'dirty', dirty: true });
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
  const box = el('details', undefined, parent, 'note'); keepOpen(box, key);
  el('summary', note ? `Edit reader note: ${label(note.kind)}` : 'Add reader explanation / question / repair', box);
  el('p', 'Reader reconstruction and supplied attribution. This text carries no proof-checking status.', box, 'muted');
  if (note) el('p', `${label(note.provenance.origin)} · author: ${note.provenance.author || 'unknown'} · recorded ${note.provenance.at}`, box, 'muted');
  const f = form(box, key, { purpose: note?.kind || 'explanation', text: note?.text || '',
    origin: note?.provenance.origin || 'human_work', author: note?.provenance.author || '' });
  field(f, 'purpose', 'Purpose', purposes);
  field(f, 'origin', 'Supplied origin', ['human_work', 'ai_proposal', 'source_quotation', 'unknown']);
  field(f, 'author', 'Author / attribution (blank means unknown)'); field(f, 'text', 'Explanation or other reader material');
  el('p', 'Math: \\( ... \\) inline; \\[ ... \\] or $$ ... $$ for a displayed equation.', f.node, 'muted');
  el('p', 'For diagrams, add a fenced tikz block, save the annotation, then choose Render diagram in Reader notes.', f.node, 'muted');
  button(f.node, 'Save annotation', () => {
    const v = f.read(); return { type: 'edit', draft: key, change: { kind: 'annotation', region,
      id: note?.id || null, purpose: v.purpose, text: v.text, origin: v.origin, author: v.author || null } };
  }, 'save-note', true);
  const status = el('p', '', f.node, 'save-feedback');
  status.dataset.saveFeedback = key; status.setAttribute('aria-live', 'polite');
  feedbackNodes.set(key, status);
  const saved = saveFeedback.get(key);
  if (saved) feedback(key, saved.text, saved.kind);
  else status.setAttribute('role', 'status');
}
function renderNotes(parent, annotations, scope, title = 'Reader notes') {
  if (!annotations.length) return;
  const notes = el('details', undefined, parent, 'reader-notes');
  notes.dataset.notesFor = scope;
  keepOpen(notes, `reader-notes:${scope}`);
  el('summary', `${title} (${annotations.length})`, notes);
  for (const note of annotations) {
    el('h3', label(note.kind), notes);
    el('p', `${label(note.provenance.origin)} · author: ${note.provenance.author || 'unknown'} · recorded ${note.provenance.at}`, notes, 'muted');
    if (window.MRWAnnotations) window.MRWAnnotations.render(notes, note.text, { fragments: note.fragments,
      appearance: diagramAppearance,
      onRender: block => post({ type: 'render_diagram', annotation: note.id, code: block.key }),
      onAppearance: value => { diagramAppearance = ['paper', 'dark'].includes(value) ? value : 'theme';
        api.postMessage({ type: 'diagram_appearance', value: diagramAppearance }); render(); } });
    else el('p', note.text, notes, 'reader-note-text');
    const remove = button(notes, 'Delete note…', { type: 'delete_annotation',
      region: scope === 'overview' ? null : scope, annotation: note.id }, 'delete-note', true);
    remove.dataset.annotation = note.id;
    remove.title = 'Delete this saved annotation after confirmation.';
  }
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
  el('h3', pinned ? 'Earlier linked passage' : passage ? 'This passage' : 'Whole source', box);
  if (pinned) el('p', 'These actions keep the earlier range from the saved link. Passage actions below use the current range.', box, 'muted');
  else el('p', passage ? 'Links here apply to this passage’s current range.' : 'Links here apply to the whole source.', box, 'muted');
  const directions = el('div', undefined, box, 'companion-directions');
  const into = el('div', undefined, directions);
  el('p', 'From your note to MRW', into);
  button(into, passage ? 'Copy link to this passage' : 'Copy link to this source', { type: 'copy_link', ...data }, 'copy-link').title =
    'Copy an MRW destination to paste into an Obsidian note. This does not set a return note.';
  const back = el('div', undefined, directions);
  el('p', 'From MRW to your note', back);
  const linked = targetNotes(region, pinned);
  if (noteError) el('p', 'Linked notes unavailable. Refresh the saved source to retry.', back, 'muted');
  else if (!linked.length) el('p', `No Obsidian note linked to ${pinned ? 'this earlier range' : passage ? 'this passage' : 'this source'} yet. Link a note to add the return destination.`, back, 'muted');
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
  if (!target.region) return 'Whole source';
  const current = model.outline.regions.find(r => r.id === target.region);
  return `${sameSpan(target.span, current?.span) ? 'Current passage range' : 'Earlier passage range'} · ${spanLocation(target.span)}`;
}
function evidence(parent, artifacts) {
  for (const a of artifacts) {
    const box = el('details', undefined, parent, 'evidence'); box.open = a.kind === 'goal_context';
    box.dataset.artifact = a.id;
    el('summary', `${label(a.kind)}: ${a.label}`, box);
    el('p', `Supplied artifact, unchanged; ${a.region ? 'manual association with this passage' : 'whole-source reference; no passage association'}. Not rechecked.`, box, 'muted');
    el('p', `${a.path} · SHA-256 ${a.revision}`, box, 'muted');
    if (a.kind === 'goal_context') {
      el('p', 'Intermediate tactic goal and recorded local context. Context lists available assumptions and definitions; it does not identify necessary or joint premises.', box);
      for (const goal of a.goals || []) el('pre', goal, box).dataset.goal = a.id;
    }
    if (a.error) el('p', a.error, box, 'warning');
    button(box, 'Open retained artifact', { type: 'artifact', artifact: a.id }, 'artifact');
    const key = `evidence:${a.id}`, f = form(box, key, { region: a.region || '', selector: a.selector ?? '' });
    const regions = field(f, 'region', 'Manual passage association', []);
    for (const [value, title] of [['', 'No passage association (retain reference)'],
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
    if (a.region) button(f.node, 'Remove passage association', { type: 'edit', draft: key,
      change: { kind: 'remove_evidence_association', artifact: a.id } }, 'remove-evidence', true);
  }
}
function jumpPublished(region) {
  const current = model?.outline.regions.find(r => r.id === region);
  if (!current) return;
  const part = model.outline.published?.parts?.[region];
  if (part && sameSpan(part.span, current.span)) { revealed.add(region); hiddenDetails.delete(region); }
  filter = ''; selected = region; api.postMessage({ type: 'select', region }); render();
  [...root.querySelectorAll('section')].find(n => n.dataset.region === region)?.scrollIntoView({ block: 'start' });
}
function regionView(region, expanded) {
  if (expanded) { hiddenDetails.delete(region); revealed.add(region); }
  else { hiddenDetails.add(region); revealed.delete(region); }
  render();
  [...root.querySelectorAll('section')].find(n => n.dataset.region === region)?.scrollIntoView({ block: 'start' });
}
function proofViews(hidden) {
  proofsHidden = hidden;
  for (const part of Object.values(model.outline.published?.parts || {})) {
    if (part.role !== 'proof' || !model.outline.regions.some(r => r.id === part.region && sameSpan(r.span, part.span))) continue;
    hiddenDetails.delete(part.region);
    if (hidden) revealed.delete(part.region); else revealed.add(part.region);
  }
  api.postMessage({ type: 'proofVisibility', hidden }); render();
}
function proofNavigation(parent, part) {
  if (!part?.tag || !['statement', 'proof'].includes(part.role)) return;
  const role = part.role === 'statement' ? 'proof' : 'statement';
  // These are the importer's explicit published roles within this retained
  // source, not an inferred dependency or a claim that a proof is correct.
  const candidates = Object.values(model.outline.published.parts).filter(p => p.tag === part.tag && p.role === role);
  const targets = candidates.filter(p => model.outline.regions.some(r => r.id === p.region && sameSpan(r.span, p.span)));
  if (!targets.length) {
    if (candidates.length) el('p', `The published ${role}'s reading association changed. Its original text remains in the retained source.`, parent, 'warning');
    return;
  }
  const nav = el('nav', undefined, parent, 'proof-navigation');
  for (const [index, target] of targets.entries()) {
    const text = role === 'proof' ? 'Proof' : 'Statement';
    const link = el('button', text + (targets.length > 1 ? ` ${index + 1}` : '') + (role === 'proof' ? ' ↓' : ' ↑'), nav);
    link.type = 'button'; link.dataset.action = 'published-companion'; link.dataset.region = target.region;
    link.title = `Read the published ${role} in this exact retained source.`;
    link.addEventListener('click', () => jumpPublished(target.region));
  }
}
function publishedAction(type, target) {
  if (type === 'stacks_jump') return jumpPublished(target);
  post({ type, tag: target });
}
function render() {
  if (!model) return;
  const o = model.outline;
  for (const node of root.querySelectorAll('details')) if (node.dataset.disclosure) openDetails.set(node.dataset.disclosure, !!node.open);
  feedbackNodes.clear(); root.replaceChildren();
  el('h1', o.source.bibliography.title || 'Saved source');
  if (o.source.bibliography.authors) el('p', o.source.bibliography.authors, root, 'muted');
  const readingBar = el('div', undefined, root, 'toolbar reading-bar');
  button(readingBar, '← Return to document', { type: 'reading_return' }, 'reading-return').title =
    'Return to the selected Markdown document at its saved location.';
  if (o.published && !o.published.error) {
    button(readingBar, 'Open original source ↗',
      { type: 'stacks_citation', tag: o.published.qualified_tag || o.published.tag }, 'original-source').title =
      'Open the current published page in your browser. The retained source revision and annotations stay unchanged.';
  }
  button(readingBar, 'Study current material', { type: 'study_current' }, 'study-current');
  button(readingBar, 'Prepare proof study…', { type: 'proof_study' }, 'proof-study');
  button(readingBar, 'Ask AI about a passage…', { type: 'ask_ai' }, 'ask-ai');
  button(readingBar, 'Refresh saved source', { type: 'refresh' }, 'refresh').title =
    'Reload saved reader state and annotations; this does not reacquire the original document.';
  if (Object.values(o.published?.parts || {}).some(p => p.role === 'proof' && o.regions.some(r => r.id === p.region && sameSpan(r.span, p.span)))) {
    for (const hidden of [true, false]) {
      const control = el('button', hidden ? 'Hide proofs' : 'Show proofs', readingBar);
      control.type = 'button'; control.dataset.action = hidden ? 'hide-proofs' : 'show-proofs';
      control.addEventListener('click', () => proofViews(hidden));
    }
  }
  if (reference?.status === 'changed or removed') {
    el('p', reference.notice, root, 'warning').dataset.reference = 'true';
    button(root, 'Ask AI about the earlier linked passage…', { type: 'ask_ai', pinned: true }, 'ask-ai-pinned');
  }
  if (o.retained_error) el('p', `Retained source unavailable: ${o.retained_error}. No source text was guessed.`, root, 'warning');
  if (error) el('p', error, root, 'warning').dataset.error = 'true';
  if (blocked) el('p', 'Private writes are blocked. Keep unsaved annotation text and reload the host before further writes.', root, 'warning');
  const tools = el('details', undefined, root, 'reader-tools');
  keepOpen(tools, 'source-tools');
  el('summary', 'Source details and tools', tools);
  el('p', 'Source argument · reader reconstruction · supplied checking evidence are separate. A faithful outline does not establish correctness.', tools, 'muted');
  if (!o.published) el('p', `${o.source.path} · SHA-256 ${o.source.revision}`, tools, 'muted');
  el('p', `Original source: ${o.source_status}. Selections refer to the retained revision.`, tools,
    ['unchanged', 'retained upstream import'].includes(o.source_status) ? 'muted' : 'warning');
  if (reference) el('p', reference.notice, tools, 'muted');
  const toolbar = el('div', undefined, tools, 'toolbar');
  button(toolbar, 'Open retained source', { type: 'source' }, 'source');
  if (o.published?.error) el('p', o.published.error, root, 'warning');
  else if (o.published && window.MRWStacks) window.MRWStacks.header(tools, o.published, publishedAction);
  if (o.published) {
    const links = el('details', undefined, tools); el('summary', 'Source links and Obsidian notes', links); companionActions(links);
  } else companionActions(tools);
  if (reference?.status === 'changed or removed') {
    companionActions(tools, null, true);
  }
  if (noteError) el('p', `Obsidian associations unavailable: ${noteError}. Refresh the reader to retry.`, tools, 'warning');
  if (notes.length) {
    const linked = el('details', undefined, tools); el('summary', 'All linked notes and earlier passage ranges', linked);
    for (const note of notes) {
      const row = el('div', undefined, linked, 'linked-note-row'); el('p', note.label, row, 'linked-note');
      el('p', noteScope(note), row, 'muted');
      button(row, 'Open linked note in Obsidian', { type: 'open_note', note: note.id }, 'open-note');
      button(row, 'Manage linked notes…', { type: 'manage_notes', note: note.id }, 'manage-notes', true);
    }
  }
  el('p', 'Select text in the saved original or retained source, then use MRW: Add Selected Passage, Use Selection as Exact Statement, or Keep Selected Hypothesis / Cited Result. Save annotations explicitly before closing or restarting.', tools, 'muted');
  const metadata = el('details', undefined, tools); el('summary', 'Bibliographic identity and source authorship', metadata);
  const f = form(metadata, 'metadata', { ...o.source.bibliography, authorship: o.source.authorship });
  f.node.className = 'metadata';
  for (const key of ['title', 'authors', 'edition', 'revision', 'locator', 'reference']) field(f, key, `${label(key)} (blank means unknown)`);
  field(f, 'authorship', 'Supplied source authorship', ['unknown', 'human', 'ai_generated', 'ai_assisted']);
  button(f.node, 'Save source description', () => {
    const v = f.read(), bibliography = {};
    for (const key of ['title', 'authors', 'edition', 'revision', 'locator', 'reference']) bibliography[key] = v[key] || null;
    return { type: 'edit', draft: 'metadata', change: { kind: 'metadata', bibliography, authorship: v.authorship } };
  }, 'save-metadata', true);
  el('h2', 'Reader notes', tools);
  for (const n of o.annotations) noteForm(tools, null, n);
  noteForm(tools, null, null);
  renderNotes(root, o.annotations, 'overview', 'Source notes');
  if (o.contexts.length) {
    el('h2', 'Available source context and cited results');
    el('p', 'Reader-selected quotations remain accessible when argument details are hidden. These are available context, not an analysis of required premises.', root, 'muted');
    for (const c of o.contexts) {
      const box = el('details', undefined, root, 'context'); box.open = true;
      box.dataset.contextItem = c.id;
      el('summary', `${label(c.kind)}: ${c.label}`, box); el('p', spanLocation(c.span), box, 'muted');
      if (c.text !== null) el('pre', c.text, box).dataset.context = c.id;
      button(box, 'Go to source context', { type: 'navigate_context', context: c.id }, 'navigate-context');
      const contextTools = el('details', undefined, tools); el('summary', `Edit context: ${c.label}`, contextTools);
      const key = `context:${c.id}`, cf = form(contextTools, key, { context_kind: c.kind, label: c.label });
      field(cf, 'context_kind', 'Reading role', ['hypothesis', 'definition', 'local_assumption', 'cited_result', 'source_reference']);
      field(cf, 'label', 'Reader label (quotation above stays source-derived)');
      button(cf.node, 'Save context description', () => ({ type: 'edit', draft: key, change: {
        kind: 'edit_context', context: c.id, context_kind: cf.read().context_kind, label: cf.read().label
      } }), 'save-context', true);
      el('p', 'To replace its quoted range, select original or retained source text and run MRW: Replace Shared Context with Selection…. Removing shared context changes only this reading association; the original statement and hypotheses remain in Open retained source.', contextTools, 'muted');
      button(contextTools, 'Remove shared context', { type: 'edit', draft: key,
        change: { kind: 'remove_context', context: c.id } }, 'remove-context', true);
    }
  }
  const importedArtifacts = new Set(o.published?.acquisition_artifacts || []);
  if (importedArtifacts.size) {
    const files = el('details', undefined, tools); el('summary', 'Retained source metadata and license', files);
    for (const a of o.artifacts.filter(a => importedArtifacts.has(a.id))) {
      el('p', a.label, files);
      button(files, 'Open retained file', { type: 'artifact', artifact: a.id }, 'artifact');
    }
  }
  evidence(tools, o.artifacts.filter(a => !a.region && !importedArtifacts.has(a.id)));
  const nav = el('label', 'Reading level (freely navigable)', tools); const select = el('select', undefined, nav);
  for (const key of ['', ...levels]) { const op = el('option', key ? label(key) : 'All levels', select); op.value = key; }
  select.value = filter; select.dataset.readingLevel = 'true';
  select.addEventListener('change', () => { filter = select.value; render(); });
  if (!o.regions.length) el('p', 'Select a passage in the source and add a passage. Formal evidence is optional.');
  for (const r of o.regions.filter(r => !filter || r.level === filter)) {
    const originalPart = o.published?.parts?.[r.id];
    const publishedPart = originalPart && sameSpan(originalPart.span, r.span) ? originalPart : null;
    const expanded = !hiddenDetails.has(r.id) && (revealed.has(r.id) || !r.collapsed && !(publishedPart?.role === 'proof' && proofsHidden));
    const compactProof = publishedPart?.role === 'proof' && !expanded;
    const box = el('section', undefined, root, `region${compactProof ? ' compact-proof' : ''}${selected === r.id ? ' selected' : ''}`); box.dataset.region = r.id;
    if (!compactProof) el('h2', r.title, box);
    if (originalPart && !publishedPart) el('p', 'This passage range was edited. The original published reference still pins its retained range; current text is shown below.', box, 'warning');
    if (publishedPart && expanded && window.MRWStacks) window.MRWStacks.part(box, publishedPart, publishedAction);
    if (r.statement && !publishedPart) {
      const statement = el('div', undefined, box, 'statement');
      el('p', r.statement.kind === 'declaration_statement' ? 'Exact declaration statement (reader-labeled source selection)' : 'Exact source statement (reader-selected)', statement);
      if (r.statement_text !== null) el('pre', r.statement_text, statement).dataset.statement = r.id;
      button(statement, 'Go to statement', { type: 'navigate', region: r.id, statement: true }, 'navigate-statement');
    } else if (!publishedPart) el('p', 'No separate exact statement selected. Reader explanations below do not supply a checked claim.', box, 'muted');
    if (!expanded && !compactProof) el('p', 'Argument detail hidden.', box, 'muted');
    else if (r.argument_text !== null && !publishedPart) el('pre', r.argument_text, box).dataset.argument = r.id;
    if (!publishedPart || publishedPart.role === 'proof') {
      const proof = publishedPart?.role === 'proof';
      const control = el('button', compactProof ? `▸ ${r.title}` : (expanded ? 'Hide ' : 'Show ') + (proof ? 'proof' : 'details'), box,
        compactProof ? 'proof-disclosure' : undefined);
      control.type = 'button'; control.dataset.action = (expanded ? 'hide-' : 'show-') + (proof ? 'proof' : 'details');
      if (compactProof) control.title = 'Show proof';
      control.dataset.write = String(!expanded && !publishedPart && r.argument_text === null);
      control.setAttribute('aria-expanded', String(expanded));
      control.addEventListener('click', () => {
        // Manual collapsed regions load exact source through the existing action.
        if (!expanded && !publishedPart && r.argument_text === null) post({ type: 'toggle', region: r.id });
        else regionView(r.id, !expanded);
      });
    }
    if (publishedPart && !compactProof) proofNavigation(box, publishedPart);
    renderNotes(box, r.annotations, r.id);
    if (!compactProof) {
      const assistance = el('div', undefined, box, 'proof-navigation');
      button(assistance, 'Ask AI about this passage…', { type: 'ask_ai', region: r.id }, 'ask-ai-passage');
    }
    // Editing forms live outside the statement/proof reading sequence. Opening
    // an annotation editor must not insert a panel between them.
    const passageTools = el('details', undefined, tools, 'passage-tools'); el('summary', `Notes and tools: ${r.title}`, passageTools);
    keepOpen(passageTools, `passage:${r.id}`);
    el('p', spanLocation(r.span), passageTools, 'muted');
    const actions = el('div', undefined, passageTools, 'toolbar');
    const choose = button(actions, selected === r.id ? 'Selected for statement / evidence' : 'Select this passage', { type: 'select', region: r.id }, 'select');
    // Selection is local view state, not a publication; it requires no idle reply.
    choose.addEventListener('click', () => { selected = r.id; busy = false; render(); });
    button(actions, r.collapsed ? (expanded ? 'Keep source expanded' : 'Expand exact source') : 'Hide argument detail', () => {
      revealed.delete(r.id); hiddenDetails.delete(r.id); return { type: 'toggle', region: r.id };
    }, 'toggle', true);
    button(actions, o.published ? 'Open exact retained passage' : 'Go to original source', { type: 'navigate', region: r.id }, 'navigate');
    if (o.published) {
      const links = el('details', undefined, passageTools); el('summary', 'Passage links and Obsidian note', links); companionActions(links, r.id);
    } else companionActions(passageTools, r.id);
    evidence(passageTools, o.artifacts.filter(a => a.region === r.id));
    const settings = el('details', undefined, passageTools); el('summary', 'Edit passage title / reading level', settings);
    const key = `region:${r.id}`, rf = form(settings, key, { title: r.title, level: r.level });
    field(rf, 'title', 'Region title'); field(rf, 'level', 'Reading level', levels);
    button(rf.node, 'Save passage description', () => ({ type: 'edit', draft: key, change: { kind: 'region', region: r.id,
      title: rf.read().title, level: rf.read().level, collapsed: r.collapsed } }), 'save-region', true);
    for (const n of r.annotations) noteForm(passageTools, r.id, n);
    noteForm(passageTools, r.id, null);
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
    if (!proofPreferenceLoaded) { proofsHidden = value.proofsHidden === true; proofPreferenceLoaded = true; }
    if (!diagramPreferenceLoaded) { diagramAppearance = ['paper', 'dark'].includes(value.diagramAppearance) ? value.diagramAppearance : 'theme'; diagramPreferenceLoaded = true; }
    if (value.readingFocus && value.readingFocus.serial !== lastReadingFocus) {
      const region = model.outline.regions.find(r => r.id === value.readingFocus.region);
      const part = region && model.outline.published?.parts?.[region.id];
      if (part && sameSpan(part.span, region.span)) { revealed.add(region.id); hiddenDetails.delete(region.id); }
    }
    if (value.deletedAnnotation) {
      const key = `note:${value.deletedAnnotation.region || 'overview'}:${value.deletedAnnotation.id}`;
      drafts.delete(key); submittedDrafts.delete(key); saveFeedback.delete(key); openDetails.delete(key);
      if (deletingDraft === key) deletingDraft = undefined;
    }
    if (value.clearDraft) {
      // Text fields stay editable while publication is in flight. A reply may
      // clear only the submitted draft, not newer typing in the same form.
      const latest = drafts.get(value.clearDraft) === submittedDrafts.get(value.clearDraft);
      if (latest) drafts.delete(value.clearDraft);
      if (value.annotationSaved && noteDraft(value.clearDraft)) feedback(value.clearDraft,
        latest ? 'Annotation saved.' : 'Submitted version saved. Your newer edits are still unsaved.', latest ? 'saved' : 'newer');
      submittedDrafts.delete(value.clearDraft);
    }
    api.postMessage({ type: 'dirty', dirty: drafts.size > 0 }); render();
    if (value.readingFocus && value.readingFocus.serial !== lastReadingFocus) {
      lastReadingFocus = value.readingFocus.serial;
      const destination = [...root.querySelectorAll('section')].find(n => n.dataset.region === value.readingFocus.region);
      if (destination) destination.scrollIntoView({ block: 'start' });
      else if (reference?.status === 'changed or removed') root.querySelector('[data-reference]')?.scrollIntoView({ block: 'start' });
      else root.scrollIntoView({ block: 'start' });
    } else if (reference?.status === 'changed or removed') root.querySelector('[data-reference]')?.scrollIntoView({ block: 'start' });
  } else if (value.type === 'error') {
    error = value.message; blocked = !!value.writesBlocked; busy = false; deletingDraft = undefined;
    if (noteDraft(value.draft)) feedback(value.draft, 'Save not confirmed. ' + value.message, 'error');
    render();
  }
  else if (value.type === 'idle') { busy = false; deletingDraft = undefined; controls(); }
  else if (value.type === 'publishedFocus') jumpPublished(value.region);
});
api.postMessage({ type: 'ready' });
})();
