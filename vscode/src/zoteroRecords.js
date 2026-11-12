'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { constants } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { validateWorkspaceRoute } = require('./companionLinks');
const { itemPath, cancelled } = require('./zoteroApi');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const MAX_FILE = 128 * 1024 * 1024;
async function syncDirectory(directory) { const h = await fs.open(directory, 'r'); try { await h.sync(); } finally { await h.close(); } }
async function regular(file) { const s = await fs.lstat(file); if (!s.isFile() || s.isSymbolicLink()) throw Error('Zotero record storage requires a regular file.'); return s; }
async function directory(dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  if ((await fs.lstat(dir)).isSymbolicLink() || await fs.realpath(dir) !== path.resolve(dir)) throw Error('Zotero record storage cannot use a redirected directory.');
}
async function immutable(file, bytes) {
  await directory(path.dirname(file));
  const temp = `${file}.${randomUUID()}.pending`;
  const handle = await fs.open(temp, 'wx', 0o400);
  try {
    await handle.writeFile(bytes); await handle.sync(); await handle.close();
    try { await fs.link(temp, file); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    await regular(file);
    if (!(await fs.readFile(file)).equals(Buffer.from(bytes))) throw Error('Retained Zotero record differs from its expected bytes.');
    await syncDirectory(path.dirname(file));
  } finally { await handle.close().catch(() => {}); await fs.unlink(temp).catch(() => {}); }
}
function validateItem(item, library, key) {
  itemPath(library, item?.key);
  if (key && item.key !== key || !Number.isSafeInteger(item.version) || item.version < 0 || !item.data || item.data.key !== item.key || item.data.version !== item.version) throw Error('Zotero returned inconsistent item identity or version.');
  if (item.library && (item.library.type !== library.type || String(library.id) !== '0' && String(item.library.id) !== String(library.id))) throw Error('Zotero returned an item from a different library.');
  return item;
}
function plain(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
    const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n);
    return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : '';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_,n) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n])
    .replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
}
function markdown(value) { return plain(value).replace(/[\\`*_{}\[\]()<>!#|]/g, '\\$&'); }
function zoteroLink(library, key) { itemPath(library,key); return `zotero://select/${library.type === 'group' ? `groups/${library.id}` : 'library'}/items/${key}`; }
function makeLink(workspace, id, scheme = 'vscode') {
  if (!hash.test(id) || !['vscode','vscode-insiders'].includes(scheme)) throw Error('Invalid retained Zotero link.');
  return `${scheme}://flengyel.mrw/zotero?v=1&target=${Buffer.from(JSON.stringify({workspace:validateWorkspaceRoute(workspace),id})).toString('base64url')}`;
}
function parseLink(value, scheme = 'vscode') {
  if (typeof value !== 'string' || value.length > 16384) throw Error('Invalid retained Zotero link.');
  const u = new URL(value), fields = [...u.searchParams];
  if (u.protocol !== scheme+':' || u.host !== 'flengyel.mrw' || u.pathname !== '/zotero' || u.hash || u.username || u.password || fields.length !== 2 || u.searchParams.get('v') !== '1') throw Error('Unsupported retained Zotero link.');
  const raw = u.searchParams.get('target');
  if (!raw || Buffer.from(raw,'base64url').toString('base64url') !== raw) throw Error('Invalid retained Zotero link encoding.');
  const target = JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
  if (Object.keys(target).sort().join(',') !== 'id,workspace' || !hash.test(target.id)) throw Error('Invalid retained Zotero target.');
  target.workspace = validateWorkspaceRoute(target.workspace); return target;
}
function citation(record, link) {
  const text = record.item.citation || record.item.bib;
  if (!plain(text)) throw Error('Zotero supplied no formatted citation. Use Copy reference link or choose an installed Zotero citation style.');
  return `[${markdown(text)}](${link}) · [Zotero](${zoteroLink(record.library,record.item.key)})`;
}
class ZoteroRecords {
  constructor(root) { this.root = root; }
  async save(record) {
    this.validate(record);
    const bytes = Buffer.from(JSON.stringify(record, null, 2)+'\n');
    if (bytes.length > 4*1024*1024) throw Error('Zotero reference exceeds 4 MiB.');
    const id = digest(bytes); await immutable(path.join(this.root,'references',id+'.json'), bytes); return id;
  }
  validate(record) {
    if (record?.schema !== 'mrw.zotero-reference.v1' || record.api?.versionDomain !== 'local' || !['local','windows'].includes(record.api.transport) || record.api.apiVersion !== 3) throw Error('Invalid retained Zotero record.');
    validateItem(record.item, record.library);
    if (record.attachment) {
      validateItem(record.attachment.item, record.library);
      if (record.attachment.item.data.parentItem !== record.item.key || !hash.test(record.attachment.sha256) ||
          !/^(\.pdf|\.txt|\.md|\.markdown|\.tex|\.lean|\.bib)$/.test(record.attachment.extension) ||
          !Number.isSafeInteger(record.attachment.size) || record.attachment.size < 0 || record.attachment.size > MAX_FILE) throw Error('Invalid retained Zotero attachment.');
    }
    return record;
  }
  async load(id) {
    if (!hash.test(id)) throw Error('Invalid retained Zotero record ID.');
    const file = path.join(this.root,'references',id+'.json');
    if ((await regular(file)).size > 4*1024*1024) throw Error('Oversized retained Zotero record.');
    const bytes = await fs.readFile(file);
    if (digest(bytes) !== id) throw Error('The retained Zotero reference changed. Its original target was not replaced.');
    return this.validate(JSON.parse(bytes));
  }
  async retainAttachment(file, token) {
    const extension = path.extname(file).toLowerCase();
    if (!/^(\.pdf|\.txt|\.md|\.markdown|\.tex|\.lean|\.bib)$/.test(extension)) throw Error('This attachment format is not supported here. Open it in Zotero.');
    const dir = path.join(this.root,'attachments'); await directory(dir);
    const canonical = await fs.realpath(file), source = await fs.open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
    const temp = path.join(dir,randomUUID()+'.pending'); let output;
    try {
      const before = await source.stat();
      if (!before.isFile() || before.size > MAX_FILE) throw Error('Choose an attachment file of at most 128 MiB.');
      output = await fs.open(temp, 'wx', 0o400);
      const h = createHash('sha256'), buffer = Buffer.alloc(65536); let size = 0;
      for (;;) {
        if (token?.isCancellationRequested) throw cancelled();
        const {bytesRead} = await source.read(buffer,0,buffer.length,null); if (!bytesRead) break;
        size += bytesRead; if (size > MAX_FILE) throw Error('Attachment exceeds 128 MiB.');
        const bytes = buffer.subarray(0,bytesRead); h.update(bytes); await output.writeFile(bytes);
      }
      const after = await source.stat();
      if (before.size !== size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || await fs.realpath(file) !== canonical) throw Error('The attachment changed during retention. Select it again.');
      await output.sync(); await output.close(); output = undefined;
      const sha256 = h.digest('hex'), destination = path.join(dir,sha256+extension);
      try { await fs.link(temp,destination); } catch(e) { if(e.code !== 'EEXIST') throw e; }
      await this.verifiedFile({sha256,extension,size}); await syncDirectory(dir);
      return {sha256,extension,size};
    } finally { await source.close(); await output?.close(); await fs.unlink(temp).catch(()=>{}); }
  }
  async verifiedFile(attachment) {
    if (!hash.test(attachment.sha256) || !/^(\.pdf|\.txt|\.md|\.markdown|\.tex|\.lean|\.bib)$/.test(attachment.extension)) throw Error('Invalid attachment identity.');
    const file = path.join(this.root,'attachments',attachment.sha256+attachment.extension);
    if ((await regular(file)).size !== attachment.size) throw Error('Retained attachment size changed.');
    const h = createHash('sha256'), stream = require('node:fs').createReadStream(file, {flags: constants.O_RDONLY | constants.O_NOFOLLOW});
    for await (const bytes of stream) h.update(bytes);
    if (h.digest('hex') !== attachment.sha256) throw Error('Retained attachment bytes changed.');
    return file;
  }
}
module.exports = { ZoteroRecords, validateItem, plain, markdown, zoteroLink, makeLink, parseLink, citation, digest };
