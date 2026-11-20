'use strict';
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');
const test = require('node:test');
const { makeExternal, parseExternal } = require('../src/companionLinks');
const { sendOrgCapture } = require('../src/orgCapture');

const target = {
  workspace: 'vscode-remote://wsl+Debian/home/reader/mrw-work',
  project: '/home/reader/mrw-work',
  reference: 'mrw-outline:v2/stacks-project:08ZH/scope/outline/revision/region/2.0-4.3',
};
const passage = {
  link: makeExternal(target),
  title: 'Degree, trace & norm',
  text: 'Let α ∈ K.\nUse K/ℚ & a+b. The text \\%20 is literal.\nEnd of the passage.',
};

function fixture(backend = 'denote', template = 'm') {
  const client = new EventEmitter();
  const calls = [], status = [], warnings = [];
  let detached = false;
  client.unref = () => { detached = true; };
  const settings = { orgCaptureBackend: backend, orgCaptureTemplate: template };
  const vscode = {
    workspace: {
      isTrusted: true,
      getConfiguration: () => ({ get: (key, fallback) => settings[key] ?? fallback }),
    },
    window: {
      setStatusBarMessage: message => status.push(message),
      showWarningMessage: message => warnings.push(message),
    },
  };
  const send = (input = passage) => sendOrgCapture(vscode, input, (...args) => {
    calls.push(args);
    return client;
  });
  return { client, calls, status, warnings, vscode, send, detached: () => detached };
}

for (const backend of ['denote', 'org-roam']) {
  test(backend + ' receives an exact passage and returns its immutable MRW link', async () => {
    const fixtureRun = fixture(backend, 'mr');
    const dispatched = fixtureRun.send();
    const [[program, args, options]] = fixtureRun.calls;
    const uri = new URL(args.at(-1));
    assert.equal(program, 'emacsclient');
    assert.deepEqual(args.slice(0, -1), ['--no-wait', '--quiet', '--']);
    assert.equal(options.stdio, 'ignore');
    assert.equal(options.env.ALTERNATE_EDITOR, undefined);
    assert.equal(options.env.EMACS_SERVER_FILE, undefined);

    const roam = backend === 'org-roam';
    assert.equal(uri.host, roam ? 'roam-ref' : 'capture');
    const fields = Object.fromEntries(Array.from(uri.searchParams, ([key, value]) => [
      key, roam ? decodeURIComponent(value) : value,
    ]));
    assert.equal(fields.template, 'mr');
    assert.equal(fields.body, passage.text);
    assert.equal(fields.title, passage.title);
    assert.deepEqual(parseExternal(fields[roam ? 'ref' : 'url']), target);

    fixtureRun.client.emit('spawn');
    await dispatched;
    assert.ok(fixtureRun.detached());
    assert.equal(fixtureRun.status.length, 1);
    assert.equal(fixtureRun.warnings.length, 0);
    // Prompts may keep Emacs waiting. A later client failure cannot trigger a resend.
    fixtureRun.client.emit('exit', 1);
    assert.equal(fixtureRun.warnings.length, 1);
    assert.equal(fixtureRun.calls.length, 1);
  });
}

test('unconfigured, untrusted and too-large captures do not start Emacs', async () => {
  const missing = fixture('denote', '');
  await assert.rejects(missing.send(), /Org Capture Template/u);
  assert.equal(missing.calls.length, 0);

  const untrusted = fixture();
  untrusted.vscode.workspace.isTrusted = false;
  await assert.rejects(untrusted.send(), /Trust the current workspace/u);
  assert.equal(untrusted.calls.length, 0);

  const oversize = fixture();
  await assert.rejects(oversize.send({ ...passage, text: 'ℚ'.repeat(16000) }), /too long/u);
  assert.equal(oversize.calls.length, 0);
});

test('missing emacsclient reports failure without repeating the request', async () => {
  const fixtureRun = fixture();
  const dispatched = fixtureRun.send();
  fixtureRun.client.emit('error', { code: 'ENOENT' });
  await assert.rejects(dispatched, /Emacs client is unavailable/u);
  assert.equal(fixtureRun.calls.length, 1);
  assert.equal(fixtureRun.status.length, 0);
});
