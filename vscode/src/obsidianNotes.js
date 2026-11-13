'use strict';
// Obsidian owns creation and template execution. MRW never supplies note bytes.
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const options = {timeout:15000, maxBuffer:1024*1024, windowsHide:true, encoding:'utf8'};
async function run(file, args) { return (await exec(file, args, options)).stdout.trim(); }
function windowsPath(value) {
  const match = /^\/mnt\/([a-z])\/(.*)$/i.exec(value);
  return match ? `${match[1].toUpperCase()}:\\${match[2].replaceAll('/', '\\')}` : value;
}
function samePath(a, b) {
  const normalize = value => /^[A-Za-z]:[\\/]/.test(value)
    ? path.win32.normalize(value).replace(/[\\/]$/, '').toLowerCase()
    : path.resolve(value);
  return normalize(a) === normalize(b);
}
async function executable(configuration, remote, execute) {
  const configured = configuration.get('obsidianExecutable', '').trim();
  if (configured) return configured;
  if (remote === 'wsl') {
    // Fixed discovery script: no vault path or command ID is interpolated.
    const script = "Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\\Obsidian\\Obsidian.com'";
    const value = await execute('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      ['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')]);
    const match = /^([A-Za-z]):\\([^\r\n]+)$/.exec(value);
    if (!match) throw Error('Set MRW: Obsidian Executable to the Obsidian CLI on this host.');
    return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\','/')}`;
  }
  return process.platform === 'win32' ? 'Obsidian.com' : 'obsidian';
}
async function createObsidianNote({vscode, root, validate = async () => {}, execute = run}) {
  if (vscode.workspace.isTrusted === false) throw Error('Trust this workspace before running its configured Obsidian command.');
  const config = vscode.workspace.getConfiguration('mrw');
  const vault = config.get('obsidianVault', '').trim() || path.basename(root);
  const command = config.get('obsidianNewNoteCommand', 'file-explorer:new-file').trim();
  if (!vault || !command || /[\r\n\x00]/.test(vault + command)) throw Error('Set MRW: Obsidian New Note Command and a valid Obsidian vault.');
  let cli;
  try {
    cli = await executable(config, vscode.env.remoteName, execute);
    const actual = await execute(cli, [`vault=${vault}`, 'vault', 'info=path']);
    const expected = vscode.env.remoteName === 'wsl' ? windowsPath(root) : root;
    if (!samePath(actual, expected)) throw Error('Obsidian selected a different vault. Set MRW: Obsidian Vault to the intended vault ID.');
    const commands = await execute(cli, [`vault=${vault}`, 'commands']);
    if (!commands.split(/\r?\n/).includes(command)) throw Error(`Obsidian command is unavailable: ${command}. Set MRW: Obsidian New Note Command to your template's creation command.`);
  } catch (error) {
    throw Error(`New Note could not reach the selected Obsidian command: ${error.message}. Enable Obsidian Settings → General → Command line interface, and check MRW's Obsidian settings. No note was created by MRW.`);
  }
  await validate();
  const focused = await vscode.env.openExternal(vscode.Uri.parse(`obsidian://open?vault=${encodeURIComponent(vault)}`));
  if (!focused) throw Error('Obsidian could not be opened. The new-note command was not sent.');
  await validate();
  try {
    const response = await execute(cli, [`vault=${vault}`, 'command', `id=${command}`]);
    if (/^Error\b/im.test(response)) throw Error(response);
  } catch (error) {
    // Commands may have run before transport failure. Never retry or create a fallback file.
    throw Error(`Obsidian did not confirm the new-note command: ${error.message}. Check Obsidian before retrying; MRW will not create a second note.`);
  }
}
module.exports = {createObsidianNote, samePath, windowsPath};
