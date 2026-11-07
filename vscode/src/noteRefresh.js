'use strict';
const fs = require('node:fs/promises');
const { documentColumn, showMarkdownPreview } = require('./documentPresentation');

// WSL does not always receive Windows file events. Poll only the displayed
// note after explicit MRW navigation. Ask VS Code to resolve a clean file;
// never revert, provide replacement contents, apply edits or save a document.
function createNoteRefresh({ vscode, context, check, isNote }) {
  let timer, running = false, disposed = false;
  const normal = text => text.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n');
  async function refresh() {
    if (running || disposed || vscode.workspace.isTrusted === false || vscode.window.state?.focused === false) return false;
    const input = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input;
    if (input?.viewType !== 'vscode.markdown.preview.editor' || !isNote(input.uri)) return false;
    const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === input.uri.toString());
    if (!doc || doc.isClosed || doc.isDirty) return false;
    running = true;
    try {
      await check(doc.uri);
      const status = await fs.stat(doc.uri.fsPath);
      if (!status.isFile() || status.size > 4 * 1024 * 1024) return false;
      const bytes = await fs.readFile(doc.uri.fsPath);
      if (bytes.length > 4 * 1024 * 1024) return false;
      const disk = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (normal(disk) === normal(doc.getText()) || doc.isClosed || doc.isDirty) return false;
      const current = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input;
      if (current !== input) return false;
      const column = vscode.window.tabGroups.activeTabGroup.viewColumn || documentColumn(vscode, doc);
      // The public open commands discard forceReload. This narrow workbench
      // entry point re-resolves the explicit file input. VS Code's text-file
      // model independently refuses to resolve dirty or saving content, even
      // if typing starts after the preceding guard. No contents are supplied.
      await vscode.commands.executeCommand('_workbench.openWith', doc.uri, 'default', [column - 1, { forceReload: true, preserveFocus: true, pinned: true }]);
      for (let n = 0; n < 30 && !doc.isDirty && !doc.isClosed && normal(doc.getText()) !== normal(disk); n++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const active = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input;
      if (!doc.isClosed && active?.uri?.toString() === doc.uri.toString() && vscode.window.tabGroups.activeTabGroup.viewColumn === column) {
        await showMarkdownPreview(vscode, doc, column);
      }
      return normal(doc.getText()) === normal(disk);
    } catch (_) { return false; } // Missing/invalid files remain under native editor recovery.
    finally { running = false; }
  }
  function start() {
    if (timer || disposed || !vscode.window.tabGroups) return;
    timer = setInterval(() => { void refresh(); }, 2000); timer.unref?.();
  }
  context.subscriptions.push({ dispose() { disposed = true; clearInterval(timer); } });
  return { start, refresh };
}
module.exports = { createNoteRefresh };
