import { AudioFX } from './audio';
import type { BloodSystem } from './bloodDecals';
import { DEFAULT_KEY_BINDINGS, LORE_TABLETS, NPCS_DEF, RELICS_POOL } from './data';
import { formatKeyLabel } from './input';
import type { ParticlePool } from './particles';
import { computeActiveSynergies, getLootMultiplier, pickBlessingChoices } from './rules';
import type { BlessingDef, Platform, Player, RoomData, RunState, SaveData } from './types';

export interface RoomHazardEffects {
  readonly simTime: number;
  hurtPlayer: (damage: number, sourceX: number) => void;
  snapPosition: (player: Player) => void;
}

export interface RoomInteractionEffects {
  readonly save: SaveData;
  readonly room: RoomData | null;
  blood: BloodSystem;
  particles: ParticlePool;
  gameplayRandom: () => number;
  updateSave: (updater: (save: SaveData) => SaveData) => void;
  showBanner: (title: string, sub: string, color: string, duration: number) => void;
  openMerchant: (run: RunState) => void;
  openBlessingChoices: (choices: BlessingDef[]) => void;
  openBastion: () => void;
}

export function updatePlatforms(platforms: Platform[], simTime: number, dt: number): void {
  // Update Moving Platforms
  for (const p of platforms) {
    if (p.type === 'moving' && p.baseX !== undefined && p.baseY !== undefined) {
      const oldX = p.x;
      const oldY = p.y;
      const ph = (p.phase || 0) + simTime * (p.moveSpeed || 1);
      p.x = p.baseX + Math.sin(ph) * (p.moveRangeX || 0);
      p.y = p.baseY + Math.cos(ph) * (p.moveRangeY || 0);
      p.vx = (p.x - oldX) / dt;
      p.vy = (p.y - oldY) / dt;
    }
    if (p.type === 'crumble' && p.broken && p.respawnT !== undefined) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        p.broken = false;
        p.crumbleT = 0;
      }
    }
  }
}

export function updateRoomHazards(room: RoomData, player: Player, dt: number, effects: RoomHazardEffects): void {
  for (const h of room.hazards) {
    if (h.kind === 'flamejet') {
      h.timer = (h.timer + dt) % 3.6;
      h.active = h.timer >= 2.6;
      if (
        h.active &&
        player.x + player.w > h.x + 4 &&
        player.x < h.x + h.w - 4 &&
        player.y + player.h > h.y - 76 &&
        player.y < h.y + h.h
      ) {
        effects.hurtPlayer(18, h.x + h.w / 2);
      }
    } else if (h.kind === 'pendulum' && h.pivotX !== undefined && h.pivotY !== undefined && h.length) {
      const ang = Math.sin(effects.simTime * 2.15 + h.timer) * 0.88;
      h.angle = ang;
      const bx = h.pivotX + Math.sin(ang) * h.length;
      const by = h.pivotY + Math.cos(ang) * h.length;
      h.x = bx - 22;
      h.y = by - 14;
      if (
        player.x + player.w > bx - 20 &&
        player.x < bx + 20 &&
        player.y + player.h > by - 14 &&
        player.y < by + 18
      ) {
        effects.hurtPlayer(26, bx);
      }
    } else if (
      player.x + player.w > h.x &&
      player.x < h.x + h.w &&
      player.y + player.h > h.y
    ) {
      effects.hurtPlayer(22, h.x + h.w / 2);
      effects.snapPosition(player);
      player.y = room.groundY - 120;
      player.vy = -300;
    }
  }

  if (player.y > room.height + 90) {
    effects.hurtPlayer(24, player.x);
    effects.snapPosition(player);
    player.x = 120;
    player.y = room.groundY - 120;
    player.vy = 0;
  }
}

// Exits change phase and leave the current HUD prompt in place.
export function interactWithProps(
  room: RoomData,
  player: Player,
  run: RunState,
  interactPressed: boolean,
  usingGamepad: boolean,
  effects: RoomInteractionEffects,
): string | undefined {
  let prompt = '';
  const interactLabel = usingGamepad
    ? 'A / Croix'
    : formatKeyLabel(effects.save.settings?.keyBindings?.interact ?? DEFAULT_KEY_BINDINGS.interact);
  const action = `[${interactLabel}]`;

  for (const pr of room.props) {
    if (pr.type === 'urn') continue;
    const near =
      Math.abs(player.x + player.w / 2 - (pr.x + pr.w / 2)) < 58 &&
      Math.abs(player.y + player.h - (pr.y + pr.h)) < 70;
    if (!near) continue;

    if ((pr.type === 'chest' || pr.type === 'gilded_chest') && !pr.opened) {
      prompt = pr.type === 'gilded_chest' ? `${action} Ouvrir le Reliquaire Doré` : `${action} Ouvrir le Reliquaire`;
      if (interactPressed) {
        pr.opened = true;
        const mult = getLootMultiplier(effects.save, run);
        const c = Math.round((pr.type === 'gilded_chest' ? 35 : 20 + effects.gameplayRandom() * 14) * mult);
        const f = pr.type === 'gilded_chest' || effects.gameplayRandom() < 0.48 + (effects.save.buildings.vigie || 0) * 0.08 ? 1 : 0;
        run.loot.cendres += c;
        run.loot.fer += f;

        if (pr.type === 'gilded_chest') {
          const unowned = RELICS_POOL.filter((r) => !run.relics.includes(r.id));
          if (unowned.length > 0) {
            const relic = unowned[Math.floor(effects.gameplayRandom() * unowned.length)];
            run.relics.push(relic.id);
            run.activeSynergies = computeActiveSynergies(run);
            effects.particles.addText(pr.x, pr.y - 34, `Relique : ${relic.name}`, '#ffd470', 1.1);
          }
        }
        AudioFX.pickup();
        effects.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#ffd470', 18, 200);
        effects.particles.addText(pr.x, pr.y - 16, `+${c}🔥 ${f ? `+${f}⛓️` : ''}`, '#d4a853');
      }
    } else if (pr.type === 'brazier' && !pr.used) {
      prompt = run.isTraining
        ? `${action} Se régénérer au Brasero (Illimité)`
        : `${action} Se réchauffer au Brasero (+35% PV & +1 Fiole)`;
      if (interactPressed) {
        if (!run.isTraining) pr.used = true;
        const heal = run.isTraining ? run.maxHp : Math.round(run.maxHp * 0.35);
        run.hp = Math.min(run.maxHp, run.hp + heal);
        run.flasks = run.isTraining ? run.maxFlasks : Math.min(run.maxFlasks, run.flasks + 1);
        AudioFX.heal();
        effects.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#ff9842', 20, 180);
        effects.particles.addText(
          pr.x,
          pr.y - 20,
          run.isTraining ? 'VITALITÉ & FIOLES RESTAURÉES' : `+${heal} PV · +1 Fiole`,
          '#ff9842'
        );
      }
    } else if (pr.type === 'shrine' && !pr.used) {
      prompt = `${action} Autel de Sang (Sacrifier 20% PV -> +55🔥 & +1💧)`;
      if (interactPressed) {
        pr.used = true;
        const sac = Math.max(1, Math.round(run.maxHp * 0.2));
        run.hp = Math.max(1, run.hp - sac);
        run.loot.cendres += 55;
        run.loot.larmes += 1;
        AudioFX.sacrifice();
        effects.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#c4303e', 18, 180);
        effects.blood.spawnImpact(
          pr.x + pr.w / 2,
          pr.y + pr.h * 0.5,
          1,
          0.95,
          effects.room!.platforms,
          'crimson'
        );
        effects.particles.addText(pr.x, pr.y - 22, `+55🔥 +1💧`, '#7ab8ff');
      }
    } else if (pr.type === 'merchant') {
      prompt = `${action} Parler au Marchand Errant`;
      if (interactPressed) {
        AudioFX.ui();
        effects.openMerchant({ ...run });
      }
    } else if (pr.type === 'lore' && !pr.used && pr.loreId) {
      prompt = `${action} Déchiffrer la Stèle`;
      if (interactPressed) {
        pr.used = true;
        const lore = LORE_TABLETS.find((l) => l.id === pr.loreId);
        if (lore && !effects.save.loreUnlocked.includes(lore.id)) {
          effects.updateSave((s) => ({ ...s, loreUnlocked: [...s.loreUnlocked, lore.id] }));
        }
        run.loot.cendres += 15;
        AudioFX.pickup();
        effects.showBanner(lore?.title || 'Stèle Ancienne', lore?.text || '', '#8ab8e6', 3.5);
      }
    } else if (pr.type === 'npc' && !pr.used && pr.npcId) {
      const npcName = NPCS_DEF[pr.npcId].name;
      prompt = `${action} Secourir ${npcName}`;
      if (interactPressed) {
        pr.used = true;
        const id = pr.npcId;
        effects.updateSave((s) => ({
          ...s,
          npcsUnlocked: { ...s.npcsUnlocked, [id]: true },
        }));
        AudioFX.heal();
        effects.particles.addText(pr.x, pr.y - 22, `${npcName} rejoint le Bastion !`, '#7ab8ff');
      }
    } else if (pr.type === 'exit') {
      if (pr.locked) {
        prompt = 'Terrassez le Gardien pour ouvrir le Passage';
      } else if (run.isTraining) {
        prompt = `${action} Quitter la Cour et revenir au Bastion`;
        if (interactPressed) {
          effects.openBastion();
          return;
        }
      } else {
        prompt = `${action} Descendre vers la Strate ${run.depth + 1}`;
        if (interactPressed) {
          AudioFX.ui();
          effects.openBlessingChoices(pickBlessingChoices(run, 3, effects.gameplayRandom));
          return;
        }
      }
    }
  }
  return prompt;
}
