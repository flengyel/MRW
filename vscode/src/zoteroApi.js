'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const MAX_RESPONSE = 4 * 1024 * 1024;
const KEY = /^[A-Z0-9]{8}$/;
function libraryPath(library) {
  if (!library || !['user', 'group'].includes(library.type) || !/^\d+$/.test(String(library.id))) throw Error('Invalid Zotero library.');
  return `/${library.type === 'group' ? 'groups' : 'users'}/${library.id}`;
}
function itemPath(library, key) {
  if (!KEY.test(key)) throw Error('Invalid Zotero item key.');
  return `${libraryPath(library)}/items/${key}`;
}
function apiPath(value) {
  if (typeof value !== 'string' || value.length > 8192 || !/^\/(?:users\/\d+\/(?:groups|items(?:\/top|\/[A-Z0-9]{8}(?:\/children|\/file\/view\/url)?)?)|groups\/\d+\/items(?:\/top|\/[A-Z0-9]{8}(?:\/children|\/file\/view\/url)?)?)?(?:\?[^#\s]*)?$/.test(value)) throw Error('Unsupported Zotero API request.');
  return value;
}
function directGet(requestPath, serverId, token) {
  return new Promise((resolve, reject) => {
    if (token?.isCancellationRequested) return reject(Error('Zotero request cancelled.'));
    const headers = { 'Zotero-API-Version': '3' };
    if (serverId) headers['Zotero-Server-ID'] = serverId;
    let subscription;
    const request = http.get({ hostname: '127.0.0.1', port: 23119, path: '/api' + apiPath(requestPath), headers, agent: false }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > MAX_RESPONSE) request.destroy(Error('Zotero response exceeds 4 MiB. Narrow the search.')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.setTimeout(8000, () => request.destroy(Error('Zotero request timed out.')));
    request.on('error', reject); request.on('close', () => subscription?.dispose());
    subscription = token?.onCancellationRequested?.(() => request.destroy(Error('Zotero request cancelled.')));
  });
}
async function windowsGet(requestPath, serverId, token) {
  if (token?.isCancellationRequested) throw Error('Zotero request cancelled.');
  const script = await fs.readFile(path.join(__dirname, '../media/zotero-read.ps1'), 'utf8');
  const executable = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  return new Promise((resolve, reject) => {
    let subscription;
    const child = execFile(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 12000, maxBuffer: 12 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
        subscription?.dispose();
        if (error) return reject(Error(token?.isCancellationRequested ? 'Zotero request cancelled.' : 'Windows Zotero connection failed. Check WSL Windows interop and Zotero.'));
        try { resolve(JSON.parse(stdout.replace(/^\uFEFF/, ''))); } catch (_) { reject(Error('Invalid Windows Zotero response.')); }
      });
    subscription = token?.onCancellationRequested?.(() => child.kill());
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ path: apiPath(requestPath), serverId }));
  });
}
class ZoteroApi {
  constructor(transport, { get, serverId } = {}) {
    if (!['local', 'windows'].includes(transport)) throw Error('Choose a Zotero connection.');
    this.transport = transport; this.get = get || (transport === 'windows' ? windowsGet : directGet); this.serverId = serverId;
  }
  async request(requestPath, token, json = true) {
    const r = await this.get(apiPath(requestPath), this.serverId, token);
    if (token?.isCancellationRequested) throw Error('Zotero request cancelled.');
    if (!r || typeof r.body !== 'string' || Buffer.byteLength(r.body) > MAX_RESPONSE) throw Error('Invalid or oversized Zotero response.');
    const headers = Object.fromEntries(Object.entries(r.headers || {}).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v]) => [k.toLowerCase(), String(v)]));
    if (r.status === 403) throw Error('Enable Zotero → Settings → Advanced → Allow other applications on this computer to communicate with Zotero.');
    if (r.status === 404) throw Error('This Zotero item or attachment is unavailable. Its retained reference has not been changed.');
    if (r.status === 412) throw Error('The Zotero instance changed. Connect again; earlier references remain pinned.');
    if (r.status !== 200) throw Error(`Zotero returned HTTP ${r.status}. No redirect or fallback was followed.`);
    if (headers['zotero-api-version'] !== '3') throw Error('This Zotero instance does not report supported API version 3.');
    const server = headers['zotero-server-id'];
    if (server && !/^[\w-]{1,128}$/.test(server)) throw Error('Invalid Zotero instance identity.');
    if (this.serverId && server !== this.serverId) throw Error('The Zotero instance changed. Connect again; earlier references remain pinned.');
    this.serverId = server;
    this.capabilities = { apiVersion: 3, schemaVersion: headers['zotero-schema-version'] || null, serverId: server || null,
      clientVersion: headers['x-zotero-version'] || null, versionDomain: 'local', transport: this.transport };
    if (!json) return r.body;
    try { return JSON.parse(r.body); } catch (_) { throw Error('Zotero returned invalid JSON.'); }
  }
  async probe(token) { await this.request('/', token, false); return this.capabilities; }
  groups(token) { return this.request('/users/0/groups?limit=100', token); }
  search(library, query, start = 0, token) {
    if (!Number.isSafeInteger(start) || start < 0 || typeof query !== 'string' || query.length > 256) throw Error('Invalid Zotero search.');
    return this.request(`${libraryPath(library)}/items/top?${new URLSearchParams({ q: query, limit: '50', start: String(start), itemType: '-attachment || note' })}`, token);
  }
  item(library, key, token) { return this.request(`${itemPath(library,key)}?include=data,bib,citation&style=chicago-note-bibliography`, token); }
  children(library, key, start = 0, token) { return this.request(`${itemPath(library,key)}/children?limit=50&start=${start}`, token); }
  file(library, key, token) { return this.request(`${itemPath(library,key)}/file/view/url`, token, false); }
}
function attachmentPath(value, transport) {
  const url = new URL(value.trim());
  if (url.protocol !== 'file:' || url.hostname || url.search || url.hash) throw Error('Zotero did not return a local file. No remote attachment was substituted.');
  if (transport === 'windows') {
    const decoded = decodeURIComponent(url.pathname), match = /^\/([A-Za-z]):\/(.+)$/.exec(decoded);
    if (!match || /[\x00-\x1f\\:]/.test(match[2]) || match[2].split('/').some(p => p === '.' || p === '..')) throw Error('This Windows attachment path cannot be mapped safely into WSL.');
    return `/mnt/${match[1].toLowerCase()}/${match[2]}`;
  }
  return fileURLToPath(url);
}
module.exports = { ZoteroApi, libraryPath, itemPath, apiPath, attachmentPath, directGet, windowsGet };
