import assert from 'node:assert/strict';
import test from 'node:test';
import { expedition } from './combatTestFixture';
import { SIMULATION_STEP } from './simulationClock';
import type { Enemy } from './types';

function meleeExpedition(seed: number) {
  const scene = expedition(seed);
  const { engine, player, room } = scene;
  engine.updateSettings({ hitstopEnabled: false });
  room.affix = null;
  room.platforms = [{ x: 0, y: room.groundY, w: room.width, h: 40, type: 'solid' }];
  Object.assign(player, { x: 200, y: room.groundY - player.h, facing: 1, onGround: true });
  const template = room.enemies.find((enemy) => !enemy.flying);
  assert.ok(template);
  const enemy = (id: number, offset: number, overrides: Partial<Enemy> = {}): Enemy => ({
    ...template,
    id, x: player.x + offset, y: room.groundY - template.h, vx: 0, vy: 0,
    hp: 200, maxHp: 200, stagger: 0, maxStagger: 200, elite: 'none', shielded: false,
    state: 'recover', stateT: 1, cd: 5,
    ...overrides,
  });
  return { ...scene, enemy };
}

test('a melee hit breaks posture at the threshold and interrupts the windup until stagger expires', () => {
  const { room, run, tick, enemy } = meleeExpedition(29);
  const belowThreshold = enemy(1, 38, { maxStagger: 40, stagger: 19, state: 'windup' });
  const atThreshold = enemy(2, 48, { maxStagger: 40, stagger: 20, state: 'windup' });
  room.enemies = [belowThreshold, atThreshold];

  tick({ attack: true });

  assert.equal(belowThreshold.stagger, 39);
  assert.equal(belowThreshold.state, 'windup');
  assert.equal(atThreshold.stagger, 0);
  assert.equal(atThreshold.state, 'staggered');
  assert.equal(atThreshold.stateT, 2.1 - SIMULATION_STEP);

  room.enemies = [atThreshold];
  for (let i = 0; i < 124; i++) tick();
  assert.equal(atThreshold.state, 'staggered');

  // Two steps straddle expiration without relying on floating-point rounding at exactly 2.1 s.
  tick();
  tick();
  assert.equal(atThreshold.state, 'idle');
  assert.equal(atThreshold.stagger, 0);
  assert.equal(run.damageTaken, 0);
});

test('one melee swing hits each eligible enemy only once, including one entering reach later', () => {
  const { player, room, run, tick, enemy } = meleeExpedition(41);
  const first = enemy(1, 38);
  const second = enemy(2, 48);
  const late = enemy(3, 160);
  const behind = enemy(4, -70);
  const dead = enemy(5, 43, { state: 'dead', hp: 0, deadT: 1 });
  room.enemies = [first, second, late, behind, dead];

  tick({ attack: true });

  assert.deepEqual(room.enemies.map(({ hp }) => hp), [176, 176, 200, 200, 0]);
  assert.equal(run.damageDealt, 48);
  assert.equal(run.comboHits, 2);

  late.x = player.x + 43;
  tick();

  assert.deepEqual(room.enemies.map(({ hp }) => hp), [176, 176, 176, 200, 0]);
  assert.equal(run.damageDealt, 72);
  assert.equal(run.comboHits, 3);
  assert.equal(run.kills, 0);
});
