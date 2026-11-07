'use strict';

function documentColumn(vscode, doc) {
  return vscode.window.visibleTextEditors?.find(editor => editor.document === doc)?.viewColumn ||
    vscode.window.tabGroups?.all?.find(group => group.tabs.some(tab => tab.input?.uri?.toString() === doc.uri.toString()))?.viewColumn ||
    vscode.window.activeTextEditor?.viewColumn;
}

async function showMarkdownPreview(vscode, doc, column = documentColumn(vscode, doc)) {
  const nativePreview = vscode.extensions?.getExtension('vscode.markdown-language-features')?.packageJSON?.contributes?.customEditors?.some(editor => editor.viewType === 'vscode.markdown.preview.editor');
  const commands = nativePreview ? undefined : await vscode.commands.getCommands?.(true);
  if (doc.uri.scheme === 'file' && (nativePreview || commands?.includes('markdown.reopenAsPreview'))) {
    await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vscode.markdown.preview.editor', { viewColumn: column, preview: false });
  } else if (vscode.window.activeTextEditor?.document === doc && (column == null || vscode.window.activeTextEditor.viewColumn === column)) {
    await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
  }
}

module.exports = { documentColumn, showMarkdownPreview };
