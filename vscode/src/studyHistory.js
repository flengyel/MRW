'use strict';
// One local recorder. No provider, source scanner, editor text listener or telemetry.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const POLICY = 'light-study-1', SCHEMA = 1;
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
      at: new Date().toISOString(), monotonic_ms: performance.now(), origin: this.origin,
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
  const groups = new Map();
  // Corrections remain events; the summary reports the latest explicit outcome per attempt.
  for (const e of events) {
    const key = [e.origin, e.software.version, e.software.commit].join(' · ');
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e);
  }
  const lines = ['# Local study comparison', '', 'Descriptive only: tasks, revisions and prior exposure differ. Visibility records exposure opportunity, not reading.', ''];
  for (const [version, rows] of groups) {
    const count = action => rows.filter(e => e.action === action).length;
    const outcomes = new Map(); for (const e of rows.filter(e => ['attempt.outcome','attempt.correction'].includes(e.action))) outcomes.set(e.data.attempt, e);
    const assessed = [...outcomes.values()].filter(e=>e.data.outcome!=='unassessed'), submitted = rows.filter(e => e.action === 'attempt.submit');
    const efforts = rows.filter(e => e.action === 'effort.response' && Number.isInteger(e.data.rating));
    const offers = rows.filter(e => e.action === 'effort.offer'), responses = rows.filter(e => e.action === 'effort.response');
    const answered = new Set(responses.map(e => e.data.offer));
    const recall = assessed.filter(e => e.data.activity !== 'application');
    const application = assessed.filter(e => e.data.activity === 'application');
    const delayed = recall.filter(e => e.data.delayed_days >= 1);
    const unaided = e => e.data.outcome==='unaided_success'&&e.data.assessor==='reader'&&e.data.consulted===false&&!e.data.hints&&!e.data.answer_visible;
    lines.push('## ' + version, '', `Sessions: ${new Set(rows.map(e=>e.session)).size}; task revisions: ${new Set(rows.map(e=>JSON.stringify(e.identity.question)).filter(x=>x&&x!=='null')).size}.`,
      `Submissions: ${submitted.length}; assessed attempts: ${assessed.length}; submissions without an outcome: ${submitted.filter(e=>(!outcomes.has(e.data.attempt)||outcomes.get(e.data.attempt).data.outcome==='unassessed')).length}.`,
      `Recall outcomes: ${recall.length}; application outcomes: ${application.length} (kept separate). Delayed recall (≥1 day): ${delayed.length}; reported unaided successes: ${delayed.filter(unaided).length}/${delayed.length}.`,
      `Help-dependent: ${assessed.filter(e=>e.data.outcome==='help_dependent').length}/${assessed.length}; unresolved: ${assessed.filter(e=>e.data.outcome==='unresolved').length}/${assessed.length}; skipped: ${count('attempt.skip')}.`,
      `Hints: ${count('attempt.hint')}; reference-answer reveals: ${count('attempt.answer')}; source exposures: ${count('source.visibility')}.`,
      `Effort: ${efforts.length}/${offers.length} offers answered numerically; mean ${efforts.length?(efforts.reduce((n,e)=>n+e.data.rating,0)/efforts.length).toFixed(1):'unavailable'} / 9. Declined: ${responses.filter(e=>e.data.disposition==='declined').length}; no response: ${responses.filter(e=>e.data.disposition==='no_response').length+offers.filter(e=>!answered.has(e.id)).length}; attempts not sampled: ${Math.max(0,new Set(submitted.map(e=>e.data.attempt)).size-new Set(offers.map(e=>e.data.attempt)).size)}.`,
      `Navigation actions: ${rows.filter(e=>e.action.startsWith('navigation.')||e.action==='source.change').length}; pauses: ${count('session.pause')}; resumes: ${count('study.resume')}; unclean endings inferred: ${count('session.unclean')}.`,
      `Review admissions: ${count('review.admit')}; retirements: ${count('review.retire')}; deferrals: ${count('review.defer')}; blocks stopped: ${count('block.stop')}.`,
      `Adaptation accepted: ${rows.filter(e=>e.action==='adaptation.choice'&&e.data.choice!=='continue').length}; overrides: ${rows.filter(e=>e.action==='adaptation.choice'&&e.data.choice==='continue').length}.`,
      `Errors: ${count('operation.error')}; logging gaps: ${count('recorder.recovered')}; cancellations: ${count('operation.cancel')}.`,
      'Operation latency (wall time, not mental effort): ' + (()=>{const a=rows.filter(e=>e.action==='operation.complete'&&Number.isFinite(e.data.duration_ms));return a.length?`${a.length} observations; mean ${(a.reduce((n,e)=>n+e.data.duration_ms,0)/a.length).toFixed(0)} ms.`:'unavailable.';})(), '');
  }
  if (!groups.size) lines.push('No recorded sessions selected. No earlier release history has been fabricated.');
  return lines.join('\n');
}
module.exports = { StudyHistory, summarize, hash, POLICY };
