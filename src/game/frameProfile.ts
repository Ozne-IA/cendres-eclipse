const TIMINGS = [
  'simulation',
  'render',
  'titleArtwork',
  'backdropAndEclipse',
  'distantScenery',
  'midgroundArchitecture',
  'midgroundAtmosphere',
  'titleShowcase',
  'terrainAndTorches',
  'props',
  'foregroundParallax',
  'colorGrading',
] as const;

type Timing = (typeof TIMINGS)[number];
type Totals = { samples: number; total: number; max: number };
type Summary = { samples: number; average: number | null; max: number | null };

export class FrameProfile {
  private readonly timings = new Map<Timing, Totals>();
  private cooldownSkips = 0;
  private staticSkips = 0;

  constructor(readonly now = () => performance.now()) {
    for (const timing of TIMINGS) {
      this.timings.set(timing, { samples: 0, total: 0, max: 0 });
    }
  }

  recordTiming(timing: Timing, elapsedMs: number): void {
    const totals = this.timings.get(timing)!;
    totals.samples++;
    totals.total += elapsedMs;
    totals.max = Math.max(totals.max, elapsedMs);
  }

  finishTiming(timing: Timing, startedAt: number): void {
    this.recordTiming(timing, this.now() - startedAt);
  }

  skipCooldown(): void {
    this.cooldownSkips++;
  }

  skipStatic(): void {
    this.staticSkips++;
  }

  snapshot() {
    const cpuMs = {} as Record<Timing, Summary>;
    for (const [timing, { samples, total, max }] of this.timings) {
      cpuMs[timing] = {
        samples,
        average: samples ? total / samples : null,
        max: samples ? max : null,
      };
    }

    return {
      rafFrames: cpuMs.render.samples + this.cooldownSkips + this.staticSkips,
      skippedRenderFrames: { cooldown: this.cooldownSkips, static: this.staticSkips },
      cpuMs,
    };
  }

  reset(): void {
    for (const totals of this.timings.values()) {
      totals.samples = 0;
      totals.total = 0;
      totals.max = 0;
    }
    this.cooldownSkips = 0;
    this.staticSkips = 0;
  }
}

declare global {
  interface Window {
    cendresProfile?: Pick<FrameProfile, 'snapshot' | 'reset'>;
  }
}
