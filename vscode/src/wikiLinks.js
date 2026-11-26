'use strict';
const { randomUUID } = require('node:crypto');
const { digest } = require('./navigation');
const { noteIdentity } = require('./noteIdentity');
const { documentColumn } = require('./documentPresentation');
const { parseReadingMarkdown, zettelLinkParts, frontMatterInfo } = require('./readingMarkdown');
const { registerDocumentMath } = require('./documentMath');
const { isNotebookResultLink } = require('./notebookResults');

// Discovery/rendering only uses the host's already-open text, never a folder
// scan. A click rechecks the exact occurrence and uses ordinary scoped navigation.
function registerWikiLinks({ vscode, context, register, documents, compile, noteActions = () => ({}), isBundledNote = () => false }) {
  const session = randomUUID(), cache = new WeakMap();
  const citations = require('./citations').registerCitations({vscode,context,documents});
  register('mrw.refreshCitations',async()=>{for(const doc of (vscode.workspace.textDocuments||[]).slice(0,16))await citations.update(doc);});
  const math = registerDocumentMath({ vscode, context, documents, compile, session });
  const scheme = vscode.env.uriScheme || 'vscode';
  function linksFor(doc) {
    if (!doc || doc.isClosed || doc.uri.scheme !== 'file') return [];
    const saved = cache.get(doc);
    if (saved?.version === doc.version) return saved.links;
    const parsed = parseReadingMarkdown(doc.getText());
    const links = parsed.all.filter(n => n.kind === 'document_link' && (n.syntax === 'zettel' || isNotebookResultLink(n.target, scheme)))
      .map(n => ({ ...n, revision: parsed.revision }));
    cache.set(doc, { version: doc.version, links }); return links;
  }
  const payload = (doc, node) => ({ session, uri: doc.uri.toString(), revision: node.revision,
    start: node.start, end: node.end, target: node.target });
  async function follow(value) {
    if (vscode.workspace.isTrusted === false) throw new Error('Open and trust the intended workspace before following a note link.');
    if (!value || value.session !== session || typeof value.uri !== 'string' || value.uri.length > 8192 ||
        !/^[a-f0-9]{64}$/.test(value.revision) || !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end) ||
        value.start < 0 || value.end <= value.start || typeof value.target !== 'string' || value.target.length > (isNotebookResultLink(value.target, scheme) ? 16384 : 2048)) {
      throw new Error('This note link is unavailable. Reopen its preview or follow its current editor occurrence.');
    }
    const uri = vscode.Uri.parse(value.uri);
    await documents.check(uri);
    const doc = await vscode.workspace.openTextDocument(uri);
    const node = linksFor(doc).find(n => n.revision === value.revision && n.start === value.start && n.end === value.end && n.target === value.target);
    if (!node) throw new Error('The note link changed. Follow its current occurrence again.');
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
            link.tooltip = node.syntax === 'zettel' ? `Follow ${zettelLinkParts(node.target).target} in GOLEM XIV’s notes folder` : 'Open the retained calculation and keep Return to this link';
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
      for (const block of state.tokens) for (const token of block.children || []) {
        if (frontMatter.present && block.map?.[0] < frontMatter.lineEnd) continue;
        if (token.type === 'mrw_wikilink') {
          const key = 'wiki:' + token.content, occurrence = counts.get(key) || 0;
          token.meta = { occurrence }; counts.set(key, occurrence + 1);
        } else if (token.type === 'link_open' && isNotebookResultLink(token.attrGet('href'), scheme)) {
          const key = 'result:' + token.attrGet('href'), occurrence = counts.get(key) || 0;
          token.meta = { ...token.meta, mrwResultOccurrence: occurrence }; counts.set(key, occurrence + 1);
        }
      }
    });
    md.core.ruler.push('mrw_note_heading', state => { state.tokens.unshift(new state.Token('mrw_note_heading', '', 0)); });
    md.renderer.rules.mrw_note_heading = (_tokens, _at, _options, env) => {
      const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === env.currentDocument?.toString());
      if (!doc || vscode.workspace.isTrusted === false) return '';
      const bundled = isBundledNote(doc.uri);
      if (!bundled && !documents.isNote(doc.uri)) return '';
      const identity = noteIdentity(doc), escape = md.utils.escapeHtml;
      const action = kind => {
        const target = { session, uri: doc.uri.toString(), action: kind };
        if (kind === 'annotate-bundled') target.revision = digest(doc.getText());
        return `${scheme}://flengyel.mrw/document-action?target=${Buffer.from(JSON.stringify(target), 'utf8').toString('base64url')}`;
      };
      const actions = noteActions(doc.uri);
      const links = [
        ['contents', 'Show Contents'],
        ...(bundled && !doc.isDirty ? [['annotate-bundled', 'Annotate saved copy…']] : []),
        ...(actions.obsidian ? [['obsidian', 'Open in Obsidian']] : []),
        ...(actions.link ? [['copy', 'Copy GOLEM XIV link']] : []),
      ].map(([kind, label]) => `<a href="${escape(action(kind))}">${label}</a>`).join(' · ');
      if (bundled) return `<aside class="mrw-note-heading" aria-label="Bundled note actions"><p>${links}</p></aside>
`;
      return `<aside class="mrw-note-heading" aria-label="Note identity"><strong title="${escape(identity.rawTitle)}">${escape(identity.title || identity.id)}</strong> · <code>${escape(identity.filename)}</code>${doc.isDirty ? ' · Unsaved VS Code changes' : ''}<p>${links}</p></aside>\n`;
    };
    md.renderer.rules.mrw_wikilink = (tokens, at, _options, env) => {
      const token = tokens[at], escape = md.utils.escapeHtml;
      const source = env.currentDocument?.toString();
      const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === source);
      let node;
      try { node = token.meta && linksFor(doc).filter(n => n.syntax === 'zettel' && n.target === token.content)[token.meta.occurrence]; } catch (_) { /* No guessed location. */ }
      if (!node || vscode.workspace.isTrusted === false) return escape(`[[${token.content}]]`);
      const target = Buffer.from(JSON.stringify(payload(doc, node)), 'utf8').toString('base64url');
      const href = `${scheme}://flengyel.mrw/document-link?target=${target}`;
      return `<a href="${escape(href)}" title="${escape('Follow ' + zettelLinkParts(node.target).target)}">${escape(zettelLinkParts(node.target).label)}</a>`;
    };
    const renderLink = md.renderer.rules.link_open || ((tokens, at, options, env, self) => self.renderToken(tokens, at, options));
    md.renderer.rules.link_open = (tokens, at, options, env, self) => {
      const token = tokens[at], href = token.attrGet('href');
      if (token.meta?.mrwResultOccurrence !== undefined && vscode.workspace.isTrusted !== false) {
        const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === env.currentDocument?.toString());
        const node = linksFor(doc).filter(n => n.syntax === 'markdown' && n.target === href)[token.meta.mrwResultOccurrence];
        if (node) {
          const target = Buffer.from(JSON.stringify(payload(doc, node)), 'utf8').toString('base64url');
          token.attrSet('href', scheme + '://flengyel.mrw/document-link?target=' + target);
        }
      }
      try { return renderLink(tokens, at, options, env, self); }
      finally { token.attrSet('href', href); }
    };
    return citations.extendMarkdownIt(math.extendMarkdownIt(md));
  }
  async function handleUri(uri) {
    if (await documents.handleUri(uri)) return true;
    const value = uri.toString(true);
    if (!['/document-link', '/document-action', '/document-diagram'].includes(uri.path)) return false;
    if (vscode.workspace.isTrusted === false) throw new Error('Open and trust the intended workspace before following a note action.');
    if (value.length > 40000) throw new Error('Invalid GOLEM XIV note link.');
    const parsed = new URL(value), pairs = [...parsed.searchParams];
    if (parsed.protocol !== `${scheme}:` || parsed.host !== 'flengyel.mrw' || parsed.hash ||
        pairs.length !== 1 || pairs[0][0] !== 'target' || !/^[\w-]+$/.test(pairs[0][1])) throw new Error('Invalid GOLEM XIV note link.');
    const data = JSON.parse(Buffer.from(pairs[0][1], 'base64url').toString('utf8'));
    if (uri.path === '/document-diagram') { await math.handle(data); return true; }
    if (uri.path === '/document-action') {
      if (data?.session !== session || typeof data.uri !== 'string' || data.uri.length > 8192 || !['obsidian', 'contents', 'copy', 'annotate-bundled'].includes(data.action)) throw new Error('This note action is unavailable. Reopen the preview.');
      const source = vscode.Uri.parse(data.uri);
      if (data.action === 'annotate-bundled') {
        if (!isBundledNote(source)) throw new Error('This action requires the bundled notes.');
        await vscode.commands.executeCommand('mrw.annotateBundledNote', source, data.revision);
        return true;
      }
      await documents.check(source);
      if (data.action === 'obsidian') await documents.openInObsidian(source);
      else if (data.action === 'copy') await documents.copyLink(source);
      else {
        const doc = await vscode.workspace.openTextDocument(source);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: documentColumn(vscode, doc) });
        await vscode.commands.executeCommand('mrw.openReadingOutline');
      }
    } else await follow(data);
    return true;
  }
  return { extendMarkdownIt, handleUri };
}
module.exports = { registerWikiLinks };
