'use strict';

// Presentation only: the bounded atlas diagram model supplies nodes, edges and
// positions. Source strings enter through escaped text/attributes, never code.
const { createHash } = require('node:crypto');
const { NODE_WIDTH, NODE_HEIGHT } = require('./atlasDiagram');
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const short = (value, length) => {
  const text = Array.from(String(value ?? ''));
  return text.length > length ? text.slice(0, length - 1).join('') + '…' : text.join('');
};

function edgePath(from, to) {
  const ax = finite(from.x) + NODE_WIDTH / 2, ay = finite(from.y) + NODE_HEIGHT / 2;
  const bx = finite(to.x) + NODE_WIDTH / 2, by = finite(to.y) + NODE_HEIGHT / 2;
  if (from.id === to.id) return `M ${ax + NODE_WIDTH / 2} ${ay} C ${ax + NODE_WIDTH / 2 + 62} ${ay} ${ax + NODE_WIDTH / 2 + 62} ${ay - 80} ${ax} ${ay - NODE_HEIGHT / 2}`;
  let sx, sy, tx, ty, curve;
  if (Math.abs(by - ay) > Math.abs(bx - ax) / 2) {
    const direction = by >= ay ? 1 : -1;
    sx = ax; sy = ay + direction * NODE_HEIGHT / 2;
    tx = bx; ty = by - direction * NODE_HEIGHT / 2;
    curve = `C ${sx} ${(sy + ty) / 2} ${tx} ${(sy + ty) / 2} ${tx} ${ty}`;
  } else {
    const direction = bx >= ax ? 1 : -1;
    sx = ax + direction * NODE_WIDTH / 2; sy = ay;
    tx = bx - direction * NODE_WIDTH / 2; ty = by;
    curve = `C ${(sx + tx) / 2} ${sy} ${(sx + tx) / 2} ${ty} ${tx} ${ty}`;
  }
  return `M ${sx} ${sy} ${curve}`;
}

function diagramHtml(atlas, index, options, render) {
  const { escape, button, exactPreview, description, referenceList, entryLabel } = render;
  const diagram = options.diagram;
  if (!diagram) return '';
  const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = (diagram.edges || []).filter(edge => byId.has(edge.from) && byId.has(edge.to));
  const arcs = new Map();
  for (const edge of edges) {
    const key = JSON.stringify([edge.from,edge.to,edge.kind]);
    if (!arcs.has(key)) arcs.set(key,{...edge,labels:[]});
    if (edge.label && !arcs.get(key).labels.includes(edge.label)) arcs.get(key).labels.push(edge.label);
  }
  const occurrenceButtons = edge => {
    const ids = edge.references?.length ? edge.references : edge.referenceId ? [edge.referenceId] : [];
    return ids.map((id,index) => button(ids.length === 1 ? 'Open reference occurrence' : 'Open reference occurrence ' + (index + 1), 'openSource', {reference:id})).join('');
  };
  const boundary = Array.isArray(diagram.boundaryEdges) ? diagram.boundaryEdges : [];
  const selected = byId.get(typeof diagram.selected === 'object' ? diagram.selected?.id : diagram.selected) || nodes[0];
  const width = Math.max(NODE_WIDTH + 24, finite(diagram.width, NODE_WIDTH + 24));
  const height = Math.max(NODE_HEIGHT + 24, finite(diagram.height, NODE_HEIGHT + 24));
  const label = options.view === 'blueprint' ? 'Blueprint' : 'Proof map';
  const layout = createHash('sha256').update(JSON.stringify([width,height,nodes.map(node=>[node.id,node.x,node.y])])).digest('hex').slice(0,16);
  const adjacent = selected ? edges.filter(edge => edge.from === selected.id || edge.to === selected.id) : [];
  const selectedBoundary = selected ? boundary.filter(edge => edge.from === selected.id || edge.to === selected.id) : [];
  const component = selected && index.components.get(selected.componentId);
  const entry = selected && index.entries.get(selected.entryId || (component?.itemIds.length === 1 ? component.itemIds[0] : undefined));
  const part = selected?.part || (entry?.statement ? 'statement' : 'entry');
  const span = part === 'proof' ? entry?.proof : part === 'statement' ? entry?.statement : entry;
  const page = Number.isSafeInteger(diagram.page) ? diagram.page : 0;
  const pages = Math.max(1, Number.isSafeInteger(diagram.pageCount) ? diagram.pageCount : 1);
  return `<section class="atlas-diagram" id="atlas-diagram" tabindex="-1" aria-label="${label}" data-diagram data-view="${escape(options.view)}" data-width="${width}" data-height="${height}" data-page="${page}" data-layout="${layout}"${diagram.minimumScale ? ` data-readable="${finite(diagram.minimumScale)}"` : ''}>
    <div class="diagram-topbar">
      <p class="muted">${options.view === 'blueprint' ? 'Source relationships · Lean dependencies not available' : 'Components and their explicit references'}. Arrows do not certify an inference.</p>
      <div class="diagram-controls" role="group" aria-label="Diagram viewport">
        <button type="button" data-diagram-action="out" aria-label="Zoom out">−</button>
        <button type="button" data-diagram-action="fit">Fit</button>
        <button type="button" data-diagram-action="in" aria-label="Zoom in">+</button>
        <span data-diagram-scale aria-live="polite">100%</span>
      </div>
    </div>
    ${pages > 1 ? `<nav class="diagram-pages" aria-label="Diagram pages">${page > 0 ? button('Previous diagram page', 'showDiagramPage', { page: page - 1 }) : ''}<span>Page ${page + 1} of ${pages} · ${nodes.length} of ${escape(diagram.total)} nodes</span>${page + 1 < pages ? button('Next diagram page', 'showDiagramPage', { page: page + 1 }) : ''}</nav>` : ''}
    <p class="diagram-legend muted"><span>Cited passage → citing passage</span>${options.view === 'blueprint' ? '<span class="proof">Proof passage → statement</span>' : ''}</p>
    <div class="diagram-layout">
      <div class="diagram-viewport" data-diagram-viewport tabindex="0" aria-label="${label}. Drag empty space to pan. Use Ctrl+wheel or plus and minus to zoom, zero to fit. Tab reaches nodes; arrow keys move among them.">
        <div class="diagram-layer" data-diagram-layer>
          <svg class="diagram-edges" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
            <defs><marker id="atlas-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 9 4.5 L 0 9 z"/></marker><marker id="atlas-proof-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 9 4.5 L 0 9 z"/></marker></defs>
            ${[...arcs.values()].map(edge => {
              const path = edgePath(byId.get(edge.from), byId.get(edge.to));
              const selectedEdge = selected && (edge.from === selected.id || edge.to === selected.id);
              const label = edge.labels.join(' · ');
              return `<g class="diagram-edge${selectedEdge ? ' is-related' : ''}" data-kind="${escape(edge.kind)}"><title>${escape(byId.get(edge.from).title)} → ${escape(byId.get(edge.to).title)}: ${escape(short(label || edge.kind, 500))}</title><path d="${path}" data-relation="${escape(edge.kind === 'proof-of' ? 'proof' : edge.kind)}" marker-end="url(#${edge.kind === 'citation' ? 'atlas-arrow' : 'atlas-proof-arrow'})"/></g>`;
            }).join('')}
          </svg>
          ${nodes.map((node, position) => `<button type="button" class="diagram-node diagram-position-${position}${node.id === selected?.id ? ' is-selected' : ''}${adjacent.some(edge => edge.from === node.id || edge.to === node.id) ? ' is-related' : ''}" id="diagram-node-${escape(node.id)}" data-type="selectNode" data-node="${escape(node.id)}" data-x="${finite(node.x)}" data-y="${finite(node.y)}" aria-pressed="${node.id === selected?.id}" title="${escape(node.title)}"><span class="diagram-kind">${escape(node.kind || 'component')}</span><span class="diagram-title">${escape(short(node.title, 66))}</span></button>`).join('')}
        </div>
        ${nodes.length ? '' : '<p class="diagram-empty">No components are available for this diagram. The Reading list retains the extracted passages.</p>'}
      </div>
      <aside class="diagram-inspector" aria-label="Selected diagram node">
        ${selected ? `<p class="diagram-kind">${escape(selected.kind || 'component')}</p><h2>${escape(selected.title)}</h2>
          ${entryLabel(entry)}
          <div class="toolbar">${component ? button('Open component', 'selectComponent', { component: component.id, entry:entry?.id }) : ''}${entry && span ? button(part === 'proof' ? 'Open exact proof' : part === 'statement' ? 'Open exact statement' : 'Open exact passage', 'openSource', { entry: entry.id, part }) : ''}</div>
          ${span ? `<details open><summary>Exact ${part === 'proof' ? 'proof passage' : part === 'statement' ? 'statement' : 'source passage'}</summary>${exactPreview(atlas.source.text, span, atlas.source.language, undefined, index.tex)}</details>` : '<p class="muted">Open the component to inspect its individual source passages.</p>'}
          ${component ? `<details><summary>Component description</summary>${description(atlas, index, component, true)}</details>` : ''}
          ${adjacent.length ? `<details open><summary>Connections (${adjacent.length})</summary><ul class="diagram-connections">${adjacent.map(edge => {
            const other = byId.get(edge.from === selected.id ? edge.to : edge.from);
            return `<li><p class="muted">${escape(edge.from === selected.id ? 'To' : 'From')} · ${escape(edge.label || edge.kind || 'reference')}</p>${button(other.title, 'selectNode', { node: other.id })}${occurrenceButtons(edge)}</li>`;
          }).join('')}</ul></details>` : '<p class="muted">No connections are shown on this page.</p>'}
          ${selectedBoundary.length ? `<details open><summary>Connections on other pages (${selectedBoundary.length})</summary><ul class="diagram-connections">${selectedBoundary.map(edge => {
            const outgoing = edge.from === selected.id;
            return `<li><p class="muted">${escape(outgoing ? 'To' : 'From')} · ${escape(edge.label || edge.kind || 'reference')}</p><p>${escape(outgoing ? edge.toTitle : edge.fromTitle)}</p><div class="toolbar">${button('Show diagram page ' + ((outgoing ? edge.toPage : edge.fromPage) + 1), 'showDiagramPage', {page:outgoing ? edge.toPage : edge.fromPage,node:outgoing ? edge.to : edge.from})}${occurrenceButtons(edge)}</div></li>`;
          }).join('')}</ul></details>` : ''}
          ${entry ? referenceList(index.outgoing.get(entry.id), index) : ''}` : '<p>Select a node to inspect its exact source and connections.</p>'}
      </aside>
    </div>
    <p class="diagram-help muted">Drag the background to pan · Ctrl+wheel or + / − to zoom · 0 fits · arrow keys move between focused nodes. The Reading list provides the source links.</p>
  </section>`;
}

const diagramStyles = `
  main.diagram-main { max-width: none; padding: 1rem 1.2rem; }
  .atlas-view-tabs { display: flex; gap: .3rem; border-bottom: 1px solid var(--vscode-panel-border); margin: .7rem 0; padding-bottom: .4rem; }
  .atlas-view-tabs button[aria-pressed="true"] { color: var(--vscode-tab-activeForeground, var(--vscode-editor-foreground)); background: var(--vscode-tab-activeBackground, var(--vscode-editor-background)); border-bottom: 3px solid var(--vscode-focusBorder); }
  .atlas-view-tabs button { margin: 0; padding: .4rem .8rem; }
  .atlas-diagram { margin-top: .5rem; }
  .diagram-topbar, .diagram-pages { display: flex; align-items: center; justify-content: space-between; gap: .8rem; flex-wrap: wrap; }
  .diagram-controls { display: flex; align-items: center; white-space: nowrap; gap: .15rem; }
  .diagram-controls button { min-width: 2.1rem; }
  .diagram-controls [data-diagram-scale] { min-width: 3.6rem; text-align: right; color: var(--vscode-descriptionForeground); font-variant-numeric: tabular-nums; }
  .diagram-pages { margin: .25rem 0 .5rem; justify-content: center; }
  .diagram-layout { display: grid; grid-template-columns: minmax(22rem, 1fr) minmax(18rem, 26rem); border: 1px solid var(--vscode-panel-border); border-radius: 4px; overflow: hidden; margin-top: .65rem; }
  .diagram-viewport { min-height: 29rem; height: min(64vh, 46rem); position: relative; overflow: hidden; cursor: grab; background: var(--vscode-editor-background); outline-offset: -3px; touch-action: none; }
  .diagram-viewport:active { cursor: grabbing; }
  .diagram-viewport:focus-visible { outline: 2px solid var(--vscode-focusBorder); }
  .diagram-layer { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
  .diagram-edges { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
  .diagram-edges marker path { fill: var(--vscode-charts-blue, var(--vscode-editor-foreground)); }
  .diagram-edge > path { fill: none; stroke: var(--vscode-descriptionForeground); stroke-width: 1.5; opacity: .72; }
  .diagram-edge[data-kind="proof"] > path, .diagram-edge[data-kind="proof-of"] > path { stroke-dasharray: 6 4; stroke: var(--vscode-charts-green, var(--vscode-descriptionForeground)); }
  .diagram-edges #atlas-proof-arrow path { fill: var(--vscode-charts-green, var(--vscode-descriptionForeground)); }
  .diagram-edge.is-related > path { stroke: var(--vscode-charts-blue, var(--vscode-focusBorder)); opacity: 1; stroke-width: 2; }
  .diagram-node { position: absolute; width: 188px; height: 66px; margin: 0; padding: 7px 10px; text-align: left; overflow: hidden; display: flex; flex-direction: column; gap: 3px; border-radius: 4px; color: var(--vscode-editor-foreground); background: var(--vscode-sideBar-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-panel-border, var(--vscode-descriptionForeground)); box-shadow: 0 1px 3px var(--vscode-widget-shadow); }
  .diagram-node:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-descriptionForeground); }
  .diagram-node.is-related { border-color: var(--vscode-charts-blue, var(--vscode-focusBorder)); }
  .diagram-node.is-selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); border: 2px solid var(--vscode-focusBorder); padding: 6px 9px; }
  .diagram-node:focus-visible { outline: 3px solid var(--vscode-focusBorder); outline-offset: 3px; }
  .diagram-kind { display: block; font-size: .78em; text-transform: uppercase; letter-spacing: .04em; color: var(--vscode-descriptionForeground); }
  .diagram-node.is-selected .diagram-kind { color: inherit; }
  .diagram-title { line-height: 1.2; font-weight: 600; max-height: 2.4em; overflow: hidden; }
  .diagram-inspector { min-width: 0; border-left: 1px solid var(--vscode-panel-border); padding: .8rem 1rem; max-height: min(64vh, 46rem); overflow: auto; overflow-wrap: anywhere; }
  .diagram-inspector h2 { margin-top: .25rem; font-size: 1.2em; }
  .diagram-inspector pre { font-size: .9em; max-height: 20rem; overflow: auto; margin-top: .5rem; }
  .diagram-inspector .summary { grid-template-columns: 1fr; gap: .4rem; }
  .diagram-connections { list-style: none; margin: .3rem 0; padding: 0; }
  .diagram-connections li { margin: .55rem 0; }
  .diagram-connections button { margin-left: 0; text-align: left; max-width: 100%; }
  .diagram-legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: .88em; }
  .diagram-legend span::before { content: ""; display: inline-block; width: 2rem; border-top: 2px solid var(--vscode-charts-blue, var(--vscode-descriptionForeground)); margin-right: .45rem; vertical-align: middle; }
  .diagram-legend .proof::before { border-top-style: dashed; border-color: var(--vscode-charts-green, var(--vscode-descriptionForeground)); }
  .diagram-help { margin-top: .45rem; font-size: .9em; }
  .diagram-empty { padding: 1rem; }
  body.vscode-high-contrast .diagram-node, body.vscode-high-contrast-light .diagram-node { border-color: var(--vscode-contrastBorder); }
  body.vscode-high-contrast .diagram-node.is-selected, body.vscode-high-contrast-light .diagram-node.is-selected { outline: 2px solid var(--vscode-focusBorder); }
  @media (max-width: 72rem) {
    .atlas-diagram[data-readable] .diagram-layout { grid-template-columns: 1fr; }
    .atlas-diagram[data-readable] .diagram-inspector { border-left: 0; border-top: 1px solid var(--vscode-panel-border); }
  }
  @media (max-width: 56rem) { .diagram-layout { grid-template-columns: 1fr; } .diagram-viewport { height: 27rem; min-height: 24rem; } .diagram-inspector { border-left: 0; border-top: 1px solid var(--vscode-panel-border); max-height: 28rem; } }
`;

// One fixed controller; diagram state is scoped by the view and captured source.
const diagramScript = String.raw`
  const diagramRoot = document.querySelector('[data-diagram]');
  if (diagramRoot) {
    const viewport = diagramRoot.querySelector('[data-diagram-viewport]');
    const layer = diagramRoot.querySelector('[data-diagram-layer]');
    const meter = diagramRoot.querySelector('[data-diagram-scale]');
    const stateKey = document.body.dataset.capture + ':' + diagramRoot.dataset.view + ':' + diagramRoot.dataset.page + ':' + diagramRoot.dataset.layout;
    const viewports = stored.viewports || {};
    let scale = 1, x = 0, y = 0, drag, mode = 'fit';
    let layoutQueued = false, sentLayoutSize;
    const notifyFitLayout = () => {
      const send = () => {
        layoutQueued = false;
        if (mode !== 'fit' || drag) return;
        const width = viewport.clientWidth, height = viewport.clientHeight;
        if (width <= 40 || height <= 40) return;
        const size = width + ':' + height;
        if (size === sentLayoutSize) return;
        sentLayoutSize = size;
        api.postMessage({type:'fitDiagramLayout',view:diagramRoot.dataset.view,width,height,focus:document.activeElement?.id});
      };
      if (layoutQueued) return;
      layoutQueued = true;
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(send); else send();
    };
    const saveViewport = () => {
      viewports[stateKey] = {scale, x, y, mode};
      for (const key of Object.keys(viewports).slice(0, -12)) delete viewports[key];
      api.setState({...api.getState(), viewports});
    };
    const paint = () => {
      layer.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
      meter.textContent = Math.round(scale * 100) + '%';
    };
    const fit = () => {
      // A hidden or not-yet-laid-out webview gets its first fit on resize.
      if (viewport.clientWidth <= 40 || viewport.clientHeight <= 40) return;
      const width = Number(diagramRoot.dataset.width), height = Number(diagramRoot.dataset.height);
      const minimum = Number(diagramRoot.dataset.readable) || 0;
      scale = Math.max(minimum, Math.min(1.15, (viewport.clientWidth - 40) / width, (viewport.clientHeight - 40) / height));
      mode = 'fit';
      x = Math.max(0, (viewport.clientWidth - width * scale) / 2);
      y = Math.max(0, (viewport.clientHeight - height * scale) / 2);
      paint(); saveViewport(); notifyFitLayout();
    };
    const zoom = (factor, px = viewport.clientWidth / 2, py = viewport.clientHeight / 2) => {
      const next = Math.min(2.5, Math.max(.01, scale * factor));
      x = px - (px - x) * next / scale; y = py - (py - y) * next / scale; scale = next;
      mode = 'manual';
      paint(); saveViewport();
    };
    const reveal = node => {
      const left = Number(node.dataset.x), top = Number(node.dataset.y);
      if (x + left * scale < 5 || x + (left + 188) * scale > viewport.clientWidth - 5 || y + top * scale < 5 || y + (top + 66) * scale > viewport.clientHeight - 5) {
        x = viewport.clientWidth / 2 - (left + 94) * scale; y = viewport.clientHeight / 2 - (top + 33) * scale; mode = 'manual'; paint(); saveViewport();
      }
    };
    const saved = viewports[stateKey];
    // Older cameras do not distinguish the clipped automatic 80% framing from
    // user movement. Refit those once; keep explicitly adjusted new cameras.
    if (saved?.mode === 'manual' && [saved.scale,saved.x,saved.y].every(Number.isFinite) && saved.scale > 0 && saved.scale <= 2.5) {
      ({scale,x,y,mode} = saved); paint();
    } else fit();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => { if (mode === 'fit' && !drag) fit(); }).observe(viewport);
    }
    diagramRoot.querySelectorAll('[data-diagram-action]').forEach(control => control.addEventListener('click', () => {
      if (control.dataset.diagramAction === 'fit') fit(); else zoom(control.dataset.diagramAction === 'in' ? 1.25 : .8);
    }));
    viewport.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top);
    }, {passive:false});
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      drag = {clientX:event.clientX,clientY:event.clientY,x,y}; viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!drag) return;
      const nextX = drag.x + event.clientX - drag.clientX, nextY = drag.y + event.clientY - drag.clientY;
      if (nextX === x && nextY === y) return;
      x = nextX; y = nextY; mode = 'manual'; paint();
    });
    const release = () => {if (drag) {drag = undefined; if (mode === 'fit') fit(); else saveViewport();}};
    viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
    viewport.addEventListener('focusin', event => {const node = event.target.closest('.diagram-node'); if (node) reveal(node);});
    viewport.addEventListener('keydown', event => {
      if (event.key === '+' || event.key === '=') {event.preventDefault(); zoom(1.25); return;}
      if (event.key === '-') {event.preventDefault(); zoom(.8); return;}
      if (event.key === '0') {event.preventDefault(); fit(); return;}
      const node = event.target.closest('.diagram-node');
      if (!node || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      const nodes = [...viewport.querySelectorAll('.diagram-node')];
      let next;
      if (event.key === 'Home' || event.key === 'End') next = event.key === 'Home' ? nodes[0] : nodes[nodes.length - 1];
      else {
        const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const coordinate = horizontal ? 'x' : 'y', other = horizontal ? 'y' : 'x';
        next = nodes.filter(candidate => candidate !== node && (Number(candidate.dataset[coordinate]) - Number(node.dataset[coordinate])) * (positive ? 1 : -1) > 0)
          .sort((a,b) => Math.abs(Number(a.dataset[coordinate]) - Number(node.dataset[coordinate])) + Math.abs(Number(a.dataset[other]) - Number(node.dataset[other])) * 2 - Math.abs(Number(b.dataset[coordinate]) - Number(node.dataset[coordinate])) - Math.abs(Number(b.dataset[other]) - Number(node.dataset[other])) * 2)[0];
      }
      if (next) {event.preventDefault(); next.focus(); reveal(next);}
    });
    // A source Return can target a node outside the former viewport.
    const target = document.getElementById(document.body.dataset.focus);
    if (target?.classList.contains('diagram-node')) reveal(target);
  }
`;

function diagramPositionStyles(diagram) {
  if (!diagram) return '';
  return `.diagram-layer { width: ${Math.max(NODE_WIDTH + 24, finite(diagram.width, NODE_WIDTH + 24))}px; height: ${Math.max(NODE_HEIGHT + 24, finite(diagram.height, NODE_HEIGHT + 24))}px; }` +
    (diagram.nodes || []).map((node, index) => `.diagram-position-${index} { left: ${finite(node.x)}px; top: ${finite(node.y)}px; }`).join('\n');
}

module.exports = { diagramHtml, diagramStyles, diagramScript, diagramPositionStyles, edgePath };
