import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCombatDepthFocus,
  computeParallaxOffset,
  PARALLAX_LAYERS,
} from './parallax';

test('PARALLAX_LAYERS preserves monotonic depth ordering from sky to foreground', () => {
  const ordered = [
    PARALLAX_LAYERS.sky,
    PARALLAX_LAYERS.horizon,
    PARALLAX_LAYERS.mist,
    PARALLAX_LAYERS.midground,
    PARALLAX_LAYERS.combat,
    PARALLAX_LAYERS.foreground,
  ];
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(
      ordered[i].factorX > ordered[i - 1].factorX,
      `Expected ${ordered[i].id}.factorX (${ordered[i].factorX}) > ${ordered[i - 1].id}.factorX (${ordered[i - 1].factorX})`
    );
    assert.ok(
      ordered[i].factorY >= ordered[i - 1].factorY,
      `Expected ${ordered[i].id}.factorY (${ordered[i].factorY}) >= ${ordered[i - 1].id}.factorY (${ordered[i - 1].factorY})`
    );
  }
  assert.equal(PARALLAX_LAYERS.combat.factorX, 1.0);
  assert.equal(PARALLAX_LAYERS.combat.factorY, 1.0);
  assert.ok(PARALLAX_LAYERS.foreground.factorX > 1.0);
  assert.ok(PARALLAX_LAYERS.mist.windSpeedX > 0);
});

test('computeParallaxOffset wraps seamlessly into [0, tileWidth) and clamps offsetY', () => {
  const tileW = 1600;
  // Unclamped intermediate cameraY scales proportionally
  const mid = computeParallaxOffset(-500, -1200, 0, PARALLAX_LAYERS.horizon, tileW, 0);
  assert.ok(mid.wrapX >= 0 && mid.wrapX < tileW);
  assert.equal(mid.offsetY, -72);

  // Large negative cameraX/Y wraps cleanly into positive [0, tileW) and clamps -Y at -90
  const neg = computeParallaxOffset(-5000, -2500, 0, PARALLAX_LAYERS.horizon, tileW, 0);
  assert.ok(neg.wrapX >= 0 && neg.wrapX < tileW);
  assert.equal(neg.offsetY, -90);

  // Large positive cameraX wraps cleanly and clamps +Y
  const pos = computeParallaxOffset(12345, 2500, 0, PARALLAX_LAYERS.horizon, tileW, 0);
  assert.ok(pos.wrapX >= 0 && pos.wrapX < tileW);
  assert.equal(pos.offsetY, 90);

  // Wind drift advances mist even when cameraX is stationary
  const t0 = computeParallaxOffset(0, 0, 0, PARALLAX_LAYERS.mist, 1024, 0);
  const t5 = computeParallaxOffset(0, 0, 5, PARALLAX_LAYERS.mist, 1024, 0);
  assert.ok(t5.offsetX > t0.offsetX);
  assert.equal(t5.wrapX, 5 * PARALLAX_LAYERS.mist.windSpeedX);

  // Trauma creates depth separation impulse proportional to (1 - factorX)
  const calmHorizon = computeParallaxOffset(400, 100, 1.0, PARALLAX_LAYERS.horizon, tileW, 0);
  const hitHorizon = computeParallaxOffset(400, 100, 1.0, PARALLAX_LAYERS.horizon, tileW, 0.8);
  assert.notEqual(hitHorizon.offsetX, calmHorizon.offsetX);

  const calmCombat = computeParallaxOffset(400, 100, 1.0, PARALLAX_LAYERS.combat, tileW, 0);
  const hitCombat = computeParallaxOffset(400, 100, 1.0, PARALLAX_LAYERS.combat, tileW, 0.8);
  assert.equal(hitCombat.offsetX, calmCombat.offsetX);
});

test('computeCombatDepthFocus scales with trauma, boss encounter, and low HP, clamped to 0.65', () => {
  assert.equal(computeCombatDepthFocus(0, false, 1.0), 0);
  assert.ok(computeCombatDepthFocus(0, true, 1.0) > 0);
  assert.ok(computeCombatDepthFocus(0, false, 0.2) > 0);
  assert.ok(computeCombatDepthFocus(0.5, false, 1.0) > computeCombatDepthFocus(0, false, 1.0));
  assert.equal(computeCombatDepthFocus(1.0, true, 0.1), 0.65);
});
