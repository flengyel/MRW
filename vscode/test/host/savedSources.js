'use strict';
// Run only as the entry point of a disposable extension-development fixture.
const vscode = require('vscode'), fs = require('node:fs/promises'), path = require('node:path');
const assert = require('node:assert/strict');
async function run(context) {
  const config = JSON.parse(await fs.readFile(path.join(context.extensionPath, 'host-test.json'), 'utf8'));
  assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath, config.project);
  assert.equal(path.basename(config.project), 'mrw-saved-source-fixture');
  const report = {vscode:vscode.version, remote:vscode.env.remoteName, checks:[], errors:[], complete:false};
  const save = () => fs.writeFile(path.join(config.artifacts, 'native-result.json'), JSON.stringify(report,null,2));
  const nativePick = vscode.window.showQuickPick, nativeError = vscode.window.showErrorMessage;
  let timer, picker;
  try {
    const {runBridge} = require('../../src/bridge');
    const {createArtifactStorage} = require('../../src/artifactStorage');
    const {digest} = require('../../src/navigation');
    require('../../src/extension').activate(context);
    vscode.window.showErrorMessage = async message => { report.errors.push(message); await save(); };
    const registered = new Set(await vscode.commands.getCommands(true));
    const manifest = JSON.parse(await fs.readFile(path.join(context.extensionPath,'package.json'),'utf8'));
    assert.ok(manifest.contributes.viewsWelcome.find(v=>v.view==='mrw.commands').contents.includes('(command:mrw.openOutline '));
    assert.ok(manifest.contributes.commands.every(c=>registered.has(c.command)));
    report.checks.push('all contributed commands register; Open Saved Source is a Commands button');
    const rawBridge = request => runBridge(context.extensionPath,'python3',request);
    const {bridge} = createArtifactStorage({vscode,context,rawBridge});
    const req = {store:path.join(context.storageUri.fsPath,'outlines-'+digest(config.project)), project_root:config.project};
    const file = path.join(config.project,'fixture.txt'), text='Retained mathematical passage.\n';
    await fs.writeFile(file,text);
    const source_revision=require('node:crypto').createHash('sha256').update(text).digest('hex');
    let saved = await bridge({method:'outline_create',...req,path:file,source_revision});
    async function edit(change) {saved=await bridge({method:'outline_mutate',...req,id:saved.outline.id,revision:saved.revision,change});}
    await edit({kind:'metadata',authorship:'unknown',bibliography:{...saved.outline.source.bibliography,title:'Hausdorff spaces',authors:'The Stacks Project Authors',locator:'stacks-project:08ZD'}});
    await edit({kind:'add_region',start:[0,0],end:[0,10]});
    const region=saved.outline.regions[0].id;
    await edit({kind:'region',region,title:'Lemma stacks-project:08ZH — Proof',level:'argument',collapsed:false});
    await edit({kind:'annotation',region,id:null,purpose:'question',text:'Disposable reader note',origin:'human_work',author:'Host fixture'});
    await bridge({method:'outline_create',...req,path:file,source_revision}); // A nonmatching source.
    await fs.unlink(file);
    let query='08ZH',cancel=false;
    vscode.window.showQuickPick = async (items,options) => {
      assert.equal(options.matchOnDescription,true);assert.equal(options.matchOnDetail,true);
      // Use the native Quick Pick with the production rows/options. Assigning
      // the query drives VS Code's filter; acceptance uses its native command.
      picker=vscode.window.createQuickPick();Object.assign(picker,options);picker.items=await items;
      const result=new Promise(resolve=>{picker.onDidAccept(()=>{const row=picker.selectedItems[0];resolve(row);picker.hide();});picker.onDidHide(()=>resolve(undefined));});
      picker.show();picker.value=query;
      timer=setTimeout(()=>{void vscode.commands.executeCommand(cancel?'workbench.action.closeQuickOpen':'workbench.action.acceptSelectedQuickOpenItem');},1000);
      try{return await result;}finally{clearTimeout(timer);picker.dispose();picker=undefined;}
    };
    for (query of ['08ZH','Stacks']) {
      const opened=await vscode.commands.executeCommand('mrw.openOutline');
      assert.ok(opened,report.errors.join('\n'));assert.equal(opened.outline.id,saved.outline.id);
      assert.equal(opened.revision,saved.revision);assert.deepEqual(opened.outline.regions,saved.outline.regions);
      report.checks.push('native Quick Pick search '+query+' selects the retained source with its note, after original removal');await save();
    }
    cancel=true;assert.equal(await vscode.commands.executeCommand('mrw.openOutline'),undefined);
    const unchanged=await bridge({method:'outline_load',...req,id:saved.outline.id});assert.equal(unchanged.revision,saved.revision);
    report.checks.push('native picker cancellation preserves the saved revision');
    report.complete=report.errors.length===0;
  } catch(error) {report.failure=error.stack;}
  finally {
    clearTimeout(timer);picker?.dispose();vscode.window.showQuickPick=nativePick;vscode.window.showErrorMessage=nativeError;await save();
    if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===config.project)await vscode.commands.executeCommand('workbench.action.closeWindow');
  }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
