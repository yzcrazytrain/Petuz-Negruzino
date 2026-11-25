import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  CHAPTERS,
  DIFFICULTY_PRESETS,
  MUSIC_TRACKS,
  TEXTURE_PACKS,
  UPGRADE_IDS,
  WEAPON_ORDER,
  WEAPONS,
} from './constants';
import {
  loadInitialDifficulty,
  loadInitialLanguage,
  loadInitialRoosterName,
  loadInitialSensitivity,
  localizeRoosterCopy,
  saveDifficulty,
  saveLanguage,
  saveRoosterName,
  saveSensitivity,
  TRANSLATIONS,
} from './i18n';
import { NegruzinoAudio } from './audio';
import {
  applyWorldBoxUVs,
  applyWorldCircleUVs,
  applyWorldPlaneUVs,
  createBirchCanopyGeo,
  createCassetteTapeModel,
  createCoopPartnerModel,
  createCoopPingBeacon,
  createEnemyModel,
  createFenceRun,
  createFlaredTrunkGeo,
  createGrassTuftGeo,
  createObjectiveShrine,
  createPickupModel,
  createRoadsideBollard,
  createRoadStormDrain,
  createRoosterModel,
  createRustBarrel,
  createSculptedSpruceTierGeo,
  createSovietCar,
  createStreetlamp,
  createSuburbanHouse,
  createSuburbSign,
  createTransformerTower,
  createWeaponViewmodel,
  createYardBench,
  createYardBushGeo,
  type CoopPartnerRig,
  type EnemyRig,
  type RoosterRig,
  type WeaponRig,
} from './models';
import type { CoopClient } from './coopClient';
import type {
  CoopPlayerState,
  CoopRoomSnapshot,
  CoopSyncedEnemy,
  CoopSyncedPickup,
} from './coopProtocol';
import {
  applyReload,
  computeBipedGaitPose,
  computeBreathRecoveryHp,
  computeCharacterProgression,
  computeComboMultiplier,
  computeCoopScaling,
  computeDifficultyScaledEnemyStats,
  computeEnemySteering,
  computeLoopScaling,
  computeRoosterGaitPose,
  computeScaledChapterKillTarget,
  computeWeaponDamage,
  createInitialAmmo,
  findShotHitEnemy,
  pickUpgradeChoices,
  resolveCircleVsAABBs,
  resolveCircleVsCircles,
  shouldAutoReload,
  stepRoosterCompanion,
} from './rules';
import { buildZoneLayout } from './zones';
import {
  createArchiveBunker,
  createBus404Wreck,
  createCapacitorBank,
  createCoolingPylon,
  createDepartureCarHalo,
  createDepotHangar,
  createDispatchTower,
  createFiringRangeStructure,
  createFuelCistern,
  createHubGarageBuilding,
  createHubToolShed,
  createKppGuardhouse,
  createRangeDummyRig,
  createResonatorCoreTower,
  createSpecsTerminalStand,
  type AnimatedZoneProp,
  type RangeDummyRig,
} from './zoneModels';
import {
  applyCustomTextureToMaterial,
  applyImageUrlToMaterial,
  createContactShadowTexture,
  createNocturnalSkyTexture,
  createRainPuddleMaterial,
  createStarterWorldMaterials,
  loadExeCorruptedTextures,
  loadGeneratedStarterTextures,
  type WorldMaterialSet,
} from './textures';
import {
  readBrowserDeviceProfile,
  type DeviceProfile,
} from './device';
import {
  applyKeybindUpdate,
  DEFAULT_KEYBINDS,
  formatBindingLabel,
  loadKeybinds,
  matchesBinding,
  mouseButtonToBindingCode,
  saveKeybinds,
} from './keybinds';
import type {
  BindableAction,
  CoopScalingProfile,
  CutsceneDef,
  CustomTextureSpec,
  DifficultyId,
  EnemyKind,
  EnemyTacticMode,
  GameMode,
  GamePhase,
  HubRangeHitInfo,
  HudSnapshot,
  KeybindMap,
  Language,
  MusicSettings,
  ObjectiveSpec,
  PickupKind,
  RoosterMode,
  RoosterNameId,
  RunRecords,
  ScreamerIntensity,
  ScreamerKind,
  SuburbLayout,
  TapeSpec,
  TextureSlot,
  UpgradeId,
  WeaponAmmoState,
  WeaponId,
  ZoneId,
} from './types';

function createGoldenHourSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0.0, '#4d82b8');
  grad.addColorStop(0.36, '#7cb0d8');
  grad.addColorStop(0.56, '#d9d3be');
  grad.addColorStop(0.72, '#f2c182');
  grad.addColorStop(0.88, '#c99a6b');
  grad.addColorStop(1.0, '#626b53');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  // Warm golden sun disc & soft glow in upper-west sky
  const sunGrad = ctx.createRadialGradient(340, 118, 6, 340, 118, 92);
  sunGrad.addColorStop(0, 'rgba(255, 250, 224, 0.96)');
  sunGrad.addColorStop(0.25, 'rgba(255, 224, 152, 0.55)');
  sunGrad.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(220, 20, 240, 200);
  // Subtle warm clouds
  ctx.fillStyle = 'rgba(255, 244, 225, 0.24)';
  for (let i = 0; i < 16; i++) {
    const cx = (i * 47) % c.width;
    const cy = 58 + (i % 4) * 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44 + (i % 3) * 18, 9 + (i % 2) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

const NEGRUZINO_CINEMATIC_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uChromatic: { value: 0.0008 },
    uVignette: { value: 0.38 },
    uGrain: { value: 0.024 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      vec2 offset = center * dist * uChromatic * 5.5;

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Subtle 35mm horizontal anamorphic lens flare bleed (softened to prevent harsh glare bars)
      vec3 streak = vec3(0.0);
      for (int i = -2; i <= 2; i++) {
        if (i == 0) continue;
        vec2 su = clamp(vUv + vec2(float(i) * 0.011, 0.0), 0.002, 0.998);
        vec3 s = texture2D(tDiffuse, su).rgb;
        float hot = max(0.0, max(s.r, max(s.g, s.b)) - 0.92);
        streak += s * hot * 0.055;
      }
      col += streak * vec3(1.04, 0.88, 0.74);

      // Cinematic midnight steel-blue shadows / warm sodium highlights split-tone + micro-contrast
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 coolShadow = vec3(0.91, 0.96, 1.07);
      vec3 warmHigh = vec3(1.06, 0.99, 0.91);
      col *= mix(coolShadow, warmHigh, smoothstep(0.14, 0.76, lum));
      col = mix(col, col * col * (3.0 - 2.0 * clamp(col, 0.0, 1.0)), 0.14);

      // Organic 35mm film grain
      float n = (rand(vUv * 512.0 + fract(uTime)) - 0.5) * uGrain;
      col += vec3(n);

      // Filmic optical lens vignette
      float vig = smoothstep(0.96, 0.26, dist * (1.0 + uVignette));
      col *= mix(1.0 - uVignette, 1.0, vig);

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

const RECORDS_STORAGE_KEY = 'negruzino_records_v1';
const TAPES_STORAGE_KEY = 'negruzino_tapes_v1';

function loadCollectedTapes(): string[] {
  try {
    const raw = window.localStorage.getItem(TAPES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function saveCollectedTapes(tapes: string[]): void {
  try {
    window.localStorage.setItem(TAPES_STORAGE_KEY, JSON.stringify(Array.from(new Set(tapes))));
  } catch {
    // ignore storage errors
  }
}

function loadRunRecords(): RunRecords {
  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RunRecords>;
      return {
        bestScore: Math.max(0, Number(parsed.bestScore) || 0),
        bestLoop: Math.max(1, Number(parsed.bestLoop) || 1),
        bestKills: Math.max(0, Number(parsed.bestKills) || 0),
      };
    }
  } catch {
    // ignore storage errors
  }
  return { bestScore: 0, bestLoop: 1, bestKills: 0 };
}

function saveRunRecords(records: RunRecords): void {
  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

interface ActivePickup {
  id: number;
  netId?: string;
  kind: PickupKind;
  x: number;
  z: number;
  life: number;
  group: THREE.Group;
  spinPivot: THREE.Group;
}

interface ActiveEnemy {
  id: number;
  netId?: string;
  kind: EnemyKind;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  targetYaw?: number;
  hp: number;
  maxHp: number;
  radius: number;
  hitHeight: number;
  rig: EnemyRig;
  seed: number;
  phaseTime: number;
  gaitPhase: number;
  actualSpeed: number;
  prevYaw: number;
  turnRate: number;
  flinchTimer: number;
  hitFlash: number;
  telegraphTimer: number;
  telegraphDuration: number;
  attackCooldown: number;
  dying: boolean;
  deathTimer: number;
  knockVx: number;
  knockVz: number;
  tacticMode: EnemyTacticMode;
  tacticTimer: number;
  flankSign: 1 | -1;
  recentHitTimer: number;
}

interface RemoteCoopPartner {
  id: string;
  name: string;
  rig: CoopPartnerRig;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  yaw: number;
  targetYaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  kills: number;
  isDowned: boolean;
  isHost: boolean;
  isMoving: boolean;
  weaponId: WeaponId;
  isReloading: boolean;
  reloadProgress: number;
  muzzleTimer: number;
  walkPhase: number;
  lastLabelSig: string;
}

interface RoadRainSplash {
  x: number;
  z: number;
  age: number;
  duration: number;
  scale: number;
  lampTint: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _posVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class NegruzinoEngine {
  private container: HTMLElement;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private audio = new NegruzinoAudio();

  private layout: SuburbLayout;
  private materials: WorldMaterialSet;
  private shadowTex: THREE.CanvasTexture;
  private maxAnisotropy: number;

  private lamps: Array<{
    x: number;
    z: number;
    armDirX: number;
    bulbMat: THREE.MeshStandardMaterial;
    pointLight?: THREE.PointLight;
    seed: number;
  }> = [];
  private objectiveNodes: Array<{
    spec: ObjectiveSpec;
    group: THREE.Group;
    beaconMat: THREE.MeshStandardMaterial;
    ringMesh: THREE.Mesh;
    beamMesh: THREE.Mesh;
  }> = [];
  private tapeNodes: Array<{
    spec: TapeSpec;
    group: THREE.Group;
    spinPivot: THREE.Group;
    ringMesh: THREE.Mesh;
  }> = [];
  private collectedTapes: Set<string> = new Set(loadCollectedTapes());

  // AAA Post-Processing (Hardware GPU path) + Atmospheric Mist Motes + Light Drizzle + Road Splashes
  private composer: EffectComposer | null = null;
  private cinematicPass: ShaderPass | null = null;
  private mistMotes: THREE.Points | null = null;
  private rainLines: THREE.LineSegments | null = null;
  private rainOffsets: Float32Array | null = null;
  private rainSpeeds: Float32Array | null = null;
  private roadSplashMesh: THREE.InstancedMesh | null = null;
  private roadSplashes: RoadRainSplash[] = [];
  private foliageWindUniform = { value: 0 };
  private puddleMat: THREE.ShaderMaterial | null = null;
  private mistSheetMat: THREE.ShaderMaterial | null = null;
  private cutsceneClock = 0;
  private dawnFogColor = new THREE.Color(0x3a4a68);
  private dynamicLampSpots: Array<{
    spot: THREE.SpotLight;
    target: THREE.Object3D;
  }> = [];

  // LAN Co-op state (real WebSocket synchronized multiplayer)
  private coopClient: CoopClient | null = null;
  private coopRoom: CoopRoomSnapshot | null = null;
  private coopPartners = new Map<string, RemoteCoopPartner>();
  private coopLocalDowned = false;
  private coopStateSendAccum = 0;
  private coopEnemiesSendAccum = 0;
  private coopPickupsSendAccum = 0;
  private coopPingBeacon: THREE.Group | null = null;
  private coopPingTimer = 0;
  private coopLastPingText: string | null = null;
  private customStoryLog: { speaker: string; text: string } | null = null;

  // Viewmodel rig attached to camera
  private weaponHolder = new THREE.Group();
  private weaponRigs: Record<WeaponId, WeaponRig>;
  private muzzleLight: THREE.PointLight;
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleFlashTimer = 0;

  // Rooster companion (Гриша / Ваня)
  private roosterRig: RoosterRig;
  private roosterName: RoosterNameId = loadInitialRoosterName();
  private roosterX = 1.6;
  private roosterY = 0;
  private roosterZ = 32.8;
  private roosterYaw = 0;
  private roosterMode: RoosterMode = 'follow';
  private roosterOrbitAngle = 0;
  private roosterFlightTimer = 3.2;
  private roosterPatTimer = 0;
  private roosterPatCooldown = 0;
  private roosterPatCount = 0;
  private roosterCrowCooldown = 0;
  private roosterWingPhase = 0;
  private roosterStepPhase = 0;
  private roosterGroundSpeed = 0;
  private roosterAlertActive = false;
  private roosterAlertAngle = 0;
  private roosterAlertLabel = '';
  private roosterStatusBanner = '';
  private lang: Language = loadInitialLanguage();

  // Pooled particles (InstancedMesh)
  private readonly PARTICLE_COUNT = 180;
  private particles: Particle[] = [];
  private particleCursor = 0;
  private particleMesh: THREE.InstancedMesh;

  // Real shadow-casting directional moonlight + tactical player flashlight + sky dome
  private skyDome: THREE.Mesh;
  private nocturnalSkyTex: THREE.CanvasTexture;
  private daySkyTex: THREE.CanvasTexture;
  private hemiLight: THREE.HemisphereLight;
  private moonLight: THREE.DirectionalLight;
  private flashlight: THREE.SpotLight;
  private flashlightTarget = new THREE.Object3D();
  private flashlightOn = true;
  private flashlightIntensityLive = 16;
  private screamerLight: THREE.PointLight;

  // Stage 2: Multi-Zone World Container, Hub Firing Range, Moskvitch Boarding & Cutscene Vote
  private currentZone: ZoneId = 'suburb';
  private worldGroup = new THREE.Group();
  private rangeDummies: RangeDummyRig[] = [];
  private animatedZoneProps: AnimatedZoneProp[] = [];
  private hubBoardedIds: string[] = [];
  private hubInCar = false;
  private hubLaunchTimer = 0;
  private hubLastRangeHit: HubRangeHitInfo | null = null;
  private hubRangeHitTimer = 0;
  private onOpenHubSpecs: (() => void) | null = null;
  private cutsceneVotedIds: string[] = [];
  private cutsceneTotalPlayers = 1;
  private phaseBeforePause: GamePhase = 'playing';

  // Enemies & dropped pickups
  private enemies: ActiveEnemy[] = [];
  private nextEnemyId = 1;
  private spawnTimer = 2.4;
  private pickups: ActivePickup[] = [];
  private nextPickupId = 1;
  private pickupToast: string | null = null;
  private pickupToastTimer = 0;

  // Core game & replayability state
  private mode: GameMode = 'story';
  private loopNumber = 1;
  private endlessWave = 1;
  private endlessTargetKills = 8;
  private phase: GamePhase = 'title';
  private chapterIndex = 0; // 0..2
  private activeCutscene: CutsceneDef | null = null;
  private cutsceneBeatIndex = 0;
  private pendingVictoryAfterCutscene = false;
  private ownedUpgrades: UpgradeId[] = [];
  private upgradeChoices: UpgradeId[] = [];
  private pendingAfterUpgrade: 'next_chapter' | 'next_loop' | 'next_endless_wave' =
    'next_chapter';
  private records: RunRecords = loadRunRecords();
  private xp = 0;
  private characterLevel = 1;
  private levelUpToast: string | null = null;
  private levelUpToastTimer = 0;
  private trackToast: string | null = null;
  private trackToastTimer = 0;

  private playerX = 0;
  private playerY = 0;
  private playerZ = 35;
  private playerVy = 0;
  private playerYaw = 0;
  private playerPitch = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private walkDist = 0;
  private lastStepDist = 0;

  private difficulty: DifficultyId = loadInitialDifficulty();
  private mouseSensitivity: number = loadInitialSensitivity();
  private outOfCombatTimer = 0;
  private storyLogKey: string | null = null;
  private storyLogTimer = 0;

  private hp = DIFFICULTY_PRESETS[loadInitialDifficulty()].startHp;
  private maxHp = DIFFICULTY_PRESETS[loadInitialDifficulty()].startHp;
  private stamina = 100;
  private kills = 0;
  private chapterKills = 0;
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private overclockTimer = 0;
  private headshotTimer = 0;
  private elapsedSec = 0;

  private activeWeapon: WeaponId = 'shotgun';
  private ammo: Record<WeaponId, WeaponAmmoState> = createInitialAmmo();
  private fireCooldown = 0;
  private reloading = false;
  private reloadTimer = 0;
  private activeReloadDuration = 1.5;
  private minigunSpin = 0;
  private isScoped = false;
  private recoilPitchVel = 0;
  private weaponKickZ = 0;
  private weaponBobPhase = 0;

  private hitstopTimer = 0;
  private trauma = 0;
  private hitMarkerTimer = 0;
  private hitMarkerCrit = false;
  private damageFlash = 0;
  private hurtInvulnTimer = 0;

  private screamerTimer = 0;
  private screamerDuration = 0.72;
  private screamerCooldown = 5.0;
  private screamerCaptionKey: ScreamerKind = 'fence';
  private screamerKind: ScreamerKind = 'fence';
  private screamerIntensity: ScreamerIntensity = 'full';

  // Atmospheric midnight dread fog shift (zero OS system popups)
  private exeCorruption = 0.14;
  private baseFogColor = new THREE.Color(0x0b1019);
  private exeFogColor = new THREE.Color(0x24090e);
  private liveFogColor = new THREE.Color(0x0b1019);

  // Adaptive Device Profile, Rebindable Keyboard + Mouse4/Mouse5 & Mobile Touch State
  private deviceProfile: DeviceProfile = readBrowserDeviceProfile();
  private keybinds: KeybindMap = loadKeybinds();
  private keybindCaptureActive = false;
  private heldKeys = new Set<string>();
  private heldMouseButtons = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualSprint = false;
  private mouseDown = false;
  private fireJustPressed = false;
  private pointerLocked = false;

  // Loop & throttling
  private disposed = false;
  private frameId = 0;
  private lastNow = 0;
  private titleClock = 0;
  private hudEmitAccum = 0;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snap: HudSnapshot) => void,
    autostart: boolean
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio, this.deviceProfile.maxPixelRatio)
    );
    // Real dynamic shadows enabled on ALL devices (2048px GPU, 1024px software WebGL)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy() || 1
    );

    // Scene & Midnight Fog Atmosphere
    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x0b1019);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(0x0b1019, 0.028);

    // Custom Midnight Sodium + Moonlight PMREM Environment & 360° Nocturnal / Golden-Hour Sky Domes
    this.nocturnalSkyTex = createNocturnalSkyTexture();
    this.daySkyTex = createGoldenHourSkyTexture();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(this.nocturnalSkyTex).texture;
    this.scene.environmentIntensity = 0.56;
    pmrem.dispose();

    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(138, 28, 16),
      new THREE.MeshBasicMaterial({
        map: this.nocturnalSkyTex,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      })
    );
    this.scene.add(this.skyDome);

    this.camera = new THREE.PerspectiveCamera(
      this.deviceProfile.recommendedFov,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.08,
      160
    );
    this.scene.add(this.camera);

    // High-contrast CloverPit midnight lighting rig (dynamically switched to warm golden-hour in Hub)
    this.hemiLight = new THREE.HemisphereLight(0x3a547a, 0x101410, 0.38);
    this.scene.add(this.hemiLight);

    this.moonLight = new THREE.DirectionalLight(0xb2cef5, 2.05);
    this.moonLight.position.set(18, 16, 46);
    this.moonLight.target.position.set(0, 0, 35);
    this.moonLight.castShadow = true;
    const shadowRes = this.isSoftwareGl ? 1024 : 2048;
    this.moonLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.moonLight.shadow.camera.near = 2;
    this.moonLight.shadow.camera.far = 85;
    this.moonLight.shadow.camera.left = -26;
    this.moonLight.shadow.camera.right = 26;
    this.moonLight.shadow.camera.top = 26;
    this.moonLight.shadow.camera.bottom = -26;
    this.moonLight.shadow.bias = -0.0004;
    this.moonLight.shadow.normalBias = 0.036;
    this.moonLight.shadow.radius = 2.2;
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    // Physically calibrated weapon-mounted flashlight (inverse-square falloff + soft penumbra + dynamic close-range soft-clamp)
    this.flashlight = new THREE.SpotLight(0xffe9c8, 16, 38, 0.5, 0.74, 2.0);
    this.flashlight.position.set(0.18, -0.05, -0.92);
    this.flashlightTarget.position.set(0, -0.18, -14);
    this.flashlight.target = this.flashlightTarget;
    if (!this.isSoftwareGl) {
      this.flashlight.castShadow = true;
      this.flashlight.shadow.mapSize.set(1024, 1024);
      this.flashlight.shadow.camera.near = 0.5;
      this.flashlight.shadow.camera.far = 38;
      this.flashlight.shadow.bias = -0.0005;
      this.flashlight.shadow.normalBias = 0.024;
    }
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);

    // Dramatic horror under-light strobing during screamers
    this.screamerLight = new THREE.PointLight(0xff2820, 0, 9, 1.8);
    this.screamerLight.position.set(0, -0.34, -0.58);
    this.camera.add(this.screamerLight);

    // Build deterministic NEGRUZINO neighborhood inside disposable worldGroup
    this.scene.add(this.worldGroup);
    this.layout = buildZoneLayout('suburb');
    this.materials = createStarterWorldMaterials(this.maxAnisotropy);
    this.shadowTex = createContactShadowTexture();
    this.initAtmosphereParticles();
    this.rebuildWorldForZone('suburb');

    // First-person weapon rig mounted on camera
    this.weaponHolder.position.set(0.24, -0.22, -0.44);
    this.camera.add(this.weaponHolder);

    this.weaponRigs = {
      shotgun: createWeaponViewmodel('shotgun'),
      awp: createWeaponViewmodel('awp'),
      pistol: createWeaponViewmodel('pistol'),
      minigun: createWeaponViewmodel('minigun'),
      p90: createWeaponViewmodel('p90'),
    };
    for (const id of WEAPON_ORDER) {
      this.weaponRigs[id].group.visible = id === this.activeWeapon;
      this.weaponHolder.add(this.weaponRigs[id].group);
    }

    this.muzzleLight = new THREE.PointLight(0xffb454, 0, 12, 1.8);
    this.muzzleLight.position.set(0.18, -0.1, -1.1);
    this.camera.add(this.muzzleLight);

    const flashCanvas = document.createElement('canvas');
    flashCanvas.width = 128;
    flashCanvas.height = 128;
    const fCtx = flashCanvas.getContext('2d');
    if (fCtx) {
      fCtx.clearRect(0, 0, 128, 128);
      // Soft incandescent core glow
      const coreGrad = fCtx.createRadialGradient(64, 64, 2, 64, 64, 54);
      coreGrad.addColorStop(0, 'rgba(255, 252, 232, 0.96)');
      coreGrad.addColorStop(0.24, 'rgba(255, 196, 98, 0.78)');
      coreGrad.addColorStop(0.55, 'rgba(235, 112, 34, 0.28)');
      coreGrad.addColorStop(1, 'rgba(235, 80, 16, 0.0)');
      fCtx.fillStyle = coreGrad;
      fCtx.fillRect(0, 0, 128, 128);
      // Feathered 6-prong star burst rays
      fCtx.save();
      fCtx.translate(64, 64);
      for (let i = 0; i < 6; i++) {
        fCtx.rotate(Math.PI / 3);
        const rayGrad = fCtx.createLinearGradient(0, -56, 0, 56);
        rayGrad.addColorStop(0, 'rgba(255, 150, 50, 0)');
        rayGrad.addColorStop(0.35, 'rgba(255, 214, 126, 0.65)');
        rayGrad.addColorStop(0.5, 'rgba(255, 252, 238, 0.95)');
        rayGrad.addColorStop(0.65, 'rgba(255, 214, 126, 0.65)');
        rayGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
        fCtx.fillStyle = rayGrad;
        fCtx.beginPath();
        fCtx.ellipse(0, 0, i % 2 === 0 ? 5.5 : 3.8, i % 2 === 0 ? 56 : 42, 0, 0, Math.PI * 2);
        fCtx.fill();
      }
      fCtx.restore();
    }
    const muzzleTex = new THREE.CanvasTexture(flashCanvas);
    muzzleTex.colorSpace = THREE.SRGBColorSpace;
    this.muzzleFlashMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.26),
      new THREE.MeshBasicMaterial({
        map: muzzleTex,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.muzzleFlashMesh.visible = false;
    this.weaponHolder.add(this.muzzleFlashMesh);

    // Rooster companion ("Petya")
    this.roosterRig = createRoosterModel(this.shadowTex);
    this.roosterRig.group.position.set(this.roosterX, 0, this.roosterZ);
    this.scene.add(this.roosterRig.group);

    // Pooled InstancedMesh particles
    const pGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.PARTICLE_COUNT);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.scene.add(this.particleMesh);

    // AAA GPU Post-Processing (Bloom + 35mm Filmic Horror Color/Grain/Chromatic Pass)
    if (!this.isSoftwareGl) {
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      const rt = new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.24, 0.48, 0.92);
      this.composer.addPass(bloom);
      this.cinematicPass = new ShaderPass(NEGRUZINO_CINEMATIC_SHADER);
      this.composer.addPass(this.cinematicPass);
      this.composer.addPass(new OutputPass());

      // 2 Dynamic Shadow-Casting Warm Sodium Streetlamp SpotLights tracking nearest lamps (soft atmospheric falloff)
      for (let i = 0; i < 2; i++) {
        const spot = new THREE.SpotLight(0xffa94d, 22, 22, 0.88, 0.86, 1.85);
        spot.castShadow = true;
        spot.shadow.mapSize.set(512, 512);
        spot.shadow.camera.near = 0.8;
        spot.shadow.camera.far = 22;
        spot.shadow.bias = -0.0005;
        spot.shadow.normalBias = 0.028;
        const target = new THREE.Object3D();
        spot.target = target;
        this.scene.add(spot, target);
        this.dynamicLampSpots.push({ spot, target });
      }

      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.applyDocumentLanguage();
    this.roosterStatusBanner = TRANSLATIONS[this.lang].roosterHopping;
    this.resetPlayerToSpawn();
    void this.audio.hydrateCustomPlaylist();

    const params = new URLSearchParams(window.location.search);
    const previewZone = params.get('zone');
    const autoHub = params.get('hub') === '1';

    if (autoHub) {
      this.enterHub('story', false);
    } else if (previewZone === 'depot' || previewZone === 'substation') {
      this.startZonePreview(previewZone, false);
    } else if (autostart) {
      this.startPlayImmediate(false);
    } else {
      this.syncBodyState();
      this.emitHud();
    }

    this.lastNow = performance.now();
    this.tick();
  }

  private initAtmosphereParticles(): void {
    // Wind sway shader on foliage (applied once)
    const pineMat = this.materials.foliage;
    const windUniform = this.foliageWindUniform;
    pineMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windUniform;
      shader.vertexShader =
        'uniform float uWindTime;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `
          #include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 instOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 instOrigin = vec3(0.0);
          #endif
          float crownFlex = max(0.0, (position.y - 2.2) * 0.11);
          float gustA = sin(uWindTime * 0.85 + instOrigin.x * 0.19 + instOrigin.z * 0.14);
          float gustB = cos(uWindTime * 1.43 + instOrigin.z * 0.27 - instOrigin.x * 0.11);
          float sway = (gustA * 0.65 + gustB * 0.35) * crownFlex * 0.26;
          transformed.x += sway;
          transformed.z += sway * 0.58;
          `
        );
    };
    pineMat.needsUpdate = true;

    // Delicate drifting atmospheric mist motes
    const moteCount = this.isSoftwareGl ? 90 : 220;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 44;
      motePos[i * 3 + 1] = 0.4 + Math.random() * 5.2;
      motePos[i * 3 + 2] = -46 + Math.random() * 94;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteCanvas = document.createElement('canvas');
    moteCanvas.width = 32;
    moteCanvas.height = 32;
    const mctx = moteCanvas.getContext('2d')!;
    const mGrad = mctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    mGrad.addColorStop(0, 'rgba(255, 224, 178, 0.72)');
    mGrad.addColorStop(0.45, 'rgba(232, 168, 92, 0.2)');
    mGrad.addColorStop(1, 'rgba(232, 168, 92, 0)');
    mctx.fillStyle = mGrad;
    mctx.fillRect(0, 0, 32, 32);
    const moteMat = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(moteCanvas),
      size: 0.12,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mistMotes = new THREE.Points(moteGeo, moteMat);
    this.scene.add(this.mistMotes);

    // Light night drizzle mist in world space
    const rainDrops = this.isSoftwareGl ? 105 : 210;
    const rainPos = new Float32Array(rainDrops * 6);
    const rainColors = new Float32Array(rainDrops * 6);
    this.rainOffsets = new Float32Array(rainDrops * 3);
    this.rainSpeeds = new Float32Array(rainDrops);
    for (let i = 0; i < rainDrops; i++) {
      const nearLayer = i % 3 === 0;
      const spread = nearLayer ? 20 : 36;
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * spread;
      this.rainOffsets[i * 3 + 1] = Math.random() * 14.5;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * spread;
      this.rainSpeeds[i] = nearLayer ? 12.2 + Math.random() * 2.6 : 9.8 + Math.random() * 2.4;

      const idx = i * 6;
      rainColors[idx] = 0.28;
      rainColors[idx + 1] = 0.38;
      rainColors[idx + 2] = 0.52;
      rainColors[idx + 3] = 0.56;
      rainColors[idx + 4] = 0.68;
      rainColors[idx + 5] = 0.84;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    rainGeo.setAttribute('color', new THREE.BufferAttribute(rainColors, 3));
    const rainMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);

    // Wet-Asphalt Raindrop Impact Ripple Rings
    const splashCount = this.isSoftwareGl ? 64 : 110;
    const splashGeo = new THREE.RingGeometry(0.068, 0.086, 18);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.roadSplashMesh = new THREE.InstancedMesh(splashGeo, splashMat, splashCount);
    this.roadSplashMesh.frustumCulled = false;
    this.roadSplashMesh.renderOrder = 3;
    this.roadSplashes = [];
    for (let i = 0; i < splashCount; i++) {
      this.roadSplashes.push({
        x: (Math.random() - 0.5) * 9.0,
        z: 35 + (Math.random() - 0.5) * 26,
        age: Math.random() * 0.55,
        duration: 0.34 + Math.random() * 0.28,
        scale: 0.75 + Math.random() * 0.85,
        lampTint: 0.5,
      });
    }
    this.scene.add(this.roadSplashMesh);
  }

  private applyZoneAtmosphere(zoneId: ZoneId): void {
    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;
    if (zoneId === 'hub') {
      // Bright, warm golden-hour safe staging yard (NOT dark or gloomy!)
      skyMat.map = this.daySkyTex;
      skyMat.needsUpdate = true;
      this.baseFogColor.setHex(0xc8d8e6);
      this.exeFogColor.setHex(0xc8d8e6);
      this.scene.background = new THREE.Color(0xc8d8e6);
      this.scene.fog = new THREE.FogExp2(0xc8d8e6, 0.0055);
      this.hemiLight.color.setHex(0xfff1d6);
      this.hemiLight.groundColor.setHex(0x6d7556);
      this.hemiLight.intensity = 2.4;
      this.moonLight.color.setHex(0xffe1a8);
      this.moonLight.intensity = 2.65;
      this.scene.environmentIntensity = 1.05;
      this.renderer.toneMappingExposure = 1.12;
      this.flashlightOn = false;
      this.flashlight.intensity = 0;
      this.exeCorruption = 0;
      if (this.rainLines) this.rainLines.visible = false;
      if (this.roadSplashMesh) this.roadSplashMesh.visible = false;
      if (this.mistMotes) this.mistMotes.visible = false;
      for (const ls of this.dynamicLampSpots) {
        ls.spot.intensity = 0;
      }
      return;
    }

    skyMat.map = this.nocturnalSkyTex;
    skyMat.needsUpdate = true;
    if (this.rainLines) this.rainLines.visible = true;
    if (this.roadSplashMesh) this.roadSplashMesh.visible = true;
    if (this.mistMotes) this.mistMotes.visible = true;
    this.flashlightOn = true;

    if (zoneId === 'depot') {
      // Act II: Amber industrial highway fog at Bus Depot #4
      this.baseFogColor.setHex(0x111319);
      this.exeFogColor.setHex(0x2b120e);
      this.scene.background = new THREE.Color(0x111319);
      this.scene.fog = new THREE.FogExp2(0x111319, 0.023);
      this.hemiLight.color.setHex(0x525d73);
      this.hemiLight.groundColor.setHex(0x1b1712);
      this.hemiLight.intensity = 0.48;
      this.moonLight.color.setHex(0xf5cfa0);
      this.moonLight.intensity = 2.05;
      this.scene.environmentIntensity = 0.62;
      this.renderer.toneMappingExposure = 1.06;
    } else if (zoneId === 'substation') {
      // Act III: High-voltage midnight cyan storm at Substation "Luch-94"
      this.baseFogColor.setHex(0x08131d);
      this.exeFogColor.setHex(0x1a0b24);
      this.scene.background = new THREE.Color(0x08131d);
      this.scene.fog = new THREE.FogExp2(0x08131d, 0.024);
      this.hemiLight.color.setHex(0x3b6c8e);
      this.hemiLight.groundColor.setHex(0x0d151c);
      this.hemiLight.intensity = 0.5;
      this.moonLight.color.setHex(0x9bdcff);
      this.moonLight.intensity = 2.15;
      this.scene.environmentIntensity = 0.64;
      this.renderer.toneMappingExposure = 1.06;
    } else {
      // Act I: Negruzino Suburb classic midnight rain
      this.baseFogColor.setHex(0x0b1019);
      this.exeFogColor.setHex(0x24090e);
      this.scene.background = new THREE.Color(0x0b1019);
      this.scene.fog = new THREE.FogExp2(0x0b1019, 0.028);
      this.hemiLight.color.setHex(0x3a547a);
      this.hemiLight.groundColor.setHex(0x101410);
      this.hemiLight.intensity = 0.38;
      this.moonLight.color.setHex(0xb2cef5);
      this.moonLight.intensity = 2.05;
      this.scene.environmentIntensity = 0.56;
      this.renderer.toneMappingExposure = 1.04;
    }
  }

  private rebuildWorldForZone(zoneId: ZoneId): void {
    // Clear previous zone geometry without touching camera, weapons, rooster, or coop rigs
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.lamps = [];
    this.objectiveNodes = [];
    this.tapeNodes = [];
    this.rangeDummies = [];
    this.animatedZoneProps = [];
    this.puddleMat = null;
    this.mistSheetMat = null;

    this.currentZone = zoneId;
    this.layout = buildZoneLayout(zoneId);
    this.applyZoneAtmosphere(zoneId);

    if (zoneId === 'hub') {
      this.buildHubZone(this.worldGroup);
    } else if (zoneId === 'depot') {
      this.buildDepotZone(this.worldGroup);
    } else if (zoneId === 'substation') {
      this.buildSubstationZone(this.worldGroup);
    } else {
      this.buildSuburbZone(this.worldGroup);
    }

    this.addZoneObjectivesAndTapes(this.worldGroup);
  }

  private addPerimeterForest(
    root: THREE.Group,
    halfX: number,
    minZ: number,
    maxZ: number,
    daylight = false
  ): void {
    const trunkGeo = createFlaredTrunkGeo(0.15, 0.32, 3.8);
    const tierLowGeo = createSculptedSpruceTierGeo(2.55, 3.7, 4.15, 1.1);
    const tierMidGeo = createSculptedSpruceTierGeo(1.96, 3.45, 6.45, 2.7);
    const tierTopGeo = createSculptedSpruceTierGeo(1.26, 3.05, 8.65, 4.3);
    const birchTrunkGeo = createFlaredTrunkGeo(0.11, 0.21, 5.2);
    const birchCanopyGeo = createBirchCanopyGeo();

    const pineMat = this.materials.foliage;
    const spruceCoords: Array<[number, number, number]> = [];
    const birchCoords: Array<[number, number, number]> = [];
    let seq = 0;
    const pushTree = (tx: number, tz: number, sc: number) => {
      seq += 1;
      if (seq % 3 === 0) {
        birchCoords.push([tx, tz, sc * (0.95 + (seq % 4) * 0.1)]);
      } else {
        spruceCoords.push([tx, tz, sc]);
      }
    };

    for (let z = minZ; z <= maxZ; z += 5.8) {
      pushTree(-halfX - 3 - Math.abs(Math.sin(z)) * 4, z, 0.9 + Math.abs(Math.cos(z)) * 0.42);
      pushTree(halfX + 3 + Math.abs(Math.cos(z)) * 4, z, 0.95 + Math.abs(Math.sin(z)) * 0.42);
    }
    for (let x = -halfX; x <= halfX; x += 5.8) {
      if (Math.abs(x) > 5.5) {
        pushTree(x, minZ - 3 - Math.abs(Math.sin(x)) * 3, 1.0 + Math.abs(Math.cos(x)) * 0.38);
        pushTree(x, maxZ + 3 + Math.abs(Math.cos(x)) * 3, 0.95 + Math.abs(Math.sin(x)) * 0.35);
      }
    }
    for (const lot of this.layout.houses) {
      pushTree(lot.x + (lot.facing === 1 ? -6.5 : 6.5), lot.z + 5.2, 0.88);
      pushTree(lot.x + (lot.facing === 1 ? -6.0 : 6.0), lot.z - 5.4, 0.96);
    }

    const trunks = new THREE.InstancedMesh(trunkGeo, this.materials.bark, spruceCoords.length);
    const tierLow = new THREE.InstancedMesh(tierLowGeo, pineMat, spruceCoords.length);
    const tierMid = new THREE.InstancedMesh(tierMidGeo, pineMat, spruceCoords.length);
    const tierTop = new THREE.InstancedMesh(tierTopGeo, pineMat, spruceCoords.length);
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    for (const tier of [tierLow, tierMid, tierTop]) {
      tier.castShadow = true;
      tier.receiveShadow = true;
    }
    const tint = new THREE.Color();
    spruceCoords.forEach(([tx, tz, sc], idx) => {
      _posVec.set(tx, 0, tz);
      _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 1.618);
      _scaleVec.set(sc, sc * (0.9 + (idx % 3) * 0.12), sc);
      _mat4.compose(_posVec, _quat, _scaleVec);
      trunks.setMatrixAt(idx, _mat4);
      tierLow.setMatrixAt(idx, _mat4);
      _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 1.618 + 0.52);
      _mat4.compose(_posVec, _quat, _scaleVec);
      tierMid.setMatrixAt(idx, _mat4);
      _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 1.618 + 1.07);
      _mat4.compose(_posVec, _quat, _scaleVec);
      tierTop.setMatrixAt(idx, _mat4);
      tint.setHSL(0.35 + (idx % 5) * 0.01, daylight ? 0.28 : 0.14, daylight ? 0.58 : 0.72 + (idx % 4) * 0.06);
      tierLow.setColorAt(idx, tint);
      tint.offsetHSL(0, 0, 0.05);
      tierMid.setColorAt(idx, tint);
      tint.offsetHSL(0, 0, 0.05);
      tierTop.setColorAt(idx, tint);
    });
    trunks.computeBoundingSphere();
    tierLow.computeBoundingSphere();
    tierMid.computeBoundingSphere();
    tierTop.computeBoundingSphere();
    root.add(trunks, tierLow, tierMid, tierTop);

    if (birchCoords.length > 0) {
      const birchTrunks = new THREE.InstancedMesh(
        birchTrunkGeo,
        this.materials.birchBark,
        birchCoords.length
      );
      const birchCrowns = new THREE.InstancedMesh(birchCanopyGeo, pineMat, birchCoords.length);
      birchTrunks.castShadow = true;
      birchTrunks.receiveShadow = true;
      birchCrowns.castShadow = true;
      birchCrowns.receiveShadow = true;
      birchCoords.forEach(([bx, bz, sc], idx) => {
        _posVec.set(bx, 0, bz);
        _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 2.13);
        _scaleVec.set(sc, sc * (0.94 + (idx % 3) * 0.1), sc);
        _mat4.compose(_posVec, _quat, _scaleVec);
        birchTrunks.setMatrixAt(idx, _mat4);
        birchCrowns.setMatrixAt(idx, _mat4);
        tint.setHSL(0.13 + (idx % 3) * 0.04, daylight ? 0.42 : 0.24, daylight ? 0.65 : 0.62);
        birchCrowns.setColorAt(idx, tint);
      });
      birchTrunks.computeBoundingSphere();
      birchCrowns.computeBoundingSphere();
      root.add(birchTrunks, birchCrowns);
    }
  }

  private buildHubZone(root: THREE.Group): void {
    // Warm sunlit grass meadow + clean sunlit courtyard gravel/concrete pad
    const meadow = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x677b4b, roughness: 0.94 })
    );
    meadow.rotation.x = -Math.PI / 2;
    meadow.receiveShadow = true;
    root.add(meadow);

    const yardPad = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 42),
      new THREE.MeshStandardMaterial({ color: 0x9b9282, roughness: 0.88 })
    );
    yardPad.rotation.x = -Math.PI / 2;
    yardPad.position.set(0, 0.02, -1);
    yardPad.receiveShadow = true;
    root.add(yardPad);

    // Firing range sandy lane pad
    const rangeLane = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 20),
      new THREE.MeshStandardMaterial({ color: 0x867b67, roughness: 0.92 })
    );
    rangeLane.rotation.x = -Math.PI / 2;
    rangeLane.position.set(0, 0.03, -12.2);
    rangeLane.receiveShadow = true;
    root.add(rangeLane);

    // South Garage Workshop & West Tool Shed
    root.add(createHubGarageBuilding());
    root.add(createHubToolShed());

    // Wooden perimeter fences
    for (const col of this.layout.colliders) {
      if (col.kind === 'fence' && col.id.startsWith('hub_fence')) {
        root.add(
          createFenceRun(col.minX, col.maxX, col.minZ, col.maxZ, col.height, this.materials)
        );
      }
    }

    // Moskvitch-412 Departure Car on West Courtyard + Glowing Boarding Halo
    const anchors = this.layout.hubAnchors!;
    const car = createSovietCar(this.materials);
    car.position.set(anchors.carPos.x, 0, anchors.carPos.z);
    car.rotation.y = Math.PI + 0.25;
    root.add(car);
    root.add(
      createDepartureCarHalo(anchors.carPos.x, anchors.carPos.z, this.animatedZoneProps)
    );

    // Interactive Arsenal & Tactical Specs Terminal Stand on East Courtyard
    root.add(
      createSpecsTerminalStand(
        anchors.terminalPos.x,
        anchors.terminalPos.z,
        this.animatedZoneProps
      )
    );

    // Firing Range Structure & 5 AFK Target Dummies (10m–22m)
    root.add(createFiringRangeStructure());
    for (const spec of anchors.rangeDummies) {
      const dummy = createRangeDummyRig(spec);
      root.add(dummy.root);
      this.rangeDummies.push(dummy);
    }

    // Courtyard daylight poles (unlit/subtle warm decor)
    for (const spec of this.layout.lamps) {
      const built = createStreetlamp(spec, this.materials);
      built.bulbMat.emissiveIntensity = 0.25;
      root.add(built.group);
    }

    // Warm autumn Russian birch & spruce treeline surrounding the safe yard
    this.addPerimeterForest(root, 27, -28, 28, true);
  }

  private buildDepotZone(root: THREE.Group): void {
    // Extended wet concrete & gravel apron for Bus Depot #4
    const groundGeo = applyWorldPlaneUVs(
      new THREE.PlaneGeometry(240, 240),
      240,
      240,
      5.2,
      5.2
    );
    const ground = new THREE.Mesh(groundGeo, this.materials.lawn);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    const tarmacGeo = applyWorldPlaneUVs(
      new THREE.PlaneGeometry(66, 94),
      66,
      94,
      5.2,
      5.2
    );
    const tarmac = new THREE.Mesh(tarmacGeo, this.materials.road);
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.position.set(0, 0.026, -1);
    tarmac.receiveShadow = true;
    root.add(tarmac);

    // Yellow/white depot lane stripes
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xd6b05c,
      roughness: 0.72,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let dz = -36; dz <= 36; dz += 7) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.8), stripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.036, dz);
      root.add(dash);
    }

    // KPP-3 Checkpoint Booth & East Generator Shed
    root.add(createKppGuardhouse(-11.0, 25.0));
    const genShed = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 3.4, 6.2),
      new THREE.MeshStandardMaterial({ color: 0x5d6260, roughness: 0.88 })
    );
    genShed.position.set(13.0, 1.7, 25.75);
    genShed.castShadow = true;
    genShed.receiveShadow = true;
    root.add(genShed);

    // West & East Bus Repair Hangars
    root.add(createDepotHangar(-20.5, 2.0, 11.6, 15.6, 1));
    root.add(createDepotHangar(20.5, -1.0, 11.6, 17.6, -1));

    // Wrecked & frozen Route #404 Soviet Bus in central tarmac
    const bus = createBus404Wreck();
    bus.position.set(0, 0, 0);
    bus.rotation.y = 0.08;
    root.add(bus);

    // North-West Fuel Cistern Farm
    root.add(createFuelCistern(-18.0, -25.75));
    root.add(createFuelCistern(-18.0, -35.25));

    // North-East Dispatch Radio Tower (with rotating radar dish)
    root.add(createDispatchTower(18.25, -29.5, this.animatedZoneProps));

    // Concrete Jersey barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x6b6f6e, roughness: 0.9 });
    for (const col of this.layout.colliders) {
      if (col.kind === 'fence') {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(col.maxX - col.minX, col.height, col.maxZ - col.minZ),
          barrierMat
        );
        b.position.set(
          (col.minX + col.maxX) * 0.5,
          col.height * 0.5,
          (col.minZ + col.maxZ) * 0.5
        );
        b.castShadow = true;
        b.receiveShadow = true;
        root.add(b);
      }
    }

    // Wet puddles & Depot sodium floodlight poles
    const puddleMat = createRainPuddleMaterial(this.maxAnisotropy);
    this.puddleMat = puddleMat;
    const puddleGeo = new THREE.PlaneGeometry(1, 1);
    for (const [px, pz, sx, sz] of [
      [-6.5, 29, 4.6, 2.8],
      [6.5, 14, 5.2, 3.1],
      [-8.5, -10, 4.8, 2.9],
      [6.0, -24, 5.4, 3.2],
    ]) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.set(sx, sz, 1);
      puddle.position.set(px, 0.041, pz);
      puddle.renderOrder = 2;
      root.add(puddle);
    }

    for (const spec of this.layout.lamps) {
      const built = createStreetlamp(spec, this.materials);
      root.add(built.group);
      this.lamps.push({
        x: spec.x,
        z: spec.z,
        armDirX: spec.armDirX,
        bulbMat: built.bulbMat,
        pointLight: built.pointLight,
        seed: spec.flickerSeed,
      });
    }

    this.addPerimeterForest(root, 36, -50, 48, false);
  }

  private buildSubstationZone(root: THREE.Group): void {
    const groundGeo = applyWorldPlaneUVs(
      new THREE.PlaneGeometry(240, 240),
      240,
      240,
      5.2,
      5.2
    );
    const ground = new THREE.Mesh(groundGeo, this.materials.lawn);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    const concretePad = new THREE.Mesh(
      applyWorldPlaneUVs(new THREE.PlaneGeometry(66, 92), 66, 92, 5.0, 5.0),
      this.materials.road
    );
    concretePad.rotation.x = -Math.PI / 2;
    concretePad.position.set(0, 0.026, -1);
    concretePad.receiveShadow = true;
    root.add(concretePad);

    // Central glowing octagonal Resonator Core Arena floor ring
    const arenaRing = new THREE.Mesh(
      new THREE.RingGeometry(8.5, 9.2, 48),
      new THREE.MeshBasicMaterial({
        color: 0x3ecae8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    arenaRing.rotation.x = -Math.PI / 2;
    arenaRing.position.set(0, 0.045, -4.0);
    root.add(arenaRing);

    // Central Resonator Core Tower with 3 counter-rotating magnetic rings
    root.add(createResonatorCoreTower(0, -4.0, this.animatedZoneProps));

    // 4 Towering Cooling Pylons
    root.add(createCoolingPylon(-15.0, 9.0));
    root.add(createCoolingPylon(15.0, 9.0));
    root.add(createCoolingPylon(-15.0, -17.0));
    root.add(createCoolingPylon(15.0, -17.0));

    // West & East High-Voltage Capacitor Bank Halls
    root.add(createCapacitorBank(-25.5, -4.0));
    root.add(createCapacitorBank(25.5, -4.0));

    // North Archive Bunker Vault
    root.add(createArchiveBunker(0, -36.5));

    // South Gatehouse Concrete Pillars & Security Fences
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x52575e, roughness: 0.88 });
    for (const gx of [-10.25, 10.25]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 4.8), gateMat);
      pillar.position.set(gx, 2.3, 26.5);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      root.add(pillar);
    }
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.65, 1.2), gateMat);
    gantry.position.set(0, 4.7, 26.5);
    root.add(gantry);

    for (const col of this.layout.colliders) {
      if (col.kind === 'fence') {
        root.add(
          createFenceRun(col.minX, col.maxX, col.minZ, col.maxZ, col.height, this.materials)
        );
      }
    }

    const puddleMat = createRainPuddleMaterial(this.maxAnisotropy);
    this.puddleMat = puddleMat;
    const puddleGeo = new THREE.PlaneGeometry(1, 1);
    for (const [px, pz, sx, sz] of [
      [-4.2, 18, 4.5, 2.6],
      [5.5, 4, 4.8, 3.0],
      [-7.5, -14, 5.0, 3.0],
      [6.5, -24, 4.4, 2.5],
    ]) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.set(sx, sz, 1);
      puddle.position.set(px, 0.041, pz);
      puddle.renderOrder = 2;
      root.add(puddle);
    }

    for (const spec of this.layout.lamps) {
      const built = createStreetlamp(spec, this.materials);
      root.add(built.group);
      this.lamps.push({
        x: spec.x,
        z: spec.z,
        armDirX: spec.armDirX,
        bulbMat: built.bulbMat,
        pointLight: built.pointLight,
        seed: spec.flickerSeed,
      });
    }

    this.addPerimeterForest(root, 36, -50, 48, false);
  }

  private buildSuburbZone(root: THREE.Group): void {
    // 1. Extended night lawn ground plane with uniform world-space UVs (5.2m tile)
    const groundGeo = applyWorldPlaneUVs(
      new THREE.PlaneGeometry(240, 240),
      240,
      240,
      5.2,
      5.2
    );
    const ground = new THREE.Mesh(groundGeo, this.materials.lawn);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    // 2. Damp cracked asphalt suburban avenue with uniform 4.7m world tiling
    const roadGeo = applyWorldPlaneUVs(
      new THREE.PlaneGeometry(9.4, 140),
      9.4,
      140,
      4.7,
      4.7
    );
    const road = new THREE.Mesh(roadGeo, this.materials.road);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.028, -4);
    road.receiveShadow = true;
    root.add(road);

    // Central asphalt square apron
    const squareGeo = applyWorldCircleUVs(
      new THREE.CircleGeometry(11.5, 28),
      11.5,
      4.7
    );
    const square = new THREE.Mesh(squareGeo, this.materials.road);
    square.rotation.x = -Math.PI / 2;
    square.position.set(0, 0.032, 0);
    square.receiveShadow = true;
    root.add(square);

    // Weathered concrete curb edges + cast-iron storm drains + faded 1994 Soviet road centerline dashes
    const curbGeo = applyWorldBoxUVs(
      new THREE.BoxGeometry(0.36, 0.16, 52),
      0.36,
      0.16,
      52,
      2.4,
      1.0
    );
    for (const side of [-1, 1]) {
      const curbN = new THREE.Mesh(curbGeo, this.materials.concrete);
      curbN.position.set(side * 4.86, 0.08, 36);
      curbN.castShadow = true;
      curbN.receiveShadow = true;
      const curbS = new THREE.Mesh(curbGeo, this.materials.concrete);
      curbS.position.set(side * 4.86, 0.08, -38);
      curbS.castShadow = true;
      curbS.receiveShadow = true;
      root.add(curbN, curbS);
    }

    const dashGeo = new THREE.PlaneGeometry(0.16, 2.35);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xbcb8ae,
      roughness: 0.72,
      metalness: 0.08,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    for (let dz = -44; dz <= 44; dz += 6.2) {
      if (Math.abs(dz) < 11) continue;
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.035, dz);
      dash.receiveShadow = true;
      root.add(dash);
    }

    for (const [dx, dz] of [
      [-4.22, 31.2],
      [4.22, 18.4],
      [-4.22, -16.8],
      [4.22, -31.5],
    ]) {
      const drain = createRoadStormDrain(this.materials);
      drain.position.set(dx, 0.004, dz);
      root.add(drain);
    }

    // 3. Detached suburban houses with individual fenced lawns
    for (const lot of this.layout.houses) {
      root.add(createSuburbanHouse(lot, this.materials));
      const pathLen = Math.max(
        2,
        Math.abs(lot.x - (lot.facing === 1 ? lot.yardMaxX : lot.yardMinX)) -
          lot.width / 2 +
          1.2
      );
      const pathX =
        lot.facing === 1 ? lot.yardMaxX - pathLen / 2 : lot.yardMinX + pathLen / 2;
      const walkwayGeo = applyWorldPlaneUVs(
        new THREE.PlaneGeometry(pathLen, 1.85),
        pathLen,
        1.85,
        3.6,
        3.6
      );
      const walkway = new THREE.Mesh(walkwayGeo, this.materials.road);
      walkway.rotation.x = -Math.PI / 2;
      walkway.position.set(pathX, 0.025, lot.gateZ);
      walkway.receiveShadow = true;
      root.add(walkway);
    }

    // 4. All yard fences from colliders
    for (const col of this.layout.colliders) {
      if (col.kind === 'fence') {
        root.add(
          createFenceRun(col.minX, col.maxX, col.minZ, col.maxZ, col.height, this.materials)
        );
      }
    }

    // Wet road puddles
    const puddleMat = createRainPuddleMaterial(this.maxAnisotropy);
    this.puddleMat = puddleMat;
    const puddleGeo = new THREE.PlaneGeometry(1, 1);
    for (const [px, pz, sx, sz, rot] of [
      [-1.7, 30.8, 3.8, 2.3, 0.22],
      [2.1, 22.4, 4.4, 2.6, -0.28],
      [-1.9, 13.8, 3.6, 2.2, 0.16],
      [1.6, 2.8, 5.1, 3.4, 0.44],
      [-2.8, -14.2, 4.0, 2.5, -0.35],
      [2.0, -27.5, 4.3, 2.6, 0.24],
    ]) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = rot;
      puddle.scale.set(sx, sz, 1);
      puddle.position.set(px, 0.041, pz);
      puddle.renderOrder = 2;
      root.add(puddle);
    }

    // 5. Sodium streetlamps + sagging overhead power cables & house service drops
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.72,
      metalness: 0.35,
    });
    for (let i = 0; i < this.layout.lamps.length; i++) {
      const spec = this.layout.lamps[i];
      const built = createStreetlamp(spec, this.materials);
      root.add(built.group);
      this.lamps.push({
        x: spec.x,
        z: spec.z,
        armDirX: spec.armDirX,
        bulbMat: built.bulbMat,
        pointLight: built.pointLight,
        seed: spec.flickerSeed,
      });

      if (i > 0) {
        const prev = this.layout.lamps[i - 1];
        for (const wireIdx of [-1, 1]) {
          const yAttach = 6.72 + wireIdx * 0.14;
          const xOff = wireIdx * 0.24;
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(prev.x + xOff, yAttach, prev.z),
            new THREE.Vector3(
              (prev.x + spec.x) / 2 + xOff,
              yAttach - 1.05 - Math.abs(wireIdx) * 0.12,
              (prev.z + spec.z) / 2
            ),
            new THREE.Vector3(spec.x + xOff, yAttach, spec.z)
          );
          root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.022, 5, false), cableMat));
        }
      }
    }

    for (const lot of this.layout.houses) {
      let nearestLamp = this.layout.lamps[0];
      let bestD = Infinity;
      for (const lp of this.layout.lamps) {
        const d = Math.hypot(lp.x - lot.x, lp.z - lot.z);
        if (d < bestD) {
          bestD = d;
          nearestLamp = lp;
        }
      }
      if (nearestLamp && bestD < 26) {
        const gableX = lot.x + (lot.facing === 1 ? lot.width * 0.45 : -lot.width * 0.45);
        const dropCurve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(nearestLamp.x, 6.55, nearestLamp.z),
          new THREE.Vector3((nearestLamp.x + gableX) * 0.5, 4.85, (nearestLamp.z + lot.z) * 0.5),
          new THREE.Vector3(gableX, 4.35, lot.z)
        );
        root.add(new THREE.Mesh(new THREE.TubeGeometry(dropCurve, 12, 0.017, 5, false), cableMat));
      }
    }

    // Layered drifting volumetric ground mist sheets
    this.mistSheetMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
          return v;
        }
        void main() {
          vec2 c = vUv * 2.0 - 1.0;
          float radial = smoothstep(1.0, 0.12, length(c));
          float n1 = fbm(vUv * 3.8 + vec2(uTime * 0.045, -uTime * 0.022));
          float n2 = fbm(vUv * 6.5 - vec2(uTime * 0.032, uTime * 0.028));
          float wisp = smoothstep(0.32, 0.85, n1 * 0.65 + n2 * 0.35);
          vec3 col = mix(vec3(0.18, 0.24, 0.34), vec3(0.42, 0.36, 0.28), n2 * 0.45);
          float alpha = radial * wisp * 0.145;
          if (alpha < 0.005) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mistPlaneGeo = new THREE.PlaneGeometry(1, 1);
    for (const [mx, my, mz, mw, mh] of [
      [0, 0.42, 24, 18, 16],
      [-10, 0.52, 12, 16, 14],
      [10, 0.48, 8, 16, 14],
      [0, 0.55, -2, 24, 22],
      [-8, 0.46, -22, 18, 16],
      [9, 0.5, -28, 18, 16],
    ]) {
      const sheet = new THREE.Mesh(mistPlaneGeo, this.mistSheetMat);
      sheet.rotation.x = -Math.PI / 2;
      sheet.position.set(mx, my, mz);
      sheet.scale.set(mw, mh, 1);
      sheet.renderOrder = 3;
      root.add(sheet);
    }

    // 6. Central tall Soviet transformer landmark tower & storytelling props
    root.add(createTransformerTower(this.materials));

    const car = createSovietCar(this.materials);
    car.position.set(-3.15, 0, 40.2);
    car.rotation.y = Math.PI - 0.08;
    root.add(car);

    const sign = createSuburbSign(this.materials);
    sign.position.set(5.55, 0, 31.8);
    sign.rotation.y = -0.32;
    root.add(sign);

    for (const [bx, bz, brot] of [
      [-6.05, 25.4, Math.PI / 2],
      [6.05, 8.2, -Math.PI / 2],
      [-6.05, -21.5, Math.PI / 2],
    ]) {
      const bench = createYardBench(this.materials);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = brot;
      root.add(bench);
    }

    for (const [bx, bz] of [
      [-5.35, 36.5],
      [5.35, 36.5],
      [-5.35, 22.0],
      [5.35, 22.0],
      [-5.35, 11.4],
      [5.35, 11.4],
      [-5.35, -11.4],
      [5.35, -11.4],
    ]) {
      const bollard = createRoadsideBollard(this.materials);
      bollard.position.set(bx, 0, bz);
      root.add(bollard);
    }

    for (const [rx, rz] of [
      [-8.4, 2.2],
      [-8.95, 1.55],
      [-7.2, 32.8],
      [7.4, 15.2],
      [-7.4, -18.5],
      [7.2, -31.0],
    ]) {
      const barrel = createRustBarrel(this.materials);
      barrel.position.set(rx, 0, rz);
      barrel.rotation.y = (rx + rz) * 0.7;
      root.add(barrel);
    }

    // Instanced roadside grass tufts & yard bushes
    const grassGeo = createGrassTuftGeo();
    const grassCoords: Array<[number, number, number]> = [];
    for (let gz = -42; gz <= 42; gz += 2.2) {
      if (Math.abs(gz) < 10.5) continue;
      for (const side of [-1, 1]) {
        const jitter = Math.sin(gz * 3.1 + side * 1.7) * 0.35;
        grassCoords.push([
          side * (5.28 + Math.abs(jitter)),
          gz + jitter * 0.4,
          0.85 + Math.abs(jitter),
        ]);
      }
    }
    for (const lot of this.layout.houses) {
      const frontX = lot.facing === 1 ? lot.yardMaxX + 0.35 : lot.yardMinX - 0.35;
      grassCoords.push([frontX, lot.z + 3.4, 1.15]);
      grassCoords.push([frontX, lot.z - 3.6, 1.05]);
    }
    const grassMat = this.materials.foliage.clone();
    grassMat.side = THREE.DoubleSide;
    const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCoords.length);
    grassInst.receiveShadow = true;
    const grassTint = new THREE.Color();
    grassCoords.forEach(([gx, gz, sc], idx) => {
      _posVec.set(gx, 0.01, gz);
      _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 1.9);
      _scaleVec.set(sc, sc * (0.85 + (idx % 3) * 0.18), sc);
      _mat4.compose(_posVec, _quat, _scaleVec);
      grassInst.setMatrixAt(idx, _mat4);
      grassTint.setHSL(0.28 + (idx % 4) * 0.02, 0.24, 0.62 + (idx % 3) * 0.08);
      grassInst.setColorAt(idx, grassTint);
    });
    grassInst.computeBoundingSphere();
    root.add(grassInst);

    const bushGeo = createYardBushGeo();
    const bushCoords: Array<[number, number, number]> = [];
    for (const lot of this.layout.houses) {
      const fX = lot.facing === 1 ? lot.yardMaxX - 1.1 : lot.yardMinX + 1.1;
      bushCoords.push([fX, lot.z + 4.4, 0.92]);
      bushCoords.push([fX, lot.z - 4.4, 1.06]);
      bushCoords.push([lot.x + (lot.facing === 1 ? -4.8 : 4.8), lot.z + 3.8, 1.15]);
      bushCoords.push([lot.x + (lot.facing === 1 ? -4.6 : 4.6), lot.z - 3.9, 1.08]);
    }
    const bushInst = new THREE.InstancedMesh(bushGeo, this.materials.foliage, bushCoords.length);
    bushInst.castShadow = true;
    bushInst.receiveShadow = true;
    bushCoords.forEach(([bx, bz, sc], idx) => {
      _posVec.set(bx, 0, bz);
      _quat.setFromAxisAngle(_vecA.set(0, 1, 0), idx * 2.4);
      _scaleVec.set(sc, sc * (0.82 + (idx % 3) * 0.14), sc);
      _mat4.compose(_posVec, _quat, _scaleVec);
      bushInst.setMatrixAt(idx, _mat4);
      grassTint.setHSL(0.32 + (idx % 3) * 0.025, 0.2, 0.56 + (idx % 4) * 0.06);
      bushInst.setColorAt(idx, grassTint);
    });
    bushInst.computeBoundingSphere();
    root.add(bushInst);

    // 7. Surrounding spruce & silver birch forest
    this.addPerimeterForest(root, 34, -52, 48, false);
  }

  private addZoneObjectivesAndTapes(root: THREE.Group): void {
    const chapterColors: Record<number, number> = {
      1: 0xe8963a,
      2: 0x5fa88e,
      3: 0x5da4e8,
      4: 0xd98a4a,
      5: 0xe64d4d,
      7: 0xe8963a,
      8: 0x5fa88e,
      9: 0x5da4e8,
      10: 0xd98a4a,
      11: 0xe64d4d,
      13: 0x4ad6f0,
      14: 0x5fa88e,
      15: 0xe8963a,
      16: 0x739ef5,
      17: 0xe64d4d,
    };
    const activeChapNum = this.chapterIndex + 1;
    for (const obj of this.layout.objectives) {
      const shrine = createObjectiveShrine(
        chapterColors[obj.chapter] ?? 0x5fa88e,
        this.materials
      );
      shrine.group.position.set(obj.x, 0, obj.z);
      shrine.group.visible = obj.chapter === activeChapNum;
      root.add(shrine.group);
      this.objectiveNodes.push({
        spec: obj,
        group: shrine.group,
        beaconMat: shrine.beaconMat,
        ringMesh: shrine.ringMesh,
        beamMesh: shrine.beamMesh,
      });
    }

    for (const tape of this.layout.tapes) {
      const built = createCassetteTapeModel(this.materials);
      built.group.position.set(tape.x, 0, tape.z);
      tape.collected = this.collectedTapes.has(tape.id);
      built.group.visible = !tape.collected;
      root.add(built.group);
      this.tapeNodes.push({
        spec: tape,
        group: built.group,
        spinPivot: built.spinPivot,
        ringMesh: built.ringMesh,
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('auxclick', this.handleAuxClick);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('contextmenu', this.handleContextMenu);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('auxclick', this.handleAuxClick);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private handleResize = (): void => {
    this.deviceProfile = readBrowserDeviceProfile();
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio, this.deviceProfile.maxPixelRatio)
    );
    this.camera.aspect = w / h;
    if (!this.isScoped) {
      this.camera.fov = this.deviceProfile.recommendedFov;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.emitHud();
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.heldMouseButtons.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.mouseDown = false;
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.heldKeys.clear();
      this.heldMouseButtons.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualSprint = false;
      this.mouseDown = false;
    }
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private isPlayablePhase(): boolean {
    return this.phase === 'playing' || this.phase === 'hub';
  }

  private getActivePlayerCount(): number {
    if (this.coopClient?.isInActiveSession() && this.coopRoom) {
      return Math.max(1, Math.min(4, this.coopRoom.players.length));
    }
    return 1;
  }

  private getCoopScaling(): CoopScalingProfile {
    return computeCoopScaling(this.getActivePlayerCount());
  }

  private handleContextMenu = (e: MouseEvent): void => {
    if (this.isPlayablePhase() || this.keybindCaptureActive) {
      e.preventDefault();
    }
  };

  private handleAuxClick = (e: MouseEvent): void => {
    // Always suppress browser Back/Forward navigation on mouse side buttons (M4 / M5)
    if (e.button === 3 || e.button === 4 || (this.isPlayablePhase() && e.button === 1)) {
      e.preventDefault();
    }
  };

  private cycleToNextWeapon(): void {
    const idx = WEAPON_ORDER.indexOf(this.activeWeapon);
    const nextIdx = (idx + 1) % WEAPON_ORDER.length;
    this.selectWeapon(WEAPON_ORDER[nextIdx]);
  }

  private triggerBoundAction(code: string): boolean {
    if (matchesBinding(this.keybinds, 'reload', code)) {
      this.startReload();
      return true;
    }
    if (matchesBinding(this.keybinds, 'interact', code)) {
      this.tryInteractObjective();
      return true;
    }
    if (matchesBinding(this.keybinds, 'patRooster', code)) {
      this.patRooster();
      return true;
    }
    if (matchesBinding(this.keybinds, 'flashlight', code)) {
      this.toggleFlashlight();
      return true;
    }
    if (matchesBinding(this.keybinds, 'scope', code)) {
      this.toggleScope();
      return true;
    }
    if (matchesBinding(this.keybinds, 'nextTrack', code)) {
      this.cycleMusicTrack();
      return true;
    }
    if (matchesBinding(this.keybinds, 'nextWeapon', code)) {
      this.cycleToNextWeapon();
      return true;
    }
    if (matchesBinding(this.keybinds, 'jump', code)) {
      this.jumpBufferTimer = 0.14;
      return true;
    }
    return false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.keybindCaptureActive) return;

    // Allow typing inside Workshop input controls without hijacking keys
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;

    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
        this.enterHub('story');
      }
      return;
    }

    if (this.phase === 'cutscene') {
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        this.advanceCutscene();
      } else if (code === 'Escape') {
        e.preventDefault();
        this.skipCutscene();
      }
      return;
    }

    if (this.phase === 'upgrade') {
      if (code === 'Digit1' && this.upgradeChoices[0]) {
        e.preventDefault();
        this.selectUpgrade(this.upgradeChoices[0]);
      } else if (code === 'Digit2' && this.upgradeChoices[1]) {
        e.preventDefault();
        this.selectUpgrade(this.upgradeChoices[1]);
      } else if (code === 'Digit3' && this.upgradeChoices[2]) {
        e.preventDefault();
        this.selectUpgrade(this.upgradeChoices[2]);
      }
      return;
    }

    if (code === 'KeyP' || code === 'Escape') {
      if (this.isPlayablePhase()) {
        e.preventDefault();
        this.setPaused(true);
        return;
      }
      if (this.phase === 'paused') {
        e.preventDefault();
        this.setPaused(false);
        return;
      }
    }

    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (!this.isPlayablePhase()) return;

    if (!this.heldKeys.has(code)) {
      if (code === 'Digit1') {
        this.selectWeapon('shotgun');
      } else if (code === 'Digit2') {
        this.selectWeapon('awp');
      } else if (code === 'Digit3') {
        this.selectWeapon('pistol');
      } else if (code === 'Digit4') {
        this.selectWeapon('minigun');
      } else if (code === 'Digit5') {
        this.selectWeapon('p90');
      } else if (code === 'KeyG' && this.coopClient?.isInActiveSession()) {
        this.sendCoopPing();
      } else {
        this.triggerBoundAction(code);
      }
    }
    this.heldKeys.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isPlayablePhase() || !this.pointerLocked) return;
    const sens = (this.isScoped ? 0.00095 : 0.0022) * this.mouseSensitivity;
    this.playerYaw -= e.movementX * sens;
    this.playerPitch = Math.max(
      -1.15,
      Math.min(1.15, this.playerPitch - e.movementY * sens)
    );
  };

  private handleMouseDown = (e: MouseEvent): void => {
    // Always prevent browser Back/Forward on mouse side buttons (M4 / M5)
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
    }
    if (this.keybindCaptureActive) return;
    if (!this.isPlayablePhase()) return;

    const btnCode = mouseButtonToBindingCode(e.button);
    const isSideButton = e.button === 3 || e.button === 4;

    if (isSideButton && btnCode) {
      this.audio.unlock();
      if (!this.heldMouseButtons.has(btnCode)) {
        this.heldMouseButtons.add(btnCode);
        this.triggerBoundAction(btnCode);
      }
      return;
    }

    // On touch devices, virtual mobile buttons handle touch input instead of canvas pointer lock
    if (this.deviceProfile.isTouch) return;

    const target = e.target as HTMLElement | null;
    if (target && target !== this.renderer.domElement) return;

    this.audio.unlock();
    if (!this.pointerLocked) {
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {
        // Ignore pointer lock rejection in headless/sandbox environments
      }
    }

    if (e.button === 1) {
      e.preventDefault();
    }

    if (btnCode && !this.heldMouseButtons.has(btnCode)) {
      this.heldMouseButtons.add(btnCode);
      if (e.button !== 0 && this.triggerBoundAction(btnCode)) {
        return;
      }
    }

    if (e.button === 0) {
      this.mouseDown = true;
      this.fireJustPressed = true;
    } else if (e.button === 2 && !matchesBinding(this.keybinds, 'scope', 'Mouse2')) {
      // Keep fallback RMB scope only if RMB wasn't explicitly bound to another action
      const rmbBoundElsewhere = Object.values(this.keybinds).includes('Mouse2');
      if (!rmbBoundElsewhere) {
        this.toggleScope();
      }
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
    }
    const btnCode = mouseButtonToBindingCode(e.button);
    if (btnCode) {
      this.heldMouseButtons.delete(btnCode);
    }
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.isPlayablePhase() || this.keybindCaptureActive) return;
    const idx = WEAPON_ORDER.indexOf(this.activeWeapon);
    const nextIdx =
      (idx + (e.deltaY > 0 ? 1 : -1) + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    this.selectWeapon(WEAPON_ORDER[nextIdx]);
  };

  // --- Keybind & Mobile Touch Public Controls ---

  public getKeybinds(): KeybindMap {
    return { ...this.keybinds };
  }

  public setKeybind(action: BindableAction, code: string): KeybindMap {
    this.keybinds = applyKeybindUpdate(this.keybinds, action, code);
    saveKeybinds(this.keybinds);
    this.emitHud();
    return { ...this.keybinds };
  }

  public resetKeybinds(): KeybindMap {
    this.keybinds = { ...DEFAULT_KEYBINDS };
    saveKeybinds(this.keybinds);
    this.emitHud();
    return { ...this.keybinds };
  }

  public setKeybindCaptureMode(active: boolean): void {
    this.keybindCaptureActive = active;
    if (active) {
      this.heldKeys.clear();
      this.heldMouseButtons.clear();
      this.mouseDown = false;
    }
  }

  public setVirtualMove(x: number, y: number, sprint: boolean): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, x));
    this.virtualMoveY = Math.max(-1, Math.min(1, y));
    this.virtualSprint = sprint;
  }

  public applyTouchLook(dx: number, dy: number): void {
    if (!this.isPlayablePhase()) return;
    const sens = (this.isScoped ? 0.0022 : 0.0052) * this.mouseSensitivity;
    this.playerYaw -= dx * sens;
    this.playerPitch = Math.max(-1.15, Math.min(1.15, this.playerPitch - dy * sens));
  }

  public setVirtualFire(active: boolean): void {
    if (!this.isPlayablePhase()) {
      this.mouseDown = false;
      return;
    }
    this.audio.unlock();
    if (active && !this.mouseDown) {
      this.fireJustPressed = true;
    }
    this.mouseDown = active;
  }

  public triggerVirtualJump(): void {
    if (!this.isPlayablePhase()) return;
    this.jumpBufferTimer = 0.14;
  }

  public triggerInteract(): void {
    if (!this.isPlayablePhase()) return;
    this.tryInteractObjective();
  }

  public triggerReload(): void {
    if (!this.isPlayablePhase()) return;
    this.startReload();
  }

  // --- Public Imperative Controls for React Shell ---

  public setOpenHubSpecsHandler(cb: (() => void) | null): void {
    this.onOpenHubSpecs = cb;
  }

  public openHubSpecs(): void {
    document.exitPointerLock?.();
    this.heldKeys.clear();
    this.mouseDown = false;
    this.onOpenHubSpecs?.();
  }

  public enterHub(mode: GameMode = 'story', fromUserGesture = true): void {
    if (fromUserGesture) {
      this.audio.unlock();
    }
    this.mode = mode;
    this.loopNumber = 1;
    this.chapterIndex = 0;
    this.hubInCar = false;
    this.hubBoardedIds = [];
    this.hubLaunchTimer = 0;
    this.hubLastRangeHit = null;
    this.hubRangeHitTimer = 0;
    this.clearAllEnemies();
    this.clearAllPickups();
    this.rebuildWorldForZone('hub');
    this.resetRunState(true);
    this.flashlightOn = false;
    this.flashlight.intensity = 0;
    this.exeCorruption = 0;
    this.phase = 'hub';
    this.heldKeys.clear();
    this.heldMouseButtons.clear();
    this.mouseDown = false;
    this.customStoryLog = {
      speaker: TRANSLATIONS[this.lang].hub.title,
      text: TRANSLATIONS[this.lang].hub.subtitle,
    };
    this.storyLogKey = null;
    this.storyLogTimer = 6.5;
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.syncBodyState();
    this.emitHud();
  }

  public enterCoopHub(client: CoopClient, room: CoopRoomSnapshot): void {
    this.audio.unlock();
    this.coopClient = client;
    this.coopRoom = room;
    this.coopLocalDowned = false;
    this.clearCoopPartners();
    this.mode = room.mode;
    this.setDifficulty(room.difficulty);
    this.loopNumber = 1;
    this.chapterIndex = 0;
    this.hubBoardedIds = [...(room.boardedPlayers ?? [])];
    const myId = client.getClientId();
    this.hubInCar = Boolean(myId && this.hubBoardedIds.includes(myId));
    this.hubLaunchTimer = 0;
    this.hubLastRangeHit = null;
    this.hubRangeHitTimer = 0;
    this.clearAllEnemies();
    this.clearAllPickups();
    this.rebuildWorldForZone('hub');
    this.resetRunState(true);
    this.flashlightOn = false;
    this.flashlight.intensity = 0;
    this.exeCorruption = 0;

    // Offset co-op teammates slightly in the garage courtyard so players never overlap
    const myIdx = Math.max(0, room.players.findIndex((p) => p.id === myId));
    if (myIdx > 0) {
      const side = myIdx % 2 === 1 ? 1 : -1;
      const row = Math.ceil(myIdx / 2);
      this.playerX = this.layout.spawn.x + side * 2.1;
      this.playerZ = this.layout.spawn.z + row * 1.4;
    }

    this.phase = 'hub';
    this.heldKeys.clear();
    this.heldMouseButtons.clear();
    this.mouseDown = false;
    this.syncCoopPartnersFromRoom(room);
    this.customStoryLog = {
      speaker: TRANSLATIONS[this.lang].hub.title,
      text: TRANSLATIONS[this.lang].hub.subtitle,
    };
    this.storyLogKey = null;
    this.storyLogTimer = 7.0;
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.syncBodyState();
    this.emitHud();
  }

  public toggleHubMoskvitchBoard(): void {
    if (this.phase !== 'hub') return;
    this.audio.unlock();
    const nextBoarded = !this.hubInCar;
    this.hubInCar = nextBoarded;

    if (this.coopClient?.isInActiveSession()) {
      const myId = this.coopClient.getClientId();
      if (myId) {
        const set = new Set(this.hubBoardedIds);
        if (nextBoarded) set.add(myId);
        else set.delete(myId);
        this.hubBoardedIds = Array.from(set);
      }
      this.coopClient.setHubBoarded(nextBoarded);
      this.audio.playPickup(nextBoarded ? 'medkit' : 'ammo');
      this.emitHud();
      return;
    }

    // Solo hub launch: stepping into the Moskvitch triggers brief 0.9s ignition then match start!
    if (nextBoarded) {
      this.hubBoardedIds = ['solo'];
      this.hubLaunchTimer = 0.9;
      this.pickupToast = TRANSLATIONS[this.lang].hub.moskvitchLaunching;
      this.pickupToastTimer = 2.0;
      this.audio.playObjectiveComplete();
    } else {
      this.hubBoardedIds = [];
      this.hubLaunchTimer = 0;
    }
    this.emitHud();
  }

  public handleCoopHubBoardState(boardedIds: string[], totalPlayers: number): void {
    this.hubBoardedIds = [...boardedIds];
    const myId = this.coopClient?.getClientId();
    if (myId) {
      this.hubInCar = boardedIds.includes(myId);
    }
    if (this.phase === 'hub') {
      const t = TRANSLATIONS[this.lang];
      const missing = Math.max(0, totalPlayers - boardedIds.length);
      this.pickupToast =
        missing === 0 && totalPlayers > 0
          ? t.hub.moskvitchLaunching
          : t.hub.moskvitchWaiting(missing);
      this.pickupToastTimer = 2.8;
    }
    this.emitHud();
  }

  public startZonePreview(zoneId: ZoneId, fromUserGesture = true): void {
    if (zoneId === 'hub') {
      this.enterHub('story', fromUserGesture);
      return;
    }
    if (fromUserGesture) {
      this.audio.unlock();
    }
    const targetChapterIdx =
      zoneId === 'depot' ? 6 : zoneId === 'substation' ? 12 : 0;
    this.mode = 'story';
    this.loopNumber = 1;
    this.rebuildWorldForZone(zoneId);
    this.resetRunState(true);
    this.chapterIndex = targetChapterIdx;
    this.beginChapterGameplay(targetChapterIdx);
  }

  public startStory(): void {
    this.audio.unlock();
    this.mode = 'story';
    this.loopNumber = 1;
    if (this.currentZone !== 'suburb') {
      this.rebuildWorldForZone('suburb');
    }
    this.resetRunState(true);
    this.chapterIndex = 0;
    this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[0].introCutscene, false);
  }

  public startEndlessLoop(): void {
    this.audio.unlock();
    this.mode = 'endless';
    this.loopNumber = 1;
    this.endlessWave = 1;
    if (this.currentZone !== 'suburb') {
      this.rebuildWorldForZone('suburb');
    }
    this.resetRunState(true);
    this.beginEndlessWave(1);
  }

  public enterNextLoop(): void {
    this.audio.unlock();
    this.mode = 'story';
    this.loopNumber += 1;
    this.updateRecords();
    this.resetPlayerToSpawn();
    this.clearAllEnemies();
    this.clearAllPickups();
    this.hp = this.maxHp;
    this.stamina = 100;
    for (const id of WEAPON_ORDER) {
      this.ammo[id].mag = WEAPONS[id].magSize;
      this.ammo[id].reserve = Math.min(
        WEAPONS[id].maxReserve,
        this.ammo[id].reserve + WEAPONS[id].magSize * 2
      );
    }
    this.openUpgradeDraft('next_loop');
  }

  public selectUpgrade(id: UpgradeId): void {
    if (this.phase !== 'upgrade') return;
    this.audio.unlock();
    if (!this.ownedUpgrades.includes(id)) {
      this.ownedUpgrades.push(id);
    }
    this.upgradeChoices = [];
    this.audio.playUpgradeInstall();
    this.hp = Math.min(this.maxHp, this.hp + 20);

    const action = this.pendingAfterUpgrade;
    if (action === 'next_chapter') {
      this.openCutscene(
        TRANSLATIONS[this.lang].chapterMeta[this.chapterIndex].introCutscene,
        false
      );
    } else if (action === 'next_loop') {
      this.chapterIndex = 0;
      this.beginChapterGameplay(0);
    } else {
      this.endlessWave += 1;
      this.loopNumber = Math.max(1, Math.ceil(this.endlessWave / 2));
      this.updateRecords();
      this.beginEndlessWave(this.endlessWave);
    }
  }

  public toggleFlashlight(): void {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? this.flashlightIntensityLive : 0;
    this.audio.playFlashlightClick();
    this.emitHud();
  }

  private hasUpgrade(id: UpgradeId): boolean {
    return this.ownedUpgrades.includes(id);
  }

  private updateRecords(): void {
    let changed = false;
    if (this.score > this.records.bestScore) {
      this.records.bestScore = this.score;
      changed = true;
    }
    if (this.loopNumber > this.records.bestLoop) {
      this.records.bestLoop = this.loopNumber;
      changed = true;
    }
    if (this.kills > this.records.bestKills) {
      this.records.bestKills = this.kills;
      changed = true;
    }
    if (changed) {
      saveRunRecords(this.records);
    }
  }

  private openUpgradeDraft(
    after: 'next_chapter' | 'next_loop' | 'next_endless_wave'
  ): void {
    this.pendingAfterUpgrade = after;
    const choices = pickUpgradeChoices(
      UPGRADE_IDS,
      this.ownedUpgrades,
      this.kills + this.loopNumber * 19 + this.score + this.endlessWave * 7,
      3
    );
    if (choices.length === 0) {
      if (after === 'next_chapter') {
        this.openCutscene(
          TRANSLATIONS[this.lang].chapterMeta[this.chapterIndex].introCutscene,
          false
        );
      } else if (after === 'next_loop') {
        this.chapterIndex = 0;
        this.beginChapterGameplay(0);
      } else {
        this.endlessWave += 1;
        this.loopNumber = Math.max(1, Math.ceil(this.endlessWave / 2));
        this.beginEndlessWave(this.endlessWave);
      }
      return;
    }
    this.upgradeChoices = choices;
    this.phase = 'upgrade';
    this.heldKeys.clear();
    this.mouseDown = false;
    this.isScoped = false;
    this.audio.setMinigunSpin(0);
    document.exitPointerLock?.();
    this.syncBodyState();
    this.emitHud();
  }

  public setLanguage(lang: Language): void {
    if (this.lang === lang) return;
    this.lang = lang;
    saveLanguage(lang);
    this.applyDocumentLanguage();

    // Refresh active cutscene copy into the newly selected language seamlessly
    if (this.activeCutscene) {
      const t = TRANSLATIONS[this.lang];
      if (this.activeCutscene.id === 'epilogue') {
        this.activeCutscene = t.victoryCutscene;
      } else {
        const match = t.chapterMeta.find(
          (c) => c.introCutscene.id === this.activeCutscene?.id
        );
        if (match) {
          this.activeCutscene = match.introCutscene;
        }
      }
    }

    const t = TRANSLATIONS[this.lang];
    this.roosterStatusBanner =
      this.roosterMode === 'alert'
        ? t.roosterAlerting
        : this.roosterMode === 'circle_fly'
          ? t.roosterFlying
          : t.roosterHopping;

    this.emitHud();
  }

  public setRoosterName(name: RoosterNameId): void {
    if (this.roosterName === name) return;
    this.roosterName = name;
    saveRoosterName(name);
    const t = TRANSLATIONS[this.lang];
    this.roosterStatusBanner = localizeRoosterCopy(
      this.roosterMode === 'alert'
        ? t.roosterAlerting
        : this.roosterMode === 'circle_fly'
          ? t.roosterFlying
          : t.roosterHopping,
      this.lang,
      this.roosterName
    );
    this.emitHud();
  }

  public setDifficulty(difficulty: DifficultyId): void {
    if (this.difficulty === difficulty) return;
    this.difficulty = difficulty;
    saveDifficulty(difficulty);
    const preset = DIFFICULTY_PRESETS[difficulty];
    const prog = computeCharacterProgression(this.xp);
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = preset.startHp + prog.bonusMaxHp;
    if (this.phase === 'title') {
      this.hp = this.maxHp;
    } else {
      this.hp = Math.max(1, Math.min(this.maxHp, Math.round(ratio * this.maxHp)));
    }
    this.emitHud();
  }

  public setMouseSensitivity(sens: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, Number(sens.toFixed(2))));
    this.mouseSensitivity = clamped;
    saveSensitivity(clamped);
    this.emitHud();
  }

  private showStoryLog(
    key: keyof (typeof TRANSLATIONS)['ru']['storyLogs'],
    durationSec = 7.2
  ): void {
    this.storyLogKey = key;
    this.storyLogTimer = durationSec;
  }

  private applyDocumentLanguage(): void {
    document.documentElement.lang = this.lang;
    document.title = TRANSLATIONS[this.lang].pageTitle;
  }

  public startPlayImmediate(fromUserGesture = true): void {
    if (fromUserGesture) {
      this.audio.unlock();
    }
    this.mode = 'story';
    this.loopNumber = 1;
    if (this.currentZone !== 'suburb') {
      this.rebuildWorldForZone('suburb');
    }
    this.resetRunState(true);
    this.chapterIndex = 0;
    this.beginChapterGameplay(0);
  }

  public openCutscene(cutscene: CutsceneDef, victoryAfter: boolean): void {
    this.phase = 'cutscene';
    this.activeCutscene = cutscene;
    this.cutsceneBeatIndex = 0;
    this.cutsceneClock = 0;
    this.pendingVictoryAfterCutscene = victoryAfter;
    this.cutsceneVotedIds = [];
    this.cutsceneTotalPlayers = this.getActivePlayerCount();
    this.heldKeys.clear();
    this.mouseDown = false;
    document.exitPointerLock?.();
    if (this.coopClient?.isInActiveSession() && this.coopClient.isHost()) {
      this.coopClient.notifyCutsceneOpen(cutscene.id);
    }
    this.syncBodyState();
    this.emitHud();
  }

  public advanceCutscene(): void {
    if (this.phase !== 'cutscene' || !this.activeCutscene) return;
    this.audio.unlock();
    if (this.cutsceneBeatIndex + 1 < this.activeCutscene.beats.length) {
      this.cutsceneBeatIndex += 1;
      this.cutsceneClock = 0;
      this.emitHud();
      return;
    }
    this.skipCutscene();
  }

  public skipCutscene(): void {
    if (this.phase !== 'cutscene' || !this.activeCutscene) return;
    // In multi-player LAN co-op, skipping requires unanimous vote from ALL active squad members!
    if (this.coopClient?.isInActiveSession() && this.getActivePlayerCount() > 1) {
      const myId = this.coopClient.getClientId();
      if (myId && !this.cutsceneVotedIds.includes(myId)) {
        this.cutsceneVotedIds = [...this.cutsceneVotedIds, myId];
      }
      this.cutsceneTotalPlayers = this.getActivePlayerCount();
      this.coopClient.voteCutsceneSkip(this.activeCutscene.id, true);
      this.emitHud();
      return;
    }
    this.finishCutsceneImmediately();
  }

  private finishCutsceneImmediately(): void {
    if (this.phase !== 'cutscene') return;
    this.activeCutscene = null;
    this.cutsceneVotedIds = [];
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.baseFogColor);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(this.baseFogColor);
      }
    }
    if (this.pendingVictoryAfterCutscene) {
      this.pendingVictoryAfterCutscene = false;
      this.phase = 'victory';
      this.syncBodyState();
      this.emitHud();
      return;
    }
    this.beginChapterGameplay(this.chapterIndex);
  }

  public handleCoopCutsceneVotes(
    cutsceneId: string,
    votedIds: string[],
    totalPlayers: number
  ): void {
    if (this.activeCutscene && this.activeCutscene.id !== cutsceneId && cutsceneId) {
      // Keep vote count synchronized even if client is slightly behind beat
    }
    this.cutsceneVotedIds = [...votedIds];
    this.cutsceneTotalPlayers = Math.max(1, totalPlayers);
    this.emitHud();
  }

  public handleCoopCutsceneSkipped(): void {
    if (this.phase === 'cutscene') {
      this.finishCutsceneImmediately();
    }
  }

  private beginEndlessWave(wave: number): void {
    this.chapterKills = 0;
    this.endlessTargetKills = 7 + wave * 3;
    this.clearAllEnemies();

    for (const node of this.objectiveNodes) {
      node.spec.completed = true;
      node.group.visible = false;
    }

    for (const id of WEAPON_ORDER) {
      this.ammo[id].reserve = Math.min(
        WEAPONS[id].maxReserve,
        this.ammo[id].reserve + Math.round(WEAPONS[id].magSize * 1.4)
      );
    }

    this.phase = 'playing';
    this.heldKeys.clear();
    this.mouseDown = false;
    this.spawnTimer = 2.0;

    if (wave % 3 === 0) {
      this.spawnEnemy('watchman', 0, -4);
      this.spawnEnemy('screamer', 10, 6);
      this.showStoryLog('boss_arrival', 6.5);
    } else {
      this.spawnEnemy('crawler', -4, 8);
      this.spawnEnemy('lampshade', 6, -4);
      if (wave >= 2) {
        this.spawnEnemy('screamer', -10, -8);
      }
    }

    (document.activeElement as HTMLElement | null)?.blur?.();
    this.syncBodyState();
    this.emitHud();
  }

  private beginChapterGameplay(idx: number): void {
    const safeIdx = Math.max(0, Math.min(CHAPTERS.length - 1, idx));
    this.chapterIndex = safeIdx;
    this.chapterKills = 0;
    this.clearAllEnemies();

    const chap = CHAPTERS[safeIdx];
    const targetZone: ZoneId = chap.zoneId;
    if (this.currentZone !== targetZone) {
      this.rebuildWorldForZone(targetZone);
      this.resetPlayerToSpawn();
      if (this.coopClient?.isInActiveSession() && this.coopRoom) {
        const myId = this.coopClient.getClientId();
        const myIdx = Math.max(0, this.coopRoom.players.findIndex((p) => p.id === myId));
        if (myIdx > 0) {
          const side = myIdx % 2 === 1 ? 1 : -1;
          const row = Math.ceil(myIdx / 2);
          this.playerX = this.layout.spawn.x + side * 2.1;
          this.playerZ = this.layout.spawn.z + row * 1.4;
        }
      }
      this.pickupToast = TRANSLATIONS[this.lang].zoneNames[targetZone];
      this.pickupToastTimer = 3.8;
    }

    const chapterPalette = [0xe8963a, 0x5fa88e, 0x5da4e8, 0xd98a4a, 0xe64d4d, 0xd84654];

    // Show objectives belonging to this chapter
    for (const node of this.objectiveNodes) {
      const alreadyDoneInCoop = Boolean(
        this.coopRoom?.completedObjectives.includes(node.spec.id)
      );
      node.spec.completed = node.spec.chapter < safeIdx + 1 || alreadyDoneInCoop;
      node.group.visible = node.spec.chapter === safeIdx + 1;
      node.beamMesh.visible = !node.spec.completed;
      const col = node.spec.completed
        ? 0x45d68a
        : chapterPalette[(node.spec.chapter - 1) % chapterPalette.length];
      node.beaconMat.emissive.setHex(col);
      node.beaconMat.color.setHex(col);
    }

    // Refill reserve ammo slightly between chapters (scaled by co-op squad size)
    const coopScale = this.getCoopScaling();
    for (const id of WEAPON_ORDER) {
      this.ammo[id].reserve = Math.min(
        WEAPONS[id].maxReserve,
        this.ammo[id].reserve + Math.round(WEAPONS[id].magSize * 1.5 * coopScale.ammoRefillMult)
      );
    }

    this.phase = 'playing';
    this.flashlightOn = true;
    this.heldKeys.clear();
    this.heldMouseButtons.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.mouseDown = false;
    this.spawnTimer = 2.6; // opening few seconds are calm & survivable without input

    const isCoopGuest = Boolean(this.coopClient?.isInActiveSession() && !this.coopClient.isHost());
    const chapStartLogs: Array<keyof (typeof TRANSLATIONS)['ru']['storyLogs']> = [
      'ch1_start',
      'ch2_start',
      'ch3_start',
      'ch4_start',
      'ch5_start',
      'boss_arrival',
      'ch7_start',
      'ch8_start',
      'ch9_start',
      'ch10_start',
      'ch11_start',
      'ch12_start',
      'ch13_start',
      'ch14_start',
      'ch15_start',
      'ch16_start',
      'ch17_start',
      'ch18_start',
    ];

    if (!isCoopGuest) {
      if (chap.hasBoss) {
        // Spawn the Act Boss Watchman in the zone center!
        this.spawnEnemy('watchman', 0, -4);
        this.spawnEnemy('crawler', -11, 8);
        this.spawnEnemy('screamer', 11, -6);
      } else {
        // Spawn initial enemies at fair medium distance down the street/courtyard
        this.spawnEnemy('crawler', -3.2, 8);
        this.spawnEnemy('lampshade', 6.5, -2);
        if (safeIdx >= 2) {
          this.spawnEnemy('screamer', -9.5, -10);
        }
      }
    }

    const startLog = chapStartLogs[safeIdx];
    if (startLog && startLog in TRANSLATIONS[this.lang].storyLogs) {
      this.showStoryLog(startLog, 8.2);
    }

    (document.activeElement as HTMLElement | null)?.blur?.();
    this.syncBodyState();
    this.emitHud();
  }

  public startCoopSession(client: CoopClient, room: CoopRoomSnapshot): void {
    this.audio.unlock();
    this.coopClient = client;
    this.coopRoom = room;
    this.coopLocalDowned = false;
    this.hubInCar = false;
    this.hubBoardedIds = [];
    this.hubLaunchTimer = 0;
    this.clearCoopPartners();

    this.mode = room.mode;
    this.setDifficulty(room.difficulty);
    this.loopNumber = 1;
    this.chapterIndex = Math.max(0, Math.min(CHAPTERS.length - 1, room.chapterIndex));
    const targetZone: ZoneId =
      room.mode === 'endless' ? 'suburb' : CHAPTERS[this.chapterIndex].zoneId;
    if (this.currentZone !== targetZone) {
      this.rebuildWorldForZone(targetZone);
    }
    this.resetRunState(true);

    // Offset guests slightly on the road shoulder so teammates never overlap on spawn!
    const myId = client.getClientId();
    const myIdx = Math.max(0, room.players.findIndex((p) => p.id === myId));
    if (myIdx > 0) {
      const side = myIdx % 2 === 1 ? 1 : -1;
      const row = Math.ceil(myIdx / 2);
      this.playerX = this.layout.spawn.x + side * 2.1;
      this.playerZ = this.layout.spawn.z + row * 1.4;
    }

    // Apply any already-completed objectives/tapes if joining mid-run
    for (const tid of room.collectedTapes) {
      this.markTapeCollectedLocally(tid);
    }

    if (room.mode === 'endless') {
      this.endlessWave = 1;
      this.beginEndlessWave(1);
    } else {
      this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[this.chapterIndex].introCutscene, false);
    }
    this.syncCoopPartnersFromRoom(room);
    this.emitHud();
  }

  public updateCoopRoomSnapshot(room: CoopRoomSnapshot | null): void {
    const myId = this.coopClient?.getClientId();
    const wasHost = Boolean(this.coopRoom && myId && this.coopRoom.hostId === myId);
    this.coopRoom = room;
    if (!room) {
      this.clearCoopPartners();
      this.coopLocalDowned = false;
    } else {
      this.syncCoopPartnersFromRoom(room);
      const isNowHost = Boolean(myId && room.hostId === myId);
      if (!wasHost && isNowHost && this.phase === 'playing') {
        // Host migrated to us: seamlessly resume authoritative AI & spawning
        this.spawnTimer = Math.min(this.spawnTimer, 1.4);
      }
      // If all other players left while we were downed, auto-recover so session doesn't soft-lock
      if (this.coopLocalDowned && this.coopPartners.size === 0) {
        this.coopLocalDowned = false;
        this.hp = Math.max(45, this.hp);
        this.hurtInvulnTimer = 2.0;
      }
    }
    this.emitHud();
  }

  public handleRemotePlayerLeft(
    playerId: string,
    playerName: string,
    newHostId?: string,
    newHostName?: string
  ): void {
    const partner = this.coopPartners.get(playerId);
    if (partner) {
      this.scene.remove(partner.rig.group);
      this.coopPartners.delete(playerId);
    }
    const myId = this.coopClient?.getClientId();
    const becameHost = Boolean(newHostId && myId && newHostId === myId);
    if (becameHost && this.phase === 'playing') {
      this.spawnTimer = Math.min(this.spawnTimer, 1.2);
    }
    if (this.coopLocalDowned && this.coopPartners.size === 0) {
      this.coopLocalDowned = false;
      this.hp = Math.max(45, this.hp);
      this.hurtInvulnTimer = 2.0;
    }
    if (this.phase === 'playing') {
      const hostNote = becameHost
        ? this.lang === 'ru'
          ? ' Вы стали новым хостом сессии.'
          : ' You are now the session host.'
        : newHostName
          ? this.lang === 'ru'
            ? ` Новый хост: ${newHostName}.`
            : ` New host: ${newHostName}.`
          : '';
      this.customStoryLog = {
        speaker: 'LAN · РАЦИЯ',
        text:
          (this.lang === 'ru'
            ? `${playerName} отключился от отряда.`
            : `${playerName} disconnected from squad.`) + hostNote,
      };
      this.storyLogKey = null;
      this.storyLogTimer = 5.0;
    }
    this.emitHud();
  }

  public stopCoopSession(): void {
    this.coopClient = null;
    this.coopRoom = null;
    this.coopLocalDowned = false;
    this.clearCoopPartners();
    if (this.coopPingBeacon) {
      this.scene.remove(this.coopPingBeacon);
      this.coopPingBeacon = null;
    }
    this.emitHud();
  }

  private clearCoopPartners(): void {
    for (const p of this.coopPartners.values()) {
      this.scene.remove(p.rig.group);
    }
    this.coopPartners.clear();
  }

  private syncCoopPartnersFromRoom(room: CoopRoomSnapshot): void {
    const myId = this.coopClient?.getClientId();
    const activeIds = new Set<string>();
    for (const summary of room.players) {
      if (summary.id === myId) continue;
      activeIds.add(summary.id);
      const existing = this.coopPartners.get(summary.id);
      if (existing) {
        existing.name = summary.name;
        existing.isHost = summary.isHost;
        existing.hp = summary.hp;
        existing.maxHp = summary.maxHp;
        existing.kills = summary.kills;
        existing.isDowned = summary.isDowned;
        existing.weaponId = summary.weaponId;
        existing.rig.setWeapon(summary.weaponId);
      } else {
        const rig = createCoopPartnerModel(this.shadowTex, summary.name);
        rig.setWeapon(summary.weaponId);
        rig.group.position.set(2.2, 0, 30.8);
        this.scene.add(rig.group);
        this.coopPartners.set(summary.id, {
          id: summary.id,
          name: summary.name,
          rig,
          x: 2.2,
          y: 0,
          z: 30.8,
          targetX: 2.2,
          targetY: 0,
          targetZ: 30.8,
          yaw: 0,
          targetYaw: 0,
          pitch: 0,
          hp: summary.hp,
          maxHp: summary.maxHp,
          kills: summary.kills,
          isDowned: summary.isDowned,
          isHost: summary.isHost,
          isMoving: false,
          weaponId: summary.weaponId,
          isReloading: false,
          reloadProgress: 0,
          muzzleTimer: 0,
          walkPhase: 0,
          lastLabelSig: '',
        });
      }
    }
    for (const [pid, partner] of this.coopPartners.entries()) {
      if (!activeIds.has(pid)) {
        this.scene.remove(partner.rig.group);
        this.coopPartners.delete(pid);
      }
    }
  }

  public handleRemotePlayerState(st: CoopPlayerState): void {
    if (st.id === this.coopClient?.getClientId()) return;
    let partner = this.coopPartners.get(st.id);
    if (!partner) {
      const rig = createCoopPartnerModel(this.shadowTex, st.name);
      rig.setWeapon(st.weaponId);
      rig.group.position.set(st.x, st.y, st.z);
      this.scene.add(rig.group);
      partner = {
        id: st.id,
        name: st.name,
        rig,
        x: st.x,
        y: st.y,
        z: st.z,
        targetX: st.x,
        targetY: st.y,
        targetZ: st.z,
        yaw: st.yaw,
        targetYaw: st.yaw,
        pitch: st.pitch,
        hp: st.hp,
        maxHp: st.maxHp,
        kills: st.kills,
        isDowned: st.isDowned,
        isHost: Boolean(this.coopRoom && this.coopRoom.hostId === st.id),
        isMoving: st.isMoving,
        weaponId: st.weaponId,
        isReloading: st.isReloading,
        reloadProgress: st.reloadProgress,
        muzzleTimer: st.isFiring ? 0.09 : 0,
        walkPhase: 0,
        lastLabelSig: '',
      };
      this.coopPartners.set(st.id, partner);
    } else {
      partner.name = st.name;
      partner.targetX = st.x;
      partner.targetY = st.y;
      partner.targetZ = st.z;
      partner.targetYaw = st.yaw;
      partner.pitch = st.pitch;
      partner.hp = st.hp;
      partner.maxHp = st.maxHp;
      partner.kills = st.kills;
      partner.isDowned = st.isDowned;
      partner.isMoving = st.isMoving;
      partner.weaponId = st.weaponId;
      partner.rig.setWeapon(st.weaponId);
      partner.isReloading = st.isReloading;
      partner.reloadProgress = st.reloadProgress;
      if (st.isFiring) partner.muzzleTimer = 0.09;
    }
  }

  public handleRemotePlayerShoot(playerId: string, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): void {
    const partner = this.coopPartners.get(playerId);
    if (partner) {
      partner.muzzleTimer = 0.1;
    }
    this.spawnBurst(ox + dx * 1.4, Math.max(0.4, oy + dy * 1.4), oz + dz * 1.4, 4, 0xffbe5c, 3.2);
  }

  public handleRemotePlayerRevived(targetId: string, byName: string): void {
    const myId = this.coopClient?.getClientId();
    if (targetId === myId) {
      this.coopLocalDowned = false;
      this.hp = Math.max(60, Math.round(this.maxHp * 0.65));
      this.hurtInvulnTimer = 2.0;
      this.audio.playPickup('medkit');
      this.customStoryLog = {
        speaker: `LAN · ${byName}`,
        text: this.lang === 'ru'
          ? `${byName} поднял вас на ноги! Возвращайтесь в строй.`
          : `${byName} revived you! Back in the fight.`,
      };
      this.storyLogKey = null;
      this.storyLogTimer = 4.5;
      this.emitHud();
    } else {
      const p = this.coopPartners.get(targetId);
      if (p) {
        p.isDowned = false;
        p.hp = Math.max(60, Math.round(p.maxHp * 0.65));
      }
    }
  }

  public handleRemotePing(playerName: string, x: number, z: number, label: string): void {
    if (!this.coopPingBeacon) {
      this.coopPingBeacon = createCoopPingBeacon();
      this.scene.add(this.coopPingBeacon);
    }
    this.coopPingBeacon.position.set(x, 0, z);
    this.coopPingBeacon.visible = true;
    this.coopPingTimer = 7.0;
    this.coopLastPingText = `${playerName}: ${label}`;
    this.audio.playPickup('ammo');
    this.emitHud();
  }

  public sendCoopPing(): void {
    if (!this.coopClient?.isInActiveSession()) return;
    const fwdX = -Math.sin(this.playerYaw);
    const fwdZ = -Math.cos(this.playerYaw);
    const px = Math.max(-32, Math.min(32, this.playerX + fwdX * 8));
    const pz = Math.max(-44, Math.min(42, this.playerZ + fwdZ * 8));
    const label = TRANSLATIONS[this.lang].lanCoop.pingSentLabel;
    this.coopClient.sendPing(px, pz, label);
  }

  public handleRemoteWorldEnemies(list: CoopSyncedEnemy[], chapterKills: number, chapterTarget: number): void {
    if (!this.coopClient?.isInActiveSession() || this.coopClient.isHost()) return;
    this.chapterKills = chapterKills;
    if (this.mode === 'endless') {
      this.endlessTargetKills = chapterTarget;
    }

    const seen = new Set<string>();
    const stats: Record<EnemyKind, { radius: number; hitHeight: number }> = {
      crawler: { radius: 0.55, hitHeight: 1.75 },
      lampshade: { radius: 0.58, hitHeight: 2.4 },
      screamer: { radius: 0.56, hitHeight: 2.35 },
      watchman: { radius: 1.05, hitHeight: 3.55 },
    };

    for (const remote of list) {
      seen.add(remote.id);
      let local = this.enemies.find((e) => e.netId === remote.id);
      if (!local) {
        const rig = createEnemyModel(remote.kind, this.shadowTex);
        rig.group.position.set(remote.x, 0, remote.z);
        this.scene.add(rig.group);
        const st = stats[remote.kind];
        local = {
          id: this.nextEnemyId++,
          netId: remote.id,
          kind: remote.kind,
          x: remote.x,
          z: remote.z,
          targetX: remote.x,
          targetZ: remote.z,
          targetYaw: remote.yaw,
          hp: remote.hp,
          maxHp: remote.maxHp,
          radius: st.radius,
          hitHeight: st.hitHeight,
          rig,
          seed: Math.random() * 10,
          phaseTime: Math.random() * 6,
          gaitPhase: Math.random() * Math.PI * 2,
          actualSpeed: 2.4,
          prevYaw: remote.yaw,
          turnRate: 0,
          flinchTimer: 0,
          hitFlash: remote.hitFlash,
          telegraphTimer: 0,
          telegraphDuration: 0.5,
          attackCooldown: 1.2,
          dying: false,
          deathTimer: 0,
          knockVx: 0,
          knockVz: 0,
          tacticMode: 'approach',
          tacticTimer: 2,
          flankSign: 1,
          recentHitTimer: 0,
        };
        this.enemies.push(local);
      } else {
        local.targetX = remote.x;
        local.targetZ = remote.z;
        local.targetYaw = remote.yaw;
        local.hp = remote.hp;
        local.maxHp = remote.maxHp;
        if (remote.hitFlash > 0) local.hitFlash = Math.max(local.hitFlash, remote.hitFlash);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.netId && !seen.has(e.netId)) {
        this.spawnBurst(e.x, 1.2, e.z, 12, 0xc93b3b, 4.2);
        this.scene.remove(e.rig.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  public handleRemoteWorldPickups(list: CoopSyncedPickup[]): void {
    if (!this.coopClient?.isInActiveSession() || this.coopClient.isHost()) return;
    const seen = new Set<string>();
    for (const remote of list) {
      seen.add(remote.id);
      const exists = this.pickups.find((p) => p.netId === remote.id);
      if (!exists) {
        const built = createPickupModel(remote.kind);
        built.group.position.set(remote.x, 0, remote.z);
        this.scene.add(built.group);
        this.pickups.push({
          id: this.nextPickupId++,
          netId: remote.id,
          kind: remote.kind,
          x: remote.x,
          z: remote.z,
          life: 24,
          group: built.group,
          spinPivot: built.spinPivot,
        });
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.netId && !seen.has(p.netId)) {
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  public handleRemotePickupTake(pickupId: string, byId: string): void {
    const myId = this.coopClient?.getClientId();
    if (byId === myId) return;
    const idx = this.pickups.findIndex((p) => p.netId === pickupId || `pk_${p.id}` === pickupId);
    if (idx !== -1) {
      const p = this.pickups[idx];
      this.spawnBurst(p.x, 0.7, p.z, 10, 0xe8963a, 3.0);
      this.scene.remove(p.group);
      this.pickups.splice(idx, 1);
    }
  }

  public handleRemoteEnemyDamage(enemyId: string, damage: number, headshot: boolean): void {
    if (!this.coopClient?.isHost()) return;
    const target = this.enemies.find((e) => !e.dying && (e.netId === enemyId || `e_${e.id}` === enemyId));
    if (!target) return;
    target.hp -= damage;
    target.hitFlash = 0.09;
    target.flinchTimer = target.kind === 'watchman' ? 0.16 : 0.26;
    target.recentHitTimer = 1.65;
    this.spawnBurst(target.x, 1.35, target.z, 6, headshot ? 0xe8963a : 0x992828, 4.0);
    if (target.hp <= 0 && !target.dying) {
      target.dying = true;
      target.deathTimer = 0.48;
      this.kills += 1;
      this.chapterKills += 1;
      this.score += target.kind === 'watchman' ? 900 : 100;
      this.awardXp(target.kind === 'watchman' ? 360 : 45);
      this.maybeSpawnPickup(target.x, target.z, target.kind === 'watchman');
      this.spawnBurst(target.x, 1.3, target.z, 18, 0xc93b3b, 5.0);
      this.checkChapterCompletion();
    }
  }

  public handleRemoteObjectiveComplete(objectiveId: string, byName: string): void {
    const node = this.objectiveNodes.find((n) => n.spec.id === objectiveId);
    if (!node || node.spec.completed) return;
    node.spec.completed = true;
    node.beaconMat.emissive.setHex(0x45d68a);
    node.beaconMat.color.setHex(0x45d68a);
    node.beamMesh.visible = false;
    this.audio.playObjectiveComplete();
    this.spawnBurst(node.spec.x, 1.8, node.spec.z, 18, 0x5fa88e, 4.0);
    this.customStoryLog = {
      speaker: `LAN · ${byName}`,
      text: `${byName}: ${TRANSLATIONS[this.lang].objectiveLabels[objectiveId] ?? node.spec.label}`,
    };
    this.storyLogKey = null;
    this.storyLogTimer = 5.5;
    if (this.coopClient?.isHost()) {
      this.checkChapterCompletion();
    }
    this.emitHud();
  }

  public handleRemoteTapeCollect(tapeId: string, byName: string): void {
    const newlyAdded = this.markTapeCollectedLocally(tapeId);
    if (!newlyAdded) return;
    const t = TRANSLATIONS[this.lang];
    const meta = t.storyTapes[tapeId as keyof typeof t.storyTapes];
    if (meta) {
      this.pickupToast = `${byName}: ${t.tapeCollectedToast(meta.title, this.collectedTapes.size, this.tapeNodes.length)}`;
      this.pickupToastTimer = 4.0;
      this.customStoryLog = {
        speaker: `${meta.code} · ${meta.speaker}`,
        text: meta.text,
      };
      this.storyLogKey = null;
      this.storyLogTimer = 8.0;
      this.audio.playPickup('ammo');
    }
    this.emitHud();
  }

  public handleRemoteChapterAdvance(chapterIndex: number, victory?: boolean): void {
    if (victory) {
      this.openCutscene(TRANSLATIONS[this.lang].victoryCutscene, true);
      return;
    }
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, chapterIndex));
    this.chapterIndex = clamped;
    this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[clamped].introCutscene, false);
  }

  private markTapeCollectedLocally(tapeId: string): boolean {
    const wasCollected = this.collectedTapes.has(tapeId);
    this.collectedTapes.add(tapeId);
    saveCollectedTapes(Array.from(this.collectedTapes));
    const node = this.tapeNodes.find((n) => n.spec.id === tapeId);
    if (node) {
      node.spec.collected = true;
      node.group.visible = false;
    }
    return !wasCollected;
  }

  public setPaused(paused: boolean): void {
    if (paused && this.isPlayablePhase()) {
      this.phaseBeforePause = this.phase;
      this.phase = 'paused';
      this.heldKeys.clear();
      this.mouseDown = false;
      this.isScoped = false;
      this.audio.setPaused(true);
      document.exitPointerLock?.();
      this.syncBodyState();
      this.emitHud();
    } else if (!paused && this.phase === 'paused') {
      this.phase = this.phaseBeforePause === 'hub' ? 'hub' : 'playing';
      this.audio.setPaused(false);
      (document.activeElement as HTMLElement | null)?.blur?.();
      this.syncBodyState();
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.clearAllEnemies();
    this.stopCoopSession();
    this.hubInCar = false;
    this.hubBoardedIds = [];
    this.hubLaunchTimer = 0;
    this.cutsceneVotedIds = [];
    if (this.currentZone !== 'suburb') {
      this.rebuildWorldForZone('suburb');
    }
    this.resetRunState();
    this.phase = 'title';
    this.activeCutscene = null;
    this.audio.setPaused(false);
    document.exitPointerLock?.();
    this.syncBodyState();
    this.emitHud();
  }

  private resetWeaponRigRestPose(id: WeaponId): void {
    const rig = this.weaponRigs[id];
    if (!rig) return;
    if (rig.pumpForend) {
      rig.pumpForend.position.set(0, -0.016, -0.4);
      rig.pumpForend.rotation.set(0, 0, 0);
    }
    if (rig.slide) {
      rig.slide.position.set(0, 0.048, -0.125);
    }
    if (rig.boltHandle) {
      rig.boltHandle.position.set(0.042, 0.038, 0.02);
      rig.boltHandle.rotation.set(0, 0, 0);
    }
    if (rig.magazine) {
      if (id === 'awp') {
        rig.magazine.position.set(0, -0.078, -0.14);
        rig.magazine.rotation.set(0.08, 0, 0);
      } else if (id === 'pistol') {
        rig.magazine.position.set(0, -0.1, 0.032);
        rig.magazine.rotation.set(0, 0, 0);
      } else if (id === 'p90') {
        rig.magazine.position.set(0, 0.084, -0.09);
        rig.magazine.rotation.set(0, 0, 0);
      }
    }
    if (rig.ammoDrum) {
      rig.ammoDrum.position.set(-0.125, -0.145, -0.14);
      rig.ammoDrum.rotation.set(0, 0, 0);
    }
    if (rig.chargingHandle) {
      rig.chargingHandle.position.set(0, 0.032, -0.28);
    }
    if (rig.leftHand) {
      rig.leftHand.position.set(0, 0, 0);
      rig.leftHand.rotation.set(0, 0, 0);
    }
  }

  public selectWeapon(id: WeaponId): void {
    if (this.activeWeapon === id) return;
    this.resetWeaponRigRestPose(this.activeWeapon);
    this.activeWeapon = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.isScoped = false;
    this.minigunSpin = 0;
    this.audio.setMinigunSpin(0);
    for (const wid of WEAPON_ORDER) {
      this.weaponRigs[wid].group.visible = wid === id;
    }
    this.resetWeaponRigRestPose(id);
    this.weaponKickZ = 0.14;
    if (shouldAutoReload(id, this.ammo[id], this.reloading, false)) {
      this.startReload();
      return;
    }
    this.emitHud();
  }

  public toggleScope(): void {
    if (this.activeWeapon === 'awp' && !this.reloading) {
      this.isScoped = !this.isScoped;
      this.emitHud();
    }
  }

  public startReload(): void {
    const cfg = WEAPONS[this.activeWeapon];
    const st = this.ammo[this.activeWeapon];
    if (this.reloading || st.mag >= cfg.magSize || st.reserve <= 0) return;
    this.reloading = true;
    const fastBolt =
      this.activeWeapon === 'awp' && this.hasUpgrade('awp_fastbolt') ? 0.62 : 1;
    const prog = computeCharacterProgression(this.xp);
    this.activeReloadDuration = (cfg.reloadTime * fastBolt) / prog.reloadSpeedMult;
    this.reloadTimer = this.activeReloadDuration;
    this.isScoped = false;
    this.audio.playReload(this.activeWeapon, this.activeReloadDuration);
    this.emitHud();
  }

  public patRooster(): void {
    if (!this.isPlayablePhase()) return;
    this.audio.unlock();
    const out = stepRoosterCompanion({
      x: this.roosterX,
      y: this.roosterY,
      z: this.roosterZ,
      mode: this.roosterMode,
      orbitAngle: this.roosterOrbitAngle,
      flightTimer: this.roosterFlightTimer,
      patTimer: this.roosterPatTimer,
      patCooldown: this.roosterPatCooldown,
      patCount: this.roosterPatCount,
      crowCooldown: this.roosterCrowCooldown,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      nearestThreat: null,
      patRequested: true,
      dt: 0.016,
      lang: this.lang,
      roosterName: this.roosterName,
    });
    const blessed = this.hasUpgrade('petya_blessing');
    const diffPatHeal = DIFFICULTY_PRESETS[this.difficulty].patHealBonus;
    this.roosterMode = out.mode;
    this.roosterPatTimer = out.patTimer;
    this.roosterPatCooldown = blessed ? out.patCooldown * 0.5 : out.patCooldown;
    this.roosterPatCount = out.patCount;
    const heal = out.healAmount > 0 ? diffPatHeal + (blessed ? 10 : 0) : 0;
    const t = TRANSLATIONS[this.lang];
    this.roosterStatusBanner = localizeRoosterCopy(
      heal > 0 ? t.roosterHappyHeal(heal) : t.roosterHappyCluck,
      this.lang,
      this.roosterName
    );

    if (heal > 0) {
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.stamina = 100;
      this.awardXp(25);
    }
    this.audio.playRoosterPat();
    this.spawnBurst(this.roosterX, this.roosterY + 0.55, this.roosterZ, 14, 0xf2b544, 3.6);
    this.emitHud();
  }

  public setScreamerIntensity(mode: ScreamerIntensity): void {
    this.screamerIntensity = mode;
    this.emitHud();
  }

  public triggerScreamerPreview(): void {
    this.audio.unlock();
    this.triggerScreamer('preview');
  }

  public toggleMute(): boolean {
    const muted = this.audio.toggleMute();
    this.emitHud();
    return muted;
  }

  public setMusicPlaylistListener(cb: (settings: MusicSettings) => void): void {
    this.audio.setPlaylistChangeListener(cb);
  }

  public getMusicSettings(): MusicSettings {
    return this.audio.getSettings();
  }

  public updateMusicSettings(partial: Partial<MusicSettings>): MusicSettings {
    this.audio.unlock();
    const next = this.audio.updateMusicSettings(partial);
    this.emitHud();
    return next;
  }

  public async addCustomMusicFiles(files: File[]): Promise<MusicSettings> {
    this.audio.unlock();
    const next = await this.audio.addCustomAudioFiles(files);
    this.emitHud();
    return next;
  }

  public selectCustomMusicTrack(id: string): MusicSettings {
    this.audio.unlock();
    const next = this.audio.selectCustomTrack(id);
    this.emitHud();
    return next;
  }

  public async removeCustomMusicTrack(id: string): Promise<MusicSettings> {
    const next = await this.audio.removeCustomTrack(id);
    this.emitHud();
    return next;
  }

  public stopCustomPlaybackToSynth(): MusicSettings {
    const next = this.audio.stopCustomPlaybackToSynth();
    this.emitHud();
    return next;
  }

  public async clearAllCustomMusicTracks(): Promise<MusicSettings> {
    const next = await this.audio.clearAllCustomTracks();
    this.emitHud();
    return next;
  }

  public loadCustomMusicFile(file: File): MusicSettings {
    this.audio.unlock();
    this.audio.loadCustomAudioFile(file);
    this.emitHud();
    return this.audio.getSettings();
  }

  public clearCustomMusicFile(): MusicSettings {
    const next = this.audio.stopCustomPlaybackToSynth();
    this.emitHud();
    return next;
  }

  public cycleMusicTrack(): MusicSettings {
    this.audio.unlock();
    const t = TRANSLATIONS[this.lang];
    // If user loaded real MP3s onto the Cassette Deck, [N] cycles through their real tracks!
    if (this.audio.hasCustomPlaylist()) {
      const nextName = this.audio.cycleCustomTrack();
      if (nextName) {
        this.trackToast = `${t.trackToastPrefix}: ${nextName}`;
        this.trackToastTimer = 3.4;
        this.emitHud();
        return this.audio.getSettings();
      }
    }

    const cur = this.audio.getSettings();
    const curIdx = MUSIC_TRACKS.findIndex((tr) => tr.id === cur.trackId);
    const nextTrack = MUSIC_TRACKS[(curIdx + 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length];
    this.audio.stopCustomPlaybackToSynth();
    const updated = this.audio.updateMusicSettings({
      trackId: nextTrack.id,
      bpm: nextTrack.defaultBpm,
    });
    const trackName = localizeRoosterCopy(
      t.musicTracks[nextTrack.id].name,
      this.lang,
      this.roosterName
    );
    this.trackToast = `${t.trackToastPrefix}: ${trackName}`;
    this.trackToastTimer = 3.2;
    this.emitHud();
    return updated;
  }

  private awardXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    const prog = computeCharacterProgression(this.xp);
    if (prog.level > this.characterLevel) {
      this.characterLevel = prog.level;
      this.maxHp = DIFFICULTY_PRESETS[this.difficulty].startHp + prog.bonusMaxHp;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      const t = TRANSLATIONS[this.lang];
      const rankTitle = t.characterRanks[prog.level - 1] ?? t.characterRanks[0];
      this.levelUpToast = t.levelUpBanner(prog.level, rankTitle);
      this.levelUpToastTimer = 4.2;
      this.audio.playLevelUpFanfare();
    }
  }

  public applyTexturePreset(packId: string): void {
    const pack = TEXTURE_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    if (pack.useStarterArt) {
      loadGeneratedStarterTextures(this.materials, this.maxAnisotropy);
      return;
    }
    if (pack.useExeArt) {
      loadExeCorruptedTextures(this.materials, this.maxAnisotropy);
      return;
    }
    applyCustomTextureToMaterial(this.materials, pack.specs.house, this.maxAnisotropy);
    applyCustomTextureToMaterial(this.materials, pack.specs.fence, this.maxAnisotropy);
    applyCustomTextureToMaterial(this.materials, pack.specs.road, this.maxAnisotropy);
    applyCustomTextureToMaterial(this.materials, pack.specs.lawn, this.maxAnisotropy);
  }

  public applyCustomTexture(spec: CustomTextureSpec): void {
    applyCustomTextureToMaterial(this.materials, spec, this.maxAnisotropy);
  }

  public async applyUploadedTexture(slot: TextureSlot, file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      await applyImageUrlToMaterial(this.materials, slot, url, this.maxAnisotropy);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // --- Internal Simulation Helpers ---

  private resetRunState(fullReset = true): void {
    this.resetPlayerToSpawn();
    this.clearAllPickups();
    this.maxHp = DIFFICULTY_PRESETS[this.difficulty].startHp;
    this.hp = this.maxHp;
    this.stamina = 100;
    this.outOfCombatTimer = 0;
    this.storyLogKey = null;
    this.storyLogTimer = 0;
    this.hurtInvulnTimer = 0;
    this.chapterKills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.overclockTimer = 0;
    this.headshotTimer = 0;
    this.pickupToast = null;
    this.pickupToastTimer = 0;
    if (fullReset) {
      this.kills = 0;
      this.score = 0;
      this.elapsedSec = 0;
      this.ownedUpgrades = [];
      this.upgradeChoices = [];
      this.xp = 0;
      this.characterLevel = 1;
      this.levelUpToast = null;
      this.levelUpToastTimer = 0;
    } else {
      const prog = computeCharacterProgression(this.xp);
      this.maxHp = DIFFICULTY_PRESETS[this.difficulty].startHp + prog.bonusMaxHp;
      this.hp = this.maxHp;
    }
    this.activeWeapon = 'shotgun';
    this.ammo = createInitialAmmo();
    this.reloading = false;
    this.reloadTimer = 0;
    this.isScoped = false;
    this.minigunSpin = 0;
    this.screamerTimer = 0;
    this.screamerCooldown = 6.0;
    this.exeCorruption = 0.14;
    this.roosterPatCount = 0;
    this.roosterPatCooldown = 0;
    this.roosterPatTimer = 0;
    this.roosterMode = 'follow';
    this.roosterStatusBanner = TRANSLATIONS[this.lang].roosterHopping;
    for (const id of WEAPON_ORDER) {
      this.weaponRigs[id].group.visible = id === this.activeWeapon;
    }
    for (const node of this.objectiveNodes) {
      node.spec.completed = false;
      node.group.visible = node.spec.chapter === 1;
      node.beamMesh.visible = true;
    }
  }

  private resetPlayerToSpawn(): void {
    this.playerX = this.layout.spawn.x;
    this.playerY = 0;
    this.playerZ = this.layout.spawn.z;
    this.playerVy = 0;
    this.playerYaw = this.layout.spawn.yaw;
    this.playerPitch = 0;
    this.roosterX = this.playerX + 1.6;
    this.roosterY = 0;
    this.roosterZ = this.playerZ - 2.3;
  }

  private clearAllEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.group);
    }
    this.enemies = [];
  }

  private clearAllPickups(): void {
    for (const p of this.pickups) {
      this.scene.remove(p.group);
    }
    this.pickups = [];
  }

  private maybeSpawnPickup(x: number, z: number, guaranteed: boolean): void {
    const coopScale = this.getCoopScaling();
    const dropChance = Math.min(
      0.92,
      DIFFICULTY_PRESETS[this.difficulty].pickupDropChance + coopScale.pickupDropChanceBonus
    );
    if (!guaranteed && Math.random() > dropChance) return;
    if (this.pickups.length >= 10) return;

    let kind: PickupKind;
    const r = Math.random();
    if (guaranteed) {
      kind = this.hp < 70 ? 'medkit' : 'overclock';
    } else if (this.hp < 65 && r < 0.44) {
      kind = 'medkit';
    } else if (r < 0.72) {
      kind = 'ammo';
    } else if (r < 0.9) {
      kind = 'overclock';
    } else {
      kind = 'medkit';
    }

    const built = createPickupModel(kind);
    built.group.position.set(x, 0, z);
    this.scene.add(built.group);
    const pid = this.nextPickupId++;
    this.pickups.push({
      id: pid,
      netId: `pk_${pid}`,
      kind,
      x,
      z,
      life: 24,
      group: built.group,
      spinPivot: built.spinPivot,
    });
  }

  private updatePickups(dt: number): void {
    const t = TRANSLATIONS[this.lang];
    const coopScale = this.getCoopScaling();
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.spinPivot.rotation.y += dt * 2.4;
      p.spinPivot.position.y = 0.55 + Math.sin(p.life * 4.5 + p.id) * 0.12;

      const dist = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (dist < 2.15) {
        if (p.kind === 'ammo') {
          for (const wid of WEAPON_ORDER) {
            this.ammo[wid].reserve = Math.min(
              WEAPONS[wid].maxReserve,
              this.ammo[wid].reserve +
                Math.ceil(WEAPONS[wid].magSize * 1.25 * coopScale.ammoRefillMult)
            );
          }
          this.pickupToast = t.pickupAmmo;
          this.spawnBurst(p.x, 0.7, p.z, 14, 0xe8963a, 3.8);
        } else if (p.kind === 'medkit') {
          this.hp = Math.min(this.maxHp, this.hp + 35);
          this.stamina = Math.min(100, this.stamina + 50);
          this.pickupToast = t.pickupMedkit;
          this.spawnBurst(p.x, 0.7, p.z, 14, 0x5fa88e, 3.8);
        } else {
          this.overclockTimer = 8.0;
          this.pickupToast = t.pickupOverclock;
          this.spawnBurst(p.x, 0.7, p.z, 18, 0xd63636, 4.4);
        }
        this.pickupToastTimer = 2.4;
        this.audio.playPickup(p.kind);
        if (this.coopClient?.isInActiveSession()) {
          this.coopClient.sendPickupTake(p.netId ?? `pk_${p.id}`);
        }
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
        this.emitHud();
        continue;
      }

      if (p.life <= 0) {
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }

    // Animate collectible MK-60 Cassette Tapes + gentle walk-over auto-collect
    for (const tn of this.tapeNodes) {
      if (tn.spec.collected || !tn.group.visible) continue;
      tn.spinPivot.rotation.y += dt * 1.45;
      tn.spinPivot.position.y = 0.72 + Math.sin(this.elapsedSec * 3.1 + tn.spec.x) * 0.07;
      const dist = Math.hypot(tn.spec.x - this.playerX, tn.spec.z - this.playerZ);
      if (dist < 1.55) {
        this.collectTapeNode(tn.spec.id);
      }
    }
  }

  private collectTapeNode(tapeId: string): void {
    const newlyAdded = this.markTapeCollectedLocally(tapeId);
    if (!newlyAdded) return;
    const t = TRANSLATIONS[this.lang];
    const meta = t.storyTapes[tapeId as keyof typeof t.storyTapes];
    this.score += Math.round(200 * this.loopNumber * DIFFICULTY_PRESETS[this.difficulty].scoreMult);
    this.awardXp(95);
    this.updateRecords();
    this.audio.playPickup('ammo');
    const node = this.tapeNodes.find((n) => n.spec.id === tapeId);
    if (node) {
      this.spawnBurst(node.spec.x, 0.85, node.spec.z, 18, 0xf2a84b, 3.8);
    }
    if (meta) {
      this.pickupToast = t.tapeCollectedToast(meta.title, this.collectedTapes.size, this.tapeNodes.length);
      this.pickupToastTimer = 4.2;
      this.customStoryLog = {
        speaker: `${meta.code} · ${meta.speaker}`,
        text: localizeRoosterCopy(meta.text, this.lang, this.roosterName),
      };
      this.storyLogKey = null;
      this.storyLogTimer = 8.5;
    }
    if (this.coopClient?.isInActiveSession()) {
      this.coopClient.sendTapeCollect(tapeId);
    }
    this.emitHud();
  }

  private spawnEnemy(kind: EnemyKind, x: number, z: number): void {
    const rig = createEnemyModel(kind, this.shadowTex);
    rig.group.position.set(x, 0, z);
    this.scene.add(rig.group);

    const bossBaseHp =
      this.chapterIndex >= 12 ? 2250 : this.chapterIndex >= 6 ? 1750 : 1350;
    const stats: Record<EnemyKind, { hp: number; radius: number; hitHeight: number }> = {
      crawler: { hp: 100, radius: 0.55, hitHeight: 1.75 },
      lampshade: { hp: 135, radius: 0.58, hitHeight: 2.4 },
      screamer: { hp: 110, radius: 0.56, hitHeight: 2.35 },
      watchman: { hp: bossBaseHp, radius: 1.05, hitHeight: 3.55 },
    };
    const st = stats[kind];
    const coopScale = this.getCoopScaling();
    const scaledHp = Math.round(
      computeDifficultyScaledEnemyStats(
        st.hp,
        12,
        this.difficulty,
        this.loopNumber
      ).hp * coopScale.enemyHpMult
    );

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      x,
      z,
      hp: scaledHp,
      maxHp: scaledHp,
      radius: st.radius,
      hitHeight: st.hitHeight,
      rig,
      seed: Math.random() * 10,
      phaseTime: Math.random() * 6,
      gaitPhase: Math.random() * Math.PI * 2,
      actualSpeed: 0,
      prevYaw: Math.atan2(this.playerX - x, this.playerZ - z),
      turnRate: 0,
      flinchTimer: 0,
      hitFlash: 0,
      telegraphTimer: 0,
      telegraphDuration: 0.5,
      attackCooldown: 1.2,
      dying: false,
      deathTimer: 0,
      knockVx: 0,
      knockVz: 0,
      tacticMode: 'approach',
      tacticTimer: 1.5 + Math.random() * 1.9,
      flankSign: Math.random() < 0.5 ? 1 : -1,
      recentHitTimer: 0,
    });
  }

  private tryInteractObjective(): void {
    // 0. Interactive Pre-Match Hub: Moskvitch-412 departure car & Specs CRT Terminal
    if (this.phase === 'hub' && this.layout.hubAnchors) {
      const car = this.layout.hubAnchors.carPos;
      if (Math.hypot(car.x - this.playerX, car.z - this.playerZ) < this.layout.hubAnchors.carRadius) {
        this.toggleHubMoskvitchBoard();
        return;
      }
      const term = this.layout.hubAnchors.terminalPos;
      if (Math.hypot(term.x - this.playerX, term.z - this.playerZ) < this.layout.hubAnchors.terminalRadius) {
        this.openHubSpecs();
        return;
      }
      return;
    }

    // 1. Co-op Revive downed teammate if nearby
    if (this.coopClient?.isInActiveSession() && !this.coopLocalDowned) {
      for (const partner of this.coopPartners.values()) {
        if (!partner.isDowned) continue;
        const dist = Math.hypot(partner.x - this.playerX, partner.z - this.playerZ);
        if (dist < 3.4) {
          this.coopClient.sendRevive(partner.id);
          partner.isDowned = false;
          partner.hp = Math.max(60, Math.round(partner.maxHp * 0.65));
          this.awardXp(80);
          this.audio.playPickup('medkit');
          this.spawnBurst(partner.x, 1.0, partner.z, 18, 0x5fa88e, 4.0);
          this.emitHud();
          return;
        }
      }
    }

    // 2. Collect nearby MK-60 Cassette Tape
    for (const tn of this.tapeNodes) {
      if (tn.spec.collected || !tn.group.visible) continue;
      const d = Math.hypot(tn.spec.x - this.playerX, tn.spec.z - this.playerZ);
      if (d < 3.3) {
        this.collectTapeNode(tn.spec.id);
        return;
      }
    }

    if (this.mode !== 'story') return;
    const activeChap = this.chapterIndex + 1;
    for (const node of this.objectiveNodes) {
      if (node.spec.chapter !== activeChap || node.spec.completed) continue;
      const d = Math.hypot(node.spec.x - this.playerX, node.spec.z - this.playerZ);
      if (d < 3.8) {
        node.spec.completed = true;
        node.beaconMat.emissive.setHex(0x45d68a);
        node.beaconMat.color.setHex(0x45d68a);
        node.beamMesh.visible = false;
        this.score += Math.round(
          250 * this.loopNumber * DIFFICULTY_PRESETS[this.difficulty].scoreMult
        );
        this.awardXp(150);
        this.updateRecords();
        this.audio.playObjectiveComplete();
        this.spawnBurst(node.spec.x, 1.8, node.spec.z, 22, 0x5fa88e, 4.2);

        // Play the matching cassette / radio story discovery subtitle across all 3 acts
        const storyLogs = TRANSLATIONS[this.lang].storyLogs;
        if (node.spec.id in storyLogs) {
          this.customStoryLog = null;
          this.showStoryLog(node.spec.id as keyof typeof storyLogs, 7.6);
        }

        if (this.coopClient?.isInActiveSession()) {
          this.coopClient.sendObjectiveComplete(node.spec.id);
        }

        // Restock ammo crate bonus on activating a fuse box / relay!
        const coopScale = this.getCoopScaling();
        for (const wid of WEAPON_ORDER) {
          this.ammo[wid].reserve = Math.min(
            WEAPONS[wid].maxReserve,
            this.ammo[wid].reserve + Math.round(WEAPONS[wid].magSize * coopScale.ammoRefillMult)
          );
        }
        this.checkChapterCompletion();
        this.emitHud();
        return;
      }
    }
  }

  private checkChapterCompletion(): void {
    // In LAN co-op, host is authoritative for chapter transitions & boss victory
    if (this.coopClient?.isInActiveSession() && !this.coopClient.isHost()) return;

    if (this.mode === 'endless') {
      const bossAlive = this.enemies.some((e) => e.kind === 'watchman' && !e.dying);
      if (this.chapterKills >= this.endlessTargetKills && !bossAlive) {
        this.score += 350 * this.endlessWave;
        this.updateRecords();
        this.audio.playObjectiveComplete();
        this.openUpgradeDraft('next_endless_wave');
      }
      return;
    }

    const chap = CHAPTERS[this.chapterIndex];
    const chapObjs = this.objectiveNodes.filter((n) => n.spec.chapter === chap.chapter);
    const allObjsDone = chapObjs.every((n) => n.spec.completed);
    const scaledTargetKills = computeScaledChapterKillTarget(
      chap.targetKills,
      this.getActivePlayerCount()
    );

    if (chap.hasBoss) {
      const bossAlive = this.enemies.some((e) => e.kind === 'watchman' && !e.dying);
      if (!bossAlive) {
        this.score += 1500 * this.loopNumber;
        this.updateRecords();
        this.audio.playObjectiveComplete();
        const isFinalBoss = this.chapterIndex >= CHAPTERS.length - 1;
        if (isFinalBoss) {
          if (this.coopClient?.isInActiveSession() && this.coopClient.isHost()) {
            this.coopClient.sendChapterAdvance(this.chapterIndex, true);
          }
          this.openCutscene(TRANSLATIONS[this.lang].victoryCutscene, true);
        } else {
          const nextIdx = this.chapterIndex + 1;
          this.chapterIndex = nextIdx;
          if (this.coopClient?.isInActiveSession() && this.coopClient.isHost()) {
            this.coopClient.sendChapterAdvance(nextIdx, false);
            this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[nextIdx].introCutscene, false);
          } else {
            this.openUpgradeDraft('next_chapter');
          }
        }
      }
      return;
    }

    if (allObjsDone && this.chapterKills >= scaledTargetKills) {
      const nextIdx = this.chapterIndex + 1;
      if (nextIdx < CHAPTERS.length) {
        this.chapterIndex = nextIdx;
        this.updateRecords();
        if (this.coopClient?.isInActiveSession() && this.coopClient.isHost()) {
          this.coopClient.sendChapterAdvance(nextIdx, false);
          this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[nextIdx].introCutscene, false);
        } else {
          this.openUpgradeDraft('next_chapter');
        }
      }
    }
  }

  private triggerScreamer(kind: ScreamerKind): void {
    if (this.screamerCooldown > 0 && kind !== 'preview') return;
    this.screamerCaptionKey = kind;
    this.screamerKind = kind;
    this.screamerDuration = this.screamerIntensity === 'reduced' ? 0.42 : 0.86;
    this.screamerTimer = this.screamerDuration;
    this.screamerCooldown = 7.2;
    this.trauma = Math.min(1, this.trauma + (this.screamerIntensity === 'reduced' ? 0.3 : 0.94));
    this.audio.playScreamer(this.screamerIntensity === 'reduced');
    this.emitHud();
  }

  private fireActiveWeapon(): void {
    const cfg = WEAPONS[this.activeWeapon];
    const st = this.ammo[this.activeWeapon];
    if (st.mag <= 0) {
      this.startReload();
      return;
    }

    const overclocked = this.overclockTimer > 0;
    st.mag -= 1;
    this.fireCooldown = cfg.fireInterval * (overclocked ? 0.68 : 1);
    this.recoilPitchVel += cfg.recoilPitch * (overclocked ? 0.38 : 1);
    this.weaponKickZ = cfg.recoilKick * (overclocked ? 0.55 : 1);
    this.trauma = Math.min(1, this.trauma + cfg.trauma * 0.45);
    this.muzzleFlashTimer = 0.055;
    this.audio.playWeaponFire(this.activeWeapon);

    // Muzzle position in world space
    this.camera.getWorldPosition(_rayOrigin);
    if (this.coopClient?.isInActiveSession()) {
      _rayDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.coopClient.sendPlayerShoot(
        this.activeWeapon,
        _rayOrigin.x,
        _rayOrigin.y,
        _rayOrigin.z,
        _rayDir.x,
        _rayDir.y,
        _rayDir.z
      );
    }

    let landedAny = false;
    let landedCrit = false;

    if (this.phase === 'hub' && this.rangeDummies.length > 0) {
      // Firing Range target dummy hit registration (tests damage, headshots, spread, recoil & reload!)
      const dummyCandidates = this.rangeDummies.map((d, i) => ({
        id: i + 1,
        x: d.spec.x,
        z: d.spec.z,
        radius: 0.56,
        hitHeight: 1.95,
        dying: d.respawnTimer > 0,
      }));
      let totalShotDamage = 0;
      let hitDummy: RangeDummyRig | null = null;
      let hitDummyHeadshot = false;
      let hitDummyDist = 0;

      for (let p = 0; p < cfg.pellets; p++) {
        const spread = this.isScoped ? cfg.spreadRad * 0.2 : cfg.spreadRad;
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.5) * spread;
        _rayDir.set(sx, sy, -1).normalize().applyQuaternion(this.camera.quaternion);

        const hit = findShotHitEnemy(_rayOrigin, _rayDir, cfg.maxRange, dummyCandidates);
        if (hit) {
          const dummy = this.rangeDummies[hit.enemyId - 1];
          if (dummy && dummy.respawnTimer <= 0) {
            const dmg = Math.round(
              computeWeaponDamage(
                this.activeWeapon,
                hit.distance,
                hit.isHeadshot,
                this.ownedUpgrades
              )
            );
            dummy.hp = Math.max(0, dummy.hp - dmg);
            dummy.hitTilt = Math.min(0.95, dummy.hitTilt + (hit.isHeadshot ? 0.52 : 0.3));
            dummy.hitFlash = 0.12;
            totalShotDamage += dmg;
            hitDummy = dummy;
            hitDummyDist = hit.distance;
            if (hit.isHeadshot) {
              hitDummyHeadshot = true;
              this.headshotTimer = 0.65;
            }
            landedAny = true;
            if (hit.isHeadshot || this.activeWeapon === 'shotgun' || this.activeWeapon === 'awp') {
              landedCrit = true;
            }
            this.spawnBurst(
              hit.hitX,
              hit.hitY,
              hit.hitZ,
              this.activeWeapon === 'shotgun' ? 3 : 8,
              hit.isHeadshot ? 0xf5b342 : 0xe05a3a,
              4.2
            );
            if (dummy.hp <= 0 && dummy.respawnTimer <= 0) {
              dummy.respawnTimer = 2.5;
              dummy.hitTilt = 1.48;
              this.spawnBurst(dummy.spec.x, 1.25, dummy.spec.z, 18, 0xf5b342, 4.6);
            }
          }
        } else if (p === 0) {
          const hx = _rayOrigin.x + _rayDir.x * 20;
          const hy = Math.max(0.2, _rayOrigin.y + _rayDir.y * 20);
          const hz = _rayOrigin.z + _rayDir.z * 20;
          this.spawnBurst(hx, hy, hz, 3, 0xe8b566, 2.0);
        }
      }

      if (hitDummy && totalShotDamage > 0) {
        this.hubLastRangeHit = {
          dummyLabel: `${hitDummy.spec.distanceLabel} · ${hitDummy.spec.kind.toUpperCase()}`,
          damage: totalShotDamage,
          crit: hitDummyHeadshot,
          distanceMeters: Math.max(1, Math.round(hitDummyDist)),
          destroyed: hitDummy.respawnTimer > 0,
        };
        this.hubRangeHitTimer = 4.0;
      }

      // Keep reserve ammo topped up in the Hub firing range
      st.reserve = cfg.maxReserve;
    } else {
      for (let p = 0; p < cfg.pellets; p++) {
        // Compute aim direction with weapon spread (razor tight when AWP scoped)
        const spread = this.isScoped ? cfg.spreadRad * 0.2 : cfg.spreadRad;
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.5) * spread;

        _rayDir.set(sx, sy, -1).normalize().applyQuaternion(this.camera.quaternion);

        // Exact 3D ray-vs-cylinder hit registration against living enemies only
        // (strictly passes through the rooster companion onto bots behind him)
        const hit = findShotHitEnemy(
          _rayOrigin,
          _rayDir,
          cfg.maxRange,
          this.enemies
        );
        let bestEnemy: ActiveEnemy | null = null;
        let bestDist = cfg.maxRange;
        let bestHeadshot = false;
        let hitX = _rayOrigin.x + _rayDir.x * 24;
        let hitY = _rayOrigin.y + _rayDir.y * 24;
        let hitZ = _rayOrigin.z + _rayDir.z * 24;

        if (hit) {
          bestEnemy = this.enemies.find((e) => e.id === hit.enemyId) ?? null;
          bestDist = hit.distance;
          bestHeadshot = hit.isHeadshot;
          hitX = hit.hitX;
          hitY = hit.hitY;
          hitZ = hit.hitZ;
        }

        if (bestEnemy) {
          const prog = computeCharacterProgression(this.xp);
          const dmg = Math.round(
            computeWeaponDamage(
              this.activeWeapon,
              bestDist,
              bestHeadshot,
              this.ownedUpgrades
            ) * prog.damageMult
          );
          if (dmg > 0) {
            bestEnemy.hp -= dmg;
            bestEnemy.hitFlash = 0.08;
            bestEnemy.flinchTimer = bestEnemy.kind === 'watchman' ? 0.16 : 0.28;
            bestEnemy.recentHitTimer = 1.65;
            bestEnemy.tacticMode = 'enraged_charge';
            bestEnemy.tacticTimer = Math.max(bestEnemy.tacticTimer, 1.5);
            // Heavy shotgun & AWP knockback impulse (enhanced with Buckshot Overpressure)
            const baseKnock =
              this.activeWeapon === 'shotgun'
                ? 8.5 * (this.hasUpgrade('buckshot_overpressure') ? 1.45 : 1)
                : this.activeWeapon === 'awp'
                  ? 6.5
                  : 2.2;
            bestEnemy.knockVx += _rayDir.x * baseKnock;
            bestEnemy.knockVz += _rayDir.z * baseKnock;

            landedAny = true;
            if (bestHeadshot) {
              this.headshotTimer = 0.65;
            }
            if (bestHeadshot || this.activeWeapon === 'shotgun' || this.activeWeapon === 'awp') {
              landedCrit = true;
            }

            this.spawnBurst(
              hitX,
              hitY,
              hitZ,
              this.activeWeapon === 'shotgun' ? 4 : 10,
              bestHeadshot ? 0xe8963a : 0x992828,
              4.5
            );

            if (this.coopClient?.isInActiveSession() && !this.coopClient.isHost() && bestEnemy.netId) {
              this.coopClient.sendEnemyDamage(bestEnemy.netId, dmg, bestHeadshot);
            } else if (bestEnemy.hp <= 0 && !bestEnemy.dying) {
              bestEnemy.dying = true;
              bestEnemy.deathTimer = 0.48;
              this.kills += 1;
              this.chapterKills += 1;
              this.combo += 1;
              this.comboTimer = 6.0;
              const mult = computeComboMultiplier(this.combo);
              const basePts = bestEnemy.kind === 'watchman' ? 1000 : 120;
              this.score += Math.round(
                basePts *
                  mult *
                  (bestHeadshot ? 1.35 : 1) *
                  DIFFICULTY_PRESETS[this.difficulty].scoreMult
              );
              this.awardXp(
                (bestEnemy.kind === 'watchman' ? 420 : 58) + (bestHeadshot ? 24 : 0)
              );
              if (this.hasUpgrade('vampiric_loop')) {
                this.hp = Math.min(this.maxHp, this.hp + 8);
              }
              this.maybeSpawnPickup(
                bestEnemy.x,
                bestEnemy.z,
                bestEnemy.kind === 'watchman'
              );
              this.updateRecords();
              this.hitstopTimer = Math.max(this.hitstopTimer, cfg.hitstopSec);
              this.spawnBurst(bestEnemy.x, 1.3, bestEnemy.z, 22, 0xc93b3b, 5.2);
              this.checkChapterCompletion();
            }
          }
        } else if (p === 0) {
          // Subtle tracer/spark dust in distance
          this.spawnBurst(hitX, Math.max(0.2, hitY), hitZ, 3, 0xe8963a, 2.2);
        }
      }
    }

    if (landedAny) {
      this.hitMarkerTimer = 0.16;
      this.hitMarkerCrit = landedCrit;
      this.audio.playHitMarker(landedCrit);
      if (this.activeWeapon === 'shotgun' || this.activeWeapon === 'awp') {
        this.hitstopTimer = Math.max(this.hitstopTimer, cfg.hitstopSec * 0.75);
      }
    }

    if (shouldAutoReload(this.activeWeapon, st, this.reloading, true)) {
      this.startReload();
    }
    this.emitHud();
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.PARTICLE_COUNT;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.2;
      p.y = y + (Math.random() - 0.5) * 0.2;
      p.z = z + (Math.random() - 0.5) * 0.2;
      p.vx = (Math.random() - 0.5) * speed;
      p.vy = (Math.random() * 0.75 + 0.15) * speed;
      p.vz = (Math.random() - 0.5) * speed;
      p.maxLife = 0.32 + Math.random() * 0.35;
      p.life = p.maxLife;
      p.scale = 0.7 + Math.random() * 0.9;
      p.color.setHex(hexColor);
    }
  }

  // --- Main Render & Simulation Loop ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateMoonShadowFollow(): void {
    // Snap the tight ±26m directional shadow frustum to a 0.5m world grid around the camera
    // so long raking shadows stay crisp across the entire suburb with zero shadow swimming!
    const snapX = Math.round(this.camera.position.x * 2) * 0.5;
    const snapZ = Math.round(this.camera.position.z * 2) * 0.5;
    this.moonLight.position.set(snapX + 18, 16, snapZ + 11);
    this.moonLight.target.position.set(snapX, 0, snapZ);
    this.moonLight.target.updateMatrixWorld();
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastNow) / 1000;
    this.lastNow = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateAmbientLamps(now * 0.001);

    if (this.phase === 'title') {
      this.updateTitleCameraTour(dt);
    } else if (this.phase === 'cutscene') {
      this.updateCutsceneCamera(dt);
    } else if (this.phase === 'playing' || this.phase === 'hub') {
      this.updatePlaying(dt);
    }

    this.updateParticles(dt);
    this.updateRain(dt, now * 0.001);
    this.updateMoonShadowFollow();

    if (this.composer && !this.isSoftwareGl) {
      if (this.cinematicPass) {
        this.cinematicPass.uniforms.uTime.value = now * 0.001;
        this.cinematicPass.uniforms.uChromatic.value =
          0.0006 + this.damageFlash * 0.003 + this.exeCorruption * 0.0012;
      }
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private updateAmbientLamps(timeSec: number): void {
    let closestAIdx = -1;
    let closestADist = Infinity;
    let closestBIdx = -1;
    let closestBDist = Infinity;

    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i];
      // Organic 1990s dying sodium-vapor ballast flicker
      const wave =
        Math.sin(timeSec * 3.7 + lamp.seed) * 0.5 +
        Math.sin(timeSec * 19.3 + lamp.seed * 2.1) * 0.25;
      const dip = wave < -0.58 ? 0.35 : 1.0;
      lamp.bulbMat.emissiveIntensity = 3.2 * dip;
      if (lamp.pointLight) {
        lamp.pointLight.intensity = 34 * dip;
      }

      if (this.dynamicLampSpots.length > 0) {
        const d = Math.hypot(
          lamp.x - this.camera.position.x,
          lamp.z - this.camera.position.z
        );
        if (d < closestADist) {
          closestBDist = closestADist;
          closestBIdx = closestAIdx;
          closestADist = d;
          closestAIdx = i;
        } else if (d < closestBDist) {
          closestBDist = d;
          closestBIdx = i;
        }
      }
    }

    // Track 2 nearest sodium streetlamps with shadow-casting SpotLights on GPU
    const nearestIds = [closestAIdx, closestBIdx];
    for (let s = 0; s < this.dynamicLampSpots.length; s++) {
      const idx = nearestIds[s];
      const entry = this.dynamicLampSpots[s];
      if (idx >= 0) {
        const l = this.lamps[idx];
        const lx = l.x + l.armDirX * 1.95;
        entry.spot.position.set(lx, 6.95, l.z);
        entry.target.position.set(lx, 0, l.z);
        entry.target.updateMatrixWorld();
        entry.spot.intensity = (l.bulbMat.emissiveIntensity / 3.2) * 44;
      } else {
        entry.spot.intensity = 0;
      }
    }

    // Subtle slow drift for atmospheric mist motes
    if (this.mistMotes) {
      this.mistMotes.position.x = Math.sin(timeSec * 0.14) * 0.85;
      this.mistMotes.position.y = Math.sin(timeSec * 0.28) * 0.18;
    }

    for (const node of this.objectiveNodes) {
      if (node.group.visible && !node.spec.completed) {
        const s = 1 + Math.sin(timeSec * 3.8) * 0.14;
        node.ringMesh.scale.set(s, s, 1);
      }
    }
  }

  private updateTitleCameraTour(dt: number): void {
    this.titleClock += dt;
    this.weaponHolder.visible = false;

    // Slow atmospheric glide down NEGRUZINO's foggy sodium-lit street framing houses, fences & Petya
    const z = 37 - Math.sin(this.titleClock * 0.16) * 10;
    const x = 2.8 + Math.sin(this.titleClock * 0.24) * 2.4;
    this.camera.position.set(x, 3.2 + Math.sin(this.titleClock * 0.4) * 0.25, z);
    this.camera.lookAt(-3.2, 2.1, z - 22);
    this.skyDome.position.copy(this.camera.position);

    // Grisha struts and flutters naturally near House #14 during the title pan
    this.roosterWingPhase += dt * 12;
    this.roosterStepPhase += dt * 6.5;
    const alt = 0.12 + Math.abs(Math.sin(this.titleClock * 2.2)) * 0.55;
    this.roosterRig.group.position.set(
      -2.2 + Math.cos(this.titleClock * 0.82) * 1.45,
      0,
      27 + Math.sin(this.titleClock * 0.82) * 1.45
    );
    this.roosterRig.bodyPivot.position.y = 0.36 + alt;
    this.roosterRig.bodyPivot.rotation.y = this.titleClock * 0.82 + Math.PI / 2;
    const tPose = computeRoosterGaitPose({
      groundSpeed: 1.2,
      altitude: alt,
      stepPhase: this.roosterStepPhase,
      wingPhase: this.roosterWingPhase,
      timeSec: this.titleClock,
      mode: alt > 0.2 ? 'circle_fly' : 'follow',
      patTimer: 0,
    });
    this.applyRoosterPoseToRig(tPose);
  }

  /**
   * Real-time 3D in-engine machinima camera choreography per story act & beat.
   * Replaces static AI images with live rain-soaked Negruzino cinematography.
   */
  private updateCutsceneCamera(dt: number): void {
    this.cutsceneClock += dt;
    this.weaponHolder.visible = false;
    const t = this.cutsceneClock;
    const csId = this.activeCutscene?.id ?? 'ch1_intro';
    const beat = this.cutsceneBeatIndex;

    // Gentle dawn sky/fog shift during the Epilogue!
    if (this.scene.fog instanceof THREE.FogExp2) {
      const targetFog = csId === 'epilogue' ? this.dawnFogColor : this.baseFogColor;
      this.scene.fog.color.lerp(targetFog, Math.min(1, dt * 1.4));
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(this.scene.fog.color);
      }
    }

    if (csId === 'ch1_intro') {
      if (beat === 0) {
        // Low dramatic dolly beside stalled Moskvitch framing House #14 & glowing street sign
        this.camera.position.set(1.8 + Math.sin(t * 0.25) * 0.7, 1.55, 42.4 - Math.min(4.2, t * 0.45));
        this.camera.lookAt(-2.6, 1.65, 34.0);
        this.roosterRig.group.position.set(-0.6, 0.05, 34.2);
        this.roosterRig.group.rotation.y = 0.4;
      } else if (beat === 1) {
        // Close heroic low-angle orbit around Grisha standing by the shimmering street puddles
        const ang = 0.65 + t * 0.32;
        this.roosterRig.group.position.set(-1.3, 0.1 + Math.abs(Math.sin(t * 2.8)) * 0.28, 30.8);
        this.roosterRig.group.rotation.y = Math.sin(t * 0.9) * 0.5;
        this.camera.position.set(-1.3 + Math.cos(ang) * 2.4, 1.05, 30.8 + Math.sin(ang) * 2.4);
        this.camera.lookAt(-1.3, 0.55, 30.8);
      } else {
        // Sweeping crane look toward House #14's glowing orange Fuse Box beacon
        this.camera.position.set(-1.2 - Math.min(2.8, t * 0.35), 2.85, 34.5 - Math.min(4.5, t * 0.4));
        this.camera.lookAt(-10.2, 2.2, 26.2);
      }
    } else if (csId === 'ch2_intro') {
      if (beat === 0) {
        // Tracking shot down the wet lantern-lit avenue framed by clapboard & brick houses
        this.camera.position.set(2.4 * Math.sin(t * 0.22), 2.35, 22.5 - Math.min(8.5, t * 0.65));
        this.camera.lookAt(0, 2.2, -4.0);
      } else if (beat === 1) {
        // Creeping gaze over wooden picket fences into shadowed Soviet gardens
        this.camera.position.set(4.4, 2.55, 11.0 - Math.min(5.0, t * 0.4));
        this.camera.lookAt(13.5, 1.8, 3.0);
      } else {
        // Elevated look along the green courtyard relay beacon beams
        this.camera.position.set(-3.2, 3.8, 16.5 - Math.min(6.0, t * 0.5));
        this.camera.lookAt(11.0, 2.5, -6.5);
      }
    } else if (csId === 'ch3_intro') {
      if (beat === 0) {
        // Low creeping push toward unlit dark House #08 across rain-drenched lawns
        this.camera.position.set(-2.4, 2.1, -4.0 - Math.min(7.0, t * 0.55));
        this.camera.lookAt(-15.5, 2.2, -16.0);
      } else if (beat === 1) {
        // Sweeping alley pan across dark fences toward House #15
        this.camera.position.set(3.2, 2.45, 22.0 + Math.min(6.0, t * 0.45));
        this.camera.lookAt(14.5, 2.0, 30.0);
      } else {
        this.camera.position.set(-1.5, 3.2, -8.0);
        this.camera.lookAt(-12.2, 1.8, -16.0);
      }
    } else if (csId === 'ch4_intro') {
      if (beat === 0) {
        // Northern forest pine barrier where Route 404 headlights flicker beyond the road
        this.camera.position.set(2.2 * Math.sin(t * 0.2), 2.35, -24.0 - Math.min(10.0, t * 0.7));
        this.camera.lookAt(0, 2.6, -50.0);
      } else if (beat === 1) {
        // Crane over Northern Yards #04 & #03 beacons
        this.camera.position.set(-4.0 + Math.min(8.0, t * 0.5), 4.2, -26.0);
        this.camera.lookAt(0, 1.8, -34.0);
      } else {
        // Back to the stalled Moskvitch and south road mirror
        this.camera.position.set(4.5, 2.2, 34.0);
        this.camera.lookAt(-2.5, 1.4, 40.0);
      }
    } else if (csId === 'ch5_intro') {
      if (beat === 0) {
        // Dramatic circular orbit around the humming central transformer square
        const ang = t * 0.32;
        this.camera.position.set(Math.cos(ang) * 10.5, 3.4, Math.sin(ang) * 10.5);
        this.camera.lookAt(-8.5, 4.5, 0.0);
      } else if (beat === 1) {
        this.roosterRig.group.position.set(1.6, 0.45 + Math.abs(Math.sin(t * 4.2)) * 0.55, 3.8);
        this.roosterRig.group.rotation.y = Math.PI + t * 0.8;
        this.camera.position.set(4.8, 1.85, 8.2);
        this.camera.lookAt(-1.2, 2.1, -1.5);
      } else {
        this.camera.position.set(0.5, 4.6, 13.5 - Math.min(5.0, t * 0.4));
        this.camera.lookAt(0, 1.8, 0);
      }
    } else if (csId === 'ch6_intro') {
      if (beat === 0) {
        // Low ominous tilt up the towering transformer mast in the central square
        this.camera.position.set(3.2 - Math.min(2.2, t * 0.25), 1.65 + Math.min(1.8, t * 0.2), 11.5 - Math.min(3.0, t * 0.3));
        this.camera.lookAt(-9.8, 6.2 + Math.sin(t * 0.4) * 1.4, 0.0);
      } else {
        // Dramatic wide square face-off shot with Grisha fluttering beside the puddles
        this.camera.position.set(5.4 * Math.cos(t * 0.22), 2.25, 10.5);
        this.camera.lookAt(-2.0, 2.4, -3.5);
        this.roosterRig.group.position.set(1.8, 0.4 + Math.abs(Math.sin(t * 3.8)) * 0.45, 6.2);
        this.roosterRig.group.rotation.y = Math.PI;
      }
    } else {
      // Epilogue: peaceful dawn crane rising over the Moskvitch, Grisha & clearing pine horizon
      this.roosterRig.group.position.set(-3.15, 1.38, 39.2);
      this.roosterRig.group.rotation.y = Math.PI + Math.sin(t * 0.8) * 0.25;
      const lift = Math.min(3.5, t * 0.38);
      this.camera.position.set(2.4 - Math.sin(t * 0.2) * 1.6, 2.1 + lift, 44.5 - lift * 0.6);
      this.camera.lookAt(-2.2, 1.8 + lift * 0.35, 30.0);
    }

    this.skyDome.position.copy(this.camera.position);
    this.roosterWingPhase += dt * 10;
    const cAlt = Math.max(0, this.roosterRig.group.position.y);
    const cPose = computeRoosterGaitPose({
      groundSpeed: 0,
      altitude: cAlt,
      stepPhase: this.roosterStepPhase,
      wingPhase: this.roosterWingPhase,
      timeSec: this.cutsceneClock,
      mode: cAlt > 0.2 ? 'circle_fly' : 'follow',
      patTimer: 0,
    });
    this.applyRoosterPoseToRig(cPose);
  }

  private updatePlaying(dt: number): void {
    this.weaponHolder.visible = !this.isScoped;
    this.elapsedSec += dt;

    // Hitstop pauses gameplay simulation briefly while visuals/shake tick in real dt
    const simDt = this.hitstopTimer > 0 ? 0 : dt;
    this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.65);
    this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    this.hurtInvulnTimer = Math.max(0, this.hurtInvulnTimer - dt);
    this.screamerTimer = Math.max(0, this.screamerTimer - dt);
    this.screamerCooldown = Math.max(0, this.screamerCooldown - dt);
    this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
    this.overclockTimer = Math.max(0, this.overclockTimer - dt);
    this.headshotTimer = Math.max(0, this.headshotTimer - dt);
    this.outOfCombatTimer += dt;
    this.hp = computeBreathRecoveryHp(
      this.hp,
      this.maxHp,
      this.outOfCombatTimer,
      this.difficulty,
      dt
    );
    if (this.storyLogTimer > 0) {
      this.storyLogTimer = Math.max(0, this.storyLogTimer - dt);
      if (this.storyLogTimer <= 0) {
        this.storyLogKey = null;
        this.customStoryLog = null;
      }
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.pickupToastTimer > 0) {
      this.pickupToastTimer = Math.max(0, this.pickupToastTimer - dt);
      if (this.pickupToastTimer <= 0) this.pickupToast = null;
    }
    if (this.levelUpToastTimer > 0) {
      this.levelUpToastTimer = Math.max(0, this.levelUpToastTimer - dt);
      if (this.levelUpToastTimer <= 0) this.levelUpToast = null;
    }
    if (this.trackToastTimer > 0) {
      this.trackToastTimer = Math.max(0, this.trackToastTimer - dt);
      if (this.trackToastTimer <= 0) this.trackToast = null;
    }

    if (this.phase === 'hub') {
      // Bright safe Hub: zero dread corruption, animate firing-range dummies & handle solo Moskvitch ignition
      this.exeCorruption = 0;
      if (this.hubRangeHitTimer > 0) {
        this.hubRangeHitTimer = Math.max(0, this.hubRangeHitTimer - dt);
        if (this.hubRangeHitTimer <= 0) this.hubLastRangeHit = null;
      }
      if (this.hubLaunchTimer > 0) {
        this.hubLaunchTimer -= dt;
        if (this.hubLaunchTimer <= 0) {
          this.hubLaunchTimer = 0;
          this.hubInCar = false;
          this.hubBoardedIds = [];
          if (this.mode === 'endless') {
            this.startEndlessLoop();
          } else {
            this.startStory();
          }
          return;
        }
      }
    } else {
      // Dynamic .EXE dread corruption: rises near enemies, during screamers, and in Boss chapter
      let nearestDist = 40;
      let bossPresent = false;
      for (const e of this.enemies) {
        if (e.dying) continue;
        if (e.kind === 'watchman') bossPresent = true;
        const d = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
        if (d < nearestDist) nearestDist = d;
      }
      const proximityDread = Math.max(0, Math.min(1, 1 - (nearestDist - 4) / 18));
      const targetCorruption = Math.min(
        1,
        0.12 +
          proximityDread * 0.42 +
          (bossPresent ? 0.32 : 0) +
          (this.screamerTimer > 0 ? 0.55 : 0)
      );
      this.exeCorruption = THREE.MathUtils.damp(this.exeCorruption, targetCorruption, 4, dt);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.liveFogColor.copy(this.baseFogColor).lerp(this.exeFogColor, this.exeCorruption * 0.65);
        this.scene.fog.color.copy(this.liveFogColor);
        if (this.scene.background instanceof THREE.Color) {
          this.scene.background.copy(this.liveFogColor);
        }
      }
    }

    // Animate zone-specific landmarks (Hub Moskvitch halo, Depot radar, Substation Resonator rings)
    for (const prop of this.animatedZoneProps) {
      if (prop.kind === 'car_halo' || prop.kind === 'terminal_beacon') {
        prop.mesh.position.y = prop.baseY + Math.sin(this.elapsedSec * 2.8) * 0.08;
        prop.mesh.rotation.z += prop.speed * dt;
      } else {
        prop.mesh.rotation[prop.axis] += prop.speed * dt;
      }
    }

    // Update Hub Firing Range AFK target dummies (spring tilt, hit flash, 2.5s auto-respawn & HP bar)
    for (const d of this.rangeDummies) {
      if (d.respawnTimer > 0) {
        d.respawnTimer -= dt;
        d.hitTilt = THREE.MathUtils.damp(d.hitTilt, 1.48, 12, dt);
        if (d.respawnTimer <= 0) {
          d.respawnTimer = 0;
          d.hp = d.maxHp;
          d.hitTilt = 0;
        }
      } else {
        d.hitTilt = THREE.MathUtils.damp(d.hitTilt, 0, 8, dt);
      }
      d.pivot.rotation.x = -d.hitTilt;
      if (d.hitFlash > 0) {
        d.hitFlash = Math.max(0, d.hitFlash - dt);
        d.bodyMat.emissive.setHex(d.hitFlash > 0 ? 0xff7733 : 0x000000);
        d.bodyMat.emissiveIntensity = d.hitFlash > 0 ? 0.9 : 0;
      }
      const hpRatio = Math.max(0.001, d.hp / Math.max(1, d.maxHp));
      d.hpFill.scale.x = hpRatio;
      d.hpFill.position.x = -(1 - hpRatio) * 0.42;
      const fillMat = d.hpFill.material as THREE.MeshBasicMaterial;
      fillMat.color.setHex(hpRatio > 0.55 ? 0x45d68a : hpRatio > 0.25 ? 0xf5b342 : 0xe04848);
    }

    // 1. Keyboard look fallback (Arrow keys) for trackpads & automated accessibility
    const turnSpeed = this.isScoped ? 1.0 : 2.1;
    if (this.heldKeys.has('ArrowLeft')) this.playerYaw += turnSpeed * dt;
    if (this.heldKeys.has('ArrowRight')) this.playerYaw -= turnSpeed * dt;
    if (this.heldKeys.has('ArrowUp')) {
      this.playerPitch = Math.min(1.1, this.playerPitch + 1.4 * dt);
    }
    if (this.heldKeys.has('ArrowDown')) {
      this.playerPitch = Math.max(-1.1, this.playerPitch - 1.4 * dt);
    }

    // 2. Player movement, sprinting, coyote jump & AABB sliding collision
    const cfg = WEAPONS[this.activeWeapon];
    let moveFwd = this.virtualMoveY;
    let moveRight = this.virtualMoveX;
    if (this.heldKeys.has('KeyW')) moveFwd += 1;
    if (this.heldKeys.has('KeyS')) moveFwd -= 1;
    if (this.heldKeys.has('KeyD')) moveRight += 1;
    if (this.heldKeys.has('KeyA')) moveRight -= 1;

    const sprintBind = this.keybinds.sprint;
    const sprintHeld =
      this.virtualSprint ||
      this.heldKeys.has(sprintBind) ||
      this.heldMouseButtons.has(sprintBind) ||
      (sprintBind === 'ShiftLeft' && this.heldKeys.has('ShiftRight'));

    const moving = Math.hypot(moveFwd, moveRight) > 0.08;
    const sprinting =
      moving &&
      sprintHeld &&
      this.stamina > 6 &&
      !this.isScoped;

    const adrenaline = this.hasUpgrade('adrenaline_sprint');
    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - (adrenaline ? 15 : 20) * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + (adrenaline ? 28 : 22) * dt);
    }

    const prog = computeCharacterProgression(this.xp);
    const downedSlow = this.coopLocalDowned ? 0.22 : 1;
    const baseSpeed =
      (sprinting ? 8.9 : 5.8) *
      (adrenaline ? 1.22 : 1) *
      cfg.moveSpeedMult *
      prog.moveSpeedMult *
      (this.isScoped ? 0.55 : 1) *
      downedSlow;
    if (moving && simDt > 0) {
      const len = Math.hypot(moveFwd, moveRight);
      const nf = moveFwd / len;
      const nr = moveRight / len;
      const fwdX = -Math.sin(this.playerYaw);
      const fwdZ = -Math.cos(this.playerYaw);
      const rightX = Math.cos(this.playerYaw);
      const rightZ = -Math.sin(this.playerYaw);

      const nextX = this.playerX + (fwdX * nf + rightX * nr) * baseSpeed * simDt;
      const nextZ = this.playerZ + (fwdZ * nf + rightZ * nr) * baseSpeed * simDt;
      const resolved = resolveCircleVsAABBs(
        nextX,
        nextZ,
        0.55,
        this.layout.colliders,
        this.layout.bounds
      );
      const stepDelta = Math.hypot(resolved.x - this.playerX, resolved.z - this.playerZ);
      this.playerX = resolved.x;
      this.playerZ = resolved.z;

      if (this.grounded) {
        this.walkDist += stepDelta;
        if (this.walkDist - this.lastStepDist > 2.35) {
          this.lastStepDist = this.walkDist;
          this.audio.playFootstep(Math.abs(this.playerX) < 5.0);
        }
      }
    }

    // Solid physical collision between player and all living monsters (even when stationary)
    if (simDt > 0 && this.enemies.length > 0) {
      const livingObstacles: Array<{ x: number; z: number; radius: number }> = [];
      for (const e of this.enemies) {
        if (!e.dying) {
          livingObstacles.push({ x: e.x, z: e.z, radius: e.radius });
        }
      }
      if (livingObstacles.length > 0) {
        const pushed = resolveCircleVsCircles(
          this.playerX,
          this.playerZ,
          0.55,
          livingObstacles
        );
        if (pushed.hitEntity) {
          const clamped = resolveCircleVsAABBs(
            pushed.x,
            pushed.z,
            0.55,
            this.layout.colliders,
            this.layout.bounds
          );
          this.playerX = clamped.x;
          this.playerZ = clamped.z;
        }
      }
    }

    // Jump with coyote time & input buffer
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.grounded) this.coyoteTimer = 0.1;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVy = 6.2;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    if (!this.grounded && simDt > 0) {
      this.playerVy -= 17.5 * simDt;
      this.playerY += this.playerVy * simDt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVy = 0;
        this.grounded = true;
      }
    }

    // 3. Weapon firing, minigun spin-up, reload & viewmodel kinematics
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.reloadTimer = 0;
        this.resetWeaponRigRestPose(this.activeWeapon);
        this.ammo[this.activeWeapon] = applyReload(
          this.activeWeapon,
          this.ammo[this.activeWeapon]
        );
        this.emitHud();
      }
    } else {
      const wantsFire = cfg.automatic
        ? this.mouseDown || this.heldKeys.has('KeyJ')
        : this.fireJustPressed;

      if (this.activeWeapon === 'minigun') {
        const spinning = this.mouseDown || this.heldKeys.has('KeyJ');
        const spinTime =
          cfg.spinUpTime * (this.hasUpgrade('rotary_coolant') ? 0.5 : 1);
        const spinDelta = spinning ? dt / spinTime : -dt * 1.4;
        this.minigunSpin = Math.max(0, Math.min(1, this.minigunSpin + spinDelta));
        this.audio.setMinigunSpin(this.minigunSpin);

        const mgRig = this.weaponRigs.minigun;
        if (mgRig.barrelCluster) {
          mgRig.barrelCluster.rotation.z += this.minigunSpin * dt * 36;
        }
        if (wantsFire && this.minigunSpin >= 0.85 && this.fireCooldown <= 0) {
          this.fireActiveWeapon();
        }
      } else {
        this.minigunSpin = 0;
        if (
          shouldAutoReload(
            this.activeWeapon,
            this.ammo[this.activeWeapon],
            this.reloading,
            false
          )
        ) {
          this.startReload();
        } else if (wantsFire && this.fireCooldown <= 0) {
          this.fireActiveWeapon();
        }
      }
    }
    this.fireJustPressed = false;

    // Smooth camera FOV damping for AWP scope & adaptive device FOV
    const targetFov =
      this.isScoped && cfg.zoomFov ? cfg.zoomFov : this.deviceProfile.recommendedFov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
    this.camera.updateProjectionMatrix();

    this.playerPitch = Math.min(1.15, this.playerPitch + this.recoilPitchVel * dt * 8);
    this.recoilPitchVel = THREE.MathUtils.damp(this.recoilPitchVel, 0, 12, dt);
    this.weaponKickZ = THREE.MathUtils.damp(this.weaponKickZ, 0, 12, dt);

    // Weapon walk bob + full multi-phase per-weapon reload choreography
    if (moving && this.grounded) {
      this.weaponBobPhase += dt * (sprinting ? 11.5 : 7.8);
    }
    const bobX = moving ? Math.cos(this.weaponBobPhase) * 0.014 : 0;
    const bobY = moving ? Math.abs(Math.sin(this.weaponBobPhase)) * 0.012 : 0;
    const activeRig = this.weaponRigs[this.activeWeapon];

    let relOffsetX = 0;
    let relOffsetY = 0;
    let relOffsetZ = 0;
    let relRotX = 0;
    let relRotY = 0;
    let relRotZ = 0;

    if (this.reloading) {
      const rp = THREE.MathUtils.clamp(
        1 - this.reloadTimer / Math.max(0.1, this.activeReloadDuration),
        0,
        1
      );
      const env = Math.sin(Math.min(1, rp / 0.14) * (Math.PI / 2)) *
        Math.sin(Math.min(1, (1 - rp) / 0.14) * (Math.PI / 2));

      if (this.activeWeapon === 'shotgun') {
        // Cant gun sideways, push two shells into tube, then snap upright and rack pump forend!
        const shellCycle = rp > 0.18 && rp < 0.72 ? Math.sin(((rp - 0.18) / 0.54) * Math.PI * 2) : 0;
        const pumpPhase = rp > 0.76 && rp < 0.96 ? Math.sin(((rp - 0.76) / 0.2) * Math.PI) : 0;
        relOffsetX = -0.055 * env;
        relOffsetY = -0.065 * env + Math.abs(shellCycle) * 0.024;
        relOffsetZ = 0.03 * env + pumpPhase * 0.035;
        relRotX = 0.22 * env + Math.max(0, shellCycle) * 0.08 - pumpPhase * 0.12;
        relRotY = 0.26 * env;
        relRotZ = -0.48 * env;
        if (activeRig.pumpForend) {
          activeRig.pumpForend.position.z = -0.4 + pumpPhase * 0.13;
        }
        if (activeRig.leftHand) {
          const reachBack = rp > 0.16 && rp < 0.74 ? Math.sin(((rp - 0.16) / 0.58) * Math.PI) : 0;
          activeRig.leftHand.position.set(
            -0.02 * reachBack,
            -0.04 * reachBack + Math.abs(shellCycle) * 0.045,
            0.22 * reachBack
          );
        }
      } else if (this.activeWeapon === 'awp') {
        // Open bolt -> drop box mag -> insert fresh mag -> slam bolt closed
        const boltOpen = rp < 0.22 ? Math.sin((rp / 0.22) * Math.PI) : 0;
        const magOut = rp > 0.22 && rp < 0.72 ? Math.sin(((rp - 0.22) / 0.5) * Math.PI) : 0;
        const boltClose = rp > 0.76 && rp < 0.96 ? Math.sin(((rp - 0.76) / 0.2) * Math.PI) : 0;
        relOffsetX = -0.045 * env;
        relOffsetY = -0.06 * env - magOut * 0.025;
        relOffsetZ = 0.03 * env + boltClose * 0.028;
        relRotX = 0.18 * env - boltClose * 0.08;
        relRotY = -0.22 * env;
        relRotZ = 0.34 * env;
        if (activeRig.boltHandle) {
          const pull = Math.max(boltOpen, boltClose);
          activeRig.boltHandle.rotation.z = pull * 0.92;
          activeRig.boltHandle.position.z = 0.02 + pull * 0.085;
        }
        if (activeRig.magazine) {
          activeRig.magazine.position.y = -0.078 - magOut * 0.24;
          activeRig.magazine.rotation.x = 0.08 + magOut * 0.28;
        }
        if (activeRig.leftHand) {
          activeRig.leftHand.position.set(0.01 * magOut, -0.14 * magOut, 0.11 * magOut);
        }
      } else if (this.activeWeapon === 'pistol') {
        // Crisp tactical cant -> eject mag -> slap fresh mag home -> rack chrome slide
        const magDrop = rp > 0.12 && rp < 0.66 ? Math.sin(((rp - 0.12) / 0.54) * Math.PI) : 0;
        const slapBump = rp > 0.6 && rp < 0.72 ? Math.sin(((rp - 0.6) / 0.12) * Math.PI) : 0;
        const slidePull = rp > 0.74 && rp < 0.94 ? Math.sin(((rp - 0.74) / 0.2) * Math.PI) : 0;
        relOffsetX = -0.045 * env;
        relOffsetY = -0.045 * env + slapBump * 0.032;
        relOffsetZ = 0.025 * env + slidePull * 0.022;
        relRotX = 0.26 * env + slapBump * 0.12;
        relRotY = -0.18 * env;
        relRotZ = 0.46 * env;
        if (activeRig.magazine) {
          activeRig.magazine.position.y = -0.1 - magDrop * 0.26;
          activeRig.magazine.position.z = 0.032 + magDrop * 0.06;
        }
        if (activeRig.slide) {
          activeRig.slide.position.z = -0.125 + slidePull * 0.085;
        }
        if (activeRig.leftHand) {
          activeRig.leftHand.position.set(
            0.02 * magDrop,
            -0.14 * magDrop + slidePull * 0.08,
            0.03 * magDrop - slidePull * 0.05
          );
        }
      } else if (this.activeWeapon === 'minigun') {
        // Heavy cant left -> unlock & drop olive drum -> seat fresh drum -> spin barrels slightly
        const drumDrop = rp > 0.16 && rp < 0.76 ? Math.sin(((rp - 0.16) / 0.6) * Math.PI) : 0;
        const seatBump = rp > 0.72 && rp < 0.84 ? Math.sin(((rp - 0.72) / 0.12) * Math.PI) : 0;
        relOffsetX = 0.02 * env;
        relOffsetY = -0.095 * env + seatBump * 0.035;
        relOffsetZ = 0.04 * env;
        relRotX = -0.16 * env + seatBump * 0.08;
        relRotY = -0.14 * env;
        relRotZ = -0.32 * env;
        if (activeRig.ammoDrum) {
          activeRig.ammoDrum.position.y = -0.145 - drumDrop * 0.28;
          activeRig.ammoDrum.rotation.z = drumDrop * 0.45;
        }
        if (activeRig.barrelCluster && rp > 0.8) {
          activeRig.barrelCluster.rotation.z += dt * 7.5;
        }
        if (activeRig.leftHand) {
          activeRig.leftHand.position.set(-0.04 * drumDrop, -0.18 * drumDrop, 0);
        }
      } else {
        // P90: tilt -> lift translucent top magazine off rail -> drop & slap fresh top mag -> rack side charging handle
        const magLift = rp > 0.12 && rp < 0.72 ? Math.sin(((rp - 0.12) / 0.6) * Math.PI) : 0;
        const slapBump = rp > 0.66 && rp < 0.76 ? Math.sin(((rp - 0.66) / 0.1) * Math.PI) : 0;
        const chargePull = rp > 0.78 && rp < 0.95 ? Math.sin(((rp - 0.78) / 0.17) * Math.PI) : 0;
        relOffsetX = -0.04 * env;
        relOffsetY = -0.055 * env - slapBump * 0.028;
        relOffsetZ = 0.025 * env;
        relRotX = 0.14 * env - slapBump * 0.09;
        relRotY = -0.22 * env;
        relRotZ = 0.36 * env;
        if (activeRig.magazine) {
          activeRig.magazine.position.y = 0.084 + magLift * 0.14;
          activeRig.magazine.position.x = -magLift * 0.075;
          activeRig.magazine.rotation.z = magLift * 0.34;
        }
        if (activeRig.chargingHandle) {
          activeRig.chargingHandle.position.z = -0.28 + chargePull * 0.075;
        }
        if (activeRig.leftHand) {
          activeRig.leftHand.position.set(
            -0.03 * magLift,
            0.12 * magLift + slapBump * 0.05,
            0.09 * magLift + chargePull * 0.06
          );
        }
      }
    } else {
      if (activeRig.pumpForend) {
        const pumpProgress =
          this.fireCooldown > 0.25 && this.fireCooldown < 0.55
            ? Math.sin(((this.fireCooldown - 0.25) / 0.3) * Math.PI)
            : 0;
        activeRig.pumpForend.position.z = -0.4 + pumpProgress * 0.11;
      }
      if (activeRig.slide) {
        activeRig.slide.position.z = -0.125 + this.weaponKickZ * 0.32;
      }
    }

    this.weaponHolder.position.set(
      0.24 + bobX + relOffsetX,
      -0.22 - bobY + relOffsetY,
      -0.44 + this.weaponKickZ + relOffsetZ
    );
    this.weaponHolder.rotation.set(
      this.weaponKickZ * 0.85 + relRotX,
      relRotY,
      relRotZ
    );

    // Muzzle flash light
    if (this.muzzleFlashTimer > 0) {
      this.muzzleLight.intensity = 18;
      this.muzzleFlashMesh.visible = !this.isScoped;
      this.muzzleFlashMesh.position.copy(activeRig.muzzlePoint.position);
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
    } else {
      this.muzzleLight.intensity = 0;
      this.muzzleFlashMesh.visible = false;
    }

    // Dynamic close-range flashlight auto-attenuation so monsters NEVER burn solid white up close!
    if (this.flashlightOn) {
      const fwdX = -Math.sin(this.playerYaw);
      const fwdZ = -Math.cos(this.playerYaw);
      let nearestConeDist = 10;
      for (const e of this.enemies) {
        if (e.dying) continue;
        const dx = e.x - this.playerX;
        const dz = e.z - this.playerZ;
        const d = Math.hypot(dx, dz);
        if (d < nearestConeDist && d > 0.05) {
          const forwardDot = (dx * fwdX + dz * fwdZ) / d;
          if (forwardDot > 0.35) {
            nearestConeDist = d;
          }
        }
      }
      const closeFactor = THREE.MathUtils.clamp((nearestConeDist - 1.1) / 4.4, 0, 1);
      const targetFlashIntensity = THREE.MathUtils.lerp(3.6, 16.0, closeFactor);
      this.flashlightIntensityLive = THREE.MathUtils.damp(
        this.flashlightIntensityLive,
        targetFlashIntensity,
        14,
        dt
      );
      this.flashlight.intensity = this.flashlightIntensityLive;
    } else {
      this.flashlight.intensity = 0;
    }

    // Dramatic 3D under-lit horror strobe during screamers
    if (this.screamerTimer > 0) {
      const sProg = this.screamerTimer / Math.max(0.1, this.screamerDuration);
      const strobePhase = Math.floor(this.elapsedSec * 32) % 3;
      if (this.screamerIntensity === 'reduced') {
        this.screamerLight.color.setHex(0xd93838);
        this.screamerLight.intensity = 5.5 * sProg;
      } else {
        this.screamerLight.color.setHex(strobePhase === 0 ? 0xffe4e4 : 0xff1a14);
        this.screamerLight.intensity = strobePhase === 2 ? 0.5 : 18 * sProg;
      }
    } else {
      this.screamerLight.intensity = 0;
    }

    // Apply camera transform + decaying trauma^2 shake (enhanced rotational punch during screamers)
    const shake = this.trauma * this.trauma;
    const screamerMult = this.screamerTimer > 0 && this.screamerIntensity !== 'reduced' ? 1.85 : 1.0;
    const shakeYaw = (Math.random() - 0.5) * shake * 0.068 * screamerMult;
    const shakePitch = (Math.random() - 0.5) * shake * 0.068 * screamerMult;
    const shakeRoll = (Math.random() - 0.5) * shake * 0.06 * screamerMult;
    const eyeHeight =
      (this.coopLocalDowned ? 0.72 : 1.68) +
      this.playerY +
      (moving && this.grounded && !this.coopLocalDowned ? Math.sin(this.weaponBobPhase * 2) * 0.032 : 0);
    this.camera.position.set(this.playerX, eyeHeight, this.playerZ);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerYaw + shakeYaw;
    this.camera.rotation.x = this.playerPitch + shakePitch;
    this.camera.rotation.z = shakeRoll;
    this.skyDome.position.copy(this.camera.position);

    // 4. Update Horror Entities, Pickups, Rooster Companion & LAN Co-op Sync
    if (simDt > 0) {
      if (this.phase === 'playing') {
        this.updateEnemies(simDt);
        this.updatePickups(simDt);
      }
      this.updateRooster(simDt);
      this.updateCoopSync(simDt, moving);
    }

    // 5. Throttle React HUD snapshots to ~12 Hz
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private updateCoopSync(dt: number, localMoving: boolean): void {
    // Animate ping beacon decay
    if (this.coopPingTimer > 0) {
      this.coopPingTimer = Math.max(0, this.coopPingTimer - dt);
      if (this.coopPingBeacon) {
        this.coopPingBeacon.rotation.y += dt * 1.6;
        if (this.coopPingTimer <= 0) {
          this.coopPingBeacon.visible = false;
          this.coopLastPingText = null;
        }
      }
    }

    // Smoothly interpolate & animate 3D remote partner avatars
    for (const p of this.coopPartners.values()) {
      const prevX = p.x;
      const prevZ = p.z;
      p.x = THREE.MathUtils.damp(p.x, p.targetX, 11, dt);
      p.y = THREE.MathUtils.damp(p.y, p.targetY, 11, dt);
      p.z = THREE.MathUtils.damp(p.z, p.targetZ, 11, dt);

      let dyaw = p.targetYaw - p.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      p.yaw += dyaw * Math.min(1, dt * 12);

      const moveDist = Math.hypot(p.x - prevX, p.z - prevZ);
      const speed = moveDist / Math.max(0.001, dt);
      p.walkPhase += speed * dt * 2.4;

      p.rig.group.position.set(p.x, p.y, p.z);
      p.rig.group.rotation.y = p.yaw;
      p.rig.headPivot.rotation.x = THREE.MathUtils.clamp(p.pitch * 0.65, -0.6, 0.6);

      if (p.isDowned) {
        p.rig.bodyPivot.position.y = 0.42;
        p.rig.bodyPivot.rotation.x = 0.42;
        p.rig.leftLeg.rotation.x = -0.9;
        p.rig.rightLeg.rotation.x = -0.9;
      } else {
        const stride = Math.min(1, speed / 4.5);
        p.rig.bodyPivot.position.y = 0.96 + Math.abs(Math.sin(p.walkPhase)) * 0.055 * stride;
        p.rig.bodyPivot.rotation.x = 0;
        p.rig.leftLeg.rotation.x = Math.sin(p.walkPhase) * 0.58 * stride;
        p.rig.rightLeg.rotation.x = -Math.sin(p.walkPhase) * 0.58 * stride;
        if (p.isReloading) {
          const rp = THREE.MathUtils.clamp(p.reloadProgress, 0, 1);
          const magCycle = Math.sin(rp * Math.PI);
          p.rig.leftArm.rotation.x = -0.58 * magCycle;
          p.rig.leftArm.rotation.z = -0.35 * magCycle;
          p.rig.rightArm.rotation.x = THREE.MathUtils.clamp(p.pitch * 0.35, -0.4, 0.4) - 0.25 * magCycle;
          p.rig.weaponPivot.rotation.z = 0.42 * magCycle;
          p.rig.weaponMag.position.y = -0.095 - magCycle * 0.18;
        } else {
          p.rig.leftArm.rotation.x = -Math.sin(p.walkPhase) * 0.16 * stride;
          p.rig.leftArm.rotation.z = 0;
          p.rig.rightArm.rotation.x = THREE.MathUtils.clamp(p.pitch * 0.5, -0.5, 0.5);
          p.rig.weaponPivot.rotation.z = 0;
          p.rig.weaponMag.position.y = -0.095;
        }
      }

      if (p.muzzleTimer > 0) {
        p.muzzleTimer -= dt;
        p.rig.muzzleFlash.visible = p.muzzleTimer > 0;
        p.rig.muzzleFlash.rotation.z += dt * 22;
      } else {
        p.rig.muzzleFlash.visible = false;
      }

      const sig = `${p.name}|${Math.round(p.hp)}|${p.maxHp}|${p.isDowned}`;
      if (sig !== p.lastLabelSig) {
        p.lastLabelSig = sig;
        p.rig.updateLabel(p.name, p.hp, p.maxHp, p.isDowned);
      }
      const distToCam = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      p.rig.nameSprite.visible = distToCam > 1.8 && distToCam < 44;
      const spriteScale = THREE.MathUtils.clamp(0.55 + distToCam * 0.045, 0.62, 1.35);
      p.rig.nameSprite.scale.set(spriteScale, spriteScale * 0.27, 1);
    }

    if (!this.coopClient?.isInActiveSession()) return;

    // Broadcast local player transform + reload animation state (~18Hz)
    this.coopStateSendAccum += dt;
    if (this.coopStateSendAccum >= 0.055) {
      this.coopStateSendAccum = 0;
      const reloadProgress = this.reloading
        ? Math.max(0, Math.min(1, 1 - this.reloadTimer / Math.max(0.1, this.activeReloadDuration)))
        : 0;
      this.coopClient.sendPlayerState({
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
        pitch: this.playerPitch,
        weaponId: this.activeWeapon,
        hp: Math.round(this.hp),
        maxHp: this.maxHp,
        isFiring: this.muzzleFlashTimer > 0,
        isReloading: this.reloading,
        reloadProgress: Number(reloadProgress.toFixed(2)),
        isMoving: localMoving,
        isDowned: this.coopLocalDowned,
        kills: this.kills,
      });
    }

    // Host broadcasts authoritative enemy snapshot (~10Hz) & active pickups (~2Hz) during active match
    if (this.coopClient.isHost() && this.phase === 'playing') {
      this.coopEnemiesSendAccum += dt;
      if (this.coopEnemiesSendAccum >= 0.1) {
        this.coopEnemiesSendAccum = 0;
        const payload: CoopSyncedEnemy[] = [];
        for (const e of this.enemies) {
          if (e.dying) continue;
          const netId = e.netId ?? `e_${e.id}`;
          e.netId = netId;
          payload.push({
            id: netId,
            kind: e.kind,
            x: Number(e.x.toFixed(2)),
            y: 0,
            z: Number(e.z.toFixed(2)),
            yaw: Number(e.prevYaw.toFixed(2)),
            hp: Math.max(0, Math.round(e.hp)),
            maxHp: Math.round(e.maxHp),
            state: e.tacticMode,
            hitFlash: Number(e.hitFlash.toFixed(2)),
          });
        }
        const chapTarget =
          this.mode === 'endless'
            ? this.endlessTargetKills
            : computeScaledChapterKillTarget(
                CHAPTERS[this.chapterIndex].targetKills,
                this.getActivePlayerCount()
              );
        this.coopClient.sendWorldEnemies(payload, this.chapterKills, chapTarget);
      }

      this.coopPickupsSendAccum += dt;
      if (this.coopPickupsSendAccum >= 0.45) {
        this.coopPickupsSendAccum = 0;
        const syncedPickups: CoopSyncedPickup[] = this.pickups.map((p) => ({
          id: p.netId ?? `pk_${p.id}`,
          kind: p.kind,
          x: Number(p.x.toFixed(2)),
          z: Number(p.z.toFixed(2)),
        }));
        this.coopClient.sendWorldPickups(syncedPickups);
      }
    }
  }

  private updateEnemies(dt: number): void {
    // Co-op Guest path: smoothly interpolate host-authoritative enemies & animate legs
    if (this.coopClient?.isInActiveSession() && !this.coopClient.isHost()) {
      for (const e of this.enemies) {
        e.phaseTime += dt;
        const prevX = e.x;
        const prevZ = e.z;
        e.x = THREE.MathUtils.damp(e.x, e.targetX ?? e.x, 10, dt);
        e.z = THREE.MathUtils.damp(e.z, e.targetZ ?? e.z, 10, dt);
        const targetYaw = e.targetYaw ?? e.prevYaw;
        let dyaw = targetYaw - e.prevYaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        e.prevYaw += dyaw * Math.min(1, dt * 10);

        if (e.hitFlash > 0) {
          e.hitFlash -= dt;
          for (let m = 0; m < e.rig.hitMaterials.length; m++) {
            e.rig.hitMaterials[m].emissive.setHex(
              e.hitFlash > 0 ? 0xffffff : e.rig.baseEmissiveColors[m]
            );
          }
        }

        const disp = Math.hypot(e.x - prevX, e.z - prevZ);
        e.actualSpeed = THREE.MathUtils.damp(e.actualSpeed, disp / Math.max(0.001, dt), 10, dt);
        e.gaitPhase += e.actualSpeed * dt * 1.85;

        const pose = computeBipedGaitPose({
          kind: e.kind,
          gaitPhase: e.gaitPhase,
          speedRatio: Math.min(1.2, e.actualSpeed / 3.0),
          turnRate: 0,
          timeSec: e.phaseTime,
          seed: e.seed,
          telegraphRatio: 0,
          flinchRatio: 0,
        });
        const r = e.rig;
        r.pelvisGroup.position.y = r.pelvisBaseY + pose.pelvisY;
        r.pelvisGroup.rotation.set(pose.pelvisPitch, pose.pelvisYaw, pose.pelvisRoll);
        r.spineGroup.rotation.set(pose.spinePitch, pose.spineYaw, pose.spineRoll);
        r.neckGroup.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll);
        r.leftHip.rotation.x = pose.leftHipX;
        r.leftKnee.rotation.x = pose.leftKneeX;
        r.leftAnkle.rotation.x = pose.leftAnkleX;
        r.rightHip.rotation.x = pose.rightHipX;
        r.rightKnee.rotation.x = pose.rightKneeX;
        r.rightAnkle.rotation.x = pose.rightAnkleX;
        r.leftShoulder.rotation.set(pose.leftShoulderX, 0, pose.leftShoulderZ);
        r.leftElbow.rotation.x = pose.leftElbowX;
        r.rightShoulder.rotation.set(pose.rightShoulderX, 0, pose.rightShoulderZ);
        r.rightElbow.rotation.x = pose.rightElbowX;
        r.group.position.set(e.x, 0, e.z);
        r.group.rotation.y = e.prevYaw;

        // Local proximity hit feedback for guest if monster corners them
        e.attackCooldown = Math.max(0, e.attackCooldown - dt);
        const distMe = Math.hypot(this.playerX - e.x, this.playerZ - e.z);
        if (distMe < (e.kind === 'watchman' ? 4.1 : 2.3) && e.attackCooldown <= 0 && !this.coopLocalDowned) {
          e.attackCooldown = 2.0;
          const baseDmg = e.kind === 'watchman' ? 20 : 11;
          this.applyPlayerDamage(baseDmg);
        }
      }
      return;
    }

    const chap = CHAPTERS[this.chapterIndex];
    const scaling = computeLoopScaling(this.loopNumber);
    const coopScale = this.getCoopScaling();
    const scaledChapKills = computeScaledChapterKillTarget(
      chap.targetKills,
      coopScale.playerCount
    );
    const maxActive =
      this.mode === 'endless'
        ? Math.min(18, 5 + this.endlessWave + coopScale.maxActiveBonus)
        : Math.min(18, chap.maxActiveEnemies + scaling.extraActiveEnemies + coopScale.maxActiveBonus);

    // Spawn pacing + anti-stall acceleration when only combat kills remain in a chapter
    const livingCount = this.enemies.filter((e) => !e.dying).length;
    if (this.mode === 'story' && !chap.hasBoss) {
      const chapObjs = this.objectiveNodes.filter((n) => n.spec.chapter === chap.chapter);
      const allObjsDone = chapObjs.every((n) => n.spec.completed);
      if (allObjsDone && this.chapterKills < scaledChapKills && livingCount < 2) {
        this.spawnTimer = Math.min(this.spawnTimer, 1.05);
      }
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && livingCount < maxActive) {
      const baseInterval =
        this.mode === 'endless'
          ? Math.max(1.8, 3.6 - this.endlessWave * 0.22)
          : chap.hasBoss
            ? 6.2
            : Math.max(2.0, 4.0 - (this.chapterIndex % 6) * 0.45);
      this.spawnTimer = Math.max(
        1.1,
        (baseInterval * scaling.spawnIntervalMult) / coopScale.spawnRateMult
      );
      // Pick spawn position behind fences or down the foggy street (at least 18m from player)
      const angle = Math.random() * Math.PI * 2;
      const dist = 19 + Math.random() * 13;
      const sx = Math.max(-28, Math.min(28, this.playerX + Math.cos(angle) * dist));
      const sz = Math.max(-42, Math.min(38, this.playerZ + Math.sin(angle) * dist));

      const r = Math.random();
      const w =
        this.mode === 'endless'
          ? { crawler: 0.4, lampshade: 0.34, screamer: 0.26 }
          : chap.spawnWeights;
      const kind: EnemyKind =
        r < w.crawler
          ? 'crawler'
          : r < w.crawler + w.lampshade
            ? 'lampshade'
            : 'screamer';
      this.spawnEnemy(kind, sx, sz);
    }

    // Attack token pool (max 3 simultaneous attackers for fair crowd combat)
    let activeAttackers = this.enemies.filter(
      (e) => !e.dying && e.telegraphTimer > 0
    ).length;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.phaseTime += dt;

      if (e.dying) {
        e.deathTimer -= dt;
        e.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(
          e.rig.bodyGroup.rotation.x,
          -Math.PI / 2,
          9,
          dt
        );
        const s = Math.max(0.01, e.deathTimer / 0.48);
        e.rig.group.scale.setScalar(s);
        if (e.deathTimer <= 0) {
          this.scene.remove(e.rig.group);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Hit flash recovery
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        for (let m = 0; m < e.rig.hitMaterials.length; m++) {
          e.rig.hitMaterials[m].emissive.setHex(
            e.hitFlash > 0 ? 0xffffff : e.rig.baseEmissiveColors[m]
          );
        }
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.flinchTimer = Math.max(0, e.flinchTimer - dt);
      e.recentHitTimer = Math.max(0, e.recentHitTimer - dt);
      e.tacticTimer -= dt;

      // Irregular tactical state switching (eliminates predictable left-right-left pacing)
      if (e.recentHitTimer > 0) {
        e.tacticMode = 'enraged_charge';
      } else if (e.tacticTimer <= 0) {
        const distToPlayer = Math.hypot(this.playerX - e.x, this.playerZ - e.z);
        const roll = Math.random();
        if (distToPlayer < 7.5 || e.kind === 'watchman') {
          e.tacticMode = roll < 0.72 ? 'approach' : 'feint_sprint';
        } else if (e.kind === 'crawler') {
          e.tacticMode = roll < 0.45 ? 'feint_sprint' : roll < 0.78 ? 'flank_arc' : 'approach';
        } else if (e.kind === 'screamer') {
          e.tacticMode = roll < 0.5 ? 'flank_arc' : 'approach';
        } else {
          e.tacticMode = roll < 0.55 ? 'approach' : roll < 0.85 ? 'flank_arc' : 'feint_sprint';
        }
        if (Math.random() < 0.42) {
          e.flankSign = e.flankSign === 1 ? -1 : 1;
        }
        e.tacticTimer = 1.6 + Math.random() * 1.9;
      }

      const prevX = e.x;
      const prevZ = e.z;

      const steer = computeEnemySteering({
        kind: e.kind,
        x: e.x,
        z: e.z,
        playerX: this.playerX,
        playerZ: this.playerZ,
        playerYaw: this.playerYaw,
        phaseTime: e.phaseTime,
        seed: e.seed,
        canClaimAttackToken: e.attackCooldown <= 0 && activeAttackers < 3,
        tacticMode: e.tacticMode,
        flankSign: e.flankSign,
        recentHitRatio: Math.min(1, e.recentHitTimer / 1.65),
      });

      // Handle telegraph -> active strike
      let telegraphRatio = 0;
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        telegraphRatio = Math.max(
          0,
          Math.min(1, 1 - e.telegraphTimer / Math.max(0.1, e.telegraphDuration))
        );
        // Visible telegraph windup: emissive surge
        for (const em of e.rig.emissiveParts) {
          em.emissiveIntensity = 5.5;
        }

        if (e.telegraphTimer <= 0) {
          for (const em of e.rig.emissiveParts) {
            em.emissiveIntensity = 2.6;
          }
          const distNow = Math.hypot(this.playerX - e.x, this.playerZ - e.z);
          if (e.kind === 'screamer' && distNow < 9.5) {
            this.triggerScreamer('hollow');
            const dmg = Math.round(
              computeDifficultyScaledEnemyStats(
                100,
                10,
                this.difficulty,
                this.loopNumber
              ).damage * coopScale.enemyDamageMult
            );
            this.applyPlayerDamage(dmg);
          } else if (distNow < (e.kind === 'watchman' ? 4.9 : 3.5)) {
            const baseDmg =
              e.kind === 'watchman' ? 22 : e.kind === 'crawler' ? 12 : 14;
            const dmg = Math.round(
              computeDifficultyScaledEnemyStats(
                100,
                baseDmg,
                this.difficulty,
                this.loopNumber
              ).damage * coopScale.enemyDamageMult
            );
            this.applyPlayerDamage(dmg);
            const fwdX = -Math.sin(this.playerYaw);
            const fwdZ = -Math.cos(this.playerYaw);
            const relDot =
              distNow > 0.05
                ? ((e.x - this.playerX) * fwdX + (e.z - this.playerZ) * fwdZ) / distNow
                : 1;
            const behindAmbush = relDot < -0.1;
            if (e.kind === 'watchman' || behindAmbush || Math.random() < 0.48) {
              this.triggerScreamer(
                e.kind === 'watchman' ? 'watchman' : behindAmbush ? 'fence' : 'fog'
              );
            }
          }
          e.attackCooldown =
            e.kind === 'watchman' ? 2.2 : e.kind === 'screamer' ? 2.3 : 1.85;
        }
      } else {
        if (steer.wantsTelegraph) {
          e.telegraphDuration =
            e.kind === 'screamer' ? 0.72 : e.kind === 'watchman' ? 0.58 : 0.48;
          e.telegraphTimer = e.telegraphDuration;
          activeAttackers += 1;
        }

        // Move with difficulty/loop/co-op speed scaling, knockback decay & AABB collision
        const spdMult =
          computeDifficultyScaledEnemyStats(
            100,
            12,
            this.difficulty,
            this.loopNumber
          ).speedMult * coopScale.enemySpeedMult;
        const nx = e.x + (steer.vx * spdMult + e.knockVx) * dt;
        const nz = e.z + (steer.vz * spdMult + e.knockVz) * dt;
        e.knockVx = THREE.MathUtils.damp(e.knockVx, 0, 8, dt);
        e.knockVz = THREE.MathUtils.damp(e.knockVz, 0, 8, dt);

        // Enemies weave around houses but cannot clip into player or each other
        const houseColliders = this.layout.colliders.filter((c) => c.kind !== 'fence');
        const resolvedWall = resolveCircleVsAABBs(
          nx,
          nz,
          e.radius,
          houseColliders,
          this.layout.bounds
        );
        const solidObstacles: Array<{ x: number; z: number; radius: number }> = [
          { x: this.playerX, z: this.playerZ, radius: 0.55 },
        ];
        for (let j = 0; j < this.enemies.length; j++) {
          const other = this.enemies[j];
          if (other !== e && !other.dying) {
            solidObstacles.push({ x: other.x, z: other.z, radius: other.radius });
          }
        }
        const resolvedBody = resolveCircleVsCircles(
          resolvedWall.x,
          resolvedWall.z,
          e.radius,
          solidObstacles
        );
        const finalPos = resolvedBody.hitEntity
          ? resolveCircleVsAABBs(
              resolvedBody.x,
              resolvedBody.z,
              e.radius,
              houseColliders,
              this.layout.bounds
            )
          : resolvedWall;
        e.x = finalPos.x;
        e.z = finalPos.z;
      }

      // Compute true world ground displacement & smooth angular heading (prevents treadmill foot sliding!)
      const disp = Math.hypot(e.x - prevX, e.z - prevZ);
      const instantSpeed = disp / Math.max(0.001, dt);
      e.actualSpeed = THREE.MathUtils.damp(e.actualSpeed, instantSpeed, 10, dt);

      const nominalSpeed =
        e.kind === 'crawler'
          ? 3.7
          : e.kind === 'lampshade'
            ? 2.8
            : e.kind === 'screamer'
              ? 3.1
              : 2.3;
      const speedRatio = Math.min(1.4, e.actualSpeed / nominalSpeed);

      // Advance gait phase strictly proportional to true ground distance travelled
      const strideFreq =
        e.kind === 'watchman' ? 1.55 : e.kind === 'crawler' ? 2.15 : 1.85;
      e.gaitPhase += e.actualSpeed * dt * strideFreq;

      // Smooth yaw toward movement/player so turning leans naturally into curves
      const targetYaw = Math.atan2(this.playerX - e.x, this.playerZ - e.z);
      let yawDelta = targetYaw - e.prevYaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      const smoothedYaw = e.prevYaw + yawDelta * Math.min(1, dt * 8.5);
      e.turnRate = THREE.MathUtils.damp(
        e.turnRate,
        (smoothedYaw - e.prevYaw) / Math.max(0.001, dt),
        8,
        dt
      );
      e.prevYaw = smoothedYaw;

      const pose = computeBipedGaitPose({
        kind: e.kind,
        gaitPhase: e.gaitPhase,
        speedRatio,
        turnRate: e.turnRate,
        timeSec: e.phaseTime,
        seed: e.seed,
        telegraphRatio,
        flinchRatio: Math.min(1, e.flinchTimer / 0.28),
      });

      // Apply full hierarchical biomechanical skeleton pose to all joints
      const r = e.rig;
      r.pelvisGroup.position.y = r.pelvisBaseY + pose.pelvisY;
      r.pelvisGroup.rotation.set(pose.pelvisPitch, pose.pelvisYaw, pose.pelvisRoll);
      r.spineGroup.rotation.set(pose.spinePitch, pose.spineYaw, pose.spineRoll);
      r.neckGroup.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll);

      r.leftHip.rotation.x = pose.leftHipX;
      r.leftKnee.rotation.x = pose.leftKneeX;
      r.leftAnkle.rotation.x = pose.leftAnkleX;

      r.rightHip.rotation.x = pose.rightHipX;
      r.rightKnee.rotation.x = pose.rightKneeX;
      r.rightAnkle.rotation.x = pose.rightAnkleX;

      r.leftShoulder.rotation.set(pose.leftShoulderX, 0, pose.leftShoulderZ);
      r.leftElbow.rotation.x = pose.leftElbowX;
      r.rightShoulder.rotation.set(pose.rightShoulderX, 0, pose.rightShoulderZ);
      r.rightElbow.rotation.x = pose.rightElbowX;

      r.group.position.set(e.x, 0, e.z);
      r.group.rotation.y = smoothedYaw;
    }
  }

  private applyPlayerDamage(amount: number): void {
    if (this.phase !== 'playing' || this.hurtInvulnTimer > 0) return;
    if (this.coopLocalDowned) return;
    this.hurtInvulnTimer = 0.38;
    this.outOfCombatTimer = 0;
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 0.65;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.audio.playPlayerHurt();
    if (this.hp <= 0) {
      // In LAN co-op, if any teammate is still standing, enter Downed state so they can revive you!
      const standingPartner = Array.from(this.coopPartners.values()).some((p) => !p.isDowned);
      if (this.coopClient?.isInActiveSession() && standingPartner) {
        this.coopLocalDowned = true;
        this.hp = 1;
        this.isScoped = false;
        this.emitHud();
        return;
      }
      this.updateRecords();
      this.phase = 'gameover';
      this.heldKeys.clear();
      this.heldMouseButtons.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualSprint = false;
      this.mouseDown = false;
      this.isScoped = false;
      this.audio.setMinigunSpin(0);
      document.exitPointerLock?.();
      this.syncBodyState();
    }
    this.emitHud();
  }

  private updateRooster(dt: number): void {
    // Find nearest living threat for Petya's danger alert sense
    let nearest: { x: number; z: number; dist: number; kind: EnemyKind } | null = null;
    for (const e of this.enemies) {
      if (e.dying) continue;
      const d = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
      if (!nearest || d < nearest.dist) {
        nearest = { x: e.x, z: e.z, dist: d, kind: e.kind };
      }
    }

    const out = stepRoosterCompanion({
      x: this.roosterX,
      y: this.roosterY,
      z: this.roosterZ,
      mode: this.roosterMode,
      orbitAngle: this.roosterOrbitAngle,
      flightTimer: this.roosterFlightTimer,
      patTimer: this.roosterPatTimer,
      patCooldown: this.roosterPatCooldown,
      patCount: this.roosterPatCount,
      crowCooldown: this.roosterCrowCooldown,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      nearestThreat: nearest,
      patRequested: false,
      dt,
      lang: this.lang,
      roosterName: this.roosterName,
    });

    const prevRx = this.roosterX;
    const prevRz = this.roosterZ;

    this.roosterX = out.x;
    this.roosterY = out.y;
    this.roosterZ = out.z;
    this.roosterYaw = out.yaw;
    this.roosterMode = out.mode;
    this.roosterOrbitAngle = out.orbitAngle;
    this.roosterFlightTimer = out.flightTimer;
    this.roosterPatTimer = out.patTimer;
    this.roosterPatCooldown = out.patCooldown;
    this.roosterCrowCooldown = out.crowCooldown;
    this.roosterAlertActive = out.alertActive;
    this.roosterAlertAngle = out.alertAngleRad;
    this.roosterAlertLabel = out.alertLabel;

    if (out.triggeredCrow) {
      this.audio.playRoosterCrow();
      this.spawnBurst(this.roosterX, this.roosterY + 0.55, this.roosterZ, 6, 0xe8963a, 2.4);
    }

    if (this.roosterPatTimer <= 0) {
      const t = TRANSLATIONS[this.lang];
      this.roosterStatusBanner =
        this.roosterMode === 'alert'
          ? t.roosterAlerting
          : this.roosterMode === 'circle_fly'
            ? t.roosterFlying
            : t.roosterHopping;
    }

    // Track real ground velocity to drive non-sliding avian leg stride
    const rDisp = Math.hypot(this.roosterX - prevRx, this.roosterZ - prevRz);
    const instantGroundSpd = this.roosterY <= 0.18 ? rDisp / Math.max(0.001, dt) : 0;
    this.roosterGroundSpeed = THREE.MathUtils.damp(this.roosterGroundSpeed, instantGroundSpd, 11, dt);
    this.roosterStepPhase += this.roosterGroundSpeed * dt * 6.2;
    this.roosterWingPhase += dt * out.wingFlapSpeed;

    const rPose = computeRoosterGaitPose({
      groundSpeed: this.roosterGroundSpeed,
      altitude: this.roosterY,
      stepPhase: this.roosterStepPhase,
      wingPhase: this.roosterWingPhase,
      timeSec: this.elapsedSec,
      mode: this.roosterMode,
      patTimer: this.roosterPatTimer,
    });

    // Update articulated 3D Rooster skeleton
    this.roosterRig.group.position.set(this.roosterX, 0, this.roosterZ);
    this.roosterRig.bodyPivot.position.y = 0.36 + this.roosterY + rPose.bodyYOffset;
    this.roosterRig.bodyPivot.rotation.set(rPose.bodyPitch, this.roosterYaw, rPose.bodyRoll);
    this.applyRoosterPoseToRig(rPose);

    // Contact shadow stays grounded at y = 0.025 and shrinks slightly when flying high
    const shadowScale = Math.max(0.45, 1 - this.roosterY * 0.28);
    this.roosterRig.shadowMesh.scale.setScalar(shadowScale);
  }

  private applyRoosterPoseToRig(pose: ReturnType<typeof computeRoosterGaitPose>): void {
    const r = this.roosterRig;
    r.neckPivot.rotation.x = pose.neckPitch;
    r.headPivot.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll);
    r.leftHip.rotation.x = pose.leftHipX;
    r.leftKnee.rotation.x = pose.leftKneeX;
    r.leftAnkle.rotation.x = pose.leftAnkleX;
    r.rightHip.rotation.x = pose.rightHipX;
    r.rightKnee.rotation.x = pose.rightKneeX;
    r.rightAnkle.rotation.x = pose.rightAnkleX;
    r.leftWing.rotation.set(0, pose.leftWingSpreadY, pose.leftWingFlapZ);
    r.rightWing.rotation.set(0, pose.rightWingSpreadY, pose.rightWingFlapZ);
    r.tailGroup.rotation.x = pose.tailPitch;
  }

  private updateParticles(dt: number): void {
    let anyDirty = false;
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 9.5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      const s = p.scale * ratio;
      _posVec.set(p.x, p.y, p.z);
      _quat.identity();
      _scaleVec.set(s, s, s);
      _mat4.compose(_posVec, _quat, _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private updateRain(dt: number, timeSec: number): void {
    // Advance subtle organic forest wind gusts, wet asphalt sheen, ground mist & puddle reflections
    this.foliageWindUniform.value = timeSec;
    this.materials.roadTimeUniform.value = timeSec;
    if (this.puddleMat) {
      this.puddleMat.uniforms.uTime.value = timeSec;
    }
    if (this.mistSheetMat) {
      this.mistSheetMat.uniforms.uTime.value = timeSec;
    }

    // Ultra-delicate light night drizzle filaments (paired with CameraRainOverlay lens droplets)
    if (this.rainLines && this.rainOffsets && this.rainSpeeds) {
      const posAttr = this.rainLines.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const cx = this.camera.position.x;
      const cz = this.camera.position.z;
      const count = this.rainOffsets.length / 3;
      const windX = 0.07 + Math.sin(timeSec * 0.35) * 0.03;
      const windZ = 0.04;

      for (let i = 0; i < count; i++) {
        let ry = this.rainOffsets[i * 3 + 1] - this.rainSpeeds[i] * dt;
        if (ry < 0) ry += 14.5;
        this.rainOffsets[i * 3 + 1] = ry;

        const x = cx + this.rainOffsets[i * 3];
        const z = cz + this.rainOffsets[i * 3 + 2];
        const streakLen = i % 3 === 0 ? 0.38 : 0.26;
        const idx = i * 6;
        arr[idx] = x;
        arr[idx + 1] = ry + streakLen;
        arr[idx + 2] = z;
        arr[idx + 3] = x + windX;
        arr[idx + 4] = ry;
        arr[idx + 5] = z + windZ;
      }
      posAttr.needsUpdate = true;
    }

    // 3D Road Rain Impact Splash Crowns (tiny splashing rebounds strictly on wet road & central square)
    if (this.roadSplashMesh && this.roadSplashes.length > 0) {
      const cx = this.camera.position.x;
      const cz = this.camera.position.z;
      const splashCol = new THREE.Color();
      for (let i = 0; i < this.roadSplashes.length; i++) {
        const sp = this.roadSplashes[i];
        sp.age += dt;
        if (sp.age >= sp.duration) {
          sp.age = 0;
          sp.duration = 0.32 + Math.random() * 0.3;
          sp.scale = 0.72 + Math.random() * 0.85;
          // Concentrate raindrop ripples ahead of & around camera strictly on wet road/square asphalt
          const candZ = Math.max(-44, Math.min(42, cz + (Math.random() - 0.58) * 26));
          const maxRoadHalfX = Math.abs(candZ) < 10.5 ? 10.2 : 4.45;
          sp.x = (Math.random() - 0.5) * 2 * maxRoadHalfX;
          sp.z = candZ;
          // Warm sodium lamp glint under streetlamps, cool steel-blue moonlight glint between lamps
          let nearestLampDist = 99;
          for (const lp of this.lamps) {
            const ld = Math.hypot(sp.x - (lp.x + lp.armDirX * 1.8), sp.z - lp.z);
            if (ld < nearestLampDist) nearestLampDist = ld;
          }
          sp.lampTint = Math.max(0, 1 - nearestLampDist / 11.5);
        }

        const p = sp.age / sp.duration;
        const distFromCam = Math.hypot(sp.x - cx, sp.z - cz);
        if (distFromCam > 22) {
          _mat4.makeScale(0, 0, 0);
          this.roadSplashMesh.setMatrixAt(i, _mat4);
          continue;
        }
        // Smooth radial expansion along the wet road film (thin flat ring, zero vertical spikes)
        const radScale = sp.scale * (0.28 + p * 2.15);
        _posVec.set(sp.x, 0.044, sp.z);
        _quat.identity();
        _scaleVec.set(radScale, 1, radScale);
        _mat4.compose(_posVec, _quat, _scaleVec);
        this.roadSplashMesh.setMatrixAt(i, _mat4);

        const env = Math.sin(Math.min(1, p / 0.14) * (Math.PI / 2)) * (1 - p) * (1 - p);
        const fade = env * (1 - Math.min(1, distFromCam / 22));
        splashCol.setRGB(
          (0.36 + sp.lampTint * 0.62) * fade,
          (0.45 + sp.lampTint * 0.34) * fade,
          (0.64 - sp.lampTint * 0.24) * fade
        );
        this.roadSplashMesh.setColorAt(i, splashCol);
      }
      this.roadSplashMesh.instanceMatrix.needsUpdate = true;
      if (this.roadSplashMesh.instanceColor) {
        this.roadSplashMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private syncBodyState(): void {
    // Standard state mirror for accessibility & automated verification
    const stateMap: Record<GamePhase, string> = {
      title: 'title',
      hub: 'hub',
      cutscene: 'cutscene',
      playing: 'playing',
      upgrade: 'upgrade',
      paused: 'paused',
      victory: 'gameover',
      gameover: 'gameover',
    };
    document.body.dataset.state = stateMap[this.phase];
  }

  private computeObjectiveCompass(): {
    active: boolean;
    distanceMeters: number;
    relativeAngleRad: number;
  } {
    if (this.phase === 'hub' && this.layout.hubAnchors) {
      const car = this.layout.hubAnchors.carPos;
      const dist = Math.hypot(car.x - this.playerX, car.z - this.playerZ);
      const fwdX = -Math.sin(this.playerYaw);
      const fwdZ = -Math.cos(this.playerYaw);
      const rightX = Math.cos(this.playerYaw);
      const rightZ = -Math.sin(this.playerYaw);
      const dx = car.x - this.playerX;
      const dz = car.z - this.playerZ;
      return {
        active: true,
        distanceMeters: Math.max(1, Math.round(dist)),
        relativeAngleRad: Math.atan2(dx * rightX + dz * rightZ, dx * fwdX + dz * fwdZ),
      };
    }

    if (this.phase !== 'playing') {
      return { active: false, distanceMeters: 0, relativeAngleRad: 0 };
    }
    let tx: number | null = null;
    let tz: number | null = null;
    let bestDist = Infinity;

    if (this.mode === 'story') {
      const chap = CHAPTERS[this.chapterIndex];
      for (const node of this.objectiveNodes) {
        if (node.spec.chapter === chap.chapter && !node.spec.completed) {
          const d = Math.hypot(node.spec.x - this.playerX, node.spec.z - this.playerZ);
          if (d < bestDist) {
            bestDist = d;
            tx = node.spec.x;
            tz = node.spec.z;
          }
        }
      }
    }

    // Fallback to boss or nearest living enemy
    if (tx === null) {
      const boss = this.enemies.find((e) => e.kind === 'watchman' && !e.dying);
      if (boss) {
        tx = boss.x;
        tz = boss.z;
        bestDist = Math.hypot(boss.x - this.playerX, boss.z - this.playerZ);
      } else {
        for (const e of this.enemies) {
          if (e.dying) continue;
          const d = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
          if (d < bestDist) {
            bestDist = d;
            tx = e.x;
            tz = e.z;
          }
        }
      }
    }

    if (tx === null || tz === null || !Number.isFinite(bestDist)) {
      return { active: false, distanceMeters: 0, relativeAngleRad: 0 };
    }

    const fwdX = -Math.sin(this.playerYaw);
    const fwdZ = -Math.cos(this.playerYaw);
    const rightX = Math.cos(this.playerYaw);
    const rightZ = -Math.sin(this.playerYaw);
    const dx = tx - this.playerX;
    const dz = tz - this.playerZ;
    const fDot = dx * fwdX + dz * fwdZ;
    const rDot = dx * rightX + dz * rightZ;
    return {
      active: true,
      distanceMeters: Math.max(1, Math.round(bestDist)),
      relativeAngleRad: Math.atan2(rDot, fDot),
    };
  }

  public getSnapshot(): HudSnapshot {
    const t = TRANSLATIONS[this.lang];
    const chap = CHAPTERS[this.chapterIndex];
    const chapMeta = t.chapterMeta[this.chapterIndex];
    const chapObjs = this.objectiveNodes.filter((n) => n.spec.chapter === chap.chapter);
    const doneCount = chapObjs.filter((n) => n.spec.completed).length;
    const coopScale = this.getCoopScaling();
    const scaledTargetKills = computeScaledChapterKillTarget(
      chap.targetKills,
      coopScale.playerCount
    );

    let nearbyInteractLabel: string | null = null;
    let nearbyReviveName: string | null = null;
    let hubNearbyAction: 'car' | 'terminal' | null = null;
    const interactKeyLabel = formatBindingLabel(this.keybinds.interact, this.lang, true);

    if (this.phase === 'hub' && this.layout.hubAnchors) {
      const car = this.layout.hubAnchors.carPos;
      const term = this.layout.hubAnchors.terminalPos;
      if (Math.hypot(car.x - this.playerX, car.z - this.playerZ) < this.layout.hubAnchors.carRadius) {
        hubNearbyAction = 'car';
        const raw = this.hubInCar ? t.hub.moskvitchLeavePrompt : t.hub.moskvitchBoardPrompt;
        nearbyInteractLabel = this.deviceProfile.isTouch
          ? raw.replace(/^\s*\[[^\]]+\]\s*/, '')
          : raw.replace('[E]', `[${interactKeyLabel}]`);
      } else if (
        Math.hypot(term.x - this.playerX, term.z - this.playerZ) < this.layout.hubAnchors.terminalRadius
      ) {
        hubNearbyAction = 'terminal';
        const raw = t.hub.terminalPrompt;
        nearbyInteractLabel = this.deviceProfile.isTouch
          ? raw.replace(/^\s*\[[^\]]+\]\s*/, '')
          : raw.replace('[E]', `[${interactKeyLabel}]`);
      }
    } else if (this.phase === 'playing') {
      // Priority 1: Downed LAN co-op partner revive prompt
      if (this.coopClient?.isInActiveSession() && !this.coopLocalDowned) {
        for (const p of this.coopPartners.values()) {
          if (!p.isDowned) continue;
          if (Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 3.4) {
            nearbyReviveName = p.name;
            const rawRevive = t.lanCoop.revivePrompt(p.name);
            nearbyInteractLabel = this.deviceProfile.isTouch
              ? rawRevive.replace(/^\s*\[[^\]]+\]\s*/, '')
              : rawRevive.replace('[E]', `[${interactKeyLabel}]`);
            break;
          }
        }
      }
      // Priority 2: Nearby collectible MK-60 Cassette Tape
      if (!nearbyInteractLabel) {
        for (const tn of this.tapeNodes) {
          if (tn.spec.collected || !tn.group.visible) continue;
          if (Math.hypot(tn.spec.x - this.playerX, tn.spec.z - this.playerZ) < 3.3) {
            const meta = t.storyTapes[tn.spec.id as keyof typeof t.storyTapes];
            if (meta) {
              const rawTape = t.tapeCollectPrompt(meta.title);
              nearbyInteractLabel = this.deviceProfile.isTouch
                ? rawTape.replace(/^\s*\[[^\]]+\]\s*/, '')
                : rawTape.replace('[E]', `[${interactKeyLabel}]`);
            } else {
              nearbyInteractLabel = this.deviceProfile.isTouch
                ? 'MK-60'
                : `[${interactKeyLabel}] MK-60`;
            }
            break;
          }
        }
      }
      // Priority 3: Active chapter objective shrine
      if (!nearbyInteractLabel && this.mode === 'story') {
        for (const node of chapObjs) {
          if (!node.spec.completed) {
            const d = Math.hypot(node.spec.x - this.playerX, node.spec.z - this.playerZ);
            if (d < 3.8) {
              const locLabel = t.objectiveLabels[node.spec.id] ?? node.spec.label;
              nearbyInteractLabel = this.deviceProfile.isTouch
                ? locLabel
                : `[${interactKeyLabel}] ${locLabel}`;
              break;
            }
          }
        }
      }
    }

    const boss = this.enemies.find((e) => e.kind === 'watchman' && !e.dying);
    const chapterTitle =
      this.phase === 'hub'
        ? t.hub.title
        : this.mode === 'endless'
          ? t.endlessWaveTitle(this.endlessWave)
          : chapMeta.title;
    const objectiveText =
      this.phase === 'hub'
        ? t.hub.subtitle
        : this.mode === 'endless'
          ? boss
            ? t.bossObjective
            : t.endlessObjective(
                Math.min(this.chapterKills, this.endlessTargetKills),
                this.endlessTargetKills
              )
          : chap.hasBoss
            ? t.bossObjective
            : doneCount < chapObjs.length
              ? t.objectiveProgress(
                  chapMeta.objectiveSummary,
                  doneCount,
                  chapObjs.length,
                  Math.min(this.chapterKills, scaledTargetKills),
                  scaledTargetKills
                )
              : t.clearRemainingEntities(
                  Math.min(this.chapterKills, scaledTargetKills),
                  scaledTargetKills
                );

    const reloadProgress = this.reloading
      ? Math.max(0, Math.min(1, 1 - this.reloadTimer / Math.max(0.1, this.activeReloadDuration)))
      : 0;

    const activeStoryLog =
      this.storyLogTimer > 0
        ? this.customStoryLog
          ? this.customStoryLog
          : this.storyLogKey && this.storyLogKey in t.storyLogs
            ? {
                speaker: localizeRoosterCopy(
                  t.storyLogs[this.storyLogKey as keyof typeof t.storyLogs].speaker,
                  this.lang,
                  this.roosterName
                ),
                text: localizeRoosterCopy(
                  t.storyLogs[this.storyLogKey as keyof typeof t.storyLogs].text,
                  this.lang,
                  this.roosterName
                ),
              }
            : null
        : null;

    const squadHud = Array.from(this.coopPartners.values()).map((p) => ({
      id: p.id,
      name: p.name,
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      isDowned: p.isDowned,
      isHost: p.isHost,
      kills: p.kills,
      distanceMeters: Math.max(1, Math.round(Math.hypot(p.x - this.playerX, p.z - this.playerZ))),
    }));

    const myId = this.coopClient?.getClientId() ?? 'solo';
    const totalPlayers = this.getActivePlayerCount();

    return {
      language: this.lang,
      roosterName: this.roosterName,
      difficulty: this.difficulty,
      mouseSensitivity: this.mouseSensitivity,
      keybinds: { ...this.keybinds },
      isTouchDevice: this.deviceProfile.isTouch,
      isPortrait: this.deviceProfile.isPortrait,
      storyLog: activeStoryLog,
      mode: this.mode,
      loopNumber: this.loopNumber,
      phase: this.phase,
      zoneId: this.currentZone,
      chapter: chap.chapter,
      totalChapters: CHAPTERS.length,
      chapterTitle,
      clockLabel: this.phase === 'hub' ? '18:40' : chap.clockLabel,
      objectiveText,
      objectivesDone: doneCount,
      objectivesTotal: chapObjs.length,
      objectiveCompass: this.computeObjectiveCompass(),
      nearbyInteractLabel,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      activeWeapon: this.activeWeapon,
      ammo: {
        shotgun: { ...this.ammo.shotgun },
        awp: { ...this.ammo.awp },
        pistol: { ...this.ammo.pistol },
        minigun: { ...this.ammo.minigun },
        p90: { ...this.ammo.p90 },
      },
      reloading: this.reloading,
      reloadProgress,
      minigunSpin: this.minigunSpin,
      isScoped: this.isScoped,
      flashlightOn: this.flashlightOn,
      kills: this.kills,
      score: this.score,
      combo: this.combo,
      comboMultiplier: computeComboMultiplier(this.combo),
      comboTimer: Number(this.comboTimer.toFixed(1)),
      overclockTimer: Number(this.overclockTimer.toFixed(1)),
      headshotTimer: Number(this.headshotTimer.toFixed(2)),
      pickupToast: this.pickupToast,
      elapsedSec: Math.round(this.elapsedSec),
      hitMarkerTimer: this.hitMarkerTimer,
      hitMarkerCrit: this.hitMarkerCrit,
      damageFlash: this.damageFlash,
      screamerActive: this.screamerTimer > 0,
      screamerProgress:
        this.screamerTimer > 0 ? this.screamerTimer / this.screamerDuration : 0,
      screamerKind: this.screamerKind,
      screamerCaption: t.screamerCaptions[this.screamerCaptionKey],
      screamerIntensity: this.screamerIntensity,
      exeCorruption: Number(this.exeCorruption.toFixed(2)),
      pointerLocked: this.pointerLocked,
      bossActive: Boolean(boss),
      bossName: t.bossName,
      bossHp: boss ? Math.max(0, Math.round(boss.hp)) : 0,
      bossMaxHp: boss ? boss.maxHp : 1350,
      rooster: {
        mode: this.roosterMode,
        alertActive: this.roosterAlertActive,
        alertLabel: this.roosterAlertLabel,
        alertAngleRad: this.roosterAlertAngle,
        patCount: this.roosterPatCount,
        patCooldown: Number(this.roosterPatCooldown.toFixed(1)),
        statusBanner: this.roosterStatusBanner,
        canPatPrompt: true,
      },
      activeCutscene: this.activeCutscene,
      cutsceneBeatIndex: this.cutsceneBeatIndex,
      cutsceneVote: {
        active: this.phase === 'cutscene' && totalPlayers > 1,
        voteCount: this.cutsceneVotedIds.length,
        totalPlayers: Math.max(totalPlayers, this.cutsceneTotalPlayers),
        localVoted: this.cutsceneVotedIds.includes(myId),
      },
      hub: {
        inCar: this.hubInCar,
        boardedCount: this.hubBoardedIds.length,
        totalPlayers,
        nearbyAction: hubNearbyAction,
        lastRangeHit: this.hubLastRangeHit,
      },
      upgradeChoices: [...this.upgradeChoices],
      ownedUpgrades: [...this.ownedUpgrades],
      records: { ...this.records },
      muted: this.audio.getSettings().muted,
      currentTrackId: this.audio.getSettings().trackId,
      character: computeCharacterProgression(this.xp),
      levelUpToast: this.levelUpToast,
      trackToast: this.trackToast,
      collectedTapes: Array.from(this.collectedTapes),
      tapesTotal: Object.keys(t.storyTapes).length,
      coop: {
        active: Boolean(this.coopClient?.isInActiveSession()),
        roomCode: this.coopRoom?.code ?? null,
        isHost: Boolean(this.coopClient?.isHost()),
        localDowned: this.coopLocalDowned,
        nearbyReviveName,
        squad: squadHud,
        lastPingText: this.coopLastPingText,
        scaling: coopScale,
      },
    };
  }

  private emitHud(): void {
    this.onHudUpdate(this.getSnapshot());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.audio.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
