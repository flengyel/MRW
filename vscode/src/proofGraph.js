'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest, sourceSnapshot, httpsViewer } = require('./navigation');
const { capture } = require('./assistance');
const { outlineHtml } = require('./outlines');

const MAX_GRAPH = 512 * 1024;
const within = (root, file) => { const relative = path.relative(root, file); return relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative); };

async function readSources(file, graph) {
  const base = await fs.realpath(path.dirname(file)), result = {};
  for (const source of graph.sources) {
    try {
      const candidate = path.join(base, source.file);
      if (!within(base, await fs.realpath(candidate))) throw new Error('Snapshot leaves the outline directory.');
      const snapshot = await sourceSnapshot(candidate);
      if (snapshot.revision !== source.sha256) throw new Error('Snapshot changed; the earlier digest is still pinned.');
      const lines = snapshot.text.split(/\r\n|\r|\n/u);
      if (graph.nodes.some(n => n.citations.some(c => c.source === source.id && c.end_line > lines.length))) {
        throw new Error('Pinned citation lies outside this snapshot.');
      }
      result[source.id] = { status: 'pinned snapshot', text: snapshot.text };
    } catch (error) { result[source.id] = { status: error.message }; }
  }
  return result;
}

function tagPassage(result) {
  const published = result.outline?.published, ref = result.reference;
  const part = published?.parts?.[ref?.region];
  const sameSpan = (a, b) => a && b && ['source_revision', 'start_line', 'start_col', 'end_line', 'end_col'].every(k => a[k] === b[k]);
  const region = result.outline?.regions.find(n => n.id === ref?.region);
  if (ref?.status === 'unchanged' && part && /^[A-Z0-9]{4}$/.test(part.tag) && sameSpan(region?.span, part.span)) {
    const parts = Object.values(published.parts).filter(p => p.tag === part.tag && ['statement', 'proof'].includes(p.role) &&
      sameSpan(result.outline.regions.find(n => n.id === p.region)?.span, p.span));
    parts.sort((a, b) => a.span.start_line - b.span.start_line);
    return { tag: part.tag, parts, commit: published.commit, authors: published.authors, source_revision: published.source_revision };
  }
  const doc = result.document;
  let exact = '';
  if (doc) {
    const lines = doc.text.split('\n'), [sl, sc] = doc.start, [el, ec] = doc.end;
    exact = sl === el ? lines[sl].slice(sc, ec) : [lines[sl].slice(sc), ...lines.slice(sl + 1, el), lines[el].slice(0, ec)].join('\n');
  }
  return { tag: null, parts: [], notice: ref?.notice || 'No exact published tag association.', exact_text: exact };
}

function citedTags(passage) {
  const tags = new Set(passage.tag ? [passage.tag] : []);
  function walk(tokens) {
    for (const t of tokens || []) {
      if (t.kind === 'reference' && /^[A-Z0-9]{4}$/.test(t.tag)) tags.add(t.tag);
      if (t.children) walk(t.children);
      for (const item of t.items || []) walk(item);
    }
  }
  for (const part of passage.parts) walk(part.tokens);
  return tags;
}

function registerProofGraph({ vscode, context, register, bridge, projectRoot, choosePath, show, askProof, followPinned, readPinned, recorder, onMaterial }) {
  const panels = new Map();
  const key = (file, revision) => 'mrw.proofGraph.v1.' + digest(file + '\0' + revision);
  async function render(c, hidden) {
    // Stage a complete projection and UI state before replacing the live view.
    const model = await bridge({ method: 'proof_graph', graph: c.graph, hidden });
    await context.workspaceState.update(key(c.file, c.revision), model.projection.hidden);
    c.model = model;
    await c.panel.webview.postMessage({ type: 'graph', ...model,
      sourceStatus: Object.fromEntries(Object.entries(c.sources).map(([id, v]) => [id, v.status])),
      notice: c.notice || '', documentRevision: c.revision });
  }
  async function load(c) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(c.file));
    const raw = doc.getText();
    if (Buffer.byteLength(raw, 'utf8') > MAX_GRAPH) throw new Error('Proof outline exceeds 512 KiB.');
    // The strict Python JSON reader rejects duplicate keys before projection.
    const checked = await bridge({ method: 'proof_graph_parse', text: raw });
    const revision = digest(raw), previous = c.revision;
    const sources = await readSources(c.file, checked.graph);
    const saved = context.workspaceState.get(key(c.file, revision), []);
    c.graph = checked.graph; c.revision = revision; c.sources = sources;
    c.passages = new Map();
    c.notice = previous && previous !== revision ? 'Outline changed. The earlier display selection stays bound to its earlier revision.' : '';
    c.panel.title = `Proof: ${c.graph.title}`;
    // Corrupt host UI state may not change the graph or delete a boundary.
    try { await render(c, saved); }
    catch (error) {
      if (error.code !== 'ACTION_REJECTED' || !Array.isArray(saved) || !saved.length) throw error;
      await render(c, []);
    }
  }
  async function message(c, m) {
    if (!m || typeof m !== 'object') return;
    if(m.type==='view_event'){
      if(m.revision===c.revision&&['source_mode','expand_steps','summary_cancel'].includes(m.event)&&c.graph?.nodes.some(n=>n.id===m.node))recorder?.record('navigation.graph_'+m.event,{node:m.node,revision:c.revision,mode:['live','saved'].includes(m.mode)?m.mode:null,expanded:!!m.expanded,meaning:'Exposure opportunity only.'});return;
    }
    if (m.type === 'inspect') {
      if (m.revision !== c.revision || !Number.isSafeInteger(m.request) || m.request < 1) return;
      const node = c.graph.nodes.find(n => n.id === m.node);
      if (!node) return;
      const picked=node.citations.find(x=>x.reference); if(picked)onMaterial?.({root:c.root,reference:picked.reference,claim:node.id,revision:c.revision});
      recorder?.record('navigation.graph_select',{node:node.id,revision:c.revision,reference:picked?.reference});
      const token = c.inspection = (c.inspection || 0) + 1, revision = c.revision;
      try {
        const citation = node.citations.find(x => x.reference);
        const passage = citation && readPinned ? tagPassage(await readPinned(citation.reference, c.root))
          : { tag: null, parts: [], notice: 'This claim has no saved Stacks passage reference.' };
        if (token !== c.inspection || revision !== c.revision) return;
        c.passages.set(node.id, passage);
        await c.panel.webview.postMessage({ type: 'passage', node: node.id, request: m.request, revision, passage });
      } catch (error) {
        if (token === c.inspection && revision === c.revision) await c.panel.webview.postMessage({ type: 'passage',
          node: node.id, request: m.request, revision, passage: { tag: null, parts: [], notice: error.message } });
      }
      return;
    }
    if (c.busy) return;
    c.busy = true;
    recorder?.record('navigation.graph_action',{action:m.type,node:m.node,revision:c.revision});
    try {
      if (m.type === 'ready' || m.type === 'refresh') { await load(c); return; }
      if (m.revision !== c.revision) throw new Error('Outline view changed; use its current controls.');
      const node = c.graph.nodes.find(n => n.id === m.node);
      if (m.type === 'study_current') {
        const citation=node?.citations.find(x=>x.reference);if(!citation)throw new Error('Select a claim with a retained passage citation.');
        await vscode.commands.executeCommand('mrw.studyCurrent',{reference:citation.reference});
      } else if (m.type === 'update_summary') {
        if (!node) throw new Error('Unknown proof vertex.');
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(c.file)), raw = doc.getText(), version = doc.version;
        if (digest(raw) !== c.revision) throw new Error('Outline changed; refresh before editing its summary.');
        const graph = JSON.parse(JSON.stringify(c.graph)), changed = graph.nodes.find(n => n.id === node.id);
        changed.claim = m.claim; changed.explanation = { text: m.explanation, author: m.author, origin: m.origin ?? 'human' };
        const checked = await bridge({ method: 'proof_graph', graph, hidden: c.model.projection.hidden });
        if (doc.isClosed || doc.version !== version || doc.getText() !== raw) throw new Error('Outline changed during summary editing.');
        const edit = new vscode.WorkspaceEdit();
        edit.replace(doc.uri, new vscode.Range(new vscode.Position(0, 0), doc.positionAt(raw.length)), JSON.stringify(checked.graph, null, 2) + '\n');
        if (!await vscode.workspace.applyEdit(edit)) throw new Error('The editor declined the summary edit.');
        if (!await doc.save()) throw new Error('Summary changes remain unsaved in the ordinary outline document.');
        await context.workspaceState.update(key(c.file, digest(doc.getText())), c.model.projection.hidden);
        await c.panel.webview.postMessage({ type: 'summary_saved', node: node.id });
        await load(c);
      } else if (m.type === 'delete' || m.type === 'restore') {
        if (!node) throw new Error('Unknown proof vertex.');
        const hidden = new Set(c.model.projection.hidden);
        if (m.type === 'delete') hidden.add(node.id); else hidden.delete(node.id);
        await render(c, [...hidden]);
      } else if (m.type === 'restore_all') await render(c, []);
      else if (m.type === 'proposal') await render(c, c.graph.suggested_hidden);
      else if (m.type === 'edit') {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(c.file));
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        if (node) {
          const index = doc.getText().indexOf('"nodes"');
          const match = new RegExp('"id"\\s*:\\s*"' + node.id + '"').exec(doc.getText().slice(index));
          if (match) {
            const point = doc.positionAt(index + match.index);
            editor.selection = new vscode.Selection(point, point);
            editor.revealRange(new vscode.Range(point, point), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          }
        }
      } else if (m.type === 'ask') {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(c.file));
        if (digest(doc.getText()) !== c.revision) throw new Error('Outline changed; refresh before preparing a summary request.');
        const end = doc.positionAt(doc.getText().length);
        await askProof(capture({ document: doc, selection: new vscode.Selection(new vscode.Position(0, 0), end) }), c.root);
      } else if (m.type === 'stacks_page' || m.type === 'stacks_citation') {
        let passage = c.passages.get(node?.id);
        if (!passage && node && readPinned) {
          const citation = node.citations.find(c => c.reference);
          if (citation) { passage = tagPassage(await readPinned(citation.reference, c.root)); c.passages.set(node.id, passage); }
        }
        const tag = m.type === 'stacks_page' ? passage?.tag : m.tag;
        if (!passage || !tag || !citedTags(passage).has(tag)) throw new Error('Choose an exact Stacks tag or an explicit citation in the displayed passage.');
        await vscode.env.openExternal(vscode.Uri.parse('https://stacks.math.columbia.edu/tag/' + tag));
      } else if (m.type === 'source' || m.type === 'published' || m.type === 'upstream') {
        if (!node || !Number.isSafeInteger(m.citation)) throw new Error('Choose a pinned source citation.');
        const citation = node.citations[m.citation];
        if (!citation) throw new Error('Unknown source citation.');
        const source = c.graph.sources.find(s => s.id === citation.source);
        if (m.type === 'published') {
          if (!citation.reference) throw new Error('No saved passage reference.');
          await followPinned(citation.reference, c.root);
        } else if (m.type === 'upstream') {
          await vscode.env.openExternal(vscode.Uri.parse(httpsViewer(source.url)));
        } else {
          // Verify the snapshot again; never show changed bytes as the pin.
          const latest = (await readSources(c.file, c.graph))[source.id];
          const retained = c.sources[source.id];
          const text = retained.text ?? latest.text;
          if (text === undefined) throw new Error(latest.status);
          const excerpt = text.split(/\r\n|\r|\n/u).slice(citation.start_line - 1, citation.end_line).join('\n');
          await show(`${source.title}\nRevision: ${source.revision}\nSHA-256: ${source.sha256}\nLines ${citation.start_line}–${citation.end_line}\n${source.review}\n${source.environment || ''}\n${latest.status}\n\n${excerpt}`, 'Pinned-proof-source');
        }
      }
    } catch (error) {
      recorder?.record('operation.error',{operation:'graph.'+m.type,message:error.message,revision:c.revision});
      await c.panel.webview.postMessage({ type: 'error', message: error.message });
      void vscode.window.showErrorMessage(`MRW: ${error.message}`);
    } finally {
      c.busy = false;
      await c.panel.webview.postMessage({ type: 'idle' });
    }
  }
  register('mrw.openProofOutline', async uri => {
    const active = vscode.window.activeTextEditor?.document;
    const chosen = uri?.scheme === 'file' ? uri.fsPath : active?.uri.scheme === 'file' && active.uri.fsPath.endsWith('.mrw-proof.json') ? active.uri.fsPath : await choosePath('Open proof outline (.mrw-proof.json)');
    if (!chosen) return;
    if (!chosen.endsWith('.mrw-proof.json')) throw new Error('Choose a .mrw-proof.json file.');
    const file = await fs.realpath(chosen);
    const root = await projectRoot({ document: { uri: vscode.Uri.file(file) } });
    if (!within(root, file)) throw new Error('Open a proof outline inside the selected workspace.');
    if (panels.has(file)) {
      const c = panels.get(file); c.panel.reveal();
      if (c.busy) throw new Error('Wait for the current proof-outline action.');
      c.busy = true;
      try { await load(c); }
      finally { c.busy = false; await c.panel.webview.postMessage({ type: 'idle' }); }
      return;
    }
    const snapshot = await sourceSnapshot(file);
    if (Buffer.byteLength(snapshot.text, 'utf8') > MAX_GRAPH) throw new Error('Proof outline exceeds 512 KiB.');
    // Invalid documents do not leave a new empty panel behind.
    await bridge({ method: 'proof_graph_parse', text: snapshot.text });
    const panel = vscode.window.createWebviewPanel('mrw.proofGraph', 'Proof outline', vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    const c = { panel, root, file, busy: false }; panels.set(file, c);
    panel.onDidDispose(() => panels.delete(file));
    panel.webview.onDidReceiveMessage(m => message(c, m));
    if (panel.onDidChangeViewState) context.subscriptions.push(panel.onDidChangeViewState(event => {
      if (event.webviewPanel.visible && !c.busy) void panel.webview.postMessage({ type: 'idle' });
    }));
    const support = await Promise.all(['media/katex/katex.min.js', 'media/katex/auto-render.min.js', 'src/annotationView.js', 'src/stacksView.js', 'src/proofGraphMap.js', 'src/sourceReader.js'].map(f => fs.readFile(path.join(context.extensionPath, f), 'utf8')));
    const script = await fs.readFile(path.join(context.extensionPath, 'src/proofGraphView.js'), 'utf8');
    const style = await fs.readFile(path.join(context.extensionPath, 'media/proof-graph.css'), 'utf8');
    panel.webview.html = outlineHtml(script, support, style, { frameOrigins: ['https://stacks.math.columbia.edu'], kind: 'proof' });
    context.subscriptions.push(panel);
  });
}

module.exports = { registerProofGraph, readSources, within, tagPassage };
