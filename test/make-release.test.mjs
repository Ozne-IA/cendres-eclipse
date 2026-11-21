import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRelease } from '../scripts/make-release.mjs';
import { SAVE_VERSION } from '../src/game/saveFormat.ts';
import { MANIFEST_NAME, validateManifest } from '../launcher/update-lib.mjs';

async function fakeDist(t) {
  const root = await mkdtemp(join(tmpdir(), 'cendres-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await writeFile(join(distDir, 'index.html'), '<html>');
  await writeFile(join(distDir, 'assets', 'a.js'), 'meme contenu');
  await writeFile(join(distDir, 'assets', 'b.js'), 'meme contenu');
  await writeFile(join(distDir, 'sw.js'), 'const BUILD_VERSION = "abc123def456";\n');
  return { root, distDir, outDir: join(root, 'release') };
}

test('createRelease publishes one asset per distinct file, named by its hash, and a valid manifest', async (t) => {
  const { distDir, outDir } = await fakeDist(t);
  const { manifest, assets } = await createRelease({ distDir, outDir, version: '1.2.0' });

  assert.equal(manifest.version, '1.2.0');
  assert.equal(manifest.buildId, 'abc123def456');
  // Le manifeste annonce la version de sauvegarde du jeu, lue dans src/game/saveFormat.ts.
  assert.equal(manifest.saveVersion, SAVE_VERSION);
  assert.equal(manifest.files.length, 4);
  // a.js et b.js ont le même contenu : un seul fichier publié pour les deux.
  assert.equal(assets, 3 + 1);
  const published = (await readdir(outDir)).sort();
  assert.equal(published.length, 4);
  assert.ok(published.includes(MANIFEST_NAME));
  for (const file of manifest.files) assert.ok(existsSync(join(outDir, file.sha256)), file.path);

  const published_manifest = JSON.parse(await readFile(join(outDir, MANIFEST_NAME), 'utf8'));
  assert.doesNotThrow(() => validateManifest(published_manifest));
  // La version installée connaît son propre manifeste.
  assert.equal(JSON.parse(await readFile(join(distDir, MANIFEST_NAME), 'utf8')).version, '1.2.0');
});

test('createRelease does not publish empty files (GitHub refuses 0-byte assets) but keeps them in the manifest', async (t) => {
  const { distDir, outDir } = await fakeDist(t);
  await mkdir(join(distDir, 'img'), { recursive: true });
  await writeFile(join(distDir, 'img', '.gitkeep'), '');
  const { manifest } = await createRelease({ distDir, outDir, version: '1.2.0' });

  const empty = manifest.files.find((file) => file.path === 'img/.gitkeep');
  assert.equal(empty.size, 0);
  assert.equal(existsSync(join(outDir, empty.sha256)), false);
  for (const file of manifest.files.filter((f) => f.size > 0)) assert.ok(existsSync(join(outDir, file.sha256)), file.path);
});

test('createRelease refuses a bad version number or a missing build', async (t) => {
  const { distDir, outDir, root } = await fakeDist(t);
  await assert.rejects(createRelease({ distDir, outDir, version: '1.2' }), /invalide/);
  await assert.rejects(createRelease({ distDir: join(root, 'vide'), outDir, version: '1.2.0' }), /npm run build/);
});
