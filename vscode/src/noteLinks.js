'use strict';
const path = require('node:path');
const { validateWorkspaceRoute } = require('./companionLinks');
const excluded = new Set(['.obsidian', '.trash', '.git', '.lake', 'node_modules', '.venv', '__pycache__']);

// An ordinary-note locator opens current file contents, not an immutable source
// revision. It never grants scope or imports a file, and contains no session token.
function validateTarget(target) {
  if (!target || Object.keys(target).sort().join(',') !== 'file,notes,workspace' ||
      typeof target.notes !== 'string' || target.notes.length > 4096 ||
      !path.posix.isAbsolute(target.notes) || path.posix.normalize(target.notes) !== target.notes ||
      (target.notes !== '/' && target.notes.endsWith('/')) ||
      /[\x00-\x1f\x7f\\]/u.test(target.notes) ||
      typeof target.file !== 'string' || target.file.length > 4096 ||
      path.posix.isAbsolute(target.file) || path.posix.normalize(target.file) !== target.file ||
      /[\x00-\x1f\x7f\\]/u.test(target.file) || !/\.(md|markdown)$/iu.test(target.file) ||
      target.file.split('/').some(p => p === '.' || p === '..' || excluded.has(p))) {
    throw new Error('Malformed MRW note target. Copy its link again.');
  }
  return { workspace: validateWorkspaceRoute(target.workspace), notes: target.notes, file: target.file };
}
function makeNoteLink(target, scheme = 'vscode') {
  if (!['vscode', 'vscode-insiders'].includes(scheme)) throw new Error('This VS Code URI scheme is unsupported.');
  return `${scheme}://flengyel.mrw/note?v=1&target=${Buffer.from(JSON.stringify(validateTarget(target)), 'utf8').toString('base64url')}`;
}
function parseNoteLink(value, scheme = 'vscode') {
  if (!['vscode', 'vscode-insiders'].includes(scheme) || typeof value !== 'string' ||
      value.length > 20000 || /[\s\x00-\x1f\x7f]/u.test(value)) throw new Error('Malformed MRW note link. Copy the complete link again.');
  const uri = new URL(value), pairs = [...uri.searchParams], params = Object.fromEntries(pairs);
  if (uri.protocol !== `${scheme}:` || uri.host !== 'flengyel.mrw' || uri.pathname !== '/note' ||
      uri.hash || uri.username || uri.password || uri.port || pairs.length !== 2 ||
      Object.keys(params).length !== 2 || params.v !== '1' || !/^[\w-]+$/u.test(params.target || '')) {
    throw new Error('Unsupported MRW note action or parameters.');
  }
  const bytes = Buffer.from(params.target, 'base64url');
  if (bytes.toString('base64url') !== params.target) throw new Error('Malformed MRW note encoding.');
  return validateTarget(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
module.exports = { makeNoteLink, parseNoteLink, validateTarget };
