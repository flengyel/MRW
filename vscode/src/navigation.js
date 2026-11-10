'use strict';

const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const MAX_SOURCE = 4 * 1024 * 1024;
const digest = data => crypto.createHash('sha256').update(data).digest('hex');

async function sourceSnapshot(file) {
  const canonical = await fs.realpath(file);
  const metadata = await fs.lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('Select a regular non-symlink source file.');
  const handle = await fs.open(file, 'r');
  try {
    if ((await handle.stat()).size > MAX_SOURCE) throw new Error('Source exceeds the 4 MiB navigation limit.');
    const raw = Buffer.alloc(MAX_SOURCE + 1);
    let length = 0;
    while (length < raw.length) {
      const { bytesRead } = await handle.read(raw, length, raw.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_SOURCE) throw new Error('Source exceeds the 4 MiB navigation limit.');
    const bytes = raw.subarray(0, length);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new Error('Select ordinary UTF-8 text.');
    if (await fs.realpath(file) !== canonical) throw new Error('Source path changed while reading.');
    return { path: canonical, revision: digest(bytes), textRevision: digest(text), text };
  } finally { await handle.close(); }
}

function protectedText(text) {
  try {
    const value = JSON.parse(text);
    return !!value && typeof value === 'object' &&
      ((typeof value.schema === 'string' && value.schema.startsWith('mrw.')) ||
       ['artifact_identity', 'artifact_digest', 'method', 'subject'].every(key => key in value));
  } catch { return false; }
}

function validateMarker(marker) {
  const point = value => Array.isArray(value) && value.length === 2 && value.every(n => Number.isSafeInteger(n) && n >= 0);
  if (!marker || marker.version !== 1 || typeof marker.path !== 'string' ||
      typeof marker.root !== 'string' || typeof marker.preview !== 'string' ||
      Array.from(marker.preview).length > 120 || !point(marker.start) || !point(marker.end) ||
      marker.start[0] > marker.end[0] || (marker.start[0] === marker.end[0] && marker.start[1] > marker.end[1]) ||
      !/^[a-f0-9]{64}$/.test(marker.revision) || !/^[a-f0-9]{64}$/.test(marker.textRevision)) {
    throw new Error('Saved return location is invalid. Mark the source again.');
  }
  return marker;
}

function httpsViewer(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('Proof viewer must be an HTTPS URL without embedded credentials.');
  }
  return url.toString();
}

module.exports = { sourceSnapshot, digest, protectedText, validateMarker, httpsViewer };
