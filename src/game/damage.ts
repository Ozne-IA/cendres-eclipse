import { AudioFX } from './audio';
import { getBloodToneForEnemy, type BloodSystem } from './bloodDecals';
import { startAttack } from './combat';
import { WEAPONS_DEF } from './data';
import type { ParticlePool } from './particles';
import { applyEnemyDamage, getLootMultiplier, getPlayerDamageStats } from './rules';
import type { TrainingCombatAction, TrainingProjectileAction } from './trainingSession';
import type { Enemy, Player, Projectile, RoomData, RunState, SaveData, WeaponDef } from './types';
import type { VfxSystem } from './vfx';

export interface DamageEffects {
  readonly save: SaveData;
  readonly room: RoomData | null;
  readonly player: Player | null;
  readonly run: RunState | null;
  readonly deathDelayTimer: number;
  readonly trauma: number;
  particles: ParticlePool;
  blood: BloodSystem;
  vfx: VfxSystem;
  gameplayRandom: () => number;
  acquireProjectile: (active: Projectile[]) => Projectile;
  snapPosition: (player: Player) => void;
  onEnemyKilled: (enemy: Enemy) => void;
  registerComboHit: (hits: number) => void;
  rumble: (weak: number, strong: number, duration: number, enabled: boolean) => void;
  stopFor: (seconds: number) => void;
  slowFor: (seconds: number) => void;
  shake: (trauma: number) => void;
  delayDefeat: (seconds: number) => void;
  updateSave: (updater: (save: SaveData) => SaveData) => void;
  showBanner: (title: string, sub: string, color: string, duration: number) => void;
  pushHud: (force: boolean) => void;
  onTrainingAction?: (action: TrainingCombatAction) => void;
  onTrainingProjectile?: (action: TrainingProjectileAction, projectile: Projectile) => void;
}

export function resolveMeleeAttack(
  room: RoomData,
  player: Player,
  run: RunState,
  weapon: WeaponDef,
  dt: number,
  effects: DamageEffects,
): void {
  if (player.attackT > 0) {
    player.attackT -= dt;
    const isHeavy = player.attackMove === 'heavy' || player.attackMove === 'light3';
    const reach = weapon.reachPx + (isHeavy ? 14 : 0);
    const ax = player.facing === 1 ? player.x + player.w - 6 : player.x - reach + 6;
    const ay = player.attackMove === 'launcher' ? player.y - 24 : player.y - 4;
    const ah = player.attackMove === 'plunge' ? player.h + 26 : player.h + 12;

    // Smash destructible urns
    for (const pr of room.props) {
      if (pr.type === 'urn' && !pr.broken && ax < pr.x + pr.w && ax + reach > pr.x && ay < pr.y + pr.h && ay + ah > pr.y) {
        pr.broken = true;
        const c = Math.round((4 + effects.gameplayRandom() * 5) * getLootMultiplier(effects.save, run));
        run.loot.cendres += c;
        AudioFX.hit(false);
        effects.particles.spawnBurst(pr.x + pr.w / 2, pr.y + pr.h / 2, '#9c785c', 10, 170);
        effects.particles.addText(pr.x, pr.y - 10, `+${c}🔥`, '#d4a853', 0.9);
      }
    }

    // Hit Enemies
    for (const e of room.enemies) {
      if (e.hp <= 0 || e.state === 'dead' || player.attackHitIds.has(e.id)) continue;
      if (ax < e.x + e.w && ax + reach > e.x && ay < e.y + e.h && ay + ah > e.y) {
        player.attackHitIds.add(e.id);
        const isRiposte = e.state === 'staggered';
        const blockedByShield =
          e.shielded &&
          e.state !== 'staggered' &&
          player.attackMove !== 'heavy' &&
          player.facing !== e.facing;

        const stats = getPlayerDamageStats(
          effects.save,
          run,
          player.attackMove,
          isRiposte,
          e.sunderT > 0,
          effects.gameplayRandom,
          room.affix?.id
        );
        if (run.critNextAttack) run.critNextAttack = false;

        let finalDmg = stats.damage;
        const followsParry = player.riposteBuffT > 0;
        if (followsParry) {
          finalDmg = Math.round(finalDmg * 1.2);
          player.riposteBuffT = 0;
        }
        let finalStag = stats.stagger;
        const armoredPlating =
          e.elite === 'armored' &&
          !isRiposte &&
          e.sunderT <= 0 &&
          player.attackMove !== 'heavy' &&
          player.attackMove !== 'plunge';
        if (blockedByShield) {
          finalDmg = Math.max(2, Math.round(finalDmg * 0.28));
          finalStag = Math.round(finalStag * 0.45);
          AudioFX.guard();
          effects.particles.addText(e.x + e.w / 2, e.y - 14, `BLOQUÉ (${finalDmg})`, '#968b7c', 0.9);
        } else {
          if (armoredPlating) {
            finalDmg = Math.max(2, Math.round(finalDmg * 0.75));
            effects.particles.addText(e.x + e.w / 2, e.y - 26, 'BLINDÉ', '#8ab8e6', 0.8);
          }
          effects.registerComboHit(1);
          if (stats.isCrit) {
            AudioFX.crit();
            if (run.relics.includes('blood_medal')) {
              run.hp = Math.min(run.maxHp, run.hp + 4);
            }
          } else {
            AudioFX.hit(isHeavy || isRiposte);
          }
        }

        applyEnemyDamage(run, e, finalDmg);
        if (!blockedByShield) effects.onTrainingAction?.('meleeHit');
        e.stagger += finalStag;
        e.hitFlashT = 0.06;
        e.vx = player.facing * (isHeavy ? 230 : 120);
        if (player.attackMove === 'launcher' && !e.isBoss) {
          e.vy = -290;
        }

        // Status blessings
        if (run.blessings.includes('cinder_burn') && isHeavy) {
          e.burnT = 3.0;
        }
        if (run.blessings.includes('sunder_steel')) {
          e.sunderT = 4.0;
        }
        if (run.blessings.includes('lunar_frost')) {
          e.chillT = 3.0;
        }

        // Active Synergies on Melee Hit
        if (e.burnT > 0 && e.chillT > 0 && run.activeSynergies.includes('thermal_shock')) {
          finalDmg += 28;
          e.chillT = 0;
          effects.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h / 2, 74, '#ff9d42', 'gold', 0.24);
          effects.particles.addText(e.x + e.w / 2, e.y - 36, 'CHOC THERMIQUE +28!', '#ff9d42', 1.1);
        }
        if (stats.isCrit && run.activeSynergies.includes('blood_feast')) {
          run.hp = Math.min(run.maxHp, run.hp + 4);
        }

        // Riposte execution siphon
        if (isRiposte) {
          if (followsParry) effects.onTrainingAction?.('riposte');
          e.state = 'recover';
          e.stagger = 0;
          if (run.activeSynergies.includes('storm_anvil')) {
            finalDmg = Math.round(finalDmg * 1.35);
          }
          if (run.activeSynergies.includes('shatter_bells')) {
            for (const other of room.enemies) {
              if (other.id !== e.id && other.hp > 0 && Math.abs(other.x - e.x) < 180) {
                other.stagger += 45;
              }
            }
            effects.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#d4a853', 160, 0.3);
          }
          const siphon = (effects.save.talents.execution_siphon || 0) * 6;
          if (siphon > 0) {
            run.hp = Math.min(run.maxHp, run.hp + siphon);
            effects.particles.addText(player.x, player.y - 18, `+${siphon} PV`, '#5db87a', 0.95);
          }
        } else if (e.stagger >= e.maxStagger && e.state !== 'staggered') {
          e.stagger = 0;
          e.state = 'staggered';
          e.stateT = 2.1;
          effects.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#ffd470', 80, 0.28);
          effects.particles.addText(e.x + e.w / 2, e.y - 34, 'POSTURE BRISÉE !', '#ff9d42', 1.15);
        }

        if (effects.save.settings?.hitstopEnabled !== false) {
          effects.stopFor(isRiposte || player.attackMove === 'heavy' ? 0.06 : 0.025);
        }
        effects.shake(Math.min(1, effects.trauma + (isRiposte ? 0.55 : isHeavy ? 0.38 : 0.2)));
        if (isRiposte || isHeavy || stats.isCrit) {
          effects.rumble(0.28, isRiposte ? 0.72 : 0.45, 95, effects.save.settings?.gamepadRumble !== false);
        }
        effects.particles.spawnBurst(
          e.x + e.w / 2,
          e.y + e.h / 2,
          isRiposte || stats.isCrit ? '#ffd470' : '#d44242',
          isRiposte ? 18 : 11,
          240
        );
        effects.blood.spawnImpact(
          e.x + e.w / 2,
          e.y + e.h * 0.45,
          player.facing,
          blockedByShield ? 0.45 : isRiposte ? 1.75 : isHeavy || stats.isCrit ? 1.35 : 0.95,
          room.platforms,
          getBloodToneForEnemy(e.kind)
        );

        const hx = e.x + e.w / 2;
        const hy = e.y + e.h * 0.45;
        if (!blockedByShield) {
          const flareSize = isRiposte ? 76 : isHeavy || stats.isCrit ? 58 : 34;
          const flareCol = isRiposte || stats.isCrit ? '#ffd470' : '#ff8c3b';
          effects.vfx.spawnImpactFlare(
            hx,
            hy,
            flareSize,
            flareCol,
            isRiposte || stats.isCrit ? 'gold' : 'amber',
            isRiposte ? 0.26 : 0.18
          );
          if (isRiposte || stats.isCrit) {
            effects.vfx.spawnLightning(
              hx - 32,
              hy - 28,
              hx + 34,
              hy + 26,
              '#ffd470',
              2.5,
              0.16
            );
            effects.vfx.triggerScreenFlash('#ffd470', isRiposte ? 0.2 : 0.11);
          }
          if (player.attackMove === 'heavy' || player.attackMove === 'plunge') {
            effects.vfx.spawnGroundFissure(hx, e.y + e.h + 1, 76, '#ff7b29', 1.4);
          }
        }

        if (!blockedByShield && effects.save.settings?.showDamageNumbers !== false) {
          const label = isRiposte
            ? `RIPOSTE -${finalDmg}!`
            : stats.isCrit
            ? `CRIT -${finalDmg}!`
            : `-${finalDmg}`;
          effects.particles.addText(
            e.x + e.w / 2,
            e.y - 12,
            label,
            isRiposte || stats.isCrit ? '#ffd470' : '#f2d8b3',
            isRiposte || stats.isCrit ? 1.15 : 1
          );
        }

        if (e.hp <= 0) effects.onEnemyKilled(e);
      }
    }
  }
}

export function executeWeaponArt(effects: DamageEffects): void {
  if (!effects.player || !effects.run || !effects.room) return;
  const player = effects.player;
  const run = effects.run;
  const room = effects.room;
  const wDef = WEAPONS_DEF[effects.save.weapon] || WEAPONS_DEF.clay_blade;
  const cdMult = run.activeSynergies.includes('phantom_gale') ? 0.7 : 1;

  run.stam = Math.max(0, run.stam - wDef.artStamCost);
  player.stamRegenDelay = 0.65;
  player.skillMaxCd = wDef.artCooldown * cdMult;
  player.skillCd = player.skillMaxCd;
  AudioFX.skillArt(wDef.key);
  effects.rumble(0.45, 0.72, 140, effects.save.settings?.gamepadRumble !== false);

  const cx = player.x + player.w / 2;
  const cy = player.y + 22;
  effects.particles.addText(cx, player.y - 24, `${wDef.artName.toUpperCase()} !`, '#ffd470', 1.1);

  if (wDef.key === 'clay_blade') {
    startAttack(player, effects.vfx, wDef.reachPx, 'heavy', 0.28);
    const shot = effects.acquireProjectile(room.projectiles);
    shot.x = cx + player.facing * 20;
    shot.y = cy;
    shot.vx = player.facing * 520;
    shot.vy = 0;
    shot.r = 18;
    shot.dmg = 48;
    shot.friendly = true;
    shot.color = '#ffd470';
    shot.kind = 'crescent';
    shot.life = 1.0;
    effects.onTrainingProjectile?.('artCast', shot);
    effects.vfx.spawnImpactFlare(cx + player.facing * 24, cy, 78, '#ffd470', 'gold', 0.25);
  } else if (wDef.key === 'belfry_greatsword') {
    startAttack(player, effects.vfx, wDef.reachPx, 'heavy', 0.34);
    effects.shake(0.62);
    effects.vfx.spawnGroundFissure(cx + player.facing * 60, player.y + player.h, 150, '#ff7b29', 1.7);
    effects.vfx.spawnImpactFlare(cx + player.facing * 50, player.y + player.h - 10, 96, '#ff9842', 'amber', 0.3);
    for (const e of room.enemies) {
      if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 175) {
        applyEnemyDamage(run, e, 54);
        effects.onTrainingAction?.('artHit');
        e.stagger += 75;
        e.hitFlashT = 0.08;
        if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
        if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
        if (run.blessings.includes('lunar_frost')) e.chillT = 3.0;
        effects.particles.addText(e.x + e.w / 2, e.y - 16, '-54 SISMIQUE!', '#ff9d42', 1.1);
        if (e.hp <= 0) effects.onEnemyKilled(e);
      }
    }
  } else if (wDef.key === 'eclipse_daggers') {
    const target = room.enemies.find((e) => e.hp > 0 && e.state !== 'dead' && Math.abs(e.x - cx) < 320);
    if (target) {
      player.x = Math.max(24, Math.min(room.width - 52, target.x - player.facing * 32));
      effects.snapPosition(player);
      player.facing = target.x >= player.x ? 1 : -1;
      effects.vfx.spawnLightning(cx, cy, player.x + 14, cy, '#9fd0ff', 2.8, 0.22);
    } else {
      player.vx = player.facing * 680;
    }
    player.invulnT = 0.35;
    run.critNextAttack = true;
    startAttack(player, effects.vfx, wDef.reachPx, 'dash_strike', 0.2);
  } else if (wDef.key === 'ash_halberd') {
    startAttack(player, effects.vfx, wDef.reachPx, 'launcher', 0.28);
    effects.vfx.spawnSlashArc(cx, cy, 118, -1.5, 1.5, player.facing, '#ffd470', '#ffffff', 24, 0.25);
    for (const e of room.enemies) {
      if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 145) {
        applyEnemyDamage(run, e, 44);
        effects.onTrainingAction?.('artHit');
        e.sunderT = 5.0;
        if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
        if (run.blessings.includes('lunar_frost')) e.chillT = 3.0;
        if (!e.isBoss) e.vy = -260;
        effects.particles.addText(e.x + e.w / 2, e.y - 16, '-44 FISSURÉ!', '#ffd470', 1.05);
        if (e.hp <= 0) effects.onEnemyKilled(e);
      }
    }
  } else if (wDef.key === 'scythe_eclipse') {
    startAttack(player, effects.vfx, wDef.reachPx, 'heavy', 0.28);
    effects.vfx.spawnSlashArc(cx, cy, 108, -Math.PI, Math.PI, player.facing, '#ff4d63', '#ffe0eb', 22, 0.26);
    let drained = 0;
    for (const e of room.enemies) {
      if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 135) {
        applyEnemyDamage(run, e, 46);
        effects.onTrainingAction?.('artHit');
        e.chillT = 4.0;
        if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
        if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
        drained += 8;
        if (e.hp <= 0) effects.onEnemyKilled(e);
      }
    }
    if (drained > 0) {
      run.hp = Math.min(run.maxHp, run.hp + drained);
      effects.particles.addText(cx, player.y - 38, `+${drained} PV MOISSON`, '#ff4d63', 1);
    }
  } else {
    // twin_hammers: double tectonic slam
    startAttack(player, effects.vfx, wDef.reachPx, 'heavy', 0.32);
    effects.shake(0.68);
    effects.vfx.spawnGroundFissure(cx - 48, player.y + player.h, 85, '#ff7b29', 1.5);
    effects.vfx.spawnGroundFissure(cx + 48, player.y + player.h, 85, '#ff7b29', 1.5);
    for (const e of room.enemies) {
      if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 150) {
        applyEnemyDamage(run, e, 42);
        effects.onTrainingAction?.('artHit');
        e.stagger = e.maxStagger;
        e.state = 'staggered';
        e.stateT = 2.4;
        if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
        if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
        effects.particles.addText(e.x + e.w / 2, e.y - 18, 'GARDE PULVÉRISÉE !', '#ffd470', 1.15);
        if (e.hp <= 0) effects.onEnemyKilled(e);
      }
    }
  }
  effects.pushHud(true);
}

export function hurtPlayer(effects: DamageEffects, rawDmg: number, sourceX: number): void {
  if (!effects.player || !effects.run || !effects.room || effects.deathDelayTimer > 0) {
    return;
  }
  const player = effects.player;
  const run = effects.run;

  // 0. Check Perfect Dodge during active Dash evading a strike!
  if (player.dashT > 0) {
    if (player.invulnT > 0.14) {
      player.invulnT = 0.14;
      run.perfectDodges += 1;
      effects.onTrainingAction?.('perfectDodge');
      run.stam = Math.min(run.maxStam, run.stam + 14);
      run.critNextAttack = true;
      effects.slowFor(0.22);
      AudioFX.perfectDodge();
      effects.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 62, '#8ab8e6', 'astral', 0.24);
      effects.particles.addText(player.x + 14, player.y - 18, 'ESQUIVE PARFAITE !', '#8ab8e6', 1.1);
    }
    return;
  }

  if (player.invulnT > 0) return;

  // 1. Check Perfect Sekiro Deflect!
  if (player.parryT > 0) {
    AudioFX.parry();
    if (effects.save.settings?.hitstopEnabled !== false) effects.stopFor(0.08);
    effects.slowFor(0.18);
    effects.shake(0.48);
    effects.rumble(0.42, 0.85, 130, effects.save.settings?.gamepadRumble !== false);
    player.invulnT = 0.26;
    player.riposteBuffT = 4.0;
    run.stam = Math.min(run.maxStam, run.stam + 24);
    run.parries += 1;
    run.parryStreak += 1;
    run.bestParryStreak = Math.max(run.bestParryStreak, run.parryStreak);
    if (run.parryStreak >= 3 && run.parryStreak % 3 === 0) {
      run.stam = Math.min(run.maxStam, run.stam + 18);
      effects.particles.addText(player.x + 14, player.y - 36, `ÉLAN ${run.parryStreak}x !`, '#ff9d42', 1.05);
    }
    effects.registerComboHit(2);
    if (run.blessings.includes('bronze_counter')) run.critNextAttack = true;
    const pxP = player.x + player.w / 2 + player.facing * 16;
    const pyP = player.y + 20;
    const quietParry = effects.save.settings?.reduceFlashes;
    effects.particles.spawnBurst(pxP, pyP, '#ffd470', quietParry ? 6 : 16, quietParry ? 120 : 270);
    effects.particles.spawnRing(player.x + player.w / 2, player.y + 20, '#ffd470', 90, 0.26);
    if (!quietParry) {
      effects.particles.spawnBurst(pxP, pyP, '#fff3cb', 6, 180, 160, 1);
      effects.vfx.spawnImpactFlare(pxP, pyP, 84, '#ffd470', 'gold', 0.25);
      effects.vfx.triggerScreenFlash('#ffd470', 0.18);
    }
    for (let b = 0; !quietParry && b < 3; b++) {
      const ang = -0.8 + b * 0.8 + (player.facing === -1 ? Math.PI : 0);
      effects.vfx.spawnLightning(
        pxP,
        pyP,
        pxP + Math.cos(ang) * 72,
        pyP + Math.sin(ang) * 72,
        '#ffd470',
        2.6,
        0.18
      );
    }
    effects.particles.addText(player.x + 14, player.y - 16, 'PARADE PARFAITE', '#ffe2a3', 1.15);

    const stagPower =
      ((effects.save.oath === 'airain' ? 78 : 55) +
        (effects.save.talents.parry_mastery || 0) * 10) *
      (run.relics.includes('eclipse_mirror') ? 1.2 : 1);

    for (const e of effects.room.enemies) {
      if (e.hp <= 0 || e.state === 'dead') continue;
      if (Math.abs(e.x + e.w / 2 - (player.x + player.w / 2)) < 145) {
        e.stagger += run.blessings.includes('fortress_guard')
          ? Math.round(stagPower * 1.45)
          : stagPower;
        if (run.blessings.includes('thunder_parry')) {
          applyEnemyDamage(run, e, 38);
          e.hitFlashT = 0.06;
          effects.particles.addText(e.x + e.w / 2, e.y - 24, '-38 ⚡', '#ffd470');
          if (e.hp <= 0) effects.onEnemyKilled(e);
        }
        if (e.hp > 0 && e.stagger >= e.maxStagger) {
          e.stagger = 0;
          e.state = 'staggered';
          e.stateT = 2.1;
          effects.particles.addText(e.x + e.w / 2, e.y - 40, 'BRISÉ !', '#ff9d42', 1.2);
        }
      }
    }
    effects.onTrainingAction?.('parry');
    effects.pushHud(true);
    return;
  }

  // 2. Partial Guard Mitigation
  let dmg = rawDmg;
  if (effects.save.oath === 'eclipse') dmg = Math.round(dmg * 1.25);
  if (run.relics.includes('iron_crown')) dmg = Math.round(dmg * 0.82);

  if (player.guardT > 0 && run.stam >= 15) {
    run.stam -= 15;
    dmg = Math.max(2, Math.round(dmg * 0.4));
    AudioFX.guard();
    effects.particles.addText(player.x + 14, player.y - 12, `GARDE -${dmg}`, '#b8b0a6');
  } else {
    run.parryStreak = 0;
    run.comboHits = 0;
    run.comboTimer = 0;
    AudioFX.hurt();
    effects.particles.addText(player.x + 14, player.y - 12, `-${dmg}`, '#ff4d5e', 1.1);
  }

  effects.onTrainingAction?.('hitTaken');
  run.damageTaken += Math.min(run.hp, dmg);
  run.hp = Math.max(0, run.hp - dmg);
  player.invulnT = 0.65;
  player.hitFlashT = 0.08;
  player.vx = (player.x < sourceX ? -1 : 1) * 240;
  player.vy = -190;
  if (effects.save.settings?.hitstopEnabled !== false) effects.stopFor(0.055);
  effects.shake(0.62);
  effects.rumble(0.55, 0.85, 160, effects.save.settings?.gamepadRumble !== false);
  effects.particles.spawnBurst(player.x + player.w / 2, player.y + 24, '#c4303e', 14, 240);
  effects.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 48, '#ff4d5e', 'crimson', 0.18);
  effects.vfx.triggerScreenFlash('#c4303e', 0.24);
  effects.blood.spawnImpact(
    player.x + player.w / 2,
    player.y + player.h * 0.5,
    player.x < sourceX ? -1 : 1,
    1.15,
    effects.room.platforms,
    'crimson'
  );

  // Second Wind talent check
  if (run.hp <= 0 && (effects.save.talents.second_wind || 0) > 0 && !run.secondWindUsed) {
    run.secondWindUsed = true;
    run.hp = Math.round(run.maxHp * 0.3);
    player.invulnT = 1.6;
    AudioFX.heal();
    effects.particles.spawnRing(player.x + player.w / 2, player.y + 24, '#ffd470', 140, 0.4);
    effects.particles.addText(player.x + 14, player.y - 26, 'DERNIER SOUFFLE !', '#ffd470', 1.25);
    effects.pushHud(true);
    return;
  }

  if (run.hp <= 0) {
    if (run.isTraining) {
      run.hp = run.maxHp;
      run.flasks = run.maxFlasks;
      run.stam = run.maxStam;
      player.invulnT = 1.6;
      AudioFX.heal();
      effects.particles.spawnRing(player.x + player.w / 2, player.y + 24, '#ffd470', 120, 0.35);
      effects.particles.addText(player.x + 14, player.y - 26, 'RÉGÉNÉRATION LIBRE !', '#ffd470', 1.1);
      effects.pushHud(true);
      return;
    }
    AudioFX.death();
    effects.delayDefeat(0.65);
    effects.showBanner("L'ARGILE SE BRISE", 'Bilan de l’expédition…', '#c4303e', 1.8);
  }
  effects.pushHud(true);
}

export function resolveEnemyDeath(effects: DamageEffects, e: Enemy, grantLoot = true): void {
  if (!effects.run || !effects.room) return;
  e.state = 'dead';
  e.deadT = 0.35;
  effects.run.kills += 1;

  if (!effects.run.isTraining) {
    effects.updateSave((s) => ({
      ...s,
      bestiaryKills: {
        ...s.bestiaryKills,
        [e.kind]: (s.bestiaryKills[e.kind] || 0) + 1,
      },
      records: {
        ...s.records,
        bossesSlain: s.records.bossesSlain + (e.isBoss ? 1 : 0),
      },
    }));
  }

  effects.particles.spawnBurst(
    e.x + e.w / 2,
    e.y + e.h / 2,
    '#d4a853',
    e.isBoss ? 48 : 18,
    280
  );
  effects.vfx.spawnAshDissolve(
    e.x + e.w / 2,
    e.y + e.h * 0.5,
    e.isBoss ? 42 : 16,
    e.isBoss ? '#ffd470' : '#ff8c3b',
    e.w,
    e.h
  );
  if (e.isBoss) {
    effects.slowFor(0.45);
    effects.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h * 0.5, 130, '#ffd470', 'gold', 0.42);
    effects.vfx.triggerScreenFlash('#ffd470', 0.32);
  }
  effects.blood.spawnImpact(
    e.x + e.w / 2,
    e.y + e.h * 0.55,
    effects.player ? effects.player.facing : -e.facing,
    e.isBoss ? 2.2 : 1.55,
    effects.room.platforms,
    getBloodToneForEnemy(e.kind)
  );

  if (grantLoot) {
    const mult = getLootMultiplier(effects.save, effects.run, effects.room.affix?.id);
    const baseC = e.isBoss ? 80 : e.kind === 'flagellant' ? 24 : 13;
    const cendres = Math.round(baseC * (e.elite !== 'none' ? 1.7 : 1) * mult);
    effects.run.loot.cendres += cendres;

    const ferChance = (e.elite !== 'none' ? 0.85 : 0.25) + (effects.run.relics.includes('cinder_magnet') ? 0.15 : 0);
    if (e.isBoss || effects.gameplayRandom() < ferChance) {
      effects.run.loot.fer += e.isBoss ? 2 : 1;
    }
    if (e.isBoss || effects.gameplayRandom() < 0.08 + (effects.save.buildings.vigie || 0) * 0.03) {
      effects.run.loot.larmes += 1;
    }
  }

  if (effects.run.blessings.includes('vampiric')) {
    effects.run.hp = Math.min(effects.run.maxHp, effects.run.hp + 8);
  }
  if (effects.run.blessings.includes('ash_echo') && effects.player) {
    effects.run.stam = Math.min(effects.run.maxStam, effects.run.stam + 18);
    effects.player.dashCd = 0;
  }

  if (e.isBoss) {
    effects.room.props.forEach((p) => {
      if (p.type === 'exit') p.locked = false;
    });
    AudioFX.victory();
    effects.showBanner('GARDIEN TERRASSÉ', 'Le passage vers les profondeurs est ouvert', '#ffd470', 2.6);
  }
  effects.pushHud(true);
}
