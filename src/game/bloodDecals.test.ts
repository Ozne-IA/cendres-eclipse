import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BloodSystem,
  buildProceduralSplatter,
  computeDecalVisualState,
  findLandingPlatform,
  findNearestFloorBelow,
  MAX_BLOOD_DECALS,
} from './bloodDecals';
import type { Platform } from './types';

const SAMPLE_PLATFORMS: Platform[] = [
  { x: 0, y: 500, w: 400, h: 200, type: 'solid' },
  { x: 460, y: 440, w: 220, h: 260, type: 'solid' },
  { x: 200, y: 360, w: 120, h: 18, type: 'crumble', broken: true },
  { x: 200, y: 390, w: 120, h: 18, type: 'oneway', broken: false },
];

test('findLandingPlatform selects highest non-broken platform crossed downward', () => {
  // Broken crumble at y=360 is skipped; oneway at y=390 is matched
  const hit = findLandingPlatform(250, 355, 396, SAMPLE_PLATFORMS);
  assert.ok(hit);
  assert.equal(hit?.platformIndex, 3);
  assert.equal(hit?.y, 390);

  // Gap between x=400 and x=460 returns null (never floats in pit)
  const pitHit = findLandingPlatform(430, 400, 600, SAMPLE_PLATFORMS);
  assert.equal(pitHit, null);
});

test('findNearestFloorBelow locates valid surface beneath grounded or low-airborne target', () => {
  const floor = findNearestFloorBelow(520, 415, 64, SAMPLE_PLATFORMS);
  assert.ok(floor);
  assert.equal(floor?.platformIndex, 1);
  assert.equal(floor?.y, 440);

  // Over pit returns null
  assert.equal(findNearestFloorBelow(430, 480, 64, SAMPLE_PLATFORMS), null);
});

test('buildProceduralSplatter clamps pool, lobes, and drips strictly inside platform boundaries', () => {
  const narrowPlat: Platform = { x: 100, y: 400, w: 48, h: 16, type: 'oneway' };
  // Spawn right near the right edge of narrowPlat
  const decal = buildProceduralSplatter(1, 146, 0, narrowPlat, 1, 2.0, 42, 'crimson');

  assert.ok(decal.localX - decal.poolRx >= 2, 'Pool left edge exceeds platform');
  assert.ok(decal.localX + decal.poolRx <= narrowPlat.w - 2, 'Pool right edge exceeds platform');
  for (const l of decal.lobes) {
    assert.ok(decal.localX + l.dx - l.rx >= 0);
    assert.ok(decal.localX + l.dx + l.rx <= narrowPlat.w);
  }
  for (const dr of decal.drips) {
    assert.ok(decal.localX + dr.dx >= 1 && decal.localX + dr.dx <= narrowPlat.w - 1);
    assert.ok(dr.maxLen <= narrowPlat.h - 3);
  }
});

test('computeDecalVisualState stays solid early, dries over time, and fades out at end of life', () => {
  const fresh = computeDecalVisualState(29.5, 30);
  assert.equal(fresh.alpha, 1);
  assert.ok(fresh.wetness > 0.8);
  assert.ok(fresh.dryMix < 0.1);

  const mid = computeDecalVisualState(15, 30);
  assert.equal(mid.alpha, 1);
  assert.equal(mid.wetness, 0);
  assert.ok(mid.dryMix > 0.7);

  const fading = computeDecalVisualState(2.1, 30);
  assert.ok(fading.alpha > 0 && fading.alpha < 0.3);
  assert.equal(fading.dryMix, 1);

  const expired = computeDecalVisualState(0, 30);
  assert.equal(expired.alpha, 0);
});

test('BloodSystem spawns impacts, lands droplets onto floors, ages decals, and enforces cap', () => {
  const sys = new BloodSystem();
  sys.spawnImpact(150, 470, 1, 1.4, SAMPLE_PLATFORMS, 'crimson', () => 0.5);
  assert.equal(sys.decals.length, 1);

  // Step simulation so airborne droplets fall and splash onto floor y=500
  for (let i = 0; i < 40; i++) {
    sys.update(0.03, SAMPLE_PLATFORMS, () => 0.5);
  }
  assert.ok(sys.decals.length > 1, 'Expected airborne droplets to create additional floor decals');

  // Cap check
  for (let i = 0; i < MAX_BLOOD_DECALS + 20; i++) {
    sys.spawnImpact(150 + (i % 100), 485, 1, 0.8, SAMPLE_PLATFORMS, 'crimson', () => 0.4);
  }
  assert.equal(sys.decals.length, MAX_BLOOD_DECALS);

  // Fast-forward until all decals expire and purge cleanly
  sys.update(45, SAMPLE_PLATFORMS, () => 0.5);
  assert.equal(sys.decals.length, 0);
});
