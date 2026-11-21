import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acquireLock, isLockHeld, LOCK_MAX_AGE_MS } from '../launcher/update-lock.mjs';
import { applyUpdate, recoverInterruptedUpdate } from '../launcher/updater.mjs';

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'cendres verrou-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Un vrai second processus vivant, qui joue le rôle d'un autre lanceur. */
function otherLauncher(t) {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  t.after(() => child.kill());
  return child.pid;
}

function deadPid() {
  const child = spawnSync(process.execPath, ['-e', '0']);
  return child.pid;
}

test('a lock held by another live launcher cannot be taken, a free one can, and release frees it', (t) => {
  const file = join(tempDir(t), 'dist.lock');
  writeFileSync(file, JSON.stringify({ pid: otherLauncher(t), at: Date.now() }));
  assert.equal(isLockHeld(file), true);
  assert.equal(acquireLock(file), null);

  rmSync(file);
  const release = acquireLock(file);
  assert.equal(typeof release, 'function');
  assert.equal(existsSync(file), true);
  release();
  assert.equal(existsSync(file), false);
});

test('a lock left by a vanished launcher, or an unreadable or too old one, is ignored', (t) => {
  const file = join(tempDir(t), 'dist.lock');
  writeFileSync(file, JSON.stringify({ pid: deadPid(), at: Date.now() }));
  assert.equal(isLockHeld(file), false);
  assert.equal(typeof acquireLock(file), 'function');

  writeFileSync(file, 'pas du json');
  assert.equal(typeof acquireLock(file), 'function');

  writeFileSync(file, JSON.stringify({ pid: otherLauncher(t), at: Date.now() - LOCK_MAX_AGE_MS - 1000 }));
  assert.equal(isLockHeld(file), false);
});

test('while another launcher updates, applyUpdate answers BUSY and startup recovery leaves its staging folder alone', async (t) => {
  const root = tempDir(t);
  const distDir = join(root, 'dist');
  mkdirSync(distDir);
  mkdirSync(`${distDir}.update`);
  writeFileSync(join(`${distDir}.update`, 'partiel.js'), 'en cours de téléchargement');
  writeFileSync(`${distDir}.lock`, JSON.stringify({ pid: otherLauncher(t), at: Date.now() }));

  recoverInterruptedUpdate(distDir);
  assert.equal(existsSync(join(`${distDir}.update`, 'partiel.js')), true, 'le dossier de l\'autre lanceur est conservé');

  const manifest = {
    schema: 1, launcherApi: 1, version: '9.9.9', buildId: 'x', files: [{ path: 'index.html', sha256: 'a'.repeat(64), size: 1 }],
  };
  await assert.rejects(
    applyUpdate({ distDir, remote: manifest, source: { download: async () => Buffer.alloc(0) } }),
    (error) => error.code === 'BUSY'
  );
  assert.equal(existsSync(`${distDir}.lock`), true, 'le verrou de l\'autre lanceur n\'est pas supprimé');
});

test('once the other launcher is gone, startup recovery cleans the abandoned staging folder', (t) => {
  const root = tempDir(t);
  const distDir = join(root, 'dist');
  mkdirSync(distDir);
  mkdirSync(`${distDir}.update`);
  writeFileSync(`${distDir}.lock`, JSON.stringify({ pid: deadPid(), at: Date.now() }));
  recoverInterruptedUpdate(distDir);
  assert.equal(existsSync(`${distDir}.update`), false);
});
