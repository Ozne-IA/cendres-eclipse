import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  CHECKSUM_FIELD,
  SAVE_VERSION,
  checksumOf,
  classifySave,
  cleanStaleTemporaryFiles,
  loadBestSave,
  readSaveFile,
  writeSave,
} from '../launcher/save-store.mjs';

const save = (cendres, extra = {}) => ({ version: 2, res: { cendres }, buildings: {}, ...extra });

async function workspace(t) {
  const dir = await mkdtemp(join(tmpdir(), 'cendres-store-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, primary: join(dir, 'cendres-eclipse-save.json') };
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const cendres = (result) => result.save.res.cendres;

test('writeSave stores a checksum that readSaveFile verifies, without changing the save itself', async (t) => {
  const { primary } = await workspace(t);
  writeSave(primary, save(10));

  const onDisk = await readJson(primary);
  assert.equal(onDisk[CHECKSUM_FIELD], checksumOf(save(10)));
  assert.equal(onDisk.res.cendres, 10);

  const read = readSaveFile(primary);
  assert.equal(read.status, 'ok');
  assert.deepEqual(read.save, save(10));
  assert.equal(CHECKSUM_FIELD in read.save, false);
});

test('a save written without a checksum (older launcher) is still accepted', async (t) => {
  const { primary } = await workspace(t);
  await writeFile(primary, JSON.stringify(save(5)));
  assert.equal(readSaveFile(primary).status, 'ok');
});

test('a modified or truncated save is detected and the latest valid copy is used', async (t) => {
  const { primary } = await workspace(t);
  writeSave(primary, save(1));
  writeSave(primary, save(2));

  // Une valeur modifiée à la main (ou abîmée par le disque) sans recalculer la somme de contrôle
  const tampered = await readJson(primary);
  tampered.res.cendres = 999999;
  await writeFile(primary, JSON.stringify(tampered));
  assert.equal(readSaveFile(primary).status, 'invalid');
  const best = loadBestSave(primary);
  assert.equal(best.kind, 'ok');
  assert.equal(best.source, 'bak');
  assert.equal(cendres(best), 1);

  // Fichier tronqué en pleine écriture
  await writeFile(primary, '{"version":2,"res":{"cend');
  assert.equal(loadBestSave(primary).kind, 'ok');
  assert.equal(readSaveFile(primary).status, 'invalid');
});

test('three rotating copies keep older progress, rotating only when the latest copy is old enough', async (t) => {
  const { dir, primary } = await workspace(t);
  const longAgo = new Date(Date.now() - 3600_000);
  const age = async (suffix) => utimes(`${primary}${suffix}`, longAgo, longAgo);

  writeSave(primary, save(1));
  writeSave(primary, save(2));              // bak = 1
  writeSave(primary, save(3));              // bak = 2 (la copie précédente est récente : bak2 ne bouge pas)
  assert.equal((await readJson(`${primary}.bak`)).res.cendres, 2);
  assert.equal(existsSync(`${primary}.bak2`), false);

  await age('.bak');
  writeSave(primary, save(4));              // bak2 = 2, bak = 3
  await age('.bak');
  writeSave(primary, save(5));              // bak3 = 2, bak2 = 3, bak = 4
  await age('.bak');
  writeSave(primary, save(6));              // bak3 = 3, bak2 = 4, bak = 5

  assert.equal((await readJson(primary)).res.cendres, 6);
  assert.equal((await readJson(`${primary}.bak`)).res.cendres, 5);
  assert.equal((await readJson(`${primary}.bak2`)).res.cendres, 4);
  assert.equal((await readJson(`${primary}.bak3`)).res.cendres, 3);
  assert.equal(existsSync(`${primary}.bak4`), false);
  assert.ok((await readdir(dir)).every((name) => !name.endsWith('.tmp')));
});

test('loadBestSave walks primary, bak, bak2, bak3 and reports what happened', async (t) => {
  const { primary } = await workspace(t);
  assert.deepEqual(loadBestSave(primary), { kind: 'none' });

  await writeFile(`${primary}.bak3`, JSON.stringify(save(33)));
  await writeFile(primary, '{');
  await writeFile(`${primary}.bak`, 'pas du json');
  const third = loadBestSave(primary);
  assert.equal(third.kind, 'ok');
  assert.equal(third.source, 'bak3');
  assert.equal(cendres(third), 33);

  await writeFile(`${primary}.bak3`, '{}');
  assert.deepEqual(loadBestSave(primary), { kind: 'unreadable' });
});

test('an unreadable save is moved aside instead of being overwritten', async (t) => {
  const { dir, primary } = await workspace(t);
  await writeFile(primary, '{"version":2,"res":{"cend');   // fichier abîmé qu'on ne doit pas détruire
  writeSave(primary, save(7));

  assert.equal((await readJson(primary)).res.cendres, 7);
  const aside = (await readdir(dir)).filter((name) => name.includes('.corrupt-'));
  assert.equal(aside.length, 1);
  assert.equal(await readFile(join(dir, aside[0]), 'utf8'), '{"version":2,"res":{"cend');
});

test('only the 3 newest unreadable files are kept', async (t) => {
  const { dir, primary } = await workspace(t);
  for (let i = 0; i < 5; i++) {
    await writeFile(primary, `{abîmé ${i}`);
    writeSave(primary, save(i));
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal((await readdir(dir)).filter((name) => name.includes('.corrupt-')).length, 3);
});

test('a save from a newer game version is reported and preserved, never overwritten silently', async (t) => {
  const { dir, primary } = await workspace(t);
  const future = { version: SAVE_VERSION + 1, nouveauChamp: { a: 1 }, res: { cendres: 4242 } };
  await writeFile(primary, JSON.stringify(future));

  assert.deepEqual(classifySave(future), { status: 'newer', version: SAVE_VERSION + 1 });
  assert.deepEqual(loadBestSave(primary), { kind: 'newer', version: SAVE_VERSION + 1 });

  writeSave(primary, save(1));
  const kept = (await readdir(dir)).filter((name) => name.includes(`.newer-v${SAVE_VERSION + 1}`));
  assert.equal(kept.length, 1);
  assert.deepEqual(await readJson(join(dir, kept[0])), future);
  assert.equal((await readJson(primary)).res.cendres, 1);
});

test('classifySave rejects saves without resources or with a negative or non numeric version', () => {
  assert.equal(classifySave(null).status, 'invalid');
  assert.equal(classifySave([]).status, 'invalid');
  assert.equal(classifySave({ version: 2 }).status, 'invalid');
  assert.equal(classifySave({ ...save(1), version: 0 }).status, 'invalid');
  assert.equal(classifySave({ ...save(1), version: '2' }).status, 'invalid');
  assert.equal(classifySave({ ...save(1), res: { cendres: -3 } }).status, 'invalid');
  assert.equal(classifySave({ ...save(1), buildings: { forge: 1.5 } }).status, 'invalid');
  assert.equal(classifySave(save(1)).status, 'ok');
  assert.equal(classifySave({ res: { cendres: 1 }, buildings: {} }).status, 'ok');
});

test('leftover temporary files from an interrupted write are ignored and cleaned', async (t) => {
  const { dir, primary } = await workspace(t);
  writeSave(primary, save(8));
  await writeFile(`${primary}.4242.tmp`, '{"à moitié écrit');

  assert.equal(readSaveFile(primary).status, 'ok');
  cleanStaleTemporaryFiles(primary);
  assert.deepEqual((await readdir(dir)).filter((name) => name.endsWith('.tmp')), []);
  writeSave(primary, save(9));
  assert.equal(cendres(readSaveFile(primary)), 9);
});

test('the PC launcher and the game agree on the save version', async () => {
  const { SAVE_VERSION: gameVersion } = await import('../src/game/saveFormat.ts');
  assert.equal(SAVE_VERSION, gameVersion);
});
