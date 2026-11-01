'use strict';
// Normal Development Host: real Markdown documents, tree, reader and Python.
// Scripted dialog choices are separate from installed-window observation.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run(context) {
  const cfg = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  const report = { phase: cfg.phase, vscode: vscode.version, remote: vscode.env.remoteName,
    platform: process.platform, checks: [], requests: [], errors: [] };
  const output = path.join(cfg.artifacts, `host-${cfg.phase}.json`);
  const save = () => fs.writeFile(output, JSON.stringify(report, null, 2));
  const check = async (name, action) => { await action(); report.checks.push(name); await save(); };
  const native = { bridge: bridge.runBridge, pick: vscode.window.showQuickPick,
    error: vscode.window.showErrorMessage, panel: vscode.window.createWebviewPanel, tree: vscode.window.createTreeView };
  const picks = [], panels = []; let view, provider;
  vscode.window.showQuickPick = async values => { const choose = picks.shift(); assert.ok(choose, 'Expected explicit scripted chooser'); const result = values.find(choose); assert.ok(result); return result; };
  vscode.window.showErrorMessage = async text => { report.errors.push(text); await save(); };
  bridge.runBridge = (...args) => {
    const method = args[2].method; assert.ok(method.startsWith('outline_') || method === 'artifact_status');
    assert.ok(!['outline_stacks_prepare', 'outline_stacks_import'].includes(method), 'Offline navigation never imports');
    report.requests.push(method); return native.bridge(...args);
  };
  vscode.window.createTreeView = (id, options) => {
    const tree = native.tree(id, options);
    if (id === 'mrw.readingOutline') { view = tree; provider = options.treeDataProvider; }
    return tree;
  };
  vscode.window.createWebviewPanel = (...args) => {
    const panel = native.panel(...args), post = panel.webview.postMessage.bind(panel.webview);
    const record = { panel }; panels.push(record);
    panel.webview.postMessage = value => { if (value.type === 'outline') record.value = value; return post(value); };
    return panel;
  };
  const file = path.join(cfg.project, 'reading-navigation-validation.md');
  const source = path.join(cfg.project, 'reading-navigation-source.txt');
  const sourceText = 'Synthetic navigation fixture α😀.\nSecond retained range.\n';
  async function command(name, ...args) { const result = await vscode.commands.executeCommand('mrw.' + name, ...args); await pause(180); return result; }
  async function focus(doc) {
    const ed = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    for (let i = 0; i < 60 && vscode.window.activeTextEditor?.document !== doc; i++) await pause(100);
    await pause(300);
    assert.equal(vscode.window.activeTextEditor?.document, doc); return ed;
  }
  const store = path.join(context.storageUri.fsPath, `outlines-${digest(cfg.project)}`);
  const service = req => native.bridge(context.extensionPath, 'python3', { store, project_root: cfg.project, ...req });
  let seed;
  try {
    assert.equal(vscode.env.remoteName, 'wsl'); assert.ok(vscode.workspace.isTrusted);
    require('../../src/extension').activate(context);
    const listed = await service({ method: 'outline_list' });
    const stacks = listed.outlines.find(o => o.title === 'Hausdorff spaces'); assert.ok(stacks, 'Reuse retained Stacks, no import');
    const stacksBefore = await service({ method: 'outline_load', id: stacks.id });
    const stacksBytes = digest(await fs.readFile(path.join(store, stacks.id, 'outline.json')));
    report.stacks = { id: stacks.id, revision: stacksBefore.outline.source.revision, outlineDigest: stacksBytes };
    if (cfg.phase === 'seed') {
      await check('reuse retained Stacks and create one separately attributed disposable source', async () => {
        try { await fs.writeFile(source, sourceText, { flag: 'wx' }); }
        catch (error) { if (error.code !== 'EEXIST') throw error; assert.equal(await fs.readFile(source, 'utf8'), sourceText); }
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(source)), ed = await focus(doc);
        ed.selection = new vscode.Selection(0, 0, 0, doc.lineAt(0).text.length);
        const second = await command('createOutline'); assert.ok(second?.outline);
        seed = { second: second.outline.id, region: second.outline.regions[0].id, exact: second.outline.regions[0].argument_text };
        const whole = await service({ method: 'outline_reference', id: stacks.id, revision: stacksBefore.revision, region: null });
        const passage = await service({ method: 'outline_reference', id: stacks.id, revision: stacksBefore.revision, region: stacksBefore.outline.regions[1].id });
        seed.whole = whole; seed.passage = passage;
      });
      let doc, ed, model;
      await check('ordinary Markdown insertion with undo; unsaved navigator with repeated sections and references', async () => {
        const text = `# Reading navigation α😀\n\nSynthetic functional test; no mathematical-use claim.\n\n${seed.whole.markdown}\n\n## Compare\n\n${seed.passage.markdown}\n\n## Compare\n\n${seed.passage.markdown}\n\n\`[example](${seed.passage.reference})\`\n\n~~~md\n# Hidden example\n[example](${seed.passage.reference})\n~~~\n\n## Second source\n\n`;
        try { await fs.writeFile(file, text, { flag: 'wx' }); }
        catch (error) { if (error.code !== 'EEXIST') throw error; assert.equal(await fs.readFile(file, 'utf8'), text); }
        doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file)); ed = await focus(doc);
        const end = doc.positionAt(doc.getText().length); ed.selection = new vscode.Selection(end, end);
        picks.push(o => o.id === seed.second, o => o.region === seed.region);
        seed.secondReference = await command('insertOutlineReference'); assert.ok(seed.secondReference.reference);
        const inserted = doc.getText(); assert.ok(doc.isDirty); assert.equal(await fs.readFile(file, 'utf8'), text);
        await vscode.commands.executeCommand('undo'); assert.equal(doc.getText(), text);
        await vscode.commands.executeCommand('redo'); assert.equal(doc.getText(), inserted);
        model = await command('openReadingOutline'); assert.equal(model.all.length, 8);
        assert.equal(provider.getChildren().length, 1); assert.ok(doc.isDirty);
        await view.reveal(model.roots[0], { expand: 2, select: true });
        await vscode.commands.executeCommand('mrw.readingOutline.focus');
        await vscode.commands.executeCommand('list.collapseAll'); await pause(200);
        assert.ok(context.workspaceState.get('mrw.readingOutline.v1').collapsed.length);
        await view.reveal(model.all[2], { expand: true, select: true });
      });
      await check('heading selection has visible exact Markdown destination', async () => {
        const heading = model.all.filter(n => n.kind === 'heading')[2];
        await command('selectReadingOutlineItem', heading);
        assert.equal(doc.getText(vscode.window.activeTextEditor.selection), '## Compare');
      });
      await check('whole retained reader and exact Stacks passage open; return selects originating occurrence', async () => {
        await command('selectReadingOutlineItem', model.all.find(n => n.reference === seed.whole.reference));
        assert.equal(panels.at(-1).value.model.outline.id, stacks.id);
        assert.equal(panels.at(-1).value.reference.status, 'whole outline');
        await command('returnToReadingOutline'); assert.equal(doc.getText(vscode.window.activeTextEditor.selection), seed.whole.markdown);
        const copies = model.all.filter(n => n.reference === seed.passage.reference);
        for (const node of copies) {
          await command('selectReadingOutlineItem', node);
          const opened = panels.find(p => p.value?.model.outline.id === stacks.id).value;
          const text = opened.model.outline.regions.find(r => r.id === opened.reference.region).argument_text;
          assert.ok(text.includes('lemma')); seed.stacksExact = text;
          assert.equal(opened.readingFocus.region, opened.reference.region);
          await command('returnToReadingOutline');
          assert.equal(doc.offsetAt(vscode.window.activeTextEditor.selection.start), node.start);
        }
      });
      await check('reorganize unsaved Markdown; undo/redo refresh and exact return tracking', async () => {
        ed = await focus(doc); const old = doc.getText();
        await ed.edit(b => b.insert(new vscode.Position(0, 0), '## Temporary question\n\n'));
        await pause(300); assert.equal(provider.getChildren()[0].label, 'Temporary question');
        await command('returnToReadingOutline'); assert.equal(doc.getText(vscode.window.activeTextEditor.selection), seed.passage.markdown);
        await vscode.commands.executeCommand('undo'); await pause(300); assert.equal(doc.getText(), old);
        await vscode.commands.executeCommand('redo'); await pause(300); assert.ok(doc.getText().startsWith('## Temporary'));
        await vscode.commands.executeCommand('undo'); await pause(300);
        model = await command('refreshReadingOutline');
        const node = model.all.find(n => n.reference === seed.secondReference.reference);
        await command('selectReadingOutlineItem', node); await command('returnToReadingOutline');
        ed = vscode.window.activeTextEditor;
        await ed.edit(b => b.replace(new vscode.Range(doc.positionAt(node.start + 2), doc.positionAt(node.start + 3)), 'X'));
        await command('returnToReadingOutline'); assert.match(report.errors.pop(), /exact reading-outline location changed/);
        await vscode.commands.executeCommand('undo'); await pause(300);
        await command('returnToReadingOutline');
      });
      await check('changed association and missing original retain the earlier passage, without redirecting', async () => {
        const loaded = await service({ method: 'outline_load', id: seed.second });
        await service({ method: 'outline_mutate', id: seed.second, revision: loaded.revision,
          change: { kind: 'replace_region', region: seed.region, start: [1, 0], end: [1, 22] } });
        await fs.unlink(source);
        model = await command('refreshReadingOutline');
        await command('selectReadingOutlineItem', model.all.find(n => n.reference === seed.secondReference.reference));
        assert.equal(vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection), seed.exact);
        const panel = panels.find(p => p.value?.model.outline.id === seed.second);
        assert.equal(panel.value.reference.status, 'changed or removed'); assert.equal(panel.value.selected, null);
        await command('returnToReadingOutline');
      });
      await check('unavailable retained target and unrelated scope refuse without note or source writes', async () => {
        const before = doc.getText(); ed = await focus(doc);
        const refs = [seed.passage.reference.replace(stacks.id, '11111111-1111-4111-8111-111111111111'),
          seed.passage.reference.replace(/v1\/[^/]+/, 'v1/' + '0'.repeat(64))];
        for (const ref of refs) {
          await ed.edit(b => b.insert(doc.positionAt(doc.getText().length), `\n[Unavailable](${ref})\n`));
          model = await command('refreshReadingOutline'); await command('selectReadingOutlineItem', model.all.at(-1));
          assert.ok(report.errors.pop(), 'Clear refusal');
          await focus(doc); await vscode.commands.executeCommand('undo'); await pause(300);
          assert.equal(doc.getText(), before);
        }
      });
      await check('save normal document and navigation preferences; exact retained Stacks bytes unchanged', async () => {
        assert.ok(await doc.save()); model = await command('refreshReadingOutline');
        await command('selectReadingOutlineItem', model.all.find(n => n.reference === seed.passage.reference));
        await command('returnToReadingOutline');
        await vscode.commands.executeCommand('mrw.readingOutline.focus'); await vscode.commands.executeCommand('list.collapseAll'); await pause(300);
        seed.markdownDigest = digest(await fs.readFile(file)); seed.preferences = context.workspaceState.get('mrw.readingOutline.v1');
        assert.ok(seed.preferences.collapsed.length);
        assert.equal(digest(await fs.readFile(path.join(store, stacks.id, 'outline.json'))), stacksBytes);
        report.seed = seed;
      });
    } else {
      seed = JSON.parse(await fs.readFile(path.join(cfg.artifacts, 'host-seed.json'), 'utf8')).seed;
      await check('normal host restart reconstructs saved Markdown tree, selection and collapse preferences offline', async () => {
        assert.equal(digest(await fs.readFile(file)), seed.markdownDigest);
        assert.ok(context.workspaceState.get('mrw.readingOutline.v1').collapsed.length);
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file)); await focus(doc);
        const model = await command('openReadingOutline'); assert.equal(model.all.length, 8);
        assert.equal(doc.getText(vscode.window.activeTextEditor.selection), seed.passage.markdown);
        await command('selectReadingOutlineItem', model.all.find(n => n.reference === seed.passage.reference));
        const opened = panels.find(p => p.value?.model.outline.id === stacks.id).value;
        assert.equal(opened.model.outline.regions.find(r => r.id === opened.reference.region).argument_text, seed.stacksExact);
        await command('returnToReadingOutline');
        assert.equal(digest(await fs.readFile(file)), seed.markdownDigest);
        assert.equal(digest(await fs.readFile(path.join(store, stacks.id, 'outline.json'))), stacksBytes);
      });
    }
    assert.deepEqual(report.errors, []); assert.equal(picks.length, 0);
    report.complete = true; report.extensionPath = context.extensionPath; report.store = store;
    await save();
  } catch (error) { report.failure = error.stack; await save(); }
  finally {
    if (seed && cfg.phase === 'seed') await fs.writeFile(source, sourceText);
    vscode.window.showQuickPick = native.pick; vscode.window.showErrorMessage = native.error;
    vscode.window.createWebviewPanel = native.panel; vscode.window.createTreeView = native.tree;
    bridge.runBridge = native.bridge;
  }
}
module.exports = { activate: context => { void run(context).catch(console.error); } };
