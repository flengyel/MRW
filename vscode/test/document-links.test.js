'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { buildNoteIndex, resolveNoteLink, backlinks } = require('../src/documentLinks');

async function fixture(t, documents) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-note-links-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(documents)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  }
  return root;
}

test('ordinary notes, dotted and index IDs produce exact repeated backlink occurrences without imports', async t => {
  const source = '---\r\nid: 1.2a\r\ntitle: 1.2a A revised title\r\n---\r\n# A revised title\r\n[[00]] Index\r\n[Again](00.md#Index) and [[00]] Index again.\r\n';
  const root = await fixture(t, { '1.2a.md': source, '00.md': '---\nid: 00\ntitle: 00 Index\n---\n# Index\n', 'ordinary note.md': '# Ordinary\n[Read](1.2a.md)\n' });
  const index = await buildNoteIndex(root);
  assert.equal(index.complete, true);
  const byID = await resolveNoteLink(index, path.join(root, 'ordinary note.md'), '1.2a', 'zettel');
  assert.equal(byID.ok, true); assert.equal(byID.path, path.join(root, '1.2a.md'));
  const found = await backlinks(index, path.join(root, '00.md'));
  assert.equal(found.complete, true); assert.equal(found.occurrences.length, 3);
  assert.deepEqual(found.occurrences.map(o => source.slice(o.node.start, o.node.end)), ['[[00]]', '[Again](00.md#Index)', '[[00]]']);
  assert.deepEqual(found.occurrences.map(o => o.node.line), [5, 6, 6]);
  assert.equal(found.occurrences[0].sourceRevision, index.files.get(path.join(root, '1.2a.md')).parsed.revision);
  assert.equal(found.occurrences[0].sourceText, '[[00]]');
  assert.equal(await fs.readFile(path.join(root, '1.2a.md'), 'utf8'), source);
});

test('duplicate filenames are explained and YAML titles or IDs never replace filename identity', async t => {
  const root = await fixture(t, { 'start.md': '# Start\n', 'a/12a.md': '---\nid: 12a\ntitle: Any title\n---\n# First\n',
    'b/12a.md': '# Second\n', '13b.md': '---\nid: somebody-else\ntitle: 13b A title\n---\n# Heading\n', '14c.md': '# 15d\n' });
  const index = await buildNoteIndex(root), source = path.join(root, 'start.md');
  assert.equal((await resolveNoteLink(index, source, '12a', 'zettel')).code, 'ambiguous_id');
  const conflict = await resolveNoteLink(index, source, '13b', 'zettel');
  assert.equal(conflict.ok, true); assert.match(index.files.get(conflict.path).identityErrors[0], /filename ID/);
  assert.equal((await resolveNoteLink(index, source, 'somebody-else', 'zettel')).code, 'missing_id');
  assert.equal((await resolveNoteLink(index, source, '15d', 'zettel')).code, 'missing_id');
  assert.equal((await resolveNoteLink(index, source, '14c', 'zettel')).ok, true);
  // Ordinary Markdown is not required to satisfy Zettel identity conventions.
  assert.equal((await resolveNoteLink(index, source, '13b.md', 'markdown')).ok, true);
});

test('dirty buffers and rebuilding after external edits change backlinks and headings without writing originals', async t => {
  const original = '# Start\n[Old](target.md#old)\n';
  const root = await fixture(t, { 'source.md': original, 'target.md': '# Old\n', 'other.md': '# Other\n' });
  const source = path.join(root, 'source.md'), target = path.join(root, 'target.md'), other = path.join(root, 'other.md');
  const first = await buildNoteIndex(root);
  assert.equal((await backlinks(first, target)).occurrences.length, 1);
  const dirty = await buildNoteIndex(root, { overrides: new Map([[source, '# Unsaved\n[New](other.md#fresh)\n'], [other, '# Fresh\n']]) });
  assert.equal((await backlinks(dirty, target)).occurrences.length, 0);
  const changed = await backlinks(dirty, other);
  assert.equal(changed.occurrences.length, 1);
  assert.equal((await resolveNoteLink(dirty, source, 'other.md#fresh')).heading.line, 0);
  assert.equal(await fs.readFile(source, 'utf8'), original);
  assert.equal(await fs.readFile(other, 'utf8'), '# Other\n');
  await fs.writeFile(source, '# Start\n[[other]] External edit\n');
  const rebuilt = await buildNoteIndex(root);
  assert.equal((await backlinks(rebuilt, target)).occurrences.length, 0);
  assert.equal((await backlinks(rebuilt, other)).occurrences.length, 1);
});

test('Unicode relative links, same-note and duplicate heading fragments, and PDF file opening remain distinct', async t => {
  const root = await fixture(t, { 'a.md': '# Alpha\n# Alpha\n', 'β note.md': '# A heading\n', 'paper.pdf': Buffer.from('%PDF-1.4\n') });
  const source = path.join(root, 'a.md'), index = await buildNoteIndex(root);
  const unicode = await resolveNoteLink(index, source, '%CE%B2%20note.md#a-heading');
  assert.equal(unicode.ok, true); assert.equal(unicode.path, path.join(root, 'β note.md'));
  assert.equal((await resolveNoteLink(index, source, '#alpha-1')).heading.line, 1);
  assert.equal((await resolveNoteLink(index, source, 'paper.pdf')).type, 'pdf');
  assert.equal((await resolveNoteLink(index, source, 'paper.pdf#page=2')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a.md#absent')).code, 'missing_heading');
});

test('no directory symlink is traversed and file symlinks cannot expand the explicitly selected scope', async t => {
  const root = await fixture(t, { 'source.md': '# Source\n', 'real/inside.md': '# Inside\n' });
  const outside = await fixture(t, { 'private.md': '# Outside\n[[source]]\n' });
  await fs.symlink(outside, path.join(root, 'outside-dir'), 'dir');
  await fs.symlink(path.join(root, 'real'), path.join(root, 'inside-dir'), 'dir');
  await fs.symlink(path.join(outside, 'private.md'), path.join(root, 'escape.md'));
  await fs.symlink(path.join(root, 'real/inside.md'), path.join(root, 'alias.md'));
  const index = await buildNoteIndex(root), source = path.join(root, 'source.md');
  assert.equal(index.stats.skippedDirectorySymlinks, 2);
  assert.equal(index.files.size, 2); assert.equal(index.ids.has('alias'), false);
  assert.equal(index.errors.some(e => e.code === 'outside_scope'), true);
  assert.equal((await resolveNoteLink(index, source, 'escape.md')).code, 'outside_scope');
  assert.equal((await resolveNoteLink(index, source, '../private.md')).code, 'outside_scope');
  const inside = await resolveNoteLink(index, source, 'alias.md');
  assert.equal(inside.path, path.join(root, 'real/inside.md'));
});

test('unsupported selectors and schemes are inert data and never become approximate note matches', async t => {
  const root = await fixture(t, { 'a.md': '# A\n', '1a.md': '# Target\n' });
  const index = await buildNoteIndex(root), source = path.join(root, 'a.md');
  for (const target of ['1a#Target', '1a^block', '../1a', '1 a', '1a#Target|Alias', '../1a|Safe label', '|1a']) {
    assert.equal((await resolveNoteLink(index, source, target, 'zettel')).code, 'unsupported_selector', target);
  }
  for (const target of ['command:workbench.action.closeWindow', 'https://example.test/', 'file:///tmp/a.md', '//example/a.md', '/tmp/a.md']) {
    assert.equal((await resolveNoteLink(index, source, target)).code, 'unsupported_scheme', target);
  }
  assert.equal((await resolveNoteLink(index, source, '%2Ftmp/a.md')).code, 'unsupported_target');
  assert.equal((await resolveNoteLink(index, source, 'a.md?run=1')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a.md#^block')).code, 'unsupported_selector');
  assert.equal((await resolveNoteLink(index, source, 'a%XX.md')).code, 'invalid_encoding');
  assert.equal((await resolveNoteLink(index, source, 'missing.md')).code, 'missing_target');
  assert.equal((await resolveNoteLink(index, source, 'missing', 'zettel')).code, 'missing_id');
});

test('index bounds, cancellation and read errors are explicit partial states rather than completed empty results', async t => {
  const root = await fixture(t, { 'a.md': '# A\n', 'b.md': '# B\n[[a]]\n' });
  const bounded = await buildNoteIndex(root, { limits: { maxFiles: 1 } });
  assert.equal(bounded.complete, false); assert.equal(bounded.errors[0].code, 'file_limit');
  assert.equal((await resolveNoteLink(bounded, path.join(root, 'a.md'), 'a', 'zettel')).code, 'incomplete_index');
  const token = { isCancellationRequested: true };
  const stopped = await buildNoteIndex(root, { token });
  assert.equal(stopped.cancelled, true); assert.equal(stopped.complete, false);
  assert.equal((await backlinks(stopped, path.join(root, 'a.md'))).complete, false);
  const io = Object.create(fs); io.open = async file => { throw new Error(`Fixture read failure for ${path.basename(file)}`); };
  const failed = await buildNoteIndex(root, { io });
  assert.equal(failed.files.size, 0); assert.equal(failed.complete, false); assert.equal(failed.errors.length, 2);
  const emptyRoot = await fixture(t, { 'paper.pdf': '%PDF-1.4\n' });
  const empty = await buildNoteIndex(emptyRoot);
  assert.equal(empty.complete, true); assert.equal(empty.files.size, 0); assert.deepEqual(empty.errors, []);
});

test('overlarge and invalid UTF-8 notes do not masquerade as an empty completed index', async t => {
  const root = await fixture(t, { 'large.md': '# This is over the chosen limit\n', 'invalid.md': Buffer.from([0xc3, 0x28]) });
  const index = await buildNoteIndex(root, { limits: { maxFileBytes: 16 } });
  assert.equal(index.complete, false); assert.equal(index.files.size, 0);
  assert.equal(index.errors.length, 2);
  assert.match(index.errors.find(e => e.path.endsWith('large.md')).message, /file limit/);
  assert.match(index.errors.find(e => e.path.endsWith('invalid.md')).message, /encoding|encoded/i);
});

test('unresolved local backlink candidates are distinct from a completed empty result, while web citations are excluded', async t => {
  const root = await fixture(t, { 'source.md': '# Source\n[[12a]] Ambiguous\n[[missing]] Missing\n[Web](https://example.test/)\n',
    'a/12a.md': '# First\n', 'b/12a.md': '# Second\n', 'unrelated.md': '# Unrelated\n[Web](https://example.test/)\n' });
  const index = await buildNoteIndex(root), result = await backlinks(index, path.join(root, 'a/12a.md'));
  assert.equal(index.complete, true); assert.equal(result.complete, false); assert.equal(result.occurrences.length, 0);
  assert.equal(result.unresolvedCount, 2); assert.deepEqual(result.unresolved.map(e => e.code), ['ambiguous_id', 'missing_id']);
  assert.match(result.errors[0].message, /Unresolved link/);
  const cleanRoot = await fixture(t, { 'a.md': '# A\n[Web](https://example.test/)\n', 'b.md': '# B\n' });
  const clean = await backlinks(await buildNoteIndex(cleanRoot), path.join(cleanRoot, 'b.md'));
  assert.equal(clean.complete, true); assert.equal(clean.unresolvedCount, 0); assert.deepEqual(clean.occurrences, []);
});

test('backlink hits retain exact indexed revision and syntax when a same-label target is externally replaced', async t => {
  const original = '# Source\n[Same](a.md)\n', changed = '# Source\n[Same](b.md)\n';
  const root = await fixture(t, { 'source.md': original, 'a.md': '# A\n', 'b.md': '# B\n' });
  const result = await backlinks(await buildNoteIndex(root), path.join(root, 'a.md'));
  const hit = result.occurrences[0];
  await fs.writeFile(path.join(root, 'source.md'), changed);
  const updated = await buildNoteIndex(root), current = updated.files.get(hit.sourcePath);
  const node = current.parsed.all.find(n => n.id === hit.node.id);
  assert.equal(node.start, hit.node.start); assert.equal(node.end, hit.node.end);
  assert.notEqual(current.parsed.revision, hit.sourceRevision);
  assert.notEqual(current.text.slice(node.start, node.end), hit.sourceText);
});


test('Obsidian aliases resolve by filename ID and retain exact repeated backlink occurrences', async t => {
  const source='# Source\n[[1a|Readable target]] and [[1a|Another title]].\n[[2b|1a]]\n';
  const root=await fixture(t,{'source.md':source,'1a.md':'# First\n','2b.md':'# Second\n'});
  const index=await buildNoteIndex(root),from=path.join(root,'source.md');
  for(const target of ['1a|Readable target','1a|Another title'])
    assert.equal((await resolveNoteLink(index,from,target,'zettel')).path,path.join(root,'1a.md'));
  assert.equal((await resolveNoteLink(index,from,'2b|1a','zettel')).path,path.join(root,'2b.md'));
  const found=await backlinks(index,path.join(root,'1a.md'));
  assert.equal(found.complete,true);assert.equal(found.occurrences.length,2);
  assert.deepEqual(found.occurrences.map(hit=>hit.sourceText),['[[1a|Readable target]]','[[1a|Another title]]']);
  assert.equal((await resolveNoteLink(index,from,'absent|1a','zettel')).code,'missing_id');
  index.complete=false;
  assert.equal((await resolveNoteLink(index,from,'1a|Readable target','zettel')).code,'incomplete_index');
  assert.equal(await fs.readFile(from,'utf8'),source);
  const ambiguous=await fixture(t,{'source.md':'# Source\n','a/1a.md':'# A\n','b/1a.md':'# B\n','bad.md':'---\nid: other\n---\n# Bad\n'});
  const duplicates=await buildNoteIndex(ambiguous),start=path.join(ambiguous,'source.md');
  assert.equal((await resolveNoteLink(duplicates,start,'1a|Choose first','zettel')).code,'ambiguous_id');
  assert.equal((await resolveNoteLink(duplicates,start,'bad|other','zettel')).ok,true);
});


test('note scope excludes metadata, deleted notes and dependencies without spending its entry budget on them', async t => {
  const root=await fixture(t,{'source.md':'# Source\n[[1a|Target]]\n','1a.md':'# Real note\n',
    '.obsidian/plugins/helper/README.md':'# Plugin\n','.trash/1a.md':'# Deleted duplicate\n',
    '.git/objects/data':'generated','project/node_modules/pkg/1a.md':'# Dependency duplicate\n',
    'project/.lake/packages/pkg/1a.md':'# Dependency duplicate\n'});
  const index=await buildNoteIndex(root,{limits:{maxEntries:6}});
  assert.equal(index.complete,true);assert.equal(index.files.size,2);
  assert.equal(index.stats.skippedMetadataDirectories,5);
  assert.equal((await resolveNoteLink(index,path.join(root,'source.md'),'1a|Target','zettel')).path,path.join(root,'1a.md'));
});

test('backlink metadata is reused within one scan and checked again on the next scan', async t => {
  const root=await fixture(t,{'source.md':'# Source\n'+Array(12).fill('[[1a|Target]]').join('\n'),'1a.md':'# Target\n'});
  const paths=new Map(),stats=new Map(),io=Object.create(fs);
  io.realpath=async file=>{paths.set(file,(paths.get(file)||0)+1);return fs.realpath(file);};
  io.stat=async file=>{stats.set(file,(stats.get(file)||0)+1);return fs.stat(file);};
  const index=await buildNoteIndex(root,{io}),target=path.join(root,'1a.md');paths.clear();stats.clear();
  const first=await backlinks(index,target);assert.equal(first.occurrences.length,12);assert.equal(first.complete,true);
  assert.equal(paths.get(target),1);assert.equal(stats.get(target),1);
  await fs.unlink(target);const second=await backlinks(index,target);
  assert.equal(second.complete,false);assert.equal(second.errors.at(-1).code,'invalid_target');
  assert.equal(paths.get(target),2);
});


test('filename lookup establishes ID uniqueness without reading unrelated notes or claiming complete backlinks', async t => {
  const root=await fixture(t,{'source.md':'# Source\n','1a.md':'---\nid: 1a\n---\n# Target\n',
    'other.md':'# Unrelated\n','media/image.bin':'binary','media/another.bin':'binary'});
  const opened=[],io=Object.create(fs);io.open=async(...args)=>{opened.push(args[0]);return fs.open(...args);};
  const index=await buildNoteIndex(root,{lookupId:'1a',io,limits:{maxFiles:1,maxEntries:5}});
  assert.equal(index.complete,true);assert.deepEqual(opened,[path.join(root,'1a.md')]);
  assert.equal((await resolveNoteLink(index,path.join(root,'source.md'),'1a|Target','zettel')).ok,true);
  assert.equal((await resolveNoteLink(index,path.join(root,'source.md'),'other','zettel')).code,'incomplete_index');
  assert.equal((await backlinks(index,path.join(root,'1a.md'))).errors[0].code,'lookup_only');
  await fs.mkdir(path.join(root,'nested'));await fs.writeFile(path.join(root,'nested/1a.md'),'# Duplicate\n');
  const duplicate=await buildNoteIndex(root,{lookupId:'1a'});
  assert.equal((await resolveNoteLink(duplicate,path.join(root,'source.md'),'1a|Target','zettel')).code,'ambiguous_id');
  const partial=await buildNoteIndex(root,{lookupId:'1a',limits:{maxEntries:1}});
  assert.equal(partial.complete,false);
  assert.equal((await resolveNoteLink(partial,path.join(root,'source.md'),'1a|Target','zettel')).code,'incomplete_index');
});


test('a vault exceeding two thousand notes still resolves alias backlinks within the text-byte budget', async t => {
  const root=await fixture(t,{'source.md':'# Source\n[[target|Readable]]\n','target.md':'# Target\n'});
  const folder=path.join(root,'project-notes');await fs.mkdir(folder);
  for(let batch=0;batch<21;batch++)await Promise.all(Array.from({length:100},(_,i)=>
    fs.writeFile(path.join(folder,'note-'+String(batch*100+i).padStart(4,'0')+'.md'),'# Ordinary note\n')));
  const index=await buildNoteIndex(root);
  assert.equal(index.complete,true);assert.equal(index.files.size,2102);
  const found=await backlinks(index,path.join(root,'target.md'));
  assert.equal(found.complete,true);assert.deepEqual(found.occurrences.map(hit=>hit.sourceText),['[[target|Readable]]']);
});


test('filename catalogues preserve duplicate checks, scope, dirty text, partial results and current file contents',async t=>{
 const root=await fixture(t,{'source.md':'# Source\n','a/1a.md':'---\nid: older-metadata\ntitle: Useful title\n---\n# Target\n'});
 const outside=await fixture(t,{'secret.md':'# Outside\n'}),target=path.join(root,'a/1a.md');
 const catalogue={root,paths:[path.join(root,'source.md'),target],complete:true,errors:[],provider:'fixture'};
 const source=path.join(root,'source.md');
 const first=await buildNoteIndex(root,{lookupId:'1a',catalogue});assert.equal(first.provider,'fixture');
 assert.equal((await resolveNoteLink(first,source,'1a|Useful title','zettel')).path,target);
 await fs.writeFile(target,'# Changed externally\n');
 const second=await buildNoteIndex(root,{lookupId:'1a',catalogue});assert.equal(second.files.get(target).text,'# Changed externally\n');
 const dirty=await buildNoteIndex(root,{lookupId:'1a',catalogue,overrides:new Map([[target,'# Unsent draft\n']])});assert.equal(dirty.files.get(target).text,'# Unsent draft\n');assert.equal(await fs.readFile(target,'utf8'),'# Changed externally\n');
 await fs.mkdir(path.join(root,'b'));const duplicate=path.join(root,'b/1a.md');await fs.writeFile(duplicate,'# Duplicate\n');
 const ambiguous=await buildNoteIndex(root,{lookupId:'1a',catalogue:{...catalogue,paths:[...catalogue.paths,duplicate]}});assert.equal((await resolveNoteLink(ambiguous,source,'1a','zettel')).code,'ambiguous_id');
 const partial=await buildNoteIndex(root,{lookupId:'1a',catalogue:{...catalogue,complete:false,errors:['entry limit']}});assert.equal((await resolveNoteLink(partial,source,'1a','zettel')).code,'incomplete_index');
 await fs.unlink(target);await fs.symlink(path.join(outside,'secret.md'),target);
 const escaped=await buildNoteIndex(root,{lookupId:'1a',catalogue});assert.equal(escaped.complete,false);assert.equal(escaped.files.size,0);assert.equal(escaped.errors[0].code,'outside_scope');
});
