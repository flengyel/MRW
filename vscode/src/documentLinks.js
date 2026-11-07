'use strict';
// A disposable index of an explicitly chosen folder. Files remain authoritative;
// this module neither imports notes nor persists an index or expands its scope.
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { qualifiedIdentifier } = require('./sourceIdentifiers');
const { parseReadingMarkdown, frontMatterInfo, zettelLinkParts } = require('./readingMarkdown');

const DEFAULT_LIMITS = Object.freeze({ maxFiles: 4096, maxBytes: 32 * 1024 * 1024,
  maxFileBytes: 4 * 1024 * 1024, maxDepth: 32, maxEntries: 20000 });
// Application metadata, deleted notes and generated dependencies are not note destinations.
const excludedDirectories = new Set(['.obsidian', '.trash', '.git', '.lake', 'node_modules', '.venv', '__pycache__']);
const markdown = file => /\.(md|markdown)$/i.test(file);
const within = (root, file) => { const p = path.relative(root, file); return p === '' || (!p.startsWith(`..${path.sep}`) && p !== '..' && !path.isAbsolute(p)); };
const cancelled = token => Boolean(token?.isCancellationRequested || token?.aborted);
const failure = (code, error) => ({ ok: false, code, error });
const idSyntax = id => typeof id === 'string' && id.length > 0 && id.length <= 512 &&
  !/[\s\\/:*?"<>|#^\u0000-\u001f]/u.test(id) && id !== '.' && id !== '..';

function limitsFor(supplied = {}) {
  const limits = {};
  for (const [key, maximum] of Object.entries(DEFAULT_LIMITS)) {
    const value = supplied[key] ?? maximum;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid note-index limit: ${key}.`);
    limits[key] = value;
  }
  return limits;
}

async function readBounded(io, file, maximum) {
  const handle = await io.open(file, 'r');
  const chunks = []; let size = 0;
  try {
    while (size <= maximum) {
      const chunk = Buffer.allocUnsafe(Math.min(65536, maximum + 1 - size));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (!bytesRead) break;
      chunks.push(chunk.subarray(0, bytesRead)); size += bytesRead;
    }
    if (size > maximum) throw new Error(`Note exceeds the ${maximum}-byte file limit.`);
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks, size));
  } finally { await handle.close(); }
}

async function buildNoteIndex(folder, { overrides = new Map(), token, limits: suppliedLimits, io = fs, lookupId } = {}) {
  if (lookupId !== undefined && !idSyntax(lookupId)) throw new Error('Use [[ID]] or [[ID|label]] for a note filename ID.');
  const limits = limitsFor(suppliedLimits), root = await io.realpath(folder);
  if (!(await io.stat(root)).isDirectory()) throw new Error('Choose a notes folder, rather than a file.');
  const index = { root, files: new Map(), ids: new Map(), complete: true, cancelled: false,
    errors: [], stats: { files: 0, bytes: 0, entries: 0, skippedDirectorySymlinks: 0, skippedMetadataDirectories: 0, skippedNonNoteFiles: 0 }, limits, lookupId };
  // The filesystem adapter/token are operation-local and are not serialized.
  Object.defineProperties(index, { io: { value: io }, token: { value: token } });
  function issue(file, code, message) {
    index.complete = false; index.errors.push({ path: file, code, message });
  }
  function stop() {
    if (!cancelled(token)) return false;
    index.cancelled = true; index.complete = false; return true;
  }
  const pending = [{ directory: root, depth: 0 }];
  let exhausted = false;
  while (pending.length && !exhausted && !stop()) {
    const { directory, depth } = pending.pop();
    let entries;
    try {
      const canonical = await io.realpath(directory);
      if (!within(root, canonical)) { issue(directory, 'outside_scope', 'Directory moved outside the selected notes folder.'); continue; }
      entries = await io.readdir(canonical, { withFileTypes: true });
    } catch (error) { issue(directory, 'read_error', error.message); continue; }
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      if (stop()) break;
      if (entry.isDirectory() && excludedDirectories.has(entry.name)) { index.stats.skippedMetadataDirectories++; continue; }
      if (entry.isFile() && !markdown(entry.name)) { index.stats.skippedNonNoteFiles++; continue; }
      if (++index.stats.entries > limits.maxEntries) {
        issue(directory, 'entry_limit', `Stopped at the ${limits.maxEntries}-entry folder limit.`); exhausted = true; break;
      }
      // ID lookup catalogs eligible filenames but reads only matching notes.
      // Uniqueness still requires completing the bounded directory walk.
      if (lookupId !== undefined && entry.isFile() && path.basename(entry.name, path.extname(entry.name)) !== lookupId) continue;
      const candidate = path.join(directory, entry.name);
      let status;
      try { status = await io.lstat(candidate); }
      catch (error) { issue(candidate, 'read_error', error.message); continue; }
      if (status.isSymbolicLink()) {
        try {
          const destination = await io.realpath(candidate), target = await io.stat(destination);
          if (target.isDirectory()) { index.stats.skippedDirectorySymlinks++; continue; }
          if (!within(root, destination)) {
            if (markdown(candidate)) issue(candidate, 'outside_scope', 'Symlink target is outside the selected notes folder.');
            continue;
          }
        } catch (error) { if (markdown(candidate)) issue(candidate, 'read_error', error.message); continue; }
      } else if (status.isDirectory()) {
        if (depth >= limits.maxDepth) issue(candidate, 'depth_limit', `Stopped at the ${limits.maxDepth}-directory depth limit.`);
        else pending.push({ directory: candidate, depth: depth + 1 });
        continue;
      } else if (!status.isFile()) continue;
      if (!markdown(candidate)) continue;
      let file;
      try {
        file = await io.realpath(candidate);
        if (!within(root, file)) { issue(candidate, 'outside_scope', 'Note moved outside the selected notes folder.'); continue; }
        if (!markdown(file) || index.files.has(file)) continue;
        if (lookupId !== undefined && path.basename(file, path.extname(file)) !== lookupId) continue;
        const fileStatus = await io.stat(file);
        if (!fileStatus.isFile()) continue;
        if (index.stats.files >= limits.maxFiles) {
          issue(file, 'file_limit', `Stopped at the ${limits.maxFiles}-note limit.`); exhausted = true; break;
        }
        const override = overrides.get(file);
        let text;
        if (override != null) {
          if (typeof override !== 'string') throw new Error('Dirty note text must be a string.');
          if (Buffer.byteLength(override, 'utf8') > limits.maxFileBytes) throw new Error(`Note exceeds the ${limits.maxFileBytes}-byte file limit.`);
          text = override;
        } else {
          if (fileStatus.size > limits.maxFileBytes) throw new Error(`Note exceeds the ${limits.maxFileBytes}-byte file limit.`);
          text = await readBounded(io, file, limits.maxFileBytes);
        }
        const bytes = Buffer.byteLength(text, 'utf8');
        if (index.stats.bytes + bytes > limits.maxBytes) {
          issue(file, 'byte_limit', `Stopped at the ${limits.maxBytes}-byte folder limit.`); exhausted = true; break;
        }
        const parsed = parseReadingMarkdown(text), frontMatter = frontMatterInfo(text);
        const stem = path.basename(file, path.extname(file)), identityErrors = [...(frontMatter.conflicts || [])];
        if (frontMatter.id != null && frontMatter.id !== stem) identityErrors.push(`YAML id ${JSON.stringify(frontMatter.id)} differs from filename ID ${JSON.stringify(stem)}.`);
        if (frontMatter.malformed) identityErrors.push('The leading front matter has malformed identity metadata or no closing delimiter.');
        const note = { path: file, relative: path.relative(root, file), stem, text, parsed, frontMatter, identityErrors };
        index.files.set(file, note); index.stats.files++; index.stats.bytes += bytes;
        if (idSyntax(stem)) {
          const matches = index.ids.get(stem) || []; matches.push(note); index.ids.set(stem, matches);
        }
      } catch (error) { issue(file || candidate, 'read_error', error.message); }
    }
  }
  stop();
  return index;
}

async function resolveNoteLink(index, from, target, syntax = 'markdown') {
  if (!index?.root) return failure('no_scope', 'Choose a notes folder before following a note link.');
  if (cancelled(index.token)) return failure('cancelled', 'Note navigation was cancelled.');
  if (typeof target !== 'string' || target.length > 8192 || /[\u0000-\u001f]/u.test(target)) return failure('unsupported_target', 'This link does not name a supported local file.');
  const io = index.io || fs;
  let source;
  try { source = await io.realpath(from); }
  catch (_) { return failure('missing_source', 'The source document is missing. Choose its current location.'); }
  if (!within(index.root, source)) return failure('outside_scope', 'The source document is outside the selected notes folder.');
  let destination, fragment = '';
  if (syntax === 'zettel') {
    target = zettelLinkParts(target).target;
    if (index.lookupId !== undefined && index.lookupId !== target) return failure('incomplete_index', 'This filename lookup covers a different note ID.');
    if (!idSyntax(target)) return failure('unsupported_selector', 'Use [[ID]] or [[ID|label]] for an exact note ID. Heading/block selectors and paths are not supported in wiki links.');
    const matches = index.ids.get(target) || [];
    if (matches.length > 1) return failure('ambiguous_id', `Note ID ${JSON.stringify(target)} matches more than one filename in the selected folder.`);
    if (!matches.length) return failure(index.complete ? 'missing_id' : 'incomplete_index', index.complete ?
      `No note with filename ID ${JSON.stringify(target)} exists in the selected folder.` :
      `The notes index is incomplete; it cannot establish a unique target for ${JSON.stringify(target)}.`);
    if (!index.complete) return failure('incomplete_index', `The notes index is incomplete; it cannot establish a unique target for ${JSON.stringify(target)}.`);
    const note = matches[0];
    if (note.identityErrors.length) return failure('identity_conflict', `Note ID ${JSON.stringify(target)} has conflicting identity metadata: ${note.identityErrors.join(' ')}`);
    destination = note.path;
  } else if (syntax === 'markdown') {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || /^[/\\]/u.test(target)) return failure('unsupported_scheme', 'MRW note navigation supports relative local file links; this link needs the host or an explicit file choice.');
    const marker = target.indexOf('#'), filePart = marker < 0 ? target : target.slice(0, marker);
    if (filePart.includes('?')) return failure('unsupported_selector', 'File query selectors are not supported in note navigation.');
    let decoded;
    try { decoded = decodeURIComponent(filePart); fragment = marker < 0 ? '' : decodeURIComponent(target.slice(marker + 1)); }
    catch (_) { return failure('invalid_encoding', 'This local file link has invalid percent encoding.'); }
    if (/[\u0000-\u001f\\]/u.test(decoded) || path.isAbsolute(decoded) || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) return failure('unsupported_target', 'This link does not name a supported relative local file.');
    if (/[\u0000-\u001f]/u.test(fragment) || fragment.startsWith('^')) return failure('unsupported_selector', 'Block selectors are not supported; use a Markdown heading link.');
    destination = decoded ? path.resolve(path.dirname(source), decoded) : source;
  } else return failure('unsupported_syntax', 'This note-link syntax is not supported.');
  if (!within(index.root, destination)) return failure('outside_scope', 'This link leaves the selected notes folder. Choose the other file or folder explicitly.');
  let file;
  try {
    file = await io.realpath(destination);
    if (!within(index.root, file)) return failure('outside_scope', 'This symlink leaves the selected notes folder. Choose the target explicitly.');
    if (!(await io.stat(file)).isFile()) return failure('not_file', 'This link names a directory rather than a document.');
  } catch (_) { return failure('missing_target', 'The linked document is missing. Choose its current location.'); }
  const type = markdown(file) ? 'markdown' : /\.pdf$/i.test(file) ? 'pdf' : 'file', note = index.files.get(file);
  if (fragment && type !== 'markdown') return failure('unsupported_selector', 'Only Markdown heading fragments are supported here. Open this file without a selector in its host reader.');
  let heading;
  if (fragment) {
    if (!note) return failure('unindexed_target', 'The target note could not be indexed, so its heading cannot be located exactly.');
    heading = note.parsed.all.find(node => node.kind === 'heading' && node.anchor === fragment) ||
      note.parsed.all.find(node => node.kind === 'heading' && node.anchor?.toLowerCase() === fragment.toLowerCase());
    if (!heading) return failure('missing_heading', `The linked Markdown heading ${JSON.stringify(fragment)} was not found. The whole note was not substituted.`);
  }
  return { ok: true, path: file, fragment, type, ...(note ? { note } : {}), ...(heading ? { heading } : {}) };
}

async function backlinks(index, targetPath) {
  const result = { occurrences: [], unresolved: [], unresolvedCount: 0,
    complete: Boolean(index?.complete), cancelled: Boolean(index?.cancelled), errors: [...(index?.errors || [])] };
  if (!index?.root) return { ...result, complete: false, errors: [{ code: 'no_scope', message: 'Choose a notes folder to inspect backlinks.' }] };
  if (index.lookupId !== undefined) return { ...result, complete: false, errors: [{ code: 'lookup_only', message: 'A filename lookup cannot establish backlinks. Run a full note-text search.' }] };
  const sourceIO = index.io || fs, realpaths = new Map(), statuses = new Map();
  const memo = (cache, file, read) => {
    if (!cache.has(file)) cache.set(file, Promise.resolve().then(() => read(file)));
    return cache.get(file);
  };
  // A backlink list belongs to one indexed snapshot. Reuse path metadata only
  // during this list; opening a hit still checks its current scope and text.
  const io = { realpath: file => memo(realpaths, file, p => sourceIO.realpath(p)),
    stat: file => memo(statuses, file, p => sourceIO.stat(p)) };
  const snapshotIndex = { ...index, io, token: index.token };
  const qualified = qualifiedIdentifier(targetPath);
  let target;
  try {
    target = qualified || await io.realpath(targetPath);
    if (!qualified && (!within(index.root, target) || !(await io.stat(target)).isFile())) throw new Error('The target is outside the selected notes folder or is not a document.');
  } catch (error) { return { ...result, complete: false, errors: [...result.errors, { path: targetPath, code: 'invalid_target', message: error.message }] }; }
  for (const note of index.files.values()) {
    for (const node of note.parsed.all) {
      if (cancelled(index.token)) return { ...result, complete: false, cancelled: true };
      if (qualified) {
        if (node.qualified_id === qualified) result.occurrences.push({ sourcePath: note.path, sourceRevision: note.parsed.revision, sourceText: note.text.slice(node.start,node.end), node, targetPath: qualified, qualified_id: qualified, fragment: '' });
        continue;
      }
      if (node.kind !== 'document_link' || node.qualified_id) continue;
      // Web citations and host-only URI handlers are not local note candidates.
      // Do not describe an ordinary bibliography as an incomplete local index.
      if (node.syntax === 'markdown' && (/^[a-z][a-z0-9+.-]*:/i.test(node.target) || node.target.startsWith('//'))) continue;
      const resolved = await resolveNoteLink(snapshotIndex, note.path, node.target, node.syntax);
      if (resolved.ok && resolved.path === target) result.occurrences.push({ sourcePath: note.path,
        sourceRevision: note.parsed.revision, sourceText: note.text.slice(node.start, node.end),
        node, targetPath: target, fragment: resolved.fragment });
      else if (!resolved.ok) {
        result.complete = false; result.unresolvedCount++;
        // The count remains complete; bounded details keep a damaged folder from
        // flooding a native picker or allocating another full copy of its links.
        if (result.unresolved.length < 100) result.unresolved.push({ sourcePath: note.path, node, code: resolved.code, error: resolved.error });
        if (result.errors.length < 100) result.errors.push({ path: note.path, code: resolved.code,
          message: `Unresolved link at ${note.relative}:${node.line + 1}: ${resolved.error}` });
      }
    }
  }
  return result;
}

module.exports = { buildNoteIndex, resolveNoteLink, backlinks, DEFAULT_LIMITS, within, markdown };
