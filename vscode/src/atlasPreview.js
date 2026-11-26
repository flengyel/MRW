(function (katex, markdownIt, normalizeNegatedRelations) {
'use strict';

const markdown = markdownIt({ html: false, linkify: false });
const MAX_DEPTH = 24;
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));
const wrappers = /^(?:theorem|thm|lemma|lem|proposition|prop|corollary|cor|claim|fact|definition|defn|example|remark|exercise|proof|slogan|abstract)\*?$/;
const emphasis = { emph: 'em', textit: 'em', textbf: 'strong', texttt: 'code' };
const accents = { '"': '\u0308', "'": '\u0301', '\x60': '\u0300', '^': '\u0302', '~': '\u0303',
  '=': '\u0304', '.': '\u0307', u: '\u0306', v: '\u030C', H: '\u030B', c: '\u0327', r: '\u030A' };
const displayEnvironments = { equation: '', align: 'aligned', gather: 'gathered' };
const openingMath = ['$$', '$', '\\(', '\\['];
const closingMath = { '$$': '$$', '$': '$', '\\(': '\\)', '\\[': '\\]' };

function unescapedIndex(text, marker, start) {
  for (let at = text.indexOf(marker, start); at !== -1; at = text.indexOf(marker, at + marker.length)) {
    let before = at;
    while (before > 0 && text[before - 1] === '\\') before--;
    if ((at - before) % 2 === 0) return at;
  }
  return -1;
}

function formula(body, exact, display, macros = {}) {
  let blocked = false;
  try {
    const cleaned = body.replace(/(?<!\\)\\(?:label\s*\{[^{}]*\}|nonumber\b|notag\b)/gu, '');
    const math = katex.renderToString(normalizeNegatedRelations(cleaned), { output: 'mathml', displayMode: display,
      trust: () => { blocked = true; return false; },
      strict: 'error', throwOnError: true, maxExpand: 1000,
      maxSize: 20, macros: { ...macros }, globalGroup: false });
    if (!blocked) return display ? '<span class="atlas-math-display">' + math + '</span>' : math;
  } catch {
    // Keep the exact formula if KaTeX cannot render it.
  }
  return '<code class="atlas-raw-math" title="Formula display unavailable">' + escape(exact) + '</code>';
}

function mathSpan(text, start) {
  const opener = openingMath.find(marker => text.startsWith(marker, start));
  if (!opener) return;
  const bodyStart = start + opener.length, close = closingMath[opener];
  const end = unescapedIndex(text, close, bodyStart);
  if (end < 0 || end === bodyStart) return;
  return { body: text.slice(bodyStart, end), end: end + close.length, display: opener !== '$' && opener !== '\\(' };
}

// The preview never emits Markdown links or images. The atlas reference
// controls continue to navigate from the exact retained occurrences.
markdown.disable(['image']);
markdown.renderer.rules.link_open = () => '';
markdown.renderer.rules.link_close = () => '';
markdown.inline.ruler.before('escape', 'atlas_math', (state, silent) => {
  const span = mathSpan(state.src, state.pos);
  if (!span || span.end > state.posMax) return false;
  if (state.src[state.pos] === '$' && state.src[state.pos + 1] !== '$' &&
      (/^\s|\s$/u.test(span.body) || /[0-9]/u.test(state.src[span.end] || ''))) return false;
  if (!silent) {
    const token = state.push('atlas_math', '', 0);
    token.meta = span;
    token.content = state.src.slice(state.pos, span.end);
  }
  state.pos = span.end;
  return true;
});
markdown.renderer.rules.atlas_math = (tokens, index) => {
  const { meta, content } = tokens[index];
  return formula(meta.body, content, meta.display);
};

function braced(text, start) {
  let at = start;
  while (/\s/u.test(text[at] || '')) at++;
  if (text[at] !== '{') throw new Error('Expected a braced argument.');
  const body = at + 1;
  let depth = 1;
  for (at = body; at < text.length; at++) {
    if (text[at] === '\\') { at++; continue; }
    if (text[at] === '{') depth++;
    if (text[at] === '}' && --depth === 0) return { body: text.slice(body, at), end: at + 1 };
  }
  throw new Error('Unclosed braced argument.');
}

function optional(text, start) {
  const match = /^\s*\[((?:[^\]\\]|\\.)*)\]/u.exec(text.slice(start));
  return match && { body: match[1], end: start + match[0].length };
}

function textAccent(text, start, combining) {
  const base = /^\s*(\{([\p{L}])\}|([\p{L}]))/u.exec(text.slice(start));
  if (!base) throw new Error('Unsupported TeX accent.');
  return { value: ((base[2] || base[3]) + combining).normalize('NFC'), end: start + base[0].length };
}

function renderedReference(label, name, context) {
  const target = context.references?.get(label);
  if (!target?.number) return '<span class="atlas-inline-reference">[' + escape(label) + ']</span>';
  const value = name === 'eqref' ? '(' + target.number + ')' : target.number;
  if (target.kind !== 'equation') return '<span class="atlas-inline-reference">' + escape(value) + '</span>';
  const entry = escape(target.entry);
  return '<a class="atlas-inline-reference" href="#entry-' + entry + '" data-type="openSource" data-entry="' +
    entry + '" data-part="statement">' + escape(value) + '</a>';
}

function texPreviewContext(text) {
  const macros = {}, environments = new Set();
  const preamble = text.slice(0, 65536).split(/\\begin\s*\{document\}/u, 1)[0]
    .replace(/(?<!\\)%[^\r\n]*/gu, '');
  for (const match of preamble.matchAll(/(?<!\\)\\(newcommand|newtheorem)\*?(?![a-zA-Z])/gu)) {
    if (Object.keys(macros).length + environments.size >= 64) break;
    try {
      const name = braced(preamble, match.index + match[0].length);
      if (match[1] === 'newtheorem') {
        if (/^[a-zA-Z][a-zA-Z0-9*]{0,48}$/u.test(name.body)) environments.add(name.body.replace(/\*$/u, ''));
      } else if (/^\\[a-zA-Z]{1,40}$/u.test(name.body)) {
        const arity = optional(preamble, name.end);
        if (arity && !/^[0-4]$/u.test(arity.body)) continue;
        const definition = braced(preamble, arity?.end ?? name.end);
        if (definition.body.length <= 1024) macros[name.body] = definition.body;
      }
    } catch {
      // Only complete literal declarations can affect the preview.
    }
  }
  return { macros, environments };
}

function renderTex(text, inlineOnly = false, depth = 0, context = {}) {
  if (depth >= MAX_DEPTH) throw new Error('TeX display nesting exceeds the preview limit.');
  let at = 0;
  function read(end = '', inList = false, level = depth) {
    if (level >= MAX_DEPTH) throw new Error('TeX display nesting exceeds the preview limit.');
    const blocks = [], inline = [];
    const paragraph = () => {
      const value = inline.splice(0).join('').trim();
      if (value) blocks.push(inlineOnly ? value : '<p>' + value + '</p>');
    };
    while (at < text.length) {
      const tail = text.slice(at);
      if (end && tail.startsWith(end)) { paragraph(); at += end.length; return { html: blocks.join(''), ended: true }; }
      if (inList && /^\\item\b/u.test(tail)) { paragraph(); return { html: blocks.join(''), ended: false }; }
      const next = mathSpan(text, at);
      if (next) { inline.push(formula(next.body, text.slice(at, next.end), next.display, context.macros)); at = next.end; continue; }
      const char = text[at];
      if (openingMath.some(marker => tail.startsWith(marker))) throw new Error('Unclosed mathematical delimiter.');
      if (char === '%') { at += /^[^\r\n]*(?:\r\n|\r|\n)?/u.exec(tail)[0].length; continue; }
      const blank = /^(?:\r\n|\r|\n)(?:[ \t]*(?:\r\n|\r|\n))+/u.exec(tail);
      if (blank) { paragraph(); at += blank[0].length; continue; }
      if (char === '\\') {
        const command = /^\\([a-zA-Z]+|.)/su.exec(tail);
        if (!command) throw new Error('Trailing backslash.');
        at += command[0].length;
        const name = command[1];
        if (name === 'begin' && !inlineOnly) {
          const environment = braced(text, at);
          at = environment.end;
          const env = environment.body, close = '\\end{' + env + '}';
          const title = /^[ \t]*\[([^\r\n\]]*)\]/u.exec(text.slice(at));
          if (title) at += title[0].length;
          const base = env.replace(/\*$/u, '');
          paragraph();
          if (env === 'enumerate' || env === 'itemize') {
            if (title) throw new Error('List options require an exact TeX view.');
            const tag = env === 'enumerate' ? 'ol' : 'ul';
            blocks.push('<' + tag + '>');
            const item = /\s*\\item\b(?!\s*\[)/uy;
            item.lastIndex = at;
            while (item.test(text)) {
              at = item.lastIndex;
              const child = read(close, true, level + 1);
              blocks.push('<li>' + child.html + '</li>');
              item.lastIndex = at;
              if (child.ended) break;
            }
            if (blocks.at(-1) === '<' + tag + '>' || !text.slice(0, at).endsWith(close)) {
              throw new Error('Malformed or empty TeX list.');
            }
            blocks.push('</' + tag + '>');
          } else if (wrappers.test(env) || context.environments?.has(base)) {
            if (title) blocks.push('<p><strong>' + renderTex(title[1], true, level + 1, context) + '</strong></p>');
            blocks.push(read(close, false, level + 1).html);
          } else if (Object.hasOwn(displayEnvironments, base)) {
            const stop = unescapedIndex(text, close, at);
            if (stop < 0) throw new Error('Unclosed display environment.');
            const body = text.slice(at, stop), aligned = displayEnvironments[base];
            at = stop + close.length;
            blocks.push(formula(aligned ? '\\begin{' + aligned + '}' + body + '\\end{' + aligned + '}' : body,
              command[0] + '{' + env + '}' + body + close, true, context.macros));
          } else throw new Error('Unsupported display environment ' + env + '.');
        } else if (/^(?:cite|citep|citet|parencite|textcite)$/u.test(name)) {
          const first = optional(text, at), second = first && optional(text, first.end);
          const argument = braced(text, second?.end ?? first?.end ?? at);
          const keys = argument.body.split(',').map(key => escape(key.trim())).join(', ');
          const locator = second?.body ?? first?.body;
          const prefix = second ? renderTex(first.body, true, level + 1, context) + ' ' : '';
          inline.push('<span class="atlas-inline-reference">[' + prefix + keys +
            (locator ? ', ' + renderTex(locator.replace(/~/gu, ' '), true, level + 1, context) : '') + ']</span>');
          at = argument.end;
        } else if (['label', 'ref', 'eqref', 'autoref', 'cref', ...Object.keys(emphasis)].includes(name.toLowerCase())) {
          const argument = braced(text, at);
          at = argument.end;
          if (Object.hasOwn(emphasis, name)) {
            const tag = emphasis[name];
            inline.push('<' + tag + '>' + renderTex(argument.body, true, level + 1, context) + '</' + tag + '>');
          } else if (name !== 'label') {
            inline.push(argument.body.split(',').map(label => renderedReference(label.trim(), name.toLowerCase(), context)).join(', '));
          }
        } else if (Object.hasOwn(accents, name)) {
          const accent = textAccent(text, at, accents[name]);
          inline.push(escape(accent.value));
          at = accent.end;
        } else if (['noindent', 'maketitle'].includes(name)) continue;
        else if (name === 'S') inline.push('§');
        else if (['par', 'smallskip', 'medskip', 'bigskip', '\\'].includes(name)) paragraph();
        else if (['%', '&', '_', '#', '$', '{', '}'].includes(name)) inline.push(escape(name));
        else if ([' ', ',', ';'].includes(name)) inline.push(' ');
        else throw new Error('Unsupported prose command \\' + name + '.');
        continue;
      }
      if (char === '{') {
        const argument = braced(text, at);
        const style = /^\s*\\(it|bf|tt)\b\s*/u.exec(argument.body);
        const value = renderTex(style ? argument.body.slice(style[0].length) : argument.body, true, level + 1, context);
        const tag = { it: 'em', bf: 'strong', tt: 'code' }[style?.[1]];
        inline.push(tag ? '<' + tag + '>' + value + '</' + tag + '>' : value);
        at = argument.end;
        continue;
      }
      if (char === '}') throw new Error('Unmatched braced argument.');
      inline.push(char === '~' ? '\u00a0' : escape(char));
      at++;
    }
    if (end) throw new Error('Unclosed TeX environment.');
    paragraph();
    return { html: blocks.join('') };
  }
  return read().html;
}

function preview(fragment, language, limit, context) {
  const clipped = fragment.length > limit;
  const shown = fragment.slice(0, limit);
  const remainder = clipped ? '<p class="muted">Open the exact source to read the remainder.</p>' : '';
  try {
    if (language === 'latex' || language === 'tex') {
      if (clipped) return '<pre>' + escape(shown) + '</pre>' + remainder;
      return '<div class="atlas-reading">' + renderTex(shown, false, 0, context) + '</div>';
    }
    if (language === 'markdown') return '<div class="atlas-reading">' + markdown.render(shown) + '</div>' + remainder;
  } catch (error) {
    return '<p class="muted">Preview unavailable. ' + escape(error.message) + '</p><pre>' + escape(shown) + '</pre>' + remainder;
  }
  return '<pre>' + escape(shown) + '</pre>' + remainder;
}

function excerpt(fragment, language, limit, context) {
  const tex = language === 'latex' || language === 'tex';
  let text = fragment.trim();
  if (tex) {
    const opening = /^\\begin\{([^{}]+)\}(?:\[[^\]\r\n]*\])?\s*/u.exec(text);
    if (opening && (wrappers.test(opening[1]) || context?.environments?.has(opening[1]))) text = text.slice(opening[0].length);
    const closing = /\s*\\end\{([^{}]+)\}$/u.exec(text);
    if (closing && (wrappers.test(closing[1]) || context?.environments?.has(closing[1]))) text = text.slice(0, closing.index);
  }
  // Try complete words near the budget. A prefix ending in math or a braced
  // command is invalid TeX and is retried at the previous boundary.
  const boundaries = [...text.slice(0, limit + 1).matchAll(/\s+/gu)].map(match => match.index);
  if (text.length <= limit) boundaries.push(text.length);
  for (const end of boundaries.slice(-32).reverse()) {
    if (!end) continue;
    const shown = text.slice(0, end);
    try {
      let rendered = tex ? renderTex(shown, false, 0, context)
        : language === 'markdown' ? markdown.render(shown) : '<p>' + escape(shown) + '</p>';
      if (!rendered) continue;
      const clipped = end < text.length ? '<span class="atlas-ellipsis" aria-label="Excerpt continues">…</span>' : '';
      if (clipped && rendered.endsWith('</p>')) rendered = rendered.slice(0, -4) + clipped + '</p>';
      else rendered += clipped;
      return '<div class="atlas-reading atlas-excerpt">' + rendered + '</div>';
    } catch {
      // The retained occurrence is still available through its source action.
    }
  }
  return '';
}

const api = { escape, excerpt, preview, texPreviewContext };
if (typeof module === 'object' && module?.exports) module.exports = api;
else window.GolemXIVPassagePreview = api;
})(typeof module === 'object' && module?.exports ? require('../media/katex/katex.min.js') : window.katex,
   typeof module === 'object' && module?.exports ? require('../media/markdown-it/markdown-it.js') : window.markdownit,
   typeof module === 'object' && module?.exports ? require('./mathNegation') : window.GolemXIVNormalizeNegatedRelations);
