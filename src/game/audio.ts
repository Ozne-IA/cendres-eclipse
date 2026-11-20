import type { GameSettings } from './types';

class DarkAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 0.85;
  private sfxVolume = 0.9;
  private ambientVolume = 0.55;
  private ambientDrone = true;
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

  updateSettings(
    s: Pick<GameSettings, 'masterVolume' | 'sfxVolume' | 'ambientVolume' | 'ambientDrone'>
  ): void {
    this.masterVolume = Math.max(0, Math.min(1, s.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, s.sfxVolume));
    this.ambientVolume = Math.max(0, Math.min(1, s.ambientVolume));
    this.ambientDrone = !!s.ambientDrone;
    this.syncDrone();
  }

  private getSfxScale(): number {
    return this.muted ? 0 : this.masterVolume * this.sfxVolume;
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
    const finalVol = Math.max(0.001, vol * scale);
    const t0 = c.currentTime + delaySec;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(25, freq), t0);
    if (slide !== null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(finalVol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
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

  dash(): void {
    this.noiseBurst(0.14, 0.06, 750);
    this.tone(this.jitter(145), 'sawtooth', 0.13, 0.055, 58);
  }

  slash(comboStep = 0): void {
    const base = comboStep === 2 ? 520 : comboStep === 1 ? 460 : 410;
    this.noiseBurst(0.08, 0.045, 1600);
    this.tone(this.jitter(base), 'sawtooth', 0.09, 0.075, 115);
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

