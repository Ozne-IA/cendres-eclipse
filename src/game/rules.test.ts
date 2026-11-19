import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankRunIntoSave,
  calculateBastionProduction,
  canAfford,
  createRunState,
  defaultSave,
  getBuildingCost,
  getLootMultiplier,
  getParryWindowSec,
  getPlayerDamageStats,
  payCost,
  pickBlessingChoices,
} from './rules';
import { generateRoom } from './levelGen';

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
  assert.equal(updated.res.cendres, s.res.cendres + 40 + 32);
  assert.equal(updated.res.fer, s.res.fer + 2);
  assert.equal(updated.records.bestDepth, 4);
  assert.equal(updated.records.victories, 1);
  assert.equal(updated.records.totalParries, 7);
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
