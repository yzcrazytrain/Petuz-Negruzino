import { DIFFICULTY_ORDER } from '../game/constants';
import { localizeRoosterCopy, TRANSLATIONS } from '../game/i18n';
import type {
  DifficultyId,
  HudSnapshot,
  Language,
  RoosterNameId,
  ScreamerIntensity,
} from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onNextLoop: () => void;
  onReturnTitle: () => void;
  onOpenWorkshop: () => void;
  onChangeScreamerIntensity: (mode: ScreamerIntensity) => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeRoosterName: (name: RoosterNameId) => void;
  onChangeDifficulty: (difficulty: DifficultyId) => void;
  onChangeSensitivity: (sensitivity: number) => void;
}

export function StatusModal({
  hud,
  onResume,
  onRestart,
  onNextLoop,
  onReturnTitle,
  onOpenWorkshop,
  onChangeScreamerIntensity,
  onChangeLanguage,
  onChangeRoosterName,
  onChangeDifficulty,
  onChangeSensitivity,
}: StatusModalProps) {
  const t = TRANSLATIONS[hud.language];
  const loc = (text: string) => localizeRoosterCopy(text, hud.language, hud.roosterName);
  const isPause = hud.phase === 'paused';
  const isVictory = hud.phase === 'victory';

  const heading = isPause
    ? t.pauseHeading
    : isVictory
      ? t.victoryHeading
      : t.gameoverHeading;

  const subcopy = loc(
    isPause
      ? t.pauseSubcopy
      : isVictory
        ? t.victorySubcopy
        : t.gameoverSubcopy
  );

  const mins = Math.floor(hud.elapsedSec / 60);
  const secs = hud.elapsedSec % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-30 bg-[#070a10]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div className="w-full max-w-md rounded bg-[#0e141f] border border-[#ece7dc]/18 p-6 space-y-5 shadow-2xl">
        <div>
          <div className="text-xs font-mono-num uppercase tracking-widest text-[#e8963a]">
            {hud.chapterTitle} · {hud.clockLabel} · {t.loopBadge(hud.loopNumber)} · {t.score} {hud.score}
          </div>
          <h2 className="mt-1 font-display text-4xl font-bold tracking-wider uppercase text-[#ece7dc]">
            {heading}
          </h2>
          <p className="mt-1.5 text-sm text-[#9aa3b0]">{subcopy}</p>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded bg-[#141c2a] border border-[#ece7dc]/10 p-3">
            <div className="text-[11px] font-mono-num text-[#9aa3b0] uppercase">
              {t.statTime}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-[#ece7dc]">
              {timeStr}
            </div>
          </div>
          <div className="rounded bg-[#141c2a] border border-[#ece7dc]/10 p-3">
            <div className="text-[11px] font-mono-num text-[#9aa3b0] uppercase">
              {t.statEntities}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-[#e8963a]">
              {hud.kills}
            </div>
          </div>
          <div className="rounded bg-[#141c2a] border border-[#ece7dc]/10 p-3">
            <div className="text-[11px] font-mono-num text-[#9aa3b0] uppercase">
              {loc(t.statPats)}
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-[#5fa88e]">
              {hud.rooster.patCount}
            </div>
          </div>
        </div>

        {/* Settings inside Pause: Language & Screamer Intensity */}
        {isPause && (
          <div className="border-y border-[#ece7dc]/10 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[#ece7dc]">{t.languageLabel}</span>
              <div className="flex items-center gap-1 bg-[#141c2a] p-1 rounded border border-[#ece7dc]/10">
                <button
                  type="button"
                  data-lang="ru"
                  onClick={() => onChangeLanguage('ru')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.language === 'ru'
                      ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  Русский
                </button>
                <button
                  type="button"
                  data-lang="en"
                  onClick={() => onChangeLanguage('en')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.language === 'en'
                      ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[#ece7dc]">{t.roosterNameLabel}</span>
              <div className="flex items-center gap-1 bg-[#141c2a] p-1 rounded border border-[#ece7dc]/10">
                <button
                  type="button"
                  data-rooster-name="grisha"
                  onClick={() => onChangeRoosterName('grisha')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.roosterName === 'grisha'
                      ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  {t.roosterGrisha}
                </button>
                <button
                  type="button"
                  data-rooster-name="vanya"
                  onClick={() => onChangeRoosterName('vanya')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.roosterName === 'vanya'
                      ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  {t.roosterVanya}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[#ece7dc]">{t.difficultyLabel}</span>
              <div className="flex items-center gap-1 bg-[#141c2a] p-1 rounded border border-[#ece7dc]/10">
                {DIFFICULTY_ORDER.map((diffId) => (
                  <button
                    key={diffId}
                    type="button"
                    onClick={() => onChangeDifficulty(diffId)}
                    className={`px-2.5 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                      hud.difficulty === diffId
                        ? diffId === 'hard'
                          ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                          : 'bg-[#e8963a] text-[#0b0f17] font-bold'
                        : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                    }`}
                  >
                    {t.difficulties[diffId].label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="text-sm font-sans text-[#ece7dc]">
                  {t.sensitivityLabel}
                </span>
                <span className="text-[#e8963a] font-bold">
                  ×{hud.mouseSensitivity.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={hud.mouseSensitivity}
                onChange={(e) => onChangeSensitivity(Number(e.target.value))}
                className="w-full accent-[#e8963a]"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[#ece7dc]">
                {t.screamerIntensityLabel}
              </span>
              <div className="flex items-center gap-1 bg-[#141c2a] p-1 rounded border border-[#ece7dc]/10">
                <button
                  type="button"
                  onClick={() => onChangeScreamerIntensity('full')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.screamerIntensity === 'full'
                      ? 'bg-[#c93b3b] text-[#ece7dc]'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  {t.screamerFull}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScreamerIntensity('reduced')}
                  className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                    hud.screamerIntensity === 'reduced'
                      ? 'bg-[#e8963a] text-[#0b0f17]'
                      : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                  }`}
                >
                  {t.screamerReduced}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary & Secondary Actions */}
        <div className="space-y-2.5 pt-1">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-xl font-bold tracking-wider uppercase hover:bg-[#f2a853] transition-colors cursor-pointer"
            >
              {t.resumeGame}
            </button>
          ) : isVictory ? (
            <>
              <button
                type="button"
                data-next-loop="true"
                onClick={onNextLoop}
                className="w-full py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-xl font-bold tracking-wider uppercase hover:bg-[#f2a853] transition-colors cursor-pointer"
              >
                {t.nextLoopBtn(hud.loopNumber + 1)}
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="w-full py-2.5 rounded border border-[#ece7dc]/25 bg-[#141c2a] text-[#ece7dc] font-display text-lg font-semibold tracking-wider uppercase hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
              >
                {t.playAgain}
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-xl font-bold tracking-wider uppercase hover:bg-[#f2a853] transition-colors cursor-pointer"
            >
              {t.tryAgain}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenWorkshop}
              className="py-2.5 px-2 rounded border border-[#ece7dc]/20 bg-[#141c2a] text-sm font-medium text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer truncate"
            >
              {t.settingsBtn}
            </button>
            <button
              type="button"
              onClick={isPause ? onRestart : onReturnTitle}
              className="py-2.5 px-2 rounded border border-[#ece7dc]/20 bg-[#141c2a] text-sm font-medium text-[#ece7dc] hover:border-[#ece7dc]/50 transition-colors cursor-pointer truncate"
            >
              {isPause ? t.restartRun : t.titleScreen}
            </button>
          </div>

          {isPause && (
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2 text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] hover:text-[#ece7dc] transition-colors cursor-pointer"
            >
              {t.returnToTitle}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
