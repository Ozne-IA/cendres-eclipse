import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MANIFEST_NAME, buildManifest, sha256Buffer, validateManifest } from '../launcher/update-lib.mjs';
import { applyUpdate, readInstalledManifest, recoverInterruptedUpdate } from '../launcher/updater.mjs';

/** Crée un dossier de jeu installé (dist/ + manifeste) et renvoie son chemin. */
async function install(t, files, version = '1.0.0') {
  const root = await mkdtemp(join(tmpdir(), 'cendres-updater-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  await writeTree(distDir, files);
  const manifest = await buildManifest(distDir, { version, buildId: 'v' + version });
  await writeFile(join(distDir, MANIFEST_NAME), JSON.stringify(manifest));
  return { root, distDir };
}

async function writeTree(dir, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = join(dir, ...relative.split('/'));
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
}

/** Fabrique la version distante : manifeste + source de téléchargement qui compte ce qui est demandé. */
function release(files, version, tweak = {}) {
  const blobs = new Map();
  const entries = Object.entries(files).map(([path, content]) => {
    const buffer = Buffer.from(content);
    const sha256 = sha256Buffer(buffer);
    blobs.set(sha256, buffer);
    return { path, sha256, size: buffer.length };
  });
  const remote = validateManifest({ schema: 1, launcherApi: 1, version, buildId: 'v' + version, files: entries });
  const requested = [];
  const source = {
    async download(file) {
      requested.push(file.path);
      if (tweak.fail === file.path) throw new Error('réseau coupé');
      // Contenu falsifié de même taille : seule l'empreinte permet de le détecter.
      const data = tweak.corrupt === file.path ? Buffer.alloc(file.size, 'X') : blobs.get(file.sha256);
      return tweak.truncate === file.path ? data.subarray(0, 3) : data;
    },
  };
  return { remote, source, requested };
}

async function snapshot(distDir) {
  const out = {};
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), rel + '/');
      else if (rel !== MANIFEST_NAME) out[rel] = (await readFile(join(dir, entry.name))).toString();
    }
  }
  await walk(distDir);
  return out;
}

const V1 = { 'index.html': 'html v1', 'assets/app-aaa.js': 'js v1', 'img/big.jpg': 'IMAGE-LOURDE', 'vieux.txt': 'à supprimer' };
const V2 = { 'index.html': 'html v2', 'assets/app-bbb.js': 'js v2', 'img/big.jpg': 'IMAGE-LOURDE' };

test('applyUpdate downloads only changed files and swaps dist atomically', async (t) => {
  const { root, distDir } = await install(t, V1);
  const { remote, source, requested } = release(V2, '1.1.0');
  const progress = [];

  const stats = await applyUpdate({ distDir, remote, source, onProgress: (p) => progress.push(p) });

  assert.deepEqual(requested.sort(), ['assets/app-bbb.js', 'index.html']);
  assert.deepEqual(await snapshot(distDir), V2);
  assert.equal(readInstalledManifest(distDir).version, '1.1.0');
  assert.equal(stats.downloadedFiles, 2);
  assert.equal(stats.reusedFiles, 1);
  assert.equal(stats.removedFiles, 2);
  assert.equal(stats.downloadedBytes, Buffer.byteLength(V2['index.html']) + Buffer.byteLength(V2['assets/app-bbb.js']));
  assert.ok(progress.length > 0 && progress.at(-1).doneBytes === stats.downloadedBytes);
  assert.equal(existsSync(`${distDir}.update`), false);
  assert.equal(existsSync(`${distDir}.old`), false);
  assert.deepEqual((await readdir(root)).sort(), ['dist']);
});

test('empty files are recreated locally, never requested from the server', async (t) => {
  const { distDir } = await install(t, V1);
  const withEmpty = { ...V2, 'img/.gitkeep': '' };
  const { remote, source, requested } = release(withEmpty, '1.1.0');

  const stats = await applyUpdate({ distDir, remote, source });

  assert.deepEqual(requested.sort(), ['assets/app-bbb.js', 'index.html']);
  assert.deepEqual(await snapshot(distDir), withEmpty);
  assert.equal(stats.downloadedFiles, 2);
});

test('a corrupted download aborts the update and leaves the installed version untouched', async (t) => {
  const { distDir } = await install(t, V1);
  const { remote, source } = release(V2, '1.1.0', { corrupt: 'assets/app-bbb.js' });
  await assert.rejects(applyUpdate({ distDir, remote, source }), /empreinte/i);
  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(readInstalledManifest(distDir).version, '1.0.0');
  assert.equal(existsSync(`${distDir}.update`), false);
});

test('a truncated download is refused', async (t) => {
  const { distDir } = await install(t, V1);
  const { remote, source } = release(V2, '1.1.0', { truncate: 'index.html' });
  await assert.rejects(applyUpdate({ distDir, remote, source }), /taille|empreinte/i);
  assert.deepEqual(await snapshot(distDir), V1);
});

test('a network failure in the middle keeps the game playable', async (t) => {
  const { distDir } = await install(t, V1);
  const { remote, source } = release(V2, '1.1.0', { fail: 'assets/app-bbb.js' });
  await assert.rejects(applyUpdate({ distDir, remote, source }), /réseau coupé/);
  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(existsSync(`${distDir}.update`), false);
});

test('an installed file that no longer matches its hash is downloaded again, not reused', async (t) => {
  const { distDir } = await install(t, V1);
  await writeFile(join(distDir, 'img', 'big.jpg'), 'ABIMÉ PAR LE DISQUE');
  const { remote, source, requested } = release(V2, '1.1.0');
  await applyUpdate({ distDir, remote, source });
  assert.ok(requested.includes('img/big.jpg'));
  assert.deepEqual(await snapshot(distDir), V2);
});

test('a manifest with a path outside dist is rejected before anything is written', async (t) => {
  const { root, distDir } = await install(t, V1);
  const hostile = { schema: 1, launcherApi: 1, version: '1.1.0', buildId: '', files: [
    { path: '../evil.txt', sha256: sha256Buffer(Buffer.from('x')), size: 1 },
  ] };
  await assert.rejects(applyUpdate({ distDir, remote: hostile, source: { download: async () => Buffer.from('x') } }), /chemin/i);
  assert.equal(existsSync(join(root, 'evil.txt')), false);
  assert.deepEqual(await snapshot(distDir), V1);
});

test('applyUpdate refuses to run on a copy that has no installed manifest (developer build)', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'cendres-updater-dev-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  await writeTree(distDir, V1);
  const { remote, source } = release(V2, '1.1.0');
  await assert.rejects(applyUpdate({ distDir, remote, source }), /installée|manifeste/i);
  assert.equal(readInstalledManifest(distDir), null);
  assert.deepEqual(await snapshot(distDir), V1);
});

test('recoverInterruptedUpdate restores dist when the process stopped between the two renames', async (t) => {
  const { root, distDir } = await install(t, V1);
  const { rename } = await import('node:fs/promises');
  await rename(distDir, `${distDir}.old`);
  await mkdir(`${distDir}.update`);
  assert.equal(existsSync(distDir), false);

  recoverInterruptedUpdate(distDir);

  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(existsSync(`${distDir}.old`), false);
  assert.equal(existsSync(`${distDir}.update`), false);
  assert.ok(root);
});
