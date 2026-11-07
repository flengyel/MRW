'use strict';
// Focused normal Development Host: real commands, reader, clipboard, URI delivery
// and private state. Chooser answers are scripted; no provider/compiler is used.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  const report = { phase: config.phase, vscode: vscode.version, remote: vscode.env.remoteName, checks: [] };
  const save = () => fs.writeFile(path.join(config.artifacts, `companion-${config.phase}.json`), JSON.stringify(report, null, 2));
  const originals = { uri: vscode.window.registerUriHandler, pick: vscode.window.showQuickPick,
    input: vscode.window.showInputBox, panel: vscode.window.createWebviewPanel };
  let reader;
  const requests = [];
  const realBridge = bridge.runBridge;
  bridge.runBridge = (...args) => { assert.ok(args[2].method.startsWith('outline_')); requests.push(args[2]); return realBridge(...args); };
  vscode.window.createWebviewPanel = (...args) => {
    const panel = originals.panel(...args), post = panel.webview.postMessage.bind(panel.webview);
    panel.webview.postMessage = value => { if (value.type === 'outline') reader = value; return post(value); };
    return panel;
  };
  vscode.window.registerUriHandler = handler => originals.uri({ handleUri: async uri => {
    const before = requests.length;
    await handler.handleUri(uri); await pause(150);
    const editor = vscode.window.activeTextEditor;
    const event = { uri: uri.toString(), reader: reader?.model.outline.id,
      status: reader?.reference?.status, selectedText: editor?.document.uri.scheme === 'mrw-record' ? editor.document.getText(editor.selection) : null,
      methods: requests.slice(before).map(r => r.method) };
    await fs.appendFile(path.join(config.artifacts, 'uri-events.jsonl'), JSON.stringify(event)+'\n');
  } });
  try {
    assert.ok(vscode.workspace.isTrusted, 'Trust the isolated navigation workspace');
    require('../../src/extension').activate(context);
    const base = { store: path.join(context.storageUri.fsPath, `outlines-${digest(config.project)}`), project_root: config.project };
    const service = req => realBridge(context.extensionPath, 'python3', req);
    let seed;
    if (config.phase === 'seed') {
      const source = path.join(config.project, 'euclid-ix20.txt');
      let result = await service({ method: 'outline_create', ...base, path: source, source_revision: digest(await fs.readFile(source)) });
      result = await service({ method: 'outline_mutate', ...base, id: result.outline.id, revision: result.revision,
        change: { kind: 'add_region', start: [4, 0], end: [4, 30] } });
      seed = { id: result.outline.id, regionId: result.outline.regions[0].id, exactText: result.outline.regions[0].argument_text, ...base };
    } else seed = JSON.parse(await fs.readFile(path.join(config.artifacts, 'seed.json'), 'utf8'));
    let region = null;
    vscode.window.showQuickPick = async options => options.find(o => o.id === seed.id || o.region === region);
    const inputs = [];
    vscode.window.showInputBox = async () => inputs.shift();
    for (const kind of ['outline', 'region']) {
      region = kind === 'region' ? seed.regionId : null;
      const markdown = await vscode.commands.executeCommand('mrw.copyOutlineLink');
      assert.equal(await vscode.env.clipboard.readText(), markdown);
      assert.ok(markdown.includes('vscode://flengyel.mrw/outline?'));
      if (config.phase !== 'seed') assert.equal(markdown, seed[kind]);
      seed[kind] = markdown;
      report.checks.push({ name: `${kind} copied with no Markdown editor`, passed: true });
      if (config.phase === 'seed') {
        inputs.push(config.obsidianUrl, `Temporary navigation note (${kind})`);
        await vscode.commands.executeCommand('mrw.associateObsidianNote');
      }
    }
    const notes = await service({ method: 'outline_notes', ...base, id: seed.id });
    assert.equal(notes.links.length, 2);
    report.checks.push({ name: 'two explicit pinned note associations retained', passed: true });
    // Leave an actual reader in front with explicit note-open buttons available.
    await vscode.commands.executeCommand('mrw.openOutline');
    report.seed = seed; report.complete = true;
    if (config.phase === 'seed') await fs.writeFile(path.join(config.artifacts, 'seed.json'), JSON.stringify(seed, null, 2));
  } catch (error) { report.failure = error.stack; }
  finally { vscode.window.showQuickPick = originals.pick; vscode.window.showInputBox = originals.input; await save(); }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
