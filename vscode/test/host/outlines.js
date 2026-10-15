'use strict';
// Normal WSL host bootstrap. Dialog choices and DOM input are scripted; all
// production commands, webview DOM, disk persistence and restart are real.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function rendererProbe() {
  const api = acquireVsCodeApi(); window.acquireVsCodeApi = () => api;
  const failures = []; window.addEventListener('error', e => failures.push(e.message || e.target.src), true);
  window.addEventListener('securitypolicyviolation', e => failures.push(`CSP ${e.violatedDirective}: ${e.blockedURI}`));
  window.addEventListener('message', event => {
    const v = event.data; if (v.type !== 'host-test') return;
    try {
      const node = v.selector ? document.querySelector(v.selector) : document;
      if (!node) throw new Error(`DOM target unavailable: ${v.selector}`);
      if (v.op === 'form') for (const [name, value] of Object.entries(v.values)) {
        const field = node.querySelector(`[name="${name}"]`);
        if (!field) throw new Error(`Missing form field ${name}`);
        field.value = value; field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (v.op === 'click') {
        if (node.disabled) throw new Error('DOM button is disabled');
        node.scrollIntoView({ block: 'center' }); node.click();
      }
      if (v.op === 'scroll') node.scrollIntoView({ block: 'center' });
      const result = v.op === 'query' ? { text: node.textContent, arguments: [...node.querySelectorAll('[data-argument]')].map(n => n.textContent),
        statements: [...node.querySelectorAll('[data-statement]')].map(n => n.textContent),
        goals: [...node.querySelectorAll('[data-goal]')].map(n => n.textContent),
        contexts: [...node.querySelectorAll('[data-context]')].map(n => n.textContent),
        forms: [...node.querySelectorAll('form')].map(n => ({ key: n.dataset.draft, values: Object.fromEntries(new FormData(n)) })),
        unsafeNodes: node.querySelectorAll('img,iframe,a').length, failures, scripts: [...document.scripts].map(s => s.src), width: window.innerWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth } : true;
      api.postMessage({ type: 'host-test-reply', token: v.token, result });
    } catch (error) { api.postMessage({ type: 'host-test-reply', token: v.token, error: error.message }); }
  });
}

async function activate(context) {
  const configPath = path.join(context.extensionPath, 'host-test.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const reportPath = path.join(config.artifacts, `outline-${config.phase}.json`);
  const report = { phase: config.phase, version: vscode.version, platform: process.platform, remote: vscode.env.remoteName, checks: [] };
  const errors = [], picks = [], opens = [], requests = [], controllers = [];
  const originals = { showQuickPick: vscode.window.showQuickPick, showOpenDialog: vscode.window.showOpenDialog,
    showErrorMessage: vscode.window.showErrorMessage, createWebviewPanel: vscode.window.createWebviewPanel };
  const save = () => fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  const check = async (name, action) => {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.stack }); throw error; }
    finally { await save(); }
  };
  vscode.window.showQuickPick = async options => {
    assert.ok(picks.length, 'Unscripted reader choice');
    const choose = picks.shift(); const value = options.find(choose); assert.ok(value, 'Reader choice exists'); return value;
  };
  vscode.window.showOpenDialog = async () => { assert.ok(opens.length); return [vscode.Uri.file(opens.shift())]; };
  vscode.window.showErrorMessage = async message => { errors.push(message); };
  let serial = 0, failPublication = false, publicationGate, publicationWaiting = false;
  vscode.window.createWebviewPanel = (...args) => {
    const panel = originals.createWebviewPanel(...args), webview = panel.webview;
    const c = { panel, pending: new Map(), model: null, idle: 0 }; controllers.push(c);
    const nativePost = webview.postMessage.bind(webview), nativeReceive = webview.onDidReceiveMessage.bind(webview);
    webview.postMessage = value => {
      if (value.type === 'outline') c.model = value.model;
      if (value.type === 'idle') c.idle++;
      return nativePost(value);
    };
    webview.onDidReceiveMessage = (listener, self, disposables) => nativeReceive(value => {
      if (value.type === 'host-test-reply') {
        const job = c.pending.get(value.token); if (job) { c.pending.delete(value.token); value.error ? job.reject(new Error(value.error)) : job.resolve(value.result); }
      } else listener.call(self, value);
    }, undefined, disposables);
    Object.defineProperty(webview, 'html', { get: () => c.html || '', set: value => {
      c.html = value; const nonce = /script nonce="([^"]+)"/.exec(value)[1];
      const patched = value.replace('<script nonce=', `<script nonce="${nonce}">(${rendererProbe.toString()})()</script><script nonce=`);
      // The native property is an accessor on the original webview prototype.
      let proto = Object.getPrototypeOf(webview), descriptor;
      while (proto && !(descriptor = Object.getOwnPropertyDescriptor(proto, 'html'))) proto = Object.getPrototypeOf(proto);
      descriptor.set.call(webview, patched);
    }, configurable: true });
    c.rpc = async (op, selector, values) => {
      const token = ++serial;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { c.pending.delete(token); reject(new Error('Webview probe timeout')); }, 15000);
        c.pending.set(token, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: e => { clearTimeout(timer); reject(e); } });
        nativePost({ type: 'host-test', token, op, selector, values });
      });
    };
    c.action = async selector => {
      const before = c.idle; await c.rpc('click', selector);
      for (let i = 0; i < 300 && c.idle === before; i++) await pause(100);
      assert.ok(c.idle > before, `Reader action completed: ${selector}`);
    };
    return panel;
  };
  const realBridge = bridge.runBridge;
  bridge.runBridge = async (extension, executable, request, options = {}) => {
    assert.ok(request.method.startsWith('outline_'), `Unexpected action ${request.method}`); requests.push(request);
    if (publicationGate && request.method === 'outline_mutate') {
      publicationWaiting = true;
      await publicationGate;
      publicationGate = undefined; publicationWaiting = false;
    }
    const fail = failPublication && request.method === 'outline_mutate';
    if (fail) failPublication = false;
    return realBridge(extension, executable, request, { ...options,
      spawn: (exe, args, settings) => spawn(exe, ['-I', path.join(__dirname, 'offline_outline_bridge.py'), ...(fail ? ['--fail-publication'] : [])], settings) });
  };
  async function command(name) { const value = await vscode.commands.executeCommand(`mrw.${name}`); await pause(180); return value; }
  async function focus(file, start, end) {
    const doc = typeof file === 'string' ? await vscode.workspace.openTextDocument(vscode.Uri.file(file)) : file;
    await vscode.languages.setTextDocumentLanguage(doc, 'plaintext');
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false, preserveFocus: false });
    for (let i = 0; i < 100 && vscode.window.activeTextEditor?.document.uri.toString() !== doc.uri.toString(); i++) {
      await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup'); await pause(100);
    }
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), doc.uri.toString());
    if (start) editor.selection = new vscode.Selection(...start, ...end);
    return editor;
  }
  async function edited(c, selector, values, action) {
    c.panel.reveal(c.panel.viewColumn); await pause(250);
    await c.rpc('form', selector, values);
    const before = c.model.revision; await c.action(`${selector} [data-action="${action}"]`);
    for (let i = 0; i < 100 && c.model.revision === before; i++) await pause(100);
    assert.notEqual(c.model.revision, before); await pause(160);
  }
  async function clickSave(c, selector) {
    const before = c.model.revision; await c.action(selector);
    for (let i = 0; i < 100 && c.model.revision === before; i++) await pause(100);
    assert.notEqual(c.model.revision, before); await pause(160);
  }
  async function annotate(c, region, purpose, text) {
    await edited(c, `[data-draft="note:${region || 'overview'}:new"]`, { purpose, text, origin: 'ai_proposal', author: 'Codex scripted validation fixture' }, 'save-note');
  }
  const regionSelector = id => `[data-region="${id}"]`;
  try {
    require('../../src/extension').activate(context);
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    await vscode.commands.executeCommand('notifications.hideToasts');
    await check('inert activation in the actual WSL extension host', async () => {
      assert.equal(process.platform, 'linux'); assert.equal(vscode.env.remoteName, 'wsl'); assert.equal(requests.length, 0);
    });
    if (config.phase === 'associations') {
      const file = path.join(config.project, 'note.md'), raw = await fs.readFile(file);
      await check('shared context descriptions, source-derived replacement and removal preserve unrelated selections and drafts', async () => {
        await focus(file, [0, 0], [0, 7]); await command('createOutline');
        const c = controllers.at(-1); await pause(800); await c.rpc('query', '#reader');
        await focus(file, [1, 0], [1, 14]); await command('addOutlineRegion');
        await focus(file, [0, 0], [0, 7]); picks.push(o => o.kind === 'hypothesis'); await command('addOutlineContext');
        await focus(file, [1, 0], [1, 14]); picks.push(o => o.kind === 'cited_result'); await command('addOutlineContext');
        const [first, unrelated] = c.model.outline.contexts;
        await edited(c, `[data-draft="context:${first.id}"]`, { context_kind: 'definition', label: 'Reader revised role' }, 'save-context');
        await focus(file, [1, 0], [1, 14]); picks.push(o => o.id === first.id); await command('replaceOutlineContext');
        assert.equal(c.model.outline.contexts[0].text, 'Next question.');
        assert.deepEqual(c.model.outline.contexts[1], unrelated);
        await c.rpc('form', '[data-draft="note:overview:new"]', { text: 'Unsaved reader explanation survives association changes.' });
        await c.rpc('form', `[data-draft="context:${unrelated.id}"]`, { label: 'Unsaved context label survives refresh.' });
        await c.action('[data-action="refresh"]');
        let dom = await c.rpc('query', '#reader');
        assert.equal(dom.forms.find(f => f.key === `context:${unrelated.id}`).values.label, 'Unsaved context label survives refresh.');
        await clickSave(c, `[data-context-item="${first.id}"] [data-action="remove-context"]`);
        assert.deepEqual(c.model.outline.contexts, [unrelated]);
        dom = await c.rpc('query', '#reader');
        assert.equal(dom.forms.find(f => f.key === 'note:overview:new').values.text, 'Unsaved reader explanation survives association changes.');
        assert.equal(dom.forms.find(f => f.key === `context:${unrelated.id}`).values.label, 'Unsaved context label survives refresh.');
        await c.action('[data-action="source"]');
        assert.equal(vscode.window.activeTextEditor.document.getText(), raw.toString());
        config.associations = { id: c.model.outline.id, context: unrelated, removedContext: first.id, file, sourceRevision: digest(raw) };
      });
      const c = controllers.at(-1), [firstRegion, secondRegion] = c.model.outline.regions;
      await check('newer typing in a submitted context form survives completion and saves explicitly for restart', async () => {
        const contextItem = c.model.outline.contexts[0], key = `context:${contextItem.id}`;
        const selector = `[data-draft="${key}"]`;
        await c.rpc('form', selector, { label: 'Submitted context description' });
        let release;
        publicationGate = new Promise(resolve => { release = resolve; });
        const before = c.model.revision, idle = c.idle;
        try {
          await c.rpc('click', `${selector} [data-action="save-context"]`);
          for (let i = 0; i < 100 && !publicationWaiting; i++) await pause(100);
          assert.ok(publicationWaiting, 'Publication is held while the text remains editable');
          await c.rpc('form', selector, { label: 'Newer context description typed during save' });
        } finally { release(); }
        for (let i = 0; i < 100 && (c.model.revision === before || c.idle === idle); i++) await pause(100);
        assert.notEqual(c.model.revision, before);
        assert.equal(c.model.outline.contexts[0].label, 'Submitted context description');
        const dom = await c.rpc('query', '#reader');
        assert.equal(dom.forms.find(f => f.key === key).values.label, 'Newer context description typed during save');
        assert.equal(dom.forms.find(f => f.key === 'note:overview:new').values.text, 'Unsaved reader explanation survives association changes.');
        await clickSave(c, `${selector} [data-action="save-context"]`);
        config.associations.context = c.model.outline.contexts[0];
        assert.equal(config.associations.context.label, 'Newer context description typed during save');
      });
      await check('manual evidence snapshot and region revision, detachment and explicit retained-original access', async () => {
        opens.push(config.goals); picks.push(o => o.kind === 'goal_context', o => o.index === 0); await command('attachOutlineEvidence');
        opens.push(file); picks.push(o => o.kind === 'declaration_statement'); await command('attachOutlineEvidence');
        const [artifact, unrelated] = c.model.outline.artifacts;
        const regionBefore = JSON.stringify(c.model.outline.regions);
        await edited(c, `[data-draft="evidence:${artifact.id}"]`, { region: firstRegion.id, selector: '1' }, 'save-evidence');
        assert.equal(c.model.outline.artifacts[0].region, firstRegion.id); assert.equal(c.model.outline.artifacts[0].selector, 1);
        assert.deepEqual(c.model.outline.artifacts[1], unrelated);
        await clickSave(c, `[data-artifact="${artifact.id}"] [data-action="remove-evidence"]`);
        const kept = c.model.outline.artifacts[0]; assert.equal(kept.region, null); assert.equal(kept.selector, 1);
        const dom = await c.rpc('query', `[data-artifact="${artifact.id}"]`);
        assert.ok(dom.text.includes('no region association')); assert.ok(dom.text.includes('available assumptions'));
        assert.deepEqual(dom.goals, kept.goals);
        await c.action(`[data-artifact="${artifact.id}"] [data-action="artifact"]`);
        assert.equal(vscode.window.activeTextEditor.document.getText(), await fs.readFile(config.goals, 'utf8'));
        assert.equal(JSON.stringify(c.model.outline.regions), regionBefore);
        config.associations.artifacts = c.model.outline.artifacts;
        config.associations.secondRegion = secondRegion.id;
      });
      await check('failed publication preserves saved state and live reader drafts while blocking subsequent private writes', async () => {
        const a = c.model.outline.artifacts[0], key = `evidence:${a.id}`;
        const request = requests.findLast(r => r.method === 'outline_mutate');
        const savedPath = path.join(request.store, request.id, 'outline.json'), before = await fs.readFile(savedPath);
        await c.rpc('form', `[data-draft="${key}"]`, { region: secondRegion.id, selector: '0' });
        failPublication = true;
        await c.action(`[data-draft="${key}"] [data-action="save-evidence"]`);
        assert.match(errors.pop(), /publication failed/);
        assert.deepEqual(await fs.readFile(savedPath), before); assert.equal(c.model.outline.artifacts[0].region, null);
        await c.action('[data-action="refresh"]');
        const dom = await c.rpc('query', '#reader');
        assert.ok(dom.text.includes('Private writes are blocked'));
        assert.equal(dom.forms.find(f => f.key === key).values.region, secondRegion.id);
        assert.equal(dom.forms.find(f => f.key === 'note:overview:new').values.text, 'Unsaved reader explanation survives association changes.');
        await c.action(`[data-artifact="${a.id}"] [data-action="artifact"]`);
        assert.equal(vscode.window.activeTextEditor.document.getText(), await fs.readFile(config.goals, 'utf8'));
        assert.equal(digest(await fs.readFile(file)), digest(raw));
        config.associations.revision = c.model.revision;
      });
    } else if (config.phase === 'associations_restart') {
      const example = config.associations;
      await check('normal-host close/reopen restores removals, unrelated associations and retained originals', async () => {
        picks.push(o => o.id === example.id); await command('openOutline'); const c = controllers.at(-1); await pause(800);
        assert.equal(c.model.revision, example.revision); assert.deepEqual(c.model.outline.contexts, [example.context]);
        assert.deepEqual(c.model.outline.artifacts, example.artifacts);
        const dom = await c.rpc('query', '#reader');
        assert.equal(dom.forms.find(f => f.key === 'note:overview:new').values.text, '');
        assert.equal(dom.forms.find(f => f.key === `context:${example.context.id}`).values.label, example.context.label);
        assert.ok(!dom.text.includes('Private writes are blocked'));
        await c.action('[data-action="source"]'); assert.equal(digest(vscode.window.activeTextEditor.document.getText()), example.sourceRevision);
        await c.action(`[data-artifact="${example.artifacts[0].id}"] [data-action="artifact"]`);
        assert.equal(vscode.window.activeTextEditor.document.getText(), await fs.readFile(config.goals, 'utf8'));
      });
    } else if (config.phase === 'seed') {
      config.examples = [];
      for (const name of ['equation', 'euclid']) await check(`${name}: native selection, exact statements, context, editable explanations and collapse/expansion`, async () => {
        const file = path.join(config.project, name === 'equation' ? 'Subgraph.lean' : 'euclid-ix20.txt');
        const raw = await fs.readFile(file), lines = raw.toString('utf8').split(/\r\n|\n|\r/);
        const equation = name === 'equation';
        const ranges = equation ? [[238, 239], [239, 240], [240, 241], [241, 242]] : [[3, 7], [7, 9], [9, 15]];
        const titles = equation ? ['Idempotent squares', 'Squares commute', 'Squaring preserves the product', 'Concluding rewrite']
          : ['Construction and first case', 'A cited result supplies a prime divisor', 'The prime divisor is new'];
        await focus(file, [ranges[0][0], 0], [ranges[0][1], 0]); await command('createOutline');
        const c = controllers.at(-1); await pause(900);
        assert.ok(c.model); await c.rpc('query', '#reader');
        for (let i = 1; i < ranges.length; i++) { await focus(file, [ranges[i][0], 0], [ranges[i][1], 0]); await command('addOutlineRegion'); }
        for (let i = 0; i < ranges.length; i++) {
          const r = c.model.outline.regions[i];
          await edited(c, `[data-draft="region:${r.id}"]`, { title: titles[i], level: i === 0 ? 'concepts_results' : 'argument' }, 'save-region');
          await c.rpc('click', `${regionSelector(r.id)} [data-action="select"]`);
          const statementLine = equation ? i < 3 ? ranges[i][0] : 237 : i === 0 ? 1 : i === 1 ? 7 : 9;
          const end = equation ? lines[statementLine].indexOf(' := ') : lines[statementLine].length;
          await focus(file, [statementLine, 0], [statementLine, end]);
          picks.push(o => o.kind === (equation && i === 3 ? 'declaration_statement' : 'source_statement')); await command('setOutlineStatement');
          await annotate(c, r.id, i === 2 ? 'intended_inference' : 'explanation', equation
            ? ['Use the given identity twice for squares.', 'Rewrite using the previously named idempotence lemma.', 'Rewrite both factors; context availability alone does not establish which lemmas were used.', 'Reader reconstruction: use the square replacement and commutation steps together. This manual dependency description is unverified.'][i]
            : ['Add one to a common multiple; separate the prime and composite cases.', 'Use the cited VII.31 here while deferring inspection of its proof.', 'If an assigned prime divided both numbers, it would divide their difference, one.'][i]);
        }
        await focus(file, equation ? [237, 0] : [7, 0], equation ? [237, lines[237].length] : [7, lines[7].length]);
        picks.push(o => o.kind === (equation ? 'hypothesis' : 'cited_result')); await command('addOutlineContext');
        if (equation) {
          const first = c.model.outline.regions[0]; await c.rpc('click', `${regionSelector(first.id)} [data-action="select"]`);
          opens.push(config.goals); picks.push(o => o.kind === 'goal_context', o => o.index === 0); await command('attachOutlineEvidence');
          opens.push(config.provenance); picks.push(o => o.kind === 'supporting_artifact'); await command('attachOutlineEvidence');
        }
        await annotate(c, null, 'orientation', equation ? 'A source-region reading of one equational implication; the goal dump is optional supporting material.' : 'Elements IX.20 constructs a prime outside an assigned finite collection. No formalization or checking evidence is attached.');
        await annotate(c, null, 'governing_idea', equation ? 'Move to squares, establish how they behave, then compare the original factors. This is reader reconstruction.' : 'Compare a common multiple with that number plus one; any shared divisor would divide one.');
        await annotate(c, null, 'question', '<img src=x onerror="alert(1)"> This remains inert reader text. Which omitted prerequisites should I inspect next?');
        await edited(c, '[data-draft="metadata"]', { title: equation ? 'Equation 387 → Equation 43' : 'Euclid — Elements IX.20',
          authors: equation ? 'Equational Theories contributors; individual authorship unspecified' : 'Euclid; English translator unknown', authorship: equation ? 'unknown' : 'human',
          revision: equation ? config.sourceCommit : '', edition: '', locator: equation ? 'Subgraph; Equation387_implies_Equation43' : 'Book IX, Proposition 20',
          reference: equation ? 'https://github.com/teorth/equational_theories' : config.euclidUrl }, 'save-metadata');
        const r = c.model.outline.regions[0], expected = r.argument_text;
        let dom = await c.rpc('query', regionSelector(r.id)); assert.equal(dom.arguments[0], expected);
        await clickSave(c, `${regionSelector(r.id)} [data-action="toggle"]`);
        dom = await c.rpc('query', regionSelector(r.id)); assert.equal(dom.arguments.length, 0); assert.ok(dom.statements[0]);
        if (equation) { assert.ok(dom.goals[0].includes('⊢')); assert.ok(dom.text.includes('manual association')); }
        assert.ok((await c.rpc('query', '#reader')).contexts[0]);
        await clickSave(c, `${regionSelector(r.id)} [data-action="toggle"]`);
        assert.equal((await c.rpc('query', regionSelector(r.id))).arguments[0], expected);
        await c.action(`${regionSelector(r.id)} [data-action="navigate"]`);
        for (let i = 0; i < 150 && (vscode.window.activeTextEditor?.document.uri.fsPath !== file ||
          vscode.window.activeTextEditor?.selection.start.line !== ranges[0][0]); i++) await pause(100);
        assert.equal(vscode.window.activeTextEditor.document.uri.fsPath, file);
        assert.equal(vscode.window.activeTextEditor.selection.start.line, ranges[0][0]);
        // Saved edit replaces the explanation, never the source text.
        const n = c.model.outline.regions[0].annotations[0];
        await edited(c, `[data-draft="note:${r.id}:${n.id}"]`, { text: n.text + ' Edited before restart.' }, 'save-note');
        // A draft survives a publication/re-render, but is not claimed durable.
        const draftKey = `note:${r.id}:new`;
        await c.rpc('form', `[data-draft="${draftKey}"]`, { text: 'Unsaved draft kept while toggling.' });
        await clickSave(c, `${regionSelector(r.id)} [data-action="toggle"]`);
        dom = await c.rpc('query', '#reader'); assert.equal(dom.forms.find(f => f.key === draftKey).values.text, 'Unsaved draft kept while toggling.');
        assert.equal(dom.unsafeNodes, 0); assert.equal(dom.overflow, false);
        assert.equal(digest(await fs.readFile(file)), digest(raw));
        config.examples.push({ name, file, id: c.model.outline.id, sourceRevision: digest(raw), region: r.id, expected, span: r.span,
          statement: r.statement_text, note: n.id, stateRevision: c.model.revision });
      });
    } else if (config.phase === 'restart') {
      for (const example of config.examples) await check(`${example.name}: normal-host restart restores exact identities, annotations and collapsed state`, async () => {
        picks.push(o => o.id === example.id); await command('openOutline'); const c = controllers.at(-1); await pause(800);
        const o = c.model.outline; assert.equal(o.source.revision, example.sourceRevision); assert.equal(c.model.revision, example.stateRevision);
        const r = o.regions[0]; assert.equal(r.id, example.region); assert.deepEqual(r.span, example.span); assert.equal(r.collapsed, true);
        assert.ok(r.annotations[0].text.endsWith('Edited before restart.')); assert.equal(r.annotations[0].provenance.origin, 'ai_proposal');
        const dom = await c.rpc('query', '#reader');
        assert.equal(dom.forms.find(f => f.key === `note:${r.id}:new`).values.text, '');
        assert.equal(o.annotations.length, 3); assert.equal(o.artifacts.length, example.name === 'equation' ? 2 : 0);
        await clickSave(c, `${regionSelector(r.id)} [data-action="toggle"]`);
        assert.equal((await c.rpc('query', regionSelector(r.id))).arguments[0], example.expected);
        // Destructive checks affect only disposable copies, after restore.
        if (example.name === 'equation') await fs.appendFile(example.file, '\n-- changed disposable source\n');
        else await fs.unlink(example.file);
        await c.action('[data-action="refresh"]');
        for (let i = 0; i < 150 && c.model.outline.source_status === 'unchanged'; i++) await pause(100);
        assert.notEqual(c.model.outline.source_status, 'unchanged'); assert.deepEqual(c.model.outline.regions[0].span, example.span);
        assert.equal((await c.rpc('query', regionSelector(r.id))).arguments[0], example.expected);
        const before = errors.length; await c.action(`${regionSelector(r.id)} [data-action="navigate"]`);
        for (let i = 0; i < 150 && errors.length === before; i++) await pause(100);
        assert.equal(errors.length, before + 1); errors.pop();
        await c.rpc('click', `${regionSelector(r.id)} [data-action="select"]`);
        await c.action('[data-action="source"]');
        for (let i = 0; i < 150 && vscode.window.activeTextEditor?.document.uri.scheme !== 'mrw-record'; i++) await pause(100);
        const retained = vscode.window.activeTextEditor.document;
        assert.equal(retained.uri.scheme, 'mrw-record'); assert.equal(retained.languageId, 'plaintext');
        // The virtual editor supplies positions; webview expansion retains EOLs.
        await focus(retained, [0, 0], [0, 5]); await command('replaceOutlineRegion');
        assert.equal(c.model.outline.regions[0].id, example.region); assert.equal(c.model.outline.regions[0].argument_text.length, 5);
        // Restore the selection via the same explicit host command.
        await focus(retained, [example.span.start_line - 1, example.span.start_col], [example.span.end_line - 1, example.span.end_col]);
        await command('replaceOutlineRegion'); assert.equal(c.model.outline.regions[0].argument_text, example.expected);
      });
    } else if (config.phase === 'refine') {
      // Correct the acceptance fixture's manual statement labels. Local have
      // statements are source claims; the final rewrite uses the theorem's
      // declaration statement, rather than labeling its tactic term a claim.
      await vscode.commands.executeCommand('workbench.action.joinAllGroups');
      await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');
      for (const example of config.examples) await check(`${example.name}: precise statement labels, retained reread and bounded editor groups`, async () => {
        picks.push(o => o.id === example.id); await command('openOutline'); const c = controllers.at(-1); await pause(800);
        await c.action('[data-action="source"]');
        const retained = vscode.window.activeTextEditor.document;
        assert.equal(retained.uri.scheme, 'mrw-record'); assert.equal(retained.languageId, 'plaintext');
        if (example.name === 'equation') {
          const lines = retained.getText().split(/\r\n|\n|\r/);
          for (let i = 0; i < 4; i++) {
            const r = c.model.outline.regions[i], line = i < 3 ? 238 + i : 237;
            await c.rpc('click', `${regionSelector(r.id)} [data-action="select"]`);
            await focus(retained, [line, 0], [line, lines[line].indexOf(' := ')]);
            picks.push(o => o.kind === (i < 3 ? 'source_statement' : 'declaration_statement')); await command('setOutlineStatement');
            assert.equal(c.model.outline.regions[i].statement_text, lines[line].slice(0, lines[line].indexOf(' := ')));
          }
          const statements = c.model.outline.regions.map(r => ({ id: r.id, statement: r.statement, text: r.statement_text }));
          await c.action('[data-action="refresh"]');
          assert.deepEqual(c.model.outline.regions.map(r => ({ id: r.id, statement: r.statement, text: r.statement_text })), statements);
          assert.ok((await c.rpc('query', '#reader')).text.includes('Exact declaration statement'));
          example.statementRefinement = statements;
        }
        assert.equal((await c.rpc('query', '#reader')).overflow, false);
        assert.equal(c.panel.viewColumn, vscode.ViewColumn.Two);
        assert.ok(vscode.window.tabGroups.all.length <= 2);
      });
    } else throw new Error('Unknown outline phase');
    await check('only explicit offline reader bridge actions; no unexpected errors', async () => {
      assert.deepEqual(errors, []); assert.ok(requests.every(r => r.method.startsWith('outline_')));
      if (config.phase.startsWith('associations')) assert.equal((await controllers.at(-1).rpc('query', '#reader')).overflow, false);
    });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    report.complete = true; report.bridgeActions = requests.map(r => r.method); report.examples = config.examples;
    if (config.associations) report.associations = config.associations;
    await save();
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('notifications.hideToasts');
    const last = controllers.at(-1); last.panel.reveal(last.panel.viewColumn);
    await last.rpc('scroll', config.phase.startsWith('associations') ? '[data-context-item]' : '[data-region] h3');
    await fs.writeFile(path.join(config.artifacts, 'outline-ready'), config.phase);
  } catch (error) {
    report.failure = error.stack; report.errors = errors;
    if (controllers.length) { try { report.dom = await controllers.at(-1).rpc('query', '#reader'); } catch {} }
    await save();
  }
  finally {
    // The panel wrapper remains until disposal so subsequent visible interaction
    // can still use the test probe. It never changes the production JS files.
    for (const key of ['showQuickPick', 'showOpenDialog', 'showErrorMessage']) vscode.window[key] = originals[key];
  }
}
module.exports = { activate: context => { void activate(context).catch(error => console.error(error)); } };
