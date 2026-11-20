import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankRunIntoSave,
  calculateBastionProduction,
  canAfford,
  computeActiveSynergies,
  computeComboRank,
  createRunState,
  defaultSave,
  evaluateAchievements,
  exportSaveJson,
  getBuildingCost,
  getLootMultiplier,
  getParryWindowSec,
  getPlayerDamageStats,
  importSaveJson,
  isSkinUnlocked,
  payCost,
  pickBlessingChoices,
} from './rules';
import { generateRoom, generateTrainingRoom } from './levelGen';

test('defaultSave initializes valid resources, weapon, oath, and buildings', () => {
  const s = defaultSave();
  assert.equal(s.weapon, 'clay_blade');
  assert.equal(s.oath, 'argile');
  assert.equal(s.weaponsUnlocked.clay_blade, true);
  assert.ok(s.res.cendres >= 50);
  assert.equal(s.buildings.refuge, 1);
});

test('building cost scales monotonically and payment deducts accurately', () => {
  const s = defaultSave();
  const c0 = getBuildingCost(s, 'foyer');
  s.buildings.foyer = 2;
  const c2 = getBuildingCost(s, 'foyer');
  assert.ok((c2.cendres || 0) > (c0.cendres || 0));

  assert.equal(canAfford(s.res, c0), true);
  const after = payCost(s.res, c0);
  assert.equal(after.cendres, s.res.cendres - (c0.cendres || 0));
});

test('createRunState applies foyer HP, oath modifiers, and talent bonuses', () => {
  const s = defaultSave();
  s.buildings.foyer = 2;
  s.buildings.autel = 3;
  s.talents.ash_reserves = 2;
  const run = createRunState(s, () => 0.25);

  assert.equal(run.maxHp, 155); // 115 + 2*20
  assert.equal(run.maxFlasks, 4); // 2 + 1 (lvl1) + 1 (lvl3)
  assert.equal(run.loot.cendres, 50); // 2 * 25 from ash_reserves

  s.oath = 'sang';
  const bloodRun = createRunState(s, () => 0.25);
  assert.equal(bloodRun.maxHp, Math.round(155 * 0.75));
});

test('getPlayerDamageStats scales with weapon, forge, riposte, sunder, and crit', () => {
  const s = defaultSave();
  const run = createRunState(s, () => 0.5);

  const normal = getPlayerDamageStats(s, run, 'light1', false, false, () => 0.99);
  const riposte = getPlayerDamageStats(s, run, 'light1', true, false, () => 0.99);
  const sundered = getPlayerDamageStats(s, run, 'light1', false, true, () => 0.99);
  const crit = getPlayerDamageStats(s, run, 'heavy', false, false, () => 0.0);

  assert.ok(riposte.damage > normal.damage);
  assert.ok(sundered.damage > normal.damage);
  assert.equal(crit.isCrit, true);
  assert.ok(crit.damage > normal.damage * 2);
});

test('parry window scales with Airain oath and parry_mastery talent', () => {
  const s = defaultSave();
  const base = getParryWindowSec(s);
  s.oath = 'airain';
  s.talents.parry_mastery = 2;
  const boosted = getParryWindowSec(s);
  assert.ok(boosted > base + 0.1);
});

test('Bastion NPC production and bankRunIntoSave aggregate resources and records', () => {
  const s = defaultSave();
  s.buildings.refuge = 2;
  s.npcsUnlocked.meryl = true;
  s.npcsAssigned = ['vaelen', 'meryl'];
  const prod = calculateBastionProduction(s);
  assert.equal(prod.fer, 2);
  assert.equal(prod.cendres, 32);

  const run = createRunState(s, () => 0.5);
  run.depth = 4;
  run.kills = 12;
  run.parries = 7;
  run.bestParryStreak = 4;
  run.loot.cendres = 40;

  const updated = bankRunIntoSave(s, run, true);
  // 75 (start) + 40 (loot) + 32 (Bastion) + 150 (ach_victory_1) + 120 (ach_ascension_1) = 417
  assert.equal(updated.res.cendres, s.res.cendres + 40 + 32 + 150 + 120);
  assert.equal(updated.res.fer, s.res.fer + 2);
  assert.equal(updated.records.bestDepth, 4);
  assert.equal(updated.records.victories, 1);
  assert.equal(updated.records.totalParries, 7);
  assert.equal(updated.maxAscensionUnlocked, 1);
});

test('loot multiplier stacks Vigie, Oath of Blood, and Greed blessing', () => {
  const s = defaultSave();
  s.buildings.vigie = 2;
  s.oath = 'sang';
  const run = createRunState(s, () => 0.5);
  run.blessings.push('greed');
  const mult = getLootMultiplier(s, run);
  assert.ok(Math.abs(mult - 2.15) < 0.001);
});

test('pickBlessingChoices returns 3 distinct blessings', () => {
  const s = defaultSave();
  const run = createRunState(s, () => 0.5);
  const picks = pickBlessingChoices(run, 3, () => 0.42);
  assert.equal(picks.length, 3);
  const ids = new Set(picks.map((p) => p.id));
  assert.equal(ids.size, 3);
});

test('generateRoom creates valid non-boss and boss rooms with clear spawn & exit', () => {
  const s = defaultSave();
  const room1 = generateRoom(1, s, () => 0.35);
  assert.equal(room1.isBoss, false);
  assert.ok(room1.platforms.length >= 3);
  assert.ok(room1.platforms[0].w >= 380); // safe spawn platform
  const exit1 = room1.props.find((p) => p.type === 'exit');
  assert.ok(exit1);
  assert.equal(exit1?.locked, false);

  const bossRoom = generateRoom(3, s, () => 0.5);
  assert.equal(bossRoom.isBoss, true);
  const boss = bossRoom.enemies.find((e) => e.isBoss);
  assert.ok(boss);
  assert.equal(boss?.kind, 'archon');
  const bossExit = bossRoom.props.find((p) => p.type === 'exit');
  assert.equal(bossExit?.locked, true);

  const sovereignRoom = generateRoom(9, s, () => 0.5);
  const sovereign = sovereignRoom.enemies.find((e) => e.isBoss);
  assert.equal(sovereign?.kind, 'sovereign');
});

test('defaultSave initializes all 6 weaponsUnlocked keys and PC settings', () => {
  const s = defaultSave();
  assert.deepEqual(Object.keys(s.weaponsUnlocked).sort(), [
    'ash_halberd',
    'belfry_greatsword',
    'clay_blade',
    'eclipse_daggers',
    'scythe_eclipse',
    'twin_hammers',
  ]);
  assert.equal(s.settings.difficulty, 'awakened');
  assert.equal(s.settings.keyBindings.parry, 'KeyK');
});

test('computeComboRank progresses from D through ÉCLIPSE cleanly', () => {
  assert.equal(computeComboRank(0).rank, 'D');
  assert.equal(computeComboRank(2).rank, 'C');
  assert.equal(computeComboRank(5).rank, 'B');
  assert.equal(computeComboRank(8).rank, 'A');
  assert.equal(computeComboRank(12).rank, 'S');
  assert.equal(computeComboRank(18).rank, 'ÉCLIPSE');
});

test('difficulty presets and blood_moon affix adjust loot multiplier and parry window', () => {
  const s = defaultSave();
  const run = createRunState(s, () => 0.5);

  const awakenedLoot = getLootMultiplier(s, run);
  const bloodMoonLoot = getLootMultiplier(s, run, 'blood_moon');
  assert.ok(bloodMoonLoot > awakenedLoot);

  s.settings.difficulty = 'eclipse';
  const eclipseLoot = getLootMultiplier(s, run);
  assert.ok(eclipseLoot > awakenedLoot);
  assert.ok(getParryWindowSec(s) < 0.22);

  s.settings.difficulty = 'pilgrim';
  assert.ok(getParryWindowSec(s) > 0.22);
});

test('exportSaveJson and importSaveJson roundtrip valid saves and reject invalid JSON', () => {
  const s = defaultSave();
  s.res.cendres = 432;
  s.settings.difficulty = 'eclipse';
  s.weaponsUnlocked.scythe_eclipse = true;

  const json = exportSaveJson(s);
  const restored = importSaveJson(json);
  assert.ok(restored);
  assert.equal(restored?.res.cendres, 432);
  assert.equal(restored?.settings.difficulty, 'eclipse');
  assert.equal(restored?.weaponsUnlocked.scythe_eclipse, true);
  assert.equal(restored?.weaponsUnlocked.twin_hammers, false);

  assert.equal(importSaveJson('not-json'), null);
  assert.equal(importSaveJson('{"foo":"bar"}'), null);
});

test('computeActiveSynergies activates Eclipse Duo effects when both prerequisites are owned', () => {
  const s = defaultSave();
  const run = createRunState(s, () => 0.5);
  assert.deepEqual(computeActiveSynergies(run), []);

  run.blessings.push('cinder_burn', 'lunar_frost');
  assert.ok(computeActiveSynergies(run).includes('thermal_shock'));

  run.blessings.push('thunder_parry', 'bronze_counter');
  assert.ok(computeActiveSynergies(run).includes('storm_anvil'));
});

test('evaluateAchievements unlocks skins and grants bonus Cendres once', () => {
  const s = defaultSave();
  assert.equal(isSkinUnlocked(s, 'eclipse'), true);
  assert.equal(isSkinUnlocked(s, 'crimson'), false);

  s.records.totalKills = 30;
  s.records.totalParries = 25;
  const first = evaluateAchievements(s);
  assert.ok(first.save.achievementsUnlocked.includes('ach_slayer_25'));
  assert.ok(first.save.achievementsUnlocked.includes('ach_parry_25'));
  assert.equal(isSkinUnlocked(first.save, 'crimson'), true);
  assert.equal(isSkinUnlocked(first.save, 'solaire'), true);
  assert.ok(first.save.res.cendres > s.res.cendres);

  const second = evaluateAchievements(first.save);
  assert.equal(second.unlocked.length, 0);
  assert.equal(second.save.res.cendres, first.save.res.cendres);
});

test('Ascension tier scales loot/enemies and victory unlocks next tier while Training stays isolated', () => {
  const s = defaultSave();
  s.ascensionLevel = 2;
  const run = createRunState(s, () => 0.5, false);
  const baseRun = createRunState(defaultSave(), () => 0.5, false);

  assert.ok(getLootMultiplier(s, run) > getLootMultiplier(defaultSave(), baseRun));

  const trainingRun = createRunState(s, () => 0.5, true);
  trainingRun.kills = 99;
  trainingRun.loot.cendres = 500;
  const afterTraining = bankRunIntoSave(s, trainingRun, true);
  assert.equal(afterTraining, s);

  const victorySave = bankRunIntoSave(s, run, true);
  assert.equal(victorySave.maxAscensionUnlocked, 1);

  const trainingRoom = generateTrainingRoom();
  assert.ok(trainingRoom.enemies.length >= 4);
  assert.ok(trainingRoom.enemies.some((e) => e.kind === 'watcher'));
  assert.ok(trainingRoom.props.some((p) => p.type === 'exit' && !p.locked));

  const sanctuarySave = defaultSave();
  sanctuarySave.buildings.sanctuaire = 1;
  const sanctRun = createRunState(sanctuarySave, () => 0.5, false);
  assert.equal(sanctRun.merchantStock.length, 4);

  const deepRoom = generateRoom(4, sanctuarySave, () => 0.2);
  assert.ok(deepRoom.enemies.length >= 3);
  assert.ok(deepRoom.platforms.length >= 3);
});

