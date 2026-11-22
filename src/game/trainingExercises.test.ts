import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CendresEngine } from './engine';
import { createSeededRandom } from './random';
import { SIMULATION_STEP } from './simulationClock';
import type { TrainingExerciseId } from './trainingExercises';
import type { GamePhase, HudSnapshot, InputState } from './types';

const idle: InputState = {
  moveX: 0, jump: false, jumpHeld: false, jumpReleased: false, dash: false, attack: false,
  heavy: false, parry: false, parryHeld: false, skill: false, heal: false, interact: false,
  pause: false, mute: false, down: false, upHeld: false,
};

function startExercise(id: TrainingExerciseId) {
  const canvas = { getContext: () => ({}), focus: () => {} } as unknown as HTMLCanvasElement;
  let hud!: HudSnapshot;
  let phase: GamePhase = 'title';
  let saveChanges = 0;
  const engine = new CendresEngine(canvas, {
    onHudUpdate: (snapshot) => { hud = snapshot; },
    onPhaseChange: (next) => { phase = next; },
    onSaveChange: () => { saveChanges++; },
    onBlessingChoices: () => {},
    onMerchantOpen: () => {},
    onRunSummary: () => {},
  }, createSeededRandom(17));

  const tick = (frames = 1, input: Partial<InputState> = {}) => {
    for (let i = 0; i < frames; i++) engine.advanceSimulation(SIMULATION_STEP, { ...idle, ...input });
  };
  const expectStatus = (complete: boolean) => assert.deepEqual(hud.trainingExercise, { id, complete });
  const retry = () => {
    engine.startTrainingMode(id);
    expectStatus(false);
  };

  retry();
  return {
    engine, tick, expectStatus, retry,
    get hud() { return hud; },
    get phase() { return phase; },
    get saveChanges() { return saveChanges; },
  };
}

test('parade: an early parry or a guard is insufficient, a timed deflection completes the exercise', () => {
  const session = startExercise('parry');
  session.tick(1, { parry: true, parryHeld: true });
  session.tick(120, { parryHeld: true });
  session.expectStatus(false);
  assert.ok(session.hud.hp < session.hud.maxHp);

  session.retry();
  session.tick(95);
  session.tick(1, { parry: true });
  session.tick(6);
  session.expectStatus(true);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.tick(240);
  session.expectStatus(true);
  session.retry();
});

test('riposte: only the melee hit on the staggered Penitent after a parry completes the exercise', () => {
  const session = startExercise('riposte');
  session.tick(1, { attack: true });
  session.expectStatus(false);
  session.retry();
  session.tick(95);
  session.tick(1, { parry: true });
  session.tick(6);
  assert.equal(session.hud.riposteReady, true);
  session.expectStatus(false);
  session.tick(19);
  session.tick(1, { attack: true });
  session.expectStatus(true);
  const completeSnapshot = session.hud.trainingExercise;
  session.retry();
  assert.equal(completeSnapshot?.complete, true);
  assert.equal(session.hud.riposteReady, false);
});

test('renvoi: a reflected Watcher orb completes the exercise without a melee parry', () => {
  const session = startExercise('reflect');
  session.tick(1, { parry: true });
  session.tick(141);
  session.expectStatus(false);

  session.retry();
  session.tick(128);
  session.tick(1, { parry: true });
  session.tick(5);
  session.expectStatus(true);
  assert.equal(session.hud.parryStreak, 1);
  assert.equal(session.hud.riposteReady, false);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.retry();
});

test('esquive: dashing by itself is insufficient, evading the charge with it completes the exercise', () => {
  const session = startExercise('dodge');
  session.tick(1, { dash: true, moveX: -1 });
  session.tick(50);
  session.expectStatus(false);

  session.retry();
  session.tick(97);
  session.tick(1, { dash: true, moveX: 1 });
  session.tick(1);
  session.expectStatus(true);
  assert.equal(session.hud.perfectDodges, 1);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.retry();
});

test('déplacement: a jump and actual movement are both required and reset between attempts', () => {
  const session = startExercise('movement');
  session.tick(32, { moveX: 1 });
  session.expectStatus(false);
  session.tick(1, { jump: true, jumpHeld: true });
  session.expectStatus(true);

  session.retry();
  session.tick(1, { jump: true, jumpHeld: true });
  session.tick(50);
  session.expectStatus(false);
  session.tick(1, { dash: true });
  session.tick(18);
  session.expectStatus(false);
  session.tick(8, { moveX: -1 });
  session.expectStatus(false);
  session.tick(40, { moveX: 1 });
  session.expectStatus(true);
});

test('art: starting an Art completes immediately with its cooldown, and retry clears it', () => {
  const session = startExercise('art');
  session.tick(1, { attack: true });
  session.tick(1, { skill: true });
  session.expectStatus(false);
  assert.equal(session.hud.skillCd, 0);
  session.tick(40);
  session.tick(1, { skill: true });
  session.expectStatus(true);
  assert.equal(session.hud.skillCd, session.hud.skillMaxCd);

  session.engine.openPause();
  session.tick(1, { skill: true });
  assert.equal(session.phase, 'paused');
  session.retry();
  assert.equal(session.phase, 'playing');
  assert.equal(session.hud.skillCd, 0);
  session.tick();
  session.expectStatus(false);
  session.tick(1, { skill: true });
  session.expectStatus(true);
});

test('guided exercise retries and enemy deaths leave progression, resources and records untouched', () => {
  const session = startExercise('riposte');
  const save = session.engine.getSave();
  session.tick(95);
  session.tick(1, { parry: true });
  session.tick(25);
  session.tick(1, { attack: true });
  session.tick(25);
  session.tick(1, { skill: true });
  session.tick(40);
  session.expectStatus(true);
  assert.equal(session.hud.runCendres, 0);
  assert.equal(session.hud.cendresTotal, save.res.cendres);
  assert.equal(session.hud.ferTotal, save.res.fer);
  assert.equal(session.hud.larmesTotal, save.res.larmes);
  session.retry();
  session.engine.openBastion();
  assert.equal(session.phase, 'bastion');
  assert.equal(session.saveChanges, 0);
  assert.deepEqual(session.engine.getSave(), save);
  session.engine.startTrainingMode();
  assert.equal(session.hud.isTraining, true);
  assert.equal(session.hud.trainingExercise, undefined);
  session.engine.startNewRun();
  assert.equal(session.hud.isTraining, false);
  assert.equal(session.hud.trainingExercise, undefined);
  assert.equal(session.engine.getSave().records.runs, save.records.runs + 1);
});
