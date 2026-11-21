import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('the PC launcher loads and preserves a valid backup when the main save is corrupted', { timeout: 10000 }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'cendres-save-test-'));
  let server;
  t.after(async () => {
    if (server?.pid && server.exitCode === null && server.signalCode === null) {
      const closed = once(server, 'close');
      server.kill();
      await closed;
    }
    await rm(root, { recursive: true, force: true });
  });

  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist', 'index.html'), '<title>PC save test</title>');
  const launcher = join(root, 'launcher', 'server-pc.mjs');
  await cp(new URL('../launcher/', import.meta.url), join(root, 'launcher'), { recursive: true });

  server = spawn(process.execPath, [launcher, '--port=0', '--no-open'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const origin = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Launcher stopped with code ${code}`)));
    let output = '';
    server.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) resolve(match[0]);
    });
  });
  const endpoint = new URL('/api/save', origin);
  const get = () => fetch(endpoint, { signal: AbortSignal.timeout(2000) });
  const post = (save) => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(save),
    signal: AbortSignal.timeout(2000),
  });
  const original = { version: 2, res: { cendres: 42 }, buildings: {} };
  const newer = { ...original, res: { cendres: 50 } };
  const primary = join(root, 'cendres-eclipse-save.json');
  const backup = `${primary}.bak`;

  assert.deepEqual(await (await get()).json(), { exists: false });
  assert.equal((await post(original)).status, 200);
  assert.equal((await post(newer)).status, 200);
  await writeFile(primary, '{');

  assert.deepEqual(await (await get()).json(), { exists: true, save: original });
  assert.equal((await post(newer)).status, 200);
  assert.deepEqual(await (await get()).json(), { exists: true, save: newer });
  // La copie contient la sauvegarde et sa somme de contrôle (champ _checksum).
  const { _checksum, ...backupSave } = JSON.parse(await readFile(backup, 'utf8'));
  assert.equal(typeof _checksum, 'string');
  assert.deepEqual(backupSave, original);

  await writeFile(primary, '{}');
  await writeFile(backup, '{');
  assert.equal((await get()).status, 422);
});
