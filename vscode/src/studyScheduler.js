'use strict';
const { fsrs, createEmptyCard, Rating } = require('../media/fsrs/index.cjs');
const {readerRecall,unaidedRecall}=require('./studyEvidence');
const IDENTITY = 'ts-fsrs/5.4.2:defaults:no-fuzz:adapter-2';
const engine = fsrs({ enable_fuzz: false });
// Default weights/retention. Deterministic fuzz setting is explicitly identified.
function observe(item, observation, now = new Date()) {
  if (!item.kept || item.retired || !readerRecall(observation)) return { changed: false, reason: 'Not an eligible reader-reported recall observation.' };
  const result = applyObservation(item, observation, now);
  if (result.changed) {
    item.reviewObservations ||= item.reviews.slice(0, -1);
    item.reviewObservations.push({ ...observation, at: now.toISOString() });
  }
  return result;
}
function applyObservation(item, observation, now) {
  if (!readerRecall(observation)) return { changed: false, reason: 'Not a reader-reported recall observation.' };
  if (item.reviews?.some(r => r.attempt === observation.attempt)) return { changed: false, reason: 'Attempt already scheduled.' };
  const unaided = unaidedRecall(observation);
  const rating = unaided ? Rating.Good : Rating.Again;
  const before = item.card || createEmptyCard(now), result = engine.next(before, now, rating);
  item.card = result.card; item.reviews ||= []; item.reviews.push({ ...observation, at: now.toISOString(), rating, scheduler: IDENTITY });
  return { changed: true, rating: unaided ? 'Good' : 'Again', before, after: result.card,
    reason: unaided ? 'Reader-confirmed unaided recall.' : 'Reader-reported unresolved or help-dependent recall.' };
}
// Retirement controls future selection, not reconstruction of observations that
// were admitted before retirement. Retain observations excluded by a correction
// so a later linked correction can restore their mapping without a new review.
function replay(item, observations) {
  const retained = structuredClone(observations).sort((a,b) => +new Date(a.at)-+new Date(b.at));
  item.reviewObservations = retained;
  item.card = null; item.reviews = [];
  const mapped = new Map();
  for (const observation of retained) mapped.set(observation.attempt, applyObservation(item, observation, new Date(observation.at)));
  return mapped;
}
function select(questions, block, now = Date.now()) {
  if (block.completed >= block.limit || now-block.started >= block.minutes*60000) return { question: null, reason: 'budget' };
  const ready = questions.filter(q => !q.retired && !block.seen.includes(q.revision));
  const due = ready.filter(q=>q.kept && q.reviews?.length && (!q.card || +new Date(q.card.due)<=now)).sort((a,b)=>(+new Date(a.card?.due||0)-+new Date(b.card?.due||0))||a.id.localeCompare(b.id));
  if (due.length) return { question: due[0], reason: 'due' };
  const fresh = ready.filter(q=>!q.reviews?.length).sort((a,b)=>a.id.localeCompare(b.id));
  return block.newCount < block.newLimit && fresh.length ? { question: fresh[0], reason: 'new' } : { question: null, reason: fresh.length?'new-budget':'none-due' };
}
function dueQuestions(questions, limit = 3, now = Date.now()) {
  return questions.filter(q => q.kept && !q.retired && ['definition','hypotheses','missing_step','argument'].includes(q.activity) &&
    (!q.card || +new Date(q.card.due) <= now)).sort((a,b) => (+new Date(a.card?.due || 0) - +new Date(b.card?.due || 0)) || a.id.localeCompare(b.id)).slice(0, Math.min(10, Math.max(1, Number(limit) || 3)));
}
module.exports = { observe, replay, select, dueQuestions, IDENTITY };
