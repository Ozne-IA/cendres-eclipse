import assert from 'node:assert/strict';
import test from 'node:test';
import { expedition } from './combatTestFixture';
import { SIMULATION_STEP } from './simulationClock';
import type { Player, Projectile } from './types';

function incomingBolt(player: Player, overrides: Partial<Projectile> = {}): Projectile {
  return {
    x: player.x + player.w / 2, y: player.y + player.h / 2,
    vx: 0, vy: 0, r: 8, dmg: 10, friendly: false, color: '', kind: 'bolt', life: 1,
    ...overrides,
  };
}

test('a timed melee parry prevents damage, breaks posture and grants a riposte', () => {
  const { room, player, run, tick } = expedition(29);
  const attacker = room.enemies.find((enemy) => !enemy.flying)!;
  Object.assign(attacker, {
    x: player.x + 20, y: player.y, vx: 0, vy: 0, state: 'attack', stateT: 0.2,
    dmg: 18, stagger: 15, maxStagger: 70,
  });
  room.enemies = [attacker];
  const startingHp = run.hp;
  const attackerHp = attacker.hp;
  run.stam = 50;
  player.stamRegenDelay = 1;

  tick({ parry: true });

  assert.equal(run.hp, startingHp);
  assert.equal(run.damageTaken, 0);
  assert.equal(run.parries, 1);
  assert.equal(run.parryStreak, 1);
  assert.equal(run.bestParryStreak, 1);
  assert.equal(run.comboHits, 2);
  assert.equal(run.stam, 66);
  assert.equal(player.riposteBuffT, 4);
  assert.equal(player.invulnT, 0.26);
  assert.equal(attacker.hp, attackerHp);
  assert.equal(attacker.state, 'staggered');
  assert.equal(attacker.stagger, 0);
  assert.equal(attacker.stateT, 2.1);
});

test('a timed parry reflects a bolt that damages an enemy on a later step', () => {
  const { room, player, run, tick } = expedition(41);
  const attacker = room.enemies.find((enemy) => !enemy.flying)!;
  Object.assign(attacker, { x: player.x + 20, y: player.y, vx: 0, vy: 0, state: 'recover', stateT: 1 });
  room.enemies = [attacker];
  const bolt = incomingBolt(player, { x: player.x + 23, vx: -60, vy: 12, dmg: 4 });
  room.projectiles = [bolt];
  const startingHp = run.hp;
  const attackerHp = attacker.hp;

  tick({ parry: true });

  assert.deepEqual(room.projectiles, [bolt]);
  assert.equal(bolt.friendly, true);
  assert.equal(bolt.vx, 90);
  assert.equal(bolt.vy, -18);
  assert.equal(bolt.dmg, 8);
  assert.equal(attacker.hp, attackerHp);
  assert.equal(run.damageDealt, 0);
  assert.equal(run.parries, 1);
  assert.equal(run.parryStreak, 1);
  assert.equal(run.bestParryStreak, 1);

  for (let frame = 0; frame < 5; frame++) tick();

  assert.equal(run.hp, startingHp);
  assert.equal(run.damageTaken, 0);
  assert.equal(attacker.hp, attackerHp - 8);
  assert.equal(run.damageDealt, 8);
  assert.equal(run.comboHits, 1);
  assert.deepEqual(room.projectiles, []);
});

test('a dash through two bolts grants a single perfect dodge and readies a critical hit', () => {
  const { room, player, run, tick } = expedition(73);
  room.enemies = [];
  room.projectiles = [incomingBolt(player), incomingBolt(player)];
  const startingHp = run.hp;
  run.stam = 50;
  player.stamRegenDelay = 1;

  tick({ dash: true });

  assert.deepEqual(room.projectiles, []);
  assert.equal(run.hp, startingHp);
  assert.equal(run.damageTaken, 0);
  assert.equal(run.perfectDodges, 1);
  assert.equal(run.stam, 42);
  assert.equal(run.critNextAttack, true);
  assert.equal(player.invulnT, 0.14);
});

test('repeated hits are blocked until damage invulnerability expires', () => {
  const { engine, room, player, run, tick } = expedition(19);
  engine.updateSettings({ hitstopEnabled: false });
  room.enemies = [];
  const startingHp = run.hp;

  room.projectiles = [incomingBolt(player), incomingBolt(player)];
  tick();

  assert.deepEqual(room.projectiles, []);
  assert.equal(run.hp, startingHp - 10);
  assert.equal(run.damageTaken, 10);
  assert.equal(player.invulnT, 0.65);

  const invulnerableSteps = Math.round(0.65 / SIMULATION_STEP) - 1;
  for (let step = 0; step < invulnerableSteps; step++) {
    room.projectiles = [incomingBolt(player)];
    tick();
    assert.deepEqual(room.projectiles, []);
    assert.equal(run.hp, startingHp - 10);
    assert.equal(run.damageTaken, 10);
  }

  room.projectiles = [incomingBolt(player)];
  tick();

  assert.deepEqual(room.projectiles, []);
  assert.equal(run.hp, startingHp - 20);
  assert.equal(run.damageTaken, 20);
  assert.equal(player.invulnT, 0.65);
});
