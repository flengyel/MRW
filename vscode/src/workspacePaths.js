'use strict';
const path = require('node:path');
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
// Mathematical prose and immutable citations are payload, never locations.
const payload = /^(text|content|raw|title|label|description|question|answer|prompt|draft|unresolved|unresolvedDraft|response|reference|revision|source_revision)$/;
function walk(value, convert) {
  const converted = convert(value);
  if (converted !== value) return converted;
  if (Array.isArray(value)) return value.map(v => walk(v, convert));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, payload.test(key) ? item : walk(item, convert)]));
  return value;
}
function encode(value, workspace, notes) {
  return walk(value, item => {
    if (typeof item !== 'string') return item;
    let file = item, uri;
    if (/^(file|vscode-remote):\/\//.test(item)) {
      uri = new URL(item); file = decodeURIComponent(uri.pathname);
    }
    if (!path.isAbsolute(file)) return item;
    const base = workspace && inside(workspace, file) ? workspace :
      notes && path.isAbsolute(notes) && inside(notes, file) ? notes : undefined;
    if (!base) return item;
    return {$mrwPath: base === workspace ? 'workspace' : 'notes',
      ...(base === workspace ? {} : {root: notes}),
      relative: path.relative(base, file),
      ...(uri ? {uri: {protocol: uri.protocol, host: uri.host, search: uri.search, hash: uri.hash}} : {})};
  });
}
function decode(value, workspace) {
  return walk(value, item => {
    if (!item || typeof item !== 'object' || !Object.hasOwn(item, '$mrwPath')) return item;
    const base = item.$mrwPath === 'workspace' ? workspace : item.$mrwPath === 'notes' ? item.root : undefined;
    if (!base || !path.isAbsolute(base) || typeof item.relative !== 'string' || path.isAbsolute(item.relative)) throw Error('Saved relative location is invalid.');
    const file = path.resolve(base, item.relative);
    if (!inside(base, file)) throw Error('Saved relative location leaves its root.');
    if (!item.uri) return file;
    if (!['file:', 'vscode-remote:'].includes(item.uri.protocol)) throw Error('Saved location protocol is invalid.');
    const url = new URL(item.uri.protocol + '//' + item.uri.host + '/');
    url.pathname = file; url.search = item.uri.search; url.hash = item.uri.hash;
    return url.href;
  });
}
module.exports = {encode, decode, payload};
