'use strict';
// Native SVG navigation; source text is never parsed as HTML or executable code.
(() => {
  function layout(order, edges) {
    const ranks = {}, columns = [], positions = {};
    for (const id of order) {
      const incoming = edges.filter(e => e.to === id).map(e => ranks[e.from]);
      const rank = incoming.length ? Math.max(...incoming) + 1 : 0;
      ranks[id] = rank; (columns[rank] ||= []).push(id);
    }
    const height = Math.max(360, ...columns.map(c => c.length * 82 + 40));
    columns.forEach((column, rank) => column.forEach((id, i) => {
      positions[id] = { x: rank * 260 + 130, y: (i + .5) * height / column.length };
    }));
    return { positions, width: Math.max(400, columns.length * 260), height };
  }
  function create(parent, onSelect) {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); parent.append(svg);
    svg.setAttribute('class', 'proof-canvas'); svg.setAttribute('role', 'group'); svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', 'Proof graph. Select a vertex to read its Stacks passage. Drag to pan; use the wheel or zoom controls.');
    let model, selected, positions = {}, bounds = { width: 700, height: 500 }, camera, manual = false;
    let animation, cameraAnimation, dragging, dragged = false;
    const groups = new Map(), lines = new Map(); let retiring = new Map();
    const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = () => window.performance?.now() ?? Date.now();
    const frame = fn => window.requestAnimationFrame ? window.requestAnimationFrame(fn) : (fn(now() + 1000), 0);
    const cancel = id => { if (id !== undefined) window.cancelAnimationFrame?.(id); };
    const shape = (tag, attrs, parent = svg) => {
      const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); parent.append(n); return n;
    };
    function cameraSet(value) { camera = value; svg.setAttribute('viewBox', `${value.x} ${value.y} ${value.w} ${value.h}`); }
    function moveCamera(target, animated = true) {
      cancel(cameraAnimation);
      if (!camera || reduced() || !animated || !window.requestAnimationFrame) { cameraSet(target); return; }
      const start = { ...camera }, time = now();
      function step(t) {
        const f = Math.min(1, (t - time) / 280), ease = 1 - (1 - f) ** 3;
        cameraSet(Object.fromEntries(Object.keys(target).map(k => [k, start[k] + (target[k] - start[k]) * ease])));
        if (f < 1) cameraAnimation = frame(step);
      }
      cameraAnimation = frame(step);
    }
    function fit(animated = true) {
      manual = false;
      const rect = svg.getBoundingClientRect?.(), aspect = rect?.width && rect?.height ? rect.width / rect.height : 1.4;
      const w = Math.max(bounds.width + 24, (bounds.height + 24) * aspect), h = w / aspect;
      moveCamera({ x: (bounds.width - w) / 2, y: (bounds.height - h) / 2, w, h }, animated);
    }
    function zoom(factor, anchor) {
      if (!camera) return; manual = true; cancel(cameraAnimation);
      const scale = Math.max(.15, Math.min(5, camera.w * factor / bounds.width));
      factor = bounds.width * scale / camera.w;
      anchor ||= { x: camera.x + camera.w / 2, y: camera.y + camera.h / 2 };
      cameraSet({ x: anchor.x - (anchor.x - camera.x) * factor, y: anchor.y - (anchor.y - camera.y) * factor, w: camera.w * factor, h: camera.h * factor });
    }
    function point(e) {
      if (svg.createSVGPoint && svg.getScreenCTM?.()) {
        const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse());
      }
      const r = svg.getBoundingClientRect();
      return { x: camera.x + (e.clientX - r.left) * camera.w / r.width, y: camera.y + (e.clientY - r.top) * camera.h / r.height };
    }
    function highlight() {
      const neighbors = new Set([selected]);
      for (const e of model?.projection.edges || []) if (e.from === selected || e.to === selected) { neighbors.add(e.from); neighbors.add(e.to); }
      for (const [id, group] of groups) {
        group.setAttribute('class', 'proof-node' + (id === selected ? ' selected' : selected ? neighbors.has(id) ? ' related' : ' dim' : ''));
        group.setAttribute('aria-pressed', String(id === selected));
      }
      for (const value of lines.values()) value.node.setAttribute('class', 'proof-edge' + (value.edge.via.length ? ' omitted' : '') +
        (value.edge.from === selected || value.edge.to === selected ? ' related' : ''));
    }
    function select(id, focus = false) {
      selected = id; highlight();
      if (focus && positions[id] && camera) {
        manual = true; const p = positions[id];
        moveCamera({ ...camera, x: p.x - camera.w / 2, y: p.y - camera.h / 2 });
      }
    }
    function paint(edges) {
      for (const [id, group] of groups) {
        const p = positions[id]; if (p) group.setAttribute('transform', `translate(${p.x} ${p.y})`);
      }
      for (const { edge, node } of edges.values()) {
        const a = positions[edge.from], b = positions[edge.to]; if (!a || !b) continue;
        const x = a.x + 98, xx = b.x - 98, middle = (x + xx) / 2;
        node.setAttribute('d', `M ${x} ${a.y} C ${middle} ${a.y}, ${middle} ${b.y}, ${xx} ${b.y} M ${xx-8} ${b.y-5} L ${xx} ${b.y} L ${xx-8} ${b.y+5}`);
      }
    }
    function update(value) {
      model = value; cancel(animation);
      for (const old of retiring.values()) old.node.remove(); retiring = new Map();
      const target = layout(value.projection.order, value.projection.edges), starts = { ...positions };
      bounds = target;
      const wanted = new Set(value.projection.order), oldEdges = new Map(lines);
      for (const id of value.projection.order) {
        if (groups.has(id)) continue;
        const group = shape('g', { class: 'proof-node', role: 'button', tabindex: 0, 'data-node': id, 'data-action': 'select-vertex' }); groups.set(id, group);
        shape('rect', { x: -98, y: -28, width: 196, height: 56, rx: 7 }, group);
        const n = value.graph.nodes.find(n => n.id === id), label = shape('text', { 'text-anchor': 'middle' }, group);
        const words = n.title.split(' '), rows = [''];
        for (const word of words) { if ((rows.at(-1) + ' ' + word).length > 25 && rows.length < 2) rows.push(''); rows[rows.length-1] += (rows.at(-1) ? ' ' : '') + word; }
        rows.forEach((row, i) => { shape('tspan', { x: 0, y: (i - (rows.length - 1) / 2) * 17 + 5 }, label).textContent = row; });
        shape('title', {}, group).textContent = n.title + '\n' + n.claim;
        group.addEventListener('click', () => { if (!dragged) onSelect(id); });
        group.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } });
        positions[id] = starts[id] || target.positions[id];
      }
      lines.clear();
      for (const edge of value.projection.edges) {
        const key = edge.from + ':' + edge.to, old = oldEdges.get(key), node = old?.node || shape('path', { class: 'proof-edge' });
        // Put arrows behind all claim hit targets.
        if (svg.insertBefore) svg.insertBefore(node, svg.firstChild);
        lines.set(key, { node, edge }); oldEdges.delete(key);
      }
      retiring = oldEdges;
      const time = now(), duration = reduced() || !window.requestAnimationFrame ? 0 : 340;
      function step(t) {
        const f = duration ? Math.min(1, (t - time) / duration) : 1, ease = 1 - (1 - f) ** 3;
        for (const [id, end] of Object.entries(target.positions)) {
          const start = starts[id] || end;
          positions[id] = { x: start.x + (end.x - start.x) * ease, y: start.y + (end.y - start.y) * ease };
          groups.get(id).setAttribute('opacity', starts[id] ? 1 : f);
        }
        for (const [id, group] of groups) if (!wanted.has(id)) group.setAttribute('opacity', 1 - f);
        for (const old of oldEdges.values()) old.node.setAttribute('opacity', 1 - f);
        paint(new Map([...oldEdges, ...lines]));
        if (f < 1) animation = frame(step);
        else {
          for (const [id, group] of groups) if (!wanted.has(id)) { group.remove(); groups.delete(id); delete positions[id]; }
          for (const old of oldEdges.values()) old.node.remove();
          svg.setAttribute('data-animating', 'false');
        }
      }
      svg.setAttribute('data-animating', duration ? 'true' : 'false');
      step(time); highlight(); if (!manual || !camera) fit(!!camera);
    }
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? .85 : 1 / .85, point(e)); }, { passive: false });
    svg.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !camera) return;
      cancel(cameraAnimation); dragged = false; manual = true;
      dragging = { pointer: e.pointerId, point: point(e), x: e.clientX, y: e.clientY, captured: false };
    });
    svg.addEventListener('pointermove', e => {
      if (!dragging || dragging.pointer !== e.pointerId) return;
      if (Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > 4) dragged = true;
      if (!dragged) return;
      if (!dragging.captured) { svg.setPointerCapture?.(e.pointerId); dragging.captured = true; }
      const p = point(e), start = dragging.point;
      cameraSet({ ...camera, x: camera.x + start.x - p.x, y: camera.y + start.y - p.y });
    });
    for (const type of ['pointerup', 'pointercancel']) svg.addEventListener(type, e => {
      if (dragging?.pointer === e.pointerId) { if (dragging.captured) svg.releasePointerCapture?.(e.pointerId); dragging = undefined; }
    });
    svg.addEventListener('keydown', e => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(.8); }
      if (e.key === '-') { e.preventDefault(); zoom(1.25); }
      if (e.key === '0') { e.preventDefault(); fit(); }
    });
    return { update, select, fit, zoom, svg,
      find(query) { return model?.projection.order.find(id => { const n = model.graph.nodes.find(n => n.id === id); return (n.title + ' ' + n.claim).toLowerCase().includes(query.toLowerCase()); }); } };
  }
  if (typeof window !== 'undefined') window.MRWProofMap = { layout, create };
  if (typeof module !== 'undefined') module.exports = { layout };
})();
