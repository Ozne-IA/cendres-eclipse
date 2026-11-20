export type GamePhase =
  | 'title'
  | 'bastion'
  | 'playing'
  | 'blessing'
  | 'merchant'
  | 'paused'
  | 'gameover';

export type ResourceKey = 'cendres' | 'fer' | 'larmes';

export type BuildingKey = 'foyer' | 'forge' | 'autel' | 'vigie' | 'refuge' | 'sanctuaire';

export type NpcKey = 'vaelen' | 'meryl' | 'orin' | 'kaelith' | 'lyra';

export type OathKey = 'argile' | 'sang' | 'airain' | 'eclipse' | 'pelerin';

export type DifficultyMode = 'pilgrim' | 'awakened' | 'eclipse';

export type KeyAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'dash'
  | 'attack'
  | 'heavy'
  | 'parry'
  | 'skill'
  | 'heal'
  | 'interact';

export type KeyBindings = Record<KeyAction, string>;

export type QualityLevel = 'high' | 'medium' | 'off';

export type ArmorSkinKey = 'eclipse' | 'crimson' | 'solaire' | 'astral';

export interface GameSettings {
  difficulty: DifficultyMode;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  ambientDrone: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  screenShakeScale: number;
  hitstopEnabled: boolean;
  reduceFlashes: boolean;
  gamepadRumble: boolean;
  bloodIntensity: QualityLevel;
  fogQuality: QualityLevel;
  vfxQuality: QualityLevel;
  parallaxEnabled: boolean;
  showDamageNumbers: boolean;
  showEnemyBars: boolean;
  showMinimap: boolean;
  showFps: boolean;
  highContrastTelegraphs: boolean;
  keyBindings: KeyBindings;
  pcLauncherPort: number;
  pcAppMode: boolean;
}

export interface RoomAffix {
  id: string;
  name: string;
  desc: string;
  color: string;
}

export type WeaponKey =
  | 'clay_blade'
  | 'belfry_greatsword'
  | 'eclipse_daggers'
  | 'ash_halberd'
  | 'scythe_eclipse'
  | 'twin_hammers';

export type TalentKey =
  | 'parry_mastery'
  | 'execution_siphon'
  | 'ash_reserves'
  | 'second_wind'
  | 'mist_reflex'
  | 'relic_attunement';

export type EnemyKind =
  | 'penitent'
  | 'watcher'
  | 'flagellant'
  | 'lancer'
  | 'arbalest'
  | 'specter'
  | 'pyromancer'
  | 'archon'
  | 'mother'
  | 'sovereign';

export type EliteTrait = 'none' | 'swift' | 'blazing' | 'armored';

export interface ResourceBag {
  cendres: number;
  fer: number;
  larmes: number;
}

export interface SaveRecords {
  bestDepth: number;
  runs: number;
  victories: number;
  totalKills: number;
  totalParries: number;
  maxParryStreak: number;
  bossesSlain: number;
  totalPlaySec: number;
}

export interface SaveData {
  version: number;
  res: ResourceBag;
  buildings: Record<BuildingKey, number>;
  npcsUnlocked: Record<NpcKey, boolean>;
  npcsAssigned: NpcKey[];
  npcLevels: Record<NpcKey, number>;
  oath: OathKey;
  weapon: WeaponKey;
  armorSkin: ArmorSkinKey;
  ascensionLevel: number;
  maxAscensionUnlocked: number;
  weaponsUnlocked: Record<WeaponKey, boolean>;
  weaponTiers: Record<WeaponKey, number>;
  talents: Record<TalentKey, number>;
  loreUnlocked: string[];
  bestiaryKills: Partial<Record<EnemyKind, number>>;
  questsClaimed: string[];
  achievementsUnlocked: string[];
  muted: boolean;
  settings: GameSettings;
  records: SaveRecords;
}

export interface BuildingDef {
  key: BuildingKey;
  name: string;
  desc: string;
  max: number;
  baseCost: Partial<ResourceBag>;
}

export interface NpcDef {
  key: NpcKey;
  name: string;
  role: string;
  desc: string;
  unlockDesc: string;
  baseBonus: Partial<ResourceBag>;
}

export interface OathDef {
  key: OathKey;
  name: string;
  subtitle: string;
  desc: string;
}

export interface WeaponDef {
  key: WeaponKey;
  name: string;
  style: string;
  desc: string;
  artName: string;
  artDesc: string;
  artCooldown: number;
  artStamCost: number;
  unlockCost: Partial<ResourceBag>;
  dmgMult: number;
  speedMult: number;
  reachPx: number;
  staggerMult: number;
  critChance: number;
}

export interface SynergyDef {
  id: string;
  name: string;
  requires: [string, string];
  desc: string;
  color: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  rewardSkin?: ArmorSkinKey;
  rewardCendres?: number;
  check: (save: SaveData) => boolean;
}

export interface TalentDef {
  key: TalentKey;
  name: string;
  desc: string;
  max: number;
  costLarmes: number;
}

export interface BlessingDef {
  id: string;
  aspect: 'Flamme' | 'Brume' | 'Airain' | 'Lune';
  name: string;
  desc: string;
}

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  costCendres: number;
}

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  reward: Partial<ResourceBag>;
  check: (save: SaveData) => { current: number; target: number };
}

export interface LoreEntry {
  id: string;
  title: string;
  author: string;
  text: string;
}

export interface BiomeDef {
  id: string;
  name: string;
  skyTop: string;
  skyBot: string;
  stone: string;
  trim: string;
  fogColor: string;
  accentColor: string;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'solid' | 'oneway' | 'crumble' | 'moving' | 'bounce';
  crumbleT?: number;
  broken?: boolean;
  respawnT?: number;
  baseX?: number;
  baseY?: number;
  moveRangeX?: number;
  moveRangeY?: number;
  moveSpeed?: number;
  phase?: number;
  vx?: number;
  vy?: number;
}

export interface Hazard {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'spikes' | 'flamejet' | 'pendulum';
  timer: number;
  active: boolean;
  pivotX?: number;
  pivotY?: number;
  length?: number;
  angle?: number;
}

export interface RoomProp {
  id: string;
  type: 'chest' | 'gilded_chest' | 'npc' | 'brazier' | 'shrine' | 'merchant' | 'lore' | 'urn' | 'exit';
  x: number;
  y: number;
  w: number;
  h: number;
  opened?: boolean;
  used?: boolean;
  broken?: boolean;
  locked?: boolean;
  npcId?: NpcKey;
  loreId?: string;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  dmg: number;
  stagger: number;
  maxStagger: number;
  state: 'idle' | 'windup' | 'attack' | 'staggered' | 'recover' | 'dead';
  stateT: number;
  cd: number;
  color: string;
  isBoss: boolean;
  flying?: boolean;
  shielded?: boolean;
  elite: EliteTrait;
  phase: 1 | 2;
  hitFlashT: number;
  burnT: number;
  burnTickT: number;
  sunderT: number;
  chillT: number;
  deadT: number;
  attackPattern: number;
  walkPhase: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  friendly: boolean;
  color: string;
  kind: 'orb' | 'bolt' | 'crescent' | 'eruption';
  telegraphT?: number;
  life: number;
}

export interface RoomData {
  depth: number;
  isBoss: boolean;
  biome: BiomeDef;
  affix?: RoomAffix | null;
  width: number;
  height: number;
  groundY: number;
  platforms: Platform[];
  hazards: Hazard[];
  props: RoomProp[];
  enemies: Enemy[];
  projectiles: Projectile[];
  torches: Array<{ x: number; y: number }>;
}

export type AttackMove = 'light1' | 'light2' | 'light3' | 'heavy' | 'plunge' | 'launcher' | 'dash_strike';

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  onWall: -1 | 0 | 1;
  coyote: number;
  jumpBuf: number;
  attackBuf: boolean;
  dashBuf: boolean;
  jumpsLeft: number;
  dashesLeft: number;
  dashT: number;
  dashCd: number;
  invulnT: number;
  hitFlashT: number;
  attackT: number;
  attackTotalT: number;
  attackMove: AttackMove;
  comboStep: 0 | 1 | 2;
  comboResetT: number;
  attackHitIds: Set<number>;
  parryT: number;
  guardT: number;
  parryCd: number;
  stamRegenDelay: number;
  healT: number;
  squashX: number;
  squashY: number;
  walkCycle: number;
  capeWave: number;
  afterimages: Array<{ x: number; y: number; alpha: number; facing: 1 | -1 }>;
  wispAngle: number;
  wispCd: number;
  riposteBuffT: number;
  skillCd: number;
  skillMaxCd: number;
}

export interface RunState {
  depth: number;
  isTraining?: boolean;
  ascensionLevel: number;
  blessings: string[];
  relics: string[];
  activeSynergies: string[];
  maxHp: number;
  hp: number;
  ghostHp: number;
  maxStam: number;
  stam: number;
  maxFlasks: number;
  flasks: number;
  loot: ResourceBag;
  kills: number;
  parries: number;
  parryStreak: number;
  bestParryStreak: number;
  perfectDodges: number;
  comboHits: number;
  comboTimer: number;
  damageTaken: number;
  elapsedSec: number;
  secondWindUsed: boolean;
  critNextAttack: boolean;
  merchantStock: string[];
}

export interface RunSummary {
  victory: boolean;
  depthReached: number;
  kills: number;
  parries: number;
  bestParryStreak: number;
  damageTaken: number;
  elapsedSec: number;
  loot: ResourceBag;
  bossNameRemaining?: string;
  bossHpPct?: number;
}

export interface HudSnapshot {
  hp: number;
  ghostHp: number;
  maxHp: number;
  stam: number;
  maxStam: number;
  flasks: number;
  maxFlasks: number;
  depth: number;
  isTraining?: boolean;
  ascensionLevel: number;
  biomeName: string;
  cendresTotal: number;
  ferTotal: number;
  larmesTotal: number;
  runCendres: number;
  blessings: string[];
  relics: string[];
  activeSynergies: string[];
  weaponName: string;
  weaponArtName: string;
  skillCd: number;
  skillMaxCd: number;
  parryStreak: number;
  comboHits: number;
  comboRank: string;
  affixName?: string;
  affixDesc?: string;
  fps?: number;
  showFps: boolean;
  inputMode: string;
  promptText: string;
  achievementToast?: string;
  boss: {
    name: string;
    hp: number;
    maxHp: number;
    stagger: number;
    maxStagger: number;
    phase: 1 | 2;
  } | null;
  banner: {
    title: string;
    sub: string;
    color: string;
    visible: boolean;
  };
}

export interface InputState {
  moveX: number;
  jump: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
  dash: boolean;
  attack: boolean;
  heavy: boolean;
  parry: boolean;
  parryHeld: boolean;
  skill: boolean;
  heal: boolean;
  interact: boolean;
  pause: boolean;
  mute: boolean;
  down: boolean;
  upHeld: boolean;
}
