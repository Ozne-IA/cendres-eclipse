import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATMOS_FOG_STRATA,
  computeFogStratumTransform,
  computeLightShaftAlpha,
  createDustSeedField,
  evaluateDustMote,
} from './atmosphere';

test('ATMOS_FOG_STRATA defines ordered depth strata with varied wind drift and valid opacity', () => {
  assert.equal(ATMOS_FOG_STRATA.length, 3);
  for (let i = 1; i < ATMOS_FOG_STRATA.length; i++) {
    assert.ok(ATMOS_FOG_STRATA[i].factorX > ATMOS_FOG_STRATA[i - 1].factorX);
    assert.ok(ATMOS_FOG_STRATA[i].baseYRatio > ATMOS_FOG_STRATA[i - 1].baseYRatio);
  }
  for (const s of ATMOS_FOG_STRATA) {
    assert.ok(s.baseAlpha > 0 && s.baseAlpha < 1);
    assert.notEqual(s.windSpeedX, 0);
  }
});

test('computeFogStratumTransform wraps horizontally into [0, tileWidth) and animates over time', () => {
  const stratum = ATMOS_FOG_STRATA[1];
  const t0 = computeFogStratumTransform(-800, 120, 0, stratum, 1024, 900);
  const t2 = computeFogStratumTransform(-800, 120, 2.5, stratum, 1024, 900);

  assert.ok(t0.wrapX >= 0 && t0.wrapX < 1024);
  assert.ok(t2.wrapX >= 0 && t2.wrapX < 1024);
  assert.notEqual(t0.wrapX, t2.wrapX);
  assert.ok(t0.alpha >= 0.1 && t0.alpha <= 0.9);
  assert.ok(t2.alpha >= 0.1 && t2.alpha <= 0.9);
});

test('computeLightShaftAlpha breathes smoothly within subtle atmospheric bounds', () => {
  for (let i = 0; i < 3; i++) {
    for (let t = 0; t < 10; t += 0.7) {
      const a = computeLightShaftAlpha(t, i);
      assert.ok(a >= 0.06 && a <= 0.21, `Alpha ${a} out of subtle range`);
    }
  }
});

test('createDustSeedField & evaluateDustMote produce deterministic wrapped positions across planes', () => {
  const field = createDustSeedField(52);
  assert.equal(field.length, 52);

  const kinds = new Set(field.map((m) => m.kind));
  assert.ok(kinds.has('dust'));
  assert.ok(kinds.has('ash'));
  assert.ok(kinds.has('ember'));
  assert.ok(kinds.has('halo'));

  const W = 1440;
  const H = 900;
  for (const mote of field) {
    const p0 = evaluateDustMote(mote, 0, 0, 0, W, H);
    const p1 = evaluateDustMote(mote, 500, 140, 3.2, W, H);
    assert.ok(p0.x >= -40 && p0.x <= W + 40);
    assert.ok(p0.y >= -30 && p0.y <= H + 30);
    assert.ok(p1.x >= -40 && p1.x <= W + 40);
    assert.ok(p1.y >= -30 && p1.y <= H + 30);
    assert.ok(p1.alpha >= 0.05 && p1.alpha <= 1);
    assert.notEqual(p0.x, p1.x);
    assert.notEqual(p0.y, p1.y);
  }
});
