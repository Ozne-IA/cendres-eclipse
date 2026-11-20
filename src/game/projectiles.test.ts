import assert from 'node:assert/strict';
import test from 'node:test';
import { PROJECTILE_RESERVE, ProjectilePool } from './projectiles';
import type { Projectile } from './types';

test('release preserves active order and clears eruption telegraph on reuse', () => {
  const pool = new ProjectilePool();
  const active: Projectile[] = [];
  const first = pool.acquire(active);
  const eruption = pool.acquire(active);
  const last = pool.acquire(active);
  eruption.telegraphT = 0.6;
  pool.release(active, 1);
  assert.deepEqual(active, [first, last]);
  assert.equal(pool.acquire(active), eruption);
  assert.equal(eruption.telegraphT, undefined);
});

test('bursts preserve every live shot and room clear bounds retained storage', () => {
  const pool = new ProjectilePool();
  const active: Projectile[] = [];
  for (let i = 0; i < PROJECTILE_RESERVE + 20; i++) pool.acquire(active);
  const burst = new Set(active);
  assert.equal(burst.size, PROJECTILE_RESERVE + 20);
  pool.clear(active);
  assert.equal(active.length, 0);
  for (let i = 0; i < burst.size; i++) pool.acquire(active);
  assert.equal(active.filter((shot) => burst.has(shot)).length, PROJECTILE_RESERVE);
});
