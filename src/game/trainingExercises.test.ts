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
  const expectStatus = (progress: number, complete = false, failed = false) => {
    assert.equal(hud.trainingExercise?.id, id);
    assert.equal(hud.trainingExercise?.progress, progress);
    assert.equal(hud.trainingExercise?.complete, complete);
    assert.equal(hud.trainingExercise?.failed, failed);
  };
  const retry = () => {
    engine.startTrainingMode(id);
    expectStatus(0);
  };

  retry();
  return {
    engine, tick, expectStatus, retry,
    get hud() { return hud; },
    get phase() { return phase; },
    get saveChanges() { return saveChanges; },
  };
}

test('parade: a guard breaks the streak and three distinct deflections complete it', () => {
  const session = startExercise('parry');
  assert.equal(session.hud.trainingExercise?.parryWindowOpen, false);
  session.tick(99);
  assert.equal(session.hud.trainingExercise?.parryWindowOpen, true);
  session.tick(1, { parry: true });
  session.tick(12);
  session.expectStatus(1);
  session.tick(160, { parryHeld: true });
  session.expectStatus(0);
  assert.ok(session.hud.hp < session.hud.maxHp);

  session.retry();
  session.tick(99);
  session.tick(1, { parry: true });
  session.tick(12);
  session.expectStatus(1);
  session.tick(129);
  session.tick(1, { parry: true });
  session.expectStatus(2);
  session.tick(166);
  session.tick(1, { parry: true });
  session.expectStatus(3, true);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.tick(240);
  session.expectStatus(3, true);
});

test('riposte: a hit ends the attempt, while two melee hits after two parries complete it', () => {
  const session = startExercise('riposte');
  session.tick(102);
  session.expectStatus(0, false, true);

  session.retry();
  session.tick(99);
  session.tick(1, { parry: true });
  session.tick(14);
  assert.ok((session.hud.trainingExercise?.riposteSeconds ?? 0) > 0);
  session.expectStatus(0);
  session.tick(1, { attack: true, moveX: 1 });
  session.expectStatus(1);
  session.tick(158);
  session.tick(1, { parry: true });
  session.tick(11);
  session.tick(1, { attack: true, moveX: 1 });
  session.expectStatus(2, true);
  assert.equal(session.hud.hp, session.hud.maxHp);
  const finalSnapshot = session.hud.trainingExercise;
  session.retry();
  assert.equal(finalSnapshot?.complete, true);
  assert.equal(session.hud.trainingExercise?.riposteSeconds, 0);
});

test('renvoi: each projectile counts when it hits the Watcher, after reflection', () => {
  const session = startExercise('reflect');
  session.tick(127);
  session.tick(1, { parry: true });
  session.tick(15);
  assert.equal(session.hud.parryStreak, 1);
  session.expectStatus(0);
  session.tick(17);
  session.expectStatus(1);
  session.tick(104);
  session.tick(1, { parry: true });
  session.tick(32);
  session.expectStatus(2, true);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.retry();
});

test('esquive: a single dodge contact is insufficient, two in one dash complete it', () => {
  const session = startExercise('dodge');
  session.tick(126);
  session.tick(1, { dash: true, moveX: 1 });
  session.tick(3);
  assert.equal(session.hud.perfectDodges, 1);
  session.expectStatus(0);
  session.tick(4);
  session.expectStatus(1, true);
  assert.equal(session.hud.trainingExercise?.criticalReady, true);
  assert.equal(session.hud.perfectDodges, 1);
  assert.equal(session.hud.hp, session.hud.maxHp);
  session.retry();
});

test('déplacement: checkpoints are ordered, the course pauses and times out, and retry clears it', () => {
  const session = startExercise('movement');
  session.tick(16, { moveX: 1 });
  session.expectStatus(1);
  session.tick(99, { moveX: 1 });
  session.expectStatus(0);
  assert.equal(session.hud.trainingExercise?.remainingSeconds, 20);

  session.engine.openPause();
  session.tick(1200);
  assert.equal(session.hud.trainingExercise?.remainingSeconds, 20);
  assert.equal(session.phase, 'paused');
  session.engine.resumeGame();
  session.tick(1200);
  session.expectStatus(0, false, true);
  assert.equal(session.hud.trainingExercise?.remainingSeconds, 0);

  session.retry();
  session.tick(55, { moveX: 1 });
  session.expectStatus(1);
  session.tick(1, { moveX: 1, jump: true, jumpHeld: true });
  session.tick(7, { moveX: 1 });
  session.expectStatus(2);
  session.tick(52, { moveX: 1 });
  session.expectStatus(3, true);
  assert.ok((session.hud.trainingExercise?.remainingSeconds ?? 0) > 0);
});

test('art: misses and normal attacks do not count, but a ranged Art hit completes it', () => {
  const session = startExercise('art');
  assert.equal(session.hud.trainingExercise?.artCost, 22);
  session.tick(1, { attack: true });
  session.expectStatus(0);
  session.tick(40, { moveX: -1 });
  session.tick(1, { skill: true });
  assert.equal(session.hud.skillCd, session.hud.skillMaxCd);
  session.tick(70);
  session.expectStatus(0);

  session.engine.openPause();
  session.retry();
  assert.equal(session.phase, 'playing');
  assert.equal(session.hud.skillCd, 0);
  session.tick(40, { moveX: -1 });
  session.tick(1, { moveX: 1 });
  session.tick(1, { skill: true });
  session.expectStatus(0);
  session.tick(30);
  session.expectStatus(1, true);
  assert.ok(session.hud.stam >= 0);
});

test('guided kills and retries leave the save alone and the free Cour retains its setup', () => {
  const session = startExercise('art');
  const save = session.engine.getSave();
  for (let art = 0; art < 9; art++) {
    session.tick(1, { skill: true });
    session.tick(500);
  }
  session.expectStatus(1, true);
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
