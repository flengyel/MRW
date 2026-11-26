'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { digest, sourceSnapshot } = require('./navigation');
const { within } = require('./proofGraph');
const { studyPassages, sources, handoff, readProposal, bindProposal } = require('./proofStudy');
const { extractAtlasText } = require('./atlasText');
const { readAtlasAux } = require('./atlasAux');
const { DETAIL_LIMIT, createAtlas, validateAtlas, editAtlas, evidenceSpan, handoffEntries } = require('./atlasModel');
const { atlasDiagram, fitAtlasDiagram, isTexAtlas } = require('./atlasDiagram');
const { atlasHtml, atlasOpenErrorHtml } = require('./atlasView');

const SUFFIX = '.mrw-atlas.json';
const MAX_ATLAS = 2 * 1024 * 1024;
const SOURCE_SCHEME = 'mrw-atlas-source';
const READ_ONLY_ACTIONS = new Set([
  'selectView', 'selectNode', 'showDiagramPage', 'fitDiagramLayout', 'selectComponent', 'showOverview',
  'selectPage', 'followEntry', 'openSource', 'return', 'openAsText', 'toggleProse',
]);
const encode = value => JSON.stringify(value, null, 2) + '\n';

function format(doc) {
  if (doc.languageId === 'markdown' || /\.(md|markdown)$/i.test(doc.uri.path)) return 'markdown';
  if (['latex', 'tex'].includes(doc.languageId) || /\.tex$/i.test(doc.uri.path)) return 'latex';
  if (['lean', 'lean4'].includes(doc.languageId) || /\.lean$/i.test(doc.uri.path)) return 'lean';
  throw new Error('Choose a Markdown, LaTeX or Lean text editor.');
}

function captureSource(doc) {
  const text = doc.getText();
  if (!text.trim() || text.includes('\0') || Buffer.byteLength(text) > MAX_ATLAS) {
    throw new Error('Choose nonempty source text up to 2 MiB.');
  }
  if (Buffer.from(text).toString('utf8') !== text) throw new Error('The source contains an incomplete Unicode character.');
  return { text, revision: digest(text), uri: doc.uri.toString(), title: path.basename(doc.uri.path), language: format(doc) };
}

function sourceExcerpt(atlas, entry, part) {
  const span = part || entry.statement || entry;
  const exact = atlas.source.text.slice(span.start, span.end);
  const retained = atlas.source.passages?.find(passage =>
    passage.start === span.start && passage.end === span.end && passage.text === exact);
  if (retained) {
    const { start, end, ...passage } = retained;
    return passage;
  }
  return {
    anchor: `${atlas.source.revision}#${span.start}-${span.end}`,
    label: entry.title.slice(0, 240),
    text: exact,
    source_revision: atlas.source.revision,
    review: 'awaiting_human_review',
  };
}

function componentEntries(atlas, component) {
  const entries = new Map(atlas.extraction.entries.map(entry => [entry.id, entry]));
  return component.itemIds.map(id => entries.get(id)).filter(Boolean);
}

function referencedEntries(atlas, entries) {
  const ranges = entries.flatMap(entry => [entry.statement || entry, ...(entry.proof ? [entry.proof] : [])]);
  const targets = new Set(atlas.extraction.references
    .filter(ref => ref.target && ranges.some(span => ref.start >= span.start && ref.end <= span.end))
    .map(ref => ref.target));
  return atlas.extraction.entries.filter(entry => targets.has(entry.id) && !entries.includes(entry));
}

function proposalStudy(atlas, component, include, page = 0, includeProofs = []) {
  const { primary, optional } = handoffEntries(atlas, component.id, page);
  const approved = new Set(include === undefined ? optional.map(entry => entry.id) : include);
  if ([...approved].some(id => !optional.some(entry => entry.id === id))) throw new Error('Choose from the displayed source inputs.');
  const selection = atlas.extraction.selection;
  const withinSelection = span => span && span.start >= selection.start && span.end <= selection.end;
  const useProof = withinSelection(primary.proof) ? primary.proof : undefined;
  const selected = primary.selected && primary.partial ? primary.selectedRange : undefined;
  const inputs = [sourceExcerpt(atlas, primary, useProof || selected)];
  if (useProof && primary.statement && withinSelection(primary.statement)) inputs.push(sourceExcerpt(atlas, primary));
  if (!Array.isArray(includeProofs) || includeProofs.some(id => !approved.has(id) ||
      !optional.some(entry => entry.id === id && entry.proof))) throw new Error('Choose a cited proof from the displayed inputs.');
  for (const entry of optional) if (approved.has(entry.id)) {
    inputs.push(sourceExcerpt(atlas, entry));
    if (includeProofs.includes(entry.id)) inputs.push(sourceExcerpt(atlas, entry, entry.proof));
  }
  return {
    version: 1, title: component.title.slice(0, 240),
    question: component.question || 'Which results do the decisive work and why do their hypotheses apply?',
    passages: studyPassages(inputs, true), outline: null,
  };
}

function sourceGraph(atlas, component, page, include, includeProofs = []) {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('Choose a detail page.');
  const entries = componentEntries(atlas, component).slice(page * DETAIL_LIMIT, (page + 1) * DETAIL_LIMIT);
  if (!entries.length) throw new Error('There are no entries on this detail page.');
  const inputs = entries.map(entry => sourceExcerpt(atlas, entry));
  const all = new Set(entries);
  const targets = referencedEntries(atlas, entries);
  const ids = new Set(include === undefined ? targets.map(item => item.id) : include);
  const allowed = new Map([...entries, ...targets].map(item => [item.id, item]));
  if ([...ids].some(id => !allowed.has(id)) || !Array.isArray(includeProofs) ||
      includeProofs.some(id => !allowed.get(id)?.proof || !ids.has(id))) throw new Error('Choose from the displayed source inputs.');
  for (const entry of targets) {
    if (inputs.length === 16 && include === undefined) break;
    if (ids.has(entry.id)) {
      inputs.push(sourceExcerpt(atlas, entry));
      all.add(entry);
    }
  }
  for (const id of includeProofs) inputs.push(sourceExcerpt(atlas, allowed.get(id), allowed.get(id).proof));
  const study = { passages: studyPassages(inputs, true) };
  const description = { author: 'GOLEM XIV source extraction', origin: 'human',
    text: 'Exact source entries. Follow references in the atlas. Add mathematical reasons after inspecting the passages.' };
  const nodes = [...all].map((entry, i) => {
    const passage = study.passages[i], chars = Array.from(passage.text);
    return { id: 'claim-' + (i + 1), title: entry.title.slice(0, 240),
      claim: chars.slice(0, 7500).join('') + (chars.length > 7500 ? '\n[Open the exact passage for the remainder.]' : ''),
      explanation: description, scope: 'document',
      citations: [{ source: passage.id, start_line: 1, end_line: passage.text.split(/\r\n|\r|\n/u).length,
        ...(passage.reference ? { reference: passage.reference } : {}) }] };
  });
  return { study, graph: { version: 1, title: component.title.slice(0, 240), description,
    sources: sources(study), scopes: [{ id: 'document', parent: null, variables: [], assumptions: [] }],
    nodes, inferences: [], goals: nodes.slice(0, entries.length).map(node => node.id), suggested_hidden: [] } };
}

function localRecord(record) {
  validateAtlas(record);
  if (digest(record.source.text) !== record.source.revision || !/^[a-f0-9-]{36}$/.test(record.id)) {
    throw new Error('Atlas capture differs from its pinned revision.');
  }
  const sameFolder = (name, suffix) => typeof name === 'string' && name.length <= 240 &&
    path.basename(name) === name && !name.includes('\\') && name.endsWith(suffix);
  if (record.graphOriginals != null && (typeof record.graphOriginals !== 'object' ||
      Array.isArray(record.graphOriginals) || Object.values(record.graphOriginals).some(value =>
        !sameFolder(value, '.mrw-proof.json')))) throw new Error('Invalid earlier proposal links.');
  if (record.previous?.file && !sameFolder(record.previous.file, SUFFIX)) throw new Error('Invalid earlier atlas link.');
  if (record.graphs !== undefined && (!record.graphs || typeof record.graphs !== 'object' ||
      Array.isArray(record.graphs) || Object.entries(record.graphs).some(([key, value]) =>
        !/^[a-zA-Z0-9_.:-]+:[0-9]+$/.test(key) || !sameFolder(value, '.mrw-proof.json')))) {
    throw new Error('Invalid proof outline links.');
  }
  if (record.source.passages !== undefined) {
    const passages = record.source.passages;
    if (!Array.isArray(passages) || passages.length > 128 || passages.some(p =>
      !p || !Number.isSafeInteger(p.start) || !Number.isSafeInteger(p.end) || p.start < 0 ||
      p.end <= p.start || p.end > record.source.text.length ||
      p.text !== record.source.text.slice(p.start, p.end) || p.source_revision !== record.source.revision ||
      typeof p.reference !== 'string' || !p.reference.startsWith('mrw-outline:v2/'))) throw new Error('Invalid retained atlas passages.');
  }
  return record;
}

async function reviewDraft(bridge, proposal, change, add = false) {
  const graph = structuredClone(proposal.graph);
  const reason = typeof change?.reason === 'string' && change.reason.trim();
  const author = typeof change?.author === 'string' && change.author.trim();
  if (!reason || !author || !Array.isArray(change.premises)) throw new Error('Give the reason, its author, and the premises used together.');
  const base = { premises: change.premises, explanation: { text: reason, author, origin: 'human' } };
  if (add) {
    const p = proposal.study.passages.find(item => item.id === change.source);
    if (!p) throw new Error('Select the exact source of the reason.');
    const citation = { source: p.id, start_line: 1, end_line: p.text.split(/\r\n|\r|\n/u).length,
      ...(p.reference ? { reference: p.reference } : {}) };
    graph.inferences.push({ ...base, id: 'reader-' + randomUUID().slice(0, 12), conclusion: change.conclusion,
      citations: [citation], discharges: [] });
  } else {
    const inference = graph.inferences.find(item => item.id === change.rule);
    if (!inference) throw new Error('The proposed inference is unavailable.');
    Object.assign(inference, base);
  }
  const checked = await bridge({ method: 'proof_graph', graph, hidden: [] });
  return { ...proposal, graph: checked.graph, corrected: true };
}

function registerAtlas({ vscode, context, register, bridge, projectRoot, choosePath, openProofGraph, readPassage, compareWithLean }) {
  const sessions = new Map(), reader = new Map(), sourceBefore = new Map(), selections = new WeakMap();
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection?.(({ textEditor }) => {
    const { document, selection } = textEditor;
    if (!selection.isEmpty) selections.set(document, { version: document.version,
      start: document.offsetAt(selection.start), end: document.offsetAt(selection.end) });
  }) || { dispose() {} });
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SOURCE_SCHEME, {
    provideTextDocumentContent(uri) {
      return reader.get(uri.toString())?.atlas.source.text || 'Reopen the saved atlas to see this capture.';
    },
  }));

  async function extractDocument(source, doc, range) {
    const printedLabels = source.language === 'latex' && doc.uri.scheme === 'file' && !doc.isDirty
      ? await readAtlasAux(doc.uri.fsPath, source.text) : undefined;
    return extractAtlasText(source.text, source.language, range, { printedLabels });
  }

  function canCompare(c) {
    const { language, uri } = c.atlas.source;
    return !!(compareWithLean && c.root && !c.readOnly && language !== 'lean' &&
      /^(?:file|https|mrw-outline):/.test(uri));
  }

  function render(c, notice = '', focus, fittedDiagram) {
    const component = c.atlas.components.find(candidate => candidate.id === c.component);
    const diagramState = c.views[c.view];
    c.diagram = !component && diagramState ? fittedDiagram || atlasDiagram(c.atlas, c.view, {
      ...diagramState, viewport: diagramState.viewport || c.viewport, readable: true, showProse: c.showProse,
    }) : undefined;
    c.notice = notice;
    c.panel.webview.html = atlasHtml(c.panel.webview, c.atlas, {
      view: c.view, diagram: c.diagram, readOnly: c.readOnly, showProse: c.showProse,
      canCompare: canCompare(c),
      component: component?.id, page: c.page, focus, notice, proposal: c.pending?.component === component?.id && c.pending?.page === c.page ? c.pending : undefined,
      hasGraph: !c.readOnly && !!c.atlas.graphs?.[component?.id + ':' + c.page],
      previous: !c.readOnly && !!c.atlas.previous?.file,
      hasOriginal: !c.readOnly && !!c.atlas.graphOriginals?.[component?.id + ':' + c.page],
    });
  }

  async function showSource(c, span, returnToEntry) {
    const key = c.uri.toString();
    const doc = await vscode.workspace.openTextDocument(c.uri);
    const value = doc.getText();
    const bom = value !== c.atlas.source.text && '\ufeff' + value === c.atlas.source.text ? 1 : 0;
    if (value !== c.atlas.source.text && !bom) throw new Error('The captured source could not be shown exactly.');
    const range = new vscode.Range(doc.positionAt(Math.max(0, span.start - bom)), doc.positionAt(Math.max(0, span.end - bom)));
    // Pinned evidence does not replace a native custom editor's preview tab.
    // One capture URI per atlas reuses the same evidence tab for every passage.
    const editor = await vscode.window.showTextDocument(doc, { viewColumn: c.panel.viewColumn, preview: !c.customEditor, selection: range });
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    if (returnToEntry) sourceBefore.set(key, { owner: c, action: returnToEntry });
  }

  function back(c, focus) {
    c.panel.reveal(c.panel.viewColumn);
    render(c, '', focus);
  }

  async function save(c) {
    if (c.readOnly) throw new Error('Open a workspace containing this atlas to save a new revision.');
    const oldFile = c.file;
    const folder = oldFile ? path.dirname(oldFile) : c.folder || c.root;
    const title = c.atlas.source.title.replace(/\.[^.]+$/, '').replace(/[^\w.-]/gu, '-').slice(0, 80) || 'atlas';
    const filename = `${title}-${randomUUID().slice(0, 8)}${SUFFIX}`;
    const target = oldFile || Object.keys(c.atlas.graphs || {}).length ?
      vscode.Uri.file(path.join(folder, filename)) : await vscode.window.showSaveDialog({
        title: 'Save atlas and captured source text', defaultUri: vscode.Uri.file(path.join(folder, filename)),
        filters: { 'GOLEM XIV atlas': ['mrw-atlas.json'] },
      });
    if (!target) return false;
    if (target.scheme !== 'file' || !target.fsPath.endsWith(SUFFIX)) throw new Error('Choose a local .mrw-atlas.json file.');
    const record = localRecord({ ...c.atlas, ...(oldFile ? { previous: { id: c.atlas.id, file: path.basename(oldFile) } } : {}) });
    const raw = encode(record);
    if (Buffer.byteLength(raw) > MAX_ATLAS) throw new Error('Atlas exceeds 2 MiB. Select a smaller source.');
    const result = await bridge({ method: 'atlas_publish', project_root: c.root, path: target.fsPath, text: raw });
    if (c.customEditor) {
      // A native tab's URI identifies the revision it opened. Keep that capture
      // there and continue the saved successor in a separate atlas panel.
      const continuation = {
        component: c.component, page: c.page, view: c.view,
        views: structuredClone(c.views), viewport: c.viewport, pending: c.pending, handoff: c.handoff,
      };
      let successor;
      try { successor = createPanel(c.root, record, result.path); }
      catch (error) {
        throw new Error('Saved ' + result.path + ', but its viewer could not open: ' + error.message + '. Reopen that file to continue.');
      }
      c.atlas = c.savedAtlas;
      c.unsaved = false;
      c.pending = undefined;
      c.handoff = undefined;
      if (!c.atlas.components.some(component => component.id === c.component)) {
        c.component = undefined; c.page = 0;
      }
      render(c, 'This tab retains its opened revision. The saved successor opens separately.');
      Object.assign(successor, continuation);
      render(successor, 'Saved ' + path.basename(result.path));
      return successor;
    }
    if (oldFile && sessions.get(oldFile) === c) sessions.delete(oldFile);
    c.file = result.path;
    c.atlas = record;
    c.unsaved = false;
    sessions.set(c.file, c);
    return c;
  }

  function proofRoute(c) {
    return { back: () => back(c, 'component-proof'), onEvidence(uri) {
      sourceBefore.set(uri.toString(), { owner: c, action: () => back(c, 'component-proof') });
    } };
  }

  async function checkInputs(c, study) {
    for (const p of study.passages) {
      if (p.reference) {
        const retained = await readPassage(p.reference, c.root);
        if (retained.text !== p.text || retained.source_revision !== p.source_revision) {
          throw new Error('An exact cited input differs from the handoff. The draft is still available.');
        }
      } else if (digest(p.text) !== p.sha256 || p.source_revision !== c.atlas.source.revision) {
        throw new Error('A captured passage differs from the handoff. The draft is still available.');
      }
    }
  }

  async function graph(c, component, proposal) {
    const key = component.id + ':' + c.page;
    const existing = c.atlas.graphs?.[key];
    if (!proposal && existing && c.file) {
      return openProofGraph(vscode.Uri.file(path.join(path.dirname(c.file), existing)), proofRoute(c));
    }
    const result = proposal || sourceGraph(c.atlas, component, c.page);
    await checkInputs(c, result.study);
    if (result.original) bindProposal(result.original, result.study, true);
    const checked = await bridge({ method: 'proof_graph', graph: result.graph, hidden: [] });
    if (!c.file) {
      const saved = await save(c);
      if (!saved) return;
      c = saved;
    }
    const folder = path.dirname(c.file);
    const snapshots = Object.fromEntries(result.study.passages.map(passage => [passage.id, passage.text]));
    const publish = async (outline, prefix) => {
      const file = path.join(folder, prefix + randomUUID().slice(0, 12) + '.mrw-proof.json');
      await bridge({ method: 'atlas_graph_publish', project_root: c.root, path: file, graph: outline, snapshots });
      return file;
    };
    const file = await publish(checked.graph, 'atlas-proof-');
    const original = result.original && result.corrected ? await publish(result.original, 'atlas-proposal-') : undefined;
    const before = c.atlas;
    c.atlas = { ...before, graphs: { ...before.graphs, [key]: path.basename(file) },
      ...(original ? { graphOriginals: { ...before.graphOriginals, [key]: path.basename(original) } } : {}) };
    const owner = c;
    try { c = await save(c); }
    catch (error) {
      if (!owner.customEditor || owner.atlas !== owner.savedAtlas) owner.atlas = before;
      throw error;
    }
    c.pending = undefined;
    render(c, 'Proof outline saved.');
    return openProofGraph(vscode.Uri.file(file), proofRoute(c));
  }

  async function message(c, m) {
    if (c.busy || !m || typeof m !== 'object') return;
    c.busy = true;
    try {
      if (c.readOnly && !READ_ONLY_ACTIONS.has(m.type)) {
        render(c, 'Read-only inspection. Open a workspace containing this atlas to edit it or use saved sibling files.');
        return;
      }
      const component = c.atlas.components.find(item => item.id === (m.component || c.component));
      if (m.type === 'toggleProse' && !component && isTexAtlas(c.atlas)) {
        c.showProse = !c.showProse;
        c.views = { map: {}, blueprint: {} };
        render(c, '', 'atlas-show-prose'); return;
      }
      if (m.type === 'selectView' && ['map', 'blueprint', 'list'].includes(m.view)) {
        c.view = m.view;
        c.component = undefined;
        c.page = 0;
        render(c, '', 'atlas-view-' + c.view); return;
      }
      if (m.type === 'fitDiagramLayout' && c.diagram && m.view === c.view) {
        const { width, height } = m;
        if (![width, height].every(value => Number.isSafeInteger(value) && value > 40 && value <= 32768)) return;
        const state = c.views[c.view];
        if (state.viewport?.width === width && state.viewport.height === height) return;
        c.viewport = state.viewport = { width, height };
        const fitted = c.diagram.minimumScale
          ? atlasDiagram(c.atlas, c.view, { selected: c.diagram.selected, viewport: c.viewport,
            readable: true, showProse: c.showProse })
          : fitAtlasDiagram(c.diagram, c.viewport);
        if (fitted.layoutColumns !== c.diagram.layoutColumns || fitted.page !== c.diagram.page ||
            fitted.pageCount !== c.diagram.pageCount || fitted.nodes.length !== c.diagram.nodes.length ||
            fitted.nodes[0]?.id !== c.diagram.nodes[0]?.id) {
          if (fitted.minimumScale) Object.assign(state, { page: fitted.page, selected: fitted.selected });
          const focus = typeof m.focus === 'string' && /^[\w:.-]{1,256}$/.test(m.focus) ? m.focus : 'atlas-view-' + c.view;
          render(c, c.notice, focus, fitted);
        }
        return;
      }
      if (m.type === 'selectNode' && c.diagram?.nodes.some(node => node.id === m.node)) {
        c.views[c.view].selected = m.node;
        render(c, '', 'diagram-node-' + m.node); return;
      }
      if (m.type === 'showDiagramPage' && c.diagram && Number.isSafeInteger(m.page) && m.page >= 0 && m.page < c.diagram.pageCount) {
        const linked = m.node && c.diagram.boundaryEdges.some(edge =>
          (edge.from === m.node && edge.fromPage === m.page) || (edge.to === m.node && edge.toPage === m.page));
        c.views[c.view] = { ...c.views[c.view], page: m.page, selected: linked ? m.node : undefined };
        render(c, '', linked ? 'diagram-node-' + m.node : 'atlas-diagram'); return;
      }
      if (m.type === 'selectComponent' && component) {
        if (c.diagram) c.views[c.view] = { ...c.views[c.view], page: c.diagram.page, selected: c.diagram.selected };
        const index = component.itemIds.indexOf(m.entry);
        c.component = component.id;
        c.page = index < 0 ? 0 : Math.floor(index / DETAIL_LIMIT);
        render(c, '', index < 0 ? undefined : 'entry-' + m.entry); return;
      }
      if (m.type === 'showOverview') {
        c.component = undefined;
        c.page = 0;
        const selected = c.views[c.view]?.selected;
        render(c, '', selected ? 'diagram-node-' + selected : component && 'component-' + component.id); return;
      }
      if (m.type === 'selectPage' && component && Number.isSafeInteger(m.page) && m.page >= 0 && m.page * DETAIL_LIMIT < component.itemIds.length) {
        c.component = component.id; c.page = m.page; render(c); return;
      }
      if (m.type === 'followEntry') {
        const target = c.atlas.components.find(item => item.id === m.entry);
        if (!target) throw new Error('The linked entry is unavailable.');
        c.component = target.id; c.page = Math.floor(target.itemIds.indexOf(m.entry) / DETAIL_LIMIT);
        render(c, '', 'entry-' + m.entry); return;
      }
      if (m.type === 'compareLean' && canCompare(c) &&
          component?.id === c.component && component.itemIds.includes(m.entry)) {
        const entry = c.atlas.extraction.entries.find(item => item.id === m.entry);
        if (!entry || entry.section) throw new Error('Choose a printed statement or passage.');
        const span = evidenceSpan(c.atlas, { entry: entry.id, part: entry.statement ? 'statement' : 'entry' });
        const { title, uri, text, language, revision } = c.atlas.source;
        await compareWithLean({ root: c.root, source: {
          title, uri, text, language, revision, label: entry.printedTitle || entry.title,
          start: span.start, end: span.end,
        } });
        return;
      }
      if (m.type === 'openSource') {
        const span = evidenceSpan(c.atlas, m);
        const { view, diagram, component: origin, page } = c;
        const viewState = { ...c.views[view], page: diagram?.page, selected: diagram?.selected };
        const entry = m.returnEntry || m.entry;
        const focus = diagram?.selected ? 'diagram-node-' + diagram.selected : entry && 'entry-' + entry;
        await showSource(c, span, () => {
          Object.assign(c, { view, component: origin, page });
          if (diagram) c.views[view] = viewState;
          back(c, focus);
        });
      } else if (m.type === 'openAsText' && c.file) {
        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(c.file), 'default', { preview: false });
      } else if (m.type === 'return') {
        if (c.readOnly) {
          await showSource(c, c.atlas.extraction.selection, () => back(c));
          return;
        }
        const uri = vscode.Uri.parse(c.atlas.source.uri);
        const span = c.atlas.extraction.selection;
        let original;
        if (uri.scheme === 'file' || uri.scheme === 'untitled') {
          original = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
        }
        if (!original && uri.scheme === 'file') {
          try { original = await vscode.workspace.openTextDocument(uri); } catch { /* Open the capture below. */ }
        }
        if (original && digest(original.getText()) === c.atlas.source.revision) {
          await vscode.window.showTextDocument(original, { viewColumn: c.panel.viewColumn, preview: false,
            selection: new vscode.Range(original.positionAt(span.start), original.positionAt(span.end)) });
        } else await showSource(c, span, () => back(c));
      } else if (m.type === 'edit') {
        c.atlas = editAtlas(c.atlas, m.change);
        c.unsaved = true;
        if (!c.atlas.components.some(item => item.id === c.component)) { c.component = undefined; c.page = 0; }
        render(c, 'Correction kept in this atlas. Save to retain it.');
      } else if (m.type === 'saveAtlas') {
        const saved = await save(c);
        if (saved) render(saved, 'Saved ' + path.basename(saved.file));
      } else if (m.type === 'regenerate') {
        if (c.atlas.source.language === 'lean' || c.atlas.source.passages) throw new Error('Generate an atlas from the intended source revision. The earlier atlas remains available.');
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(c.atlas.source.uri));
        const source = captureSource(doc);
        const editor = vscode.window.visibleTextEditors.find(item => item.document === doc);
        const old = c.atlas.extraction.selection;
        const wholeDocument = old.start === 0 && old.end === c.atlas.source.text.length;
        // Full-document bounds also represent implicit extraction. Front-matter
        // entries record when the reader deliberately selected that material.
        const earlierRange = wholeDocument && !c.atlas.extraction.entries.some(entry => entry.frontMatter)
          ? undefined : old;
        const recent = selections.get(doc);
        const range = source.revision === c.atlas.source.revision ? earlierRange : editor && !editor.selection.isEmpty
          ? { start: doc.offsetAt(editor.selection.start), end: doc.offsetAt(editor.selection.end) }
          : recent?.version === doc.version ? { start: recent.start, end: recent.end } : undefined;
        if (!range && !wholeDocument) {
          throw new Error('Select the intended passage in the changed document, then regenerate.');
        }
        const prior = c.unsaved ? await save(c) : c;
        if (!prior) return;
        const previous = prior.file ? { id: prior.atlas.id, file: path.basename(prior.file) } : undefined;
        createPanel(prior.root, { ...createAtlas({ source, extraction: await extractDocument(source, doc, range), previous: prior.atlas }),
          id: randomUUID(), previous }, undefined, 'New capture. The earlier atlas is still available.', prior.file && path.dirname(prior.file));
      } else if (m.type === 'openPrevious' && c.file && c.atlas.previous?.file) {
        await open(vscode.Uri.file(path.join(path.dirname(c.file), c.atlas.previous.file)));
      } else if (m.type === 'copyHandoff' && component) {
        const study = proposalStudy(c.atlas, component, m.include, c.page, m.includeProofs);
        await checkInputs(c, study);
        const schema = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'media/proof-outline.schema.json'), 'utf8'));
        await vscode.env.clipboard.writeText(handoff(study, schema, true));
        c.handoff = { study, component: component.id, page: c.page };
        render(c, 'Handoff copied. Paste it into Codex if you want a proposal.');
      } else if (m.type === 'importProposal' && component) {
        if (c.pending) throw new Error('Accept or discard the current review draft before importing another.');
        const sent = c.handoff;
        if (!sent || sent.component !== component.id || sent.page !== c.page) throw new Error('Copy the handoff for this detail first.');
        const original = await readProposal(vscode.env.clipboard, bridge, sent.study, true);
        c.pending = { ...sent, graph: original, original };
        render(c, 'Review the cited steps before saving the outline.', 'proposal-title');
      } else if (m.type === 'startDraft' && component) {
        if (c.pending) throw new Error('Accept or discard the current review draft before starting another.');
        c.pending = { ...sourceGraph(c.atlas, component, c.page, m.include, m.includeProofs), component: component.id, page: c.page, human: true };
        render(c, 'Add a reason using the exact sources before saving.', 'proposal-title');
      } else if (['editProposal', 'addInference'].includes(m.type) && component &&
          c.pending?.component === component.id && c.pending.page === c.page) {
        c.pending = await reviewDraft(bridge, c.pending, m.change, m.type === 'addInference');
        render(c, 'Correction retained in the review draft.', 'proposal-title');
      } else if (m.type === 'discardProposal') {
        c.pending = undefined;
        render(c);
      } else if (m.type === 'acceptProposal' && component && c.pending?.component === component.id && c.pending.page === c.page) {
        await graph(c, component, c.pending);
      } else if (m.type === 'openOriginal' && component && c.file) {
        const file = c.atlas.graphOriginals?.[component.id + ':' + c.page];
        if (file) await openProofGraph(vscode.Uri.file(path.join(path.dirname(c.file), file)), proofRoute(c));
      } else if (m.type === 'openGraph' && component) {
        await graph(c, component);
      }
    } catch (error) { void vscode.window.showErrorMessage('GOLEM XIV: ' + error.message); }
    finally { c.busy = false; }
  }

  function createPanel(root, atlas, file, notice = '', folder, suppliedPanel, readOnly = false) {
    localRecord(atlas);
    const panel = suppliedPanel || vscode.window.createWebviewPanel('mrw.atlas', atlas.source.title + ' — Atlas', vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    if (suppliedPanel) panel.webview.options = { ...panel.webview.options, enableScripts: true, localResourceRoots: [] };
    panel.title = atlas.source.title + ' — Atlas';
    const uri = vscode.Uri.from({ scheme: SOURCE_SCHEME, authority: randomUUID(), path: '/' + atlas.source.title });
    const c = { panel, atlas, root, file, folder, uri, page: 0, view: 'map', views: { map: {}, blueprint: {} }, unsaved: !file, readOnly, customEditor: !!suppliedPanel };
    if (suppliedPanel) c.savedAtlas = structuredClone(atlas);
    if (file) sessions.set(file, c);
    reader.set(uri.toString(), c);
    panel.webview.onDidReceiveMessage(m => message(c, m));
    panel.onDidDispose(() => {
      if (c.file && sessions.get(c.file) === c) sessions.delete(c.file);
      reader.delete(uri.toString());
      for (const [key, value] of sourceBefore) if (value.owner === c) sourceBefore.delete(key);
    });
    context.subscriptions.push(panel);
    render(c, notice);
    return c;
  }

  async function open(uri) {
    const active = vscode.window.activeTextEditor?.document.uri;
    const selection = uri?.scheme === 'file' ? uri.fsPath : active?.scheme === 'file' && active.fsPath.endsWith(SUFFIX)
      ? active.fsPath : await choosePath('Open saved mathematical atlas');
    if (!selection) return;
    const loaded = await readAtlas(vscode.Uri.file(selection));
    if (sessions.has(loaded.path)) { back(sessions.get(loaded.path)); return; }
    if (customEditorRegistered) {
      return vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(loaded.path), 'mrw.atlasEditor', { preview: false });
    }
    return createPanel(loaded.root, loaded.record, loaded.path, '', undefined, undefined, loaded.readOnly);
  }


  // Opening a file is inspection: derive its scope from matching canonical
  // workspace folders, never a chooser or the source URI stored in the JSON.
  async function readAtlas(uri) {
    if (uri?.scheme !== 'file' || !uri.fsPath.endsWith(SUFFIX)) throw new Error('Choose a local .mrw-atlas.json file.');
    const saved = await sourceSnapshot(uri.fsPath);
    if (!saved.path.endsWith(SUFFIX) || Buffer.byteLength(saved.text) > MAX_ATLAS) throw new Error('Choose a saved atlas up to 2 MiB.');
    const record = localRecord(JSON.parse(saved.text));
    let root;
    const matched = vscode.workspace.getWorkspaceFolder?.(vscode.Uri.file(saved.path));
    const folders = [...(matched ? [matched] : []), ...(vscode.workspace.workspaceFolders || [])];
    for (const folder of folders) {
      if (folder?.uri?.scheme !== 'file') continue;
      const candidate = await fs.realpath(folder.uri.fsPath).catch(() => undefined);
      if (candidate && within(candidate, saved.path) && (!root || candidate.length > root.length)) root = candidate;
    }
    return { path: saved.path, record, root: root || null, readOnly: !root || vscode.workspace.isTrusted === false };
  }

  async function openCustomDocument(uri, _openContext, token) {
    const document = { uri, dispose() {} };
    if (token?.isCancellationRequested) return document;
    try { document.loaded = await readAtlas(uri); }
    catch (error) { document.error = error.message; }
    return document;
  }

  async function resolveCustomEditor(document, panel, token) {
    if (token?.isCancellationRequested) return;
    if (!document.loaded && !document.error) {
      try { document.loaded = await readAtlas(document.uri); }
      catch (error) { document.error = error.message; }
    }
    if (document.loaded) {
      const loaded = document.loaded;
      return createPanel(loaded.root, loaded.record, loaded.path, '', undefined, panel, loaded.readOnly);
    }
    panel.webview.options = { ...panel.webview.options, enableScripts: true, localResourceRoots: [] };
    panel.title = path.basename(document.uri.fsPath || document.uri.path) + ' — Atlas';
    panel.webview.html = atlasOpenErrorHtml(document.error || 'Atlas opening was cancelled.');
    let busy = false;
    const listener = panel.webview.onDidReceiveMessage(async m => {
      if (busy || !m || !['retryOpen', 'openAsText'].includes(m.type)) return;
      busy = true;
      try {
        if (m.type === 'openAsText') {
          return await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', { preview: false });
        }
        const loaded = await readAtlas(document.uri);
        if (token?.isCancellationRequested) return;
        document.loaded = loaded;
        document.error = undefined;
        listener.dispose();
        return createPanel(loaded.root, loaded.record, loaded.path, '', undefined, panel, loaded.readOnly);
      } catch (error) {
        document.error = error.message;
        panel.webview.html = atlasOpenErrorHtml(document.error);
      } finally { busy = false; }
    });
    panel.onDidDispose(() => listener.dispose());
  }
  const customEditorRegistered = typeof vscode.window.registerCustomEditorProvider === 'function';
  if (customEditorRegistered) context.subscriptions.push(vscode.window.registerCustomEditorProvider('mrw.atlasEditor',
    { openCustomDocument, resolveCustomEditor },
    { supportsMultipleEditorsPerDocument: false, webviewOptions: { retainContextWhenHidden: true } }));

  async function generate(invocation) {
    const retained = invocation?.retained;
    if (retained) {
      const { root: suppliedRoot, selection, ...source } = retained;
      const root = await projectRoot({ document: { uri: vscode.Uri.file(suppliedRoot) } });
      if (root !== suppliedRoot || source.language !== 'latex' || digest(source.text) !== source.revision) {
        throw new Error('The retained source does not belong to this atlas workspace.');
      }
      const extraction = extractAtlasText(source.text, source.language, selection);
      for (const entry of extraction.entries) {
        const span = entry.statement || entry;
        const passage = source.passages.find(p => p.start === span.start && p.end === span.end);
        if (passage?.qualified_id) {
          entry.title = passage.qualified_id + ' · ' + entry.title;
          if (entry.printedTitle) entry.printedTitle = passage.qualified_id + ' · ' + entry.printedTitle;
        }
      }
      return createPanel(root, { ...createAtlas({ source, extraction }), id: randomUUID() });
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor || !['file', 'untitled'].includes(editor.document.uri.scheme)) throw new Error('Open a Markdown, LaTeX or Lean source editor.');
    const source = captureSource(editor.document);
    const selection = editor.selection.isEmpty ? undefined : {
      start: editor.document.offsetAt(editor.selection.start), end: editor.document.offsetAt(editor.selection.end),
    };
    const root = await projectRoot(editor);
    let extraction;
    if (source.language === 'lean') extraction = await lean(vscode, editor, source, selection);
    else extraction = await extractDocument(source, editor.document, selection);
    if (!extraction) return;
    return createPanel(root, { ...createAtlas({ source, extraction }), id: randomUUID() });
  }

  function returnFromCapture() {
    const uri = vscode.window.activeTextEditor?.document.uri;
    const route = uri && sourceBefore.get(uri.toString());
    if (!route) return false;
    route.action();
    return true;
  }
  register('mrw.generateAtlas', generate);
  register('mrw.openAtlas', open);
  register('mrw.returnToAtlas', () => {
    if (!returnFromCapture()) throw new Error('Open an exact passage from an atlas first.');
  });
  return { returnFromCapture };
}

async function lean(vscode, editor, source, selection) {
  const cursor = editor.document.offsetAt(editor.selection.active);
  const start = selection?.start ?? cursor;
  const head = /\b(?:theorem|lemma)\s+([\p{L}\p{N}_'.]+)\b/gu;
  const candidates = [...source.text.matchAll(head)];
  const named = candidates.find(match => selection && match.index >= start && match.index < selection.end) ||
    candidates.filter(match => match.index <= start).at(-1) || candidates[0];
  const name = await vscode.window.showInputBox({
    title: 'Outline a Lean theorem', prompt: 'Qualified name of the theorem to inspect', value: named?.[1] || '',
  });
  if (!name?.trim()) return;
  const match = candidates.find(item => item[1] === name || name.endsWith('.' + item[1])) || named;
  const range = selection || (match ? { start: match.index, end: candidates.find(item => item.index > match.index)?.index ?? source.text.length }
    : { start: 0, end: source.text.length });
  const { inspectLeanSource } = require('./atlasLean');
  const written = inspectLeanSource({ source: source.text, declaration: name, selection: range });
  const writtenProof = written?.proofSpan;
  const entry = { id: 'lean-theorem', kind: 'theorem', title: name,
    start: written?.sourceSpan.start ?? range.start, end: written?.sourceSpan.end ?? range.end,
    selected: true, statement: writtenProof ? { start: written.sourceSpan.start, end: writtenProof.start } : written?.sourceSpan || range,
    ...(writtenProof && writtenProof.end > writtenProof.start ? { proof: writtenProof } : {}) };
  const extraction = { selection: range, entries: [entry], references: [], limitations: [], ...(written ? { lean: written } : {}) };
  extraction.limitations.push('Lean source reading only. Theorem checking and proof-value extraction are separate actions outside this workflow.');
  return extraction;
}

module.exports = { registerAtlas, proposalStudy, sourceGraph, captureSource, reviewDraft };
