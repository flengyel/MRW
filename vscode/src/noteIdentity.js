'use strict';
const path = require('node:path');
const { frontMatterInfo, parseReadingMarkdown } = require('./readingMarkdown');

function noteIdentity(doc, { headingFallback = false } = {}) {
  const filename = path.basename(doc.uri.fsPath || doc.uri.path);
  const id = path.basename(filename, path.extname(filename));
  const text = doc.getText();
  const rawTitle = frontMatterInfo(text).title?.trim() || '';
  let heading = '';
  if (!rawTitle && headingFallback) {
    try { heading = parseReadingMarkdown(text).all.find(n => n.kind === 'heading' && n.level === 1)?.label || ''; }
    catch (_) { /* A filename remains usable when bounded metadata cannot be parsed. */ }
  }
  const title = rawTitle ? (rawTitle.startsWith(id + ' ') ? rawTitle.slice(id.length).trim() : rawTitle) : heading;
  return { filename, id, rawTitle, title, label: title ? `${title} · ${filename}` : filename };
}
module.exports = { noteIdentity };
