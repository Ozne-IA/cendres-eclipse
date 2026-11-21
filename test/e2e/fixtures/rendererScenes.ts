import { generateRoom } from '../../../src/game/levelGen';
import { createPlayer } from '../../../src/game/movement';
import { ParticlePool } from '../../../src/game/particles';
import { createSeededRandom } from '../../../src/game/random';
import { renderGameFrame } from '../../../src/game/renderer';
import { updatePlatforms } from '../../../src/game/room';
import { createRunState, defaultSave } from '../../../src/game/rules';
import { getBiomeBackdrop, getTitleHeroArtwork } from '../../../src/game/textures';

export type RendererScene = 'title' | 'room' | 'telegraph' | 'guardian';

declare global {
  interface Window {
    drawRendererScene: (scene: RendererScene) => boolean;
  }
}

window.drawRendererScene = (scene) => {
  const isTitle = scene === 'title';
  const isGuardian = scene === 'guardian';
  const depth = isGuardian ? 3 : 1;
  const time = 2.5;
  const save = defaultSave();
  const rng = createSeededRandom(5);
  const room = isTitle ? null : generateRoom(depth, save, rng);
  const art = room ? getBiomeBackdrop(room.biome.id) : getTitleHeroArtwork();
  if (!art || (room && !art.src.endsWith('_v2.jpg'))) return false;

  const run = room ? createRunState(save, rng) : null;
  const player = room && run
    ? createPlayer(isGuardian ? 1020 : scene === 'telegraph' ? 535 : 110, room.groundY - 48, run, save)
    : null;
  if (player) player.onGround = true;
  if (room) updatePlatforms(room.platforms, time, 1 / 60);

  if (scene === 'telegraph') {
    const enemy = room?.enemies[0];
    if (!enemy || enemy.kind !== 'flagellant') throw new Error('Missing the seed 5 flagellant');
    enemy.state = 'windup';
    enemy.facing = -1;
  }
  if (isGuardian && !room?.enemies.some((enemy) => enemy.isBoss)) {
    throw new Error('Missing the first Guardian');
  }

  const canvas = document.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  renderGameFrame(ctx, {
    phase: isTitle ? 'title' : 'playing',
    time,
    width: canvas.width,
    height: canvas.height,
    cameraX: isGuardian ? 600 : 0,
    cameraY: 260,
    trauma: 0,
    room,
    player,
    run,
    weapon: save.weapon,
    particles: new ParticlePool(),
    settings: save.settings,
  });
  return true;
};
