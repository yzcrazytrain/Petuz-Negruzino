import { useRef, useState, type PointerEvent } from 'react';
import {
  ArrowUp,
  Check,
  Crosshair,
  Flashlight,
  Hand,
  Heart,
  Move,
  RotateCcw,
  Smartphone,
  X,
} from 'lucide-react';
import { WEAPON_ORDER } from '../game/constants';
import { requestLandscapeMode } from '../game/device';
import { TRANSLATIONS } from '../game/i18n';
import {
  clampHudControlPos,
  HUD_SCALE_MAX,
  HUD_SCALE_MIN,
  MOBILE_HUD_CONTROL_IDS,
  type MobileHudControlId,
  type MobileHudOrientationLayout,
} from '../game/mobileHudLayout';
import type { HudSnapshot, Language, WeaponId } from '../game/types';

interface MobileControlsProps {
  hud: HudSnapshot;
  layout: MobileHudOrientationLayout;
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

function controlStyle(pos: { xPct: number; yPct: number; scale: number }) {
  return {
    left: `${pos.xPct}%`,
    top: `${pos.yPct}%`,
    transform: `translate(-50%, -50%) scale(${pos.scale})`,
  } as const;
}

export function MobileControls({
  hud,
  layout,
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
        style={controlStyle(layout.joystick)}
        className={`fixed w-28 h-28 rounded-full border-2 pointer-events-auto touch-control-surface flex items-center justify-center transition-colors ${
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

      {/* Compact Weapon Quick-Bar */}
      <div
        data-testid="mobile-weapons-bar"
        style={controlStyle(layout.weapons)}
        className="fixed flex items-center gap-1 pointer-events-auto touch-control-surface"
      >
        {WEAPON_ORDER.map((wid) => {
          const wText = t.weapons[wid];
          const active = wid === hud.activeWeapon;
          return (
            <button
              key={wid}
              type="button"
              data-mobile-weapon={wid}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectWeapon(wid);
              }}
              aria-label={wText.name}
              className={`px-2 py-1.5 rounded border text-[10px] font-mono-num font-bold uppercase tracking-tight whitespace-nowrap transition-colors ${
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

      {/* Contextual Interact button when near Fuse Box / Signal Relay / Tape / Teammate */}
      {hud.nearbyInteractLabel && (
        <button
          type="button"
          data-testid="mobile-interact-btn"
          style={controlStyle(layout.interact)}
          onPointerDown={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          aria-label={t.mobileInteract}
          className="fixed pointer-events-auto touch-control-surface px-3.5 py-2 rounded-full bg-[#1a3a2f]/95 border-2 border-[#5fa88e] text-[#b9f7e1] font-mono-num text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg whitespace-nowrap animate-pulse"
        >
          <Hand className="w-4 h-4 shrink-0" />
          <span>{t.mobileInteract}</span>
        </button>
      )}

      {/* Pat Rooster */}
      <button
        type="button"
        data-testid="mobile-pat-btn"
        style={controlStyle(layout.pat)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPatRooster();
        }}
        aria-label={t.mobilePat}
        className="fixed w-11 h-11 rounded-full bg-[#1b2232]/85 border border-[#e8963a]/55 text-[#e8963a] flex items-center justify-center pointer-events-auto touch-control-surface active:brightness-125"
      >
        <Heart className="w-4 h-4" />
      </button>

      {/* Flashlight Toggle */}
      <button
        type="button"
        data-testid="mobile-flashlight-btn"
        style={controlStyle(layout.flashlight)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onToggleFlashlight();
        }}
        aria-label={t.mobileFlash}
        className={`fixed w-11 h-11 rounded-full border flex items-center justify-center pointer-events-auto touch-control-surface active:brightness-125 ${
          hud.flashlightOn
            ? 'bg-[#2e2313]/90 border-[#e8963a]/80 text-[#e8963a]'
            : 'bg-[#0d121b]/82 border-[#ece7dc]/24 text-[#9aa3b0]'
        }`}
      >
        <Flashlight className="w-4 h-4" />
      </button>

      {/* Jump */}
      <button
        type="button"
        data-testid="mobile-jump-btn"
        style={controlStyle(layout.jump)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onJump();
        }}
        aria-label={t.mobileJump}
        className="fixed w-11 h-11 rounded-full bg-[#0d121b]/82 border border-[#ece7dc]/28 text-[#ece7dc] flex items-center justify-center pointer-events-auto touch-control-surface active:brightness-125"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* Reload */}
      <button
        type="button"
        data-testid="mobile-reload-btn"
        style={controlStyle(layout.reload)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onReload();
        }}
        aria-label={t.mobileReload}
        className={`fixed w-11 h-11 rounded-full border flex items-center justify-center pointer-events-auto touch-control-surface active:brightness-125 ${
          hud.reloading
            ? 'bg-[#2a1f10]/90 border-[#e8963a] text-[#e8963a]'
            : 'bg-[#0d121b]/82 border-[#ece7dc]/28 text-[#ece7dc]'
        }`}
      >
        <RotateCcw className={`w-4 h-4 ${hud.reloading ? 'animate-spin' : ''}`} />
      </button>

      {/* AWP Optical Scope */}
      {hud.activeWeapon === 'awp' && (
        <button
          type="button"
          data-testid="mobile-scope-btn"
          style={controlStyle(layout.scope)}
          onPointerDown={(e) => {
            e.stopPropagation();
            onToggleScope();
          }}
          aria-label={t.mobileScope}
          className={`fixed w-14 h-14 rounded-full border-2 flex items-center justify-center pointer-events-auto touch-control-surface active:brightness-125 ${
            hud.isScoped
              ? 'bg-[#5fa88e] border-[#d3fff0] text-[#0b0f17]'
              : 'bg-[#0d121b]/85 border-[#5fa88e]/70 text-[#5fa88e]'
          }`}
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}

      {/* Primary Fire Button */}
      <button
        type="button"
        data-testid="mobile-fire-btn"
        style={controlStyle(layout.fire)}
        onPointerDown={handleFireDown}
        onPointerUp={handleFireUp}
        onPointerCancel={handleFireUp}
        aria-label={t.mobileFire}
        className={`fixed w-[72px] h-[72px] rounded-full border-2 font-display text-sm font-bold tracking-wider uppercase flex items-center justify-center shadow-xl pointer-events-auto touch-control-surface transition-colors ${
          firing
            ? 'bg-[#e8963a] border-[#fff1dc] text-[#0b0f17]'
            : 'bg-[#c93b3b]/90 border-[#f4c0c0]/70 text-[#fff6f2]'
        }`}
      >
        {t.mobileFire}
      </button>
    </div>
  );
}

interface MobileHudEditorProps {
  language: Language;
  initialLayout: MobileHudOrientationLayout;
  onSave: (layout: MobileHudOrientationLayout) => void;
  onReset: () => MobileHudOrientationLayout;
  onCancel: () => void;
}

export function MobileHudEditor({
  language,
  initialLayout,
  onSave,
  onReset,
  onCancel,
}: MobileHudEditorProps) {
  const t = TRANSLATIONS[language];
  const [draft, setDraft] = useState<MobileHudOrientationLayout>(() => ({
    ...initialLayout,
  }));
  const [selectedId, setSelectedId] = useState<MobileHudControlId>('fire');
  const dragRef = useRef<{
    id: MobileHudControlId;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const handleControlPointerDown = (
    id: MobileHudControlId,
    e: PointerEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    setSelectedId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXPct: draft[id].xPct,
      startYPct: draft[id].yPct,
    };
  };

  const handleControlPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const nextX = drag.startXPct + ((e.clientX - drag.startClientX) / vw) * 100;
    const nextY = drag.startYPct + ((e.clientY - drag.startClientY) / vh) * 100;

    setDraft((prev) => ({
      ...prev,
      [drag.id]: clampHudControlPos(
        { xPct: nextX, yPct: nextY, scale: prev[drag.id].scale },
        prev[drag.id],
        drag.id
      ),
    }));
  };

  const handleControlPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    dragRef.current = null;
  };

  const selectedPos = draft[selectedId];

  const renderControlPreview = (id: MobileHudControlId) => {
    const isSel = selectedId === id;
    const ring = isSel
      ? 'ring-2 ring-[#e8963a] border-[#e8963a] shadow-lg shadow-[#e8963a]/30'
      : 'border-[#ece7dc]/45';
    switch (id) {
      case 'joystick':
        return (
          <div
            className={`w-28 h-28 rounded-full border-2 bg-[#0d121b]/75 flex flex-col items-center justify-center gap-1 ${ring}`}
          >
            <Move className="w-5 h-5 text-[#e8963a]" />
            <span className="text-[10px] font-mono-num uppercase text-[#ece7dc]">
              {t.hudControlNames.joystick}
            </span>
          </div>
        );
      case 'fire':
        return (
          <div
            className={`w-[72px] h-[72px] rounded-full border-2 bg-[#c93b3b]/88 text-[#fff6f2] font-display text-sm font-bold uppercase flex items-center justify-center ${ring}`}
          >
            {t.mobileFire}
          </div>
        );
      case 'scope':
        return (
          <div
            className={`w-14 h-14 rounded-full border-2 bg-[#0d121b]/88 text-[#5fa88e] flex items-center justify-center ${ring}`}
          >
            <Crosshair className="w-5 h-5" />
          </div>
        );
      case 'reload':
        return (
          <div
            className={`w-11 h-11 rounded-full border-2 bg-[#0d121b]/88 text-[#ece7dc] flex items-center justify-center ${ring}`}
          >
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      case 'jump':
        return (
          <div
            className={`w-11 h-11 rounded-full border-2 bg-[#0d121b]/88 text-[#ece7dc] flex items-center justify-center ${ring}`}
          >
            <ArrowUp className="w-4 h-4" />
          </div>
        );
      case 'flashlight':
        return (
          <div
            className={`w-11 h-11 rounded-full border-2 bg-[#2e2313]/90 text-[#e8963a] flex items-center justify-center ${ring}`}
          >
            <Flashlight className="w-4 h-4" />
          </div>
        );
      case 'pat':
        return (
          <div
            className={`w-11 h-11 rounded-full border-2 bg-[#1b2232]/90 text-[#e8963a] flex items-center justify-center ${ring}`}
          >
            <Heart className="w-4 h-4" />
          </div>
        );
      case 'interact':
        return (
          <div
            className={`px-3.5 py-2 rounded-full border-2 bg-[#1a3a2f]/95 text-[#b9f7e1] font-mono-num text-xs font-bold uppercase flex items-center gap-1.5 whitespace-nowrap ${ring}`}
          >
            <Hand className="w-4 h-4 shrink-0" />
            <span>{t.mobileInteract}</span>
          </div>
        );
      case 'weapons':
        return (
          <div
            className={`flex items-center gap-1 p-1 rounded border-2 bg-[#0d121b]/85 ${ring}`}
          >
            {WEAPON_ORDER.map((wid) => (
              <span
                key={wid}
                className="px-1.5 py-1 rounded bg-[#1a2232] text-[9px] font-mono-num font-bold uppercase text-[#ece7dc] whitespace-nowrap"
              >
                {t.weapons[wid].shortName}
              </span>
            ))}
          </div>
        );
    }
  };

  return (
    <div
      data-testid="mobile-hud-editor"
      role="dialog"
      aria-modal="true"
      aria-label={t.hudEditorTitle}
      className="fixed inset-0 z-50 bg-[#070a10]/76 select-none touch-control-surface"
    >
      {/* Subtle alignment grid */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(236,231,220,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(236,231,220,0.22) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Compact Top Control Bar */}
      <div className="fixed top-3 left-3 right-3 z-20 rounded bg-[#0e141f]/95 border border-[#e8963a]/45 p-3 shadow-2xl space-y-2.5 max-w-lg mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-base font-bold uppercase tracking-wider text-[#e8963a]">
              {t.hudEditorTitle}
            </div>
            <div className="text-[11px] text-[#9aa3b0]">
              {t.hudEditorHint}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="hud-editor-reset"
              onClick={() => setDraft(onReset())}
              className="px-2.5 py-1.5 rounded border border-[#ece7dc]/22 bg-[#141c2a] text-[11px] font-mono-num uppercase text-[#ece7dc] hover:border-[#e8963a] cursor-pointer"
            >
              {t.hudEditorReset}
            </button>
            <button
              type="button"
              data-testid="hud-editor-cancel"
              onClick={onCancel}
              aria-label={t.hudEditorCancel}
              className="p-1.5 rounded border border-[#ece7dc]/22 bg-[#141c2a] text-[#9aa3b0] hover:text-[#ece7dc] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="hud-editor-save"
              onClick={() => onSave(draft)}
              className="px-3 py-1.5 rounded bg-[#e8963a] text-[#0b0f17] font-mono-num text-[11px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.hudEditorSave}</span>
            </button>
          </div>
        </div>

        {/* Selected Control Scale Slider */}
        <div className="flex items-center gap-3 pt-1.5 border-t border-[#ece7dc]/12">
          <span className="text-[11px] font-mono-num uppercase text-[#ece7dc] font-bold shrink-0">
            {t.hudControlNames[selectedId]}
          </span>
          <span className="text-[11px] font-mono-num text-[#9aa3b0] shrink-0">
            {t.hudEditorScale}
          </span>
          <input
            type="range"
            aria-label={t.hudEditorScale}
            min={HUD_SCALE_MIN}
            max={HUD_SCALE_MAX}
            step={0.05}
            value={selectedPos.scale}
            onChange={(e) => {
              const nextScale = Number(e.target.value);
              setDraft((prev) => ({
                ...prev,
                [selectedId]: clampHudControlPos(
                  { ...prev[selectedId], scale: nextScale },
                  prev[selectedId],
                  selectedId
                ),
              }));
            }}
            className="flex-1 accent-[#e8963a]"
          />
          <span className="text-[11px] font-mono-num text-[#e8963a] font-bold w-10 text-right shrink-0">
            {Math.round(selectedPos.scale * 100)}%
          </span>
        </div>
      </div>

      {/* Draggable Handles for Every Touch Control */}
      {MOBILE_HUD_CONTROL_IDS.map((id) => (
        <button
          key={id}
          type="button"
          data-hud-edit-id={id}
          aria-label={t.hudControlNames[id]}
          style={controlStyle(draft[id])}
          onPointerDown={(e) => handleControlPointerDown(id, e)}
          onPointerMove={handleControlPointerMove}
          onPointerUp={handleControlPointerUp}
          onPointerCancel={handleControlPointerUp}
          className="fixed z-10 touch-control-surface cursor-grab active:cursor-grabbing bg-transparent p-0 border-0"
        >
          {renderControlPreview(id)}
        </button>
      ))}
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
