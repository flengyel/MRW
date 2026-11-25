'use strict';

const { randomBytes } = require('node:crypto');
const { detailPage, handoffEntries, overviewComponents, ownerOf } = require('./atlasModel');
const { componentTitle, isTexAtlas, visibleAtlasEntries } = require('./atlasDiagram');
const { diagramHtml, diagramStyles, diagramScript, diagramPositionStyles } = require('./atlasDiagramView');
const { atlasDisplayEntries } = require('./atlasText');
const { escape, excerpt, preview, texPreviewContext } = require('./atlasPreview');

const READING_PREVIEW_LIMIT = 4096;
const SUMMARY_PREVIEW_LIMIT = 280;
const CITING_EXCERPT_LIMIT = 560;
const fields = [['question', 'Question'], ['hypotheses', 'Hypotheses'], ['conclusion', 'Conclusion'], ['nextUse', 'Next use']];
const asArray = value => Array.isArray(value) ? value : [];
const resultKinds = new Set(['theorem', 'lemma', 'proposition', 'corollary', 'claim', 'fact']);

function button(label, type, data = {}, id) {
  const attributes = Object.entries(data).filter(([, value]) => value != null)
    .map(([name, value]) => ` data-${name}="${escape(value)}"`).join('');
  return `<button type="button" data-type="${type}"${attributes}${id ? ` id="${escape(id)}"` : ''}>${escape(label)}</button>`;
}

function indices(atlas) {
  const entries = new Map(atlasDisplayEntries(atlas).map(entry => [entry.id, entry]));
  const components = new Map(atlas.components.map(component => [component.id, component]));
  const incoming = new Map(), outgoing = new Map();
  const lineStarts = [0];
  for (const match of atlas.source.text.matchAll(/\r\n|\r|\n/gu)) lineStarts.push(match.index + match[0].length);
  const tex = isTexAtlas(atlas) ? { ...texPreviewContext(atlas.source.text), references: new Map() } : undefined;
  const paragraphBreaks = tex ? Array.from(atlas.source.text.matchAll(/(?:\r\n|\r(?!\n)|\n)[ \t]*(?:\r\n|\r(?!\n)|\n)/gu),
    match => ({ start: match.index, end: match.index + match[0].length })) : undefined;
  const labelNumbers = tex && new Map([...entries.values()].map(entry => [entry.id, new Map(entry.labelNumbers)]));
  const append = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };
  for (const reference of atlas.extraction.references) {
    const owner = ownerOf(atlas.extraction, reference);
    append(outgoing, owner, reference);
    if (owner && reference.target) append(incoming, reference.target, { owner, reference });
    if (tex && reference.kind === 'reference' && reference.target) {
      const target = entries.get(reference.target);
      const number = labelNumbers.get(target.id).get(reference.label) ||
        (!target.labelNumbers && target.label === reference.label ? target.printedNumber : undefined);
      if (number) tex.references.set(reference.label, { number, kind: target.kind, entry: target.id });
    }
  }
  return { entries, components, incoming, outgoing, lineStarts, paragraphBreaks, tex };
}

function exactPreview(text, span, language, limit = READING_PREVIEW_LIMIT, tex) {
  return span ? preview(text.slice(span.start, span.end), language, limit, tex) : '';
}

function titleFor(atlasIndex, component) {
  return componentTitle(component, component.members ? undefined : atlasIndex.entries.get(component.itemIds[0]));
}

function entryLabel(entry) {
  return entry?.printedTitle && entry.label ? `<code class="muted">${escape(entry.label)}</code>` : '';
}

function citingParagraph(atlasIndex, entry, reference) {
  const part = [entry.proof, entry.statement, entry].find(span =>
    span && span.start <= reference.start && reference.end <= span.end);
  if (!part) return reference;
  const breaks = atlasIndex.paragraphBreaks;
  let low = 0, high = breaks.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (breaks[mid].end <= reference.start) low = mid + 1;
    else high = mid;
  }
  return { start: Math.max(part.start, breaks[low - 1]?.end ?? part.start),
    end: Math.min(part.end, Math.max(reference.end, breaks[low]?.start ?? part.end)) };
}

function nextUse(atlas, atlasIndex, component) {
  const own = new Set(component.itemIds);
  const useSites = component.itemIds.flatMap(id => atlasIndex.incoming.get(id) || [])
    .filter(site => !own.has(site.owner));
  if (!atlasIndex.tex) return useSites.length
    ? `<p>Explicitly referenced by</p><ul>${useSites.map(({ owner, reference }) => `<li>
        ${button(titleFor(atlasIndex, atlasIndex.components.get(owner)), 'followEntry', { entry: owner })}
        ${button('Open occurrence', 'openSource', { reference: reference.id })}
      </li>`).join('')}</ul>`
    : '';
  const paragraphs = new Map();
  for (const { owner, reference } of useSites) {
    const span = citingParagraph(atlasIndex, atlasIndex.entries.get(owner), reference);
    const key = span.start + ':' + span.end;
    if (!paragraphs.has(key)) paragraphs.set(key, { span, owner, references: [] });
    paragraphs.get(key).references.push(reference);
  }
  return paragraphs.size
    ? `<p>Explicitly referenced by</p><ul class="atlas-citing-passages">${[...paragraphs.values()].map(({ span, owner, references }) => `<li>
        ${excerpt(atlas.source.text.slice(span.start, span.end), atlas.source.language, CITING_EXCERPT_LIMIT, atlasIndex.tex)}
        ${references.length > 1 ? '<p class="muted">' + references.length + ' references in this passage</p>' : ''}
        <div class="toolbar">
          ${button('Open citing component', 'followEntry', { entry: owner })}
          ${references.map((reference, index) => button(references.length > 1 ? 'Open occurrence ' + (index + 1) : 'Open occurrence',
            'openSource', { reference: reference.id })).join('')}
        </div>
      </li>`).join('')}</ul>`
    : '';
}

function splitStatement(text, entry, language) {
  if (!entry?.statement || !resultKinds.has(entry.kind)) return undefined;
  let body = text.slice(entry.statement.start, entry.statement.end);
  if (language === 'latex' || language === 'tex') {
    body = body.replace(/^\\begin\{[^{}]+\}(?:\[[^\]\n]*\])?\s*/u, '')
      .replace(/^(?:\\label\{[^{}]+\}\s*)*/u, '').replace(/\s*\\end\{[^{}]+\}\s*$/u, '');
  } else {
    body = body.replace(/^#{1,6}[^\n]*\n/u, '').trim();
  }
  // A narrow lexical split for statements written in this conventional form.
  // The fields quote the source and the exact statement remains available.
  const match = /^(Let [\s\S]+?\.)\s+(If [\s\S]+?),\s+then\s+([\s\S]+)$/u.exec(body.trim());
  if (!match || /\b(?:If|then)\b/u.test(match[1] + ' ' + match[2].slice(3) + ' ' + match[3])) return undefined;
  return { hypotheses: [match[1], match[2]], conclusion: match[3] };
}

function description(atlas, atlasIndex, component, compact = false) {
  const entry = component.itemIds.length === 1 ? atlasIndex.entries.get(component.itemIds[0]) : undefined;
  const result = entry?.statement || (!entry?.section ? entry : undefined);
  const { text, language } = atlas.source;
  const limit = compact && !isTexAtlas(atlas) ? SUMMARY_PREVIEW_LIMIT : READING_PREVIEW_LIMIT;
  const split = splitStatement(text, entry, language);
  const exact = result ? `<details${compact ? '' : ' open'}><summary>${entry.statement ? 'Statement' : 'Source passage'}</summary>
      ${exactPreview(text, result, language, limit, atlasIndex.tex)}
      ${button('Open exact source', 'openSource', { entry: entry.id, part: entry.statement ? 'statement' : 'entry' },
        compact ? 'entry-' + entry.id : undefined)}</details>`
    : '';
  const defaults = [
    resultKinds.has(entry?.kind) ? `<p>What does ${escape(titleFor(atlasIndex, component))} establish?</p>` : '',
    split ? `<p>From the statement</p>${split.hypotheses.map(fragment => preview(fragment, language, limit, atlasIndex.tex)).join('')}` : '',
    (split ? `<p>From the statement</p>${preview(split.conclusion, language, limit, atlasIndex.tex)}` : '') + exact,
    nextUse(atlas, atlasIndex, component),
  ];
  const rows = fields.map(([key, label], index) => {
    const value = component[key] ? `<p>${escape(component[key])}</p>` : defaults[index];
    return value ? `<dt>${label}</dt><dd>${value}</dd>` : '';
  }).join('');
  return `${rows ? `<dl class="summary">${rows}</dl>` : ''}${component.attribution
    ? `<p class="muted">Description edited by ${escape(component.attribution)}.${component.carriedFrom ? ' Carried from matching retained evidence.' : ''}</p>` : ''}`;
}

function rangeLabel(span, lineStarts) {
  const location = offset => {
    let low = 0, high = lineStarts.length;
    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= offset) low = mid;
      else high = mid;
    }
    return (low + 1) + ':' + (offset - lineStarts[low] + 1);
  };
  return location(span.start) + '–' + location(span.end);
}

function referenceList(references, atlasIndex) {
  if (!references?.length) return '';
  return `<ul class="references">${references.map(reference => {
    const status = {
      resolved: 'Explicit reference',
      missing: 'Reference target missing',
      ambiguous: 'Reference has multiple targets',
      external: 'External reference',
    }[reference.status];
    const target = atlasIndex.entries.get(reference.target);
    return `<li><span>${status}</span> <code>${escape(reference.label)}</code>
      <span class="muted">${rangeLabel(reference, atlasIndex.lineStarts)}</span>
      ${button('Open occurrence', 'openSource', { reference: reference.id, 'return-entry': reference.owner })}
      ${target ? `<div class="toolbar">${button('Open cited statement', 'openSource', { entry: target.id,
        part: target.statement ? 'statement' : 'entry', 'return-entry': reference.owner })}
        <span class="muted">${rangeLabel(target.statement || target, atlasIndex.lineStarts)}</span>
        ${button('Follow ' + titleFor(atlasIndex, atlasIndex.components.get(target.id)), 'followEntry', { entry: target.id })}</div>` : ''}
      ${reference.status === 'ambiguous' && reference.candidates?.length ? `<details><summary>Possible targets</summary><ul>${reference.candidates.map(id =>
        `<li>${button(titleFor(atlasIndex, atlasIndex.components.get(id)), 'openSource', { entry: id, 'return-entry': reference.owner })}</li>`).join('')}</ul></details>` : ''}</li>`;
  }).join('')}</ul>`;
}

function overview(atlas, atlasIndex, options = {}) {
  const visible = visibleAtlasEntries(atlas, options.showProse);
  const ordered = overviewComponents(atlas).filter(c => !visible || c.itemIds.some(id => visible.has(id)));
  const groupable = ordered.filter(component => !component.members);
  const cards = components => `<ul class="components" role="list">${components.map(component => {
    const first = atlasIndex.entries.get(component.itemIds[0]);
    const kind = component.members ? `${component.members.length} passages` :
      first.selected ? first.kind : first.candidate ? 'Possible reference target' : 'Referenced or context passage';
    return `<li>
      <h2>${button(titleFor(atlasIndex, component), 'selectComponent', { component: component.id }, 'component-' + component.id)}</h2>
      <p class="muted">${escape(kind)} ${component.members ? '' : entryLabel(first)}</p>
      ${description(atlas, atlasIndex, component, true)}
    </li>`;
  }).join('')}</ul>`;
  const sections = visible ? atlas.extraction.entries.filter(entry => entry.section) : [];
  const first = c => atlasIndex.entries.get(c.itemIds.find(id => visible.has(id)));
  const group = components => {
    const rows = [];
    for (const component of components) {
      const section = sections.findLast(item => item.start <= first(component).start);
      if (!rows.length || rows.at(-1).section !== section) rows.push({ section, components: [] });
      rows.at(-1).components.push(component);
    }
    return rows.map(({ section, components }) => `${section ? `<h2 class="atlas-section">${escape(section.title)}</h2>` : ''}${cards(components)}`).join('');
  };
  const equations = visible ? ordered.filter(c => !c.members && first(c).kind === 'equation') : [];
  const equationIds = new Set(equations.map(c => c.id));
  const list = visible ? group(ordered.filter(c => !equationIds.has(c.id))) +
    (equations.length ? '<h2>Labelled equations</h2>' + group(equations) : '') : cards(ordered);
  return `${list}
  ${referenceList(atlasIndex.outgoing.get(undefined), atlasIndex)}
  ${!options.readOnly && groupable.length > 1 ? `<details class="editor"><summary>Group components</summary>
    <form data-change="group">
      <label for="group-title">Group title</label><input id="group-title" name="title" maxlength="240" required>
      <fieldset><legend>Components</legend>
        ${groupable.map(c => `<label class="choice"><input type="checkbox" name="components" value="${escape(c.id)}"> ${escape(titleFor(atlasIndex, c))}</label>`).join('')}
      </fieldset><button type="submit">Create group</button>
    </form></details>` : ''}`;
}

function editDescription(atlas, component) {
  const key = escape(atlas.source.revision + ':' + component.id);
  return `<details class="editor"><summary>Edit description</summary>
    <form data-change="component" data-component="${escape(component.id)}" data-draft="${key}">
      <label for="edit-title">Title</label>
      <input id="edit-title" name="title" value="${escape(component.title)}" maxlength="240" required>
      ${fields.map(([field, label]) => `<label for="edit-${field}">${label}</label>
        <textarea id="edit-${field}" name="${field}" maxlength="8192" rows="2">${escape(component[field])}</textarea>`).join('')}
      <button type="submit">Apply description</button>
    </form>
  </details>`;
}

function pager(detail) {
  if (detail.pages < 2) return '';
  return `<nav class="toolbar" aria-label="Component pages">
    ${detail.index > 0 ? button('Previous passages', 'selectPage', { component: detail.component.id, page: detail.index - 1 }) : ''}
    <p>Passages ${detail.first}–${detail.last} of ${detail.total}</p>
    ${detail.index < detail.pages - 1 ? button('Next passages', 'selectPage', { component: detail.component.id, page: detail.index + 1 }) : ''}
  </nav>`;
}

function citationList(citations, sources, passages, kind, language) {
  if (!citations?.length) return `<p class="muted">No retained citation for this ${kind}.</p>`;
  return `<ul class="references" aria-label="Cited passages">${citations.map(cite => {
    const source = sources.get(cite.source), passage = passages.get(cite.source);
    const retained = passage?.text?.split(/\r\n|\r|\n/u).slice(cite.start_line - 1, cite.end_line).join('\n');
    const title = escape(source?.title || cite.source);
    const lines = cite.start_line === cite.end_line ? 'line ' + cite.start_line : 'lines ' + cite.start_line + '–' + cite.end_line;
    const label = title + ' · ' + lines;
    return retained ? `<li><details><summary>${label}</summary>${preview(retained, language, READING_PREVIEW_LIMIT)}</details></li>` : `<li>${label}</li>`;
  }).join('')}</ul>`;
}

function inferenceForm(nodes, sources, component, page, rule) {
  const id = 'inference-' + (rule?.id || 'new');
  const premiseSet = new Set(rule?.premises || []);
  return `<details class="editor"><summary>${rule ? 'Edit reason and premises' : 'Add an inference'}</summary>
    <form data-change="${rule ? 'editInference' : 'addInference'}" data-component="${escape(component)}"
        data-page="${page}"${rule ? ' data-rule="' + escape(rule.id) + '"' : ''}>
      <fieldset><legend>Premises used together</legend>
        ${nodes.filter(node => node.id !== rule?.conclusion).map(node => `<label class="choice">
          <input type="checkbox" name="premises" value="${escape(node.id)}"${premiseSet.has(node.id) ? ' checked' : ''}> ${escape(node.title)}</label>`).join('')}
      </fieldset>
      ${rule ? '' : `<label for="${id}-conclusion">Conclusion</label>
        <select id="${id}-conclusion" name="conclusion" required>
          <option value="">Choose a claim</option>
          ${nodes.map(node => `<option value="${escape(node.id)}">${escape(node.title)}</option>`).join('')}
        </select>
        <label for="${id}-source">Cited passage</label>
        <select id="${id}-source" name="source" required>
          <option value="">Choose the evidence</option>
          ${[...sources.values()].map(source => `<option value="${escape(source.id)}">${escape(source.title)}</option>`).join('')}
        </select>`}
      <label for="${id}-reason">Reason</label>
      <textarea id="${id}-reason" name="reason" maxlength="8192" rows="3" required>${escape(rule?.explanation?.text)}</textarea>
      <label for="${id}-author">Name</label>
      <input id="${id}-author" name="author" maxlength="160" value="Reader" required>
      <button type="submit">${rule ? 'Apply correction' : 'Add inference'}</button>
    </form></details>`;
}

function proposalReview(proposal, component, page, language) {
  const graph = proposal?.graph || proposal;
  const nodes = asArray(graph?.nodes);
  if (!nodes.length) return '';
  const attributed = explanation => explanation?.author ? `<p class="muted">${explanation.origin === 'ai_proposal'
    ? 'Proposal by ' : 'Written by '}${escape(explanation.author)}</p>` : '';
  const names = new Map(nodes.map(node => [node.id, node.title]));
  const sources = new Map(asArray(graph.sources).map(source => [source.id, source]));
  const passages = new Map(asArray(proposal.study?.passages).map(passage => [passage.id, passage]));
  const original = new Map(asArray(proposal.original?.inferences).map(rule => [rule.id, rule]));
  const joint = premises => escape(asArray(premises).map(id => names.get(id) || id).join(' + '));
  const inferences = asArray(graph.inferences);
  const totals = new Map(), seen = new Map();
  for (const rule of inferences) totals.set(rule.conclusion, (totals.get(rule.conclusion) || 0) + 1);
  const heading = proposal.human ? 'Reader outline' : proposal.corrected ? 'Corrected outline' : 'Proposed outline';
  return `<section class="proposal" aria-labelledby="proposal-title"><h2 id="proposal-title" tabindex="-1">${heading}</h2>
    <p>Check the claims and reasons against the retained passages.</p>
    ${graph.description?.text ? `<p>${escape(graph.description.text)}</p>${attributed(graph.description)}` : ''}
    <h3>Claims</h3><ol>${nodes.map(node =>
      `<li><strong>${escape(node.title)}</strong><p>${escape(node.claim)}</p>
      ${node.explanation?.text ? `<p>${escape(node.explanation.text)}</p>` : ''}${attributed(node.explanation)}
      ${citationList(node.citations, sources, passages, 'claim', language)}</li>`).join('')}</ol>
    ${inferences.length ? `<h3>Inferences</h3><ol>${inferences.map(rule => {
      const number = (seen.get(rule.conclusion) || 0) + 1;
      seen.set(rule.conclusion, number);
      const prior = original.get(rule.id);
      const previous = prior && (prior.explanation?.text !== rule.explanation?.text ||
        prior.explanation?.author !== rule.explanation?.author ||
        JSON.stringify(prior.premises) !== JSON.stringify(rule.premises));
      return `<li>
        ${totals.get(rule.conclusion) > 1 ? `<p>Alternative ${number} of ${totals.get(rule.conclusion)}</p>` : ''}
        <p><strong>Joint premises</strong> ${joint(rule.premises)}</p>
        <p><strong>Conclusion</strong> ${escape(names.get(rule.conclusion))}</p>
        <p>${escape(rule.explanation?.text || 'Reason unavailable')}</p>${attributed(rule.explanation)}
        ${rule.discharges?.length ? `<p>Discharges ${escape(rule.discharges.join(', '))}</p>` : ''}
        ${citationList(rule.citations, sources, passages, 'inference', language)}
        ${previous ? `<details><summary>Original proposal for this inference</summary>
          <p><strong>Joint premises</strong> ${joint(prior.premises)}</p><p>${escape(prior.explanation?.text)}</p>
          ${attributed(prior.explanation)}${citationList(prior.citations, sources, passages, 'inference', language)}</details>` : ''}
        ${inferenceForm(nodes, sources, component, page, rule)}
      </li>`;
    }).join('')}</ol>` : '<p>No inference has been recorded.</p>'}
    ${nodes.length > 1 ? inferenceForm(nodes, sources, component, page) : ''}
    <div class="toolbar">${button('Save and open outline', 'acceptProposal', { component, page })}
      ${button('Discard draft', 'discardProposal', { component, page })}</div></section>`;
}

function detailView(atlas, atlasIndex, options) {
  const detail = detailPage(atlas, options.component, options.page), c = detail.component;
  const component = c.id, page = detail.index;
  const { optional } = handoffEntries(atlas, component, page);
  const inputs = optional.map(entry => `<li><div class="toolbar">
    <label class="choice"><input type="checkbox" data-handoff value="${escape(entry.id)}"> ${escape(titleFor(atlasIndex, atlasIndex.components.get(entry.id)))}</label>
    ${button('Open statement or passage', 'openSource', { entry: entry.id, part: entry.statement ? 'statement' : 'entry' })}
    ${entry.proof ? button('Open proof', 'openSource', { entry: entry.id, part: 'proof' }) : ''}
    </div>${entry.proof ? `<label class="choice"><input type="checkbox" data-handoff-proof value="${escape(entry.id)}"> Include proof</label>` : ''}</li>`);
  return `<nav class="toolbar" aria-label="Atlas navigation">${button('All components', 'showOverview', { component })}</nav>
    <h1 id="atlas-heading" tabindex="-1">${escape(titleFor(atlasIndex, c))}</h1>
    ${!c.members ? entryLabel(atlasIndex.entries.get(c.itemIds[0])) : ''}
    ${description(atlas, atlasIndex, c, false)}
    ${c.members ? `<details><summary>Member components</summary><ol>${c.members.map(id =>
      `<li>${button(titleFor(atlasIndex, atlasIndex.components.get(id)), 'selectComponent', { component: id })}</li>`).join('')}</ol>
      ${options.readOnly ? '' : button('Ungroup', 'edit', { edit: 'ungroup', component })}</details>` : ''}
    ${options.readOnly ? '' : editDescription(atlas, c)}
    <p>Explicit references can guide reading. A reason for an inference must be supplied in an argument.</p>
    <section aria-labelledby="component-evidence"><h2 id="component-evidence">Passages</h2>
      ${pager(detail)}
      <ol start="${detail.first}">${detail.entries.map(entry => `<li><h3>
        ${button('Open exact source for ' + titleFor(atlasIndex, atlasIndex.components.get(entry.id)), 'openSource', { entry: entry.id, part: 'entry' }, 'entry-' + entry.id)}</h3>
        ${entry.partial ? '<p class="muted">The original selection covers part of this passage.</p>' : ''}
        <div class="toolbar">
          ${entry.statement ? button('Open exact statement', 'openSource', { entry: entry.id, part: 'statement' }) : ''}
          ${entry.proof ? button('Open exact proof', 'openSource', { entry: entry.id, part: 'proof' }) : ''}
        </div>
        ${c.members || !entry.statement ? `<details><summary>Source excerpt</summary>${exactPreview(atlas.source.text, entry.statement || entry, atlas.source.language, undefined, atlasIndex.tex)}</details>` : ''}
        ${entry.proof ? `<details><summary>Proof</summary>${exactPreview(atlas.source.text, entry.proof, atlas.source.language, undefined, atlasIndex.tex)}</details>` : ''}
        ${referenceList(atlasIndex.outgoing.get(entry.id), atlasIndex)}
      </li>`).join('')}</ol>
    </section>
    ${options.readOnly ? '' : `<section aria-labelledby="component-proof"><h2 id="component-proof">Argument</h2>
      ${options.hasGraph ? '<p>Review the retained outline and its sources.</p>'
        : '<p>Missing reason. No inference has been recorded for this component.</p>'}
      ${options.hasGraph ? `<div class="toolbar">${button('Open proof outline', 'openGraph', { component, page })}</div>` : ''}
      <details${options.proposal ? '' : ' open'}><summary>Outline inputs</summary>
        ${inputs.length ? `<fieldset><legend>Additional source inputs</legend><ul>${inputs.join('')}</ul></fieldset>` : ''}
        <div class="toolbar">
          ${options.proposal ? '' : button('Write an outline', 'startDraft', { component, page })}
          ${button('Copy handoff for Codex', 'copyHandoff', { component, page })}
          ${button('Import companion outline', 'importProposal', { component, page })}
        </div>
      </details>
      ${proposalReview(options.proposal, component, page, atlas.source.language)}
    </section>`}`;
}

// All source and proposal strings enter this document as escaped text or escaped
// attributes. The only executable contents are this fixed webview controller.
const script = String.raw`
(() => {
  const api = acquireVsCodeApi();
  const stored = api.getState() || {};
  const drafts = stored.drafts || {};
  const form = document.querySelector('[data-draft]');
  const values = element => Object.fromEntries(new FormData(element));
  let defaults;
  if (form) {
    const key = form.dataset.draft;
    defaults = values(form);
    if (drafts[key]) {
      if (Object.entries(drafts[key]).every(([field, value]) => defaults[field] === value)) {
        delete drafts[key];
      } else {
        for (const [field, value] of Object.entries(drafts[key])) {
          if (form.elements.namedItem(field) && typeof value === 'string') form.elements.namedItem(field).value = value;
        }
        form.parentElement.open = true;
      }
    }
    form.addEventListener('input', () => {
      drafts[key] = values(form);
      api.setState({...api.getState(),drafts});
    });
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('button[data-type], a[data-type="openSource"]');
    if (!action) return;
    event.preventDefault();
    const message = {...action.dataset};
    if (message.page !== undefined) message.page = Number(message.page);
    if (message.index !== undefined) message.index = Number(message.index);
    if (message.occurrence !== undefined) message.occurrence = Number(message.occurrence);
    if (message.type === 'edit') message.change = {type:message.edit,component:message.component};
    if (message.type === 'copyHandoff' || message.type === 'startDraft') {
      const checked = selector => [...document.querySelectorAll(selector)].map(item => item.value);
      message.includeProofs = checked('input[data-handoff-proof]:checked');
      message.include = [...new Set([...checked('input[data-handoff]:checked'), ...message.includeProofs])];
      if (message.include.length > 4) {
        document.getElementById('atlas-status').textContent = 'Select up to four additional source inputs.';
        return;
      }
    }
    api.postMessage(message);
  });
  document.addEventListener('submit', event => {
    const target = event.target;
    if (!target.dataset.change) return;
    event.preventDefault();
    if (target.dataset.change === 'group') {
      const data = new FormData(target);
      const components = data.getAll('components');
      if (components.length < 2) {
        document.getElementById('atlas-status').textContent = 'Choose at least two components.';
        return;
      }
      api.postMessage({type:'edit',change:{type:'group',title:data.get('title'),components}});
    } else if (target.dataset.change === 'editInference' || target.dataset.change === 'addInference') {
      const data = new FormData(target);
      const premises = data.getAll('premises');
      const conclusion = data.get('conclusion');
      if (!premises.length || premises.includes(conclusion)) {
        document.getElementById('atlas-status').textContent = 'Choose at least one premise other than the conclusion.';
        return;
      }
      const change = {premises, reason:data.get('reason'), author:data.get('author')};
      if (target.dataset.rule) change.rule = target.dataset.rule;
      else { change.conclusion = conclusion; change.source = data.get('source'); }
      api.postMessage({type:target.dataset.rule ? 'editProposal' : 'addInference', component:target.dataset.component,
        page:Number(target.dataset.page), change});
    } else if (target.dataset.change === 'component') {
      const fields = Object.fromEntries(Object.entries(values(target)).filter(([field, value]) => value !== defaults[field]));
      if (Object.keys(fields).length) api.postMessage({type:'edit',change:{type:'component',component:target.dataset.component,fields}});
    }
  });
  ${diagramScript}
  const focus = document.getElementById(document.body.dataset.focus) || document.getElementById('atlas-heading');
  focus?.focus();
})();
`;

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
    color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
  main { padding: 1.2rem; margin: auto; max-width: 65rem; overflow-wrap: anywhere; }
  h1 { margin: .6rem 0 1rem; } h2, h3 { margin-bottom: .45rem; }
  p, pre, li { line-height: 1.5; }
  p { margin: .4rem 0; }
  button, textarea, input { font: inherit; }
  button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border, transparent); border-radius: 2px; padding: .25rem .55rem; margin: .15rem; cursor: pointer; }
  button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button:focus-visible, summary:focus-visible, input:focus-visible, textarea:focus-visible,
  [tabindex="-1"]:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
  .toolbar { display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem; }
  .components { list-style: none; padding-inline-start: 0; }
  .components > li { border-bottom: 1px solid var(--vscode-panel-border); padding: .15rem 0 1rem; }
  .components h2 button { font-weight: 600; }
  .summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: .35rem 1rem; max-width: 60rem; }
  .summary dt { font-weight: 600; }
  .summary dd { margin: 0; }
  .summary p, .toolbar p { margin: 0; }
  .muted { color: var(--vscode-descriptionForeground); }
  pre { white-space: pre-wrap; background: var(--vscode-textCodeBlock-background);
    padding: .7rem; font-family: var(--vscode-editor-font-family, monospace); }
  .atlas-reading p { margin: .4rem 0; }
  .atlas-reading ol, .atlas-reading ul { padding-inline-start: 1.5em; }
  .atlas-reading li > p { margin: .2em 0; }
  .atlas-reading .atlas-math-display { display: block; overflow-x: auto; margin: .6em 0; }
  .atlas-reading .atlas-raw-math { white-space: pre-wrap; }
  .atlas-reading .atlas-inline-reference { color: var(--vscode-textLink-foreground); }
  details { margin: .5rem 0; }
  summary { cursor: pointer; }
  fieldset { border: 1px solid var(--vscode-panel-border); margin: .5rem 0; max-height: 18rem; overflow: auto; }
  label { display: block; margin-top: .4rem; }
  input:not([type="checkbox"]), select, textarea { width: 100%; max-width: 42rem; padding: .25rem;
    color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); }
  textarea { display: block; margin-bottom: .5rem; }
  section { margin-top: 1.4rem; }
  @media (max-width: 32rem) {
    main { padding: .75rem; }
    .summary { grid-template-columns: 1fr; }
  }
`;

function atlasHtml(_webview, atlas, options = {}) {
  const nonce = randomBytes(24).toString('base64');
  const atlasIndex = indices(atlas);
  const { selection } = atlas.extraction;
  const origin = atlas.source.text.slice(0, selection.start).split(/\r\n|\r|\n/).length;
  const limit = atlas.source.text.slice(0, selection.end).split(/\r\n|\r|\n/).length;
  const visual = !options.component && options.diagram && options.view !== 'list';
  const results = visibleAtlasEntries(atlas, false);
  const proseToggle = !options.component && results && atlas.extraction.entries.some(entry => !entry.section && !results.has(entry.id))
    ? `<button type="button" id="atlas-show-prose" aria-pressed="${!!options.showProse}" data-type="toggleProse">${options.showProse ? 'Hide prose' : 'Show prose'}</button>` : '';
  const tabs = options.view ? `<nav class="atlas-view-tabs" aria-label="Atlas views">${[['map', 'Proof map'], ['blueprint', 'Blueprint'], ['list', 'Reading list']].map(([view, label]) =>
    `<button type="button" id="atlas-view-${view}" aria-pressed="${options.view === view}" data-type="selectView" data-view="${view}">${label}</button>`).join('')}${proseToggle}</nav>` : proseToggle;
  const main = options.component ? detailView(atlas, atlasIndex, options) :
    `<h1 id="atlas-heading" tabindex="-1">${escape(atlas.source.title)}</h1>${visual
      ? diagramHtml(atlas, atlasIndex, options, {escape,button,exactPreview,description,referenceList,entryLabel})
      : overview(atlas, atlasIndex, options)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; form-action 'none'; base-uri 'none'">
    <title>Mathematical Atlas</title><style nonce="${nonce}">${styles}${diagramStyles}${diagramPositionStyles(visual ? options.diagram : undefined)}</style>
    </head><body data-capture="${escape(atlas.source.revision)}" data-focus="${escape(options.focus || (options.proposal ? 'proposal-title' : 'atlas-heading'))}"><main${visual ? ' class="diagram-main"' : ''}>
    <nav class="toolbar" aria-label="Atlas actions">
      ${button('Open exact selection', 'openSource', { part: 'selection' })}
      ${options.readOnly ? '' : button('Return to source selection', 'return')}
      ${options.readOnly ? '' : button('Save atlas revision', 'saveAtlas')}
      ${options.readOnly ? '' : button('Regenerate from source', 'regenerate')}
      ${!options.readOnly && options.previous ? button('Open earlier revision', 'openPrevious') : ''}
    </nav>
    <p class="muted">${escape(atlas.source.title)} · lines ${origin}–${limit} · revision <code>${escape(atlas.source.revision.slice(0, 12))}</code></p>
    ${options.readOnly ? '<p class="muted">Read-only inspection. Open a workspace containing this atlas to edit descriptions or use saved sibling outlines. Exact source actions read the captured text.</p>' : ''}
    <p role="status" id="atlas-status">${escape(options.notice)}</p>
    ${tabs}
    ${main}
    ${atlas.extraction.limitations?.length ? `<details><summary>Extraction notes</summary><ul>${atlas.extraction.limitations.map(note => `<li>${escape(note)}</li>`).join('')}</ul></details>` : ''}
    </main><script nonce="${nonce}">${script}</script></body></html>`;
}

function atlasOpenErrorHtml(error) {
  const nonce = randomBytes(24).toString('base64');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; form-action 'none'; base-uri 'none'"><title>Open mathematical atlas</title><style nonce="${nonce}">${styles}</style></head><body><main><h1>Could not open this atlas</h1><p role="alert">${escape(error)}</p><p>Check the file in Text Editor, or retry after the saved file is corrected. Existing files and captured sources have not been changed.</p><div class="toolbar">${button('Retry opening atlas','retryOpen')}${button('Open in Text Editor','openAsText')}</div></main><script nonce="${nonce}">const api=acquireVsCodeApi();document.addEventListener('click',event=>{const action=event.target.closest('button[data-type]');if(action)api.postMessage({type:action.dataset.type});});</script></body></html>`;
}

module.exports = { atlasHtml, atlasOpenErrorHtml };
