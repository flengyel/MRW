'use strict';
(() => {
  const api = acquireVsCodeApi(), root = document.getElementById('reader');
  let editDraft, reselectAfterSave;
  let state, busy = false, selected, request = 0, passage, sourceMode = 'live';
  let shell, header, bar, count, mapHost, map, inspector, sourceArea, readingList, sourceReader, savedSource;
  const el = (tag, parent, text, className) => {
    const n = document.createElement(tag); if (text !== undefined) n.textContent = text;
    if (className) n.className = className; parent.append(n); return n;
  };
  function controls() { for (const field of root.querySelectorAll('textarea')) field.disabled = busy; for (const field of root.querySelectorAll('input')) field.disabled = busy; for (const field of root.querySelectorAll('select')) field.disabled = busy; for (const b of root.querySelectorAll('button')) b.disabled = (busy && b.dataset.local !== 'true') || b.dataset.pinned === 'true'; }
  function send(type, extra = {}) {
    if (editDraft && type !== 'update_summary') { editDraft.status.textContent = 'Save or cancel this summary first.'; return; }
    if (busy) return; busy = true; controls(); api.postMessage({ type, revision: state?.documentRevision, ...extra });
  }
  function button(parent, title, type, extra = {}, tooltip = '') {
    const b = el('button', parent, title); b.type = 'button'; b.title = tooltip; b.dataset.action = type;
    b.dataset.node = extra.node || ''; b.addEventListener('click', () => send(type, extra)); return b;
  }
  function local(parent, title, action, tooltip = '') {
    const b = el('button', parent, title); b.type = 'button'; b.dataset.local = 'true'; b.title = tooltip;
    b.addEventListener('click', action); return b;
  }
  function math(parent, text) { window.MRWAnnotations.render(parent, text, { exact: false }); }
  function attributed(parent, value) {
    el('p', parent, `${value.origin === 'ai_proposal' ? 'AI proposal' : 'Reader explanation'} · ${value.author}`, 'muted'); math(parent, value.text);
  }
  function context(parent, node) {
    const box = el('details', parent); el('summary', box, `Variables and hypotheses · ${node.scope}`);
    for (const sid of state.projection.scope_chains[node.scope]) {
      const scope = state.graph.scopes.find(s => s.id === sid);
      for (const v of scope.variables) math(box, v);
      for (const a of scope.assumptions) math(box, 'Assume ' + a);
    }
  }
  function citations(parent, node) {
    if (!node.citations.length) return;
    const box = el('details', parent); el('summary', box, `Sources (${node.citations.length})`);
    node.citations.forEach((citation, i) => {
      const source = state.graph.sources.find(s => s.id === citation.source), row = el('div', box, undefined, 'proof-navigation');
      button(row, source.title + (citation.declaration ? ` · ${citation.declaration}` : ''), 'source', { node: node.id, citation: i }, 'Read the exact pinned source quotation.');
      if (citation.reference) button(row, 'Reader notes', 'published', { node: node.id, citation: i }, 'Open the saved source reader and its notes.');
      button(row, 'Upstream', 'upstream', { node: node.id, citation: i }, 'Open the pinned source URL in your browser.');
      const tier = { published: 'Published Stacks text', human_reviewed: 'Human reviewed by the project', awaiting_human_review: 'Awaiting human review by the project' }[source.review];
      el('p', box, `${tier} · ${state.sourceStatus[source.id]}`, 'muted');
      if (source.environment) el('p', box, source.environment, 'muted');
    });
  }
  const title = id => state.graph.nodes.find(n => n.id === id).title;
  function witness(parent, route) {
    const box = el('details', parent); el('summary', box, `Expand original steps (${route.hidden.length} omitted)`);
    box.addEventListener('toggle',()=>api.postMessage({type:'view_event',event:'expand_steps',revision:state.documentRevision,node:selected,expanded:box.open}));
    for (const id of route.hidden) {
      const n = state.graph.nodes.find(n => n.id === id), part = el('section', box, undefined, 'context');
      el('h3', part, n.title); math(part, n.claim); attributed(part, n.explanation); context(part, n); citations(part, n);
      button(part, 'Restore vertex', 'restore', { node: id }, 'Return this claim to the displayed graph.');
    }
    for (const id of route.inferences) {
      const r = state.graph.inferences.find(r => r.id === id), item = el('section', box);
      el('p', item, `${r.premises.map(title).join(' AND ')} ⇒ ${title(r.conclusion)}`);
      if (r.discharges.length) el('p', item, 'Discharges assumptions in: ' + r.discharges.join(', '));
      attributed(item, r.explanation);
    }
  }
  function argument(parent, node) {
    button(parent,'Study this claim','study_current',{node:node.id});
    context(parent, node); citations(parent, node);
    for (const [i, route] of state.projection.derivations[node.id].entries()) {
      const part = el('div', parent, undefined, 'context'), routes = state.projection.derivations[node.id];
      el('p', part, `${routes.length > 1 ? `Alternative ${i+1}: ` : 'Uses: '}${route.premises.map(title).join(' AND ')}${route.premises.length > 1 ? ' jointly' : ''}.`);
      witness(part, route);
    }
  }
  function nodeActions(parent, node) {
    const actions = el('div', parent, undefined, 'toolbar');
    if (!state.projection.pinned.includes(node.id)) button(actions, 'Delete vertex', 'delete', { node: node.id }, 'Omit this intermediate claim and reconnect its dependencies.');
    else el('p', actions, state.graph.goals.includes(node.id) ? 'Conclusion' : state.graph.inferences.some(r => r.conclusion === node.id) ? 'Scope boundary' : 'Premise', 'muted');
    local(actions, 'Edit summary', () => editSummary(node), 'Correct the claim and explanation here; save through the ordinary outline document.');
  }
  function editSummary(node) {
    if (editDraft) return;
    const form = el('section', inspector, undefined, 'context'), values = {};
    for (const [key, label, value] of [['claim', 'Claim', node.claim], ['explanation', 'Explanation', node.explanation.text], ['author', 'Author', 'Reader']]) {
      el('label', form, label); const input = el(key === 'author' ? 'input' : 'textarea', form); input.value = value;
      input.setAttribute('aria-label', label); values[key] = input;
    }
    el('label', form, 'Origin'); const origin = el('select', form); origin.setAttribute('aria-label', 'Origin');
    for (const [value, text] of [['human', 'Reader correction'], ['ai_proposal', 'AI proposal']]) { const option = el('option', origin, text); option.value = value; }
    origin.value = 'human'; values.origin = origin;
    inspector.insertBefore(form, sourceArea);
    const status = el('p', form); editDraft = { node: node.id, status };
    local(form, 'Save summary', () => send('update_summary', { node: node.id, ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.value])) }));
    local(form, 'Cancel', () => { if (!busy) { editDraft = undefined;api.postMessage({type:'view_event',event:'summary_cancel',revision:state.documentRevision,node:node.id});form.remove(); } });
  }
  function renderSource() {
    if (!sourceArea) return;
    if (!passage) { sourceArea.replaceChildren();sourceReader=undefined;el('p',sourceArea,'Opening saved source association…','muted');return; }
    if (!sourceReader) {
      sourceArea.replaceChildren();const host=el('section',sourceArea);savedSource=el('div',sourceArea);
      sourceReader=window.MRWSourceReader.create({root:savedSource,host,initialMode:sourceMode,originalLabel:'Stacks page',
        onBrowser:()=>send('stacks_page',{node:selected}),
        onMode:mode=>{sourceMode=mode;api.postMessage({type:'view_event',event:'source_mode',revision:state.documentRevision,node:selected,mode});}});
    }
    savedSource.replaceChildren();
    if (!/^[A-Z0-9]{4}$/.test(passage.tag || '')) {
      sourceReader.update(undefined);el('p',savedSource,passage.notice || 'No corresponding Stacks tag is saved.','warning');
      if(passage.exact_text)el('pre',savedSource,passage.exact_text);return;
    }
    sourceReader.update({sourceId:'stacks-project',name:'Stacks Project · Tag '+passage.tag,
      url:'https://stacks.math.columbia.edu/tag/'+passage.tag,origins:['https://stacks.math.columbia.edu'],supported:true,revision:passage.commit});
    el('p',savedSource,`${passage.authors} · Git ${passage.commit}`,'source-caption');
    for(const part of passage.parts){el('h3',savedSource,part.role==='statement'?'Statement':'Proof');window.MRWStacks.part(savedSource,part,(action,tag)=>send('stacks_citation',{node:selected,tag}));}
    controls();
  }
  function clearSelection() {
    selected = undefined; passage = undefined; request++;
    inspector.replaceChildren(); el('p', inspector, 'Select a vertex to read its Stacks passage.', 'muted');
    map.select(undefined); sourceArea = undefined;
  }
  function selectNode(id, focus = false) {
    if (editDraft) { editDraft.status.textContent = 'Save or cancel this summary first.'; return; }
    if (!state.projection.order.includes(id)) return;
    selected = id; passage = undefined; map.select(id, focus); inspector.replaceChildren();
    const node = state.graph.nodes.find(n => n.id === id);
    el('h2', inspector, node.title); math(inspector, node.claim); attributed(inspector, node.explanation); nodeActions(inspector, node);
    const details = el('details', inspector); el('summary', details, 'Premises and original steps'); argument(details, node);
    sourceArea = el('section', inspector); sourceReader=undefined; renderSource();
    api.postMessage({ type: 'inspect', revision: state.documentRevision, node: id, request: ++request });
    controls();
  }
  function setup() {
    root.replaceChildren(); document.body?.classList?.add('proof-workspace');
    header = el('header', root); bar = el('div', root, undefined, 'reading-bar'); count = el('p', root, undefined, 'proof-count');
    shell = el('div', root, undefined, 'proof-shell'); const stage = el('section', shell, undefined, 'proof-stage');
    const controls = el('div', stage, undefined, 'proof-map-controls');
    local(controls, '−', () => map.zoom(1.25), 'Zoom out'); local(controls, 'Fit', () => map.fit(), 'Fit the displayed graph'); local(controls, '+', () => map.zoom(.8), 'Zoom in');
    const search = el('input', controls); search.type = 'search'; search.placeholder = 'Find a claim'; search.setAttribute('aria-label', 'Find a claim');
    search.addEventListener('keydown', e => { if (e.key === 'Enter' && search.value.trim()) { const id = map.find(search.value.trim()); if (id) selectNode(id, true); } });
    mapHost = el('div', stage); map = window.MRWProofMap.create(mapHost, selectNode);
    el('p', stage, 'Select to read · drag to pan · wheel to zoom · dashed arrows cross deleted steps', 'proof-legend');
    inspector = el('aside', shell, undefined, 'proof-inspector'); inspector.setAttribute('aria-label', 'Selected claim and Stacks passage');
    readingList = el('details', root, undefined, 'proof-reading-list');
    clearSelection();
  }
  function render(previous) {
    const { graph, projection } = state; if (!shell) setup();
    const changed = previous && previous.documentRevision !== state.documentRevision;
    header.replaceChildren(); el('h1', header, graph.title); attributed(header, graph.description);
    const provenance = el('details', header); el('summary', provenance, 'Provenance');
    el('p', provenance, 'Structure validated. Claims and inferences remain attributed proposals; mathematical correctness has not been checked.');
    if (state.notice) el('p', header, state.notice, 'warning');
    bar.replaceChildren();
    button(bar, graph.description.origin === 'ai_proposal' ? 'Use AI outline' : 'Use proposed outline', 'proposal', {}, 'Apply the proposed selection.');
    button(bar, 'Restore all vertices', 'restore_all', {}, 'Display every original claim and inference.');
    button(bar, 'Edit outline', 'edit', {}, 'Edit claims and summaries in the ordinary JSON document.');
    button(bar, 'Ask AI…', 'ask', {}, 'Prepare an exact request; Send remains separate.'); button(bar, 'Refresh', 'refresh');
    local(bar, 'Conclusion', () => selectNode(graph.goals[0], true), 'Read the conclusion and its corresponding Stacks tag.');
    count.textContent = `${projection.order.length} visible claims · ${projection.hidden.length} deleted from display`;
    if (changed) { mapHost.replaceChildren(); map = window.MRWProofMap.create(mapHost, selectNode); }
    map.update(state);
    if (changed || (selected && !projection.order.includes(selected))) clearSelection();
    else if (selected) map.select(selected);
    readingList.replaceChildren(); el('summary', readingList, 'All displayed claims and derivations');
    for (const id of projection.order) {
      const n = graph.nodes.find(n => n.id === id), card = el('section', readingList, undefined, 'region'); card.id = 'claim-' + id;
      local(card, n.title, () => selectNode(id, true), 'Select this claim in the graph and read its Stacks passage.');
      math(card, n.claim); attributed(card, n.explanation); nodeActions(card, n); argument(card, n);
    }
    if (projection.hidden.length) {
      const omitted = el('details', readingList); el('summary', omitted, 'Deleted vertices');
      for (const id of projection.hidden) button(omitted, 'Restore: ' + title(id), 'restore', { node: id });
    }
    if (reselectAfterSave) { const id = reselectAfterSave; reselectAfterSave = undefined; selectNode(id); }
    controls();
  }
  const startupTimer = setTimeout(() => {
    if (state) return;
    root.replaceChildren();
    el('p', root, 'The proof outline did not open.', 'warning');
    local(root, 'Retry', () => { busy = false; send('ready'); });
  }, 15000);
  window.addEventListener('message', event => {
    // VS Code forwards from a same-origin wrapper and masks window.parent.
    // Its event.source is not this window; the embedded Stacks origin differs.
    if (event.origin !== window.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'graph') {
      clearTimeout(startupTimer);
      const previous = state; state = data;
      try { render(previous); }
      catch (error) { el('p', root, 'Cannot display proof outline: ' + error.message, 'warning'); }
    }
    else if (data.type === 'summary_saved') { editDraft = undefined; reselectAfterSave = data.node; }
    else if (data.type === 'passage' && data.node === selected && data.request === request && data.revision === state.documentRevision) {
      passage = data.passage;
      if (passage.tag && !/^[A-Z0-9]{4}$/.test(passage.tag)) passage = { tag: null, notice: 'Invalid Stacks tag.' };
      renderSource();
    } else if (data.type === 'idle') { busy = false; controls(); }
    else if (data.type === 'error') { clearTimeout(startupTimer); el('p', inspector || root, data.message, 'warning'); }
  });
  api.postMessage({ type: 'ready' });
})();
