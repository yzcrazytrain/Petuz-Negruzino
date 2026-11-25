import { useState } from 'react';
import { BookOpen, Crosshair, ShieldAlert, Users, X, Zap } from 'lucide-react';
import { UPGRADE_IDS, WEAPON_ORDER, WEAPONS } from '../game/constants';
import { localizeRoosterCopy, stripPcKeyHints, TRANSLATIONS } from '../game/i18n';
import { computeCoopScaling } from '../game/rules';
import type { Language, RoosterNameId, WeaponId } from '../game/types';
import { RoosterCrestIcon, WeaponSilhouetteIcon } from './GameIcons';

type SpecsTab = 'weapons' | 'upgrades' | 'enemies' | 'coop';

interface HubSpecsModalProps {
  language: Language;
  roosterName: RoosterNameId;
  activeWeapon: WeaponId;
  isTouchDevice: boolean;
  onSelectWeapon: (id: WeaponId) => void;
  onClose: () => void;
}

export function HubSpecsModal({
  language,
  roosterName,
  activeWeapon,
  isTouchDevice,
  onSelectWeapon,
  onClose,
}: HubSpecsModalProps) {
  const [tab, setTab] = useState<SpecsTab>('weapons');
  const t = TRANSLATIONS[language];
  const s = t.specsModal;
  const loc = (text: string) => {
    const withRooster = localizeRoosterCopy(text, language, roosterName);
    return isTouchDevice ? stripPcKeyHints(withRooster) : withRooster;
  };

  const scalingRows = [1, 2, 3, 4].map((n) => computeCoopScaling(n));

  return (
    <div
      data-testid="hub-specs-modal"
      role="dialog"
      aria-modal="true"
      aria-label={s.title}
      className="fixed inset-0 z-40 bg-[#070a10]/84 flex items-center justify-center p-3 sm:p-5"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded bg-[#101622] border border-[#e8963a]/45 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ece7dc]/14 bg-[#151d2c] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#e8963a]">
              <BookOpen className="w-5 h-5 shrink-0" />
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wider uppercase text-[#ece7dc]">
                {s.title}
              </h2>
            </div>
            <p className="text-xs text-[#a5b0c0] mt-1">{s.subtitle}</p>
          </div>
          <button
            type="button"
            data-testid="hub-specs-close"
            onClick={onClose}
            aria-label={s.closeBtn}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded border border-[#ece7dc]/20 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-3 border-b border-[#ece7dc]/10 flex flex-wrap gap-2 bg-[#0d131d]">
          {(
            [
              { id: 'weapons', label: s.tabWeapons, Icon: Crosshair },
              { id: 'upgrades', label: s.tabUpgrades, Icon: Zap },
              { id: 'enemies', label: s.tabEnemies, Icon: ShieldAlert },
              { id: 'coop', label: s.tabCoop, Icon: Users },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              data-specs-tab={id}
              onClick={() => setTab(id)}
              className={`px-3.5 py-2 rounded text-xs font-mono-num uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                  : 'bg-[#161f2f] text-[#9aa3b0] hover:text-[#ece7dc]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: WEAPONS */}
          {tab === 'weapons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WEAPON_ORDER.map((wid) => {
                const w = WEAPONS[wid];
                const wText = t.weapons[wid];
                const rpm = Math.round(60 / w.fireInterval);
                const selected = wid === activeWeapon;
                const specialNote =
                  wid === 'shotgun'
                    ? language === 'ru'
                      ? 'Ваншот вблизи, мощный отброс'
                      : 'Point-blank one-shot + heavy knockback'
                    : wid === 'awp'
                      ? language === 'ru'
                        ? 'Оптика 3.2×, х2.25 крит в голову'
                        : '3.2× Optic scope, 2.25× headshot'
                      : wid === 'pistol'
                        ? language === 'ru'
                          ? 'Высокая мобильность, точный хэдшот'
                          : 'High mobility, crisp headshot punch'
                        : wid === 'minigun'
                          ? language === 'ru'
                            ? `Раскрутка ${w.spinUpTime}с, подавление толпы`
                            : `${w.spinUpTime}s spin-up, crowd shredder`
                          : language === 'ru'
                            ? 'Автоперезарядка на нуле, 50 патр.'
                            : 'Auto-reloads on empty, 50-rd mag';

                return (
                  <div
                    key={wid}
                    data-testid={`spec-weapon-${wid}`}
                    className={`p-3.5 rounded border space-y-2.5 ${
                      selected
                        ? 'bg-[#1a2434] border-[#e8963a]'
                        : 'bg-[#131b29] border-[#ece7dc]/14'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {!isTouchDevice && (
                            <span className="px-1.5 py-0.5 rounded bg-[#0b1019] border border-[#e8963a]/40 font-mono-num text-[10px] font-bold text-[#e8963a]">
                              [{w.slotKey}]
                            </span>
                          )}
                          <h3 className="font-display text-base font-bold uppercase tracking-wide text-[#ece7dc] truncate">
                            {wText.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-[#9aa3b0] mt-0.5">{wText.role}</p>
                      </div>
                      <WeaponSilhouetteIcon
                        weaponId={wid}
                        className="w-14 h-7 text-[#e8963a]/90 shrink-0"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono-num pt-1 border-t border-[#ece7dc]/10">
                      <div className="flex justify-between gap-1">
                        <span className="text-[#9aa3b0]">{s.statDamage}:</span>
                        <span className="text-[#ece7dc] font-bold">
                          {w.pellets > 1 ? `${w.damage}×${w.pellets}` : w.damage}
                        </span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-[#9aa3b0]">{s.statRpm}:</span>
                        <span className="text-[#ece7dc] font-bold">{rpm}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-[#9aa3b0]">{s.statMag}:</span>
                        <span className="text-[#e8963a] font-bold">
                          {w.magSize}/{w.maxReserve}
                        </span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-[#9aa3b0]">{s.statReload}:</span>
                        <span className="text-[#ece7dc] font-bold">
                          {w.reloadTime}
                          {s.secSuffix}
                        </span>
                      </div>
                      <div className="flex justify-between gap-1 col-span-2">
                        <span className="text-[#9aa3b0]">{s.statRange}:</span>
                        <span className="text-[#5fa88e] font-bold">
                          {w.maxRange}
                          {t.metersSuffix}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#ece7dc]/10">
                      <span className="text-[11px] text-[#c5d0df] leading-snug">
                        {specialNote}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectWeapon(wid);
                          onClose();
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-mono-num font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                          selected
                            ? 'bg-[#5fa88e] text-[#0b0f17]'
                            : 'bg-[#e8963a] text-[#0b0f17] hover:bg-[#f2a853]'
                        }`}
                      >
                        {selected
                          ? language === 'ru'
                            ? 'В руках'
                            : 'Equipped'
                          : language === 'ru'
                            ? 'Взять в тир'
                            : 'Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: .EXE UPGRADES */}
          {tab === 'upgrades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPGRADE_IDS.map((uid) => {
                const upg = t.upgrades[uid];
                return (
                  <div
                    key={uid}
                    className="p-3.5 rounded bg-[#131b29] border border-[#ece7dc]/14 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold uppercase text-[#ece7dc]">
                        {loc(upg.name)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#1f293b] border border-[#e8963a]/40 font-mono-num text-[10px] font-bold text-[#e8963a] shrink-0">
                        {upg.tag}
                      </span>
                    </div>
                    <p className="text-xs text-[#c5d0df] leading-relaxed">
                      {loc(upg.desc)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: ENEMIES & ROOSTER */}
          {tab === 'enemies' && (
            <div className="space-y-3">
              <div className="p-4 rounded bg-[#152420] border border-[#5fa88e]/45 flex items-start gap-3">
                <RoosterCrestIcon className="w-8 h-8 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold uppercase tracking-wider text-[#9cecd0]">
                    {loc(s.roosterCardTitle)}
                  </h3>
                  <p className="text-xs text-[#d6e4de] leading-relaxed">
                    {loc(s.roosterCardDesc)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {s.enemyProfiles.map((ep) => (
                  <div
                    key={ep.kind}
                    className="p-3.5 rounded bg-[#131b29] border border-[#ece7dc]/14 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold uppercase text-[#ece7dc]">
                        {t.enemyNames[ep.kind]}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#241316] border border-[#c93b3b]/50 font-mono-num text-[10px] font-bold text-[#f3baba]">
                        {ep.hp}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono-num text-[#e8963a]">
                      {s.enemySpeedLabel}: {ep.speed}
                    </div>
                    <p className="text-xs text-[#c5d0df] leading-snug">{loc(ep.behavior)}</p>
                    <p className="text-[11px] text-[#7fe0bd] leading-snug border-t border-[#ece7dc]/10 pt-1.5">
                      {loc(ep.counter)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CO-OP SCALING TABLE */}
          {tab === 'coop' && (
            <div className="space-y-4">
              <p className="text-xs text-[#c5d0df] leading-relaxed">{s.coopIntro}</p>

              <div className="overflow-x-auto rounded border border-[#ece7dc]/14">
                <table className="w-full text-left border-collapse font-mono-num text-xs">
                  <thead>
                    <tr className="bg-[#162030] text-[#e8963a] uppercase text-[10px]">
                      <th className="px-3 py-2.5">{s.coopColPlayers}</th>
                      <th className="px-3 py-2.5">{s.coopColHp}</th>
                      <th className="px-3 py-2.5">{s.coopColDmg}</th>
                      <th className="px-3 py-2.5">{s.coopColSpeed}</th>
                      <th className="px-3 py-2.5">{s.coopColCaps}</th>
                      <th className="px-3 py-2.5">{s.coopColKills}</th>
                      <th className="px-3 py-2.5">{s.coopColLoot}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece7dc]/10 bg-[#111824]">
                    {scalingRows.map((row) => (
                      <tr key={row.playerCount} className="text-[#ece7dc]">
                        <td className="px-3 py-2 font-bold text-[#5fa88e]">
                          ×{row.playerCount}
                        </td>
                        <td className="px-3 py-2">×{row.enemyHpMult.toFixed(2)}</td>
                        <td className="px-3 py-2">×{row.enemyDamageMult.toFixed(2)}</td>
                        <td className="px-3 py-2">×{row.enemySpeedMult.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          +{row.maxActiveBonus} / ×{row.spawnRateMult.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">×{row.killTargetMult.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[#e8963a]">
                          +{Math.round(row.pickupDropChanceBonus * 100)}% / ×
                          {row.ammoRefillMult.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded bg-[#131e24] border border-[#5fa88e]/35 text-xs text-[#c9e6dc] leading-relaxed">
                {s.coopRulesNote}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#ece7dc]/12 bg-[#0d131d] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded bg-[#e8963a] text-[#0b0f17] font-display text-sm font-bold uppercase tracking-wider hover:bg-[#f2a853] cursor-pointer"
          >
            {s.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
