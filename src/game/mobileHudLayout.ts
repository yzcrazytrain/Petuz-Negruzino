export type MobileHudControlId =
  | 'joystick'
  | 'fire'
  | 'reload'
  | 'jump'
  | 'interact'
  | 'pat'
  | 'flashlight'
  | 'scope'
  | 'weapons';

export interface MobileHudControlPos {
  /** Horizontal center position as percentage of viewport width (6..94). */
  xPct: number;
  /** Vertical center position as percentage of viewport height (14..96). */
  yPct: number;
  /** Uniform scale multiplier (0.75..1.45). */
  scale: number;
}

export type MobileHudOrientationLayout = Record<
  MobileHudControlId,
  MobileHudControlPos
>;

export interface MobileHudLayoutState {
  portrait: MobileHudOrientationLayout;
  landscape: MobileHudOrientationLayout;
}

export const MOBILE_HUD_STORAGE_KEY = 'negruzino_mobile_hud_layout_v1';

export const MOBILE_HUD_CONTROL_IDS: readonly MobileHudControlId[] = [
  'joystick',
  'fire',
  'reload',
  'jump',
  'interact',
  'pat',
  'flashlight',
  'scope',
  'weapons',
];

export const HUD_SCALE_MIN = 0.75;
export const HUD_SCALE_MAX = 1.45;

export function clampHudControlPos(
  pos: Partial<MobileHudControlPos>,
  fallback: MobileHudControlPos,
  controlId?: MobileHudControlId
): MobileHudControlPos {
  const minX = controlId === 'weapons' ? 24 : 7;
  const maxX = controlId === 'weapons' ? 76 : 93;
  const minY = 16;
  const maxY = 96;

  const rawX = typeof pos.xPct === 'number' && Number.isFinite(pos.xPct) ? pos.xPct : fallback.xPct;
  const rawY = typeof pos.yPct === 'number' && Number.isFinite(pos.yPct) ? pos.yPct : fallback.yPct;
  const rawScale =
    typeof pos.scale === 'number' && Number.isFinite(pos.scale) ? pos.scale : fallback.scale;

  return {
    xPct: Math.round(Math.max(minX, Math.min(maxX, rawX)) * 10) / 10,
    yPct: Math.round(Math.max(minY, Math.min(maxY, rawY)) * 10) / 10,
    scale: Math.round(Math.max(HUD_SCALE_MIN, Math.min(HUD_SCALE_MAX, rawScale)) * 100) / 100,
  };
}

/**
 * Default non-overlapping layouts tuned for both 390x844 portrait phones and
 * 844x390 landscape phones. Notice Fire (y=80.5%) & Joystick (y=80.5%) sit
 * cleanly above the bottom Weapons bar (y=95.5%) with generous thumb clearance.
 */
export function getDefaultMobileHudLayout(): MobileHudLayoutState {
  return {
    portrait: {
      weapons: { xPct: 50, yPct: 95.5, scale: 0.92 },
      joystick: { xPct: 19, yPct: 80.5, scale: 0.94 },
      fire: { xPct: 83, yPct: 80.5, scale: 1.0 },
      scope: { xPct: 63, yPct: 81.5, scale: 0.92 },
      pat: { xPct: 46, yPct: 68.0, scale: 0.94 },
      flashlight: { xPct: 60, yPct: 68.0, scale: 0.94 },
      jump: { xPct: 74, yPct: 68.0, scale: 0.94 },
      reload: { xPct: 88, yPct: 68.0, scale: 0.94 },
      interact: { xPct: 80, yPct: 57.5, scale: 1.0 },
    },
    landscape: {
      weapons: { xPct: 50, yPct: 92.0, scale: 0.95 },
      joystick: { xPct: 12, yPct: 74.0, scale: 0.96 },
      fire: { xPct: 88, yPct: 75.5, scale: 1.0 },
      scope: { xPct: 75, yPct: 77.0, scale: 0.94 },
      pat: { xPct: 64, yPct: 54.0, scale: 0.94 },
      flashlight: { xPct: 73, yPct: 54.0, scale: 0.94 },
      jump: { xPct: 82, yPct: 54.0, scale: 0.94 },
      reload: { xPct: 91, yPct: 54.0, scale: 0.94 },
      interact: { xPct: 84, yPct: 37.5, scale: 1.0 },
    },
  };
}

function mergeOrientationLayout(
  raw: unknown,
  defaults: MobileHudOrientationLayout
): MobileHudOrientationLayout {
  const out = {} as MobileHudOrientationLayout;
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const id of MOBILE_HUD_CONTROL_IDS) {
    const entry = obj[id];
    const candidate =
      entry && typeof entry === 'object' ? (entry as Partial<MobileHudControlPos>) : {};
    out[id] = clampHudControlPos(candidate, defaults[id], id);
  }
  return out;
}

export function loadMobileHudLayout(): MobileHudLayoutState {
  const defaults = getDefaultMobileHudLayout();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(MOBILE_HUD_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<MobileHudLayoutState>;
    return {
      portrait: mergeOrientationLayout(parsed.portrait, defaults.portrait),
      landscape: mergeOrientationLayout(parsed.landscape, defaults.landscape),
    };
  } catch {
    return defaults;
  }
}

export function saveMobileHudLayout(layout: MobileHudLayoutState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOBILE_HUD_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetMobileHudLayout(
  orientation?: 'portrait' | 'landscape',
  current?: MobileHudLayoutState
): MobileHudLayoutState {
  const defaults = getDefaultMobileHudLayout();
  const next: MobileHudLayoutState =
    orientation && current
      ? {
          portrait:
            orientation === 'portrait' ? defaults.portrait : { ...current.portrait },
          landscape:
            orientation === 'landscape' ? defaults.landscape : { ...current.landscape },
        }
      : defaults;
  saveMobileHudLayout(next);
  return next;
}
