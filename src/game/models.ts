import * as THREE from 'three';
import type { EnemyKind, HouseLot, LampSpec, PickupKind, WeaponId } from './types';
import {
  createEnemySurfaceMaps,
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
 * Centered beveled rounded-rectangle extrusion so cabinets, weapon receivers,
 * crates, and props read as machined objects instead of razor-sharp primitive cubes.
 */
function createBeveledBoxGeo(
  width: number,
  height: number,
  depth: number,
  radius = Math.min(width, height) * 0.14,
  bevelSize = Math.min(width, height, depth) * 0.08
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
  if (geo.attributes.uv) {
    geo.setAttribute('uv2', geo.attributes.uv.clone());
  }
  return geo;
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
 * Extrudes a 2D side silhouette (XY plane) centered along X with smooth chamfers.
 * Used for ergonomic firearm stocks, bullpup P90 frame, and the Moskvitch-412 car body.
 */
function createProfileExtrudeGeo(
  pts: Array<[number, number]>,
  thickness: number,
  bevel = 0.008
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
  if (geo.attributes.uv) {
    geo.setAttribute('uv2', geo.attributes.uv.clone());
  }
  return geo;
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
    winGroup.add(frame, pediment, sill, pane, mullionV, mullionH);
    group.add(winGroup);
  };

  addWindow(1.45, 0.56 + 1.65, d / 2 + 0.04, 0);
  addWindow(-w / 2 - 0.04, 0.56 + 1.65, 0.6, -Math.PI / 2);
  addWindow(w / 2 + 0.04, 0.56 + 1.65, 0.6, Math.PI / 2);

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
    applyWorldBoxUVs(new THREE.BoxGeometry(0.16, 0.42, 0.08), 0.16, 0.42, 0.08, 0.8, 0.8),
    materials.grimeMetal
  );
  hatch.position.set(dir * 0.15, 1.45, 0);
  group.add(hatch);

  // 3. Porcelain power-line insulator crossarm near top of pole
  const crossArm = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(0.1, 0.08, 0.72), 0.1, 0.08, 0.72, 1.0, 0.5),
    materials.grimeMetal
  );
  crossArm.position.set(0, 6.55, 0);
  group.add(crossArm);
  for (const iz of [-0.28, 0.28]) {
    const insulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.052, 0.12, 8),
      materials.frostedGlass
    );
    insulator.position.set(0, 6.64, iz);
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
    emissiveIntensity: 3.4,
    roughness: 0.22,
    metalness: 0.08,
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
      uOpacity: { value: 0.21 },
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
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.2, 24, 1, true), coneMat);
  cone.position.set(dir * 2.02, 3.66, 0);
  group.add(cone);

  // Warm radial ground light pool on the wet asphalt beneath the lamp
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const pctx = poolCanvas.getContext('2d')!;
  const pgrad = pctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  pgrad.addColorStop(0, 'rgba(255, 184, 96, 0.30)');
  pgrad.addColorStop(0.45, 'rgba(232, 146, 56, 0.12)');
  pgrad.addColorStop(1, 'rgba(232, 146, 56, 0)');
  pctx.fillStyle = pgrad;
  pctx.fillRect(0, 0, 128, 128);
  const poolMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9.0, 9.0),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(poolCanvas),
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.set(dir * 2.02, 0.041, 0);
  group.add(poolMesh);

  let pointLight: THREE.PointLight | undefined;
  if (spec.hasPointLight) {
    pointLight = new THREE.PointLight(0xf29f46, 26, 22, 1.65);
    pointLight.position.set(dir * 2.02, 6.75, 0);
    group.add(pointLight);
  }

  return { group, bulbMat, pointLight };
}

export function createTransformerTower(materials: WorldMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-11.2, 0, 0);

  const warningMat = new THREE.MeshStandardMaterial({
    color: 0xe8963a,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: 0xc93b3b,
    emissiveIntensity: 2.5,
    roughness: 0.28,
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

  // Rusted steel roof cap
  const cap = new THREE.Mesh(
    applyWorldBoxUVs(new THREE.BoxGeometry(2.9, 0.25, 3.1), 2.9, 0.25, 3.1, 2.0, 2.0),
    materials.grimeMetal
  );
  cap.position.y = 3.3;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Tall lattice mast rising 14m into midnight fog
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

  for (const y of [8.2, 11.4, 13.8]) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, 0.14),
      materials.grimeMetal
    );
    bar.position.y = y;
    bar.castShadow = true;
    group.add(bar);
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), warningMat);
  beacon.position.y = 14.9;
  group.add(beacon);

  return group;
}

export function createObjectiveShrine(
  labelColor: number,
  materials: WorldMaterialSet
): {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  ringMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Cast-iron bolted pedestal base + tapered fluted column
  const plinth = new THREE.Mesh(
    createLatheProfileGeo(
      [
        [0.34, 0.0],
        [0.32, 0.12],
        [0.24, 0.18],
        [0.14, 0.28],
        [0.12, 1.05],
        [0.2, 1.14],
      ],
      14
    ),
    materials.grimeMetal
  );
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

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

  // Coiled armored power conduits curving from sides of cabinet into the damp earth
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

    // Ribbed porcelain high-voltage insulator flanking top beacon
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

  // Sculpted Fresnel strobe dome & protective wire guard ring
  const beaconMat = new THREE.MeshStandardMaterial({
    color: labelColor,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: labelColor,
    emissiveIntensity: 3.0,
    roughness: 0.18,
    metalness: 0.15,
  });
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

  // Subtle parabolic radio dish / dipole mast for chapter 2 relays (greenish beacon)
  if (labelColor === 0x5fa88e) {
    const dishMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.032, 0.72, 8),
      materials.grimeMetal
    );
    dishMast.position.set(0, 2.38, -0.18);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.38),
      materials.grimeMetal
    );
    dish.rotation.x = Math.PI * 0.68;
    dish.position.set(0, 2.68, -0.14);
    const feedHorn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.018, 0.24, 8),
      beaconMat
    );
    feedHorn.rotation.x = -0.35;
    feedHorn.position.set(0, 2.66, 0.05);
    group.add(dishMast, dish, feedHorn);
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: labelColor,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.12, 28), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.045;
  group.add(ringMesh);

  // Tall soft Fresnel vertical beacon beam so players can spot active objectives above fences
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(labelColor) },
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

  return { group, beaconMat, ringMesh, beamMesh };
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

  const chestMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: 1.0,
    metalness: 0.14,
  });
  rMaps.feathers.attach(chestMat, true);

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xdca580,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 1.0,
    metalness: 0.18,
  });
  rMaps.feathers.attach(wingMat, true);

  const neckMat = new THREE.MeshStandardMaterial({
    color: 0xffd199,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 1.0,
    metalness: 0.16,
  });
  rMaps.feathers.attach(neckMat, true);

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x3b7c6e,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 0.34,
    metalness: 0.42,
  });
  rMaps.feathers.attach(tailMat, false);

  const combMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: rMaps.combMap,
    normalMap: rMaps.combNormal,
    normalScale: new THREE.Vector2(1.1, 1.1),
    emissive: 0x3a0707,
    emissiveIntensity: 0.25,
    roughness: 0.46,
    metalness: 0.04,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: rMaps.keratinMap,
    normalMap: rMaps.keratinNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.38,
    metalness: 0.12,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0b0d,
    normalMap: rMaps.keratinNormal,
    roughness: 0.08,
    metalness: 0.35,
  });

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

  // Twin dangling crimson wattles & earlobes
  for (const ws of [-1, 1]) {
    const wattle = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.045, 4, 8), combMat);
    wattle.position.set(ws * 0.028, -0.082, 0.078);
    wattle.rotation.z = ws * 0.16;
    headPivot.add(wattle);
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

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
  leftEye.position.set(0.078, 0.022, 0.05);
  const rightEye = leftEye.clone();
  rightEye.position.x = -0.078;
  headPivot.add(leftEye, rightEye);

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
 * 5 Sculpted First-Person 3D Weapon Viewmodels with beveled ExtrudeGeometry frames,
 * contoured walnut/polymer stocks, curved trigger guards, machined muzzle brakes & optics.
 */
export function createWeaponViewmodel(weaponId: WeaponId): WeaponRig {
  const group = new THREE.Group();

  const wMaps = getWeaponMaps();
  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0xd5dce6,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 1.0,
    metalness: 0.72,
  });
  wMaps.metal.attach(gunmetal, true);

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x8d95a2,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 1.0,
    metalness: 0.78,
  });
  wMaps.metal.attach(darkSteel, true);

  const walnut = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: wMaps.woodMap,
    normalMap: wMaps.woodNormal,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 0.62,
    metalness: 0.06,
  });

  const olivePolymer = new THREE.MeshStandardMaterial({
    color: 0x577050,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.58,
    metalness: 0.16,
  });
  wMaps.metal.attach(olivePolymer, false);

  const brushedChrome = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughness: 0.22,
    metalness: 0.9,
  });
  wMaps.metal.attach(brushedChrome, false);

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a84e,
    roughness: 0.3,
    metalness: 0.88,
  });

  const opticGlass = new THREE.MeshStandardMaterial({
    color: 0x2a6c7a,
    emissive: 0x16424d,
    emissiveIntensity: 0.8,
    roughness: 0.08,
    metalness: 0.25,
  });

  const accentAmber = new THREE.MeshStandardMaterial({
    color: 0xe8963a,
    emissive: 0xe8963a,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const muzzlePoint = new THREE.Object3D();

  if (weaponId === 'shotgun') {
    // Beveled machined steel receiver with curved top contour
    const receiver = new THREE.Mesh(
      createBeveledBoxGeo(0.078, 0.096, 0.33, 0.016, 0.009),
      gunmetal
    );
    receiver.position.set(0, 0.004, -0.05);

    // Recessed ejection port + glint of red/brass 12g hull
    const ejectPort = new THREE.Mesh(
      createBeveledBoxGeo(0.012, 0.032, 0.092, 0.004, 0.002),
      brushedChrome
    );
    ejectPort.position.set(0.039, 0.016, -0.055);
    const shellGlint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.048, 8),
      brassMat
    );
    shellGlint.rotation.x = Math.PI / 2;
    shellGlint.position.set(0.035, 0.014, -0.055);

    // Ergonomic sculpted walnut stock (2D side profile extruded along X with smooth bevel)
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
      0.012
    );
    stockGeo.rotateY(-Math.PI / 2);
    const stock = new THREE.Mesh(stockGeo, walnut);
    stock.position.set(0, 0.0, 0.0);

    // Rubber recoil buttpad
    const buttPad = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.102, 0.022, 0.012, 0.005),
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

    // Crowned heavy 12ga barrel + ventilated top sighting rib with 5 support posts
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.64, 14), darkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.49);
    const muzzleCrown = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.004, 6, 14), brushedChrome);
    muzzleCrown.position.set(0, 0.032, -0.81);

    const topRib = new THREE.Mesh(
      createBeveledBoxGeo(0.018, 0.009, 0.62, 0.003, 0.002),
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
      createBeveledBoxGeo(0.048, 0.068, 0.028, 0.01, 0.004),
      darkSteel
    );
    barrelClamp.position.set(0, 0.01, -0.68);

    // Contoured ribbed walnut pump forend (LatheGeometry ribbed grip!)
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
      14
    );
    pumpGeo.rotateX(Math.PI / 2);
    const pumpForend = new THREE.Mesh(pumpGeo, walnut);
    pumpForend.scale.set(1.0, 0.92, 1.0);
    pumpForend.position.set(0, -0.016, -0.4);

    const sight = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), accentAmber);
    sight.position.set(0, 0.071, -0.78);

    muzzlePoint.position.set(0, 0.032, -0.84);
    group.add(
      receiver,
      ejectPort,
      shellGlint,
      stock,
      buttPad,
      triggerGuard,
      trigger,
      barrel,
      muzzleCrown,
      topRib,
      magTube,
      magCap,
      barrelClamp,
      pumpForend,
      sight,
      muzzlePoint
    );
    return { group, muzzlePoint, pumpForend };
  }

  if (weaponId === 'awp') {
    // Iconic sculpted olive thumbhole sniper chassis (beveled side profile!)
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
      0.011
    );
    chassisGeo.rotateY(-Math.PI / 2);
    const chassis = new THREE.Mesh(chassisGeo, olivePolymer);

    // Adjustable cheek rest & detachable box magazine
    const cheekRest = new THREE.Mesh(
      createBeveledBoxGeo(0.068, 0.034, 0.14, 0.012, 0.006),
      darkSteel
    );
    cheekRest.position.set(0, 0.046, 0.24);
    const mag = new THREE.Mesh(
      createBeveledBoxGeo(0.056, 0.095, 0.11, 0.008, 0.004),
      darkSteel
    );
    mag.position.set(0, -0.078, -0.14);
    mag.rotation.x = 0.08;

    // Free-floating fluted match barrel + ported multi-chamber muzzle brake
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.023, 0.78, 14), darkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.042, -0.68);

    const brake = new THREE.Mesh(
      createBeveledBoxGeo(0.044, 0.036, 0.095, 0.008, 0.004),
      gunmetal
    );
    brake.position.set(0, 0.042, -1.08);
    for (const bz of [-1.055, -1.085, -1.11]) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.048, 8), darkSteel);
      port.rotation.z = Math.PI / 2;
      port.position.set(0, 0.042, bz);
      group.add(port);
    }

    // Folding front bipod legs tucked neatly beneath forend
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.22, 8), darkSteel);
      leg.rotation.x = Math.PI / 2 - 0.12;
      leg.position.set(side * 0.038, -0.044, -0.45);
      group.add(leg);
    }

    // Stepped LatheGeometry sniper scope + tinted glass lenses + turrets + twin rings
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
      16
    );
    scopeGeo.rotateX(-Math.PI / 2);
    const scopeBody = new THREE.Mesh(scopeGeo, darkSteel);
    scopeBody.position.set(0, 0.118, -0.2);

    const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), opticGlass);
    objLens.position.set(0, 0.118, -0.422);
    objLens.rotation.y = Math.PI;
    const ocuLens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), opticGlass);
    ocuLens.position.set(0, 0.118, 0.042);

    const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.028, 10), gunmetal);
    turretTop.position.set(0, 0.146, -0.18);
    const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.026, 10), gunmetal);
    turretSide.rotation.z = Math.PI / 2;
    turretSide.position.set(0.028, 0.118, -0.18);

    for (const rz of [-0.09, -0.26]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 14), gunmetal);
      ring.position.set(0, 0.118, rz);
      const pillar = new THREE.Mesh(createBeveledBoxGeo(0.028, 0.048, 0.022, 0.004, 0.002), gunmetal);
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
      boltHandle,
      muzzlePoint
    );
    return { group, muzzlePoint, boltHandle };
  }

  if (weaponId === 'pistol') {
    // Beveled dark-steel frame with under-barrel rail
    const frame = new THREE.Mesh(
      createBeveledBoxGeo(0.056, 0.048, 0.31, 0.01, 0.005),
      darkSteel
    );
    frame.position.set(0, 0.004, -0.13);

    // Sculpted Desert Eagle triangular-chamfered brushed chrome slide
    const slide = new THREE.Mesh(
      createBeveledBoxGeo(0.062, 0.058, 0.31, 0.014, 0.008),
      brushedChrome
    );
    slide.position.set(0, 0.048, -0.125);
    // Slide rear serration ribs
    for (let s = 0; s < 5; s++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.006), darkSteel);
      rib.position.set(0, 0.048, 0.005 - s * 0.013);
      slide.add(rib);
    }

    // Ergonomic contoured walnut grip & magazine heel plate
    const gripGeo = createProfileExtrudeGeo(
      [
        [-0.03, 0.01],
        [0.055, 0.01],
        [0.09, -0.145],
        [0.005, -0.155],
      ],
      0.054,
      0.01
    );
    gripGeo.rotateY(-Math.PI / 2);
    const grip = new THREE.Mesh(gripGeo, walnut);
    grip.position.set(0, -0.005, 0.0);

    const magBase = new THREE.Mesh(
      createBeveledBoxGeo(0.054, 0.02, 0.088, 0.008, 0.004),
      darkSteel
    );
    magBase.position.set(0, -0.16, 0.045);

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
      createBeveledBoxGeo(0.012, 0.016, 0.022, 0.003, 0.002),
      accentAmber
    );
    sightFront.position.set(0, 0.084, -0.268);
    const compensator = new THREE.Mesh(
      createBeveledBoxGeo(0.054, 0.052, 0.064, 0.01, 0.005),
      darkSteel
    );
    compensator.position.set(0, 0.044, -0.312);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.02, 10), gunmetal);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, 0.048, -0.342);

    muzzlePoint.position.set(0, 0.048, -0.365);
    group.add(frame, slide, grip, magBase, guard, hammer, sightFront, compensator, bore, muzzlePoint);
    return { group, muzzlePoint, slide };
  }

  if (weaponId === 'minigun') {
    // Stepped LatheGeometry rotary motor housing with cooling fins
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

    // Chainsaw curved tubular top carry handle + mounting brackets
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

    // Beveled olive ammo drum + curved flexible brass-link feed chute!
    const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.17, 16), olivePolymer);
    ammoDrum.position.set(-0.125, -0.145, -0.14);
    const drumRim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.01, 6, 16), darkSteel);
    drumRim.rotation.x = Math.PI / 2;
    drumRim.position.set(-0.125, -0.06, -0.14);

    const chuteCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.125, -0.06, -0.14),
      new THREE.Vector3(-0.14, -0.02, -0.14),
      new THREE.Vector3(-0.085, -0.04, -0.14),
    ]);
    const ammoChute = new THREE.Mesh(
      new THREE.TubeGeometry(chuteCurve, 10, 0.026, 8, false),
      brassMat
    );

    const barrelCluster = new THREE.Group();
    barrelCluster.position.set(0, -0.06, -0.31);
    const singleBarrelGeo = new THREE.CylinderGeometry(0.013, 0.014, 0.74, 10);
    singleBarrelGeo.rotateX(Math.PI / 2);
    const muzzleTipGeo = new THREE.CylinderGeometry(0.0155, 0.0135, 0.042, 10);
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

    muzzlePoint.position.set(0, -0.06, -1.06);
    group.add(housing, handleTop, ammoDrum, drumRim, ammoChute, barrelCluster, muzzlePoint);
    return { group, muzzlePoint, barrelCluster };
  }

  // P90 iconic contoured ergonomic bullpup thumbhole profile (ExtrudeGeometry silhouette, zero boxy bricks!)
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

  // Authentic dual thumbhole ergonomic cutouts inside the P90 frame!
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
  const p90Body = new THREE.Mesh(p90BodyGeo, darkSteel);

  const upperReceiver = new THREE.Mesh(
    createBeveledBoxGeo(0.058, 0.036, 0.4, 0.01, 0.005),
    gunmetal
  );
  upperReceiver.position.set(0, 0.056, -0.14);

  const sideHandle = new THREE.Mesh(
    createBeveledBoxGeo(0.094, 0.018, 0.038, 0.006, 0.003),
    brushedChrome
  );
  sideHandle.position.set(0, 0.032, -0.28);

  // Translucent smoked top-mounted 50-round magazine with visible brass rounds inside
  const topMag = new THREE.Mesh(
    createBeveledBoxGeo(0.054, 0.032, 0.34, 0.008, 0.004),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: p90MagTex.map,
      normalMap: p90MagTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.24,
      metalness: 0.22,
      transparent: true,
      opacity: 0.88,
    })
  );
  topMag.position.set(0, 0.084, -0.09);

  // Sculpted integrated ring sight bridge & glowing holographic lens
  const opticBridge = new THREE.Mesh(
    createBeveledBoxGeo(0.044, 0.052, 0.115, 0.01, 0.005),
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
    muzzlePoint
  );
  return { group, muzzlePoint };
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

  const trackMat = (m: THREE.MeshStandardMaterial, isGlowing = false) => {
    hitMaterials.push(m);
    baseEmissiveColors.push(m.emissive.getHex());
    if (isGlowing) emissiveParts.push(m);
    return m;
  };

  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26282c,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughness: 0.7,
      metalness: 0.18,
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
      new THREE.MeshStandardMaterial({
        color: 0xd6cfc2,
        normalScale: new THREE.Vector2(1.45, 1.45),
        roughness: 1.0,
        metalness: 0.04,
      })
    );
    eMaps.skin.attach(skinMat, true);

    const ragMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa4adb8,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 1.0,
        metalness: 0.05,
      })
    );
    eMaps.wool.attach(ragMat, true);

    const trouserMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5c6470,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 1.0,
        metalness: 0.05,
      })
    );
    eMaps.wool.attach(trouserMat, true);

    const scleraMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.16, metalness: 0.12 })
    );
    const eyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2828,
        emissive: 0xff1111,
        emissiveIntensity: 4.2,
        roughness: 0.15,
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
    const jawMaw = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), scleraMat);
    jawMaw.scale.set(0.95, 1.25, 0.55);
    jawMaw.position.set(0, -0.09, 0.155);
    headMesh.add(brow, jawMaw);

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
      new THREE.MeshStandardMaterial({
        color: 0x9aa4b4,
        normalScale: new THREE.Vector2(1.55, 1.55),
        roughness: 1.0,
        metalness: 0.06,
      })
    );
    eMaps.wool.attach(coatMat, true);

    const trouserMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4b5260,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 1.0,
        metalness: 0.06,
      })
    );
    eMaps.wool.attach(trouserMat, true);

    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc9c2b8,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 1.0,
        metalness: 0.04,
      })
    );
    eMaps.skin.attach(skinMat, true);

    const cageMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7c8694,
        normalScale: new THREE.Vector2(1.25, 1.25),
        roughness: 1.0,
        metalness: 0.82,
      })
    );
    wMaps.metal.attach(cageMat, true);

    const glowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffd280,
        normalMap: wMaps.metal.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        emissive: 0xe8963a,
        emissiveIntensity: 3.6,
        roughness: 0.18,
      }),
      true
    );

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

    // Double row of metallic coat buttons
    for (let b = 0; b < 3; b++) {
      for (const side of [-0.07, 0.07]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), cageMat);
        btn.position.set(side, 0.2 + b * 0.17, 0.25);
        spineGroup.add(btn);
      }
    }

    neckGroup.position.set(0, 0.92, 0);
    spineGroup.add(neckGroup);

    // Intricate wrought-iron lampshade head: fluted brass cap, 8 filigree ribs, lower shade ring & glowing bulb!
    headMesh = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.32, -0.02],
          [0.33, 0.03],
          [0.27, 0.14],
          [0.22, 0.34],
          [0.16, 0.42],
          [0.04, 0.49],
          [0.01, 0.56],
        ],
        14
      ),
      cageMat
    );
    headMesh.position.y = 0.06;
    headMesh.castShadow = true;

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), glowMat);
    bulb.position.y = 0.16;
    headMesh.add(bulb);

    for (let r = 0; r < 6; r++) {
      const ang = (r / 6) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.36, 4, 6), cageMat);
      rib.position.set(Math.cos(ang) * 0.26, 0.2, Math.sin(ang) * 0.26);
      rib.rotation.z = -Math.cos(ang) * 0.24;
      rib.rotation.x = Math.sin(ang) * 0.24;
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
      new THREE.MeshStandardMaterial({
        color: 0x9c95a8,
        normalScale: new THREE.Vector2(1.55, 1.55),
        roughness: 1.0,
        metalness: 0.05,
      })
    );
    eMaps.wool.attach(robeMat, true);

    const maskMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe8e2d6,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 1.0,
        metalness: 0.06,
      })
    );
    eMaps.skin.attach(maskMat, true);

    const shriekCoreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff5a5a,
        emissive: 0xc93b3b,
        emissiveIntensity: 3.4,
        roughness: 0.22,
      }),
      true
    );

    const exeSocketMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.16 })
    );
    const exePupilMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff2020,
        emissive: 0xff1414,
        emissiveIntensity: 4.6,
        roughness: 0.15,
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

    const sEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 10), exeSocketMat);
    sEyeL.scale.set(0.85, 1.35, 0.75);
    sEyeL.position.set(0.082, 0.1, 0.16);
    const sPupilL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), exePupilMat);
    sPupilL.position.set(0, 0, 0.048);
    sEyeL.add(sPupilL);
    const sEyeR = sEyeL.clone();
    sEyeR.position.x = -0.082;

    const mouthOuter = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), exeSocketMat);
    mouthOuter.scale.set(0.72, 1.48, 0.55);
    mouthOuter.position.set(0, -0.09, 0.155);
    const mouthCore = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 10), shriekCoreMat);
    mouthCore.scale.set(0.68, 1.35, 0.5);
    mouthCore.position.set(0, -0.09, 0.17);
    headMesh.add(sEyeL, sEyeR, mouthOuter, mouthCore);
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
      new THREE.MeshStandardMaterial({
        color: 0x9aa2b0,
        normalScale: new THREE.Vector2(1.65, 1.65),
        roughness: 1.0,
        metalness: 0.08,
      })
    );
    eMaps.wool.attach(heavyCoat, true);

    const armorLegMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4f5662,
        normalScale: new THREE.Vector2(1.4, 1.4),
        roughness: 0.85,
        metalness: 0.25,
      })
    );
    eMaps.wool.attach(armorLegMat, true);

    const maskMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xebe4d8,
        normalScale: new THREE.Vector2(1.55, 1.55),
        roughness: 1.0,
        metalness: 0.08,
      })
    );
    eMaps.skin.attach(maskMat, true);

    const lanternMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffc66b,
        normalMap: wMaps.metal.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        emissive: 0xe8963a,
        emissiveIntensity: 4.0,
        roughness: 0.18,
      }),
      true
    );
    const ironMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x788290,
        normalScale: new THREE.Vector2(1.25, 1.25),
        roughness: 1.0,
        metalness: 0.86,
      })
    );
    wMaps.metal.attach(ironMat, true);

    const bossSocketMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.15 })
    );
    const bossRedEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff1e1e,
        emissive: 0xff1111,
        emissiveIntensity: 5.0,
        roughness: 0.15,
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

    // Curved sculpted iron shoulder pauldrons & high storm collar (replaces boxy shoulders!)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
        ironMat
      );
      pauldron.scale.set(1.12, 0.78, 1.05);
      pauldron.position.set(side * 0.72, 1.08, 0.0);
      pauldron.rotation.z = -side * 0.32;
      pauldron.castShadow = true;
      spineGroup.add(pauldron);
    }
    const highCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.56, 0.32, 14, 1, true, Math.PI * 0.18, Math.PI * 1.64),
      heavyCoat
    );
    highCollar.rotation.y = Math.PI;
    highCollar.position.set(0, 1.32, -0.06);
    spineGroup.add(highCollar);

    // Caged chest furnace lantern with iron bars
    const chestLanternCore = new THREE.Mesh(
      createLatheProfileGeo(
        [
          [0.21, -0.26],
          [0.25, 0.0],
          [0.21, 0.26],
        ],
        12
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

    neckGroup.position.set(0, 1.32, 0.04);
    spineGroup.add(neckGroup);

    // Sculpted elongated Watchman mask with iron brow crown
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

    const crownRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.036, 8, 16), ironMat);
    crownRim.rotation.x = Math.PI / 2;
    crownRim.position.set(0, 0.34, 0);
    headMesh.add(crownRim);

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

  // Angled reflective windshield, rear window & side greenhouse glass
  const windshield = new THREE.Mesh(
    createBeveledBoxGeo(1.42, 0.56, 0.05, 0.04, 0.01),
    materials.windowDark
  );
  windshield.position.set(0, 1.15, 0.69);
  windshield.rotation.x = -0.68;

  const rearGlass = new THREE.Mesh(
    createBeveledBoxGeo(1.4, 0.52, 0.05, 0.04, 0.01),
    materials.windowDark
  );
  rearGlass.position.set(0, 1.14, -1.14);
  rearGlass.rotation.x = 0.62;

  const sideGlass = new THREE.Mesh(
    createBeveledBoxGeo(1.66, 0.38, 1.56, 0.04, 0.01),
    materials.windowDark
  );
  sideGlass.position.set(0, 1.14, -0.25);
  group.add(windshield, rearGlass, sideGlass);

  // Chrome wrap-around front & rear bumpers + bumperettes
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
      materials.grimeMetal
    );
    bar.castShadow = true;
    group.add(bar);
  };
  makeBumper(2.1, 1);
  makeBumper(-2.1, -1);

  // Ribbed chrome radiator grille + hood chrome strip
  const grille = new THREE.Mesh(
    createBeveledBoxGeo(1.06, 0.24, 0.06, 0.03, 0.012),
    materials.grimeMetal
  );
  grille.position.set(0, 0.64, 2.04);
  group.add(grille);

  // Iconic Soviet round chrome-bezeled headlights + glowing glass lenses & rear tail clusters
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    map: materials.frostedGlass.map,
    normalMap: materials.frostedGlass.normalMap,
    emissive: 0xffb85c,
    emissiveIntensity: 3.6,
    roughness: 0.18,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff4242,
    map: materials.frostedGlass.map,
    emissive: 0xc92424,
    emissiveIntensity: 2.3,
    roughness: 0.25,
  });
  for (const side of [-0.62, 0.62]) {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 8, 16), materials.grimeMetal);
    bezel.position.set(side, 0.66, 2.055);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 14), headlightMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(side, 0.66, 2.045);

    const tl = new THREE.Mesh(
      createBeveledBoxGeo(0.24, 0.14, 0.06, 0.025, 0.01),
      taillightMat
    );
    tl.position.set(side, 0.66, -2.05);

    // Chrome wing side mirrors & door handles
    const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), materials.grimeMetal);
    mirrorArm.rotation.z = side > 0 ? -0.9 : 0.9;
    mirrorArm.position.set(side * 1.38, 0.98, 0.56);
    const mirrorHead = new THREE.Mesh(
      createBeveledBoxGeo(0.13, 0.085, 0.05, 0.02, 0.008),
      materials.grimeMetal
    );
    mirrorHead.position.set(side * 1.48, 1.02, 0.54);

    const doorHandle = new THREE.Mesh(
      createBeveledBoxGeo(0.03, 0.026, 0.14, 0.006, 0.004),
      materials.grimeMetal
    );
    doorHandle.position.set(side * 1.37, 0.82, -0.15);

    group.add(bezel, lens, tl, mirrorArm, mirrorHead, doorHandle);
  }

  // 4 treaded rubber wheels with flared wheel-arch trim & domed chrome Soviet hubcaps
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.23, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.245, 14);
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
    const rim = new THREE.Mesh(rimGeo, materials.grimeMetal);
    rim.position.set(wx, 0.34, wz);
    const hub = new THREE.Mesh(hubGeo, materials.grimeMetal);
    hub.position.set(wx + (wx > 0 ? 0.095 : -0.095), 0.34, wz);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.035, 6, 14, Math.PI),
      materials.carPaint
    );
    arch.rotation.y = Math.PI / 2;
    arch.position.set(wx * 0.99, 0.36, wz);
    group.add(tire, rim, hub, arch);
  }

  // Warm road headlight wash projected onto wet asphalt ahead of the car
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128;
  poolCanvas.height = 128;
  const pctx = poolCanvas.getContext('2d')!;
  const pgrad = pctx.createRadialGradient(64, 24, 4, 64, 64, 62);
  pgrad.addColorStop(0, 'rgba(255, 210, 130, 0.34)');
  pgrad.addColorStop(0.55, 'rgba(232, 150, 62, 0.12)');
  pgrad.addColorStop(1, 'rgba(232, 150, 62, 0)');
  pctx.fillStyle = pgrad;
  pctx.fillRect(0, 0, 128, 128);
  const beamPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 7.6),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(poolCanvas),
      transparent: true,
      opacity: 0.78,
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
 * Organic sculpted spruce bough whorl — displaces a subdivided cone into irregular
 * drooping branch lobes so background pines never read as smooth geometric cones.
 */
export function createSculptedSpruceTierGeo(
  radius: number,
  height: number,
  yOffset: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, 11, 4, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 0.04) {
      const ang = Math.atan2(v.z, v.x);
      // Normalized height 0 at bottom rim, 1 at apex
      const hNorm = Math.max(0, Math.min(1, (v.y + height * 0.5) / height));
      const boughLobe =
        0.82 +
        0.24 * Math.sin(ang * 5 + seed * 1.7) +
        0.13 * Math.cos(ang * 3 - seed * 2.3);
      const radialJitter = 1 + (1 - hNorm) * (boughLobe - 1);
      v.x *= radialJitter;
      v.z *= radialJitter;
      // Droop lower bough tips naturally under night rain weight
      const droop = (1 - hNorm) * (1 - hNorm) * (0.28 + 0.16 * Math.sin(ang * 5 + seed));
      v.y -= droop * radius * 0.22;
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
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 8, 5);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const hNorm = (v.y + height * 0.5) / height; // 0 bottom .. 1 top
    const ang = Math.atan2(v.z, v.x);
    // Root buttress flare near ground
    const rootFlare = hNorm < 0.25 ? 1 + (1 - hNorm / 0.25) * (0.38 + 0.18 * Math.sin(ang * 4)) : 1;
    // Slight natural S-curve crook
    const bendX = Math.sin(hNorm * Math.PI) * 0.09;
    const bendZ = Math.cos(hNorm * Math.PI * 1.3) * 0.05;
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
  const geo = new THREE.IcosahedronGeometry(1.95, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const lump =
      0.86 +
      0.22 * Math.sin(ang * 3.0 + v.y * 1.4) +
      0.14 * Math.cos(v.x * 1.9 - v.z * 1.6);
    v.x *= lump * 0.92;
    v.z *= lump * 0.92;
    v.y = v.y * lump * 1.28 + 5.8;
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

