'use strict';
const vscode=require('vscode');
module.exports={activate:context=>({ ...require('../../src/extension').activate(context),fixtureContext:context })};
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
