'use strict';
// Settings suggest a destination. Only the core's committed local binding selects it.
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const renameKey = 'mrw.preparedFolderRenames.v1';
const within = (child, parent) => {
  const relative = path.relative(parent, child);
  return !relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
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
    register('mrw.prepareFolderRename', () => transaction(async () => {
      const folders = await roots();
      if (folders.length !== 1) throw new Error('Prepare a folder rename in its own single-folder workspace.');
      const current = await refresh();
      if (current.recovery_required) throw new Error('Run MRW: Recover Artifact Move before preparing a folder rename.');
      if (context.globalStorageUri?.scheme !== 'file') throw new Error('Folder rename preparation needs host-local extension storage.');
      const parent = context.globalStorageUri.fsPath;
      if (folders.some(root => within(parent, root))) throw new Error('Saved work must be outside the project folder being renamed.');
      const destination = path.join(parent, 'saved-work-' + randomUUID());
      const choice = await vscode.window.showWarningMessage(
        `Prepare saved MRW work before renaming this folder or a parent directory?\nProject: ${folders[0]}\n`
        + `Saved work will move from ${current.location} to ${destination}.\n`
        + 'Save ordinary documents and reader forms, finish unsent requests, and close other MRW windows using this store first. '
        + 'This does not rename directories or move ordinary documents. After preparation, close this workspace, rename with your file tools, '
        + 'open the new folder and run MRW: Reconnect Saved Work After Folder Rename…. '
        + 'Prepare other study workspaces inside a renamed parent separately; this does not discover nested workspaces.',
        { modal: true }, 'Prepare saved work');
      if (choice !== 'Prepare saved work') return;
      // VS Code owns the enclosing globalStorage directory. Create only our
      // child and synchronize its directory entry before the core can commit
      // saved work there. Retrying a failed sync must synchronize it again.
      try { await fs.mkdir(parent, { mode: 0o700 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      const enclosing = await fs.open(path.dirname(parent), 'r');
      try { await enclosing.sync(); } finally { await enclosing.close(); }
      const plan = await control('artifact_plan', { destination, roots: folders });
      if (plan.projects.length !== 1) throw new Error('This saved store contains several projects. Use the existing artifact move/open commands with explicit mappings.');
      if (!plan.files) throw new Error('No saved MRW work exists in this workspace. Open the study workspace that owns the records before preparing it.');
      const result = await progress(options => control('artifact_move', {
        destination, roots: folders, manifest: plan.source_manifest }, options));
      if (!result.committed || result.cleanup_pending || result.recovery_required) {
        throw new Error(`Preparation is unfinished. Keep the current folder in place and run MRW: Recover Artifact Move. Saved-work location: ${result.location}`);
      }
      const hint = { location: result.location, store_id: result.store_id, project: folders[0] };
      try {
        // Convenience hints never authorize access: reconnect re-inspects all
        // bytes and explicitly adopts the selected identity through the core.
        const hints = context.globalState.get(renameKey, {});
        await context.globalState.update(renameKey, { ...hints, [result.store_id]: hint });
      } catch (error) {
        throw new Error(`Saved work moved to ${result.location}, but its reconnect shortcut could not be saved. `
          + 'Keep this path and use MRW: Open Existing Artifact Directory… after reopening the renamed folder. ' + error.message);
      }
      await vscode.window.showInformationMessage('Saved MRW work prepared. Close this workspace, rename the folder with your file tools, '
        + 'open its new location, then run MRW: Reconnect Saved Work After Folder Rename…. '
        + `Keep this saved-work location: ${result.location}`);
      return result;
    }));
    register('mrw.reconnectRenamedFolder', () => transaction(async () => {
      const folders = await roots();
      if (folders.length !== 1) throw new Error('Reconnect a renamed folder in its own single-folder workspace.');
      const current = await refresh();
      if (current.recovery_required) throw new Error('Run MRW: Recover Artifact Move before reconnecting saved work.');
      if (current.store_id) throw new Error('This workspace already has a saved-work binding. Stores are never replaced or merged.');
      const hints = Object.values(context.globalState.get(renameKey, {})).filter(hint => hint && typeof hint.project === 'string'
        && typeof hint.location === 'string' && typeof hint.store_id === 'string');
      if (!hints.length) throw new Error('No prepared folder renames are recorded in this host/profile. Prepare the original workspace first, '
        + 'or use MRW: Open Existing Artifact Directory… with an already verified artifact store.');
      const picked = await vscode.window.showQuickPick(hints.map(hint => ({ label: path.basename(hint.project),
        description: hint.project, detail: hint.location, hint })), { placeHolder: 'Choose the saved study prepared before this folder rename' });
      if (!picked) return;
      const hint = picked.hint;
      const inspected = await control('artifact_inspect', { destination: hint.location });
      if (inspected.store_id !== hint.store_id || inspected.projects.length !== 1) {
        throw new Error('The prepared saved-work identity differs or contains several projects. No workspace binding was changed.');
      }
      const original = inspected.projects[0];
      const choice = await vscode.window.showWarningMessage(`Reconnect this saved MRW study?\n`
        + `Previous local folder: ${hint.project}\nCurrent folder: ${folders[0]}\nSaved-work directory: ${hint.location}\n`
        + `Recorded project: ${original}\n`
        + 'Close the previous workspace and use one writing installation. This verifies the complete saved store; '
        + 'it does not infer identity from folder names, merge stores, rewrite historical source paths or move ordinary documents. '
        + 'Old source-file jumps and workspace UI preferences may need reopening; retained source references remain available.',
        { modal: true }, 'Reconnect saved work');
      if (choice !== 'Reconnect saved work') return;
      const result = await control('artifact_adopt', { destination: hint.location, mapping: { [folders[0]]: original },
        store_id: inspected.store_id, head_hash: inspected.head_hash });
      await vscode.window.showInformationMessage('Saved MRW study reconnected. Use MRW: Open Saved Source Outline… '
        + 'or MRW: Open Link from Clipboard for an earlier external passage link.');
      return result;
    }));
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
