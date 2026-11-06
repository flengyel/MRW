'use strict';
const {randomUUID}=require('node:crypto');
// Existing model/controller scenarios send current-view actions directly. Supply
// the renderer's scope envelope here; stale/unknown protocol tests use raw receive.
function message(study,m){
  if(!study||m.type==='ready')return m;
  const result={study:study.id,attempt:study.current?.id||null,formEpoch:study.formEpoch,
    formDraftId:study.formDraft?.draftId||null,helpDraftId:study.helpDraft?.id||null,...m};
  if(result.form){result.form={...result.form,draftId:result.form.draftId||study.formDraft?.draftId||randomUUID()};result.formDraftId=result.form.draftId;}
  if(result.helpDraft&&study.helpDraft)result.helpDraft={...study.helpDraft,...result.helpDraft};
  if(m.type==='help_draft'&&result.response&&study.helpDraft){result.response={...study.helpDraft,...result.response};result.attempt=study.helpDraft.attempt;}
  if(m.type==='adaptation'&&!Object.hasOwn(m,'offer'))result.offer=study.current?.adaptation?.event;
  if(m.type==='effort_response'&&!Object.hasOwn(m,'offer'))result.offer=study.current?.effortOffer?.id;
  return result;
}
function scopedController(c){const receive=c.receive;c.receive=m=>receive(message(c.active,m));return c;}
module.exports={message,scopedController};
