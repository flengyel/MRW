'use strict';
// Parse Markdown as data. No renderer, plugins, URI handlers or source reads.
const MarkdownIt = require('../media/markdown-it/markdown-it');
const { digest } = require('./navigation');
const { qualifiedIdentifier } = require('./sourceIdentifiers');
const md = new MarkdownIt('commonmark');
const textRule = md.inline.ruler.__rules__.find(r => r.name === 'text').fn;
// A note ID is resolved by the selected-folder index, not by the Markdown
// parser. Keep unsupported selectors visible so following them can explain the
// exact problem instead of silently opening a different location.
md.inline.ruler.before('link', 'zettel_link', (state, silent) => {
  const start = state.pos;
  if (state.linkLevel || !state.src.startsWith('[[', start) || state.src[start - 1] === '!') return false;
  const close = state.src.indexOf(']]', start + 2);
  if (close < 0 || close > state.posMax - 2 || close - start > 2048) return false;
  const target = state.src.slice(start + 2, close);
  if (!target.trim() || /[\r\n\[\]]/.test(target)) return false;
  if (!silent) {
    const token = state.push('zettel_link', '', 0); token.content = target;
    token.meta = { start, end: close + 2 }; token.attrSet('href', target);
  }
  state.pos = close + 2; return true;
});
md.inline.ruler.before('text', 'mrw_bare', (state, silent) => {
  if (state.linkLevel || !state.src.startsWith('mrw-outline:', state.pos)) return false;
  const match = /^mrw-outline:[^\s)<>]*/.exec(state.src.slice(state.pos, state.posMax));
  if (!silent) {
    const token = state.push('mrw_bare', '', 0); token.content = match[0]; token.attrSet('href', match[0]);
    token.meta = { start: state.pos, end: state.pos + match[0].length };
  }
  state.pos += match[0].length; return true;
});
md.inline.ruler.at('text', (state, silent) => {
  const end = state.posMax, next = state.src.indexOf('mrw-outline:', state.pos);
  if (!state.linkLevel && next > state.pos && next < end) state.posMax = next;
  const result = textRule(state, silent); state.posMax = end; return result;
});
// Record syntax positions while using the parser's own link/code rules.
for (const name of ['link', 'autolink']) {
  const rule = md.inline.ruler.__rules__.find(r => r.name === name).fn;
  md.inline.ruler.at(name, (state, silent) => {
    const start = state.pos, count = state.tokens.length;
    const found = rule(state, silent);
    if (found && !silent) {
      const token = state.tokens.slice(count).find(t => t.type === 'link_open');
      if (token) token.meta = { start, end: state.pos };
    }
    return found;
  });
}
const plain = tokens => tokens.map(t => t.type === 'softbreak' || t.type === 'hardbreak' ? ' ' :
  ['text', 'code_inline', 'image', 'mrw_bare', 'zettel_link'].includes(t.type) ? t.content : '').join('');

// Only leading, delimited front matter is excluded. An unterminated opening
// delimiter excludes the rest of the document and reports malformed=true;
// otherwise YAML text would masquerade as headings or navigable links.
// This is bounded scalar metadata extraction, not a YAML interpreter. Other
// fields stay untouched and are not claimed to have passed YAML validation.
function frontMatterInfo(text) {
  const info = { present: false, closed: false, malformed: false, start: 0, end: 0,
    lineEnd: 0, id: null, title: null, conflicts: [] };
  const rows = [...text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)].filter(m => m[0]);
  const lineText = row => row[0].replace(/[\r\n]+$/, '');
  if (!rows.length || !/^\uFEFF?---[ \t]*$/.test(lineText(rows[0]))) return info;
  info.present = true;
  const closing = rows.findIndex((row, i) => i > 0 && /^(?:---|\.\.\.)[ \t]*$/.test(lineText(row)));
  if (closing < 0) {
    info.end = text.length; info.lineEnd = rows.length; info.malformed = true;
    info.conflicts.push('The leading YAML front matter has no closing delimiter.'); return info;
  }
  info.closed = true; info.lineEnd = closing + 1;
  info.end = rows[closing].index + rows[closing][0].length;
  if (info.end > 64 * 1024) {
    info.malformed = true; info.conflicts.push('Front-matter metadata exceeds the 64 KiB limit.'); return info;
  }
  const seen = new Set();
  for (const row of rows.slice(1, closing)) {
    const match = /^(id|title)[ \t]*:[ \t]*(.*)$/.exec(lineText(row));
    if (!match) continue;
    const [, key, raw] = match;
    if (seen.has(key)) {
      info.malformed = true; info[key] = null;
      info.conflicts.push(`Front matter contains more than one ${key} field.`); continue;
    }
    seen.add(key);
    const value = scalar(raw);
    if (value == null || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
      info.malformed = true; info.conflicts.push(`Front-matter ${key} must be one bounded scalar string.`);
    } else info[key] = value;
  }
  return info;
}

function scalar(raw) {
  if (raw.length > 4096 || !raw.trim()) return null;
  if (raw.startsWith("'")) {
    const match = /^'((?:[^']|'')*)'[ \t]*(?:#.*)?$/.exec(raw);
    return match ? match[1].replace(/''/g, "'") : null;
  }
  if (raw.startsWith('"')) {
    const match = /^("(?:[^"\\]|\\.)*")[ \t]*(?:#.*)?$/.exec(raw);
    if (!match) return null;
    try { const value = JSON.parse(match[1]); return typeof value === 'string' ? value : null; } catch { return null; }
  }
  if (/^[#|>&*!\[\]{}]/.test(raw) || /:\s|[\t\r\n]/.test(raw)) return null;
  return raw.replace(/[ \t]+#.*$/, '').trim() || null;
}

function headingAnchor(label) {
  return label.trim().toLowerCase()
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-');
}

function parseReadingMarkdown(text) {
  if (Buffer.byteLength(text, 'utf8') > 4 * 1024 * 1024) throw new Error('Document exceeds the 4 MiB navigation limit.');
  const lines = text.split(/\r\n|\r|\n/), starts = [];
  let pos = 0;
  for (const line of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) { starts.push(pos); pos += line[0].length; }
  const frontMatter = frontMatterInfo(text);
  // Spaces preserve UTF-16 offsets while newlines preserve the parser's maps.
  // A BOM is likewise masked rather than removed before parsing.
  const parsedText = text.slice(0, frontMatter.end).replace(/[^\r\n]/g, ' ') + text.slice(frontMatter.end);
  const tokens = md.parse(parsedText.replace(/^\uFEFF/, ' '), {});
  const roots = [], stack = [], all = [], counts = new Map(), anchors = new Set();
  function lineAt(offset) {
    let low = 0, high = starts.length;
    while (low + 1 < high) { const mid = (low + high) >>> 1; if (starts[mid] <= offset) low = mid; else high = mid; }
    return low;
  }
  function add(node, parent) {
    const key = `${parent?.id || ''}/${node.kind}/${digest(node.label)}`;
    const occurrence = counts.get(key) || 0; counts.set(key, occurrence + 1);
    const identifier = qualifiedIdentifier(node.reference || node.target);
    if (identifier) node.qualified_id = identifier;
    node.id = `${key}/${occurrence}`; node.children = [];
    (parent?.children || roots).push(node); all.push(node);
    if (all.length > 10000) throw new Error('Document exceeds the 10,000 heading/link limit.');
  }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'inline' || !token.map) continue;
    const line = token.map[0];
    if (tokens[i - 1]?.type === 'heading_open') {
      const level = Number(tokens[i - 1].tag.slice(1));
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      const heading = { kind: 'heading', label: plain(token.children) || '(empty heading)', level,
        start: starts[line], end: starts[line] + lines[line].length, line };
      const base = headingAnchor(heading.label); let anchor = base, suffix = 0;
      while (anchors.has(anchor)) anchor = `${base}-${++suffix}`;
      heading.anchor = anchor; anchors.add(anchor);
      add(heading, stack.at(-1)); stack.push(heading);
    }
    const contentLines = token.content.split('\n'), mapping = [];
    let contentStart = 0;
    for (let j = 0; j < contentLines.length; j++) {
      const part = contentLines[j], original = lines[line + j] || '';
      const column = original.indexOf(part);
      mapping.push({ contentStart, length: part.length, absolute: column < 0 ? null : starts[line + j] + column });
      contentStart += part.length + 1;
    }
    function absolute(offset) {
      const entry = mapping.find(m => m.contentStart <= offset && offset <= m.contentStart + m.length);
      return entry?.absolute == null ? null : entry.absolute + offset - entry.contentStart;
    }
    for (let j = 0; j < token.children.length; j++) {
      const link = token.children[j], href = link.attrGet('href');
      if (!['link_open', 'mrw_bare', 'zettel_link'].includes(link.type) || href == null) continue;
      const endIndex = token.children.findIndex((t, n) => n > j && t.type === 'link_close');
      const start = absolute(link.meta.start), end = absolute(link.meta.end);
      if (start == null || end == null) throw new Error(`Cannot locate a Markdown link exactly at line ${line + 1}. Use an ordinary paragraph for this link.`);
      const label = ['mrw_bare', 'zettel_link'].includes(link.type) ? href : plain(token.children.slice(j + 1, endIndex)) || href;
      if (href.startsWith('mrw-outline:') && link.type !== 'zettel_link') {
        add({ kind: 'reference', label, reference: href, start, end, line: lineAt(start) }, stack.at(-1));
      } else {
        add({ kind: 'document_link', label, target: href, syntax: link.type === 'zettel_link' ? 'zettel' : 'markdown',
          start, end, line: lineAt(start) }, stack.at(-1));
      }
    }
  }
  return { roots, all, revision: digest(text), frontMatter };
}
module.exports = { parseReadingMarkdown, frontMatterInfo };
