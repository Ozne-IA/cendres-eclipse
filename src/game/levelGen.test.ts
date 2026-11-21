import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRoom } from './levelGen';
import { createPlayer, PlayerMovement } from './movement';
import { ParticlePool } from './particles';
import { createSeededRandom } from './random';
import { createRunState, defaultSave } from './rules';
import type { InputState, RoomData, RoomProp, SaveData } from './types';
import { VfxSystem } from './vfx';

function assertInsideRoom(
  room: RoomData,
  box: { x: number; y: number; w: number; h: number },
  message: string
): void {
  assert.ok(
    box.w > 0 && box.h > 0 && box.x >= 0 && box.y >= 0 &&
      box.x + box.w <= room.width && box.y + box.h <= room.height,
    message
  );
}

function assertRoomGeometry(room: RoomData, context: string): RoomProp {
  const { width, height, depth, groundY, platforms, hazards, enemies, props } = room;
  assert.equal(width, room.isBoss ? 1560 : 2250 + Math.min(850, depth * 90), context);
  assert.equal(height, 920, context);
  const floors = platforms.filter((p) => p.type === 'solid');
  for (const platform of platforms) {
    assertInsideRoom(room, platform, `${context}: platform`);
    if (platform.type === 'moving') {
      const rangeX = platform.moveRangeX ?? 0;
      const rangeY = platform.moveRangeY ?? 0;
      assertInsideRoom(room, {
        x: platform.x - rangeX,
        y: platform.y - rangeY,
        w: platform.w + rangeX * 2,
        h: platform.h + rangeY * 2,
      }, `${context}: moving platform envelope`);
    }
  }
  for (const hazard of hazards) {
    assertInsideRoom(room, hazard, `${context}: ${hazard.kind}`);
    if (hazard.kind === 'spikes') {
      const left = floors.find((p) => p.x + p.w === hazard.x);
      const right = floors.find((p) => p.x === hazard.x + hazard.w);
      assert.ok(left && right, `${context}: spikes between banks`);
      if (hazard.w > 120 || Math.abs(left.y - right.y) > 80) {
        assert.ok(platforms.some((p) =>
          p.type === 'crumble' && p.x > hazard.x && p.x + p.w < hazard.x + hazard.w &&
          Math.max(Math.abs(left.y - p.y), Math.abs(right.y - p.y)) <= 90
        ), `${context}: missing foothold`);
      }
    }
  }
  for (const torch of room.torches) {
    assert.ok(torch.x >= 0 && torch.x < width && torch.y >= 0 && torch.y < height, `${context}: torch`);
  }
  for (const enemy of enemies) {
    assertInsideRoom(room, enemy, `${context}: ${enemy.kind}`);
    assert.ok(enemy.x > 430, `${context}: ${enemy.kind} near spawn`);
    assert.ok(platforms.some((p) =>
      p.x <= enemy.x && enemy.x + enemy.w <= p.x + p.w &&
      p.y === enemy.y + enemy.h + (enemy.flying ? 34 : 0)
    ), `${context}: unsupported ${enemy.kind}`);
  }
  for (const prop of props) {
    assertInsideRoom(room, prop, `${context}: ${prop.type}`);
    assert.ok(platforms.some((p) =>
      p.x <= prop.x && prop.x + prop.w <= p.x + p.w && p.y === prop.y + prop.h
    ), `${context}: unsupported ${prop.type}`);
  }

  const entrance = floors[0];
  assert.equal(entrance.x, 0, context);
  assert.equal(entrance.y, groundY, context);
  assert.ok(entrance.w >= 410, context);
  assert.deepEqual(props.filter((p) => p.type === 'exit').map((p) => p.locked), [room.isBoss], context);
  const exit = props.find((p) => p.type === 'exit')!;
  const landing = floors.at(-1)!;
  assert.equal(landing.y, groundY, context);
  assert.equal(landing.x + landing.w, width, context);
  assert.ok(exit.x >= landing.x, context);
  assert.equal(enemies.filter((e) => e.isBoss).length, Number(room.isBoss), context);

  if (!room.isBoss) {
    assert.ok(landing.w >= 400, `${context}: approach`);
    const events = props.filter((p) => p.type === 'brazier' || p.type === 'shrine' || p.type === 'merchant');
    assert.equal(events.length, 1, context);
    const [event] = events;
    const rescue = props.find((p) => p.type === 'npc');
    assert.ok(event.x >= landing.x && event.x + event.w < (rescue?.x ?? exit.x), context);
    assert.ok(!rescue || rescue.x + rescue.w < exit.x, context);
    assert.ok(enemies.every((e) => e.x + e.w < landing.x), `${context}: enemy on exit approach`);
  }
  return exit;
}

const movement = new PlayerMovement(new ParticlePool(), new VfxSystem());
const moveRight: InputState = {
  moveX: 1, jump: false, jumpHeld: true, jumpReleased: false, dash: false,
  attack: false, heavy: false, parry: false, parryHeld: false, skill: false,
  heal: false, interact: false, pause: false, mute: false, down: true, upHeld: false,
};

// Replay the terrain route through the production movement code. Down skips optional
// overhead platforms. This checks traversal and spikes, independently of combat and boss locks.
function assertExitReachable(room: RoomData, exit: RoomProp, save: SaveData, context: string): void {
  const run = createRunState(save);
  const player = createPlayer(110, room.groundY - 48, run, save);
  const floors = room.platforms.filter((p) => p.type === 'solid');
  const spikes = room.hazards.filter((hazard) => hazard.kind === 'spikes');
  const dt = 1 / 60;
  let floorIndex = 0;
  let jumpFromFloor = -1;
  for (let frame = 1; frame <= 900; frame++) {
    const floor = floors[floorIndex];
    const next = floors[floorIndex + 1];
    const edge = floor.x + floor.w;
    const needsJump = next && (next.x > edge || next.y < floor.y);
    player.coyote = Math.max(0, player.coyote - dt);
    player.jumpBuf = Math.max(0, player.jumpBuf - dt);
    const nearEdge = player.x + player.w >= edge - 64;
    if (needsJump && nearEdge && player.vy < -150) jumpFromFloor = floorIndex;
    const stillLanding = !player.onGround && jumpFromFloor !== floorIndex;
    if (needsJump && nearEdge && !stillLanding) {
      if (player.coyote > 0) {
        player.jumpBuf = 0.14;
        jumpFromFloor = floorIndex;
      } else if (next.y < floor.y && player.jumpsLeft > 0 && player.vy >= -25) {
        player.jumpBuf = 0.14;
      }
    }
    const input = needsJump && nearEdge && stillLanding ? { ...moveRight, moveX: 0 } : moveRight;
    movement.update(player, room, run, save, input, frame * dt, dt);
    if (next && player.x + player.w / 2 >= next.x) floorIndex++;
    const feet = player.y + player.h;
    assert.ok(!spikes.some((h) =>
      player.x + player.w > h.x && player.x < h.x + h.w && feet > h.y
    ), `${context}: fell into spikes at x=${player.x}`);
    if (Math.abs(player.x + player.w / 2 - (exit.x + exit.w / 2)) < 58 &&
      Math.abs(feet - room.groundY) < 70) return;
  }
  assert.fail(`${context}: exit unreachable at x=${player.x}, y=${player.y}`);
}

test('the seed 4 regression keeps the last platform and encounter inside Strate 1', () => {
  const save = defaultSave();
  const room = generateRoom(1, save, createSeededRandom(4));
  const exit = assertRoomGeometry(room, 'depth 1, seed 4');
  assertExitReachable(room, exit, save, 'depth 1, seed 4');
});

test('the injected random source reproduces a room and varies its layout across seeds', () => {
  const save = defaultSave();
  const generate = (seed: number) => generateRoom(5, save, createSeededRandom(seed));
  assert.deepEqual(generate(4), generate(4));
  assert.notDeepEqual(generate(4).platforms, generate(5).platforms);
});

test('seeded rooms have valid bounds and a route to the exit with basic movement', () => {
  const save = defaultSave();
  for (const depth of [1, 2, 3, 5, 6, 9, 10, 24, 25]) {
    for (let seed = 0; seed < 2048; seed++) {
      const context = `depth ${depth}, seed ${seed}`;
      const room = generateRoom(depth, save, createSeededRandom(seed));
      const exit = assertRoomGeometry(room, context);
      assertExitReachable(room, exit, save, context);
    }
  }
});
