'use strict';
// Preview rendering never runs TeX. Only an explicit, current occurrence may
// invoke the existing isolated compiler; derived views do not modify the note.
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest } = require('./navigation');
const { frontMatterInfo } = require('./readingMarkdown');
const MAX_CODE = 16384;

function noteMacros(text) {
  const front = frontMatterInfo(text);
  if (!front.closed || front.malformed) return '';
  const source = text.slice(0, front.end), definitions = [];
  const pattern = /\\(?:newcommand|renewcommand|providecommand)\*?\s*\{\\[A-Za-z]+\}\s*(?:\[[0-9]\]\s*)?\{/g;
  let match;
  while ((match = pattern.exec(source)) && definitions.length < 128) {
    let depth = 1, end = pattern.lastIndex;
    while (end < source.length && depth) {
      const ch = source[end++];
      if (ch === '\\') { end++; continue; }
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth || end - match.index > MAX_CODE) break;
    definitions.push(source.slice(match.index, end)); pattern.lastIndex = end;
  }
  const result = definitions.join('\n');
  return result.length <= MAX_CODE ? result : '';
}

function registerDocumentMath({ vscode, context, documents, compile, session }) {
  const renders = new Map(), loaded = new Set(), loading = new Set();
  const macroCache = new WeakMap();
  function definitionsFor(env) {
    const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === env.currentDocument?.toString());
    if (!doc) return env.mrwNoteMacros || '';
    const cached = macroCache.get(doc);
    if (doc.version !== undefined && cached?.version === doc.version) return cached.text;
    const text = noteMacros(doc.getText()); macroCache.set(doc, { version: doc.version, text }); return text;
  }
  const cacheRoot = context.storageUri?.fsPath || context.globalStorageUri?.fsPath;
  const cachePath = key => cacheRoot && path.join(cacheRoot, 'document-diagrams-v1', key + '.json');
  const keyFor = code => digest('mrw-document-diagram-v1\n' + code);
  const scheme = vscode.env.uriScheme || 'vscode';
  function validView(value, key) {
    return value?.key === key && ['light', 'dark'].every(k => typeof value[k] === 'string' &&
      value[k].length < 12 * 1024 * 1024 && /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/.test(value[k]));
  }
  async function load(key) {
    if (loaded.has(key) || loading.has(key) || !cachePath(key)) return;
    loading.add(key);
    try {
      const file = cachePath(key);
      if ((await fs.stat(file)).size > 24 * 1024 * 1024) return;
      const view = JSON.parse(await fs.readFile(file, 'utf8'));
      if (validView(view, key)) {
        renders.set(key, view);
        await vscode.commands.executeCommand('markdown.preview.refresh');
      }
    } catch (_) { /* An absent/invalid derived view leaves exact source available. */ }
    finally { loading.delete(key); loaded.add(key); }
  }
  function extendMarkdownIt(md) {
    if (md.core.ruler.__rules__.some(rule => rule.name === 'mrw_document_math')) return md;
    // Install wrappers at render time, after all host math plugins initialize.
    md.core.ruler.push('mrw_document_math', state => {
      // The native front-matter plugin masks YAML before later core rules run.
      // Read only the already-open document; never reopen/scan during rendering.
      const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === state.env.currentDocument?.toString());
      state.env.mrwNoteMacros = noteMacros(doc?.getText() ?? state.src);
      for (const name of ['math_inline', 'math_block', 'math_inline_block', 'math_inline_bare_block']) {
        const original = md.renderer.rules[name];
        if (!original || original.mrwNoteMacros) continue;
        const wrapped = (tokens, at, options, env, self) => {
          const token = tokens[at], content = token.content;
          // VS Code supplies currentDocument when rendering, after parsing.
          const definitions = definitionsFor(env);
          if (definitions) token.content = '\\begingroup\n' + definitions + '\n' + content + '\\endgroup';
          try { return original(tokens, at, options, env, self); }
          finally { token.content = content; }
        };
        wrapped.mrwNoteMacros = true; md.renderer.rules[name] = wrapped;
      }
      const original = md.renderer.rules.fence;
      if (original?.mrwDocumentDiagram) return;
      const renderFence = (tokens, at, options, env, self) => {
        const token = tokens[at];
        if (token.info.trim().toLowerCase() !== 'tikz') return original(tokens, at, options, env, self);
        const source = original(tokens, at, options, env, self), code = token.content;
        const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === env.currentDocument?.toString());
        if (!doc || doc.uri.scheme !== 'file' || !/\.(md|markdown)$/i.test(doc.uri.fsPath || '') || vscode.workspace.isTrusted === false || Buffer.byteLength(code) > MAX_CODE) return source;
        const key = keyFor(code); void load(key);
        const payload = { session, uri: doc.uri.toString(), revision: digest(doc.getText()), key, line: token.map[0] };
        const href = `${scheme}://flengyel.mrw/document-diagram?target=${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
        const escape = md.utils.escapeHtml, view = renders.get(key);
        return `<figure class="mrw-diagram-theme">${view ? `<img class="mrw-diagram-light" src="${view.light}" alt="TikZ diagram"><img class="mrw-diagram-dark" src="${view.dark}" alt="TikZ diagram">` : ''}<figcaption><a href="${escape(href)}">${view ? 'Render diagram again' : 'Render diagram'}</a></figcaption><details${view ? '' : ' open'}><summary>TikZ source</summary>${source}</details></figure>\n`;
      };
      renderFence.mrwDocumentDiagram = true; md.renderer.rules.fence = renderFence;
    });
    return md;
  }
  async function handle(data) {
    if (data?.session !== session || typeof data.uri !== 'string' || data.uri.length > 8192 ||
      !/^[a-f0-9]{64}$/.test(data.revision) || !/^[a-f0-9]{64}$/.test(data.key) || !Number.isSafeInteger(data.line)) throw Error('This diagram action is unavailable. Reopen its preview.');
    const uri = vscode.Uri.parse(data.uri); await documents.check(uri);
    const doc = await vscode.workspace.openTextDocument(uri), text = doc.getText();
    if (uri.scheme !== 'file' || !/\.(md|markdown)$/i.test(uri.fsPath || '') || digest(text) !== data.revision) throw Error('The note changed. Render its current diagram from the refreshed preview.');
    const MarkdownIt = require('../media/markdown-it/markdown-it');
    const token = new MarkdownIt('commonmark').parse(text, {}).find(t => t.type === 'fence' && t.info.trim().toLowerCase() === 'tikz' && t.map[0] === data.line && keyFor(t.content) === data.key);
    if (!token || Buffer.byteLength(token.content) > MAX_CODE) throw Error('The exact TikZ block is unavailable.');
    if (!compile) throw Error('The document diagram compiler is unavailable.');
    const view = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Rendering TikZ diagram' },
      () => compile({ method: 'document_render_diagram', code: token.content }, { timeout: 30000 }));
    const saved = { key: data.key, light: view.light, dark: view.dark };
    if (!validView(saved, data.key)) throw Error('The diagram service returned an invalid view.');
    if (cachePath(data.key)) {
      const file = cachePath(data.key), temporary = file + '.' + require('node:crypto').randomUUID();
      await fs.mkdir(path.dirname(file), { recursive: true });
      try { await fs.writeFile(temporary, JSON.stringify(saved), { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, file); }
      finally { await fs.rm(temporary, { force: true }); }
    }
    renders.set(data.key, saved); loaded.add(data.key);
    await vscode.commands.executeCommand('markdown.preview.refresh');
  }
  return { extendMarkdownIt, handle };
}
module.exports = { noteMacros, registerDocumentMath };
