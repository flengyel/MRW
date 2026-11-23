'use strict';

const { digest } = require('./navigation');

const DETAIL_LIMIT = 12;
const MAX_ENTRIES = 4096;
const MAX_REFERENCES = 8192;
const MAX_TEXT = 2 * 1024 * 1024;
const DESCRIPTION_FIELDS = ['question', 'hypotheses', 'conclusion', 'nextUse'];
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value);
const text = (value, limit) => typeof value === 'string' && value.length <= limit && !value.includes('\0');
const range = (value, length) => value && Number.isSafeInteger(value.start) &&
  Number.isSafeInteger(value.end) && 0 <= value.start && value.start < value.end && value.end <= length;

function validateAtlas(atlas) {
  const { source, extraction, components } = atlas ?? {};
  if (atlas?.version !== 1 || !source || !text(source.text, MAX_TEXT) || !source.text.trim() ||
      Buffer.byteLength(source.text) > MAX_TEXT || source.revision !== digest(source.text) ||
      !text(source.title, 512) || !source.title.trim() || !text(source.uri, 8192) || !source.uri ||
      !text(source.language, 64) || !source.language) {
    throw new Error('The atlas source or revision is invalid.');
  }
  const length = source.text.length;
  if (!range(extraction?.selection, length) || !Array.isArray(extraction.entries) ||
      !extraction.entries.length || extraction.entries.length > MAX_ENTRIES ||
      !Array.isArray(extraction.references) || extraction.references.length > MAX_REFERENCES ||
      (extraction.limitations !== undefined && (!Array.isArray(extraction.limitations) ||
        extraction.limitations.length > 128 || extraction.limitations.some(value => !text(value, 2048))))) {
    throw new Error('The atlas passages and references are invalid.');
  }
  const entries = new Map();
  for (const entry of extraction.entries) {
    if (!identifier(entry.id) || entries.has(entry.id) || !text(entry.kind, 64) ||
        !text(entry.title, 1024) || !entry.title.trim() || !range(entry, length) ||
        ['proof', 'statement'].some(part => entry[part] != null &&
          (!range(entry[part], length) || entry[part].start < entry.start || entry[part].end > entry.end))) {
      throw new Error('An atlas passage has an invalid identity or range.');
    }
    entries.set(entry.id, entry);
  }
  const references = new Set();
  for (const reference of extraction.references) {
    if (!identifier(reference.id) || references.has(reference.id) ||
        !text(reference.label, 1024) || !range(reference, length) ||
        !['resolved', 'missing', 'ambiguous', 'external'].includes(reference.status) ||
        (reference.owner != null && !entries.has(reference.owner)) ||
        (reference.status === 'resolved' ? !entries.has(reference.target) : reference.target != null) ||
        (reference.candidates != null && (!Array.isArray(reference.candidates) ||
          reference.candidates.length > MAX_ENTRIES || reference.candidates.some(id => !entries.has(id))))) {
      throw new Error('An atlas reference has an invalid occurrence or target.');
    }
    references.add(reference.id);
  }
  if (!Array.isArray(components) || components.length < extraction.entries.length ||
      components.length > 2 * MAX_ENTRIES) {
    throw new Error('The atlas component list is invalid.');
  }
  const constituents = new Map(), componentIds = new Set();
  for (const component of components) {
    if (!identifier(component.id) || componentIds.has(component.id) ||
        !text(component.title, 240) || !component.title.trim() ||
        DESCRIPTION_FIELDS.some(name => !text(component[name], 8192)) ||
        (component.attribution != null && !text(component.attribution, 160)) ||
        (component.carriedFrom != null && !/^[a-f0-9]{64}$/.test(component.carriedFrom)) ||
        !Array.isArray(component.itemIds) || !component.itemIds.length ||
        component.itemIds.length > MAX_ENTRIES || new Set(component.itemIds).size !== component.itemIds.length ||
        component.itemIds.some(id => !entries.has(id))) {
      throw new Error('An atlas component is invalid.');
    }
    componentIds.add(component.id);
    if (component.members == null) {
      if (component.itemIds.length !== 1 || component.itemIds[0] !== component.id) {
        throw new Error('A passage component must keep its source identity.');
      }
      constituents.set(component.id, component);
    }
  }
  if (constituents.size !== entries.size) throw new Error('An atlas passage has no component.');
  const grouped = new Set();
  for (const component of components) {
    if (component.members == null) continue;
    if (!Array.isArray(component.members) || component.members.length < 2 ||
        component.members.length !== component.itemIds.length ||
        component.members.some((id, index) => id !== component.itemIds[index] || !constituents.has(id) || grouped.has(id))) {
      throw new Error('An atlas group has invalid or overlapping members.');
    }
    for (const id of component.members) grouped.add(id);
  }
  return atlas;
}

function defaultComponent(entry) {
  return { id: entry.id, title: entry.title.trim().slice(0, 240), itemIds: [entry.id],
    question: '', hypotheses: '', conclusion: '', nextUse: '' };
}

function uniqueId(used, prefix) {
  let number = 1;
  while (used.has(prefix + number)) number++;
  return prefix + number;
}

function ownerOf(extraction, reference) {
  if (reference.owner) return reference.owner;
  // Some parsers leave citations in ordinary prose without an explicit owner.
  // Associate the narrowest passage that actually contains the occurrence.
  let owner;
  for (const entry of extraction.entries) {
    if (entry.start <= reference.start && reference.end <= entry.end &&
        (!owner || entry.end - entry.start < owner.end - owner.start)) owner = entry;
  }
  return owner?.id;
}

function itemEvidence(atlas) {
  const entries = atlas.extraction.entries, content = atlas.source.text;
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const signature = new Map(entries.map(entry => {
    const exact = part => part && digest(content.slice(part.start, part.end));
    return [entry.id, JSON.stringify([entry.kind, entry.title, entry.label ?? null,
      exact(entry), exact(entry.statement), exact(entry.proof)])];
  }));
  const relationships = new Map(entries.map(entry => [entry.id, []]));
  for (const reference of atlas.extraction.references) {
    const owner = ownerOf(atlas.extraction, reference), target = reference.target;
    const origin = [reference.kind, reference.label, content.slice(reference.start, reference.end), reference.status];
    if (owner) relationships.get(owner).push(['outgoing', ...origin,
      signature.get(target), (reference.candidates || []).map(id => signature.get(id))]);
    if (target) relationships.get(target).push(['incoming', ...origin, signature.get(owner), owner ?
      reference.start - byId.get(owner).start : reference.start]);
  }
  return new Map(entries.map(entry => [entry.id, digest(JSON.stringify([
    signature.get(entry.id), relationships.get(entry.id),
  ]))]));
}

function copyDescription(target, prior, revision) {
  if (!prior.attribution) return target;
  return { ...target, title: prior.title, ...Object.fromEntries(DESCRIPTION_FIELDS.map(field => [field, prior[field]])),
    attribution: prior.attribution, carriedFrom: prior.carriedFrom || revision };
}

function carryCorrections(atlas, previous) {
  if (atlas.source.uri !== previous.source.uri) return atlas;
  const before = itemEvidence(previous), after = itemEvidence(atlas);
  const inverse = evidence => {
    const lookup = new Map();
    for (const [id, key] of evidence) lookup.set(key, lookup.has(key) ? null : id);
    return lookup;
  };
  const prior = inverse(before), current = inverse(after), moved = new Map();
  for (const [id, key] of before) {
    const target = current.get(key);
    if (prior.get(key) === id && target) moved.set(id, target);
  }
  const corrections = new Map(previous.components.filter(c => !c.members && moved.has(c.id)).map(c => [moved.get(c.id), c]));
  atlas.components = atlas.components.map(c => corrections.has(c.id)
    ? copyDescription(c, corrections.get(c.id), previous.source.revision) : c);
  const used = new Set(atlas.components.map(c => c.id));
  for (const group of previous.components.filter(c => c.members?.every(id => moved.has(id)))) {
    const members = group.members.map(id => moved.get(id));
    const id = uniqueId(used, 'group-');
    used.add(id);
    atlas.components.push({ id, itemIds: members, members, title: group.title,
      ...Object.fromEntries(DESCRIPTION_FIELDS.map(field => [field, group[field]])),
      attribution: group.attribution || 'Reader', carriedFrom: group.carriedFrom || previous.source.revision });
  }
  return atlas;
}

function createAtlas({ source, extraction, previous } = {}) {
  const snapshot = structuredClone({ source, extraction });
  if (snapshot.extraction?.entries?.length === 0) {
    snapshot.extraction.entries.push({ id: 'selected-passage', kind: 'passage', title: 'Selected passage',
      ...snapshot.extraction.selection, selected: true, referenced: false });
  }
  if (!Array.isArray(snapshot.extraction?.entries)) throw new Error('No atlas passages were extracted.');
  const atlas = validateAtlas({ version: 1, ...snapshot, components: snapshot.extraction.entries.map(defaultComponent) });
  return previous ? validateAtlas(carryCorrections(atlas, validateAtlas(previous))) : atlas;
}

function overviewComponents(atlas) {
  const byId = new Map(atlas.components.map(component => [component.id, component]));
  const groups = new Map();
  for (const component of atlas.components) {
    for (const member of component.members || []) groups.set(member, component);
  }
  const order = new Map();
  for (const entry of atlas.extraction.entries) {
    const component = groups.get(entry.id) || byId.get(entry.id);
    order.set(component.id, component);
  }
  return [...order.values()];
}

function editAtlas(atlas, change) {
  validateAtlas(atlas);
  const component = atlas.components.find(item => item.id === change?.component);
  let candidate;
  if (change?.type === 'component' && component) {
    const corrected = { ...component };
    const fields = Object.keys(change.fields ?? {});
    if (!fields.length || fields.some(name => !['title', ...DESCRIPTION_FIELDS].includes(name))) {
      throw new Error('Choose a component description to edit.');
    }
    for (const field of fields) {
      if (!text(change.fields[field], field === 'title' ? 240 : 8192)) throw new Error('The description is too long or invalid.');
      corrected[field] = change.fields[field].trim();
    }
    if (!corrected.title) throw new Error('Enter a component title.');
    corrected.attribution = 'Reader';
    delete corrected.carriedFrom;
    candidate = atlas.components.map(item => item.id === component.id ? corrected : item);
  } else if (change?.type === 'group') {
    const available = overviewComponents(atlas).filter(c => !c.members);
    const selected = available.filter(c => Array.isArray(change.components) && change.components.includes(c.id));
    if (selected.length < 2 || selected.length !== change.components.length ||
        !text(change.title, 240) || !change.title.trim()) {
      throw new Error('Choose at least two ungrouped components and give the group a title.');
    }
    const members = selected.map(c => c.id);
    const id = uniqueId(new Set(atlas.components.map(c => c.id)), 'group-');
    candidate = [...atlas.components, { ...defaultComponent({ id, title: change.title }),
      itemIds: members, members, attribution: 'Reader' }];
  } else if (change?.type === 'ungroup' && component?.members) {
    if (DESCRIPTION_FIELDS.some(field => component[field])) {
      throw new Error('Keep the group while it contains a description. Copy its description into the member components before removing it.');
    }
    candidate = atlas.components.filter(item => item.id !== component.id);
  } else {
    throw new Error('Choose an available component edit.');
  }
  return validateAtlas({ ...atlas, components: candidate });
}

function detailPage(atlas, componentId, page = 0) {
  const component = atlas.components.find(item => item.id === componentId);
  if (!component) throw new Error('The atlas component is unavailable.');
  const selected = new Set(component.itemIds);
  const entries = atlas.extraction.entries.filter(entry => selected.has(entry.id));
  const pages = Math.ceil(entries.length / DETAIL_LIMIT);
  const index = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, pages - 1)) : 0;
  return { component, entries: entries.slice(index * DETAIL_LIMIT, (index + 1) * DETAIL_LIMIT),
    index, pages, first: index * DETAIL_LIMIT + 1, last: Math.min((index + 1) * DETAIL_LIMIT, entries.length), total: entries.length };
}

function handoffEntries(atlas, componentId, page) {
  const { entries } = detailPage(atlas, componentId, page);
  const primary = entries.find(entry => entry.proof || entry.kind === 'proof') ||
    entries.find(entry => entry.statement || entry.kind === 'theorem') || entries[0];
  const candidates = new Set(entries.map(entry => entry.id));
  for (const reference of atlas.extraction.references) {
    if (reference.target && entries.some(entry => entry.start <= reference.start && reference.end <= entry.end)) {
      candidates.add(reference.target);
    }
  }
  candidates.delete(primary.id);
  const optional = atlas.extraction.entries.filter(entry => candidates.has(entry.id));
  return { primary, optional };
}

function evidenceSpan(atlas, request) {
  let span;
  if (request.reference) {
    span = atlas.extraction.references.find(reference => reference.id === request.reference);
  } else if (request.entry) {
    const entry = atlas.extraction.entries.find(item => item.id === request.entry);
    const part = request.part;
    if (part == null || part === 'entry') span = entry;
    else if (part === 'proof' || part === 'statement') span = entry?.[part];
  } else if (request.part === 'selection') {
    span = atlas.extraction.selection;
  }
  if (!range(span, atlas.source.text.length)) throw new Error('The exact atlas passage is unavailable.');
  return { start: span.start, end: span.end };
}

module.exports = { DETAIL_LIMIT, createAtlas, validateAtlas, editAtlas, overviewComponents, detailPage, handoffEntries, evidenceSpan, ownerOf };
