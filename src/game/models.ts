import * as THREE from 'three';
import type { EnemyKind, HouseLot, LampSpec, ObjectiveKind, PickupKind, WeaponId } from './types';
import {
  createEnemySurfaceMaps,
  createFirstPersonHandMaterials,
  createP90MagTextures,
  createPickupMaterials,
  createRoosterSurfaceMaps,
  createWeaponSurfaceMaps,
  type WorldMaterialSet,
} from './textures';

let cachedWeaponMaps: ReturnType<typeof createWeaponSurfaceMaps> | null = null;
function getWeaponMaps() {
  if (!cachedWeaponMaps) cachedWeaponMaps = createWeaponSurfaceMaps();
  return cachedWeaponMaps;
}

let cachedHandMats: ReturnType<typeof createFirstPersonHandMaterials> | null = null;
function getHandMaterials() {
  if (!cachedHandMats) cachedHandMats = createFirstPersonHandMaterials(8);
  return cachedHandMats;
}

let cachedP90Mag: ReturnType<typeof createP90MagTextures> | null = null;
function getP90MagTextures() {
  if (!cachedP90Mag) cachedP90Mag = createP90MagTextures();
  return cachedP90Mag;
}

let cachedPickupMats: ReturnType<typeof createPickupMaterials> | null = null;
function getPickupMaterials() {
  if (!cachedPickupMats) cachedPickupMats = createPickupMaterials(8);
  return cachedPickupMats;
}

let cachedEnemyMaps: ReturnType<typeof createEnemySurfaceMaps> | null = null;
function getEnemyMaps() {
  if (!cachedEnemyMaps) cachedEnemyMaps = createEnemySurfaceMaps();
  return cachedEnemyMaps;
}

let cachedRoosterMaps: ReturnType<typeof createRoosterSurfaceMaps> | null = null;
function getRoosterMaps() {
  if (!cachedRoosterMaps) cachedRoosterMaps = createRoosterSurfaceMaps();
  return cachedRoosterMaps;
}

/**
 * Triplanar box-projected UV mapper for ExtrudeGeometry and LatheGeometry so
 * metallic grain, walnut wood, and car enamel never stretch diagonally on side bevels.
 */
function normalizeBoxProjectedUVs(
  geo: THREE.BufferGeometry,
  tileMeters = 0.45
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  if (!pos || !norm) return geo;

  const uvArr = new Float32Array(pos.count * 2);
  const inv = 1 / Math.max(0.02, tileMeters);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    let u = 0;
    let v = 0;
    if (nx >= ny && nx >= nz) {
      u = pz * inv;
      v = py * inv;
    } else if (ny >= nx && ny >= nz) {
      u = px * inv;
      v = pz * inv;
    } else {
      u = px * inv;
      v = py * inv;
    }
    uvArr[i * 2] = u;
    uvArr[i * 2 + 1] = v;
  }
  const uvAttr = new THREE.BufferAttribute(uvArr, 2);
  geo.setAttribute('uv', uvAttr);
  geo.setAttribute('uv2', uvAttr.clone());
  return geo;
}

/**
 * Centered beveled rounded-rectangle extrusion with distortion-free triplanar UVs.
 */
function createBeveledBoxGeo(
  width: number,
  height: number,
  depth: number,
  radius = Math.min(width, height) * 0.14,
  bevelSize = Math.min(width, height, depth) * 0.08,
  uvTile = Math.max(0.18, Math.max(width, height, depth) * 0.85)
): THREE.BufferGeometry {
  const r = Math.min(radius, width * 0.42, height * 0.42);
  const b = Math.min(bevelSize, depth * 0.28, r * 0.85);
  const w = Math.max(0.004, width - b * 2);
  const h = Math.max(0.004, height - b * 2);
  const hw = w * 0.5;
  const hh = h * 0.5;
  const cr = Math.min(r, hw * 0.9, hh * 0.9);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

  const coreDepth = Math.max(0.004, depth - b * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: coreDepth,
    bevelEnabled: b > 0.001,
    bevelSegments: 2,
    steps: 1,
    bevelSize: b,
    bevelThickness: b,
    curveSegments: 6,
  });
  geo.translate(0, 0, -coreDepth * 0.5);
  geo.computeVertexNormals();
  return normalizeBoxProjectedUVs(geo, uvTile);
}

/**
 * Smooth rotational profile helper (LatheGeometry) for anatomical torsos, skulls,
 * avian bodies, lanterns, scopes, and collars.
 */
function createLatheProfileGeo(
  points: Array<[number, number]>,
  segments = 16
): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  if (geo.attributes.uv) {
    geo.setAttribute('uv2', geo.attributes.uv.clone());
  }
  return geo;
}

/**
 * Extrudes a 2D side silhouette (XY plane) centered along X with smooth chamfers
 * and distortion-free triplanar UVs.
 */
function createProfileExtrudeGeo(
  pts: Array<[number, number]>,
  thickness: number,
  bevel = 0.008,
  uvTile = 0.48
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], idx) => {
    if (idx === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const core = Math.max(0.004, thickness - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: bevel > 0.0005,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.translate(0, 0, -core * 0.5);
  geo.computeVertexNormals();
  return normalizeBoxProjectedUVs(geo, uvTile);
}

function createSculptedBoot(
  width: number,
  height: number,
  length: number,
  mat: THREE.Material
): THREE.Group {
  const boot = new THREE.Group();
  // Contoured boot profile extruded along X (length along +Z)
  const sole = new THREE.Mesh(
    createBeveledBoxGeo(width * 1.06, height * 0.34, length * 0.98, width * 0.25, height * 0.08),
    mat
  );
  sole.position.set(0, -height * 0.72, length * 0.22);
  sole.castShadow = true;

  const heel = new THREE.Mesh(
    createBeveledBoxGeo(width * 0.98, height * 0.46, length * 0.34, width * 0.2, height * 0.07),
    mat
  );
  heel.position.set(0, -height * 0.62, -length * 0.08);
  heel.castShadow = true;

  const vamp = new THREE.Mesh(
    new THREE.CapsuleGeometry(width * 0.46, length * 0.46, 5, 10),
    mat
  );
  vamp.rotation.x = Math.PI / 2;
  vamp.scale.set(1.0, 1.0, 0.72);
  vamp.position.set(0, -height * 0.36, length * 0.26);
  vamp.castShadow = true;

  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.52, width * 0.46, height * 0.72, 10),
    mat
  );
  cuff.position.set(0, -height * 0.14, 0.0);
  cuff.castShadow = true;

  boot.add(sole, heel, vamp, cuff);
  return boot;
}

function createClawedHand(
  scaleR: number,
  handMat: THREE.Material,
  clawMat?: THREE.Material
): THREE.Group {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(
    createBeveledBoxGeo(scaleR * 1.65, scaleR * 2.0, scaleR * 0.82, scaleR * 0.35, scaleR * 0.14),
    handMat
  );
  palm.position.y = -scaleR * 0.85;
  palm.castShadow = true;
  hand.add(palm);

  const fingerAngles = [-0.38, -0.13, 0.13, 0.38];
  const fingerLens = [1.55, 1.95, 1.85, 1.45];
  fingerAngles.forEach((ang, i) => {
    const fLen = scaleR * fingerLens[i];
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(scaleR * 0.2, fLen, 4, 6),
      clawMat ?? handMat
    );
    finger.position.set(
      Math.sin(ang) * scaleR * 0.88,
      -scaleR * 1.75 - fLen * 0.45,
      scaleR * 0.28
    );
    finger.rotation.z = ang * 0.75;
    finger.rotation.x = -0.35;
    finger.castShadow = true;
    hand.add(finger);
  });

  // Opposable gnarled thumb
  const thumb = new THREE.Mesh(
    new THREE.CapsuleGeometry(scaleR * 0.22, scaleR * 1.15, 4, 6),
    clawMat ?? handMat
  );
  thumb.position.set(-scaleR * 0.92, -scaleR * 1.05, scaleR * 0.46);
  thumb.rotation.z = -0.68;
  thumb.rotation.x = -0.45;
  hand.add(thumb);

  return hand;
}

/**
 * Rewrites BoxGeometry UVs so every face (+X/-X, +Y/-Y, +Z/-Z) tiles at exact
 * real-world meter dimensions (tileU x tileV), eliminating stretched or squished
 * textures on narrow edges, varying fence lengths, roofs, and house sides.
 * Also copies uv -> uv2 so PBR aoMap renders cleanly.
 */
export function applyWorldBoxUVs(
  geo: THREE.BoxGeometry,
  sx: number,
  sy: number,
  sz: number,
  tileU: number,
  tileV: number
): THREE.BoxGeometry {
  const uv = geo.attributes.uv;
  const norm = geo.attributes.normal;
  const pos = geo.attributes.position;
  if (!uv || !norm || !pos) return geo;

  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);

    let u = 0;
    let v = 0;
    if (nx > 0.5) {
      // +X / -X face: horizontal along Z, vertical along Y
      u = (pz + sz * 0.5) / tileU;
      v = (py + sy * 0.5) / tileV;
    } else if (ny > 0.5) {
      // +Y / -Y face: along X and Z
      u = (px + sx * 0.5) / tileU;
      v = (pz + sz * 0.5) / tileV;
    } else {
      // +Z / -Z face: horizontal along X, vertical along Y
      u = (px + sx * 0.5) / tileU;
      v = (py + sy * 0.5) / tileV;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  geo.setAttribute('uv2', uv.clone());
  return geo;
}

export function applyWorldPlaneUVs(
  geo: THREE.PlaneGeometry,
  w: number,
  h: number,
  tileU: number,
  tileV: number
): THREE.PlaneGeometry {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const repX = w / tileU;
  const repY = h / tileV;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * repX, uv.getY(i) * repY);
  }
  uv.needsUpdate = true;
  geo.setAttribute('uv2', uv.clone());
  return geo;
}

export function applyWorldCircleUVs(
  geo: THREE.CircleGeometry,
  radius: number,
  tileSize: number
): THREE.CircleGeometry {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (!pos || !uv) return geo;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) + radius) / tileSize,
      (pos.getY(i) + radius) / tileSize
    );
  }
  uv.needsUpdate = true;
  geo.setAttribute('uv2', uv.clone());
  return geo;
}

export interface RoosterRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  neckPivot: THREE.Group;
  headPivot: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  tailGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
}

export interface WeaponRig {
  group: THREE.Group;
  muzzlePoint: THREE.Object3D;
  barrelCluster?: THREE.Group;
  pumpForend?: THREE.Mesh;
  slide?: THREE.Mesh;
  boltHandle?: THREE.Group;
  magazine?: THREE.Object3D;
  ammoDrum?: THREE.Object3D;
  chargingHandle?: THREE.Object3D;
  leftHand?: THREE.Object3D;
}

export interface EnemyRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  pelvisGroup: THREE.Group;
  spineGroup: THREE.Group;
  neckGroup: THREE.Group;
  headMesh: THREE.Mesh;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  emissiveParts: THREE.MeshStandardMaterial[];
  baseEmissiveIntensities: number[];
  shadowMesh: THREE.Mesh;
  hitMaterials: THREE.MeshStandardMaterial[];
  baseEmissiveColors: number[];
  pelvisBaseY: number;
}

export function createSuburbanHouse(
  lot: HouseLot,
  materials: WorldMaterialSet
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(lot.x, 0, lot.z);
  // Rotate so local +Z faces toward the street
  group.rotation.y = lot.facing === 1 ? Math.PI / 2 : -Math.PI / 2;

  const w = lot.depth; // width facing road
  const d = lot.width; // depth away from road
  const h = lot.height;

  // 1. Weathered Soviet concrete foundation plinth (grounded at y=0)
  const plinthGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(w + 0.36, 0.56, d + 0.36),
    w + 0.36,
    0.56,
    d + 0.36,
    2.4,
    1.6
  );
  const plinth = new THREE.Mesh(plinthGeo, materials.concrete);
  plinth.position.y = 0.28;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Diverse Soviet facade material per house lot (stucco / horizontal clapboard timber / red-silicate brick)
  const houseNum = Number(lot.number) || 0;
  const wallMat =
    houseNum === 14 || houseNum === 10
      ? materials.house
      : houseNum % 2 === 1
        ? materials.houseTimber
        : materials.houseBrick;

  const wallsGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(w, h, d),
    w,
    h,
    d,
    3.6,
    3.1
  );
  const walls = new THREE.Mesh(wallsGeo, wallMat);
  walls.position.y = 0.56 + h / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Corner timber/concrete vertical pilasters for crisp architectural silhouette
  const cornerGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(0.24, h + 0.06, 0.24),
    0.24,
    h + 0.06,
    0.24,
    0.9,
    2.4
  );
  const cornerMat = wallMat === materials.houseTimber ? materials.woodTrim : materials.concrete;
  for (const cx of [-w / 2 + 0.04, w / 2 - 0.04]) {
    for (const cz of [-d / 2 + 0.04, d / 2 - 0.04]) {
      const pilaster = new THREE.Mesh(cornerGeo, cornerMat);
      pilaster.position.set(cx, 0.56 + h / 2, cz);
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;
      group.add(pilaster);
    }
  }

  // 3. Pitched Soviet corrugated slate roof (2 sloped panels + gable infill + ridge beam)
  const roofH = 2.15;
  const overhang = 0.58;
  const slopeLen = Math.hypot(w / 2 + overhang, roofH);
  const slopeAngle = Math.atan2(roofH, w / 2 + overhang);
  const roofDepth = d + overhang * 1.85;

  const leftRoofGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(slopeLen, 0.16, roofDepth),
    slopeLen,
    0.16,
    roofDepth,
    2.8,
    2.8
  );
  const leftRoof = new THREE.Mesh(leftRoofGeo, materials.roof);
  leftRoof.position.set(
    -(w / 4 + overhang * 0.22),
    0.56 + h + roofH / 2 - 0.08,
    0
  );
  leftRoof.rotation.z = slopeAngle;
  leftRoof.castShadow = true;
  leftRoof.receiveShadow = true;
  group.add(leftRoof);

  const rightRoofGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(slopeLen, 0.16, roofDepth),
    slopeLen,
    0.16,
    roofDepth,
    2.8,
    2.8
  );
  const rightRoof = new THREE.Mesh(rightRoofGeo, materials.roof);
  rightRoof.position.set(
    w / 4 + overhang * 0.22,
    0.56 + h + roofH / 2 - 0.08,
    0
  );
  rightRoof.rotation.z = -slopeAngle;
  rightRoof.castShadow = true;
  rightRoof.receiveShadow = true;
  group.add(rightRoof);

  // Metal ridge cap along roof peak
  const ridgeGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(0.28, 0.18, roofDepth + 0.04),
    0.28,
    0.18,
    roofDepth + 0.04,
    1.5,
    1.5
  );
  const ridge = new THREE.Mesh(ridgeGeo, materials.grimeMetal);
  ridge.position.set(0, 0.56 + h + roofH + 0.02, 0);
  ridge.castShadow = true;
  group.add(ridge);

  // Gable infill prism with matching wall texel density (3.8m x 3.2m)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-w / 2, 0);
  gableShape.lineTo(w / 2, 0);
  gableShape.lineTo(0, roofH - 0.04);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: d - 0.08,
    bevelEnabled: false,
  });
  gableGeo.translate(0, 0, -(d - 0.08) / 2);
  const gUv = gableGeo.attributes.uv;
  if (gUv) {
    for (let i = 0; i < gUv.count; i++) {
      gUv.setXY(i, (gUv.getX(i) + w * 0.5) / 3.8, gUv.getY(i) / 3.2);
    }
    gUv.needsUpdate = true;
    gableGeo.setAttribute('uv2', gUv.clone());
  }
  const gable = new THREE.Mesh(gableGeo, wallMat);
  gable.position.y = 0.56 + h;
  gable.castShadow = true;
  gable.receiveShadow = true;
  group.add(gable);

  // Front attic gable vent louver (слуховое окно) under the roof peak
  const atticFrame = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(0.92, 0.72, 0.14), 0.92, 0.72, 0.14, 1.0, 1.0),
    materials.woodTrim
  );
  atticFrame.position.set(0, 0.56 + h + roofH * 0.44, d / 2 + 0.02);
  const atticPane = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.08),
    materials.windowDark
  );
  atticPane.position.set(0, 0.56 + h + roofH * 0.44, d / 2 + 0.05);
  group.add(atticFrame, atticPane);

  // Rain gutters along eaves + vertical galvanized corner drainpipe (водосточная труба)
  const gutterGeo = new THREE.CylinderGeometry(0.08, 0.08, roofDepth, 8);
  gutterGeo.rotateX(Math.PI / 2);
  for (const side of [-1, 1]) {
    const gutter = new THREE.Mesh(gutterGeo, materials.grimeMetal);
    gutter.position.set(side * (w / 2 + overhang * 0.82), 0.56 + h - 0.18, 0);
    group.add(gutter);
  }
  const drainPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, h + 0.35, 8),
    materials.grimeMetal
  );
  drainPipe.position.set(w / 2 + 0.14, 0.56 + (h - 0.25) / 2, d / 2 - 0.12);
  drainPipe.castShadow = true;
  group.add(drainPipe);

  // 4. Weathered red-brick chimney stack with soot concrete cap
  const chimneyGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(0.74, 1.9, 0.74),
    0.74,
    1.9,
    0.74,
    1.5,
    1.5
  );
  const chimney = new THREE.Mesh(chimneyGeo, materials.brick);
  chimney.position.set(w * 0.22, 0.56 + h + roofH * 0.65, -d * 0.18);
  chimney.castShadow = true;
  chimney.receiveShadow = true;
  group.add(chimney);

  const chimneyCap = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(0.88, 0.12, 0.88), 0.88, 0.12, 0.88, 1.2, 1.2),
    materials.concrete
  );
  chimneyCap.position.set(w * 0.22, 0.56 + h + roofH * 0.65 + 0.98, -d * 0.18);
  chimneyCap.castShadow = true;
  group.add(chimneyCap);

  // 5. Front porch steps, timber door, frame & sloped slate awning
  const porch = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(2.45, 0.46, 1.4), 2.45, 0.46, 1.4, 2.0, 1.4),
    materials.concrete
  );
  porch.position.set(-0.9, 0.23, d / 2 + 0.68);
  porch.castShadow = true;
  porch.receiveShadow = true;
  group.add(porch);

  const doorFrame = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(1.32, 2.28, 0.18), 1.32, 2.28, 0.18, 1.4, 2.0),
    materials.woodTrim
  );
  doorFrame.position.set(-0.9, 0.56 + 1.14, d / 2 + 0.05);
  doorFrame.castShadow = true;
  doorFrame.receiveShadow = true;
  group.add(doorFrame);

  const door = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(1.06, 2.12, 0.12), 1.06, 2.12, 0.12, 1.2, 2.1),
    materials.woodTrim
  );
  door.position.set(-0.9, 0.56 + 1.07, d / 2 + 0.11);
  door.receiveShadow = true;
  group.add(door);

  const awning = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(2.55, 0.12, 1.5), 2.55, 0.12, 1.5, 2.2, 2.2),
    materials.roof
  );
  awning.position.set(-0.9, 0.56 + 2.5, d / 2 + 0.7);
  awning.rotation.x = 0.22;
  awning.castShadow = true;
  awning.receiveShadow = true;
  group.add(awning);

  // Porch timber support pillars with diagonal carved knee braces & caged porch lamp
  const pillarGeo = new THREE.CylinderGeometry(0.075, 0.088, 2.02, 8);
  for (const px of [-2.02, 0.22]) {
    const pillar = new THREE.Mesh(pillarGeo, materials.woodTrim);
    pillar.position.set(px, 0.46 + 1.01, d / 2 + 1.24);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    // Angled carpentry knee brace supporting awning
    const brace = new THREE.Mesh(
      createBeveledBoxGeo(0.08, 0.48, 0.08, 0.015, 0.01),
      materials.woodTrim
    );
    brace.position.set(px, 0.46 + 1.82, d / 2 + 1.04);
    brace.rotation.x = 0.72;
    group.add(brace);
  }
  const porchCage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.11, 0.08, 10),
    materials.grimeMetal
  );
  porchCage.position.set(-0.9, 0.56 + 2.41, d / 2 + 0.32);
  const porchBulbMat = new THREE.MeshStandardMaterial({
    color: lot.litWindow ? 0xffe2a8 : 0x5c6670,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: lot.litWindow ? 0xf29f46 : 0x101820,
    emissiveIntensity: lot.litWindow ? 2.4 : 0.15,
    roughness: 0.3,
  });
  const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), porchBulbMat);
  porchBulb.position.set(-0.9, 0.56 + 2.33, d / 2 + 0.32);
  group.add(porchCage, porchBulb);

  // Exposed roof eaves rafter tails along front & back fascia for rich architectural depth
  const rafterGeo = createBeveledBoxGeo(0.1, 0.14, 0.54, 0.02, 0.012);
  for (let rx = -w / 2 + 0.4; rx <= w / 2 - 0.35; rx += 1.25) {
    const rFront = new THREE.Mesh(rafterGeo, materials.woodTrim);
    rFront.position.set(rx, 0.56 + h - 0.06, d / 2 + 0.24);
    group.add(rFront);
  }

  // 6. Framed windows with carved Soviet casings (наличники) & curtained glass
  const isCrimsonExeWindow = lot.litWindow && Number(lot.number) % 2 === 1;
  const winGlowMat = isCrimsonExeWindow
    ? materials.windowCrimson
    : lot.litWindow
      ? materials.windowWarm
      : materials.windowDark;

  const frameGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(1.52, 1.42, 0.15),
    1.52,
    1.42,
    0.15,
    1.4,
    1.4
  );
  const pedimentGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(1.74, 0.18, 0.22),
    1.74,
    0.18,
    0.22,
    1.6,
    0.6
  );
  const sillGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(1.66, 0.12, 0.26),
    1.66,
    0.12,
    0.26,
    1.6,
    1.0
  );

  const addWindow = (wx: number, wy: number, wz: number, rotY = 0) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(wx, wy, wz);
    winGroup.rotation.y = rotY;
    const frame = new THREE.Mesh(frameGeo, materials.woodTrim);
    frame.castShadow = true;
    const pediment = new THREE.Mesh(pedimentGeo, materials.woodTrim);
    pediment.position.set(0, 0.78, 0.04);
    pediment.castShadow = true;
    const sill = new THREE.Mesh(sillGeo, materials.concrete);
    sill.position.set(0, -0.72, 0.06);
    sill.castShadow = true;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.12, 0.08), winGlowMat);
    pane.position.z = 0.05;
    const mullionV = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.14, 0.1),
      materials.woodTrim
    );
    mullionV.position.z = 0.07;
    const mullionH = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.08, 0.1),
      materials.woodTrim
    );
    mullionH.position.set(0, 0.14, 0.07);

    // Traditional Russian carved wooden shutters (ставни) slightly ajar with iron hinges
    const shutterGeo = createBeveledBoxGeo(0.46, 1.24, 0.06, 0.02, 0.01, 1.0);
    for (const side of [-1, 1]) {
      const shutter = new THREE.Mesh(shutterGeo, materials.woodTrim);
      shutter.position.set(side * 0.94, 0.0, 0.12);
      shutter.rotation.y = side * -0.26;
      shutter.castShadow = true;
      shutter.receiveShadow = true;
      const hinge = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 0.08),
        materials.grimeMetal
      );
      hinge.position.set(-side * 0.2, 0.36, 0.02);
      shutter.add(hinge);
      winGroup.add(shutter);
    }

    winGroup.add(frame, pediment, sill, pane, mullionV, mullionH);
    group.add(winGroup);
  };

  addWindow(1.45, 0.56 + 1.65, d / 2 + 0.04, 0);
  addWindow(-w / 2 - 0.04, 0.56 + 1.65, 0.6, -Math.PI / 2);
  addWindow(w / 2 + 0.04, 0.56 + 1.65, 0.6, Math.PI / 2);

  // 6b. Porch 3-riser steps + wooden handrail & balusters + foundation basement air vents
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(
      createBeveledBoxGeo(2.2, 0.14, 0.34, 0.015, 0.008, 1.4),
      materials.concrete
    );
    step.position.set(-0.9, 0.07 + s * 0.14, d / 2 + 1.84 - s * 0.28);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }
  const railBar = new THREE.Mesh(
    createBeveledBoxGeo(0.08, 0.07, 1.32, 0.01, 0.008, 1.0),
    materials.woodTrim
  );
  railBar.position.set(0.22, 1.24, d / 2 + 0.66);
  group.add(railBar);
  for (let b = 0; b < 4; b++) {
    const bal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.028, 0.78, 6),
      materials.woodTrim
    );
    bal.position.set(0.22, 0.85, d / 2 + 0.2 + b * 0.3);
    group.add(bal);
  }

  // Carved gable bargeboard trim beams framing the front pitched roof overhang
  const bargeGeo = createBeveledBoxGeo(slopeLen + 0.1, 0.19, 0.08, 0.02, 0.01, 1.6);
  const bargeL = new THREE.Mesh(bargeGeo, materials.woodTrim);
  bargeL.position.set(-(w / 4 + overhang * 0.22), 0.56 + h + roofH / 2 - 0.15, d / 2 + overhang * 0.9);
  bargeL.rotation.z = slopeAngle;
  const bargeR = new THREE.Mesh(bargeGeo, materials.woodTrim);
  bargeR.position.set(w / 4 + overhang * 0.22, 0.56 + h + roofH / 2 - 0.15, d / 2 + overhang * 0.9);
  bargeR.rotation.z = -slopeAngle;
  group.add(bargeL, bargeR);

  // Foundation crawlspace steel air vents + exterior Soviet electrical meter box & conduit
  for (const vx of [-w * 0.34, w * 0.32]) {
    const vent = new THREE.Mesh(
      createBeveledBoxGeo(0.34, 0.18, 0.06, 0.02, 0.008, 0.6),
      materials.grimeMetal
    );
    vent.position.set(vx, 0.28, d / 2 + 0.19);
    group.add(vent);
  }
  const meterBox = new THREE.Mesh(
    createBeveledBoxGeo(0.36, 0.48, 0.16, 0.03, 0.012, 0.6),
    materials.grimeMetal
  );
  meterBox.position.set(w / 2 - 0.52, 0.56 + 1.38, d / 2 + 0.08);
  const meterPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, h - 0.8, 6),
    materials.grimeMetal
  );
  meterPipe.position.set(w / 2 - 0.52, 0.56 + 1.38 + (h - 0.8) / 2, d / 2 + 0.06);
  group.add(meterBox, meterPipe);

  // Rooftop 1994 Soviet Yagi TV antenna on even-numbered houses for rich skyline silhouette
  if (houseNum % 2 === 0) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.032, 2.35, 6),
      materials.grimeMetal
    );
    mast.position.set(-w * 0.18, 0.56 + h + roofH + 1.05, d * 0.12);
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.55, 6),
      materials.grimeMetal
    );
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-w * 0.18, 0.56 + h + roofH + 2.05, d * 0.12);
    group.add(mast, boom);
    for (let el = -2; el <= 2; el++) {
      const dip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 1.05 - Math.abs(el) * 0.14, 5),
        materials.grimeMetal
      );
      dip.rotation.x = Math.PI / 2;
      dip.position.set(-w * 0.18 + el * 0.3, 0.56 + h + roofH + 2.05, d * 0.12);
      group.add(dip);
    }
  }

  // 7. Soviet blue-enamel house number plate beside front door
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 128;
  signCanvas.height = 64;
  const sctx = signCanvas.getContext('2d')!;
  sctx.fillStyle = '#1d324d';
  sctx.fillRect(0, 0, 128, 64);
  sctx.strokeStyle = '#ece7dc';
  sctx.lineWidth = 4;
  sctx.strokeRect(4, 4, 120, 56);
  sctx.fillStyle = '#ece7dc';
  sctx.font = 'bold 34px monospace';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText(`#${lot.number}`, 64, 34);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.34),
    new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.42,
      metalness: 0.28,
      emissive: 0x223344,
      emissiveIntensity: 0.35,
    })
  );
  signMesh.position.set(0.15, 0.56 + 2.15, d / 2 + 0.07);
  group.add(signMesh);

  return group;
}

/**
 * Rebuilt zero-Z-fight, uniform-UV wooden fence run:
 * - Slim 0.10m picket panel strictly inset between real 0.22m timber posts (zero coplanar faces!)
 * - Exact meter-based box UVs (2.4m x 1.55m) so boards never stretch or squish on ends
 * - Proud horizontal timber rails (0.16m thick) and capped intermediate support posts every 3.5m
 * - Full shadow casting and receiving across every plank, post, cap, and rail
 */
export function createFenceRun(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height: number,
  materials: WorldMaterialSet
): THREE.Group {
  const group = new THREE.Group();
  const lenX = maxX - minX;
  const lenZ = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  group.position.set(cx, 0, cz);

  const alongZ = lenZ >= lenX;
  const span = alongZ ? lenZ : lenX;

  const POST_SIZE = 0.22;
  const POST_H = height + 0.16;
  const PANEL_THICK = 0.1;
  const RAIL_THICK = 0.16;
  const innerSpan = Math.max(0.2, span - POST_SIZE);

  // 1. Main wooden plank panel strictly fitted between end posts (no end-face Z-fighting!)
  const px = alongZ ? PANEL_THICK : innerSpan;
  const pz = alongZ ? innerSpan : PANEL_THICK;
  const panelGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(px, height, pz),
    px,
    height,
    pz,
    2.4,
    height
  );
  const panel = new THREE.Mesh(panelGeo, materials.fence);
  panel.position.y = height / 2;
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);

  // 2. Top & bottom proud horizontal timber cross-rails (0.16m > 0.10m panel, zero overlap flicker)
  const rx = alongZ ? RAIL_THICK : innerSpan;
  const rz = alongZ ? innerSpan : RAIL_THICK;
  const railGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(rx, 0.09, rz),
    rx,
    0.09,
    rz,
    2.0,
    0.6
  );
  const topRail = new THREE.Mesh(railGeo, materials.woodTrim);
  topRail.position.y = height - 0.18;
  topRail.castShadow = true;
  topRail.receiveShadow = true;

  const bottomRail = new THREE.Mesh(railGeo, materials.woodTrim);
  bottomRail.position.y = 0.22;
  bottomRail.castShadow = true;
  bottomRail.receiveShadow = true;
  group.add(topRail, bottomRail);

  // 3. Real weathered timber posts + wider protective wood caps at ends & intermediate spans
  const postGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(POST_SIZE, POST_H, POST_SIZE),
    POST_SIZE,
    POST_H,
    POST_SIZE,
    0.9,
    1.6
  );
  const capGeo = applyWorldBoxUVs(
    new THREE.BoxGeometry(POST_SIZE + 0.06, 0.065, POST_SIZE + 0.06),
    POST_SIZE + 0.06,
    0.065,
    POST_SIZE + 0.06,
    0.8,
    0.8
  );

  const segmentCount = Math.max(1, Math.round(span / 3.6));
  const halfOffset = span / 2 - POST_SIZE / 2;
  for (let i = 0; i <= segmentCount; i++) {
    const t = segmentCount === 0 ? 0 : i / segmentCount;
    const offset = -halfOffset + t * (halfOffset * 2);

    const post = new THREE.Mesh(postGeo, materials.woodTrim);
    const cap = new THREE.Mesh(capGeo, materials.woodTrim);
    if (alongZ) {
      post.position.set(0, POST_H / 2, offset);
      cap.position.set(0, POST_H + 0.032, offset);
    } else {
      post.position.set(offset, POST_H / 2, 0);
      cap.position.set(offset, POST_H + 0.032, 0);
    }
    post.castShadow = true;
    post.receiveShadow = true;
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(post, cap);
  }

  return group;
}

export function createStreetlamp(
  spec: LampSpec,
  materials: WorldMaterialSet
): {
  group: THREE.Group;
  bulbMat: THREE.MeshStandardMaterial;
  pointLight?: THREE.PointLight;
} {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  const dir = spec.armDirX;

  // 1. Octagonal weathered concrete plinth + steel mounting collar
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 0.72, 8),
    materials.concrete
  );
  plinth.position.y = 0.36;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const collarRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.25, 0.14, 10),
    materials.grimeMetal
  );
  collarRing.position.y = 0.76;
  group.add(collarRing);

  // 2. Tapered Soviet concrete utility pole with service hatch box
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.185, 6.45, 10),
    materials.concrete
  );
  pole.position.y = 3.92;
  pole.castShadow = true;
  pole.receiveShadow = true;
  group.add(pole);

  const hatch = new THREE.Mesh(
    createBeveledBoxGeo(0.18, 0.44, 0.09, 0.02, 0.008, 0.6),
    materials.grimeMetal
  );
  hatch.position.set(dir * 0.15, 1.45, 0);
  group.add(hatch);

  // Weathered 1994 paper missing-person / utility flyer wrapped on the lower pole + steel climbing rungs
  const flyer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.176, 0.18, 0.32, 12, 1, true, -0.9, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xc8c0ae, roughness: 0.86, metalness: 0.02 })
  );
  flyer.position.y = 1.95;
  flyer.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  group.add(flyer);

  for (let r = 0; r < 5; r++) {
    const rung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6),
      materials.grimeMetal
    );
    rung.rotation.z = Math.PI / 2;
    rung.position.set((r % 2 === 0 ? 1 : -1) * 0.14, 2.7 + r * 0.68, 0.04);
    group.add(rung);
  }

  // 3. Porcelain power-line insulator crossarm near top of pole
  const crossArm = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(0.1, 0.08, 0.72), 0.1, 0.08, 0.72, 1.0, 0.5),
    materials.grimeMetal
  );
  crossArm.position.set(0, 6.55, 0);
  group.add(crossArm);
  for (const iz of [-0.28, 0.28]) {
    const insulator = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.036, 0],
          [0.056, 0.035],
          [0.035, 0.07],
          [0.052, 0.105],
          [0.022, 0.135],
        ],
        10
      ),
      materials.frostedGlass
    );
    insulator.position.set(0, 6.59, iz);
    group.add(insulator);
  }

  // 4. Curved Soviet gooseneck tubular bracket arm (ЖКУ-08 cobra profile) + diagonal brace
  const gooseneckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 6.72, 0),
    new THREE.Vector3(dir * 0.45, 7.22, 0),
    new THREE.Vector3(dir * 1.25, 7.42, 0),
    new THREE.Vector3(dir * 1.98, 7.36, 0),
  ]);
  const armTube = new THREE.Mesh(
    new THREE.TubeGeometry(gooseneckCurve, 14, 0.042, 8, false),
    materials.grimeMetal
  );
  armTube.castShadow = true;
  group.add(armTube);

  const braceCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(dir * 0.06, 6.22, 0),
    new THREE.Vector3(dir * 0.82, 7.24, 0),
  ]);
  const brace = new THREE.Mesh(
    new THREE.TubeGeometry(braceCurve, 6, 0.024, 6, false),
    materials.grimeMetal
  );
  group.add(brace);

  // 5. Sculpted tapered cast-aluminum cobra luminaire hood with dorsal fin & ribbed diffuser
  const cobraGroup = new THREE.Group();
  cobraGroup.position.set(dir * 2.02, 7.32, 0);
  cobraGroup.rotation.z = -dir * 0.08;
  group.add(cobraGroup);

  const hoodUpper = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    materials.grimeMetal
  );
  hoodUpper.scale.set(1.55, 0.52, 0.72);
  hoodUpper.position.y = 0.02;
  hoodUpper.castShadow = true;
  cobraGroup.add(hoodUpper);

  const hoodRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.27, 0.08, 12),
    materials.grimeMetal
  );
  hoodRim.scale.set(1.85, 1.0, 0.82);
  hoodRim.position.y = -0.02;
  cobraGroup.add(hoodRim);

  // 6. Glowing curved frosted-glass sodium-amber diffuser lens
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffd89e,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    emissive: 0xea983d,
    emissiveIntensity: 1.55,
    roughness: 0.28,
    metalness: 0.06,
  });
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
    bulbMat
  );
  bulb.scale.set(1.75, 0.62, 0.76);
  bulb.position.y = -0.04;
  cobraGroup.add(bulb);

  // 7. Smooth Fresnel-faded volumetric sodium mist cone (subtle drizzle atmosphere)
  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffb45c) },
      uOpacity: { value: 0.12 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.25);
        float vertical = pow(clamp(vUv.y, 0.0, 1.0), 1.95) * smoothstep(1.0, 0.86, vUv.y);
        float alpha = fresnel * vertical * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.4, 7.2, 24, 1, true), coneMat);
  cone.position.set(dir * 2.02, 3.66, 0);
  group.add(cone);

  // Warm radial ground light pool on the wet asphalt beneath the lamp
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const pctx = poolCanvas.getContext('2d')!;
  const pgrad = pctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  pgrad.addColorStop(0, 'rgba(255, 184, 96, 0.34)');
  pgrad.addColorStop(0.45, 'rgba(232, 146, 56, 0.14)');
  pgrad.addColorStop(1, 'rgba(232, 146, 56, 0)');
  pctx.fillStyle = pgrad;
  pctx.fillRect(0, 0, 128, 128);
  const poolMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 9.6),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(poolCanvas),
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.set(dir * 2.02, 0.041, 0);
  group.add(poolMesh);

  let pointLight: THREE.PointLight | undefined;
  if (spec.hasPointLight) {
    pointLight = new THREE.PointLight(0xf29f46, 15, 22, 1.85);
    pointLight.position.set(dir * 2.02, 6.75, 0);
    group.add(pointLight);
  }

  return { group, bulbMat, pointLight };
}

export function createTransformerTower(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-11.2, 0, 0);

  const warningMat = new THREE.MeshStandardMaterial({
    color: 0xff5a42,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: 0xe62b2b,
    emissiveIntensity: 1.65,
    roughness: 0.22,
  });

  // Base weathered concrete bunker cabin
  const bunker = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(2.6, 3.2, 2.8), 2.6, 3.2, 2.8, 2.4, 2.4),
    materials.concrete
  );
  bunker.position.y = 1.6;
  bunker.castShadow = true;
  bunker.receiveShadow = true;
  group.add(bunker);

  // Heavy riveted steel substation access door facing street (+X) + louvers + Soviet warning sign
  const steelDoor = new THREE.Mesh(
    createBeveledBoxGeo(0.12, 2.15, 1.15, 0.03, 0.015, 1.2),
    materials.grimeMetal
  );
  steelDoor.position.set(1.32, 1.12, 0);
  group.add(steelDoor);

  const warnCanvas = document.createElement('canvas');
  warnCanvas.width = 192;
  warnCanvas.height = 192;
  const wctx = warnCanvas.getContext('2d')!;
  wctx.fillStyle = '#e5b82e';
  wctx.fillRect(0, 0, 192, 192);
  wctx.strokeStyle = '#14161a';
  wctx.lineWidth = 14;
  wctx.strokeRect(8, 8, 176, 176);
  // High-voltage lightning bolt icon
  wctx.fillStyle = '#c42424';
  wctx.beginPath();
  wctx.moveTo(106, 26);
  wctx.lineTo(66, 98);
  wctx.lineTo(96, 98);
  wctx.lineTo(78, 152);
  wctx.lineTo(130, 82);
  wctx.lineTo(98, 82);
  wctx.closePath();
  wctx.fill();
  wctx.fillStyle = '#111418';
  wctx.font = 'bold 20px monospace';
  wctx.textAlign = 'center';
  wctx.fillText('НЕ ВЛЕЗАЙ', 96, 174);
  const warnTex = new THREE.CanvasTexture(warnCanvas);
  warnTex.colorSpace = THREE.SRGBColorSpace;
  const warnSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.56),
    new THREE.MeshStandardMaterial({ map: warnTex, roughness: 0.45, metalness: 0.2 })
  );
  warnSign.rotation.y = Math.PI / 2;
  warnSign.position.set(1.39, 1.56, 0);
  group.add(warnSign);

  // Rusted steel roof cap + 3 ceramic high-voltage rooftop transformer bushings
  const cap = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(2.9, 0.25, 3.1), 2.9, 0.25, 3.1, 2.0, 2.0),
    materials.grimeMetal
  );
  cap.position.y = 3.3;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  for (const bz of [-0.72, 0, 0.72]) {
    const bushing = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.09, 0],
          [0.12, 0.1],
          [0.075, 0.18],
          [0.115, 0.26],
          [0.07, 0.34],
          [0.105, 0.42],
          [0.04, 0.52],
        ],
        10
      ),
      materials.frostedGlass
    );
    bushing.position.set(0.75, 3.42, bz);
    group.add(bushing);
  }

  // Tall lattice mast rising 14m into midnight fog with steel X-bracing
  const legGeo = new THREE.CylinderGeometry(0.08, 0.14, 11.5, 6);
  const offsets: [number, number][] = [
    [-0.65, -0.65],
    [0.65, -0.65],
    [-0.65, 0.65],
    [0.65, 0.65],
  ];
  for (const [ox, oz] of offsets) {
    const leg = new THREE.Mesh(legGeo, materials.grimeMetal);
    leg.position.set(ox * 0.75, 9.0, oz * 0.75);
    leg.rotation.z = ox * 0.055;
    leg.rotation.x = -oz * 0.055;
    leg.castShadow = true;
    group.add(leg);
  }

  // Horizontal & diagonal steel cross-struts up the pylon
  for (let tier = 0; tier < 5; tier++) {
    const ty = 4.6 + tier * 2.15;
    const span = Math.max(0.75, 1.35 - tier * 0.12);
    const strutX = new THREE.Mesh(
      new THREE.BoxGeometry(span, 0.07, 0.07),
      materials.grimeMetal
    );
    strutX.position.set(0, ty, span * 0.45);
    const strutX2 = strutX.clone();
    strutX2.position.z = -span * 0.45;
    const diag = new THREE.Mesh(
      new THREE.BoxGeometry(span * 1.28, 0.055, 0.055),
      materials.grimeMetal
    );
    diag.position.set(0, ty + 1.0, span * 0.42);
    diag.rotation.z = tier % 2 === 0 ? 0.85 : -0.85;
    group.add(strutX, strutX2, diag);
  }

  for (const y of [8.2, 11.4, 13.8]) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, 0.14),
      materials.grimeMetal
    );
    bar.position.y = y;
    bar.castShadow = true;
    group.add(bar);
    // Hanging ceramic insulator chains at crossarm tips
    for (const side of [-1.55, 1.55]) {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.07, 0.42, 8),
        materials.frostedGlass
      );
      chain.position.set(side, y - 0.25, 0);
      group.add(chain);
    }
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), warningMat);
  beacon.position.y = 14.9;
  group.add(beacon);

  return group;
}

export function createObjectiveShrine(
  labelColor: number,
  materials: WorldMaterialSet,
  kind: ObjectiveKind = 'interact'
): {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  ringMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  corePivot?: THREE.Group;
  zoneFillMat?: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();
  const accentHex =
    kind === 'destroy' ? 0xf25c3b : kind === 'hold' ? 0x3fd4c6 : labelColor;

  // Cast-iron bolted pedestal base + tapered fluted column
  const plinth = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.36, 0.0],
        [0.34, 0.12],
        [0.24, 0.18],
        [0.14, 0.28],
        [0.12, 1.05],
        [0.22, 1.14],
      ],
      14
    ),
    materials.grimeMetal
  );
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: accentHex,
    emissiveIntensity: kind === 'destroy' ? 1.85 : 1.5,
    roughness: 0.18,
    metalness: 0.15,
  });

  let corePivot: THREE.Group | undefined;
  let zoneFillMat: THREE.MeshBasicMaterial | undefined;

  if (kind === 'destroy') {
    // Shoot-to-destroy Anomaly Core Cage: floating glowing crystal core + angled steel ribs
    const cradle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.34, 0.24, 12),
      materials.grimeMetal
    );
    cradle.position.y = 1.22;
    group.add(cradle);

    corePivot = new THREE.Group();
    corePivot.position.y = 1.92;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 1), beaconMat);
    crystal.castShadow = true;
    corePivot.add(crystal);

    for (let i = 0; i < 3; i++) {
      const cageRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.036, 8, 22),
        materials.grimeMetal
      );
      cageRing.rotation.set(i * 1.05, i * 0.85, i * 0.6);
      corePivot.add(cageRing);
    }
    group.add(corePivot);

    // 4 flanking armored fins framing the destructible core
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.22), materials.grimeMetal);
      fin.position.set(Math.cos(a) * 0.52, 1.75, Math.sin(a) * 0.52);
      fin.rotation.y = -a;
      group.add(fin);
    }
  } else {
    // Beveled industrial Soviet electrical enclosure with recessed door rim & latch handle
    const cabinet = new THREE.Mesh(
      createBeveledBoxGeo(0.8, 0.96, 0.48, 0.08, 0.04),
      materials.grimeMetal
    );
    cabinet.position.y = 1.54;
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);

    const doorTrim = new THREE.Mesh(
      createBeveledBoxGeo(0.68, 0.82, 0.06, 0.04, 0.015),
      materials.concrete
    );
    doorTrim.position.set(0, 1.54, 0.24);
    group.add(doorTrim);

    // Analog Soviet voltmeter dial mounted on front cabinet panel
    const gaugeCanvas = document.createElement('canvas');
    gaugeCanvas.width = 128;
    gaugeCanvas.height = 128;
    const gctx = gaugeCanvas.getContext('2d')!;
    gctx.fillStyle = '#e7dfcd';
    gctx.beginPath();
    gctx.arc(64, 64, 58, 0, Math.PI * 2);
    gctx.fill();
    gctx.strokeStyle = '#1d222b';
    gctx.lineWidth = 6;
    gctx.stroke();
    gctx.strokeStyle = '#c93b3b';
    gctx.lineWidth = 4;
    gctx.beginPath();
    gctx.arc(64, 64, 42, Math.PI * 1.15, Math.PI * 1.85);
    gctx.stroke();
    gctx.strokeStyle = '#11151d';
    gctx.lineWidth = 4;
    gctx.beginPath();
    gctx.moveTo(64, 72);
    gctx.lineTo(94, 34);
    gctx.stroke();
    const gaugeTex = new THREE.CanvasTexture(gaugeCanvas);
    gaugeTex.colorSpace = THREE.SRGBColorSpace;
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, 0.035, 16),
      [
        materials.grimeMetal,
        new THREE.MeshStandardMaterial({ map: gaugeTex, roughness: 0.35, metalness: 0.1 }),
        materials.grimeMetal,
      ]
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(0, 1.72, 0.275);
    group.add(gauge);

    for (const side of [-1, 1]) {
      const conduitCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.38, 1.38, -0.02),
        new THREE.Vector3(side * 0.56, 1.16, 0.04),
        new THREE.Vector3(side * 0.48, 0.62, -0.04),
        new THREE.Vector3(side * 0.24, 0.08, 0),
      ]);
      const conduit = new THREE.Mesh(
        new THREE.TubeGeometry(conduitCurve, 14, 0.032, 8, false),
        materials.grimeMetal
      );
      conduit.castShadow = true;
      group.add(conduit);

      const insulator = new THREE.Mesh(
        createLatheProfileGeo(
          [
            [0.055, 0],
            [0.068, 0.05],
            [0.045, 0.09],
            [0.066, 0.14],
            [0.042, 0.18],
            [0.052, 0.23],
            [0.015, 0.27],
          ],
          10
        ),
        materials.frostedGlass
      );
      insulator.position.set(side * 0.27, 2.02, 0);
      group.add(insulator);
    }

    const beaconCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.19, 0.09, 14),
      materials.grimeMetal
    );
    beaconCollar.position.y = 2.05;
    const lamp = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.135, 0],
          [0.14, 0.14],
          [0.125, 0.24],
          [0.08, 0.3],
          [0.005, 0.32],
        ],
        14
      ),
      beaconMat
    );
    lamp.position.y = 2.09;
    const guardRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.165, 0.014, 6, 16),
      materials.grimeMetal
    );
    guardRing.rotation.x = Math.PI / 2;
    guardRing.position.y = 2.24;
    group.add(beaconCollar, lamp, guardRing);

    // Tall parabolic radio dish & telemetry mast for Hold-the-Zone uplinks
    if (kind === 'hold') {
      const dishMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.042, 1.05, 8),
        materials.grimeMetal
      );
      dishMast.position.set(0, 2.55, -0.16);
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4),
        materials.grimeMetal
      );
      dish.rotation.x = Math.PI * 0.65;
      dish.position.set(0, 2.95, -0.12);
      const feedHorn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.02, 0.28, 8),
        beaconMat
      );
      feedHorn.rotation.x = -0.35;
      feedHorn.position.set(0, 2.92, 0.08);
      group.add(dishMast, dish, feedHorn);

      // Translucent ground capture zone fill disc showing exact 4.8m hold radius
      zoneFillMat = new THREE.MeshBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const zoneDisc = new THREE.Mesh(new THREE.CircleGeometry(4.55, 40), zoneFillMat);
      zoneDisc.rotation.x = -Math.PI / 2;
      zoneDisc.position.y = 0.038;
      group.add(zoneDisc);
    }
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: kind === 'hold' ? 0.72 : 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(
    kind === 'hold'
      ? new THREE.RingGeometry(4.45, 4.78, 48)
      : new THREE.RingGeometry(0.95, 1.22, 28),
    ringMat
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.046;
  group.add(ringMesh);

  // Tall soft Fresnel vertical beacon beam so players can spot active objectives above fences
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(accentHex) },
      uOpacity: { value: 0.28 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.7);
        float vertical = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.45);
        gl_FragColor = vec4(uColor, fresnel * vertical * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const beamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.55, 13.5, 16, 1, true),
    beamMat
  );
  beamMesh.position.y = 8.4;
  group.add(beamMesh);

  return { group, beaconMat, ringMesh, beamMesh, corePivot, zoneFillMat };
}

/**
 * 3D Sculpted Rotating World Pickup (Beveled Soviet Ammo Tin, Rounded Enamel Medkit, Vacuum-Tube Resonator)
 */
export function createPickupModel(kind: PickupKind): {
  group: THREE.Group;
  spinPivot: THREE.Group;
} {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.58;
  group.add(spinPivot);

  const colorHex =
    kind === 'ammo' ? 0xe8963a : kind === 'medkit' ? 0x45d68a : 0xff2b3a;

  const pMats = getPickupMaterials();
  if (kind === 'ammo') {
    const body = new THREE.Mesh(
      createBeveledBoxGeo(0.46, 0.26, 0.28, 0.045, 0.02),
      pMats.ammoCrate
    );
    body.castShadow = true;
    const lid = new THREE.Mesh(
      createBeveledBoxGeo(0.49, 0.065, 0.31, 0.04, 0.015),
      pMats.ammoCrate
    );
    lid.position.y = 0.135;
    lid.castShadow = true;
    const band = new THREE.Mesh(
      createBeveledBoxGeo(0.475, 0.055, 0.295, 0.03, 0.008),
      pMats.ammoStripe
    );
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 0.16, 0),
      new THREE.Vector3(-0.11, 0.25, 0),
      new THREE.Vector3(0.11, 0.25, 0),
      new THREE.Vector3(0.14, 0.16, 0),
    ]);
    const handle = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 12, 0.014, 6, false),
      pMats.ammoStripe
    );
    // Brass cartridge row embossed on lid
    for (let b = -2; b <= 2; b++) {
      const shell = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, 0.065, 4, 6),
        pMats.ammoStripe
      );
      shell.rotation.x = Math.PI / 2;
      shell.position.set(b * 0.055, 0.175, 0.04);
      spinPivot.add(shell);
    }
    spinPivot.add(body, lid, band, handle);
  } else if (kind === 'medkit') {
    const shell = new THREE.Mesh(
      createBeveledBoxGeo(0.42, 0.34, 0.16, 0.065, 0.025),
      pMats.medkitCase
    );
    shell.castShadow = true;
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.16, 0),
      new THREE.Vector3(-0.08, 0.24, 0),
      new THREE.Vector3(0.08, 0.24, 0),
      new THREE.Vector3(0.1, 0.16, 0),
    ]);
    const handle = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 10, 0.016, 6, false),
      pMats.medkitCross
    );
    const crossH = new THREE.Mesh(
      createBeveledBoxGeo(0.22, 0.068, 0.185, 0.018, 0.008),
      pMats.medkitCross
    );
    const crossV = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.22, 0.185, 0.018, 0.008),
      pMats.medkitCross
    );
    for (const cx of [-0.14, 0.14]) {
      const clasp = new THREE.Mesh(
        createBeveledBoxGeo(0.04, 0.06, 0.18, 0.008, 0.005),
        pMats.ammoStripe
      );
      clasp.position.set(cx, 0.145, 0);
      spinPivot.add(clasp);
    }
    spinPivot.add(shell, handle, crossH, crossV);
  } else {
    // Sculpted 1994 Vacuum-Tube Resonator Core with twin gyroscopic copper rings
    const bulb = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.11, -0.22],
          [0.14, -0.14],
          [0.16, 0.0],
          [0.15, 0.13],
          [0.09, 0.22],
          [0.01, 0.25],
        ],
        16
      ),
      pMats.overclockCore
    );
    bulb.castShadow = true;
    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.022, 8, 22),
      pMats.overclockCore
    );
    ringA.rotation.x = Math.PI / 3;
    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.018, 8, 20),
      pMats.ammoStripe
    );
    ringB.rotation.y = Math.PI / 3;
    ringB.rotation.x = -Math.PI / 4;
    spinPivot.add(bulb, ringA, ringB);
  }

  // Ground beacon ring
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.46, 22),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.045;
  group.add(ringMesh);

  return { group, spinPivot };
}

/**
 * Lifelike Rooster Companion (Гриша / Ваня) with 1024px photorealistic plumage PBR,
 * layered breast ruff, swept tail sickles, serrated red comb, and full shadow casting.
 */
export function createRoosterModel(shadowTex: THREE.CanvasTexture): RoosterRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.38;
  group.add(bodyPivot);

  const rMaps = getRoosterMaps();

  const chestMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: 1.0,
    metalness: 0.14,
    sheen: 0.85,
    sheenColor: new THREE.Color(0xffb86b),
    sheenRoughness: 0.52,
  });
  rMaps.feathers.attach(chestMat, true);

  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xdca580,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 1.0,
    metalness: 0.2,
    iridescence: 0.35,
    iridescenceIOR: 1.35,
    sheen: 0.75,
  });
  rMaps.feathers.attach(wingMat, true);

  const neckMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd199,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 1.0,
    metalness: 0.18,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xffe1a8),
    sheenRoughness: 0.42,
  });
  rMaps.feathers.attach(neckMat, true);

  const tailMat = new THREE.MeshPhysicalMaterial({
    color: 0x2d786a,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 0.26,
    metalness: 0.48,
    iridescence: 0.85,
    iridescenceIOR: 1.4,
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
  });
  rMaps.feathers.attach(tailMat, false);

  const combMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: rMaps.combMap,
    normalMap: rMaps.combNormal,
    normalScale: new THREE.Vector2(1.1, 1.1),
    emissive: 0x3a0707,
    emissiveIntensity: 0.28,
    roughness: 0.38,
    metalness: 0.04,
    clearcoat: 0.35,
    clearcoatRoughness: 0.38,
  });
  const beakMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: rMaps.keratinMap,
    normalMap: rMaps.keratinNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.32,
    metalness: 0.14,
    clearcoat: 0.4,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x07080a,
    roughness: 0.04,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const earlobeMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.55 });

  // Smooth sculpted LatheGeometry avian keel & plump breast silhouette
  const torsoGeo = createLatheProfileGeo(
    [
      [0.01, -0.34],
      [0.11, -0.28],
      [0.19, -0.16],
      [0.235, 0.0],
      [0.24, 0.14],
      [0.18, 0.25],
      [0.09, 0.32],
      [0.01, 0.34],
    ],
    18
  );
  torsoGeo.rotateX(Math.PI / 2);
  const torso = new THREE.Mesh(torsoGeo, chestMat);
  torso.scale.set(0.86, 0.96, 1.0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Layered feathered saddle hackle ruff draping across breast & shoulders
  const breastRuff = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.19, -0.14],
        [0.175, -0.04],
        [0.145, 0.06],
        [0.1, 0.13],
      ],
      14
    ),
    neckMat
  );
  breastRuff.position.set(0, 0.09, 0.18);
  breastRuff.rotation.x = 0.48;
  breastRuff.castShadow = true;
  bodyPivot.add(breastRuff);

  // Articulated Neck -> Head hierarchy for natural avian head-bobbing & idle pecking
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.14, 0.21);
  bodyPivot.add(neckPivot);

  const neck = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.145, 0.0],
        [0.125, 0.08],
        [0.095, 0.17],
        [0.075, 0.24],
      ],
      14
    ),
    neckMat
  );
  neck.position.set(0, -0.02, 0.01);
  neck.rotation.x = 0.2;
  neck.castShadow = true;
  neckPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.22, 0.06);
  neckPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.108, 16, 14), neckMat);
  head.scale.set(0.88, 0.98, 1.12);
  head.castShadow = true;
  headPivot.add(head);

  // Sculpted 5-point serrated crimson comb
  for (let i = 0; i < 5; i++) {
    const lobe = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022 - i * 0.0022, 0.055 - i * 0.004, 5, 8),
      combMat
    );
    lobe.scale.set(0.55, 1.0, 0.9);
    lobe.position.set(0, 0.115 - i * 0.009, 0.048 - i * 0.032);
    lobe.rotation.x = -0.22 - i * 0.1;
    headPivot.add(lobe);
  }

  // Twin dangling crimson wattles & realistic pale earlobes
  for (const ws of [-1, 1]) {
    const wattle = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.045, 4, 8), combMat);
    wattle.position.set(ws * 0.028, -0.082, 0.078);
    wattle.rotation.z = ws * 0.16;
    const earlobe = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), earlobeMat);
    earlobe.scale.set(0.45, 1.1, 0.9);
    earlobe.position.set(ws * 0.088, -0.022, 0.018);
    headPivot.add(wattle, earlobe);
  }

  // Curved two-part keratin beak (arched upper mandible + lower mandible)
  const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.135, 12), beakMat);
  upperBeak.rotation.x = Math.PI / 2 + 0.16;
  upperBeak.scale.set(0.85, 1.0, 0.78);
  upperBeak.position.set(0, -0.006, 0.148);
  const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.095, 10), beakMat);
  lowerBeak.rotation.x = Math.PI / 2 - 0.04;
  lowerBeak.position.set(0, -0.03, 0.128);
  headPivot.add(upperBeak, lowerBeak);

  for (const es of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 12), eyeMat);
    eye.position.set(es * 0.078, 0.022, 0.05);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 6, 6), catchlightMat);
    glint.position.set(es * 0.012, 0.011, 0.015);
    eye.add(glint);
    headPivot.add(eye);
  }

  // Layered organic folded feather wings (sculpted profile blades — zero flat boxes!)
  const makeWing = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.19, 0.05, 0.02);

    const covert = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.082, 0.22, 6, 10),
      wingMat
    );
    covert.rotation.x = Math.PI / 2 - 0.15;
    covert.scale.set(0.45, 1.0, 1.15);
    covert.position.set(side * 0.04, 0.01, -0.04);
    covert.castShadow = true;
    pivot.add(covert);

    // 4 fanned iridescent primary flight feathers
    for (let f = 0; f < 4; f++) {
      const feather = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.022, 0.22 - f * 0.018, 4, 8),
        f >= 2 ? tailMat : wingMat
      );
      feather.rotation.x = Math.PI / 2 - 0.12 + f * 0.08;
      feather.scale.set(0.32, 1.0, 1.0);
      feather.position.set(side * (0.055 + f * 0.005), -0.025 - f * 0.02, -0.14 - f * 0.032);
      feather.castShadow = true;
      pivot.add(feather);
    }
    return pivot;
  };
  const leftWing = makeWing(1);
  const rightWing = makeWing(-1);
  bodyPivot.add(leftWing, rightWing);

  // 7 sweeping curved sickle tail plumes built with smooth CatmullRom TubeGeometry!
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.1, -0.27);
  bodyPivot.add(tailGroup);
  for (let i = -3; i <= 3; i++) {
    const splayX = i * 0.036;
    const archH = 0.34 - Math.abs(i) * 0.032;
    const reachZ = -0.34 + Math.abs(i) * 0.025;
    const plumeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(splayX * 0.3, 0.0, 0.0),
      new THREE.Vector3(splayX * 0.85, archH * 0.72, reachZ * 0.38),
      new THREE.Vector3(splayX * 1.35, archH, reachZ * 0.78),
      new THREE.Vector3(splayX * 1.65, archH * 0.56, reachZ * 1.15),
    ]);
    const plume = new THREE.Mesh(
      new THREE.TubeGeometry(plumeCurve, 12, 0.022 - Math.abs(i) * 0.0018, 6, false),
      i === 0 || Math.abs(i) === 2 ? tailMat : chestMat
    );
    plume.scale.set(0.55, 1.0, 1.25);
    plume.castShadow = true;
    tailGroup.add(plume);
  }

  // Articulated Avian Legs: Hip -> Feathered Drumstick -> Intertarsal Knee -> Scaly Shin -> Ankle + Sculpted Toes + Spur
  const makeRoosterLeg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.085, -0.13, 0.01);

    const drumstick = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.024, -0.115],
          [0.038, -0.07],
          [0.05, -0.02],
          [0.044, 0.01],
        ],
        10
      ),
      chestMat
    );
    drumstick.castShadow = true;
    hip.add(drumstick);

    const knee = new THREE.Group();
    knee.position.set(0, -0.11, 0);
    hip.add(knee);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.014, 0.14, 10),
      beakMat
    );
    shin.position.set(0, -0.07, 0);
    shin.castShadow = true;
    knee.add(shin);

    // Classic curved rooster rear spur
    const spur = new THREE.Mesh(new THREE.ConeGeometry(0.0085, 0.042, 8), beakMat);
    spur.position.set(0, -0.095, -0.022);
    spur.rotation.x = -1.1;
    knee.add(spur);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.14, 0);
    knee.add(ankle);

    // Three organic tapered forward toes + claws + rear hallux toe
    for (const angle of [-0.42, 0, 0.42]) {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.072, 4, 6), beakMat);
      toe.rotation.x = Math.PI / 2;
      toe.position.set(Math.sin(angle) * 0.036, 0.004, Math.cos(angle) * 0.042);
      toe.rotation.z = -angle;
      ankle.add(toe);
    }
    const backToe = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, 0.036, 4, 6), beakMat);
    backToe.rotation.x = Math.PI / 2;
    backToe.position.set(0, 0.004, -0.024);
    ankle.add(backToe);

    return { hip, knee, ankle };
  };

  const leftLegRig = makeRoosterLeg(1);
  const rightLegRig = makeRoosterLeg(-1);
  bodyPivot.add(leftLegRig.hip, rightLegRig.hip);

  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.038;
  group.add(shadowMesh);

  // Ensure weapon raycasts / bullet traces strictly pass through the rooster companion
  group.traverse((obj) => {
    obj.userData.ignoreBulletRaycast = true;
  });

  return {
    group,
    bodyPivot,
    neckPivot,
    headPivot,
    leftWing,
    rightWing,
    leftHip: leftLegRig.hip,
    leftKnee: leftLegRig.knee,
    leftAnkle: leftLegRig.ankle,
    rightHip: rightLegRig.hip,
    rightKnee: rightLegRig.knee,
    rightAnkle: rightLegRig.ankle,
    leftLeg: leftLegRig.hip,
    rightLeg: rightLegRig.hip,
    tailGroup,
    shadowMesh,
  };
}

/**
 * Sculpted AAA First-Person Tactical Gloved Hand & Weathered 1994 Soviet Parka Sleeve.
 */
function createGlovedHandRig(opts: {
  side: 'left' | 'right';
  palmPos: [number, number, number];
  wristDir: [number, number, number];
  gripStyle: 'forend' | 'pistol' | 'handle';
}): THREE.Group {
  const { leatherGlove, jacketSleeve, skinKnuckle } = getHandMaterials();
  const hand = new THREE.Group();
  hand.position.set(opts.palmPos[0], opts.palmPos[1], opts.palmPos[2]);
  const s = opts.side === 'left' ? -1 : 1;

  // Contoured matte leather glove palm cradling the weapon cleanly from below
  const palm = new THREE.Mesh(
    createBeveledBoxGeo(0.064, 0.042, 0.08, 0.016, 0.009, 0.24),
    leatherGlove
  );
  hand.add(palm);

  // Cleanly tucked dark leather gloved fingers curving around grip/forend (zero stray spikes)
  for (let i = 0; i < 4; i++) {
    const fz = -0.028 + i * 0.018;
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 8), skinKnuckle);
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.026, 4, 8), leatherGlove);
    if (opts.gripStyle === 'forend') {
      knuckle.position.set(s * 0.026, 0.01, fz);
      seg.position.set(s * 0.032, 0.026, fz);
      seg.rotation.z = -s * 0.35;
    } else if (opts.gripStyle === 'handle') {
      knuckle.position.set(0, -0.012, fz);
      seg.position.set(-s * 0.018, -0.02, fz);
      seg.rotation.z = s * 1.1;
    } else {
      knuckle.position.set(-s * 0.026, -0.008, fz);
      seg.position.set(-s * 0.034, -0.014, fz - 0.006);
      seg.rotation.z = s * 1.25;
    }
    hand.add(knuckle, seg);
  }

  // Wrapped gloved thumb hugging side of stock/forend
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.034, 5, 8), leatherGlove);
  thumb.position.set(-s * 0.024, 0.018, -0.024);
  thumb.rotation.set(0.55, -s * 0.2, s * 0.42);
  hand.add(thumb);

  // Dark leather wrist cuff & weathered Soviet storm-parka forearm sloping smoothly off-screen
  const wristVec = new THREE.Vector3(opts.wristDir[0], opts.wristDir[1], opts.wristDir[2]);
  const cuffEnd = wristVec.clone().multiplyScalar(0.22);
  const wristCurve = new THREE.CatmullRomCurve3([
    cuffEnd.clone().multiplyScalar(0.85),
    wristVec.clone().multiplyScalar(0.45),
    wristVec.clone().multiplyScalar(0.75),
    wristVec.clone(),
  ]);
  const cuffStrap = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.006, 0.024), cuffEnd]),
      6,
      0.031,
      10,
      false
    ),
    leatherGlove
  );
  const sleeve = new THREE.Mesh(
    new THREE.TubeGeometry(wristCurve, 12, 0.042, 12, false),
    jacketSleeve
  );
  hand.add(cuffStrap, sleeve);

  return hand;
}

/**
 * 5 AAA Sculpted First-Person 3D Weapon Viewmodels with triplanar-mapped MeshPhysicalMaterial
 * anisotropic blued steel, lacquered walnut, perforated barrel heatshields, side-saddle 12ga
 * shells, glowing tritium sights, iridescent optics, and articulated leather-gloved hands!
 */
export function createWeaponViewmodel(weaponId: WeaponId): WeaponRig {
  const group = new THREE.Group();

  const wMaps = getWeaponMaps();
  const gunmetal = new THREE.MeshPhysicalMaterial({
    color: 0xd5dce6,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughness: 0.92,
    metalness: 0.84,
    clearcoat: 0.26,
    clearcoatRoughness: 0.34,
    envMapIntensity: 1.65,
  });
  wMaps.metal.attach(gunmetal, true);

  const darkSteel = new THREE.MeshPhysicalMaterial({
    color: 0x86909e,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughness: 0.9,
    metalness: 0.88,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
    envMapIntensity: 1.55,
  });
  wMaps.metal.attach(darkSteel, true);

  const walnut = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: wMaps.woodMap,
    normalMap: wMaps.woodNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.52,
    metalness: 0.05,
    clearcoat: 0.56,
    clearcoatRoughness: 0.26,
  });

  const olivePolymer = new THREE.MeshPhysicalMaterial({
    color: 0x526b4b,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.58,
    metalness: 0.14,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
  });
  wMaps.metal.attach(olivePolymer, false);

  const brushedChrome = new THREE.MeshPhysicalMaterial({
    color: 0xebf1f8,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.18,
    metalness: 0.96,
    clearcoat: 0.5,
    clearcoatRoughness: 0.12,
    envMapIntensity: 2.1,
  });
  wMaps.metal.attach(brushedChrome, false);

  const brassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb88c3e,
    roughness: 0.3,
    metalness: 0.9,
    clearcoat: 0.28,
    envMapIntensity: 1.5,
  });

  const shellRedMat = new THREE.MeshPhysicalMaterial({
    color: 0x761519,
    roughness: 0.42,
    metalness: 0.06,
    clearcoat: 0.42,
    clearcoatRoughness: 0.32,
  });

  const opticGlass = new THREE.MeshPhysicalMaterial({
    color: 0x051014,
    emissive: 0x030c10,
    emissiveIntensity: 0.28,
    roughness: 0.05,
    metalness: 0.42,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    iridescence: 0.88,
    iridescenceIOR: 1.48,
    envMapIntensity: 2.0,
  });

  const accentAmber = new THREE.MeshStandardMaterial({
    color: 0xffa63d,
    emissive: 0xff9224,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  const tritiumGreen = new THREE.MeshStandardMaterial({
    color: 0x52ff9a,
    emissive: 0x26e678,
    emissiveIntensity: 1.05,
    roughness: 0.2,
  });

  const muzzlePoint = new THREE.Object3D();

  if (weaponId === 'shotgun') {
    // Beveled machined steel receiver with triplanar-mapped UVs (zero diagonal stretch!)
    const receiver = new THREE.Mesh(
      createBeveledBoxGeo(0.078, 0.096, 0.33, 0.016, 0.009, 0.38),
      gunmetal
    );
    receiver.position.set(0, 0.004, -0.05);

    // Side-saddle 4-shell 12-gauge holder mounted on left receiver wall (classic AAA visual anchor!)
    const saddlePlate = new THREE.Mesh(
      createBeveledBoxGeo(0.012, 0.058, 0.165, 0.004, 0.002, 0.2),
      darkSteel
    );
    saddlePlate.position.set(-0.042, 0.004, -0.055);
    group.add(saddlePlate);
    for (let sh = 0; sh < 4; sh++) {
      const sz = -0.115 + sh * 0.038;
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.052, 10), shellRedMat);
      hull.position.set(-0.052, 0.002, sz);
      const brassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.0102, 0.0102, 0.016, 10), brassMat);
      brassBase.position.set(-0.052, 0.032, sz);
      const clip = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0022, 6, 10), darkSteel);
      clip.rotation.x = Math.PI / 2;
      clip.position.set(-0.052, 0.002, sz);
      group.add(hull, brassBase, clip);
    }

    // Recessed ejection port + machined chrome bolt carrier + brass hull glint
    const ejectPort = new THREE.Mesh(
      createBeveledBoxGeo(0.012, 0.032, 0.092, 0.004, 0.002, 0.16),
      brushedChrome
    );
    ejectPort.position.set(0.039, 0.016, -0.055);
    const shellGlint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.048, 8),
      brassMat
    );
    shellGlint.rotation.x = Math.PI / 2;
    shellGlint.position.set(0.035, 0.014, -0.055);

    // Rear ghost-ring aperture iron sight with twin green tritium night dots!
    const rearSightBase = new THREE.Mesh(
      createBeveledBoxGeo(0.032, 0.014, 0.038, 0.004, 0.002, 0.12),
      darkSteel
    );
    rearSightBase.position.set(0, 0.058, 0.065);
    const ghostRing = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 6, 14), darkSteel);
    ghostRing.position.set(0, 0.072, 0.065);
    for (const ts of [-0.012, 0.012]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 6), tritiumGreen);
      dot.position.set(ts, 0.072, 0.07);
      group.add(dot);
    }

    // Ergonomic sculpted walnut stock with crisp wood-grain UVs
    const stockGeo = createProfileExtrudeGeo(
      [
        [0.09, 0.035],
        [0.14, 0.028],
        [0.34, -0.018],
        [0.35, -0.115],
        [0.17, -0.085],
        [0.13, -0.055],
        [0.08, -0.04],
      ],
      0.068,
      0.012,
      0.34
    );
    stockGeo.rotateY(-Math.PI / 2);
    const stock = new THREE.Mesh(stockGeo, walnut);

    // Rubber recoil buttpad
    const buttPad = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.102, 0.022, 0.012, 0.005, 0.2),
      darkSteel
    );
    buttPad.position.set(0, -0.066, 0.355);
    buttPad.rotation.x = 0.08;

    // Curved trigger guard & trigger blade
    const guardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.042, 0.07),
      new THREE.Vector3(0, -0.084, 0.05),
      new THREE.Vector3(0, -0.084, -0.015),
      new THREE.Vector3(0, -0.042, -0.035),
    ]);
    const triggerGuard = new THREE.Mesh(
      new THREE.TubeGeometry(guardCurve, 12, 0.0055, 6, false),
      darkSteel
    );
    const trigger = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.024, 4, 6), brushedChrome);
    trigger.position.set(0, -0.058, 0.028);
    trigger.rotation.x = 0.32;

    // Crowned heavy 12ga barrel + perforated steel heat-shield + ventilated top rib
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.64, 16), darkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.49);
    const heatShield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0255, 0.0265, 0.42, 16, 1, true, -Math.PI * 0.68, Math.PI * 1.36),
      gunmetal
    );
    heatShield.rotation.x = Math.PI / 2;
    heatShield.position.set(0, 0.034, -0.42);
    const muzzleCrown = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.004, 6, 14), brushedChrome);
    muzzleCrown.position.set(0, 0.032, -0.81);

    const topRib = new THREE.Mesh(
      createBeveledBoxGeo(0.018, 0.009, 0.62, 0.003, 0.002, 0.35),
      darkSteel
    );
    topRib.position.set(0, 0.062, -0.48);
    for (let r = 0; r < 5; r++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.016), darkSteel);
      post.position.set(0, 0.053, -0.24 - r * 0.125);
      group.add(post);
    }

    // Under-barrel tubular magazine + machined cap & barrel clamp
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.56, 12), gunmetal);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.012, -0.45);
    const magCap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.036, 12), brushedChrome);
    magCap.rotation.x = Math.PI / 2;
    magCap.position.set(0, -0.012, -0.735);
    const barrelClamp = new THREE.Mesh(
      createBeveledBoxGeo(0.048, 0.068, 0.028, 0.01, 0.004, 0.18),
      darkSteel
    );
    barrelClamp.position.set(0, 0.01, -0.68);

    // Contoured ribbed walnut pump forend + articulated left gloved hand attached directly to pump!
    const pumpGeo = createLatheProfileGeo(
      [
        [0.026, -0.115],
        [0.038, -0.095],
        [0.04, -0.05],
        [0.037, -0.02],
        [0.04, 0.01],
        [0.037, 0.04],
        [0.04, 0.07],
        [0.036, 0.1],
        [0.026, 0.115],
      ],
      16
    );
    pumpGeo.rotateX(Math.PI / 2);
    const pumpForend = new THREE.Mesh(pumpGeo, walnut);
    pumpForend.scale.set(1.0, 0.92, 1.0);
    pumpForend.position.set(0, -0.016, -0.4);

    // Left gloved support hand moves with the pump forend when racking a shell!
    const leftHand = createGlovedHandRig({
      side: 'left',
      palmPos: [-0.012, -0.046, 0.008],
      wristDir: [-0.28, -0.24, 0.36],
      gripStyle: 'forend',
    });
    pumpForend.add(leftHand);

    // Right gloved trigger hand tucked cleanly onto walnut stock wrist
    const rightHand = createGlovedHandRig({
      side: 'right',
      palmPos: [0.022, -0.072, 0.145],
      wristDir: [0.22, -0.26, 0.32],
      gripStyle: 'pistol',
    });

    const sight = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), accentAmber);
    sight.position.set(0, 0.071, -0.78);

    muzzlePoint.position.set(0, 0.032, -0.84);
    group.add(
      receiver,
      ejectPort,
      shellGlint,
      rearSightBase,
      ghostRing,
      stock,
      buttPad,
      triggerGuard,
      trigger,
      barrel,
      heatShield,
      muzzleCrown,
      topRib,
      magTube,
      magCap,
      barrelClamp,
      pumpForend,
      rightHand,
      sight,
      muzzlePoint
    );
    return { group, muzzlePoint, pumpForend, leftHand };
  }

  if (weaponId === 'awp') {
    const chassisGeo = createProfileExtrudeGeo(
      [
        [-0.36, 0.036],
        [0.06, 0.038],
        [0.14, 0.032],
        [0.34, 0.035],
        [0.35, -0.088],
        [0.2, -0.075],
        [0.14, -0.095],
        [0.08, -0.095],
        [0.05, -0.045],
        [-0.08, -0.058],
        [-0.35, -0.032],
      ],
      0.078,
      0.011,
      0.42
    );
    chassisGeo.rotateY(-Math.PI / 2);
    const chassis = new THREE.Mesh(chassisGeo, olivePolymer);

    // Top Picatinny rail teeth
    for (let t = 0; t < 12; t++) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.009, 0.012), darkSteel);
      lug.position.set(0, 0.046, -0.02 - t * 0.026);
      group.add(lug);
    }

    const cheekRest = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.034, 0.14, 0.012, 0.006, 0.2),
      darkSteel
    );
    cheekRest.position.set(0, 0.046, 0.24);
    const mag = new THREE.Mesh(
      createBeveledBoxGeo(0.056, 0.095, 0.11, 0.008, 0.004, 0.2),
      darkSteel
    );
    mag.position.set(0, -0.078, -0.14);
    mag.rotation.x = 0.08;

    // Free-floating fluted match barrel + ported multi-chamber muzzle brake
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.023, 0.78, 16), darkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.042, -0.68);
    // Machined barrel fluting ribs
    for (let fl = 0; fl < 4; fl++) {
      const ang = (fl / 4) * Math.PI * 2 + Math.PI / 4;
      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.56, 6), brushedChrome);
      flute.rotation.x = Math.PI / 2;
      flute.position.set(Math.cos(ang) * 0.018, 0.042 + Math.sin(ang) * 0.018, -0.64);
      group.add(flute);
    }

    const brake = new THREE.Mesh(
      createBeveledBoxGeo(0.044, 0.036, 0.095, 0.008, 0.004, 0.16),
      gunmetal
    );
    brake.position.set(0, 0.042, -1.08);
    for (const bz of [-1.055, -1.085, -1.11]) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.048, 8), darkSteel);
      port.rotation.z = Math.PI / 2;
      port.position.set(0, 0.042, bz);
      group.add(port);
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.22, 8), darkSteel);
      leg.rotation.x = Math.PI / 2 - 0.12;
      leg.position.set(side * 0.038, -0.044, -0.45);
      group.add(leg);
    }

    // Stepped LatheGeometry sniper scope + iridescent coated lenses + turrets + bubble level
    const scopeGeo = createLatheProfileGeo(
      [
        [0.028, -0.24],
        [0.027, -0.17],
        [0.02, -0.14],
        [0.02, 0.06],
        [0.036, 0.13],
        [0.037, 0.22],
        [0.033, 0.225],
      ],
      18
    );
    scopeGeo.rotateX(-Math.PI / 2);
    const scopeBody = new THREE.Mesh(scopeGeo, darkSteel);
    scopeBody.position.set(0, 0.118, -0.2);

    const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), opticGlass);
    objLens.position.set(0, 0.118, -0.422);
    objLens.rotation.y = Math.PI;
    const ocuLens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), opticGlass);
    ocuLens.position.set(0, 0.118, 0.039);
    const ocuEyecup = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055, 8, 18), darkSteel);
    ocuEyecup.position.set(0, 0.118, 0.042);
    group.add(ocuEyecup);

    const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.028, 12), gunmetal);
    turretTop.position.set(0, 0.146, -0.18);
    const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.026, 12), gunmetal);
    turretSide.rotation.z = Math.PI / 2;
    turretSide.position.set(0.028, 0.118, -0.18);
    const bubbleLevel = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.016, 8), darkSteel);
    bubbleLevel.rotation.z = Math.PI / 2;
    bubbleLevel.position.set(-0.028, 0.104, -0.11);

    for (const rz of [-0.09, -0.26]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 14), gunmetal);
      ring.position.set(0, 0.118, rz);
      const pillar = new THREE.Mesh(createBeveledBoxGeo(0.028, 0.048, 0.022, 0.004, 0.002, 0.12), gunmetal);
      pillar.position.set(0, 0.072, rz);
      group.add(ring, pillar);
    }

    const boltHandle = new THREE.Group();
    boltHandle.position.set(0.042, 0.038, 0.02);
    const boltRod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.062, 8), brushedChrome);
    boltRod.rotation.z = -Math.PI / 2.5;
    boltRod.position.x = 0.022;
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), darkSteel);
    boltKnob.position.set(0.048, -0.018, 0);
    boltHandle.add(boltRod, boltKnob);

    const leftHand = createGlovedHandRig({
      side: 'left',
      palmPos: [-0.014, -0.062, -0.28],
      wristDir: [-0.28, -0.24, 0.36],
      gripStyle: 'forend',
    });
    const rightHand = createGlovedHandRig({
      side: 'right',
      palmPos: [0.022, -0.088, 0.12],
      wristDir: [0.22, -0.26, 0.32],
      gripStyle: 'pistol',
    });

    muzzlePoint.position.set(0, 0.042, -1.14);
    group.add(
      chassis,
      cheekRest,
      mag,
      barrel,
      brake,
      scopeBody,
      objLens,
      ocuLens,
      turretTop,
      turretSide,
      bubbleLevel,
      boltHandle,
      leftHand,
      rightHand,
      muzzlePoint
    );
    return { group, muzzlePoint, boltHandle, magazine: mag, leftHand };
  }

  if (weaponId === 'pistol') {
    const frame = new THREE.Mesh(
      createBeveledBoxGeo(0.056, 0.048, 0.31, 0.01, 0.005, 0.32),
      darkSteel
    );
    frame.position.set(0, 0.004, -0.13);

    const slide = new THREE.Mesh(
      createBeveledBoxGeo(0.062, 0.058, 0.31, 0.014, 0.008, 0.32),
      brushedChrome
    );
    slide.position.set(0, 0.048, -0.125);
    for (let s = 0; s < 5; s++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.006), darkSteel);
      rib.position.set(0, 0.048, 0.005 - s * 0.013);
      slide.add(rib);
    }
    // Twin green tritium rear sights mounted on moving slide
    for (const ts of [-0.014, 0.014]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 6, 6), tritiumGreen);
      dot.position.set(ts, 0.082, 0.015);
      slide.add(dot);
    }

    const gripGeo = createProfileExtrudeGeo(
      [
        [-0.03, 0.01],
        [0.055, 0.01],
        [0.09, -0.145],
        [0.005, -0.155],
      ],
      0.054,
      0.01,
      0.24
    );
    gripGeo.rotateY(-Math.PI / 2);
    const grip = new THREE.Mesh(gripGeo, walnut);
    grip.position.set(0, -0.005, 0.0);

    const pistolMagGroup = new THREE.Group();
    pistolMagGroup.position.set(0, -0.1, 0.032);
    const magBody = new THREE.Mesh(
      createBeveledBoxGeo(0.04, 0.115, 0.064, 0.006, 0.003, 0.18),
      gunmetal
    );
    magBody.position.set(0, 0.004, -0.004);
    magBody.rotation.x = 0.22;
    const magBase = new THREE.Mesh(
      createBeveledBoxGeo(0.054, 0.02, 0.088, 0.008, 0.004, 0.18),
      darkSteel
    );
    magBase.position.set(0, -0.06, 0.013);
    pistolMagGroup.add(magBody, magBase);

    const guardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.015, -0.02),
      new THREE.Vector3(0, -0.062, -0.04),
      new THREE.Vector3(0, -0.062, -0.115),
      new THREE.Vector3(0, -0.015, -0.125),
    ]);
    const guard = new THREE.Mesh(
      new THREE.TubeGeometry(guardCurve, 10, 0.0055, 6, false),
      darkSteel
    );
    const hammer = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.022, 4, 6), darkSteel);
    hammer.position.set(0, 0.056, 0.042);
    hammer.rotation.x = 0.65;

    const sightFront = new THREE.Mesh(
      createBeveledBoxGeo(0.012, 0.016, 0.022, 0.003, 0.002, 0.08),
      accentAmber
    );
    sightFront.position.set(0, 0.084, -0.268);
    const compensator = new THREE.Mesh(
      createBeveledBoxGeo(0.054, 0.052, 0.064, 0.01, 0.005, 0.16),
      darkSteel
    );
    compensator.position.set(0, 0.044, -0.312);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.02, 10), gunmetal);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.048, -0.342);

    // Two-handed tactical Weaver-stance gloved grip
    const rightHand = createGlovedHandRig({
      side: 'right',
      palmPos: [0.026, -0.068, 0.032],
      wristDir: [0.16, -0.22, 0.34],
      gripStyle: 'pistol',
    });
    const leftHand = createGlovedHandRig({
      side: 'left',
      palmPos: [-0.032, -0.072, 0.018],
      wristDir: [-0.22, -0.22, 0.34],
      gripStyle: 'pistol',
    });

    muzzlePoint.position.set(0, 0.048, -0.365);
    group.add(
      frame,
      slide,
      grip,
      pistolMagGroup,
      guard,
      hammer,
      sightFront,
      compensator,
      bore,
      rightHand,
      leftHand,
      muzzlePoint
    );
    return { group, muzzlePoint, slide, magazine: pistolMagGroup, leftHand };
  }

  if (weaponId === 'minigun') {
    const housingGeo = createLatheProfileGeo(
      [
        [0.06, -0.2],
        [0.112, -0.18],
        [0.118, -0.08],
        [0.102, -0.06],
        [0.116, -0.02],
        [0.102, 0.02],
        [0.114, 0.06],
        [0.104, 0.16],
        [0.082, 0.19],
      ],
      18
    );
    housingGeo.rotateX(Math.PI / 2);
    const housing = new THREE.Mesh(housingGeo, darkSteel);
    housing.position.set(0, -0.06, -0.12);

    // Glowing green motor-drive status LED on rear housing
    const motorLed = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), tritiumGreen);
    motorLed.position.set(0.065, 0.008, 0.05);
    group.add(motorLed);

    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.075, 0.02, -0.04),
      new THREE.Vector3(-0.08, 0.12, -0.06),
      new THREE.Vector3(0, 0.145, -0.11),
      new THREE.Vector3(0.08, 0.12, -0.06),
      new THREE.Vector3(0.075, 0.02, -0.04),
    ]);
    const handleTop = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 16, 0.014, 8, false),
      gunmetal
    );

    const drumGroup = new THREE.Group();
    drumGroup.position.set(-0.125, -0.145, -0.14);
    const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.17, 16), olivePolymer);
    const drumRim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.01, 6, 16), darkSteel);
    drumRim.rotation.x = Math.PI / 2;
    drumRim.position.set(0, 0.085, 0);
    drumGroup.add(ammoDrum, drumRim);

    // Individual gleaming brass 7.62mm cartridges linked along feed chute!
    const chuteCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.125, -0.06, -0.14),
      new THREE.Vector3(-0.145, -0.015, -0.14),
      new THREE.Vector3(-0.085, -0.035, -0.14),
    ]);
    for (let r = 0; r < 9; r++) {
      const pt = chuteCurve.getPoint(r / 8);
      const round = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.056, 8), brassMat);
      round.rotation.x = Math.PI / 2;
      round.position.copy(pt);
      group.add(round);
    }

    const barrelCluster = new THREE.Group();
    barrelCluster.position.set(0, -0.06, -0.31);
    const singleBarrelGeo = new THREE.CylinderGeometry(0.013, 0.014, 0.74, 12);
    singleBarrelGeo.rotateX(Math.PI / 2);
    const muzzleTipGeo = new THREE.CylinderGeometry(0.0155, 0.0135, 0.042, 12);
    muzzleTipGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const bx = Math.cos(ang) * 0.052;
      const by = Math.sin(ang) * 0.052;
      const b = new THREE.Mesh(singleBarrelGeo, i % 2 === 0 ? gunmetal : brushedChrome);
      b.position.set(bx, by, -0.35);
      const tip = new THREE.Mesh(muzzleTipGeo, darkSteel);
      tip.position.set(bx, by, -0.71);
      barrelCluster.add(b, tip);
    }
    for (const cz of [-0.22, -0.46, -0.66]) {
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.012, 8, 18), darkSteel);
      clamp.position.z = cz;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.028, 12), gunmetal);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = cz;
      barrelCluster.add(clamp, hub);
    }

    // Left gloved hand gripping outer-left carry frame cleanly from bottom-left (zero screen occlusion!)
    const leftHand = createGlovedHandRig({
      side: 'left',
      palmPos: [-0.088, 0.018, -0.09],
      wristDir: [-0.34, -0.34, 0.24],
      gripStyle: 'handle',
    });
    const rightHand = createGlovedHandRig({
      side: 'right',
      palmPos: [0.062, -0.095, 0.12],
      wristDir: [0.24, -0.26, 0.28],
      gripStyle: 'pistol',
    });

    muzzlePoint.position.set(0, -0.06, -1.06);
    group.add(housing, handleTop, drumGroup, barrelCluster, leftHand, rightHand, muzzlePoint);
    return { group, muzzlePoint, barrelCluster, ammoDrum: drumGroup, leftHand };
  }

  // P90 iconic contoured ergonomic bullpup thumbhole profile
  const p90MagTex = getP90MagTextures();
  const p90Shape = new THREE.Shape();
  p90Shape.moveTo(-0.37, 0.045);
  p90Shape.lineTo(0.18, 0.052);
  p90Shape.lineTo(0.2, -0.118);
  p90Shape.lineTo(0.1, -0.118);
  p90Shape.lineTo(0.06, -0.078);
  p90Shape.lineTo(-0.18, -0.095);
  p90Shape.lineTo(-0.34, -0.115);
  p90Shape.lineTo(-0.38, -0.045);
  p90Shape.closePath();

  const rearHole = new THREE.Path();
  rearHole.moveTo(0.09, 0.005);
  rearHole.lineTo(0.145, 0.005);
  rearHole.lineTo(0.145, -0.068);
  rearHole.lineTo(0.08, -0.055);
  rearHole.closePath();
  p90Shape.holes.push(rearHole);

  const frontHole = new THREE.Path();
  frontHole.moveTo(-0.24, -0.015);
  frontHole.lineTo(-0.16, -0.015);
  frontHole.lineTo(-0.175, -0.072);
  frontHole.lineTo(-0.26, -0.075);
  frontHole.closePath();
  p90Shape.holes.push(frontHole);

  const p90BodyGeo = new THREE.ExtrudeGeometry(p90Shape, {
    depth: 0.052,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.011,
    bevelThickness: 0.011,
  });
  p90BodyGeo.translate(0, 0, -0.026);
  p90BodyGeo.rotateY(-Math.PI / 2);
  p90BodyGeo.computeVertexNormals();
  normalizeBoxProjectedUVs(p90BodyGeo, 0.36);
  const p90Body = new THREE.Mesh(p90BodyGeo, darkSteel);

  const upperReceiver = new THREE.Mesh(
    createBeveledBoxGeo(0.058, 0.036, 0.4, 0.01, 0.005, 0.35),
    gunmetal
  );
  upperReceiver.position.set(0, 0.056, -0.14);

  const sideHandle = new THREE.Mesh(
    createBeveledBoxGeo(0.094, 0.018, 0.038, 0.006, 0.003, 0.16),
    brushedChrome
  );
  sideHandle.position.set(0, 0.032, -0.28);

  // Side-mounted tactical laser module with glowing ruby emitter
  const laserPod = new THREE.Mesh(
    createBeveledBoxGeo(0.024, 0.026, 0.074, 0.005, 0.003, 0.14),
    darkSteel
  );
  laserPod.position.set(0.044, 0.088, -0.32);
  const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 6), tritiumGreen);
  laserDot.position.set(0.044, 0.088, -0.36);
  group.add(laserPod, laserDot);

  const topMag = new THREE.Mesh(
    createBeveledBoxGeo(0.054, 0.032, 0.34, 0.008, 0.004, 0.32),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: p90MagTex.map,
      normalMap: p90MagTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.2,
      metalness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.9,
    })
  );
  topMag.position.set(0, 0.084, -0.09);

  const opticBridge = new THREE.Mesh(
    createBeveledBoxGeo(0.044, 0.052, 0.115, 0.01, 0.005, 0.2),
    gunmetal
  );
  opticBridge.position.set(0, 0.1, -0.335);
  const opticTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.096, 14), darkSteel);
  opticTube.rotation.x = Math.PI / 2;
  opticTube.position.set(0, 0.132, -0.335);
  const opticLens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), opticGlass);
  opticLens.position.set(0, 0.132, -0.286);
  const redDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), accentAmber);
  redDot.position.set(0, 0.132, -0.335);

  const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.13, 12), brushedChrome);
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0.026, -0.415);
  const flashHider = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.017, -0.026],
        [0.021, -0.012],
        [0.018, 0.006],
        [0.021, 0.024],
        [0.016, 0.028],
      ],
      12
    ),
    darkSteel
  );
  flashHider.rotation.x = Math.PI / 2;
  flashHider.position.set(0, 0.026, -0.482);

  const leftHand = createGlovedHandRig({
    side: 'left',
    palmPos: [-0.028, -0.058, -0.24],
    wristDir: [-0.26, -0.22, 0.34],
    gripStyle: 'forend',
  });
  const rightHand = createGlovedHandRig({
    side: 'right',
    palmPos: [0.028, -0.052, 0.04],
    wristDir: [0.18, -0.22, 0.34],
    gripStyle: 'pistol',
  });

  muzzlePoint.position.set(0, 0.026, -0.515);
  group.add(
    p90Body,
    upperReceiver,
    sideHandle,
    topMag,
    opticBridge,
    opticTube,
    opticLens,
    redDot,
    barrelTip,
    flashHider,
    leftHand,
    rightHand,
    muzzlePoint
  );
  return { group, muzzlePoint, magazine: topMag, chargingHandle: sideHandle, leftHand };
}

/**
 * 4 High-Detail Sculpted Articulated 3D Horror Entity Models:
 * Anatomical LatheGeometry ribcages/greatcoats/skulls, tapered muscular limbs,
 * kneecaps, sculpted boots, splayed clawed hands, and filigree wrought-iron lanterns.
 */
export function createEnemyModel(
  kind: EnemyKind,
  shadowTex: THREE.CanvasTexture
): EnemyRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const eMaps = getEnemyMaps();
  const wMaps = getWeaponMaps();
  const hitMaterials: THREE.MeshStandardMaterial[] = [];
  const baseEmissiveColors: number[] = [];
  const emissiveParts: THREE.MeshStandardMaterial[] = [];
  const baseEmissiveIntensities: number[] = [];

  const trackMat = (m: THREE.MeshStandardMaterial, isGlowing = false) => {
    hitMaterials.push(m);
    baseEmissiveColors.push(m.emissive.getHex());
    if (isGlowing) {
      emissiveParts.push(m);
      baseEmissiveIntensities.push(m.emissiveIntensity);
    }
    return m;
  };

  const bootMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x24262b,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughness: 0.56,
      metalness: 0.16,
      clearcoat: 0.35,
      clearcoatRoughness: 0.42,
    })
  );
  eMaps.wool.attach(bootMat, false);

  const buildArticulatedLeg = (cfg: {
    sx: number;
    hipOffsetX: number;
    thighLen: number;
    shinLen: number;
    thighTopR: number;
    thighBotR: number;
    shinTopR: number;
    shinBotR: number;
    footLen: number;
    footWidth: number;
    footHeight: number;
    thighMat: THREE.Material;
    shinMat: THREE.Material;
    footMat: THREE.Material;
    kneeCapMat?: THREE.Material;
  }) => {
    const hip = new THREE.Group();
    hip.position.set(cfg.sx * cfg.hipOffsetX, 0, 0);

    // Muscular anatomically tapered LatheGeometry thigh (quadriceps bulge + knee taper)
    const thigh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [cfg.thighBotR * 0.92, -cfg.thighLen],
          [cfg.thighBotR * 1.06, -cfg.thighLen * 0.72],
          [cfg.thighTopR * 1.08, -cfg.thighLen * 0.32],
          [cfg.thighTopR * 0.98, 0],
          [cfg.thighTopR * 0.65, cfg.thighTopR * 0.45],
        ],
        12
      ),
      cfg.thighMat
    );
    thigh.scale.set(0.95, 1.0, 1.08);
    thigh.castShadow = true;
    thigh.receiveShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -cfg.thighLen;
    hip.add(knee);

    // Defined kneecap patella so bent knees read crisply in silhouette
    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.thighBotR * 1.04, 10, 8),
      cfg.kneeCapMat ?? cfg.shinMat
    );
    kneeCap.scale.set(0.92, 1.08, 1.12);
    kneeCap.position.set(0, 0.01, cfg.thighBotR * 0.22);
    knee.add(kneeCap);

    // Muscular gastrocnemius calf contour tapering cleanly to the ankle
    const shin = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [cfg.shinBotR * 0.95, -cfg.shinLen],
          [cfg.shinBotR * 1.05, -cfg.shinLen * 0.78],
          [cfg.shinTopR * 1.14, -cfg.shinLen * 0.34],
          [cfg.shinTopR * 0.95, 0],
        ],
        12
      ),
      cfg.shinMat
    );
    shin.scale.set(0.92, 1.0, 1.08);
    shin.castShadow = true;
    shin.receiveShadow = true;
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -cfg.shinLen;
    knee.add(ankle);

    const boot = createSculptedBoot(cfg.footWidth, cfg.footHeight, cfg.footLen, cfg.footMat);
    ankle.add(boot);

    return { hip, knee, ankle };
  };

  const buildArticulatedArm = (cfg: {
    sx: number;
    shoulderX: number;
    shoulderY: number;
    shoulderZ: number;
    upperLen: number;
    foreLen: number;
    upperTopR: number;
    upperBotR: number;
    foreTopR: number;
    foreBotR: number;
    upperMat: THREE.Material;
    foreMat: THREE.Material;
    handMat: THREE.Material;
    clawMat?: THREE.Material;
    withStaff?: { ironMat: THREE.Material; lanternMat: THREE.Material };
  }) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(cfg.sx * cfg.shoulderX, cfg.shoulderY, cfg.shoulderZ);

    const deltoid = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.upperTopR * 1.24, 10, 10),
      cfg.upperMat
    );
    deltoid.scale.set(1.05, 1.18, 1.02);
    shoulder.add(deltoid);

    const upperArm = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [cfg.upperBotR, -cfg.upperLen],
          [cfg.upperTopR * 1.04, -cfg.upperLen * 0.45],
          [cfg.upperTopR, 0],
        ],
        10
      ),
      cfg.upperMat
    );
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -cfg.upperLen;
    shoulder.add(elbow);

    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(cfg.upperBotR * 1.02, 8, 8),
      cfg.foreMat
    );
    elbow.add(elbowJoint);

    const forearm = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [cfg.foreBotR, -cfg.foreLen],
          [cfg.foreTopR * 1.08, -cfg.foreLen * 0.3],
          [cfg.foreTopR * 0.96, 0],
        ],
        10
      ),
      cfg.foreMat
    );
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = createClawedHand(cfg.foreBotR * 1.05, cfg.handMat, cfg.clawMat);
    hand.position.y = -cfg.foreLen;
    if (cfg.sx < 0) hand.scale.x = -1;
    elbow.add(hand);

    if (cfg.withStaff) {
      const staffGroup = new THREE.Group();
      staffGroup.position.set(0, -cfg.foreLen * 0.55, 0.26);
      staffGroup.rotation.x = 0.22;

      const staff = new THREE.Mesh(
        createLatheProfileGeo(
          [
            [0.032, -1.65],
            [0.062, -1.52],
            [0.054, 0.0],
            [0.068, 1.25],
            [0.14, 1.38],
            [0.05, 1.44],
          ],
          12
        ),
        cfg.withStaff.ironMat
      );
      staff.castShadow = true;
      staffGroup.add(staff);

      // Gothic 6-ribbed wrought-iron lantern cage at top of boss staff
      const cageCenterY = 1.72;
      const topCrown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.28, 8), cfg.withStaff.ironMat);
      topCrown.position.y = cageCenterY + 0.34;
      const cageRingBot = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.025, 6, 14),
        cfg.withStaff.ironMat
      );
      cageRingBot.rotation.x = Math.PI / 2;
      cageRingBot.position.y = cageCenterY - 0.24;
      const cageRingTop = cageRingBot.clone();
      cageRingTop.position.y = cageCenterY + 0.22;
      staffGroup.add(topCrown, cageRingBot, cageRingTop);

      for (let r = 0; r < 6; r++) {
        const ang = (r / 6) * Math.PI * 2;
        const ribCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(ang) * 0.2, cageCenterY - 0.24, Math.sin(ang) * 0.2),
          new THREE.Vector3(Math.cos(ang) * 0.28, cageCenterY, Math.sin(ang) * 0.28),
          new THREE.Vector3(Math.cos(ang) * 0.2, cageCenterY + 0.22, Math.sin(ang) * 0.2),
        ]);
        const rib = new THREE.Mesh(
          new THREE.TubeGeometry(ribCurve, 8, 0.018, 6, false),
          cfg.withStaff.ironMat
        );
        staffGroup.add(rib);
      }

      const staffOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        cfg.withStaff.lanternMat
      );
      staffOrb.position.y = cageCenterY;
      staffGroup.add(staffOrb);
      elbow.add(staffGroup);
    }

    return { shoulder, elbow };
  };

  let pelvisBaseY = 0.88;
  let shadowRadius = 0.72;
  const pelvisGroup = new THREE.Group();
  const spineGroup = new THREE.Group();
  const neckGroup = new THREE.Group();
  let headMesh!: THREE.Mesh;
  let leftLegRig!: { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group };
  let rightLegRig!: { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group };
  let leftArmRig!: { shoulder: THREE.Group; elbow: THREE.Group };
  let rightArmRig!: { shoulder: THREE.Group; elbow: THREE.Group };

  if (kind === 'crawler') {
    pelvisBaseY = 0.82;
    const skinMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x9c9386,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.9,
        metalness: 0.02,
        clearcoat: 0.04,
        clearcoatRoughness: 0.74,
        sheen: 0.14,
        sheenColor: new THREE.Color(0x7d8492),
      })
    );
    eMaps.skin.attach(skinMat, true);

    const ragMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x8d96a2,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.98,
        metalness: 0.04,
        sheen: 0.42,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color(0x6c7686),
      })
    );
    eMaps.wool.attach(ragMat, true);

    const trouserMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x565e6a,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 0.98,
        metalness: 0.04,
        sheen: 0.38,
        sheenRoughness: 0.82,
        sheenColor: new THREE.Color(0x4b5360),
      })
    );
    eMaps.wool.attach(trouserMat, true);

    const scleraMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x050507,
        roughness: 0.24,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.25,
      })
    );
    const toothMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xbcb092,
        roughness: 0.56,
        metalness: 0.03,
        clearcoat: 0.14,
        clearcoatRoughness: 0.42,
      })
    );
    const eyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff3b3b,
        emissive: 0xff1e1e,
        emissiveIntensity: 1.55,
        roughness: 0.22,
      }),
      true
    );

    pelvisGroup.position.y = pelvisBaseY;
    bodyGroup.add(pelvisGroup);

    const pelvisMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.18, -0.09],
          [0.23, 0.0],
          [0.19, 0.11],
        ],
        12
      ),
      trouserMat
    );
    pelvisMesh.scale.set(1.08, 1.0, 0.84);
    pelvisMesh.castShadow = true;
    pelvisGroup.add(pelvisMesh);

    leftLegRig = buildArticulatedLeg({
      sx: 1,
      hipOffsetX: 0.15,
      thighLen: 0.39,
      shinLen: 0.38,
      thighTopR: 0.094,
      thighBotR: 0.072,
      shinTopR: 0.068,
      shinBotR: 0.05,
      footLen: 0.25,
      footWidth: 0.11,
      footHeight: 0.088,
      thighMat: trouserMat,
      shinMat: trouserMat,
      footMat: bootMat,
    });
    rightLegRig = buildArticulatedLeg({
      sx: -1,
      hipOffsetX: 0.15,
      thighLen: 0.39,
      shinLen: 0.38,
      thighTopR: 0.094,
      thighBotR: 0.072,
      shinTopR: 0.068,
      shinBotR: 0.05,
      footLen: 0.25,
      footWidth: 0.11,
      footHeight: 0.088,
      thighMat: trouserMat,
      shinMat: trouserMat,
      footMat: bootMat,
    });
    pelvisGroup.add(leftLegRig.hip, rightLegRig.hip);

    spineGroup.position.y = 0.08;
    pelvisGroup.add(spineGroup);

    // Sculpted emaciated ribcage & hunched thoracic torso
    const torso = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.16, 0.0],
          [0.18, 0.14],
          [0.26, 0.34],
          [0.28, 0.48],
          [0.21, 0.58],
        ],
        14
      ),
      ragMat
    );
    torso.scale.set(1.12, 1.0, 0.82);
    torso.castShadow = true;
    torso.receiveShadow = true;
    spineGroup.add(torso);

    // Exposed bony spine vertebrae knuckles protruding down the hunched back
    for (let v = 0; v < 5; v++) {
      const vertebra = new THREE.Mesh(new THREE.SphereGeometry(0.034 - v * 0.002, 8, 8), skinMat);
      vertebra.scale.set(0.75, 0.9, 1.35);
      vertebra.position.set(0, 0.12 + v * 0.1, -0.21);
      spineGroup.add(vertebra);
    }

    // Torn ruffled collar & shoulder shawl
    const collar = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.28, 0.49],
          [0.25, 0.56],
          [0.21, 0.63],
        ],
        12
      ),
      ragMat
    );
    spineGroup.add(collar);

    neckGroup.position.set(0, 0.6, 0.04);
    spineGroup.add(neckGroup);

    // Gaunt skull-shaped cranium with hollow sockets, cheekbones & gaping mandible
    headMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.075, -0.18],
          [0.125, -0.11],
          [0.175, -0.02],
          [0.205, 0.09],
          [0.175, 0.2],
          [0.09, 0.25],
          [0.01, 0.27],
        ],
        16
      ),
      skinMat
    );
    headMesh.scale.set(0.88, 1.0, 1.04);
    headMesh.position.set(0, 0.19, 0.05);
    headMesh.castShadow = true;
    neckGroup.add(headMesh);

    const brow = new THREE.Mesh(
      createBeveledBoxGeo(0.25, 0.048, 0.12, 0.018, 0.008),
      skinMat
    );
    brow.position.set(0, 0.095, 0.14);
    const jawMaw = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), scleraMat);
    jawMaw.scale.set(0.95, 1.3, 0.55);
    jawMaw.position.set(0, -0.095, 0.155);
    headMesh.add(brow, jawMaw);

    // Gaunt sunken cheekbones & 6 jagged stained fangs lining the gaping mandible
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 8), skinMat);
      cheek.scale.set(0.85, 0.65, 1.25);
      cheek.position.set(side * 0.11, -0.02, 0.14);
      headMesh.add(cheek);
    }
    const fangGeo = new THREE.ConeGeometry(0.012, 0.044, 5);
    for (let f = -2; f <= 2; f++) {
      const topFang = new THREE.Mesh(fangGeo, toothMat);
      topFang.rotation.x = Math.PI;
      topFang.position.set(f * 0.024, -0.032, 0.195 - Math.abs(f) * 0.009);
      headMesh.add(topFang);
      if (Math.abs(f) <= 1) {
        const botFang = new THREE.Mesh(fangGeo, toothMat);
        botFang.position.set(f * 0.028, -0.152, 0.188 - Math.abs(f) * 0.008);
        headMesh.add(botFang);
      }
    }

    const socketL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), scleraMat);
    socketL.position.set(0.074, 0.032, 0.165);
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
    pupilL.position.set(0, 0, 0.042);
    socketL.add(pupilL);
    const socketR = socketL.clone();
    socketR.position.x = -0.074;
    headMesh.add(socketL, socketR);

    leftArmRig = buildArticulatedArm({
      sx: 1,
      shoulderX: 0.31,
      shoulderY: 0.51,
      shoulderZ: 0.02,
      upperLen: 0.36,
      foreLen: 0.38,
      upperTopR: 0.078,
      upperBotR: 0.058,
      foreTopR: 0.054,
      foreBotR: 0.038,
      upperMat: ragMat,
      foreMat: skinMat,
      handMat: skinMat,
      clawMat: bootMat,
    });
    rightArmRig = buildArticulatedArm({
      sx: -1,
      shoulderX: 0.31,
      shoulderY: 0.51,
      shoulderZ: 0.02,
      upperLen: 0.36,
      foreLen: 0.38,
      upperTopR: 0.078,
      upperBotR: 0.058,
      foreTopR: 0.054,
      foreBotR: 0.038,
      upperMat: ragMat,
      foreMat: skinMat,
      handMat: skinMat,
      clawMat: bootMat,
    });
    spineGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);
  } else if (kind === 'lampshade') {
    pelvisBaseY = 1.02;
    const coatMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x9aa4b4,
        normalScale: new THREE.Vector2(1.65, 1.65),
        roughness: 0.96,
        metalness: 0.06,
        sheen: 0.65,
        sheenRoughness: 0.72,
        sheenColor: new THREE.Color(0x8894a8),
      })
    );
    eMaps.wool.attach(coatMat, true);

    const trouserMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x4b5260,
        normalScale: new THREE.Vector2(1.45, 1.45),
        roughness: 0.96,
        metalness: 0.06,
        sheen: 0.5,
        sheenRoughness: 0.78,
      })
    );
    eMaps.wool.attach(trouserMat, true);

    const skinMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x999187,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 0.9,
        metalness: 0.03,
        clearcoat: 0.04,
        clearcoatRoughness: 0.72,
      })
    );
    eMaps.skin.attach(skinMat, true);

    const cageMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x768090,
        normalScale: new THREE.Vector2(1.25, 1.25),
        roughness: 0.8,
        metalness: 0.82,
        clearcoat: 0.18,
        clearcoatRoughness: 0.45,
      })
    );
    wMaps.metal.attach(cageMat, true);

    const glowMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffe4a0,
        emissive: 0xffaa44,
        emissiveIntensity: 1.5,
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 0.35,
        clearcoatRoughness: 0.24,
      }),
      true
    );

    const bulbGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe6b8,
      emissive: 0xd9842b,
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 0.45,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    pelvisGroup.position.y = pelvisBaseY;
    bodyGroup.add(pelvisGroup);

    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.255, 0.265, 0.14, 14),
      bootMat
    );
    const buckle = new THREE.Mesh(createBeveledBoxGeo(0.11, 0.09, 0.04, 0.015, 0.008), cageMat);
    buckle.position.set(0, 0, 0.255);
    pelvisGroup.add(belt, buckle);

    // Split contoured coat tail panels hanging gracefully behind hips (leaving striding legs clear!)
    for (const side of [-1, 1]) {
      const tailPanel = new THREE.Mesh(
        createBeveledBoxGeo(0.22, 0.56, 0.055, 0.03, 0.014),
        coatMat
      );
      tailPanel.position.set(side * 0.13, -0.29, -0.2);
      tailPanel.rotation.x = 0.16;
      tailPanel.rotation.y = side * 0.18;
      tailPanel.castShadow = true;
      pelvisGroup.add(tailPanel);
    }

    leftLegRig = buildArticulatedLeg({
      sx: 1,
      hipOffsetX: 0.16,
      thighLen: 0.48,
      shinLen: 0.48,
      thighTopR: 0.095,
      thighBotR: 0.078,
      shinTopR: 0.072,
      shinBotR: 0.054,
      footLen: 0.28,
      footWidth: 0.12,
      footHeight: 0.095,
      thighMat: trouserMat,
      shinMat: trouserMat,
      footMat: bootMat,
    });
    rightLegRig = buildArticulatedLeg({
      sx: -1,
      hipOffsetX: 0.16,
      thighLen: 0.48,
      shinLen: 0.48,
      thighTopR: 0.095,
      thighBotR: 0.078,
      shinTopR: 0.072,
      shinBotR: 0.054,
      footLen: 0.28,
      footWidth: 0.12,
      footHeight: 0.095,
      thighMat: trouserMat,
      shinMat: trouserMat,
      footMat: bootMat,
    });
    pelvisGroup.add(leftLegRig.hip, rightLegRig.hip);

    spineGroup.position.y = 0.08;
    pelvisGroup.add(spineGroup);

    // Tailored double-breasted Soviet trench torso + wide shoulder storm-cape
    const torso = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.24, 0.0],
          [0.25, 0.24],
          [0.31, 0.54],
          [0.36, 0.78],
          [0.26, 0.86],
        ],
        16
      ),
      coatMat
    );
    torso.scale.set(1.1, 1.0, 0.84);
    torso.castShadow = true;
    torso.receiveShadow = true;
    spineGroup.add(torso);

    // Sculpted storm-cape mantle over shoulders
    const shoulderMantle = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.44, 0.62],
          [0.41, 0.74],
          [0.32, 0.86],
          [0.19, 0.9],
        ],
        16
      ),
      coatMat
    );
    shoulderMantle.scale.set(1.08, 1.0, 0.88);
    shoulderMantle.castShadow = true;
    spineGroup.add(shoulderMantle);

    // Double row of metallic coat buttons + Sam Browne leather cross-strap & dangling power cord
    for (let b = 0; b < 3; b++) {
      for (const side of [-0.07, 0.07]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), cageMat);
        btn.position.set(side, 0.2 + b * 0.17, 0.25);
        spineGroup.add(btn);
      }
    }
    const crossStrap = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.92, 0.032, 0.008, 0.004),
      bootMat
    );
    crossStrap.position.set(0.01, 0.45, 0.245);
    crossStrap.rotation.z = -0.46;
    spineGroup.add(crossStrap);

    const powerCordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.92, -0.14),
      new THREE.Vector3(0.16, 0.62, -0.28),
      new THREE.Vector3(0.08, 0.24, -0.29),
      new THREE.Vector3(0.22, -0.14, -0.34),
      new THREE.Vector3(0.18, -0.46, -0.3),
    ]);
    const powerCord = new THREE.Mesh(
      new THREE.TubeGeometry(powerCordCurve, 16, 0.014, 6, false),
      bootMat
    );
    spineGroup.add(powerCord);

    neckGroup.position.set(0, 0.92, 0);
    spineGroup.add(neckGroup);

    // Open wrought-iron lampshade cage revealing a clearcoat glass bulb & glowing helical tungsten filament!
    headMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.33, 0.28],
          [0.24, 0.36],
          [0.16, 0.44],
          [0.05, 0.5],
          [0.012, 0.58],
        ],
        16
      ),
      cageMat
    );
    headMesh.position.y = 0.06;
    headMesh.castShadow = true;

    const lowerCageRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 8, 20), cageMat);
    lowerCageRing.rotation.x = Math.PI / 2;
    lowerCageRing.position.y = 0.02;
    const midCageRing = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.012, 6, 18), cageMat);
    midCageRing.rotation.x = Math.PI / 2;
    midCageRing.position.y = 0.16;
    headMesh.add(lowerCageRing, midCageRing);

    // Brass screw socket + glowing helical tungsten filament inside blown clearcoat glass bulb
    const bulbSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.09, 12), cageMat);
    bulbSocket.position.y = 0.32;
    const filamentPts: THREE.Vector3[] = [];
    for (let f = 0; f <= 18; f++) {
      const t = f / 18;
      const a = t * Math.PI * 6;
      const r = 0.048 * Math.sin(t * Math.PI);
      filamentPts.push(new THREE.Vector3(Math.cos(a) * r, 0.09 + t * 0.19, Math.sin(a) * r));
    }
    const filamentMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(filamentPts), 24, 0.011, 6, false),
      glowMat
    );
    const bulbCore = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), glowMat);
    bulbCore.position.y = 0.18;
    const bulbGlass = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), bulbGlassMat);
    bulbGlass.scale.set(0.92, 1.16, 0.92);
    bulbGlass.position.y = 0.17;
    headMesh.add(bulbSocket, filamentMesh, bulbCore, bulbGlass);

    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2;
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.32, 0.02, Math.sin(ang) * 0.32),
        new THREE.Vector3(Math.cos(ang) * 0.3, 0.16, Math.sin(ang) * 0.3),
        new THREE.Vector3(Math.cos(ang) * 0.32, 0.29, Math.sin(ang) * 0.32),
      ]);
      const rib = new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 8, 0.011, 6, false), cageMat);
      headMesh.add(rib);
    }
    neckGroup.add(headMesh);

    leftArmRig = buildArticulatedArm({
      sx: 1,
      shoulderX: 0.4,
      shoulderY: 0.76,
      shoulderZ: 0,
      upperLen: 0.45,
      foreLen: 0.44,
      upperTopR: 0.084,
      upperBotR: 0.066,
      foreTopR: 0.06,
      foreBotR: 0.044,
      upperMat: coatMat,
      foreMat: coatMat,
      handMat: skinMat,
    });
    rightArmRig = buildArticulatedArm({
      sx: -1,
      shoulderX: 0.4,
      shoulderY: 0.76,
      shoulderZ: 0,
      upperLen: 0.45,
      foreLen: 0.44,
      upperTopR: 0.084,
      upperBotR: 0.066,
      foreTopR: 0.06,
      foreBotR: 0.044,
      upperMat: coatMat,
      foreMat: coatMat,
      handMat: skinMat,
    });
    spineGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);
  } else if (kind === 'screamer') {
    pelvisBaseY = 0.98;
    const robeMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x9c95a8,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughness: 0.98,
        metalness: 0.05,
        sheen: 0.65,
        sheenRoughness: 0.72,
        sheenColor: new THREE.Color(0x9a8cb2),
      })
    );
    eMaps.wool.attach(robeMat, true);

    const maskMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xb6aea2,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.86,
        metalness: 0.03,
        clearcoat: 0.06,
        clearcoatRoughness: 0.68,
      })
    );
    eMaps.skin.attach(maskMat, true);

    const shriekCoreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff5a5a,
        emissive: 0xd93030,
        emissiveIntensity: 1.35,
        roughness: 0.28,
      }),
      true
    );

    const exeSocketMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x050507,
        roughness: 0.24,
        clearcoat: 0.25,
        clearcoatRoughness: 0.24,
      })
    );
    const exePupilMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff3434,
        emissive: 0xff1c1c,
        emissiveIntensity: 1.6,
        roughness: 0.22,
      }),
      true
    );

    pelvisGroup.position.y = pelvisBaseY;
    bodyGroup.add(pelvisGroup);

    const hipWrap = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.29, -0.14],
          [0.24, 0.0],
          [0.19, 0.12],
        ],
        14
      ),
      robeMat
    );
    pelvisGroup.add(hipWrap);

    // Tattered shroud ribbons trailing from the waist
    for (let t = 0; t < 5; t++) {
      const ang = (t / 5) * Math.PI * 2 + 0.3;
      const strip = new THREE.Mesh(
        createBeveledBoxGeo(0.09, 0.42 + (t % 2) * 0.12, 0.025, 0.015, 0.005),
        robeMat
      );
      strip.position.set(Math.cos(ang) * 0.22, -0.28, Math.sin(ang) * 0.2);
      strip.rotation.y = -ang + Math.PI / 2;
      strip.rotation.x = 0.14;
      pelvisGroup.add(strip);
    }

    leftLegRig = buildArticulatedLeg({
      sx: 1,
      hipOffsetX: 0.15,
      thighLen: 0.46,
      shinLen: 0.46,
      thighTopR: 0.072,
      thighBotR: 0.054,
      shinTopR: 0.052,
      shinBotR: 0.038,
      footLen: 0.26,
      footWidth: 0.095,
      footHeight: 0.074,
      thighMat: robeMat,
      shinMat: maskMat,
      footMat: bootMat,
    });
    rightLegRig = buildArticulatedLeg({
      sx: -1,
      hipOffsetX: 0.15,
      thighLen: 0.46,
      shinLen: 0.46,
      thighTopR: 0.072,
      thighBotR: 0.054,
      shinTopR: 0.052,
      shinBotR: 0.038,
      footLen: 0.26,
      footWidth: 0.095,
      footHeight: 0.074,
      thighMat: robeMat,
      shinMat: maskMat,
      footMat: bootMat,
    });
    pelvisGroup.add(leftLegRig.hip, rightLegRig.hip);

    spineGroup.position.y = 0.08;
    pelvisGroup.add(spineGroup);

    // Gaunt hourglass shrouded ribcage
    const chest = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.16, 0.0],
          [0.14, 0.2],
          [0.24, 0.48],
          [0.26, 0.66],
          [0.18, 0.74],
        ],
        14
      ),
      robeMat
    );
    chest.scale.set(1.12, 1.0, 0.76);
    chest.castShadow = true;
    spineGroup.add(chest);

    // Sculpted bony clavicles & thoracic rib ridges
    for (let rb = 0; rb < 3; rb++) {
      const ribArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.18 - rb * 0.015, 0.016, 6, 14, Math.PI),
        maskMat
      );
      ribArc.rotation.x = Math.PI / 2 + 0.12;
      ribArc.position.set(0, 0.56 - rb * 0.1, 0.03);
      spineGroup.add(ribArc);
    }

    neckGroup.position.set(0, 0.75, 0.04);
    spineGroup.add(neckGroup);

    // Elongated haunting sculpted bone-mask head with gaping shriek maw
    headMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.06, -0.26],
          [0.12, -0.16],
          [0.17, -0.02],
          [0.22, 0.14],
          [0.2, 0.28],
          [0.12, 0.36],
          [0.01, 0.39],
        ],
        16
      ),
      maskMat
    );
    headMesh.scale.set(0.88, 1.0, 0.84);
    headMesh.position.set(0, 0.24, 0.02);
    headMesh.castShadow = true;

    // Stretched sternocleidomastoid neck tendons linking jaw to clavicle
    for (const side of [-1, 1]) {
      const tendonCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.095, -0.05, 0.05),
        new THREE.Vector3(side * 0.058, 0.05, 0.075),
        new THREE.Vector3(side * 0.044, 0.15, 0.04),
      ]);
      const tendon = new THREE.Mesh(
        new THREE.TubeGeometry(tendonCurve, 8, 0.014, 6, false),
        maskMat
      );
      neckGroup.add(tendon);
    }

    // Cracked porcelain brow ridge & angular cheekbone hollows
    const crackLine = new THREE.Mesh(
      createBeveledBoxGeo(0.012, 0.24, 0.018, 0.004, 0.002),
      exeSocketMat
    );
    crackLine.position.set(0.045, 0.22, 0.165);
    crackLine.rotation.z = 0.26;
    headMesh.add(crackLine);

    const sEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 10), exeSocketMat);
    sEyeL.scale.set(0.85, 1.35, 0.75);
    sEyeL.position.set(0.082, 0.1, 0.16);
    const sEyeR = sEyeL.clone();
    sEyeR.position.x = -0.082;
    // Mount glowing pupils directly on headMesh (uniform 1:1:1 sphere — never stretched by socket scale)
    const sPupilL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), exePupilMat);
    sPupilL.position.set(0.082, 0.1, 0.198);
    const sPupilR = sPupilL.clone();
    sPupilR.position.x = -0.082;

    const mouthOuter = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), exeSocketMat);
    mouthOuter.scale.set(0.72, 1.48, 0.55);
    mouthOuter.position.set(0, -0.09, 0.155);
    const mouthCore = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 10), shriekCoreMat);
    mouthCore.scale.set(0.68, 1.35, 0.5);
    mouthCore.position.set(0, -0.09, 0.17);
    headMesh.add(sEyeL, sEyeR, sPupilL, sPupilR, mouthOuter, mouthCore);
    neckGroup.add(headMesh);

    leftArmRig = buildArticulatedArm({
      sx: 1,
      shoulderX: 0.32,
      shoulderY: 0.66,
      shoulderZ: 0.02,
      upperLen: 0.46,
      foreLen: 0.48,
      upperTopR: 0.058,
      upperBotR: 0.044,
      foreTopR: 0.042,
      foreBotR: 0.03,
      upperMat: robeMat,
      foreMat: maskMat,
      handMat: maskMat,
      clawMat: exeSocketMat,
    });
    rightArmRig = buildArticulatedArm({
      sx: -1,
      shoulderX: 0.32,
      shoulderY: 0.66,
      shoulderZ: 0.02,
      upperLen: 0.46,
      foreLen: 0.48,
      upperTopR: 0.058,
      upperBotR: 0.044,
      foreTopR: 0.042,
      foreBotR: 0.03,
      upperMat: robeMat,
      foreMat: maskMat,
      handMat: maskMat,
      clawMat: exeSocketMat,
    });
    spineGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);
  } else {
    // WATCHMAN BOSS (Towering 3.45m Keeper of Midnight with sculpted pauldrons, chest lantern cage & gothic staff)
    pelvisBaseY = 1.44;
    shadowRadius = 1.45;
    const heavyCoat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x9aa2b0,
        normalScale: new THREE.Vector2(1.7, 1.7),
        roughness: 0.96,
        metalness: 0.08,
        sheen: 0.72,
        sheenRoughness: 0.7,
        sheenColor: new THREE.Color(0x8a92a4),
      })
    );
    eMaps.wool.attach(heavyCoat, true);

    const armorLegMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x4f5662,
        normalScale: new THREE.Vector2(1.45, 1.45),
        roughness: 0.76,
        metalness: 0.34,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
      })
    );
    eMaps.wool.attach(armorLegMat, true);

    const maskMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xb8b0a2,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.86,
        metalness: 0.04,
        clearcoat: 0.06,
        clearcoatRoughness: 0.68,
      })
    );
    eMaps.skin.attach(maskMat, true);

    const lanternMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffd078,
        normalMap: wMaps.metal.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        emissive: 0xff9d36,
        emissiveIntensity: 1.6,
        roughness: 0.22,
        clearcoat: 0.35,
        clearcoatRoughness: 0.24,
      }),
      true
    );
    const ironMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x768090,
        normalScale: new THREE.Vector2(1.3, 1.3),
        roughness: 0.78,
        metalness: 0.84,
        clearcoat: 0.18,
        clearcoatRoughness: 0.42,
      })
    );
    wMaps.metal.attach(ironMat, true);

    const bossSocketMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.24, clearcoat: 0.25 })
    );
    const bossRedEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff3434,
        emissive: 0xff1a1a,
        emissiveIntensity: 1.65,
        roughness: 0.2,
      }),
      true
    );

    pelvisGroup.position.y = pelvisBaseY;
    bodyGroup.add(pelvisGroup);

    const waistBelt = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.52, -0.14],
          [0.54, 0.0],
          [0.49, 0.14],
        ],
        14
      ),
      ironMat
    );
    waistBelt.castShadow = true;
    pelvisGroup.add(waistBelt);

    // Draped 3-panel greatcoat cape behind hips so giant armored legs stay clearly visible
    for (let p = -1; p <= 1; p++) {
      const panel = new THREE.Mesh(
        createBeveledBoxGeo(0.38, 1.12 - Math.abs(p) * 0.08, 0.09, 0.04, 0.02),
        heavyCoat
      );
      panel.position.set(p * 0.32, -0.54, -0.34 + Math.abs(p) * 0.06);
      panel.rotation.x = 0.17;
      panel.rotation.y = p * 0.22;
      panel.castShadow = true;
      pelvisGroup.add(panel);
    }

    leftLegRig = buildArticulatedLeg({
      sx: 1,
      hipOffsetX: 0.31,
      thighLen: 0.68,
      shinLen: 0.66,
      thighTopR: 0.18,
      thighBotR: 0.145,
      shinTopR: 0.14,
      shinBotR: 0.115,
      footLen: 0.46,
      footWidth: 0.23,
      footHeight: 0.17,
      thighMat: armorLegMat,
      shinMat: ironMat,
      footMat: bootMat,
      kneeCapMat: ironMat,
    });
    rightLegRig = buildArticulatedLeg({
      sx: -1,
      hipOffsetX: 0.31,
      thighLen: 0.68,
      shinLen: 0.66,
      thighTopR: 0.18,
      thighBotR: 0.145,
      shinTopR: 0.14,
      shinBotR: 0.115,
      footLen: 0.46,
      footWidth: 0.23,
      footHeight: 0.17,
      thighMat: armorLegMat,
      shinMat: ironMat,
      footMat: bootMat,
      kneeCapMat: ironMat,
    });
    pelvisGroup.add(leftLegRig.hip, rightLegRig.hip);

    spineGroup.position.y = 0.14;
    pelvisGroup.add(spineGroup);

    // Broad sculpted LatheGeometry armored greatcoat chest
    const chest = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.46, 0.0],
          [0.5, 0.36],
          [0.64, 0.88],
          [0.68, 1.12],
          [0.44, 1.28],
        ],
        16
      ),
      heavyCoat
    );
    chest.scale.set(1.16, 1.0, 0.84);
    chest.castShadow = true;
    chest.receiveShadow = true;
    spineGroup.add(chest);

    // Layered riveted iron pauldrons with rim studs & high storm collar
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        ironMat
      );
      pauldron.scale.set(1.12, 0.78, 1.05);
      pauldron.position.set(side * 0.72, 1.08, 0.0);
      pauldron.rotation.z = -side * 0.32;
      pauldron.castShadow = true;
      const lowerTier = new THREE.Mesh(
        new THREE.TorusGeometry(0.39, 0.04, 8, 16),
        ironMat
      );
      lowerTier.rotation.x = Math.PI / 2;
      lowerTier.position.set(side * 0.78, 0.94, 0.0);
      lowerTier.rotation.y = -side * 0.22;
      spineGroup.add(pauldron, lowerTier);

      for (let st = 0; st < 4; st++) {
        const ang = -0.8 + st * 0.52;
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), ironMat);
        stud.position.set(
          side * (0.76 + Math.cos(ang) * 0.34),
          1.03,
          Math.sin(ang) * 0.34
        );
        spineGroup.add(stud);
      }
    }

    // Hanging chained iron hip censer with smoldering ember core on Watchman's left hip
    const censerChain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6), ironMat);
    censerChain.position.set(0.55, -0.22, 0.18);
    const censerBody = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.02, -0.16],
          [0.14, -0.06],
          [0.16, 0.04],
          [0.09, 0.14],
        ],
        12
      ),
      ironMat
    );
    censerBody.position.set(0.55, -0.48, 0.18);
    const censerEmber = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), lanternMat);
    censerEmber.position.set(0.55, -0.46, 0.18);
    pelvisGroup.add(censerChain, censerBody, censerEmber);

    const highCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.56, 0.32, 14, 1, true, Math.PI * 0.18, Math.PI * 1.64),
      heavyCoat
    );
    highCollar.rotation.y = Math.PI;
    highCollar.position.set(0, 1.32, -0.06);
    spineGroup.add(highCollar);

    // Caged chest furnace lantern with riveted iron vertical & horizontal grate bars
    const chestLanternCore = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.21, -0.26],
          [0.26, 0.0],
          [0.21, 0.26],
        ],
        14
      ),
      lanternMat
    );
    chestLanternCore.position.set(0, 0.68, 0.44);
    spineGroup.add(chestLanternCore);
    for (let b = -2; b <= 2; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 6), ironMat);
      bar.position.set(b * 0.085, 0.68, 0.64 - Math.abs(b) * 0.028);
      spineGroup.add(bar);
    }
    for (const hy of [0.54, 0.82]) {
      const hBar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 6, 14, Math.PI * 0.85), ironMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.rotation.z = -Math.PI * 0.425;
      hBar.position.set(0, hy, 0.44);
      spineGroup.add(hBar);
    }

    neckGroup.position.set(0, 1.32, 0.04);
    spineGroup.add(neckGroup);

    // Sculpted elongated Watchman mask with spiked wrought-iron halo crown
    headMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.14, -0.34],
          [0.25, -0.18],
          [0.34, 0.04],
          [0.38, 0.26],
          [0.32, 0.44],
          [0.16, 0.54],
          [0.01, 0.58],
        ],
        18
      ),
      maskMat
    );
    headMesh.scale.set(0.88, 1.0, 0.9);
    headMesh.position.set(0, 0.26, 0.04);
    headMesh.castShadow = true;

    const crownRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.036, 8, 18), ironMat);
    crownRim.rotation.x = Math.PI / 2;
    crownRim.position.set(0, 0.34, 0);
    headMesh.add(crownRim);

    // 7 tapered wrought-iron halo spikes rising from the Watchman's brow crown
    for (let sp = 0; sp < 7; sp++) {
      const ang = -Math.PI * 0.72 + (sp / 6) * Math.PI * 1.44;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.26 + (sp === 3 ? 0.1 : 0), 6), ironMat);
      spike.position.set(Math.sin(ang) * 0.35, 0.47, Math.cos(ang) * 0.35);
      spike.rotation.z = -Math.sin(ang) * 0.28;
      spike.rotation.x = Math.cos(ang) * 0.22;
      headMesh.add(spike);
    }

    const eyeSocketL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), bossSocketMat);
    eyeSocketL.position.set(0.135, 0.14, 0.28);
    const eyePupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bossRedEyeMat);
    eyePupilL.position.set(0, 0, 0.072);
    eyeSocketL.add(eyePupilL);
    const eyeSocketR = eyeSocketL.clone();
    eyeSocketR.position.x = -0.135;
    headMesh.add(eyeSocketL, eyeSocketR);
    neckGroup.add(headMesh);

    leftArmRig = buildArticulatedArm({
      sx: 1,
      shoulderX: 0.84,
      shoulderY: 1.05,
      shoulderZ: 0,
      upperLen: 0.74,
      foreLen: 0.72,
      upperTopR: 0.16,
      upperBotR: 0.13,
      foreTopR: 0.125,
      foreBotR: 0.095,
      upperMat: heavyCoat,
      foreMat: ironMat,
      handMat: maskMat,
      clawMat: ironMat,
    });
    rightArmRig = buildArticulatedArm({
      sx: -1,
      shoulderX: 0.84,
      shoulderY: 1.05,
      shoulderZ: 0,
      upperLen: 0.74,
      foreLen: 0.72,
      upperTopR: 0.16,
      upperBotR: 0.13,
      foreTopR: 0.125,
      foreBotR: 0.095,
      upperMat: heavyCoat,
      foreMat: ironMat,
      handMat: maskMat,
      clawMat: ironMat,
      withStaff: { ironMat, lanternMat },
    });
    spineGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);
  }

  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, 18),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.036;
  group.add(shadowMesh);

  return {
    group,
    bodyGroup,
    pelvisGroup,
    spineGroup,
    neckGroup,
    headMesh,
    leftHip: leftLegRig.hip,
    leftKnee: leftLegRig.knee,
    leftAnkle: leftLegRig.ankle,
    rightHip: rightLegRig.hip,
    rightKnee: rightLegRig.knee,
    rightAnkle: rightLegRig.ankle,
    leftShoulder: leftArmRig.shoulder,
    leftElbow: leftArmRig.elbow,
    rightShoulder: rightArmRig.shoulder,
    rightElbow: rightArmRig.elbow,
    leftArm: leftArmRig.shoulder,
    rightArm: rightArmRig.shoulder,
    emissiveParts,
    baseEmissiveIntensities,
    shadowMesh,
    hitMaterials,
    baseEmissiveColors,
    pelvisBaseY,
  };
}

/**
 * Stalled 1994 Soviet Moskvitch-412 Sedan parked outside House #14.
 * Sculpted side-profile ExtrudeGeometry with sloped hood, angled A/C pillars, trunk deck,
 * chrome wrap-around bumpers, round chrome-bezeled headlights, hubcap wheels & wing mirrors!
 */
export function createSovietCar(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();

  // Authentic sculpted Moskvitch-412 3-box sedan side silhouette (local +Z is front)
  const carProfileGeo = createProfileExtrudeGeo(
    [
      [-2.04, 0.36],
      [-2.02, 0.82],
      [-1.34, 0.88],
      [-0.96, 1.38],
      [0.42, 1.4],
      [0.92, 0.9],
      [1.98, 0.84],
      [2.05, 0.62],
      [2.03, 0.36],
    ],
    1.68,
    0.055
  );
  carProfileGeo.rotateY(-Math.PI / 2);
  const bodyMesh = new THREE.Mesh(carProfileGeo, materials.carPaint);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Glossy smoked glass cabin over visible interior silhouette (seats, dashboard, steering wheel, mirror)
  const cabinGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f1822,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.68,
    envMapIntensity: 2.2,
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x161414,
    roughness: 0.88,
    metalness: 0.06,
  });
  const chromeTrimMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4dbe4,
    roughness: 0.16,
    metalness: 0.95,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 2.3,
  });

  // Interior cabin seats, dashboard & steering wheel visible through smoked glass
  const dash = new THREE.Mesh(createBeveledBoxGeo(1.36, 0.18, 0.34, 0.02, 0.008), interiorMat);
  dash.position.set(0, 0.96, 0.44);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 16), interiorMat);
  steerWheel.position.set(-0.34, 1.04, 0.26);
  steerWheel.rotation.x = 0.42;
  const rearMirror = new THREE.Mesh(createBeveledBoxGeo(0.18, 0.055, 0.03, 0.008, 0.004), interiorMat);
  rearMirror.position.set(0, 1.29, 0.46);
  group.add(dash, steerWheel, rearMirror);
  for (const sx of [-0.34, 0.34]) {
    const seatBack = new THREE.Mesh(createBeveledBoxGeo(0.42, 0.46, 0.12, 0.03, 0.01), interiorMat);
    seatBack.position.set(sx, 1.04, -0.18);
    seatBack.rotation.x = -0.16;
    const headrest = new THREE.Mesh(createBeveledBoxGeo(0.2, 0.14, 0.09, 0.02, 0.008), interiorMat);
    headrest.position.set(sx, 1.28, -0.22);
    group.add(seatBack, headrest);
  }

  // Angled reflective windshield, rear window & side greenhouse glass
  const windshield = new THREE.Mesh(
    createBeveledBoxGeo(1.42, 0.56, 0.04, 0.04, 0.008),
    cabinGlassMat
  );
  windshield.position.set(0, 1.15, 0.69);
  windshield.rotation.x = -0.68;

  const rearGlass = new THREE.Mesh(
    createBeveledBoxGeo(1.4, 0.52, 0.04, 0.04, 0.008),
    cabinGlassMat
  );
  rearGlass.position.set(0, 1.14, -1.14);
  rearGlass.rotation.x = 0.62;

  const sideGlass = new THREE.Mesh(
    createBeveledBoxGeo(1.66, 0.38, 1.56, 0.04, 0.008),
    cabinGlassMat
  );
  sideGlass.position.set(0, 1.14, -0.25);

  // Dual chrome windshield wipers resting at the base of the glass + whip radio antenna
  for (const wx of [-0.34, 0.22]) {
    const wiper = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.46, 6), chromeTrimMat);
    wiper.rotation.z = 1.28;
    wiper.rotation.x = -0.58;
    wiper.position.set(wx, 0.96, 0.87);
    group.add(wiper);
  }
  const whipAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.92, 6), chromeTrimMat);
  whipAntenna.position.set(0.76, 1.32, 1.02);
  whipAntenna.rotation.x = -0.18;
  group.add(windshield, rearGlass, sideGlass, whipAntenna);

  // Chrome wrap-around front & rear bumpers + bumperette overriders
  const makeBumper = (zPos: number, dir: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.88, 0.37, zPos - dir * 0.24),
      new THREE.Vector3(-0.84, 0.37, zPos),
      new THREE.Vector3(0, 0.37, zPos + dir * 0.05),
      new THREE.Vector3(0.84, 0.37, zPos),
      new THREE.Vector3(0.88, 0.37, zPos - dir * 0.24),
    ]);
    const bar = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, 0.062, 8, false),
      chromeTrimMat
    );
    bar.castShadow = true;
    group.add(bar);
    for (const bx of [-0.46, 0.46]) {
      const overrider = new THREE.Mesh(
        createBeveledBoxGeo(0.065, 0.18, 0.09, 0.015, 0.006),
        chromeTrimMat
      );
      overrider.position.set(bx, 0.4, zPos + dir * 0.03);
      group.add(overrider);
    }
  };
  makeBumper(2.1, 1);
  makeBumper(-2.1, -1);

  // Slatted horizontal chrome Moskvitch-412 grille + crimson AZLK badge
  const grilleRecess = new THREE.Mesh(
    createBeveledBoxGeo(1.04, 0.23, 0.04, 0.02, 0.008),
    interiorMat
  );
  grilleRecess.position.set(0, 0.64, 2.035);
  group.add(grilleRecess);
  for (let slat = -2; slat <= 2; slat++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.015, 0.032), chromeTrimMat);
    bar.position.set(0, 0.64 + slat * 0.044, 2.055);
    group.add(bar);
  }
  const azlkBadge = new THREE.Mesh(
    createBeveledBoxGeo(0.09, 0.11, 0.03, 0.012, 0.005),
    new THREE.MeshPhysicalMaterial({ color: 0xa61d1d, roughness: 0.22, clearcoat: 0.9 })
  );
  azlkBadge.position.set(0, 0.65, 2.068);
  group.add(azlkBadge);

  // Authentic 1994 Soviet black-on-white license plates ("41-94 ММО") front & rear
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 256;
  plateCanvas.height = 64;
  const plCtx = plateCanvas.getContext('2d')!;
  plCtx.fillStyle = '#15171c';
  plCtx.fillRect(0, 0, 256, 64);
  plCtx.strokeStyle = '#d4d8df';
  plCtx.lineWidth = 4;
  plCtx.strokeRect(4, 4, 248, 56);
  plCtx.fillStyle = '#eceee8';
  plCtx.font = 'bold 34px monospace';
  plCtx.textAlign = 'center';
  plCtx.textBaseline = 'middle';
  plCtx.fillText('41-94 ММО', 128, 34);
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.42, metalness: 0.35 });
  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.12), plateMat);
  frontPlate.position.set(0, 0.45, 2.13);
  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.12), plateMat);
  rearPlate.rotation.y = Math.PI;
  rearPlate.position.set(0, 0.56, -2.065);
  group.add(frontPlate, rearPlate);

  // Rear chrome exhaust tailpipe tucked under rear bumper
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 10), chromeTrimMat);
  exhaustPipe.rotation.x = Math.PI / 2;
  exhaustPipe.position.set(-0.56, 0.24, -2.04);
  group.add(exhaustPipe);

  // Iconic Soviet round chrome-bezeled headlights, amber turn signals & rear tail clusters
  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff0c4,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: 0xffc066,
    emissiveIntensity: 1.85,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const amberSignalMat = new THREE.MeshPhysicalMaterial({
    color: 0xff8c24,
    emissive: 0xd96410,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    clearcoat: 0.9,
  });
  const taillightMat = new THREE.MeshPhysicalMaterial({
    color: 0xff3b3b,
    map: materials.frostedGlass.map,
    emissive: 0xd92222,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    clearcoat: 0.95,
  });
  for (const side of [-0.62, 0.62]) {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 8, 16), chromeTrimMat);
    bezel.position.set(side, 0.66, 2.055);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 14), headlightMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(side, 0.66, 2.045);

    const blinker = new THREE.Mesh(
      createBeveledBoxGeo(0.14, 0.055, 0.045, 0.012, 0.006),
      amberSignalMat
    );
    blinker.position.set(side, 0.51, 2.045);

    const tl = new THREE.Mesh(
      createBeveledBoxGeo(0.24, 0.14, 0.06, 0.025, 0.01),
      taillightMat
    );
    tl.position.set(side, 0.66, -2.05);

    // Chrome wing side mirrors, roof drip rails & door handles
    const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), chromeTrimMat);
    mirrorArm.rotation.z = side > 0 ? -0.9 : 0.9;
    mirrorArm.position.set(side * 1.38, 0.98, 0.56);
    const mirrorHead = new THREE.Mesh(
      createBeveledBoxGeo(0.13, 0.085, 0.05, 0.02, 0.008),
      chromeTrimMat
    );
    mirrorHead.position.set(side * 1.48, 1.02, 0.54);

    const doorHandle = new THREE.Mesh(
      createBeveledBoxGeo(0.03, 0.026, 0.14, 0.006, 0.004),
      chromeTrimMat
    );
    doorHandle.position.set(side * 1.37, 0.82, -0.15);

    const dripRail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.022, 1.42), chromeTrimMat);
    dripRail.position.set(side * 1.32, 1.36, -0.26);

    group.add(bezel, lens, blinker, tl, mirrorArm, mirrorHead, doorHandle, dripRail);
  }

  // 4 treaded rubber wheels with flared wheel-arch trim, domed chrome hubcaps & 5 lug bolts
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.23, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.245, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.SphereGeometry(0.135, 12, 8);
  hubGeo.scale(0.55, 1, 1);

  const wheelCoords: Array<[number, number]> = [
    [-0.84, 1.28],
    [0.84, 1.28],
    [-0.84, -1.26],
    [0.84, -1.26],
  ];
  for (const [wx, wz] of wheelCoords) {
    const tire = new THREE.Mesh(tireGeo, materials.tireRubber);
    tire.position.set(wx, 0.34, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chromeTrimMat);
    rim.position.set(wx, 0.34, wz);
    const hub = new THREE.Mesh(hubGeo, chromeTrimMat);
    hub.position.set(wx + (wx > 0 ? 0.095 : -0.095), 0.34, wz);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.035, 6, 14, Math.PI),
      materials.carPaint
    );
    arch.rotation.y = Math.PI / 2;
    arch.position.set(wx * 0.99, 0.36, wz);
    group.add(tire, rim, hub, arch);
  }

  // Dual volumetric headlight beam cones: narrow apex flush on headlamp lens, expanding cleanly FORWARD (+Z)
  // CylinderGeometry(radiusTop=+Y, radiusBottom=-Y): after translate(+3.2) and rotateX(+PI/2), +Y maps to +Z!
  const beamConeGeo = new THREE.CylinderGeometry(1.32, 0.11, 6.4, 22, 1, true);
  beamConeGeo.translate(0, 3.2, 0);
  beamConeGeo.rotateX(Math.PI / 2);
  const beamConeMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffd796) },
      uOpacity: { value: 0.16 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        // vUv.y = 0 at narrow headlamp lens, 1 at far wide mouth
        float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.1);
        float nearFade = smoothstep(0.0, 0.08, vUv.y);
        float farFade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.85);
        float alpha = fresnel * nearFade * farFade * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  for (const side of [-0.62, 0.62]) {
    const cone = new THREE.Mesh(beamConeGeo, beamConeMat);
    cone.position.set(side, 0.66, 2.04);
    cone.rotation.x = 0.075;
    group.add(cone);
  }

  // Warm soft road headlight wash projected onto wet asphalt ahead of the car
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const pctx = poolCanvas.getContext('2d')!;
  const pgrad = pctx.createRadialGradient(64, 24, 4, 64, 64, 62);
  pgrad.addColorStop(0, 'rgba(255, 215, 138, 0.34)');
  pgrad.addColorStop(0.55, 'rgba(232, 150, 62, 0.12)');
  pgrad.addColorStop(1, 'rgba(232, 150, 62, 0)');
  pctx.fillStyle = pgrad;
  pctx.fillRect(0, 0, 128, 128);
  const beamPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 7.6),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(poolCanvas),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beamPool.rotation.x = -Math.PI / 2;
  beamPool.position.set(0, 0.044, 5.4);
  group.add(beamPool);

  return group;
}

/**
 * Classic Soviet cast-iron scrollwork park/yard bench with 5 individual beveled timber slats.
 */
export function createYardBench(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();

  // 3 contoured seat slats + 2 ergonomic tilted backrest slats
  const slatGeo = createBeveledBoxGeo(1.76, 0.048, 0.12, 0.015, 0.008);
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(slatGeo, materials.woodTrim);
    slat.position.set(0, 0.45 + (i === 1 ? -0.008 : 0), -0.14 + i * 0.145);
    slat.castShadow = true;
    slat.receiveShadow = true;
    group.add(slat);
  }
  for (let i = 0; i < 2; i++) {
    const slat = new THREE.Mesh(slatGeo, materials.woodTrim);
    slat.position.set(0, 0.68 + i * 0.16, -0.22 - i * 0.035);
    slat.rotation.x = Math.PI / 2 - 0.18;
    slat.castShadow = true;
    slat.receiveShadow = true;
    group.add(slat);
  }

  // Curved cast-iron scrollwork side legs + integrated armrests
  for (const sx of [-0.72, 0.72]) {
    const legCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.02, 0.22),
      new THREE.Vector3(sx, 0.43, 0.19),
      new THREE.Vector3(sx, 0.43, -0.18),
      new THREE.Vector3(sx, 0.92, -0.27),
    ]);
    const mainFrame = new THREE.Mesh(
      new THREE.TubeGeometry(legCurve, 16, 0.028, 8, false),
      materials.grimeMetal
    );
    mainFrame.castShadow = true;

    const rearLegCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.02, -0.24),
      new THREE.Vector3(sx, 0.43, -0.18),
    ]);
    const rearLeg = new THREE.Mesh(
      new THREE.TubeGeometry(rearLegCurve, 8, 0.028, 8, false),
      materials.grimeMetal
    );
    rearLeg.castShadow = true;

    const armrestCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.44, 0.2),
      new THREE.Vector3(sx, 0.62, 0.18),
      new THREE.Vector3(sx, 0.64, -0.2),
    ]);
    const armrest = new THREE.Mesh(
      new THREE.TubeGeometry(armrestCurve, 10, 0.022, 6, false),
      materials.grimeMetal
    );
    group.add(mainFrame, rearLeg, armrest);
  }

  return group;
}

/**
 * Iconic weathered Soviet village entrance sign ("НЕГРУЗИНО · 1994") with flanged posts & riveted frame.
 */
export function createSuburbSign(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.052, 0.064, 2.38, 10);
  const footGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.12, 10);
  for (const px of [-0.74, 0.74]) {
    const post = new THREE.Mesh(postGeo, materials.grimeMetal);
    post.position.set(px, 1.19, 0);
    post.castShadow = true;
    const foot = new THREE.Mesh(footGeo, materials.concrete);
    foot.position.set(px, 0.06, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), materials.grimeMetal);
    cap.position.set(px, 2.39, 0);
    group.add(post, foot, cap);
  }

  // Steel frame backing border around enamel sign plate
  const frameBack = new THREE.Mesh(
    createBeveledBoxGeo(1.98, 0.8, 0.065, 0.04, 0.015),
    materials.grimeMetal
  );
  frameBack.position.set(0, 2.02, -0.01);
  frameBack.castShadow = true;
  group.add(frameBack);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d6d2c7';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#1b2028';
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 488, 168);
  ctx.fillStyle = 'rgba(112, 54, 28, 0.32)';
  ctx.fillRect(20, 138, 110, 36);
  ctx.fillRect(360, 144, 120, 30);
  ctx.fillStyle = '#141820';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('НЕГРУЗИНО', 256, 86);
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#5c2420';
  ctx.fillText('1994 · 23:59', 256, 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const facePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.86, 0.68),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.48,
      metalness: 0.25,
    })
  );
  facePlate.position.set(0, 2.02, 0.025);
  group.add(facePlate);

  return group;
}

/**
 * Organic sculpted spruce bough whorl — heavily serrated drooping Russian spruce branches
 * with asymmetric multi-lobe silhouette so northern pines never look like smooth cones.
 */
export function createSculptedSpruceTierGeo(
  radius: number,
  height: number,
  yOffset: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, 18, 6, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    const hNorm = Math.max(0, Math.min(1, (v.y + height * 0.5) / height));
    if (r > 0.04) {
      const ang = Math.atan2(v.z, v.x);
      const boughLobe =
        0.74 +
        0.3 * Math.sin(ang * 6 + seed * 1.7) +
        0.18 * Math.cos(ang * 4 - seed * 2.3) +
        0.12 * Math.sin(ang * 9 + hNorm * 5.2 + seed);
      const tierStep = 1 + 0.16 * Math.sin(hNorm * Math.PI * 3.0);
      // Break up sharp geometric cone tips with organic upper-crown irregularity
      const crownSoft = hNorm > 0.72 ? 1.18 + 0.25 * Math.sin(ang * 5 + seed * 2.1) : 1.0;
      const radialJitter = (1 + (1 - hNorm) * (boughLobe - 1)) * tierStep * crownSoft;
      v.x *= radialJitter;
      v.z *= radialJitter;
      // Heavy rain-weighted downward sweep at bough tips
      const droop =
        (1 - hNorm) * (1 - hNorm) * (0.38 + 0.24 * Math.sin(ang * 6 + seed));
      v.y -= droop * radius * 0.3;
    } else if (hNorm > 0.9) {
      // Slightly blunt/asymmetrical natural pine leader tip instead of razor-sharp triangle point
      v.y -= height * 0.06;
      v.x += Math.sin(seed * 3.1) * 0.16;
      v.z += Math.cos(seed * 2.7) * 0.14;
    }
    v.y += yOffset;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  geo.setAttribute('uv2', geo.attributes.uv.clone());
  return geo;
}

/**
 * Gently tapered tree trunk with organic root flare at ground level and slight natural lean.
 */
export function createFlaredTrunkGeo(
  topRadius: number,
  bottomRadius: number,
  height: number
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 10, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const hNorm = (v.y + height * 0.5) / height; // 0 bottom .. 1 top
    const ang = Math.atan2(v.z, v.x);
    const rootFlare =
      hNorm < 0.28 ? 1 + (1 - hNorm / 0.28) * (0.44 + 0.22 * Math.sin(ang * 5)) : 1;
    const bendX = Math.sin(hNorm * Math.PI) * 0.11;
    const bendZ = Math.cos(hNorm * Math.PI * 1.3) * 0.06;
    v.x = v.x * rootFlare + bendX;
    v.z = v.z * rootFlare + bendZ;
    v.y += height * 0.5;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  geo.setAttribute('uv2', geo.attributes.uv.clone());
  return geo;
}

/**
 * Irregular leafy crown cluster for Russian silver birches mixed into Negruzino's perimeter.
 */
export function createBirchCanopyGeo(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(2.12, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const lump =
      0.82 +
      0.26 * Math.sin(ang * 3.0 + v.y * 1.6) +
      0.16 * Math.cos(v.x * 2.2 - v.z * 1.8) +
      0.1 * Math.sin(ang * 5.0 - v.y * 2.4);
    v.x *= lump * 0.94;
    v.z *= lump * 0.94;
    v.y = v.y * lump * 1.32 + 5.95;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  geo.setAttribute('uv2', geo.attributes.uv.clone());
  return geo;
}

/**
 * Cast-iron 1994 Soviet curb storm drain grate beside wet asphalt edges.
 */
export function createRoadStormDrain(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(0.72, 0.05, 1.06), 0.72, 0.05, 1.06, 0.8, 0.8),
    materials.grimeMetal
  );
  frame.position.set(0, 0.024, 0);
  frame.receiveShadow = true;

  const pit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.88),
    new THREE.MeshBasicMaterial({ color: 0x05070b })
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.set(0, 0.048, 0);

  const barGeo = new THREE.BoxGeometry(0.56, 0.025, 0.045);
  for (let b = -3; b <= 3; b++) {
    const bar = new THREE.Mesh(barGeo, materials.grimeMetal);
    bar.position.set(0, 0.052, b * 0.12);
    bar.receiveShadow = true;
    group.add(bar);
  }

  group.add(frame, pit);
  return group;
}

/**
 * Instanced multi-blade wild roadside grass tuft cluster for curb, fence, and verge realism.
 */
export function createGrassTuftGeo(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bladeCount = 7;
  let vertOffset = 0;
  for (let b = 0; b < bladeCount; b++) {
    const ang = (b / bladeCount) * Math.PI * 2 + (b % 2) * 0.31;
    const h = 0.28 + (b % 3) * 0.11;
    const w = 0.048;
    const lean = 0.1 + (b % 2) * 0.08;
    const ox = Math.cos(ang) * 0.07;
    const oz = Math.sin(ang) * 0.07;
    const tx = -Math.sin(ang) * w;
    const tz = Math.cos(ang) * w;
    const lx = Math.cos(ang) * lean;
    const lz = Math.sin(ang) * lean;

    // 5-vertex curved tapering blade
    const pts = [
      [ox - tx, 0, oz - tz, 0, 0],
      [ox + tx, 0, oz + tz, 1, 0],
      [ox - tx * 0.65 + lx * 0.45, h * 0.52, oz - tz * 0.65 + lz * 0.45, 0, 0.5],
      [ox + tx * 0.65 + lx * 0.45, h * 0.52, oz + tz * 0.65 + lz * 0.45, 1, 0.5],
      [ox + lx, h, oz + lz, 0.5, 1],
    ];
    for (const [px, py, pz, u, v] of pts) {
      positions.push(px, py, pz);
      normals.push(Math.cos(ang) * 0.3, 0.92, Math.sin(ang) * 0.3);
      uvs.push(u, v);
    }
    indices.push(
      vertOffset,
      vertOffset + 1,
      vertOffset + 2,
      vertOffset + 1,
      vertOffset + 3,
      vertOffset + 2,
      vertOffset + 2,
      vertOffset + 3,
      vertOffset + 4
    );
    vertOffset += 5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted organic suburban yard shrub cluster (for instanced hedges along fences & gardens).
 */
export function createYardBushGeo(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.72, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const lobe =
      0.86 +
      0.22 * Math.sin(ang * 4.0 + v.y * 2.5) +
      0.14 * Math.cos(v.x * 3.1 - v.z * 2.8);
    v.x *= lobe * 1.18;
    v.z *= lobe * 1.12;
    v.y = Math.max(0.02, v.y * lobe * 0.82 + 0.44);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.setAttribute('uv2', geo.attributes.uv.clone());
  return geo;
}

/**
 * Classic 1994 Soviet roadside concrete signal bollard ("сигнальный столбик") with diagonal
 * black-and-white warning stripe and glowing cat's-eye road reflector.
 */
export function createRoadsideBollard(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();

  const post = new THREE.Mesh(
    createBeveledBoxGeo(0.14, 0.78, 0.14, 0.02, 0.008, 0.75),
    materials.concrete
  );
  post.position.y = 0.39;
  post.castShadow = true;
  post.receiveShadow = true;
  group.add(post);

  const blackBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.146, 0.16, 0.146),
    new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.78 })
  );
  blackBand.position.y = 0.62;
  group.add(blackBand);

  const reflectorMat = new THREE.MeshPhysicalMaterial({
    color: 0xff3a24,
    emissive: 0xd92616,
    emissiveIntensity: 1.65,
    roughness: 0.14,
    clearcoat: 1.0,
  });
  for (const dz of [-0.074, 0.074]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.055, 0.012), reflectorMat);
    eye.position.set(0, 0.62, dz);
    group.add(eye);
  }

  return group;
}

/**
 * Weathered 200L Soviet ribbed steel barrel ("бочка") with rolled hoops and top bung caps.
 */
export function createRustBarrel(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();

  const drumGeo = createLatheProfileGeo(
    [
      [0.01, 0.0],
      [0.29, 0.0],
      [0.3, 0.04],
      [0.29, 0.28],
      [0.315, 0.31],
      [0.29, 0.34],
      [0.29, 0.56],
      [0.315, 0.59],
      [0.29, 0.62],
      [0.3, 0.87],
      [0.285, 0.9],
      [0.26, 0.87],
      [0.01, 0.87],
    ],
    18
  );
  const drum = new THREE.Mesh(drumGeo, materials.grimeMetal);
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  const bungA = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 10), materials.concrete);
  bungA.position.set(0.11, 0.882, 0.05);
  const bungB = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 8), materials.concrete);
  bungB.position.set(-0.12, 0.88, -0.06);
  group.add(bungA, bungB);

  return group;
}

export interface CoopPartnerRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  weaponPivot: THREE.Group;
  weaponMag: THREE.Mesh;
  muzzleFlash: THREE.Mesh;
  headlampBeam: THREE.Mesh;
  nameSprite: THREE.Sprite;
  setWeapon: (weaponId: WeaponId) => void;
  updateLabel: (name: string, hp: number, maxHp: number, isDowned: boolean) => void;
}

/**
 * High-detail 3D LAN Co-op Partner Survivor Avatar:
 * Weathered 1994 Soviet storm-parka, winter ushanka with earflaps, tactical scarf,
 * articulated legs/arms, held rifle silhouette, glowing muzzle flash, and crisp overhead callsign/HP badge.
 */
export function createCoopPartnerModel(
  shadowTex: THREE.CanvasTexture,
  initialName: string
): CoopPartnerRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.96;
  group.add(bodyPivot);

  const parkaMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b4d3e,
    roughness: 0.78,
    metalness: 0.06,
    sheen: 0.45,
    sheenColor: new THREE.Color(0x6f826f),
  });
  const trousersMat = new THREE.MeshStandardMaterial({
    color: 0x242a34,
    roughness: 0.86,
    metalness: 0.05,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x1a1715,
    roughness: 0.54,
    metalness: 0.14,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0x9c4527,
    roughness: 0.88,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc9a389,
    roughness: 0.62,
  });
  const ushankaMat = new THREE.MeshStandardMaterial({
    color: 0x2f2822,
    roughness: 0.92,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x2d333d,
    roughness: 0.36,
    metalness: 0.82,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4b0,
    emissive: 0xffb357,
    emissiveIntensity: 1.75,
    roughness: 0.22,
  });

  // Sculpted torso parka + storm collar + backpack
  const torso = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.19, -0.26],
        [0.24, -0.05],
        [0.26, 0.2],
        [0.22, 0.44],
        [0.14, 0.52],
      ],
      14
    ),
    parkaMat
  );
  torso.scale.set(1.05, 1.0, 0.78);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.042, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.51;
  bodyPivot.add(scarf);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.065, 14), leatherMat);
  belt.scale.set(1.05, 1.0, 0.8);
  belt.position.y = -0.04;
  bodyPivot.add(belt);

  const backpack = new THREE.Mesh(
    createBeveledBoxGeo(0.32, 0.42, 0.16, 0.045, 0.02, 0.3),
    leatherMat
  );
  backpack.position.set(0, 0.22, 0.23);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  // Articulated Head + 1994 Soviet Ushanka + Headlamp
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.58, 0);
  bodyPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), skinMat);
  head.scale.set(0.92, 1.04, 0.96);
  head.position.y = 0.11;
  head.castShadow = true;
  headPivot.add(head);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.155, 0.14, 14), ushankaMat);
  hatCrown.position.y = 0.21;
  hatCrown.castShadow = true;
  headPivot.add(hatCrown);

  for (const side of [-1, 1]) {
    const earFlap = new THREE.Mesh(
      createBeveledBoxGeo(0.055, 0.15, 0.11, 0.015, 0.008, 0.2),
      ushankaMat
    );
    earFlap.position.set(side * 0.145, 0.12, 0.01);
    earFlap.rotation.z = -side * 0.14;
    headPivot.add(earFlap);
  }

  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.045, 12), lampGlowMat);
  headlamp.rotation.x = Math.PI / 2;
  headlamp.position.set(0, 0.21, -0.158);
  headPivot.add(headlamp);

  // Soft Fresnel-faded forward volumetric headlamp beam (-Z) so teammates read clearly in dark horror zones
  const headlampConeGeo = new THREE.CylinderGeometry(0.045, 1.05, 5.4, 18, 1, true);
  headlampConeGeo.translate(0, -2.7, 0);
  headlampConeGeo.rotateX(Math.PI / 2);
  const headlampBeamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffe1a8) },
      uOpacity: { value: 0.18 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.0);
        float nearFade = smoothstep(1.0, 0.9, vUv.y);
        float farFade = pow(clamp(vUv.y, 0.0, 1.0), 1.9);
        float alpha = fresnel * nearFade * farFade * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const headlampBeam = new THREE.Mesh(headlampConeGeo, headlampBeamMat);
  headlampBeam.position.set(0, 0.21, -0.18);
  headPivot.add(headlampBeam);

  // Articulated Legs
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.12, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.32, 6, 10), trousersMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.3, 6, 10), trousersMat);
    shin.position.y = -0.56;
    shin.castShadow = true;
    const boot = new THREE.Mesh(
      createBeveledBoxGeo(0.13, 0.14, 0.26, 0.03, 0.015, 0.2),
      leatherMat
    );
    boot.position.set(0, -0.77, -0.045);
    boot.castShadow = true;
    hip.add(thigh, shin, boot);
    return hip;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyPivot.add(leftLeg, rightLeg);

  // Articulated Arms + Held Carbine Silhouette + Muzzle Flash
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.29, 0.42, -0.02);
  const leftSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.38, 6, 10), parkaMat);
  leftSleeve.position.set(0.04, -0.12, -0.18);
  leftSleeve.rotation.set(Math.PI * 0.38, 0, 0.28);
  leftSleeve.castShadow = true;
  leftArm.add(leftSleeve);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.28, 0.42, -0.02);
  const rightSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.36, 6, 10), parkaMat);
  rightSleeve.position.set(-0.02, -0.12, -0.16);
  rightSleeve.rotation.set(Math.PI * 0.42, 0, -0.18);
  rightSleeve.castShadow = true;
  rightArm.add(rightSleeve);

  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(-0.06, -0.155, -0.34);
  const gunBody = new THREE.Mesh(
    createBeveledBoxGeo(0.068, 0.095, 0.48, 0.014, 0.008, 0.25),
    steelMat
  );
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.44, 10), steelMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.012, -0.34);
  const weaponMag = new THREE.Mesh(
    createBeveledBoxGeo(0.044, 0.14, 0.085, 0.008, 0.004, 0.2),
    leatherMat
  );
  weaponMag.position.set(0, -0.095, -0.06);
  const muzzleFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.32, 7),
    new THREE.MeshBasicMaterial({
      color: 0xffc66b,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.012, -0.62);
  muzzleFlash.visible = false;
  weaponPivot.add(gunBody, gunBarrel, weaponMag, muzzleFlash);
  rightArm.add(weaponPivot);
  bodyPivot.add(rightArm);

  let currentWeaponVisual: WeaponId = 'shotgun';
  const setWeapon = (weaponId: WeaponId) => {
    if (weaponId === currentWeaponVisual) return;
    currentWeaponVisual = weaponId;
    if (weaponId === 'pistol') {
      gunBody.scale.set(0.76, 0.72, 0.56);
      gunBarrel.scale.set(0.8, 0.48, 0.8);
      gunBarrel.position.z = -0.19;
      weaponMag.scale.set(0.7, 0.75, 0.7);
      muzzleFlash.position.z = -0.35;
    } else if (weaponId === 'awp') {
      gunBody.scale.set(0.95, 0.95, 1.15);
      gunBarrel.scale.set(0.85, 1.48, 0.85);
      gunBarrel.position.z = -0.49;
      weaponMag.scale.set(0.95, 0.95, 1.0);
      muzzleFlash.position.z = -0.84;
    } else if (weaponId === 'minigun') {
      gunBody.scale.set(1.65, 1.55, 1.15);
      gunBarrel.scale.set(2.3, 1.35, 2.3);
      gunBarrel.position.z = -0.46;
      weaponMag.scale.set(1.8, 1.25, 1.8);
      muzzleFlash.position.z = -0.82;
    } else if (weaponId === 'p90') {
      gunBody.scale.set(0.9, 1.12, 0.84);
      gunBarrel.scale.set(0.82, 0.55, 0.82);
      gunBarrel.position.z = -0.24;
      weaponMag.scale.set(0.9, 0.45, 2.4);
      muzzleFlash.position.z = -0.44;
    } else {
      gunBody.scale.set(1, 1, 1);
      gunBarrel.scale.set(1, 1, 1);
      gunBarrel.position.z = -0.34;
      weaponMag.scale.set(1, 1, 1);
      muzzleFlash.position.z = -0.62;
    }
  };

  // Soft ground shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.036;
  group.add(shadow);

  // Dynamic Callsign + HP Canvas Sprite overhead (safe canvas fillText, zero HTML)
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 320;
  labelCanvas.height = 84;
  const lctx = labelCanvas.getContext('2d')!;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  nameSprite.renderOrder = 20;
  nameSprite.scale.set(0.76, 0.21, 1);
  nameSprite.position.y = 2.08;
  group.add(nameSprite);

  const updateLabel = (name: string, hp: number, maxHp: number, isDowned: boolean) => {
    lctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
    lctx.fillStyle = isDowned ? 'rgba(130, 24, 28, 0.86)' : 'rgba(12, 18, 28, 0.82)';
    lctx.fillRect(14, 8, 292, 66);
    lctx.strokeStyle = isDowned ? '#ff6464' : '#e8963a';
    lctx.lineWidth = 3;
    lctx.strokeRect(14, 8, 292, 66);

    lctx.fillStyle = isDowned ? '#ffd0d0' : '#f4efe6';
    lctx.font = 'bold 26px monospace';
    lctx.textAlign = 'center';
    lctx.fillText(isDowned ? `${name} · РАНЕН!` : name, 160, 40);

    // HP bar
    const ratio = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
    lctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    lctx.fillRect(36, 52, 248, 11);
    lctx.fillStyle = isDowned ? '#ef4444' : ratio > 0.45 ? '#5fa88e' : '#e8963a';
    lctx.fillRect(36, 52, Math.round(248 * ratio), 11);
    labelTex.needsUpdate = true;
  };
  updateLabel(initialName, 100, 100, false);

  // Bullets pass cleanly through co-op teammates (zero friendly fire frustration)
  group.traverse((obj) => {
    obj.userData.ignoreBulletRaycast = true;
  });

  return {
    group,
    bodyPivot,
    headPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    weaponPivot,
    weaponMag,
    muzzleFlash,
    headlampBeam,
    nameSprite,
    setWeapon,
    updateLabel,
  };
}

/**
 * Collectible 1994 Soviet MK-60 Magnetic Cassette Tape resting on a weathered wooden crate
 * with subtle amber tape-reel glow so players can discover lore entries around Negruzino.
 */
export function createCassetteTapeModel(materials: WorldMaterialSet): {
  group: THREE.Group;
  spinPivot: THREE.Group;
  ringMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const crate = new THREE.Mesh(
    createBeveledBoxGeo(0.56, 0.44, 0.46, 0.04, 0.02, 0.45),
    materials.fence
  );
  crate.position.y = 0.22;
  crate.castShadow = true;
  crate.receiveShadow = true;
  group.add(crate);

  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.72;
  group.add(spinPivot);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1e26,
    roughness: 0.36,
    metalness: 0.25,
    clearcoat: 0.45,
  });
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0xf0a64b,
    emissive: 0xe08224,
    emissiveIntensity: 1.45,
    roughness: 0.32,
  });
  const reelMat = new THREE.MeshStandardMaterial({
    color: 0xebe4d4,
    emissive: 0xffb85c,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(
    createBeveledBoxGeo(0.36, 0.23, 0.052, 0.018, 0.008, 0.25),
    shellMat
  );
  body.castShadow = true;
  const stripe = new THREE.Mesh(
    createBeveledBoxGeo(0.31, 0.095, 0.058, 0.01, 0.004, 0.2),
    labelMat
  );
  stripe.position.y = 0.04;
  spinPivot.add(body, stripe);

  for (const sx of [-0.085, 0.085]) {
    const reel = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 6, 14), reelMat);
    reel.position.set(sx, -0.02, 0.028);
    const reelBack = reel.clone();
    reelBack.position.z = -0.028;
    spinPivot.add(reel, reelBack);
  }

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.56, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf4aa4c,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.042;
  group.add(ringMesh);

  group.traverse((obj) => {
    obj.userData.ignoreBulletRaycast = true;
  });

  return { group, spinPivot, ringMesh };
}

/**
 * 3D Amber Radio Ping Pillar spawned when a LAN co-op teammate presses [G].
 */
export function createCoopPingBeacon(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x6ce5c4,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.32, 9.0, 12, 1, true), mat);
  pillar.position.y = 4.5;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 20), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(pillar, ring);
  group.traverse((o) => {
    o.userData.ignoreBulletRaycast = true;
  });
  return group;
}


