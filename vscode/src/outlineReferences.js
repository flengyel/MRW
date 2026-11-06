'use strict';

// Locate data at the caret, never commands or arbitrary document URIs.
function referenceAt(text, offset) {
  if (Buffer.byteLength(text, 'utf8') > 65536) throw new Error('Reference line exceeds the 64 KiB navigation limit.');
  const links = /\[(?:\\.|[^\\\]])*\]\((mrw-outline:[^\s)]*)\)/g;
  for (const match of text.matchAll(links)) {
    if (match.index <= offset && offset <= match.index + match[0].length) return match[1];
  }
  for (const match of text.matchAll(/mrw-outline:[^\s)<>]*/g)) {
    if (match.index <= offset && offset <= match.index + match[0].length) return match[0];
  }
  throw new Error('Place the cursor in an MRW source or passage link in the Markdown editor.');
}

module.exports = { referenceAt };
