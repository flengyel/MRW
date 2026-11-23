'use strict';

const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {proposalStudy} = require('../src/atlas');
const {createAtlas} = require('../src/atlasModel');
const {digest} = require('../src/navigation');
const {extractAtlasText} = require('../src/atlasText');
const {retainedAtlasInput} = require('../src/outlines');
const {runBridge} = require('../src/bridge');
const {handoff} = require('../src/proofStudy');

test('qualify a new Stacks atlas from retained source and the Python citation resolver', async t => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-atlas-retained-'));
    t.after(() => fs.rm(base, {recursive: true, force: true}));
    const root = path.join(base, 'project α');
    const home = path.join(base, 'private');
    const store = path.join(home, 'outlines-' + digest(root));
    await fs.mkdir(root);
    await fs.mkdir(home);

    const request = (method, extra) => runBridge(path.join(__dirname, '..'), 'python3', {
        method, project_root: root, store, artifact_home: home, artifact_epoch: 'legacy', ...extra,
    }, {spawn: (command, args, options) => spawn(command, [args[0], path.join(__dirname, 'stacks_bridge.py')], options)});

    const prepared = await request('outline_stacks_prepare', {input: '08ZD'});
    const result = await request('outline_stacks_import', {ticket: prepared.ticket, packet: prepared.packet});
    const {outline, revision} = result;
    const chosen = Object.values(outline.published.parts).find(part => part.qualified_tag === 'stacks-project:08ZH' && part.role === 'proof');
    const retained = await retainedAtlasInput({result, root}, chosen.region, (method, extra) => {
        assert(['outline_document', 'outline_reference'].includes(method));
        return request(method, {id: outline.id, revision, ...extra});
    });

    assert.equal(retained.text, await fs.readFile(path.join(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8'));
    const selected = retained.text.slice(retained.selection.start, retained.selection.end);
    assert.match(selected, /^\\begin\{lemma\}[\s\S]+\\label\{lemma-fibre-product-closed\}/u);
    assert.match(selected, /\\ref\{lemma-Hausdorff\}/u);
    assert.match(selected, /\\end\{proof\}$/u);
    assert.equal(retained.passages.filter(p => p.qualified_id === 'stacks-project:08ZH').length, 2);
    const diagonal = retained.passages.find(part => part.qualified_id === 'stacks-project:08ZE' && part.label.includes('statement'));
    assert.match(diagonal.reference, /^mrw-outline:v2\/stacks-project:08ZE\//u);
    assert.match(retained.uri, /^mrw-outline:v2\/stacks-project:08ZD\//u);
    const followed = await request('outline_follow_reference', {reference: diagonal.reference});
    assert.deepEqual(followed.document.start, [121, 0]);
    assert.equal(followed.reference.qualified_id, diagonal.qualified_id);
    assert.match(diagonal.text, /Hausdorff/u);
    const extraction = extractAtlasText(retained.text, retained.language, retained.selection);
    const use = extraction.references.find(ref => ref.label === 'lemma-Hausdorff' && ref.start >= retained.selection.start);
    assert.equal(use.status, 'resolved');
    const target = extraction.entries.find(entry => entry.id === use.target);
    assert.equal(target.statement.start, diagonal.start);
    assert.equal(target.statement.end, diagonal.end);

    const atlas = createAtlas({source: retained, extraction});
    const fibre = extraction.entries.find(entry => entry.label === 'lemma-fibre-product-closed');
    const component = atlas.components.find(value => value.id === fibre.id);
    const study = proposalStudy(atlas, component, [target.id]);
    assert.deepEqual(study.passages.map(p => p.qualified_id),
        ['stacks-project:08ZH', 'stacks-project:08ZH', 'stacks-project:08ZE']);
    assert.equal(study.passages.at(-1).reference, diagonal.reference);
    const schema = JSON.parse(await fs.readFile(path.join(__dirname, '../media/proof-outline.schema.json'), 'utf8'));
    const referencePattern = new RegExp(schema.$defs.citation.properties.reference.pattern);
    assert.ok(study.passages.every(p => referencePattern.test(p.reference)));
    assert.ok(referencePattern.test('mrw-outline:v1/scoped-reference'));
    const copied = handoff(study, schema, true);
    assert.ok(study.passages.every(p => copied.includes(p.reference) && copied.includes(p.text)));
    assert.ok(!copied.includes('The converse is similar'), 'The cited 08ZE proof stays deferred');
});
