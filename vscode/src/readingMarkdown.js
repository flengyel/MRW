'use strict';
// Parse Markdown as data. No renderer, plugins, URI handlers or source reads.
const MarkdownIt = require('../media/markdown-it/markdown-it');
const { digest } = require('./navigation');
const md = new MarkdownIt('commonmark');
const textRule = md.inline.ruler.__rules__.find(r => r.name === 'text').fn;
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
  ['text', 'code_inline', 'image', 'mrw_bare'].includes(t.type) ? t.content : '').join('');

function parseReadingMarkdown(text) {
  if (Buffer.byteLength(text, 'utf8') > 4 * 1024 * 1024) throw new Error('Reading overview exceeds the 4 MiB navigation limit.');
  const lines = text.split(/\r\n|\r|\n/), starts = [];
  let pos = 0;
  for (const line of text.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) { starts.push(pos); pos += line[0].length; }
  const tokens = md.parse(text, {}), roots = [], stack = [], all = [], counts = new Map();
  function lineAt(offset) {
    let low = 0, high = starts.length;
    while (low + 1 < high) { const mid = (low + high) >>> 1; if (starts[mid] <= offset) low = mid; else high = mid; }
    return low;
  }
  function add(node, parent) {
    const key = `${parent?.id || ''}/${node.kind}/${digest(node.label)}`;
    const occurrence = counts.get(key) || 0; counts.set(key, occurrence + 1);
    node.id = `${key}/${occurrence}`; node.children = [];
    (parent?.children || roots).push(node); all.push(node);
    if (all.length > 10000) throw new Error('Reading overview exceeds the 10,000 heading/reference limit.');
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
      if (!['link_open', 'mrw_bare'].includes(link.type) || !href?.startsWith('mrw-outline:')) continue;
      const endIndex = token.children.findIndex((t, n) => n > j && t.type === 'link_close');
      const start = absolute(link.meta.start), end = absolute(link.meta.end);
      if (start == null || end == null) throw new Error(`Cannot locate a Markdown reference exactly at line ${line + 1}. Use an ordinary paragraph for this reference.`);
      add({ kind: 'reference', label: link.type === 'mrw_bare' ? href : plain(token.children.slice(j + 1, endIndex)) || 'Retained source',
        reference: href, start, end, line: lineAt(start) }, stack.at(-1));
    }
  }
  return { roots, all, revision: digest(text) };
}
module.exports = { parseReadingMarkdown };
