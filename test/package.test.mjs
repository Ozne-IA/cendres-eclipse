import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildPackage } from '../scripts/build-package.mjs';
import { createRelease } from '../scripts/make-release.mjs';
import { verifyPackage } from '../scripts/verify-package.mjs';

/** Faux dépôt : un petit dist/ plus les vrais dossiers launcher/ et scripts/release/. */
async function fakeRepo(t) {
  const root = await mkdtemp(join(tmpdir(), 'cendres éclipse paquet-'));   // accents et espace volontaires
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'dist', 'assets'), { recursive: true });
  await writeFile(join(root, 'dist', 'index.html'), '<title>Cendres test</title>');
  await writeFile(join(root, 'dist', 'assets', 'app-abc.js'), 'console.log("jeu")');
  await writeFile(join(root, 'dist', 'vide.txt'), '');
  await writeFile(join(root, 'dist', 'sw.js'), 'const BUILD_VERSION = "123abc456def";\n');
  await cp(new URL('../launcher/', import.meta.url), join(root, 'launcher'), { recursive: true });
  await cp(new URL('../scripts/release/', import.meta.url), join(root, 'scripts', 'release'), { recursive: true });
  await createRelease({ distDir: join(root, 'dist'), outDir: join(root, 'release'), version: '2.3.4' });
  return root;
}

const failed = (report) => report.checks.filter((check) => !check.ok).map((check) => check.name);

test('a freshly built package passes every check, including start, save and relaunch', { timeout: 60000 }, async (t) => {
  const root = await fakeRepo(t);
  const packageDir = join(root, 'paquet joueur');
  await buildPackage({ rootDir: root, outDir: packageDir });

  const report = await verifyPackage(packageDir, { expectedVersion: '2.3.4' });
  assert.deepEqual(failed(report), []);
  assert.ok(report.checks.length >= 8);
  // Le lanceur Windows du paquet a des fins de ligne Windows, pas celui de Linux.
  assert.match(await readFile(join(packageDir, 'Lancer_Cendres_Eclipse.bat'), 'utf8'), /\r\n/);
  assert.doesNotMatch(await readFile(join(packageDir, 'Lancer_Cendres_Eclipse.sh'), 'utf8'), /\r\n/);
});

test('verifyPackage catches a modified file, a missing launcher module and an unexpected version', { timeout: 60000 }, async (t) => {
  const root = await fakeRepo(t);
  const packageDir = join(root, 'paquet');
  await buildPackage({ rootDir: root, outDir: packageDir });

  await writeFile(join(packageDir, 'dist', 'assets', 'app-abc.js'), 'console.log("modifié")');
  assert.ok(failed(await verifyPackage(packageDir, { expectedVersion: '2.3.4' })).some((name) => /fichiers du jeu/i.test(name)));
  await writeFile(join(packageDir, 'dist', 'assets', 'app-abc.js'), 'console.log("jeu")');

  assert.ok(failed(await verifyPackage(packageDir, { expectedVersion: '9.9.9' })).some((name) => /version/i.test(name)));

  await rm(join(packageDir, 'launcher', 'updater.mjs'));
  assert.ok(failed(await verifyPackage(packageDir, { expectedVersion: '2.3.4' })).length > 0);
});

test('buildPackage refuses to run without a published manifest', async (t) => {
  const root = await fakeRepo(t);
  await rm(join(root, 'dist', 'update-manifest.json'));
  await assert.rejects(buildPackage({ rootDir: root, outDir: join(root, 'paquet') }), /manifeste/i);
});
