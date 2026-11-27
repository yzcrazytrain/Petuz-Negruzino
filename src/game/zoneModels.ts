import * as THREE from 'three';
import type { HubCourtyardMaterials, WorldMaterialSet } from './textures';
import type { RangeDummySpec } from './types';

function makeLabelCanvasTexture(
  text: string,
  bg = '#1b201c',
  fg = '#f6d48b',
  border = '#d98a2b'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  // Subtle weathered Soviet enamel plate background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, '#121514');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Outer & inner enamel framing
  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32);

  // 4 corner bolt rivets
  ctx.fillStyle = 'rgba(220, 214, 195, 0.55)';
  for (const [rx, ry] of [
    [24, 24],
    [c.width - 24, 24],
    [24, c.height - 24],
    [c.width - 24, c.height - 24],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Auto-fit monospace typography so Cyrillic/Latin text NEVER clips horizontally
  const maxWidth = c.width - 68;
  let fontSize = 48;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (fontSize > 22) {
    ctx.font = `bold ${fontSize}px monospace`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(text, c.width / 2 + 2, c.height / 2 + 3, maxWidth);
  ctx.fillStyle = fg;
  ctx.fillText(text, c.width / 2, c.height / 2 + 1, maxWidth);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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
// HUB MODELS (Rich Golden-Hour PBR Soviet Garage Courtyard & Firing Range)
// =============================================================================

export function createHubGarageBuilding(
  worldMats?: WorldMaterialSet,
  hubMats?: HubCourtyardMaterials
): THREE.Group {
  const g = new THREE.Group();
  const wallMat =
    hubMats?.hubStucco ??
    new THREE.MeshStandardMaterial({ color: 0xc9b497, roughness: 0.88, metalness: 0.04 });
  const brickMat =
    worldMats?.houseBrick ??
    new THREE.MeshStandardMaterial({ color: 0x8a4d38, roughness: 0.86 });
  const roofMat =
    worldMats?.roof ??
    new THREE.MeshStandardMaterial({ color: 0x4c5856, roughness: 0.72, metalness: 0.25 });
  const doorMat =
    hubMats?.corrugatedGreen ??
    new THREE.MeshStandardMaterial({ color: 0x3b5949, roughness: 0.58, metalness: 0.42 });
  const trimWoodMat =
    worldMats?.woodTrim ??
    new THREE.MeshStandardMaterial({ color: 0x4a392a, roughness: 0.86 });
  const metalMat =
    worldMats?.grimeMetal ??
    new THREE.MeshStandardMaterial({ color: 0x343c42, roughness: 0.45, metalness: 0.65 });
  const tireMat =
    worldMats?.tireRubber ??
    new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.86 });
  const warmWindowMat =
    worldMats?.windowWarm ??
    new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xffb84d,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    });

  // Main textured brick/stucco garage body (width 27.6, depth 5.4, height 4.35)
  const body = new THREE.Mesh(new THREE.BoxGeometry(27.6, 4.35, 5.4), wallMat);
  body.position.set(0, 2.175, 21.2);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Lower textured Soviet red-brick plinth & corner pilasters
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(28.0, 0.96, 5.7), brickMat);
  plinth.position.set(0, 0.48, 21.2);
  plinth.receiveShadow = true;
  g.add(plinth);

  for (const px of [-13.65, -2.55, 2.55, 13.65]) {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.35, 0.36), brickMat);
    pilaster.position.set(px, 2.175, 18.45);
    pilaster.castShadow = true;
    pilaster.receiveShadow = true;
    g.add(pilaster);
  }

  // Upper cornice trim band & pitched corrugated slate roof with overhanging wooden eaves
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(28.6, 0.24, 0.28), trimWoodMat);
  fascia.position.set(0, 4.32, 17.85);
  g.add(fascia);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.32, 7.1), roofMat);
  roof.position.set(0, 4.58, 21.05);
  roof.rotation.x = 0.095;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // Exposed wooden eaves rafters & galvanized gutter + vertical downspouts
  for (let rx = -13.5; rx <= 13.5; rx += 2.25) {
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.95), trimWoodMat);
    rafter.position.set(rx, 4.24, 18.18);
    rafter.rotation.x = 0.095;
    g.add(rafter);
  }
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(29.0, 0.12, 0.16), metalMat);
  gutter.position.set(0, 4.22, 17.56);
  g.add(gutter);
  for (const dx of [-13.55, 13.55]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 4.15, 8), metalMat);
    pipe.position.set(dx, 2.1, 18.15);
    g.add(pipe);
  }

  // Brick workshop stove chimney stack on roof
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.55, 0.82), brickMat);
  chimney.position.set(-9.8, 5.4, 21.6);
  chimney.castShadow = true;
  g.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), metalMat);
  chimneyCap.position.set(-9.8, 6.22, 21.6);
  g.add(chimneyCap);

  // Two large corrugated steel double garage doors with hinges, cross braces & overhanging bay lamps
  const hoodBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: 0xffb94a,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  for (const dx of [-6.8, 6.8]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.25, 0.3), metalMat);
    frame.position.set(dx, 1.65, 18.46);
    g.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(5.25, 2.98, 0.24), doorMat);
    door.position.set(dx, 1.52, 18.38);
    door.receiveShadow = true;
    g.add(door);

    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.98, 0.28), metalMat);
    seam.position.set(dx, 1.52, 18.33);
    g.add(seam);

    // Horizontal steel reinforcement bars + side hinges
    for (const barY of [0.68, 2.38]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 0.06), metalMat);
      bar.position.set(dx, barY, 18.24);
      g.add(bar);
    }
    for (const side of [-2.58, 2.58]) {
      for (const hy of [0.75, 2.28]) {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), metalMat);
        hinge.position.set(dx + side, hy, 18.24);
        g.add(hinge);
      }
    }

    // Vintage gooseneck Soviet enamel bay lamp over each garage door
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.72), metalMat);
    arm.position.set(dx, 3.62, 18.08);
    g.add(arm);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 10), metalMat);
    shade.position.set(dx, 3.52, 17.76);
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hoodBulbMat);
    bulb.position.set(dx, 3.42, 17.76);
    g.add(bulb);
  }

  // Center multi-pane warm workshop window with sill & mullions
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.65, 0.22), trimWoodMat);
  winFrame.position.set(0, 2.28, 18.48);
  g.add(winFrame);
  const win = new THREE.Mesh(new THREE.BoxGeometry(3.15, 1.38, 0.16), warmWindowMat);
  win.position.set(0, 2.28, 18.42);
  g.add(win);
  for (const mx of [-0.78, 0, 0.78]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.44, 0.18), trimWoodMat);
    mullion.position.set(mx, 2.28, 18.38);
    g.add(mullion);
  }
  const transom = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.18), trimWoodMat);
  transom.position.set(0, 2.45, 18.38);
  g.add(transom);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.1, 0.34), metalMat);
  sill.position.set(0, 1.44, 18.36);
  g.add(sill);

  // Crisp enamel workshop nameplate sign mounted cleanly forward between pilasters on steel brackets
  const signTex = makeLabelCanvasTexture('ГАРАЖ САВЕЛЬЕВЫХ · 1994', '#1d2b24', '#ffe19e', '#d98a2b');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.36, 0.84, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.48, metalness: 0.12 })
  );
  sign.position.set(0, 3.74, 18.18);
  sign.castShadow = true;
  g.add(sign);
  for (const bx of [-1.75, 1.75]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.32), metalMat);
    bracket.position.set(bx, 3.74, 18.38);
    g.add(bracket);
  }

  // Courtyard storytelling props along garage wall: stacked Moskvitch spare tires & wooden ammo crates
  const tireGeo = new THREE.TorusGeometry(0.32, 0.12, 8, 16);
  tireGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.set(-11.4, 0.12 + i * 0.22, 17.65);
    tire.castShadow = true;
    g.add(tire);
  }
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x5c6844,
    roughness: 0.82,
    map: worldMats?.woodTrim.map ?? null,
  });
  const crateA = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.56, 0.72), crateMat);
  crateA.position.set(11.2, 0.28, 17.75);
  crateA.rotation.y = 0.12;
  crateA.castShadow = true;
  crateA.receiveShadow = true;
  g.add(crateA);
  const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.62), crateMat);
  crateB.position.set(11.35, 0.78, 17.8);
  crateB.rotation.y = -0.18;
  crateB.castShadow = true;
  g.add(crateB);

  return g;
}

export function createHubToolShed(
  worldMats?: WorldMaterialSet,
  hubMats?: HubCourtyardMaterials
): THREE.Group {
  const g = new THREE.Group();
  const woodMat =
    worldMats?.houseTimber ??
    new THREE.MeshStandardMaterial({ color: 0x7c5a3c, roughness: 0.9 });
  const trimMat =
    worldMats?.woodTrim ??
    new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.88 });
  const roofMat =
    worldMats?.roof ??
    new THREE.MeshStandardMaterial({ color: 0x4b4a46, roughness: 0.78 });
  const concMat =
    worldMats?.concrete ??
    new THREE.MeshStandardMaterial({ color: 0x6c6e6b, roughness: 0.92 });
  const metalMat =
    worldMats?.grimeMetal ??
    new THREE.MeshStandardMaterial({ color: 0x3b444a, roughness: 0.5, metalness: 0.55 });
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x385e74,
    roughness: 0.46,
    metalness: 0.45,
    normalMap: worldMats?.grimeMetal.normalMap ?? null,
  });
  const jerryMat = new THREE.MeshStandardMaterial({
    color: 0xa63a2a,
    roughness: 0.52,
    metalness: 0.38,
  });
  const barkMat =
    worldMats?.bark ??
    new THREE.MeshStandardMaterial({ color: 0x5c432c, roughness: 0.94 });

  // Concrete footing plinth
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.28, 14.0), concMat);
  base.position.set(-20.8, 0.14, 1.0);
  base.receiveShadow = true;
  g.add(base);

  const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.05, 13.6), woodMat);
  body.position.set(-20.8, 1.72, 1.0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Corner timber battens & shed doorway facing courtyard (+X)
  for (const bz of [-5.75, 1.0, 7.75]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.05, 0.2), trimMat);
    post.position.set(-17.68, 1.72, bz);
    g.add(post);
  }
  const shedDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 2.25, 1.45),
    hubMats?.corrugatedGreen ?? trimMat
  );
  shedDoor.position.set(-17.68, 1.38, 3.8);
  g.add(shedDoor);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.26, 14.6), roofMat);
  roof.position.set(-20.55, 3.42, 1.0);
  roof.rotation.z = -0.11;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // Fuel barrels with steel ribs & red Soviet jerrycan outside shed
  for (let i = 0; i < 3; i++) {
    const bx = -16.95 + (i === 2 ? 0.35 : 0);
    const bz = -2.8 + i * 0.95;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.04, 14), barrelMat);
    barrel.position.set(bx, 0.52, bz);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    g.add(barrel);
    for (const ry of [0.28, 0.76]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.022, 6, 14), metalMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.set(bx, ry, bz);
      g.add(rib);
    }
  }
  const can = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.2), jerryMat);
  can.position.set(-16.85, 0.26, 1.9);
  can.rotation.y = 0.35;
  can.castShadow = true;
  g.add(can);

  // Stacked birch/pine firewood log rack along shed wall
  const logGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.78, 7);
  logGeo.rotateZ(Math.PI / 2);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5 - row; col++) {
      const log = new THREE.Mesh(logGeo, barkMat);
      log.position.set(-17.25, 0.1 + row * 0.16, 5.2 + col * 0.21 + row * 0.1);
      log.castShadow = true;
      g.add(log);
    }
  }

  return g;
}

export function createSpecsTerminalStand(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[],
  worldMats?: WorldMaterialSet,
  hubMats?: HubCourtyardMaterials
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const woodMat =
    worldMats?.woodTrim ??
    new THREE.MeshStandardMaterial({ color: 0x6b4c32, roughness: 0.85 });
  const steelMat =
    worldMats?.grimeMetal ??
    new THREE.MeshStandardMaterial({ color: 0x454e52, roughness: 0.45, metalness: 0.55 });
  const awningMat =
    hubMats?.corrugatedGreen ??
    new THREE.MeshStandardMaterial({ color: 0x4d5b57, roughness: 0.65, metalness: 0.35 });
  const crtCaseMat = new THREE.MeshStandardMaterial({
    color: 0xc2b99f,
    roughness: 0.68,
    metalness: 0.08,
  });
  const screenTex = makeLabelCanvasTexture('ТТХ · 1994', '#0c231a', '#7effc4', '#44d694');
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: 0x2ec785,
    emissiveIntensity: 0.78,
    roughness: 0.18,
  });

  // Ground concrete equipment pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.1, 5.6),
    worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x6b6f6c, roughness: 0.9 })
  );
  pad.position.set(2.4, 0.05, 0);
  pad.receiveShadow = true;
  g.add(pad);

  // Heavy wooden workbench table + lower storage shelf
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 4.9), woodMat);
  tableTop.position.set(2.4, 1.0, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  g.add(tableTop);

  const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 4.4), woodMat);
  lowerShelf.position.set(2.4, 0.36, 0);
  g.add(lowerShelf);

  for (const lx of [1.3, 3.5]) {
    for (const lz of [-2.15, 2.15]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.98, 0.14), steelMat);
      leg.position.set(lx, 0.5, lz);
      leg.castShadow = true;
      g.add(leg);
    }
  }

  // Overhead corrugated metal shelter awning with diagonal braces
  for (const lz of [-2.35, 2.35]) {
    const postBack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 3.25, 8), steelMat);
    postBack.position.set(3.55, 1.62, lz);
    postBack.castShadow = true;
    g.add(postBack);
    const postFront = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.45, 8), steelMat);
    postFront.position.set(1.2, 1.72, lz);
    postFront.castShadow = true;
    g.add(postFront);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.14, 5.6), awningMat);
  canopy.position.set(2.4, 3.35, 0);
  canopy.rotation.z = 0.11;
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  g.add(canopy);

  // Retro Soviet CRT terminal facing west (-X) toward the courtyard
  const crtBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.64, 0.78), crtCaseMat);
  crtBody.position.set(2.15, 1.42, 0);
  crtBody.castShadow = true;
  g.add(crtBody);

  const crtScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), screenMat);
  crtScreen.position.set(1.78, 1.44, 0);
  crtScreen.rotation.y = -Math.PI / 2;
  g.add(crtScreen);

  // Secondary Soviet radio oscilloscope unit next to CRT
  const oscBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.44, 0.62), steelMat);
  oscBody.position.set(2.25, 1.3, 1.25);
  oscBody.castShadow = true;
  g.add(oscBody);
  const oscDial = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 14),
    new THREE.MeshStandardMaterial({
      color: 0x3df2a0,
      emissive: 0x26b874,
      emissiveIntensity: 0.7,
    })
  );
  oscDial.rotation.y = -Math.PI / 2;
  oscDial.position.set(1.96, 1.32, 1.25);
  g.add(oscDial);

  // Mechanical keyboard & green ammo display crate on table
  const kbd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.68), crtCaseMat);
  kbd.position.set(1.5, 1.11, 0);
  g.add(kbd);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.42, 0.98),
    new THREE.MeshStandardMaterial({
      color: 0x4f613c,
      roughness: 0.82,
      map: worldMats?.woodTrim.map ?? null,
    })
  );
  crate.position.set(2.35, 1.29, -1.55);
  crate.castShadow = true;
  g.add(crate);

  // Crisp upright enamel overhead sign ("СТЕНД ТТХ") mounted firmly to canopy frame
  const signTex = makeLabelCanvasTexture('СТЕНД ТТХ', '#162822', '#86ffca', '#44d694');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.64, 2.5),
    new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0x164a34,
      emissiveIntensity: 0.38,
      roughness: 0.45,
    })
  );
  sign.position.set(1.12, 2.95, 0);
  g.add(sign);

  // Subtle flat pulsing interaction ring on the concrete floor
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4ae0a0,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.05, 0.045, 0);
  g.add(ring);
  animatedOut.push({ kind: 'terminal_beacon', mesh: ring, speed: 1.4, axis: 'z', baseY: 0.045 });

  return g;
}

export function createFiringRangeStructure(
  worldMats?: WorldMaterialSet,
  hubMats?: HubCourtyardMaterials
): THREE.Group {
  const g = new THREE.Group();
  const woodMat =
    worldMats?.woodTrim ??
    new THREE.MeshStandardMaterial({ color: 0x7c5b3e, roughness: 0.88 });
  const steelMat =
    worldMats?.grimeMetal ??
    new THREE.MeshStandardMaterial({ color: 0x3f474a, roughness: 0.55, metalness: 0.45 });
  const awningMat =
    hubMats?.corrugatedGreen ??
    new THREE.MeshStandardMaterial({ color: 0x45584e, roughness: 0.62, metalness: 0.35 });
  const sandbagMat =
    hubMats?.sandbagBurlap ??
    new THREE.MeshStandardMaterial({ color: 0x867a5c, roughness: 0.94 });
  const bermMat =
    worldMats?.bark ??
    new THREE.MeshStandardMaterial({ color: 0x5d503f, roughness: 0.95 });
  const trimBandMat = new THREE.MeshStandardMaterial({
    color: 0xd48a2e,
    roughness: 0.58,
    metalness: 0.12,
  });

  // Waist-high firing line counters (left and right with a wide center walkway gap)
  for (const [cx, w] of [
    [-7.45, 10.1],
    [7.45, 10.1],
  ]) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 1.04, 0.74), woodMat);
    counter.position.set(cx, 0.52, -2.2);
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.1, 0.9), trimBandMat);
    topCap.position.set(cx, 1.08, -2.2);
    topCap.receiveShadow = true;
    g.add(topCap);

    // Stacked burlap sandbag rifle rests on the firing benches
    const bagGeo = new THREE.BoxGeometry(0.58, 0.17, 0.32);
    for (const bx of [cx - 2.8, cx + 2.4]) {
      const b1 = new THREE.Mesh(bagGeo, sandbagMat);
      b1.position.set(bx, 1.21, -2.32);
      b1.rotation.y = 0.06;
      b1.castShadow = true;
      g.add(b1);
      const b2 = new THREE.Mesh(bagGeo, sandbagMat);
      b2.position.set(bx + 0.04, 1.36, -2.34);
      b2.rotation.y = -0.08;
      b2.castShadow = true;
      g.add(b2);
    }
  }

  // Range overhead steel gantry + high open shooter canopy (clear sightlines to all 10–22m dummies)
  for (const px of [-12.4, -3.2, 3.2, 12.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.95, 0.24), steelMat);
    post.position.set(px, 1.975, -2.2);
    post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(25.4, 0.24, 0.28), steelMat);
  beam.position.set(0, 3.92, -2.2);
  g.add(beam);

  // Sloped corrugated steel rain/sun awning over the shooter bench line (y = 4.12m, high & airy)
  const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(25.8, 0.12, 3.1), awningMat);
  shelterRoof.position.set(0, 4.18, -1.55);
  shelterRoof.rotation.x = 0.11;
  shelterRoof.castShadow = true;
  shelterRoof.receiveShadow = true;
  g.add(shelterRoof);

  // Crisp overhead enamel gantry sign ("ПОЛИГОН · 10–22м")
  const rangeSignTex = makeLabelCanvasTexture('ПОЛИГОН · 10–22м', '#1d1c18', '#ffd57a', '#d98a2b');
  const rangeSign = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.86, 0.14),
    new THREE.MeshStandardMaterial({ map: rangeSignTex, roughness: 0.48 })
  );
  rangeSign.position.set(0, 3.85, -1.96);
  g.add(rangeSign);

  // Distance line markers painted across the gravel range lane + side yardage posts
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xe6c37a,
    transparent: true,
    opacity: 0.48,
  });
  for (const [lz, label] of [
    [-7.5, '10м'],
    [-11.5, '16м'],
    [-17.0, '22м'],
  ] as const) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 0.14), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.042, lz + 1.1);
    g.add(line);

    const distTex = makeLabelCanvasTexture(label, '#1c1d19', '#f7d589', '#c97b2c');
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.34, 0.08),
      new THREE.MeshStandardMaterial({ map: distTex, roughness: 0.6 })
    );
    board.position.set(-11.4, 0.75, lz + 1.1);
    board.rotation.y = 0.35;
    g.add(board);
    const stake = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), woodMat);
    stake.position.set(-11.4, 0.42, lz + 1.06);
    g.add(stake);
  }

  // Heavy railway-tie timber & sandbag backstop berm at north edge of range
  const backstop = new THREE.Mesh(new THREE.BoxGeometry(29.5, 3.6, 1.9), bermMat);
  backstop.position.set(0, 1.8, -22.6);
  backstop.receiveShadow = true;
  backstop.castShadow = true;
  g.add(backstop);

  // Stacked sandbag parapet row along lower berm foot
  const bermBagGeo = new THREE.BoxGeometry(1.45, 0.42, 0.72);
  for (let bx = -12.6; bx <= 12.6; bx += 1.65) {
    const bag = new THREE.Mesh(bermBagGeo, sandbagMat);
    bag.position.set(bx, 0.21, -21.35);
    bag.receiveShadow = true;
    g.add(bag);
  }

  // Angled steel bullet-trap armor plates on berm face
  for (let i = -3; i <= 3; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.75, 0.16), steelMat);
    plate.position.set(i * 4.0, 1.72, -21.55);
    plate.rotation.x = 0.12;
    plate.receiveShadow = true;
    g.add(plate);
  }

  return g;
}

export function createRangeDummyRig(
  spec: RangeDummySpec,
  worldMats?: WorldMaterialSet,
  hubMats?: HubCourtyardMaterials
): RangeDummyRig {
  const root = new THREE.Group();
  root.position.set(spec.x, 0, spec.z);

  const baseMat =
    worldMats?.concrete ??
    new THREE.MeshStandardMaterial({ color: 0x5c5b56, roughness: 0.9 });
  const postMat =
    worldMats?.woodTrim ??
    new THREE.MeshStandardMaterial({ color: 0x6f5136, roughness: 0.85 });
  const sandbagMat =
    hubMats?.sandbagBurlap ??
    new THREE.MeshStandardMaterial({ color: 0x867a5c, roughness: 0.92 });

  // Grounded concrete stand + side ballast sandbags
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.74), baseMat);
  base.position.y = 0.11;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  for (const sx of [-0.52, 0.52]) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.52), sandbagMat);
    bag.position.set(sx, 0.09, 0);
    bag.receiveShadow = true;
    root.add(bag);
  }

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
    map: spec.kind === 'heavy' ? worldMats?.grimeMetal.map ?? null : hubMats?.sandbagBurlap.map ?? null,
    roughness: spec.kind === 'heavy' ? 0.45 : 0.82,
    metalness: spec.kind === 'heavy' ? 0.55 : 0.05,
  });

  // Silhouette torso + shoulders
  const torsoW = spec.kind === 'heavy' ? 0.88 : 0.68;
  const torsoH = spec.kind === 'heavy' ? 1.04 : 0.92;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, 0.24), bodyMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  torso.receiveShadow = true;
  pivot.add(torso);

  // Painted concentric Soviet shooting target rings
  const bullRed = new THREE.MeshStandardMaterial({ color: 0xcf382b, roughness: 0.6 });
  const bullCream = new THREE.MeshStandardMaterial({ color: 0xf4ead3, roughness: 0.7 });
  const bullDark = new THREE.MeshStandardMaterial({ color: 0x262928, roughness: 0.7 });

  const ringOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 18), bullDark);
  ringOuter.rotation.x = Math.PI / 2;
  ringOuter.position.set(0, 1.02, 0.125);
  pivot.add(ringOuter);

  const outerBull = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.036, 18), bullCream);
  outerBull.rotation.x = Math.PI / 2;
  outerBull.position.set(0, 1.02, 0.13);
  pivot.add(outerBull);

  const innerBull = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.044, 16), bullRed);
  innerBull.rotation.x = Math.PI / 2;
  innerBull.position.set(0, 1.02, 0.136);
  pivot.add(innerBull);

  // Head silhouette (headshot zone)
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.34, 14), bodyMat);
  head.position.y = 1.66;
  head.castShadow = true;
  pivot.add(head);

  const headTarget = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), bullRed);
  headTarget.rotation.x = Math.PI / 2;
  headTarget.position.set(0, 1.66, 0.19);
  pivot.add(headTarget);

  // Distance plaque at base
  const plaqueTex = makeLabelCanvasTexture(spec.distanceLabel, '#1c1d1a', '#f7d589', '#c97b2c');
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.24, 0.06),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.58 })
  );
  plaque.position.set(0, 0.26, 0.38);
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
  animatedOut: AnimatedZoneProp[],
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Subtle flat pulsing boarding zone ring on the concrete slabs (ONLY flat ground ring rotates on Z)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf0ad4e,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.12, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.048;
  g.add(ring);
  animatedOut.push({ kind: 'car_halo', mesh: ring, speed: 0.65, axis: 'z', baseY: 0.048 });

  // Grounded upright Soviet steel departure signpost beside the Moskvitch (NEVER floats, tilts, or clips!)
  const stand = new THREE.Group();
  stand.position.set(2.55, 0, -0.35);
  stand.rotation.y = -0.35;

  const steelMat =
    worldMats?.grimeMetal ??
    new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.5, metalness: 0.6 });
  const concMat =
    worldMats?.concrete ??
    new THREE.MeshStandardMaterial({ color: 0x6f726e, roughness: 0.9 });

  const footing = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.48), concMat);
  footing.position.y = 0.11;
  footing.receiveShadow = true;
  footing.castShadow = true;
  stand.add(footing);

  for (const px of [-1.05, 1.05]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.35, 8), steelMat);
    post.position.set(px, 1.25, 0);
    post.castShadow = true;
    stand.add(post);
  }

  const signTex = makeLabelCanvasTexture('ВЫЕЗД · МОСКВИЧ', '#1b241c', '#ffe294', '#e8963a');
  const signFaceMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.42,
    metalness: 0.12,
  });
  const signFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.42, 0.64, 0.1),
    [steelMat, steelMat, steelMat, steelMat, signFaceMat, signFaceMat]
  );
  signFrame.position.set(0, 2.08, 0);
  signFrame.castShadow = true;
  stand.add(signFrame);

  // Small hooded warm amber beacon lamp on top of the signpost
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 10), steelMat);
  hood.position.set(0, 2.54, 0.08);
  stand.add(hood);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xf0a038,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    })
  );
  lamp.position.set(0, 2.46, 0.08);
  stand.add(lamp);

  g.add(stand);
  return g;
}

// =============================================================================
// LOCATION 2: BUS DEPOT #4 & CHECKPOINT-3 ("Автопарк №4")
// =============================================================================

export function createBus404Wreck(worldMats?: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();
  const bodyOchre = new THREE.MeshStandardMaterial({
    color: 0xb5863d,
    roughness: 0.68,
    metalness: 0.24,
    bumpMap: worldMats?.grimeMetal.bumpMap ?? null,
    bumpScale: 0.018,
  });
  const bodyCream = new THREE.MeshStandardMaterial({
    color: 0xd6ccb2,
    roughness: 0.74,
    metalness: 0.12,
    bumpMap: worldMats?.grimeMetal.bumpMap ?? null,
    bumpScale: 0.015,
  });
  const darkMetal = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.55, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffd288,
    emissive: 0xd98a2b,
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.35,
  });

  // Lower skirt, chrome trim belt & upper cream cabin (LiAZ-677 proportions: 2.65m wide x 10.4m long)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.32, 10.4), bodyOchre);
  lower.position.y = 1.06;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.12, 10.46), darkMetal);
  belt.position.y = 1.72;
  g.add(belt);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.64, 1.24, 10.2), bodyCream);
  upper.position.y = 2.34;
  upper.castShadow = true;
  g.add(upper);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.2, 9.85), bodyOchre);
  roof.position.y = 3.04;
  g.add(roof);

  // Roof ventilation hatches
  for (const hz of [-2.8, 0.2, 3.0]) {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.78), darkMetal);
    hatch.position.set(0, 3.18, hz);
    g.add(hatch);
  }

  // Front & rear steel bumpers
  for (const bz of [-5.28, 5.28]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.22, 0.24), darkMetal);
    bumper.position.set(0, 0.56, bz);
    g.add(bumper);
  }

  // Glowing side windows divided by realistic vertical LiAZ window pillars
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.82, 8.7), glassMat);
  sideWin.position.y = 2.32;
  g.add(sideWin);

  for (let pz = -4.2; pz <= 4.21; pz += 1.4) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.92, 0.14), bodyCream);
    pillar.position.set(0, 2.32, pz);
    g.add(pillar);
  }

  // Front split windshield with center mullion
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.86, 0.08), glassMat);
  windshield.position.set(0, 2.28, 5.12);
  g.add(windshield);
  const wsBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.94, 0.14), darkMetal);
  wsBar.position.set(0, 2.28, 5.14);
  g.add(wsBar);

  // Route 404 illuminated front destination board
  const boardTex = makeLabelCanvasTexture('РЕЙС №404', '#1f1a14', '#ffe199', '#d98a2b');
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 0.42, 0.1),
    new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0x804b14, emissiveIntensity: 0.55 })
  );
  board.position.set(0, 2.82, 5.15);
  g.add(board);

  // Wheels + wheel arches
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
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), darkMetal);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(hx, 0.95, 5.2);
    g.add(bezel);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), lampMat);
    hl.position.set(hx, 0.95, 5.25);
    g.add(hl);
  }

  return g;
}

export function createKppGuardhouse(
  x: number,
  z: number,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x6f7370, roughness: 0.9 });
  const plinthMat = worldMats?.brick ?? new THREE.MeshStandardMaterial({ color: 0x4b4846, roughness: 0.92 });
  const roofMat = worldMats?.roof ?? new THREE.MeshStandardMaterial({ color: 0x383d3e, roughness: 0.7 });
  const steelMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.55, metalness: 0.5 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xc97b2c,
    emissiveIntensity: 0.58,
    roughness: 0.24,
  });

  // Grounded concrete foundation plinth + textured Soviet checkpoint booth body
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.65, 5.95), plinthMat);
  plinth.position.y = 0.325;
  plinth.receiveShadow = true;
  g.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.35, 5.6), concMat);
  body.position.y = 1.72;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Corner vertical steel/concrete trim pilasters
  for (const cx of [-3.28, 3.28]) {
    for (const cz of [-2.78, 2.78]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.45, 0.28), steelMat);
      col.position.set(cx, 1.72, cz);
      g.add(col);
    }
  }

  // Overhanging corrugated shelter roof with steel fascia
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.34, 6.8), roofMat);
  roof.position.y = 3.56;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(7.82, 0.16, 6.92), steelMat);
  fascia.position.y = 3.42;
  g.add(fascia);

  // Rooftop warning beacon + steel conduit mast
  const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.72, 8), steelMat);
  beaconPole.position.set(2.7, 4.05, 2.3);
  g.add(beaconPole);
  const beaconDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff8a30,
      emissive: 0xe66a1c,
      emissiveIntensity: 0.95,
      roughness: 0.25,
    })
  );
  beaconDome.position.set(2.7, 4.46, 2.3);
  g.add(beaconDome);

  // Framed & mullioned east security observation window + sill
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.38, 3.85), steelMat);
  winFrame.position.set(3.26, 2.02, 0);
  g.add(winFrame);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.16, 3.56), winMat);
  win.position.set(3.32, 2.02, 0);
  g.add(win);
  for (const mz of [-1.15, 0, 1.15]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.08), steelMat);
    mullion.position.set(3.34, 2.02, mz);
    g.add(mullion);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 4.0), concMat);
  sill.position.set(3.36, 1.3, 0);
  g.add(sill);

  // South front inspection window & steel entry door
  const southWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.12, 0.14), winMat);
  southWin.position.set(1.2, 2.02, 2.82);
  g.add(southWin);
  const southFrame = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.28, 0.12), steelMat);
  southFrame.position.set(1.2, 2.02, 2.79);
  g.add(southFrame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.25, 0.16), steelMat);
  door.position.set(-1.6, 1.15, 2.82);
  g.add(door);

  const signTex = makeLabelCanvasTexture('КПП-3 · 1994', '#1d1c19', '#f5cb75', '#c84b31');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.72, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })
  );
  sign.position.set(0, 3.04, 2.9);
  g.add(sign);

  // Grounded concrete & steel boom-gate pedestal + counterweight + striped barrier arm (NEVER floating!)
  const pedPad = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.88), concMat);
  pedPad.position.set(3.92, 0.09, 1.8);
  pedPad.receiveShadow = true;
  g.add(pedPad);

  const pedHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 1.16, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xc9962b, roughness: 0.62, metalness: 0.35 })
  );
  pedHousing.position.set(3.92, 0.72, 1.8);
  pedHousing.castShadow = true;
  g.add(pedHousing);

  const pedCap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.64), steelMat);
  pedCap.position.set(3.92, 1.34, 1.8);
  g.add(pedCap);

  const pivotHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 12), steelMat);
  pivotHub.rotation.x = Math.PI / 2;
  pivotHub.position.set(3.92, 1.08, 1.8);
  g.add(pivotHub);

  // Boom arm group anchored directly at the pivot hub (half-raised at ~24 deg)
  const boomPivot = new THREE.Group();
  boomPivot.position.set(3.92, 1.08, 1.8);
  boomPivot.rotation.z = 0.42;

  const redMat = new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.55 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.6 });
  const segmentCount = 8;
  const segLen = 0.72;
  for (let i = 0; i < segmentCount; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(segLen, 0.14, 0.11),
      i % 2 === 0 ? redMat : whiteMat
    );
    seg.position.set(0.36 + i * segLen, 0, 0);
    seg.castShadow = true;
    boomPivot.add(seg);
  }
  // Rear cast-iron counterweight balancing the barrier arm
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.1), steelMat);
  rearBar.position.set(-0.52, 0, 0);
  boomPivot.add(rearBar);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.3), steelMat);
  weight.position.set(-0.98, 0, 0);
  boomPivot.add(weight);
  g.add(boomPivot);

  return g;
}

export function createDepotHangar(
  x: number,
  z: number,
  width: number,
  depth: number,
  facingDir: 1 | -1,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x4b5358,
    roughness: 0.68,
    metalness: 0.36,
    map: worldMats?.roof.map ?? null,
    bumpMap: worldMats?.grimeMetal.bumpMap ?? null,
    bumpScale: 0.025,
  });
  const roofMat = worldMats?.roof ?? new THREE.MeshStandardMaterial({
    color: 0x3b4248,
    roughness: 0.64,
    metalness: 0.42,
  });
  const concreteMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x626664, roughness: 0.9 });
  const darkMetal = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x262c32, roughness: 0.55, metalness: 0.55 });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x35464f,
    roughness: 0.58,
    metalness: 0.42,
    map: worldMats?.roof.map ?? null,
  });
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xc98a2b, roughness: 0.65 });
  const clerestoryMat = new THREE.MeshStandardMaterial({
    color: 0x99b8c7,
    emissive: 0x3c5c6e,
    emissiveIntensity: 0.32,
    roughness: 0.35,
  });

  // Main industrial hangar shell + textured reinforced concrete lower skirt
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 5.6, depth), steelMat);
  body.position.y = 2.8;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.32, 1.45, depth + 0.32), concreteMat);
  base.position.y = 0.725;
  base.receiveShadow = true;
  g.add(base);

  // Exterior vertical steel I-beam ribs along both long walls
  for (let rz = -depth * 0.48; rz <= depth * 0.48 + 0.01; rz += depth * 0.24) {
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.6, 0.26), darkMetal);
      rib.position.set(side * (width * 0.5 + 0.05), 2.8, rz);
      g.add(rib);
    }
  }

  // Mathematically exact upward-arching barrel vault roof extruded along Z (depth)
  const archHalfW = width * 0.52;
  const archH = 1.75;
  const archShape = new THREE.Shape();
  archShape.moveTo(-archHalfW, 0);
  const archSteps = 16;
  for (let i = 0; i <= archSteps; i++) {
    const theta = Math.PI - (i / archSteps) * Math.PI;
    archShape.lineTo(Math.cos(theta) * archHalfW, Math.sin(theta) * archH);
  }
  archShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: depth + 0.5,
    bevelEnabled: false,
    curveSegments: 16,
  });
  roofGeo.translate(0, 0, -(depth + 0.5) * 0.5);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 5.56;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  // Rooftop galvanized exhaust ventilator cowls
  for (const vz of [-depth * 0.25, depth * 0.25]) {
    const ventPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.9, 10), darkMetal);
    ventPipe.position.set(0, 7.55, vz);
    g.add(ventPipe);
    const ventCap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 10), darkMetal);
    ventCap.position.set(0, 8.12, vz);
    g.add(ventCap);
  }

  // Wide corrugated repair bay doors with steel frames, hazard headers & upper clerestory strip
  const doorFaceX = facingDir * (width * 0.5 + 0.05);
  for (const dz of [-depth * 0.24, depth * 0.24]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.35, 4.95), darkMetal);
    frame.position.set(doorFaceX, 2.18, dz);
    g.add(frame);

    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.1, 4.55), doorMat);
    bay.position.set(doorFaceX + facingDir * 0.06, 2.05, dz);
    g.add(bay);

    const hazardHeader = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 4.95), hazardMat);
    hazardHeader.position.set(doorFaceX + facingDir * 0.02, 4.42, dz);
    g.add(hazardHeader);

    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.1, 0.1), darkMetal);
    seam.position.set(doorFaceX + facingDir * 0.08, 2.05, dz);
    g.add(seam);

    // Clerestory industrial window band above each repair bay
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 4.2), clerestoryMat);
    win.position.set(doorFaceX + facingDir * 0.04, 5.02, dz);
    g.add(win);
  }

  return g;
}

export function createFuelCistern(
  x: number,
  z: number,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x766f60,
    roughness: 0.66,
    metalness: 0.36,
    map: worldMats?.concrete.map ?? null,
    bumpMap: worldMats?.grimeMetal.bumpMap ?? null,
    bumpScale: 0.02,
  });
  const rustBand = new THREE.MeshStandardMaterial({ color: 0x994a2b, roughness: 0.74, metalness: 0.25 });
  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x5c605e, roughness: 0.92 });
  const steelMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.55, metalness: 0.6 });

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 8.8, 18), tankMat);
  cyl.rotation.z = Math.PI / 2;
  cyl.position.y = 2.25;
  cyl.castShadow = true;
  cyl.receiveShadow = true;
  g.add(cyl);

  // Rounded steel tank end-caps
  for (const ex of [-4.4, 4.4]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12), tankMat);
    cap.scale.set(0.36, 1, 1);
    cap.position.set(ex, 2.25, 0);
    g.add(cap);
  }

  // Concrete cradles + iron reinforcement bands
  for (const bx of [-2.4, 0, 2.4]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.79, 1.79, 0.34, 18), rustBand);
    band.rotation.z = Math.PI / 2;
    band.position.set(bx, 2.25, 0);
    g.add(band);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.55, 3.35), concMat);
    saddle.position.set(bx, 0.78, 0);
    saddle.castShadow = true;
    saddle.receiveShadow = true;
    g.add(saddle);
  }

  // Top pressure dome, inspection catwalk & steel pipe manifold
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.65, 12), steelMat);
  dome.position.set(0, 4.18, 0);
  g.add(dome);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.08, 0.72), steelMat);
  walk.position.set(0, 4.06, 0.86);
  g.add(walk);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.06, 0.06), steelMat);
  rail.position.set(0, 4.82, 1.2);
  g.add(rail);
  for (const px of [-3.2, -1.1, 1.1, 3.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.06), steelMat);
    post.position.set(px, 4.44, 1.2);
    g.add(post);
  }

  // End discharge valve pipe running down into concrete plinth
  const pipeV = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.7, 10), rustBand);
  pipeV.position.set(4.78, 1.25, 0);
  g.add(pipeV);
  const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.5 }));
  valveWheel.rotation.y = Math.PI / 2;
  valveWheel.position.set(5.05, 1.55, 0);
  g.add(valveWheel);

  return g;
}

export function createDispatchTower(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[],
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x62676a, roughness: 0.88 });
  const brickMat = worldMats?.brick ?? new THREE.MeshStandardMaterial({ color: 0x4d4947, roughness: 0.9 });
  const steelMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x323940, roughness: 0.52, metalness: 0.62 });
  const roofMat = worldMats?.roof ?? new THREE.MeshStandardMaterial({ color: 0x2c3339, roughness: 0.65, metalness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7fd0f2,
    emissive: 0x2b7fb0,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.35,
  });
  const warnRedMat = new THREE.MeshStandardMaterial({
    color: 0xff4538,
    emissive: 0xe62e24,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });

  // Grounded heavy concrete podium with lower brick plinth & 4 corner structural buttresses
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.85, 7.7), brickMat);
  plinth.position.y = 0.425;
  plinth.receiveShadow = true;
  g.add(plinth);

  const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.3, 7.2), concMat);
  base.position.y = 2.25;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const baseCap = new THREE.Mesh(new THREE.BoxGeometry(7.65, 0.32, 7.65), steelMat);
  baseCap.position.y = 4.46;
  g.add(baseCap);

  for (const cx of [-3.55, 3.55]) {
    for (const cz of [-3.55, 3.55]) {
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.56, 4.45, 0.56), steelMat);
      buttress.position.set(cx, 2.22, cz);
      buttress.castShadow = true;
      g.add(buttress);
    }
  }

  // Steel access door + protective canopy on west side facing tarmac
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.35, 1.35), steelMat);
  door.position.set(-3.62, 1.32, 0);
  g.add(door);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 2.1), roofMat);
  canopy.position.set(-4.1, 2.72, 0);
  g.add(canopy);
  const signTex = makeLabelCanvasTexture('ДИСПЕТЧЕРСКАЯ №4', '#162028', '#8ee6ff', '#3a9bd6');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.62, 3.6),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
  );
  sign.position.set(-3.66, 3.65, 0);
  g.add(sign);

  // Ribbed reinforced concrete central shaft with vertical structural ribs & ladder
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 4.2), concMat);
  shaft.position.y = 6.6;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  for (const ringY of [5.4, 6.6, 7.8]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.2, 4.55), steelMat);
    slab.position.y = ringY;
    g.add(slab);
  }
  // External steel service ladder climbing west face of shaft
  for (const lz of [-0.28, 0.28]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.3, 0.06), steelMat);
    rail.position.set(-2.22, 6.6, lz);
    g.add(rail);
  }
  for (let ly = 4.9; ly <= 8.5; ly += 0.45) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.56), steelMat);
    rung.position.set(-2.22, ly, 0);
    g.add(rung);
  }

  // Cantilevered observation balcony deck with perimeter safety railings
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.28, 6.9), steelMat);
  deck.position.y = 8.72;
  deck.castShadow = true;
  g.add(deck);

  // Perimeter balcony handrail bars & posts
  const railH = 9.52;
  for (const side of [-3.35, 3.35]) {
    const barZ = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 6.76), steelMat);
    barZ.position.set(side, railH, 0);
    g.add(barZ);
    const barX = new THREE.Mesh(new THREE.BoxGeometry(6.76, 0.07, 0.07), steelMat);
    barX.position.set(0, railH, side);
    g.add(barX);
    for (const p of [-3.3, -1.65, 0, 1.65, 3.3]) {
      const postA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), steelMat);
      postA.position.set(side, 9.14, p);
      g.add(postA);
      const postB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), steelMat);
      postB.position.set(p, 9.14, side);
      g.add(postB);
    }
  }

  // Control cabin with recessed panoramic glass + heavy dark steel corner/window mullions + roof overhang
  const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.72, 5.5), steelMat);
  cabinBase.position.y = 9.18;
  g.add(cabinBase);

  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(5.26, 1.24, 5.26), glassMat);
  cabinGlass.position.y = 10.14;
  g.add(cabinGlass);

  // Structural corner & mid-span window mullions breaking the cyan glass into authentic panes
  for (const mx of [-2.68, -0.9, 0.9, 2.68]) {
    for (const mz of [-2.68, 2.68]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.32, 0.14), steelMat);
      m.position.set(mx, 10.14, mz);
      g.add(m);
    }
  }
  for (const mz of [-0.9, 0.9]) {
    for (const mx of [-2.68, 2.68]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.32, 0.14), steelMat);
      m.position.set(mx, 10.14, mz);
      g.add(m);
    }
  }

  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.34, 6.4), roofMat);
  cabinRoof.position.y = 10.94;
  cabinRoof.castShadow = true;
  g.add(cabinRoof);

  // Rooftop whip antenna + red aviation obstruction beacon
  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 3.1, 6), steelMat);
  whip.position.set(-2.2, 12.6, -2.2);
  g.add(whip);
  const redBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), warnRedMat);
  redBeacon.position.set(-2.2, 14.2, -2.2);
  g.add(redBeacon);

  // Rotating radar dish on top
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 11.45, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 10), steelMat);
  dishGroup.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 0.35, 0.55, 16), concMat);
  dish.rotation.x = Math.PI / 2.4;
  dish.position.set(0, 0.65, 0.45);
  dishGroup.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), steelMat);
  feed.rotation.x = Math.PI / 2.4;
  feed.position.set(0, 0.85, 0.92);
  dishGroup.add(feed);
  g.add(dishGroup);
  animatedOut.push({ kind: 'radar_dish', mesh: dishGroup, speed: 0.85, axis: 'y', baseY: 11.45 });

  return g;
}

// =============================================================================
// LOCATION 3: SUBSTATION "LUCH-94" & RESONATOR CORE ("Подстанция «Луч-94»")
// =============================================================================

export function createResonatorCoreTower(
  x: number,
  z: number,
  animatedOut: AnimatedZoneProp[],
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x454a52, roughness: 0.85 });
  const steelMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.5, metalness: 0.65 });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb86f3a,
    roughness: 0.38,
    metalness: 0.72,
  });
  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x7ef2ff,
    emissive: 0x2ec8e6,
    emissiveIntensity: 1.25,
    roughness: 0.18,
  });
  const amberGlow = new THREE.MeshStandardMaterial({
    color: 0xffd57a,
    emissive: 0xe6952e,
    emissiveIntensity: 1.2,
    roughness: 0.18,
  });

  // Heavy octagonal pedestal + anchor struts
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.1, 1.8, 8), concMat);
  ped.position.y = 0.9;
  ped.castShadow = true;
  ped.receiveShadow = true;
  g.add(ped);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.2, 0.7), steelMat);
    strut.position.set(Math.cos(angle) * 2.55, 1.1, Math.sin(angle) * 2.55);
    strut.rotation.y = -angle;
    g.add(strut);
  }

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
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.12, 18, 14), cyanGlow);
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

export function createCoolingPylon(
  x: number,
  z: number,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x52575e, roughness: 0.88 });
  const louverMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const glowStrip = new THREE.MeshStandardMaterial({
    color: 0x6ce5ff,
    emissive: 0x26b4d9,
    emissiveIntensity: 0.95,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.9, 8), louverMat);
  plinth.position.y = 0.45;
  g.add(plinth);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.6, 9.2, 8), concMat);
  tower.position.y = 4.6;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);

  for (const ry of [2.8, 5.4, 7.8]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.45 - ry * 0.06, 2.48 - ry * 0.06, 0.24, 8), louverMat);
    collar.position.y = ry;
    g.add(collar);
  }

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.0, 0.85, 8), louverMat);
  cap.position.y = 9.45;
  g.add(cap);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.2, 0.16), glowStrip);
    strip.position.set(Math.cos(angle) * 2.18, 4.8, Math.sin(angle) * 2.18);
    g.add(strip);
  }

  return g;
}

export function createCapacitorBank(
  x: number,
  z: number,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const hallMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x4b5058, roughness: 0.88 });
  const roofMat = worldMats?.roof ?? new THREE.MeshStandardMaterial({ color: 0x323840, roughness: 0.65, metalness: 0.45 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x8e5d43, roughness: 0.35, metalness: 0.15 });
  const steelMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x323840, roughness: 0.5, metalness: 0.6 });

  const hall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.8, 13.4), hallMat);
  hall.position.y = 2.4;
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.36, 13.75), roofMat);
  parapet.position.y = 4.92;
  g.add(parapet);

  // Side cooling louver grilles
  for (let gz = -4.2; gz <= 4.21; gz += 2.8) {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(6.74, 1.5, 1.8), steelMat);
    grille.position.set(0, 2.5, gz);
    g.add(grille);
  }

  // Rooftop high-voltage ceramic insulators
  for (let iz = -4.5; iz <= 4.5; iz += 3.0) {
    for (const ix of [-1.6, 1.6]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.1, 10), ceramicMat);
      ins.position.set(ix, 6.0, iz);
      g.add(ins);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.12), steelMat);
    bar.position.set(0, 7.0, iz);
    g.add(bar);
  }

  return g;
}

export function createArchiveBunker(
  x: number,
  z: number,
  worldMats?: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const concMat = worldMats?.concrete ?? new THREE.MeshStandardMaterial({ color: 0x525454, roughness: 0.92 });
  const blastMat = worldMats?.grimeMetal ?? new THREE.MeshStandardMaterial({ color: 0x3b4448, roughness: 0.5, metalness: 0.55 });
  const roofMat = worldMats?.roof ?? new THREE.MeshStandardMaterial({ color: 0x2d3338, roughness: 0.68 });

  const vault = new THREE.Mesh(new THREE.BoxGeometry(21.4, 4.8, 8.6), concMat);
  vault.position.y = 2.4;
  vault.castShadow = true;
  vault.receiveShadow = true;
  g.add(vault);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.35, 9.1), roofMat);
  roofCap.position.y = 4.95;
  g.add(roofCap);

  // Heavy concrete buttresses framing bunker facade
  for (const bx of [-8.8, -4.4, 4.4, 8.8]) {
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.85, 0.75), concMat);
    buttress.position.set(bx, 2.42, 4.45);
    buttress.castShadow = true;
    g.add(buttress);
  }

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 0.55), concMat);
  doorFrame.position.set(0, 1.9, 4.45);
  g.add(doorFrame);

  const blastDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 0.35), blastMat);
  blastDoor.position.set(0, 1.65, 4.62);
  g.add(blastDoor);

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16), new THREE.MeshStandardMaterial({ color: 0xc98a2b, roughness: 0.45, metalness: 0.6 }));
  wheel.position.set(0, 1.65, 4.86);
  g.add(wheel);

  const signTex = makeLabelCanvasTexture('АРХИВ «ЛУЧ-94»', '#151e24', '#85e8ff', '#2ec8e6');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.85, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x154d5c, emissiveIntensity: 0.55 })
  );
  sign.position.set(0, 4.18, 4.55);
  g.add(sign);

  return g;
}
