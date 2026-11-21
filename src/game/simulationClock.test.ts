import assert from 'node:assert/strict';
import test from 'node:test';
import { CendresEngine, type EngineCallbacks } from './engine';
import { createSeededRandom } from './random';
import { RenderInterpolation } from './renderInterpolation';
import { SIMULATION_STEP, SimulationClock } from './simulationClock';
import type { InputState } from './types';

const idle: InputState = {
  moveX: 0, jump: false, jumpHeld: false, jumpReleased: false, dash: false, attack: false,
  heavy: false, parry: false, parryHeld: false, skill: false, heal: false, interact: false,
  pause: false, mute: false, down: false, upHeld: false,
};

function makeEngine(callbacks: Partial<EngineCallbacks> = {}) {
  const canvas = { getContext: () => ({}), focus: () => {} } as unknown as HTMLCanvasElement;
  return new CendresEngine(canvas, {
    onPhaseChange: () => {},
    onSaveChange: () => {},
    onHudUpdate: () => {},
    onBlessingChoices: () => {},
    onMerchantOpen: () => {},
    onRunSummary: () => {},
    ...callbacks,
  }, createSeededRandom(20261121));
}

test('a burst of slow motion always yields the same fixed steps across frame rates', () => {
  for (const fps of [30, 60, 120, 144]) {
    const clock = new SimulationClock();
    let count = 0;
    for (let i = 0; i < fps; i++) {
      clock.advance(1 / fps, (dt) => {
        assert.equal(dt, SIMULATION_STEP);
        count++;
        if (count === 12) clock.slowFor(0.22);
        return true;
      });
    }
    assert.equal(count, 52);
    assert.ok(Math.abs(clock.alpha - 0.344) < 1e-8);
  }
});

test('the clock caps catch-up after a stalled frame', () => {
  const clock = new SimulationClock();
  let count = 0;
  clock.advance(30, () => { count++; return true; });
  assert.equal(count, 3);
  assert.equal(clock.alpha, 0);
});

test('scripted seeded combat ends in the same state across render rates', () => {
  function play(fps: number, titleFrames: number) {
    const engine = makeEngine();
    for (let i = 0; i < titleFrames; i++) engine.advanceSimulation(1 / fps, idle);
    engine.startNewRun();

    const player = engine['player']!;
    const run = engine['run']!;
    const room = engine['room']!;
    const target = room.enemies.find((enemy) => !enemy.flying)!;
    target.x = player.x + player.w + 12;
    target.y = player.y;
    target.state = 'staggered';
    target.stateT = 1;
    const initialHp = target.hp;
    for (let i = 0; i < fps * 2; i++) {
      engine.advanceSimulation(1 / fps, {
        ...idle,
        attack: i === 0 || i === fps / 2,
        moveX: i >= fps && i < fps * 1.5 ? 1 : 0,
        dash: i === fps,
      });
    }
    assert.ok(target.hp < initialHp);
    assert.ok(run.elapsedSec < 2, 'at least one attack triggered hitstop');
    return { player, run, enemies: room.enemies, platforms: room.platforms, save: engine.getSave() };
  }

  const reference = play(60, 12);
  for (const fps of [30, 120, 144]) {
    assert.deepEqual(play(fps, Math.floor(fps / 3)), reference);
  }
});

test('sub-tick actions survive until the next update and do not repeat in catch-up steps', () => {
  const engine = makeEngine();
  engine.startTrainingMode();
  const player = engine['player']!;
  engine.advanceSimulation(SIMULATION_STEP / 2, { ...idle, attack: true });
  assert.equal(player.attackT, 0);
  engine.advanceSimulation(SIMULATION_STEP * 2.5, idle);
  assert.ok(player.attackT > 0);
  assert.equal(player.attackBuf, false);
});

test('hitstop defers an input edge and pause drops queued combat actions and time', () => {
  const phases: string[] = [];
  const engine = makeEngine({ onPhaseChange: (phase) => phases.push(phase) });
  engine.startTrainingMode();
  const player = engine['player']!;
  engine['hitStop'] = SIMULATION_STEP * 2;
  engine.advanceSimulation(SIMULATION_STEP, { ...idle, attack: true });
  engine.advanceSimulation(SIMULATION_STEP, idle);
  assert.equal(player.attackT, 0);
  engine.advanceSimulation(SIMULATION_STEP, idle);
  assert.ok(player.attackT > 0);

  engine.advanceSimulation(SIMULATION_STEP / 2, { ...idle, dash: true });
  engine.advanceSimulation(0, { ...idle, pause: true });
  const elapsedBeforePause = engine['run']!.elapsedSec;
  engine.advanceSimulation(5, idle);
  engine.advanceSimulation(0, { ...idle, pause: true });
  assert.deepEqual(phases, ['playing', 'paused', 'playing']);
  engine.advanceSimulation(SIMULATION_STEP / 2, idle);
  assert.equal(engine['run']!.elapsedSec, elapsedBeforePause);
  engine.advanceSimulation(SIMULATION_STEP / 2, idle);
  assert.equal(engine['run']!.elapsedSec, elapsedBeforePause + SIMULATION_STEP);
  assert.equal(player.dashT, 0);
  assert.equal(player.dashBuf, false);
});

test('gamepad menu commands are delivered even when no simulation step is due', () => {
  const commands: string[] = [];
  const engine = makeEngine({ onGamepadMenu: (command) => commands.push(command) });
  engine.advanceSimulation(0, { ...idle, gamepadMenuCommand: 'confirm' });
  engine.advanceSimulation(0, idle);
  assert.deepEqual(commands, ['confirm']);
  assert.equal(engine['phase'], 'title');
});

test('interpolation only moves presentation state and forgets discontinuities', () => {
  const interpolation = new RenderInterpolation();
  const entity = { x: 10, y: 50, angle: 0, health: 10 };
  interpolation.capture(entity);
  Object.assign(entity, { x: 14, y: 62, angle: 2, health: 8 });
  assert.deepEqual(interpolation.interpolate(entity, 0.25), { x: 11, y: 53, angle: 0.5, health: 8 });
  assert.deepEqual(entity, { x: 14, y: 62, angle: 2, health: 8 });
  const newEntity = { ...entity };
  assert.equal(interpolation.interpolate(newEntity, 0), newEntity);
  interpolation.forget(entity);
  assert.equal(interpolation.interpolate(entity, 0), entity);
});
