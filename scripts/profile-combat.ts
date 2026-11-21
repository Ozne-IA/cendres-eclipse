import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Session } from 'node:inspector/promises';
import { CendresEngine } from '../src/game/engine';
import { createSeededRandom } from '../src/game/random';
import { SIMULATION_STEP } from '../src/game/simulationClock';
import type { Enemy, InputState } from '../src/game/types';

const SAMPLING_INTERVAL = 4096;
const SEEDS = [5, 29, 73, 109];
const DEPTHS = 12;
const FRAMES_PER_ROOM = 1200;

function playExpedition(seed: number, digest?: ReturnType<typeof createHash>) {
  const rng = createSeededRandom(seed);
  const state = {
    seed, frames: 0, ticks: 0, combatFrames: 0, kills: 0, bossesPhaseTwo: 0,
    bossesKilled: 0, damage: 0, damageTaken: 0, hudUpdates: 0, gameplayDraws: 0,
  };
  const canvas = { getContext: () => ({}), focus() {} } as unknown as HTMLCanvasElement;
  const engine = new CendresEngine(canvas, {
    onPhaseChange() {},
    onSaveChange() {},
    onHudUpdate(hud) {
      state.hudUpdates++;
      digest?.update(JSON.stringify(hud));
    },
    onBlessingChoices() {},
    onMerchantOpen() {},
    onRunSummary() {},
  }, () => {
    state.gameplayDraws++;
    return rng();
  });
  const input: InputState = {
    moveX: 0, jump: false, jumpHeld: false, jumpReleased: false, dash: false, attack: false,
    heavy: false, parry: false, parryHeld: false, skill: false, heal: false, interact: false,
    pause: false, mute: false, down: false, upHeld: false,
  };

  engine.startNewRun();
  const run = engine['run']!;
  // Keep the expedition in progress while still exercising damage and stamina costs.
  run.hp = run.ghostHp = run.maxHp = 10000;
  run.blessings.push('orbital_wisp', 'cinder_burn');

  for (let depth = 1; depth <= DEPTHS; depth++) {
    assert.equal(run.depth, depth);
    const room = engine['room']!;
    const player = engine['player']!;
    const boss = room.enemies.find((enemy) => enemy.isBoss);
    for (let frame = 0; frame < FRAMES_PER_ROOM; frame++) {
      let target: Enemy | undefined;
      let distance = Infinity;
      for (const enemy of room.enemies) {
        if (enemy.hp <= 0) continue;
        const dx = Math.abs(enemy.x - player.x);
        if (dx < distance) {
          distance = dx;
          target = enemy;
        }
      }
      // Skip travel between encounters. Positions, HP and AI of enemies are generated normally.
      if (target && distance > 270) {
        engine['interpolation'].forget(player);
        player.x = Math.max(0, target.x - 160);
        player.y = target.y;
        player.vx = player.vy = 0;
      }
      const dx = target ? target.x + target.w / 2 - player.x - player.w / 2 : 0;
      input.moveX = Math.abs(dx) > 40 || dx * player.facing < 0 ? Math.sign(dx) : 0;
      input.attack = !!target && frame % 18 === 0;
      input.heavy = !!target && frame % 97 === 0;
      input.parry = !!target && frame % 79 === 0;
      input.parryHeld = input.parry;
      input.dash = !!target && frame % 149 === 0;
      input.skill = !!target && frame % 133 === 0;
      input.jump = !!target && target.y < player.y - 44 && frame % 33 === 0;
      input.jumpHeld = input.jump;

      const simTime = engine['simTime'];
      engine.advanceSimulation(SIMULATION_STEP, input);
      if (engine['simTime'] !== simTime) state.ticks++;
      if (target) state.combatFrames++;
      state.frames++;
    }
    assert.equal(engine['phase'], 'playing');
    if (boss?.phase === 2) state.bossesPhaseTwo++;
    if (boss && boss.hp <= 0) state.bossesKilled++;
    digest?.update(JSON.stringify({
      room, run, player, save: engine.getSave(), camera: engine['camera'],
      blood: engine['blood'], particles: engine['particles'], vfx: engine['vfx'],
      simTime: engine['simTime'], randomDraws: state.gameplayDraws, hudUpdates: state.hudUpdates,
    }));
    if (depth < DEPTHS) engine['loadRoom'](depth + 1);
  }
  state.kills = run.kills;
  state.damage = run.damageDealt;
  state.damageTaken = run.damageTaken;
  return state;
}

const session = new Session();
session.connect();
try {
  // Cosmetic random draws use Math.random. Seed them independently of gameplay.
  Math.random = createSeededRandom(20261121);
  playExpedition(SEEDS[0]);
  Math.random = createSeededRandom(20261121);

  await session.post('HeapProfiler.startSampling', {
    samplingInterval: SAMPLING_INTERVAL,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  const expeditions = SEEDS.map((seed) => playExpedition(seed));
  const { profile } = await session.post('HeapProfiler.stopSampling');

  // Hash a separate replay to keep serialization out of the allocation profile.
  Math.random = createSeededRandom(20261121);
  const digest = createHash('sha256');
  const replay = SEEDS.map((seed) => playExpedition(seed, digest));
  assert.deepEqual(replay, expeditions);

  const sites: { site: string; bytes: number }[] = [];
  const byFunction = new Map<string, number>();
  let engineBytes = 0;
  function collect(node: typeof profile.head, stack: string[]): void {
    const { functionName, url } = node.callFrame;
    const file = url.replace(`file://${process.cwd()}/`, '');
    const frame = file ? `${functionName || '(anonymous)'} (${file})` : functionName;
    const next = frame ? [...stack, frame] : stack;
    if (node.selfSize) {
      sites.push({ site: next.slice(-4).join(' > '), bytes: node.selfSize });
      const caller = file.startsWith('src/game/') ? frame : [...next].reverse().find((entry) => entry.includes('(src/game/'));
      if (caller) {
        engineBytes += node.selfSize;
        byFunction.set(caller, (byFunction.get(caller) ?? 0) + node.selfSize);
      }
    }
    for (const child of node.children) collect(child, next);
  }
  collect(profile.head, []);
  sites.sort((a, b) => b.bytes - a.bytes);
  console.log(JSON.stringify({
    node: process.version,
    samplingInterval: SAMPLING_INTERVAL,
    framesPerRoom: FRAMES_PER_ROOM,
    depths: DEPTHS,
    expeditions,
    digest: digest.digest('hex'),
    sampledBytes: sites.reduce((total, site) => total + site.bytes, 0),
    engineBytes,
    functions: [...byFunction].sort((a, b) => b[1] - a[1]),
    sites: sites.slice(0, 20),
  }, null, 2));
} finally {
  session.disconnect();
}
