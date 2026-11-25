'use strict';
// Bounded lexical source extraction. This module reads no files, expands no
// macros and makes no assertion that a reference is a mathematical inference.
const MarkdownIt = require('../media/markdown-it/markdown-it');
const { digest } = require('./navigation');
const { parseReadingMarkdown, frontMatterInfo, headingAnchor, wikiTarget } = require('./readingMarkdown');
const MAX_BYTES = 4 * 1024 * 1024, MAX_ENTRIES = 4096, MAX_REFERENCES = 8192;
const KINDS = new Map(Object.entries({ theorem: 'theorem', thm: 'theorem', lemma: 'lemma', lem: 'lemma',
  proposition: 'proposition', prop: 'proposition', corollary: 'corollary', cor: 'corollary',
  definition: 'definition', defn: 'definition', example: 'example', ex: 'example', remark: 'remark', rem: 'remark',
  assumption: 'assumption', axiom: 'axiom', conjecture: 'conjecture', claim: 'claim', fact: 'fact',
  notation: 'notation', exercise: 'exercise', problem: 'problem', statement: 'statement', proof: 'proof' }));
const SECTIONS = ['part', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
const NUMBERED_DISPLAYS = /^(?:equation|align|alignat|gather|multline)$/u;
const printedNumber = value => typeof value === 'string' && value.length <= 64 && /^[A-Za-z0-9]+(?:[.:-][A-Za-z0-9]+)*$/.test(value);
const compact = value => value.replace(/\s+/gu, ' ').trim();
const title = value => Array.from(compact(value)).slice(0, 240).join('');
const mask = value => value.replace(/[^\r\n]/g, ' ');
const escaped = (text, at) => { let n = 0; while (at > 0 && text[--at] === '\\') n++; return n % 2 === 1; };
const intersects = (a, b) => a.start < b.end && b.start < a.end;
function issue(state, message) { if (!state.limitations.includes(message) && state.limitations.length < 40) state.limitations.push(message); }
function entry(state, value) {
  if (state.entries.length >= MAX_ENTRIES) { issue(state, `Only the first ${MAX_ENTRIES} source entries are extracted.`); return null; }
  const result = { ...value, title: title(value.title), labels: [...new Set(value.labels || [])] };
  state.entries.push(result); return result;
}
function reference(state, value) {
  if (state.references.length >= MAX_REFERENCES) { issue(state, `Only the first ${MAX_REFERENCES} reference occurrences are extracted.`); return; }
  state.references.push({ kind: 'reference', ...value, raw: state.text.slice(value.start, value.end) });
}
function trimRange(text, start, end) {
  while (start < end && /\s/u.test(text[start])) start++;
  while (end > start && /\s/u.test(text[end - 1])) end--;
  return { start, end };
}
function paragraphs(state, visible, excluded = []) {
  const chars = visible.split(''), merged = [];
  for (const span of [...excluded].sort((a, b) => a.start - b.start)) {
    const prior = merged.at(-1);
    if (prior && span.start <= prior.end) prior.end = Math.max(prior.end, span.end);
    else merged.push({ start: span.start, end: span.end });
  }
  for (const span of merged) for (let i = span.start; i < span.end; i++) if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' ';
  const remaining = chars.join('');
  for (const match of remaining.matchAll(/[^\r\n]+(?:\r?\n(?![ \t]*\r?\n)[^\r\n]+)*/g)) {
    const span = trimRange(remaining, match.index, match.index + match[0].length);
    if (span.end > span.start && /[\p{L}\p{N}$]/u.test(remaining.slice(span.start, span.end))) {
      entry(state, { kind: 'prose', title: remaining.slice(span.start, span.end), ...span });
    }
  }
}
function group(text, at, open = '{', close = '}') {
  while (/\s/.test(text[at] || '') && at < text.length) at++;
  if (text[at] !== open) return null;
  const start = at++, valueStart = at; let depth = 1;
  while (at < text.length && at - start <= 65536) {
    if ((text[at] === open || text[at] === close) && !escaped(text, at)) {
      if (text[at] === open && ++depth > 32) return null;
      if (text[at] === close && --depth === 0) return { value: text.slice(valueStart, at), valueStart, start, end: at + 1 };
    }
    at++;
  }
  return null;
}
function optional(text, at) { return group(text, at, '[', ']'); }

function latexVisible(state) {
  const text = state.text, chars = text.split(''); let slashes = 0;
  // TeX comments, literal environments and \verb are inert source examples.
  for (let at = 0; at < text.length;) {
    let end;
    if (text[at] === '%' && slashes % 2 === 0) {
      end = text.indexOf('\n', at); if (end < 0) end = text.length;
    } else if (text[at] === '\\' && slashes % 2 === 0) {
      const literal = /^\\begin\s*\{(verbatim\*?|lstlisting|minted|comment)\}/.exec(text.slice(at, at + 80));
      const verb = /^\\verb\*?([^\w\s])/.exec(text.slice(at, at + 12));
      if (literal) {
        const close = `\\end{${literal[1]}}`, closeAt = text.indexOf(close, at + literal[0].length);
        end = closeAt < 0 ? text.length : closeAt + close.length;
        if (closeAt < 0) issue(state, `Unclosed ${literal[1]} environment is excluded through the document boundary.`);
      } else if (verb) {
        const closeAt = text.indexOf(verb[1], at + verb[0].length), lineEnd = text.indexOf('\n', at);
        end = closeAt < 0 || lineEnd >= 0 && closeAt > lineEnd ? (lineEnd < 0 ? text.length : lineEnd) : closeAt + 1;
      }
    }
    if (end !== undefined) {
      for (let i = at; i < end; i++) if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' ';
      at = end; slashes = 0;
    } else { slashes = text[at] === '\\' ? slashes + 1 : 0; at++; }
  }
  const visible = chars.join('');
  for (const match of visible.matchAll(/\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand|def|gdef|edef|xdef)\*?(?![A-Za-z])/g)) {
    if (escaped(visible, match.index)) continue;
    let at = match.index + match[0].length, body;
    if (/\\(?:[gex]?def)$/.test(match[0])) {
      const brace = visible.indexOf('{', at);
      if (brace >= 0 && brace - at <= 4096) body = group(visible, brace);
    } else {
      const name = group(visible, at);
      if (name) at = name.end;
      else { const nameToken = /^\s*\\[A-Za-z]+/.exec(visible.slice(at, at + 256)); if (!nameToken) continue; at += nameToken[0].length; }
      for (let n = 0; n < 2; n++) { const opt = optional(visible, at); if (!opt) break; at = opt.end; }
      body = group(visible, at);
    }
    const end = body?.end ?? text.length;
    for (let i = match.index; i < end; i++) if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' ';
    if (!body) issue(state, 'A malformed or oversized macro definition is excluded through the document boundary.');
    issue(state, 'LaTeX macro definitions are not expanded or treated as displayed source passages.');
  }
  return chars.join('');
}

function parsePrintedLabels(auxiliary) {
  const labels = new Map();
  for (const line of auxiliary.split(/\r\n|\n|\r/u)) {
    const command = /^[ \t]*\\newlabel(?=[\s{])/.exec(line);
    if (!command) continue;
    const key = group(line, command[0].length);
    if (!key || !key.value || key.value.length > 1024) continue;
    const fields = group(line, key.end);
    const number = fields && group(fields.value, 0);
    const value = number?.value.trim();
    // Conflicting definitions give no reliable printed number for the label.
    if (labels.has(key.value) && labels.get(key.value) !== value) labels.set(key.value, null);
    else if (!labels.has(key.value)) labels.set(key.value, printedNumber(value) ? value : null);
  }
  return labels;
}

function theoremDeclarations(visible, structural) {
  const declarations = new Map();
  for (const match of visible.matchAll(/\\newtheorem\*?(?![A-Za-z])/g)) {
    if (escaped(visible, match.index)) continue;
    const name = group(visible, match.index + match[0].length);
    if (!name) continue;
    const shared = optional(visible, name.end), display = group(visible, shared?.end ?? name.end);
    if (!display) continue;
    const within = optional(visible, display.end), caption = compact(display.value), id = name.value.trim();
    declarations.set(id, { kind: KINDS.get(caption.toLowerCase()) || 'statement',
      display: /^[\p{L}\p{N}\s-]{1,100}$/u.test(caption) ? caption : undefined,
      shared: shared?.value.trim(), within: within?.value.trim(), unnumbered: match[0].endsWith('*') });
    structural.push({ start: match.index, end: within?.end ?? display.end });
  }
  return declarations;
}

function nextTheoremNumber(name, declarations, sectionNumbers, theoremNumbers, chapterStyle) {
  const seen = new Set();
  let declaration = declarations.get(name);
  while (declaration?.shared) {
    if (seen.has(name)) return undefined;
    seen.add(name);
    name = declaration.shared;
    declaration = declarations.get(name);
  }
  if (!declaration || declaration.unnumbered) return undefined;
  const prefix = counterPrefix(declaration.within, sectionNumbers, chapterStyle);
  if (prefix === undefined) return undefined;
  const previous = theoremNumbers.get(name);
  const count = previous?.prefix === prefix ? previous.count + 1 : 1;
  theoremNumbers.set(name, { prefix, count });
  return prefix ? [prefix, count].join('.') : String(count);
}

function counterPrefix(within, sectionNumbers, chapterStyle) {
  const level = SECTIONS.indexOf(within);
  // Custom counters and parts can use different formats, for which the
  // auxiliary is authoritative.
  if (within && level < 1) return undefined;
  const chapter = chapterStyle || sectionNumbers.has('chapter');
  const first = chapter || level === 1 ? 1 : 2;
  return within ? SECTIONS.slice(first, level + 1).map(key => sectionNumbers.get(key) || 0).join('.') : '';
}

// AMS align and gather number rows; a nested aligned or cases block
// contributes no rows to the outer counter.
function displayRows(visible, display, end) {
  if (!/^(?:align|alignat|gather)$/u.test(display.name)) {
    return [{ start: display.bodyStart, end }];
  }
  const rows = [];
  const commands = /\\begin\s*\{[^{}]+\}|\\end\s*\{[^{}]+\}|\\\\\*?|\\[{}]|[{}]/gu;
  const body = visible.slice(display.bodyStart, end);
  let start = 0, depth = 0, braces = 0, match;
  while ((match = commands.exec(body))) {
    if (match[0].startsWith('\\begin')) depth++;
    else if (match[0].startsWith('\\end')) depth--;
    else if (match[0] === '{') braces++;
    else if (match[0] === '}') braces--;
    else if (match[0].startsWith('\\\\') && !depth && !braces) {
      rows.push({ start: display.bodyStart + start, end: display.bodyStart + match.index });
      const tail = optional(body, match.index + match[0].length);
      start = tail?.end ?? match.index + match[0].length;
      // Row spacing is outside the next row.
      if (tail) commands.lastIndex = tail.end;
    }
  }
  if (body.slice(start).trim()) rows.push({ start: display.bodyStart + start, end });
  return rows;
}

function mscFrontMatter(visible, bodyStart, stop) {
  const result = [];
  const intro = visible.slice(bodyStart, stop);
  const msc = /^[ \t]*(?:\\noindent[ \t]*)?(?:\\(?:textit|textbf|emph)\s*\{[ \t]*)?(?:\d{4}[ \t]+)?(?:Mathematics Subject Classification|MSC(?:[ \t]+\d{4})?)(?=[\s.:}\\]|$)/gmi;
  for (const match of intro.matchAll(msc)) {
    const start = bodyStart + match.index;
    if (start < (result.at(-1)?.end ?? bodyStart)) continue;
    const tail = intro.slice(match.index);
    const separator = /\r?\n[ \t]*\r?\n/.exec(tail);
    result.push({ start, end: separator ? start + separator.index : stop, title: 'Mathematics Subject Classification' });
  }
  return result;
}

function latex(state, selection, options) {
  const visible = latexVisible(state), structural = [], stack = [], proofs = [], labels = [], front = [];
  const declarations = theoremDeclarations(visible, structural);
  const sectionNumbers = new Map(), theoremNumbers = new Map();
  const chapterStyle = /\\documentclass(?:\s*\[[^\]]*\])?\s*\{(?:report|book|amsbook|memoir)\}/.test(visible);
  // A source that explicitly alters the displayed counters needs a current
  // auxiliary. Keep source labels as the fallback instead of guessing.
  const customCounters = /(?<!\\)\\(?:appendix|setcounter|addtocounter|counterwithin|counterwithout)(?![A-Za-z])/.test(visible) ||
    /(?<!\\)\\(?:renewcommand|def)\s*\{?\\the[A-Za-z]+/.test(state.text);
  const equationWithin = [...visible.matchAll(/(?<!\\)\\numberwithin\s*\{equation\}\s*\{([A-Za-z]+)\}/gu)]
    .at(-1)?.[1] || (chapterStyle ? 'chapter' : undefined);
  let equationPrefix, equationCount = 0;
  function numberDisplay(display, end) {
    const { node } = display;
    if (customCounters || !NUMBERED_DISPLAYS.test(display.name)) return;
    const prefix = counterPrefix(equationWithin, sectionNumbers, chapterStyle);
    if (prefix === undefined) return;
    if (prefix !== equationPrefix) { equationPrefix = prefix; equationCount = 0; }
    let labelIndex = 0;
    for (const row of displayRows(visible, display, end)) {
      const body = visible.slice(row.start, row.end);
      const tag = /(?<!\\)\\tag\*?(?![A-Za-z])/u.exec(body);
      const number = tag ? group(body, tag.index + tag[0].length)?.value.trim()
        : /(?<!\\)\\(?:notag|nonumber)(?![A-Za-z])/u.test(body) ? undefined
          : prefix ? prefix + '.' + ++equationCount : String(++equationCount);
      const usableNumber = printedNumber(number) ? number : undefined;
      node._number ||= usableNumber;
      while (labelIndex < display.labels.length && display.labels[labelIndex].start < row.end) {
        const label = display.labels[labelIndex++];
        if (row.start <= label.start && label.end <= row.end) label.number = usableNumber;
      }
    }
  }
  const tokens = /\\(begin|end|label|item|part|chapter|section|subsection|subsubsection|paragraph|subparagraph|bibitem|(?:[Cc]ref|[Ee]qref|[Aa]utoref|[Nn]ameref|[Vv]ref|ref)|(?:cite[a-zA-Z]*|parencite|textcite)|input|include|bibliography|title|author|date|maketitle|subjclass|keywords|tableofcontents|phantomsection|newtheorem)\*?(?![A-Za-z])/g;
  let match, commands = 0, bodyStart = 0, bodyEnd = state.text.length;
  while ((match = tokens.exec(visible))) {
    if (escaped(visible, match.index)) continue;
    if (++commands > 20000) { issue(state, 'LaTeX extraction stopped at the 20,000-command limit.'); break; }
    const command = match[1], start = match.index;
    let at = tokens.lastIndex, argument;
    if (['maketitle', 'tableofcontents', 'phantomsection'].includes(command)) {
      structural.push({ start, end: at });
      if (command === 'maketitle') front.push({ start, end: at, title: 'Title page' });
      continue;
    }
    if (command === 'item') {
      const list = stack.at(-1);
      if (list?.itemCount !== undefined) {
        const caption = optional(visible, at);
        list.itemNumber = caption ? undefined : String(++list.itemCount);
      }
      continue;
    }
    if (SECTIONS.includes(command) || /^(?:bibitem|subjclass|cite|parencite|textcite)/.test(command)) {
      for (let n = 0; n < 2; n++) { const opt = optional(visible, at); if (!opt) break; at = opt.end; }
    }
    argument = group(visible, at);
    if (!argument) { issue(state, `A malformed \\${command} argument was not extracted.`); continue; }
    tokens.lastIndex = argument.end;
    const value = argument.value.trim();
    if (command === 'begin') {
      if (stack.length >= 64) { issue(state, 'LaTeX nesting exceeds the 64-environment limit.'); break; }
      const declaration = declarations.get(value);
      const kind = declaration?.kind || KINDS.get(value) ||
        (/^(?:equation|align|alignat|gather|multline|displaymath)\*?$/.test(value) ? 'equation' : null);
      const opt = optional(visible, argument.end);
      const number = declaration && !customCounters ?
        nextTheoremNumber(value, declarations, sectionNumbers, theoremNumbers, chapterStyle) : undefined;
      const unnumbered = declaration?.unnumbered || value.endsWith('*') || value === 'displaymath';
      const node = kind && entry(state, { kind, title: opt?.value || (kind === 'proof' ? 'Proof' : kind[0].toUpperCase() + kind.slice(1)),
        start, end: state.text.length, statement: { start, end: state.text.length }, _environment: value,
        _proofTitle: kind === 'proof' ? opt?.value : undefined, _display: declaration?.display, _number: number,
        ...(unnumbered ? { unnumbered: true } : {}) });
      if (node && kind === 'proof') proofs.push(node);
      const basicEnumerate = !customCounters && value === 'enumerate' && !opt &&
        !stack.some(item => item.name === 'enumerate');
      stack.push({ name: value, start, node, bodyStart: argument.end, labels: [],
        ...(basicEnumerate ? { itemCount: 0 } : {}) });
      if (value === 'document') { bodyStart = argument.end; structural.push({ start, end: argument.end }); }
    } else if (command === 'end') {
      const index = stack.findLastIndex(item => item.name === value);
      if (index < 0) { issue(state, `Unmatched \\end{${value}} was not used as a boundary.`); continue; }
      for (const orphan of stack.slice(index + 1)) if (orphan.node) issue(state, `Unclosed ${orphan.name} environment ends at the enclosing boundary.`);
      const closed = stack.splice(index);
      for (const item of closed) {
        if (item.node) { item.node.end = argument.end; item.node.statement.end = argument.end; }
        if (item.name === 'abstract') front.push({ start: item.start, end: argument.end, title: 'Abstract' });
      }
      if (closed[0].node?.kind === 'equation') numberDisplay(closed[0], start);
      if (value === 'document') { bodyEnd = start; structural.push({ start, end: argument.end }); }
    } else if (command === 'label') {
      const enclosing = stack.findLast(item => item.node);
      const label = { label: value, start, end: argument.end, enclosing: enclosing?.node,
        direct: enclosing === stack.at(-1), number: stack.at(-1)?.itemNumber };
      labels.push(label);
      if (enclosing?.node.kind === 'equation') enclosing.labels.push(label);
      structural.push({ start, end: argument.end });
    } else if (SECTIONS.includes(command)) {
      const level = SECTIONS.indexOf(command);
      if (!match[0].endsWith('*') && level >= 1) {
        sectionNumbers.set(command, (sectionNumbers.get(command) || 0) + 1);
        for (const child of SECTIONS.slice(level + 1)) sectionNumbers.delete(child);
      }
      const prefix = !customCounters && !match[0].endsWith('*') && level >= 1 &&
        counterPrefix(command, sectionNumbers, chapterStyle);
      entry(state, { kind: 'section', section: true, level, title: argument.value, start, end: argument.end,
        ...(prefix ? { printedNumber: prefix } : {}) });
    } else if (command === 'bibitem') {
      entry(state, { kind: 'bibliography', title: value, label: value, labels: [value], start, end: argument.end, _citation: true });
    } else if (/^(?:input|include|bibliography|title|author|date|newtheorem|subjclass|keywords)$/.test(command)) {
      structural.push({ start, end: argument.end });
      const frontTitle = { title: 'Title', author: 'Author', date: 'Date',
        subjclass: 'Mathematics Subject Classification', keywords: 'Keywords' }[command];
      if (frontTitle) front.push({ start, end: argument.end, title: frontTitle });
      if (['input', 'include', 'bibliography'].includes(command)) issue(state, 'External LaTeX inputs and bibliographies are not expanded.');
    } else {
      const citation = /^(?:cite|parencite|textcite)/.test(command);
      for (const key of argument.value.matchAll(/[^,\s]+/g)) reference(state, {
        label: key[0], start, end: argument.end, labelStart: argument.valueStart + key.index,
        labelEnd: argument.valueStart + key.index + key[0].length, kind: citation ? 'citation' : 'reference', _local: true,
      });
    }
  }
  for (const item of stack) {
    if (item.node) { issue(state, `Unclosed ${item.name} environment ends at the document boundary.`); item.node.incomplete = true; }
    if (item.name === 'abstract') front.push({ start: item.start, end: bodyEnd, title: 'Abstract' });
  }
  // Attach a proof only to a containing statement or an immediately preceding
  // statement. An intervening mathematical paragraph prevents that guess.
  for (const proof of proofs) {
    const containing = state.entries.filter(n => n !== proof && !n.section && n.kind !== 'proof' && n.kind !== 'equation' && n.start < proof.start && n.end >= proof.end)
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    const preceding = state.entries.filter(n => !n.section && n.kind !== 'proof' && n.kind !== 'equation' && n.end <= proof.start)
      .sort((a, b) => b.end - a.end)[0];
    let owner = containing || (preceding && !visible.slice(preceding.end, proof.start).trim() ? preceding : null);
    if (proof._proofTitle && /\b(?:proof|demonstration)\s+of\b/i.test(proof._proofTitle)) {
      const target = /\\(?:ref|autoref|cref)\{([^}]+)\}/.exec(proof._proofTitle)?.[1];
      if (!target || !owner || !labels.some(label => label.label === target && label.enclosing === owner)) {
        owner = null; issue(state, 'A proof naming another result is kept separate when its statement cannot be matched at this source boundary.');
      }
    }
    if (owner && !owner.proof) {
      owner.proof = { start: proof.start, end: proof.end }; owner.end = Math.max(owner.end, proof.end);
      if (containing) owner.statement.end = proof.start;
      proof._attached = owner;
    }
  }
  for (const item of labels) {
    let owner = item.enclosing?._attached || item.enclosing;
    if (!owner) {
      owner = state.entries.filter(n => n.section && n.end <= item.start && !visible.slice(n.end, item.start).replace(/\\label\s*\{[^}]*\}/g, '').trim()).at(-1);
    }
    if (!owner) {
      let start = visible.lastIndexOf('\n\n', item.start); start = start < 0 ? bodyStart : start + 2;
      let end = visible.indexOf('\n\n', item.end); if (end < 0) end = bodyEnd;
      owner = entry(state, { kind: 'label', title: item.label, start, end, labels: [] });
    }
    if (owner) {
      owner.labels.push(item.label); owner.label ||= item.label;
      const compiled = options.printedLabels?.get(item.label);
      const number = printedNumber(compiled) ? compiled : item.number || (owner.kind === 'equation' ? undefined
        : (item.direct || owner.section) ? owner._number || owner.printedNumber : undefined);
      if (number) {
        (owner._labelNumbers ||= new Map()).set(item.label, number);
        if (item.direct || owner.kind === 'equation') owner._titleNumber ||= number;
      }
    }
  }
  state.entries = state.entries.filter(n => !n._attached);
  for (const node of state.entries.filter(n => n.kind === 'bibliography')) {
    const next = state.entries.find(n => n.kind === 'bibliography' && n.start > node.start);
    const boundary = visible.indexOf('\\end{thebibliography}', node.end);
    node.end = Math.min(next?.start ?? state.text.length, boundary < 0 ? state.text.length : boundary);
  }
  for (const node of state.entries) {
    const base = node.kind[0].toUpperCase() + node.kind.slice(1);
    if (node.label && !node.section && node.title === base) node.title += ` (${node.label})`;
    const labelNumbers = node._labelNumbers ? [...node._labelNumbers] : [];
    if (labelNumbers.length) node.labelNumbers = labelNumbers;
    if (node.section || node.unnumbered || node.kind === 'proof' || !node._environment) continue;
    const number = node._titleNumber || (node.kind !== 'equation' || !node.labels.length ? node._number : undefined);
    if (number) {
      node.printedNumber = number;
      if (node.kind === 'equation') {
        const numbers = [...new Set(labelNumbers.length ? labelNumbers.map(([, value]) => value) : [number])];
        const title = numbers.map(value => '(' + value + ')').join(', ');
        node.printedTitle = title.length > 220 || numbers.length === 1 ? 'Equation (' + number + ')' : 'Equations ' + title;
      } else node.printedTitle = `${node._display || base} ${number}`;
    }
  }
  const firstSection = state.entries.find(node => node.section && node.start >= bodyStart)?.start ?? bodyEnd;
  front.push(...mscFrontMatter(visible, bodyStart, firstSection));
  const inFront = node => front.some(span => span.start <= node.start && node.end <= span.end);
  state.entries = state.entries.filter(node => !inFront(node));
  const explicitlyIncluded = front.filter(span => selection && (selection.start === selection.end ?
    span.start <= selection.start && selection.start < span.end : intersects(span, selection)));
  for (const span of explicitlyIncluded) entry(state, { kind: 'frontmatter', frontMatter: true, ...span });
  state.references = state.references.filter(ref => !inFront(ref) ||
    explicitlyIncluded.some(span => span.start <= ref.start && ref.end <= span.end));
  const excluded = [...state.entries, ...structural, ...front, { start: 0, end: bodyStart }, { start: bodyEnd, end: state.text.length }];
  paragraphs(state, visible, excluded);
  issue(state, 'LaTeX is parsed lexically; macros, mathematical validity and inferred dependencies are not evaluated.');
}

const md = new MarkdownIt('commonmark');
for (const name of ['backticks', 'html_inline', 'image', 'link', 'autolink']) {
  const rule = md.inline.ruler.__rules__.find(row => row.name === name)?.fn;
  if (!rule) continue;
  md.inline.ruler.at(name, (state, silent) => {
    const start = state.pos, count = state.tokens.length, found = rule(state, silent);
    if (found && !silent) for (const token of state.tokens.slice(count)) if (['code_inline', 'html_inline', 'image', 'link_open'].includes(token.type)) token.meta = { start, end: state.pos };
    return found;
  });
}
function named(value) {
  const match = /^(Theorem|Lemma|Proposition|Corollary|Definition|Example|Remark|Assumption|Axiom|Conjecture|Claim|Fact|Notation|Exercise|Problem|Proof)\b/i.exec(value);
  return match && KINDS.get(match[1].toLowerCase());
}
function markdown(state) {
  const text = state.text, parsed = parseReadingMarkdown(text), fm = frontMatterInfo(text);
  if (fm.malformed) for (const reason of fm.conflicts) issue(state, reason);
  const visible = mask(text.slice(0, fm.end)) + text.slice(fm.end), tokens = md.parse(visible.replace(/^\uFEFF/, ' '), {});
  const lines = text.split(/\r\n|\r|\n/), starts = [0];
  for (const match of text.matchAll(/\r\n|\r|\n/g)) starts.push(match.index + match[0].length);
  const headings = parsed.all.filter(n => n.kind === 'heading'), headingEntries = [];
  for (const heading of headings) {
    const label = /\s*\{#([^}\s]+)\}\s*$/.exec(heading.label), shown = label ? heading.label.slice(0, label.index) : heading.label;
    const kind = named(shown) || 'section';
    const next = headings.find(n => n.start > heading.start && n.level <= heading.level);
    const node = entry(state, { kind, title: shown, start: heading.start, end: kind === 'section' ? heading.end : next?.start ?? text.length,
      level: heading.level, ...(kind === 'section' ? { section: true } : {}), labels: [heading.anchor, ...(label ? [label[1]] : [])],
      ...(label ? { label: label[1] } : {}), _headerEnd: heading.end });
    if (node) headingEntries.push(node);
  }
  const proofs = headingEntries.filter(n => n.kind === 'proof');
  for (const proof of proofs) {
    const owner = headingEntries.filter(n => n.kind !== 'proof' && !n.section && n.start < proof.start && n.end >= proof.start)
      .sort((a, b) => b.start - a.start)[0];
    if (owner && !owner.proof) {
      owner.statement = { start: owner.start, end: proof.start }; owner.proof = { start: proof.start, end: proof.end };
      owner.end = Math.max(owner.end, proof.end); proof._attached = owner;
    }
  }
  const paragraphNodes = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]; if (token.type !== 'inline' || !token.map) continue;
    const first = token.map[0], span = { start: starts[first], end: starts[token.map[1]] ?? text.length };
    const inline = token.content.split('');
    for (const child of token.children) if (child.meta && ['code_inline', 'html_inline', 'image', 'link_open'].includes(child.type)) {
      for (let at = child.meta.start; at < child.meta.end; at++) if (inline[at] !== '\n') inline[at] = ' ';
    }
    const prose = inline.join(''), contentLines = token.content.split('\n'), mapping = [];
    let contentStart = 0;
    for (let line = 0; line < contentLines.length; line++) {
      const column = (lines[first + line] || '').indexOf(contentLines[line]);
      mapping.push({ start: contentStart, end: contentStart + contentLines[line].length, absolute: column < 0 ? null : starts[first + line] + column });
      contentStart += contentLines[line].length + 1;
    }
    const absolute = offset => { const part = mapping.find(p => p.start <= offset && offset <= p.end); return part?.absolute == null ? null : part.absolute + offset - part.start; };
    for (const citation of prose.matchAll(/\[([^\]\r\n]*@[A-Za-z0-9_][^\]\r\n]*)\]/g)) {
      if (escaped(prose, citation.index) || citation[0].length > 2048 || !/(?:^|[\s;\[])-?@[\w]/.test(citation[0])) continue;
      for (const key of citation[1].matchAll(/(?:^|[\s;])-?@([A-Za-z0-9_:.+-]+)/g)) {
        const start = absolute(citation.index), end = absolute(citation.index + citation[0].length);
        if (start != null && end != null) reference(state, { kind: 'citation', label: key[1], start, end, _local: true });
      }
    }
    for (const ref of prose.matchAll(/\\(?:ref|eqref|autoref|cref)\{([^}]+)\}/g)) {
      if (escaped(prose, ref.index)) continue;
      const start = absolute(ref.index), end = absolute(ref.index + ref[0].length);
      if (start != null && end != null) for (const key of ref[1].split(',').map(x => x.trim()).filter(Boolean)) reference(state, { label: key, start, end, _local: true });
    }
    if (tokens[index - 1]?.type !== 'paragraph_open') continue;
    if (!token.children.some(child => child.type === 'text' && child.content.trim())) continue;
    const plain = token.children.map(child => child.type === 'softbreak' || child.type === 'hardbreak' ? ' ' : ['text', 'code_inline'].includes(child.type) ? child.content : '').join('');
    const kind = named(plain), containing = headingEntries.find(n => !n.section && n.start <= span.start && n.end >= span.end);
    if (!kind && containing) continue;
    const labels = [...prose.matchAll(/\{#([^}\s]+)\}/g)].map(m => m[1]);
    const node = entry(state, { kind: kind || 'prose', title: plain, ...span, labels, ...(labels.length ? { label: labels[0] } : {}) });
    if (node) paragraphNodes.push(node);
  }
  for (let i = 0; i < paragraphNodes.length; i++) {
    const proof = paragraphNodes[i]; if (proof.kind !== 'proof') continue;
    const nextBoundary = [...headingEntries, ...paragraphNodes].filter(n => n.start > proof.start && (n.section || !['prose', 'proof'].includes(n.kind))).sort((a, b) => a.start - b.start)[0];
    proof.end = nextBoundary?.start ?? text.length;
    const owner = paragraphNodes.slice(0, i).reverse().find(n => !['prose', 'proof'].includes(n.kind));
    if (owner && !owner.proof && !visible.slice(owner.end, proof.start).trim()) {
      owner.statement = { start: owner.start, end: owner.end }; owner.proof = { start: proof.start, end: proof.end }; owner.end = proof.end; proof._attached = owner;
    }
    for (const prose of paragraphNodes) if (prose.kind === 'prose' && prose.start > proof.start && prose.end <= proof.end) prose._attached = proof._attached || proof;
  }
  state.entries = state.entries.filter(n => !n._attached);
  for (const link of parsed.all.filter(n => ['document_link', 'reference'].includes(n.kind))) {
    let local = false, label = link.target || link.reference;
    if (link.syntax === 'markdown' && link.target.startsWith('#')) { local = true; try { label = decodeURIComponent(link.target.slice(1)); } catch { label = link.target.slice(1); } }
    else if (link.syntax === 'zettel') { const target = wikiTarget(link.target); if (!target.file && target.fragment) { local = true; label = target.fragment; } }
    reference(state, { label, start: link.start, end: link.end, _local: local, kind: link.kind === 'reference' ? 'retained_reference' : 'reference' });
  }
  issue(state, 'Markdown extraction uses explicit headings, named paragraphs and references; it does not infer a proof or dependency from prose.');
}

function extractAtlasText(text, language, range, options = {}) {
  if (typeof text !== 'string') throw new TypeError('Supply the exact editor text.');
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) throw new Error('Atlas text exceeds the 4 MiB extraction limit.');
  if (!['markdown', 'latex'].includes(language)) throw new Error('Text atlas extraction supports Markdown and LaTeX.');
  let selection = range === undefined ? { start: 0, end: text.length } : { start: range?.start, end: range?.end };
  if (![selection.start, selection.end].every(Number.isSafeInteger) || selection.start < 0 || selection.end < selection.start || selection.end > text.length) throw new Error('The selected UTF-16 range is outside the supplied editor text.');
  const state = { text, entries: [], references: [], limitations: [] };
  if (language === 'markdown') markdown(state); else latex(state, range === undefined ? null : selection, options);
  state.entries.sort((a, b) => a.start - b.start || a.end - b.end);
  const counts = new Map(), anchors = new Map(), citations = new Map();
  for (const node of state.entries) {
    node.labels = [...new Set(node.labels || [])];
    const base = `${node.kind}-${digest(node.label || node.labels[0] || node.title).slice(0, 16)}`;
    const occurrence = counts.get(base) || 0; counts.set(base, occurrence + 1); node.id = `${base}-${occurrence}`;
    for (const label of node.labels) {
      const map = node._citation ? citations : anchors;
      if (!map.has(label)) map.set(label, []); map.get(label).push(node.id);
    }
  }
  if (selection.start === selection.end && text.length) {
    const containing = state.entries.filter(n => n.start <= selection.start && selection.start <= n.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (containing) { selection = { start: containing.start, end: containing.end }; issue(state, 'The empty selection was expanded to its enclosing parsed source entry.'); }
  }
  state.references.sort((a, b) => a.start - b.start || a.end - b.end || a.label.localeCompare(b.label));
  const referenceCounts = new Map();
  for (const ref of state.references) {
    const base = `ref-${digest(ref.label).slice(0, 16)}`, occurrence = referenceCounts.get(base) || 0;
    referenceCounts.set(base, occurrence + 1); ref.id = `${base}-${occurrence}`;
    const owner = state.entries.filter(n => n.start <= ref.start && n.end >= ref.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (owner) ref.owner = owner.id;
    const targets = ref._local ? (ref.kind === 'citation' ? citations : anchors).get(ref.label) || [] : [];
    if (!ref._local) ref.status = 'external';
    else if (targets.length === 1) { ref.status = 'resolved'; ref.target = targets[0]; }
    else if (!targets.length) ref.status = 'missing';
    else { ref.status = 'ambiguous'; ref.candidates = [...targets]; }
  }
  const selected = new Set(state.entries.filter(n => intersects({ start: n.start, end: n.section ? n._headerEnd ?? n.end : n.end }, selection)).map(n => n.id));
  const included = new Set(selected), usedReferences = new Set(), referenced = new Set(), expanded = new Set(), candidates = new Set(), contexts = new Set(), queue = [];
  for (const ref of state.references) if (selection.start <= ref.start && ref.end <= selection.end) queue.push(ref);
  for (let at = 0; at < queue.length; at++) {
    const ref = queue[at]; if (usedReferences.has(ref.id)) continue; usedReferences.add(ref.id);
    if (ref.owner && !included.has(ref.owner)) { included.add(ref.owner); contexts.add(ref.owner); }
    for (const id of ref.candidates || []) { included.add(id); candidates.add(id); }
    if (!ref.target) continue;
    referenced.add(ref.target);
    included.add(ref.target); if (expanded.has(ref.target)) continue; expanded.add(ref.target);
    const target = state.entries.find(n => n.id === ref.target);
    for (const nested of state.references) if (target.start <= nested.start && nested.end <= target.end) queue.push(nested);
  }
  const entries = state.entries.filter(n => included.has(n.id)).map(node => {
    const clean = Object.fromEntries(Object.entries(node).filter(([key]) => !key.startsWith('_')));
    clean.selected = selected.has(node.id); clean.referenced = referenced.has(node.id);
    if (candidates.has(node.id)) clean.candidate = true;
    if (contexts.has(node.id)) clean.context = true;
    if (clean.selected && (node.start < selection.start || node.end > selection.end)) {
      clean.partial = true; clean.selectedRange = { start: Math.max(node.start, selection.start), end: Math.min(node.end, selection.end) };
    }
    return clean;
  });
  const references = state.references.filter(ref => usedReferences.has(ref.id)).map(ref => Object.fromEntries(Object.entries(ref).filter(([key]) => !key.startsWith('_'))));
  if (entries.some(n => n.partial)) issue(state, 'Some anchored entries extend beyond the selection; selectedRange marks the part explicitly selected.');
  if (references.some(n => n.status === 'external')) issue(state, 'References outside the supplied document are recorded but are not fetched or resolved.');
  if (!entries.length) issue(state, 'The selection contains no supported prose, heading or named mathematical entry.');
  return { entries, references, limitations: state.limitations, selection };
}
const displayEntries = new WeakMap();
function atlasDisplayEntries(atlas) {
  const { source, extraction } = atlas;
  if (source.language !== 'latex' ||
      !extraction.entries.some(entry => entry.kind === 'equation' && entry.label && !entry.labelNumbers)) {
    return extraction.entries;
  }
  if (!displayEntries.has(atlas)) {
    // Older atlases can show numbers from their retained text without reading
    // today's working file or auxiliary and without changing the saved record.
    const numbered = new Map(extractAtlasText(source.text, 'latex', extraction.selection).entries
      .filter(entry => entry.labelNumbers?.length)
      .map(entry => [entry.id, entry]));
    displayEntries.set(atlas, extraction.entries.map(entry => {
      const candidate = !entry.labelNumbers && numbered.get(entry.id);
      const matching = candidate?.start === entry.start && candidate?.end === entry.end;
      if (entry.kind === 'equation' && entry.label && entry.printedNumber && !entry.labelNumbers &&
          (!matching || candidate.printedNumber !== entry.printedNumber)) {
        return { ...entry, printedTitle: 'Equation (' + entry.printedNumber + ')',
          labelNumbers: [[entry.label, entry.printedNumber]] };
      }
      if (!matching) return entry;
      const { printedNumber, printedTitle, labelNumbers } = candidate;
      const labels = labelNumbers.map(([label, number]) =>
        [label, label === entry.label && entry.printedNumber ? entry.printedNumber : number]);
      return { ...entry, printedNumber: entry.printedNumber ?? printedNumber,
        printedTitle: entry.kind === 'equation' ? printedTitle : entry.printedTitle ?? printedTitle,
        labelNumbers: labels };
    }));
  }
  return displayEntries.get(atlas);
}

module.exports = { atlasDisplayEntries, extractAtlasText, parsePrintedLabels };
