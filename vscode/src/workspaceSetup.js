'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {randomUUID} = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const run = promisify(execFile);
const GUIDE = 'https://github.com/flengyel/MRW/blob/main/docs/WORKSPACE_SETUP.md';

function workspacePaths(home = os.homedir()) {
  const directory = path.join(home, 'mrw-work');
  return {directory, workspace: path.join(directory, 'MRW.code-workspace')};
}
async function regular(io, file) {
  try {
    const stat = await io.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Setup will not replace this path: ${file}`);
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function syncDirectory(io, directory) {
  const handle = await io.open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}
async function createOnce(io, file, text) {
  if (await regular(io, file)) return false;
  const temporary = path.join(path.dirname(file), '.mrw-setup-' + randomUUID() + '.tmp');
  let handle;
  try {
    handle = await io.open(temporary, 'wx', 0o600);
    await handle.writeFile(text); await handle.sync(); await handle.close(); handle = undefined;
    try { await io.link(temporary, file); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await regular(io, file); return false;
    }
    await syncDirectory(io, path.dirname(file));
    return true;
  } finally {
    await handle?.close();
    await io.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
async function prepareWorkspace({home = os.homedir(), notesFolder = '', platform = process.platform, io = fs} = {}) {
  if (platform !== 'linux') throw Error('Connect VS Code to WSL: Debian or a Linux SSH host, then run Set Up MRW Workspace again.');
  const canonicalHome = await io.realpath(home);
  const type = (Number((await io.statfs(canonicalHome)).type) >>> 0);
  if ([0x9fa0, 0x5346544e, 0xff534d42, 0x517b, 0x6969, 0x01021994, 0x858458f6].includes(type)) {
    throw Error('Your home is on a Windows, network or volatile filesystem. Set up a persistent Linux home before creating the MRW workspace.');
  }
  const {directory, workspace} = workspacePaths(canonicalHome);
  await io.mkdir(directory, {recursive: true, mode: 0o700});
  const stat = await io.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('The default MRW directory must be a Linux directory, not a redirected path.');
  if ([0x9fa0, 0x5346544e, 0xff534d42, 0x517b, 0x6969, 0x01021994, 0x858458f6].includes((Number((await io.statfs(directory)).type) >>> 0))) {
    throw Error('The default MRW directory must be on a persistent Linux filesystem.');
  }
  await syncDirectory(io, canonicalHome);
  if (typeof notesFolder !== 'string' || (notesFolder && !path.isAbsolute(notesFolder))) throw Error('The notes folder must be an absolute path on the workspace host.');
  const settings = {'mrw.leanStudyParent': directory};
  if (notesFolder) settings['mrw.notesFolder'] = notesFolder;
  const created = await createOnce(io, workspace, JSON.stringify({folders: [{name: 'MRW', path: '.'}], settings}, null, 2) + '\n');
  await createOnce(io, path.join(directory, 'README.md'), `# MRW workspace\n\nOpen this session with \`MRW.code-workspace\`. Use **MRW: Move Workspace…** to relocate this session.\n\nUse **MRW: Open Document…** to read a note or paper in place. **Choose Notes\nFolder…** selects a folder for links and backlinks; it may be outside this\nworkspace, including an Obsidian vault on Windows.\n\nNew Lean study projects go under this Linux folder. Existing studies keep their\nlocations. Saved MRW sources, annotations and history are private to the workspace;\ncreating this workspace does not import records from another session.\n\n[Setup and optional companions](${GUIDE})\n`);
  // Retry a preceding directory-sync failure even when both files now exist.
  await syncDirectory(io, directory);
  return {directory, workspace, created, notesFolder: created ? notesFolder : undefined};
}
async function pythonStatus(executable = 'python3', execute = run) {
  try {
    const result = await execute(executable, ['--version'], {timeout: 5000, maxBuffer: 4096, windowsHide: true});
    const version = (result.stdout + result.stderr).trim();
    const match = /^Python (\d+)\.(\d+)\.(\d+)(?:\b|$)/.exec(version);
    const ok = !!match && (+match[1] > 3 || (+match[1] === 3 && +match[2] >= 11));
    return {ok, text: ok ? version : 'Python 3.11+ is required on this host.'};
  } catch (_) { return {ok: false, text: 'Python 3.11+ was not found on this host. See the setup guide.'}; }
}
function registerWorkspaceSetup({vscode, register, prepare = prepareWorkspace, checkPython = pythonStatus, resolveDefault = ()=>undefined, beforeSwitch = async()=>{}}) {
  let pending;
  register('mrw.setupWorkspace', () => {
    if (pending) return pending;
    pending = (async () => {
      const config = vscode.workspace.getConfiguration('mrw');
      const result = resolveDefault(workspacePaths().workspace) || await prepare({notesFolder: config.get('notesFolder', '')});
      const python = await checkPython(config.get('pythonExecutable', 'python3'));
      const current = vscode.workspace.workspaceFile;
      const same = current?.scheme === 'file' && await fs.realpath(current.fsPath).catch(() => '') === result.workspace;
      const message = `${result.created ? 'Created' : 'Using'} MRW workspace: ${result.workspace}. ${python.text} `
        + (result.created && result.notesFolder ? `Notes folder: ${result.notesFolder}. ` : '')
        + (same ? 'This is the current workspace.' : 'Earlier saved sources, studies and history remain in their original workspace. Choose whether to use this window or open another.');
      const buttons = same ? ['Setup guide'] : ['Open in this window', 'Open in new window', 'Setup guide'];
      const choice = await vscode.window.showInformationMessage(message, ...buttons);
      if (choice === 'Setup guide') return vscode.env.openExternal(vscode.Uri.parse(GUIDE));
      if (choice === 'Open in this window') {await beforeSwitch();return vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.file(result.workspace),{forceReuseWindow:true});}
      if (choice === 'Open in new window') return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(result.workspace), {forceNewWindow: true});
      return result;
    })().finally(() => {pending = undefined;});
    return pending;
  });
}
module.exports = {workspacePaths, prepareWorkspace, pythonStatus, registerWorkspaceSetup};
