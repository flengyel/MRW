'use strict';
// One local recorder. No provider, source scanner, editor text listener or telemetry.
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const { constants } = require('node:fs');
const files=require('./studyFiles');
const {digests}=require('./studyLifecycle');
const { performance } = require('node:perf_hooks');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const POLICY = 'study-feedback-2', SCHEMA = 1;
const { projectAttempts, projectEffort, selectHistoryContext, readerRecall, unaidedRecall, attemptKey } = require('./studyEvidence');
class StudyHistory {
  constructor(directory, software, { io = fs, origin = 'production', onGap = () => {} } = {}) {
    this.directory = directory; this.software = software; this.io = io; this.origin = origin; this.onGap = onGap;
    this.session = crypto.randomUUID(); this.sequence = 0; this.pending = []; this.snapshots = new Map();
    this.excluded=new Set();this.snapshotStudies=new Map();
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
    if(!this.excluded.has(identity?.study)){this.pending.push(e); this.schedule();} return e;
  }
  snapshot(value) {
    const text = JSON.stringify(value), id = hash(text);
    if(!this.excluded.has(this.context?.study)){
      const owners=this.snapshotStudies.get(id)||new Set();owners.add(this.context?.study||null);this.snapshotStudies.set(id,owners);
      this.snapshots.set(id,text);this.schedule();
    }return id;
  }
  schedule() { if (!this.timer) { this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 250); this.timer.unref?.(); } }
  failure(e) { this.gap = 'History gap: ' + e.message + '. Reading and drafts remain available.'; this.onGap(this.gap); }
  async checkSnapshot(file, id, text, identity) {
    let handle;
    try {
      handle = await this.io.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const retainedIdentity = await handle.stat();
      if (!retainedIdentity.isFile()) throw new Error('Immutable snapshot is not a regular file: ' + id);
      if (identity && (retainedIdentity.dev !== identity.dev || retainedIdentity.ino !== identity.ino)) throw new Error('Published snapshot identity changed: ' + id);
      const retained = await handle.readFile('utf8');
      if (hash(retained) !== id || retained !== text) throw new Error('Immutable snapshot content differs: ' + id);
      const namedIdentity = await this.io.lstat(file);
      if (!namedIdentity.isFile() || namedIdentity.dev !== retainedIdentity.dev || namedIdentity.ino !== retainedIdentity.ino) throw new Error('Snapshot file identity changed: ' + id);
    } finally { await handle?.close(); }
  }
  async removeOwnedTemporary(file, identity) {
    if (!identity) return;
    let current;
    try { current = await this.io.lstat(file); }
    catch (e) { if (e.code === 'ENOENT') return; throw e; }
    // A replaced path belongs to somebody else, even though its name was ours.
    if (current.isFile() && current.dev === identity.dev && current.ino === identity.ino) await this.io.unlink(file);
  }
  async publishSnapshot(id, text) {
    if (hash(text) !== id) throw new Error('Snapshot digest differs from its content: ' + id);
    const directory = path.join(this.directory, 'snapshots'), file = path.join(directory, id + '.json');
    try { await this.checkSnapshot(file, id, text); return; }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    const temporary = path.join(directory, '.' + id + '-' + crypto.randomUUID() + '.pending');
    let handle, identity;
    try {
      handle = await this.io.open(temporary, 'wx', 0o600);
      identity = await handle.stat();
      // A failed write can leave partial bytes here, never under the immutable name.
      await this.io.writeFile(handle, text);
      await handle.sync();
      const current = await this.io.lstat(temporary);
      if (!current.isFile() || current.dev !== identity.dev || current.ino !== identity.ino) throw new Error('Snapshot temporary file identity changed.');
      await this.checkSnapshot(temporary, id, text);
      try {
        await this.io.link(temporary, file);
        await this.checkSnapshot(file, id, text, identity);
      }
      catch (e) {
        if (e.code !== 'EEXIST') throw e;
        // An existing immutable file is accepted only when its complete bytes agree.
        await this.checkSnapshot(file, id, text);
      }
    } finally {
      try { await handle?.close(); }
      finally { await this.removeOwnedTemporary(temporary, identity); }
    }
  }
  excludeStudies(ids){for(const id of ids)this.excluded.add(id);}
  async refreshExcluded(){
    if(!this.lifecycleDirectory)return;
    let names;
    try{names=await this.io.readdir(this.lifecycleDirectory);}catch(e){if(e.code==='ENOENT')return;throw e;}
    for(const name of names)if(/^[a-f0-9]{64}\.lifecycle\.json$/.test(name)){
      const r=await files.json(this.io,path.join(this.lifecycleDirectory,name));
      if(['deleting','deleted'].includes(r.state))this.excluded.add(r.id);
    }
  }
  belongs(e,id){return e.identity?.study===id||e.data?.study===id;}
  async deletionScope(id){
    await this.flush();if(this.gap)throw Error(this.gap);
    const events=await this.readEvents();
    return {events:events.filter(e=>this.belongs(e,id)),snapshots:digests(events.filter(e=>this.belongs(e,id))),retained:digests(events.filter(e=>!this.belongs(e,id)))};
  }
  async historyFiles(){
    const names=(await this.io.readdir(this.directory)).filter(n=>/^[a-f0-9-]+-\d+-\d+\.json(?:\.pending)*$/.test(n)).sort(),all=new Set(names);
    // An interrupted atomic replacement can leave partial staging bytes beside
    // the complete published batch. The published batch remains authoritative;
    // retry its filtering before removing superseded staging files.
    const staging=names.filter(n=>n.endsWith('.pending')&&all.has(n.slice(0,-8)));
    return {records:names.filter(n=>!staging.includes(n)),staging};
  }
  async readEvents(){
    const events=[];
    for(const name of (await this.historyFiles()).records){
      const rows=await files.json(this.io,path.join(this.directory,name));
      if(!Array.isArray(rows))throw Error('Study history is invalid; deletion stopped.');
      events.push(...rows);
    }
    return events;
  }
  async retainReferencedSnapshots(retained){
    // Some retained payloads reference earlier snapshots. Follow only existing,
    // digest-verified private snapshot files; never resolve arbitrary paths.
    const visited=new Set();
    for(const id of retained){
      if(visited.has(id))continue;visited.add(id);
      const file=path.join(this.directory,'snapshots',id+'.json');
      try{await files.regular(this.io,file);const text=await this.io.readFile(file,'utf8');
        if(hash(text)!==id)throw Error('Retained snapshot digest differs; deletion stopped.');
        digests(JSON.parse(text),retained);
      }catch(e){if(e.code!=='ENOENT')throw e;}
    }
    return retained;
  }
  eraseStudy(id,candidates,retained){
    this.excludeStudies([id]);
    const job=this.tail.then(async()=>{
      // Complete lists are read before any removal. A malformed history file
      // stops cleanup, leaving the durable deletion intent for retry.
      const entries=[],batches=await this.historyFiles();
      for(const name of batches.records){
        const file=path.join(this.directory,name),rows=await files.json(this.io,file);
        if(!Array.isArray(rows))throw Error('Study history is invalid; deletion stopped.');
        const keep=rows.filter(e=>!this.belongs(e,id));digests(keep,retained);entries.push({file,rows,keep});
      }
      this.pending=this.pending.filter(e=>!this.belongs(e,id));digests(this.pending,retained);
      await this.retainReferencedSnapshots(retained);
      for(const {file,rows,keep} of entries)if(keep.length!==rows.length){
        if(keep.length)await files.write(this.io,file,JSON.stringify(keep)+'\n');else await files.remove(this.io,file);
      }
      for(const name of batches.staging)await files.remove(this.io,path.join(this.directory,name));
      for(const candidate of candidates)if(!retained.has(candidate)){
        this.snapshots.delete(candidate);this.snapshotStudies.delete(candidate);
        const directory=path.join(this.directory,'snapshots');
        try{await files.remove(this.io,path.join(directory,candidate+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
        // Failed immutable publication may have left only an owned temp name.
        for(const name of await this.io.readdir(directory).catch(e=>{if(e.code==='ENOENT')return[];throw e;}))
          if(name.startsWith('.'+candidate+'-')&&name.endsWith('.pending'))await files.remove(this.io,path.join(directory,name));
      }
    });this.tail=job.catch(e=>this.failure(e));return job;
  }
  flush() {
    clearTimeout(this.timer); this.timer = undefined;
    this.tail = this.tail.then(async () => {
      try{await this.refreshExcluded();}catch(e){this.failure(e);return;}
      this.pending=this.pending.filter(e=>!this.excluded.has(e.identity?.study)&&!this.excluded.has(e.data?.study));
      for(const [id,owners] of this.snapshotStudies)if([...owners].every(owner=>this.excluded.has(owner)))this.snapshots.delete(id);
      if (!this.pending.length && !this.snapshots.size) return;
      const events = this.pending.splice(0), snapshots = new Map(this.snapshots); this.snapshots.clear();
      try {
        await this.io.mkdir(path.join(this.directory, 'snapshots'), { recursive: true, mode: 0o700 });
        for (const [id, text] of snapshots) await this.publishSnapshot(id, text);
        if (events.length) {
          const file = path.join(this.directory, this.session + '-' + events[0].sequence + '-' + events.at(-1).sequence + '.json');
          const text = JSON.stringify(events) + '\n', temporary = file + '.pending';
          await files.write(this.io,file,text);
        }
        for(const id of snapshots.keys())if(!this.snapshots.has(id))this.snapshotStudies.delete(id);
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
    return [...byID.values()].filter(e=>!this.excluded.has(e.identity?.study)&&!this.excluded.has(e.data?.study)).sort((a,b) => a.at.localeCompare(b.at) || a.session.localeCompare(b.session) || a.sequence-b.sequence);
  }
  async close() {
    if (!this.started || this.closed) return;this.closed=true;
    await this.ready;this.record('session.end'); await this.flush();
    if (!this.gap) await this.io.unlink(path.join(this.directory, 'live-' + this.session + '.json')).catch(e => this.failure(e));
  }
}
function summarize(events) {
  const projection=projectAttempts(events),effortProjection=projectEffort(events),groups=new Map();
  const selectedAttemptKeys=new Set(projection.events.filter(e=>e.export_context?.role!=='supporting').map(attemptKey).filter(Boolean));
  const group=e=>{const key=[e.origin,e.software?.version||'unknown version',e.software?.commit||'unknown commit'].join(' · ');if(!groups.has(key))groups.set(key,{events:[],attempts:[],effort:[]});return groups.get(key);};
  for(const e of projection.events)group(e).events.push(e);
  for(const a of projection.attempts)if(a.anchor)group(a.anchor).attempts.push(a);
  for(const effort of effortProjection.offers)if(effort.supported&&effort.selected&&effort.anchor)group(effort.anchor).effort.push(effort);
  const lines=['# Local study comparison','','Descriptive only: tasks, revisions and prior exposure differ. Visibility records exposure opportunity, not reading. No causal learning effect is inferred from a version change.',
    'Attempts and submission revisions belong to the version of the original attempt. Assessments and linked corrections retain their own dates and software versions. Supporting export context is labeled and does not count as selected-session activity.',''];
  for(const [version,g] of groups) {
    const rows=g.events.filter(e=>e.export_context?.role!=='supporting'),support=g.events.filter(e=>e.export_context?.role==='supporting');
    const attempts=g.attempts.filter(a=>selectedAttemptKeys.has(a.key));
    const count=action=>rows.filter(e=>e.action===action).length;
    const submitted=attempts.flatMap(a=>a.submissions),assessed=attempts.filter(a=>a.observation&&a.observation.outcome!=='unassessed');
    const recall=assessed.filter(a=>readerRecall(a.observation)),application=assessed.filter(a=>a.observation.activity==='application');
    const delayed=recall.filter(a=>a.observation.delayed_days!==null&&a.observation.delayed_days>=1);
    const offers=g.effort,efforts=offers.filter(e=>Number.isInteger(e.rating)&&e.rating>=1&&e.rating<=9);
    const sampledAttempts=new Set(offers.map(e=>attemptKey(e.offer)));
    const unsampled=attempts.filter(a=>a.submissions.length&&!sampledAttempts.has(a.key)).length;
    const revisions=new Set(attempts.filter(a=>a.anchor.identity?.question).map(a=>JSON.stringify([a.study,a.anchor.identity.question])));
    lines.push('## '+version,'',`Sessions: ${new Set(rows.map(e=>e.session)).size}; task revisions: ${revisions.size}. Selected events: ${rows.length}; supporting linked events: ${support.length}.`,
      `Attempts: ${attempts.length}; Submissions: ${submitted.length} (immutable submission revisions); assessed attempts: ${assessed.length}; submissions without an outcome: ${submitted.filter(e=>!attempts.some(a=>a.assessment?.data.submission===e.id&&a.observation?.outcome!=='unassessed')).length}.`,
      `Submitted attempts without an assessed outcome: ${attempts.filter(a=>a.submissions.length&&(!a.observation||a.observation.outcome==='unassessed')).length}. Assessment events in selected sessions: ${count('attempt.outcome')}; corrections: ${count('attempt.correction')}. These are not additional attempts.`,
      `Reader-confirmed recall outcomes: ${recall.length}; application outcomes: ${application.length} (kept separate); AI assessments: ${assessed.filter(a=>a.observation.assessor==='ai').length}; unknown consultation: ${assessed.filter(a=>typeof a.observation.consulted!=='boolean').length}.`,
      `Delayed recall (≥1 day): ${delayed.length}; reported unaided successes: ${delayed.filter(a=>unaidedRecall(a.observation)).length}/${delayed.length}; recall timing unknown or first review: ${recall.filter(a=>a.observation.delayed_days===null).length}.`,
      `Help-dependent: ${assessed.filter(a=>a.observation.outcome==='help_dependent').length}/${assessed.length}; unresolved: ${assessed.filter(a=>a.observation.outcome==='unresolved').length}/${assessed.length}; skipped: ${count('attempt.skip')}.`,
      `Hints: ${count('attempt.hint')}; reference-answer reveals: ${count('attempt.answer')}; source exposures: ${rows.filter(e=>e.action==='source.visibility'&&e.data.visible===true).length}; retained-help display opportunities: ${count('help.display')}; pasted-help previews: ${count('help.preview')}.`,
      `Solution reviews: ${count('solution.review')}; solutions saved/revised: ${count('solution.save')}; document-context displays: ${rows.filter(e=>e.action==='document.context_display'&&e.data.visible).length}; later-problem actions: ${count('problem.later')}. These do not constitute recall grades.`,
      `Effort: ${efforts.length}/${offers.length} offers answered numerically; mean ${efforts.length?(efforts.reduce((n,e)=>n+e.rating,0)/efforts.length).toFixed(1):'unavailable'} / 9. Declined: ${offers.filter(e=>e.disposition==='declined').length}; no response: ${offers.filter(e=>e.disposition==='no_response').length}; attempts not sampled: ${unsampled}.`,
      `Navigation actions: ${rows.filter(e=>e.action.startsWith('navigation.')||e.action==='source.change').length}; pauses: ${count('session.pause')}; resumes: ${count('study.resume')}; unclean endings inferred: ${count('session.unclean')}.`,
      `Review admissions: ${count('review.admit')}; retirements: ${count('review.retire')}; deferrals: ${count('review.defer')}; blocks stopped: ${count('block.stop')}.`,
      `Adaptation selections: ${count('adaptation.choice')}; selections to continue: ${rows.filter(e=>e.action==='adaptation.choice'&&e.data.choice==='continue').length}; companion requests copied: ${count('help.request')+rows.filter(e=>e.action==='handoff.copy'&&e.data.purpose!=='questions').length}; responses retained: ${count('help.retained')}. Selection or copying does not establish received help, consultation or benefit.`,
      `Errors: ${count('operation.error')}; logging recoveries: ${count('recorder.recovered')}; cancellations: ${count('operation.cancel')}.`,
      'Operation latency (wall time, not mental effort): '+(()=>{const a=rows.filter(e=>e.action==='operation.complete'&&Number.isFinite(e.data.duration_ms));return a.length?`${a.length} observations; mean ${(a.reduce((n,e)=>n+e.data.duration_ms,0)/a.length).toFixed(0)} ms.`:'unavailable.';})());
    for(const a of assessed)lines.push(`Latest assessment for attempt ${a.id}: ${a.observation.outcome}; ${a.assessment.at}; ${a.assessment.software?.version||'unknown version'} / ${a.assessment.software?.commit||'unknown commit'}; ${a.assessment.data.corrects?'linked correction':'original assessment'}.`);
    for(const effort of offers) {
      const observation=Number.isInteger(effort.rating)?`reader report ${effort.rating} / 9`:effort.disposition;
      const response=effort.response?`${effort.response.at}; ${effort.response.software?.version||'unknown version'} / ${effort.response.software?.commit||'unknown commit'}`:'unavailable';
      lines.push(`Effort for attempt ${effort.attempt}: ${observation}; offer ${effort.offer.id} at ${effort.offer.at}; response ${response}. Attributed to the original task above.`);
    }
    lines.push('');
  }
  const missing=[...projection.missing,...effortProjection.missing];
  if(missing.length)lines.push('## Missing linked context','',...missing.map(m=>`- ${m.reason}${m.attempt?' Attempt: '+m.attempt:''}${m.event?' Event: '+m.event:''}`),'Unsupported derived attempt and effort values are excluded.','');
  if(!groups.size)lines.push('No recorded sessions selected. No earlier release history has been fabricated.');
  return lines.join('\n');
}
module.exports = { StudyHistory, summarize, selectHistoryContext, hash, POLICY };
