import assert from 'node:assert/strict';
import test from 'node:test';
import { LORE_TABLETS } from './data';
import { expedition } from './combatTestFixture';
import { SIMULATION_STEP } from './simulationClock';
import type { RoomProp } from './types';

test('enemy windups consume attack tokens in room order and a boss ignores the limit', () => {
  const { room, player, tick } = expedition(29);
  const template = room.enemies.find((enemy) => !enemy.flying)!;
  room.enemies = Array.from({ length: 5 }, (_, index) => ({
    ...template,
    id: index,
    x: player.x + 42,
    y: player.y,
    vx: 0,
    state: 'idle',
    cd: 0,
    isBoss: index === 4,
  }));

  tick();

  assert.deepEqual(room.enemies.map((enemy) => enemy.state), ['windup', 'windup', 'windup', 'idle', 'windup']);
  const boss = room.enemies[4];
  boss.hp = boss.maxHp / 2;
  tick();
  assert.equal(boss.phase, 2);
  assert.equal(boss.state, 'idle');
  assert.equal(boss.cd, 0.6 - SIMULATION_STEP);
});

test('reflections wait a tick before applying damage and on-hit blessings', () => {
  const { room, player, run, events, draws, tick } = expedition(41);
  const enemy = room.enemies.find((candidate) => !candidate.flying)!;
  Object.assign(enemy, { x: player.x + 20, y: player.y, hp: 6, state: 'staggered', stateT: 1 });
  room.enemies = [enemy];
  run.blessings.push('cinder_burn', 'sunder_steel', 'lunar_frost');
  player.parryT = 0.2;
  room.projectiles = [
    { x: 60, y: 10, vx: 0, vy: 0, r: 1, dmg: 1, friendly: false, color: '', kind: 'orb', life: SIMULATION_STEP / 2 },
    { x: player.x + 23, y: player.y + 20, vx: -60, vy: 0, r: 8, dmg: 4, friendly: false, color: '', kind: 'bolt', life: 1 },
  ];
  const reflected = room.projectiles[1];

  tick();

  assert.deepEqual(room.projectiles, [reflected]);
  assert.equal(enemy.hp, 6);
  assert.equal(reflected.friendly, true);
  assert.equal(reflected.vx, 90);
  assert.equal(reflected.dmg, 8);
  assert.equal(run.parries, 1);

  for (let i = 0; i < 5; i++) tick();

  assert.equal(enemy.hp, -2);
  assert.equal(enemy.state, 'dead');
  assert.equal(enemy.burnT, 3);
  assert.equal(enemy.sunderT, 4);
  assert.equal(enemy.chillT, 3);
  assert.equal(run.kills, 1);
  assert.equal(run.damageDealt, 6);
  assert.deepEqual(room.projectiles, []);
  assert.deepEqual(events, ['save:stele_1', 'hud']);
  assert.equal(draws.length, 2);
});

test('eruption telegraph expires before the next hit check and guard mitigates the hit', () => {
  const { room, player, run, tick } = expedition(73);
  room.enemies = [];
  player.guardT = 0.3;
  room.projectiles = [{
    x: player.x + player.w / 2, y: room.groundY, vx: 0, vy: 0, r: 28, dmg: 18,
    friendly: false, color: '', kind: 'eruption', life: 1, telegraphT: SIMULATION_STEP / 2,
  }];
  const startingHp = run.hp;

  tick();
  assert.equal(run.hp, startingHp);
  tick();
  assert.equal(run.hp, startingHp - 7);
  assert.equal(run.damageTaken, 7);
  assert.equal(player.vx, -240);
  assert.equal(player.invulnT, 0.65);
  assert.equal(room.projectiles.length, 1);
});

test('overlapping chests, lore and an exit preserve loot rolls and callback order', () => {
  const { room, player, run, engine, events, draws, tick } = expedition(19);
  room.enemies = [];
  const prop = (type: RoomProp['type'], details: Partial<RoomProp> = {}): RoomProp => ({
    id: type, type, x: player.x, y: room.groundY - 40, w: 30, h: 40, ...details,
  });
  const loreId = LORE_TABLETS[1].id;
  room.props = [prop('chest'), prop('lore', { loreId }), prop('exit')];

  tick({ interact: true });

  assert.equal(room.props[0].opened, true);
  assert.equal(room.props[1].used, true);
  assert.deepEqual(engine.getSave().loreUnlocked, ['stele_1', loreId]);
  assert.deepEqual(run.loot, { cendres: 15 + Math.round(20 + draws[0] * 14), fer: draws[1] < 0.48 ? 1 : 0, larmes: 0 });
  assert.equal(draws.length, 21);
  assert.deepEqual(events, [`save:stele_1,${loreId}`, 'blessings:mist_step,iron_lungs,cinder_burn', 'phase:blessing']);
});
