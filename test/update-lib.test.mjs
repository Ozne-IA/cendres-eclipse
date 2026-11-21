import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  MANIFEST_NAME,
  buildManifest,
  compareVersions,
  planUpdate,
  sha256Buffer,
  validateManifest,
} from '../launcher/update-lib.mjs';

const hash = (text) => sha256Buffer(Buffer.from(text));
const entry = (path, text) => ({ path, sha256: hash(text), size: Buffer.byteLength(text) });
const manifest = (files, version = '1.0.0') => ({ schema: 1, launcherApi: 1, version, buildId: 'abc', files });

test('buildManifest hashes every file of dist, sorted, without the manifest itself', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'cendres-manifest-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await mkdir(join(dist, 'assets'));
  await writeFile(join(dist, 'index.html'), '<html>');
  await writeFile(join(dist, 'assets', 'app-1.js'), 'console.log(1)');
  await writeFile(join(dist, MANIFEST_NAME), '{"ancien":true}');

  const built = await buildManifest(dist, { version: '1.2.3', buildId: 'b1' });
  assert.equal(built.version, '1.2.3');
  assert.equal(built.buildId, 'b1');
  assert.deepEqual(built.files.map((f) => f.path), ['assets/app-1.js', 'index.html']);
  assert.deepEqual(built.files[1], entry('index.html', '<html>'));
  assert.doesNotThrow(() => validateManifest(built));
});

test('validateManifest rejects dangerous or malformed manifests', () => {
  const ok = entry('assets/a.js', 'a');
  assert.doesNotThrow(() => validateManifest(manifest([ok])));

  const bad = (file) => assert.throws(() => validateManifest(manifest([file])), undefined, JSON.stringify(file));
  bad({ ...ok, path: '../evil.js' });
  bad({ ...ok, path: 'assets/../../evil.js' });
  bad({ ...ok, path: '/etc/passwd' });
  bad({ ...ok, path: 'C:/Windows/win.ini' });
  bad({ ...ok, path: 'assets\\a.js' });
  bad({ ...ok, path: 'assets//a.js' });
  bad({ ...ok, path: './a.js' });
  bad({ ...ok, path: 'a.js.' });
  bad({ ...ok, path: '' });
  bad({ ...ok, path: MANIFEST_NAME });
  bad({ ...ok, sha256: 'xyz' });
  bad({ ...ok, sha256: 'A'.repeat(64) });
  bad({ ...ok, size: -1 });
  bad({ ...ok, size: 1.5 });
  bad({ ...ok, size: 10 ** 12 });

  assert.throws(() => validateManifest(manifest([ok, { ...ok }])), /doublon/i);
  assert.throws(() => validateManifest(manifest([ok, { ...ok, path: 'ASSETS/A.JS' }])), /doublon/i);
  assert.throws(() => validateManifest({ ...manifest([ok]), version: '1.0' }));
  assert.throws(() => validateManifest({ ...manifest([ok]), schema: 2 }));
  assert.throws(() => validateManifest({ ...manifest([ok]), launcherApi: 0 }));
  assert.equal(validateManifest({ ...manifest([ok]), saveVersion: 2 }).saveVersion, 2);
  assert.equal(validateManifest(manifest([ok])).saveVersion, undefined);
  for (const bad of [0, -1, 1.5, '2', 5000]) {
    assert.throws(() => validateManifest({ ...manifest([ok]), saveVersion: bad }), undefined, String(bad));
  }
  assert.throws(() => validateManifest(null));
  assert.throws(() => validateManifest({ ...manifest([ok]), files: 'x' }));
  assert.throws(() => validateManifest(manifest([])));
});

test('compareVersions orders semantic versions numerically', () => {
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.ok(compareVersions('1.0.1', '1.0.0') > 0);
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.ok(compareVersions('2.0.0', '10.0.0') < 0);
});

test('planUpdate downloads only changed files, reuses identical content and removes obsolete files', () => {
  const local = manifest([
    entry('index.html', 'html-v1'),
    entry('assets/app-old.js', 'js-v1'),
    entry('img/big.jpg', 'image'),
    entry('obsolete.txt', 'gone'),
  ]);
  const remote = manifest([
    entry('index.html', 'html-v2'),
    entry('assets/app-new.js', 'js-v2'),
    entry('img/big.jpg', 'image'),
    entry('img/big-copy.jpg', 'image'), // même contenu, autre chemin : rien à télécharger
  ], '1.1.0');

  const plan = planUpdate(local, remote);
  assert.deepEqual(plan.download.map((f) => f.path).sort(), ['assets/app-new.js', 'index.html']);
  assert.deepEqual(plan.reuse.map((f) => f.path).sort(), ['img/big-copy.jpg', 'img/big.jpg']);
  assert.deepEqual(plan.remove.sort(), ['assets/app-old.js', 'obsolete.txt']);
  assert.equal(plan.downloadBytes, Buffer.byteLength('html-v2') + Buffer.byteLength('js-v2'));
  assert.equal(plan.totalBytes, remote.files.reduce((sum, f) => sum + f.size, 0));
});
