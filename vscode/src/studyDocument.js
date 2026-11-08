'use strict';
const path = require('node:path');
const { hash } = require('./studyHistory');
const { parseReadingMarkdown } = require('./readingMarkdown');
const { noteIdentity } = require('./noteIdentity');

// Ordinary document associations are navigation metadata. They never acquire
// the authority or syntax of an mrw-outline retained-source citation.
function capture(doc, offset = 0, occurrence) {
  if (doc.uri.scheme !== 'file' || doc.languageId !== 'markdown') throw Error('Open an ordinary Markdown document or choose a Contents section.');
  const text = doc.getText(), model = parseReadingMarkdown(text);
  if (model.frontMatter.malformed) throw Error('Correct the Markdown front matter before selecting a section.');
  const node = occurrence || model.all.filter(n => n.kind === 'heading' && n.start <= offset).at(-1) || model.roots.find(n => n.kind === 'heading');
  const section = node?.kind === 'heading' ? node : model.all.filter(n => n.kind === 'heading' && n.start <= (node?.start ?? offset)).at(-1);
  const start = section?.start ?? model.frontMatter.end;
  const end = section ? model.all.find(n => n.kind === 'heading' && n.start > section.start && n.level <= section.level)?.start ?? text.length : text.length;
  const body = text.slice(start, end);
  if (!body.trim() || Buffer.byteLength(body) > 128 * 1024) throw Error('Choose a nonempty Markdown section within 128 KiB.');
  const uri = doc.uri.toString(), revision = hash(text), identity = noteIdentity(doc);
  const origin = { uri, revision, start: node?.start ?? start, end: node?.end ?? start,
    section: node?.label || section?.label || identity.title || path.basename(doc.uri.path),
    sectionKey: section?.id || 'document', filename: path.basename(doc.uri.path) };
  origin.initial = { revision, start: origin.start, end: origin.end };
  const reference = uri + '#mrw-context-' + hash(JSON.stringify({ revision, start, end }));
  return { uri, label: identity.label, origin,
    passage: { kind: 'document_context', reference, source_revision: revision, text: body,
      label: identity.label + ' › ' + origin.section, documentOrigin: structuredClone(origin) } };
}
const studyID = (root, uri) => hash(JSON.stringify({ kind: 'document-study-v1', root, uri }));
const sameQuestion = (a, b) => a?.id === b?.id && a?.revision === b?.revision;
function review(s, q, recorder) {
  s.problemRevision = q.revision;
  s.solutionReview = { revision: q.revision, open: true, origin: s.documentContext ? structuredClone(s.documentContext.origin) : null, at: new Date().toISOString() };
  const a = s.current;
  if (q.answer && a && !a.finished) {
    if (sameQuestion(a.question, q)) a.answerExposed = true;
    else { a.helpExposures ||= []; if (!a.helpExposures.includes('solution:' + q.revision)) a.helpExposures.push('solution:' + q.revision); }
  }
  const event=recorder.record('solution.review', { question: q.id, revision: q.revision, available: !!q.answer,
    snapshot: q.answer ? recorder.snapshot(q.answer) : null, attempt: a?.id || null, after_submission: !!a?.submissions.length,
    meaning: 'Solution display opportunity, separate from an attempt, recall grade or mathematical checking.' });
}
function keepForLater(q, date = null) {
  if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw Error('Choose a valid date for later problem work.');
  q.problemLater = { kept: true, date };
}
module.exports = { capture, studyID, sameQuestion, review, keepForLater };
