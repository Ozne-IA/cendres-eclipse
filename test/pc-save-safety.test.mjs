import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const save = (cendres) => ({ version: 2, res: { cendres }, buildings: {} });

/** Lance le serveur PC avec des fichiers déjà présents à côté du jeu (sauvegarde existante, fichier temporaire...). */
async function startWith(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'cendres-save-safety-'));
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
  await writeFile(join(root, 'dist', 'index.html'), '<title>save safety</title>');
  await cp(new URL('../launcher/', import.meta.url), join(root, 'launcher'), { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content);
  server = spawn(process.execPath, [join(root, 'launcher', 'server-pc.mjs'), '--port=0', '--no-open', '--no-update-check'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const origin = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Launcher stopped with code ${code}`)));
    let output = '';
    server.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
  });
  const get = async () => {
    const response = await fetch(`${origin}/api/save`, { signal: AbortSignal.timeout(3000) });
    return { status: response.status, body: await response.json() };
  };
  const post = (payload) => fetch(`${origin}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  });
  return { root, get, post };
}

test('a save from a newer game version is reported, then kept aside when the game saves again', { timeout: 15000 }, async (t) => {
  const future = { version: 3, inconnu: { a: 1 }, res: { cendres: 4242 } };
  const { root, get, post } = await startWith(t, { 'cendres-eclipse-save.json': JSON.stringify(future) });

  const first = await get();
  assert.equal(first.status, 200);
  assert.deepEqual(first.body, { exists: true, tooNew: true, version: 3 });
  assert.deepEqual(JSON.parse(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8')), future);

  assert.equal((await post(save(1))).status, 200);
  const aside = (await readdir(root)).filter((name) => name.includes('.newer-v3'));
  assert.equal(aside.length, 1);
  assert.deepEqual(JSON.parse(await readFile(join(root, aside[0]), 'utf8')), future);
  assert.deepEqual((await get()).body, { exists: true, save: save(1) });
});

test('a damaged save is moved aside, not erased, and the game still starts with its backup', { timeout: 15000 }, async (t) => {
  const { root, get, post } = await startWith(t, {
    'cendres-eclipse-save.json': '{"version":2,"res":{"cend',
    'cendres-eclipse-save.json.bak2': JSON.stringify(save(21)),
  });
  assert.deepEqual((await get()).body, { exists: true, save: save(21) });

  assert.equal((await post(save(22))).status, 200);
  const aside = (await readdir(root)).filter((name) => name.includes('.corrupt-'));
  assert.equal(aside.length, 1);
  assert.equal(await readFile(join(root, aside[0]), 'utf8'), '{"version":2,"res":{"cend');
});

test('temporary files left by an interrupted write are removed at startup and never read as a save', { timeout: 15000 }, async (t) => {
  const { root, get } = await startWith(t, { 'cendres-eclipse-save.json.9999.tmp': '{"à moitié écrit' });
  assert.deepEqual((await get()).body, { exists: false });
  assert.deepEqual((await readdir(root)).filter((name) => name.endsWith('.tmp')), []);
});

test('a save with a wrong checksum is refused as invalid', { timeout: 15000 }, async (t) => {
  const tampered = { ...save(5), _checksum: 'a'.repeat(64) };
  const { root, get } = await startWith(t, { 'cendres-eclipse-save.json': JSON.stringify(tampered) });
  assert.equal((await get()).status, 422);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8')), tampered);
});
