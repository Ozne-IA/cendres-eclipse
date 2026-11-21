import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { SAVE_KEY } from './data';
import { loadSave, mergeSave, persistSave, defaultSave, importSaveJson } from './rules';
import { MIGRATIONS, SAVE_VERSION, inspectSaveVersion, migrateSave } from './saveFormat';

/** Faux localStorage : on observe ce que le jeu garde ou écrase dans le navigateur. */
function browserStorage(t: TestContext) {
  const store = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  return store;
}

test('inspectSaveVersion classifies versions without throwing', () => {
  assert.deepEqual(inspectSaveVersion(undefined), { status: 'current', version: SAVE_VERSION });
  assert.deepEqual(inspectSaveVersion(SAVE_VERSION), { status: 'current', version: SAVE_VERSION });
  assert.deepEqual(inspectSaveVersion(1), { status: 'older', version: 1 });
  assert.deepEqual(inspectSaveVersion(SAVE_VERSION + 1), { status: 'newer', version: SAVE_VERSION + 1 });
  for (const bad of [0, -1, 1.5, '2', null, NaN, {}, []]) {
    assert.deepEqual(inspectSaveVersion(bad), { status: 'invalid' }, String(bad));
  }
});

test('migrateSave walks the migration chain up to the current version', () => {
  const migrated = migrateSave({ version: 1, res: { cendres: 12 }, buildings: {} });
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.res, { cendres: 12 });
  const untouched = { version: SAVE_VERSION, res: {}, buildings: {} };
  assert.deepEqual(migrateSave(untouched), untouched);
  assert.deepEqual(migrateSave({ res: {}, buildings: {} }), { res: {}, buildings: {} });
  // Chaque version ancienne a bien une étape de migration.
  for (let version = 1; version < SAVE_VERSION; version++) assert.equal(typeof MIGRATIONS[version], 'function', `v${version}`);
});

test('old saves keep their progress, future or malformed versions fall back to a fresh save', () => {
  const v1 = mergeSave({ version: 1, res: { cendres: 321, fer: 4, larmes: 5 } } as never);
  assert.equal(v1.version, SAVE_VERSION);
  assert.equal(v1.res.cendres, 321);
  const noVersion = mergeSave({ res: { cendres: 77 } } as never);
  assert.equal(noVersion.res.cendres, 77);

  assert.equal(mergeSave({ version: SAVE_VERSION + 1, res: { cendres: 999 } } as never).res.cendres, defaultSave().res.cendres);
  assert.equal(mergeSave({ version: '2', res: { cendres: 999 } } as never).res.cendres, defaultSave().res.cendres);
  assert.equal(importSaveJson(JSON.stringify({ version: SAVE_VERSION + 1, res: {}, buildings: {} })), null);
  assert.equal(importSaveJson(JSON.stringify({ version: 1, res: { cendres: 5 }, buildings: {} }))?.res.cendres, 5);
});

test('a browser save from a newer version is kept aside before being replaced', (t) => {
  const store = browserStorage(t);
  const future = JSON.stringify({ version: SAVE_VERSION + 1, nouveau: true, res: { cendres: 4242 }, buildings: {} });
  store.set(SAVE_KEY, future);

  const loaded = loadSave();
  assert.equal(loaded.res.cendres, defaultSave().res.cendres);
  assert.equal(store.get(`${SAVE_KEY}.newer-v${SAVE_VERSION + 1}`), future);

  persistSave(loaded);   // le jeu écrase la sauvegarde principale...
  assert.notEqual(store.get(SAVE_KEY), future);
  assert.equal(store.get(`${SAVE_KEY}.newer-v${SAVE_VERSION + 1}`), future);   // ...mais la copie reste

  // Un second démarrage ne remplace pas la copie déjà gardée
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, res: { cendres: 1 }, buildings: {} }));
  loadSave();
  assert.equal(store.get(`${SAVE_KEY}.newer-v${SAVE_VERSION + 1}`), future);
});

test('a corrupted browser save is kept aside instead of being lost', (t) => {
  const store = browserStorage(t);
  store.set(SAVE_KEY, '{"version":2,"res":{"cend');
  assert.equal(loadSave().res.cendres, defaultSave().res.cendres);
  assert.equal(store.get(`${SAVE_KEY}.corrupt`), '{"version":2,"res":{"cend');
});

test('a valid or missing browser save leaves no aside copy', (t) => {
  const store = browserStorage(t);
  assert.equal(loadSave().res.cendres, defaultSave().res.cendres);
  persistSave(mergeSave({ res: { cendres: 55 } } as never));
  assert.equal(loadSave().res.cendres, 55);
  assert.deepEqual([...store.keys()], [SAVE_KEY]);
});
