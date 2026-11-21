import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { DarkAudioEngine, type MusicMood } from './audio';
import { DEFAULT_SETTINGS } from './data';
import type { EnemyKind } from './types';

function audioParam() {
  return {
    value: 0,
    setValueAtTime(value: number) {
      this.value = value;
    },
    setTargetAtTime(value: number) {
      this.value = value;
    },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

function useAudio(t: TestContext) {
  const gains: ReturnType<typeof audioParam>[] = [];
  const notes: [number, OscillatorType][] = [];
  class MockAudioContext {
    readonly state = 'running';
    readonly currentTime = 0;
    readonly sampleRate = 44100;
    readonly destination = {};

    createGain() {
      const gain = audioParam();
      gains.push(gain);
      return { gain, connect() {} };
    }

    createOscillator() {
      return {
        type: 'sine' as OscillatorType,
        frequency: audioParam(),
        connect() {},
        start() {
          notes.push([Math.round(this.frequency.value), this.type]);
        },
        stop() {},
      };
    }

    createBuffer(_: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }

    createBufferSource() {
      return { buffer: null, connect() {}, start() {} };
    }

    createBiquadFilter() {
      return { type: 'bandpass', frequency: audioParam(), connect() {} };
    }
  }

  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: MockAudioContext } });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });

  const audio = new DarkAudioEngine();
  audio.updateSettings({ ...DEFAULT_SETTINGS, ambientDrone: false, masterVolume: 1, musicVolume: 1, sfxVolume: 1 });
  const tick = (frames = 64) => {
    for (let i = 0; i < frames; i++) audio.updateMusic(0.05);
  };
  function score(mood: MusicMood, biome: string, kind?: EnemyKind, phase2 = false) {
    notes.length = 0;
    audio.setMusicContext(mood, biome, kind, phase2);
    tick();
    assert.ok(notes.length > 0);
    return JSON.stringify(notes);
  }
  return { audio, gains, notes, score, tick };
}

test('biome motifs and the Guardians’ phases have distinct scores', (t) => {
  const { score } = useAudio(t);
  const biomes = ['catacombes', 'viaduc', 'fleche', 'sanctuaire'];
  assert.equal(new Set(biomes.map((biome) => score('explore', biome))).size, biomes.length);

  const guardians: EnemyKind[] = ['archon', 'mother', 'sovereign'];
  const phases = guardians.flatMap((guardian) => [false, true].map((phase2) => score('boss', 'catacombes', guardian, phase2)));
  assert.equal(new Set(phases).size, 6);
});

test('combat and deflection duck only the music and respect volume controls', (t) => {
  const { audio, gains, notes, tick } = useAudio(t);
  audio.setMusicContext('explore');
  tick();
  const [musicGain, effectsGain] = gains;
  assert.equal(musicGain.value, 1);

  audio.setMusicContext('combat');
  tick(1);
  assert.ok(musicGain.value < 1);
  const combatGain = musicGain.value;
  const notesBeforeDeflection = notes.length;

  audio.parry();
  assert.ok(musicGain.value < combatGain);
  assert.equal(effectsGain.value, 1);
  assert.equal(notes.length - notesBeforeDeflection, 3);
  tick(8);
  assert.equal(musicGain.value, combatGain);

  audio.setMusicContext('explore');
  tick();
  assert.equal(musicGain.value, 1);
  audio.setMuted(true);
  assert.equal(musicGain.value, 0);
  assert.equal(effectsGain.value, 0);

  audio.updateSettings({ ...DEFAULT_SETTINGS, ambientDrone: false, masterVolume: 0.5, musicVolume: 0.4, sfxVolume: 0 });
  audio.setMuted(false);
  assert.equal(musicGain.value, 0.2);
  assert.equal(effectsGain.value, 0);
});
