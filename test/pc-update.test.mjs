import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MANIFEST_NAME, buildManifest, sha256Buffer } from '../launcher/update-lib.mjs';

const V1 = { 'index.html': '<title>jeu v1</title>', 'assets/app-aaa.js': 'js v1', 'img/big.jpg': 'IMAGE-LOURDE' };
const V2 = { 'index.html': '<title>jeu v2</title>', 'assets/app-bbb.js': 'js v2', 'img/big.jpg': 'IMAGE-LOURDE' };

async function writeTree(dir, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = join(dir, ...relative.split('/'));
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
}

/** Faux GitHub : dernière release v1.1.0 avec un manifeste et des fichiers nommés d'après leur empreinte. */
async function startFakeGithub(t, { launcherApi = 1, saveVersion } = {}) {
  const blobs = new Map();
  const files = Object.entries(V2).map(([path, content]) => {
    const buffer = Buffer.from(content);
    const sha256 = sha256Buffer(buffer);
    blobs.set(sha256, buffer);
    return { path, sha256, size: buffer.length };
  });
  const manifest = { schema: 1, launcherApi, version: '1.1.0', buildId: 'v2', files, ...(saveVersion ? { saveVersion } : {}) };
  const downloads = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/repos/test/jeu/releases/latest') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ tag_name: 'v1.1.0' }));
    }
    const prefix = '/test/jeu/releases/download/v1.1.0/';
    if (req.url?.startsWith(prefix)) {
      const name = req.url.slice(prefix.length);
      downloads.push(name);
      if (name === 'update-manifest.json') return res.end(JSON.stringify(manifest));
      if (blobs.has(name)) return res.end(blobs.get(name));
    }
    res.statusCode = 404;
    res.end('absent');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, downloads };
}

/** Lance le serveur PC dans un dossier temporaire avec un jeu « installé » (dist + manifeste) ou de développement. */
async function startGame(t, { github, installed = true, extraArgs = [] }) {
  const root = await mkdtemp(join(tmpdir(), 'cendres-update-test-'));
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
  await writeTree(join(root, 'dist'), V1);
  if (installed) {
    const manifest = await buildManifest(join(root, 'dist'), { version: '1.0.0', buildId: 'v1' });
    await writeFile(join(root, 'dist', MANIFEST_NAME), JSON.stringify(manifest));
  }
  await cp(new URL('../launcher/', import.meta.url), join(root, 'launcher'), { recursive: true });
  server = spawn(process.execPath, [join(root, 'launcher', 'server-pc.mjs'), '--port=0', '--no-open', ...extraArgs], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      ...process.env,
      CENDRES_UPDATE_REPO: 'test/jeu',
      CENDRES_UPDATE_API: github.base,
      CENDRES_UPDATE_DOWNLOAD: github.base,
    },
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
  const api = async (path, init = {}) => {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(5000), ...init });
    return { status: response.status, body: await response.json() };
  };
  const waitForStatus = async (predicate) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const { body } = await api('/api/update/status');
      if (predicate(body)) return body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Le statut attendu n\'est jamais apparu');
  };
  return { root, origin, api, waitForStatus };
}

test('the launcher detects a newer release, then installs only the changed files', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t);
  const { root, origin, api, waitForStatus } = await startGame(t, { github });

  const found = await waitForStatus((s) => s.available);
  assert.equal(found.current.version, '1.0.0');
  assert.equal(found.latest.version, '1.1.0');
  assert.equal(found.downloadBytes, Buffer.byteLength(V2['index.html']) + Buffer.byteLength(V2['assets/app-bbb.js']));

  const done = await api('/api/update/apply', { method: 'POST' });
  assert.equal(done.status, 200);
  assert.equal(done.body.stats.downloadedFiles, 2);
  assert.equal(done.body.stats.reusedFiles, 1);
  assert.equal(done.body.status.current.version, '1.1.0');
  assert.equal(done.body.status.available, false);

  // Le jeu sert tout de suite les nouveaux fichiers ; seul ce qui a changé a été téléchargé.
  assert.equal(await (await fetch(origin + '/')).text(), V2['index.html']);
  assert.equal(await readFile(join(root, 'dist', 'assets', 'app-bbb.js'), 'utf8'), 'js v2');
  assert.deepEqual(github.downloads.filter((n) => n !== 'update-manifest.json').sort(),
    [sha256Buffer(Buffer.from(V2['index.html'])), sha256Buffer(Buffer.from(V2['assets/app-bbb.js']))].sort());

  assert.equal((await api('/api/update/apply', { method: 'POST' })).status, 409);
});

test('update routes refuse pages from other sites', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t);
  const { api, waitForStatus } = await startGame(t, { github });
  await waitForStatus((s) => s.available);

  const evil = await api('/api/update/apply', { method: 'POST', headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  const crossSite = await api('/api/update/status', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(crossSite.status, 403);
  assert.equal((await waitForStatus(() => true)).current.version, '1.0.0');
});

test('a developer build without manifest is never updated', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t);
  const { api } = await startGame(t, { github, installed: false });
  const status = (await api('/api/update/status')).body;
  assert.equal(status.enabled, false);
  assert.equal(status.available, false);
  assert.equal((await api('/api/update/apply', { method: 'POST' })).status, 409);
});

test('--no-update-check keeps the game fully offline', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t);
  const { api } = await startGame(t, { github, extraArgs: ['--no-update-check'] });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal((await api('/api/update/status')).body.enabled, false);
  assert.equal(github.downloads.length, 0);
});

test('a release that needs a newer launcher asks for a full download instead of installing', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t, { launcherApi: 2 });
  const { api, waitForStatus } = await startGame(t, { github });
  const status = await waitForStatus((s) => s.available);
  assert.equal(status.fullDownloadRequired, true);
  const refused = await api('/api/update/apply', { method: 'POST' });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'FULL_DOWNLOAD');
});

test('a release that writes a newer save version than this launcher understands asks for a full download', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t, { saveVersion: 99 });
  const { api, waitForStatus } = await startGame(t, { github });
  const status = await waitForStatus((s) => s.available);
  assert.equal(status.fullDownloadRequired, true);
  const refused = await api('/api/update/apply', { method: 'POST' });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'FULL_DOWNLOAD');
});

test('a release whose save version the launcher understands installs normally', { timeout: 20000 }, async (t) => {
  const github = await startFakeGithub(t, { saveVersion: 2 });
  const { api, waitForStatus } = await startGame(t, { github });
  const status = await waitForStatus((s) => s.available);
  assert.equal(status.fullDownloadRequired, false);
  assert.equal((await api('/api/update/apply', { method: 'POST' })).status, 200);
});

test('when GitHub cannot be reached the game just starts normally', { timeout: 20000 }, async (t) => {
  const github = { base: 'http://127.0.0.1:1', downloads: [] };
  const { origin, api, waitForStatus } = await startGame(t, { github });
  const status = await waitForStatus((s) => s.checkedAt !== null);
  assert.equal(status.available, false);
  assert.match(status.error, /vérifier/i);
  assert.equal((await fetch(origin + '/')).status, 200);
  assert.ok(api);
});
