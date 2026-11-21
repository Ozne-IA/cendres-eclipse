import { AudioFX } from './audio';
import type { ParticlePool } from './particles';
import { applyEnemyDamage } from './rules';
import type { Enemy, Player, Projectile, RoomData, RunState } from './types';
import type { VfxSystem } from './vfx';

export interface EnemyEffects {
  readonly room: RoomData | null;
  readonly player: Player | null;
  readonly simTime: number;
  particles: ParticlePool;
  vfx: VfxSystem;
  acquireProjectile: (active: Projectile[]) => Projectile;
  snapPosition: (enemy: Enemy) => void;
  hurtPlayer: (damage: number, sourceX: number) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  stopFor: (seconds: number) => void;
  shake: (trauma: number) => void;
  showBanner: (title: string, sub: string, color: string, duration: number) => void;
}

export function updateEnemies(room: RoomData, player: Player, run: RunState, dt: number, effects: EnemyEffects): void {
  // Update Enemies (with attack token pool of max 3 concurrent windups)
  let activeAttackers = 0;
  for (const e of room.enemies) {
    if (e.state === 'windup' || e.state === 'attack') activeAttackers++;
  }

  for (const e of room.enemies) {
    if (e.state === 'dead') {
      e.deadT -= dt;
      if (run.isTraining && e.deadT <= 0) {
        e.state = 'idle';
        e.hp = e.maxHp;
        e.stagger = 0;
        e.burnT = 0;
        e.chillT = 0;
        e.sunderT = 0;
        effects.vfx.spawnAshDissolve(e.x + e.w / 2, e.y + e.h * 0.5, 10, '#ffd470', e.w, e.h);
      }
      continue;
    }
    if (e.hp <= 0) continue;

    e.hitFlashT = Math.max(0, e.hitFlashT - dt);
    e.sunderT = Math.max(0, e.sunderT - dt);
    e.chillT = Math.max(0, e.chillT - dt);

    if (e.elite === 'blazing' && Math.random() < dt * 7) {
      effects.vfx.spawnAshDissolve(e.x + e.w / 2, e.y + e.h * 0.45, 1, '#ff7b29', e.w * 0.6, e.h * 0.5);
    }

    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnTickT -= dt;
      if (e.burnTickT <= 0) {
        e.burnTickT = 0.75;
        applyEnemyDamage(run, e, 10);
        effects.particles.spawnBurst(e.x + e.w / 2, e.y + 18, '#e06b2b', 4, 90);
        effects.particles.addText(e.x + e.w / 2, e.y - 8, '-10 🔥', '#e06b2b', 0.85);
        if (e.hp <= 0) {
          effects.onEnemyKilled(e);
          continue;
        }
      }
    }

    // Boss Phase 2 transition at 50% HP
    if (e.isBoss && e.phase === 1 && e.hp <= e.maxHp * 0.5) {
      e.phase = 2;
      e.state = 'idle';
      e.cd = 0.6;
      effects.stopFor(0.07);
      effects.shake(0.7);
      AudioFX.boss(e.kind, true);
      effects.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#ff4d63', 180, 0.45);
      effects.vfx.triggerScreenFlash('#ff4d63', 0.3);
      effects.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h * 0.5, 112, '#ff4d63', 'crimson', 0.38);
      effects.vfx.spawnGroundFissure(e.x + e.w / 2, e.y + e.h, 130, '#ff4d63', 1.8);
      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) / 2 + 0.35;
        effects.vfx.spawnLightning(
          e.x + e.w / 2,
          e.y + e.h * 0.45,
          e.x + e.w / 2 + Math.cos(ang) * 110,
          e.y + e.h * 0.45 + Math.sin(ang) * 90,
          '#ff7b7b',
          2.8,
          0.22
        );
      }
      effects.showBanner(e.name, 'Phase II — Fureur de l’Éclipse', '#ff4d63', 2.0);
    }

    const chillMult = e.chillT > 0 ? 0.75 : 1;
    const swiftMult = e.elite === 'swift' ? 1.25 : 1;
    const simEnemyDt = dt * chillMult * swiftMult;

    const dx = player.x + player.w / 2 - (e.x + e.w / 2);
    const dy = player.y + player.h / 2 - (e.y + e.h / 2);
    const dist = Math.hypot(dx, dy);

    // Slow posture decay when enemy is idle
    if (e.state === 'idle' && e.stagger > 0) {
      e.stagger = Math.max(0, e.stagger - dt * 6);
    }

    if (e.state === 'staggered') {
      e.stateT -= dt;
      e.vx *= 0.84;
      if (e.stateT <= 0) e.state = 'idle';
    } else if (e.state === 'windup') {
      e.stateT -= simEnemyDt;
      e.vx *= 0.84;
      if (e.stateT <= 0) {
        executeEnemyAttack(effects, e, dx, dy, dist);
      }
    } else if (e.state === 'attack') {
      e.stateT -= simEnemyDt;
      if (
        player.x < e.x + e.w + 10 &&
        player.x + player.w > e.x - 10 &&
        player.y < e.y + e.h &&
        player.y + player.h > e.y
      ) {
        effects.hurtPlayer(e.dmg, e.x + e.w / 2);
      }
      if (e.stateT <= 0) {
        e.state = 'recover';
        e.stateT = e.isBoss ? (e.phase === 2 ? 0.35 : 0.5) : 0.45;
        e.cd = e.isBoss ? (e.phase === 2 ? 0.55 : 0.8) : 1.05;
      }
    } else if (e.state === 'recover') {
      e.stateT -= simEnemyDt;
      e.vx *= 0.85;
      if (e.stateT <= 0) e.state = 'idle';
    } else {
      e.cd = Math.max(0, e.cd - simEnemyDt);
      const aggroRange = e.isBoss ? 950 : 460;
      if (dist < aggroRange) {
        e.facing = dx >= 0 ? 1 : -1;
        const desiredRange =
          e.kind === 'watcher'
            ? 270
            : e.kind === 'arbalest'
            ? 360
            : e.kind === 'pyromancer'
            ? 310
            : e.isBoss
            ? 155
            : 78;

        if (dist > desiredRange) {
          const baseSpd = e.isBoss
            ? e.phase === 2
              ? 195
              : 165
            : e.kind === 'flagellant'
            ? 105
            : e.kind === 'specter'
            ? 175
            : 140;
          e.vx += (e.facing * baseSpd * swiftMult * chillMult - e.vx) * Math.min(1, dt * 6);
        } else {
          e.vx *= 0.86;
          if (e.cd <= 0 && (e.isBoss || activeAttackers < 3)) {
            activeAttackers++;
            e.state = 'windup';
            e.stateT =
              e.kind === 'flagellant'
                ? 0.6
                : e.kind === 'arbalest'
                ? 0.65
                : e.isBoss
                ? e.phase === 2
                  ? 0.42
                  : 0.5
                : 0.44;
            if (e.kind === 'specter') {
              effects.particles.spawnBurst(e.x + e.w / 2, e.y + e.h / 2, '#796794', 10, 140);
            }
          }
        }
      } else {
        e.vx *= 0.9;
      }
    }

    e.x = Math.max(20, Math.min(room.width - e.w - 20, e.x + e.vx * dt));
    if (!e.flying) {
      e.vy += 1400 * dt;
      e.y += e.vy * dt;
      for (const p of room.platforms) {
        if (
          p.type === 'solid' &&
          e.x + e.w > p.x &&
          e.x < p.x + p.w &&
          e.vy >= 0 &&
          e.y + e.h >= p.y &&
          e.y + e.h <= p.y + 34
        ) {
          e.y = p.y - e.h;
          e.vy = 0;
        }
      }
    } else {
      // Ennemi volant : oscillation organique & flottement vertical adaptatif
      const hoverTargetY = Math.max(room.groundY - 140, Math.min(room.groundY - 50, player.y - 28));
      const hoverOffset = Math.sin(effects.simTime * 2.8 + e.id) * 16;
      const targetY = hoverTargetY + hoverOffset;
      e.y += (targetY - e.y) * Math.min(1, dt * 2.5);
    }
  }

  // Remove finished dead enemies
  for (let i = room.enemies.length - 1; i >= 0; i--) {
    if (room.enemies[i].state === 'dead' && room.enemies[i].deadT <= 0) {
      room.enemies.splice(i, 1);
    }
  }
}

function executeEnemyAttack(effects: EnemyEffects, e: Enemy, dx: number, dy: number, dist: number): void {
  if (!effects.room || !effects.player) return;
  e.state = 'attack';
  e.stateT = 0.24;
  e.attackPattern = (e.attackPattern + 1) % 3;

  if (e.kind === 'specter') {
    // Teleport behind player before slash
    const targetX = Math.max(
      30,
      Math.min(effects.room.width - e.w - 30, effects.player.x - effects.player.facing * 54)
    );
    e.x = targetX;
    effects.snapPosition(e);
    e.facing = effects.player.x >= e.x ? 1 : -1;
    e.vx = e.facing * 240;
    return;
  }

  if (e.kind === 'pyromancer') {
    const shot = effects.acquireProjectile(effects.room.projectiles);
    shot.x = effects.player.x + effects.player.w / 2;
    shot.y = effects.room.groundY;
    shot.vx = 0;
    shot.vy = 0;
    shot.r = 28;
    shot.dmg = e.dmg;
    shot.friendly = false;
    shot.color = '#e06b2b';
    shot.kind = 'eruption';
    shot.telegraphT = 0.65;
    shot.life = 1.05;
    return;
  }

  if (e.kind === 'watcher' || e.kind === 'arbalest') {
    const ang = Math.atan2(dy, dx);
    const speed = e.kind === 'arbalest' ? 520 : 340;
    const shot = effects.acquireProjectile(effects.room.projectiles);
    shot.x = e.x + e.w / 2;
    shot.y = e.y + e.h * 0.45;
    shot.vx = Math.cos(ang) * speed;
    shot.vy = Math.sin(ang) * speed;
    shot.r = e.kind === 'arbalest' ? 6 : 8;
    shot.dmg = e.dmg;
    shot.friendly = false;
    shot.color = e.kind === 'arbalest' ? '#ff4d63' : '#e06b2b';
    shot.kind = e.kind === 'arbalest' ? 'bolt' : 'orb';
    shot.life = 2.2;
    return;
  }

  if (e.isBoss) {
    if (e.attackPattern === 1 || dist > 230) {
      // Multi-orb / Crescent barrage
      const ang = Math.atan2(dy, dx);
      const count = e.phase === 2 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const a = ang + (i - (count - 1) / 2) * 0.2;
        const shot = effects.acquireProjectile(effects.room.projectiles);
        shot.x = e.x + e.w / 2;
        shot.y = e.y + e.h * 0.45;
        shot.vx = Math.cos(a) * (e.phase === 2 ? 400 : 340);
        shot.vy = Math.sin(a) * (e.phase === 2 ? 400 : 340);
        shot.r = 10;
        shot.dmg = e.dmg;
        shot.friendly = false;
        shot.color = e.kind === 'mother' ? '#ff4d63' : '#ffd470';
        shot.kind = e.kind === 'sovereign' ? 'crescent' : 'orb';
        shot.life = 2.6;
      }
    } else if (e.phase === 2 && e.attackPattern === 2) {
      // Ground Eruption Pillar
      const shot = effects.acquireProjectile(effects.room.projectiles);
      shot.x = effects.player.x + effects.player.w / 2;
      shot.y = effects.room.groundY;
      shot.vx = 0;
      shot.vy = 0;
      shot.r = 36;
      shot.dmg = e.dmg;
      shot.friendly = false;
      shot.color = '#ff4d63';
      shot.kind = 'eruption';
      shot.telegraphT = 0.55;
      shot.life = 0.95;
    }
    e.vx = e.facing * (e.phase === 2 ? 480 : 410);
    return;
  }

  e.vx = e.facing * (e.kind === 'flagellant' ? 280 : 310);
}
