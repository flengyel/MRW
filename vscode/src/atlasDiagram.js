'use strict';

// A view of retained source structure, never an inference or proof checker.
const { validateAtlas, overviewComponents, ownerOf } = require('./atlasModel');

const NODE_WIDTH = 188, NODE_HEIGHT = 66, PAGE_SIZE = 32, MARGIN = 72;
const COLUMN_GAP = 112, ROW_GAP = 64;
const resultKinds = new Set(['theorem', 'lemma', 'proposition', 'corollary', 'claim', 'fact', 'statement']);
const componentNode = id => `component:${id}`;
const entryNode = (id, part) => `entry:${id}:${part}`;

function sourceNodes(atlas, view) {
  const entries = new Map(atlas.extraction.entries.map(entry => [entry.id, entry]));
  const components = overviewComponents(atlas), originals = new Map(atlas.components.map(component => [component.id, component]));
  const owner = new Map();
  for (const component of components) for (const id of component.itemIds) owner.set(id, component);
  const nodes = [], main = new Map(), proof = new Map();
  if (view === 'map') {
    for (const component of components) {
      const entry = component.itemIds.length === 1 ? entries.get(component.itemIds[0]) : undefined;
      const node = { id: componentNode(component.id), title: component.title, kind: component.members ? 'group' : entry.kind,
        componentId: component.id, entryId: entry?.id ?? null, part: entry?.statement ? 'statement' : 'entry' };
      nodes.push(node);
      for (const id of component.itemIds) main.set(id, node.id);
    }
  } else {
    for (const entry of atlas.extraction.entries) {
      const part = entry.statement && entry.kind !== 'proof' ? 'statement' : 'entry';
      const kind = resultKinds.has(entry.kind) && entry.statement ? 'statement' : entry.kind;
      const component = owner.get(entry.id), title = originals.get(entry.id)?.title || entry.title;
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

function place(nodes, levels, incident) {
  const connected = nodes.filter(node => incident.has(node.id)), isolated = nodes.filter(node => !incident.has(node.id));
  const ranks = [...new Set(connected.map(node => levels.get(node.id)))].sort((a, b) => a - b);
  const columns = ranks.map(rank => connected.filter(node => levels.get(node.id) === rank));
  const rows = Math.max(1, ...columns.map(column => column.length));
  let height = connected.length ? 2 * MARGIN + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP : 0;
  let width = connected.length ? 2 * MARGIN + ranks.length * NODE_WIDTH + Math.max(0, ranks.length - 1) * COLUMN_GAP : 0;
  for (let column = 0; column < columns.length; column++) {
    const group = columns[column], offset = (rows - group.length) * (NODE_HEIGHT + ROW_GAP) / 2;
    for (let row = 0; row < group.length; row++) {
      group[row].x = MARGIN + column * (NODE_WIDTH + COLUMN_GAP);
      group[row].y = MARGIN + offset + row * (NODE_HEIGHT + ROW_GAP);
    }
  }
  if (isolated.length) {
    // Absence of a source relation is not a long dependency chain. Keep such
    // entries in a compact reading grid, separate from the evidenced ranks.
    const columns = Math.min(4, Math.ceil(Math.sqrt(isolated.length))), rows = Math.ceil(isolated.length / columns);
    const top = connected.length ? height + ROW_GAP : MARGIN, gapX = 36, gapY = 28;
    for (let index = 0; index < isolated.length; index++) {
      isolated[index].x = MARGIN + index % columns * (NODE_WIDTH + gapX);
      isolated[index].y = top + Math.floor(index / columns) * (NODE_HEIGHT + gapY);
    }
    width = Math.max(width, 2 * MARGIN + columns * NODE_WIDTH + (columns - 1) * gapX);
    height = top + rows * NODE_HEIGHT + (rows - 1) * gapY + MARGIN;
  }
  return { width: Math.max(2 * MARGIN + NODE_WIDTH, width), height };
}

function atlasDiagram(atlas, view, options = {}) {
  validateAtlas(atlas);
  if (!['map', 'blueprint'].includes(view)) throw new Error('Choose Proof map or Blueprint.');
  const model = sourceNodes(atlas, view), links = sourceEdges(atlas, view, model);
  const explicitPage = Object.hasOwn(options, 'page');
  const selectedEntry = atlas.extraction.entries.find(entry => entry.selected);
  const desired = model.nodes.some(node => node.id === options.selected) ? options.selected :
    !explicitPage && selectedEntry ? model.main.get(selectedEntry.id) : undefined;
  const at = model.nodes.findIndex(node => node.id === desired);
  const page = explicitPage ? options.page : at >= 0 ? Math.floor(at / PAGE_SIZE) : 0;
  const total = model.nodes.length, pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const index = Number.isSafeInteger(page) ? Math.min(Math.max(0, page), pageCount - 1) : 0;
  const nodes = model.nodes.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE);
  const visible = new Set(nodes.map(node => node.id)), nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const nodePages = new Map(model.nodes.map((node, at) => [node.id, Math.floor(at / PAGE_SIZE)]));
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
  const dimensions = place(nodes, sourceLevels(model.nodes, links.edges), incident);
  return { nodes, edges, ...dimensions, page: index, pageCount, total,
    selected: visible.has(desired) ? desired : nodes[0]?.id ?? null, omitted, boundaryEdges,
    unresolved: atlas.extraction.references.filter(reference => reference.status !== 'resolved').map(reference => reference.id),
    unmappedReferences: links.unmappedReferences };
}

module.exports = { atlasDiagram, NODE_WIDTH, NODE_HEIGHT, PAGE_SIZE, MARGIN };
