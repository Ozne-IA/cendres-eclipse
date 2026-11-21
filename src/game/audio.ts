import type { EnemyKind, GameSettings, WeaponKey } from './types';

export type MusicMood = 'title' | 'explore' | 'combat' | 'boss';

interface MusicTheme {
  root: number;
  wave: OscillatorType;
  pulse: number;
  motif: readonly (number | null)[];
  alternate: readonly (number | null)[];
}

// Motifs are written as semitone offsets. A rest leaves space for the ambience.
const TITLE_THEME: MusicTheme = {
  root: 146.83, wave: 'sine', pulse: 0.78,
  motif: [0, null, 7, 3, 12, null, 8, 1], alternate: [],
};

const BIOME_THEMES: Readonly<Record<string, MusicTheme>> = {
  catacombes: {
    root: 146.83, wave: 'triangle', pulse: 0.64,
    motif: [0, null, 1, 7, 3, null, 1, -2], alternate: [0, 1, 3, 7, 0, -2, 1, 0],
  },
  viaduc: {
    root: 130.81, wave: 'sine', pulse: 0.75,
    motif: [12, 7, null, 3, 2, null, 11, 7], alternate: [0, 7, 8, null, 11, 7, 3, 2],
  },
  fleche: {
    root: 110, wave: 'sawtooth', pulse: 0.56,
    motif: [0, 4, 1, null, 7, 4, 6, null], alternate: [0, 1, 4, 6, 7, 6, 4, 1],
  },
  sanctuaire: {
    root: 146.83, wave: 'triangle', pulse: 0.7,
    motif: [12, 11, 6, 2, null, 10, 7, 0], alternate: [0, 6, 7, 11, 12, 11, 10, 6],
  },
};

const GUARDIAN_THEMES: Readonly<Partial<Record<EnemyKind, MusicTheme>>> = {
  archon: {
    root: 98, wave: 'triangle', pulse: 0.33,
    motif: [0, 0, 7, null, 6, 7, 3, 1], alternate: [0, 7, 6, 7, 12, 7, 1, 3],
  },
  mother: {
    root: 138.59, wave: 'sine', pulse: 0.37,
    motif: [12, null, 10, 6, 5, null, 1, 0], alternate: [12, 10, 6, 13, 12, 6, 5, 1],
  },
  sovereign: {
    root: 82.41, wave: 'sawtooth', pulse: 0.3,
    motif: [0, -2, 1, 7, 12, 7, 6, null], alternate: [0, 12, 7, 13, 6, 12, 11, 1],
  },
};

const MUSIC_LEVEL: Record<MusicMood, number> = { title: 0.85, explore: 1, combat: 0.64, boss: 0.55 };

const WEAPON_VOICES = {
  clay_blade: { wave: 'sawtooth', pitch: 390, end: 135, duration: 0.09, noise: 1550, overtone: 880 },
  belfry_greatsword: { wave: 'triangle', pitch: 214, end: 60, duration: 0.18, noise: 760, overtone: 330 },
  eclipse_daggers: { wave: 'square', pitch: 755, end: 320, duration: 0.055, noise: 2600, overtone: 1425 },
  ash_halberd: { wave: 'sawtooth', pitch: 305, end: 108, duration: 0.145, noise: 1040, overtone: 610 },
  scythe_eclipse: { wave: 'sine', pitch: 280, end: 680, duration: 0.16, noise: 2150, overtone: 1150 },
  twin_hammers: { wave: 'triangle', pitch: 112, end: 40, duration: 0.13, noise: 480, overtone: 175 },
} as const satisfies Record<WeaponKey, { wave: OscillatorType; pitch: number; end: number; duration: number; noise: number; overtone: number }>;

const COMBO_CHIMES: Readonly<Record<string, readonly number[]>> = {
  C: [440, 587.33],
  B: [493.88, 659.25],
  A: [523.25, 698.46],
  S: [587.33, 783.99, 987.77],
  ÉCLIPSE: [392, 587.33, 783.99, 1174.66],
};

export class DarkAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 0.85;
  private sfxVolume = 0.9;
  private ambientVolume = 0.55;
  private ambientDrone = true;
  private musicEnabled = true;
  private musicVolume = 0.65;
  private musicMood: MusicMood = 'title';
  private requestedMood: MusicMood = 'title';
  private biomeTheme = BIOME_THEMES.catacombes;
  private guardianTheme: MusicTheme | undefined;
  private theme = TITLE_THEME;
  private bossPhase2 = false;
  private playingPhase2 = false;
  private combatHold = 0;
  private musicDuck = 0;
  private musicTimer = 0;
  private musicStep = 0;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private musicTarget = -1;
  private droneNodes: {
    o1: OscillatorNode;
    o2: OscillatorNode;
    lfo: OscillatorNode;
    gain: GainNode;
  } | null = null;

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) this.musicDuck = 0;
    this.syncMix();
    this.syncDrone();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMusicContext(mood: MusicMood, biome = 'catacombes', guardian?: EnemyKind, bossPhase2 = false): void {
    this.requestedMood = mood;
    this.biomeTheme = BIOME_THEMES[biome] ?? BIOME_THEMES.catacombes;
    this.guardianTheme = guardian ? GUARDIAN_THEMES[guardian] : undefined;
    this.bossPhase2 = bossPhase2;
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
    if (this.sfxVolume === 0) this.musicDuck = 0;
    this.syncMix();
    this.syncDrone();
  }

  private getSfxScale(): number {
    return this.muted ? 0 : this.masterVolume * this.sfxVolume;
  }

  private getMusicScale(): number {
    return this.muted || !this.musicEnabled ? 0 : this.masterVolume * this.musicVolume;
  }

  private syncMix(): void {
    if (!this.ctx) return;
    this.sfxBus.gain.setTargetAtTime(this.getSfxScale(), this.ctx.currentTime, 0.025);
    this.syncMusicGain();
  }

  private syncMusicGain(): void {
    if (!this.ctx) return;
    const target = this.getMusicScale() * MUSIC_LEVEL[this.musicMood] * (this.musicDuck > 0 ? 0.42 : 1);
    if (target === this.musicTarget) return;
    this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, target < this.musicTarget ? 0.035 : 0.24);
    this.musicTarget = target;
  }

  private duckMusic(seconds: number): void {
    if (this.getSfxScale() <= 0.001) return;
    this.musicDuck = Math.max(this.musicDuck, seconds);
    this.syncMusicGain();
  }

  updateMusic(dt: number): void {
    this.musicDuck = Math.max(0, this.musicDuck - dt);
    // Keep a combat phrase through brief pauses between enemy attacks.
    this.combatHold = this.requestedMood === 'combat' ? 1.3 : Math.max(0, this.combatHold - dt);
    const mood = this.requestedMood === 'explore' && this.combatHold > 0 ? 'combat' : this.requestedMood;
    const phase2 = mood === 'boss' && this.bossPhase2;
    const theme = mood === 'title' ? TITLE_THEME : (mood === 'boss' ? this.guardianTheme : undefined) ?? this.biomeTheme;
    if (theme !== this.theme || mood !== this.musicMood || phase2 !== this.playingPhase2) {
      this.theme = theme;
      this.musicMood = mood;
      this.playingPhase2 = phase2;
      this.musicTimer = 0;
      this.musicStep = 0;
    }
    this.syncMusicGain();

    const scale = this.getMusicScale();
    if (!this.ctx && (scale > 0.005 || (!this.muted && this.ambientDrone && this.masterVolume * this.ambientVolume > 0))) {
      this.ensure();
    }
    if (scale <= 0.005 || this.ctx?.state !== 'running') return;

    const tempoSec = theme.pulse * (phase2 ? 0.76 : mood === 'combat' ? 0.68 : 1);

    this.musicTimer += dt;
    if (this.musicTimer < tempoSec) return;
    this.musicTimer -= tempoSec;

    const step = this.musicStep++;
    const pattern = phase2 || mood === 'combat' ? theme.alternate : theme.motif;
    const interval = pattern[step % pattern.length];
    const downbeat = step % 4 === 0;
    if (interval !== null) {
      const note = theme.root * 2 ** (interval / 12);
      this.toneDirect(note, theme.wave, tempoSec * 1.45, downbeat ? 0.044 : 0.03, note * 0.996, 0, this.musicBus);
      if ((phase2 && step % 2 === 1) || ((mood === 'title' || theme === BIOME_THEMES.sanctuaire) && step % 8 === 4)) {
        this.toneDirect(note * 2, 'sine', tempoSec * 1.9, 0.018, note * 2.01, 0, this.musicBus);
      }
    }
    if (downbeat) {
      this.toneDirect(theme.root * 0.5, 'sine', tempoSec * 2.8, mood === 'boss' ? 0.066 : 0.045, theme.root * 0.49, 0, this.musicBus);
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
      if (AC) {
        this.ctx = new AC();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus.gain.value = 0;
        this.sfxBus.gain.value = this.getSfxScale();
        this.musicBus.connect(this.ctx.destination);
        this.sfxBus.connect(this.ctx.destination);
        this.syncMix();
        this.syncDrone();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
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
    delaySec = 0,
    bus = this.sfxBus
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
    g.connect(bus);
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
    this.toneDirect(freq, type, dur, vol, slide, delaySec);
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
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
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
    const voice = WEAPON_VOICES[weapon];
    const accent = 1 + comboStep * 0.12;
    this.noiseBurst(voice.duration, 0.048, voice.noise);
    this.tone(this.jitter(voice.pitch * accent), voice.wave, voice.duration, 0.078, voice.end);
    this.tone(voice.overtone * accent, 'sine', voice.duration * 0.9, 0.035, voice.overtone * 0.71, voice.duration * 0.4);
  }

  skillArt(weapon: WeaponKey = 'clay_blade'): void {
    const voice = WEAPON_VOICES[weapon];
    this.duckMusic(0.24);
    this.noiseBurst(0.22, 0.075, voice.noise);
    this.tone(voice.pitch * 0.65, voice.wave, 0.26, 0.11, voice.overtone * 0.7);
    this.tone(voice.overtone, 'triangle', 0.28, 0.067, voice.overtone * 1.35, 0.05);
  }

  achievement(): void {
    this.tone(440, 'triangle', 0.2, 0.08, 440);
    this.tone(554.37, 'triangle', 0.22, 0.08, 554.37, 0.08);
    this.tone(659.25, 'sine', 0.35, 0.09, 880, 0.16);
  }

  heavy(weapon: WeaponKey = 'clay_blade'): void {
    const voice = WEAPON_VOICES[weapon];
    this.noiseBurst(0.16 + voice.duration * 0.4, 0.075, voice.noise * 0.55);
    this.tone(this.jitter(voice.pitch * 0.48), voice.wave, 0.25, 0.1, voice.end * 0.6);
    this.tone(voice.overtone * 0.48, 'triangle', 0.22, 0.056, voice.overtone * 0.28, 0.055);
  }

  parry(): void {
    this.duckMusic(0.33);
    this.noiseBurst(0.042, 0.09, 3350);
    this.tone(1210, 'triangle', 0.075, 0.12, 735);
    this.tone(1760, 'sine', 0.25, 0.08, 1750, 0.012);
    this.tone(1174.66, 'sine', 0.31, 0.085, 1168, 0.055);
  }

  sacrifice(): void {
    this.noiseBurst(0.12, 0.05, 930);
    this.tone(185, 'sine', 0.34, 0.09, 78);
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

  rankUp(rank = 'C'): void {
    const chime = COMBO_CHIMES[rank] ?? COMBO_CHIMES.C;
    const eclipse = rank === 'ÉCLIPSE';
    if (eclipse) this.duckMusic(0.55);
    for (let i = 0; i < chime.length; i++) {
      const lead = i === chime.length - 1;
      this.tone(chime[i], lead ? 'sine' : 'triangle', lead ? eclipse ? 0.44 : 0.22 : 0.16, lead ? 0.08 : 0.057, null, i * (eclipse ? 0.085 : 0.052));
    }
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

  boss(guardian?: EnemyKind, phase2 = false): void {
    const theme = (guardian ? GUARDIAN_THEMES[guardian] : undefined) ?? GUARDIAN_THEMES.archon!;
    this.duckMusic(0.55);
    this.tone(theme.root, theme.wave, 0.65, 0.125, theme.root * (phase2 ? 1.5 : 0.55));
    this.tone(theme.root * (phase2 ? 2 : 1.5), 'triangle', 0.55, 0.085, theme.root * 0.75, 0.09);
  }
}

export const AudioFX = new DarkAudioEngine();

