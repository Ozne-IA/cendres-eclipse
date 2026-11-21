export const SIMULATION_STEP = 1 / 60;
export const MAX_FRAME_TIME = 0.05;

const SLOW_RATE = 0.42;
const CLOCK_EPSILON = 1e-10;

export class SimulationClock {
  private accumulated = 0;
  private slowRemaining = 0;

  get alpha(): number {
    return this.accumulated / SIMULATION_STEP;
  }

  clearFrame(): void {
    this.accumulated = 0;
  }

  slowFor(seconds: number): void {
    this.slowRemaining = seconds;
  }

  advance(elapsed: number, step: (dt: number) => boolean): void {
    let remaining = Math.min(MAX_FRAME_TIME, elapsed);
    while (remaining > CLOCK_EPSILON) {
      const slow = this.slowRemaining > CLOCK_EPSILON;
      const rate = slow ? SLOW_RATE : 1;
      const untilStep = (SIMULATION_STEP - this.accumulated) / rate;
      // Split at the next tick or the end of slow motion. Physics always sees the same dt.
      const wallTime = Math.min(remaining, untilStep, slow ? this.slowRemaining : remaining);
      remaining -= wallTime;
      if (slow) this.slowRemaining -= wallTime;
      this.accumulated += wallTime * rate;
      if (this.accumulated >= SIMULATION_STEP - CLOCK_EPSILON) {
        this.accumulated = 0;
        if (!step(SIMULATION_STEP)) return;
      }
    }
  }
}
