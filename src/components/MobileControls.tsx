import { useRef, useState, type PointerEvent } from 'react';
import {
  Crosshair,
  Flashlight,
  Hand,
  Heart,
  RotateCcw,
  Smartphone,
  ArrowUp,
} from 'lucide-react';
import { WEAPON_ORDER, WEAPONS } from '../game/constants';
import { requestLandscapeMode } from '../game/device';
import { TRANSLATIONS } from '../game/i18n';
import type { HudSnapshot, Language, WeaponId } from '../game/types';

interface MobileControlsProps {
  hud: HudSnapshot;
  onVirtualMove: (x: number, y: number, sprint: boolean) => void;
  onTouchLook: (dx: number, dy: number) => void;
  onVirtualFire: (active: boolean) => void;
  onJump: () => void;
  onReload: () => void;
  onInteract: () => void;
  onPatRooster: () => void;
  onToggleScope: () => void;
  onToggleFlashlight: () => void;
  onSelectWeapon: (id: WeaponId) => void;
}

const STICK_MAX_RADIUS = 40;

export function MobileControls({
  hud,
  onVirtualMove,
  onTouchLook,
  onVirtualFire,
  onJump,
  onReload,
  onInteract,
  onPatRooster,
  onToggleScope,
  onToggleFlashlight,
  onSelectWeapon,
}: MobileControlsProps) {
  const t = TRANSLATIONS[hud.language];

  // Left virtual thumbstick state
  const stickPointerIdRef = useRef<number | null>(null);
  const stickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [stickSprint, setStickSprint] = useState(false);

  // Right touch-drag look state
  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fire hold state
  const firePointerIdRef = useRef<number | null>(null);
  const [firing, setFiring] = useState(false);

  const handleStickDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerIdRef.current !== null) return;
    stickPointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    stickOriginRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateStick(e.clientX, e.clientY);
  };

  const handleStickMove = (e: PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  };

  const handleStickUp = (e: PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    stickPointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    setStickSprint(false);
    onVirtualMove(0, 0, false);
  };

  const updateStick = (clientX: number, clientY: number) => {
    const dx = clientX - stickOriginRef.current.x;
    const dy = clientY - stickOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 2 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 2 ? Math.sin(angle) * clamped : 0;
    setKnobOffset({ x: kx, y: ky });

    const normMag = clamped / STICK_MAX_RADIUS;
    if (normMag < 0.14) {
      setStickSprint(false);
      onVirtualMove(0, 0, false);
      return;
    }
    const nx = kx / STICK_MAX_RADIUS;
    const ny = -ky / STICK_MAX_RADIUS; // forward is +y
    const sprinting = normMag > 0.82 && ny > 0.35;
    setStickSprint(sprinting);
    onVirtualMove(nx, ny, sprinting);
  };

  const handleLookDown = (e: PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== null) return;
    lookPointerIdRef.current = e.pointerId;
    lookLastRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lookLastRef.current.x;
    const dy = e.clientY - lookLastRef.current.y;
    lookLastRef.current = { x: e.clientX, y: e.clientY };
    onTouchLook(dx, dy);
  };

  const handleLookUp = (e: PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    lookPointerIdRef.current = null;
  };

  const handleFireDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    firePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFiring(true);
    onVirtualFire(true);
  };

  const handleFireUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (firePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    firePointerIdRef.current = null;
    setFiring(false);
    onVirtualFire(false);
  };

  return (
    <div
      data-testid="mobile-controls"
      className="fixed inset-0 z-20 pointer-events-none select-none touch-control-surface"
    >
      {/* Right-half invisible touch-drag camera look pad */}
      <div
        aria-label="Camera look area"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="fixed top-14 bottom-16 right-0 left-[38%] pointer-events-auto touch-control-surface"
      />

      {/* Left Virtual Movement Thumbstick (auto-sprints at outer rim) */}
      <div
        data-testid="mobile-joystick"
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickUp}
        onPointerCancel={handleStickUp}
        className={`fixed bottom-5 left-5 w-28 h-28 rounded-full border-2 pointer-events-auto touch-control-surface flex items-center justify-center transition-colors ${
          stickSprint
            ? 'bg-[#e8963a]/16 border-[#e8963a]/75'
            : 'bg-[#0d121b]/62 border-[#ece7dc]/28'
        }`}
      >
        <div className="w-10 h-10 rounded-full border border-[#ece7dc]/18 pointer-events-none" />
        <div
          className={`absolute w-11 h-11 rounded-full border-2 pointer-events-none shadow-lg ${
            stickSprint
              ? 'bg-[#e8963a]/90 border-[#fff3df]'
              : 'bg-[#ece7dc]/80 border-[#0b0f17]'
          }`}
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Bottom-Center Compact Weapon Quick-Bar (1-5) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-auto touch-control-surface">
        {WEAPON_ORDER.map((wid) => {
          const w = WEAPONS[wid];
          const wText = t.weapons[wid];
          const active = wid === hud.activeWeapon;
          return (
            <button
              key={wid}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectWeapon(wid);
              }}
              aria-label={`${wText.name} [${w.slotKey}]`}
              className={`px-2 py-1.5 rounded border text-[10px] font-mono-num font-bold uppercase tracking-tight transition-colors ${
                active
                  ? 'bg-[#e8963a] border-[#e8963a] text-[#0b0f17]'
                  : 'bg-[#0d121b]/82 border-[#ece7dc]/22 text-[#ece7dc]/85'
              }`}
            >
              {wText.shortName}
            </button>
          );
        })}
      </div>

      {/* Right-Side Tactile Combat Buttons */}
      <div className="fixed bottom-5 right-4 flex flex-col items-end gap-2.5 pointer-events-none">
        {/* Contextual Interact button when near Fuse Box / Signal Relay */}
        {hud.nearbyInteractLabel && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            aria-label={t.mobileInteract}
            className="pointer-events-auto touch-control-surface px-3.5 py-2 rounded-full bg-[#1a3a2f]/95 border-2 border-[#5fa88e] text-[#b9f7e1] font-mono-num text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg animate-pulse"
          >
            <Hand className="w-4 h-4" />
            <span>{t.mobileInteract}</span>
          </button>
        )}

        {/* Secondary action row: Pat Grisha, Flashlight, Jump, Reload */}
        <div className="flex items-center gap-2 pointer-events-auto touch-control-surface">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPatRooster();
            }}
            aria-label={t.mobilePat}
            className="w-11 h-11 rounded-full bg-[#1b2232]/85 border border-[#e8963a]/55 text-[#e8963a] flex items-center justify-center active:scale-95"
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleFlashlight();
            }}
            aria-label={t.mobileFlash}
            className={`w-11 h-11 rounded-full border flex items-center justify-center active:scale-95 ${
              hud.flashlightOn
                ? 'bg-[#2e2313]/90 border-[#e8963a]/80 text-[#e8963a]'
                : 'bg-[#0d121b]/82 border-[#ece7dc]/24 text-[#9aa3b0]'
            }`}
          >
            <Flashlight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onJump();
            }}
            aria-label={t.mobileJump}
            className="w-11 h-11 rounded-full bg-[#0d121b]/82 border border-[#ece7dc]/28 text-[#ece7dc] flex items-center justify-center active:scale-95"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onReload();
            }}
            aria-label={t.mobileReload}
            className="w-11 h-11 rounded-full bg-[#0d121b]/82 border border-[#ece7dc]/28 text-[#ece7dc] flex items-center justify-center active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Fire + AWP Scope row */}
        <div className="flex items-center gap-2.5 pointer-events-auto touch-control-surface">
          {hud.activeWeapon === 'awp' && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onToggleScope();
              }}
              aria-label={t.mobileScope}
              className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-mono-num text-[10px] font-bold uppercase active:scale-95 ${
                hud.isScoped
                  ? 'bg-[#5fa88e] border-[#d3fff0] text-[#0b0f17]'
                  : 'bg-[#0d121b]/85 border-[#5fa88e]/70 text-[#5fa88e]'
              }`}
            >
              <Crosshair className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            data-testid="mobile-fire-btn"
            onPointerDown={handleFireDown}
            onPointerUp={handleFireUp}
            onPointerCancel={handleFireUp}
            aria-label={t.mobileFire}
            className={`w-[72px] h-[72px] rounded-full border-2 font-display text-sm font-bold tracking-wider uppercase flex items-center justify-center shadow-xl transition-transform ${
              firing
                ? 'bg-[#e8963a] border-[#fff1dc] text-[#0b0f17] scale-95'
                : 'bg-[#c93b3b]/90 border-[#f4c0c0]/70 text-[#fff6f2]'
            }`}
          >
            {t.mobileFire}
          </button>
        </div>
      </div>
    </div>
  );
}

interface LandscapePromptOverlayProps {
  language: Language;
  onDismiss: () => void;
}

export function LandscapePromptOverlay({
  language,
  onDismiss,
}: LandscapePromptOverlayProps) {
  const t = TRANSLATIONS[language];

  return (
    <div
      data-testid="landscape-prompt"
      role="dialog"
      aria-modal="true"
      aria-label={t.mobileRotateTitle}
      className="fixed inset-0 z-50 bg-[#070a10]/94 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm rounded bg-[#0e141f] border border-[#e8963a]/40 p-6 text-center space-y-4 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#1a2232] border border-[#e8963a]/55 flex items-center justify-center text-[#e8963a]">
          <Smartphone className="w-7 h-7 -rotate-90" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-wider uppercase text-[#ece7dc]">
          {t.mobileRotateTitle}
        </h2>
        <p className="text-xs text-[#9aa3b0] leading-relaxed">
          {t.mobileRotateDesc}
        </p>
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              void requestLandscapeMode();
            }}
            className="w-full py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-lg font-bold tracking-wider uppercase hover:bg-[#f2a853] cursor-pointer"
          >
            {t.mobileRotateBtn}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] hover:text-[#ece7dc] cursor-pointer"
          >
            {t.mobilePlayAnyway}
          </button>
        </div>
      </div>
    </div>
  );
}
