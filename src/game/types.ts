export type Language = 'ru' | 'en';
export type RoosterNameId = 'grisha' | 'vanya';
export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyPreset {
  id: DifficultyId;
  startHp: number;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemySpeedMult: number;
  pickupDropChance: number;
  patHealBonus: number;
  breathRecoveryFloor: number;
  breathRecoveryRate: number;
  scoreMult: number;
}

export interface StoryLogEntry {
  speaker: string;
  text: string;
}

export type GameMode = 'story' | 'endless';

export type GamePhase =
  | 'title'
  | 'cutscene'
  | 'playing'
  | 'upgrade'
  | 'paused'
  | 'victory'
  | 'gameover';

export type UpgradeId =
  | 'buckshot_overpressure'
  | 'awp_fastbolt'
  | 'rotary_coolant'
  | 'petya_blessing'
  | 'vampiric_loop'
  | 'adrenaline_sprint'
  | 'hollowpoint_smg';

export type PickupKind = 'ammo' | 'medkit' | 'overclock';

export interface RunRecords {
  bestScore: number;
  bestLoop: number;
  bestKills: number;
}

export type WeaponId = 'shotgun' | 'awp' | 'pistol' | 'minigun' | 'p90';

export type EnemyKind = 'crawler' | 'lampshade' | 'screamer' | 'watchman';

export type TextureSlot = 'house' | 'fence' | 'road' | 'lawn';

export type TexturePatternKind =
  | 'stucco_brick'
  | 'timber_planks'
  | 'cracked_asphalt'
  | 'concrete_panels'
  | 'night_grass'
  | 'anomaly_grid';

export type MusicTrackId =
  | 'telepath_mole'
  | 'nikogda_nihrena'
  | 'oruzhenosets_bike'
  | 'electric_giraffe'
  | 'merchant_dream'
  | 'you_know_metal'
  | 'moonlight_sonata'
  | 'midnight_fog'
  | 'watchman_dread';

export type MusicGenreStyle =
  | 'punk_rock'
  | 'stoner_bike'
  | 'psych_synth'
  | 'post_punk'
  | 'doom_baroque'
  | 'heavy_metal'
  | 'classical'
  | 'dark_synth'
  | 'industrial_boss';

export interface CharacterProgressionState {
  level: number;
  xp: number;
  nextLevelXp: number;
  xpProgress: number; // 0..1
  bonusMaxHp: number;
  damageMult: number;
  reloadSpeedMult: number;
  moveSpeedMult: number;
}

export type ScreamerIntensity = 'full' | 'reduced';
export type ScreamerKind = 'fence' | 'hollow' | 'watchman' | 'fog' | 'preview';

export type EnemyTacticMode =
  | 'approach'
  | 'flank_arc'
  | 'feint_sprint'
  | 'enraged_charge';

export type BindableAction =
  | 'reload'
  | 'interact'
  | 'patRooster'
  | 'flashlight'
  | 'scope'
  | 'nextTrack'
  | 'nextWeapon'
  | 'jump'
  | 'sprint';

export type KeybindMap = Record<BindableAction, string>;

export interface WeaponConfig {
  id: WeaponId;
  slotKey: number;
  name: string;
  shortName: string;
  role: string;
  damage: number;
  pellets: number;
  magSize: number;
  maxReserve: number;
  fireInterval: number;
  reloadTime: number;
  spreadRad: number;
  maxRange: number;
  falloffStart: number;
  falloffMinRatio: number;
  automatic: boolean;
  spinUpTime: number;
  recoilPitch: number;
  recoilKick: number;
  moveSpeedMult: number;
  zoomFov: number | null;
  hitstopSec: number;
  trauma: number;
}

export interface WeaponAmmoState {
  mag: number;
  reserve: number;
}

export interface AABB {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  kind: 'house' | 'fence' | 'prop';
}

export interface HouseLot {
  id: string;
  number: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  facing: 1 | -1; // 1 faces +X (east toward road), -1 faces -X (west toward road)
  yardMinX: number;
  yardMaxX: number;
  yardMinZ: number;
  yardMaxZ: number;
  gateZ: number;
  wallTint: number;
  roofTint: number;
  litWindow: boolean;
}

export interface LampSpec {
  id: string;
  x: number;
  z: number;
  armDirX: number;
  flickerSeed: number;
  hasPointLight: boolean;
}

export interface ObjectiveSpec {
  id: string;
  chapter: number;
  label: string;
  x: number;
  z: number;
  completed: boolean;
}

export interface SuburbLayout {
  houses: HouseLot[];
  lamps: LampSpec[];
  colliders: AABB[];
  objectives: ObjectiveSpec[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number };
}

export interface CutsceneBeat {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface CutsceneDef {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  image: string;
  beats: CutsceneBeat[];
}

export interface ChapterDef {
  chapter: number;
  clockLabel: string;
  title: string;
  objectiveSummary: string;
  introCutscene: CutsceneDef;
  targetKills: number;
  hasBoss: boolean;
  spawnWeights: Record<Exclude<EnemyKind, 'watchman'>, number>;
  maxActiveEnemies: number;
}

export type RoosterMode = 'follow' | 'circle_fly' | 'alert' | 'patted';

export interface RoosterSnapshot {
  mode: RoosterMode;
  alertActive: boolean;
  alertLabel: string;
  alertAngleRad: number; // relative to player forward (0 = ahead, PI = behind)
  patCount: number;
  patCooldown: number;
  statusBanner: string;
  canPatPrompt: boolean;
}

export interface CustomTextureSpec {
  slot: TextureSlot;
  pattern: TexturePatternKind;
  primaryHex: string;
  secondaryHex: string;
  grime: number; // 0..1
  wear: number; // 0..1
}

export interface CustomTrackMeta {
  id: string;
  name: string;
}

export interface MusicSettings {
  trackId: MusicTrackId;
  bpm: number;
  fogDrone: number; // 0..1
  tapeWarble: number; // 0..1
  bassDrive: number; // 0..1
  volume: number; // 0..1
  muted: boolean;
  customAudioName: string | null;
  customPlaylist: CustomTrackMeta[];
  activeCustomTrackId: string | null;
}

export interface BipedGaitInput {
  kind: EnemyKind;
  gaitPhase: number; // continuous radians driven by real world distance traveled
  speedRatio: number; // 0 = standing still, 1 = cruise walk/run, >1 = sprint
  timeSec: number;
  seed: number;
  telegraphRatio: number; // 0 = none, 0..1 = attack windup -> strike
  flinchRatio: number; // 0 = none, 0..1 = hit stagger recoil
  turnRate: number; // rad/s lateral lean into turns
}

export interface BipedGaitPose {
  pelvisY: number;
  pelvisPitch: number;
  pelvisRoll: number;
  pelvisYaw: number;
  spinePitch: number;
  spineRoll: number;
  spineYaw: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  leftHipX: number;
  leftKneeX: number;
  leftAnkleX: number;
  rightHipX: number;
  rightKneeX: number;
  rightAnkleX: number;
  leftShoulderX: number;
  leftShoulderZ: number;
  leftElbowX: number;
  rightShoulderX: number;
  rightShoulderZ: number;
  rightElbowX: number;
}

export interface RoosterGaitInput {
  stepPhase: number; // driven by real ground distance traveled
  groundSpeed: number; // m/s
  altitude: number; // m above ground
  mode: RoosterMode;
  timeSec: number;
  patTimer: number;
  wingPhase: number;
}

export interface RoosterGaitPose {
  bodyYOffset: number;
  bodyPitch: number;
  bodyRoll: number;
  neckPitch: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  leftHipX: number;
  leftKneeX: number;
  leftAnkleX: number;
  rightHipX: number;
  rightKneeX: number;
  rightAnkleX: number;
  leftWingFlapZ: number;
  leftWingSpreadY: number;
  rightWingFlapZ: number;
  rightWingSpreadY: number;
  tailPitch: number;
}

export interface ObjectiveCompassState {
  active: boolean;
  distanceMeters: number;
  relativeAngleRad: number; // 0 = ahead, +PI/2 = right, -PI/2 = left, PI = behind
}

export interface HudSnapshot {
  language: Language;
  roosterName: RoosterNameId;
  difficulty: DifficultyId;
  mouseSensitivity: number;
  keybinds: KeybindMap;
  isTouchDevice: boolean;
  isPortrait: boolean;
  storyLog: StoryLogEntry | null;
  mode: GameMode;
  loopNumber: number;
  phase: GamePhase;
  chapter: number;
  chapterTitle: string;
  clockLabel: string;
  objectiveText: string;
  objectivesDone: number;
  objectivesTotal: number;
  objectiveCompass: ObjectiveCompassState;
  nearbyInteractLabel: string | null;
  hp: number;
  maxHp: number;
  stamina: number;
  activeWeapon: WeaponId;
  ammo: Record<WeaponId, WeaponAmmoState>;
  reloading: boolean;
  reloadProgress: number;
  minigunSpin: number;
  isScoped: boolean;
  flashlightOn: boolean;
  kills: number;
  score: number;
  combo: number;
  comboMultiplier: number;
  comboTimer: number;
  overclockTimer: number;
  headshotTimer: number;
  pickupToast: string | null;
  elapsedSec: number;
  hitMarkerTimer: number;
  hitMarkerCrit: boolean;
  damageFlash: number;
  screamerActive: boolean;
  screamerProgress: number;
  screamerCaption: string;
  screamerKind: ScreamerKind;
  screamerIntensity: ScreamerIntensity;
  exeCorruption: number;
  pointerLocked: boolean;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  rooster: RoosterSnapshot;
  activeCutscene: CutsceneDef | null;
  cutsceneBeatIndex: number;
  upgradeChoices: UpgradeId[];
  ownedUpgrades: UpgradeId[];
  records: RunRecords;
  muted: boolean;
  currentTrackId: MusicTrackId;
  character: CharacterProgressionState;
  levelUpToast: string | null;
  trackToast: string | null;
}
