import test from 'node:test';
import assert from 'node:assert/strict';
import { VfxSystem } from './vfx';

test('VfxSystem spawns, updates, decays, and clears pooled combat effects', () => {
  const vfx = new VfxSystem();

  vfx.spawnSlashArc(120, 300, 56, -1.1, 1.1, 1, '#ff9842', '#fff6da', 18, 0.2);
  vfx.spawnImpactFlare(150, 290, 62, '#ffd470', 'gold', 0.2, 0.1);
  vfx.spawnLightning(100, 280, 180, 260, '#ffd470', 2.4, 0.15, () => 0.75);
  vfx.spawnGroundFissure(150, 420, 80, '#ff7b29', 1.2, () => 0.5);
  vfx.spawnAshDissolve(150, 280, 10, '#ff9842', 20, 30, () => 0.5);
  vfx.triggerScreenFlash('#ffd470', 0.3);

  assert.equal(vfx.slashArcs[0].active, true);
  assert.equal(vfx.flares[0].active, true);
  assert.equal(vfx.bolts[0].active, true);
  assert.equal(vfx.bolts[0].points.length, 7);
  assert.equal(vfx.fissures[0].active, true);
  assert.equal(vfx.fissures[0].segments.length, 10);
  assert.equal(vfx.wisps.filter((w) => w.active).length, 10);
  assert.ok(vfx.screenFlashAlpha > 0.25);

  vfx.update(0.1);
  assert.equal(vfx.slashArcs[0].active, true);
  assert.ok(vfx.slashArcs[0].radius > 56);
  assert.equal(vfx.fissures[0].active, true);

  vfx.update(1.5);
  assert.equal(vfx.slashArcs[0].active, false);
  assert.equal(vfx.flares[0].active, false);
  assert.equal(vfx.bolts[0].active, false);
  assert.equal(vfx.fissures[0].active, false);
  assert.equal(vfx.wisps.filter((w) => w.active).length, 0);
  assert.equal(vfx.screenFlashAlpha, 0);

  vfx.triggerScreenFlash('#ff4d5e', 0.9);
  assert.ok(vfx.screenFlashAlpha <= 0.42);
  vfx.clear();
  assert.equal(vfx.screenFlashAlpha, 0);

  vfx.spawnBladeSparks(120, 300, 1, 8, '#ff9842', () => 0.5);
  const sparks = vfx.wisps.filter((w) => w.active);
  assert.equal(sparks.length, 8);
  assert.ok(sparks.every((s) => s.glow && s.vx > 0));
  vfx.update(0.8);
  assert.equal(vfx.wisps.filter((w) => w.active).length, 0);
});
