import { localizeRoosterCopy, stripPcKeyHints, TRANSLATIONS } from '../game/i18n';
import type { Language, RoosterNameId, UpgradeId } from '../game/types';

interface UpgradeModalProps {
  language: Language;
  roosterName: RoosterNameId;
  loopNumber: number;
  choices: UpgradeId[];
  ownedCount: number;
  isTouchDevice?: boolean;
  onSelect: (id: UpgradeId) => void;
}

export function UpgradeModal({
  language,
  roosterName,
  loopNumber,
  choices,
  ownedCount,
  isTouchDevice = false,
  onSelect,
}: UpgradeModalProps) {
  const t = TRANSLATIONS[language];
  const loc = (text: string) => {
    const localized = localizeRoosterCopy(text, language, roosterName);
    return isTouchDevice ? stripPcKeyHints(localized) : localized;
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-[#06090f]/88 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.upgradeModalTitle}
    >
      <div className="w-full max-w-3xl rounded bg-[#0e141f] border border-[#e8963a]/35 shadow-2xl overflow-hidden">
        {/* Atmospheric 1994 Substation Field Upgrade Header */}
        <div className="px-5 py-3 bg-[#141d2c] border-b border-[#ece7dc]/12 flex items-center justify-between gap-3">
          <div className="font-display text-lg md:text-xl font-bold tracking-wider uppercase text-[#e8963a] truncate">
            {t.upgradeModalTitle}
          </div>
          <div className="font-mono-num text-[11px] text-[#9aa3b0] shrink-0">
            #{ownedCount + 1} · {t.loopBadge(loopNumber)}
          </div>
        </div>

        <div className="p-4 md:p-6 bg-[#0e141f] text-[#ece7dc] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece7dc]/14 pb-3">
            <p className="text-sm text-[#ece7dc]/90">
              {isTouchDevice
                ? stripPcKeyHints(t.upgradeModalSubtitle(loopNumber))
                : t.upgradeModalSubtitle(loopNumber)}
            </p>
            {!isTouchDevice && (
              <span className="font-mono-num text-[11px] text-[#e8963a] uppercase tracking-wider">
                {t.upgradeKeyHint}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {choices.map((id, idx) => {
              const info = t.upgrades[id];
              return (
                <button
                  key={id}
                  type="button"
                  data-upgrade={id}
                  onClick={() => onSelect(id)}
                  className="group text-left rounded bg-[#0b1018] border border-[#ece7dc]/18 hover:border-[#e8963a] hover:bg-[#171f2e] p-4 flex flex-col justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {!isTouchDevice && (
                        <span className="px-2 py-0.5 rounded bg-[#e8963a] text-[#0b0f17] font-mono-num text-xs font-bold">
                          [{idx + 1}]
                        </span>
                      )}
                      <span className="font-mono-num text-[10px] uppercase tracking-wider text-[#5fa88e] border border-[#5fa88e]/40 px-1.5 py-0.5 rounded">
                        {info.tag}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold tracking-wide uppercase text-[#ece7dc] group-hover:text-[#e8963a] transition-colors leading-tight">
                      {loc(info.name)}
                    </h3>

                    <p className="text-xs leading-relaxed text-[#c6ccd6]">
                      {loc(info.desc)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#ece7dc]/10 flex items-center justify-between text-[11px] font-mono-num text-[#e8963a] uppercase tracking-wider">
                    <span>{language === 'ru' ? 'ВЫБРАТЬ' : 'SELECT'}</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
