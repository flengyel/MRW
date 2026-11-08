'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { TextDecoder } = require('node:util');

// WSL crossing a mounted Windows directory for each metadata call is slow.
// Enumerate names in one bounded, read-only Windows process. Note contents and
// actual destination/scope checks still use the ordinary extension-host code.
async function windowsNoteFiles(root, { token, limits, remoteName, includeHeaders = false, run = execute } = {}) {
  const mounted = /^\/mnt\/([a-z])\/(.*)$/i.exec(root);
  if (remoteName !== 'wsl' || !mounted) return undefined;
  if (token?.isCancellationRequested) return { root, paths: [], complete: false, errors: ['Note navigation was cancelled.'], cancelled: true };
  try {
    const script = await fs.readFile(path.join(__dirname, '../media/note-files.ps1'), 'utf8');
    const executable = await fs.access('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe').then(() => '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', () => 'powershell.exe');
    const result = await run(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      JSON.stringify({ root: `${mounted[1].toUpperCase()}:\\${mounted[2].replaceAll('/', '\\')}`, maxDepth: limits.maxDepth, maxEntries: limits.maxEntries,
        ...(includeHeaders ? { headerBytes: 65536, maxFiles: limits.maxFiles, maxBytes: limits.maxBytes } : {}) }), token);
    const value = JSON.parse(result.replace(/^\uFEFF/, ''));
    if (!Array.isArray(value.paths) || value.paths.length > limits.maxEntries || typeof value.complete !== 'boolean' ||
        !Array.isArray(value.errors) || value.errors.some(e => typeof e !== 'string')) throw new Error('Invalid filename catalogue.');
    const paths = value.paths.map(relative => {
      if (typeof relative !== 'string' || !relative || relative.length > 8192 || /[\\:\u0000-\u001f]/.test(relative) ||
          path.posix.isAbsolute(relative) || relative.split('/').some(part => !part || part === '.' || part === '..') ||
          !/\.(md|markdown)$/i.test(relative) || relative.split('/').some(part => ['.obsidian','.trash','.git','.lake','node_modules','.venv','__pycache__'].includes(part))) throw new Error('Invalid catalogue path.');
      return path.join(root, relative);
    });
    const headers = new Map();
    if (includeHeaders) {
      if (!value.headers || typeof value.headers !== 'object' || Array.isArray(value.headers)) throw new Error('Invalid note headers.');
      let total = 0;
      for (const [relative, encoded] of Object.entries(value.headers)) {
        const file = path.join(root, relative);
        if (!paths.includes(file) || typeof encoded !== 'string') throw new Error('Header is outside the catalogue.');
        const bytes = Buffer.from(encoded, 'base64');
        if (bytes.toString('base64') !== encoded || bytes.length > 65536 || (total += bytes.length) > limits.maxBytes) throw new Error('Invalid header bounds.');
        try { headers.set(file, new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true })); }
        catch (_) { /* Invalid UTF-8 retains only the filename in the chooser. */ }
      }
    }
    return { root, paths: [...new Set(paths)], ...(includeHeaders ? { headers } : {}), complete: value.complete && value.errors.length === 0, errors: value.errors,
      stats: { entries: value.entries, skippedMetadataDirectories: value.skipped }, provider: 'windows-filenames' };
  } catch (_) {
    if (token?.isCancellationRequested) return { root, paths: [], complete: false, errors: ['Note navigation was cancelled.'], cancelled: true };
    return undefined; // Normal bounded filesystem lookup remains available.
  }
}
function execute(executable, args, input, token) {
  return new Promise((resolve, reject) => {
    const child = execFile(executable, args, { windowsHide: true, timeout: 12000, maxBuffer: 48 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
      subscription?.dispose(); if (error) reject(error); else resolve(stdout);
    });
    const subscription = token?.onCancellationRequested?.(() => child.kill());
    child.stdin.on('error', () => {}); // Process failure is reported through execFile's callback.
    child.stdin.end(input);
  });
}
module.exports = { windowsNoteFiles };
