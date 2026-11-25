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
  createEnemyModel,
  createFenceRun,
  createFlaredTrunkGeo,
  createObjectiveShrine,
  createPickupModel,
  createRoadStormDrain,
  createRoosterModel,
  createSculptedSpruceTierGeo,
  createSovietCar,
  createStreetlamp,
  createSuburbanHouse,
  createSuburbSign,
  createTransformerTower,
  createWeaponViewmodel,
  createYardBench,
  type EnemyRig,
  type RoosterRig,
  type WeaponRig,
} from './models';
import {
  applyReload,
  buildSuburbLayout,
  computeBipedGaitPose,
  computeBreathRecoveryHp,
  computeCharacterProgression,
  computeComboMultiplier,
  computeDifficultyScaledEnemyStats,
  computeEnemySteering,
  computeLoopScaling,
  computeRoosterGaitPose,
  computeWeaponDamage,
  createInitialAmmo,
  findShotHitEnemy,
  pickUpgradeChoices,
  resolveCircleVsAABBs,
  resolveCircleVsCircles,
  shouldAutoReload,
  stepRoosterCompanion,
} from './rules';
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
  CutsceneDef,
  CustomTextureSpec,
  DifficultyId,
  EnemyKind,
  EnemyTacticMode,
  GameMode,
  GamePhase,
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
  TextureSlot,
  UpgradeId,
  WeaponAmmoState,
  WeaponId,
} from './types';

const NEGRUZINO_CINEMATIC_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uChromatic: { value: 0.0008 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.028 },
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
      vec2 offset = center * dist * uChromatic * 6.0;

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Subtle cool midnight shadows / warm sodium highlights split-tone
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 coolShadow = vec3(0.92, 0.96, 1.06);
      vec3 warmHigh = vec3(1.05, 0.99, 0.92);
      col *= mix(coolShadow, warmHigh, smoothstep(0.15, 0.78, lum));

      // Organic 35mm film grain
      float n = (rand(vUv * 512.0 + fract(uTime)) - 0.5) * uGrain;
      col += vec3(n);

      // Filmic optical lens vignette
      float vig = smoothstep(0.95, 0.25, dist * (1.0 + uVignette));
      col *= mix(1.0 - uVignette, 1.0, vig);

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

const RECORDS_STORAGE_KEY = 'negruzino_records_v1';

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
  kind: PickupKind;
  x: number;
  z: number;
  life: number;
  group: THREE.Group;
  spinPivot: THREE.Group;
}

interface ActiveEnemy {
  id: number;
  kind: EnemyKind;
  x: number;
  z: number;
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

  // AAA Post-Processing (Hardware GPU path) + Atmospheric Mist Motes + Light Drizzle + Wind Uniform
  private composer: EffectComposer | null = null;
  private cinematicPass: ShaderPass | null = null;
  private mistMotes: THREE.Points | null = null;
  private rainLines: THREE.LineSegments | null = null;
  private rainOffsets: Float32Array | null = null;
  private rainSpeeds: Float32Array | null = null;
  private foliageWindUniform = { value: 0 };
  private puddleMat: THREE.ShaderMaterial | null = null;
  private cutsceneClock = 0;
  private dawnFogColor = new THREE.Color(0x3a4a68);
  private dynamicLampSpots: Array<{
    spot: THREE.SpotLight;
    target: THREE.Object3D;
  }> = [];

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
  private moonLight: THREE.DirectionalLight;
  private flashlight: THREE.SpotLight;
  private flashlightTarget = new THREE.Object3D();
  private flashlightOn = true;

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
  private storyLogKey: keyof (typeof TRANSLATIONS)['ru']['storyLogs'] | null = null;
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
    this.renderer.toneMappingExposure = 1.24;
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

    // Custom Midnight Sodium + Moonlight PMREM Environment & 360° Nocturnal Sky Dome
    const skyTex = createNocturnalSkyTexture();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(skyTex).texture;
    this.scene.environmentIntensity = 0.54;
    pmrem.dispose();

    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(138, 28, 16),
      new THREE.MeshBasicMaterial({
        map: skyTex,
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

    // High-contrast CloverPit midnight lighting rig (deep shadows + raking silver moonlight)
    const hemi = new THREE.HemisphereLight(0x3a547a, 0x101410, 0.38);
    this.scene.add(hemi);

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

    // Tactical player flashlight mounted on camera ([L] toggle)
    this.flashlight = new THREE.SpotLight(0xffe6bf, 46, 42, 0.46, 0.58, 1.4);
    this.flashlight.position.set(0.14, -0.08, -0.15);
    this.flashlightTarget.position.set(0, -0.15, -14);
    this.flashlight.target = this.flashlightTarget;
    if (!this.isSoftwareGl) {
      this.flashlight.castShadow = true;
      this.flashlight.shadow.mapSize.set(1024, 1024);
      this.flashlight.shadow.camera.near = 0.5;
      this.flashlight.shadow.camera.far = 42;
      this.flashlight.shadow.bias = -0.0005;
      this.flashlight.shadow.normalBias = 0.024;
    }
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);

    // Build deterministic NEGRUZINO neighborhood
    this.layout = buildSuburbLayout();
    this.materials = createStarterWorldMaterials(this.maxAnisotropy);
    this.shadowTex = createContactShadowTexture();
    this.buildWorld();

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

    this.muzzleFlashMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      new THREE.MeshBasicMaterial({
        color: 0xffd27a,
        transparent: true,
        opacity: 0.9,
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
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.38, 0.52, 0.84);
      this.composer.addPass(bloom);
      this.cinematicPass = new ShaderPass(NEGRUZINO_CINEMATIC_SHADER);
      this.composer.addPass(this.cinematicPass);
      this.composer.addPass(new OutputPass());

      // 2 Dynamic Shadow-Casting Warm Sodium Streetlamp SpotLights tracking nearest lamps
      for (let i = 0; i < 2; i++) {
        const spot = new THREE.SpotLight(0xffa94d, 48, 22, 0.88, 0.72, 1.55);
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

    if (autostart) {
      this.startPlayImmediate(false);
    } else {
      this.syncBodyState();
      this.emitHud();
    }

    this.lastNow = performance.now();
    this.tick();
  }

  private buildWorld(): void {
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
    this.scene.add(ground);

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
    this.scene.add(road);

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
    this.scene.add(square);

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
      this.scene.add(curbN, curbS);
    }

    // Faded worn white centerline road markings (subtle weathered 1994 asphalt realism)
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
      if (Math.abs(dz) < 11) continue; // central square apron stays unmarked
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.035, dz);
      dash.receiveShadow = true;
      this.scene.add(dash);
    }

    // Roadside cast-iron curb storm drains beside wet road edges
    const drainPositions: Array<[number, number]> = [
      [-4.22, 31.2],
      [4.22, 18.4],
      [-4.22, -16.8],
      [4.22, -31.5],
    ];
    for (const [dx, dz] of drainPositions) {
      const drain = createRoadStormDrain(this.materials);
      drain.position.set(dx, 0.004, dz);
      this.scene.add(drain);
    }

    // 3. Small detached suburban houses with individual fenced lawns
    for (const lot of this.layout.houses) {
      const houseGroup = createSuburbanHouse(lot, this.materials);
      this.scene.add(houseGroup);

      // Walk path from open yard gate to front porch (uniform world-space asphalt UVs!)
      const pathLen = Math.max(
        2,
        Math.abs(lot.x - (lot.facing === 1 ? lot.yardMaxX : lot.yardMinX)) -
          lot.width / 2 +
          1.2
      );
      const pathX =
        lot.facing === 1
          ? lot.yardMaxX - pathLen / 2
          : lot.yardMinX + pathLen / 2;
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
      this.scene.add(walkway);
    }

    // 4. All yard fences from colliders (zero Z-fighting, uniform world UVs, full shadows)
    for (const col of this.layout.colliders) {
      if (col.kind === 'fence') {
        const fence = createFenceRun(
          col.minX,
          col.maxX,
          col.minZ,
          col.maxZ,
          col.height,
          this.materials
        );
        this.scene.add(fence);
      }
    }

    // 2b. Subtle photorealistic dark-mirror wet road depressions (natural puddles, zero fake white rings)
    const puddleMat = createRainPuddleMaterial(this.maxAnisotropy);
    this.puddleMat = puddleMat;
    const puddleSpecs: Array<[number, number, number, number, number]> = [
      [-1.7, 30.8, 3.8, 2.3, 0.22],
      [2.1, 22.4, 4.4, 2.6, -0.28],
      [-1.9, 13.8, 3.6, 2.2, 0.16],
      [1.6, 2.8, 5.1, 3.4, 0.44],
      [-2.8, -14.2, 4.0, 2.5, -0.35],
      [2.0, -27.5, 4.3, 2.6, 0.24],
    ];
    const puddleGeo = new THREE.PlaneGeometry(1, 1);
    for (const [px, pz, sx, sz, rot] of puddleSpecs) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = rot;
      puddle.scale.set(sx, sz, 1);
      puddle.position.set(px, 0.041, pz);
      puddle.renderOrder = 2;
      this.scene.add(puddle);
    }

    // 5. Sodium streetlamps + sagging overhead power cables
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1e26 });
    for (let i = 0; i < this.layout.lamps.length; i++) {
      const spec = this.layout.lamps[i];
      const built = createStreetlamp(spec, this.materials);
      this.scene.add(built.group);
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
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(prev.x, 6.8, prev.z),
          new THREE.Vector3((prev.x + spec.x) / 2, 5.7, (prev.z + spec.z) / 2),
          new THREE.Vector3(spec.x, 6.8, spec.z)
        );
        const wireGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
        this.scene.add(new THREE.Line(wireGeo, wireMat));
      }
    }

    // 5b. Delicate drifting atmospheric mist motes (subtle haze, zero boxy specks)
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

    // 5c. Ultra-subtle light night drizzle mist in world space (paired with cinematic camera-lens droplets)
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

      // Delicate misty silver-blue drizzle filaments (never thick white sticks)
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

    // 6. Central tall Soviet transformer landmark tower (framed in spawn vista)
    this.scene.add(createTransformerTower(this.materials));

    // 6b. 1994 Environmental Storytelling Props: Stalled Moskvitch outside House #14, suburb sign, yard benches
    const car = createSovietCar(this.materials);
    car.position.set(-3.15, 0, 40.2);
    car.rotation.y = Math.PI - 0.08; // parked facing North down the avenue
    this.scene.add(car);

    const sign = createSuburbSign(this.materials);
    sign.position.set(5.55, 0, 31.8);
    sign.rotation.y = -0.32;
    this.scene.add(sign);

    const benchCoords: Array<[number, number, number]> = [
      [-6.05, 25.4, Math.PI / 2],
      [6.05, 8.2, -Math.PI / 2],
      [-6.05, -21.5, Math.PI / 2],
    ];
    for (const [bx, bz, brot] of benchCoords) {
      const bench = createYardBench(this.materials);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = brot;
      this.scene.add(bench);
    }

    // 7. Organic sculpted Russian spruce & silver birch forest with desynchronized GPU wind sway
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

    const trunkGeo = createFlaredTrunkGeo(0.15, 0.32, 3.8);
    const tierLowGeo = createSculptedSpruceTierGeo(2.55, 3.7, 4.15, 1.1);
    const tierMidGeo = createSculptedSpruceTierGeo(1.96, 3.45, 6.45, 2.7);
    const tierTopGeo = createSculptedSpruceTierGeo(1.26, 3.05, 8.65, 4.3);
    const birchTrunkGeo = createFlaredTrunkGeo(0.11, 0.21, 5.2);
    const birchCanopyGeo = createBirchCanopyGeo();

    const trunkMat = this.materials.bark;
    const birchTrunkMat = this.materials.birchBark;

    const spruceCoords: Array<[number, number, number]> = [];
    const birchCoords: Array<[number, number, number]> = [];
    let treeSeq = 0;
    const pushForestTree = (tx: number, tz: number, sc: number) => {
      treeSeq += 1;
      // Mix ~26% Russian silver birches among the dark northern spruces
      if (treeSeq % 4 === 0) {
        birchCoords.push([tx, tz, sc * 0.96]);
      } else {
        spruceCoords.push([tx, tz, sc]);
      }
    };

    for (let z = -54; z <= 50; z += 5.5) {
      pushForestTree(-37 - Math.abs(Math.sin(z)) * 4, z, 0.9 + Math.abs(Math.cos(z)) * 0.45);
      pushForestTree(37 + Math.abs(Math.cos(z)) * 4, z, 0.95 + Math.abs(Math.sin(z)) * 0.45);
    }
    for (let x = -34; x <= 34; x += 5.5) {
      if (Math.abs(x) > 5.5) {
        pushForestTree(x, -53 - Math.abs(Math.sin(x)) * 3, 1.0 + Math.abs(Math.cos(x)) * 0.4);
        pushForestTree(x, 48 + Math.abs(Math.cos(x)) * 3, 0.95 + Math.abs(Math.sin(x)) * 0.35);
      }
    }
    for (const lot of this.layout.houses) {
      pushForestTree(lot.x + (lot.facing === 1 ? -6.5 : 6.5), lot.z + 5.2, 0.88);
      pushForestTree(lot.x + (lot.facing === 1 ? -6.0 : 6.0), lot.z - 5.4, 0.96);
    }

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spruceCoords.length);
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
      tint.setHSL(0.36 + (idx % 5) * 0.01, 0.14, 0.72 + (idx % 4) * 0.06);
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
    this.scene.add(trunks, tierLow, tierMid, tierTop);

    // Russian silver birches with textured white-and-charcoal bark & sculpted leafy crowns
    if (birchCoords.length > 0) {
      const birchTrunks = new THREE.InstancedMesh(birchTrunkGeo, birchTrunkMat, birchCoords.length);
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
        // Subtle October birch gold-olive tint mixed into the nocturnal forest silhouette
        tint.setHSL(0.14 + (idx % 3) * 0.04, 0.24, 0.62 + (idx % 3) * 0.06);
        birchCrowns.setColorAt(idx, tint);
      });
      birchTrunks.computeBoundingSphere();
      birchCrowns.computeBoundingSphere();
      this.scene.add(birchTrunks, birchCrowns);
    }

    // 8. Chapter objective Fuse Box / Signal Relay shrines
    for (const obj of this.layout.objectives) {
      const shrine = createObjectiveShrine(
        obj.chapter === 1 ? 0xe8963a : 0x5fa88e,
        this.materials
      );
      shrine.group.position.set(obj.x, 0, obj.z);
      shrine.group.visible = obj.chapter === 1;
      this.scene.add(shrine.group);
      this.objectiveNodes.push({
        spec: obj,
        group: shrine.group,
        beaconMat: shrine.beaconMat,
        ringMesh: shrine.ringMesh,
        beamMesh: shrine.beamMesh,
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

  private handleContextMenu = (e: MouseEvent): void => {
    if (this.phase === 'playing' || this.keybindCaptureActive) {
      e.preventDefault();
    }
  };

  private handleAuxClick = (e: MouseEvent): void => {
    // Always suppress browser Back/Forward navigation on mouse side buttons (M4 / M5)
    if (e.button === 3 || e.button === 4 || (this.phase === 'playing' && e.button === 1)) {
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
        this.startStory();
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
      if (this.phase === 'playing') {
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

    if (this.phase !== 'playing') return;

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
    if (this.phase !== 'playing' || !this.pointerLocked) return;
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
    if (this.phase !== 'playing') return;

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
    if (this.phase !== 'playing' || this.keybindCaptureActive) return;
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
    if (this.phase !== 'playing') return;
    const sens = (this.isScoped ? 0.0022 : 0.0052) * this.mouseSensitivity;
    this.playerYaw -= dx * sens;
    this.playerPitch = Math.max(-1.15, Math.min(1.15, this.playerPitch - dy * sens));
  }

  public setVirtualFire(active: boolean): void {
    if (this.phase !== 'playing') {
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
    if (this.phase !== 'playing') return;
    this.jumpBufferTimer = 0.14;
  }

  public triggerInteract(): void {
    if (this.phase !== 'playing') return;
    this.tryInteractObjective();
  }

  public triggerReload(): void {
    if (this.phase !== 'playing') return;
    this.startReload();
  }

  // --- Public Imperative Controls for React Shell ---

  public startStory(): void {
    this.audio.unlock();
    this.mode = 'story';
    this.loopNumber = 1;
    this.resetRunState(true);
    this.chapterIndex = 0;
    this.openCutscene(TRANSLATIONS[this.lang].chapterMeta[0].introCutscene, false);
  }

  public startEndlessLoop(): void {
    this.audio.unlock();
    this.mode = 'endless';
    this.loopNumber = 1;
    this.endlessWave = 1;
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
    this.flashlight.intensity = this.flashlightOn ? 34 : 0;
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
    this.heldKeys.clear();
    this.mouseDown = false;
    document.exitPointerLock?.();
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
    if (this.phase !== 'cutscene') return;
    this.activeCutscene = null;
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
    this.chapterIndex = idx;
    this.chapterKills = 0;
    this.clearAllEnemies();

    // Show objectives belonging to this chapter
    for (const node of this.objectiveNodes) {
      node.spec.completed = node.spec.chapter < idx + 1;
      node.group.visible = node.spec.chapter === idx + 1;
      node.beamMesh.visible = !node.spec.completed;
      node.beaconMat.emissive.setHex(node.spec.chapter === 1 ? 0xe8963a : 0x5fa88e);
    }

    // Refill reserve ammo slightly between chapters
    for (const id of WEAPON_ORDER) {
      this.ammo[id].reserve = Math.min(
        WEAPONS[id].maxReserve,
        this.ammo[id].reserve + Math.round(WEAPONS[id].magSize * 1.5)
      );
    }

    this.phase = 'playing';
    this.heldKeys.clear();
    this.heldMouseButtons.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.mouseDown = false;
    this.spawnTimer = 2.6; // opening few seconds are calm & survivable without input

    if (CHAPTERS[idx].hasBoss) {
      // Spawn the towering Midnight Watchman in the central square!
      this.spawnEnemy('watchman', 0, -4);
      this.spawnEnemy('crawler', -11, 8);
      this.spawnEnemy('screamer', 11, -6);
      this.showStoryLog('boss_arrival', 8.0);
    } else {
      // Spawn initial enemies at fair medium distance down the foggy street
      this.spawnEnemy('crawler', -3.2, 8);
      this.spawnEnemy('lampshade', 6.5, -2);
      if (idx === 0) {
        this.showStoryLog('ch1_start', 8.0);
      } else if (idx === 1) {
        this.showStoryLog('ch2_start', 8.0);
      }
    }

    (document.activeElement as HTMLElement | null)?.blur?.();
    this.syncBodyState();
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (paused && this.phase === 'playing') {
      this.phase = 'paused';
      this.heldKeys.clear();
      this.mouseDown = false;
      this.isScoped = false;
      this.audio.setPaused(true);
      document.exitPointerLock?.();
      this.syncBodyState();
      this.emitHud();
    } else if (!paused && this.phase === 'paused') {
      this.phase = 'playing';
      this.audio.setPaused(false);
      (document.activeElement as HTMLElement | null)?.blur?.();
      this.syncBodyState();
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.clearAllEnemies();
    this.resetRunState();
    this.phase = 'title';
    this.activeCutscene = null;
    this.audio.setPaused(false);
    document.exitPointerLock?.();
    this.syncBodyState();
    this.emitHud();
  }

  public selectWeapon(id: WeaponId): void {
    if (this.activeWeapon === id) return;
    this.activeWeapon = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.isScoped = false;
    this.minigunSpin = 0;
    this.audio.setMinigunSpin(0);
    for (const wid of WEAPON_ORDER) {
      this.weaponRigs[wid].group.visible = wid === id;
    }
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
    this.audio.playReload();
    this.emitHud();
  }

  public patRooster(): void {
    if (this.phase !== 'playing') return;
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
    const dropChance = DIFFICULTY_PRESETS[this.difficulty].pickupDropChance;
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
    this.pickups.push({
      id: this.nextPickupId++,
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
              this.ammo[wid].reserve + Math.ceil(WEAPONS[wid].magSize * 1.25)
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
  }

  private spawnEnemy(kind: EnemyKind, x: number, z: number): void {
    const rig = createEnemyModel(kind, this.shadowTex);
    rig.group.position.set(x, 0, z);
    this.scene.add(rig.group);

    const stats: Record<EnemyKind, { hp: number; radius: number; hitHeight: number }> = {
      crawler: { hp: 100, radius: 0.55, hitHeight: 1.75 },
      lampshade: { hp: 135, radius: 0.58, hitHeight: 2.4 },
      screamer: { hp: 110, radius: 0.56, hitHeight: 2.35 },
      watchman: { hp: 1350, radius: 1.05, hitHeight: 3.55 },
    };
    const st = stats[kind];
    const scaledHp = computeDifficultyScaledEnemyStats(
      st.hp,
      12,
      this.difficulty,
      this.loopNumber
    ).hp;

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

        // Play the matching cassette / radio story discovery subtitle
        const logMap: Record<string, keyof (typeof TRANSLATIONS)['ru']['storyLogs']> = {
          ch1_fuse_1: 'ch1_fuse_1',
          ch1_fuse_2: 'ch1_fuse_2',
          ch2_relay_1: 'ch2_relay_1',
          ch2_relay_2: 'ch2_relay_2',
          ch2_relay_3: 'ch2_relay_3',
        };
        const logKey = logMap[node.spec.id];
        if (logKey) {
          this.showStoryLog(logKey, 7.6);
        }

        // Restock ammo crate bonus on activating a fuse box / relay!
        for (const wid of WEAPON_ORDER) {
          this.ammo[wid].reserve = Math.min(
            WEAPONS[wid].maxReserve,
            this.ammo[wid].reserve + WEAPONS[wid].magSize
          );
        }
        this.checkChapterCompletion();
        this.emitHud();
        return;
      }
    }
  }

  private checkChapterCompletion(): void {
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

    if (chap.hasBoss) {
      const bossAlive = this.enemies.some((e) => e.kind === 'watchman' && !e.dying);
      if (!bossAlive) {
        this.score += 1500 * this.loopNumber;
        this.updateRecords();
        this.audio.playObjectiveComplete();
        this.openCutscene(TRANSLATIONS[this.lang].victoryCutscene, true);
      }
      return;
    }

    if (allObjsDone && this.chapterKills >= chap.targetKills) {
      const nextIdx = this.chapterIndex + 1;
      if (nextIdx < CHAPTERS.length) {
        this.chapterIndex = nextIdx;
        this.updateRecords();
        this.openUpgradeDraft('next_chapter');
      }
    }
  }

  private triggerScreamer(kind: ScreamerKind): void {
    if (this.screamerCooldown > 0 && kind !== 'preview') return;
    this.screamerCaptionKey = kind;
    this.screamerKind = kind;
    this.screamerDuration = this.screamerIntensity === 'reduced' ? 0.38 : 0.78;
    this.screamerTimer = this.screamerDuration;
    this.screamerCooldown = 8.5;
    this.trauma = Math.min(1, this.trauma + (this.screamerIntensity === 'reduced' ? 0.25 : 0.78));
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

    let landedAny = false;
    let landedCrit = false;

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

          if (bestEnemy.hp <= 0 && !bestEnemy.dying) {
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
    } else if (this.phase === 'playing') {
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
      if (this.storyLogTimer <= 0) this.storyLogKey = null;
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
    const baseSpeed =
      (sprinting ? 8.9 : 5.8) *
      (adrenaline ? 1.22 : 1) *
      cfg.moveSpeedMult *
      prog.moveSpeedMult *
      (this.isScoped ? 0.55 : 1);
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

    // Weapon walk bob + reload dip + animated shotgun pump / pistol slide
    if (moving && this.grounded) {
      this.weaponBobPhase += dt * (sprinting ? 11.5 : 7.8);
    }
    const bobX = moving ? Math.cos(this.weaponBobPhase) * 0.014 : 0;
    const bobY = moving ? Math.abs(Math.sin(this.weaponBobPhase)) * 0.012 : 0;
    const reloadDip = this.reloading ? -0.18 : 0;
    this.weaponHolder.position.set(
      0.24 + bobX,
      -0.22 - bobY + reloadDip,
      -0.44 + this.weaponKickZ
    );
    this.weaponHolder.rotation.x = this.weaponKickZ * 0.85 - (this.reloading ? 0.35 : 0);

    const activeRig = this.weaponRigs[this.activeWeapon];
    if (activeRig.pumpForend) {
      const pumpProgress =
        this.fireCooldown > 0.25 && this.fireCooldown < 0.55
          ? Math.sin(((this.fireCooldown - 0.25) / 0.3) * Math.PI)
          : 0;
      activeRig.pumpForend.position.z = -0.4 + pumpProgress * 0.11;
    }
    if (activeRig.slide) {
      activeRig.slide.position.z = -0.13 + this.weaponKickZ * 0.32;
    }

    // Muzzle flash light
    if (this.muzzleFlashTimer > 0) {
      this.muzzleLight.intensity = 22;
      this.muzzleFlashMesh.visible = !this.isScoped;
      this.muzzleFlashMesh.position.copy(activeRig.muzzlePoint.position);
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
    } else {
      this.muzzleLight.intensity = 0;
      this.muzzleFlashMesh.visible = false;
    }

    // Apply camera transform + decaying trauma^2 shake
    const shake = this.trauma * this.trauma;
    const shakeYaw = (Math.random() - 0.5) * shake * 0.06;
    const shakePitch = (Math.random() - 0.5) * shake * 0.06;
    const eyeHeight = 1.68 + this.playerY + (moving && this.grounded ? Math.sin(this.weaponBobPhase * 2) * 0.032 : 0);
    this.camera.position.set(this.playerX, eyeHeight, this.playerZ);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerYaw + shakeYaw;
    this.camera.rotation.x = this.playerPitch + shakePitch;
    this.camera.rotation.z = (Math.random() - 0.5) * shake * 0.04;
    this.skyDome.position.copy(this.camera.position);

    // 4. Update Horror Entities, Pickups & Petya Companion
    if (simDt > 0) {
      this.updateEnemies(simDt);
      this.updatePickups(simDt);
      this.updateRooster(simDt);
    }

    // 5. Throttle React HUD snapshots to ~12 Hz
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private updateEnemies(dt: number): void {
    const chap = CHAPTERS[this.chapterIndex];
    const scaling = computeLoopScaling(this.loopNumber);
    const maxActive =
      this.mode === 'endless'
        ? Math.min(13, 5 + this.endlessWave)
        : Math.min(12, chap.maxActiveEnemies + scaling.extraActiveEnemies);

    // Spawn pacing + anti-stall acceleration when only combat kills remain in a chapter
    const livingCount = this.enemies.filter((e) => !e.dying).length;
    if (this.mode === 'story' && !chap.hasBoss) {
      const chapObjs = this.objectiveNodes.filter((n) => n.spec.chapter === chap.chapter);
      const allObjsDone = chapObjs.every((n) => n.spec.completed);
      if (allObjsDone && this.chapterKills < chap.targetKills && livingCount < 2) {
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
            : 4.0 - this.chapterIndex * 0.5;
      this.spawnTimer = Math.max(1.4, baseInterval * scaling.spawnIntervalMult);
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
            const dmg = computeDifficultyScaledEnemyStats(
              100,
              10,
              this.difficulty,
              this.loopNumber
            ).damage;
            this.applyPlayerDamage(dmg);
          } else if (distNow < (e.kind === 'watchman' ? 4.9 : 3.5)) {
            const baseDmg =
              e.kind === 'watchman' ? 22 : e.kind === 'crawler' ? 12 : 14;
            const dmg = computeDifficultyScaledEnemyStats(
              100,
              baseDmg,
              this.difficulty,
              this.loopNumber
            ).damage;
            this.applyPlayerDamage(dmg);
            if (e.kind === 'watchman' || Math.random() < 0.4) {
              this.triggerScreamer(e.kind === 'watchman' ? 'watchman' : 'fog');
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

        // Move with difficulty/loop speed scaling, knockback decay & AABB collision
        const spdMult = computeDifficultyScaledEnemyStats(
          100,
          12,
          this.difficulty,
          this.loopNumber
        ).speedMult;
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
    this.hurtInvulnTimer = 0.38;
    this.outOfCombatTimer = 0;
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 0.65;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.audio.playPlayerHurt();
    if (this.hp <= 0) {
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
    // Advance subtle organic forest wind gusts & wet mirror puddle reflections
    this.foliageWindUniform.value = timeSec;
    if (this.puddleMat) {
      this.puddleMat.uniforms.uTime.value = timeSec;
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
  }

  private syncBodyState(): void {
    // Standard state mirror for accessibility & automated verification
    const stateMap: Record<GamePhase, string> = {
      title: 'title',
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

    let nearbyInteractLabel: string | null = null;
    if (this.phase === 'playing' && this.mode === 'story') {
      const interactKeyLabel = formatBindingLabel(this.keybinds.interact, this.lang, true);
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

    const boss = this.enemies.find((e) => e.kind === 'watchman' && !e.dying);
    const chapterTitle =
      this.mode === 'endless' ? t.endlessWaveTitle(this.endlessWave) : chapMeta.title;
    const objectiveText =
      this.mode === 'endless'
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
                Math.min(this.chapterKills, chap.targetKills),
                chap.targetKills
              )
            : t.clearRemainingEntities(
                Math.min(this.chapterKills, chap.targetKills),
                chap.targetKills
              );

    const reloadProgress = this.reloading
      ? Math.max(0, Math.min(1, 1 - this.reloadTimer / Math.max(0.1, this.activeReloadDuration)))
      : 0;

    const activeStoryLog =
      this.storyLogKey && this.storyLogTimer > 0
        ? {
            speaker: localizeRoosterCopy(
              t.storyLogs[this.storyLogKey].speaker,
              this.lang,
              this.roosterName
            ),
            text: localizeRoosterCopy(
              t.storyLogs[this.storyLogKey].text,
              this.lang,
              this.roosterName
            ),
          }
        : null;

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
      chapter: chap.chapter,
      chapterTitle,
      clockLabel: chap.clockLabel,
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
      upgradeChoices: [...this.upgradeChoices],
      ownedUpgrades: [...this.ownedUpgrades],
      records: { ...this.records },
      muted: this.audio.getSettings().muted,
      currentTrackId: this.audio.getSettings().trackId,
      character: computeCharacterProgression(this.xp),
      levelUpToast: this.levelUpToast,
      trackToast: this.trackToast,
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
