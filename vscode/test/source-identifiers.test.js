'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {qualifiedIdentifier,canonicalCitation}=require('../src/sourceIdentifiers');
const {parseReadingMarkdown}=require('../src/readingMarkdown');
const {buildNoteIndex,backlinks}=require('../src/documentLinks');
const {createStudy}=require('../src/studyModel');

test('published item identity keeps its namespace and is independent of content revision and range',()=>{
 const a='mrw-outline:v2/kerodon:0004/'+'a'.repeat(64)+'/11111111-1111-1111-1111-111111111111/'+'b'.repeat(64)+'/22222222-2222-2222-2222-222222222222/1.0-2.0';
 assert.equal(qualifiedIdentifier(a),'kerodon:0004');assert.equal(qualifiedIdentifier(a.replace('b'.repeat(64),'c'.repeat(64))),'kerodon:0004');
 assert.notEqual(qualifiedIdentifier(a),qualifiedIdentifier(a.replace('kerodon:','stacks-project:')));
 assert.equal(canonicalCitation('kerodon:0004'),'https://kerodon.net/tag/0004');
 assert.equal(qualifiedIdentifier('0004'),undefined);assert.equal(qualifiedIdentifier('javascript:evil'),undefined);
 const model=createStudy([{reference:a,label:'kerodon:0004',text:'Exact passage',source_revision:'b'.repeat(64)}],'/project');
 assert.equal(model.passages[0].reference,a);assert.equal(model.passages[0].source_revision,'b'.repeat(64));
});

test('document links and backlink occurrences retain qualified source identity across equal local tags',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-qualified-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const k='mrw-outline:v2/kerodon:0004/'+'a'.repeat(64)+'/11111111-1111-1111-1111-111111111111/'+'b'.repeat(64);
 const text=`# Work\n[Retained Kerodon](${k})\n[Stacks](https://stacks.math.columbia.edu/tag/0004)\n[[kerodon:0004]]\n`;
 await fs.writeFile(path.join(root,'note.md'),text);const parsed=parseReadingMarkdown(text);
 assert.deepEqual(parsed.all.slice(1).map(n=>n.qualified_id),['kerodon:0004','stacks-project:0004','kerodon:0004']);
 const index=await buildNoteIndex(root);const result=await backlinks(index,'kerodon:0004');
 assert.equal(result.complete,true);assert.equal(result.occurrences.length,2);
 assert.ok(result.occurrences.every(n=>n.qualified_id==='kerodon:0004'&&n.targetPath==='kerodon:0004'));
 assert.equal((await backlinks(index,'stacks-project:0004')).occurrences.length,1);
});
