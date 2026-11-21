import { AudioFX } from './audio';
import type { ParticlePool } from './particles';
import { applyEnemyDamage } from './rules';
import type { Enemy, Player, Projectile, RoomData, RunState } from './types';
import type { VfxSystem } from './vfx';

export interface ProjectileEffects {
  particles: ParticlePool;
  vfx: VfxSystem;
  hurtPlayer: (damage: number, sourceX: number) => void;
  registerComboHit: (hits: number) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  stopFor: (seconds: number) => void;
}

// Limit retained idle storage while allowing every attack in a burst to spawn.
export const PROJECTILE_RESERVE = 64;

export class ProjectilePool {
  private idle: Projectile[] = [];

  acquire(active: Projectile[]): Projectile {
    const shot = this.idle.pop() ?? {
      x: 0, y: 0, vx: 0, vy: 0, r: 0, dmg: 0,
      friendly: false, color: '', kind: 'orb', life: 0,
    };
    shot.telegraphT = undefined;
    active.push(shot);
    return shot;
  }

  release(active: Projectile[], index: number): void {
    const shot = active[index];
    // Keep draw and collision order stable, without allocating a splice result.
    for (let i = index + 1; i < active.length; i++) active[i - 1] = active[i];
    active.pop();
    if (this.idle.length < PROJECTILE_RESERVE) this.idle.push(shot);
  }

  clear(active: Projectile[]): void {
    while (active.length) this.release(active, active.length - 1);
  }

  update(room: RoomData, player: Player, run: RunState, dt: number, effects: ProjectileEffects): void {
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
      const pr = room.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        this.release(room.projectiles, i);
        continue;
      }

      if (pr.kind === 'eruption') {
        if (pr.telegraphT && pr.telegraphT > 0) {
          pr.telegraphT -= dt;
        } else {
          if (
            player.x + player.w > pr.x - pr.r * 0.65 &&
            player.x < pr.x + pr.r * 0.65 &&
            player.y + player.h > pr.y - 110 &&
            player.y < pr.y + 10
          ) {
            effects.hurtPlayer(pr.dmg, pr.x);
          }
        }
        continue;
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.x < -40 || pr.x > room.width + 40 || pr.y < -40 || pr.y > room.height + 40) {
        this.release(room.projectiles, i);
        continue;
      }

      if (
        !pr.friendly &&
        pr.x + pr.r > player.x &&
        pr.x - pr.r < player.x + player.w &&
        pr.y + pr.r > player.y &&
        pr.y - pr.r < player.y + player.h
      ) {
        if (player.parryT > 0) {
          pr.friendly = true;
          pr.vx *= -1.5;
          pr.vy *= -1.5;
          pr.dmg = Math.round(pr.dmg * (run.relics.includes('ember_ring') ? 2.4 : 2.0));
          run.parries += 1;
          run.parryStreak += 1;
          run.bestParryStreak = Math.max(run.bestParryStreak, run.parryStreak);
          AudioFX.parry();
          effects.stopFor(0.05);
          effects.particles.spawnRing(pr.x, pr.y, '#ffd470', 60, 0.22);
          effects.particles.addText(player.x + 14, player.y - 14, 'RENVOI !', '#ffd470', 1.1);
        } else {
          effects.hurtPlayer(pr.dmg, pr.x);
          this.release(room.projectiles, i);
        }
      } else if (pr.friendly) {
        for (const e of room.enemies) {
          if (
            e.hp > 0 &&
            e.state !== 'dead' &&
            pr.x + pr.r > e.x &&
            pr.x - pr.r < e.x + e.w &&
            pr.y + pr.r > e.y &&
            pr.y - pr.r < e.y + e.h
          ) {
            applyEnemyDamage(run, e, pr.dmg);
            e.hitFlashT = 0.06;
            if (run.blessings.includes('cinder_burn')) e.burnT = Math.max(e.burnT, 3.0);
            if (run.blessings.includes('sunder_steel')) e.sunderT = Math.max(e.sunderT, 4.0);
            if (run.blessings.includes('lunar_frost')) e.chillT = Math.max(e.chillT, 3.0);
            effects.registerComboHit(1);
            AudioFX.hit(false);
            effects.particles.spawnBurst(pr.x, pr.y, '#ffd470', 8, 160);
            effects.vfx.spawnImpactFlare(pr.x, pr.y, 44, '#ffd470', 'gold', 0.16);
            effects.particles.addText(e.x + e.w / 2, e.y - 10, `-${pr.dmg}`, '#ffd470');
            if (e.hp <= 0) effects.onEnemyKilled(e);
            this.release(room.projectiles, i);
            break;
          }
        }
      }
    }
  }
}

export function updateOrbitalWisp(
  room: RoomData,
  player: Player,
  run: RunState,
  dt: number,
  acquireProjectile: (active: Projectile[]) => Projectile,
): void {
  if (run.blessings.includes('orbital_wisp')) {
    player.wispAngle += dt * 3.2;
    player.wispCd -= dt;
    if (player.wispCd <= 0) {
      const target = room.enemies.find(
        (e) =>
          e.hp > 0 &&
          e.state !== 'dead' &&
          Math.hypot(e.x - player.x, e.y - player.y) < 340
      );
      if (target) {
        player.wispCd = 1.15;
        const ang = Math.atan2(target.y + target.h / 2 - (player.y + 20), target.x + target.w / 2 - (player.x + 14));
        const shot = acquireProjectile(room.projectiles);
        shot.x = player.x + 14;
        shot.y = player.y + 20;
        shot.vx = Math.cos(ang) * 440;
        shot.vy = Math.sin(ang) * 440;
        shot.r = 5;
        shot.dmg = 18;
        shot.friendly = true;
        shot.color = '#ff9842';
        shot.kind = 'orb';
        shot.life = 1.5;
      }
    }
  }
}
