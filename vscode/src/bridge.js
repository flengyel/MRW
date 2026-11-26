'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const MAX_REQUEST = 4 * 1024 * 1024;
const MAX_REPLY = 64 * 1024 * 1024;

function runBridge(extensionPath, executable, request, options = {}) {
  if (typeof executable !== 'string' || !executable.trim() || executable.includes('\0')) {
    return Promise.reject(new Error('Configure a Python 3.11+ executable in User or Remote settings.'));
  }
  const raw = Buffer.from(JSON.stringify({ ...request, protocol: 1 }), 'utf8');
  if (raw.length > MAX_REQUEST) return Promise.reject(new Error('Editor request is too large.'));
  return new Promise((resolve, reject) => {
    const child = (options.spawn || spawn)(executable,
      ['-I', path.join(extensionPath, 'python', 'bridge.py')],
      { cwd: extensionPath, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let size = 0, errors = '', done = false;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('Action timed out. The outcome may be uncertain; inspect the destination before any new action.'));
    }, options.timeout || 30000);
    const abort = () => { child.kill(); finish(new Error('Artifact operation interrupted. Run MRW: Recover Artifact Move to verify the committed location before continuing.')); };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    child.on('error', error => finish(new Error(`Cannot start Python service: ${error.message}`)));
    child.stdin.on('error', error => finish(new Error(`Python input failed: ${error.message}`)));
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_REPLY) {
        child.kill();
        finish(new Error('Record response exceeds the display limit.'));
      } else chunks.push(chunk);
    });
    child.stderr.on('data', chunk => { errors = (errors + chunk.toString('utf8')).slice(0, 2000); });
    child.on('close', code => {
      if (done) return;
      try {
        const reply = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (reply.protocol !== 1 || typeof reply.ok !== 'boolean') throw new Error('Invalid bridge response');
        if (!reply.ok) {
          const error = new Error(reply.error || 'Record action failed.');
          error.code = 'ACTION_REJECTED';
          return finish(error);
        }
        if (code !== 0 || !reply.result || typeof reply.result !== 'object') throw new Error('Invalid bridge result');
        finish(null, reply.result);
      } catch (error) {
        finish(new Error(`Python service failed (${code}): ${errors || error.message}`));
      }
    });
    child.stdin.end(raw);
  });
}

module.exports = { runBridge };
