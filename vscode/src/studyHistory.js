'use strict';
// One local recorder. No provider, source scanner, editor text listener or telemetry.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const POLICY = 'study-feedback-2', SCHEMA = 1;
const { projectAttempts, selectHistoryContext, readerRecall, unaidedRecall } = require('./studyEvidence');
class StudyHistory {
  constructor(directory, software, { io = fs, origin = 'production', onGap = () => {} } = {}) {
    this.directory = directory; this.software = software; this.io = io; this.origin = origin; this.onGap = onGap;
    this.session = crypto.randomUUID(); this.sequence = 0; this.pending = []; this.snapshots = new Map();
    this.tail = Promise.resolve(); this.context = {}; this.gap = ''; this.started = false;
  }
  init() {
    if (this.ready) return this.ready; this.started = true;this.record('session.start');
    this.ready=(async()=>{try {
      await this.io.mkdir(this.directory, { recursive: true, mode: 0o700 });
      // Missing end markers are explicit inferences, never recall outcomes.
      for (const name of (await this.io.readdir(this.directory)).filter(n => /^live-[a-f0-9-]+\.json$/.test(n))) {
        const old = JSON.parse(await this.io.readFile(path.join(this.directory, name), 'utf8'));
        this.record('session.unclean', { earlier_session: old.session, inference: 'No clean end marker at next launch.' }, 'derived_estimate');
        await this.io.unlink(path.join(this.directory, name));
      }
      await this.io.writeFile(path.join(this.directory, 'live-' + this.session + '.json'), JSON.stringify({ session: this.session }), { mode: 0o600 });
    } catch (e) { this.failure(e); }})();return this.ready;
  }
  setContext(value) { this.context = structuredClone(value || {}); }
  record(action, data = {}, evidence = 'observed_action', identity = this.context) {
    const e = { schema: SCHEMA, id: crypto.randomUUID(), session: this.session, sequence: ++this.sequence,
      at: new Date().toISOString(), monotonic_ms: performance.now(), origin: this.origin==='production'&&identity?.practice?'practice_demo':this.origin,
      software: this.software, policy: POLICY, scheduler: require('./studyScheduler').IDENTITY,
      identity: structuredClone(identity), action, evidence, data: structuredClone(data) };
    this.pending.push(e); this.schedule(); return e;
  }
  snapshot(value) {
    const text = JSON.stringify(value), id = hash(text); this.snapshots.set(id, text); this.schedule(); return id;
  }
  schedule() { if (!this.timer) { this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 250); this.timer.unref?.(); } }
  failure(e) { this.gap = 'History gap: ' + e.message + '. Reading and drafts remain available.'; this.onGap(this.gap); }
  flush() {
    clearTimeout(this.timer); this.timer = undefined;
    this.tail = this.tail.then(async () => {
      if (!this.pending.length && !this.snapshots.size) return;
      const events = this.pending.splice(0), snapshots = new Map(this.snapshots); this.snapshots.clear();
      try {
        await this.io.mkdir(path.join(this.directory, 'snapshots'), { recursive: true, mode: 0o700 });
        for (const [id, text] of snapshots) {
          const file = path.join(this.directory, 'snapshots', id + '.json');
          try { await this.io.writeFile(file, text, { flag: 'wx', mode: 0o600 }); }
          catch (e) { if (e.code !== 'EEXIST' || await this.io.readFile(file, 'utf8') !== text) throw e; }
        }
        if (events.length) {
          const file = path.join(this.directory, this.session + '-' + events[0].sequence + '-' + events.at(-1).sequence + '.json');
          const text = JSON.stringify(events) + '\n', temporary = file + '.pending';
          await this.io.writeFile(temporary, text, { mode: 0o600 }); await this.io.rename(temporary, file);
        }
        if (this.gap) { this.gap = ''; this.record('recorder.recovered', { missingness: 'A persistence gap was reported; retained buffered events now saved.' }); }
      } catch (e) { this.pending.unshift(...events); for (const [id, text] of snapshots) this.snapshots.set(id, text); this.failure(e); }
    }); return this.tail;
  }
  async events() {
    await this.flush();
    const events = [];
    try {
      for (const name of (await this.io.readdir(this.directory)).filter(n => /^[a-f0-9-]+-\d+-\d+\.json$/.test(n)).sort()) {
        const rows = JSON.parse(await this.io.readFile(path.join(this.directory, name), 'utf8'));
        for (const e of rows) if (e.schema === SCHEMA) events.push(e);
      }
    } catch (e) { this.failure(e); }
    const byID = new Map([...events, ...this.pending].map(e => [e.id, e]));
    return [...byID.values()].sort((a,b) => a.at.localeCompare(b.at) || a.session.localeCompare(b.session) || a.sequence-b.sequence);
  }
  async close() {
    if (!this.started || this.closed) return;this.closed=true;
    await this.ready;this.record('session.end'); await this.flush();
    if (!this.gap) await this.io.unlink(path.join(this.directory, 'live-' + this.session + '.json')).catch(e => this.failure(e));
  }
}
function summarize(events) {
  const projection=projectAttempts(events),groups=new Map();
  const group=e=>{const key=[e.origin,e.software?.version||'unknown version',e.software?.commit||'unknown commit'].join(' · ');if(!groups.has(key))groups.set(key,{events:[],attempts:[]});return groups.get(key);};
  for(const e of projection.events)group(e).events.push(e);
  for(const a of projection.attempts)if(a.anchor)group(a.anchor).attempts.push(a);
  const lines=['# Local study comparison','','Descriptive only: tasks, revisions and prior exposure differ. Visibility records exposure opportunity, not reading. No causal learning effect is inferred from a version change.',
    'Attempts and submission revisions belong to the version of the original attempt. Assessments and linked corrections retain their own dates and software versions. Supporting export context is labeled and does not count as selected-session activity.',''];
  for(const [version,g] of groups) {
    const rows=g.events.filter(e=>e.export_context?.role!=='supporting'),support=g.events.filter(e=>e.export_context?.role==='supporting'),attempts=g.attempts;
    const count=action=>rows.filter(e=>e.action===action).length;
    const submitted=attempts.flatMap(a=>a.submissions),assessed=attempts.filter(a=>a.observation&&a.observation.outcome!=='unassessed');
    const recall=assessed.filter(a=>readerRecall(a.observation)),application=assessed.filter(a=>a.observation.activity==='application');
    const delayed=recall.filter(a=>a.observation.delayed_days!==null&&a.observation.delayed_days>=1);
    const offers=rows.filter(e=>e.action==='effort.offer'),offerMap=new Map(offers.map(e=>[e.id,e])),responseMap=new Map();
    for(const e of rows.filter(e=>e.action==='effort.response'))if(offerMap.has(e.data.offer)&&e.data.attempt===offerMap.get(e.data.offer).data.attempt)responseMap.set(e.data.offer,e);
    const responses=[...responseMap.values()],efforts=responses.filter(e=>Number.isInteger(e.data.rating)&&e.data.rating>=1&&e.data.rating<=9);
    const revisions=new Set(attempts.filter(a=>a.anchor.identity?.question).map(a=>JSON.stringify([a.study,a.anchor.identity.question])));
    lines.push('## '+version,'',`Sessions: ${new Set(rows.map(e=>e.session)).size}; task revisions: ${revisions.size}. Selected events: ${rows.length}; supporting linked events: ${support.length}.`,
      `Attempts: ${attempts.length}; Submissions: ${submitted.length} (immutable submission revisions); assessed attempts: ${assessed.length}; submissions without an outcome: ${submitted.filter(e=>!attempts.some(a=>a.assessment?.data.submission===e.id&&a.observation?.outcome!=='unassessed')).length}.`,
      `Submitted attempts without an assessed outcome: ${attempts.filter(a=>a.submissions.length&&(!a.observation||a.observation.outcome==='unassessed')).length}. Assessment events in selected sessions: ${count('attempt.outcome')}; corrections: ${count('attempt.correction')}. These are not additional attempts.`,
      `Reader-confirmed recall outcomes: ${recall.length}; application outcomes: ${application.length} (kept separate); AI assessments: ${assessed.filter(a=>a.observation.assessor==='ai').length}; unknown consultation: ${assessed.filter(a=>typeof a.observation.consulted!=='boolean').length}.`,
      `Delayed recall (≥1 day): ${delayed.length}; reported unaided successes: ${delayed.filter(a=>unaidedRecall(a.observation)).length}/${delayed.length}; recall timing unknown or first review: ${recall.filter(a=>a.observation.delayed_days===null).length}.`,
      `Help-dependent: ${assessed.filter(a=>a.observation.outcome==='help_dependent').length}/${assessed.length}; unresolved: ${assessed.filter(a=>a.observation.outcome==='unresolved').length}/${assessed.length}; skipped: ${count('attempt.skip')}.`,
      `Hints: ${count('attempt.hint')}; reference-answer reveals: ${count('attempt.answer')}; source exposures: ${rows.filter(e=>e.action==='source.visibility'&&e.data.visible===true).length}; retained-help display opportunities: ${count('help.display')}; pasted-help previews: ${count('help.preview')}.`,
      `Effort: ${efforts.length}/${offers.length} offers answered numerically; mean ${efforts.length?(efforts.reduce((n,e)=>n+e.data.rating,0)/efforts.length).toFixed(1):'unavailable'} / 9. Declined: ${responses.filter(e=>e.data.disposition==='declined').length}; no response: ${responses.filter(e=>e.data.disposition==='no_response').length+offers.filter(e=>!responseMap.has(e.id)).length}; attempts not sampled: ${Math.max(0,attempts.filter(a=>a.submissions.length).length-new Set(offers.map(e=>e.data.attempt)).size)}.`,
      `Navigation actions: ${rows.filter(e=>e.action.startsWith('navigation.')||e.action==='source.change').length}; pauses: ${count('session.pause')}; resumes: ${count('study.resume')}; unclean endings inferred: ${count('session.unclean')}.`,
      `Review admissions: ${count('review.admit')}; retirements: ${count('review.retire')}; deferrals: ${count('review.defer')}; blocks stopped: ${count('block.stop')}.`,
      `Adaptation selections: ${count('adaptation.choice')}; selections to continue: ${rows.filter(e=>e.action==='adaptation.choice'&&e.data.choice==='continue').length}; companion requests copied: ${count('help.request')+rows.filter(e=>e.action==='handoff.copy'&&e.data.purpose!=='questions').length}; responses retained: ${count('help.retained')}. Selection or copying does not establish received help, consultation or benefit.`,
      `Errors: ${count('operation.error')}; logging recoveries: ${count('recorder.recovered')}; cancellations: ${count('operation.cancel')}.`,
      'Operation latency (wall time, not mental effort): '+(()=>{const a=rows.filter(e=>e.action==='operation.complete'&&Number.isFinite(e.data.duration_ms));return a.length?`${a.length} observations; mean ${(a.reduce((n,e)=>n+e.data.duration_ms,0)/a.length).toFixed(0)} ms.`:'unavailable.';})());
    for(const a of assessed)lines.push(`Latest assessment for attempt ${a.id}: ${a.observation.outcome}; ${a.assessment.at}; ${a.assessment.software?.version||'unknown version'} / ${a.assessment.software?.commit||'unknown commit'}; ${a.assessment.data.corrects?'linked correction':'original assessment'}.`);
    lines.push('');
  }
  if(projection.missing.length)lines.push('## Missing linked context','',...projection.missing.map(m=>`- ${m.reason}${m.attempt?' Attempt: '+m.attempt:''}${m.event?' Event: '+m.event:''}`),'Unsupported derived attempt values are excluded.','');
  if(!groups.size)lines.push('No recorded sessions selected. No earlier release history has been fabricated.');
  return lines.join('\n');
}
module.exports = { StudyHistory, summarize, selectHistoryContext, hash, POLICY };
