'use strict';
// Native integration fixture. It operates only on the explicitly selected
// disposable note produced by the Obsidian template trial. No research file is edited.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const assert=require('node:assert/strict'),exec=promisify(execFile);
async function run(context){
  const config=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
  assert.equal(path.basename(config.project),'mrw-continuation-fixture');
  assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath,config.project);
  assert.ok(config.note.startsWith('MRWContinuationFixture20261113'));assert.equal(path.basename(config.note),config.note);
  const reportFile=path.join(config.artifacts,'native-result.json'),stageFile=path.join(config.artifacts,'native-stage.json');
  let report=await fs.readFile(reportFile,'utf8').then(JSON.parse,()=>({vscode:vscode.version,remote:vscode.env.remoteName,checks:[],complete:false}));
  const save=()=>fs.writeFile(reportFile,JSON.stringify(report,null,2));
  let originalClipboard=await vscode.env.clipboard.readText();let reload=false;
  const originalError=vscode.window.showErrorMessage;
  async function obsidian(code){
    const r=await exec(config.obsidianExecutable,['vault='+config.vault,'eval','code='+code],{timeout:15000,maxBuffer:1024*1024,encoding:'utf8',windowsHide:true});
    if(!r.stdout.trim().startsWith('=> '))throw Error(r.stdout+r.stderr);return r.stdout.trim().slice(3);
  }
  async function insert(which,text){
    const code=`(async()=>{const file=app.vault.getAbstractFileByPath(${JSON.stringify(config.note)});if(!file)throw Error('Fixture missing');
const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path===file.path)||app.workspace.getLeaf('tab');await leaf.openFile(file);app.workspace.setActiveLeaf(leaf,{focus:true});
await leaf.setViewState({type:'markdown',state:{file:file.path,mode:'source'},active:true});const view=leaf.view,editor=view.editor;if(view.file.path!==${JSON.stringify(config.note)})throw Error('Wrong active file');
const content=editor.getValue();const offset=${which==='body'?"content.indexOf('## SEE ALSO')":which==='research'?"content.indexOf('## Research')+'## Research'.length":"content.length"};if(offset<0)throw Error('Missing insertion section');
editor.replaceRange(${JSON.stringify(text)},editor.offsetToPos(offset));await view.save();return view.file.path;})()`;
    await obsidian(code);
    for(let i=0;i<20;i++){if((await fs.readFile(path.join(config.notesRoot,config.note),'utf8')).includes(text))return;await new Promise(r=>setTimeout(r,100));}
    throw Error('Native editor Save did not reach disk');
  }
  try{
    const {runBridge}=require('../../src/bridge'),{createArtifactStorage}=require('../../src/artifactStorage');
    const {digest}=require('../../src/navigation'),{createContinuation}=require('../../src/annotationContinuation');
    const {parseExternal}=require('../../src/companionLinks');
    require('../../src/extension').activate(context);
    vscode.window.showErrorMessage=async msg=>{report.errors??=[];report.errors.push(msg);await save();};
    const {bridge}=createArtifactStorage({vscode,context,rawBridge:req=>runBridge(context.extensionPath,'python3',req)});
    const base={store:path.join(context.storageUri.fsPath,'outlines-'+digest(config.project)),project_root:config.project};
    const state=await fs.readFile(stageFile,'utf8').then(JSON.parse,()=>undefined);
    if(state){
      originalClipboard=state.originalClipboard;
      const model=await bridge({method:'outline_load',...base,id:state.id});
      const notes=await bridge({method:'outline_notes',...base,id:state.id});
      assert.equal(notes.continuations[0].phase,'complete');assert.equal(notes.continuations[0].original.text,state.original);
      assert.equal(model.outline.regions[0].annotations[0].text,state.original);
      const note=await fs.readFile(path.join(config.notesRoot,config.note),'utf8');assert.ok(note.includes('Later independent writing after continuation.'));
      await vscode.env.clipboard.writeText(notes.continuations[0].return_link);
      const returned=await vscode.commands.executeCommand('mrw.openLinkFromClipboard');assert.ok(returned,'Native retained-reference return did not complete');
      report.checks.push('isolated MRW host reloaded; completed continuation and original recovered; exact retained return link reopens its passage');
      report.complete=true;
    }else{
      const file=path.join(config.project,'source.txt'),source='Retained statement.\nRetained proof α.\n';await fs.writeFile(file,source);
      let model=await bridge({method:'outline_create',...base,path:file,source_revision:digest(source)});
      async function mutate(change){model=await bridge({method:'outline_mutate',...base,id:model.outline.id,revision:model.revision,change});}
      await mutate({kind:'add_region',start:[1,0],end:[1,17]});
      const original='The map $x \\mapsto (x,s(f(x)))$ is continuous.\n\n```tikz\n\\begin{tikzcd} X \\arrow[r] & Y \\end{tikzcd}\n```\n\nReader commentary α 😀.';
      await mutate({kind:'annotation',region:model.outline.regions[0].id,id:null,purpose:'explanation',text:original,origin:'human_work',author:'Disposable native fixture'});
      const id=model.outline.id,annotation=model.outline.regions[0].annotations[0].id;
      const c={root:config.project,store:base.store,result:model,notes:await bridge({method:'outline_notes',...base,id})};
      const queue=[];
      async function pick(items,options){
        const desired=queue.shift(),values=await items;if(desired===undefined)return;
        const rows=values.map(v=>typeof v==='string'?{label:v,value:v}:{...v,value:v});
        const chosen=rows.find(row=>row.label===desired);assert.ok(chosen,desired);
        const picker=vscode.window.createQuickPick();Object.assign(picker,options);picker.items=rows;
        const result=new Promise(resolve=>{picker.onDidAccept(()=>{resolve(picker.selectedItems[0]?.value);picker.hide();});picker.onDidHide(()=>resolve(undefined));});
        picker.show();picker.activeItems=[chosen];
        const timer=setTimeout(()=>void vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem'),300);
        try{return await result;}finally{clearTimeout(timer);picker.dispose();}
      }
      const api={workspace:vscode.workspace,env:vscode.env,Uri:vscode.Uri,window:{showWarningMessage:vscode.window.showWarningMessage,setStatusBarMessage:vscode.window.setStatusBarMessage,showQuickPick:pick,
        showOpenDialog:async()=>[vscode.Uri.file(path.join(config.notesRoot,config.note))],
        showInformationMessage:async(_,...args)=>typeof args.at(-1)==='string'?args.at(-1):undefined}};
      const continuation=createContinuation({vscode:api,bridge,publish:async(_,change)=>{
        const result=await bridge({method:'outline_continue_note',...base,id,revision:c.notes.revision,change});assert.ok(!result.blocked,result.write_error);
        c.notes=await bridge({method:'outline_notes',...base,id});c.result=await bridge({method:'outline_load',...base,id});
      }});
      await insert('body','Earlier fixture prose [@existingCitation].\n\n');
      await insert('research','\nEarlier fixture reference.\n');
      queue.push('Choose an existing note…','Zettel — flengyel/Zettel','Copy annotation for the note body');
      await continuation.manage(c,{annotation});const body=await vscode.env.clipboard.readText();assert.equal(c.notes.continuations[0].phase,'pending');
      await insert('body',body);
      queue.push('Copy source attribution and return link');await continuation.manage(c,{annotation});const research=await vscode.env.clipboard.readText();await insert('research',research);
      queue.push('Verify saved note and finish continuation');await continuation.manage(c,{annotation});
      const record=c.notes.continuations[0];assert.equal(record.phase,'complete');assert.equal(record.original.text,original);assert.ok(record.validation.tool.endsWith('zettel_validate.py'));
      assert.equal(parseExternal(record.return_link).reference,record.reference);assert.equal(c.notes.links[0].reference,record.reference);
      report.checks.push('native Quick Picks run production continuation controller; explicit fixture file selection; real Zettel validation; native clipboard → Obsidian editor → Save → one completed association');
      await obsidian('(()=>{app.workspace.setActiveLeaf(window.__mrwContinuationTrial.oldLeaf,{focus:true});return true;})()');
      await continuation.open(record);
      let opened=false;for(let i=0;i<20;i++){if(JSON.parse(await obsidian('JSON.stringify(app.workspace.getActiveFile()?.path)'))===config.note){opened=true;break;}await new Promise(r=>setTimeout(r,200));}
      assert.ok(opened,'Obsidian did not select the continuation after URI routing');
      await insert('later','\nLater independent writing after continuation.\n');
      const again=await bridge({method:'outline_load',...base,id});assert.equal(again.outline.regions[0].annotations[0].text,original);
      report.checks.push('source-to-note URI selected the exact note in Obsidian; native Obsidian editing changes only the external note; original remains exact');
      await fs.writeFile(stageFile,JSON.stringify({id,original,originalClipboard}));await save();reload=true;
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  }catch(error){report.failure=error.stack;}
  finally{
    if(!reload){
      await vscode.env.clipboard.writeText(originalClipboard);vscode.window.showErrorMessage=originalError;
      try{
        const origin=JSON.parse(await fs.readFile(path.join(config.artifacts,'obsidian.json'),'utf8'));
        await obsidian(`(async()=>{const file=app.vault.getAbstractFileByPath(${JSON.stringify(origin.active)});if(!file)throw Error('Original note missing');const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path===file.path)||app.workspace.getLeaf('tab');await leaf.openFile(file);app.workspace.setActiveLeaf(leaf,{focus:true});return true;})()`);
        if(report.complete){const state=JSON.parse(await fs.readFile(stageFile,'utf8'));delete state.originalClipboard;await fs.writeFile(stageFile,JSON.stringify(state));}
      }catch(error){report.restoreFailure=error.message;}
      await save();if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===config.project)await vscode.commands.executeCommand('workbench.action.closeWindow');
    }
  }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
