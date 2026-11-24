'use strict';

// A view of retained source structure, never an inference or proof checker.
const { validateAtlas, overviewComponents, ownerOf } = require('./atlasModel');

const NODE_WIDTH = 188, NODE_HEIGHT = 66, PAGE_SIZE = 32, MARGIN = 72;
const COLUMN_GAP = 112, ROW_GAP = 64, WRAP_GAP = 44;
const READABLE_SCALE = .75, COMPACT_MARGIN = 20, COMPACT_COLUMN_GAP = 28, COMPACT_ROW_GAP = 20;
const resultKinds = new Set(['theorem', 'lemma', 'proposition', 'corollary', 'claim', 'fact', 'statement']);
const namedKinds = new Set([...resultKinds, 'definition', 'example', 'remark', 'assumption', 'axiom', 'conjecture',
  'notation', 'exercise', 'problem']);
const componentNode = id => `component:${id}`;
const entryNode = (id, part) => `entry:${id}:${part}`;

const isTexAtlas = atlas => ['latex', 'tex'].includes(atlas.source.language);

function visibleAtlasEntries(atlas, showProse) {
  if (!isTexAtlas(atlas) || showProse) return undefined;
  const visible = atlas.extraction.entries.filter(entry => namedKinds.has(entry.kind) && entry.unnumbered !== true ||
    entry.kind === 'equation' && (entry.label || entry.labels?.length) || entry.frontMatter === true);
  // A selection with no named result may be an intentional prose excerpt.
  return visible.length ? new Set(visible.map(entry => entry.id)) : undefined;
}

function componentTitle(component, entry) {
  return entry?.printedTitle && component.title === entry.title
    ? entry.printedTitle : component.title;
}

function sourceNodes(atlas, view, visibleEntries) {
  const entries = new Map(atlas.extraction.entries.map(entry => [entry.id, entry]));
  const components = overviewComponents(atlas), originals = new Map(atlas.components.map(component => [component.id, component]));
  const owner = new Map();
  for (const component of components) for (const id of component.itemIds) owner.set(id, component);
  const nodes = [], main = new Map(), proof = new Map();
  if (view === 'map') {
    for (const component of components) {
      const ids = component.itemIds.filter(id => !visibleEntries || visibleEntries.has(id));
      if (!ids.length) continue;
      const entry = component.itemIds.length === 1 ? entries.get(ids[0]) : undefined;
      const node = { id: componentNode(component.id), title: componentTitle(component, entry), kind: component.members ? 'group' : entry.kind,
        componentId: component.id, entryId: entry?.id ?? null, part: entry?.statement ? 'statement' : 'entry' };
      nodes.push(node);
      for (const id of ids) main.set(id, node.id);
    }
  } else {
    for (const entry of atlas.extraction.entries) {
      if (visibleEntries && !visibleEntries.has(entry.id)) continue;
      const part = entry.statement && entry.kind !== 'proof' ? 'statement' : 'entry';
      const kind = resultKinds.has(entry.kind) && entry.statement ? 'statement' : entry.kind;
      const component = owner.get(entry.id), original = originals.get(entry.id);
      const title = original ? componentTitle(original, entry) : entry.title;
      const node = { id: entryNode(entry.id, part), title, kind, componentId: component.id, entryId: entry.id, part };
      nodes.push(node); main.set(entry.id, node.id);
      if (entry.proof && entry.kind !== 'proof') {
        const argument = { id: entryNode(entry.id, 'proof'), title: `${title} — proof`, kind: 'proof',
          componentId: component.id, entryId: entry.id, part: 'proof' };
        nodes.push(argument); proof.set(entry.id, argument.id);
      }
    }
  }
  return { nodes, main, proof, entries };
}

function sourceEdges(atlas, view, model) {
  const byKey = new Map(), unmappedReferences = [];
  function add(value, reference) {
    const key = JSON.stringify([value.from, value.to, value.kind, value.label]);
    let edge = byKey.get(key);
    if (!edge) { edge = { ...value }; byKey.set(key, edge); }
    if (reference) {
      edge.referenceId ||= reference.id;
      edge.references ||= [];
      edge.references.push(reference.id);
    }
  }
  if (view === 'blueprint') for (const [entry, proof] of model.proof) {
    add({ from: proof, to: model.main.get(entry), kind: 'proof', label: 'proof of' });
  }
  const proofs = atlas.extraction.entries.filter(entry => model.proof.has(entry.id));
  for (const reference of atlas.extraction.references) {
    if (reference.status !== 'resolved') continue;
    const owner = ownerOf(atlas.extraction, reference);
    const provider = model.main.get(reference.target);
    let consumer = model.main.get(owner);
    if (view === 'blueprint') {
      // A narrow equation/paragraph owner inside a proof still cites from that
      // proof. The actual occurrence range, rather than an English label,
      // selects its displayed part.
      const enclosing = proofs.filter(entry => entry.proof.start <= reference.start && reference.end <= entry.proof.end)
        .sort((a, b) => (a.proof.end - a.proof.start) - (b.proof.end - b.proof.start))[0];
      if (enclosing) consumer = model.proof.get(enclosing.id);
    }
    if (!provider || !consumer) { unmappedReferences.push(reference.id); continue; }
    add({ from: provider, to: consumer, kind: 'citation', label: reference.label }, reference);
  }
  return { edges: [...byKey.values()], unmappedReferences };
}

function sourceLevels(nodes, edges) {
  const adjacency = new Map(nodes.map(node => [node.id, []])), reverse = new Map(nodes.map(node => [node.id, []]));
  const order = new Map(nodes.map((node, index) => [node.id, index]));
  const seenEdges = new Set();
  for (const edge of edges) {
    const key = JSON.stringify([edge.from, edge.to]);
    if (seenEdges.has(key)) continue;
    seenEdges.add(key); adjacency.get(edge.from).push(edge.to); reverse.get(edge.to).push(edge.from);
  }
  // Iterative Kosaraju keeps the source limit independent of the JS call stack.
  const visited = new Set(), finish = [];
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    const stack = [{ id: node.id, next: 0 }];
    while (stack.length) {
      const frame = stack.at(-1), neighbours = adjacency.get(frame.id);
      if (frame.next === neighbours.length) { finish.push(frame.id); stack.pop(); continue; }
      const next = neighbours[frame.next++];
      if (!visited.has(next)) { visited.add(next); stack.push({ id: next, next: 0 }); }
    }
  }
  const cluster = new Map(), members = [];
  for (let index = finish.length - 1; index >= 0; index--) {
    const root = finish[index]; if (cluster.has(root)) continue;
    const number = members.length, group = [], stack = [root]; cluster.set(root, number);
    while (stack.length) {
      const id = stack.pop(); group.push(id);
      for (const prior of reverse.get(id)) if (!cluster.has(prior)) { cluster.set(prior, number); stack.push(prior); }
    }
    group.sort((a, b) => order.get(a) - order.get(b)); members.push(group);
  }
  const children = members.map(() => new Set()), indegree = members.map(() => 0), rank = members.map(() => 0);
  for (const edge of edges) {
    const from = cluster.get(edge.from), to = cluster.get(edge.to);
    if (from !== to && !children[from].has(to)) { children[from].add(to); indegree[to]++; }
  }
  const queue = members.map((_, index) => index).filter(index => indegree[index] === 0)
    .sort((a, b) => order.get(members[a][0]) - order.get(members[b][0]));
  for (let at = 0; at < queue.length; at++) {
    const from = queue[at];
    for (const to of children[from]) {
      rank[to] = Math.max(rank[to], rank[from] + 1);
      if (--indegree[to] === 0) queue.push(to);
    }
  }
  return new Map(nodes.map(node => [node.id, rank[cluster.get(node.id)]]));
}

function diagramGeometry(columns, gridCount, gridColumns, rankColumns) {
  const lanes = [];
  for (let index = 0; index < columns.length; index += rankColumns) {
    const groups = columns.slice(index, index + rankColumns);
    const rows = Math.max(...groups.map(group => group.length));
    lanes.push({ groups, rows, height: rows * NODE_HEIGHT + (rows - 1) * ROW_GAP });
  }
  const rankWidth = lanes.length ? 2 * MARGIN + rankColumns * NODE_WIDTH + (rankColumns - 1) * COLUMN_GAP : 0;
  const rankHeight = lanes.length ? 2 * MARGIN + lanes.reduce((sum, lane) => sum + lane.height, 0) + (lanes.length - 1) * WRAP_GAP : 0;
  const gridRows = Math.ceil(gridCount / gridColumns);
  const gridTop = rankHeight ? rankHeight + ROW_GAP : MARGIN;
  const gridWidth = gridCount ? 2 * MARGIN + gridColumns * NODE_WIDTH + (gridColumns - 1) * 36 : 0;
  const height = gridCount ? gridTop + gridRows * NODE_HEIGHT + (gridRows - 1) * 28 + MARGIN : rankHeight;
  return { lanes, rankColumns, gridColumns, gridTop, height, width: Math.max(rankWidth, gridWidth, 2 * MARGIN + NODE_WIDTH) };
}

function place(nodes, viewport) {
  const groups = new Map(), isolated = [];
  for (const node of nodes) {
    if (node.rank === undefined) { isolated.push(node); continue; }
    if (!groups.has(node.rank)) groups.set(node.rank, []);
    groups.get(node.rank).push(node);
  }
  const columns = [...groups.keys()].sort((a, b) => a - b).map(rank => groups.get(rank));
  const maxRanks = Math.max(1, columns.length);
  const maxGrid = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(isolated.length))));
  let layout = diagramGeometry(columns, isolated.length, maxGrid, maxRanks);
  if (viewport) {
    const scale = ({ width, height }) => Math.min(1.15, (viewport.width - 40) / width, (viewport.height - 40) / height);
    const candidates = [];
    for (let rankCount = 1; rankCount <= maxRanks; rankCount++) {
      for (let gridCount = 1; gridCount <= maxGrid; gridCount++) {
        const candidate = diagramGeometry(columns, isolated.length, gridCount, rankCount);
        candidates.push({ candidate, scale: scale(candidate) });
      }
    }
    const bestScale = Math.max(...candidates.map(choice => choice.scale));
    // Use wider rows when they remain nearly as legible. This avoids turning a
    // short argument into a single tall column just to gain a few percent.
    const minimum = bestScale >= .8 ? Math.max(.8, bestScale - .1) : bestScale;
    layout = candidates.findLast(choice => choice.scale >= minimum).candidate;
  }

  // Alternate row direction so adjacent ranks on either side of a wrap sit
  // across a vertical gap. Branches at the same rank stay together.
  let top = MARGIN;
  for (const [laneIndex, lane] of layout.lanes.entries()) {
    for (const [index, group] of lane.groups.entries()) {
      const column = laneIndex % 2 ? layout.rankColumns - 1 - index : index;
      const offset = (lane.rows - group.length) * (NODE_HEIGHT + ROW_GAP) / 2;
      for (const [row, node] of group.entries()) {
        node.x = MARGIN + column * (NODE_WIDTH + COLUMN_GAP);
        node.y = top + offset + row * (NODE_HEIGHT + ROW_GAP);
      }
    }
    top += lane.height + WRAP_GAP;
  }
  for (const [index, node] of isolated.entries()) {
    node.x = MARGIN + index % layout.gridColumns * (NODE_WIDTH + 36);
    node.y = layout.gridTop + Math.floor(index / layout.gridColumns) * (NODE_HEIGHT + 28);
  }
  const { width, height, rankColumns, gridColumns } = layout;
  return { width, height, layoutColumns: `${rankColumns}:${gridColumns}` };
}

function fitAtlasDiagram(diagram, viewport) {
  const nodes = diagram.nodes.map(node => ({ ...node }));
  return { ...diagram, nodes, ...place(nodes, viewport) };
}

const fittingScale = ({ width, height }, viewport) =>
  Math.min(1.15, (viewport.width - 40) / width, (viewport.height - 40) / height);

function compactCapacity(viewport) {
  const columns = Math.max(1, Math.floor(((viewport.width - 40) / READABLE_SCALE -
    2 * COMPACT_MARGIN + COMPACT_COLUMN_GAP) / (NODE_WIDTH + COMPACT_COLUMN_GAP)));
  const rows = Math.max(1, Math.floor(((viewport.height - 40) / READABLE_SCALE -
    2 * COMPACT_MARGIN + COMPACT_ROW_GAP) / (NODE_HEIGHT + COMPACT_ROW_GAP)));
  return Math.min(PAGE_SIZE, columns * rows);
}

function compactPlace(nodes, viewport) {
  let layout, best = 0;
  for (let columns = 1; columns <= Math.max(nodes.length, 1); columns++) {
    const rows = Math.max(1, Math.ceil(nodes.length / columns));
    const shape = { width: 2 * COMPACT_MARGIN + columns * NODE_WIDTH + (columns - 1) * COMPACT_COLUMN_GAP,
      height: 2 * COMPACT_MARGIN + rows * NODE_HEIGHT + (rows - 1) * COMPACT_ROW_GAP };
    const scale = fittingScale(shape, viewport);
    if (scale > best || !layout) { layout = { ...shape, columns }; best = scale; }
  }
  for (const [index, node] of nodes.entries()) {
    node.x = COMPACT_MARGIN + index % layout.columns * (NODE_WIDTH + COMPACT_COLUMN_GAP);
    node.y = COMPACT_MARGIN + Math.floor(index / layout.columns) * (NODE_HEIGHT + COMPACT_ROW_GAP);
  }
  return { width: layout.width, height: layout.height, layoutColumns: 'compact:' + layout.columns };
}

function atlasDiagram(atlas, view, options = {}) {
  validateAtlas(atlas);
  if (!['map', 'blueprint'].includes(view)) throw new Error('Choose Proof map or Blueprint.');
  const visibleEntries = visibleAtlasEntries(atlas, options.showProse);
  const model = sourceNodes(atlas, view, visibleEntries), links = sourceEdges(atlas, view, model);
  const readable = !!options.readable && isTexAtlas(atlas);
  const viewport = options.viewport || (readable ? { width: 760, height: 460 } : undefined);
  const capacity = readable ? compactCapacity(viewport) : PAGE_SIZE;
  const explicitPage = Object.hasOwn(options, 'page');
  const selectedEntry = atlas.extraction.entries.find(entry => entry.selected && model.main.has(entry.id));
  const desired = model.nodes.some(node => node.id === options.selected) ? options.selected :
    !explicitPage && selectedEntry ? model.main.get(selectedEntry.id) : undefined;
  const at = model.nodes.findIndex(node => node.id === desired);
  const page = explicitPage ? options.page : at >= 0 ? Math.floor(at / capacity) : 0;
  const total = model.nodes.length, pageCount = Math.max(1, Math.ceil(total / capacity));
  const index = Number.isSafeInteger(page) ? Math.min(Math.max(0, page), pageCount - 1) : 0;
  const nodes = model.nodes.slice(index * capacity, (index + 1) * capacity);
  const visible = new Set(nodes.map(node => node.id)), nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const nodePages = new Map(model.nodes.map((node, at) => [node.id, Math.floor(at / capacity)]));
  const edges = links.edges.filter(edge => visible.has(edge.from) && visible.has(edge.to));
  const omitted = { incoming: 0, outgoing: 0 }, boundaryEdges = [];
  for (const edge of links.edges) {
    const from = visible.has(edge.from), to = visible.has(edge.to);
    if (from === to) continue;
    if (to) omitted.incoming++; else omitted.outgoing++;
    boundaryEdges.push({ ...edge, fromTitle: nodeById.get(edge.from).title, toTitle: nodeById.get(edge.to).title,
      fromPage: nodePages.get(edge.from), toPage: nodePages.get(edge.to) });
  }
  const incident = new Set(links.edges.flatMap(edge => [edge.from, edge.to]));
  const levels = sourceLevels(model.nodes, links.edges);
  for (const node of nodes) if (incident.has(node.id)) node.rank = levels.get(node.id);
  const ranked = place(nodes, viewport);
  const dimensions = readable && fittingScale(ranked, viewport) < READABLE_SCALE ? compactPlace(nodes, viewport) : ranked;
  return { nodes, edges, ...dimensions, page: index, pageCount, total,
    ...(readable ? { minimumScale: READABLE_SCALE } : {}),
    selected: visible.has(desired) ? desired : nodes[0]?.id ?? null, omitted, boundaryEdges,
    unresolved: atlas.extraction.references.filter(reference => reference.status !== 'resolved').map(reference => reference.id),
    unmappedReferences: links.unmappedReferences };
}

module.exports = { atlasDiagram, fitAtlasDiagram, visibleAtlasEntries, componentTitle, isTexAtlas,
  NODE_WIDTH, NODE_HEIGHT, PAGE_SIZE, MARGIN };
