import * as THREE from 'three';
import { ASSET_PATHS } from './constants';
import type { CustomTextureSpec, TextureSlot } from './types';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface WorldMaterialSet {
  house: THREE.MeshStandardMaterial;
  houseTimber: THREE.MeshStandardMaterial;
  houseBrick: THREE.MeshStandardMaterial;
  fence: THREE.MeshStandardMaterial;
  road: THREE.MeshPhysicalMaterial;
  lawn: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  woodTrim: THREE.MeshStandardMaterial;
  brick: THREE.MeshStandardMaterial;
  grimeMetal: THREE.MeshPhysicalMaterial;
  bark: THREE.MeshStandardMaterial;
  birchBark: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  windowWarm: THREE.MeshPhysicalMaterial;
  windowCrimson: THREE.MeshPhysicalMaterial;
  windowDark: THREE.MeshPhysicalMaterial;
  frostedGlass: THREE.MeshPhysicalMaterial;
  carPaint: THREE.MeshPhysicalMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  roadTimeUniform: { value: number };
}

/**
 * Generates a real RGB Tangent-Space Normal Map + Ambient Occlusion Map
 * + Roughness Map from a height/albedo ImageData using a 3x3 Sobel kernel.
 * Gives every brick joint, wood plank groove, corrugated slate wave, concrete
 * pit, and wet puddle crisp directional relief under moonlight & flashlight.
 */
function buildSobelPbrTextures(
  albedoCanvas: HTMLCanvasElement,
  maxAnisotropy: number,
  opts: {
    normalStrength: number;
    roughMin: number;
    roughMax: number;
    invertRoughness?: boolean;
    aoStrength?: number;
  }
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
} {
  const w = albedoCanvas.width;
  const h = albedoCanvas.height;
  const actx = albedoCanvas.getContext('2d', { willReadFrequently: true })!;
  const src = actx.getImageData(0, 0, w, h);
  const sd = src.data;

  // Luminance height buffer (0..1)
  const height = new Float32Array(w * h);
  for (let i = 0, p = 0; i < sd.length; i += 4, p++) {
    height[p] = (0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]) / 255;
  }

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nctx = normalCanvas.getContext('2d')!;
  const nImg = nctx.createImageData(w, h);
  const nd = nImg.data;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rctx = roughCanvas.getContext('2d')!;
  const rImg = rctx.createImageData(w, h);
  const rd = rImg.data;

  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = w;
  aoCanvas.height = h;
  const aoctx = aoCanvas.getContext('2d')!;
  const aoImg = aoctx.createImageData(w, h);
  const aod = aoImg.data;

  const strength = opts.normalStrength;
  const rMin = opts.roughMin;
  const rMax = opts.roughMax;
  const invR = Boolean(opts.invertRoughness);
  const aoStr = opts.aoStrength ?? 0.65;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return height[wy * w + wx];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const c = sample(x, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      // 3x3 Sobel tangent gradient
      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const nx = -dX;
      const ny = -dY;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      nd[idx] = Math.max(0, Math.min(255, Math.round((nx * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 1] = Math.max(0, Math.min(255, Math.round((ny * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 2] = Math.max(0, Math.min(255, Math.round((nz * invLen * 0.5 + 0.5) * 255)));
      nd[idx + 3] = 255;

      // Roughness modulation (dark puddles / wet spots -> glossier)
      const rNorm = invR ? 1 - c : c;
      const rVal = Math.max(
        0,
        Math.min(255, Math.round((rMin + rNorm * (rMax - rMin)) * 255))
      );
      rd[idx] = rVal;
      rd[idx + 1] = rVal;
      rd[idx + 2] = rVal;
      rd[idx + 3] = 255;

      // Cavity AO (recessed dark seams get deep ambient occlusion)
      const avg = (tl + t + tr + l + r + bl + b + br) * 0.125;
      const cavity = Math.max(0, Math.min(1, 0.72 + (c - avg) * 1.9 + (c - 0.5) * 0.35));
      const ao = Math.max(0.28, Math.min(1, 1 - (1 - cavity) * aoStr));
      const aoByte = Math.round(ao * 255);
      aod[idx] = aoByte;
      aod[idx + 1] = aoByte;
      aod[idx + 2] = aoByte;
      aod[idx + 3] = 255;
    }
  }

  nctx.putImageData(nImg, 0, 0);
  rctx.putImageData(rImg, 0, 0);
  aoctx.putImageData(aoImg, 0, 0);

  const configureTex = (canvas: HTMLCanvasElement, isColor: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = maxAnisotropy;
    return tex;
  };

  return {
    map: configureTex(albedoCanvas, true),
    normalMap: configureTex(normalCanvas, false),
    roughnessMap: configureTex(roughCanvas, false),
    aoMap: configureTex(aoCanvas, false),
  };
}

/**
 * Adds subtle CloverPit-inspired tactile micro-grime & contrast sharpening
 * to photographic albedo textures so surfaces never look flat or blurry.
 */
function enhanceHorrorAlbedo(canvas: HTMLCanvasElement, grimeAmount = 0.22): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rand = seededRand(w * 37 + h * 17);

  // Micro-contrast + subtle film-grain grit
  for (let i = 0; i < d.length; i += 4) {
    const grain = (rand() - 0.5) * (24 * grimeAmount);
    for (let c = 0; c < 3; c++) {
      const centered = (d[i + c] - 120) * 1.14 + 114 + grain;
      d[i + c] = Math.max(0, Math.min(255, Math.round(centered)));
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function createProceduralTexture(
  spec: CustomTextureSpec,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d', { willReadFrequently: true })!;

  const rand = seededRand(
    spec.pattern.length * 997 +
      spec.primaryHex.charCodeAt(1) * 31 +
      Math.round(spec.grime * 100) * 13
  );

  ctx.fillStyle = spec.primaryHex;
  ctx.fillRect(0, 0, size, size);

  if (spec.pattern === 'stucco_brick') {
    for (let i = 0; i < 80; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const r = 16 + rand() * 58;
      ctx.fillStyle = i % 2 === 0 ? spec.secondaryHex : 'rgba(18,20,24,0.28)';
      ctx.globalAlpha = 0.2 + spec.grime * 0.32;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Exposed brick patches with recessed mortar lines
    const brickCount = Math.round(18 + spec.wear * 28);
    for (let i = 0; i < brickCount; i++) {
      const bx = Math.floor(rand() * 14) * 36;
      const by = Math.floor(rand() * 26) * 19;
      ctx.fillStyle = '#241815';
      ctx.fillRect(bx - 2, by - 2, 34, 17);
      ctx.fillStyle = i % 3 === 0 ? '#6e3223' : '#803d2a';
      ctx.fillRect(bx, by, 30, 13);
    }
    // Deep plaster cracks & damp water streaks
    ctx.strokeStyle = 'rgba(12, 11, 10, 0.7)';
    ctx.lineWidth = 2.0;
    for (let c = 0; c < Math.round(10 + spec.wear * 16); c++) {
      let cx = rand() * size;
      let cy = rand() * size;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) {
        cx += (rand() - 0.5) * 44;
        cy += rand() * 34;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (spec.pattern === 'timber_planks') {
    const planks = 10;
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      const x = i * pw;
      ctx.fillStyle = i % 3 === 0 ? spec.secondaryHex : spec.primaryHex;
      ctx.fillRect(x + 3, 0, pw - 5, size);
      // Deep dark plank joint
      ctx.fillStyle = '#0c0e0c';
      ctx.fillRect(x, 0, 4, size);
      // Grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.32)';
      ctx.lineWidth = 1.3;
      for (let g = 0; g < 9; g++) {
        const gx = x + 5 + rand() * (pw - 10);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (rand() - 0.5) * 5, size);
        ctx.stroke();
      }
      // Rusted nails + drip stain
      ctx.fillStyle = '#3b1c12';
      ctx.fillRect(x + pw * 0.45, size * 0.2, 5, 5);
      ctx.fillRect(x + pw * 0.45, size * 0.8, 5, 5);
      ctx.fillStyle = 'rgba(65, 26, 12, 0.35)';
      ctx.fillRect(x + pw * 0.46, size * 0.22, 3, 24);
      ctx.fillRect(x + pw * 0.46, size * 0.82, 3, 24);
    }
    // Bottom rot/moss gradient
    const moss = ctx.createLinearGradient(0, size * 0.72, 0, size);
    moss.addColorStop(0, 'rgba(20, 34, 18, 0)');
    moss.addColorStop(1, 'rgba(18, 30, 14, 0.72)');
    ctx.fillStyle = moss;
    ctx.fillRect(0, size * 0.72, size, size * 0.28);
  } else if (spec.pattern === 'concrete_panels') {
    const cols = 2;
    const rows = 4;
    const cw = size / cols;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? spec.primaryHex : spec.secondaryHex;
        ctx.globalAlpha = 0.42;
        ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#14171c';
        ctx.lineWidth = 6;
        ctx.strokeRect(c * cw, r * rh, cw, rh);
      }
    }
    // Rust water drips from panel joints
    for (let d = 0; d < 28; d++) {
      const dx = rand() * size;
      const dy = Math.floor(rand() * rows) * rh;
      ctx.fillStyle = 'rgba(40, 26, 18, 0.34)';
      ctx.fillRect(dx, dy, 3 + rand() * 6, 20 + rand() * 55);
    }
  } else if (spec.pattern === 'cracked_asphalt') {
    for (let i = 0; i < 48; i++) {
      ctx.fillStyle = spec.secondaryHex;
      ctx.globalAlpha = 0.28 + spec.grime * 0.32;
      ctx.beginPath();
      ctx.ellipse(
        rand() * size,
        rand() * size,
        30 + rand() * 75,
        20 + rand() * 55,
        rand() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#07090d';
    ctx.lineWidth = 2.6;
    for (let k = 0; k < Math.round(8 + spec.wear * 14); k++) {
      let cx = rand() * size;
      let cy = rand() * size;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 8; s++) {
        cx += (rand() - 0.5) * 65;
        cy += (rand() - 0.5) * 65;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (spec.pattern === 'night_grass') {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = i % 3 === 0 ? spec.secondaryHex : spec.primaryHex;
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 16 + rand() * 44, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let b = 0; b < 1100; b++) {
      const bx = rand() * size;
      const by = rand() * size;
      ctx.strokeStyle = b % 4 === 0 ? '#445938' : '#172415';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (rand() - 0.5) * 7, by - 5 - rand() * 11);
      ctx.stroke();
    }
  } else if (spec.pattern === 'anomaly_grid') {
    ctx.strokeStyle = spec.secondaryHex;
    ctx.lineWidth = 4;
    const step = 64;
    for (let p = 0; p < size; p += step) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    for (let j = 0; j < 22; j++) {
      ctx.fillStyle = j % 2 === 0 ? 'rgba(201,59,59,0.34)' : 'rgba(232,150,58,0.22)';
      ctx.fillRect(0, rand() * size, size, 2 + rand() * 7);
    }
  }

  // CloverPit grit & grime pass
  const speckleCount = Math.round(2200 + spec.grime * 2800);
  for (let i = 0; i < speckleCount; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const dark = rand() > 0.44;
    ctx.fillStyle = dark
      ? `rgba(6, 8, 12, ${0.18 + spec.grime * 0.28})`
      : `rgba(225, 220, 210, ${0.07 + spec.wear * 0.12})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  return buildSobelPbrTextures(colorCanvas, maxAnisotropy, {
    normalStrength: spec.slot === 'road' ? 2.4 : 3.2,
    roughMin: spec.slot === 'road' ? 0.18 : 0.58,
    roughMax: 0.96,
    aoStrength: 0.72,
  });
}

function createArchitecturalConcreteMaterial(
  maxAnisotropy: number
): THREE.MeshStandardMaterial {
  const pbr = createProceduralTexture(
    {
      slot: 'house',
      pattern: 'concrete_panels',
      primaryHex: '#4b5058',
      secondaryHex: '#333840',
      grime: 0.78,
      wear: 0.72,
    },
    maxAnisotropy
  );
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.85,
    roughness: 1.0,
    metalness: 0.06,
  });
}

function createWoodTrimMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(441994);

  ctx.fillStyle = '#332d26';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 190; i++) {
    const x = rand() * size;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(16, 13, 10, 0.45)' : 'rgba(92, 78, 60, 0.26)';
    ctx.fillRect(x, 0, 2 + rand() * 8, size);
  }
  // Peeling dark-green Soviet trim paint flecks
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = 'rgba(42, 58, 46, 0.34)';
    ctx.fillRect(rand() * size, rand() * size, 8 + rand() * 24, 18 + rand() * 64);
  }
  enhanceHorrorAlbedo(c, 0.35);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.4,
    roughMin: 0.62,
    roughMax: 0.96,
    aoStrength: 0.78,
  });

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.8,
    roughness: 1.0,
    metalness: 0.05,
  });
}

function createChimneyBrickMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(881994);

  ctx.fillStyle = '#25211e'; // deep recessed mortar
  ctx.fillRect(0, 0, size, size);
  const rows = 16;
  const cols = 8;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * cw + offset;
      const by = r * rh;
      const v = Math.round((rand() - 0.5) * 28);
      ctx.fillStyle = `rgb(${108 + v}, ${54 + Math.round(v * 0.5)}, ${42 + Math.round(v * 0.4)})`;
      ctx.fillRect(bx + 3, by + 3, cw - 6, rh - 6);
    }
  }
  // Chimney soot & grime streaks
  for (let s = 0; s < 75; s++) {
    ctx.fillStyle = 'rgba(12, 10, 10, 0.36)';
    ctx.fillRect(rand() * size, rand() * size, 10 + rand() * 34, 18 + rand() * 65);
  }
  enhanceHorrorAlbedo(c, 0.3);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.6,
    roughMin: 0.68,
    roughMax: 0.96,
    aoStrength: 0.85,
  });

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.85,
    roughness: 1.0,
    metalness: 0.04,
  });
}

function createGrimeMetalMaterial(maxAnisotropy: number): THREE.MeshPhysicalMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(551994);

  ctx.fillStyle = '#424954';
  ctx.fillRect(0, 0, size, size);
  // Directional brushed steel grain + oxide rust pitting
  for (let y = 0; y < size; y += 2) {
    const v = 56 + Math.round((rand() - 0.5) * 22);
    ctx.fillStyle = `rgb(${v},${v + 5},${v + 12})`;
    ctx.fillRect(0, y, size, 2);
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(104, 48, 24, 0.42)' : 'rgba(18, 22, 28, 0.36)';
    ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 36, 4 + rand() * 28);
  }
  enhanceHorrorAlbedo(c, 0.28);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 2.7,
    roughMin: 0.24,
    roughMax: 0.78,
    aoStrength: 0.65,
  });

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.68,
    roughness: 1.0,
    metalness: 0.74,
    clearcoat: 0.35,
    clearcoatRoughness: 0.36,
    envMapIntensity: 1.45,
  });
}

function createPineBarkMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(311994);

  ctx.fillStyle = '#33261d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const w = 3 + rand() * 10;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(15, 11, 8, 0.72)'
        : i % 2 === 0
          ? 'rgba(78, 56, 40, 0.48)'
          : 'rgba(42, 50, 32, 0.25)';
    ctx.fillRect(x, 0, w, size);
  }
  // Horizontal bark plate cracks & subtle moss flecks
  for (let i = 0; i < 95; i++) {
    ctx.fillStyle = i % 4 === 0 ? 'rgba(34, 54, 30, 0.36)' : 'rgba(10, 8, 6, 0.6)';
    ctx.fillRect(rand() * size, rand() * size, 8 + rand() * 24, 2 + rand() * 5);
  }
  enhanceHorrorAlbedo(c, 0.28);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 4.1,
    roughMin: 0.74,
    roughMax: 0.98,
    aoStrength: 0.85,
  });
  pbr.map.repeat.set(2, 3);
  pbr.normalMap.repeat.set(2, 3);
  pbr.roughnessMap.repeat.set(2, 3);
  pbr.aoMap.repeat.set(2, 3);

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.85,
    roughness: 1.0,
    metalness: 0.02,
  });
}

function createPineFoliageMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(611994);

  ctx.fillStyle = '#18291f';
  ctx.fillRect(0, 0, size, size);
  // Layered downward pine bough clusters & needle strokes
  for (let layer = 0; layer < 8; layer++) {
    const baseY = (layer / 8) * size;
    for (let i = 0; i < 65; i++) {
      const bx = rand() * size;
      const by = (baseY + rand() * 40) % size;
      ctx.strokeStyle =
        i % 3 === 0 ? '#2b4736' : i % 2 === 0 ? '#1e3528' : '#0f1c15';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 10);
      ctx.lineTo(bx + (rand() - 0.5) * 18, by + 10 + rand() * 12);
      ctx.stroke();
    }
  }
  enhanceHorrorAlbedo(c, 0.2);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.4,
    roughMin: 0.66,
    roughMax: 0.96,
    aoStrength: 0.82,
  });
  pbr.map.repeat.set(3, 4);
  pbr.normalMap.repeat.set(3, 4);
  pbr.roughnessMap.repeat.set(3, 4);
  pbr.aoMap.repeat.set(3, 4);

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.75,
    roughness: 1.0,
    metalness: 0.02,
  });
}

function createWindowGlassMaterial(
  variant: 'warm' | 'crimson' | 'dark',
  maxAnisotropy: number
): THREE.MeshPhysicalMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(variant === 'crimson' ? 9194 : variant === 'warm' ? 7194 : 5194);

  const grad = ctx.createRadialGradient(128, 114, 10, 128, 128, 165);
  if (variant === 'crimson') {
    grad.addColorStop(0, '#ff7864');
    grad.addColorStop(0.48, '#c21e26');
    grad.addColorStop(0.84, '#4e0a12');
    grad.addColorStop(1, '#1e0408');
  } else if (variant === 'warm') {
    grad.addColorStop(0, '#fff0c4');
    grad.addColorStop(0.52, '#d6893a');
    grad.addColorStop(0.85, '#593315');
    grad.addColorStop(1, '#241308');
  } else {
    grad.addColorStop(0, '#2d445d');
    grad.addColorStop(0.55, '#152232');
    grad.addColorStop(1, '#070c14');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle silhouetted interior ceiling lamp & shelf depth inside lit rooms
  if (variant !== 'dark') {
    ctx.fillStyle = 'rgba(20, 10, 8, 0.28)';
    ctx.fillRect(124, 0, 8, 44);
    ctx.beginPath();
    ctx.moveTo(96, 56);
    ctx.lineTo(160, 56);
    ctx.lineTo(144, 38);
    ctx.lineTo(112, 38);
    ctx.closePath();
    ctx.fill();
    // Potted windowsill houseplant silhouette
    ctx.fillStyle = 'rgba(18, 12, 10, 0.42)';
    ctx.fillRect(166, 212, 30, 32);
    ctx.beginPath();
    ctx.arc(181, 200, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draped Soviet lace/fabric curtain folds along left & right edges
  for (let side = 0; side < 2; side++) {
    const startX = side === 0 ? 0 : size - 68;
    for (let x = 0; x < 68; x += 6) {
      const shade = Math.sin(x * 0.38) * 0.5 + 0.5;
      ctx.fillStyle =
        variant === 'dark'
          ? `rgba(10, 14, 22, ${0.42 + shade * 0.35})`
          : `rgba(22, 14, 12, ${0.34 + shade * 0.32})`;
      ctx.fillRect(startX + x, 0, 5, size);
    }
  }
  // Raindrop condensation streaks on outer window glass
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = `rgba(12, 16, 22, ${0.08 + rand() * 0.2})`;
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 5, 16 + rand() * 68);
  }
  ctx.strokeStyle = 'rgba(8, 10, 14, 0.72)';
  ctx.lineWidth = 18;
  ctx.strokeRect(0, 0, size, size);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 1.5,
    roughMin: 0.06,
    roughMax: 0.34,
    aoStrength: 0.35,
  });

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: pbr.roughnessMap,
    emissive:
      variant === 'crimson' ? 0xcc2026 : variant === 'warm' ? 0xe08d38 : 0x0d1a2c,
    emissiveMap: pbr.map,
    emissiveIntensity: variant === 'crimson' ? 1.65 : variant === 'warm' ? 1.18 : 0.26,
    roughness: 0.9,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.95,
    envMapIntensity: 1.85,
  });
}

function createFrostedGlassMaterial(maxAnisotropy: number): THREE.MeshPhysicalMaterial {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(121994);

  ctx.fillStyle = '#ebe6dc';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 8) {
    ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.48)' : 'rgba(90,85,78,0.28)';
    ctx.fillRect(x, 0, 4, size);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(35, 30, 26, ${0.06 + rand() * 0.14})`;
    ctx.fillRect(rand() * size, rand() * size, 3 + rand() * 8, 3 + rand() * 8);
  }
  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 2.3,
    roughMin: 0.14,
    roughMax: 0.44,
    aoStrength: 0.3,
  });

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: pbr.roughnessMap,
    roughness: 1.0,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.5,
  });
}

function createSovietCarPaintMaterial(maxAnisotropy: number): THREE.MeshPhysicalMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(19942141);

  // Authentic 1994 Soviet Moskvitch-412 metallic seafoam-jade lacquer with subtle metallic flake & rain-beading
  const bodyGrad = ctx.createLinearGradient(0, 0, 0, size);
  bodyGrad.addColorStop(0, '#3e625e');
  bodyGrad.addColorStop(0.62, '#34524e');
  bodyGrad.addColorStop(0.86, '#2a3d3b');
  bodyGrad.addColorStop(1, '#3d2c22'); // subtle lower rocker-panel mud/rust spray
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(0, 0, size, size);

  // Fine automotive metallic flake shimmer
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(155, 204, 198, 0.12)' : 'rgba(18, 30, 32, 0.16)';
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }
  // Rain runoff streaks & wheel-well patina
  for (let i = 0; i < 95; i++) {
    ctx.fillStyle =
      i % 5 === 0
        ? 'rgba(112, 54, 28, 0.26)'
        : 'rgba(16, 28, 30, 0.22)';
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 8, 14 + rand() * 64);
  }
  // Glossy raindrop beads on enamel
  for (let i = 0; i < 220; i++) {
    const rx = rand() * size;
    const ry = rand() * size;
    const rr = 1.5 + rand() * 3.5;
    ctx.fillStyle = 'rgba(210, 236, 245, 0.22)';
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  enhanceHorrorAlbedo(c, 0.16);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 1.15,
    roughMin: 0.14,
    roughMax: 0.48,
    aoStrength: 0.42,
  });

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.5,
    roughness: 0.85,
    metalness: 0.62,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0,
    envMapIntensity: 2.1,
  });
}

function createTireRubberMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#1b1d20';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#0d0e10';
  for (let y = 0; y < size; y += 12) {
    ctx.fillRect(0, y, size, 5);
  }
  for (let x = 0; x < size; x += 16) {
    ctx.fillRect(x, 0, 4, size);
  }
  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.4,
    roughMin: 0.68,
    roughMax: 0.96,
    aoStrength: 0.75,
  });
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: pbr.roughnessMap,
    roughness: 1.0,
    metalness: 0.05,
  });
}

function createHouseTimberSidingMaterial(
  maxAnisotropy: number
): THREE.MeshStandardMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(199477);

  // Classic Soviet countryside horizontal clapboard siding (peeling sage-teal & weathered pine)
  ctx.fillStyle = '#4c635f';
  ctx.fillRect(0, 0, size, size);
  const boards = 14;
  const bh = size / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    const shade = Math.round((rand() - 0.5) * 20);
    // Slight warm-to-cool board variation
    ctx.fillStyle = `rgb(${76 + shade}, ${99 + shade}, ${94 + Math.round(shade * 0.8)})`;
    ctx.fillRect(0, y + 3, size, bh - 4);
    // Deep clapboard shadow lip under each overlapping board
    ctx.fillStyle = '#182120';
    ctx.fillRect(0, y, size, 3.5);
    // Subtle top sunlit bevel highlight
    ctx.fillStyle = 'rgba(182, 206, 200, 0.22)';
    ctx.fillRect(0, y + 3.5, size, 2.2);
    // Horizontal wood grain streaks
    ctx.strokeStyle = 'rgba(20, 28, 26, 0.26)';
    ctx.lineWidth = 1.2;
    for (let g = 0; g < 6; g++) {
      const gy = y + 6 + rand() * (bh - 10);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(size, gy + (rand() - 0.5) * 4);
      ctx.stroke();
    }
    // Peeling bare timber patches
    for (let p = 0; p < 3; p++) {
      if (rand() > 0.45) {
        ctx.fillStyle = 'rgba(98, 76, 54, 0.48)';
        ctx.fillRect(rand() * size, y + 5 + rand() * (bh - 14), 16 + rand() * 44, 6 + rand() * 10);
      }
    }
  }
  // Rain drip stains + damp green moss near bottom
  for (let d = 0; d < 42; d++) {
    ctx.fillStyle = 'rgba(18, 24, 22, 0.24)';
    ctx.fillRect(rand() * size, rand() * size, 3 + rand() * 7, 18 + rand() * 68);
  }
  const moss = ctx.createLinearGradient(0, size * 0.78, 0, size);
  moss.addColorStop(0, 'rgba(24, 38, 22, 0)');
  moss.addColorStop(1, 'rgba(20, 34, 18, 0.55)');
  ctx.fillStyle = moss;
  ctx.fillRect(0, size * 0.78, size, size * 0.22);
  enhanceHorrorAlbedo(c, 0.24);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.6,
    roughMin: 0.54,
    roughMax: 0.95,
    aoStrength: 0.85,
  });

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.86,
    roughness: 1.0,
    metalness: 0.04,
  });
}

function createHouseBrickWallMaterial(
  maxAnisotropy: number
): THREE.MeshStandardMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(199488);

  // Recessed damp mortar base
  ctx.fillStyle = '#332e2a';
  ctx.fillRect(0, 0, size, size);

  const rows = 20;
  const cols = 8;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    const isSilicateBand = r % 7 === 0;
    for (let col = -1; col <= cols; col++) {
      const bx = col * cw + off;
      const by = r * rh;
      const v = Math.round((rand() - 0.5) * 32);
      if (isSilicateBand) {
        // Soviet white-grey silicate trim course
        ctx.fillStyle = `rgb(${156 + v}, ${152 + v}, ${142 + v})`;
      } else {
        // Aged terracotta-ochre Soviet red brick
        ctx.fillStyle = `rgb(${128 + v}, ${68 + Math.round(v * 0.5)}, ${52 + Math.round(v * 0.45)})`;
      }
      ctx.fillRect(bx + 2.5, by + 2.5, cw - 5, rh - 5);
      // Subtle chipped corner highlight
      ctx.fillStyle = 'rgba(220, 200, 180, 0.12)';
      ctx.fillRect(bx + 3, by + 3, cw - 6, 2);
    }
  }
  // Rain efflorescence & weathered lime mortar streaks
  for (let s = 0; s < 55; s++) {
    ctx.fillStyle =
      s % 3 === 0 ? 'rgba(180, 178, 168, 0.14)' : 'rgba(14, 12, 12, 0.28)';
    ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 24, 16 + rand() * 72);
  }
  enhanceHorrorAlbedo(c, 0.26);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 3.8,
    roughMin: 0.62,
    roughMax: 0.96,
    aoStrength: 0.88,
  });

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.88,
    roughness: 1.0,
    metalness: 0.04,
  });
}

/**
 * Photorealistic wet-asphalt puddle shader ("мокрая, чуть в лужах дорога"):
 * - Organic FBM multi-lobe wet depression silhouette seamlessly feathered into damp tarmac
 * - Pure Schlick Fresnel dark-mirror reflection of midnight sky & stretched warm sodium lamp glares
 * - Subtle microscopic wind/drizzle surface sheen (ZERO cartoony bright white concentric circles!)
 * - polygonOffset guarantees zero Z-fighting on every GPU & software WebGL.
 */
export function createRainPuddleMaterial(_maxAnisotropy?: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSkyColor: { value: new THREE.Color(0x284770) },
      uWarmGlow: { value: new THREE.Color(0xffac52) },
      uCrimsonGlow: { value: new THREE.Color(0xd9383a) },
      uMoonDir: { value: new THREE.Vector3(0.42, 0.72, -0.54).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSkyColor;
      uniform vec3 uWarmGlow;
      uniform vec3 uCrimsonGlow;
      uniform vec3 uMoonDir;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.xx + p3.yz) * p3.zy);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * valueNoise(p);
          p *= 2.04;
          a *= 0.5;
        }
        return v;
      }

      // Physically-based expanding circular raindrop ripple returning radial normal gradient (xy) + crest energy (z)
      vec3 rainRippleLayer(vec2 worldXZ, float time, float scale, float speed, float seedOffset) {
        vec2 uv = worldXZ * scale;
        vec2 cell = floor(uv);
        vec2 local = fract(uv);
        vec2 grad = vec2(0.0);
        float crest = 0.0;

        for (int oy = -1; oy <= 1; oy++) {
          for (int ox = -1; ox <= 1; ox++) {
            vec2 neighbor = cell + vec2(float(ox), float(oy));
            vec2 rnd = hash22(neighbor + seedOffset);
            // Only ~62% of cells fire per cycle so puddles feel organically sprinkled, not gridded
            if (rnd.x < 0.36) continue;
            float cycle = time * speed + rnd.y * 6.2831;
            float age = fract(cycle);
            float cycleIdx = floor(cycle);
            vec2 dropCenter = vec2(float(ox), float(oy)) + 0.18 + 0.64 * hash22(neighbor + cycleIdx * 17.3 + seedOffset);
            vec2 dVec = local - dropCenter;
            float dist = length(dVec);
            float maxRadius = 0.42 + 0.24 * rnd.x;
            float waveRadius = age * maxRadius;
            float band = dist - waveRadius;
            // Tight physical damped wave packet: 2 subtle concentric rings fading quadratically
            float envelope = exp(-band * band * 145.0) * (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.06, age);
            float waveDeriv = cos(band * 44.0) * envelope;
            vec2 dir = dist > 0.001 ? dVec / dist : vec2(0.0);
            grad += dir * waveDeriv;
            crest += max(0.0, sin(band * 44.0)) * envelope;
          }
        }
        return vec3(grad, crest);
      }

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        // Organic asphalt depression with subtle wheel-rut elongation
        float n = fbm(vWorldPos.xz * 0.52);
        float edge = r + (n - 0.5) * 0.68;
        float shape = 1.0 - smoothstep(0.26, 0.95, edge);
        if (shape < 0.012) discard;

        float camDist = length(cameraPosition - vWorldPos);
        float rippleFade = 1.0 - smoothstep(14.0, 38.0, camDist);

        // Micro-capillary wind drift + 3 staggered raindrop impact ripple layers
        float s1 = valueNoise(vWorldPos.xz * 4.2 + vec2(uTime * 0.38, -uTime * 0.24));
        float s2 = valueNoise(vWorldPos.xz * 9.4 + vec2(-uTime * 0.28, uTime * 0.44));
        vec2 microGrad = vec2(s1 - 0.5, s2 - 0.5) * 0.055;

        vec3 rA = rainRippleLayer(vWorldPos.xz, uTime, 1.35, 0.72, 11.7);
        vec3 rB = rainRippleLayer(vWorldPos.xz + vec2(3.1, -1.9), uTime, 2.05, 0.94, 47.3);
        vec3 rC = rainRippleLayer(vWorldPos.xz + vec2(-2.4, 4.7), uTime, 2.85, 1.18, 83.1);

        vec2 rippleGrad = (rA.xy * 0.24 + rB.xy * 0.17 + rC.xy * 0.11) * rippleFade;
        float rippleCrest = clamp((rA.z * 0.65 + rB.z * 0.5 + rC.z * 0.35) * rippleFade, 0.0, 1.0);

        vec3 N = normalize(vec3(microGrad.x + rippleGrad.x, 1.0, microGrad.y + rippleGrad.y));

        vec3 V = normalize(cameraPosition - vWorldPos);
        float NdotV = max(dot(N, V), 0.03);
        // Physical Schlick water Fresnel (crisp mirror reflection at shallow angles)
        float fresnel = 0.045 + 0.955 * pow(1.0 - NdotV, 3.6);

        // Multi-source realistic reflections of overhead sodium streetlamps + house windows
        vec3 R = reflect(-V, N);
        float lampWave = 0.5 + 0.5 * cos((vWorldPos.z + R.z * 2.8 + N.x * 3.8) * 0.35);
        float lampProximity = 0.25 + 0.75 * pow(lampWave, 2.6);
        float roadBand = exp(-abs(vWorldPos.x) * 0.18);
        vec3 warmStreak = uWarmGlow * (0.24 + 0.92 * pow(lampWave, 2.8)) * roadBand * (0.45 + 0.55 * fresnel);

        // Subtle red/amber house window reflection streaks near road curbs
        float edgeWindowMask = smoothstep(1.1, 4.2, abs(vWorldPos.x));
        float winWave = 0.5 + 0.5 * sin(vWorldPos.z * 0.46 + R.x * 2.4);
        vec3 windowBounce = mix(uWarmGlow, uCrimsonGlow, step(0.0, vWorldPos.x)) * pow(winWave, 3.8) * edgeWindowMask * 0.55 * fresnel;

        // Crisp moonlit specular column + warm sodium ripple-edge specular glint (NOT painted white!)
        vec3 H = normalize(uMoonDir + V);
        float spec = pow(max(dot(N, H), 0.0), 110.0) * 1.25;
        vec3 rippleGlint = mix(uSkyColor * 1.15, uWarmGlow * 1.35, lampProximity * roadBand) * rippleCrest * (0.22 + 0.55 * fresnel);

        // Deep wet tarmac absorption + mirror reflection blend
        vec3 darkWetBase = vec3(0.011, 0.017, 0.029);
        vec3 skyRefl = mix(uSkyColor * 0.46, uSkyColor * 1.42, fresnel);
        vec3 color = mix(darkWetBase, skyRefl + warmStreak + windowBounce, clamp(fresnel * 0.92 + 0.08, 0.0, 1.0));
        color += vec3(0.76, 0.88, 1.0) * spec + rippleGlint;

        // Darkened damp asphalt fringe around puddle perimeter
        float waterCore = smoothstep(0.02, 0.42, shape);
        color = mix(vec3(0.010, 0.013, 0.020), color, waterCore);

        float alpha = clamp(shape * (0.52 + fresnel * 0.44), 0.0, 0.9);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

function createBirchBarkMaterial(maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRand(199461);

  ctx.fillStyle = '#c4c0b6';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = `rgba(92, 96, 88, ${0.08 + rand() * 0.14})`;
    ctx.fillRect(rand() * size, 0, 8 + rand() * 24, size);
  }
  for (let i = 0; i < 110; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 10 + rand() * 34;
    const h = 1.5 + rand() * 4.5;
    ctx.fillStyle = rand() > 0.25 ? '#23201e' : '#4a433b';
    ctx.fillRect(x, y, w, h);
  }
  const baseGrad = ctx.createLinearGradient(0, size * 0.72, 0, size);
  baseGrad.addColorStop(0, 'rgba(34, 30, 26, 0)');
  baseGrad.addColorStop(1, 'rgba(26, 22, 20, 0.88)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, size * 0.72, size, size * 0.28);

  const pbr = buildSobelPbrTextures(c, maxAnisotropy, {
    normalStrength: 2.8,
    roughMin: 0.62,
    roughMax: 0.94,
    aoStrength: 0.78,
  });
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pbr.map,
    normalMap: pbr.normalMap,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughnessMap: pbr.roughnessMap,
    aoMap: pbr.aoMap,
    aoMapIntensity: 0.8,
    roughness: 1.0,
    metalness: 0.03,
  });
}

export function createNocturnalSkyTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(199409);

  // Rich atmospheric midnight Rayleigh/Mie twilight sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#02060f');
  grad.addColorStop(0.18, '#060f20');
  grad.addColorStop(0.35, '#0d1c34');
  grad.addColorStop(0.455, '#192b46');
  grad.addColorStop(0.495, '#3b2f2d'); // distant warm sodium light-pollution horizon band
  grad.addColorStop(0.525, '#251e22');
  grad.addColorStop(0.57, '#0f131b');
  grad.addColorStop(1.0, '#06080d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Delicate high-altitude atmospheric haze bands & faint Milky Way nebula dust
  for (let i = 0; i < 18; i++) {
    const cx = rand() * w;
    const cy = h * 0.1 + rand() * (h * 0.22);
    const rx = 180 + rand() * 320;
    const ry = 28 + rand() * 54;
    const neb = ctx.createRadialGradient(cx, cy, 8, cx, cy, rx);
    neb.addColorStop(0, 'rgba(46, 74, 118, 0.14)');
    neb.addColorStop(1, 'rgba(10, 18, 34, 0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = neb;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Crisp, anti-aliased pinpoint stars (NO blocky square dots!)
  for (let i = 0; i < 420; i++) {
    const sx = rand() * w;
    const sy = rand() * (h * 0.36);
    const fadeHorizon = Math.max(0, 1 - sy / (h * 0.36));
    const mag = Math.pow(rand(), 2.8);
    const alpha = (0.08 + mag * 0.62) * fadeHorizon;
    const radius = 0.45 + mag * 1.15;
    ctx.fillStyle =
      i % 7 === 0
        ? `rgba(255, 232, 200, ${alpha})`
        : `rgba(212, 232, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dramatic silver-blue full moon with multi-ring atmospheric Mie corona + realistic lunar maria craters
  const moonX = w * 0.62;
  const moonY = h * 0.26;
  const outerCorona = ctx.createRadialGradient(moonX, moonY, 16, moonX, moonY, 360);
  outerCorona.addColorStop(0, 'rgba(235, 246, 255, 0.96)');
  outerCorona.addColorStop(0.08, 'rgba(186, 218, 255, 0.56)');
  outerCorona.addColorStop(0.24, 'rgba(98, 146, 210, 0.24)');
  outerCorona.addColorStop(0.55, 'rgba(42, 74, 124, 0.08)');
  outerCorona.addColorStop(1, 'rgba(12, 24, 48, 0)');
  ctx.fillStyle = outerCorona;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 360, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
  ctx.clip();
  const moonGrad = ctx.createRadialGradient(moonX - 6, moonY - 5, 3, moonX, moonY, 26);
  moonGrad.addColorStop(0, '#ffffff');
  moonGrad.addColorStop(0.72, '#dde9fa');
  moonGrad.addColorStop(1, '#9ab2d4');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(moonX - 26, moonY - 26, 52, 52);
  // Subtle lunar maria shading
  for (let m = 0; m < 10; m++) {
    ctx.fillStyle = `rgba(116, 134, 160, ${0.14 + rand() * 0.16})`;
    ctx.beginPath();
    ctx.arc(
      moonX + (rand() - 0.5) * 32,
      moonY + (rand() - 0.5) * 32,
      3 + rand() * 7,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();

  // Multi-layered cinematic volumetric night storm clouds (backlit silver rim near moon, dark slate underbellies)
  for (let i = 0; i < 88; i++) {
    const cx = rand() * w;
    const cy = h * 0.14 + rand() * (h * 0.34);
    const rx = 110 + rand() * 290;
    const ry = 16 + rand() * 44;
    const distToMoon = Math.hypot(cx - moonX, (cy - moonY) * 2.2);
    const silverRim = Math.max(0, 1 - distToMoon / 520);

    // Silver-lit upper cloud deck
    const cg = ctx.createRadialGradient(cx, cy - ry * 0.25, 8, cx, cy, rx);
    const rCol = Math.round(28 + silverRim * 92);
    const gCol = Math.round(44 + silverRim * 112);
    const bCol = Math.round(68 + silverRim * 130);
    cg.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${0.22 + silverRim * 0.26})`);
    cg.addColorStop(0.58, `rgba(18, 28, 46, ${0.14 + silverRim * 0.08})`);
    cg.addColorStop(1, 'rgba(8, 14, 24, 0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dark atmospheric cloud underbelly for 3D volumetric depth
    const ug = ctx.createRadialGradient(cx, cy + ry * 0.35, 6, cx, cy + ry * 0.35, rx * 0.85);
    ug.addColorStop(0, 'rgba(6, 10, 18, 0.34)');
    ug.addColorStop(1, 'rgba(6, 10, 18, 0)');
    ctx.save();
    ctx.translate(cx, cy + ry * 0.22);
    ctx.scale(1, (ry * 0.65) / rx);
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Warm sodium suburban light-pollution glow pockets along the horizon (drives gorgeous PBR reflections!)
  for (let i = 0; i < 8; i++) {
    const lx = (i + 0.5) * (w / 8);
    const ly = h * 0.502;
    const sg = ctx.createRadialGradient(lx, ly, 6, lx, ly, 175);
    sg.addColorStop(0, 'rgba(252, 168, 72, 0.42)');
    sg.addColorStop(0.45, 'rgba(196, 106, 36, 0.16)');
    sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(lx, ly, 175, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant dark forested hill ridge silhouette along the horizon line
  ctx.fillStyle = '#090e16';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.52);
  for (let x = 0; x <= w; x += 16) {
    const ridge =
      Math.sin(x * 0.009) * 14 +
      Math.cos(x * 0.023) * 8 +
      Math.sin(x * 0.068) * 4;
    ctx.lineTo(x, h * 0.505 - Math.abs(ridge));
  }
  ctx.lineTo(w, h * 0.56);
  ctx.lineTo(0, h * 0.56);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export function createPickupMaterials(maxAnisotropy = 4): {
  ammoCrate: THREE.MeshStandardMaterial;
  ammoStripe: THREE.MeshStandardMaterial;
  medkitCase: THREE.MeshStandardMaterial;
  medkitCross: THREE.MeshStandardMaterial;
  overclockCore: THREE.MeshStandardMaterial;
} {
  // 1. Stenciled olive military ammo crate PBR
  const aCanvas = document.createElement('canvas');
  aCanvas.width = 256;
  aCanvas.height = 256;
  const actx = aCanvas.getContext('2d', { willReadFrequently: true })!;
  actx.fillStyle = '#3f4f32';
  actx.fillRect(0, 0, 256, 256);
  actx.strokeStyle = '#1f2918';
  actx.lineWidth = 10;
  actx.strokeRect(8, 8, 240, 240);
  actx.fillStyle = '#26301e';
  actx.fillRect(18, 92, 220, 72);
  actx.fillStyle = '#d49a42';
  actx.font = 'bold 34px monospace';
  actx.textAlign = 'center';
  actx.textBaseline = 'middle';
  actx.fillText('7.62 / 12G', 128, 128);
  enhanceHorrorAlbedo(aCanvas, 0.24);
  const aPbr = buildSobelPbrTextures(aCanvas, maxAnisotropy, {
    normalStrength: 2.8,
    roughMin: 0.42,
    roughMax: 0.84,
    aoStrength: 0.6,
  });

  // 2. Scuffed Soviet enamel medkit case PBR
  const mCanvas = document.createElement('canvas');
  mCanvas.width = 256;
  mCanvas.height = 256;
  const mctx = mCanvas.getContext('2d', { willReadFrequently: true })!;
  mctx.fillStyle = '#1c6348';
  mctx.fillRect(0, 0, 256, 256);
  mctx.strokeStyle = '#0e3325';
  mctx.lineWidth = 12;
  mctx.strokeRect(10, 10, 236, 236);
  mctx.strokeStyle = 'rgba(235, 245, 240, 0.28)';
  mctx.lineWidth = 4;
  mctx.strokeRect(24, 24, 208, 208);
  enhanceHorrorAlbedo(mCanvas, 0.2);
  const mPbr = buildSobelPbrTextures(mCanvas, maxAnisotropy, {
    normalStrength: 2.2,
    roughMin: 0.28,
    roughMax: 0.68,
    aoStrength: 0.5,
  });

  // 3. Etched .EXE corrupted crystal shard PBR
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 256;
  cCanvas.height = 256;
  const cctx = cCanvas.getContext('2d', { willReadFrequently: true })!;
  cctx.fillStyle = '#a81422';
  cctx.fillRect(0, 0, 256, 256);
  cctx.strokeStyle = '#ff6b72';
  cctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    cctx.beginPath();
    cctx.moveTo(0, i * 16);
    cctx.lineTo(256, i * 16 + ((i % 2) * 24 - 12));
    cctx.stroke();
  }
  const cPbr = buildSobelPbrTextures(cCanvas, maxAnisotropy, {
    normalStrength: 3.2,
    roughMin: 0.14,
    roughMax: 0.45,
    aoStrength: 0.4,
  });

  return {
    ammoCrate: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: aPbr.map,
      normalMap: aPbr.normalMap,
      roughnessMap: aPbr.roughnessMap,
      emissive: 0x3b2308,
      emissiveIntensity: 0.45,
      roughness: 1.0,
      metalness: 0.42,
    }),
    ammoStripe: new THREE.MeshStandardMaterial({
      color: 0xf0a647,
      map: aPbr.map,
      normalMap: aPbr.normalMap,
      emissive: 0xe8963a,
      emissiveIntensity: 1.4,
      roughness: 0.28,
      metalness: 0.35,
    }),
    medkitCase: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mPbr.map,
      normalMap: mPbr.normalMap,
      roughnessMap: mPbr.roughnessMap,
      emissive: 0x10402d,
      emissiveIntensity: 0.55,
      roughness: 1.0,
      metalness: 0.26,
    }),
    medkitCross: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mPbr.aoMap,
      normalMap: mPbr.normalMap,
      emissive: 0x5fa88e,
      emissiveIntensity: 1.55,
      roughness: 0.24,
      metalness: 0.12,
    }),
    overclockCore: new THREE.MeshStandardMaterial({
      color: 0xff404c,
      map: cPbr.map,
      normalMap: cPbr.normalMap,
      roughnessMap: cPbr.roughnessMap,
      emissive: 0xd91624,
      emissiveIntensity: 1.65,
      roughness: 0.9,
      metalness: 0.48,
    }),
  };
}

export function createP90MagTextures(): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;

  // Smoked translucent polycarbonate body
  ctx.fillStyle = '#262420';
  ctx.fillRect(0, 0, w, h);

  // Horizontal stacked 5.7x28mm brass cartridges visible inside magazine
  for (let y = 14; y < h - 14; y += 11) {
    // Brass casing
    ctx.fillStyle = '#9a7b3c';
    ctx.fillRect(20, y, 64, 7);
    // Darker shadow seam between cartridges
    ctx.fillStyle = '#151412';
    ctx.fillRect(14, y + 7, 100, 4);
    // Copper-jacketed bullet tip
    ctx.fillStyle = '#b56d38';
    ctx.fillRect(84, y + 1, 24, 5);
  }
  // Smoked polymer structural side rails & witness markings
  ctx.fillStyle = 'rgba(20, 22, 26, 0.72)';
  ctx.fillRect(0, 0, 16, h);
  ctx.fillRect(w - 16, 0, 16, h);
  ctx.fillStyle = 'rgba(220, 224, 232, 0.4)';
  ctx.fillRect(4, 48, 8, 2);
  ctx.fillRect(4, 128, 8, 2);
  ctx.fillRect(4, 208, 8, 2);

  const pbr = buildSobelPbrTextures(c, 8, {
    normalStrength: 2.4,
    roughMin: 0.2,
    roughMax: 0.45,
    aoStrength: 0.4,
  });
  return { map: pbr.map, normalMap: pbr.normalMap };
}

export function createStarterWorldMaterials(
  maxAnisotropy: number
): WorldMaterialSet {
  const houseProc = createProceduralTexture(
    {
      slot: 'house',
      pattern: 'stucco_brick',
      primaryHex: '#9a9080',
      secondaryHex: '#635547',
      grime: 0.65,
      wear: 0.62,
    },
    maxAnisotropy
  );

  const fenceProc = createProceduralTexture(
    {
      slot: 'fence',
      pattern: 'timber_planks',
      primaryHex: '#555f45',
      secondaryHex: '#393832',
      grime: 0.72,
      wear: 0.7,
    },
    maxAnisotropy
  );

  const roadProc = createProceduralTexture(
    {
      slot: 'road',
      pattern: 'cracked_asphalt',
      primaryHex: '#2b2f36',
      secondaryHex: '#15181d',
      grime: 0.6,
      wear: 0.65,
    },
    maxAnisotropy
  );

  const lawnProc = createProceduralTexture(
    {
      slot: 'lawn',
      pattern: 'night_grass',
      primaryHex: '#243622',
      secondaryHex: '#172216',
      grime: 0.55,
      wear: 0.45,
    },
    maxAnisotropy
  );

  const roofProc = createProceduralTexture(
    {
      slot: 'house',
      pattern: 'concrete_panels',
      primaryHex: '#3c3a39',
      secondaryHex: '#262423',
      grime: 0.72,
      wear: 0.58,
    },
    maxAnisotropy
  );

  const roadTimeUniform = { value: 0 };
  const roadMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8d0dc,
    map: roadProc.map,
    normalMap: roadProc.normalMap,
    normalScale: new THREE.Vector2(0.2, 0.2),
    roughnessMap: roadProc.roughnessMap,
    aoMap: roadProc.aoMap,
    aoMapIntensity: 0.72,
    roughness: 0.82,
    metalness: 0.03,
    clearcoat: 0.14,
    clearcoatRoughness: 0.58,
    reflectivity: 0.42,
    envMapIntensity: 0.55,
  });

  // AAA Wet-Asphalt Rain Shader: world-space damp wheel-ruts, curb drainage sheen, and live raindrop ripple normals
  roadMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadTime = roadTimeUniform;
    shader.vertexShader =
      'varying vec3 vRoadWorldPos;\n' +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vRoadWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader =
      `uniform float uRoadTime;
       varying vec3 vRoadWorldPos;
       float _rHash(vec2 p) {
         p = fract(p * vec2(127.1, 311.7));
         p += dot(p, p + 34.23);
         return fract(p.x * p.y);
       }
       vec2 _rHash2(vec2 p) {
         vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
         p3 += dot(p3, p3.yzx + 33.33);
         return fract((p3.xx + p3.yz) * p3.zy);
       }
       float _rNoise(vec2 p) {
         vec2 i = floor(p);
         vec2 f = fract(p);
         f = f * f * (3.0 - 2.0 * f);
         return mix(
           mix(_rHash(i), _rHash(i + vec2(1.0, 0.0)), f.x),
           mix(_rHash(i + vec2(0.0, 1.0)), _rHash(i + vec2(1.0, 1.0)), f.x),
           f.y
         );
       }
       float _roadWetness(vec2 xz) {
         float macro = _rNoise(xz * 0.14) * 0.62 + _rNoise(xz * 0.42) * 0.38;
         float wheelRut = exp(-pow(abs(abs(xz.x) - 1.85), 2.0) * 0.9);
         float curbDrain = exp(-pow(abs(abs(xz.x) - 4.15), 2.0) * 2.2) * 0.34;
         return smoothstep(0.32, 0.78, macro + wheelRut * 0.32 + curbDrain);
       }
       vec3 _roadRainRipples(vec2 xz, float t) {
         vec2 grad = vec2(0.0);
         float shimmer = 0.0;
         for (int layer = 0; layer < 2; layer++) {
           float sc = layer == 0 ? 1.45 : 2.35;
           float sp = layer == 0 ? 0.78 : 1.05;
           float seed = layer == 0 ? 7.3 : 29.1;
           vec2 uv = xz * sc + vec2(float(layer) * 4.1, float(layer) * -2.7);
           vec2 cell = floor(uv);
           vec2 f = fract(uv);
           vec2 rnd = _rHash2(cell + seed);
           if (rnd.x > 0.34) {
             float cyc = t * sp + rnd.y * 6.2831;
             float age = fract(cyc);
             float cIdx = floor(cyc);
             vec2 ctr = 0.2 + 0.6 * _rHash2(cell + cIdx * 13.7 + seed);
             vec2 dv = f - ctr;
             float d = length(dv);
             float rad = age * (0.36 + 0.18 * rnd.x);
             float band = d - rad;
             float env = exp(-band * band * 130.0) * (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.07, age);
             vec2 dir = d > 0.002 ? dv / d : vec2(0.0);
             grad += dir * cos(band * 38.0) * env * (layer == 0 ? 0.14 : 0.09);
             shimmer += max(0.0, sin(band * 38.0)) * env;
           }
         }
         return vec3(grad, shimmer);
       }
      ` +
      shader.fragmentShader
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           float _wetMask = _roadWetness(vRoadWorldPos.xz);
           float _flowFilm = _rNoise(vec2(vRoadWorldPos.x * 2.2, vRoadWorldPos.z * 0.65 - uRoadTime * 0.45));
           roughnessFactor = mix(roughnessFactor, 0.42 + _flowFilm * 0.10, _wetMask * 0.72);`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float _wetTint = _roadWetness(vRoadWorldPos.xz);
           float _camDistRoad = length(cameraPosition - vRoadWorldPos);
           float _ripFade = (1.0 - smoothstep(10.0, 30.0, _camDistRoad)) * _wetTint;
           vec3 _ripSample = _roadRainRipples(vRoadWorldPos.xz, uRoadTime);
           diffuseColor.rgb *= mix(1.0, 0.58, _wetTint);
           // Subtle damp rain-impact sheen modulated by streetlamp proximity (zero glittery noise)
           float _lampBand = (0.36 + 0.64 * pow(0.5 + 0.5 * cos(vRoadWorldPos.z * 0.35), 2.0)) * exp(-abs(vRoadWorldPos.x) * 0.14);
           diffuseColor.rgb += mix(vec3(0.06, 0.09, 0.14), vec3(0.20, 0.14, 0.08), _lampBand) * _ripSample.z * _ripFade * 0.44;`
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
           float _wetNorm = _roadWetness(vRoadWorldPos.xz);
           float _normFade = (1.0 - smoothstep(10.0, 30.0, length(cameraPosition - vRoadWorldPos))) * _wetNorm;
           vec3 _ripN = _roadRainRipples(vRoadWorldPos.xz, uRoadTime);
           normal = normalize(normal + vec3(_ripN.x, 0.0, _ripN.y) * _normFade * 0.38);`
        );
  };

  const materials: WorldMaterialSet = {
    house: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: houseProc.map,
      normalMap: houseProc.normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: houseProc.roughnessMap,
      aoMap: houseProc.aoMap,
      aoMapIntensity: 0.88,
      roughness: 1.0,
      metalness: 0.04,
    }),
    houseTimber: createHouseTimberSidingMaterial(maxAnisotropy),
    houseBrick: createHouseBrickWallMaterial(maxAnisotropy),
    fence: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: fenceProc.map,
      normalMap: fenceProc.normalMap,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughnessMap: fenceProc.roughnessMap,
      aoMap: fenceProc.aoMap,
      aoMapIntensity: 0.9,
      roughness: 1.0,
      metalness: 0.04,
    }),
    road: roadMat,
    lawn: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: lawnProc.map,
      normalMap: lawnProc.normalMap,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughnessMap: lawnProc.roughnessMap,
      aoMap: lawnProc.aoMap,
      aoMapIntensity: 0.82,
      roughness: 1.0,
      metalness: 0.03,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roofProc.map,
      normalMap: roofProc.normalMap,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughnessMap: roofProc.roughnessMap,
      aoMap: roofProc.aoMap,
      aoMapIntensity: 0.88,
      roughness: 1.0,
      metalness: 0.16,
    }),
    concrete: createArchitecturalConcreteMaterial(maxAnisotropy),
    woodTrim: createWoodTrimMaterial(maxAnisotropy),
    brick: createChimneyBrickMaterial(maxAnisotropy),
    grimeMetal: createGrimeMetalMaterial(maxAnisotropy),
    bark: createPineBarkMaterial(maxAnisotropy),
    birchBark: createBirchBarkMaterial(maxAnisotropy),
    foliage: createPineFoliageMaterial(maxAnisotropy),
    windowWarm: createWindowGlassMaterial('warm', maxAnisotropy),
    windowCrimson: createWindowGlassMaterial('crimson', maxAnisotropy),
    windowDark: createWindowGlassMaterial('dark', maxAnisotropy),
    frostedGlass: createFrostedGlassMaterial(maxAnisotropy),
    carPaint: createSovietCarPaintMaterial(maxAnisotropy),
    tireRubber: createTireRubberMaterial(maxAnisotropy),
    roadTimeUniform,
  };

  loadGeneratedStarterTextures(materials, maxAnisotropy);
  return materials;
}

interface DerivedPbrOptions {
  normalStrength: number;
  roughMin: number;
  roughMax: number;
  invertRoughness?: boolean;
  grimeAmount?: number;
  aoStrength?: number;
}

/**
 * Loads a high-res seamless photographic albedo texture at 1024x1024, enhances
 * CloverPit-style micro-grit & contrast, and computes true Sobel Tangent-Space
 * Normal, Roughness, and Ambient Occlusion maps. All maps stay at repeat (1,1)
 * because geometry meshes use exact meter-calibrated world-space box/plane UVs.
 */
function loadImageWithDerivedPBR(
  url: string,
  material: THREE.MeshStandardMaterial,
  maxAnisotropy: number,
  opts: DerivedPbrOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 1024;
      const albedoCanvas = document.createElement('canvas');
      albedoCanvas.width = size;
      albedoCanvas.height = size;
      const actx = albedoCanvas.getContext('2d', { willReadFrequently: true })!;
      actx.drawImage(img, 0, 0, size, size);
      enhanceHorrorAlbedo(albedoCanvas, opts.grimeAmount ?? 0.24);

      const pbr = buildSobelPbrTextures(albedoCanvas, maxAnisotropy, {
        normalStrength: opts.normalStrength,
        roughMin: opts.roughMin,
        roughMax: opts.roughMax,
        invertRoughness: opts.invertRoughness,
        aoStrength: opts.aoStrength ?? 0.8,
      });

      material.map = pbr.map;
      material.bumpMap = null;
      material.normalMap = pbr.normalMap;
      material.roughnessMap = pbr.roughnessMap;
      material.aoMap = pbr.aoMap;
      material.roughness = 1.0;
      material.needsUpdate = true;
      resolve();
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export function loadGeneratedStarterTextures(
  materials: WorldMaterialSet,
  maxAnisotropy: number
): void {
  void loadImageWithDerivedPBR(ASSET_PATHS.houseStucco, materials.house, maxAnisotropy, {
    normalStrength: 3.4,
    roughMin: 0.6,
    roughMax: 0.96,
    grimeAmount: 0.26,
    aoStrength: 0.85,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.woodFence, materials.fence, maxAnisotropy, {
    normalStrength: 3.8,
    roughMin: 0.62,
    roughMax: 0.96,
    grimeAmount: 0.28,
    aoStrength: 0.9,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.wetAsphalt, materials.road, maxAnisotropy, {
    normalStrength: 1.35,
    roughMin: 0.28, // smooth damp asphalt reflection without grazing-angle fireflies
    roughMax: 0.84,
    grimeAmount: 0.16,
    aoStrength: 0.65,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.lawnGrass, materials.lawn, maxAnisotropy, {
    normalStrength: 3.1,
    roughMin: 0.42,
    roughMax: 0.96,
    grimeAmount: 0.22,
    aoStrength: 0.82,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.roofSlate, materials.roof, maxAnisotropy, {
    normalStrength: 4.0,
    roughMin: 0.48,
    roughMax: 0.92,
    grimeAmount: 0.25,
    aoStrength: 0.88,
  }).catch(() => {});
}

export function loadExeCorruptedTextures(
  materials: WorldMaterialSet,
  maxAnisotropy: number
): void {
  void loadImageWithDerivedPBR(ASSET_PATHS.exeCorrupted, materials.house, maxAnisotropy, {
    normalStrength: 4.0,
    roughMin: 0.34,
    roughMax: 0.92,
    grimeAmount: 0.32,
    aoStrength: 0.9,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.exeCorrupted, materials.roof, maxAnisotropy, {
    normalStrength: 3.8,
    roughMin: 0.32,
    roughMax: 0.88,
    grimeAmount: 0.28,
    aoStrength: 0.85,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.wetAsphalt, materials.road, maxAnisotropy, {
    normalStrength: 2.8,
    roughMin: 0.12,
    roughMax: 0.72,
    grimeAmount: 0.2,
    aoStrength: 0.75,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.woodFence, materials.fence, maxAnisotropy, {
    normalStrength: 3.9,
    roughMin: 0.55,
    roughMax: 0.95,
    grimeAmount: 0.32,
    aoStrength: 0.9,
  }).catch(() => {});

  void loadImageWithDerivedPBR(ASSET_PATHS.lawnGrass, materials.lawn, maxAnisotropy, {
    normalStrength: 3.2,
    roughMin: 0.38,
    roughMax: 0.94,
    grimeAmount: 0.25,
    aoStrength: 0.85,
  }).catch(() => {});
}

export interface LivePbrBundle {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  attach: (mat: THREE.MeshStandardMaterial, useRoughnessMap?: boolean) => void;
}

function createLivePhotoPbrBundle(
  fallbackCanvas: HTMLCanvasElement,
  photoUrl: string,
  opts: {
    normalStrength: number;
    roughMin: number;
    roughMax: number;
    grimeAmount?: number;
    aoStrength?: number;
    repeat?: [number, number];
    maxAnisotropy?: number;
  }
): LivePbrBundle {
  const aniso = opts.maxAnisotropy ?? 4;
  const rep = opts.repeat ?? [1, 1];
  const initial = buildSobelPbrTextures(fallbackCanvas, aniso, {
    normalStrength: opts.normalStrength,
    roughMin: opts.roughMin,
    roughMax: opts.roughMax,
    aoStrength: opts.aoStrength ?? 0.65,
  });
  initial.map.repeat.set(rep[0], rep[1]);
  initial.normalMap.repeat.set(rep[0], rep[1]);
  initial.roughnessMap.repeat.set(rep[0], rep[1]);
  initial.aoMap.repeat.set(rep[0], rep[1]);

  const subscribers: Array<{
    mat: THREE.MeshStandardMaterial;
    useRoughnessMap: boolean;
  }> = [];

  const bundle: LivePbrBundle = {
    map: initial.map,
    normalMap: initial.normalMap,
    roughnessMap: initial.roughnessMap,
    aoMap: initial.aoMap,
    attach(mat: THREE.MeshStandardMaterial, useRoughnessMap = true) {
      mat.map = bundle.map;
      mat.normalMap = bundle.normalMap;
      if (useRoughnessMap) {
        mat.roughnessMap = bundle.roughnessMap;
        mat.roughness = 1.0;
      }
      mat.needsUpdate = true;
      subscribers.push({ mat, useRoughnessMap });
    },
  };

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 1024;
      const albedoCanvas = document.createElement('canvas');
      albedoCanvas.width = size;
      albedoCanvas.height = size;
      const ctx = albedoCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, size, size);
      enhanceHorrorAlbedo(albedoCanvas, opts.grimeAmount ?? 0.14);

      const pbr = buildSobelPbrTextures(albedoCanvas, aniso, {
        normalStrength: opts.normalStrength,
        roughMin: opts.roughMin,
        roughMax: opts.roughMax,
        aoStrength: opts.aoStrength ?? 0.72,
      });
      pbr.map.repeat.set(rep[0], rep[1]);
      pbr.normalMap.repeat.set(rep[0], rep[1]);
      pbr.roughnessMap.repeat.set(rep[0], rep[1]);
      pbr.aoMap.repeat.set(rep[0], rep[1]);

      bundle.map = pbr.map;
      bundle.normalMap = pbr.normalMap;
      bundle.roughnessMap = pbr.roughnessMap;
      bundle.aoMap = pbr.aoMap;

      for (const sub of subscribers) {
        sub.mat.map = pbr.map;
        sub.mat.normalMap = pbr.normalMap;
        if (sub.useRoughnessMap) {
          sub.mat.roughnessMap = pbr.roughnessMap;
          sub.mat.roughness = 1.0;
        }
        sub.mat.needsUpdate = true;
      }
    };
    img.src = photoUrl;
  }

  return bundle;
}

export function createRoosterSurfaceMaps(): {
  feathers: LivePbrBundle;
  combMap: THREE.CanvasTexture;
  combNormal: THREE.CanvasTexture;
  keratinMap: THREE.CanvasTexture;
  keratinNormal: THREE.CanvasTexture;
} {
  const rand = seededRand(771994);
  const fCanvas = document.createElement('canvas');
  fCanvas.width = 256;
  fCanvas.height = 256;
  const fctx = fCanvas.getContext('2d', { willReadFrequently: true })!;
  fctx.fillStyle = '#9c4b1e';
  fctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    fctx.fillStyle =
      i % 4 === 0
        ? 'rgba(20, 66, 54, 0.55)'
        : i % 2 === 0
          ? 'rgba(218, 128, 42, 0.45)'
          : 'rgba(72, 28, 12, 0.5)';
    fctx.beginPath();
    fctx.ellipse(
      rand() * 256,
      rand() * 256,
      10 + rand() * 16,
      24 + rand() * 28,
      (rand() - 0.5) * 0.35,
      0,
      Math.PI * 2
    );
    fctx.fill();
  }

  // Fleshy pebbled crimson comb & wattle PBR
  const cCanvas = document.createElement('canvas');
  cCanvas.width = 128;
  cCanvas.height = 128;
  const cctx = cCanvas.getContext('2d', { willReadFrequently: true })!;
  cctx.fillStyle = '#c81e1e';
  cctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 240; i++) {
    cctx.fillStyle = i % 2 === 0 ? 'rgba(255, 86, 74, 0.35)' : 'rgba(92, 10, 10, 0.42)';
    cctx.beginPath();
    cctx.arc(rand() * 128, rand() * 128, 1.8 + rand() * 3.2, 0, Math.PI * 2);
    cctx.fill();
  }
  const cPbr = buildSobelPbrTextures(cCanvas, 4, {
    normalStrength: 2.6,
    roughMin: 0.36,
    roughMax: 0.65,
    aoStrength: 0.45,
  });

  // Scaled keratin beak & legs PBR
  const kCanvas = document.createElement('canvas');
  kCanvas.width = 128;
  kCanvas.height = 128;
  const kctx = kCanvas.getContext('2d', { willReadFrequently: true })!;
  kctx.fillStyle = '#dfa838';
  kctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    kctx.fillStyle = y % 16 === 0 ? 'rgba(130, 82, 18, 0.45)' : 'rgba(255, 224, 130, 0.28)';
    kctx.fillRect(0, y, 128, 3);
  }
  const kPbr = buildSobelPbrTextures(kCanvas, 4, {
    normalStrength: 2.2,
    roughMin: 0.32,
    roughMax: 0.62,
    aoStrength: 0.4,
  });

  return {
    feathers: createLivePhotoPbrBundle(fCanvas, ASSET_PATHS.roosterFeathers, {
      normalStrength: 3.1,
      roughMin: 0.34,
      roughMax: 0.78,
      grimeAmount: 0.08,
      aoStrength: 0.65,
      repeat: [1.5, 1.5],
      maxAnisotropy: 8,
    }),
    combMap: cPbr.map,
    combNormal: cPbr.normalMap,
    keratinMap: kPbr.map,
    keratinNormal: kPbr.normalMap,
  };
}

export function createEnemySurfaceMaps(): {
  skin: LivePbrBundle;
  wool: LivePbrBundle;
} {
  const rand = seededRand(991994);
  // Fallback pale frostbitten skin canvas before 1024px photo decodes
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 256;
  pCanvas.height = 256;
  const pctx = pCanvas.getContext('2d', { willReadFrequently: true })!;
  pctx.fillStyle = '#c5bdb0';
  pctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 55; i++) {
    pctx.fillStyle = i % 2 === 0 ? 'rgba(66, 78, 92, 0.22)' : 'rgba(54, 42, 34, 0.2)';
    pctx.beginPath();
    pctx.arc(rand() * 256, rand() * 256, 8 + rand() * 28, 0, Math.PI * 2);
    pctx.fill();
  }
  pctx.strokeStyle = 'rgba(42, 54, 72, 0.48)';
  pctx.lineWidth = 1.4;
  for (let c = 0; c < 14; c++) {
    let cx = rand() * 256;
    let cy = rand() * 256;
    pctx.beginPath();
    pctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (rand() - 0.5) * 32;
      cy += rand() * 26;
      pctx.lineTo(cx, cy);
    }
    pctx.stroke();
  }
  enhanceHorrorAlbedo(pCanvas, 0.24);

  // Fallback heavy decayed Soviet wool coat canvas
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rctx = rCanvas.getContext('2d', { willReadFrequently: true })!;
  rctx.fillStyle = '#25282e';
  rctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    rctx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.34)' : 'rgba(92,96,106,0.16)';
    rctx.fillRect(0, y, 256, 1.5);
  }
  for (let s = 0; s < 40; s++) {
    rctx.fillStyle = 'rgba(48, 34, 24, 0.34)';
    rctx.beginPath();
    rctx.arc(rand() * 256, rand() * 256, 8 + rand() * 24, 0, Math.PI * 2);
    rctx.fill();
  }

  return {
    skin: createLivePhotoPbrBundle(pCanvas, ASSET_PATHS.horrorSkin, {
      normalStrength: 3.3,
      roughMin: 0.42,
      roughMax: 0.84,
      grimeAmount: 0.12,
      aoStrength: 0.72,
      repeat: [1, 1],
      maxAnisotropy: 8,
    }),
    wool: createLivePhotoPbrBundle(rCanvas, ASSET_PATHS.decayedWool, {
      normalStrength: 3.5,
      roughMin: 0.74,
      roughMax: 0.98,
      grimeAmount: 0.16,
      aoStrength: 0.82,
      repeat: [2, 2],
      maxAnisotropy: 8,
    }),
  };
}

export function createWeaponSurfaceMaps(): {
  metal: LivePbrBundle;
  woodMap: THREE.CanvasTexture;
  woodNormal: THREE.CanvasTexture;
} {
  const rand = seededRand(199400);
  const size = 256;

  // Fallback weathered Soviet blued steel before 1024px photo decodes
  const mCanvas = document.createElement('canvas');
  mCanvas.width = size;
  mCanvas.height = size;
  const mctx = mCanvas.getContext('2d', { willReadFrequently: true })!;
  mctx.fillStyle = '#3b414a';
  mctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const shade = 52 + Math.round((rand() - 0.5) * 18);
    mctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
    mctx.fillRect(0, y, size, 1);
  }
  for (let s = 0; s < 140; s++) {
    mctx.fillStyle =
      rand() > 0.35 ? 'rgba(182, 190, 202, 0.38)' : 'rgba(16, 18, 20, 0.45)';
    mctx.fillRect(rand() * size, rand() * size, 12 + rand() * 52, 1);
  }
  enhanceHorrorAlbedo(mCanvas, 0.2);

  // Rich varnished Soviet walnut wood grain with scratches & oil darkening
  const wCanvas = document.createElement('canvas');
  wCanvas.width = size;
  wCanvas.height = size;
  const wctx = wCanvas.getContext('2d', { willReadFrequently: true })!;
  wctx.fillStyle = '#63381f';
  wctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 150; i++) {
    const y = rand() * size;
    const h = 1 + rand() * 3.5;
    wctx.fillStyle =
      i % 2 === 0 ? 'rgba(28, 12, 5, 0.52)' : 'rgba(138, 82, 42, 0.32)';
    wctx.fillRect(0, y, size, h);
  }
  enhanceHorrorAlbedo(wCanvas, 0.26);

  const wPbr = buildSobelPbrTextures(wCanvas, 8, {
    normalStrength: 2.8,
    roughMin: 0.46,
    roughMax: 0.84,
    aoStrength: 0.48,
  });

  return {
    metal: createLivePhotoPbrBundle(mCanvas, ASSET_PATHS.gunmetalWorn, {
      normalStrength: 2.5,
      roughMin: 0.22,
      roughMax: 0.68,
      grimeAmount: 0.1,
      aoStrength: 0.5,
      repeat: [2, 2],
      maxAnisotropy: 8,
    }),
    woodMap: wPbr.map,
    woodNormal: wPbr.normalMap,
  };
}

export function applyCustomTextureToMaterial(
  materials: WorldMaterialSet,
  spec: CustomTextureSpec,
  maxAnisotropy: number
): void {
  const pbr = createProceduralTexture(spec, maxAnisotropy);
  const mat = materials[spec.slot];
  mat.map = pbr.map;
  mat.bumpMap = null;
  mat.normalMap = pbr.normalMap;
  mat.roughnessMap = pbr.roughnessMap;
  mat.aoMap = pbr.aoMap;
  mat.roughness = 1.0;
  mat.needsUpdate = true;
}

export function applyImageUrlToMaterial(
  materials: WorldMaterialSet,
  slot: TextureSlot,
  imageUrl: string,
  maxAnisotropy: number
): Promise<void> {
  return loadImageWithDerivedPBR(imageUrl, materials[slot], maxAnisotropy, {
    normalStrength: slot === 'road' ? 2.6 : 3.5,
    roughMin: slot === 'road' ? 0.16 : 0.55,
    roughMax: 0.95,
    grimeAmount: 0.22,
    aoStrength: 0.82,
  });
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    6,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/**
 * Tactile leather gloves & weathered 1994 dark olive jacket cuff PBR textures
 * for AAA first-person weapon viewmodel hands.
 */
export function createFirstPersonHandMaterials(maxAnisotropy = 8): {
  leatherGlove: THREE.MeshPhysicalMaterial;
  jacketSleeve: THREE.MeshPhysicalMaterial;
  skinKnuckle: THREE.MeshPhysicalMaterial;
} {
  const rand = seededRand(1994555);

  // Scuffed matte black-brown tactical leather glove texture
  const lCanvas = document.createElement('canvas');
  lCanvas.width = 256;
  lCanvas.height = 256;
  const lctx = lCanvas.getContext('2d', { willReadFrequently: true })!;
  lctx.fillStyle = '#181614';
  lctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    lctx.fillStyle =
      i % 2 === 0 ? 'rgba(46, 40, 36, 0.24)' : 'rgba(8, 7, 6, 0.34)';
    lctx.beginPath();
    lctx.arc(rand() * 256, rand() * 256, 1.5 + rand() * 4.5, 0, Math.PI * 2);
    lctx.fill();
  }
  lctx.strokeStyle = 'rgba(72, 62, 54, 0.25)';
  lctx.setLineDash([5, 5]);
  lctx.lineWidth = 2;
  lctx.strokeRect(18, 18, 220, 220);
  const lPbr = buildSobelPbrTextures(lCanvas, maxAnisotropy, {
    normalStrength: 1.6,
    roughMin: 0.42,
    roughMax: 0.78,
    aoStrength: 0.65,
  });

  // Dark weathered Soviet autumn storm-parka sleeve (subtle matte canvas weave)
  const jCanvas = document.createElement('canvas');
  jCanvas.width = 256;
  jCanvas.height = 256;
  const jctx = jCanvas.getContext('2d', { willReadFrequently: true })!;
  jctx.fillStyle = '#1d221e';
  jctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    jctx.fillStyle = y % 8 === 0 ? 'rgba(10, 13, 11, 0.26)' : 'rgba(42, 48, 44, 0.14)';
    jctx.fillRect(0, y, 256, 2);
  }
  for (let x = 0; x < 256; x += 4) {
    jctx.fillStyle = x % 8 === 0 ? 'rgba(10, 13, 11, 0.2)' : 'rgba(38, 44, 40, 0.1)';
    jctx.fillRect(x, 0, 2, 256);
  }
  const jPbr = buildSobelPbrTextures(jCanvas, maxAnisotropy, {
    normalStrength: 1.4,
    roughMin: 0.84,
    roughMax: 0.98,
    aoStrength: 0.72,
  });

  // Subtle muted leather knuckle accent
  const sCanvas = document.createElement('canvas');
  sCanvas.width = 128;
  sCanvas.height = 128;
  const sctx = sCanvas.getContext('2d', { willReadFrequently: true })!;
  sctx.fillStyle = '#2a2420';
  sctx.fillRect(0, 0, 128, 128);
  const sPbr = buildSobelPbrTextures(sCanvas, maxAnisotropy, {
    normalStrength: 1.2,
    roughMin: 0.48,
    roughMax: 0.76,
    aoStrength: 0.5,
  });

  return {
    leatherGlove: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: lPbr.map,
      normalMap: lPbr.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: lPbr.roughnessMap,
      roughness: 1.0,
      metalness: 0.06,
      clearcoat: 0.18,
      clearcoatRoughness: 0.5,
      sheen: 0.25,
      sheenRoughness: 0.75,
    }),
    jacketSleeve: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: jPbr.map,
      normalMap: jPbr.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: jPbr.roughnessMap,
      roughness: 1.0,
      metalness: 0.03,
      sheen: 0.45,
      sheenColor: new THREE.Color(0x2e3630),
      sheenRoughness: 0.86,
    }),
    skinKnuckle: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: sPbr.map,
      normalMap: sPbr.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: sPbr.roughnessMap,
      roughness: 1.0,
      metalness: 0.05,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
    }),
  };
}

