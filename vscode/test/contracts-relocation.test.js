'use strict';
// Concrete conformance samples for the independently built Lean model.
// MRW itself has no Lean dependency; set MRW_CONTRACT_EXECUTABLE for this check.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
const {WorkspaceMove,lookup,hash}=require('../src/workspaceMove');
const {runBridge}=require('../src/bridge');

test('concrete relocation/fault traces agree with executable Lean identity/citation vectors',async t=>{
  const executable=process.env.MRW_CONTRACT_EXECUTABLE;
  if(!executable)return t.skip('Build lean/contracts_tests and set MRW_CONTRACT_EXECUTABLE for model/implementation comparison');
  const {stdout}=await exec(executable,[],{timeout:15000,maxBuffer:1024*1024});
  const model=JSON.parse(stdout),observed={};
  for(const scenario of ['success','recoveredBefore','recoveredAfter']){
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-contract-'));
    t.after(()=>fs.rm(temp,{recursive:true,force:true}));
    const source=path.join(temp,'source'),privateHome=path.join(temp,'private');
    await fs.mkdir(source);await fs.mkdir(privateHome);
    const workspace=path.join(source,'MRW.code-workspace'),file=path.join(source,'proof.txt');
    await fs.writeFile(workspace,JSON.stringify({folders:[{path:'.'}]}));
    const text='An exact retained mathematical passage α.\n';await fs.writeFile(file,text);
    const external=path.join(temp,'external-note.md'),externalText='# Independent note\nOwn prose and links.\n';
    await fs.writeFile(external,externalText);
    const bridge=request=>runBridge(path.resolve(__dirname,'..'),'python3',request);
    const base={project_root:source,store:path.join(privateHome,'outlines-'+hash(source)),artifact_home:privateHome,artifact_epoch:'legacy'};
    let retained=await bridge({method:'outline_create',...base,path:file,source_revision:hash(text)});
    retained=await bridge({method:'outline_mutate',...base,id:retained.outline.id,revision:retained.revision,change:{kind:'add_region',start:[0,0],end:[0,Array.from(text.trimEnd()).length]}});
    const region=retained.outline.regions[0];
    const ref=await bridge({method:'outline_reference',...base,id:retained.outline.id,revision:retained.revision,region:region.id});
    const identity=await bridge({method:'outline_parse_reference',reference:ref.reference});
    // Association removal is independent of the target's own lifecycle.
    let notes=await bridge({method:'outline_notes',...base,id:retained.outline.id});
    notes=await bridge({method:'outline_update_note',...base,id:retained.outline.id,revision:notes.revision,
      change:{id:null,reference:ref.reference,url:'obsidian://open?vault=Isolated&file=external-note',label:'Independent note'}});
    notes=await bridge({method:'outline_update_note',...base,id:retained.outline.id,revision:notes.revision,
      change:{id:notes.links[0].id,reference:ref.reference,url:null,label:null}});
    assert.equal(notes.links.length,0);assert.equal(await fs.readFile(external,'utf8'),externalText);
    const destination=path.join(temp,'destination'),registry=path.join(temp,'registry');
    const checkpoints=[];
    const mover=new WorkspaceMove(registry,{checkpoint:async phase=>{
      checkpoints.push(phase);
      if(scenario==='recoveredBefore'&&phase==='verified'||scenario==='recoveredAfter'&&phase==='committed')throw Error('contract interruption');
    }});
    const options={workspace,destination,privateHome,state:{},tabs:[],bridge};
    if(scenario==='success')await mover.move(options);
    else await assert.rejects(mover.move(options),/contract interruption/);
    const record=lookup(registry,workspace),recovered=await new WorkspaceMove(registry).recover(record.id);
    const committed=recovered.phase==='committed',root=committed?destination:source;
    const home=committed?recovered.newHome:privateHome;
    const opened=await bridge({method:'outline_follow_reference',artifact_home:home,
      store:path.join(home,'outlines-'+hash(root)),project_root:root,reference:ref.reference});
    const after=await bridge({method:'outline_parse_reference',reference:ref.reference});
    assert.deepEqual(after,identity);
    assert.equal(after.region,region.id);
    assert.equal(after.span.source_revision,hash(text));
    assert.equal(opened.outline.id,retained.outline.id);
    assert.equal(opened.outline.source.revision,hash(text));
    assert.equal(await fs.readFile(file,'utf8'),text);
    assert.equal(await fs.readFile(external,'utf8'),externalText);
    assert.ok(checkpoints.includes('verified'));
    // Injective labels within this fixture abstract scope/outline/revision to
    // 1/2/3. They are assigned only after exact concrete equality checks above.
    observed[scenario]={phase:recovered.phase,locator:committed?20:10,target:[1,2,3],citation:[1,2,3,7],externalOriginalPresent:true};
  }
  assert.deepEqual(observed,model);
});
