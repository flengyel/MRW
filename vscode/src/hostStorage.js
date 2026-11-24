'use strict';

const path = require('node:path');

// Accept only extension storage that Node can access on its own host.
function hostStoragePath(vscode, uri) {
  const location = uri?.fsPath;
  if (typeof location !== 'string' || location.includes('\0') || !path.isAbsolute(location)) return undefined;
  if (uri.scheme === 'file') return location;
  if (uri.scheme === 'vscode-userdata' && !uri.authority && process.platform === 'linux' &&
      vscode.env && vscode.env.remoteName === undefined) return location;
  return undefined;
}

module.exports = { hostStoragePath };
