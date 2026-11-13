'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createObsidianNote} = require('../src/obsidianNotes');
function fixture(settings = {}) {
  const calls = [], opened = [];
  const values = {obsidianExecutable:'/app/Obsidian.com', obsidianNewNoteCommand:'templater-obsidian:create-Templates/NewFileTemplate.md', ...settings};
  const vscode = {workspace:{isTrusted:true,getConfiguration:()=>({get:(key,fallback)=>values[key]??fallback})},
    env:{remoteName:'wsl',openExternal:async uri=>{opened.push(uri);return true;}},Uri:{parse:value=>value}};
  const execute = async (file,args) => {
    calls.push({file,args});
    if (args.includes('vault')) return 'C:\\Users\\reader\\Notes';
    if (args.includes('commands')) return `file-explorer:new-file\r\n${values.obsidianNewNoteCommand}`;
    return 'Executed';
  };
  return {vscode,root:'/mnt/c/Users/reader/Notes',execute,calls,opened,values};
}
test('New Note sends the configured Obsidian creation command exactly once, with no text or filename',async()=>{
  const f=fixture();await createObsidianNote(f);
  assert.deepEqual(f.calls.at(-1).args,['vault=Notes','command','id=templater-obsidian:create-Templates/NewFileTemplate.md']);
  assert.equal(f.calls.filter(c=>c.args.includes('command')).length,1);
  assert.deepEqual(f.opened,['obsidian://open?vault=Notes']);
});
test('vault mismatch and unavailable template command stop before dispatch',async()=>{
  for (const failure of ['vault','commands']) {
    const f=fixture(),run=f.execute;f.execute=async(file,args)=>args.includes(failure)?'Wrong':run(file,args);
    await assert.rejects(createObsidianNote(f),/different vault|unavailable/);
    assert.equal(f.opened.length,0);assert.equal(f.calls.some(c=>c.args.includes('command')),false);
  }
});
test('folder change, untrusted workspace and failed focus cannot create notes',async()=>{
  for (const failure of ['changed','untrusted','focus']) {
    const f=fixture();if(failure==='changed')f.validate=async()=>{throw Error('folder changed');};
    if(failure==='untrusted')f.vscode.workspace.isTrusted=false;
    if(failure==='focus')f.vscode.env.openExternal=async()=>false;
    await assert.rejects(createObsidianNote(f),/changed|Trust|not sent/);
    assert.equal(f.calls.some(c=>c.args.includes('command')),false);
  }
});
test('missing CLI and uncertain command completion never retry or create fallback files',async()=>{
  for (const stage of ['vault','command']) {
    const f=fixture(),run=f.execute;let attempts=0;
    f.execute=async(file,args)=>{if(args.includes(stage)){attempts++;throw Error('timeout');}return run(file,args);};
    await assert.rejects(createObsidianNote(f),stage==='command'?/Check Obsidian before retrying/:/Enable Obsidian/);
    assert.equal(attempts,1);
  }
});
test('Windows discovery uses fixed code and arguments preserve spaces and shell characters',async()=>{
  const f=fixture({obsidianExecutable:'',obsidianVault:'Notes & $x',obsidianNewNoteCommand:'templater-obsidian:create-Templates/A & B.md'}),run=f.execute;
  f.execute=async(file,args)=>{
    if(file.endsWith('powershell.exe')) {assert.match(Buffer.from(args.at(-1),'base64').toString('utf16le'),/^Join-Path /);return 'C:\\Users\\reader\\AppData\\Local\\Programs\\Obsidian\\Obsidian.com';}
    return run(file,args);
  };
  await createObsidianNote(f);
  assert.equal(f.calls.at(-1).file,'/mnt/c/Users/reader/AppData/Local/Programs/Obsidian/Obsidian.com');
  assert.deepEqual(f.calls.at(-1).args,['vault=Notes & $x','command','id=templater-obsidian:create-Templates/A & B.md']);
  assert.match(f.opened[0],/Notes%20%26%20%24x/);
});
