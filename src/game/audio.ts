import type { GameSettings, WeaponKey } from './types';

export type MusicMood = 'title' | 'explore' | 'combat' | 'boss';

const BIOME_SCALES: number[][] = [
  [146.83, 155.56, 174.61, 196.0, 220.0, 233.08, 261.63, 293.66], // D Phrygian (Catacombes)
  [130.81, 146.83, 155.56, 174.61, 196.0, 207.65, 246.94, 261.63], // C Harmonic Minor (Viaduc)
  [110.0, 116.54, 138.59, 146.83, 164.81, 174.61, 196.0, 220.0], // A Phrygian Dominant (Flèche)
  [146.83, 164.81, 174.61, 207.65, 220.0, 233.08, 277.18, 293.66], // D Double Harmonic (Sanctuaire)
];

class DarkAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 0.85;
  private sfxVolume = 0.9;
  private ambientVolume = 0.55;
  private ambientDrone = true;
  private musicEnabled = true;
  private musicVolume = 0.65;
  private musicMood: MusicMood = 'title';
  private musicBiomeIdx = 0;
  private musicBossPhase2 = false;
  private musicTimer = 0;
  private musicStep = 0;
  private droneNodes: {
    o1: OscillatorNode;
    o2: OscillatorNode;
    lfo: OscillatorNode;
    gain: GainNode;
  } | null = null;

  setMuted(m: boolean): void {
    this.muted = m;
    this.syncDrone();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMusicContext(mood: MusicMood, biomeIdx = 0, bossPhase2 = false): void {
    this.musicMood = mood;
    this.musicBiomeIdx = Math.abs(biomeIdx) % BIOME_SCALES.length;
    this.musicBossPhase2 = bossPhase2;
  }

  updateSettings(
    s: Pick<
      GameSettings,
      'masterVolume' | 'sfxVolume' | 'ambientVolume' | 'ambientDrone' | 'musicEnabled' | 'musicVolume'
    >
  ): void {
    this.masterVolume = Math.max(0, Math.min(1, s.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, s.sfxVolume));
    this.ambientVolume = Math.max(0, Math.min(1, s.ambientVolume));
    this.ambientDrone = !!s.ambientDrone;
    this.musicEnabled = s.musicEnabled !== false;
    this.musicVolume = Math.max(0, Math.min(1, s.musicVolume ?? 0.65));
    this.syncDrone();
  }

  private getSfxScale(): number {
    return this.muted ? 0 : this.masterVolume * this.sfxVolume;
  }

  private getMusicScale(): number {
    return this.muted || !this.musicEnabled ? 0 : this.masterVolume * this.musicVolume;
  }

  updateMusic(dt: number): void {
    const scale = this.getMusicScale();
    if (scale <= 0.005 || !this.ctx || this.ctx.state !== 'running') return;

    const tempoSec =
      this.musicMood === 'boss'
        ? this.musicBossPhase2
          ? 0.24
          : 0.31
        : this.musicMood === 'combat'
        ? 0.38
        : this.musicMood === 'explore'
        ? 0.62
        : 0.78;

    this.musicTimer += dt;
    if (this.musicTimer < tempoSec) return;
    this.musicTimer -= tempoSec;

    const notes = BIOME_SCALES[this.musicBiomeIdx];
    const step = this.musicStep++;
    const pattern =
      this.musicMood === 'boss'
        ? [0, 4, 5, 4, 2, 7, 5, 1]
        : this.musicMood === 'combat'
        ? [0, 2, 4, 5, 4, 1, 2, 0]
        : [0, 4, 2, 7, 5, 4, 1, 2];

    const root = notes[pattern[step % pattern.length]];
    const musicVol = 0.036 * scale;
    const isStrongBeat = step % 4 === 0;

    // Plucked liturgical gothic motif
    this.toneDirect(
      root,
      this.musicMood === 'boss' ? 'sawtooth' : 'triangle',
      tempoSec * 1.45,
      musicVol * (isStrongBeat ? 1.25 : 0.85),
      root * 0.996
    );

    // Sub-bass drone pulse on downbeats during combat & bosses
    if (isStrongBeat) {
      this.toneDirect(
        notes[0] * 0.5,
        'sine',
        tempoSec * 2.8,
        musicVol * (this.musicMood === 'boss' ? 1.85 : 1.25),
        notes[0] * 0.49
      );
    }

    // High bell overtone in phase II or title contemplation
    if (step % 8 === 4 && (this.musicMood === 'title' || this.musicBossPhase2)) {
      this.toneDirect(root * 2, 'sine', tempoSec * 1.9, musicVol * 0.55, root * 2.01);
    }
  }

  private ensure(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (
      typeof navigator !== 'undefined' &&
      'userActivation' in navigator &&
      navigator.userActivation &&
      !navigator.userActivation.hasBeenActive
    ) {
      return null;
    }
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    if (this.ctx) this.syncDrone();
    return this.ctx;
  }

  private syncDrone(): void {
    if (!this.ctx) return;
    const targetGain =
      this.muted || !this.ambientDrone
        ? 0
        : Math.max(0, Math.min(0.06, this.masterVolume * this.ambientVolume * 0.045));

    if (targetGain <= 0.0005) {
      if (this.droneNodes) {
        try {
          this.droneNodes.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
        } catch {
          // ignore audio context teardown errors
        }
      }
      return;
    }

    if (!this.droneNodes) {
      try {
        const c = this.ctx;
        const o1 = c.createOscillator();
        const o2 = c.createOscillator();
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        const filter = c.createBiquadFilter();
        const gain = c.createGain();

        o1.type = 'sawtooth';
        o1.frequency.value = 55;
        o2.type = 'triangle';
        o2.frequency.value = 82.41;

        filter.type = 'lowpass';
        filter.frequency.value = 185;
        filter.Q.value = 1.6;

        lfo.type = 'sine';
        lfo.frequency.value = 0.14;
        lfoGain.gain.value = 45;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        gain.gain.value = 0.0001;
        o1.connect(filter);
        o2.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);

        o1.start();
        o2.start();
        lfo.start();
        this.droneNodes = { o1, o2, lfo, gain };
      } catch {
        return;
      }
    }

    try {
      this.droneNodes.gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.18);
    } catch {
      // ignore
    }
  }

  private jitter(freq: number): number {
    return freq * (0.92 + Math.random() * 0.16);
  }

  private toneDirect(
    freq: number,
    type: OscillatorType,
    dur: number,
    finalVol: number,
    slide: number | null = null,
    delaySec = 0
  ): void {
    const c = this.ctx;
    if (!c || finalVol <= 0.0005) return;
    const t0 = c.currentTime + delaySec;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(25, freq), t0);
    if (slide !== null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(finalVol, t0 + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private tone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol = 0.11,
    slide: number | null = null,
    delaySec = 0
  ): void {
    const scale = this.getSfxScale();
    if (scale <= 0.001) return;
    const c = this.ensure();
    if (!c) return;
    this.toneDirect(freq, type, dur, Math.max(0.001, vol * scale), slide, delaySec);
  }

  private noiseBurst(dur: number, vol = 0.05, filterFreq = 900): void {
    const scale = this.getSfxScale();
    if (scale <= 0.001) return;
    const c = this.ensure();
    if (!c) return;
    const sampleCount = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, sampleCount, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.001, vol * scale), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start();
  }

  jump(): void {
    this.tone(this.jitter(190), 'triangle', 0.13, 0.075, 360);
  }

  wallJump(): void {
    this.noiseBurst(0.07, 0.04, 1100);
    this.tone(this.jitter(235), 'triangle', 0.14, 0.08, 430);
  }

  land(): void {
    this.tone(this.jitter(95), 'sine', 0.08, 0.05, 50);
  }

  footstep(surface: 'stone' | 'ash' | 'wood' = 'stone'): void {
    const filterFreq = surface === 'wood' ? 540 : surface === 'ash' ? 1450 : 920;
    this.noiseBurst(0.032, 0.018, filterFreq);
    this.tone(this.jitter(surface === 'wood' ? 110 : 85), 'sine', 0.035, 0.016, 48);
  }

  dash(): void {
    this.noiseBurst(0.14, 0.06, 750);
    this.tone(this.jitter(145), 'sawtooth', 0.13, 0.055, 58);
  }

  perfectDodge(): void {
    this.noiseBurst(0.16, 0.065, 1650);
    this.tone(420, 'sine', 0.22, 0.09, 980);
    this.tone(840, 'triangle', 0.2, 0.06, 1320, 0.03);
  }

  slash(comboStep = 0, weapon: WeaponKey = 'clay_blade'): void {
    const pitchMult =
      weapon === 'eclipse_daggers'
        ? 1.38
        : weapon === 'belfry_greatsword' || weapon === 'twin_hammers'
        ? 0.72
        : weapon === 'scythe_eclipse'
        ? 1.1
        : 1;
    const base = (comboStep === 2 ? 520 : comboStep === 1 ? 460 : 410) * pitchMult;
    this.noiseBurst(0.08, 0.045, 1550 * pitchMult);
    this.tone(this.jitter(base), 'sawtooth', 0.09, 0.075, 115 * pitchMult);
  }

  skillArt(): void {
    this.noiseBurst(0.22, 0.085, 1100);
    this.tone(240, 'sawtooth', 0.26, 0.12, 620);
    this.tone(480, 'triangle', 0.28, 0.09, 880, 0.05);
  }

  achievement(): void {
    this.tone(440, 'triangle', 0.2, 0.08, 440);
    this.tone(554.37, 'triangle', 0.22, 0.08, 554.37, 0.08);
    this.tone(659.25, 'sine', 0.35, 0.09, 880, 0.16);
  }

  heavy(): void {
    this.noiseBurst(0.18, 0.07, 620);
    this.tone(this.jitter(175), 'sawtooth', 0.24, 0.12, 58);
    this.tone(this.jitter(90), 'triangle', 0.26, 0.09, 42);
  }

  parry(): void {
    this.tone(this.jitter(990), 'square', 0.16, 0.12, 1480);
    this.tone(this.jitter(1520), 'triangle', 0.26, 0.11, 920);
    this.tone(this.jitter(2100), 'sine', 0.22, 0.06, 1780, 0.02);
  }

  guard(): void {
    this.tone(this.jitter(290), 'square', 0.11, 0.08, 160);
  }

  hit(heavy = false): void {
    this.tone(this.jitter(heavy ? 95 : 122), 'square', heavy ? 0.18 : 0.13, heavy ? 0.14 : 0.11, 38);
    if (heavy) this.noiseBurst(0.1, 0.06, 500);
  }

  crit(): void {
    this.hit(true);
    this.tone(680, 'triangle', 0.18, 0.09, 1020);
  }

  rankUp(): void {
    this.tone(587.33, 'triangle', 0.14, 0.07, 783.99);
    this.tone(880, 'sine', 0.22, 0.06, 1046.5, 0.05);
  }

  hurt(): void {
    this.tone(this.jitter(92), 'sawtooth', 0.24, 0.15, 36);
    this.noiseBurst(0.15, 0.08, 420);
  }

  heal(): void {
    this.tone(330, 'sine', 0.25, 0.085, 520);
    this.tone(520, 'sine', 0.28, 0.075, 660, 0.07);
    this.tone(660, 'triangle', 0.3, 0.05, 880, 0.14);
  }

  pickup(): void {
    this.tone(540, 'triangle', 0.14, 0.07, 740);
    this.tone(740, 'sine', 0.18, 0.06, 980, 0.06);
  }

  death(): void {
    this.tone(120, 'sawtooth', 0.85, 0.15, 34);
    this.tone(84, 'triangle', 1.05, 0.13, 28, 0.08);
  }

  victory(): void {
    this.tone(392, 'triangle', 0.28, 0.09, 392);
    this.tone(493.88, 'triangle', 0.28, 0.09, 493.88, 0.12);
    this.tone(587.33, 'triangle', 0.45, 0.1, 587.33, 0.24);
    this.tone(783.99, 'sine', 0.65, 0.09, 783.99, 0.38);
  }

  ui(): void {
    this.tone(540, 'triangle', 0.065, 0.055, 430);
  }

  boss(): void {
    this.tone(78, 'sawtooth', 0.72, 0.14, 40);
    this.tone(116, 'triangle', 0.65, 0.1, 58, 0.08);
  }
}

export const AudioFX = new DarkAudioEngine();

