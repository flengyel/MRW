'use strict';
// Purpose menus over existing commands; configuration inspection never probes a service.
const GUIDES='https://github.com/flengyel/MRW/blob/main/docs/';
const GROUPS={
 readingTools:[['Open document…','openDocument'],['New note in your authoring application…','newZettel'],['Recent documents…','recentNotes'],['Reopen document','reopenDocument'],['Show Contents','openReadingOutline'],['Show backlinks…','showBacklinks'],['Return to document','returnToReadingOutline']],
 sourceTools:[['Delete saved source…','deleteSavedSource'],['Restore saved source…','restoreSavedSource'],['Open saved source…','openOutline'],['Import Stacks Project section…','importStacksSection'],['Import Kerodon section…','importKerodonSection'],['Import source (including nLab)…','importSource'],['Find Zotero reference…','findZoteroReference'],['Resume retained Zotero reference…','resumeZoteroReference']],
 calculationTools:[['Open notebook…','openNotebook'],['Retain saved notebook result…','retainNotebookResult'],['Open / compare retained results…','openNotebookResult'],['Export notebook provenance…','exportNotebookProvenance'],['SagePod and Jupyter setup',null,'GETTING_STARTED_WSL_SAGEPOD.md']],
 proofTools:[['Justification…','openJustification'],['Open Proof Outline…','openProofOutline'],['Open Lean proof and keep Return','openProof'],['Study Lean 4…','studyLean4'],['Resume Lean study','resumeLeanStudy'],['Actions for selected lesson…','leanStudyActions'],['Work through a proof…','prepareProofStudy'],['Continue proof work','resumeProofStudy']],
 earlierWork:[['Resume saved study','resumeStudy'],['Inspect study history','inspectStudyHistory'],['Export study history…','exportStudyHistory'],['Show archived studies','showArchivedStudies'],['Show trashed studies','showDeletedStudies'],['Resume investigation','resumeInvestigation'],['Archive study…','archiveStudy'],['Restore study…','restoreStudy'],['Trash study…','deleteStudy'],['Permanently delete study…','permanentlyDeleteStudy']],
 companionTools:[['Build local justification checker','setupJustificationChecker'],['Companions and setup status',null,'RECOMMENDED_EXTENSIONS.md'],['Obsidian note settings',null,null,'mrw.obsidian'],['Citation processor settings',null,null,'mrw.citation'],['Refresh citation preview','refreshCitations'],['Choose notes folder…','chooseNotesFolder'],['Connect Zotero…','connectZotero'],['Add source plugin…','addSourcePlugin'],['Manage source plugins…','manageSourcePlugins'],['Add Lean lesson pack…','addLeanLessonPack'],['Manage Lean lesson packs…','manageLeanLessonPacks'],['Set up MRW workspace…','setupWorkspace'],['Move workspace…','moveWorkspace'],['Recover workspace move','recoverWorkspaceMove'],['Configure history…','configureHistory'],['Show saved-work location','artifactLocation'],['Feature use…','mrwDiagnostics.featureUse'],['Integrity and data hygiene…','mrwDiagnostics.integrity'],['Copy Codex maintenance handoff','mrwDiagnostics.maintenance'],['Diagnostics report settings',null,null,'mrwDiagnostics']]
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
 for(const [id,rows] of Object.entries(GROUPS))register('mrw.'+id,async()=>{
  const commands=await vscode.commands.getCommands?.(true);
  const commandId=command=>command?.startsWith('mrwDiagnostics.')?command:'mrw.'+command;
  const choices=rows.filter(row=>!row[1]?.startsWith('mrwDiagnostics.')||vscode.extensions?.getExtension('flengyel.mrw-diagnostics')).map(([label,command,guide,setting])=>({label,command:command?commandId(command):undefined,guide,setting,
   description:command&&commands&&!commands.includes(commandId(command))?'Unavailable in this host':undefined}));
  const selected=await vscode.window.showQuickPick(choices,{title:({readingTools:'Reading and notes',sourceTools:'Sources and references',calculationTools:'Calculation',proofTools:'Proofs',companionTools:'Tools and setup',earlierWork:'Earlier saved work'})[id],matchOnDescription:true,placeHolder:'Choose an action; Escape leaves the current work open.'});
  if(!selected)return;
  if(selected.command){if(selected.description?.startsWith('Unavailable'))throw Error(selected.description);return vscode.commands.executeCommand(selected.command);}
  if(selected.setting)return vscode.commands.executeCommand('workbench.action.openSettings',selected.setting);
  if(id==='companionTools'&&selected.guide==='RECOMMENDED_EXTENSIONS.md'){
   const companion=await vscode.window.showQuickPick(companionStatus(vscode),{title:'Companions: installed, configured and unchecked states',matchOnDescription:true,placeHolder:'Choose a setup guide. This list does not probe, install or start companions.'});
   if(companion)return vscode.env.openExternal(vscode.Uri.parse(GUIDES+companion.guide));return;
  }
  if(selected.guide)return vscode.env.openExternal(vscode.Uri.parse(GUIDES+selected.guide));
 });
 register('mrw.openNotebook',async()=>{
  const selected=await vscode.window.showOpenDialog({title:'Open notebook in the native notebook editor',canSelectMany:false,filters:{Notebook:['ipynb']}});
  if(!selected?.length)return;
  return vscode.commands.executeCommand('vscode.openWith',selected[0],'jupyter-notebook',{preview:false});
 });
}
module.exports={registerCompanionTools,companionStatus,GROUPS};
