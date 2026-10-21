'use strict';
// Actual Windows/WSL host driver. Only dialog answers and DOM input are scripted.
// Production acquisition, renderer, bridge, storage and commands remain intact.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function probe() {
  const api = acquireVsCodeApi(); window.acquireVsCodeApi = () => api;
  const failures = [];
  window.addEventListener('error', e => failures.push(e.message));
  window.addEventListener('securitypolicyviolation', e => failures.push(e.violatedDirective));
  window.addEventListener('message', e => {
    const v = e.data; if (v.type !== 'host-test') return;
    try {
      const node = v.selector ? document.querySelector(v.selector) : document;
      if (!node) throw Error('Missing DOM target ' + v.selector);
      if (v.op === 'click') { node.scrollIntoView({ block: 'center' }); node.click(); }
      if (v.op === 'scroll') node.scrollIntoView({ block: 'center' });
      if (v.op === 'form') {
        node.closest('details').open = true;
        for (const [key, value] of Object.entries(v.values)) {
          const field = node.querySelector(`[name="${key}"]`); field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      const result = { text: node.textContent, failures,
        parts: [...node.querySelectorAll('[data-published-part]')].map(n => ({ region: n.dataset.publishedPart,
          text: n.textContent, math: n.querySelectorAll('math').length })),
        math: [...node.querySelectorAll('math')].map(n => ({ width: n.getBoundingClientRect().width,
          height: n.getBoundingClientRect().height })),
        warnings: [...node.querySelectorAll('.warning')].map(n => n.textContent),
        references: node.querySelectorAll('[data-action="stacks-reference"]').length };
      api.postMessage({ type: 'host-test-reply', token: v.token, result });
    } catch (error) { api.postMessage({ type: 'host-test-reply', token: v.token, error: error.message }); }
  });
}
async function run(context) {
  const cfg = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  const report = { phase: cfg.phase, vscode: vscode.version, remote: vscode.env.remoteName,
    platform: process.platform, checks: [], requests: [], errors: [], confirmations: [] };
  const output = path.join(cfg.artifacts, 'host-' + cfg.phase + '.json');
  const save = () => fs.writeFile(output, JSON.stringify(report, null, 2));
  const check = async (name, action) => { await action(); report.checks.push(name); await save(); };
  const original = { panel: vscode.window.createWebviewPanel, input: vscode.window.showInputBox,
    pick: vscode.window.showQuickPick, warning: vscode.window.showWarningMessage,
    error: vscode.window.showErrorMessage, info: vscode.window.showInformationMessage, bridge: bridge.runBridge };
  const controllers = []; let serial = 0;
  vscode.window.showInputBox = async () => { assert.equal(cfg.phase, 'import'); return '08ZD'; };
  vscode.window.showQuickPick = async values => values.find(v => v.label.includes('Hausdorff')) || values[0];
  vscode.window.showWarningMessage = async (message, ...choices) => {
    report.confirmations.push(message); assert.ok(choices.includes('Import section')); return 'Import section';
  };
  vscode.window.showInformationMessage = async message => { report.information = message; };
  vscode.window.showErrorMessage = async message => { report.errors.push(message); await save(); };
  bridge.runBridge = async (...args) => {
    const method = args[2].method; report.requests.push(method);
    assert.ok(method.startsWith('outline_') || method.startsWith('artifact_'));
    if (cfg.phase === 'reopen') assert.notEqual(method, 'outline_stacks_prepare', 'No repeat download');
    return original.bridge(...args);
  };
  vscode.window.createWebviewPanel = (...args) => {
    const panel = original.panel(...args), webview = panel.webview;
    const c = { panel, pending: new Map(), idle: 0 }; controllers.push(c);
    const post = webview.postMessage.bind(webview), receive = webview.onDidReceiveMessage.bind(webview);
    webview.postMessage = value => { if (value.type === 'outline') c.model = value.model;
      if (value.type === 'idle') c.idle++; return post(value); };
    webview.onDidReceiveMessage = (listener, self, disposables) => receive(value => {
      if (value.type === 'host-test-reply') {
        const p = c.pending.get(value.token); if (p) { c.pending.delete(value.token);
          value.error ? p.reject(Error(value.error)) : p.resolve(value.result); }
      } else listener.call(self, value);
    }, undefined, disposables);
    Object.defineProperty(webview, 'html', { set: value => {
      const nonce = /script nonce="([^"]+)"/.exec(value)[1];
      const patched = value.replace('<script nonce=', `<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`);
      let proto = Object.getPrototypeOf(webview), d;
      while (proto && !(d = Object.getOwnPropertyDescriptor(proto, 'html'))) proto = Object.getPrototypeOf(proto);
      d.set.call(webview, patched);
    }, configurable: true });
    c.rpc = (op, selector, values) => new Promise((resolve, reject) => {
      const token = ++serial, timer = setTimeout(() => { c.pending.delete(token); reject(Error('DOM probe timeout')); }, 15000);
      c.pending.set(token, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
      post({ type: 'host-test', token, op, selector, values });
    });
    c.action = async selector => {
      const before = c.idle; await c.rpc('click', selector);
      for (let i = 0; i < 200 && c.idle === before; i++) await pause(100);
      assert.ok(c.idle > before, 'Reader operation completed'); assert.deepEqual(report.errors, []);
    };
    return panel;
  };
  try {
    assert.equal(vscode.env.remoteName, 'wsl'); assert.equal(vscode.workspace.isTrusted, true);
    require('../../src/extension').activate(context);
    const command = async name => {
      const value = await vscode.commands.executeCommand('mrw.' + name); assert.deepEqual(report.errors, []); return value;
    };
    await check(cfg.phase === 'import' ? 'Production command acquired and committed official 08ZD online'
      : 'Normal fresh host reopened retained outline without acquisition', async () => {
      await command(cfg.phase === 'import' ? 'importStacksSection' : 'openOutline');
      for (let i = 0; i < 200 && !controllers.at(-1)?.model; i++) await pause(100);
      assert.ok(controllers.at(-1)?.model);
    });
    const c = controllers.at(-1), o = c.model.outline, p = o.published;
    report.outline = o.id; report.commit = p.commit; report.sourceHash = p.source_revision;
    report.project = o.project_root; report.retainedPath = o.source.path;
    await pause(1200);
    await check('Nine actual DOM passages, four complete statements/proofs, native MathML and three local citations', async () => {
      const dom = await c.rpc('query'); report.dom = dom;
      assert.equal(dom.parts.length, 9); assert.deepEqual(dom.failures, []); assert.deepEqual(dom.warnings, []);
      assert.equal(Object.values(p.parts).filter(v => v.role === 'statement').length, 4);
      assert.equal(Object.values(p.parts).filter(v => v.role === 'proof').length, 4);
      assert.ok(dom.math.length > 40); assert.ok(dom.math.every(m => m.width > 0 && m.height > 0));
      assert.equal(dom.references, 3);
    });
    const target = Object.values(p.parts).find(v => v.tag === '08ZE' && v.role === 'statement');
    const proof = Object.values(p.parts).find(v => v.tag === '08ZF' && v.role === 'proof');
    await check('Actual source citation button selected exact retained 08ZE statement', async () => {
      await c.action(`[data-published-part="${proof.region}"] [data-action="stacks-reference"]`);
      const ed = vscode.window.activeTextEditor;
      assert.equal(ed.document.uri.scheme, 'mrw-record');
      assert.equal(ed.document.getText(ed.selection), target.exact_text.replace(/\r\n|\r/g, '\n'));
      report.exactSelection = ed.document.getText(ed.selection); report.reference = c.model.reference;
    });
    const annotation = 'Synthetic Stacks import validation annotation — not a mathematical note or user prose.';
    if (cfg.phase === 'import') await check('Synthetic attributed annotation saved through actual reader form', async () => {
      c.panel.reveal(); await pause(400);
      const selector = `form[data-draft="note:${target.region}:new"]`;
      await c.rpc('form', selector, { purpose: 'question', origin: 'unknown', author: 'Automated host validation', text: annotation });
      await c.action(selector + ' [data-action="save-note"]');
      assert.ok(c.model.outline.regions.find(r => r.id === target.region).annotations.some(a => a.text === annotation));
    });
    else await check('Previously saved annotation and exact source survived normal close/reopen', async () => {
      assert.ok(o.regions.find(r => r.id === target.region).annotations.some(a => a.text === annotation));
      const old = JSON.parse(await fs.readFile(path.join(cfg.artifacts, 'host-import.json'), 'utf8'));
      assert.equal(o.id, old.outline); assert.equal(p.source_revision, old.sourceHash);
      assert.equal(report.exactSelection, old.exactSelection);
    });
    c.panel.reveal(); await pause(400);
    await c.rpc('scroll', `[data-published-part="${target.region}"]`);
    report.complete = true;
  } catch (error) { report.failure = error.stack; }
  finally {
    vscode.window.showInputBox = original.input; vscode.window.showQuickPick = original.pick;
    vscode.window.showWarningMessage = original.warning; vscode.window.showErrorMessage = original.error;
    vscode.window.showInformationMessage = original.info; bridge.runBridge = original.bridge;
    vscode.window.createWebviewPanel = original.panel; await save();
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
