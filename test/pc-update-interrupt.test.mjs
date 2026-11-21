import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MANIFEST_NAME, buildManifest, sha256Buffer } from '../launcher/update-lib.mjs';

const V1 = { 'index.html': '<title>jeu v1</title>', 'assets/app-aaa.js': 'js v1', 'img/big.jpg': 'IMAGE-LOURDE' };
const V2 = { 'index.html': '<title>jeu v2</title>', 'assets/app-bbb.js': 'js v2', 'img/big.jpg': 'IMAGE-LOURDE' };
const SAVE = JSON.stringify({ version: 2, res: { cendres: 1234 }, buildings: {} });

async function writeTree(dir, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = join(dir, ...relative.split('/'));
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
}

/** Faux GitHub dont le téléchargement de `assets/app-bbb.js` reste suspendu tant qu'on ne le libère pas. */
async function startFakeGithub(t) {
  const blobs = new Map();
  const files = Object.entries(V2).map(([path, content]) => {
    const buffer = Buffer.from(content);
    const sha256 = sha256Buffer(buffer);
    blobs.set(sha256, buffer);
    return { path, sha256, size: buffer.length };
  });
  const heldSha = files.find((f) => f.path === 'assets/app-bbb.js').sha256;
  const manifest = { schema: 1, launcherApi: 1, version: '1.1.0', buildId: 'v2', files };
  let release;
  let holding = true;
  const gate = new Promise((resolve) => { release = resolve; });
  let reachedHeld;
  const reached = new Promise((resolve) => { reachedHeld = resolve; });
  const server = http.createServer(async (req, res) => {
    if (req.url === '/repos/test/jeu/releases/latest') return res.end(JSON.stringify({ tag_name: 'v1.1.0' }));
    const prefix = '/test/jeu/releases/download/v1.1.0/';
    if (req.url?.startsWith(prefix)) {
      const name = req.url.slice(prefix.length);
      if (name === 'update-manifest.json') return res.end(JSON.stringify(manifest));
      if (blobs.has(name)) {
        if (name === heldSha && holding) {
          reachedHeld();
          await gate;
        }
        return res.end(blobs.get(name));
      }
    }
    res.statusCode = 404;
    res.end('absent');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { release(); server.closeAllConnections?.(); return new Promise((resolve) => server.close(resolve)); });
  return { base: `http://127.0.0.1:${server.address().port}`, reached, free: () => { holding = false; release(); } };
}

function launch(root, github) {
  const server = spawn(process.execPath, [join(root, 'launcher', 'server-pc.mjs'), '--port=0', '--no-open'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, CENDRES_UPDATE_REPO: 'test/jeu', CENDRES_UPDATE_API: github.base, CENDRES_UPDATE_DOWNLOAD: github.base },
  });
  const origin = new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Launcher stopped with code ${code}`)));
    let output = '';
    server.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
  });
  return { server, origin };
}

async function stop(server) {
  if (server.exitCode === null && server.signalCode === null) {
    const closed = once(server, 'close');
    server.kill();
    await closed;
  }
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Condition jamais atteinte');
}

async function install(t) {
  const root = await mkdtemp(join(tmpdir(), 'cendres-interrupt-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'dist'));
  await writeTree(join(root, 'dist'), V1);
  const manifest = await buildManifest(join(root, 'dist'), { version: '1.0.0', buildId: 'v1' });
  await writeFile(join(root, 'dist', MANIFEST_NAME), JSON.stringify(manifest));
  await cp(new URL('../launcher/', import.meta.url), join(root, 'launcher'), { recursive: true });
  await writeFile(join(root, 'cendres-eclipse-save.json'), SAVE);
  return root;
}

test('closing the game in the middle of an update keeps the game and the save intact, and the next launch finishes the update', { timeout: 30000 }, async (t) => {
  const github = await startFakeGithub(t);
  const root = await install(t);
  const first = launch(root, github);
  t.after(() => stop(first.server));
  const origin = await first.origin;
  const status = () => fetch(`${origin}/api/update/status`).then((r) => r.json());
  await waitFor(async () => (await status()).available);

  // Le joueur clique sur « Installer », puis ferme la fenêtre du lanceur en plein téléchargement.
  const applying = fetch(`${origin}/api/update/apply`, { method: 'POST' }).catch(() => null);
  await github.reached;
  await stop(first.server);
  await applying;

  assert.equal(await readFile(join(root, 'dist', 'index.html'), 'utf8'), V1['index.html']);
  assert.equal(JSON.parse(await readFile(join(root, 'dist', MANIFEST_NAME), 'utf8')).version, '1.0.0');
  assert.equal(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8'), SAVE);

  // Relance : le jeu démarre dans l'ancienne version et propose de nouveau la mise à jour, qui va cette fois jusqu'au bout.
  github.free();
  const second = launch(root, github);
  t.after(() => stop(second.server));
  const origin2 = await second.origin;
  assert.equal(await (await fetch(`${origin2}/`)).text(), V1['index.html']);
  const next = () => fetch(`${origin2}/api/update/status`).then((r) => r.json());
  await waitFor(async () => (await next()).available);
  const done = await fetch(`${origin2}/api/update/apply`, { method: 'POST' });
  assert.equal(done.status, 200);

  assert.equal(await (await fetch(`${origin2}/`)).text(), V2['index.html']);
  assert.equal(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8'), SAVE);
  assert.equal(existsSync(join(root, 'dist.update')), false);
  assert.equal(existsSync(join(root, 'dist.old')), false);
});

test('a launcher stopped between the two renames restores the previous version at the next start', { timeout: 30000 }, async (t) => {
  const github = await startFakeGithub(t);
  github.free();
  const root = await install(t);
  // État laissé par un arrêt brutal : l'ancienne version a été mise de côté, la nouvelle n'a pas pris sa place.
  await rename(join(root, 'dist'), join(root, 'dist.old'));
  await mkdir(join(root, 'dist.update'));

  const game = launch(root, github);
  t.after(() => stop(game.server));
  const origin = await game.origin;

  assert.equal(await (await fetch(`${origin}/`)).text(), V1['index.html']);
  assert.equal(existsSync(join(root, 'dist.old')), false);
  assert.equal(existsSync(join(root, 'dist.update')), false);
  assert.equal(await readFile(join(root, 'cendres-eclipse-save.json'), 'utf8'), SAVE);
});
