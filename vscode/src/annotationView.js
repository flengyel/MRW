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
  function render(parent, text) {
    const display = node('div', parent, text, 'reader-note-text');
    if (!/\\[([]|\$\$/.test(text)) return;
    let errors = 0;
    // Auto-render normally shares global definitions between expressions.
    // Clear its dedicated macro object before each expression, as for sources.
    const macros = {};
    try {
      window.renderMathInElement(display, {
        delimiters: [{ left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }],
        output: 'mathml', trust: false, strict: 'error', throwOnError: true,
        maxExpand: 1000, maxSize: 20, macros, globalGroup: false,
        preProcess: math => { for (const key of Object.keys(macros)) delete macros[key]; return math; },
        errorCallback: () => { errors++; },
      });
    } catch {
      display.textContent = text; errors++;
    }
    if (errors) node('p', parent, 'Some mathematics could not be displayed; its exact annotation text is kept below.', 'warning');
    const exact = node('details', parent);
    node('summary', exact, 'Exact annotation text');
    node('pre', exact, text);
  }
  window.MRWAnnotations = { render };
})();
