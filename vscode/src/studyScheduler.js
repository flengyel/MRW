'use strict';
const { fsrs, createEmptyCard, Rating } = require('../media/fsrs/index.cjs');
const IDENTITY = 'ts-fsrs/5.4.2:defaults:no-fuzz:adapter-1';
const engine = fsrs({ enable_fuzz: false });
// Default weights/retention. Deterministic fuzz setting is explicitly identified.
function observe(item, observation, now = new Date()) {
  if (!item.kept || item.retired || observation.assessor !== 'reader' || observation.activity === 'application' ||
      !['unaided_success','help_dependent','unresolved'].includes(observation.outcome) || observation.consulted === null) return { changed: false, reason: 'Not an eligible reader-reported recall observation.' };
  if (item.reviews?.some(r => r.attempt === observation.attempt)) return { changed: false, reason: 'Attempt already scheduled.' };
  const unaided = observation.outcome === 'unaided_success' && !observation.hints && !observation.answer_visible && !observation.consulted;
  const rating = unaided ? Rating.Good : Rating.Again;
  const before = item.card || createEmptyCard(now), result = engine.next(before, now, rating);
  item.card = result.card; item.reviews ||= []; item.reviews.push({ ...observation, at: now.toISOString(), rating, scheduler: IDENTITY });
  return { changed: true, rating: unaided ? 'Good' : 'Again', before, after: result.card,
    reason: unaided ? 'Reader-confirmed unaided recall.' : 'Reader-reported unresolved or help-dependent recall.' };
}
function select(questions, block, now = Date.now()) {
  if (block.completed >= block.limit || now-block.started >= block.minutes*60000) return { question: null, reason: 'budget' };
  const ready = questions.filter(q => !q.retired && !block.seen.includes(q.revision));
  const due = ready.filter(q=>q.kept && q.reviews?.length && (!q.card || +new Date(q.card.due)<=now)).sort((a,b)=>(+new Date(a.card?.due||0)-+new Date(b.card?.due||0))||a.id.localeCompare(b.id));
  if (due.length) return { question: due[0], reason: 'due' };
  const fresh = ready.filter(q=>!q.reviews?.length).sort((a,b)=>a.id.localeCompare(b.id));
  return block.newCount < block.newLimit && fresh.length ? { question: fresh[0], reason: 'new' } : { question: null, reason: fresh.length?'new-budget':'none-due' };
}
module.exports = { observe, select, IDENTITY };
