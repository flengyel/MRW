'use strict';
// An annotation remains ordinary text. Only explicit TeX delimiters produce
// derived mathematics; HTML, URLs and other prose never enter an HTML parser.
(() => {
  function node(tag, parent, text, className) {
    const value = document.createElement(tag);
    if (text !== undefined) value.textContent = text;
    if (className) value.className = className;
    parent.append(value); return value;
  }
  function prose(parent, text, options = {}) {
    const display = node('div', parent, text, 'reader-note-text');
    if (!/\\[([]|\$\$/.test(text) && !(options.inlineDollars && /\$[^\n$]+\$/.test(text))) return false;
    let errors = 0;
    // Auto-render normally shares global definitions between expressions.
    // Clear its dedicated macro object before each expression, as for sources.
    const macros = {};
    try {
      window.renderMathInElement(display, {
        delimiters: [{ left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          ...(options.inlineDollars ? [{left:'$',right:'$',display:false}] : [])],
        output: 'mathml', trust: false, strict: 'error', throwOnError: true,
        maxExpand: 1000, maxSize: 20, macros, globalGroup: false,
        preProcess: math => { for (const key of Object.keys(macros)) delete macros[key]; return math; },
        errorCallback: () => { errors++; },
      });
    } catch {
      display.textContent = text; errors++;
    }
    if (errors) node('p', parent, 'Some mathematics could not be displayed; its exact annotation text is kept below.', 'warning');
    return true;
  }
  function render(parent, text, options = {}) {
    let exactText = false;
    for (const fragment of options.fragments || [{ kind: 'text', text }]) {
      if (fragment.kind === 'text') exactText = prose(parent, fragment.text, options) || exactText;
      else if (fragment.kind === 'code') { node('pre', parent, fragment.text); exactText = true; }
      else if (fragment.kind === 'tikz') {
        exactText = true;
        const figure = node('figure', parent, undefined, 'reader-diagram');
        if (fragment.image?.startsWith('data:image/svg+xml;base64,')) {
          const mode = ['paper', 'dark'].includes(options.appearance) ? options.appearance : 'theme';
          const hasDark = fragment.dark_image?.startsWith('data:image/svg+xml;base64,');
          const theme = mode === 'theme' && hasDark;
          figure.dataset.appearance = theme ? 'theme' : mode === 'dark' && hasDark ? 'dark' : 'paper';
          if (theme) figure.className += ' mrw-diagram-theme';
          const images = theme ? [[fragment.image, 'mrw-diagram-light'], [fragment.dark_image, 'mrw-diagram-dark']]
            : [[mode === 'dark' && hasDark ? fragment.dark_image : fragment.image, '']];
          for (const [source, className] of images) {
            const image = node('img', figure, undefined, className);
            image.src = source; image.alt = 'Retained rendering of this exact reader-supplied TikZ block';
          }
          node('figcaption', figure, `Rendered diagram · ${fragment.rendered_at}`, 'muted');
          const label = node('label', figure, 'Diagram appearance '), choice = node('select', label);
          choice.dataset.action = 'diagram-appearance';
          for (const [value, text] of [['theme', 'Theme'], ['paper', 'Paper'], ['dark', 'Dark']]) {
            const option = node('option', choice, text); option.value = value;
          }
          choice.value = mode;
          choice.addEventListener('change', () => options.onAppearance?.(choice.value));
        } else node('p', figure, 'TikZ diagram · not rendered yet', 'muted');
        if (fragment.error) node('p', figure, 'Retained diagram unavailable: ' + fragment.error, 'warning');
        const control = node('button', figure, fragment.image ? 'Render diagram again' : 'Render diagram');
        control.type = 'button'; control.dataset.action = 'render-diagram'; control.dataset.write = 'true';
        control.dataset.empty = String(!!fragment.error || !options.onRender);
        control.addEventListener('click', () => {
          node('p', figure, 'Rendering diagram…', 'muted'); options.onRender?.(fragment);
        });
        const code = node('details', figure); node('summary', code, 'Exact TikZ code'); node('pre', code, fragment.code);
      }
    }
    if (!exactText || options.exact === false) return;
    const exact = node('details', parent);
    node('summary', exact, 'Exact annotation text');
    node('pre', exact, text);
  }
  window.MRWAnnotations = { render };
})();
