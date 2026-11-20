import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomCamera } from './camera';
import { generateTrainingRoom } from './levelGen';
import { createPlayer, PlayerMovement } from './movement';
import { ParticlePool } from './particles';
import { createRunState, defaultSave } from './rules';
import { VfxSystem } from './vfx';

test('a grounded player is carried by the moving platform displacement for the current frame', () => {
  const save = defaultSave();
  const run = createRunState(save);
  const room = generateTrainingRoom();
  room.platforms = [{ x: 100, y: 200, w: 120, h: 20, type: 'moving',
    baseX: 100, baseY: 200, moveSpeed: 1, moveRangeX: 10 }];
  const player = createPlayer(120, 152, run, save);
  player.onGround = true;
  const movement = new PlayerMovement(new ParticlePool(), new VfxSystem());
  movement.update(player, room, run, save, {
    moveX: 0, jump: false, jumpHeld: false, jumpReleased: false, dash: false,
    attack: false, heavy: false, parry: false, parryHeld: false, skill: false,
    heal: false, interact: false, pause: false, mute: false, down: false, upHeld: false,
  }, Math.PI / 2, 1 / 60);
  assert.equal(room.platforms[0].x, 110);
  assert.equal(player.x, 130);
  assert.equal(player.y, 152);
  assert.equal(player.onGround, true);
});

test('camera smooths toward room bounds and resets between rooms', () => {
  const camera = new RoomCamera();
  const player = { x: 5000, y: 5000, w: 28, h: 48 };
  camera.follow(player, { width: 1200, height: 800 }, 1000, 600, 1 / 16);
  assert.deepEqual([camera.x, camera.y], [100, 100]);
  camera.reset();
  camera.follow(player, { width: 500, height: 400 }, 1000, 600, 1);
  assert.deepEqual([camera.x, camera.y], [0, 0]);
});
