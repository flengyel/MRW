'use strict';
// One explicit offline example, using the same retained-source/study path.
function questions(reference){
  const attribution={author:'Codex companion',origin:'ai_proposal'};
  return [
    {...attribution,activity:'missing_step',prompt:'In the inductive step, why is the next summand 2k+1?',
      answer:{...attribution,text:'The kth positive odd integer is 2k−1. The next is two greater, namely 2k+1.'},
      hints:['Write the odd integer with index k+1.'],references:[reference]},
    {...attribution,activity:'application',prompt:'Use the identity to evaluate 1+3+5+7+9+11. Identify n.',
      answer:{...attribution,text:'There are six summands, so n=6 and the sum is 6²=36.'},hints:[],references:[reference]}
  ];
}
module.exports={questions};
