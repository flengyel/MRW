'use strict';
const path = require('node:path');

const extensionId = 'flengyel.mrw';
function route(value) {
  if (typeof value !== 'string' || value.length > 4096 || /[\x00-\x20\x7f\\]/u.test(value) || /%(?![\da-f]{2})/iu.test(value)) {
    throw new Error('Invalid workspace URI. Use an encoded file: or vscode-remote: workspace URI.');
  }
  const uri = new URL(value);
  if (/\/(?:\.|\.\.)(?:\/|$)/u.test(decodeURIComponent(value))) throw new Error('Workspace routes cannot contain relative path components.');
  const pathname = decodeURIComponent(uri.pathname);
  if (uri.search || uri.hash || uri.username || uri.password || uri.port || !pathname.startsWith('/') ||
      /[\x00-\x1f\x7f\\]/u.test(pathname) || pathname.split('/').some(p => p === '.' || p === '..') ||
      !((uri.protocol === 'file:' && !uri.host) || (uri.protocol === 'vscode-remote:' &&
        /^(?:wsl\+|ssh-remote\+)[a-z0-9_.+-]+$/iu.test(uri.host)))) {
    throw new Error('Unsupported workspace route. Use a local Linux, WSL or SSH workspace URI without query or fragment.');
  }
  return uri.href;
}
function workspaceRoute(vscode, root) {
  const workspace = vscode.workspace.workspaceFile;
  if (workspace?.scheme === 'untitled') throw new Error('Save the multi-folder workspace before copying an external link.');
  const destination = workspace ? workspace.fsPath : root;
  const configured = vscode.workspace.getConfiguration('mrw').get('navigationWorkspaceUri', '');
  if (configured) {
    const value = route(configured);
    if (decodeURIComponent(new URL(value).pathname) !== destination) throw new Error('MRW navigation workspace URI must name this folder or saved workspace file.');
    return value;
  }
  const pathname = destination.split('/').map(encodeURIComponent).join('/');
  if (vscode.env.remoteName === 'wsl' && process.env.WSL_DISTRO_NAME) {
    return route(`vscode-remote://wsl+${process.env.WSL_DISTRO_NAME}${pathname}`);
  }
  if (vscode.env.remoteName) throw new Error('Set MRW: Navigation Workspace URI in Remote settings to this workspace’s vscode-remote://ssh-remote+HOST/… URI.');
  return route(`file://${pathname}`);
}
function makeExternal({ workspace, project, reference }, scheme = 'vscode') {
  if (!['vscode', 'vscode-insiders'].includes(scheme)) throw new Error('This VS Code URI scheme is unsupported.');
  const target = { workspace: route(workspace), project, reference };
  const result = `${scheme}://${extensionId}/outline?v=1&target=${Buffer.from(JSON.stringify(target), 'utf8').toString('base64url')}`;
  parseExternal(result, scheme);
  return result;
}
function parseExternal(value, scheme = 'vscode') {
  if (typeof value !== 'string' || value.length > 16384 || /[\s\x00-\x1f\x7f]/u.test(value)) throw new Error('Malformed MRW navigation link. Copy the complete link again.');
  const uri = new URL(value), pairs = [...uri.searchParams], params = Object.fromEntries(pairs);
  if (uri.protocol !== `${scheme}:` || uri.host !== extensionId || uri.pathname !== '/outline' || uri.hash ||
      pairs.length !== 2 || Object.keys(params).length !== 2 || params.v !== '1' || !/^[\w-]+$/u.test(params.target || '') ||
      uri.username || uri.password || uri.port) throw new Error('Unsupported MRW URI action or parameters.');
  const raw = Buffer.from(params.target, 'base64url');
  if (raw.toString('base64url') !== params.target) throw new Error('Malformed MRW target encoding.');
  const target = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  if (!target || Object.keys(target).sort().join(',') !== 'project,reference,workspace' ||
      typeof target.project !== 'string' || !path.posix.isAbsolute(target.project) || path.posix.normalize(target.project) !== target.project ||
      /[\x00-\x1f\x7f\\]/u.test(target.project) || target.project.length > 4096 ||
      typeof target.reference !== 'string' || !/^mrw-outline:v[12]\//.test(target.reference) || target.reference.length > 512) {
    throw new Error('Malformed MRW retained target.');
  }
  target.workspace = route(target.workspace);
  return target;
}
function obsidianTarget(vscode, value) {
  // The core validates/stores the supplied open URL. Use Obsidian's documented
  // equivalent path form at dispatch: VS Code's opener decodes a URI query then
  // applies encodeURI, which would turn an encoded '&' in a name into a query
  // delimiter. A path-form target has no query/action parameters to reinterpret.
  const params = new URL(value).searchParams;
  return vscode.Uri.from({ scheme: 'obsidian', authority: 'vault', path: `/${params.get('vault')}/${params.get('file')}` });
}
module.exports = { makeExternal, parseExternal, workspaceRoute, obsidianTarget, validateWorkspaceRoute: route };
