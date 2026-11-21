import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

/** Lance une copie du serveur PC dans un dossier temporaire et renvoie son adresse. */
async function startServer(t) {
  const root = await mkdtemp(join(tmpdir(), 'cendres-security-test-'));
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
  await mkdir(join(root, 'launcher'));
  await writeFile(join(root, 'dist', 'index.html'), '<title>PC security test</title>');
  await writeFile(join(root, 'secret.txt'), 'NE-DOIT-JAMAIS-SORTIR');
  const launcher = join(root, 'launcher', 'server-pc.mjs');
  await copyFile(new URL('../launcher/server-pc.mjs', import.meta.url), launcher);
  server = spawn(process.execPath, [launcher, '--port=0', '--no-open'], { stdio: ['ignore', 'pipe', 'inherit'] });
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
  return { root, origin };
}

/** Requête HTTP brute : on choisit nous-mêmes Host, Origin et le chemin, sans normalisation. */
function raw(origin, { method = 'GET', path = '/', headers = {}, body } = {}) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: url.hostname, port: url.port, method, path, headers, timeout: 3000 }, (res) => {
      let data = '';
      res.setEncoding('utf8').on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}

const SAVE = JSON.stringify({ version: 2, res: { cendres: 7 }, buildings: {} });

test('le serveur refuse un Host inconnu (protection contre le DNS rebinding)', { timeout: 10000 }, async (t) => {
  const { origin } = await startServer(t);
  const port = new URL(origin).port;
  const forged = await raw(origin, { path: '/api/save', headers: { Host: 'evil.example' } });
  assert.equal(forged.status, 403);
  const page = await raw(origin, { path: '/', headers: { Host: 'evil.example' } });
  assert.equal(page.status, 403);
  for (const host of [`127.0.0.1:${port}`, `localhost:${port}`]) {
    assert.equal((await raw(origin, { path: '/', headers: { Host: host } })).status, 200);
  }
});

test('une page tierce ne peut pas écrire la sauvegarde (Origin vérifié)', { timeout: 10000 }, async (t) => {
  const { root, origin } = await startServer(t);
  const post = (extra) => raw(origin, {
    method: 'POST',
    path: '/api/save',
    headers: { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(SAVE), ...extra },
    body: SAVE,
  });

  const evil = await post({ Origin: 'https://evil.example' });
  assert.equal(evil.status, 403);
  await assert.rejects(readFile(join(root, 'cendres-eclipse-save.json'), 'utf8'), { code: 'ENOENT' });

  const nullOrigin = await post({ Origin: 'null' });
  assert.equal(nullOrigin.status, 403);

  assert.equal((await post({ Origin: origin })).status, 200);
  assert.equal(JSON.parse(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8')).res.cendres, 7);

  const read = await raw(origin, { path: '/api/save', headers: { Origin: 'https://evil.example' } });
  assert.equal(read.status, 403);
});

test('les réponses portent des en-têtes de sécurité', { timeout: 10000 }, async (t) => {
  const { origin } = await startServer(t);
  for (const path of ['/', '/api/save']) {
    const { headers } = await raw(origin, { path });
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['referrer-policy'], 'no-referrer');
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal(headers['cross-origin-resource-policy'], 'same-origin');
  }
});

test('un chemin avec .. ne sort jamais du dossier dist', { timeout: 10000 }, async (t) => {
  const { origin } = await startServer(t);
  for (const path of ['/..%2fsecret.txt', '/%2e%2e/secret.txt', '/..%5csecret.txt', '/%2e%2e%2f%2e%2e%2fsecret.txt', '/a%00b']) {
    const res = await raw(origin, { path });
    assert.doesNotMatch(res.body, /NE-DOIT-JAMAIS-SORTIR/, path);
  }
});
