'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { digest } = require('./navigation'), { within } = require('./proofGraph'), { outlineHtml } = require('./outlines');
const encoded = value => JSON.stringify(value, null, 2) + '\n';
function studyPassages(selected) {
  if (!Array.isArray(selected) || !selected.length || selected.length > 16) throw new Error('Choose one proof and at most fifteen prerequisites.');
  if (new Set(selected.map(p => p.reference)).size !== selected.length) throw new Error('A passage was selected twice.');
  return selected.map((p, i) => {
    if (typeof p.text !== 'string' || !p.text.trim() || Buffer.byteLength(p.text) > 128 * 1024 ||
        typeof p.reference !== 'string' || !/^mrw-outline:v[12]\//.test(p.reference) || !/^[a-f0-9]{64}$/.test(p.source_revision) ||
        !['published','human_reviewed','awaiting_human_review'].includes(p.review) || typeof p.label !== 'string' || p.label.length > 240) throw new Error('Choose a nonempty exact retained passage.');
    const url = new URL(p.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('The retained source needs an HTTPS bibliographic reference.');
    return { ...p, id: 'passage-' + (i + 1), role: i === 0 ? 'proof' : 'prerequisite', sha256: digest(p.text) };
  });
}
function sources(study) {
  return study.passages.map(p => ({ id: p.id, title: [p.authors, p.label].filter(Boolean).join(' · ').slice(0, 240), file: 'study-sources/' + p.sha256 + '.txt',
    sha256: p.sha256, url: p.url, revision: p.source_revision, review: p.review }));
}
function validateStudy(study) {
  if (study?.version !== 1 || typeof study.title !== 'string' || !study.title.trim() || study.title.length > 240 ||
      typeof study.question !== 'string' || study.question.length > 8192 || !study.question.trim() ||
      (study.outline !== null && (typeof study.outline !== 'string' || path.basename(study.outline) !== study.outline || !study.outline.endsWith('.mrw-proof.json')))) throw new Error('Invalid proof study.');
  const passages = studyPassages(study.passages);
  if (passages.some((p, i) => p.sha256 !== study.passages[i].sha256 || p.id !== study.passages[i].id || p.role !== study.passages[i].role)) throw new Error('Study passage identity or exact text changed.');
  if (Buffer.byteLength(encoded(study)) > 1024 * 1024) throw new Error('Proof study exceeds 1 MiB.');
  return study;
}
function handoff(study, schema) {
  validateStudy(study);
  const fence = String.fromCharCode(96).repeat(4);
  const rows = ['# ' + study.title, '', 'Question: ' + study.question, '',
    'Propose a source-based proof outline as one JSON object using the schema below.',
    'Use origin "ai_proposal" and identify the author in every explanation. Preserve hypotheses,',
    'joint premises, alternative inferences and local scope. Identify unsupported steps in their explanations.',
    'Structural validation is separate from mathematical checking.',
    'Use only these selected sources. Copy their source entries exactly. Each citation must include',
    'the corresponding MRW reference below and line numbers within its exact passage snapshot.',
    'Do not request or infer access to other private files, reader notes or evidence.', '',
    'Source entries:', fence + 'json', encoded(sources(study)).trimEnd(), fence, ''];
  for (const p of study.passages) {
    const quote = String.fromCharCode(96).repeat(Math.max(4, ...(p.text.match(/\x60+/g) || []).map(s => s.length + 1)));
    rows.push('## ' + p.role + ': ' + p.label, 'Source: ' + p.id, 'Reference: ' + p.reference,
      ...(p.authors ? ['Authors: ' + p.authors] : []), ...(p.license ? ['License: ' + p.license] : []),
      'Retained source SHA-256: ' + p.source_revision, 'Passage SHA-256: ' + p.sha256,
      'Snapshot lines: 1–' + p.text.split(/\r\n|\r|\n/u).length, quote + 'text', p.text, quote, '');
  }
  rows.push('## Outline schema', fence + 'json', encoded(schema).trimEnd(), fence);
  return rows.join('\n');
}
function bindProposal(graph, study) {
  if (!isDeepStrictEqual(graph.sources, sources(study))) throw new Error('Proposal sources differ from the handoff. Keep its exact source entries.');
  const byId = new Map(study.passages.map(p => [p.id, p]));
  for (const n of graph.nodes) for (const c of n.citations) {
    const p = byId.get(c.source);
    if (!p || c.reference !== p.reference || c.end_line > p.text.split(/\r\n|\r|\n/u).length) throw new Error('A citation leaves its selected passage or changes its MRW reference.');
  }
  const explanations = [graph.description, ...graph.nodes.map(n => n.explanation), ...graph.inferences.map(n => n.explanation)];
  if (explanations.some(e => e.origin !== 'ai_proposal' || !e.author?.trim())) throw new Error('Identify the proposal author in each AI explanation.');
  if (!graph.nodes.some(n => n.citations.some(c => c.source === study.passages[0].id))) throw new Error('The outline must cite the selected proof.');
  return graph;
}
function registerProofStudy({ vscode, context, register, bridge, projectRoot, choosePath, selectPassages, readPassage, startStudy, recorder }) {
  const sessions = new Map(), last = 'mrw.proofStudy.v1';
  const schema = () => fs.readFile(path.join(context.extensionPath, 'media/proof-outline.schema.json'), 'utf8').then(JSON.parse);
  async function scoped(file, root, suffix) {
    const parent = await fs.realpath(path.dirname(file)), canonical = path.join(parent, path.basename(file));
    if (!within(root, canonical) || !file.endsWith(suffix)) throw new Error('Choose a study file inside this workspace.');
    try { if ((await fs.lstat(canonical)).isSymbolicLink()) throw new Error('Choose the study file itself, rather than a symbolic link.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return canonical;
  }
  async function create(file, text) {
    try { await fs.lstat(file); throw new Error('Destination contains a file. Choose another name.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const edit = new vscode.WorkspaceEdit(), uri = vscode.Uri.file(file);
    edit.createFile(uri, { overwrite: false, ignoreIfExists: false }); edit.insert(uri, new vscode.Position(0, 0), text);
    if (!await vscode.workspace.applyEdit(edit)) throw new Error('The editor declined creation.');
    const doc = await vscode.workspace.openTextDocument(uri);
    if (!await doc.save()) throw new Error('Save the new document before continuing.');
    return doc;
  }
  async function current(c) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(c.file));
    if (doc.getText() !== c.raw) throw new Error('Study changed. Reopen it before continuing.');
    c.doc = doc;
    return doc;
  }
  async function update(c, candidate) {
    validateStudy(candidate);
    await current(c);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(c.doc.uri, new vscode.Range(new vscode.Position(0, 0), c.doc.positionAt(c.raw.length)), encoded(candidate));
    if (!await vscode.workspace.applyEdit(edit)) throw new Error('The editor declined the study change.');
    c.raw = c.doc.getText(); c.study = candidate;
    if (!await c.doc.save()) throw new Error('The study changes remain unsaved in the ordinary document.');
  }
  async function send(c, notice = '') {
    await c.panel.webview.postMessage({ type: 'study', title: c.study.title, question: c.study.question,
      handoff: handoff(c.study, await schema()), outline: c.study.outline, notice, file: c.file });
  }
  async function importProposal(c) {
    let raw = (await vscode.env.clipboard.readText()).trim();
    if (raw.startsWith(String.fromCharCode(96).repeat(3))) {
      const match = /^\x60{3}(?:json)?\s*\n([\s\S]*?)\n\x60{3}\s*$/i.exec(raw);
      if (!match) throw new Error('Copy the JSON object or its complete JSON code block.');
      raw = match[1];
    }
    const checked = await bridge({ method: 'proof_graph_parse', text: raw }); bindProposal(checked.graph, c.study);
    const uri = await vscode.window.showSaveDialog({ title: 'Save proposed outline',
      defaultUri: vscode.Uri.file(c.file.replace(/\.mrw-study\.json$/, '-' + crypto.randomUUID().slice(0, 8) + '.mrw-proof.json')),
      filters: { 'MRW proof outline': ['mrw-proof.json'] } });
    if (!uri) return;
    if (uri.scheme !== 'file') throw new Error('Choose a local outline file.');
    const file = await scoped(uri.fsPath, c.root, '.mrw-proof.json');
    if (path.dirname(file) !== path.dirname(c.file)) throw new Error('Save the proposed outline beside its study.');
    for (const p of c.study.passages) {
      const retained = await readPassage(p.reference, c.root);
      if (retained.text !== p.text || retained.source_revision !== p.source_revision) throw new Error('A retained passage differs from the handoff.');
    }
    await current(c);
    const folder = path.join(path.dirname(file), 'study-sources');
    try { await fs.mkdir(folder); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (await fs.realpath(folder) !== folder) throw new Error('The snapshot directory must not be a symbolic link.');
    for (const p of c.study.passages) {
      const snapshot = path.join(folder, p.sha256 + '.txt');
      try { if ((await fs.lstat(snapshot)).isSymbolicLink()) throw new Error('A passage snapshot is a symbolic link.'); if (!(await fs.readFile(snapshot)).equals(Buffer.from(p.text))) throw new Error('A passage snapshot changed.'); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        // Quotation exports preserve UTF-8 bytes, independently of editor EOL settings.
        await fs.writeFile(snapshot, Buffer.from(p.text, 'utf8'), { flag: 'wx', mode: 0o600 });
      }
    }
    await create(file, encoded(checked.graph));
    await update(c, { ...c.study, outline: path.basename(file) }); await send(c, 'Outline imported. Structure validated; mathematics not checked.');
    await vscode.commands.executeCommand('mrw.openProofOutline', vscode.Uri.file(file));
  }
  async function open(file, root) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file)), raw = doc.getText();
    if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('Proof study exceeds 1 MiB.');
    const study = validateStudy(JSON.parse(raw));
    await context.workspaceState.update(last, file);
    if (sessions.has(file)) {
      const c = sessions.get(file); c.doc = doc; c.raw = raw; c.study = study; c.panel.reveal(); await send(c); return;
    }
    const panel = vscode.window.createWebviewPanel('mrw.proofStudy', 'Proof work: ' + study.title, vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] });
    const c = { file, root, study, doc, raw, panel, busy: false }; sessions.set(file, c);
    panel.onDidDispose(() => sessions.delete(file));
    panel.webview.onDidReceiveMessage(async m => {
      if (c.busy || !m || typeof m !== 'object') return; c.busy = true;
      try {
        if(m.type!=='ready')recorder?.record('navigation.proof_study_action',{action:m.type,study_revision:digest(c.raw)});
        if(m.type==='active_study'&&startStudy){const s=await startStudy(c.study.passages,c.root,c.study.title);if(!s.unresolved)s.unresolved=c.study.question;}
        else if (m.type === 'ready') await send(c);
        else if (m.type === 'save_question') { await update(c, { ...c.study, question: m.question }); await send(c, 'Question saved.'); }
        else if (m.type === 'copy') { await current(c); await vscode.env.clipboard.writeText(handoff(c.study, await schema())); await send(c, 'Handoff copied. Paste it into Codex.'); }
        else if (m.type === 'import') await importProposal(c);
        else if (m.type === 'outline' && c.study.outline) await vscode.commands.executeCommand('mrw.openProofOutline', vscode.Uri.file(path.join(path.dirname(file), c.study.outline)));
      } catch (error) { recorder?.record('operation.error',{operation:'proof-study.'+m.type,message:error.message});await panel.webview.postMessage({ type: 'error', message: error.message }); }
      finally { c.busy = false; await panel.webview.postMessage({ type: 'idle' }); }
    });
    panel.webview.html = outlineHtml(await fs.readFile(path.join(context.extensionPath, 'src/proofStudyView.js'), 'utf8'), [], '', { kind: 'proofStudy' });
    context.subscriptions.push(panel);
  }
  register('mrw.prepareProofStudy', async () => {
    const root = await projectRoot(vscode.window.activeTextEditor), selected = await selectPassages(root);
    if (!selected) return;
    const passages = studyPassages(selected), question = await vscode.window.showInputBox({ prompt: 'Question to investigate' });
    if (question === undefined) return;
    const study = validateStudy({ version: 1, title: passages[0].label.slice(0, 240), question, passages, outline: null });
    const uri = await vscode.window.showSaveDialog({ title: 'Save proof work', defaultUri: vscode.Uri.file(path.join(root, 'proof-study.mrw-study.json')), filters: { 'MRW proof work': ['mrw-study.json'] } });
    if (!uri) return;
    if (uri.scheme !== 'file') throw new Error('Choose a local study file.');
    const file = await scoped(uri.fsPath, root, '.mrw-study.json'); await create(file, encoded(study)); await open(file, root);
  });
  register('mrw.resumeProofStudy', async uri => {
    const root = await projectRoot(uri?.scheme === 'file' ? { document: { uri } } : vscode.window.activeTextEditor), active = vscode.window.activeTextEditor?.document;
    const file = uri?.scheme === 'file' ? uri.fsPath : active?.uri.scheme === 'file' && active.uri.fsPath.endsWith('.mrw-study.json') ? active.uri.fsPath
      : context.workspaceState.get(last) || await choosePath('Continue proof work (.mrw-study.json)');
    if (file) await open(await scoped(file, root, '.mrw-study.json'), root);
  });
}
module.exports = { registerProofStudy, studyPassages, sources, validateStudy, handoff, bindProposal };
