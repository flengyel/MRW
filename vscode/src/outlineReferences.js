'use strict';

// Locate data at the caret, never commands or arbitrary document URIs.
function referenceAt(text, offset) {
  if (Buffer.byteLength(text, 'utf8') > 65536) throw new Error('Reference line exceeds the 64 KiB navigation limit.');
  const links = /\[(?:\\.|[^\\\]])*\]\((mrw-outline:[^\s)]*)\)/g;
  for (const match of text.matchAll(links)) {
    const end = match.index + match[0].length;
    if (match.index <= offset && offset <= end) return { reference: match[1], start: match.index, end };
  }
  for (const match of text.matchAll(/mrw-outline:[^\s)<>]*/g)) {
    const end = match.index + match[0].length;
    if (match.index <= offset && offset <= end) return { reference: match[0], start: match.index, end };
  }
  throw new Error('Place the cursor in a GOLEM XIV source or passage link in the Markdown editor.');
}

module.exports = { referenceAt };
