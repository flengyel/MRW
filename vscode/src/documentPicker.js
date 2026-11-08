'use strict';
const path = require('node:path');
const { buildNoteIndex, DEFAULT_LIMITS } = require('./documentLinks');
const { windowsNoteFiles } = require('./noteFiles');
const { noteIdentity } = require('./noteIdentity');

// Display metadata is a locator label, never permission or source authority.
const plain = value => value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 512);
function documentItem(root, file, text = '') {
  const identity = noteIdentity({ uri: { fsPath: file }, getText: () => text }, { headingFallback: true });
  return { file, label: plain(identity.label), description: path.dirname(path.relative(root, file)) === '.' ? '' : plain(path.dirname(path.relative(root, file))),
    detail: plain(path.relative(root, file)) };
}
async function documentChoices(root, { remoteName, token, overrides = new Map(), catalogue = windowsNoteFiles } = {}) {
  const listed = await catalogue(root, { remoteName, token, limits: DEFAULT_LIMITS, includeHeaders: true });
  if (token?.isCancellationRequested) return { items: [], complete: false };
  let items, complete;
  if (listed?.headers) {
    items = listed.paths.slice(0, DEFAULT_LIMITS.maxFiles).map(file => documentItem(root, file, overrides.get(file) ?? listed.headers.get(file)));
    complete = listed.complete;
  } else {
    const index = await buildNoteIndex(root, { token, overrides });
    items = [...index.files.values()].map(note => documentItem(root, note.path, note.text));
    complete = index.complete;
  }
  items.sort((a, b) => a.label.localeCompare(b.label) || a.file.localeCompare(b.file));
  return { items, complete };
}
module.exports = { documentChoices, documentItem };
