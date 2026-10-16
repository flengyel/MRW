'use strict';
// Focused Development Host check. Production commands, editor undo, bridge,
// webviews and private storage are real; only chooser answers are scripted.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { digest } = require('../../src/navigation');
const bridge = require('../../src/bridge');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  const output = path.join(config.artifacts, `overview-${config.phase}.json`);
  try { await fs.access(output); return; } catch {}
  const report = { phase: config.phase, host: vscode.env.remoteName, vscode: vscode.version, checks: [] };
  const picks = [], errors = [], panels = [], requests = [];
  const native = { pick: vscode.window.showQuickPick, error: vscode.window.showErrorMessage,
    panel: vscode.window.createWebviewPanel, bridge: bridge.runBridge };
  const save = () => fs.writeFile(output, JSON.stringify(report, null, 2));
  async function check(name, action) {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.stack }); throw error; }
    finally { await save(); }
  }
  vscode.window.showQuickPick = async options => {
    assert.ok(picks.length, 'Unexpected chooser'); const selected = options.find(picks.shift());
    assert.ok(selected, 'Scripted choice exists'); return selected;
  };
  vscode.window.showErrorMessage = async message => { errors.push(message); };
  vscode.window.createWebviewPanel = (...args) => {
    const panel = native.panel(...args), post = panel.webview.postMessage.bind(panel.webview);
    const record = { panel }; panels.push(record);
    panel.webview.postMessage = value => { if (value.type === 'outline') record.message = value; return post(value); };
    return panel;
  };
  bridge.runBridge = (...args) => { assert.ok(args[2].method.startsWith('outline_')); requests.push(args[2]); return native.bridge(...args); };
  async function command(name) { const result = await vscode.commands.executeCommand('mrw.' + name); await pause(220); return result; }
  async function focus(file, position) {
    const doc = typeof file === 'string' ? await vscode.workspace.openTextDocument(vscode.Uri.file(file)) : file;
    const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false, preserveFocus: false });
    for (let i = 0; i < 80 && vscode.window.activeTextEditor?.document !== doc; i++) await pause(100);
    assert.equal(vscode.window.activeTextEditor?.document, doc);
    if (position) editor.selection = new vscode.Selection(position, position);
    return editor;
  }
  const store = path.join(context.storageUri.fsPath, `outlines-${digest(config.project)}`);
  const base = { store, project_root: config.project };
  const service = req => native.bridge(context.extensionPath, 'python3', req);
  async function inventory() {
    const result = {};
    async function scan(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await scan(file);
        else if (entry.isFile()) result[file] = digest(await fs.readFile(file));
      }
    }
    await scan(store); return result;
  }
  let seed;
  try {
    if (!vscode.workspace.isTrusted) await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { listener.dispose(); reject(new Error('Trust the disposable validation workspace to continue')); }, 120000);
      const listener = vscode.workspace.onDidGrantWorkspaceTrust(() => { clearTimeout(timer); listener.dispose(); resolve(); });
    });
    require('../../src/extension').activate(context);
    await check('real Linux workspace development host', async () => {
      assert.equal(process.platform, 'linux'); assert.equal(vscode.env.remoteName, 'wsl');
      assert.equal(await fs.realpath(config.project), config.project);
    });
    const mdfile = path.join(config.project, 'overview.md');
    if (config.phase === 'seed') {
      seed = { outlines: [] }; report.seed = seed;
      await check('two saved source outlines prepared without Lean or provider', async () => {
        for (const [name, line] of [['euclid-ix20.txt', 4], ['divisor-note.txt', 1]]) {
          const ed = await focus(path.join(config.project, name));
          ed.selection = new vscode.Selection(line, 0, line, ed.document.lineAt(line).text.length);
          const result = await command('createOutline'); assert.ok(result?.outline);
          seed.outlines.push({ id: result.outline.id, region: result.outline.regions[0].id,
            text: result.outline.regions[0].argument_text, source: result.outline.source });
          if (name === 'euclid-ix20.txt') await service({ method: 'outline_mutate', ...base, id: result.outline.id,
            revision: result.revision, change: { kind: 'metadata', authorship: 'human', bibliography: {
              title: 'Elements IX.20', authors: 'Euclid', edition: null, revision: null,
              locator: 'Book IX, Proposition 20; validation transcription', reference: null } } });
        }
      });
      const ed = await focus(mdfile); const doc = ed.document;
      await check('insert exact region and second whole-outline citation into ordinary Markdown', async () => {
        assert.equal(doc.languageId, 'markdown'); const original = doc.getText();
        ed.selection = new vscode.Selection(doc.positionAt(original.length), doc.positionAt(original.length));
        picks.push(o => o.id === seed.outlines[0].id, o => o.region === seed.outlines[0].region);
        const first = await command('insertOutlineReference'); assert.ok(first?.reference); seed.first = first;
        const inserted = doc.getText(); assert.ok(inserted.includes('Elements IX'));
        assert.ok(inserted.includes('Euclid')); assert.ok(inserted.includes('Book IX'));
        assert.equal(await fs.readFile(mdfile, 'utf8'), original); assert.ok(doc.isDirty);
        await vscode.commands.executeCommand('undo'); assert.equal(doc.getText(), original);
        await vscode.commands.executeCommand('redo'); assert.equal(doc.getText(), inserted);
        await ed.edit(b => b.insert(doc.positionAt(doc.getText().length), '\n\nReader connection (scripted fixture): compare the two constructions; this is not a verified dependency. α😀\n\n'));
        const pos = doc.positionAt(doc.getText().length); ed.selection = new vscode.Selection(pos, pos);
        picks.push(o => o.id === seed.outlines[1].id, o => o.region === null);
        seed.second = await command('insertOutlineReference'); assert.ok(seed.second?.reference);
        assert.ok(doc.getText().includes('divisor'));
        const before = doc.getText(); await ed.edit(b => b.insert(new vscode.Position(0, 0), 'Temporary ordinary edit\n'));
        await vscode.commands.executeCommand('undo'); assert.equal(doc.getText(), before);
        assert.ok(await doc.save()); seed.markdown = doc.getText(); seed.diskDigest = digest(await fs.readFile(mdfile));
      });
      await check('follow both citations; exact retained region selected in plaintext and whole reader opened', async () => {
        await focus(doc, doc.positionAt(doc.getText().indexOf(seed.first.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'unchanged');
        const retained = vscode.window.activeTextEditor;
        assert.equal(retained.document.uri.scheme, 'mrw-record'); assert.equal(retained.document.languageId, 'plaintext');
        assert.equal(retained.document.getText(retained.selection), seed.outlines[0].text);
        await focus(doc, doc.positionAt(doc.getText().indexOf(seed.second.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'whole outline');
        assert.equal(panels.at(-1).message.model.outline.id, seed.outlines[1].id);
        assert.equal(doc.getText(), seed.markdown);
      });
      await check('annotation edits preserve references; moved region and missing original open pinned passage', async () => {
        const id = seed.outlines[0].id;
        let result = await service({ method: 'outline_load', ...base, id });
        result = await service({ method: 'outline_mutate', ...base, id, revision: result.revision,
          change: { kind: 'annotation', region: null, id: null, purpose: 'question', text: 'Scripted reader question', origin: 'ai_proposal', author: 'Codex validation fixture' } });
        await focus(doc, doc.positionAt(doc.getText().indexOf(seed.first.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'unchanged');
        result = await service({ method: 'outline_mutate', ...base, id, revision: result.revision,
          change: { kind: 'replace_region', region: seed.outlines[0].region, start: [5, 0], end: [5, 29] } });
        await fs.unlink(path.join(config.project, 'euclid-ix20.txt'));
        await focus(doc, doc.positionAt(doc.getText().indexOf(seed.first.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'changed or removed');
        const retained = vscode.window.activeTextEditor;
        assert.equal(retained.document.getText(retained.selection), seed.outlines[0].text);
        const record = panels.find(p => p.message.model.outline.id === id);
        assert.equal(record.message.selected, null); assert.match(record.message.reference.notice, /originally referenced/);
        assert.equal(record.message.model.outline.source_status, 'missing');
        assert.equal(doc.getText(), seed.markdown);
      });
      seed.inventory = await inventory(); report.seed = seed;
    } else {
      seed = JSON.parse(await fs.readFile(path.join(config.artifacts, 'overview-seed.json'), 'utf8')).seed;
      await check('normal close/reopen restores ordinary Markdown and exact scoped references', async () => {
        const ed = await focus(mdfile), doc = ed.document;
        assert.equal(doc.getText(), seed.markdown); assert.equal(digest(await fs.readFile(mdfile)), seed.diskDigest);
        const before = await inventory(); assert.deepEqual(before, seed.inventory);
        ed.selection = new vscode.Selection(doc.positionAt(doc.getText().indexOf(seed.first.reference) + 12), doc.positionAt(doc.getText().indexOf(seed.first.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'changed or removed');
        const retained = vscode.window.activeTextEditor;
        assert.equal(retained.document.getText(retained.selection), seed.outlines[0].text);
        await focus(doc, doc.positionAt(doc.getText().indexOf(seed.second.reference) + 12));
        assert.equal((await command('followOutlineReference')).status, 'whole outline');
        assert.deepEqual(await inventory(), before); assert.equal(doc.getText(), seed.markdown);
        report.inventoryUnchanged = true; report.markdownDigest = seed.diskDigest;
      });
    }
    assert.deepEqual(errors, []); assert.equal(picks.length, 0);
    report.complete = true; report.requests = requests.map(r => r.method);
    report.storage = store; report.productionExtension = context.extensionPath;
    await focus(mdfile); panels[0].panel.reveal(vscode.ViewColumn.Two, true);
    await save();
  } catch (error) { report.failure = error.stack; report.errors = errors; await save(); }
  finally {
    vscode.window.showQuickPick = native.pick; vscode.window.showErrorMessage = native.error;
    vscode.window.createWebviewPanel = native.panel; bridge.runBridge = native.bridge;
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
