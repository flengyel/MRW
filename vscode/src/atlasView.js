'use strict';

const { randomBytes } = require('node:crypto');
const { detailPage, handoffEntries, overviewComponents, ownerOf } = require('./atlasModel');

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));
const fields = [['question', 'Question'], ['hypotheses', 'Hypotheses'], ['conclusion', 'Conclusion'], ['nextUse', 'Next use']];
const asArray = value => Array.isArray(value) ? value : [];
const resultKinds = new Set(['theorem', 'lemma', 'proposition', 'corollary', 'claim', 'fact']);

function button(label, type, data = {}, id) {
  const attributes = Object.entries(data).filter(([, value]) => value != null)
    .map(([name, value]) => ` data-${name}="${escape(value)}"`).join('');
  return `<button type="button" data-type="${type}"${attributes}${id ? ` id="${escape(id)}"` : ''}>${escape(label)}</button>`;
}

function indices(atlas) {
  const entries = new Map(atlas.extraction.entries.map(entry => [entry.id, entry]));
  const components = new Map(atlas.components.map(component => [component.id, component]));
  const incoming = new Map(), outgoing = new Map();
  const lineStarts = [0];
  for (const match of atlas.source.text.matchAll(/\r\n|\r|\n/gu)) lineStarts.push(match.index + match[0].length);
  const append = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };
  for (const reference of atlas.extraction.references) {
    const owner = ownerOf(atlas.extraction, reference);
    append(outgoing, owner, reference);
    if (owner && reference.target) append(incoming, reference.target, { owner, reference });
  }
  return { entries, components, incoming, outgoing, lineStarts };
}

function excerpt(fragment, limit) {
  return `<pre>${escape(fragment.slice(0, limit))}</pre>${fragment.length > limit
    ? '<p class="muted">Open the exact source to read the remainder.</p>' : ''}`;
}

function exactPreview(text, span) {
  return span ? excerpt(text.slice(span.start, span.end), 1800) : '';
}

function nextUse(atlasIndex, component) {
  const own = new Set(component.itemIds);
  const useSites = component.itemIds.flatMap(id => atlasIndex.incoming.get(id) || [])
    .filter(site => !own.has(site.owner));
  return useSites.length
    ? `<p>Explicitly referenced by</p><ul>${useSites.map(({ owner, reference }) => `<li>
        ${button(atlasIndex.components.get(owner).title, 'followEntry', { entry: owner })}
        ${button('Open occurrence', 'openSource', { reference: reference.id })}
      </li>`).join('')}</ul>`
    : '<p class="muted">No explicit use located in this atlas.</p>';
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
  const text = atlas.source.text;
  const split = splitStatement(text, entry, atlas.source.language);
  const exact = result ? `<details${compact ? '' : ' open'}><summary>Exact statement or passage</summary>
      ${excerpt(text.slice(result.start, result.end), compact ? 280 : 1800)}
      ${button('Open exact source', 'openSource', { entry: entry.id, part: entry.statement ? 'statement' : 'entry' },
        compact ? 'entry-' + entry.id : undefined)}</details>`
    : 'Open the component for its passages.';
  const defaults = [
    resultKinds.has(entry?.kind) ? `<p>What does ${escape(component.title)} establish?</p>` : 'No question recorded.',
    split ? `<p>From the statement</p>${split.hypotheses.map(fragment => excerpt(fragment, compact ? 280 : 1800)).join('')}`
      : 'See the exact statement for the stated conditions.',
    (split ? `<p>From the statement</p>${excerpt(split.conclusion, compact ? 280 : 1800)}`
      : (compact && result ? excerpt(text.slice(result.start, result.end), 280) : '')) + exact,
    nextUse(atlasIndex, component),
  ];
  return `<dl class="summary">${fields.map(([key, label], index) => `<dt>${label}</dt><dd>${component[key]
    ? `<p>${escape(component[key])}</p>` : defaults[index]}</dd>`).join('')}</dl>${component.attribution
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
        ${button('Follow ' + atlasIndex.components.get(target.id).title, 'followEntry', { entry: target.id })}</div>` : ''}
      ${reference.status === 'ambiguous' && reference.candidates?.length ? `<details><summary>Possible targets</summary><ul>${reference.candidates.map(id =>
        `<li>${button(atlasIndex.components.get(id).title, 'openSource', { entry: id, 'return-entry': reference.owner })}</li>`).join('')}</ul></details>` : ''}</li>`;
  }).join('')}</ul>`;
}

function overview(atlas, atlasIndex) {
  const ordered = overviewComponents(atlas);
  const groupable = ordered.filter(component => !component.members);
  return `<ol class="components">${ordered.map(component => {
    const first = atlasIndex.entries.get(component.itemIds[0]);
    const kind = component.members ? `${component.members.length} passages` :
      first.selected ? first.kind : first.candidate ? 'Possible reference target' : 'Referenced or context passage';
    return `<li>
      <h2>${button(component.title, 'selectComponent', { component: component.id }, 'component-' + component.id)}</h2>
      <p class="muted">${escape(kind)}</p>
      ${description(atlas, atlasIndex, component, true)}
    </li>`;
  }).join('')}</ol>
  ${referenceList(atlasIndex.outgoing.get(undefined), atlasIndex)}
  ${groupable.length > 1 ? `<details class="editor"><summary>Group components</summary>
    <form data-change="group">
      <label for="group-title">Group title</label><input id="group-title" name="title" maxlength="240" required>
      <fieldset><legend>Components</legend>
        ${groupable.map(c => `<label class="choice"><input type="checkbox" name="components" value="${escape(c.id)}"> ${escape(c.title)}</label>`).join('')}
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

function citationList(citations, sources, passages, kind) {
  if (!citations?.length) return `<p class="muted">No retained citation for this ${kind}.</p>`;
  return `<ul class="references" aria-label="Cited passages">${citations.map(cite => {
    const source = sources.get(cite.source), passage = passages.get(cite.source);
    const retained = passage?.text?.split(/\r\n|\r|\n/u).slice(cite.start_line - 1, cite.end_line).join('\n');
    const title = escape(source?.title || cite.source);
    const lines = cite.start_line === cite.end_line ? 'line ' + cite.start_line : 'lines ' + cite.start_line + '–' + cite.end_line;
    const label = title + ' · ' + lines;
    return retained ? `<li><details><summary>${label}</summary>${excerpt(retained, 1800)}</details></li>` : `<li>${label}</li>`;
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

function proposalReview(proposal, component, page) {
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
      ${citationList(node.citations, sources, passages, 'claim')}</li>`).join('')}</ol>
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
        ${citationList(rule.citations, sources, passages, 'inference')}
        ${previous ? `<details><summary>Original proposal for this inference</summary>
          <p><strong>Joint premises</strong> ${joint(prior.premises)}</p><p>${escape(prior.explanation?.text)}</p>
          ${attributed(prior.explanation)}${citationList(prior.citations, sources, passages, 'inference')}</details>` : ''}
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
    <label class="choice"><input type="checkbox" data-handoff value="${escape(entry.id)}"> ${escape(atlasIndex.components.get(entry.id).title)}</label>
    ${button('Open statement or passage', 'openSource', { entry: entry.id, part: entry.statement ? 'statement' : 'entry' })}
    ${entry.proof ? button('Open proof', 'openSource', { entry: entry.id, part: 'proof' }) : ''}
    </div>${entry.proof ? `<label class="choice"><input type="checkbox" data-handoff-proof value="${escape(entry.id)}"> Include proof</label>` : ''}</li>`);
  return `<nav class="toolbar" aria-label="Atlas navigation">${button('All components', 'showOverview', { component })}</nav>
    <h1 id="atlas-heading" tabindex="-1">${escape(c.title)}</h1>
    ${description(atlas, atlasIndex, c, false)}
    ${c.members ? `<details><summary>Member components</summary><ol>${c.members.map(id =>
      `<li>${button(atlasIndex.components.get(id).title, 'selectComponent', { component: id })}</li>`).join('')}</ol>
      ${button('Ungroup', 'edit', { edit: 'ungroup', component })}</details>` : ''}
    ${editDescription(atlas, c)}
    <p>Explicit references can guide reading. A reason for an inference must be supplied in an argument.</p>
    <section aria-labelledby="component-evidence"><h2 id="component-evidence">Passages</h2>
      ${pager(detail)}
      <ol start="${detail.first}">${detail.entries.map(entry => `<li><h3>
        ${button('Open exact source for ' + entry.title, 'openSource', { entry: entry.id, part: 'entry' }, 'entry-' + entry.id)}</h3>
        ${entry.partial ? '<p class="muted">The original selection covers part of this passage.</p>' : ''}
        <div class="toolbar">
          ${entry.statement ? button('Open exact statement', 'openSource', { entry: entry.id, part: 'statement' }) : ''}
          ${entry.proof ? button('Open exact proof', 'openSource', { entry: entry.id, part: 'proof' }) : ''}
        </div>
        ${c.members || !entry.statement ? `<details><summary>Source excerpt</summary>${exactPreview(atlas.source.text, entry.statement || entry)}</details>` : ''}
        ${referenceList(atlasIndex.outgoing.get(entry.id), atlasIndex)}
      </li>`).join('')}</ol>
    </section>
    <section aria-labelledby="component-proof"><h2 id="component-proof">Argument</h2>
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
      ${proposalReview(options.proposal, component, page)}
    </section>`;
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
      api.setState({drafts});
    });
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('button[data-type]');
    if (!action) return;
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
  .components { padding-left: 1.5rem; }
  .components > li { border-bottom: 1px solid var(--vscode-panel-border); padding: .15rem 0 1rem; }
  .components h2 button { font-weight: 600; }
  .summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: .35rem 1rem; max-width: 60rem; }
  .summary dt { font-weight: 600; }
  .summary dd { margin: 0; }
  .summary p, .toolbar p { margin: 0; }
  .muted { color: var(--vscode-descriptionForeground); }
  pre { white-space: pre-wrap; background: var(--vscode-textCodeBlock-background);
    padding: .7rem; font-family: var(--vscode-editor-font-family, monospace); }
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
  const main = options.component ? detailView(atlas, atlasIndex, options) :
    `<h1 id="atlas-heading" tabindex="-1">${escape(atlas.source.title)}</h1>${overview(atlas, atlasIndex)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; form-action 'none'; base-uri 'none'">
    <title>Mathematical Atlas</title><style nonce="${nonce}">${styles}</style>
    </head><body data-focus="${escape(options.focus || (options.proposal ? 'proposal-title' : 'atlas-heading'))}"><main>
    <nav class="toolbar" aria-label="Atlas actions">
      ${button('Open exact selection', 'openSource', { part: 'selection' })}
      ${button('Return to source selection', 'return')}
      ${button('Save atlas revision', 'saveAtlas')}
      ${button('Regenerate from source', 'regenerate')}
      ${options.previous ? button('Open earlier revision', 'openPrevious') : ''}
    </nav>
    <p class="muted">${escape(atlas.source.title)} · lines ${origin}–${limit} · revision <code>${escape(atlas.source.revision.slice(0, 12))}</code></p>
    <p role="status" id="atlas-status">${escape(options.notice)}</p>
    ${main}
    ${atlas.extraction.limitations?.length ? `<details><summary>Extraction notes</summary><ul>${atlas.extraction.limitations.map(note => `<li>${escape(note)}</li>`).join('')}</ul></details>` : ''}
    </main><script nonce="${nonce}">${script}</script></body></html>`;
}

module.exports = { atlasHtml };
