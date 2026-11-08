'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { StudyHistory, summarize, selectHistoryContext } = require('../src/studyHistory');

async function recorder(t, io = fs) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-history-reliability-'));
  const history = new StudyHistory(directory, { version: '0.19.1', commit: 'fixture' }, { io, origin: 'automated_test' });
  t.after(async () => { await history.close(); await fs.rm(directory, { recursive: true, force: true }); });
  await history.init();
  return history;
}

test('partial snapshot ENOSPC leaves no final fragment and buffered events recover in order', async t => {
  let fail = true, partialCreated = false;
  const io = { ...fs, writeFile: async (target, text, options) => {
    const snapshot = typeof target === 'string' ? target.includes(path.sep + 'snapshots' + path.sep) : !!target?.writeFile;
    if (fail && snapshot) {
      if (typeof target === 'string') await fs.writeFile(target, text.slice(0, 9), options);
      else await target.writeFile(text.slice(0, 9));
      partialCreated = true;
      throw Object.assign(new Error('Injected snapshot ENOSPC after partial bytes'), { code: 'ENOSPC' });
    }
    return fs.writeFile(target, text, options);
  } };
  const h = await recorder(t, io), exact = { answer: 'Complete immutable submitted mathematical work.' };
  const begun = h.record('attempt.begin', { attempt: 'one' });
  const id = h.snapshot(exact), submitted = h.record('attempt.submit', { attempt: 'one', snapshot: id });
  await h.flush();
  assert.equal(partialCreated, true, 'the failure occurs after real bytes have been created');
  assert.match(h.gap, /ENOSPC/);
  assert.equal(await fs.stat(path.join(h.directory, 'snapshots', id + '.json')).then(() => true, e => e.code === 'ENOENT' ? false : Promise.reject(e)), false);
  assert.deepEqual(await fs.readdir(path.join(h.directory, 'snapshots')), []);

  fail = false;
  const later = h.record('session.pause', { attempt: 'one' });
  await h.flush();
  assert.equal(h.gap, '');
  const final = path.join(h.directory, 'snapshots', id + '.json');
  assert.equal(await fs.readFile(final, 'utf8'), JSON.stringify(exact));
  assert.equal((await fs.stat(final)).mode & 0o777, 0o600);
  const events = await h.events(), ids = events.map(e => e.id);
  assert.equal(ids.filter(x => x === submitted.id).length, 1);
  assert.ok(ids.indexOf(begun.id) < ids.indexOf(submitted.id));
  assert.ok(ids.indexOf(submitted.id) < ids.indexOf(later.id));
  assert.ok(events.some(e => e.action === 'recorder.recovered'));
  assert.deepEqual(await fs.readdir(path.dirname(final)), [id + '.json']);
});

test('a preexisting mismatched snapshot and unrecognized temporary file are preserved', async t => {
  const h = await recorder(t), id = h.snapshot({ answer: 'Expected immutable work.' });
  const directory = path.join(h.directory, 'snapshots');
  await fs.mkdir(directory, { recursive: true });
  const final = path.join(directory, id + '.json'), foreign = path.join(directory, '.unrecognized.pending');
  await fs.writeFile(final, 'Do not replace this existing file.', { mode: 0o600 });
  await fs.writeFile(foreign, 'Unrecognized bytes.', { mode: 0o600 });
  const submitted = h.record('attempt.submit', { snapshot: id });
  await h.flush();
  const later = h.record('navigation.source');
  await h.flush();
  assert.match(h.gap, /History gap/);
  assert.equal(await fs.readFile(final, 'utf8'), 'Do not replace this existing file.');
  assert.equal(await fs.readFile(foreign, 'utf8'), 'Unrecognized bytes.');
  assert.deepEqual(h.pending.filter(e => [submitted.id, later.id].includes(e.id)).map(e => e.id), [submitted.id, later.id]);
});

test('failed snapshot cleanup does not unlink a substituted temporary path', async t => {
  let ownPath, replaced = false;
  const io = {
    ...fs,
    open: async (file, ...args) => {
      const handle = await fs.open(file, ...args);
      if (typeof file === 'string' && file.endsWith('.pending')) ownPath = file;
      return handle;
    },
    writeFile: async (target, text, options) => {
      if (!replaced && typeof target !== 'string' && target?.writeFile) {
        await target.writeFile(text.slice(0, 9));
        await fs.rename(ownPath, ownPath + '.earlier');
        await fs.writeFile(ownPath, 'Replacement file must survive.', { mode: 0o600 });
        replaced = true;
        throw Object.assign(new Error('Injected snapshot interruption'), { code: 'ENOSPC' });
      }
      return fs.writeFile(target, text, options);
    },
  };
  const h = await recorder(t, io), id = h.snapshot({ answer: 'Retained exact submission.' });
  h.record('attempt.submit', { snapshot: id });
  await h.flush();
  assert.equal(replaced, true);
  const foreignPath = ownPath;
  assert.equal(await fs.readFile(foreignPath, 'utf8'), 'Replacement file must survive.');
  assert.match(h.gap, /History gap/);
  await h.flush();
  assert.equal(h.gap, '');
  assert.equal(await fs.readFile(foreignPath, 'utf8'), 'Replacement file must survive.');
});

test('snapshot publication detects replacement during link and preserves the unrecognized final', async t => {
  const exact = { answer: 'Submitted bytes must remain immutable.' }, serialized = JSON.stringify(exact);
  let replacement, final, owned;
  const io = { ...fs, link: async (temporary, destination) => {
    replacement = temporary;
    final = destination;
    owned = temporary + '.owned';
    await fs.rename(temporary, owned);
    // Identical bytes still do not authorize treating a different inode as ours.
    await fs.writeFile(temporary, serialized, { mode: 0o600 });
    await fs.link(temporary, destination);
  } };
  const h = await recorder(t, io), id = h.snapshot(exact);
  const event = h.record('attempt.submit', { snapshot: id });
  await h.flush();
  assert.match(h.gap, /identity changed/);
  assert.equal(await fs.readFile(final, 'utf8'), serialized);
  assert.equal(await fs.readFile(replacement, 'utf8'), serialized);
  assert.notEqual((await fs.stat(final)).ino, (await fs.stat(owned)).ino);
  assert.ok(h.pending.some(e => e.id === event.id));
});

test('snapshot publication rejects foreign bytes linked after the temporary was verified', async t => {
  let final;
  const io = { ...fs, link: async (temporary, destination) => {
    final = destination;
    await fs.rename(temporary, temporary + '.owned');
    await fs.writeFile(temporary, 'Unrecognized replacement bytes.', { mode: 0o600 });
    await fs.link(temporary, destination);
  } };
  const h = await recorder(t, io), id = h.snapshot({ answer: 'Expected submission.' });
  const event = h.record('attempt.submit', { snapshot: id });
  await h.flush();
  assert.match(h.gap, /History gap/);
  assert.equal(await fs.readFile(final, 'utf8'), 'Unrecognized replacement bytes.');
  assert.ok(h.pending.some(e => e.id === event.id));
  await h.flush();
  assert.match(h.gap, /content differs/);
  assert.equal(await fs.readFile(final, 'utf8'), 'Unrecognized replacement bytes.');
});

function effortFixture(disposition = 'answered') {
  let sequence = 0;
  const event = (id, action, data, version = '0.19.0', session = 'original') => ({
    schema: 1, id, session, sequence: ++sequence, at: version === '0.19.0' ? '2026-11-01T12:00:00Z' : '2026-11-05T12:00:00Z',
    origin: 'automated_test', software: { version, commit: version === '0.19.0' ? 'old' : 'new' },
    identity: { study: 'study', attempt: 'attempt', question: 'revision' }, action, evidence: 'reader_report', data,
  });
  const rows = [
    event('begin', 'attempt.begin', { attempt: 'attempt' }),
    event('submit', 'attempt.submit', { attempt: 'attempt', snapshot: 'exact' }),
    event('offer', 'effort.offer', { attempt: 'attempt', wording: 1 }),
  ];
  if (disposition !== 'missing') rows.push(event('response', 'effort.response', {
    attempt: 'attempt', offer: 'offer', rating: disposition === 'answered' ? 7 : null, disposition,
  }, '0.19.1', 'resumed'));
  return rows;
}
function section(text, version) { return text.split('## automated_test · ' + version + ' · ')[1]?.split('\n## ')[0] || ''; }

test('effort answered after an upgrade belongs to its task and records response release separately', () => {
  const text = summarize(effortFixture()), original = section(text, '0.19.0'), resumed = section(text, '0.19.1');
  assert.match(original, /Effort: 1\/1 offers answered numerically; mean 7\.0 \/ 9\. Declined: 0; no response: 0; attempts not sampled: 0/);
  assert.match(original, /2026-11-05T12:00:00Z; 0\.19\.1 \/ new/);
  assert.match(resumed, /Effort: 0\/0 offers answered numerically/);
  assert.match(resumed, /Selected events: 1/);
});

test('reversed clocks do not transfer effort attribution from the original attempt to a later submission', () => {
  const rows = effortFixture();
  const submission = rows.find(e => e.id === 'submit');
  submission.at = '2026-10-31T12:00:00Z';
  submission.software = { version: '0.19.1', commit: 'new' };
  submission.session = 'resumed';
  const text = summarize(rows);
  assert.match(section(text, '0.19.0'), /Effort: 1\/1 offers answered numerically; mean 7\.0/);
  assert.match(section(text, '0.19.1'), /Effort: 0\/0 offers answered numerically/);
});

test('declined effort after an upgrade is not counted as missing or numerical', () => {
  const text = summarize(effortFixture('declined')), original = section(text, '0.19.0');
  assert.match(original, /Effort: 0\/1 offers answered numerically; mean unavailable \/ 9\. Declined: 1; no response: 0; attempts not sampled: 0/);
});

test('resumed-session-only export resolves effort through supporting context without extra selected activity', () => {
  const selected = selectHistoryContext(effortFixture(), ['resumed']);
  const text = summarize(selected.events), original = section(text, '0.19.0'), resumed = section(text, '0.19.1');
  assert.equal(selected.missing.length, 0);
  assert.match(original, /Sessions: 0; task revisions: 1\. Selected events: 0; supporting linked events: 3/);
  assert.match(original, /Effort: 1\/1 offers answered numerically; mean 7\.0/);
  assert.match(resumed, /Sessions: 1; task revisions: 0\. Selected events: 1; supporting linked events: 0/);
  assert.match(resumed, /Effort: 0\/0 offers answered numerically/);
});

test('missing effort links are disclosed and never fabricated as a sample', () => {
  const rows = effortFixture().filter(e => e.id !== 'offer');
  const text = summarize(rows);
  assert.match(text, /Missing linked context/);
  assert.match(text, /[Ee]ffort.*offer.*unavailable/);
  assert.doesNotMatch(text, /Effort: 1\/1/);
  assert.match(section(text, '0.19.0'), /attempts not sampled: 1/);
});

test('unreturned and unsampled effort remain distinct and supporting-only context adds no sample', () => {
  const rows = effortFixture('missing');
  assert.match(section(summarize(rows), '0.19.0'), /Effort: 0\/1 offers answered numerically; mean unavailable \/ 9\. Declined: 0; no response: 1; attempts not sampled: 0/);
  const supporting = effortFixture().map(e => ({ ...e, export_context: { role: ['offer', 'response'].includes(e.id) ? 'supporting' : 'selected' } }));
  assert.match(section(summarize(supporting), '0.19.0'), /Effort: 0\/0 offers answered numerically/);
  assert.match(section(summarize(supporting), '0.19.0'), /attempts not sampled: 1/);
});

test('supporting earlier attempts resolve adaptation evidence without entering selected task denominators', () => {
  const prior = effortFixture('missing').filter(e => e.id !== 'offer').map(e => ({
    ...e, export_context: { role: 'supporting' },
  }));
  const assessment = {
    ...prior[1], id: 'prior-outcome', action: 'attempt.outcome',
    data: { attempt: 'attempt', submission: 'submit', activity: 'definition', outcome: 'unaided_success', assessor: 'reader', consulted: false },
  };
  prior.push(assessment);
  const current = prior.map(e => ({
    ...e, id: 'current-' + e.id, session: 'resumed', software: { version: '0.19.1', commit: 'new' },
    identity: { ...e.identity, attempt: 'current-attempt' }, export_context: { role: 'selected' },
    data: { ...e.data, attempt: 'current-attempt', ...(e.action === 'attempt.outcome' ? { submission: 'current-submit' } : {}) },
  }));
  current.push({ ...current[0], id: 'adaptation', action: 'adaptation.offer', data: { attempt: 'current-attempt', evidence: ['prior-outcome', 'current-prior-outcome'] } });
  const text = summarize([...prior, ...current]);
  const original = section(text, '0.19.0'), selected = section(text, '0.19.1');
  assert.match(original, /Selected events: 0; supporting linked events: 3/);
  assert.match(original, /Attempts: 0; Submissions: 0/);
  assert.match(original, /assessed attempts: 0/);
  assert.match(original, /attempts not sampled: 0/);
  assert.match(selected, /Attempts: 1; Submissions: 1/);
  assert.match(selected, /assessed attempts: 1/);
  assert.match(selected, /attempts not sampled: 1/);
});


test('cross-session export resolves other-solution exposure by its event and exact attributed snapshot, including legacy revisions', async t => {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-solution-export-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const identity={study:'document-study',attempt:'active-attempt',question:'active-revision'};
  const original=new StudyHistory(directory,{version:'0.23.1',commit:'original'},{origin:'automated_test'});await original.init();original.setContext(identity);
  original.record('attempt.begin',{attempt:identity.attempt});
  const solution={text:'Exact attributed solution λ.',author:'Reader',origin:'human'};
  const current={id:identity.attempt,question:{id:'active-question',revision:'active-revision'},submissions:[],draft:'Keep my draft',finished:false,helpExposures:[]};
  require('../src/studyDocument').review({current},{id:'other-question',revision:'other-revision',answer:solution},original);
  assert.equal(current.draft,'Keep my draft');assert.match(current.helpExposures[0],/^solution-review:/);await original.close();
  const resumed=new StudyHistory(directory,{version:'0.23.2',commit:'resumed'},{origin:'automated_test'});await resumed.init();resumed.setContext(identity);t.after(()=>resumed.close());
  const submitted=resumed.record('attempt.submit',{attempt:identity.attempt,help_visible:true,help_responses:current.helpExposures,snapshot:resumed.snapshot({answer:current.draft})});
  resumed.record('attempt.outcome',{attempt:identity.attempt,submission:submitted.id,activity:'argument',outcome:'help_dependent',assessor:'reader',consulted:true});
  const all=await resumed.events();
  for(const legacy of [false,true]) {
    const rows=legacy?all.map(e=>e.id===submitted.id?{...e,data:{...e.data,help_responses:['solution:other-revision']}}:e):all;
    const exported=selectHistoryContext(rows,[resumed.session]);assert.deepEqual(exported.missing,[]);
    const review=exported.events.find(e=>e.action==='solution.review');assert.ok(review);assert.equal(review.export_context.role,'supporting');
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'snapshots',review.data.snapshot+'.json'),'utf8')),solution);
    assert.equal(require('../src/studyEvidence').projectAttempts(exported.events).attempts[0].observation.help_visible,true);
  }
  const foreign=all.map(e=>e.action==='solution.review'?{...e,identity:{...e.identity,study:'another-study'}}:e);
  assert.ok(selectHistoryContext(foreign,[resumed.session]).missing.some(m=>m.reason==='Linked solution review unavailable.'));
});
