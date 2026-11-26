'use strict';
const { spawn } = require('node:child_process');

function captureUrl({ backend, template, link, title, text }) {
  if (typeof template !== 'string' || !template.trim() || /[\u0000-\u001f\u007f]/u.test(template)) {
    throw new Error('Set Org Capture Template (mrw.orgCaptureTemplate) to your Emacs template key.');
  }
  if (backend !== 'denote' && backend !== 'org-roam') throw new Error('Choose Denote or Org-roam in Org Capture Backend (mrw.orgCaptureBackend).');
  const roam = backend === 'org-roam';
  const fields = { template: template.trim(), [roam ? 'ref' : 'url']: link, title, body: text };
  const parameters = Object.entries(fields).map(([key, value]) => {
    const encoded = encodeURIComponent(value);
    // Org-roam 2.3.1 decodes all parameters again after Org parses the URI.
    return key + '=' + (roam ? encodeURIComponent(encoded) : encoded);
  }).join('&');
  const uri = 'org-protocol://' + (roam ? 'roam-ref' : 'capture') + '?' + parameters;
  // Linux limits a single process argument to 128 KiB on 4 KiB pages.
  if (Buffer.byteLength(uri) > 120 * 1024) throw new Error('This passage is too long for Emacs capture. Choose a shorter retained passage.');
  return uri;
}

async function sendOrgCapture(vscode, passage, launch = spawn) {
  if (!vscode.workspace.isTrusted) throw new Error('Trust the current workspace before capturing a passage in Emacs.');
  const config = vscode.workspace.getConfiguration('mrw');
  const url = captureUrl({
    ...passage,
    backend: config.get('orgCaptureBackend', 'denote'),
    template: config.get('orgCaptureTemplate', ''),
  });
  const env = { ...process.env };
  delete env.ALTERNATE_EDITOR;
  delete env.EMACS_SERVER_FILE;
  await new Promise((resolve, reject) => {
    const client = launch('emacsclient', ['--no-wait', '--quiet', '--', url], { env, stdio: 'ignore' });
    client.once('error', error => reject(new Error(error.code === 'ENOENT'
      ? 'Emacs client is unavailable on this extension host. Install emacsclient and start the Emacs server.'
      : 'Could not start emacsclient. Check the Emacs installation on this extension host.')));
    client.once('spawn', () => {
      // Even with --no-wait, Emacs can keep the client waiting at a prompt.
      client.unref();
      resolve();
    });
    client.once('exit', code => {
      if (code !== 0) void vscode.window.showWarningMessage('Emacs did not confirm the capture. Check its server and any open capture before sending the passage again.');
    });
  });
  vscode.window.setStatusBarMessage('Sent the passage to emacsclient. Finish or cancel the capture in Emacs.', 7000);
}

module.exports = { sendOrgCapture };
