import { CHARACTER_LEVEL_THRESHOLDS, DIFFICULTY_PRESETS, WEAPONS } from './constants';
import { formatRoosterAlert } from './i18n';
import type {
  AABB,
  BipedGaitInput,
  BipedGaitPose,
  CharacterProgressionState,
  DifficultyId,
  EnemyKind,
  HouseLot,
  LampSpec,
  Language,
  ObjectiveSpec,
  RoosterGaitInput,
  RoosterGaitPose,
  RoosterMode,
  RoosterNameId,
  SuburbLayout,
  WeaponAmmoState,
  WeaponId,
} from './types';

export function buildSuburbLayout(): SuburbLayout {
  const houses: HouseLot[] = [];
  const colliders: AABB[] = [];

  // 8 small detached 1990s post-Soviet suburban houses with individual fenced lawns
  // Road runs along X in [-4.5, 4.5], widening into a central square at Z in [-10, 10]
  const lotSpecs: Array<{
    num: string;
    side: -1 | 1; // -1 west, 1 east
    z: number;
    w: number;
    d: number;
    h: number;
    wallTint: number;
    roofTint: number;
    lit: boolean;
  }> = [
    { num: '14', side: -1, z: 32, w: 8.4, d: 7.4, h: 3.7, wallTint: 0xddd4c4, roofTint: 0x3b3532, lit: true },
    { num: '15', side: 1, z: 30, w: 7.8, d: 7.0, h: 3.5, wallTint: 0xc8cfc6, roofTint: 0x2f3b38, lit: false },
    { num: '12', side: -1, z: 14, w: 8.0, d: 7.2, h: 3.6, wallTint: 0xd1c5b6, roofTint: 0x45322c, lit: true },
    { num: '11', side: 1, z: 14, w: 8.2, d: 7.6, h: 3.8, wallTint: 0xcbc9bf, roofTint: 0x32373d, lit: true },
    { num: '08', side: -1, z: -16, w: 7.6, d: 7.0, h: 3.5, wallTint: 0xd5ccb8, roofTint: 0x3a322d, lit: false },
    { num: '07', side: 1, z: -15, w: 8.4, d: 7.4, h: 3.9, wallTint: 0xc2cbc4, roofTint: 0x2d3538, lit: true },
    { num: '04', side: -1, z: -34, w: 8.0, d: 7.4, h: 3.6, wallTint: 0xcbc3b5, roofTint: 0x43332d, lit: true },
    { num: '03', side: 1, z: -34, w: 7.8, d: 7.2, h: 3.5, wallTint: 0xd2cebf, roofTint: 0x34383d, lit: false },
  ];

  const FENCE_THICK = 0.28;
  const GATE_HALF = 1.9; // 3.8m wide open yard gates for smooth movement

  for (const spec of lotSpecs) {
    const houseX = spec.side * 19.5;
    const yardInnerX = spec.side * 6.8;
    const yardOuterX = spec.side * 28.5;
    const yardMinX = Math.min(yardInnerX, yardOuterX);
    const yardMaxX = Math.max(yardInnerX, yardOuterX);
    const yardMinZ = spec.z - 8.0;
    const yardMaxZ = spec.z + 8.0;
    const gateZ = spec.z;

    const lot: HouseLot = {
      id: `house_${spec.num}`,
      number: spec.num,
      x: houseX,
      z: spec.z,
      width: spec.w,
      depth: spec.d,
      height: spec.h,
      facing: spec.side === -1 ? 1 : -1,
      yardMinX,
      yardMaxX,
      yardMinZ,
      yardMaxZ,
      gateZ,
      wallTint: spec.wallTint,
      roofTint: spec.roofTint,
      litWindow: spec.lit,
    };
    houses.push(lot);

    // House footprint collider
    colliders.push({
      id: `${lot.id}_body`,
      minX: houseX - spec.w / 2 - 0.2,
      maxX: houseX + spec.w / 2 + 0.2,
      minZ: spec.z - spec.d / 2 - 0.2,
      maxZ: spec.z + spec.d / 2 + 0.2,
      height: spec.h + 1.5,
      kind: 'house',
    });

    // Street-facing fence split into two segments with a wide open gate at gateZ
    const frontX = spec.side === -1 ? yardMaxX : yardMinX;
    colliders.push({
      id: `${lot.id}_fence_front_n`,
      minX: frontX - FENCE_THICK / 2,
      maxX: frontX + FENCE_THICK / 2,
      minZ: yardMinZ,
      maxZ: gateZ - GATE_HALF,
      height: 1.55,
      kind: 'fence',
    });
    colliders.push({
      id: `${lot.id}_fence_front_s`,
      minX: frontX - FENCE_THICK / 2,
      maxX: frontX + FENCE_THICK / 2,
      minZ: gateZ + GATE_HALF,
      maxZ: yardMaxZ,
      height: 1.55,
      kind: 'fence',
    });

    // North & South side yard fences (leave a small back gap so players can flank around houses)
    const sideMinX = spec.side === -1 ? yardMinX + 3.2 : yardMinX;
    const sideMaxX = spec.side === -1 ? yardMaxX : yardMaxX - 3.2;
    colliders.push({
      id: `${lot.id}_fence_north`,
      minX: sideMinX,
      maxX: sideMaxX,
      minZ: yardMinZ - FENCE_THICK / 2,
      maxZ: yardMinZ + FENCE_THICK / 2,
      height: 1.55,
      kind: 'fence',
    });
    colliders.push({
      id: `${lot.id}_fence_south`,
      minX: sideMinX,
      maxX: sideMaxX,
      minZ: yardMaxZ - FENCE_THICK / 2,
      maxZ: yardMaxZ + FENCE_THICK / 2,
      height: 1.55,
      kind: 'fence',
    });
  }

  // Central landmark concrete transformer pedestal on the west edge of the central square
  colliders.push({
    id: 'central_transformer',
    minX: -12.6,
    maxX: -9.8,
    minZ: -1.6,
    maxZ: 1.6,
    height: 5.5,
    kind: 'prop',
  });

  // Stalled 1994 Soviet Moskvitch parked on the west shoulder behind spawn (clear of road & gates)
  colliders.push({
    id: 'stalled_moskvitch',
    minX: -4.25,
    maxX: -2.05,
    minZ: 38.0,
    maxZ: 42.4,
    height: 1.65,
    kind: 'prop',
  });

  // Streetlamps alternating along the wet asphalt road (only 5 active point lights to stay within budget)
  const lamps: LampSpec[] = [
    { id: 'lamp_1', x: -5.4, z: 36, armDirX: 1, flickerSeed: 1.1, hasPointLight: true },
    { id: 'lamp_2', x: 5.4, z: 22, armDirX: -1, flickerSeed: 2.7, hasPointLight: true },
    { id: 'lamp_3', x: -5.4, z: 4, armDirX: 1, flickerSeed: 4.3, hasPointLight: true },
    { id: 'lamp_4', x: 5.4, z: -10, armDirX: -1, flickerSeed: 5.9, hasPointLight: true },
    { id: 'lamp_5', x: -5.4, z: -26, armDirX: 1, flickerSeed: 7.4, hasPointLight: true },
    { id: 'lamp_6', x: 5.4, z: -42, armDirX: -1, flickerSeed: 9.2, hasPointLight: false },
  ];

  // Chapter objectives placed cleanly in open yards & street landmarks
  const objectives: ObjectiveSpec[] = [
    // Chapter 1: 2 Street Fuse Boxes
    { id: 'ch1_fuse_1', chapter: 1, label: 'Fuse Box #14 (West Yard)', x: -12.2, z: 29.0, completed: false },
    { id: 'ch1_fuse_2', chapter: 1, label: 'Fuse Box #11 (East Porch)', x: 12.4, z: 14.0, completed: false },
    // Chapter 2: 3 Courtyard Signal Relays
    { id: 'ch2_relay_1', chapter: 2, label: 'Signal Relay A (Yard #12)', x: -12.0, z: 14.0, completed: false },
    { id: 'ch2_relay_2', chapter: 2, label: 'Signal Relay B (Yard #07)', x: 12.2, z: -15.0, completed: false },
    { id: 'ch2_relay_3', chapter: 2, label: 'Signal Relay C (Yard #04)', x: -12.2, z: -34.0, completed: false },
  ];

  return {
    houses,
    lamps,
    colliders,
    objectives,
    bounds: { minX: -34, maxX: 34, minZ: -48, maxZ: 44 },
    // Spawn on wide central road facing North (yaw = 0 -> looking toward -Z down the street)
    spawn: { x: 0, z: 35, yaw: 0 },
  };
}

export function resolveCircleVsAABBs(
  x: number,
  z: number,
  radius: number,
  colliders: AABB[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): { x: number; z: number; hitWall: boolean } {
  let rx = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x));
  let rz = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z));
  let hitWall = rx !== x || rz !== z;

  // Two passes resolve corner wedges cleanly
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        hitWall = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          // Inside AABB fallback: push out along shortest axis
          const penLeft = Math.abs(rx - box.minX);
          const penRight = Math.abs(box.maxX - rx);
          const penTop = Math.abs(rz - box.minZ);
          const penBottom = Math.abs(box.maxZ - rz);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) rx = box.minX - radius;
          else if (minPen === penRight) rx = box.maxX + radius;
          else if (minPen === penTop) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    }
  }

  return { x: rx, z: rz, hitWall };
}

/**
 * Solid physical circle-vs-circles collision resolution (player <-> monsters and monster <-> monster).
 * Guarantees entities never pass through the player or stack inside the same coordinates.
 */
export function resolveCircleVsCircles(
  x: number,
  z: number,
  radius: number,
  obstacles: ReadonlyArray<{ x: number; z: number; radius: number }>
): { x: number; z: number; hitEntity: boolean } {
  let rx = x;
  let rz = z;
  let hitEntity = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const o of obstacles) {
      const dx = rx - o.x;
      const dz = rz - o.z;
      const minDist = radius + o.radius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        hitEntity = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = minDist - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          // Coincident centers: deterministic separation axis
          rx += minDist;
        }
      }
    }
  }

  return { x: rx, z: rz, hitEntity };
}

/**
 * Determines whether a weapon should automatically initiate reload without pressing [R].
 * P90 always auto-reloads when its magazine empties (or is selected empty with reserve remaining).
 */
export function shouldAutoReload(
  weaponId: WeaponId,
  ammo: WeaponAmmoState,
  isReloading: boolean,
  justFiredEmpty: boolean
): boolean {
  if (isReloading) return false;
  if (ammo.mag > 0 || ammo.reserve <= 0) return false;
  return weaponId === 'p90' || justFiredEmpty;
}

export interface ShotTargetCylinder {
  id: number;
  x: number;
  z: number;
  radius: number;
  hitHeight: number;
  dying: boolean;
}

export interface ShotHitResult {
  enemyId: number;
  distance: number;
  isHeadshot: boolean;
  hitX: number;
  hitY: number;
  hitZ: number;
}

/**
 * Pure 3D ray-vs-cylinder bullet hit registration against enemies.
 * Explicitly ignores the rooster companion so bullets ALWAYS pass cleanly
 * through Grisha/Vanya and register on bots behind him.
 */
export function findShotHitEnemy(
  rayOrigin: { x: number; y: number; z: number },
  rayDir: { x: number; y: number; z: number },
  maxRange: number,
  enemies: ReadonlyArray<ShotTargetCylinder>
): ShotHitResult | null {
  const horizLenSq = rayDir.x * rayDir.x + rayDir.z * rayDir.z;
  let best: ShotHitResult | null = null;
  let bestDist = maxRange;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.dying) continue;
    const ox = e.x - rayOrigin.x;
    const oz = e.z - rayOrigin.z;

    // Closest ray parameter t to the enemy's vertical axis (exact even when pitching up/down)
    const t =
      horizLenSq > 1e-6
        ? (ox * rayDir.x + oz * rayDir.z) / horizLenSq
        : Math.hypot(ox, oz);
    if (t < 0.15 || t > bestDist) continue;

    const px = rayOrigin.x + rayDir.x * t;
    const py = rayOrigin.y + rayDir.y * t;
    const pz = rayOrigin.z + rayDir.z * t;

    const horizDist = Math.hypot(px - e.x, pz - e.z);
    if (horizDist <= e.radius * 1.28 && py >= -0.05 && py <= e.hitHeight + 0.08) {
      bestDist = t;
      best = {
        enemyId: e.id,
        distance: t,
        isHeadshot: py >= e.hitHeight * 0.72,
        hitX: px,
        hitY: py,
        hitZ: pz,
      };
    }
  }

  return best;
}

/**
 * Keeps the rooster companion strictly outside the firing corridor between the
 * player and the nearest monster, and outside the player's direct crosshair aim cone.
 */
export function keepRoosterOutOfLineOfFire(
  rx: number,
  rz: number,
  playerX: number,
  playerZ: number,
  playerYaw: number,
  nearestThreat: { x: number; z: number; dist: number } | null
): { x: number; z: number } {
  let x = rx;
  let z = rz;

  // 1. Stay completely clear of the player -> nearestThreat combat corridor
  if (nearestThreat && nearestThreat.dist > 0.4) {
    const segX = nearestThreat.x - playerX;
    const segZ = nearestThreat.z - playerZ;
    const segLenSq = segX * segX + segZ * segZ;
    const relX = x - playerX;
    const relZ = z - playerZ;
    const t = (relX * segX + relZ * segZ) / segLenSq;
    // Check corridor from slightly behind player (-0.05) all the way past the threat (1.08)
    if (t > -0.05 && t < 1.08) {
      const closestX = playerX + segX * Math.max(0, Math.min(1, t));
      const closestZ = playerZ + segZ * Math.max(0, Math.min(1, t));
      const offX = x - closestX;
      const offZ = z - closestZ;
      const lateralDist = Math.hypot(offX, offZ);
      const minClearance = 1.9;
      if (lateralDist < minClearance) {
        const segLen = Math.sqrt(segLenSq) || 1;
        // Perpendicular to player -> threat line; prefer the side rooster is already on (default right)
        const perpX = -segZ / segLen;
        const perpZ = segX / segLen;
        const side = offX * perpX + offZ * perpZ >= 0 ? 1 : -1;
        x = closestX + perpX * side * minClearance;
        z = closestZ + perpZ * side * minClearance;
      }
    }
  }

  // 2. Stay outside the player's immediate forward crosshair aim cone (0.2m..5.5m ahead)
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);
  const rightX = Math.cos(playerYaw);
  const rightZ = -Math.sin(playerYaw);
  const dx = x - playerX;
  const dz = z - playerZ;
  const fwdProj = dx * fwdX + dz * fwdZ;
  const rightProj = dx * rightX + dz * rightZ;
  if (fwdProj > 0.2 && fwdProj < 5.5 && Math.abs(rightProj) < 1.45) {
    const pushSide = rightProj >= 0 ? 1 : -1;
    const desiredRight = pushSide * 1.65;
    const delta = desiredRight - rightProj;
    x += rightX * delta;
    z += rightZ * delta;
  }

  return { x, z };
}

export function computeWeaponDamage(
  weaponId: WeaponId,
  distance: number,
  isHeadshot: boolean,
  ownedUpgrades: ReadonlyArray<string> = []
): number {
  const cfg = WEAPONS[weaponId];
  if (distance > cfg.maxRange) return 0;

  let falloff = 1;
  if (distance > cfg.falloffStart && cfg.maxRange > cfg.falloffStart) {
    const t = (distance - cfg.falloffStart) / (cfg.maxRange - cfg.falloffStart);
    falloff = 1 - t * (1 - cfg.falloffMinRatio);
  }
  let headMult = isHeadshot ? (weaponId === 'awp' ? 2.0 : 1.55) : 1.0;
  let dmgMult = 1.0;
  if (weaponId === 'shotgun' && ownedUpgrades.includes('buckshot_overpressure')) {
    dmgMult *= 1.35;
  }
  if (weaponId === 'awp' && isHeadshot && ownedUpgrades.includes('awp_fastbolt')) {
    headMult *= 1.4;
  }
  if (
    (weaponId === 'p90' || weaponId === 'pistol') &&
    ownedUpgrades.includes('hollowpoint_smg')
  ) {
    dmgMult *= 1.3;
  }
  return Math.round(cfg.damage * falloff * headMult * dmgMult);
}

export function computeComboMultiplier(streak: number): number {
  if (streak >= 8) return 5;
  if (streak >= 5) return 4;
  if (streak >= 3) return 3;
  if (streak >= 2) return 2;
  return 1;
}

export function computeLoopScaling(loopNumber: number): {
  hpMult: number;
  speedMult: number;
  scoreMult: number;
  spawnIntervalMult: number;
  extraActiveEnemies: number;
} {
  const n = Math.max(1, Math.floor(loopNumber));
  return {
    hpMult: Number((1 + (n - 1) * 0.32).toFixed(2)),
    speedMult: Number(Math.min(1.55, 1 + (n - 1) * 0.1).toFixed(2)),
    scoreMult: Number((1 + (n - 1) * 0.5).toFixed(2)),
    spawnIntervalMult: Number(Math.max(0.55, 1 - (n - 1) * 0.12).toFixed(2)),
    extraActiveEnemies: Math.min(5, (n - 1) * 1),
  };
}

/**
 * Scales enemy health, attack damage, and movement speed by both the player-chosen
 * difficulty preset and the current endless/NG+ loop number.
 */
export function computeDifficultyScaledEnemyStats(
  baseHp: number,
  baseDamage: number,
  difficulty: DifficultyId,
  loopNumber: number
): { hp: number; damage: number; speedMult: number } {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const loop = computeLoopScaling(loopNumber);
  return {
    hp: Math.max(1, Math.round(baseHp * preset.enemyHpMult * loop.hpMult)),
    damage: Math.max(1, Math.round(baseDamage * preset.enemyDmgMult)),
    speedMult: Number((preset.enemySpeedMult * loop.speedMult).toFixed(2)),
  };
}

/**
 * Gentle out-of-combat breath recovery for casual accessibility:
 * after 6 seconds without taking damage, smoothly restores HP up to the difficulty's
 * safety floor (75 on Easy, 55 on Normal, 0/disabled on Hard).
 */
export function computeBreathRecoveryHp(
  currentHp: number,
  maxHp: number,
  outOfCombatSec: number,
  difficulty: DifficultyId,
  dt: number
): number {
  if (currentHp <= 0 || outOfCombatSec < 6.0 || dt <= 0) return currentHp;
  const preset = DIFFICULTY_PRESETS[difficulty];
  const floor = Math.min(maxHp, preset.breathRecoveryFloor);
  if (floor <= 0 || currentHp >= floor) return currentHp;
  return Math.min(floor, currentHp + preset.breathRecoveryRate * dt);
}

/**
 * Pure story-driven character progression (Levels 1..5):
 * Rewards combat, headshots, objective discoveries, and Grisha bonding with
 * tangible survivability, firepower, reload speed, and mobility growth.
 */
export function computeCharacterProgression(rawXp: number): CharacterProgressionState {
  const xp = Math.max(0, Math.floor(rawXp));
  let level = 1;
  for (let i = CHARACTER_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= CHARACTER_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const curThreshold = CHARACTER_LEVEL_THRESHOLDS[level - 1];
  const nextThreshold =
    level < CHARACTER_LEVEL_THRESHOLDS.length
      ? CHARACTER_LEVEL_THRESHOLDS[level]
      : CHARACTER_LEVEL_THRESHOLDS[CHARACTER_LEVEL_THRESHOLDS.length - 1];
  const xpProgress =
    level >= CHARACTER_LEVEL_THRESHOLDS.length
      ? 1
      : Math.max(
          0,
          Math.min(1, (xp - curThreshold) / Math.max(1, nextThreshold - curThreshold))
        );

  const bonusHpTable = [0, 10, 20, 30, 45];
  const dmgTable = [1.0, 1.08, 1.16, 1.24, 1.32];
  const reloadTable = [1.0, 1.08, 1.15, 1.22, 1.28];
  const speedTable = [1.0, 1.02, 1.06, 1.1, 1.14];
  const idx = level - 1;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    xpProgress: Number(xpProgress.toFixed(3)),
    bonusMaxHp: bonusHpTable[idx],
    damageMult: dmgTable[idx],
    reloadSpeedMult: reloadTable[idx],
    moveSpeedMult: speedTable[idx],
  };
}

export function pickUpgradeChoices<T extends string>(
  pool: ReadonlyArray<T>,
  owned: ReadonlyArray<T>,
  seed: number,
  count = 3
): T[] {
  const available = pool.filter((id) => !owned.includes(id));
  const source = available.length >= count ? [...available] : [...pool];
  let s = (Math.floor(seed * 1000) + 1994) >>> 0;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  return source.slice(0, Math.min(count, source.length));
}

export function applyReload(
  weaponId: WeaponId,
  ammo: WeaponAmmoState
): WeaponAmmoState {
  const cfg = WEAPONS[weaponId];
  const needed = cfg.magSize - ammo.mag;
  if (needed <= 0 || ammo.reserve <= 0) {
    return { ...ammo };
  }
  const taken = Math.min(needed, ammo.reserve);
  return {
    mag: ammo.mag + taken,
    reserve: ammo.reserve - taken,
  };
}

export function createInitialAmmo(): Record<WeaponId, WeaponAmmoState> {
  return {
    shotgun: { mag: WEAPONS.shotgun.magSize, reserve: WEAPONS.shotgun.maxReserve },
    awp: { mag: WEAPONS.awp.magSize, reserve: WEAPONS.awp.maxReserve },
    pistol: { mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.maxReserve },
    minigun: { mag: WEAPONS.minigun.magSize, reserve: WEAPONS.minigun.maxReserve },
    p90: { mag: WEAPONS.p90.magSize, reserve: WEAPONS.p90.maxReserve },
  };
}

export interface RoosterLogicInput {
  x: number;
  y: number;
  z: number;
  mode: RoosterMode;
  orbitAngle: number;
  flightTimer: number;
  patTimer: number;
  patCooldown: number;
  patCount: number;
  crowCooldown: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  nearestThreat: { x: number; z: number; dist: number; kind: EnemyKind } | null;
  patRequested: boolean;
  dt: number;
  lang?: Language;
  roosterName?: RoosterNameId;
}

export interface RoosterLogicOutput {
  x: number;
  y: number;
  z: number;
  yaw: number;
  mode: RoosterMode;
  orbitAngle: number;
  flightTimer: number;
  patTimer: number;
  patCooldown: number;
  patCount: number;
  crowCooldown: number;
  wingFlapSpeed: number;
  triggeredCrow: boolean;
  triggeredPat: boolean;
  healAmount: number;
  alertActive: boolean;
  alertAngleRad: number;
  alertLabel: string;
}

export function stepRoosterCompanion(inp: RoosterLogicInput): RoosterLogicOutput {
  const dt = Math.min(inp.dt, 0.05);
  let mode: RoosterMode = inp.mode;
  let patTimer = Math.max(0, inp.patTimer - dt);
  let patCooldown = Math.max(0, inp.patCooldown - dt);
  let crowCooldown = Math.max(0, inp.crowCooldown - dt);
  let flightTimer = inp.flightTimer - dt;
  let orbitAngle = inp.orbitAngle;
  let patCount = inp.patCount;
  let triggeredCrow = false;
  let triggeredPat = false;
  let healAmount = 0;

  // Player forward vector in Three.js (yaw 0 looks toward -Z)
  const fwdX = -Math.sin(inp.playerYaw);
  const fwdZ = -Math.cos(inp.playerYaw);
  const rightX = Math.cos(inp.playerYaw);
  const rightZ = -Math.sin(inp.playerYaw);

  // Trigger happy pat reaction when user presses [F]
  if (inp.patRequested) {
    triggeredPat = true;
    patTimer = 1.65;
    patCount += 1;
    mode = 'patted';
    if (patCooldown <= 0) {
      healAmount = 14;
      patCooldown = 8.0;
    }
  }

  const threatNear = inp.nearestThreat !== null && inp.nearestThreat.dist < 23;
  let alertActive = false;
  let alertAngleRad = 0;
  let alertLabel = '';

  if (threatNear && inp.nearestThreat) {
    alertActive = true;
    const tx = inp.nearestThreat.x - inp.playerX;
    const tz = inp.nearestThreat.z - inp.playerZ;
    // Angle relative to player forward (0 = ahead, +PI/2 = right, -PI/2 = left, PI = behind)
    const dotFwd = tx * fwdX + tz * fwdZ;
    const dotRight = tx * rightX + tz * rightZ;
    alertAngleRad = Math.atan2(dotRight, dotFwd);

    alertLabel = formatRoosterAlert(
      inp.lang ?? 'en',
      inp.nearestThreat.kind,
      alertAngleRad,
      inp.nearestThreat.dist,
      inp.roosterName ?? 'grisha'
    );

    if (patTimer <= 0) {
      mode = 'alert';
      if (crowCooldown <= 0) {
        triggeredCrow = true;
        crowCooldown = 4.2;
      }
    }
  } else if (patTimer <= 0) {
    if (flightTimer <= 0) {
      if (mode === 'circle_fly') {
        mode = 'follow';
        flightTimer = 4.5;
      } else {
        mode = 'circle_fly';
        flightTimer = 4.2;
      }
    } else if (mode === 'alert' || mode === 'patted') {
      mode = 'follow';
    }
  }

  let targetX = inp.playerX + rightX * 2.15 + fwdX * 1.1;
  let targetZ = inp.playerZ + rightZ * 2.15 + fwdZ * 1.1;
  let targetY = 0;
  let wingFlapSpeed = 4.0;
  let moveRate = 5.6;

  if (mode === 'patted') {
    // Hops happily in peripheral left-front view, never blocking the center crosshair
    targetX = inp.playerX + fwdX * 1.85 - rightX * 1.75;
    targetZ = inp.playerZ + fwdZ * 1.85 - rightZ * 1.75;
    targetY = 0.25 + Math.abs(Math.sin(patTimer * 10.5)) * 0.42;
    wingFlapSpeed = 24;
    moveRate = 9.5;
  } else if (mode === 'alert' && inp.nearestThreat) {
    // Flanks safely OUTSIDE the player -> monster firing corridor so Grisha/Vanya
    // alerts loudly without ever jumping in front of your gun barrel!
    orbitAngle += dt * 3.0;
    const toThreatX = inp.nearestThreat.x - inp.playerX;
    const toThreatZ = inp.nearestThreat.z - inp.playerZ;
    const len = Math.hypot(toThreatX, toThreatZ) || 1;
    const dirX = toThreatX / len;
    const dirZ = toThreatZ / len;
    // Choose flank side that keeps rooster nearest his current side of the threat line
    const perpX = -dirZ;
    const perpZ = dirX;
    const curSide =
      (inp.x - inp.playerX) * perpX + (inp.z - inp.playerZ) * perpZ >= 0 ? 1 : -1;
    // Stay 2.4m laterally clear of the line of fire and slightly beside/behind the player's shoulder
    targetX =
      inp.playerX +
      perpX * curSide * 2.45 +
      dirX * 0.45 +
      Math.cos(orbitAngle) * 0.32;
    targetZ =
      inp.playerZ +
      perpZ * curSide * 2.45 +
      dirZ * 0.45 +
      Math.sin(orbitAngle) * 0.32;
    // Low hover well below eye-level aim line (eye is at 1.68m)
    targetY = 0.55 + Math.abs(Math.sin(orbitAngle * 2.8)) * 0.32;
    wingFlapSpeed = 26;
    moveRate = 9.2;
  } else if (mode === 'circle_fly') {
    // Flies joyfully in a high overhead halo (well above crosshair height) around the player
    orbitAngle += dt * 2.15;
    const radius = 3.4 + Math.sin(orbitAngle * 1.5) * 0.45;
    targetX = inp.playerX + Math.cos(orbitAngle) * radius;
    targetZ = inp.playerZ + Math.sin(orbitAngle) * radius;
    targetY = 2.45 + Math.sin(orbitAngle * 2.4) * 0.35;
    wingFlapSpeed = 21;
    moveRate = 7.4;
  } else {
    // Grounded energetic hopping at player's right-shoulder flank (clear of firing line)
    orbitAngle += dt * 1.1;
    targetX = inp.playerX + rightX * 2.25 + fwdX * 1.15 + Math.cos(orbitAngle) * 0.42;
    targetZ = inp.playerZ + rightZ * 2.25 + fwdZ * 1.15 + Math.sin(orbitAngle) * 0.42;
    const distToTarget = Math.hypot(targetX - inp.x, targetZ - inp.z);
    targetY =
      distToTarget > 0.85
        ? Math.abs(Math.sin(orbitAngle * 7.2)) * 0.52
        : Math.abs(Math.sin(orbitAngle * 4)) * 0.12;
    wingFlapSpeed = distToTarget > 1.8 ? 16 : 3.5;
    moveRate = 6.2;
  }

  // Enforce line-of-fire exclusion on target AND post-interpolation position (unless flying high overhead)
  const isHighOverhead = mode === 'circle_fly' && inp.y > 2.0 && !threatNear;
  if (!isHighOverhead) {
    const safeTarget = keepRoosterOutOfLineOfFire(
      targetX,
      targetZ,
      inp.playerX,
      inp.playerZ,
      inp.playerYaw,
      inp.nearestThreat
    );
    targetX = safeTarget.x;
    targetZ = safeTarget.z;
  }

  const alpha = 1 - Math.exp(-moveRate * dt);
  let nx = inp.x + (targetX - inp.x) * alpha;
  let nz = inp.z + (targetZ - inp.z) * alpha;
  const ny = inp.y + (targetY - inp.y) * (1 - Math.exp(-10 * dt));

  if (!isHighOverhead) {
    const safePos = keepRoosterOutOfLineOfFire(
      nx,
      nz,
      inp.playerX,
      inp.playerZ,
      inp.playerYaw,
      inp.nearestThreat
    );
    nx = safePos.x;
    nz = safePos.z;
  }

  let yaw = 0;
  if (mode === 'patted') {
    yaw = Math.atan2(inp.playerX - nx, inp.playerZ - nz);
  } else if (mode === 'alert' && inp.nearestThreat) {
    yaw = Math.atan2(inp.nearestThreat.x - nx, inp.nearestThreat.z - nz);
  } else {
    const vx = targetX - inp.x;
    const vz = targetZ - inp.z;
    yaw = Math.hypot(vx, vz) > 0.08 ? Math.atan2(vx, vz) : inp.playerYaw + Math.PI;
  }

  return {
    x: nx,
    y: ny,
    z: nz,
    yaw,
    mode,
    orbitAngle,
    flightTimer,
    patTimer,
    patCooldown,
    patCount,
    crowCooldown,
    wingFlapSpeed,
    triggeredCrow,
    triggeredPat,
    healAmount,
    alertActive,
    alertAngleRad,
    alertLabel,
  };
}

export interface EnemySteeringInput {
  kind: EnemyKind;
  x: number;
  z: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  phaseTime: number;
  seed: number;
  canClaimAttackToken: boolean;
  tacticMode?: 'approach' | 'flank_arc' | 'feint_sprint' | 'enraged_charge';
  flankSign?: 1 | -1;
  recentHitRatio?: number;
}

export interface EnemySteeringResult {
  vx: number;
  vz: number;
  wantsTelegraph: boolean;
  wantsScreamerBurst: boolean;
}

/**
 * Committed, state-driven tactical pursuit AI for all 4 horror archetypes.
 * Eliminates repetitive sinusoidal left-right-left pendulum oscillation AND
 * eliminates monsters getting stuck pacing sideways instead of advancing on the player:
 * - Every archetype maintains strong net forward radial closure whenever beyond attack range.
 * - Tactical states ('approach', 'flank_arc', 'feint_sprint', 'enraged_charge') hold a committed
 *   direction for irregular intervals rather than oscillating symmetrically.
 * - Taking damage ('recentHitRatio > 0') triggers an immediate aggressive lunge toward the player.
 */
export function computeEnemySteering(inp: EnemySteeringInput): EnemySteeringResult {
  const dx = inp.playerX - inp.x;
  const dz = inp.playerZ - inp.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const nx = dx / dist;
  const nz = dz / dist;
  const perpX = -nz;
  const perpZ = nx;

  const playerFwdX = -Math.sin(inp.playerYaw);
  const playerFwdZ = -Math.cos(inp.playerYaw);
  // Dot > 0 means enemy is in front of player; Dot < 0 means enemy is behind player
  const toEnemyDot = (-nx) * playerFwdX + (-nz) * playerFwdZ;

  const s = inp.seed;
  const t = inp.phaseTime;
  const recentHit = Math.max(0, Math.min(1, inp.recentHitRatio ?? 0));

  // Derive deterministic irregular flank commitment if engine didn't pass explicit tactic state
  const tacticBucket = Math.floor((t + s * 1.37) / (2.4 + (s % 1.3)));
  const fallbackSign: 1 | -1 =
    Math.sin(tacticBucket * 12.9898 + s * 78.233) >= 0 ? 1 : -1;
  const flankSign: 1 | -1 = inp.flankSign ?? fallbackSign;
  const tacticMode =
    inp.tacticMode ??
    (recentHit > 0.25
      ? 'enraged_charge'
      : tacticBucket % 4 === 1
        ? 'flank_arc'
        : tacticBucket % 4 === 2
          ? 'feint_sprint'
          : 'approach');

  // Helper: normalize combined (forward, lateral) vector so lateral bias never stalls closing speed
  const buildVelocity = (forwardW: number, lateralW: number, speed: number) => {
    const mag = Math.hypot(forwardW, lateralW) || 1;
    const f = forwardW / mag;
    const l = lateralW / mag;
    return {
      vx: (nx * f + perpX * l) * speed,
      vz: (nz * f + perpZ * l) * speed,
    };
  };

  if (inp.kind === 'crawler') {
    // Low aggressive stalker: commits to curved rushes & sudden bursts, closes straight in under 5.5m
    const closeLock = dist < 5.5;
    let forwardW = 1.0;
    let lateralW = 0;
    let speed = 4.65;

    if (tacticMode === 'enraged_charge' || closeLock) {
      forwardW = 1.0;
      lateralW = flankSign * (closeLock ? 0.08 : 0.14);
      speed = 5.25 + recentHit * 0.45;
    } else if (tacticMode === 'flank_arc') {
      // Sweeps wide on ONE committed side while still advancing briskly (~82% radial closure)
      forwardW = 0.84;
      lateralW = flankSign * 0.54;
      speed = 4.9;
    } else if (tacticMode === 'feint_sprint') {
      // Quick diagonal cut inward toward player
      forwardW = 0.94;
      lateralW = -flankSign * 0.34;
      speed = 5.15;
    } else {
      // Direct predatory stalk with tiny natural shoulder drift
      forwardW = 0.98;
      lateralW = flankSign * 0.16;
      speed = 4.55;
    }

    const vel = buildVelocity(forwardW, lateralW, speed);
    return {
      ...vel,
      wantsTelegraph: dist < 3.2 && inp.canClaimAttackToken,
      wantsScreamerBurst: false,
    };
  }

  if (inp.kind === 'lampshade') {
    // Stalker in long coat: advances steadily even under gaze (never stuck pacing sideways!),
    // angles around one flank, and sprints relentlessly when unseen behind player's back.
    const lookedAt = toEnemyDot > 0.52;
    const closeLock = dist < 4.8;
    let forwardW = lookedAt ? 0.82 : 0.96;
    let lateralW = lookedAt ? flankSign * 0.52 : flankSign * 0.24;
    let speed = lookedAt ? 3.85 : 5.45;

    if (tacticMode === 'enraged_charge' || closeLock || recentHit > 0.2) {
      forwardW = 0.97;
      lateralW = flankSign * 0.18;
      speed = lookedAt ? 4.45 : 5.65;
    } else if (tacticMode === 'feint_sprint' && !lookedAt) {
      forwardW = 0.98;
      lateralW = -flankSign * 0.16;
      speed = 5.7;
    }

    const vel = buildVelocity(forwardW, lateralW, speed);
    return {
      ...vel,
      wantsTelegraph: dist < 3.4 && inp.canClaimAttackToken,
      wantsScreamerBurst: false,
    };
  }

  if (inp.kind === 'screamer') {
    // Relentlessly closes into shriek range (<= 7.5m) then presses closer on a curved ambush vector —
    // never stalls back-and-forth horizontally!
    const inShriekBand = dist < 7.8;
    let forwardW = dist > 5.0 ? 0.9 : 0.72;
    let lateralW =
      tacticMode === 'flank_arc' ? flankSign * 0.48 : flankSign * 0.22;
    let speed = dist > 9.5 ? 4.45 : 3.95;

    if (tacticMode === 'enraged_charge' || recentHit > 0.2) {
      forwardW = 0.96;
      lateralW = flankSign * 0.16;
      speed = 4.65;
    } else if (dist < 3.4) {
      // At point-blank, still presses aggressively with slight sidestep rather than running backward forever
      forwardW = 0.65;
      lateralW = flankSign * 0.45;
      speed = 3.5;
    }

    const vel = buildVelocity(forwardW, lateralW, speed);
    const wantsScreamerBurst =
      (inShriekBand || dist < 9.5) && inp.canClaimAttackToken;
    return {
      ...vel,
      wantsTelegraph: wantsScreamerBurst,
      wantsScreamerBurst,
    };
  }

  // Watchman boss: heavy unstoppable pursuit with committed diagonal flanks & charging surges
  const closeBoss = dist < 5.4;
  const forwardW =
    tacticMode === 'flank_arc' && !closeBoss ? 0.88 : 0.98;
  const lateralW =
    tacticMode === 'flank_arc' && !closeBoss
      ? flankSign * 0.42
      : flankSign * 0.12;
  const bossSpeed =
    tacticMode === 'enraged_charge' || recentHit > 0.25
      ? 4.45
      : tacticMode === 'feint_sprint'
        ? 4.25
        : 3.85;
  const vel = buildVelocity(forwardW, lateralW, bossSpeed);
  const wantsTelegraph = dist < 4.7 && inp.canClaimAttackToken;
  return {
    ...vel,
    wantsTelegraph,
    wantsScreamerBurst: dist < 5.2 && Math.sin(t * 0.65 + s) > 0.86,
  };
}

/**
 * Pure biomechanical biped leg & torso kinematics solver.
 *
 * Coordinate convention (Three.js rig facing +Z):
 * - Hip rotation.x < 0 swings the thigh FORWARD (+Z); > 0 extends thigh BACKWARD (-Z).
 * - Knee rotation.x > 0 bends the shin BACKWARD (-Z) anatomically (never hyperextends forward!).
 * - Ankle rotation.x < 0 dorsiflexes toes UP (clearance/heel-strike); > 0 plantarflexes push-off.
 * - Gait cycle phase φ ∈ [0, 2π):
 *     [0, π)   = STANCE PHASE (foot bears weight, hip sweeps forward->back, knee near straight)
 *     [π, 2π)  = SWING PHASE  (foot lifts off, knee bends sharply backward to clear ground, hip swings forward)
 */
function solveSingleLegKinematics(
  phaseRad: number,
  strideAmp: number,
  kneeFlexAmp: number,
  limpScale: number
): { hipX: number; kneeX: number; ankleX: number; footLift: number } {
  const phi = ((phaseRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const inStance = phi < Math.PI;
  let hipX = 0;
  let kneeX = 0.08;
  let ankleX = 0;
  let footLift = 0;

  if (inStance) {
    // u ∈ [0..1] from heel strike (0) -> mid-stance (0.5) -> toe-off (1)
    const u = phi / Math.PI;
    // Smooth weight-bearing sweep from forward (-stride) to trailing (+stride)
    hipX = (-0.86 + 1.72 * u) * strideAmp * limpScale;
    // Subtle knee shock-absorption dip just after heel strike, straight at mid-stance, pre-bend at toe-off
    const impactDip = Math.sin(Math.min(1, u * 2.5) * Math.PI) * 0.16;
    const preSwingFlex = u > 0.78 ? Math.pow((u - 0.78) / 0.22, 1.4) * 0.34 : 0;
    kneeX = 0.06 + (impactDip + preSwingFlex) * kneeFlexAmp;
    // Heel strike dorsiflexion -> flat foot -> toe-off plantarflexion push
    ankleX = u < 0.18 ? -0.18 * (1 - u / 0.18) : u > 0.72 ? ((u - 0.72) / 0.28) * 0.38 * strideAmp : 0;
    footLift = 0;
  } else {
    // v ∈ [0..1] from toe-off (0) -> mid-swing peak knee bend (0.45) -> terminal extension (1)
    const v = (phi - Math.PI) / Math.PI;
    // Cubic ease-in-out forward hip swing from trailing (+stride) to forward (-stride)
    const ease = v * v * (3 - 2 * v);
    hipX = (0.86 - 1.72 * ease) * strideAmp * limpScale;
    // Anatomically real backward knee flexion peaking around v=0.42 so foot clears the wet road cleanly
    const swingBell = Math.sin(Math.pow(v, 0.85) * Math.PI);
    kneeX = 0.1 + swingBell * kneeFlexAmp * (0.95 + 0.15 * limpScale);
    // Dorsiflexion during mid-swing so toes don't drag on asphalt, prepping heel for strike
    ankleX = -0.26 * Math.sin(v * Math.PI) - 0.16 * Math.max(0, v - 0.7);
    footLift = swingBell;
  }

  return { hipX, kneeX, ankleX, footLift };
}

export function computeBipedGaitPose(inp: BipedGaitInput): BipedGaitPose {
  const speed = Math.max(0, Math.min(1.45, inp.speedRatio));
  const moveBlend = Math.min(1, speed / 0.22); // smoothly returns to planted idle pose when stopped
  const t = inp.timeSec;
  const s = inp.seed;

  // Non-cyclic multi-harmonic organic breathing & subtle instability (never identical cycles)
  const breath = Math.sin(t * 2.1 + s * 3.1) * 0.5 + Math.sin(t * 0.87 + s * 1.7) * 0.5;
  const twitch =
    Math.sin(t * 3.71 + s * 5.3) * Math.cos(t * 1.93 + s * 2.9) * Math.sin(t * 0.61 + s);

  // Archetype biomechanical profiles
  const isCrawler = inp.kind === 'crawler';
  const isLampshade = inp.kind === 'lampshade';
  const isScreamer = inp.kind === 'screamer';
  const isBoss = inp.kind === 'watchman';

  const baseStride = isCrawler ? 0.66 : isBoss ? 0.46 : isScreamer ? 0.52 : 0.56;
  const baseKneeFlex = isCrawler ? 1.18 : isBoss ? 0.78 : isScreamer ? 0.92 : 0.98;
  const baseHunch = isCrawler ? 0.34 : isBoss ? 0.14 : isScreamer ? 0.22 : 0.12;

  // Subtle individual asymmetric limp (seeded per monster so each entity has personality)
  const limpBias = ((s * 7.13) % 1) - 0.5; // -0.5..0.5
  const leftLimp = 1 + (isLampshade || isCrawler ? limpBias * 0.22 : limpBias * 0.1);
  const rightLimp = 1 - (isLampshade || isCrawler ? limpBias * 0.22 : limpBias * 0.1);

  const strideAmp = baseStride * Math.min(1.18, 0.35 + speed * 0.72) * moveBlend;
  const kneeAmp = baseKneeFlex * Math.min(1.15, 0.4 + speed * 0.65) * moveBlend;

  // Left & Right legs strictly PI out of phase (with subtle limp phase skew)
  const leftLeg = solveSingleLegKinematics(inp.gaitPhase, strideAmp, kneeAmp, leftLimp);
  const rightLeg = solveSingleLegKinematics(
    inp.gaitPhase + Math.PI + limpBias * 0.18,
    strideAmp,
    kneeAmp,
    rightLimp
  );

  // Idle planted knees slightly relaxed; moving legs follow biomechanical solver
  const idleKnee = isCrawler ? 0.28 : isBoss ? 0.12 : 0.16;
  const leftHipX = leftLeg.hipX * moveBlend + (1 - moveBlend) * (isCrawler ? -0.14 : -0.04);
  const rightHipX = rightLeg.hipX * moveBlend + (1 - moveBlend) * (isCrawler ? -0.14 : 0.04);
  const leftKneeX = idleKnee * (1 - moveBlend) + leftLeg.kneeX * moveBlend;
  const rightKneeX = idleKnee * (1 - moveBlend) + rightLeg.kneeX * moveBlend;
  const leftAnkleX = leftLeg.ankleX * moveBlend;
  const rightAnkleX = rightLeg.ankleX * moveBlend;

  // Pelvis rises at mid-stance (twice per gait cycle), drops on double-support/heel-strike, rolls toward stance leg
  const strideBob =
    (Math.abs(Math.sin(inp.gaitPhase)) - 0.55) * (isBoss ? 0.11 : isCrawler ? 0.085 : 0.07) * moveBlend;
  const pelvisY = strideBob + breath * 0.015;
  const pelvisRoll =
    Math.sin(inp.gaitPhase) * (isBoss ? 0.11 : 0.075) * moveBlend +
    limpBias * 0.06 * moveBlend;
  const pelvisYaw = Math.cos(inp.gaitPhase) * 0.14 * moveBlend;
  const pelvisPitch = baseHunch * 0.35 + speed * 0.06 * moveBlend;

  // Spine counter-rotates opposite pelvis yaw for real human/creature locomotion
  const turnLean = Math.max(-0.24, Math.min(0.24, -inp.turnRate * 0.18));
  const flinchBack = -inp.flinchRatio * 0.42;
  const attackWindup = inp.telegraphRatio > 0 ? Math.sin(inp.telegraphRatio * Math.PI) : 0;
  const attackLunge =
    inp.telegraphRatio > 0.65 ? ((inp.telegraphRatio - 0.65) / 0.35) * 0.46 : -attackWindup * 0.24;

  const spinePitch =
    baseHunch +
    speed * (isCrawler ? 0.18 : 0.09) * moveBlend +
    breath * 0.03 +
    flinchBack +
    attackLunge;
  const spineRoll = -pelvisRoll * 0.55 + turnLean + twitch * (isScreamer ? 0.12 : 0.04);
  const spineYaw = -pelvisYaw * 1.35 + (isBoss ? attackWindup * 0.38 : 0);

  // Head counter-stabilizes pitch slightly + eerie non-cyclic micro-twitches / scanning
  const headPitch = -spinePitch * 0.42 + breath * 0.05 + flinchBack * 0.6;
  const headYaw =
    (1 - moveBlend) * Math.sin(t * 0.85 + s * 4.2) * 0.34 +
    twitch * (isScreamer ? 0.28 : isLampshade ? 0.18 : 0.1);
  const headRoll =
    (isScreamer ? 0.18 : isCrawler ? 0.12 : 0.06) * Math.sin(t * 1.17 + s * 2.5) +
    twitch * 0.16;

  // Opposite-phase arm swing: when left leg swings forward (hipX < 0), right arm swings forward (shoulderX < 0)
  const armSwingAmp = (isCrawler ? 0.58 : isBoss ? 0.42 : 0.48) * moveBlend;
  let leftShoulderX = -rightLeg.hipX * 0.85 * (armSwingAmp / Math.max(0.15, strideAmp || 0.5)) - (isCrawler ? 0.32 : 0.08);
  let rightShoulderX = -leftLeg.hipX * 0.85 * (armSwingAmp / Math.max(0.15, strideAmp || 0.5)) - (isCrawler ? 0.32 : 0.08);
  let leftElbowX = -(0.28 + Math.max(0, -leftShoulderX) * 0.65 + (isCrawler ? 0.35 : 0.1));
  let rightElbowX = -(0.28 + Math.max(0, -rightShoulderX) * 0.65 + (isCrawler ? 0.35 : 0.1));
  let leftShoulderZ = (isBoss ? 0.14 : 0.08) + breath * 0.03;
  let rightShoulderZ = -(isBoss ? 0.14 : 0.08) - breath * 0.03;

  // Override arms cleanly for attack telegraph windup -> forward strike
  if (inp.telegraphRatio > 0) {
    const tr = inp.telegraphRatio;
    if (isScreamer) {
      // Screamer clutches head / spreads talons wide while shrieking
      leftShoulderX = -1.45 * attackWindup;
      rightShoulderX = -1.45 * attackWindup;
      leftShoulderZ = 0.55 * attackWindup;
      rightShoulderZ = -0.55 * attackWindup;
      leftElbowX = -0.75 * attackWindup;
      rightElbowX = -0.75 * attackWindup;
    } else if (isBoss) {
      // Watchman raises heavy iron staff overhead with right arm then slams down
      const strike = tr > 0.68 ? (tr - 0.68) / 0.32 : 0;
      rightShoulderX = -2.15 * (1 - strike) + 0.55 * strike;
      rightElbowX = -0.55 * (1 - strike) - 0.15 * strike;
      leftShoulderX = -0.75 * attackWindup;
      leftElbowX = -0.6;
    } else {
      const strike = tr > 0.66 ? (tr - 0.66) / 0.34 : 0;
      leftShoulderX = -1.65 * (1 - strike) - 0.1 * strike;
      rightShoulderX = -1.5 * (1 - strike) - 0.25 * strike;
      leftElbowX = -0.85 * (1 - strike) - 0.2 * strike;
      rightElbowX = -0.85 * (1 - strike) - 0.2 * strike;
    }
  } else if (inp.flinchRatio > 0.05) {
    // Hit recoil throws arms outward briefly
    leftShoulderZ += inp.flinchRatio * 0.42;
    rightShoulderZ -= inp.flinchRatio * 0.42;
    leftShoulderX -= inp.flinchRatio * 0.35;
    rightShoulderX -= inp.flinchRatio * 0.35;
  }

  return {
    pelvisY,
    pelvisPitch,
    pelvisRoll,
    pelvisYaw,
    spinePitch,
    spineRoll,
    spineYaw,
    headPitch,
    headYaw,
    headRoll,
    leftHipX,
    leftKneeX,
    leftAnkleX,
    rightHipX,
    rightKneeX,
    rightAnkleX,
    leftShoulderX,
    leftShoulderZ,
    leftElbowX,
    rightShoulderX,
    rightShoulderZ,
    rightElbowX,
  };
}

/**
 * Pure biomechanical avian gait & idle behavior solver for Grisha/Vanya.
 * - Walking: alternating strutting legs driven by actual ground speed + classic rooster head-bob
 * - Standing idle: feet planted, curious non-cyclic head tilts & occasional quick ground pecks
 * - Airborne: legs tucked cleanly under breast, vigorous multi-axis wingbeats
 */
export function computeRoosterGaitPose(inp: RoosterGaitInput): RoosterGaitPose {
  const airborne = inp.altitude > 0.18;
  const walkBlend = airborne ? 0 : Math.min(1, inp.groundSpeed / 0.55);
  const t = inp.timeSec;

  if (airborne) {
    const flap = Math.sin(inp.wingPhase);
    return {
      bodyYOffset: 0,
      bodyPitch: -0.18 + Math.cos(inp.wingPhase) * 0.08,
      bodyRoll: Math.sin(t * 2.7) * 0.14,
      neckPitch: -0.18,
      headPitch: 0.12,
      headYaw: Math.sin(t * 3.1) * 0.12,
      headRoll: 0,
      // Legs tucked back smoothly beneath chest while flying
      leftHipX: 0.55,
      leftKneeX: -0.95,
      leftAnkleX: 0.5,
      rightHipX: 0.55,
      rightKneeX: -0.95,
      rightAnkleX: 0.5,
      leftWingFlapZ: 0.25 + flap * 1.05,
      leftWingSpreadY: 0.22,
      rightWingFlapZ: -0.25 - flap * 1.05,
      rightWingSpreadY: -0.22,
      tailPitch: -0.22 + flap * 0.12,
    };
  }

  // Ground locomotion: avian reverse-knee (intertarsal joint bends forward/back organically)
  const stride = 0.62 * walkBlend;
  const leftSwing = Math.max(0, Math.sin(inp.stepPhase));
  const rightSwing = Math.max(0, -Math.sin(inp.stepPhase));

  const leftHipX = -Math.cos(inp.stepPhase) * stride;
  const rightHipX = Math.cos(inp.stepPhase) * stride;
  // Avian ankle/hock lifts foot smoothly during swing phase
  const leftKneeX = -0.22 - leftSwing * 0.72 * walkBlend;
  const rightKneeX = -0.22 - rightSwing * 0.72 * walkBlend;
  const leftAnkleX = 0.22 + leftSwing * 0.55 * walkBlend;
  const rightAnkleX = 0.22 + rightSwing * 0.55 * walkBlend;

  // Non-cyclic idle pecking & curious head cocks when standing still
  const idleFactor = 1 - walkBlend;
  const peckTrigger = Math.sin(t * 0.73) * Math.sin(t * 1.91);
  const peckPulse =
    idleFactor > 0.6 && inp.mode !== 'alert' && peckTrigger > 0.74
      ? Math.sin(((peckTrigger - 0.74) / 0.26) * Math.PI) * 0.68
      : 0;
  const patHappy = inp.patTimer > 0 ? Math.sin(t * 16) * 0.22 : 0;

  // Classic rooster stride head-bob (peaks forward twice per step cycle)
  const walkHeadBob = Math.sin(inp.stepPhase * 2) * 0.22 * walkBlend;
  const alertLift = inp.mode === 'alert' ? -0.32 : 0;

  const bodyYOffset =
    Math.abs(Math.sin(inp.stepPhase)) * 0.035 * walkBlend +
    (inp.patTimer > 0 ? Math.abs(Math.sin(t * 11)) * 0.06 : 0);
  const bodyPitch =
    0.08 * walkBlend + peckPulse * 0.55 + alertLift * 0.4;
  const bodyRoll = Math.sin(inp.stepPhase) * 0.11 * walkBlend;

  const neckPitch = walkHeadBob + peckPulse * 0.72 + alertLift;
  const headPitch = -walkHeadBob * 0.5 + peckPulse * 0.35 + patHappy;
  const headYaw =
    idleFactor * (Math.sin(t * 1.37) * 0.38 + Math.cos(t * 2.51) * 0.18) +
    (inp.mode === 'alert' ? Math.sin(t * 6.5) * 0.18 : 0);
  const headRoll = idleFactor * Math.sin(t * 1.13 + 0.9) * 0.22;

  // Wings stay tucked cleanly while walking; puff & flutter on alert or happy pat
  const wingFlutter =
    inp.mode === 'alert'
      ? Math.sin(inp.wingPhase * 1.3) * 0.52 + 0.24
      : inp.patTimer > 0
        ? Math.sin(t * 18) * 0.45 + 0.2
        : Math.sin(inp.stepPhase) * 0.05 * walkBlend;

  return {
    bodyYOffset,
    bodyPitch,
    bodyRoll,
    neckPitch,
    headPitch,
    headYaw,
    headRoll,
    leftHipX,
    leftKneeX,
    leftAnkleX,
    rightHipX,
    rightKneeX,
    rightAnkleX,
    leftWingFlapZ: wingFlutter,
    leftWingSpreadY: inp.mode === 'alert' ? 0.18 : 0,
    rightWingFlapZ: -wingFlutter,
    rightWingSpreadY: inp.mode === 'alert' ? -0.18 : 0,
    tailPitch: 0.08 * Math.sin(inp.stepPhase * 2) * walkBlend + (inp.mode === 'alert' ? 0.28 : 0),
  };
}

