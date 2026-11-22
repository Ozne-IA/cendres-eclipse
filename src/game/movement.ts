import { AudioFX } from './audio';
import { WEAPONS_DEF } from './data';
import type { ParticlePool } from './particles';
import { updatePlatforms } from './room';
import type { InputState, Player, RoomData, RunState, SaveData } from './types';
import type { VfxSystem } from './vfx';

export function createPlayer(x: number, y: number, run: RunState, save: SaveData): Player {
  return {
    x,
    y,
    w: 28,
    h: 48,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    onWall: 0,
    coyote: 0,
    jumpBuf: 0,
    attackBuf: false,
    dashBuf: false,
    jumpsLeft: run.blessings.includes('wind_dancer') ? 3 : 2,
    dashesLeft: 1 + (save.talents.mist_reflex || 0),
    dashT: 0,
    dashCd: 0,
    invulnT: 0,
    hitFlashT: 0,
    attackT: 0,
    attackTotalT: 0.22,
    attackMove: 'light1',
    comboStep: 0,
    comboResetT: 0,
    attackHitIds: new Set<number>(),
    parryT: 0,
    guardT: 0,
    parryCd: 0,
    stamRegenDelay: 0,
    healT: 0,
    squashX: 1,
    squashY: 1,
    walkCycle: 0,
    capeWave: 0,
    afterimages: [],
    wispAngle: 0,
    wispCd: 0,
    riposteBuffT: 0,
    skillCd: 0,
    skillMaxCd: (WEAPONS_DEF[save.weapon] || WEAPONS_DEF.clay_blade).artCooldown,
  };
}

export class PlayerMovement {
  private footstepTimer = 0;

  constructor(private particles: ParticlePool, private vfx: VfxSystem) {}

  update(
    player: Player,
    room: RoomData,
    run: RunState,
    save: SaveData,
    inp: InputState,
    simTime: number,
    dt: number
  ): boolean {
    let jumped = false;

    // Movement & Gravity
    let moveSpeed = 315;
    if (save.oath === 'pelerin') moveSpeed *= 1.15;
    if (run.relics.includes('raven_feather')) moveSpeed *= 1.18;
    if (room.affix?.id === 'tempered_ash') moveSpeed *= 1.12;

    if (player.dashT > 0) {
      player.dashT -= dt;
      if (Math.floor(player.dashT * 60) % 2 === 0) {
        player.afterimages.push({ x: player.x, y: player.y, alpha: 1, facing: player.facing });
      }
    } else {
      if (inp.moveX !== 0) {
        player.facing = inp.moveX > 0 ? 1 : -1;
        player.vx += (inp.moveX * moveSpeed - player.vx) * Math.min(1, dt * 16);
      } else {
        player.vx *= Math.pow(0.001, dt);
      }

      // Jump, Coyote, Double Jump & Wall Jump
      const jumpMult = run.relics.includes('raven_feather') ? 1.1 : 1;
      if (player.jumpBuf > 0) {
        if (player.coyote > 0) {
          player.vy = -565 * jumpMult;
          player.onGround = false;
          player.coyote = 0;
          player.jumpBuf = 0;
          jumped = true;
          player.jumpsLeft = (run.blessings.includes('wind_dancer') ? 3 : 2) - 1;
          player.squashX = 0.82;
          player.squashY = 1.2;
          AudioFX.jump();
        } else if (player.onWall !== 0) {
          player.vy = -545 * jumpMult;
          player.vx = -player.onWall * 375;
          player.facing = (-player.onWall) as 1 | -1;
          player.jumpBuf = 0;
          jumped = true;
          player.squashX = 0.84;
          player.squashY = 1.18;
          if (run.blessings.includes('wall_tempest')) run.critNextAttack = true;
          AudioFX.wallJump();
          this.particles.spawnBurst(player.x + player.w / 2, player.y + 24, '#b8aba0', 6, 100);
          this.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 28, '#ffd470', 'amber', 0.14);
        } else if (player.jumpsLeft > 0) {
          player.vy = -515 * jumpMult;
          player.jumpsLeft -= 1;
          player.jumpBuf = 0;
          jumped = true;
          player.squashX = 0.86;
          player.squashY = 1.16;
          AudioFX.jump();
          this.particles.spawnBurst(player.x + player.w / 2, player.y + player.h, '#a89d92', 7, 110);
        }
      }

      // Variable jump height cut
      if (inp.jumpReleased && player.vy < -180) {
        player.vy *= 0.45;
      }

      // Wall slide cap
      const maxFall = player.onWall !== 0 && player.vy > 0 && inp.moveX === player.onWall ? 160 : 940;
      player.vy = Math.min(maxFall, player.vy + 1480 * dt);
    }

    updatePlatforms(room.platforms, simTime, dt);

    // Horizontal collision & Wall detection (outer bounds + raised solid stone steps)
    let nextX = Math.max(0, Math.min(room.width - player.w, player.x + player.vx * dt));
    player.onWall = 0;
    if (nextX === 0 && !player.onGround) player.onWall = -1;
    if (nextX === room.width - player.w && !player.onGround) player.onWall = 1;
    for (let i = 0; i < room.platforms.length; i++) {
      const p = room.platforms[i];
      if (p.broken || p.type !== 'solid') continue;
      if (player.y + player.h <= p.y + 6 || player.y >= p.y + p.h - 4) continue;
      if (player.x + player.w <= p.x + 8 && nextX + player.w > p.x) {
        nextX = p.x - player.w;
        player.vx = 0;
        if (!player.onGround) player.onWall = 1;
      } else if (player.x >= p.x + p.w - 8 && nextX < p.x + p.w) {
        nextX = p.x + p.w;
        player.vx = 0;
        if (!player.onGround) player.onWall = -1;
      }
    }
    player.x = nextX;

    // Vertical collision with platforms
    const prevBot = player.y + player.h;
    const wasOnGround = player.onGround;
    player.y += player.vy * dt;
    player.onGround = false;

    for (let i = 0; i < room.platforms.length; i++) {
      const p = room.platforms[i];
      if (p.broken) continue;
      if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
        p.crumbleT -= dt;
        if (p.crumbleT <= 0) {
          p.broken = true;
          p.respawnT = 2.6;
          this.particles.spawnBurst(p.x + p.w / 2, p.y + 8, '#8c5338', 10, 140);
          continue;
        }
      }

      const overlapX = player.x + player.w > p.x && player.x < p.x + p.w;
      if (!overlapX) continue;

      if (p.type === 'bounce') {
        if (player.vy >= 0 && prevBot <= p.y + 18 && player.y + player.h >= p.y) {
          player.y = p.y - player.h;
          player.vy = -780;
          player.jumpsLeft = run.blessings.includes('wind_dancer') ? 2 : 1;
          player.squashX = 0.78;
          player.squashY = 1.28;
          AudioFX.jump();
          this.particles.spawnBurst(p.x + p.w / 2, p.y, '#e06b2b', 12, 200);
        }
        continue;
      }

      if (p.type === 'solid' || !inp.down) {
        if (player.vy >= 0 && prevBot <= p.y + 14 && player.y + player.h >= p.y) {
          if (!wasOnGround && player.vy > 220) {
            const heavyFall = player.vy > 480;
            player.squashX = 1.22;
            player.squashY = 0.78;
            AudioFX.land();
            this.particles.spawnBurst(player.x + player.w / 2, p.y, '#9c9286', heavyFall ? 8 : 4, 95);
            if (heavyFall) {
              this.vfx.spawnGroundFissure(player.x + player.w / 2, p.y + 2, 48, '#ff7b29', 0.85);
            }
          }
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.coyote = 0.11;
          player.jumpsLeft = run.blessings.includes('wind_dancer') ? 3 : 2;
          player.dashesLeft = 1 + (save.talents.mist_reflex || 0);
          if (p.type === 'moving' && p.vx) {
            player.x = Math.max(0, Math.min(room.width - player.w, player.x + p.vx * dt));
          }
          if (p.type === 'crumble' && (!p.crumbleT || p.crumbleT === 0)) {
            p.crumbleT = 0.65;
          }
        }
      }
    }

    if (player.onGround && Math.abs(player.vx) > 40) {
      player.walkCycle += Math.abs(player.vx) * dt * 0.04;
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.27;
        const surf = room.isBoss ? 'stone' : room.platforms.some((p) => p.type === 'crumble' && Math.abs(player.y + player.h - p.y) < 6 && player.x > p.x && player.x < p.x + p.w) ? 'wood' : 'ash';
        AudioFX.footstep(surf);
        // Subtle dynamic ash dust puffs under running sabatons
        const footX = player.x + (player.facing === 1 ? 4 : player.w - 4);
        this.particles.spawnBurst(footX, player.y + player.h, '#736b63', 2, 45);
      }
    } else {
      this.footstepTimer = 0.05;
    }
    return jumped;
  }
}
