import { CendresEngine } from './engine';
import { createSeededRandom } from './random';
import { defaultSave } from './rules';
import { SIMULATION_STEP } from './simulationClock';
import type { InputState } from './types';

const idle: InputState = {
  moveX: 0, jump: false, jumpHeld: false, jumpReleased: false, dash: false, attack: false,
  heavy: false, parry: false, parryHeld: false, skill: false, heal: false, interact: false,
  pause: false, mute: false, down: false, upHeld: false,
};

export function expedition(seed: number) {
  const events: string[] = [];
  const draws: number[] = [];
  const rng = createSeededRandom(seed);
  const canvas = { getContext: () => ({}), focus: () => {} } as unknown as HTMLCanvasElement;
  const engine = new CendresEngine(canvas, {
    onPhaseChange: (phase) => events.push(`phase:${phase}`),
    onSaveChange: (save) => events.push(`save:${save.loreUnlocked.join(',')}`),
    onHudUpdate: () => events.push('hud'),
    onBlessingChoices: (choices) => events.push(`blessings:${choices.map((choice) => choice.id).join(',')}`),
    onMerchantOpen: (run) => events.push(`merchant:${run.depth}`),
    onRunSummary: () => {},
  }, () => {
    const value = rng();
    draws.push(value);
    return value;
  });
  engine.updateSave(() => defaultSave());
  engine.startNewRun();
  const room = engine['room']!;
  const run = engine['run']!;
  const player = engine['player']!;
  room.hazards = [];
  room.props = [];
  events.length = 0;
  draws.length = 0;
  return {
    engine, room, player, run, events, draws,
    tick: (input: Partial<InputState> = {}) => engine.advanceSimulation(SIMULATION_STEP, { ...idle, ...input }),
  };
}
