import assert from 'node:assert/strict';
import test from 'node:test';
import { androidCanvasPixelRatio, initializeAndroidGraphics } from './androidGraphics';
import { defaultSave, exportSaveJson, importSaveJson } from './rules';

test('Android limits canvas pixels without changing game coordinates', () => {
  assert.equal(androidCanvasPixelRatio(960, 540, 2.5), 1);
  assert.equal(androidCanvasPixelRatio(960, 540, 0.8), 0.8);
  assert.equal(androidCanvasPixelRatio(1920, 1080, 2), 2 / 3);
  assert.equal(androidCanvasPixelRatio(1920, 1080, 2, 'playing'), 0.5);
  assert.equal(androidCanvasPixelRatio(1920, 1080, 2, 'paused'), 0.5);
});

test('Android replaces legacy graphics defaults while keeping progression and other options', () => {
  const save = defaultSave();
  save.res.cendres = 314;
  save.settings.musicVolume = 0.15;
  const updated = initializeAndroidGraphics(save);
  assert.equal(updated.settings.fogQuality, 'medium');
  assert.equal(updated.settings.vfxQuality, 'medium');
  assert.equal(updated.settings.parallaxEnabled, false);
  assert.equal(updated.settings.musicVolume, 0.15);
  assert.equal(updated.res.cendres, 314);
  assert.equal(save.settings.fogQuality, 'high');
});

test('Android keeps customized settings and remembers a later return to the old defaults', () => {
  const save = defaultSave();
  save.settings.fogQuality = 'off';
  const customized = initializeAndroidGraphics(save);
  assert.deepEqual(customized.settings, save.settings);
  const backToHigh = { ...customized, settings: defaultSave().settings };
  const reloaded = importSaveJson(exportSaveJson(backToHigh));
  assert.ok(reloaded);
  assert.equal(initializeAndroidGraphics(reloaded), reloaded);
  assert.equal(reloaded.settings.fogQuality, 'high');
  assert.equal(reloaded.settings.vfxQuality, 'high');
  assert.equal(reloaded.settings.parallaxEnabled, true);
});
