'use strict';

const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { parsePrintedLabels } = require('./atlasText');

const MAX_SOURCE = 2 * 1024 * 1024, MAX_AUX = 1024 * 1024;
const sameFile = (a, b) => ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every(key => a[key] === b[key]);

async function regularText(file, limit) {
  const info = await fs.lstat(file);
  if (!info.isFile() || info.size > limit) return undefined;
  // Pin the file while reading and never follow a redirected sibling.
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!sameFile(info, await handle.stat())) return undefined;
    const buffer = Buffer.alloc(info.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== info.size || !sameFile(info, await handle.stat())) return undefined;
    return { info, text: buffer.subarray(0, size).toString('utf8') };
  } finally {
    await handle.close();
  }
}

async function readAtlasAux(sourcePath, exactText) {
  if (!path.isAbsolute(sourcePath) || !/\.tex$/i.test(sourcePath)) return undefined;
  try {
    const source = await regularText(sourcePath, MAX_SOURCE);
    if (!source || source.text.replace(/^\uFEFF/u, '') !== exactText.replace(/^\uFEFF/u, '')) return undefined;
    const auxiliary = await regularText(sourcePath.replace(/\.tex$/i, '.aux'), MAX_AUX);
    if (!auxiliary || auxiliary.info.mtimeMs < source.info.mtimeMs || !sameFile(source.info, await fs.lstat(sourcePath))) return undefined;
    return parsePrintedLabels(auxiliary.text);
  } catch {
    // A missing, unreadable or replaced auxiliary leaves lexical numbering available.
    return undefined;
  }
}

module.exports = { readAtlasAux };
