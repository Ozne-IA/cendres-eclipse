import {
  ACHIEVEMENTS_DEF,
  BLESSINGS_POOL,
  BUILDINGS_DEF,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  DIFFICULTIES_DEF,
  NPCS_DEF,
  RELICS_POOL,
  SAVE_KEY,
  SYNERGIES_POOL,
  TALENTS_DEF,
  WEAPONS_DEF,
} from './data';
import { inspectSaveVersion, migrateSave } from './saveFormat';
import type {
  ArmorSkinKey,
  AttackMove,
  BuildingKey,
  Enemy,
  NpcKey,
  ResourceBag,
  RunBests,
  RunOutcome,
  RunRecord,
  RunState,
  SaveData,
  TalentKey,
  WeaponKey,
} from './types';

export const MAX_RUN_HISTORY = 20;

const EMPTY_RUN_BESTS: RunBests = {
  depthReached: 0,
  kills: 0,
  parries: 0,
  damageDealt: 0,
  peakComboHits: 0,
};

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
    armorSkin: 'eclipse',
    ascensionLevel: 0,
    maxAscensionUnlocked: 0,
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
    achievementsUnlocked: [],
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
    runHistory: [],
    runBests: { ...EMPTY_RUN_BESTS },
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeNumber(value: unknown, fallback: number, min = 0, max = 1_000_000_000, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, integer ? Math.floor(value) : value));
}

function mergeNumericRecord<T extends Record<string, number>>(
  defaults: T,
  raw: unknown,
  maximums: Partial<Record<keyof T, number>> = {}
): T {
  const source = isPlainRecord(raw) ? raw : {};
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    result[key] = safeNumber(
      source[String(key)],
      defaults[key],
      0,
      maximums[key] ?? 1_000_000_000
    ) as T[keyof T];
  }
  return result;
}

function mergeBooleanRecord<T extends Record<string, boolean>>(defaults: T, raw: unknown): T {
  const source = isPlainRecord(raw) ? raw : {};
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    if (typeof source[String(key)] === 'boolean') result[key] = source[String(key)] as T[keyof T];
  }
  return result;
}

function mergeStringList(raw: unknown, fallback: string[], allowed?: Set<string>, maxItems = 500): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 120) continue;
    if (allowed && !allowed.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= maxItems) break;
  }
  return result;
}

const RESOURCE_KEYS = ['cendres', 'fer', 'larmes'] as const;
const OATH_KEYS = ['argile', 'sang', 'airain', 'eclipse', 'pelerin'] as const;
const ARMOR_SKINS = ['eclipse', 'crimson', 'solaire', 'astral'] as const;
const ENEMY_KINDS = [
  'penitent', 'watcher', 'flagellant', 'lancer', 'arbalest',
  'specter', 'pyromancer', 'archon', 'mother', 'sovereign',
] as const;

function updateRunBests(bests: RunBests, run: RunRecord): RunBests {
  return {
    depthReached: Math.max(bests.depthReached, run.depthReached),
    kills: Math.max(bests.kills, run.kills),
    parries: Math.max(bests.parries, run.parries),
    damageDealt: Math.max(bests.damageDealt, run.damageDealt),
    peakComboHits: Math.max(bests.peakComboHits, run.peakComboHits),
  };
}

function mergeRunHistory(raw: unknown): RunRecord[] {
  if (!Array.isArray(raw)) return [];
  const result: RunRecord[] = [];
  for (const value of raw) {
    if (!isPlainRecord(value)) continue;
    const { outcome } = value;
    if (outcome !== 'victory' && outcome !== 'defeat' && outcome !== 'return') continue;
    if (typeof value.depthReached !== 'number' || !Number.isFinite(value.depthReached) || value.depthReached < 1) {
      continue;
    }
    result.push({
      outcome,
      depthReached: safeNumber(value.depthReached, 1, 1),
      kills: safeNumber(value.kills, 0),
      parries: safeNumber(value.parries, 0),
      perfectDodges: safeNumber(value.perfectDodges, 0),
      bestParryStreak: safeNumber(value.bestParryStreak, 0),
      damageTaken: safeNumber(value.damageTaken, 0),
      damageDealt: safeNumber(value.damageDealt, 0),
      peakComboHits: safeNumber(value.peakComboHits, 0),
      elapsedSec: safeNumber(value.elapsedSec, 0),
      ascensionLevel: safeNumber(value.ascensionLevel, 0, 0, 5),
    });
    if (result.length === MAX_RUN_HISTORY) break;
  }
  return result;
}

export function mergeSave(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = defaultSave();
  if (!isPlainRecord(raw)) return base;
  // Une version inconnue ou plus récente ne se lit pas : on repart d'une sauvegarde neuve (loadSave garde l'originale).
  const verdict = inspectSaveVersion((raw as Record<string, unknown>).version);
  if (verdict.status === 'invalid' || verdict.status === 'newer') return base;
  const source = migrateSave(raw as Record<string, unknown>);

  const rawRes = isPlainRecord(source.res) ? source.res : {};
  const res = { ...base.res };
  for (const key of RESOURCE_KEYS) {
    res[key] = safeNumber(rawRes[key], base.res[key]);
  }

  const buildingMax = Object.fromEntries(
    Object.entries(BUILDINGS_DEF).map(([key, def]) => [key, def.max])
  ) as Partial<Record<keyof typeof base.buildings, number>>;
  const buildings = mergeNumericRecord(base.buildings, source.buildings, buildingMax);
  const npcsUnlocked = mergeBooleanRecord(base.npcsUnlocked, source.npcsUnlocked);
  const npcLevels = mergeNumericRecord(base.npcLevels, source.npcLevels, {
    vaelen: 99, meryl: 99, orin: 99, kaelith: 99, lyra: 99,
  });
  const weaponsUnlocked = mergeBooleanRecord(base.weaponsUnlocked, source.weaponsUnlocked);
  const weaponTiers = mergeNumericRecord(base.weaponTiers, source.weaponTiers, {
    clay_blade: 20, belfry_greatsword: 20, eclipse_daggers: 20,
    ash_halberd: 20, scythe_eclipse: 20, twin_hammers: 20,
  });
  const talentMax = Object.fromEntries(
    Object.entries(TALENTS_DEF).map(([key, def]) => [key, def.max])
  ) as Partial<Record<keyof typeof base.talents, number>>;
  const talents = mergeNumericRecord(base.talents, source.talents, talentMax);

  const assigned = mergeStringList(source.npcsAssigned, base.npcsAssigned, new Set(Object.keys(NPCS_DEF)), 5)
    .filter((id) => npcsUnlocked[id as keyof typeof npcsUnlocked]);
  const validWeapon = typeof source.weapon === 'string' && source.weapon in WEAPONS_DEF
    ? source.weapon as WeaponKey
    : base.weapon;
  const weapon = weaponsUnlocked[validWeapon] ? validWeapon : base.weapon;
  const rawSettings = isPlainRecord(source.settings) ? source.settings : {};
  const rawBindings = isPlainRecord(rawSettings.keyBindings) ? rawSettings.keyBindings : {};
  const keyBindings = { ...DEFAULT_KEY_BINDINGS };
  for (const key of Object.keys(DEFAULT_KEY_BINDINGS) as Array<keyof typeof DEFAULT_KEY_BINDINGS>) {
    const value = rawBindings[key];
    if (typeof value === 'string' && value.length > 0 && value.length <= 40) keyBindings[key] = value;
  }

  const settings = { ...DEFAULT_SETTINGS, keyBindings };
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof typeof DEFAULT_SETTINGS>) {
    if (key === 'keyBindings') continue;
    const value = rawSettings[key];
    const fallback = DEFAULT_SETTINGS[key];
    if (typeof fallback === 'boolean') {
      if (typeof value === 'boolean') (settings as unknown as Record<string, unknown>)[key] = value;
    } else if (typeof fallback === 'number') {
      const limits: Record<string, [number, number]> = {
        masterVolume: [0, 1], sfxVolume: [0, 1], ambientVolume: [0, 1],
        musicVolume: [0, 1], screenShakeScale: [0, 3], pcLauncherPort: [1, 65535],
      };
      const [min, max] = limits[key] ?? [0, 1];
      (settings as Record<string, unknown>)[key] = safeNumber(value, fallback, min, max, key === 'pcLauncherPort');
    } else if (key === 'artStyle' && (value === 'classic' || value === 'cinematic')) {
      settings.artStyle = value;
    } else if (key === 'difficulty' && typeof value === 'string' && value in DIFFICULTIES_DEF) {
      (settings as Record<string, unknown>)[key] = value;
    } else if (['bloodIntensity', 'fogQuality', 'vfxQuality'].includes(key)
      && (value === 'high' || value === 'medium' || value === 'off')) {
      (settings as Record<string, unknown>)[key] = value;
    }
  }

  const rawRecords = isPlainRecord(source.records) ? source.records : {};
  const records = { ...base.records };
  for (const key of Object.keys(base.records) as Array<keyof typeof base.records>) {
    records[key] = safeNumber(rawRecords[key], base.records[key]);
  }
  const runHistory = mergeRunHistory(source.runHistory);
  const runBests = runHistory.reduce(updateRunBests, mergeNumericRecord(EMPTY_RUN_BESTS, source.runBests));
  const rawBestiary = isPlainRecord(source.bestiaryKills) ? source.bestiaryKills : {};
  const bestiaryKills: SaveData['bestiaryKills'] = {};
  for (const kind of ENEMY_KINDS) {
    const value = rawBestiary[kind];
    if (value !== undefined) bestiaryKills[kind] = safeNumber(value, 0);
  }

  return {
    ...base,
    version: 2,
    res,
    buildings,
    npcsUnlocked,
    npcsAssigned: assigned.length ? assigned as NpcKey[] : base.npcsAssigned,
    npcLevels,
    oath: typeof source.oath === 'string' && OATH_KEYS.includes(source.oath as typeof OATH_KEYS[number])
      ? source.oath as SaveData['oath'] : base.oath,
    weapon,
    armorSkin: typeof source.armorSkin === 'string' && ARMOR_SKINS.includes(source.armorSkin as typeof ARMOR_SKINS[number])
      ? source.armorSkin as SaveData['armorSkin'] : base.armorSkin,
    weaponsUnlocked,
    weaponTiers,
    talents,
    ascensionLevel: safeNumber(source.ascensionLevel, 0, 0, 5),
    maxAscensionUnlocked: safeNumber(source.maxAscensionUnlocked, 0, 0, 5),
    loreUnlocked: mergeStringList(source.loreUnlocked, base.loreUnlocked),
    bestiaryKills,
    questsClaimed: mergeStringList(source.questsClaimed, []),
    achievementsUnlocked: mergeStringList(
      source.achievementsUnlocked, [], new Set(ACHIEVEMENTS_DEF.map((item) => item.id))
    ),
    muted: typeof source.muted === 'boolean' ? source.muted : base.muted,
    settings,
    records,
    runHistory,
    runBests,
  };
}

/** Garde une copie d'une sauvegarde qu'on ne sait pas lire, sans jamais remplacer une copie déjà gardée. */
function keepAside(key: string, raw: string): void {
  try {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
  } catch {
    // stockage plein ou indisponible : rien de plus à faire
  }
}

export function loadSave(): SaveData {
  try {
    if (typeof localStorage === 'undefined') return defaultSave();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fichier abîmé : la prochaine sauvegarde va l'écraser, on en garde donc une copie.
      keepAside(`${SAVE_KEY}.corrupt`, raw);
      return defaultSave();
    }
    if (isPlainRecord(parsed)) {
      const verdict = inspectSaveVersion(parsed.version);
      // Écrite par une version plus récente du jeu : on la garde de côté avant de repartir d'une sauvegarde neuve.
      if (verdict.status === 'newer') keepAside(`${SAVE_KEY}.newer-v${verdict.version}`, raw);
    }
    return mergeSave(parsed as Partial<SaveData>);
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

export function createRunState(
  save: SaveData,
  rng: () => number = Math.random,
  isTraining = false
): RunState {
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

  // Generate merchant stock (+1 choice if Sanctuaire des Runes is built)
  const stockCount = 3 + ((save.buildings.sanctuaire || 0) > 0 ? 1 : 0);
  const pool = [...RELICS_POOL].filter((r) => !relics.includes(r.id));
  const merchantStock = pool
    .sort(() => rng() - 0.5)
    .slice(0, stockCount)
    .map((r) => r.id);

  return {
    depth: 1,
    isTraining,
    ascensionLevel: isTraining ? 0 : Math.min(save.ascensionLevel || 0, 5),
    blessings: [],
    relics,
    activeSynergies: [],
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
    perfectDodges: 0,
    comboHits: 0,
    peakComboHits: 0,
    comboTimer: 0,
    damageTaken: 0,
    damageDealt: 0,
    elapsedSec: 0,
    secondWindUsed: false,
    critNextAttack: false,
    merchantStock,
  };
}

export function computeActiveSynergies(run: Pick<RunState, 'blessings' | 'relics'>): string[] {
  const owned = new Set([...run.blessings, ...run.relics]);
  return SYNERGIES_POOL.filter((s) => owned.has(s.requires[0]) && owned.has(s.requires[1])).map((s) => s.id);
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
  m += (run.ascensionLevel || 0) * 0.15;
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

export function applyEnemyDamage(run: RunState, enemy: Pick<Enemy, 'hp'>, damage: number): void {
  // Count health actually lost without changing the existing damage and kill order.
  run.damageDealt += Math.min(Math.max(0, enemy.hp), damage);
  enemy.hp -= damage;
}

export function bankRunIntoSave(save: SaveData, run: RunState, result: boolean | RunOutcome): SaveData {
  if (run.isTraining) return save;
  const outcome = typeof result === 'boolean' ? (result ? 'victory' : 'defeat') : result;
  const victory = outcome === 'victory';
  const record: RunRecord = {
    outcome,
    depthReached: run.depth,
    kills: run.kills,
    parries: run.parries,
    perfectDodges: run.perfectDodges,
    bestParryStreak: run.bestParryStreak,
    damageTaken: Math.round(run.damageTaken),
    damageDealt: Math.round(run.damageDealt),
    peakComboHits: run.peakComboHits,
    elapsedSec: Math.round(run.elapsedSec),
    ascensionLevel: run.ascensionLevel,
  };
  const prod = calculateBastionProduction(save);
  const nextAscensionUnlocked =
    victory && (save.ascensionLevel || 0) >= (save.maxAscensionUnlocked || 0)
      ? Math.min(5, (save.maxAscensionUnlocked || 0) + 1)
      : save.maxAscensionUnlocked || 0;

  const next: SaveData = {
    ...save,
    maxAscensionUnlocked: nextAscensionUnlocked,
    runHistory: [record, ...save.runHistory].slice(0, MAX_RUN_HISTORY),
    runBests: updateRunBests(save.runBests, record),
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
  return evaluateAchievements(next).save;
}

export function evaluateAchievements(save: SaveData): { save: SaveData; unlocked: string[] } {
  const already = new Set(save.achievementsUnlocked || []);
  const newlyUnlocked: string[] = [];
  let bonusCendres = 0;

  for (const ach of ACHIEVEMENTS_DEF) {
    if (!already.has(ach.id) && ach.check(save)) {
      already.add(ach.id);
      newlyUnlocked.push(ach.title);
      if (ach.rewardCendres) bonusCendres += ach.rewardCendres;
    }
  }

  if (newlyUnlocked.length === 0) {
    return { save, unlocked: [] };
  }

  return {
    unlocked: newlyUnlocked,
    save: {
      ...save,
      res: {
        ...save.res,
        cendres: save.res.cendres + bonusCendres,
      },
      achievementsUnlocked: Array.from(already),
    },
  };
}

export function isSkinUnlocked(save: SaveData, skin: ArmorSkinKey): boolean {
  if (skin === 'eclipse') return true;
  if (skin === 'crimson') return (save.achievementsUnlocked || []).includes('ach_slayer_25');
  if (skin === 'solaire') return (save.achievementsUnlocked || []).includes('ach_parry_25');
  if (skin === 'astral') return (save.achievementsUnlocked || []).includes('ach_victory_1');
  return false;
}

export function exportSaveJson(save: SaveData): string {
  return JSON.stringify(save, null, 2);
}

export function importSaveJson(rawText: string): SaveData | null {
  try {
    if (typeof rawText !== 'string' || rawText.length === 0 || rawText.length > 512 * 1024) {
      return null;
    }
    const parsed: unknown = JSON.parse(rawText);
    if (!isPlainRecord(parsed) || !isPlainRecord(parsed.res) || !isPlainRecord(parsed.buildings)) {
      return null;
    }
    // Older saves without a version are treated as legacy exports of the current version.
    const verdict = inspectSaveVersion(parsed.version);
    if (verdict.status === 'invalid' || verdict.status === 'newer') return null;
    return mergeSave(parsed as unknown as Partial<SaveData>);
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
