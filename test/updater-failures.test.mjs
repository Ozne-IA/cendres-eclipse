import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import fsp from 'node:fs/promises';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MANIFEST_NAME, buildManifest, sha256Buffer, validateManifest } from '../launcher/update-lib.mjs';
import { applyUpdate, readInstalledManifest } from '../launcher/updater.mjs';

// L09 : échecs réels pendant une mise à jour. Le joueur doit garder une version jouable,
// et aucun dossier de préparation ne doit rester derrière.

async function install(t, files, version = '1.0.0') {
  const root = await mkdtemp(join(tmpdir(), 'cendres-fail-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  for (const [relative, content] of Object.entries(files)) {
    const target = join(distDir, ...relative.split('/'));
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
  const manifest = await buildManifest(distDir, { version, buildId: 'v' + version });
  await writeFile(join(distDir, MANIFEST_NAME), JSON.stringify(manifest));
  return { root, distDir };
}

function release(files, version) {
  const blobs = new Map();
  const entries = Object.entries(files).map(([path, content]) => {
    const buffer = Buffer.from(content);
    const sha256 = sha256Buffer(buffer);
    blobs.set(sha256, buffer);
    return { path, sha256, size: buffer.length };
  });
  const remote = validateManifest({ schema: 1, launcherApi: 1, version, buildId: 'v' + version, files: entries });
  return { remote, source: { async download(file) { return blobs.get(file.sha256); } } };
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

const V1 = { 'index.html': 'html v1', 'assets/app-aaa.js': 'js v1' };
const V2 = { 'index.html': 'html v2', 'assets/app-bbb.js': 'js v2' };

test('L09 : la bascule échoue au second renommage, l’ancienne version est remise en place', async (t) => {
  const { root, distDir } = await install(t, V1);
  const { remote, source } = release(V2, '1.1.0');
  const realRename = fsp.rename;
  let calls = 0;
  t.mock.method(fsp, 'rename', async (from, to) => {
    calls++;
    // 1er appel : dist → dist.old (réussi). 2e appel : dist.update → dist (échoue, sans nouvel essai).
    if (calls === 2) {
      const error = new Error('renommage refusé');
      error.code = 'EXDEV';
      throw error;
    }
    return realRename(from, to);
  });

  await assert.rejects(applyUpdate({ distDir, remote, source }), /renommage refusé/);

  assert.equal(readInstalledManifest(distDir).version, '1.0.0');
  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(existsSync(`${distDir}.update`), false);
  assert.equal(existsSync(`${distDir}.old`), false);
  assert.deepEqual((await readdir(root)).sort(), ['dist']);
});

test('L09 : dossier verrouillé ou en lecture seule (Windows) : la mise à jour échoue, le jeu reste intact', async (t) => {
  const { root, distDir } = await install(t, V1);
  const { remote, source } = release(V2, '1.1.0');
  t.mock.method(fsp, 'rename', async () => {
    const error = new Error('dossier ouvert ailleurs');
    error.code = 'EPERM';
    throw error;
  });

  await assert.rejects(applyUpdate({ distDir, remote, source }), /ouvert ailleurs/);

  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(readInstalledManifest(distDir).version, '1.0.0');
  assert.equal(existsSync(`${distDir}.update`), false);
  assert.deepEqual((await readdir(root)).sort(), ['dist']);
});

test('L09 : disque plein pendant le téléchargement : abandon propre, rien de remplacé', async (t) => {
  const { root, distDir } = await install(t, V1);
  const { remote } = release(V2, '1.1.0');
  let downloads = 0;
  const source = {
    async download() {
      downloads++;
      const error = new Error('disque plein');
      error.code = 'ENOSPC';
      throw error;
    },
  };

  await assert.rejects(applyUpdate({ distDir, remote, source }), /disque plein/);

  assert.ok(downloads >= 1);
  assert.deepEqual(await snapshot(distDir), V1);
  assert.equal(readInstalledManifest(distDir).version, '1.0.0');
  assert.equal(existsSync(`${distDir}.update`), false);
  assert.deepEqual((await readdir(root)).sort(), ['dist']);
});
