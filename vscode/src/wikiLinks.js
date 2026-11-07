'use strict';
const { randomUUID } = require('node:crypto');
const { parseReadingMarkdown, zettelLinkParts, frontMatterInfo } = require('./readingMarkdown');

// Discovery/rendering only uses the host's already-open text, never a folder
// scan. A click rechecks the exact occurrence and uses ordinary scoped navigation.
function registerWikiLinks({ vscode, context, register, documents }) {
  const session = randomUUID(), cache = new WeakMap();
  const scheme = vscode.env.uriScheme || 'vscode';
  function linksFor(doc) {
    if (!doc || doc.isClosed || doc.uri.scheme !== 'file') return [];
    const saved = cache.get(doc);
    if (saved?.version === doc.version) return saved.links;
    const parsed = parseReadingMarkdown(doc.getText());
    const links = parsed.all.filter(n => n.kind === 'document_link' && n.syntax === 'zettel')
      .map(n => ({ ...n, revision: parsed.revision }));
    cache.set(doc, { version: doc.version, links }); return links;
  }
  const payload = (doc, node) => ({ session, uri: doc.uri.toString(), revision: node.revision,
    start: node.start, end: node.end, target: node.target });
  async function follow(value) {
    if (vscode.workspace.isTrusted === false) throw new Error('Open and trust the intended workspace before following a WikiLink.');
    if (!value || value.session !== session || typeof value.uri !== 'string' || value.uri.length > 8192 ||
        !/^[a-f0-9]{64}$/.test(value.revision) || !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end) ||
        value.start < 0 || value.end <= value.start || typeof value.target !== 'string' || value.target.length > 2048) {
      throw new Error('This WikiLink is unavailable. Reopen its preview or follow its current editor occurrence.');
    }
    const uri = vscode.Uri.parse(value.uri);
    await documents.check(uri);
    const doc = await vscode.workspace.openTextDocument(uri);
    const node = linksFor(doc).find(n => n.revision === value.revision && n.start === value.start && n.end === value.end && n.target === value.target);
    if (!node) throw new Error('The WikiLink changed. Follow its current occurrence again.');
    return documents.follow(doc, node);
  }
  register('mrw.followWikiLink', follow);
  if (vscode.languages?.registerDocumentLinkProvider) {
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider({ language: 'markdown', scheme: 'file' }, {
      provideDocumentLinks(doc, token) {
        if (token?.isCancellationRequested || vscode.workspace.isTrusted === false) return [];
        try {
          return linksFor(doc).map(node => {
            const range = new vscode.Range(doc.positionAt(node.start), doc.positionAt(node.end));
            const target = vscode.Uri.parse('command:mrw.followWikiLink?' + encodeURIComponent(JSON.stringify([payload(doc, node)])));
            const link = new vscode.DocumentLink(range, target);
            link.tooltip = `Follow ${zettelLinkParts(node.target).target} in MRW’s notes folder`;
            return link;
          });
        } catch (_) { return []; } // Bounded-parser failures remain available via Show Contents.
      },
    }));
  }
  function extendMarkdownIt(md) {
    if (md.inline.ruler.__rules__.some(rule => rule.name === 'mrw_wikilink')) return md;
    md.inline.ruler.before('link', 'mrw_wikilink', (state, silent) => {
      const start = state.pos;
      if (state.linkLevel || !state.src.startsWith('[[', start) || state.src[start - 1] === '!') return false;
      const close = state.src.indexOf(']]', start + 2);
      if (close < 0 || close > state.posMax - 2 || close - start > 2048) return false;
      const target = state.src.slice(start + 2, close);
      if (!target.trim() || /[\r\n\[\]]/.test(target)) return false;
      if (!silent) { const token = state.push('mrw_wikilink', '', 0); token.content = target; }
      state.pos = close + 2; return true;
    });
    md.core.ruler.after('inline', 'mrw_wikilink_occurrences', state => {
      const counts = new Map(), frontMatter = frontMatterInfo(state.src);
      for (const block of state.tokens) for (const token of block.children || []) if (token.type === 'mrw_wikilink' && (!frontMatter.present || block.map?.[0] >= frontMatter.lineEnd)) {
        const occurrence = counts.get(token.content) || 0;
        token.meta = { occurrence }; counts.set(token.content, occurrence + 1);
      }
    });
    md.renderer.rules.mrw_wikilink = (tokens, at, _options, env) => {
      const token = tokens[at], escape = md.utils.escapeHtml;
      const source = env.currentDocument?.toString();
      const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === source);
      let node;
      try { node = token.meta && linksFor(doc).filter(n => n.target === token.content)[token.meta.occurrence]; } catch (_) { /* No guessed location. */ }
      if (!node || vscode.workspace.isTrusted === false) return escape(`[[${token.content}]]`);
      const target = Buffer.from(JSON.stringify(payload(doc, node)), 'utf8').toString('base64url');
      const href = `${scheme}://flengyel.mrw/document-link?target=${target}`;
      return `<a href="${escape(href)}" title="${escape('Follow ' + zettelLinkParts(node.target).target)}">${escape(zettelLinkParts(node.target).label)}</a>`;
    };
    return md;
  }
  async function handleUri(uri) {
    const value = uri.toString(true);
    if (uri.path !== '/document-link') return false;
    if (value.length > 20000) throw new Error('Invalid MRW WikiLink.');
    const parsed = new URL(value), pairs = [...parsed.searchParams];
    if (parsed.protocol !== `${scheme}:` || parsed.host !== 'flengyel.mrw' || parsed.hash ||
        pairs.length !== 1 || pairs[0][0] !== 'target' || !/^[\w-]+$/.test(pairs[0][1])) throw new Error('Invalid MRW WikiLink.');
    const data = JSON.parse(Buffer.from(pairs[0][1], 'base64url').toString('utf8'));
    await follow(data); return true;
  }
  return { extendMarkdownIt, handleUri };
}
module.exports = { registerWikiLinks };
