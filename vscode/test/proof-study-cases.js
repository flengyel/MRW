'use strict';
const {sources}=require('../src/proofStudy');
const explain=text=>({text,author:'Codex companion',origin:'ai_proposal'});
function proposal(study,tag){
  const citation=i=>({source:study.passages[i].id,start_line:1,end_line:study.passages[i].text.split('\n').length,reference:study.passages[i].reference});
  const nodes=tag==='08ZG'?[
    ['maps','Continuous section','f:X→Y and s:Y→X are continuous, f∘s=id_Y, and X is Hausdorff.'],
    ['diagonal','Closed diagonal','The diagonal Δ_X(X) is closed in X×X by 08ZE.'],
    ['pair','Continuous comparison','G:X→X×X, G(x)=(x,s(f(x))), is continuous.'],
    ['fixed','Section image as fixed points','s(Y)={x∈X:x=s(f(x))}=G⁻¹(Δ_X(X)).'],
    ['closed','Closed section image','The inverse image s(Y) is closed in X.']
  ]:[
    ['maps','Continuous maps','f:X→Z and g:Y→Z are continuous and Z is Hausdorff.'],
    ['diagonal','Closed diagonal','The diagonal Δ_Z(Z) is closed by 08ZE.'],
    ['pair','Continuous product map','h:X×Y→Z×Z, h(x,y)=(f(x),g(y)), is continuous.'],
    ['fixed','Fiber product as inverse image','X×_Z Y=h⁻¹(Δ_Z(Z)).'],
    ['closed','Closed fiber product','The inverse image X×_Z Y is closed in X×Y.']
  ];
  const rules=[['diagonal',['maps'],'diagonal','Apply the Hausdorff diagonal criterion to the given Hausdorff space.'],['pair',['maps'],'pair','Continuity is preserved by composition and pairing.'],
    ['fixed',['maps','pair'],'fixed',tag==='08ZG'?'If x=s(y), then s(f(x))=s(f(s(y)))=s(y)=x. Conversely, x=s(f(x)) lies in s(Y).':'Both conditions say f(x)=g(y).'],
    ['closed',['diagonal','pair','fixed'],'closed','The inverse image of a closed set under a continuous map is closed.']];
  return{version:1,title:tag+' study',description:explain('Closedness through the diagonal.'),sources:sources(study),
    scopes:[{id:'global',parent:null,variables:[],assumptions:[]}],
    nodes:nodes.map(([id,title,claim])=>({id,title,claim,explanation:explain(id==='fixed'?rules[2][3]:claim),scope:'global',citations:[citation(id==='diagonal'?2:id==='maps'?1:0)]})),
    inferences:rules.map(([id,premises,conclusion,text])=>({id,premises,conclusion,explanation:explain(text),discharges:[]})),goals:['closed'],suggested_hidden:['pair','fixed']};
}
module.exports={proposal};
