import assert from 'node:assert/strict';
import test from 'node:test';
import { CendresEngine } from './engine';
import {
  applyEnemyDamage,
  bankRunIntoSave,
  createRunState,
  defaultSave,
  exportSaveJson,
  importSaveJson,
  MAX_RUN_HISTORY,
} from './rules';
import type { RunSummary } from './types';

test('legacy saves start an empty expedition history and keep lifetime counters', () => {
  const save = importSaveJson(JSON.stringify({
    version: 2,
    buildings: {},
    res: { cendres: 99 },
    records: { runs: 52, victories: 2, maxParryStreak: 6 },
  }));
  assert.ok(save);
  assert.deepEqual(save.runHistory, []);
  assert.equal(save.records.runs, 52);
  assert.equal(save.records.victories, 2);
  assert.equal(save.records.maxParryStreak, 6);
});

test('completed expeditions cap recent history and keep records past the cap', () => {
  let save = defaultSave();
  const record = createRunState(save);
  record.depth = 5;
  record.kills = 12;
  record.parries = 8;
  record.damageDealt = 472.8;
  record.peakComboHits = 18;
  save = bankRunIntoSave(save, record, 'victory');

  for (let index = 1; index <= MAX_RUN_HISTORY; index++) {
    const run = createRunState(save);
    run.elapsedSec = index;
    save = bankRunIntoSave(save, run, index === MAX_RUN_HISTORY ? 'return' : 'defeat');
  }
  assert.equal(save.runHistory.length, MAX_RUN_HISTORY);
  assert.equal(save.runHistory[0].outcome, 'return');
  assert.equal(save.runHistory[0].elapsedSec, MAX_RUN_HISTORY);
  assert.equal(save.runHistory.at(-1)?.elapsedSec, 1);
  assert.deepEqual(save.runBests, { depthReached: 5, kills: 12, parries: 8, damageDealt: 473, peakComboHits: 18 });
  assert.deepEqual(importSaveJson(exportSaveJson(save))?.runHistory, save.runHistory);
  assert.deepEqual(importSaveJson(exportSaveJson(save))?.runBests, save.runBests);
});

test('save loading bounds and sanitizes PC or imported history before using it', () => {
  const entries = Array.from({ length: MAX_RUN_HISTORY + 5 }, (_, index) => ({
    outcome: 'return',
    depthReached: 1,
    kills: index,
    ascensionLevel: 100,
    peakComboHits: 10,
    elapsedSec: -40,
    damageDealt: 'bad',
  }));
  const save = importSaveJson(JSON.stringify({
    version: 2,
    buildings: {},
    res: {},
    runHistory: [{ outcome: 'training', depthReached: 80 }, null, ...entries],
    runBests: { kills: -2, peakComboHits: 2 },
  }));
  assert.ok(save);
  assert.equal(save.runHistory.length, MAX_RUN_HISTORY);
  assert.equal(save.runHistory[0].kills, 0);
  assert.equal(save.runHistory[0].ascensionLevel, 5);
  assert.equal(save.runHistory[0].elapsedSec, 0);
  assert.equal(save.runHistory[0].damageDealt, 0);
  assert.equal(save.runBests.peakComboHits, 10);
});

test('damage dealt counts enemy HP actually lost, excluding overkill', () => {
  const run = createRunState(defaultSave());
  const enemy = { hp: 20 };
  applyEnemyDamage(run, enemy, 7);
  assert.equal(run.damageDealt, 7);
  assert.equal(enemy.hp, 13);
  applyEnemyDamage(run, enemy, 99);
  assert.equal(run.damageDealt, 20);
  assert.ok(enemy.hp <= 0);
});

test('the engine banks a completed expedition once and keeps training kills out of the save', (t) => {
  const initialDocument = globalThis.document;
  t.after(() => {
    if (initialDocument) globalThis.document = initialDocument;
    else Reflect.deleteProperty(globalThis, 'document');
  });
  globalThis.document = { body: { dataset: {} } } as Document;

  const reports: RunSummary[] = [];
  const engine = new CendresEngine({
    getContext: () => ({}),
    focus() {},
  } as unknown as HTMLCanvasElement, {
    onPhaseChange() {},
    onSaveChange() {},
    onHudUpdate() {},
    onBlessingChoices() {},
    onMerchantOpen() {},
    onRunSummary(summary) {
      if (summary) reports.push(summary);
    },
  });

  engine.startTrainingMode();
  const trainingSave = engine.getSave();
  const target = engine['room']?.enemies[0];
  assert.ok(target);
  engine['onEnemyKilled'](target);
  engine.openPause();
  engine.extractReturnBastion();
  assert.equal(engine.getSave(), trainingSave);

  engine.startNewRun();
  engine['registerComboHit'](8);
  const run = engine['run'];
  assert.ok(run);
  run.comboHits = 0;
  engine.openPause();
  engine.extractReturnBastion();
  const once = engine.getSave();
  engine.extractReturnBastion();
  engine['bankExpedition']('return');
  assert.equal(engine.getSave(), once);
  assert.equal(once.runHistory[0].peakComboHits, 8);
  assert.equal(reports.length, 1);

  engine.startNewRun();
  engine.openPause();
  engine.extractReturnBastion();
  assert.equal(engine.getSave().runHistory.length, 2);
  assert.equal(reports[1].previousRun?.peakComboHits, 8);
});
