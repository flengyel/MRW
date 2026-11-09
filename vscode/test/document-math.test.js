'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const MarkdownIt = require('../media/markdown-it/markdown-it'), katex = require('../media/katex/katex.min');
const { registerDocumentMath, noteMacros } = require('../src/documentMath');

test('note-local macro definitions resolve custom notation without interpreting the preamble', () => {
  const text = '---\nmore-header-includes:\n  - \\usepackage{tikz}\n  - \\newcommand{\\OP}[1]{{#1}^{\\mathrm{op}}}\n  - \\newcommand{\\homdom}[1]{\\OP{\\mathcal{#1}}\\times\\mathcal{#1}}\n  - \\newcommand{\\dinat}{{=}\\mkern-3mu{\\diamond}}\n---\n';
  const definitions = noteMacros(text); assert.doesNotMatch(definitions, /usepackage/);
  assert.doesNotThrow(() => katex.renderToString('\\begingroup' + definitions + '\nP:\\homdom{C}\\dinat Q\\endgroup', { trust: false, maxExpand: 1000 }));
  assert.throws(() => katex.renderToString('\\homdom{C}'), /Undefined/);
  assert.equal(noteMacros('---\n- \\newcommand{\\x}{bad}\n'), '');
  assert.equal(noteMacros('# Body\n\\newcommand{\\x}{bad}'), '');
});

test('TikZ rendering is explicit, exact-revision bound, cached across reopen and leaves note bytes alone', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-document-diagram-')); t.after(() => fs.rm(root, { recursive:true,force:true }));
  const file = path.join(root, 'note.md'), text = '# Note\n\n```tikz\n\\begin{tikzcd}A \\arrow[r] & B\\end{tikzcd}\n```\n'; await fs.writeFile(file, text);
  const uri = { scheme:'file',fsPath:file,toString:()=>pathToFileURL(file).href };
  const doc = { uri, getText:()=>doc.text, text }, calls = [], code = [];
  const vscode = { env:{}, workspace:{isTrusted:true,textDocuments:[doc],openTextDocument:async()=>doc},Uri:{parse:value=>({scheme:'file',fsPath:fileURLToPath(value),toString:()=>value})},
    window:{withProgress:async(_options,action)=>action()},ProgressLocation:{Notification:15},commands:{executeCommand:async name=>calls.push(name)} };
  const context = { storageUri:{fsPath:root} }, documents = {isNote:()=>true,check:async()=>{}};
  const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
  const setup = () => { const plugin = registerDocumentMath({vscode,context,documents,session:'test-session',compile:async request=>{code.push(request.code);return {light:image,dark:image};}}); const md = plugin.extendMarkdownIt(new MarkdownIt()); return {plugin,md}; };
  const {plugin,md} = setup(), env = {currentDocument:uri}; let html = md.render(text, env);
  assert.match(html,/Render diagram/); assert.equal(code.length,0); assert.doesNotMatch(html,/<img/);
  const value = JSON.parse(Buffer.from(new URL(/href="([^"]+)"/.exec(html)[1]).searchParams.get('target'),'base64url').toString());
  doc.text += 'External change'; await assert.rejects(plugin.handle(value),/note changed/); assert.equal(code.length,0); doc.text = text;
  await plugin.handle(value); assert.equal(code.length,1); html = md.render(text,env); assert.match(html,/mrw-diagram-dark/); assert.match(html,/Render diagram again/);
  const restored = setup(); restored.md.render(text,env);
  for(let n=0;n<100&&!restored.md.render(text,env).includes('mrw-diagram-dark');n++)await new Promise(r=>setTimeout(r,5));
  assert.match(restored.md.render(text,env),/mrw-diagram-dark/);assert.equal(code.length,1);assert.equal(await fs.readFile(file,'utf8'),text);
  vscode.workspace.isTrusted=false;assert.doesNotMatch(md.render(text,env),/document-diagram/);
});

test('host math renderer receives scoped definitions while token content remains unchanged',()=>{
 const context={},vscode={workspace:{textDocuments:[]},env:{}},documents={isNote:()=>false};
 const md=new MarkdownIt();md.renderer.rules.math_inline=(tokens,at)=>tokens[at].content;
 registerDocumentMath({vscode,context,documents}).extendMarkdownIt(md);
 const env={};md.render('---\nmore-header-includes:\n  - \\newcommand{\\foo}{x}\n---\n',env);
 const tokens=[{content:'\\foo'}];assert.match(md.renderer.rules.math_inline(tokens,0,{},env),/begingroup.*\n.*newcommand/s);assert.equal(tokens[0].content,'\\foo');
 const other={};md.render('# No macros',other);assert.equal(md.renderer.rules.math_inline(tokens,0,{},other),'\\foo');
});

test('native front-matter masking does not hide macros from the already-open note',()=>{
 const uri={toString:()=> 'file:/note.md'},text='---\nmore-header-includes:\n  - \\newcommand{\\foo}{x}\n---\n$\\foo$';
 const vscode={workspace:{textDocuments:[{uri,getText:()=>text}]},env:{}};
 const md=new MarkdownIt();md.renderer.rules.math_inline=(tokens,at)=>tokens[at].content;
 md.core.ruler.before('normalize','native_front_matter',state=>{state.src=state.src.replace(/^[\s\S]*?---\n[\s\S]*?---\n/,'');});
 registerDocumentMath({vscode,context:{},documents:{isNote:()=>true}}).extendMarkdownIt(md);
 const env={currentDocument:uri};md.render(text,env);assert.match(md.renderer.rules.math_inline([{content:'\\foo'}],0,{},env),/newcommand/);
 // The native engine may attach currentDocument only to the render environment.
 md.render('# Masked parsing source',{});
 assert.match(md.renderer.rules.math_inline([{content:'\\foo'}],0,{}, {currentDocument:uri}),/newcommand/);
});
