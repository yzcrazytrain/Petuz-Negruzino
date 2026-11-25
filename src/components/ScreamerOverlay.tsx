import type { ScreamerIntensity, ScreamerKind } from '../game/types';

interface ScreamerOverlayProps {
  active: boolean;
  progress: number;
  kind: ScreamerKind;
  caption: string;
  intensity: ScreamerIntensity;
}

export function ScreamerOverlay({
  active,
  progress,
  kind,
  caption,
  intensity,
}: ScreamerOverlayProps) {
  if (!active || progress <= 0) return null;

  const isReduced = intensity === 'reduced';
  // progress counts down 1 -> 0; elapsed goes 0 -> 1 for a fast lunge into camera
  const elapsed = Math.max(0, Math.min(1, 1 - progress));
  const lungeScale = isReduced
    ? 0.92 + elapsed * 0.16
    : 0.78 + Math.pow(elapsed, 0.55) * 0.68;

  const masterOpacity = isReduced
    ? Math.min(0.62, progress * 0.95)
    : Math.min(0.98, Math.pow(progress, 0.45) * 1.15);

  const flashBurst = !isReduced && elapsed < 0.16 ? 0.52 * (1 - elapsed / 0.16) : 0;

  const accentColor =
    kind === 'watchman'
      ? '#ff9d3b'
      : kind === 'hollow'
        ? '#e5d4cf'
        : kind === 'fence'
          ? '#e03535'
          : '#d83838';

  const glowRgba =
    kind === 'watchman'
      ? 'rgba(255, 142, 42, 0.42)'
      : kind === 'hollow'
        ? 'rgba(218, 185, 185, 0.36)'
        : 'rgba(214, 38, 38, 0.46)';

  const rgbOffset = isReduced ? 2 : Math.round(5 + Math.sin(elapsed * 42) * 5);

  return (
    <div
      data-testid="screamer-overlay"
      aria-live="assertive"
      className={`fixed inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden bg-[#050204] ${
        isReduced ? '' : 'animate-screamer-shutter'
      }`}
      style={{ opacity: masterOpacity }}
    >
      {/* Radial crimson/sodium abyss backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 46%, ${glowRgba} 0%, rgba(14, 4, 7, 0.94) 56%, rgba(3, 1, 3, 0.99) 100%)`,
        }}
      />

      {/* Horizontal analog VHS tracking tear bands */}
      <div
        className="absolute inset-0 opacity-65"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 6px)',
          transform: `translateY(${Math.round(Math.sin(elapsed * 31) * 10)}px)`,
        }}
      />

      {/* Chromatic tear slices */}
      {!isReduced && (
        <>
          <div
            className="absolute left-0 right-0 h-10 bg-[#ff2a2a]/20 mix-blend-screen"
            style={{
              top: `${22 + Math.round(elapsed * 34)}%`,
              transform: `translateX(${rgbOffset * 2}px)`,
            }}
          />
          <div
            className="absolute left-0 right-0 h-6 bg-[#4de1ff]/15 mix-blend-screen"
            style={{
              top: `${62 - Math.round(elapsed * 24)}%`,
              transform: `translateX(${-rgbOffset * 2.5}px)`,
            }}
          />
        </>
      )}

      {/* Lunging psychological horror silhouette */}
      <div
        className={`relative w-[min(640px,92vw)] h-[min(640px,84vh)] flex items-center justify-center ${
          isReduced ? '' : 'animate-screamer'
        }`}
        style={{
          transform: `scale(${lungeScale.toFixed(3)})`,
          filter: `drop-shadow(${rgbOffset}px 0 18px rgba(220, 38, 38, 0.55)) drop-shadow(${-rgbOffset}px 0 14px rgba(80, 210, 255, 0.35))`,
        }}
      >
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="eyeCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff8e8" />
              <stop offset="45%" stopColor={accentColor} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <radialGradient id="voidFace" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#1b1419" />
              <stop offset="70%" stopColor="#080508" />
              <stop offset="100%" stopColor="#020102" />
            </radialGradient>
          </defs>

          {kind === 'watchman' && (
            <g>
              {/* Towering iron collar & lantern ribs */}
              <path
                d="M72 390 L98 220 L132 165 L268 165 L302 220 L328 390 Z"
                fill="#070507"
                stroke="#362218"
                strokeWidth="3"
              />
              {/* Iron crown spikes */}
              <path
                d="M124 128 L136 52 L168 106 L200 32 L232 106 L264 52 L276 128 Z"
                fill="#110b0b"
                stroke="#6b3e1f"
                strokeWidth="2.5"
              />
              {/* Elongated iron mask */}
              <path
                d="M126 122 C126 84 274 84 274 122 L262 252 C248 296 152 296 138 252 Z"
                fill="url(#voidFace)"
                stroke="#5b341b"
                strokeWidth="3"
              />
              {/* Burning sodium furnace eye slits */}
              <ellipse cx="164" cy="176" rx="28" ry="13" fill="url(#eyeCore)" />
              <ellipse cx="236" cy="176" rx="28" ry="13" fill="url(#eyeCore)" />
              <rect x="148" y="173" width="32" height="5" rx="2" fill="#fff4d2" />
              <rect x="220" y="173" width="32" height="5" rx="2" fill="#fff4d2" />
              {/* Vertical furnace grate mouth */}
              <path
                d="M160 226 Q200 212 240 226 L232 266 Q200 278 168 266 Z"
                fill="#290c05"
                stroke="#ff9d3b"
                strokeWidth="2"
              />
              <line x1="180" y1="221" x2="180" y2="270" stroke="#080507" strokeWidth="5" />
              <line x1="200" y1="219" x2="200" y2="272" stroke="#080507" strokeWidth="5" />
              <line x1="220" y1="221" x2="220" y2="270" stroke="#080507" strokeWidth="5" />
            </g>
          )}

          {kind === 'hollow' && (
            <g>
              {/* Acoustic shriek rings */}
              <circle
                cx="200"
                cy="205"
                r={125 + elapsed * 42}
                fill="none"
                stroke="#d63b3b"
                strokeOpacity="0.45"
                strokeWidth="3"
              />
              <circle
                cx="200"
                cy="205"
                r={88 + elapsed * 32}
                fill="none"
                stroke="#f5e6e0"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              {/* Shroud & gaunt elongated bone skull */}
              <path
                d="M84 395 C95 255 110 130 200 64 C290 130 305 255 316 395 Z"
                fill="#070508"
              />
              <path
                d="M132 138 C132 76 268 76 268 138 C272 222 246 318 200 326 C154 318 128 222 132 138 Z"
                fill="#d8ccc6"
                fillOpacity="0.92"
              />
              {/* Sunken eye sockets */}
              <ellipse cx="166" cy="166" rx="22" ry="28" fill="#060306" />
              <ellipse cx="234" cy="166" rx="22" ry="28" fill="#060306" />
              <circle cx="166" cy="166" r="8" fill="url(#eyeCore)" />
              <circle cx="234" cy="166" r="8" fill="url(#eyeCore)" />
              {/* Gaping screaming vertical maw */}
              <ellipse cx="200" cy="256" rx="34" ry="56" fill="#040104" />
              <path
                d="M174 226 L184 242 L194 224 L204 242 L214 224 L226 238"
                fill="none"
                stroke="#cbbdb5"
                strokeWidth="3"
              />
            </g>
          )}

          {kind === 'fence' && (
            <g>
              {/* Broken wooden picket silhouette in foreground */}
              <path
                d="M18 395 L28 190 L50 156 L68 195 L64 395 M332 395 L328 188 L352 152 L374 192 L382 395"
                fill="#110b08"
                stroke="#2c1b12"
                strokeWidth="2"
              />
              {/* Feral lunging crawler skull & clawed hands */}
              <path
                d="M116 146 C126 88 274 88 284 146 L296 232 C276 292 124 292 104 232 Z"
                fill="url(#voidFace)"
                stroke="#4a1618"
                strokeWidth="3"
              />
              {/* Dilated predator eyes */}
              <ellipse cx="158" cy="176" rx="28" ry="18" fill="url(#eyeCore)" />
              <ellipse cx="242" cy="176" rx="28" ry="18" fill="url(#eyeCore)" />
              <circle cx="158" cy="176" r="5" fill="#180202" />
              <circle cx="242" cy="176" r="5" fill="#180202" />
              {/* Jagged grin */}
              <path
                d="M136 232 Q200 264 264 232 Q200 296 136 232 Z"
                fill="#030102"
                stroke="#8c2323"
                strokeWidth="2.5"
              />
              <path
                d="M148 238 L160 256 L172 242 L186 262 L200 244 L214 262 L228 242 L240 256 L252 238"
                fill="none"
                stroke="#e8ded5"
                strokeWidth="3"
              />
            </g>
          )}

          {(kind === 'fog' || kind === 'preview') && (
            <g>
              {/* Shadowy apparition emerging from night mist */}
              <path
                d="M66 398 C84 252 108 92 200 72 C292 92 316 252 334 398 Z"
                fill="url(#voidFace)"
              />
              {/* Unsettling asymmetric dilated eyes */}
              <ellipse cx="158" cy="172" rx="34" ry="22" fill="url(#eyeCore)" />
              <ellipse cx="242" cy="168" rx="30" ry="20" fill="url(#eyeCore)" />
              <circle cx="158" cy="172" r="7" fill="#090204" />
              <circle cx="242" cy="168" r="6" fill="#090204" />
              {/* Fractured static mouth */}
              <path
                d="M144 244 L172 236 L200 254 L228 236 L256 248 L244 274 L200 266 L156 274 Z"
                fill="#020102"
                stroke="#c93b3b"
                strokeWidth="2.2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Initial camera shutter flash */}
      {flashBurst > 0.01 && (
        <div
          className="absolute inset-0 bg-[#fff3e6]"
          style={{ opacity: flashBurst }}
        />
      )}

      {/* Atmospheric horror caption */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[min(680px,92vw)] text-center px-4">
        <div className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-[0.18em] text-[#ece7dc] uppercase hud-text-shadow">
          {caption}
        </div>
      </div>
    </div>
  );
}
