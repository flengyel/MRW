'use strict';
// Settings suggest a destination. Only the core's committed local binding selects it.
const path = require('node:path');
function createArtifactStorage({ vscode, context, rawBridge }) {
  let epoch, initialization, moving = false;
  const home = () => {
    if (context.storageUri?.scheme !== 'file') throw new Error('Open a Linux/WSL/SSH workspace for saved MRW artifacts.');
    return context.storageUri.fsPath;
  };
  const control = (method, extra = {}, options) => rawBridge({ method, artifact_home: home(), ...extra }, options);
  async function refresh() {
    const result = await control('artifact_status'); epoch = result.epoch; return result;
  }
  async function bridge(request, options) {
    if (moving) throw new Error('An artifact move/open operation is in progress. Reader text is retained; wait for it to finish.');
    if (request.method.startsWith('artifact_')) return rawBridge({ ...request, artifact_home: home() }, options);
    if (!epoch) {
      initialization ||= refresh().finally(() => { initialization = undefined; });
      await initialization;
    }
    return rawBridge({ ...request, artifact_home: home(), artifact_epoch: epoch }, options);
  }
  function registerCommands({ register, clients, projectRoot, changed }) {
    const roots = async () => Promise.all((vscode.workspace.workspaceFolders || [])
      .map(folder => projectRoot({ document: { uri: folder.uri } })));
    async function transaction(action, allowDirty = false) {
      if (moving) throw new Error('An artifact operation is already in progress.');
      moving = true;
      try {
        for (const client of clients) await client.freeze(allowDirty);
        return await action();
      } finally {
        moving = false;
        try { await refresh(); }
        finally {
          for (const client of clients) await client.release();
          changed.fire();
        }
      }
    }
    async function progress(action) {
      const controller = new AbortController();
      return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification,
        title: 'MRW: moving saved sources, outlines and annotations', cancellable: true }, async (_progress, token) => {
        const disposable = token.onCancellationRequested(() => controller.abort());
        try { return await action({ timeout: 300000, signal: controller.signal }); }
        finally { disposable.dispose(); }
      });
    }
    register('mrw.artifactLocation', async () => {
      const s = await refresh();
      await vscode.window.showInformationMessage(`MRW saved sources, outlines and annotations: ${s.location}. ${s.scope}.`
        + (s.recovery_required ? ' A storage operation needs recovery: run MRW: Recover Artifact Move.' : ''));
      return s;
    });
    register('mrw.refreshArtifactLocation', () => transaction(async () => refresh(), true));
    register('mrw.moveArtifactDirectory', () => transaction(async () => {
      const current = await refresh();
      if (current.recovery_required) throw new Error('Run MRW: Recover Artifact Move before another move.');
      const destination = await vscode.window.showInputBox({
        title: 'Move saved MRW artifacts for this VS Code workspace',
        prompt: `Current location: ${current.location}. Enter a new directory on the workspace host. Ordinary notes, source documents and notebooks stay in place.`,
        value: vscode.workspace.getConfiguration('mrw').get('artifactMoveDestination', ''), ignoreFocusOut: true });
      if (destination === undefined) return;
      if (!path.isAbsolute(destination)) throw new Error('Enter an absolute path on the Linux/WSL/SSH workspace host.');
      const folders = await roots();
      const plan = await control('artifact_plan', { destination, roots: folders });
      const choice = await vscode.window.showWarningMessage(
        `Move saved MRW artifacts?\nFrom: ${plan.location}\nTo: ${plan.destination}\nScope: ${plan.scope}\nProjects: ${plan.projects.join(', ')}\n`
        + `${plan.files} existing files (${plan.bytes} bytes), plus any required retained record dependencies. `
        + 'The complete destination is verified before switching the active location; old artifact copies are then removed. Existing stores are never merged.',
        { modal: true }, 'Move artifacts');
      if (choice !== 'Move artifacts') return;
      const result = await progress(options => control('artifact_move', { destination: plan.destination, roots: folders, manifest: plan.source_manifest }, options));
      await vscode.window.showInformationMessage(`${result.message}. Effective location: ${result.location}.`
        + (result.cleanup_pending ? ' Run MRW: Recover Artifact Move to retry cleanup.' : ''));
      return result;
    }));
    register('mrw.openArtifactDirectory', () => transaction(async () => {
      const destination = await vscode.window.showInputBox({ title: 'Open an existing synchronized MRW artifact directory',
        prompt: 'This verifies an existing store and maps its projects to this workspace. It does not move or merge stores.',ignoreFocusOut:true });
      if (destination === undefined) return;
      const inspected = await control('artifact_inspect', { destination });
      const folders = await roots(), available = [...folders], mapping = {};
      if (folders.length !== inspected.projects.length) throw new Error('Open a workspace with one local folder for each stored project before adopting this store.');
      for (const original of inspected.projects) {
        const selected = available.length === 1 ? available[0] : await vscode.window.showQuickPick(available, { placeHolder: `Local project folder for ${original}` });
        if (!selected) return;
        mapping[selected] = original; available.splice(available.indexOf(selected), 1);
      }
      const choice = await vscode.window.showWarningMessage(`Open verified MRW store ${inspected.store_id}?\nDirectory: ${destination}\n`
        + Object.entries(mapping).map(([local, original]) => `${original} → ${local}`).join('\n')
        + '\nConfirm that other computers have stopped writing and synchronization has completed. Local locks do not coordinate other computers.',
        { modal: true }, 'Open existing store');
      if (choice !== 'Open existing store') return;
      const result = await control('artifact_adopt', { destination, mapping, store_id: inspected.store_id, head_hash: inspected.head_hash });
      await vscode.window.showInformationMessage(`${result.message}. Effective location: ${result.location}.`);
      return result;
    }));
    register('mrw.recoverArtifactMove', () => transaction(async () => {
      const result = await control('artifact_recover');
      await vscode.window.showInformationMessage(`${result.message}. Effective location: ${result.location}.`);
      return result;
    }, true));
  }
  return { bridge, registerCommands };
}
module.exports = { createArtifactStorage };
