export interface DeviceProfileInput {
  width: number;
  height: number;
  coarsePointer: boolean;
  maxTouchPoints: number;
  forceTouchQuery?: boolean;
  forceDesktopQuery?: boolean;
}

export interface DeviceProfile {
  isTouch: boolean;
  isPortrait: boolean;
  aspect: number;
  recommendedFov: number;
  maxPixelRatio: number;
}

/**
 * Pure adaptive device & viewport profile resolver:
 * - Smartphones / tablets (coarse pointer or touch points with <= 1280px longest side) get touch HUD + mobile perf caps
 * - Desktop PCs get zero on-screen touch controls, sharp pixel ratio, and standard 72° vertical FOV
 * - Narrow or portrait aspects automatically widen vertical FOV so corridors & monsters stay readable
 */
export function detectDeviceProfile(inp: DeviceProfileInput): DeviceProfile {
  const safeW = Math.max(240, inp.width);
  const safeH = Math.max(240, inp.height);
  const aspect = safeW / safeH;
  const isPortrait = safeH > safeW;
  const minSide = Math.min(safeW, safeH);
  const maxSide = Math.max(safeW, safeH);

  let isTouch = false;
  if (inp.forceTouchQuery) {
    isTouch = true;
  } else if (inp.forceDesktopQuery) {
    isTouch = false;
  } else {
    isTouch =
      (inp.coarsePointer && maxSide <= 1366) ||
      (inp.maxTouchPoints > 0 && minSide <= 900 && maxSide <= 1366);
  }

  let recommendedFov = 72;
  if (aspect < 1.0) {
    recommendedFov = 84;
  } else if (aspect < 1.45) {
    recommendedFov = 78;
  } else if (aspect > 2.05) {
    recommendedFov = 68;
  } else if (isTouch) {
    recommendedFov = 75;
  }

  const maxPixelRatio = isTouch ? 1.25 : 2;

  return {
    isTouch,
    isPortrait,
    aspect,
    recommendedFov,
    maxPixelRatio,
  };
}

export function readBrowserDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      isTouch: false,
      isPortrait: false,
      aspect: 16 / 9,
      recommendedFov: 72,
      maxPixelRatio: 2,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const forceTouchQuery = params.get('touch') === '1';
  const forceDesktopQuery = params.get('touch') === '0';
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches);
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  return detectDeviceProfile({
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer,
    maxTouchPoints,
    forceTouchQuery,
    forceDesktopQuery,
  });
}

/**
 * Safely attempts to enter fullscreen + lock landscape orientation on mobile gestures.
 * Never throws on browsers that restrict orientation lock (e.g. iOS Safari or desktop).
 */
export async function requestLandscapeMode(): Promise<boolean> {
  try {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    if (!document.fullscreenElement) {
      if (typeof docEl.requestFullscreen === 'function') {
        await docEl.requestFullscreen().catch(() => {});
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        await docEl.webkitRequestFullscreen().catch(() => {});
      }
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'landscape-primary') => Promise<void>;
    };
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape').catch(() => {});
      return true;
    }
  } catch {
    // Gracefully fall back to Rotate-to-Landscape overlay
  }
  return false;
}
