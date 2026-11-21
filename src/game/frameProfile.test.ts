import assert from 'node:assert/strict';
import test from 'node:test';
import { FrameProfile } from './frameProfile';

test('frame profiling summarizes elapsed timing and accounts for both kinds of skipped renders', () => {
  let time = 100;
  const profile = new FrameProfile(() => time);
  const simulationStart = profile.now();
  time += 2.5;
  profile.finishTiming('simulation', simulationStart);
  profile.recordTiming('simulation', 0.5);
  profile.recordTiming('simulation', 0);
  profile.recordTiming('render', 9);
  profile.recordTiming('terrainAndTorches', 2);
  profile.skipCooldown();
  profile.skipStatic();

  const snapshot = profile.snapshot();
  assert.equal(snapshot.rafFrames, 3);
  assert.deepEqual(snapshot.skippedRenderFrames, { cooldown: 1, static: 1 });
  assert.deepEqual(snapshot.cpuMs.simulation, { samples: 3, average: 1, max: 2.5 });
  assert.deepEqual(snapshot.cpuMs.render, { samples: 1, average: 9, max: 9 });
  assert.deepEqual(snapshot.cpuMs.terrainAndTorches, { samples: 1, average: 2, max: 2 });
  assert.deepEqual(snapshot.cpuMs.titleArtwork, { samples: 0, average: null, max: null });
});

test('reset clears the sampling window while preserving prior snapshots', () => {
  const profile = new FrameProfile();
  const empty = profile.snapshot();
  profile.recordTiming('render', 12);
  profile.skipCooldown();
  profile.skipStatic();
  const sampled = profile.snapshot();
  profile.reset();

  assert.deepEqual(profile.snapshot(), empty);
  assert.equal(sampled.rafFrames, 3);
  assert.equal(sampled.cpuMs.render.max, 12);
  profile.recordTiming('render', 0);
  assert.deepEqual(profile.snapshot().cpuMs.render, { samples: 1, average: 0, max: 0 });
});
