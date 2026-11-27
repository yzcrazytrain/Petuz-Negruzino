import { useEffect, useState } from 'react';
import { BookOpen, Car, Music, Pause, Sliders, Volume2, VolumeX } from 'lucide-react';
import { WEAPON_ORDER, WEAPONS } from '../game/constants';
import { localizeRoosterCopy, stripPcKeyHints, TRANSLATIONS } from '../game/i18n';
import { formatBindingLabel } from '../game/keybinds';
import type { HudSnapshot, WeaponId } from '../game/types';
import { RoosterCrestIcon, WeaponSilhouetteIcon } from './GameIcons';
import { ScreamerOverlay } from './ScreamerOverlay';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectWeapon: (id: WeaponId) => void;
  onPatRooster: () => void;
  onPause: () => void;
  onToggleMute: () => void;
  onNextTrack: () => void;
  onOpenWorkshop: () => void;
  onBoardMoskvitch?: () => void;
  onOpenHubSpecs?: () => void;
}

export function GameHud({
  hud,
  onSelectWeapon,
  onPatRooster,
  onPause,
  onToggleMute,
  onNextTrack,
  onOpenWorkshop,
  onBoardMoskvitch,
  onOpenHubSpecs,
}: GameHudProps) {
  // Trailing white/amber ghost health bar for weight-scaled damage feedback
  const [ghostHp, setGhostHp] = useState(hud.hp);
  useEffect(() => {
    if (hud.hp < ghostHp) {
      const id = window.setTimeout(() => setGhostHp(hud.hp), 380);
      return () => window.clearTimeout(id);
    }
    setGhostHp(hud.hp);
  }, [hud.hp, ghostHp]);

  const t = TRANSLATIONS[hud.language];
  const loc = (text: string) => localizeRoosterCopy(text, hud.language, hud.roosterName);
  const activeWeaponText = t.weapons[hud.activeWeapon];
  const activeAmmo = hud.ammo[hud.activeWeapon];
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / hud.maxHp) * 100));
  const lowHp = hud.hp <= 30;
  const isTouch = hud.isTouchDevice;

  const patKey = formatBindingLabel(hud.keybinds.patRooster, hud.language, true);
  const reloadKey = formatBindingLabel(hud.keybinds.reload, hud.language, true);
  const scopeKey = formatBindingLabel(hud.keybinds.scope, hud.language, true);
  const trackKey = formatBindingLabel(hud.keybinds.nextTrack, hud.language, true);

  const rankTitle =
    t.characterRanks[hud.character.level - 1] ?? t.characterRanks[0];

  const reloadLine = hud.reloading
    ? t.reloading
    : hud.activeWeapon === 'awp'
      ? `[${scopeKey}] ${t.mobileScope.toUpperCase()} · [${reloadKey}]`
      : hud.activeWeapon === 'p90'
        ? t.p90AutoReloadHint.replace('[R]', `[${reloadKey}]`)
        : hud.activeWeapon === 'minigun'
          ? `${t.spinLabel} ${Math.round(hud.minigunSpin * 100)}%`
          : `[${reloadKey}] ${t.mobileReload.toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Subtle CRT scanline anomaly when dread spikes */}
      {hud.exeCorruption > 0.34 && (
        <div
          className="fixed inset-0 pointer-events-none vhs-scanlines"
          style={{ opacity: Math.min(0.42, (hud.exeCorruption - 0.3) * 0.65) }}
        />
      )}

      {/* Psychological Horror Screamer Overlay (rendered beneath HUD cards so UI never blacks out) */}
      <ScreamerOverlay
        active={hud.screamerActive}
        progress={hud.screamerProgress}
        kind={hud.screamerKind}
        caption={hud.screamerCaption}
        intensity={hud.screamerIntensity}
      />

      {/* Peripheral damage & low-HP crimson vignette */}
      {(hud.damageFlash > 0.02 || lowHp) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: Math.max(hud.damageFlash, lowHp ? 0.35 : 0),
            background:
              'radial-gradient(circle at center, transparent 48%, rgba(185, 28, 28, 0.72) 100%)',
          }}
        />
      )}

      {/* AWP Optical Scope Full-Screen Reticle */}
      {hud.isScoped && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at center, transparent 28%, rgba(5, 8, 12, 0.96) 38%)',
            }}
          />
          <div className="fixed left-0 right-0 top-1/2 h-[1px] bg-black/85" />
          <div className="fixed top-0 bottom-0 left-1/2 w-[1px] bg-black/85" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#c93b3b]" />
          <div className="fixed left-1/2 top-[62%] -translate-x-1/2 font-mono-num text-[11px] text-[#5fa88e] tracking-widest">
            {isTouch ? 'AWP-96 · 3.2×' : `AWP-96 · 3.2× · [${scopeKey}]`}
          </div>
        </div>
      )}

      {/* Center (0, 0) Dynamic Crosshair & Hit Marker */}
      {!hud.isScoped && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        >
          {hud.activeWeapon === 'shotgun' ? (
            <div className="w-10 h-10 rounded-full border border-[#ece7dc]/75 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#e8963a]" />
            </div>
          ) : (
            <div className="relative w-6 h-6">
              <span className="absolute left-1/2 -top-1 -translate-x-1/2 w-[2px] h-2 bg-[#ece7dc]/85" />
              <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-[2px] h-2 bg-[#ece7dc]/85" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 h-[2px] w-2 bg-[#ece7dc]/85" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 h-[2px] w-2 bg-[#ece7dc]/85" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#e8963a]" />
            </div>
          )}

          {hud.hitMarkerTimer > 0 && (
            <svg
              viewBox="0 0 24 24"
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 ${
                hud.hitMarkerCrit ? 'text-[#e8963a]' : 'text-[#ece7dc]'
              }`}
            >
              <path
                d="M4 4L9 9M20 4L15 9M4 20L9 15M20 20L15 15"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {hud.headshotTimer > 0 && (
            <div className="absolute left-1/2 -top-8 -translate-x-1/2 whitespace-nowrap font-mono-num text-[11px] font-bold tracking-widest uppercase text-[#e8963a] hud-text-shadow">
              {t.headshotCallout}
            </div>
          )}
        </div>
      )}

      {/* Overclock active micro-banner */}
      {hud.overclockTimer > 0 && (
        <div className="fixed left-1/2 top-[56%] -translate-x-1/2 px-3 py-1 rounded bg-[#24090e]/92 border border-[#d63636]/75 text-[#f7c8c8] font-mono-num text-[11px] font-bold tracking-wider uppercase">
          {t.overclockLabel(Math.ceil(hud.overclockTimer))}
        </div>
      )}

      {/* Interact Prompt near Fuse Boxes / Relays / Hub Car / Specs Terminal (Desktop only) */}
      {hud.nearbyInteractLabel && !isTouch && (
        <div
          data-testid="interact-prompt"
          className="fixed left-1/2 top-[60%] -translate-x-1/2 px-4 py-1.5 rounded bg-[#0d121b]/92 border border-[#5fa88e]/65 text-[#5fa88e] font-mono-num text-xs tracking-wider uppercase hud-text-shadow"
        >
          {hud.nearbyInteractLabel}
        </div>
      )}

      {/* UNIFIED CENTER BANNER STACK — eliminates all portrait/landscape HUD overlaps */}
      <div
        data-testid="hud-center-stack"
        className={`fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5 ${
          hud.isPortrait
            ? 'top-[148px] w-[min(362px,94vw)]'
            : isTouch
              ? 'top-2 w-[min(420px,54vw)]'
              : 'top-3 w-[min(460px,54vw)]'
        }`}
      >
        {/* Pre-Match Hub: Moskvitch Launch & Specs Terminal Quick Bar */}
        {hud.phase === 'hub' && (
          <div
            data-testid="hub-action-bar"
            className={`pointer-events-auto flex items-center justify-center rounded bg-[#0f1722]/92 border border-[#e8963a]/50 shadow-xl max-w-full ${
              hud.isPortrait
                ? 'flex-wrap gap-1.5 px-2.5 py-1.5'
                : isTouch
                  ? 'flex-nowrap gap-1.5 px-2 py-1'
                  : 'flex-nowrap gap-2 px-3 py-2'
            }`}
          >
            <span
              data-testid="hub-moskvitch-counter"
              className={`font-mono-num font-bold uppercase tracking-wider text-[#f3cf88] whitespace-nowrap ${
                isTouch && !hud.isPortrait ? 'text-[10px]' : 'text-[11px] sm:text-xs'
              }`}
            >
              {isTouch && !hud.isPortrait
                ? `${hud.hub.boardedCount}/${hud.hub.totalPlayers}`
                : t.hub.moskvitchCounter(hud.hub.boardedCount, hud.hub.totalPlayers)}
            </span>
            <button
              type="button"
              data-testid="hub-board-car-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onBoardMoskvitch?.();
              }}
              className={`rounded font-display font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                isTouch && !hud.isPortrait
                  ? 'px-2 py-1 text-[11px]'
                  : 'px-2.5 sm:px-3 py-1 text-xs sm:text-sm'
              } ${
                hud.hub.inCar
                  ? 'bg-[#2a1518] border border-[#c93b3b]/70 text-[#ffd2d2] hover:bg-[#c93b3b]'
                  : 'bg-[#e8963a] text-[#0b0f17] hover:bg-[#f2a853]'
              }`}
            >
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span>{hud.hub.inCar ? t.hub.moskvitchLeaveBtn : t.hub.moskvitchBoardBtn}</span>
            </button>
            <button
              type="button"
              data-testid="hub-specs-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenHubSpecs?.();
              }}
              className={`rounded bg-[#182436] border border-[#5fa88e]/60 text-[#9cecd0] font-display font-bold uppercase tracking-wider inline-flex items-center gap-1 hover:bg-[#5fa88e] hover:text-[#0b0f17] transition-colors cursor-pointer whitespace-nowrap ${
                isTouch && !hud.isPortrait
                  ? 'px-2 py-1 text-[11px]'
                  : 'px-2.5 sm:px-3 py-1 text-xs sm:text-sm'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t.hub.terminalBtn}</span>
            </button>
          </div>
        )}

        {/* Pre-Match Hub: Firing Range Hit Readout */}
        {hud.phase === 'hub' && hud.hub.lastRangeHit && (
          <div
            data-testid="hub-range-hit"
            className="px-3.5 py-1.5 rounded bg-[#141e2b]/94 border border-[#e8963a]/75 text-[#f7cf86] font-mono-num text-xs font-bold tracking-wider uppercase whitespace-nowrap max-w-full truncate shadow-lg"
          >
            {t.hub.rangeHitReadout(
              hud.hub.lastRangeHit.dummyLabel,
              hud.hub.lastRangeHit.damage,
              hud.hub.lastRangeHit.distanceMeters,
              hud.hub.lastRangeHit.crit,
              hud.hub.lastRangeHit.destroyed
            )}
          </div>
        )}

        {/* Active Objective Hold-Zone / Destructible Target Progress Bar */}
        {hud.phase === 'playing' && hud.activeObjectiveProgress && (
          <div
            data-testid="active-objective-progress"
            className={`w-full max-w-[340px] px-3 py-1.5 rounded bg-[#0d1420]/94 shadow-lg border ${
              hud.activeObjectiveProgress.kind === 'hold'
                ? 'border-[#3fd4c6]/70'
                : 'border-[#e8793a]/75'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num uppercase tracking-wider mb-1">
              <span
                className={`font-bold truncate ${
                  hud.activeObjectiveProgress.kind === 'hold'
                    ? 'text-[#7ef2e6]'
                    : 'text-[#ffbe7a]'
                }`}
              >
                {hud.activeObjectiveProgress.kind === 'hold'
                  ? hud.language === 'ru'
                    ? `УДЕРЖАНИЕ: ${hud.activeObjectiveProgress.label}`
                    : `HOLD ZONE: ${hud.activeObjectiveProgress.label}`
                  : hud.language === 'ru'
                    ? `ЦЕЛЬ: ${hud.activeObjectiveProgress.label}`
                    : `TARGET: ${hud.activeObjectiveProgress.label}`}
              </span>
              <span className="text-[#ece7dc] font-bold shrink-0">
                {hud.activeObjectiveProgress.kind === 'hold'
                  ? `${Math.round(hud.activeObjectiveProgress.ratio * 100)}%`
                  : `${hud.activeObjectiveProgress.currentValue}/${hud.activeObjectiveProgress.maxValue}`}
              </span>
            </div>
            <div className="h-2 w-full bg-[#1a2230] rounded-xs overflow-hidden">
              <div
                className={`h-full transition-transform duration-100 origin-left ${
                  hud.activeObjectiveProgress.kind === 'hold'
                    ? 'bg-[#3fd4c6]'
                    : 'bg-[#e8693a]'
                }`}
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, hud.activeObjectiveProgress.ratio))})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Rooster Danger Alert Banner */}
        {hud.rooster.alertActive && (
          <div
            data-testid="rooster-alert-banner"
            className="px-3 py-1.5 rounded bg-[#1a0d10]/94 border border-[#c93b3b]/75 flex items-center gap-2 shadow-lg max-w-full"
          >
            <RoosterCrestIcon className="w-4 h-4 shrink-0" />
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#c93b3b]/25 border border-[#c93b3b]/70 text-[#f3c6c6] font-mono-num text-[11px] font-bold leading-none shrink-0"
              style={{
                transform: `rotate(${Math.round(
                  (hud.rooster.alertAngleRad * 180) / Math.PI
                )}deg)`,
              }}
            >
              ↑
            </span>
            <span className="font-mono-num text-[11px] font-semibold tracking-wider text-[#f3c6c6] uppercase truncate">
              {hud.rooster.alertLabel}
            </span>
          </div>
        )}

        {/* Character Rank-Up Banner */}
        {hud.levelUpToast && !hud.rooster.alertActive && (
          <div
            data-testid="level-up-toast"
            className="px-3.5 py-1.5 rounded bg-[#14231e]/94 border border-[#5fa88e]/75 text-[#b5f2dc] font-mono-num text-[11px] font-bold tracking-widest uppercase whitespace-nowrap max-w-full truncate shadow-lg"
          >
            {hud.levelUpToast}
          </div>
        )}

        {/* Quick Cassette Track Toast */}
        {hud.trackToast && (
          <div
            data-testid="track-toast"
            className="px-3 py-1 rounded bg-[#0d121b]/94 border border-[#e8963a]/65 text-[#f0aa54] font-mono-num text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap max-w-full truncate shadow-lg"
          >
            ♪ {hud.trackToast}
          </div>
        )}

        {/* LAN Co-op Downed Alert & Squad Ping Callout */}
        {hud.coop.active && hud.coop.localDowned && (
          <div
            data-testid="coop-downed-banner"
            className="px-4 py-1.5 rounded bg-[#2a0c10]/94 border border-[#c93b3b]/85 text-[#ffd2d2] font-mono-num text-xs font-bold tracking-wider uppercase whitespace-nowrap max-w-full truncate shadow-lg"
          >
            {isTouch ? stripPcKeyHints(t.lanCoop.downedBanner) : t.lanCoop.downedBanner}
          </div>
        )}

        {hud.coop.active && hud.coop.lastPingText && !hud.coop.localDowned && (
          <div
            data-testid="coop-ping-banner"
            className="px-3.5 py-1 rounded bg-[#10221c]/92 border border-[#5fa88e]/70 text-[#9cecd0] font-mono-num text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap max-w-full truncate shadow-lg"
          >
            ◎ {hud.coop.lastPingText}
          </div>
        )}

        {/* Boss Bar (Midnight Watchman / Warden / True Watchman) */}
        {hud.bossActive && (
          <div className="w-full max-w-[420px] px-3.5 py-1.5 rounded bg-[#0d121b]/90 border border-[#e8963a]/40">
            <div className="flex items-center justify-between text-[11px] font-mono-num mb-1">
              <span className="text-[#e8963a] font-bold tracking-widest">
                {hud.bossName}
              </span>
              <span className="text-[#ece7dc]">
                {hud.bossHp} / {hud.bossMaxHp}
              </span>
            </div>
            <div className="h-2 w-full bg-[#1d2533] overflow-hidden rounded-xs">
              <div
                className="h-full bg-[#c93b3b] transition-transform duration-150 origin-left"
                style={{
                  transform: `scaleX(${Math.max(0, hud.bossHp / hud.bossMaxHp)})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Live Cassette/Radio Story Subtitle Log (docked in stack on touch or portrait viewports) */}
        {hud.storyLog && !hud.screamerActive && (isTouch || hud.isPortrait) && (
          <div
            data-testid="story-radio-log"
            aria-live="polite"
            className="w-full rounded bg-[#0a0f18]/90 border border-[#e8963a]/35 shadow-lg shadow-black/50 pointer-events-none px-2.5 py-1.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono-num uppercase tracking-widest text-[#e8963a] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8963a] shrink-0" aria-hidden="true" />
              <span className="truncate">{hud.storyLog.speaker}</span>
            </div>
            <p className="mt-0.5 text-[#ece7dc]/95 leading-snug hud-text-shadow text-[11px] line-clamp-2">
              {isTouch ? stripPcKeyHints(hud.storyLog.text) : hud.storyLog.text}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Landscape Live Cassette/Radio Story Subtitle Log (bottom center, clear of top HUD) */}
      {hud.storyLog && !hud.screamerActive && !isTouch && !hud.isPortrait && (
        <div
          data-testid="story-radio-log"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[min(480px,78vw)] px-3.5 py-2 rounded bg-[#0a0f18]/90 border border-[#e8963a]/35 shadow-lg shadow-black/50 pointer-events-none z-20"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono-num uppercase tracking-widest text-[#e8963a] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e8963a] shrink-0" aria-hidden="true" />
            <span className="truncate">{hud.storyLog.speaker}</span>
          </div>
          <p className="mt-0.5 text-[#ece7dc]/95 leading-snug hud-text-shadow text-xs">
            {hud.storyLog.text}
          </p>
        </div>
      )}

      {/* Pickup collection toast */}
      {hud.pickupToast && !isTouch && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded bg-[#0d121b]/92 border border-[#e8963a]/60 text-[#e8963a] font-mono-num text-xs font-bold tracking-wider uppercase whitespace-nowrap">
          {hud.pickupToast}
        </div>
      )}

      {/* TOP-LEFT CLUSTER: Clean Objective, Compass & Mobile Compact Vitality */}
      <div
        data-testid="hud-objective-card"
        className={`fixed top-3 left-3 bg-[#0d121b]/86 border border-[#ece7dc]/14 rounded ${
          hud.isPortrait
            ? 'max-w-[202px] px-2 py-1.5 space-y-0.5'
            : isTouch
              ? 'max-w-[198px] px-2.5 py-1.5 space-y-1'
              : 'max-w-sm px-3.5 py-2.5'
        }`}
      >
        <div
          className={`flex items-center gap-1 text-[11px] font-mono-num text-[#9aa3b0] ${
            isTouch || hud.isPortrait ? 'flex-nowrap overflow-hidden' : 'flex-wrap gap-1.5'
          }`}
        >
          <span className="text-[#e8963a] font-bold tracking-wider shrink-0">
            {hud.clockLabel}
          </span>
          <span aria-hidden="true" className="shrink-0">·</span>
          <span
            className={`text-[#ece7dc] font-semibold uppercase tracking-wide ${
              isTouch || hud.isPortrait ? 'truncate min-w-0' : ''
            }`}
          >
            {hud.chapterTitle}
          </span>
          {(hud.loopNumber > 1 || hud.mode === 'endless') && (
            <span className="px-1.5 py-0.5 rounded bg-[#24090e] border border-[#c93b3b]/60 text-[9px] font-bold text-[#f3c6c6]">
              {t.loopBadge(hud.loopNumber)}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 text-[#ece7dc]/85 leading-tight ${
            hud.isPortrait ? 'text-[10.5px] line-clamp-2' : 'text-[11px] line-clamp-2'
          }`}
        >
          {hud.objectiveText}
        </p>
        <div
          className={`flex items-center flex-wrap text-[10px] font-mono-num text-[#9aa3b0] ${
            hud.isPortrait ? 'mt-0.5 gap-x-1.5 gap-y-0.5' : 'mt-1 gap-2'
          }`}
        >
          {hud.phase === 'hub' ? (
            <span className="text-[#5fa88e] font-bold uppercase tracking-wider">
              {t.hub.ammoInfiniteBadge}
            </span>
          ) : (
            <>
              {!hud.isPortrait && (
                <>
                  <span className="text-[#5fa88e] font-semibold uppercase truncate max-w-[140px]">
                    {t.zoneNames[hud.zoneId]}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>
                {t.kills} {hud.kills}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.score} {hud.score}
              </span>
            </>
          )}
          {hud.objectiveCompass.active && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#5fa88e] font-semibold">
                <span
                  aria-hidden="true"
                  className="inline-block leading-none"
                  style={{
                    transform: `rotate(${Math.round(
                      (hud.objectiveCompass.relativeAngleRad * 180) / Math.PI
                    )}deg)`,
                  }}
                >
                  ↑
                </span>
                <span>
                  {hud.objectiveCompass.distanceMeters}
                  {t.metersSuffix}
                </span>
              </span>
            </>
          )}
          {hud.phase === 'playing' && hud.mode === 'story' && hud.tapesTotal > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span
                data-testid="hud-tapes-counter"
                className="text-[#e8963a] font-semibold"
              >
                {t.tapesCounterLabel} {hud.collectedTapes.length}/{hud.tapesTotal}
              </span>
            </>
          )}
          {hud.phase === 'playing' && hud.coop.scaling.playerCount > 1 && (
            <span
              data-testid="hud-coop-scaling-badge"
              className="px-1.5 py-0.5 rounded bg-[#142923] border border-[#5fa88e]/55 text-[#8ee6c6] font-bold"
            >
              {t.lanCoop.scalingBadge(
                hud.coop.scaling.playerCount,
                `×${hud.coop.scaling.enemyHpMult.toFixed(2)}`,
                `×${hud.coop.scaling.enemyDamageMult.toFixed(2)}`
              )}
            </span>
          )}
          {hud.combo >= 2 && (
            <span className="px-1 py-0.5 rounded bg-[#e8963a]/20 border border-[#e8963a]/55 text-[#e8963a] font-bold">
              {t.comboLabel(hud.comboMultiplier)}
            </span>
          )}
        </div>

        {/* Mobile Compact Vitality Bar docked top-left so bottom-left stays clear for joystick */}
        {isTouch && (
          <div className="pt-1 border-t border-[#ece7dc]/10 flex items-center gap-2">
            <span
              className={`font-mono-num text-xs font-bold ${
                lowHp ? 'text-[#c93b3b]' : 'text-[#5fa88e]'
              }`}
            >
              {hud.hp} HP
            </span>
            <div className="relative flex-1 h-2 bg-[#1a2230] rounded-xs overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${
                  lowHp ? 'bg-[#c93b3b]' : 'bg-[#5fa88e]'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono-num text-[#e8963a] font-bold">
              {t.levelShort}{hud.character.level}
            </span>
          </div>
        )}
      </div>

      {/* TOP-RIGHT CLUSTER: 4 Crisp Utility Buttons (+ Mobile Compact Ammo Readout) */}
      <div className="fixed top-3 right-3 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onNextTrack();
            }}
            aria-label={isTouch ? stripPcKeyHints(t.nextTrackBtn) : `${t.nextTrackBtn} [${trackKey}]`}
            title={isTouch ? stripPcKeyHints(t.nextTrackBtn) : `${t.nextTrackBtn} [${trackKey}]`}
            className="w-9 h-9 flex items-center justify-center rounded bg-[#0d121b]/88 border border-[#ece7dc]/18 text-[#e8963a] hover:border-[#e8963a] hover:bg-[#1a2230] transition-colors cursor-pointer"
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenWorkshop();
            }}
            aria-label={t.openStudio}
            title={t.openStudio}
            className="w-9 h-9 flex items-center justify-center rounded bg-[#0d121b]/88 border border-[#ece7dc]/18 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={
              isTouch
                ? stripPcKeyHints(hud.muted ? t.unmuteAudio : t.muteAudio)
                : hud.muted
                  ? t.unmuteAudio
                  : t.muteAudio
            }
            title={
              isTouch
                ? stripPcKeyHints(hud.muted ? t.unmuteAudio : t.muteAudio)
                : hud.muted
                  ? t.unmuteAudio
                  : t.muteAudio
            }
            className="w-9 h-9 flex items-center justify-center rounded bg-[#0d121b]/88 border border-[#ece7dc]/18 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            {hud.muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label={isTouch ? stripPcKeyHints(t.pauseGame) : t.pauseGame}
            title={isTouch ? stripPcKeyHints(t.pauseGame) : t.pauseGame}
            className="w-9 h-9 flex items-center justify-center rounded bg-[#0d121b]/88 border border-[#ece7dc]/18 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Compact Ammo Badge tucked top-right so bottom-right stays clean for Fire button */}
        {isTouch && (
          <div className="px-2.5 py-1 rounded bg-[#0d121b]/86 border border-[#ece7dc]/14 flex items-baseline gap-2 font-mono-num">
            <span className="text-[10px] uppercase text-[#9aa3b0]">
              {hud.reloading ? t.reloading : activeWeaponText.shortName}
            </span>
            <span className="font-display text-xl font-bold text-[#e8963a] leading-none">
              {activeAmmo.mag}
            </span>
            <span className="text-[11px] text-[#9aa3b0]">/{activeAmmo.reserve}</span>
          </div>
        )}

        {/* Compact LAN Co-op Squad Panel (only visible during active LAN Co-op sessions) */}
        {hud.coop.active && (
          <div
            data-testid="coop-squad-hud"
            className="w-56 px-2.5 py-2 rounded bg-[#0d121b]/88 border border-[#5fa88e]/45 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num uppercase tracking-wider whitespace-nowrap">
              <span className="text-[#5fa88e] font-bold">
                {t.lanCoop.squadHeading}
              </span>
              <span className="text-[#e8963a] font-bold tracking-widest">
                {hud.coop.roomCode}
              </span>
            </div>
            {hud.coop.squad.length === 0 ? (
              <div className="text-[10px] font-mono-num text-[#9aa3b0]">
                {hud.language === 'ru' ? 'Ожидание напарников...' : 'Waiting for squad...'}
              </div>
            ) : (
              <div className="space-y-1">
                {hud.coop.squad.map((mate) => {
                  const pct = Math.max(
                    0,
                    Math.min(100, (mate.hp / Math.max(1, mate.maxHp)) * 100)
                  );
                  return (
                    <div key={mate.id} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num">
                        <span className="text-[#ece7dc] font-semibold truncate">
                          {mate.name}
                        </span>
                        <span
                          className={
                            mate.isDowned
                              ? 'text-[#ff7878] font-bold'
                              : 'text-[#9aa3b0]'
                          }
                        >
                          {mate.isDowned
                            ? hud.language === 'ru'
                              ? 'РАНЕН'
                              : 'DOWN'
                            : `${mate.distanceMeters}${t.metersSuffix}`}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-[#1a2230] rounded-xs overflow-hidden">
                        <div
                          className={`h-full ${
                            mate.isDowned ? 'bg-[#c93b3b]' : 'bg-[#5fa88e]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isTouch && (
              <div className="pt-1 border-t border-[#ece7dc]/10 text-[9px] font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                {t.lanCoop.pingHint}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP BOTTOM-LEFT CLUSTER: Health + Stamina + Rooster Companion (Hidden on Mobile Touch) */}
      {!isTouch && (
        <div className="fixed bottom-3 sm:bottom-4 left-2.5 sm:left-4 w-[170px] sm:w-72 space-y-2">
          <div className="bg-[#0d121b]/86 border border-[#ece7dc]/14 px-3 py-2 rounded flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 min-w-0">
              <RoosterCrestIcon className="w-6 h-6 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-wider">
                  <span className="text-[#e8963a] font-bold">{loc(t.petyaName)}</span>
                  <span className="text-[#9aa3b0]" aria-hidden="true">·</span>
                  <span className="text-[#ece7dc]/80">
                    {t.patsLabel} {hud.rooster.patCount}
                  </span>
                </div>
                <div className="text-[11px] text-[#ece7dc]/80 truncate">
                  {hud.rooster.statusBanner}
                </div>
              </div>
            </div>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPatRooster();
              }}
              aria-label={loc(t.patAria)}
              className="shrink-0 px-2 py-1 rounded bg-[#1d2636] border border-[#e8963a]/45 text-[#e8963a] font-mono-num text-[10px] font-semibold hover:bg-[#e8963a] hover:text-[#0b0f17] transition-colors cursor-pointer whitespace-nowrap"
            >
              [{patKey}]
            </button>
          </div>

          <div className="bg-[#0d121b]/86 border border-[#ece7dc]/14 px-3.5 py-2.5 rounded">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] font-mono-num uppercase tracking-widest text-[#9aa3b0]">
                {t.vitality}
              </span>
              <span
                className={`font-display text-2xl font-bold leading-none font-mono-num ${
                  lowHp ? 'text-[#c93b3b]' : 'text-[#ece7dc]'
                }`}
              >
                {hud.hp}
              </span>
            </div>
            <div className="relative h-2 w-full bg-[#1a2230] rounded-xs overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#e8963a]/70 transition-all duration-300"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                  lowHp ? 'bg-[#c93b3b]' : 'bg-[#5fa88e]'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="mt-1.5 h-1 w-full bg-[#1a2230] rounded-xs overflow-hidden">
              <div
                className="h-full bg-[#e8963a]/80"
                style={{ width: `${hud.stamina}%` }}
              />
            </div>
            <div className="mt-2 pt-1.5 border-t border-[#ece7dc]/10 flex items-center justify-between gap-2 text-[10px] font-mono-num uppercase tracking-wider">
              <span className="text-[#e8963a] font-bold truncate">
                {t.levelShort} {hud.character.level} · {rankTitle}
              </span>
              <span className="text-[#9aa3b0] shrink-0">
                {hud.character.level >= 5
                  ? 'MAX'
                  : `${hud.character.xp}/${hud.character.nextLevelXp}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP BOTTOM-RIGHT CLUSTER: Active Weapon Readout + 1-5 Arsenal Strip (Hidden on Mobile Touch) */}
      {!isTouch && (
        <div className="fixed bottom-3 sm:bottom-4 right-2.5 sm:right-4 w-[192px] sm:w-[320px] space-y-1.5">
          <div className="bg-[#0d121b]/86 border border-[#ece7dc]/14 px-3.5 py-2.5 rounded">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display text-base font-bold tracking-wider uppercase text-[#ece7dc] leading-none truncate">
                  {activeWeaponText.name}
                </div>
                <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#9aa3b0] mt-1">
                  {reloadLine}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <WeaponSilhouetteIcon
                  weaponId={hud.activeWeapon}
                  className="w-12 h-6 text-[#ece7dc]/85"
                />
                <div className="font-mono-num leading-none text-right">
                  <span className="font-display text-3xl font-bold text-[#e8963a]">
                    {activeAmmo.mag}
                  </span>
                  <span className="text-xs text-[#9aa3b0] ml-1">
                    /{activeAmmo.reserve}
                  </span>
                </div>
              </div>
            </div>

            {(hud.reloading || hud.activeWeapon === 'minigun') && (
              <div className="mt-2 h-1.5 w-full bg-[#1a2230] rounded-xs overflow-hidden">
                <div
                  className="h-full bg-[#e8963a]"
                  style={{
                    width: `${
                      hud.reloading
                        ? Math.round(hud.reloadProgress * 100)
                        : Math.round(hud.minigunSpin * 100)
                    }%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* 1-5 Weapon Switcher Strip */}
          <div className="grid grid-cols-5 gap-1 pointer-events-auto">
            {WEAPON_ORDER.map((wid) => {
              const w = WEAPONS[wid];
              const wText = t.weapons[wid];
              const active = wid === hud.activeWeapon;
              return (
                <button
                  key={wid}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectWeapon(wid);
                  }}
                  aria-label={`${wText.name} [${w.slotKey}]`}
                  className={`px-1 py-1.5 rounded border text-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#e8963a] border-[#e8963a] text-[#0b0f17]'
                      : 'bg-[#0d121b]/86 border-[#ece7dc]/14 text-[#ece7dc]/80 hover:border-[#ece7dc]/40'
                  }`}
                >
                  <div className="font-mono-num text-[9px] font-bold leading-none">
                    [{w.slotKey}]
                  </div>
                  <div className="font-display text-[10px] font-bold tracking-normal whitespace-nowrap mt-0.5">
                    {wText.shortName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtle Pointer-Lock Prompt (Desktop PC ONLY — never shown on touch smartphones or narrow portrait) */}
      {!hud.pointerLocked && !isTouch && (
        <div className="hidden lg:block fixed bottom-4 left-1/2 -translate-x-1/2 max-w-[min(540px,calc(100vw-680px))] truncate px-3 py-1 rounded bg-[#0d121b]/80 border border-[#ece7dc]/14 text-[10.5px] font-mono-num text-[#ece7dc]/75 tracking-wide whitespace-nowrap">
          {loc(t.pointerLockHint).replace('[F]', `[${patKey}]`)}
        </div>
      )}

    </div>
  );
}
