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
  // progress counts down 1 -> 0; elapsed goes 0 -> 1 for a violent lunge into the lens
  const elapsed = Math.max(0, Math.min(1, 1 - progress));

  // Sharp, unsettling 2-beat pitch-black strobe splice in full mode so the face
  // snaps out of total darkness rather than fading in predictably.
  const isBlackoutBeat =
    !isReduced &&
    ((elapsed > 0.055 && elapsed < 0.095) ||
      (elapsed > 0.23 && elapsed < 0.265) ||
      (elapsed > 0.52 && elapsed < 0.55));

  // Snap-zoom lunge with sudden micro-jerks toward camera
  const lungeCurve = Math.pow(elapsed, 0.36);
  const jerkPulse = isReduced ? 0 : Math.sin(elapsed * 58) * 0.055 * progress;
  const lungeScale = isReduced
    ? 0.92 + elapsed * 0.16
    : 0.62 + lungeCurve * 0.88 + jerkPulse;

  // Uncanny head snap tilt + twitch jitter
  const headTiltDeg = isReduced
    ? 0
    : Math.sin(elapsed * 29) * 6.5 + (elapsed > 0.26 && elapsed < 0.52 ? -9.5 : 4.2);
  const jitterX = isReduced ? 0 : Math.round(Math.sin(elapsed * 83) * 14 * progress);
  const jitterY = isReduced ? 0 : Math.round(Math.cos(elapsed * 71) * 10 * progress);

  const masterOpacity = isReduced
    ? Math.min(0.66, progress * 0.96)
    : Math.min(0.99, Math.pow(progress, 0.32) * 1.18);

  // Dramatic under-lit cold-white & blood-crimson strobe bursts
  const initialFlash =
    !isReduced && elapsed < 0.06
      ? 0.72 * (1 - elapsed / 0.06)
      : !isReduced && elapsed > 0.265 && elapsed < 0.31
        ? 0.44 * (1 - (elapsed - 0.265) / 0.045)
        : 0;

  const accentColor =
    kind === 'watchman'
      ? '#ff9d3b'
      : kind === 'hollow'
        ? '#e5d8d0'
        : kind === 'fence'
          ? '#d62828'
          : '#d12c2c';

  const underLightRgba =
    kind === 'watchman'
      ? 'rgba(255, 128, 34, 0.44)'
      : kind === 'hollow'
        ? 'rgba(225, 214, 214, 0.36)'
        : 'rgba(196, 22, 26, 0.52)';

  const rgbOffset = isReduced ? 2 : Math.round(7 + Math.sin(elapsed * 54) * 6);

  return (
    <div
      data-testid="screamer-overlay"
      aria-live="assertive"
      className={`fixed inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden bg-[#020103] ${
        isReduced ? '' : 'animate-screamer-shutter'
      }`}
      style={{ opacity: masterOpacity }}
    >
      {/* Dramatic horror under-lighting & crushed perimeter vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: isBlackoutBeat
            ? '#020102'
            : `radial-gradient(ellipse 68% 62% at 50% 56%, ${underLightRgba} 0%, rgba(18, 3, 5, 0.94) 52%, rgba(2, 1, 2, 1) 88%)`,
        }}
      />

      {/* Heavy VHS tracking distortion lines */}
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 2px, transparent 2px, transparent 5px)',
          transform: `translateY(${Math.round(Math.sin(elapsed * 43) * 14)}px)`,
        }}
      />

      {/* Violent chromatic tear slices */}
      {!isReduced && !isBlackoutBeat && (
        <>
          <div
            className="absolute left-0 right-0 h-12 bg-[#ff1e1e]/24 mix-blend-screen"
            style={{
              top: `${18 + Math.round(elapsed * 42)}%`,
              transform: `translateX(${rgbOffset * 2.5}px)`,
            }}
          />
          <div
            className="absolute left-0 right-0 h-7 bg-[#6ee7ff]/18 mix-blend-screen"
            style={{
              top: `${68 - Math.round(elapsed * 30)}%`,
              transform: `translateX(${-rgbOffset * 3}px)`,
            }}
          />
          <div
            className="absolute left-0 right-0 h-3 bg-[#fff0e0]/22 mix-blend-screen"
            style={{
              top: `${44 + Math.round(Math.sin(elapsed * 37) * 18)}%`,
              transform: `translateX(${rgbOffset * 4}px)`,
            }}
          />
        </>
      )}

      {/* High-contrast anatomical nightmare lunge */}
      {!isBlackoutBeat && (
        <div
          className={`relative w-[min(680px,96vw)] h-[min(680px,88vh)] flex items-center justify-center ${
            isReduced ? '' : 'animate-screamer'
          }`}
          style={{
            transform: `translate(${jitterX}px, ${jitterY}px) scale(${lungeScale.toFixed(3)}) rotate(${headTiltDeg.toFixed(1)}deg)`,
            filter: `contrast(${isReduced ? 1.08 : 1.28}) drop-shadow(${rgbOffset}px 0 18px rgba(215, 28, 28, 0.65)) drop-shadow(${-rgbOffset}px 0 14px rgba(120, 220, 255, 0.32))`,
          }}
        >
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="eyeCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fffdf6" />
                <stop offset="32%" stopColor={accentColor} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <radialGradient id="boneFace" cx="50%" cy="42%" r="56%">
                <stop offset="0%" stopColor="#d9cfc5" />
                <stop offset="48%" stopColor="#8d817b" />
                <stop offset="82%" stopColor="#261e20" />
                <stop offset="100%" stopColor="#050304" />
              </radialGradient>
              <radialGradient id="voidFace" cx="50%" cy="44%" r="56%">
                <stop offset="0%" stopColor="#2a1d20" />
                <stop offset="56%" stopColor="#0d080a" />
                <stop offset="100%" stopColor="#020102" />
              </radialGradient>
              <radialGradient id="furnaceMaw" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#ffbb55" />
                <stop offset="48%" stopColor="#9e2a0c" />
                <stop offset="100%" stopColor="#120402" />
              </radialGradient>
            </defs>

            {kind === 'watchman' && (
              <g>
                {/* Looming iron substation mantle & ribbed lantern shoulders */}
                <path
                  d="M42 400 L78 205 L124 148 L276 148 L322 205 L358 400 Z"
                  fill="#060406"
                  stroke="#452716"
                  strokeWidth="3.5"
                />
                {/* Jagged lightning-rod crown spikes */}
                <path
                  d="M116 122 L128 38 L164 100 L200 18 L236 100 L272 38 L284 122 Z"
                  fill="#120a09"
                  stroke="#8c4f24"
                  strokeWidth="2.8"
                />
                {/* Riveted iron furnace mask with heat fissures */}
                <path
                  d="M118 112 C118 68 282 68 282 112 L268 262 C252 316 148 316 132 262 Z"
                  fill="url(#voidFace)"
                  stroke="#6f3a1c"
                  strokeWidth="3.5"
                />
                <path
                  d="M150 116 L168 152 L158 208 M250 116 L232 152 L242 208 M200 94 L200 162"
                  fill="none"
                  stroke="#3b1d10"
                  strokeWidth="2.5"
                />
                {/* Blinding recessed sodium furnace eye slits */}
                <path d="M132 162 L188 170 L182 186 L136 182 Z" fill="#050202" />
                <path d="M268 162 L212 170 L218 186 L264 182 Z" fill="#050202" />
                <ellipse cx="160" cy="175" rx="28" ry="11" fill="url(#eyeCore)" />
                <ellipse cx="240" cy="175" rx="28" ry="11" fill="url(#eyeCore)" />
                <circle cx="162" cy="175" r="3.2" fill="#180502" />
                <circle cx="238" cy="175" r="3.2" fill="#180502" />
                {/* Screaming furnace grate maw with molten ribs */}
                <path
                  d="M148 220 Q200 202 252 220 L242 284 Q200 304 158 284 Z"
                  fill="url(#furnaceMaw)"
                  stroke="#ff9d3b"
                  strokeWidth="2.5"
                />
                <line x1="170" y1="214" x2="172" y2="290" stroke="#080405" strokeWidth="6" />
                <line x1="190" y1="210" x2="190" y2="295" stroke="#080405" strokeWidth="6" />
                <line x1="210" y1="210" x2="210" y2="295" stroke="#080405" strokeWidth="6" />
                <line x1="230" y1="214" x2="228" y2="290" stroke="#080405" strokeWidth="6" />
              </g>
            )}

            {kind === 'hollow' && (
              <g>
                {/* Shattering acoustic shockwave rings */}
                <circle
                  cx="200"
                  cy="205"
                  r={122 + elapsed * 58}
                  fill="none"
                  stroke="#d62828"
                  strokeOpacity="0.55"
                  strokeWidth="3.5"
                />
                <circle
                  cx="200"
                  cy="205"
                  r={84 + elapsed * 40}
                  fill="none"
                  stroke="#f5e6e0"
                  strokeOpacity="0.4"
                  strokeWidth="2"
                />
                {/* Gaunt ragged shroud & elongated cracked skull */}
                <path
                  d="M58 400 C74 242 96 108 200 44 C304 108 326 242 342 400 Z"
                  fill="#050306"
                />
                <path
                  d="M124 126 C124 58 276 58 276 126 C282 224 252 344 200 354 C148 344 118 224 124 126 Z"
                  fill="url(#boneFace)"
                />
                {/* Skull cracks & tear streaks */}
                <path
                  d="M158 92 L166 128 L154 148 M236 88 L228 122 L244 142 M162 192 L156 244 M238 192 L244 244"
                  fill="none"
                  stroke="#18080a"
                  strokeWidth="2.5"
                />
                {/* Deep hollow blackened eye sockets with tiny pinprick irises */}
                <ellipse cx="162" cy="158" rx="26" ry="34" fill="#030104" />
                <ellipse cx="238" cy="158" rx="26" ry="34" fill="#030104" />
                <circle cx="164" cy="160" r="8.5" fill="url(#eyeCore)" />
                <circle cx="236" cy="160" r="8.5" fill="url(#eyeCore)" />
                <circle cx="164" cy="160" r="2.6" fill="#060103" />
                <circle cx="236" cy="160" r="2.6" fill="#060103" />
                {/* Nasal cavity */}
                <path d="M194 198 L200 182 L206 198 L200 204 Z" fill="#090406" />
                {/* Dislocated vertical screaming abyssal jaw + jagged teeth */}
                <ellipse cx="200" cy="272" rx="42" ry="68" fill="#030103" stroke="#521619" strokeWidth="2.5" />
                <path
                  d="M164 232 L173 252 L182 228 L191 254 L200 226 L209 254 L218 228 L227 252 L236 232"
                  fill="none"
                  stroke="#e3d6cc"
                  strokeWidth="3.2"
                />
                <path
                  d="M170 314 L180 294 L190 318 L200 292 L210 318 L220 294 L230 314"
                  fill="none"
                  stroke="#bfb0a6"
                  strokeWidth="2.8"
                />
              </g>
            )}

            {kind === 'fence' && (
              <g>
                {/* Lunging clawed hands grabbing both sides of the viewport */}
                <path
                  d="M0 398 L22 250 L48 164 L62 174 L46 244 L76 156 L92 168 L68 258 L98 184 L112 196 L82 288 L72 398 Z"
                  fill="#0a0507"
                  stroke="#421417"
                  strokeWidth="2.5"
                />
                <path
                  d="M400 398 L378 250 L352 164 L338 174 L354 244 L324 156 L308 168 L332 258 L302 184 L288 196 L318 288 L328 398 Z"
                  fill="#0a0507"
                  stroke="#421417"
                  strokeWidth="2.5"
                />
                {/* Feral predator head plunging right into camera */}
                <path
                  d="M106 138 C116 74 284 74 294 138 L308 242 C286 314 114 314 92 242 Z"
                  fill="url(#voidFace)"
                  stroke="#5e171b"
                  strokeWidth="3.5"
                />
                {/* Asymmetric bloodshot predator eyes */}
                <ellipse cx="154" cy="170" rx="30" ry="20" fill="#050102" />
                <ellipse cx="246" cy="166" rx="30" ry="20" fill="#050102" />
                <ellipse cx="154" cy="170" rx="22" ry="13" fill="url(#eyeCore)" />
                <ellipse cx="246" cy="166" rx="22" ry="13" fill="url(#eyeCore)" />
                <circle cx="156" cy="170" r="4" fill="#0e0101" />
                <circle cx="244" cy="166" r="4" fill="#0e0101" />
                {/* Wide split-cheeked fang snarl */}
                <path
                  d="M122 228 Q200 266 278 228 Q200 322 122 228 Z"
                  fill="#030002"
                  stroke="#9c1c20"
                  strokeWidth="3"
                />
                <path
                  d="M134 236 L146 262 L158 240 L172 270 L186 244 L200 274 L214 244 L228 270 L242 240 L254 262 L266 236"
                  fill="none"
                  stroke="#efe6dd"
                  strokeWidth="3.4"
                />
                <path
                  d="M150 282 L164 262 L180 288 L200 266 L220 288 L236 262 L250 282"
                  fill="none"
                  stroke="#c8b8ae"
                  strokeWidth="2.8"
                />
              </g>
            )}

            {(kind === 'fog' || kind === 'preview') && (
              <g>
                {/* Shadow apparition lunging out of wet midnight fog */}
                <path
                  d="M46 400 C68 238 98 76 200 54 C302 76 332 238 354 400 Z"
                  fill="url(#voidFace)"
                />
                {/* Ghostly pallid face silhouette emerging from darkness */}
                <path
                  d="M132 132 C136 82 264 82 268 132 C272 214 248 298 200 314 C152 298 128 214 132 132 Z"
                  fill="url(#boneFace)"
                  fillOpacity="0.48"
                />
                {/* Uncanny wide unblinking eyes with tiny pinprick pupils */}
                <ellipse cx="156" cy="166" rx="34" ry="24" fill="#040103" />
                <ellipse cx="244" cy="160" rx="31" ry="22" fill="#040103" />
                <ellipse cx="156" cy="166" rx="22" ry="15" fill="url(#eyeCore)" />
                <ellipse cx="244" cy="160" rx="20" ry="14" fill="url(#eyeCore)" />
                <circle cx="158" cy="166" r="3.6" fill="#050102" />
                <circle cx="242" cy="160" r="3.4" fill="#050102" />
                {/* Fractured wide screaming mouth */}
                <path
                  d="M138 238 L168 228 L200 246 L232 228 L262 240 L248 292 L200 306 L152 292 Z"
                  fill="#020002"
                  stroke="#b82428"
                  strokeWidth="2.6"
                />
                <path
                  d="M150 242 L162 262 L176 238 L190 264 L204 240 L218 264 L232 238 L248 260"
                  fill="none"
                  stroke="#dfd3ca"
                  strokeWidth="3"
                />
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Sudden cold-white / crimson camera flash burst */}
      {initialFlash > 0.01 && (
        <div
          className="absolute inset-0 bg-[#fff2e8]"
          style={{ opacity: initialFlash }}
        />
      )}

      {/* Atmospheric horror caption */}
      {!isBlackoutBeat && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[min(680px,92vw)] text-center px-4">
          <div className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-[0.2em] text-[#ece7dc] uppercase hud-text-shadow">
            {caption}
          </div>
        </div>
      )}
    </div>
  );
}
