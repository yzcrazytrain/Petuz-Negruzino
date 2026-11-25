import * as THREE from 'three';
import type { RangeDummySpec } from './types';

function makeLabelCanvasTexture(
  text: string,
  bg = '#1b201c',
  fg = '#f6d48b',
  border = '#d98a2b'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, c.width - 8, c.height - 8);
  ctx.fillStyle = fg;
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface RangeDummyRig {
  spec: RangeDummySpec;
  root: THREE.Group;
  pivot: THREE.Group;
  hpFill: THREE.Mesh;
  hpBg: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  hp: number;
  maxHp: number;
  hitTilt: number;
  respawnTimer: number;
  hitFlash: number;
}

export interface AnimatedZoneProp {
  kind: 'core_ring' | 'radar_dish' | 'car_halo' | 'terminal_beacon';
  mesh: THREE.Object3D;
  speed: number;
  axis: 'x' | 'y' | 'z';
  baseY: number;
}

// =============================================================================
// HUB MODELS (Bright Golden-Hour Safe Garage & Firing Range)
// =============================================================================

export function createHubGarageBuilding(): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xc9b497,
    roughness: 0.88,
    metalness: 0.04,
  });
  const brickTrim = new THREE.MeshStandardMaterial({
    color: 0x8a4d38,
    roughness: 0.86,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x4c5856,
    roughness: 0.72,
    metalness: 0.25,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x3b5949,
    roughness: 0.58,
    metalness: 0.42,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: 0xffb84d,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });

  // Main brick/stucco garage body (width 28, depth 5.5, height 4.4)
  const body = new THREE.Mesh(new THREE.BoxGeometry(27.6, 4.3, 5.4), wallMat);
  body.position.set(0, 2.15, 21.2);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Lower brick plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(27.9, 0.9, 5.65), brickTrim);
  plinth.position.set(0, 0.45, 21.2);
  plinth.receiveShadow = true;
  g.add(plinth);

  // Pitched metal roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(28.8, 0.35, 6.6), roofMat);
  roof.position.set(0, 4.48, 21.0);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  g.add(roof);

  // Two large steel double garage doors facing north (-Z)
  for (const dx of [-6.2, 6.2]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.2, 0.28), brickTrim);
    frame.position.set(dx, 1.65, 18.46);
    g.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.95, 0.24), doorMat);
    door.position.set(dx, 1.52, 18.38);
    door.receiveShadow = true;
    g.add(door);

    // Center seam + cross braces
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.95, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x222c26, roughness: 0.5 })
    );
    seam.position.set(dx, 1.52, 18.34);
    g.add(seam);
  }

  // Center warm workshop window + glowing garage sign
  const win = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 0.16), warmWindowMat);
  win.position.set(0, 2.3, 18.45);
  g.add(win);

  const signTex = makeLabelCanvasTexture('ГАРАЖ · 1994', '#233229', '#ffe19e', '#d98a2b');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.95, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })
  );
  sign.position.set(0, 3.85, 18.32);
  g.add(sign);

  return g;
}

export function createHubToolShed(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5a3c, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4b4a46, roughness: 0.78 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3f6880, roughness: 0.5, metalness: 0.4 });
  const jerryMat = new THREE.MeshStandardMaterial({ color: 0xa63c2b, roughness: 0.55, metalness: 0.35 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.1, 13.6), woodMat);
  body.position.set(-20.8, 1.55, 1.0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 14.4), roofMat);
  roof.position.set(-20.6, 3.28, 1.0);
  roof.rotation.z = -0.1;
  roof.castShadow = true;
  g.add(roof);

  // Decorative fuel barrels & red jerrycans outside shed
  for (let i = 0; i < 3; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.02, 12), barrelMat);
    barrel.position.set(-16.9, 0.51, -2.5 + i * 0.95);
    barrel.castShadow = true;
    g.add(barrel);
  }
  const can = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.2), jerryMat);
  can.position.set(-16.7, 0.26, 2.2);
  g.add(can);

  return g;
}

export function createSpecsTerminalStand(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[]
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4c32, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x454e52, roughness: 0.45, metalness: 0.55 });
  const crtCaseMat = new THREE.MeshStandardMaterial({ color: 0xc2b99f, roughness: 0.7 });
  const screenTex = makeLabelCanvasTexture('ТТХ · 1994', '#0e241b', '#7affc2', '#44d694');
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0x2ec785,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  // Heavy wooden workbench table
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 4.8), woodMat);
  tableTop.position.set(2.4, 0.98, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  g.add(tableTop);

  for (const lx of [1.3, 3.5]) {
    for (const lz of [-2.1, 2.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.96, 0.14), steelMat);
      leg.position.set(lx, 0.48, lz);
      leg.castShadow = true;
      g.add(leg);
    }
  }

  // Overhead corrugated metal awning over the specs bench
  for (const lz of [-2.3, 2.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 8), steelMat);
    post.position.set(3.4, 1.55, lz);
    g.add(post);
  }
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.12, 5.4),
    new THREE.MeshStandardMaterial({ color: 0x4d5b57, roughness: 0.65, metalness: 0.35 })
  );
  canopy.position.set(2.4, 3.1, 0);
  canopy.rotation.z = 0.12;
  canopy.castShadow = true;
  g.add(canopy);

  // Retro CRT monitor facing west (-X) toward the courtyard
  const crtBody = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.72), crtCaseMat);
  crtBody.position.set(2.15, 1.38, 0);
  crtBody.castShadow = true;
  g.add(crtBody);

  const crtScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.44), screenMat);
  crtScreen.position.set(1.8, 1.4, 0);
  crtScreen.rotation.y = -Math.PI / 2;
  g.add(crtScreen);

  // Keyboard & ammo display crate on table
  const kbd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.64), crtCaseMat);
  kbd.position.set(1.52, 1.09, 0);
  g.add(kbd);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.42, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x4c5d3a, roughness: 0.82 })
  );
  crate.position.set(2.35, 1.27, -1.55);
  g.add(crate);

  // Overhead sign
  const signTex = makeLabelCanvasTexture('СТЕНД ТТХ', '#192a24', '#86ffca', '#44d694');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.65, 2.2),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x194d36, emissiveIntensity: 0.45 })
  );
  sign.position.set(1.1, 2.7, 0);
  g.add(sign);

  // Pulsing ground interaction ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4ae0a0,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.32, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.1, 0.04, 0);
  g.add(ring);
  animatedOut.push({ kind: 'terminal_beacon', mesh: ring, speed: 2.0, axis: 'z', baseY: 0.04 });

  return g;
}

export function createFiringRangeStructure(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5b3e, roughness: 0.88 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3f474a, roughness: 0.55, metalness: 0.45 });
  const bermMat = new THREE.MeshStandardMaterial({ color: 0x5d503f, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd98a2b, roughness: 0.55 });

  // Waist-high firing line counters (left and right with a center walkway gap)
  for (const [cx, w] of [
    [-7.45, 10.1],
    [7.45, 10.1],
  ]) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 1.05, 0.72), woodMat);
    counter.position.set(cx, 0.525, -2.2);
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.1, 0.88), stripeMat);
    topCap.position.set(cx, 1.08, -2.2);
    g.add(topCap);
  }

  // Range overhead banner gantry ("ТИР / ПОЛИГОН")
  for (const px of [-12.4, 12.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 0.28), steelMat);
    post.position.set(px, 1.9, -2.2);
    post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.22, 0.26), steelMat);
  beam.position.set(0, 3.7, -2.2);
  g.add(beam);

  const rangeSignTex = makeLabelCanvasTexture('ТИР · 10–22м', '#23201b', '#ffd57a', '#d98a2b');
  const rangeSign = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.85, 0.14),
    new THREE.MeshStandardMaterial({ map: rangeSignTex, roughness: 0.5 })
  );
  rangeSign.position.set(0, 3.65, -2.02);
  g.add(rangeSign);

  // Distance line markers painted on the gravel range floor
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xe6c37a,
    transparent: true,
    opacity: 0.55,
  });
  for (const lz of [-7.5, -11.5, -17.0]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.14), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.03, lz + 1.1);
    g.add(line);
  }

  // Timber & earth backstop berm at the north edge of the firing range
  const backstop = new THREE.Mesh(new THREE.BoxGeometry(29.5, 3.5, 1.8), bermMat);
  backstop.position.set(0, 1.75, -22.6);
  backstop.receiveShadow = true;
  backstop.castShadow = true;
  g.add(backstop);

  // Corrugated steel bullet trap panels on berm face
  for (let i = -3; i <= 3; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 0.16), steelMat);
    plate.position.set(i * 4.0, 1.55, -21.65);
    plate.receiveShadow = true;
    g.add(plate);
  }

  return g;
}

export function createRangeDummyRig(spec: RangeDummySpec): RangeDummyRig {
  const root = new THREE.Group();
  root.position.set(spec.x, 0, spec.z);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x5c5b56, roughness: 0.9 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6f5136, roughness: 0.85 });

  // Grounded concrete stand
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.72), baseMat);
  base.position.y = 0.11;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  // Spring-loaded pivot that kicks backward when shot
  const pivot = new THREE.Group();
  pivot.position.y = 0.22;
  root.add(pivot);

  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), postMat);
  stem.position.y = 0.28;
  pivot.add(stem);

  const tintMap: Record<RangeDummySpec['kind'], number> = {
    crawler: 0xc29e74,
    lampshade: 0x9aa8b8,
    screamer: 0xc98b7b,
    heavy: 0x5c6870,
  };
  const bodyMat = new THREE.MeshStandardMaterial({
    color: tintMap[spec.kind],
    roughness: spec.kind === 'heavy' ? 0.45 : 0.78,
    metalness: spec.kind === 'heavy' ? 0.55 : 0.05,
  });

  // Silhouette torso
  const torsoW = spec.kind === 'heavy' ? 0.88 : 0.68;
  const torsoH = spec.kind === 'heavy' ? 1.04 : 0.92;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, 0.24), bodyMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  torso.receiveShadow = true;
  pivot.add(torso);

  // Painted bullseye chest ring
  const bullMat = new THREE.MeshStandardMaterial({ color: 0xd93c2e, roughness: 0.6 });
  const bullWhite = new THREE.MeshStandardMaterial({ color: 0xf4ead3, roughness: 0.7 });
  const outerBull = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), bullWhite);
  outerBull.rotation.x = Math.PI / 2;
  outerBull.position.set(0, 1.02, 0.13);
  pivot.add(outerBull);

  const innerBull = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16), bullMat);
  innerBull.rotation.x = Math.PI / 2;
  innerBull.position.set(0, 1.02, 0.135);
  pivot.add(innerBull);

  // Head silhouette (headshot zone)
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.34, 14), bodyMat);
  head.position.y = 1.66;
  head.castShadow = true;
  pivot.add(head);

  const headTarget = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), bullMat);
  headTarget.rotation.x = Math.PI / 2;
  headTarget.position.set(0, 1.66, 0.19);
  pivot.add(headTarget);

  // Distance plaque at base
  const plaqueTex = makeLabelCanvasTexture(spec.distanceLabel, '#1c1d1a', '#f7d589', '#c97b2c');
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.24, 0.06),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.6 })
  );
  plaque.position.set(0, 0.26, 0.36);
  root.add(plaque);

  // Floating HP bar above head
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x161918, side: THREE.DoubleSide })
  );
  hpBg.position.set(0, 2.22, 0);
  root.add(hpBg);

  const hpFill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.075),
    new THREE.MeshBasicMaterial({ color: 0x4ae09c, side: THREE.DoubleSide })
  );
  hpFill.position.set(0, 2.22, 0.01);
  root.add(hpFill);

  return {
    spec,
    root,
    pivot,
    hpFill,
    hpBg,
    bodyMat,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    hitTilt: 0,
    respawnTimer: 0,
    hitFlash: 0,
  };
}

export function createDepartureCarHalo(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[]
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf0ad4e,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.2, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  animatedOut.push({ kind: 'car_halo', mesh: ring, speed: 1.5, axis: 'z', baseY: 0.05 });

  // Floating sign board over the Moskvitch departure zone
  const signTex = makeLabelCanvasTexture('ВЫЕЗД · МОСКВИЧ', '#1e271d', '#ffe08a', '#f0ad4e');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.72),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 2.9, 0);
  g.add(sign);
  animatedOut.push({ kind: 'car_halo', mesh: sign, speed: 1.9, axis: 'y', baseY: 2.9 });

  return g;
}

// =============================================================================
// LOCATION 2: BUS DEPOT #4 & CHECKPOINT-3 ("Автопарк №4")
// =============================================================================

export function createBus404Wreck(): THREE.Group {
  const g = new THREE.Group();
  const bodyOchre = new THREE.MeshStandardMaterial({ color: 0xb5863d, roughness: 0.65, metalness: 0.2 });
  const bodyCream = new THREE.MeshStandardMaterial({ color: 0xd9cfb6, roughness: 0.72 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.55, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd288,
    emissive: 0xd98a2b,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.4,
  });

  // Lower skirt & upper cream cabin (LiAZ-677 proportions: 4.8 wide? Actually 2.6m wide x 10.2m long)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.3, 10.4), bodyOchre);
  lower.position.y = 1.05;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.25, 10.2), bodyCream);
  upper.position.y = 2.32;
  upper.castShadow = true;
  g.add(upper);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 9.8), bodyOchre);
  roof.position.y = 3.04;
  g.add(roof);

  // Glowing side windows
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.82, 8.6), glassMat);
  sideWin.position.y = 2.28;
  g.add(sideWin);

  // Route 404 illuminated front destination board
  const boardTex = makeLabelCanvasTexture('РЕЙС №404', '#1f1a14', '#ffe199', '#d98a2b');
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.44, 0.1),
    new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0x804b14, emissiveIntensity: 0.6 })
  );
  board.position.set(0, 2.75, 5.15);
  g.add(board);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const wx of [-1.3, 1.3]) {
    for (const wz of [-3.3, 3.1]) {
      const w = new THREE.Mesh(wheelGeo, darkMetal);
      w.position.set(wx, 0.48, wz);
      g.add(w);
    }
  }

  // Headlights glowing softly into the mist
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  for (const hx of [-0.9, 0.9]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), lampMat);
    hl.position.set(hx, 0.95, 5.22);
    g.add(hl);
  }

  return g;
}

export function createKppGuardhouse(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x383d3e, roughness: 0.7 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xc97b2c,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.4, 5.6), concMat);
  body.position.y = 1.7;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.32, 6.4), roofMat);
  roof.position.y = 3.56;
  g.add(roof);

  const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 3.6), winMat);
  win.position.set(3.32, 2.0, 0);
  g.add(win);

  const signTex = makeLabelCanvasTexture('КПП-3 · 1994', '#1d1c19', '#f5cb75', '#c84b31');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.72, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })
  );
  sign.position.set(0, 3.1, 2.86);
  g.add(sign);

  // Raised striped barrier gate arm jutting over the road
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.16, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.6 })
  );
  arm.position.set(5.4, 2.6, 1.8);
  arm.rotation.z = 0.38;
  g.add(arm);

  return g;
}

export function createDepotHangar(
  x: number,
  z: number,
  width: number,
  depth: number,
  facingDir: 1 | -1
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x4b5358,
    roughness: 0.68,
    metalness: 0.38,
  });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x626664, roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x35464f, roughness: 0.55, metalness: 0.45 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 5.6, depth), steelMat);
  body.position.y = 2.8;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 1.4, depth + 0.3), concreteMat);
  base.position.y = 0.7;
  g.add(base);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.52, width * 0.52, depth + 0.4, 10, 1, false, 0, Math.PI),
    steelMat
  );
  roof.rotation.x = Math.PI / 2;
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.32, 1, 1);
  roof.position.y = 5.6;
  g.add(roof);

  // Wide bay door shutters facing central tarmac
  for (const dz of [-depth * 0.24, depth * 0.24]) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.1, 4.6), doorMat);
    bay.position.set(facingDir * (width * 0.5 + 0.04), 2.05, dz);
    g.add(bay);
  }

  return g;
}

export function createFuelCistern(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x736c5e,
    roughness: 0.65,
    metalness: 0.35,
  });
  const rustBand = new THREE.MeshStandardMaterial({ color: 0x994a2b, roughness: 0.75 });
  const concMat = new THREE.MeshStandardMaterial({ color: 0x5c605e, roughness: 0.92 });

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 9.2, 16), tankMat);
  cyl.rotation.z = Math.PI / 2;
  cyl.position.y = 2.15;
  cyl.castShadow = true;
  cyl.receiveShadow = true;
  g.add(cyl);

  for (const bx of [-2.4, 0, 2.4]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.35, 16), rustBand);
    band.rotation.z = Math.PI / 2;
    band.position.set(bx, 2.15, 0);
    g.add(band);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 3.2), concMat);
    saddle.position.set(bx, 0.75, 0);
    g.add(saddle);
  }

  return g;
}

export function createDispatchTower(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[]
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = new THREE.MeshStandardMaterial({ color: 0x62676a, roughness: 0.88 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.5, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99e0ff,
    emissive: 0x3a9bd6,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.4, 7.2), concMat);
  base.position.y = 2.2;
  base.castShadow = true;
  g.add(base);

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 4.2), concMat);
  shaft.position.y = 6.5;
  g.add(shaft);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 5.6), steelMat);
  cabin.position.y = 9.7;
  g.add(cabin);

  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(5.72, 1.15, 5.72), glassMat);
  cabinGlass.position.y = 9.85;
  g.add(cabinGlass);

  // Rotating radar dish on top
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 11.4, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.4, 8), steelMat);
  dishGroup.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.35, 0.55, 14), concMat);
  dish.rotation.x = Math.PI / 2.4;
  dish.position.set(0, 0.65, 0.45);
  dishGroup.add(dish);
  g.add(dishGroup);
  animatedOut.push({ kind: 'radar_dish', mesh: dishGroup, speed: 0.85, axis: 'y', baseY: 11.4 });

  return g;
}

// =============================================================================
// LOCATION 3: SUBSTATION "LUCH-94" & RESONATOR CORE ("Подстанция «Луч-94»")
// =============================================================================

export function createResonatorCoreTower(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[]
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = new THREE.MeshStandardMaterial({ color: 0x454a52, roughness: 0.85 });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb86f3a,
    roughness: 0.38,
    metalness: 0.72,
  });
  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x7ef2ff,
    emissive: 0x2ec8e6,
    emissiveIntensity: 1.5,
    roughness: 0.15,
  });
  const amberGlow = new THREE.MeshStandardMaterial({
    color: 0xffd57a,
    emissive: 0xe6952e,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });

  // Heavy octagonal pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.1, 1.8, 8), concMat);
  ped.position.y = 0.9;
  ped.castShadow = true;
  ped.receiveShadow = true;
  g.add(ped);

  // Central copper coil column
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 7.4, 14), copperMat);
  col.position.y = 5.4;
  col.castShadow = true;
  g.add(col);

  // Stacked insulator discs
  for (let i = 0; i < 6; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.22, 16), concMat);
    disc.position.y = 2.4 + i * 1.1;
    g.add(disc);
  }

  // Pulsing energy sphere inside the upper resonator crown
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 14), cyanGlow);
  orb.position.y = 9.4;
  g.add(orb);

  // 3 counter-rotating magnetic rings
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.11, 10, 32), cyanGlow);
  ring1.position.y = 9.4;
  g.add(ring1);
  animatedOut.push({ kind: 'core_ring', mesh: ring1, speed: 1.15, axis: 'y', baseY: 9.4 });

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.1, 10, 32), amberGlow);
  ring2.position.y = 9.4;
  ring2.rotation.x = Math.PI / 3;
  g.add(ring2);
  animatedOut.push({ kind: 'core_ring', mesh: ring2, speed: -0.95, axis: 'x', baseY: 9.4 });

  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.08, 10, 32), cyanGlow);
  ring3.position.y = 9.4;
  ring3.rotation.z = Math.PI / 4;
  g.add(ring3);
  animatedOut.push({ kind: 'core_ring', mesh: ring3, speed: 0.72, axis: 'z', baseY: 9.4 });

  return g;
}

export function createCoolingPylon(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = new THREE.MeshStandardMaterial({ color: 0x52575e, roughness: 0.88 });
  const louverMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const glowStrip = new THREE.MeshStandardMaterial({
    color: 0x6ce5ff,
    emissive: 0x26b4d9,
    emissiveIntensity: 1.1,
  });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.6, 9.2, 8), concMat);
  tower.position.y = 4.6;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 0.75, 8), louverMat);
  cap.position.y = 9.4;
  g.add(cap);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.2, 0.16), glowStrip);
    strip.position.set(Math.cos(angle) * 2.18, 4.8, Math.sin(angle) * 2.18);
    g.add(strip);
  }

  return g;
}

export function createCapacitorBank(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const hallMat = new THREE.MeshStandardMaterial({ color: 0x4b5058, roughness: 0.88 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x8e5d43, roughness: 0.35, metalness: 0.15 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x323840, roughness: 0.5, metalness: 0.6 });

  const hall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.8, 13.4), hallMat);
  hall.position.y = 2.4;
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  // Rooftop high-voltage ceramic insulators
  for (let iz = -4.5; iz <= 4.5; iz += 3.0) {
    for (const ix of [-1.6, 1.6]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.1, 10), ceramicMat);
      ins.position.set(ix, 5.85, iz);
      g.add(ins);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.12), steelMat);
    bar.position.set(0, 6.85, iz);
    g.add(bar);
  }

  return g;
}

export function createArchiveBunker(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = new THREE.MeshStandardMaterial({ color: 0x525454, roughness: 0.92 });
  const blastMat = new THREE.MeshStandardMaterial({ color: 0x3b4448, roughness: 0.5, metalness: 0.55 });

  const vault = new THREE.Mesh(new THREE.BoxGeometry(21.4, 4.8, 8.6), concMat);
  vault.position.y = 2.4;
  vault.castShadow = true;
  vault.receiveShadow = true;
  g.add(vault);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 0.5), concMat);
  doorFrame.position.set(0, 1.9, 4.45);
  g.add(doorFrame);

  const blastDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 0.35), blastMat);
  blastDoor.position.set(0, 1.65, 4.6);
  g.add(blastDoor);

  const signTex = makeLabelCanvasTexture('АРХИВ «ЛУЧ-94»', '#151e24', '#85e8ff', '#2ec8e6');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.85, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x154d5c, emissiveIntensity: 0.6 })
  );
  sign.position.set(0, 4.15, 4.48);
  g.add(sign);

  return g;
}
