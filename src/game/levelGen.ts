import { BIOMES, DIFFICULTIES_DEF, ENEMY_LORE, LORE_TABLETS, NPCS_DEF, ROOM_AFFIXES } from './data';
import type {
  EliteTrait,
  Enemy,
  EnemyKind,
  Hazard,
  NpcKey,
  Platform,
  RoomData,
  RoomProp,
  SaveData,
} from './types';

let nextEnemyId = 1;

export function createEnemy(
  kind: EnemyKind,
  x: number,
  groundY: number,
  depth: number,
  elite: EliteTrait = 'none',
  hpMult = 1,
  dmgMult = 1
): Enemy {
  const scale = 1 + (depth - 1) * 0.2;
  const eliteHpMult = (elite !== 'none' ? 1.75 : 1) * hpMult;
  const eliteDmgMult = (elite === 'blazing' ? 1.25 : elite !== 'none' ? 1.15 : 1) * dmgMult;

  const base: Enemy = {
    id: nextEnemyId++,
    kind,
    name: ENEMY_LORE[kind].title,
    x,
    y: groundY - 48,
    w: 30,
    h: 48,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: Math.round(52 * scale * eliteHpMult),
    maxHp: Math.round(52 * scale * eliteHpMult),
    dmg: Math.round(16 * scale * eliteDmgMult),
    stagger: 0,
    maxStagger: 100,
    state: 'idle',
    stateT: 0,
    cd: 1.15,
    color: '#b5a899',
    isBoss: false,
    elite,
    phase: 1,
    hitFlashT: 0,
    burnT: 0,
    burnTickT: 0,
    sunderT: 0,
    chillT: 0,
    deadT: 0,
    attackPattern: 0,
    walkPhase: 0,
  };

  if (kind === 'penitent') {
    return base;
  }
  if (kind === 'watcher') {
    return {
      ...base,
      y: groundY - 82,
      hp: Math.round(42 * scale * eliteHpMult),
      maxHp: Math.round(42 * scale * eliteHpMult),
      dmg: Math.round(14 * scale * eliteDmgMult),
      maxStagger: 75,
      color: '#6e94ad',
      flying: true,
    };
  }
  if (kind === 'flagellant') {
    return {
      ...base,
      w: 38,
      h: 58,
      y: groundY - 58,
      hp: Math.round(96 * scale * eliteHpMult),
      maxHp: Math.round(96 * scale * eliteHpMult),
      dmg: Math.round(24 * scale * eliteDmgMult),
      maxStagger: 130,
      color: '#b8763e',
    };
  }
  if (kind === 'lancer') {
    return {
      ...base,
      w: 34,
      h: 52,
      y: groundY - 52,
      hp: Math.round(78 * scale * eliteHpMult),
      maxHp: Math.round(78 * scale * eliteHpMult),
      dmg: Math.round(19 * scale * eliteDmgMult),
      maxStagger: 110,
      color: '#8f96a3',
      shielded: true,
    };
  }
  if (kind === 'arbalest') {
    return {
      ...base,
      w: 28,
      h: 48,
      y: groundY - 48,
      hp: Math.round(48 * scale * eliteHpMult),
      maxHp: Math.round(48 * scale * eliteHpMult),
      dmg: Math.round(21 * scale * eliteDmgMult),
      maxStagger: 70,
      color: '#7c535a',
    };
  }
  if (kind === 'specter') {
    return {
      ...base,
      w: 28,
      h: 50,
      y: groundY - 50,
      hp: Math.round(62 * scale * eliteHpMult),
      maxHp: Math.round(62 * scale * eliteHpMult),
      dmg: Math.round(20 * scale * eliteDmgMult),
      maxStagger: 85,
      color: '#796794',
    };
  }
  if (kind === 'pyromancer') {
    return {
      ...base,
      w: 30,
      h: 52,
      y: groundY - 52,
      hp: Math.round(64 * scale * eliteHpMult),
      maxHp: Math.round(64 * scale * eliteHpMult),
      dmg: Math.round(22 * scale * eliteDmgMult),
      maxStagger: 85,
      color: '#c95c38',
    };
  }
  if (kind === 'archon') {
    return {
      ...base,
      w: 56,
      h: 88,
      y: groundY - 88,
      hp: Math.round(350 * scale),
      maxHp: Math.round(350 * scale),
      dmg: Math.round(28 * scale),
      maxStagger: 155,
      color: '#d4a853',
      isBoss: true,
      elite: 'none',
    };
  }
  if (kind === 'mother') {
    return {
      ...base,
      w: 60,
      h: 92,
      y: groundY - 92,
      hp: Math.round(400 * scale),
      maxHp: Math.round(400 * scale),
      dmg: Math.round(30 * scale),
      maxStagger: 165,
      color: '#c43b4d',
      isBoss: true,
      elite: 'none',
    };
  }
  return {
    ...base,
    w: 64,
    h: 96,
    y: groundY - 96,
    hp: Math.round(480 * scale),
    maxHp: Math.round(480 * scale),
    dmg: Math.round(33 * scale),
    maxStagger: 185,
    color: '#ffd470',
    isBoss: true,
    elite: 'none',
  };
}

export function generateRoom(
  depth: number,
  save: SaveData,
  rng: () => number = Math.random
): RoomData {
  const isBoss = depth % 3 === 0;
  const biome = BIOMES[Math.floor((depth - 1) / 3) % BIOMES.length];
  const diff = DIFFICULTIES_DEF[save.settings?.difficulty || 'awakened'];
  const affix = depth >= 2 ? ROOM_AFFIXES[Math.floor(rng() * ROOM_AFFIXES.length)] : null;
  const width = isBoss ? 1560 : 2250 + Math.min(850, depth * 90);
  const height = 920;
  const groundY = 720;

  const platforms: Platform[] = [];
  const hazards: Hazard[] = [];
  const props: RoomProp[] = [];
  const enemies: Enemy[] = [];
  const torches: Array<{ x: number; y: number }> = [];

  if (isBoss) {
    platforms.push({ x: 0, y: groundY, w: width, h: 240, type: 'solid' });
    platforms.push({ x: 160, y: groundY - 135, w: 230, h: 18, type: 'oneway' });
    platforms.push({ x: width - 390, y: groundY - 135, w: 230, h: 18, type: 'oneway' });
    platforms.push({
      x: width / 2 - 150,
      y: groundY - 245,
      w: 300,
      h: 18,
      type: 'moving',
      baseX: width / 2 - 150,
      baseY: groundY - 245,
      moveRangeX: 80,
      moveRangeY: 0,
      moveSpeed: 0.9,
      phase: 0,
    });
    // Bounce vents near arena edges
    platforms.push({ x: 75, y: groundY - 10, w: 54, h: 10, type: 'bounce' });
    platforms.push({ x: width - 129, y: groundY - 10, w: 54, h: 10, type: 'bounce' });

    for (let tx = 140; tx < width - 100; tx += 260) {
      torches.push({ x: tx, y: groundY - 170 });
    }

    const cycle = (depth / 3) % 3;
    const bossKind: EnemyKind = cycle === 1 ? 'archon' : cycle === 2 ? 'mother' : 'sovereign';
    enemies.push(createEnemy(bossKind, width - 350, groundY, depth, 'none', diff.enemyHpMult, diff.enemyDmgMult));

    // Pre-boss campfire brazier near entry for tactical prep
    if (depth > 3) {
      props.push({
        id: `brazier_boss_${depth}`,
        type: 'brazier',
        x: 210,
        y: groundY - 38,
        w: 32,
        h: 38,
        used: false,
      });
    }

    props.push({
      id: `exit_${depth}`,
      type: 'exit',
      x: width - 135,
      y: groundY - 86,
      w: 58,
      h: 86,
      locked: true,
    });
  } else {
    // Safe starting sanctuary platform (always wide and clear >= 380px so player spawns safely)
    platforms.push({ x: 0, y: groundY, w: 410, h: 240, type: 'solid' });
    torches.push({ x: 110, y: groundY - 140 });
    torches.push({ x: 320, y: groundY - 140 });

    // First enemy placed comfortably away from spawn (> 430px) so player survives initial idle seconds
    let curX = 410;
    let segIdx = 0;

    while (curX < width - 440) {
      const segW = 260 + Math.floor(rng() * 190);
      const hasGap = segIdx > 0 && rng() < 0.38;
      if (hasGap) {
        const gap = 95 + Math.floor(rng() * 55);
        hazards.push({
          x: curX,
          y: groundY + 46,
          w: gap,
          h: 40,
          kind: 'spikes',
          timer: 0,
          active: true,
        });
        // Add helpful stepping platform over wide gaps
        if (gap > 120) {
          platforms.push({
            x: curX + gap * 0.25,
            y: groundY - 58,
            w: 84,
            h: 16,
            type: 'crumble',
            crumbleT: 0,
            broken: false,
          });
        }
        curX += gap;
      }

      const elev = rng() < 0.45 ? -(35 + Math.floor(rng() * 75)) : 0;
      const py = groundY + elev;
      platforms.push({ x: curX, y: py, w: segW, h: 260 - elev, type: 'solid' });
      torches.push({ x: curX + segW * 0.5, y: py - 145 });

      // Upper platforms (oneway, crumble, moving, or bounce)
      if (rng() < 0.82) {
        const platY = py - (115 + Math.floor(rng() * 65));
        const platW = 140 + Math.floor(rng() * 110);
        const rType = rng();
        const pType = rType < 0.25 ? 'crumble' : rType < 0.42 ? 'moving' : 'oneway';
        platforms.push({
          x: curX + 26,
          y: platY,
          w: platW,
          h: 18,
          type: pType,
          crumbleT: 0,
          broken: false,
          baseX: curX + 26,
          baseY: platY,
          moveRangeX: pType === 'moving' ? 45 : 0,
          moveRangeY: pType === 'moving' ? 28 : 0,
          moveSpeed: 1.2,
          phase: segIdx,
        });

        if (rng() < 0.46) {
          const skyEnemy: EnemyKind = depth >= 2 && rng() < 0.35 ? 'arbalest' : 'watcher';
          enemies.push(createEnemy(skyEnemy, curX + 68, platY, depth, 'none', diff.enemyHpMult, diff.enemyDmgMult));
        }
        if (rng() < 0.28) {
          props.push({
            id: `gilded_${depth}_${segIdx}`,
            type: 'gilded_chest',
            x: curX + 55,
            y: platY - 34,
            w: 38,
            h: 34,
            opened: false,
          });
        }
      }

      // Ground enemy pool scales by depth
      const pool: EnemyKind[] = ['penitent', 'flagellant'];
      if (depth >= 2) pool.push('lancer', 'arbalest');
      if (depth >= 3) pool.push('specter');
      if (depth >= 4) pool.push('pyromancer');

      const chosen = pool[Math.floor(rng() * pool.length)];
      const isElite: EliteTrait =
        depth >= 2 && rng() < 0.14 + Math.min(0.15, depth * 0.02)
          ? (['swift', 'blazing', 'armored'][Math.floor(rng() * 3)] as EliteTrait)
          : 'none';
      enemies.push(createEnemy(chosen, curX + segW * 0.56, py, depth, isElite, diff.enemyHpMult, diff.enemyDmgMult));

      // Destructible urns & flame traps
      if (rng() < 0.5) {
        props.push({
          id: `urn_${depth}_${segIdx}`,
          type: 'urn',
          x: curX + 24,
          y: py - 28,
          w: 22,
          h: 28,
          broken: false,
        });
      }
      if (depth >= 2 && rng() < 0.35) {
        hazards.push({
          x: curX + segW * 0.36,
          y: py - 14,
          w: 36,
          h: 14,
          kind: 'flamejet',
          timer: rng() * 3,
          active: false,
        });
      }
      if (rng() < 0.32) {
        props.push({
          id: `chest_${depth}_${segIdx}`,
          type: 'chest',
          x: curX + segW * 0.28,
          y: py - 32,
          w: 36,
          h: 32,
          opened: false,
        });
      }

      curX += segW;
      segIdx++;
    }

    // Special room encounter near exit: Brazier, Blood Shrine, Merchant, or Lore Tablet
    platforms.push({ x: curX, y: groundY, w: width - curX, h: 240, type: 'solid' });
    torches.push({ x: width - 160, y: groundY - 150 });

    const eventRoll = rng();
    if (eventRoll < 0.34) {
      props.push({
        id: `brazier_${depth}`,
        type: 'brazier',
        x: curX + 70,
        y: groundY - 38,
        w: 32,
        h: 38,
        used: false,
      });
    } else if (eventRoll < 0.62) {
      props.push({
        id: `shrine_${depth}`,
        type: 'shrine',
        x: curX + 70,
        y: groundY - 56,
        w: 36,
        h: 56,
        used: false,
      });
    } else {
      props.push({
        id: `merchant_${depth}`,
        type: 'merchant',
        x: curX + 70,
        y: groundY - 52,
        w: 34,
        h: 52,
      });
    }

    // Lore stele if any remain locked
    const lockedLore = LORE_TABLETS.filter((l) => !save.loreUnlocked.includes(l.id));
    if (lockedLore.length > 0 && rng() < 0.55) {
      const lore = lockedLore[Math.floor(rng() * lockedLore.length)];
      props.push({
        id: `lore_${depth}`,
        type: 'lore',
        loreId: lore.id,
        x: 240,
        y: groundY - 48,
        w: 28,
        h: 48,
        used: false,
      });
    }

    // Rescuable NPC if any remain missing
    const lockedNpcs = (Object.keys(NPCS_DEF) as NpcKey[]).filter((k) => !save.npcsUnlocked[k]);
    if (lockedNpcs.length > 0 && rng() < 0.45) {
      const pick = lockedNpcs[Math.floor(rng() * lockedNpcs.length)];
      props.push({
        id: `npc_${pick}`,
        type: 'npc',
        npcId: pick,
        x: width - 270,
        y: groundY - 48,
        w: 30,
        h: 48,
        used: false,
      });
    }

    props.push({
      id: `exit_${depth}`,
      type: 'exit',
      x: width - 135,
      y: groundY - 86,
      w: 58,
      h: 86,
      locked: false,
    });
  }

  return {
    depth,
    isBoss,
    biome,
    affix,
    width,
    height,
    groundY,
    platforms,
    hazards,
    props,
    enemies,
    projectiles: [],
    torches,
  };
}
