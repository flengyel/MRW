'use strict';
const path = require('node:path');
const { frontMatterInfo } = require('./readingMarkdown');

function noteIdentity(doc) {
  const filename = path.basename(doc.uri.fsPath || doc.uri.path);
  const id = path.basename(filename, path.extname(filename));
  const rawTitle = frontMatterInfo(doc.getText()).title?.trim() || '';
  const title = rawTitle.startsWith(id + ' ') ? rawTitle.slice(id.length).trim() : rawTitle;
  return { filename, id, rawTitle, title, label: title ? `${title} · ${filename}` : filename };
}
module.exports = { noteIdentity };
