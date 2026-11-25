import { Download, Infinity as InfinityIcon, Settings, Sliders, Volume2, VolumeX } from 'lucide-react';
import { DIFFICULTY_ORDER } from '../game/constants';
import { requestLandscapeMode } from '../game/device';
import { localizeRoosterCopy, TRANSLATIONS } from '../game/i18n';
import type { DifficultyId, Language, RoosterNameId, RunRecords } from '../game/types';
import { NegruzinoTitleLockup } from './GameIcons';

interface TitleScreenProps {
  language: Language;
  roosterName: RoosterNameId;
  difficulty: DifficultyId;
  muted: boolean;
  isTouchDevice: boolean;
  records: RunRecords;
  onChangeDifficulty: (difficulty: DifficultyId) => void;
  onStartStory: () => void;
  onQuickPlay: () => void;
  onStartEndless: () => void;
  onOpenWorkshop: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  language,
  roosterName,
  difficulty,
  muted,
  isTouchDevice,
  records,
  onChangeDifficulty,
  onStartStory,
  onQuickPlay,
  onStartEndless,
  onOpenWorkshop,
  onOpenSettings,
  onToggleMute,
}: TitleScreenProps) {
  const t = TRANSLATIONS[language];

  const handleLaunch = (action: () => void) => {
    if (isTouchDevice) {
      void requestLandscapeMode();
    }
    action();
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 md:p-12 overflow-y-auto">
      {/* Left-third negative-space dark atmospheric vignette scrim for high legibility */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(8,12,19,0.88) 0%, rgba(8,12,19,0.62) 44%, rgba(8,12,19,0.12) 100%)',
        }}
      />

      {/* Top row: compact export, Settings & sound utility controls */}
      <div className="flex items-center justify-end gap-2 pointer-events-auto shrink-0">
        {!isTouchDevice && (
          <a
            href="/downloads/NEGRUZINO.html"
            download="NEGRUZINO.html"
            title={t.downloadHtmlBtn}
            className="h-9 px-3 flex items-center gap-2 rounded border border-[#ece7dc]/20 bg-[#0d121b]/90 text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">HTML</span>
          </a>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenSettings();
          }}
          aria-label={t.settingsBtn}
          title={t.settingsBtn}
          className="h-9 px-3 flex items-center gap-2 rounded border border-[#ece7dc]/20 bg-[#0d121b]/90 text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t.settingsBtn}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? t.unmuteAudio : t.muteAudio}
          title={muted ? t.unmuteAudio : t.muteAudio}
          className="w-9 h-9 flex items-center justify-center rounded border border-[#ece7dc]/20 bg-[#0d121b]/90 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Left-third hero composition over calm negative space */}
      <div className="max-w-xl pointer-events-auto space-y-4 my-auto py-2">
        <NegruzinoTitleLockup language={language} />

        <p className="text-xs sm:text-sm md:text-base text-[#ece7dc]/85 leading-relaxed max-w-md hud-text-shadow">
          {localizeRoosterCopy(t.titleDescription, language, roosterName)}
        </p>

        {records.bestScore > 0 && (
          <div className="inline-block px-3 py-1 rounded bg-[#0d121b]/86 border border-[#e8963a]/35 font-mono-num text-xs text-[#e8963a] tracking-wider uppercase">
            {t.bestRecordLine(records.bestScore, records.bestLoop)}
          </div>
        )}

        {/* Compact Difficulty Selector */}
        <div className="space-y-1 max-w-md">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[11px] font-mono-num uppercase tracking-widest text-[#9aa3b0] shrink-0">
              {t.difficultyLabel}:
            </span>
            <div
              role="group"
              aria-label={t.difficultyLabel}
              className="inline-flex items-center gap-1 p-1 rounded bg-[#0d121b]/90 border border-[#ece7dc]/16"
            >
              {DIFFICULTY_ORDER.map((diffId) => {
                const active = difficulty === diffId;
                return (
                  <button
                    key={diffId}
                    type="button"
                    data-difficulty={diffId}
                    aria-pressed={active}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onChangeDifficulty(diffId);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono-num uppercase tracking-wider transition-colors cursor-pointer ${
                      active
                        ? diffId === 'hard'
                          ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                          : 'bg-[#e8963a] text-[#0b0f17] font-bold'
                        : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                    }`}
                  >
                    {t.difficulties[diffId].label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-[#9aa3b0] hud-text-shadow">
            {t.difficulties[difficulty].hint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              handleLaunch(onStartStory);
            }}
            className="px-6 py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-lg sm:text-xl font-bold tracking-wider uppercase hover:bg-[#f2a853] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-black/50"
          >
            {t.playStory}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              handleLaunch(onQuickPlay);
            }}
            className="px-5 py-3 rounded border border-[#ece7dc]/25 bg-[#111824]/90 text-[#ece7dc] font-display text-base sm:text-lg font-semibold tracking-wider uppercase hover:border-[#ece7dc]/60 transition-colors cursor-pointer"
          >
            {t.jumpIntoStreet}
          </button>

          <button
            type="button"
            data-endless="true"
            onClick={(e) => {
              e.currentTarget.blur();
              handleLaunch(onStartEndless);
            }}
            className="px-4 py-3 rounded border border-[#c93b3b]/55 bg-[#1a0e12]/90 text-[#f3c6c6] font-display text-base sm:text-lg font-semibold tracking-wider uppercase inline-flex items-center gap-2 hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <InfinityIcon className="w-4 h-4" />
            <span>{t.endlessBtn}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenWorkshop();
            }}
            className="px-4 py-3 rounded border border-[#ece7dc]/20 bg-[#0d121b]/90 text-[#ece7dc]/90 text-xs sm:text-sm font-medium inline-flex items-center gap-2 hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>{t.musicAndTextures}</span>
          </button>
        </div>
      </div>

      {/* Single flat desktop keyboard-hint line (hidden on touch smartphones) */}
      {!isTouchDevice ? (
        <div className="text-xs text-[#ece7dc]/68 font-mono-num tracking-wide hud-text-shadow shrink-0">
          {t.controlsHint}
        </div>
      ) : (
        <div className="h-1 shrink-0" />
      )}
    </div>
  );
}
