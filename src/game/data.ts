import type {
  BiomeDef,
  BlessingDef,
  BuildingDef,
  BuildingKey,
  DifficultyMode,
  EnemyKind,
  GameSettings,
  KeyBindings,
  LoreEntry,
  NpcDef,
  NpcKey,
  OathDef,
  OathKey,
  QuestDef,
  RelicDef,
  RoomAffix,
  TalentDef,
  TalentKey,
  WeaponDef,
  WeaponKey,
} from './types';

export const SAVE_KEY = 'cendres_eclipse_save_v2';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  jump: 'Space',
  dash: 'ShiftLeft',
  attack: 'KeyJ',
  heavy: 'KeyF',
  parry: 'KeyK',
  heal: 'KeyR',
  interact: 'KeyE',
};

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'awakened',
  masterVolume: 0.85,
  sfxVolume: 0.9,
  ambientVolume: 0.55,
  ambientDrone: true,
  screenShakeScale: 1.0,
  hitstopEnabled: true,
  bloodIntensity: 'high',
  fogQuality: 'high',
  parallaxEnabled: true,
  showDamageNumbers: true,
  showMinimap: true,
  showFps: false,
  highContrastTelegraphs: false,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  pcLauncherPort: 4173,
  pcAppMode: true,
};

export const DIFFICULTIES_DEF: Record<
  DifficultyMode,
  {
    key: DifficultyMode;
    name: string;
    subtitle: string;
    desc: string;
    enemyHpMult: number;
    enemyDmgMult: number;
    lootMult: number;
    parryBonusSec: number;
  }
> = {
  pilgrim: {
    key: 'pilgrim',
    name: 'Pèlerin',
    subtitle: 'Exploration & Apprentissage',
    desc: 'Ennemis -15% dégâts et PV, fenêtre de parade élargie (+45ms). Idéal pour découvrir les strates.',
    enemyHpMult: 0.85,
    enemyDmgMult: 0.8,
    lootMult: 0.9,
    parryBonusSec: 0.045,
  },
  awakened: {
    key: 'awakened',
    name: 'Éveillé',
    subtitle: 'Expérience Recommandée',
    desc: 'L’équilibre original d’acier, de posture et d’exigence dark fantasy.',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    lootMult: 1.0,
    parryBonusSec: 0,
  },
  eclipse: {
    key: 'eclipse',
    name: "Cauchemar de l'Éclipse",
    subtitle: 'Défi Impitoyable',
    desc: 'Ennemis +30% PV & +35% dégâts, mais +45% Cendres et Fer Noir récoltés.',
    enemyHpMult: 1.3,
    enemyDmgMult: 1.35,
    lootMult: 1.45,
    parryBonusSec: -0.02,
  },
};

export const ROOM_AFFIXES: RoomAffix[] = [
  {
    id: 'ember_wind',
    name: 'Vent de Braise',
    desc: '+15% chance critique pour tous les combattants.',
    color: '#ff9842',
  },
  {
    id: 'iron_eclipse',
    name: 'Éclipse d’Airain',
    desc: 'La posture des ennemis se brise 20% plus vite.',
    color: '#ffd470',
  },
  {
    id: 'blood_moon',
    name: 'Lune Écarlate',
    desc: '+30% Cendres récoltées dans cette strate.',
    color: '#d9485b',
  },
  {
    id: 'abyssal_haze',
    name: 'Brume Abyssale',
    desc: 'Régénération du Souffle +25% plus rapide.',
    color: '#8ab8e6',
  },
  {
    id: 'tempered_ash',
    name: 'Cendre Trempée',
    desc: 'Déplacements et esquives +12% plus vifs.',
    color: '#d4a853',
  },
];

export const BUILDINGS_DEF: Record<BuildingKey, BuildingDef> = {
  foyer: {
    key: 'foyer',
    name: 'Foyer Éternel',
    desc: '+20 Vitalité max et +12 Souffle max par niveau.',
    max: 5,
    baseCost: { cendres: 35, fer: 2 },
  },
  forge: {
    key: 'forge',
    name: 'Forge des Ombres',
    desc: '+18% dégâts de lame et +15% dégâts de riposte par niveau.',
    max: 5,
    baseCost: { cendres: 40, fer: 3 },
  },
  autel: {
    key: 'autel',
    name: 'Autel de Sève',
    desc: '+1 Fiole de Sève Ardente (niv 1, 3, 5) et +12 soin par niveau.',
    max: 5,
    baseCost: { cendres: 45, larmes: 1 },
  },
  vigie: {
    key: 'vigie',
    name: 'Tour de Vigie',
    desc: '+15% ressources récoltées et meilleures chances de Fer/Larmes.',
    max: 5,
    baseCost: { cendres: 35, fer: 2, larmes: 1 },
  },
  refuge: {
    key: 'refuge',
    name: 'Refuge des Errants',
    desc: 'Débloque des emplacements pour assigner des survivants secourus.',
    max: 5,
    baseCost: { cendres: 50, fer: 3 },
  },
  sanctuaire: {
    key: 'sanctuaire',
    name: 'Sanctuaire des Runes',
    desc: 'Octroie +15 Cendres de départ par niveau et +1 choix de Relique.',
    max: 3,
    baseCost: { cendres: 65, fer: 3, larmes: 2 },
  },
};

export const NPCS_DEF: Record<NpcKey, NpcDef> = {
  vaelen: {
    key: 'vaelen',
    name: 'Vaelen le Forgeron',
    role: 'Maître d’Armes',
    desc: 'Forge du Fer Noir après chaque expédition (+2 par niveau d’affinité).',
    unlockDesc: 'Débloqué au Bastion dès le début.',
    baseBonus: { fer: 2 },
  },
  meryl: {
    key: 'meryl',
    name: 'Sœur Méryl',
    role: 'Apothicaire',
    desc: 'Distille des Cendres purifiées après chaque expédition (+32 par niveau).',
    unlockDesc: 'À secourir dans les Strates de l’Abîme.',
    baseBonus: { cendres: 32 },
  },
  orin: {
    key: 'orin',
    name: 'Orin le Veilleur',
    role: 'Éclaireur',
    desc: 'Récolte des Larmes de Lune après chaque expédition (+1 par niveau).',
    unlockDesc: 'À secourir dans les Strates de l’Abîme.',
    baseBonus: { larmes: 1 },
  },
  kaelith: {
    key: 'kaelith',
    name: 'Kaelith l’Alchimiste',
    role: 'Transmutateur',
    desc: 'Synthétise +25 Cendres et +1 Fer Noir après chaque expédition.',
    unlockDesc: 'À secourir dans les Strates profondes.',
    baseBonus: { cendres: 25, fer: 1 },
  },
  lyra: {
    key: 'lyra',
    name: 'Lyra l’Archiviste',
    role: 'Gardienne des Stèles',
    desc: 'Préserve +20 Cendres et +1 Larme de Lune après chaque expédition.',
    unlockDesc: 'À secourir dans les Strates profondes.',
    baseBonus: { cendres: 20, larmes: 1 },
  },
};

export const OATHS_DEF: Record<OathKey, OathDef> = {
  argile: {
    key: 'argile',
    name: "Serment d'Argile",
    subtitle: 'Voie Équilibrée',
    desc: 'Équilibré. Aucun malus, progression classique.',
  },
  sang: {
    key: 'sang',
    name: 'Serment de Sang',
    subtitle: 'Pacte de Risque',
    desc: '+45% Cendres & Butin, mais -25% Vitalité max.',
  },
  airain: {
    key: 'airain',
    name: "Serment d'Airain",
    subtitle: 'Maître de Déviation',
    desc: 'Fenêtre de parade élargie et +40% dégâts de posture, mais régénération du Souffle réduite (-22%).',
  },
  eclipse: {
    key: 'eclipse',
    name: "Serment de l'Éclipse",
    subtitle: 'Fureur Solaire',
    desc: '+28% dégâts infligés et +15% critique, mais vous subissez +25% dégâts.',
  },
  pelerin: {
    key: 'pelerin',
    name: 'Serment du Pèlerin',
    subtitle: 'Marcheur d’Ombre',
    desc: '+15% vitesse de déplacement et roulade gratuite toutes les 4s, mais -1 Fiole de Sève.',
  },
};

export const WEAPONS_DEF: Record<WeaponKey, WeaponDef> = {
  clay_blade: {
    key: 'clay_blade',
    name: "Lame d'Argile",
    style: 'Épée Bâtarde · Polyvalente',
    desc: 'Équilibre parfait entre vitesse, allonge et dégâts de posture.',
    unlockCost: {},
    dmgMult: 1.0,
    speedMult: 1.0,
    reachPx: 58,
    staggerMult: 1.0,
    critChance: 0.08,
  },
  belfry_greatsword: {
    key: 'belfry_greatsword',
    name: 'Espadon du Beffroi',
    style: 'Lame Lourde · Brise-Posture',
    desc: 'Coups vastes à fort impact qui brisent les boucliers et la posture.',
    unlockCost: { cendres: 110, fer: 5 },
    dmgMult: 1.38,
    speedMult: 0.78,
    reachPx: 76,
    staggerMult: 1.45,
    critChance: 0.1,
  },
  eclipse_daggers: {
    key: 'eclipse_daggers',
    name: "Dagues d'Éclipse",
    style: 'Doubles Lames · Critique',
    desc: 'Enchaînements fulgurants, coût en Souffle réduit et haut taux critique.',
    unlockCost: { cendres: 120, fer: 4, larmes: 1 },
    dmgMult: 0.82,
    speedMult: 1.35,
    reachPx: 46,
    staggerMult: 0.85,
    critChance: 0.24,
  },
  ash_halberd: {
    key: 'ash_halberd',
    name: 'Hallebarde Cendrée',
    style: 'Arme d’Hast · Allonge',
    desc: 'Maintient les ennemis à distance avec une allonge supérieure.',
    unlockCost: { cendres: 145, fer: 6, larmes: 2 },
    dmgMult: 1.15,
    speedMult: 0.92,
    reachPx: 88,
    staggerMult: 1.18,
    critChance: 0.12,
  },
  scythe_eclipse: {
    key: 'scythe_eclipse',
    name: "Faux de l'Éclipse",
    style: 'Fauchon Courbe · Saignement & Critique',
    desc: 'Large balayage lunaire aux coups critiques dévastateurs et haute portée.',
    unlockCost: { cendres: 170, fer: 6, larmes: 2 },
    dmgMult: 1.24,
    speedMult: 1.05,
    reachPx: 82,
    staggerMult: 1.05,
    critChance: 0.22,
  },
  twin_hammers: {
    key: 'twin_hammers',
    name: "Marteaux d'Airain",
    style: 'Double Impact · Brise-Garde',
    desc: 'Écrase les boucliers et pulvérise la posture ennemie à courte portée.',
    unlockCost: { cendres: 155, fer: 7, larmes: 1 },
    dmgMult: 1.32,
    speedMult: 0.88,
    reachPx: 54,
    staggerMult: 1.68,
    critChance: 0.09,
  },
};

export const TALENTS_DEF: Record<TalentKey, TalentDef> = {
  parry_mastery: {
    key: 'parry_mastery',
    name: 'Œil du Duel',
    desc: '+25ms de fenêtre de déviation parfaite et +10 posture infligée par rang.',
    max: 3,
    costLarmes: 1,
  },
  execution_siphon: {
    key: 'execution_siphon',
    name: 'Siphon d’Exécution',
    desc: 'Les ripostes sur ennemis brisés soignent +6 PV par rang.',
    max: 3,
    costLarmes: 1,
  },
  ash_reserves: {
    key: 'ash_reserves',
    name: 'Bourse de Cendres',
    desc: 'Débute chaque expédition avec +25 Cendres utilisables chez les marchands.',
    max: 3,
    costLarmes: 1,
  },
  second_wind: {
    key: 'second_wind',
    name: 'Dernier Souffle',
    desc: 'Une fois par expédition, survit à un coup fatal avec 30% de Vitalité.',
    max: 1,
    costLarmes: 3,
  },
  mist_reflex: {
    key: 'mist_reflex',
    name: 'Réflexe de Brume',
    desc: 'Octroie un double dash aérien et réduit le temps de recharge de roulade.',
    max: 2,
    costLarmes: 2,
  },
  relic_attunement: {
    key: 'relic_attunement',
    name: 'Harmonie Runique',
    desc: 'Débute chaque expédition avec une Relique aléatoire gratuite.',
    max: 1,
    costLarmes: 3,
  },
};

export const BLESSINGS_POOL: BlessingDef[] = [
  { id: 'ember_blade', aspect: 'Flamme', name: 'Lame Embrasée', desc: '+25% dégâts sur toutes les attaques.' },
  { id: 'cinder_burn', aspect: 'Flamme', name: 'Marque de Braise', desc: 'Les attaques lourdes embrasent les ennemis (30 dégâts sur 3s).' },
  { id: 'pyre_finisher', aspect: 'Flamme', name: 'Bûcher du Troisième Coup', desc: 'Le 3e coup du combo déclenche une explosion de cendres (+40% zone).' },
  { id: 'mist_step', aspect: 'Brume', name: 'Pas de Brume', desc: 'Roulade coûte 35% moins de Souffle et parcourt 25% plus loin.' },
  { id: 'shadow_ambush', aspect: 'Brume', name: 'Entaille Fantôme', desc: 'Après une roulade, votre prochaine attaque est un coup critique garanti (1.75x).' },
  { id: 'wind_dancer', aspect: 'Brume', name: 'Danse des Cimes', desc: '+1 saut aérien supplémentaire et +20% dégâts en attaque plongeante.' },
  { id: 'thunder_parry', aspect: 'Airain', name: 'Déviation Foudroyante', desc: 'Une parade parfaite déclenche une onde de choc (38 dégâts).' },
  { id: 'iron_lungs', aspect: 'Airain', name: "Souffle d'Airain", desc: '+35 Souffle max et +30% régénération d’endurance.' },
  { id: 'sunder_steel', aspect: 'Airain', name: 'Acier Fissuré', desc: 'Les attaques brisent l’armure ennemie (+25% dégâts subis pendant 4s).' },
  { id: 'fortress_guard', aspect: 'Airain', name: 'Rempart d’Ébène', desc: 'La posture infligée par vos parades et attaques lourdes augmente de 45%.' },
  { id: 'vampiric', aspect: 'Lune', name: 'Sève Vampirique', desc: 'Chaque ennemi vaincu restaure 8 points de Vitalité.' },
  { id: 'vital_vessel', aspect: 'Lune', name: "Vase d'Argile Pur", desc: '+45 Vitalité max et soigne immédiatement 45 PV.' },
  { id: 'greed', aspect: 'Lune', name: "Œil de l'Éclipse", desc: '+40% Cendres obtenues durant cette expédition.' },
  { id: 'lunar_frost', aspect: 'Lune', name: 'Givre Lunaire', desc: 'Vos frappes ralentissent les ennemis et leurs télégraphes de 25%.' },
  { id: 'orbital_wisp', aspect: 'Flamme', name: 'Feu Follet d’Éclipse', desc: 'Un esprit de braise orbite autour de vous et tire sur les ennemis proches.' },
  { id: 'blood_flask', aspect: 'Lune', name: 'Calice Renouvelé', desc: 'Gagne +1 Fiole de Sève Ardente et +20% efficacité de soin.' },
  { id: 'crimson_frenzy', aspect: 'Flamme', name: 'Frénésie Écarlate', desc: '+22% dégâts lorsque votre Vitalité est inférieure à 50%.' },
  { id: 'wall_tempest', aspect: 'Brume', name: 'Élan des Cimes', desc: 'Les sauts muraux et attaques en roulade gagnent +30% dégâts.' },
  { id: 'bronze_counter', aspect: 'Airain', name: 'Riposte Solaire', desc: 'Après une déviation parfaite, votre prochaine frappe est critique garantie.' },
  { id: 'ash_echo', aspect: 'Lune', name: 'Écho de Cendre', desc: 'Tuer un ennemi restaure 18 Souffle et accélère la roulade.' },
];

export const RELICS_POOL: RelicDef[] = [
  { id: 'ember_ring', name: 'Anneau de Braise', desc: '+15% dégâts de mêlée et projectiles renvoyés enflammés.', costCendres: 45 },
  { id: 'cracked_hourglass', name: 'Sablier Fendu', desc: 'Réduit de 25% le temps de recharge du dash et de la parade.', costCendres: 50 },
  { id: 'obsidian_eye', name: "Œil d'Obsidienne", desc: '+12% chance de coup critique sur toutes les frappes.', costCendres: 55 },
  { id: 'raven_feather', name: 'Plume de Corbeau', desc: '+18% vitesse de déplacement et hauteur de saut accrue.', costCendres: 40 },
  { id: 'chalice_shard', name: 'Éclat de Calice', desc: 'Restaure 12 PV à l’entrée de chaque nouvelle Strate.', costCendres: 45 },
  { id: 'iron_crown', name: "Couronne d'Airain", desc: 'Réduit de 18% les dégâts subis.', costCendres: 60 },
  { id: 'cinder_magnet', name: 'Sceau du Collecteur', desc: '+25% Cendres et +15% chance de Fer Noir.', costCendres: 45 },
  { id: 'bell_clapper', name: 'Battant du Beffroi', desc: '+30% dégâts sur les ennemis brisés (Riposte).', costCendres: 55 },
  { id: 'blood_medal', name: 'Médaillon de Sang', desc: 'Vos frappes critiques restaurent 4 Vitalité.', costCendres: 60 },
  { id: 'eclipse_mirror', name: "Miroir d'Éclipse", desc: '+20% dégâts de posture sur toutes vos attaques et parades.', costCendres: 52 },
  { id: 'wind_spur', name: 'Éperon de Vent', desc: 'Réduit le coût en Souffle de la roulade et accélère les attaques (+10%).', costCendres: 48 },
];

export const BIOMES: BiomeDef[] = [
  {
    id: 'catacombes',
    name: 'Catacombes de Cendre',
    skyTop: '#0e0a12',
    skyBot: '#21141a',
    stone: '#2a2229',
    trim: '#624b3a',
    fogColor: 'rgba(224, 107, 43, 0.08)',
    accentColor: '#d4a853',
  },
  {
    id: 'viaduc',
    name: 'Viaduc des Écorchés',
    skyTop: '#0a1018',
    skyBot: '#182530',
    stone: '#222b35',
    trim: '#526575',
    fogColor: 'rgba(122, 184, 255, 0.07)',
    accentColor: '#8db9dc',
  },
  {
    id: 'fleche',
    name: "Flèche d'Obsidienne",
    skyTop: '#16090f',
    skyBot: '#2b1019',
    stone: '#281920',
    trim: '#87444b',
    fogColor: 'rgba(196, 59, 77, 0.09)',
    accentColor: '#d95364',
  },
  {
    id: 'sanctuaire',
    name: "Cœur de l'Éclipse",
    skyTop: '#120b08',
    skyBot: '#2e1a10',
    stone: '#2e241d',
    trim: '#b8883b',
    fogColor: 'rgba(255, 212, 112, 0.09)',
    accentColor: '#ffd470',
  },
];

export const ENEMY_LORE: Record<EnemyKind, { title: string; tier: string; desc: string }> = {
  penitent: {
    title: "Pénitent d'Os",
    tier: 'Errant',
    desc: 'Anciens pèlerins calcinés qui chargent au corps à corps dès qu’ils décèlent la chaleur d’un être d’argile.',
  },
  watcher: {
    title: 'Veilleur de Suie',
    tier: 'Aérien',
    desc: 'Sentinelles flottantes crachant des braises déviables. Renvoyez leurs orbes d’une parade précise.',
  },
  flagellant: {
    title: "Flagellant d'Airain",
    tier: 'Colosse',
    desc: 'Porteurs de chaînes lourdes. Leurs frappes sont lentes mais dévastatrices.',
  },
  lancer: {
    title: 'Lancier du Suaire',
    tier: 'Garde',
    desc: 'Protégé frontalement par un pavois de fer. Brisez sa garde par une déviation, une attaque lourde ou un contournement.',
  },
  arbalest: {
    title: 'Arbalétrier Cendré',
    tier: 'Tireur',
    desc: 'Vise longuement avec un trait carmin avant de décocher un carreau rapide à longue portée.',
  },
  specter: {
    title: "Spectre d'Éclipse",
    tier: 'Assassin',
    desc: 'Se dissout dans la cendre pour surgir dans votre dos après un bref scintillement doré.',
  },
  pyromancer: {
    title: 'Acolyte Pyromancien',
    tier: 'Invocateur',
    desc: 'Fait jaillir des geysers de braise sous vos pieds. Surveillez les cercles runiques au sol.',
  },
  archon: {
    title: "L'Archonte du Beffroi",
    tier: 'Gardien (Boss)',
    desc: 'Colosse d’or terni qui manie la cloche du jugement et déchaîne des ondes sismiques en phase 2.',
  },
  mother: {
    title: 'La Mère des Cendres',
    tier: 'Gardienne (Boss)',
    desc: 'Matriarche de suie invoquant des pluies écarlates et des entailles traversantes.',
  },
  sovereign: {
    title: "Le Souverain de l'Éclipse",
    tier: 'Souverain (Boss)',
    desc: 'Incarnation solaire couronnée de lames orbitales. Maître absolu de la Strate 9.',
  },
};

export const LORE_TABLETS: LoreEntry[] = [
  {
    id: 'stele_1',
    title: 'L’Éveil d’Argile',
    author: 'Chroniques du Bastion',
    text: 'Quand le soleil d’airain cessa de tourner, seuls les Éveillés façonnés de cendre et d’argile purent supporter la lueur de l’Éclipse.',
  },
  {
    id: 'stele_2',
    title: 'Le Serment du Beffroi',
    author: 'Vaelen le Forgeron',
    text: 'L’Archonte sonnait jadis la garde du Viaduc. La troisième sonnerie brisa ses tympans, mais sa lame n’a jamais cessé d’attendre un adversaire digne.',
  },
  {
    id: 'stele_3',
    title: 'La Sève Ardente',
    author: 'Sœur Méryl',
    text: 'On ne guérit pas l’argile par le sang : on la recuit au cœur de la sève dorée récoltée sous les racines calcinées.',
  },
  {
    id: 'stele_4',
    title: 'L’Art de la Déviation',
    author: 'Orin le Veilleur',
    text: 'Ne fuyez pas chaque coup. L’acier qui rencontre l’acier au bon battement de cœur transforme l’élan du colosse en votre propre victoire.',
  },
  {
    id: 'stele_5',
    title: 'Le Souverain Inachevé',
    author: 'Lyra l’Archiviste',
    text: 'Au neuvième cercle, l’anneau de l’Éclipse touche la pierre. Celui qui en revient peut choisir de s’extraire — ou de défier l’infini.',
  },
];

export const QUESTS_DEF: QuestDef[] = [
  {
    id: 'q_first_blood',
    title: 'Baptême de Cendre',
    desc: 'Vaincre 15 ennemis dans l’Abîme.',
    reward: { cendres: 45, fer: 2 },
    check: (s) => ({ current: s.records.totalKills, target: 15 }),
  },
  {
    id: 'q_parry_10',
    title: 'Acier Chantant',
    desc: 'Réussir 12 déviations parfaites cumulées.',
    reward: { cendres: 55, larmes: 1 },
    check: (s) => ({ current: s.records.totalParries, target: 12 }),
  },
  {
    id: 'q_depth_3',
    title: 'Le Seuil du Beffroi',
    desc: 'Atteindre la Strate 3 et affronter son Gardien.',
    reward: { cendres: 60, fer: 3 },
    check: (s) => ({ current: s.records.bestDepth, target: 3 }),
  },
  {
    id: 'q_boss_1',
    title: 'Chute d’un Gardien',
    desc: 'Terrasser au moins 1 Gardien (Boss).',
    reward: { cendres: 90, fer: 3, larmes: 2 },
    check: (s) => ({ current: s.records.bossesSlain, target: 1 }),
  },
  {
    id: 'q_depth_6',
    title: 'Au-delà du Viaduc',
    desc: 'Atteindre la Strate 6 des profondeurs.',
    reward: { cendres: 120, larmes: 2 },
    check: (s) => ({ current: s.records.bestDepth, target: 6 }),
  },
  {
    id: 'q_streak_4',
    title: 'Maître de Posture',
    desc: 'Enchaîner 4 déviations sans être touché en une expédition.',
    reward: { cendres: 85, larmes: 2 },
    check: (s) => ({ current: s.records.maxParryStreak, target: 4 }),
  },
];
