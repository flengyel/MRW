'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
// This descriptor is loaded with the extension code, rather than reread after
// an installation replaces the package on disk while the old host stays open.
const descriptor = require('../package.json');

const GUIDE_ROOT = 'https://github.com/flengyel/MRW/blob/main/';
const GUIDES = new Set([
  'PROOF_STUDY_WORKFLOW.md', 'ACTIVE_STUDY_WORKFLOW.md',
  'GETTING_STARTED_WSL_SAGEPOD.md', 'READING_OUTLINE_WORKFLOW.md',
  'OBSIDIAN_WORKFLOW.md', 'ARTIFACT_STORAGE.md', 'READER_AI_WORKFLOW.md', 'STACKS_WORKFLOW.md',
]);

function rewriteGuideLinks(text) {
  return text.replace(/\]\((?:\.\.\/)?docs\/([A-Z_]+\.md)(#[A-Za-z0-9_-]+)?\)/g,
    (whole, file, fragment = '') => GUIDES.has(file) ? `](${GUIDE_ROOT}docs/${file}${fragment})` : whole);
}

function renderTutorial(text, identity) {
  const version = identity.version || 'unknown';
  const build = identity.commit ? ` · build \`${identity.commit}\`` : ' · build identity unavailable';
  const heading = /^# [^\r\n]+(?:\r?\n|$)/;
  const banner = `\nActive extension: **MRW ${version}**${build}.\n`;
  const source = rewriteGuideLinks(text);
  return heading.test(source) ? source.replace(heading, first => first + banner) : banner + '\n' + source;
}

function registerTutorial({ vscode, context, register }) {
  const active = context.extension?.packageJSON || descriptor;
  const identity = { version: typeof active.version === 'string' ? active.version : undefined };
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'media', 'build-info.json'), 'utf8'));
    // A newer package may have reached disk before this activation's metadata.
    // Its commit must not be presented as the identity of the running code.
    if (marker.version === identity.version && /^[0-9a-f]{7,64}$/i.test(marker.commit || '')) identity.commit = marker.commit;
  } catch (_) { /* Unavailable build identity does not make help unavailable. */ }

  // Snapshot the active package once. A later on-disk install does not change
  // this activation's help or claim that the new extension has been adopted.
  const content = renderTutorial(fs.readFileSync(path.join(context.extensionPath, 'media', 'first-steps.md'), 'utf8'), identity);
  const changed = new vscode.EventEmitter();
  const uri = vscode.Uri.from({ scheme: 'mrw-help', path: '/Using MRW.md', query: `activation=${randomUUID()}` });
  const provider = { onDidChange: changed.event, provideTextDocumentContent: () => content };
  context.subscriptions.push(changed, vscode.workspace.registerTextDocumentContentProvider('mrw-help', provider));
  register('mrw.openTutorial', async () => {
    // A closed/reopened or already visible virtual document is refreshed even
    // when VS Code keeps its text model. A new activation has a fresh URI too.
    changed.fire(uri);
    return vscode.commands.executeCommand('markdown.showPreview', uri);
  });
  return { identity: Object.freeze(identity), uri, provider };
}

module.exports = { registerTutorial, renderTutorial, rewriteGuideLinks };
