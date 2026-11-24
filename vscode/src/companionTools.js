'use strict';
// Purpose menus over existing commands; configuration inspection never probes a service.
const GUIDES='https://github.com/flengyel/MRW/blob/main/docs/';
const SETUP = {
 workspace: {title: 'Workspace and storage', rows: [
  ['Choose notes folder…','chooseNotesFolder'], ['Set up MRW workspace…','setupWorkspace'],
  ['Show saved-work location','artifactLocation'], ['Move workspace…','moveWorkspace'],
  ['Recover workspace move','recoverWorkspaceMove'],
 ]},
 companions: {title: 'Companion settings', rows: [
  ['Obsidian note settings',null,null,'mrw.obsidian'], ['Citation processor settings',null,null,'mrw.citation'],
  ['Connect Zotero…','connectZotero'], ['Add source plugin…','addSourcePlugin'],
  ['Manage source plugins…','manageSourcePlugins'], ['Add Lean lesson pack…','addLeanLessonPack'],
  ['Manage Lean lesson packs…','manageLeanLessonPacks'], ['Build local justification checker','setupJustificationChecker'],
 ]},
 diagnostics: {title: 'History and diagnostics', rows: [
  ['Configure history…','configureHistory'], ['Feature use…','mrwDiagnostics.featureUse'],
  ['Integrity and data hygiene…','mrwDiagnostics.integrity'],
  ['Copy Codex maintenance handoff','mrwDiagnostics.maintenance'],
  ['Diagnostics report settings',null,null,'mrwDiagnostics'],
 ]},
 studies: {title: 'Manage saved studies', rows: [
  ['Archive study…','archiveStudy'], ['Restore study…','restoreStudy'],
  ['Trash study…','deleteStudy'], ['Permanently delete study…','permanentlyDeleteStudy'],
 ]},
};
const GROUPS={
 readingTools:[['Open document…','openDocument'],['New note in your authoring application…','newZettel'],['Recent documents…','recentNotes'],['Reopen document','reopenDocument'],['Examples…','openLearningMaterials'],['Show Contents','openReadingOutline'],['Show backlinks…','showBacklinks'],['Choose notes folder…','chooseNotesFolder']],
 sourceTools:[
  ['Open Saved Source…','openOutline'],
  ['Retain Document as Source','createOutline'],
  ['Insert Source or Passage Link…','insertOutlineReference'],
  ['Follow Source or Passage Link at Cursor','followOutlineReference'],
  ['Restore saved source from Trash…','restoreSavedSource'],
  ['Import Stacks Project section…','importStacksSection'],
  ['Import Kerodon section…','importKerodonSection'],
  ['Import source (including nLab)…','importSource'],
  ['Find Zotero reference…','findZoteroReference'],
  ['Resume retained Zotero reference…','resumeZoteroReference'],
 ],
 calculationTools:[['Open notebook…','openNotebook'],['Retain saved notebook result…','retainNotebookResult'],['Open / compare retained results…','openNotebookResult'],['Export notebook provenance…','exportNotebookProvenance'],['SagePod and Jupyter setup',null,'GETTING_STARTED_WSL_SAGEPOD.md']],
 proofTools:[['Justification…','openJustification'],['Open Proof Outline…','openProofOutline'],['Open Lean proof and keep Return','openProof'],['Resume Lean study','resumeLeanStudy'],['Actions for selected lesson…','leanStudyActions'],['Work through a proof…','prepareProofStudy'],['Continue proof work','resumeProofStudy']],
 earlierWork:[['Resume saved study','resumeStudy'],['Resume investigation','resumeInvestigation'],
  ['Inspect study history','inspectStudyHistory'],['Export study history…','exportStudyHistory'],['Show archived studies','showArchivedStudies'],
  ['Show trashed studies','showDeletedStudies'],['Manage saved studies…',null,null,null,'studies']],
 companionTools:[['Companions and setup status',null,'RECOMMENDED_EXTENSIONS.md'],
  ['Workspace and storage…',null,null,null,'workspace'], ['Companion settings…',null,null,null,'companions'],
  ['History and diagnostics…',null,null,null,'diagnostics']],
};
function companionStatus(vscode){
 const c=vscode.workspace.getConfiguration('mrw'),ext=id=>vscode.extensions?.getExtension(id)?'extension installed; connection not checked':'extension not installed';
 return [
  {label:'Obsidian',description:c.get('obsidianNewNoteCommand','')?'creation command configured; reachability not checked':'template creation command not configured',guide:'OBSIDIAN_WORKFLOW.md'},
  {label:'Zotero',description:'Local API readiness is checked by Connect / Find, not by this menu',guide:'ZOTERO_WORKFLOW.md'},
  {label:'Jupyter / SagePod',description:ext('ms-toolsai.jupyter')+'; SagePod server not checked',guide:'GETTING_STARTED_WSL_SAGEPOD.md'},
  {label:'Lean 4',description:ext('leanprover.lean4')+'; toolchain not checked',guide:'LEAN_STUDY_WORKFLOW.md'},
  {label:'LaTeX Workshop / PDFs',description:ext('James-Yu.latex-workshop'),guide:'RECOMMENDED_EXTENSIONS.md'},
  {label:'MRW Diagnostics',description:ext('flengyel.mrw-diagnostics')+'; weekly reporting opt-in is configured separately',guide:'DIAGNOSTICS_PLUGIN.md'},
  {label:'Codex and companion plugins',description:'Separate application; manual reviewable handoff',guide:'READER_AI_WORKFLOW.md'},
  {label:'Emacs',description:c.get('orgCaptureTemplate','')?'capture template configured; server unchecked':'capture template not configured',guide:'NOTE_COMPANIONS.md#capture-a-passage-in-emacs'},
  {label:'SageQueue / Wolfram / The Archive',description:'No MRW adapter delivered',guide:'INTEGRATION_BOUNDARIES.md'}
 ];
}
function registerCompanionTools({vscode,register}){
 const names = {readingTools:'Reading and notes',sourceTools:'Sources and references',
  calculationTools:'Calculation',proofTools:'Proofs',companionTools:'Tools and setup',earlierWork:'Earlier saved work'};
 async function choose(rows, title, commands) {
  const diagnostics = vscode.extensions?.getExtension('flengyel.mrw-diagnostics');
  const choices = rows.filter(row => diagnostics ||
    !row[1]?.startsWith('mrwDiagnostics.') && row[3] !== 'mrwDiagnostics').map(([label, command, guide, setting, menu]) => {
    const commandId = command && (command.startsWith('mrwDiagnostics.') ? command : 'mrw.' + command);
    return {label, command:commandId, guide, setting, menu,
      description:commandId && commands && !commands.includes(commandId) ? 'Unavailable in this host' : undefined};
  });
  const selected = await vscode.window.showQuickPick(choices, {title, matchOnDescription:true, placeHolder:'Choose an action'});
  if (!selected) return;
  if (selected.menu) {
    const next = SETUP[selected.menu];
    return choose(next.rows, next.title, commands);
  }
  if (selected.command) {
    if (selected.description) throw Error(selected.description);
    return vscode.commands.executeCommand(selected.command);
  }
  if (selected.setting) return vscode.commands.executeCommand('workbench.action.openSettings',selected.setting);
  if (selected.guide === 'RECOMMENDED_EXTENSIONS.md') {
    const companion = await vscode.window.showQuickPick(companionStatus(vscode), {
      title:'Companions and setup status', matchOnDescription:true, placeHolder:'Choose a setup guide'});
    if (companion) return vscode.env.openExternal(vscode.Uri.parse(GUIDES + companion.guide));
    return;
  }
  if (selected.guide) return vscode.env.openExternal(vscode.Uri.parse(GUIDES + selected.guide));
 }
 for (const [id, rows] of Object.entries(GROUPS)) {
  register('mrw.' + id, async () => choose(rows, names[id], await vscode.commands.getCommands?.(true)));
 }
 register('mrw.openLearningMaterials', async () => {
  const selected = await vscode.window.showQuickPick([
   {label:'Operads from finite lists', description:'Notes · list monad and operad substitution', command:'mrw.openOperadsNotes'},
   {label:'Sums of odd integers', description:'Induction and two questions', command:'mrw.openStudyExample'},
   {label:'Lean 4 lessons', description:'Built-in and registered lesson packs', command:'mrw.studyLean4'},
  ], {title:'Examples', placeHolder:'Choose an example or lesson', matchOnDescription:true});
  if (selected) return vscode.commands.executeCommand(selected.command);
 });
 register('mrw.openNotebook',async()=>{
  const selected=await vscode.window.showOpenDialog({title:'Open notebook in the native notebook editor',canSelectMany:false,filters:{Notebook:['ipynb']}});
  if(!selected?.length)return;
  return vscode.commands.executeCommand('vscode.openWith',selected[0],'jupyter-notebook',{preview:false});
 });
}
module.exports={registerCompanionTools,companionStatus,GROUPS};
