import {
  BLESSINGS_POOL,
  BUILDINGS_DEF,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  DIFFICULTIES_DEF,
  NPCS_DEF,
  RELICS_POOL,
  SAVE_KEY,
  TALENTS_DEF,
  WEAPONS_DEF,
} from './data';
import type {
  AttackMove,
  BuildingKey,
  NpcKey,
  ResourceBag,
  RunState,
  SaveData,
  TalentKey,
  WeaponKey,
} from './types';

export function defaultSave(): SaveData {
  return {
    version: 2,
    res: { cendres: 75, fer: 3, larmes: 1 },
    buildings: { foyer: 0, forge: 0, autel: 0, vigie: 0, refuge: 1, sanctuaire: 0 },
    npcsUnlocked: { vaelen: true, meryl: false, orin: false, kaelith: false, lyra: false },
    npcsAssigned: ['vaelen'],
    npcLevels: { vaelen: 1, meryl: 1, orin: 1, kaelith: 1, lyra: 1 },
    oath: 'argile',
    weapon: 'clay_blade',
    weaponsUnlocked: {
      clay_blade: true,
      belfry_greatsword: false,
      eclipse_daggers: false,
      ash_halberd: false,
      scythe_eclipse: false,
      twin_hammers: false,
    },
    weaponTiers: {
      clay_blade: 0,
      belfry_greatsword: 0,
      eclipse_daggers: 0,
      ash_halberd: 0,
      scythe_eclipse: 0,
      twin_hammers: 0,
    },
    talents: {
      parry_mastery: 0,
      execution_siphon: 0,
      ash_reserves: 0,
      second_wind: 0,
      mist_reflex: 0,
      relic_attunement: 0,
    },
    loreUnlocked: ['stele_1'],
    bestiaryKills: {},
    questsClaimed: [],
    muted: false,
    settings: {
      ...DEFAULT_SETTINGS,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
    },
    records: {
      bestDepth: 1,
      runs: 0,
      victories: 0,
      totalKills: 0,
      totalParries: 0,
      maxParryStreak: 0,
      bossesSlain: 0,
      totalPlaySec: 0,
    },
  };
}

export function mergeSave(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    res: { ...base.res, ...(raw.res || {}) },
    buildings: { ...base.buildings, ...(raw.buildings || {}) },
    npcsUnlocked: { ...base.npcsUnlocked, ...(raw.npcsUnlocked || {}) },
    npcsAssigned: Array.isArray(raw.npcsAssigned) ? raw.npcsAssigned : base.npcsAssigned,
    npcLevels: { ...base.npcLevels, ...(raw.npcLevels || {}) },
    weaponsUnlocked: { ...base.weaponsUnlocked, ...(raw.weaponsUnlocked || {}) },
    weaponTiers: { ...base.weaponTiers, ...(raw.weaponTiers || {}) },
    talents: { ...base.talents, ...(raw.talents || {}) },
    loreUnlocked: Array.isArray(raw.loreUnlocked) ? raw.loreUnlocked : base.loreUnlocked,
    bestiaryKills: { ...(raw.bestiaryKills || {}) },
    questsClaimed: Array.isArray(raw.questsClaimed) ? raw.questsClaimed : [],
    settings: {
      ...base.settings,
      ...(raw.settings || {}),
      keyBindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(raw.settings?.keyBindings || {}),
      },
    },
    records: { ...base.records, ...(raw.records || {}) },
  };
}

export function loadSave(): SaveData {
  try {
    if (typeof localStorage === 'undefined') return defaultSave();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return mergeSave(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: SaveData): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getBuildingCost(save: SaveData, key: BuildingKey): Partial<ResourceBag> {
  const def = BUILDINGS_DEF[key];
  const lvl = save.buildings[key] || 0;
  const mult = Math.pow(1.62, lvl);
  const cost: Partial<ResourceBag> = {};
  for (const [r, v] of Object.entries(def.baseCost)) {
    if (typeof v === 'number') {
      cost[r as keyof ResourceBag] = Math.round(v * mult);
    }
  }
  return cost;
}

export function getWeaponUpgradeCost(tier: number): Partial<ResourceBag> {
  return {
    cendres: Math.round(45 * Math.pow(1.55, tier)),
    fer: 2 + tier * 2,
    ...(tier >= 2 ? { larmes: tier - 1 } : {}),
  };
}

export function getNpcUpgradeCost(level: number): Partial<ResourceBag> {
  return {
    cendres: 50 * level,
    fer: level,
  };
}

export function canAfford(res: ResourceBag, cost: Partial<ResourceBag>): boolean {
  return Object.entries(cost).every(([k, v]) => (res[k as keyof ResourceBag] || 0) >= (v || 0));
}

export function payCost(res: ResourceBag, cost: Partial<ResourceBag>): ResourceBag {
  const next = { ...res };
  for (const [k, v] of Object.entries(cost)) {
    const key = k as keyof ResourceBag;
    next[key] = Math.max(0, (next[key] || 0) - (v || 0));
  }
  return next;
}

export function createRunState(save: SaveData, rng: () => number = Math.random): RunState {
  const hpBonus = (save.buildings.foyer || 0) * 20;
  const stamBonus = (save.buildings.foyer || 0) * 12;
  const oathHpMult = save.oath === 'sang' ? 0.75 : 1;
  const maxHp = Math.round((115 + hpBonus) * oathHpMult);
  const maxStam = 100 + stamBonus;
  const baseFlasks =
    2 +
    (save.buildings.autel >= 1 ? 1 : 0) +
    (save.buildings.autel >= 3 ? 1 : 0) +
    (save.buildings.autel >= 5 ? 1 : 0) -
    (save.oath === 'pelerin' ? 1 : 0);
  const maxFlasks = Math.max(1, baseFlasks);

  const startingCendres =
    (save.buildings.sanctuaire || 0) * 15 + (save.talents.ash_reserves || 0) * 25;

  const relics: string[] = [];
  if ((save.talents.relic_attunement || 0) > 0) {
    const pick = RELICS_POOL[Math.floor(rng() * RELICS_POOL.length)];
    if (pick) relics.push(pick.id);
  }

  // Generate merchant stock
  const pool = [...RELICS_POOL].filter((r) => !relics.includes(r.id));
  const merchantStock = pool
    .sort(() => rng() - 0.5)
    .slice(0, 3)
    .map((r) => r.id);

  return {
    depth: 1,
    blessings: [],
    relics,
    maxHp,
    hp: maxHp,
    ghostHp: maxHp,
    maxStam,
    stam: maxStam,
    maxFlasks,
    flasks: maxFlasks,
    loot: { cendres: startingCendres, fer: 0, larmes: 0 },
    kills: 0,
    parries: 0,
    parryStreak: 0,
    bestParryStreak: 0,
    comboHits: 0,
    comboTimer: 0,
    damageTaken: 0,
    elapsedSec: 0,
    secondWindUsed: false,
    critNextAttack: false,
    merchantStock,
  };
}

export function computeComboRank(comboHits: number): {
  rank: 'D' | 'C' | 'B' | 'A' | 'S' | 'ÉCLIPSE';
  lootBonus: number;
  color: string;
} {
  if (comboHits >= 18) return { rank: 'ÉCLIPSE', lootBonus: 0.3, color: '#ffd470' };
  if (comboHits >= 12) return { rank: 'S', lootBonus: 0.22, color: '#ff9d42' };
  if (comboHits >= 8) return { rank: 'A', lootBonus: 0.15, color: '#e06b2b' };
  if (comboHits >= 5) return { rank: 'B', lootBonus: 0.1, color: '#d4a853' };
  if (comboHits >= 2) return { rank: 'C', lootBonus: 0.05, color: '#cfc6b8' };
  return { rank: 'D', lootBonus: 0, color: '#8a8073' };
}

export function getLootMultiplier(save: SaveData, run: RunState, affixId?: string | null): number {
  const diff = DIFFICULTIES_DEF[save.settings?.difficulty || 'awakened'];
  let m = 1 + (save.buildings.vigie || 0) * 0.15;
  if (save.oath === 'sang') m += 0.45;
  if (run.blessings.includes('greed')) m += 0.4;
  if (run.relics.includes('cinder_magnet')) m += 0.25;
  if (affixId === 'blood_moon') m += 0.3;
  m += computeComboRank(run.comboHits).lootBonus;
  m *= diff.lootMult;
  return m;
}

export function getParryWindowSec(save: SaveData): number {
  const diff = DIFFICULTIES_DEF[save.settings?.difficulty || 'awakened'];
  let base = 0.22 + diff.parryBonusSec;
  if (save.oath === 'airain') base += 0.08;
  base += (save.talents.parry_mastery || 0) * 0.025;
  return Math.max(0.12, base);
}

export function getPlayerDamageStats(
  save: SaveData,
  run: RunState,
  move: AttackMove,
  isRiposte: boolean,
  enemySundered: boolean,
  rng: () => number = Math.random,
  affixId?: string | null
): { damage: number; stagger: number; isCrit: boolean } {
  const weapon = WEAPONS_DEF[save.weapon] || WEAPONS_DEF.clay_blade;
  const weaponTier = save.weaponTiers[save.weapon] || 0;

  let baseDmg = 24;
  let baseStag = 20;
  if (move === 'light2') {
    baseDmg = 27;
    baseStag = 24;
  } else if (move === 'light3') {
    baseDmg = 36;
    baseStag = 34;
    if (run.blessings.includes('pyre_finisher')) baseDmg *= 1.4;
  } else if (move === 'heavy') {
    baseDmg = 46;
    baseStag = 46;
  } else if (move === 'plunge') {
    baseDmg = 42;
    baseStag = 40;
    if (run.blessings.includes('wind_dancer')) baseDmg *= 1.2;
  } else if (move === 'launcher') {
    baseDmg = 30;
    baseStag = 28;
  } else if (move === 'dash_strike') {
    baseDmg = 32;
    baseStag = 26;
    if (run.blessings.includes('wall_tempest')) baseDmg *= 1.3;
  }

  baseDmg *= weapon.dmgMult * (1 + weaponTier * 0.12);
  baseStag *= weapon.staggerMult;

  baseDmg *= 1 + (save.buildings.forge || 0) * 0.18;
  if (run.blessings.includes('ember_blade')) baseDmg *= 1.25;
  if (run.blessings.includes('crimson_frenzy') && run.hp <= run.maxHp * 0.5) baseDmg *= 1.22;
  if (run.relics.includes('ember_ring')) baseDmg *= 1.15;
  if (run.relics.includes('eclipse_mirror')) baseStag *= 1.2;
  if (save.oath === 'eclipse') baseDmg *= 1.28;
  if (save.oath === 'airain') baseStag *= 1.4;
  if (run.blessings.includes('fortress_guard')) baseStag *= 1.45;
  if (affixId === 'iron_eclipse') baseStag *= 1.2;

  if (isRiposte) {
    let riposteMult = 1.55 + (save.buildings.forge || 0) * 0.15;
    if (run.relics.includes('bell_clapper')) riposteMult += 0.3;
    baseDmg *= riposteMult;
  }

  if (enemySundered) {
    baseDmg *= 1.25;
  }

  let critChance = weapon.critChance;
  if (save.oath === 'eclipse') critChance += 0.15;
  if (run.relics.includes('obsidian_eye')) critChance += 0.12;
  if (affixId === 'ember_wind') critChance += 0.15;

  const isCrit = run.critNextAttack || rng() < critChance;
  if (isCrit) {
    baseDmg *= 1.65;
  }

  return {
    damage: Math.max(1, Math.round(baseDmg)),
    stagger: Math.max(1, Math.round(baseStag)),
    isCrit,
  };
}

export function calculateBastionProduction(save: SaveData): ResourceBag {
  const slots = save.buildings.refuge || 0;
  const prod: ResourceBag = { cendres: 0, fer: 0, larmes: 0 };
  for (const npcId of save.npcsAssigned.slice(0, slots)) {
    const def = NPCS_DEF[npcId];
    if (!def) continue;
    const lvl = save.npcLevels[npcId] || 1;
    if (def.baseBonus.cendres) prod.cendres += def.baseBonus.cendres * lvl;
    if (def.baseBonus.fer) prod.fer += def.baseBonus.fer * lvl;
    if (def.baseBonus.larmes) prod.larmes += def.baseBonus.larmes * lvl;
  }
  return prod;
}

export function bankRunIntoSave(save: SaveData, run: RunState, victory: boolean): SaveData {
  const prod = calculateBastionProduction(save);
  const next: SaveData = {
    ...save,
    res: {
      cendres: save.res.cendres + run.loot.cendres + prod.cendres,
      fer: save.res.fer + run.loot.fer + prod.fer,
      larmes: save.res.larmes + run.loot.larmes + prod.larmes,
    },
    records: {
      ...save.records,
      bestDepth: Math.max(save.records.bestDepth, run.depth),
      victories: save.records.victories + (victory ? 1 : 0),
      totalKills: save.records.totalKills + run.kills,
      totalParries: save.records.totalParries + run.parries,
      maxParryStreak: Math.max(save.records.maxParryStreak, run.bestParryStreak),
      totalPlaySec: (save.records.totalPlaySec || 0) + Math.round(run.elapsedSec),
    },
  };
  return next;
}

export function exportSaveJson(save: SaveData): string {
  return JSON.stringify(save, null, 2);
}

export function importSaveJson(rawText: string): SaveData | null {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || !parsed.res || !parsed.buildings) {
      return null;
    }
    return mergeSave(parsed as Partial<SaveData>);
  } catch {
    return null;
  }
}

export function pickBlessingChoices(
  run: RunState,
  count: number = 3,
  rng: () => number = Math.random
) {
  const available = BLESSINGS_POOL.filter((b) => !run.blessings.includes(b.id));
  const pool = available.length >= count ? [...available] : [...BLESSINGS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function getWeaponMeta(key: WeaponKey) {
  return WEAPONS_DEF[key];
}

export function getTalentMeta(key: TalentKey) {
  return TALENTS_DEF[key];
}
