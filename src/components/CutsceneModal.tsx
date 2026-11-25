import { useEffect, useState } from 'react';
import { ChevronRight, SkipForward } from 'lucide-react';
import { localizeRoosterCopy, TRANSLATIONS } from '../game/i18n';
import type { CutsceneDef, Language, RoosterNameId } from '../game/types';

interface CutsceneModalProps {
  language: Language;
  roosterName: RoosterNameId;
  cutscene: CutsceneDef;
  beatIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
}

export function CutsceneModal({
  language,
  roosterName,
  cutscene,
  beatIndex,
  onAdvance,
  onSkip,
}: CutsceneModalProps) {
  const t = TRANSLATIONS[language];
  const loc = (text: string) => localizeRoosterCopy(text, language, roosterName);
  const beat = cutscene.beats[beatIndex] ?? cutscene.beats[0];
  const beatText = loc(beat.text);
  const beatSpeaker = loc(beat.speaker);
  const cutsceneTitle = loc(cutscene.title);
  const cutsceneSubtitle = loc(cutscene.subtitle);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);
    const fullLen = beatText.length;
    const interval = window.setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= fullLen) {
          window.clearInterval(interval);
          return fullLen;
        }
        return prev + 3;
      });
    }, 18);
    return () => window.clearInterval(interval);
  }, [cutscene.id, beatIndex, beatText]);

  const isLastBeat = beatIndex >= cutscene.beats.length - 1;
  const shownText = beatText.slice(0, visibleChars);

  return (
    <div
      className="fixed inset-0 z-30 bg-transparent flex flex-col justify-between overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={cutsceneTitle}
    >
      {/* 2.39:1 Cinema Letterbox Top Bar */}
      <div className="h-14 md:h-16 px-6 md:px-10 bg-[#06090f]/95 border-b border-[#ece7dc]/12 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 text-xs md:text-sm font-mono-num text-[#9aa3b0] min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[#c93b3b] font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#c93b3b] animate-pulse" aria-hidden="true" />
            <span>REC</span>
          </span>
          <span className="text-[#e8963a] font-semibold shrink-0">{cutsceneTitle}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{cutsceneSubtitle}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onSkip();
          }}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] hover:text-[#ece7dc] transition-colors cursor-pointer"
        >
          <span>{t.skipCutscene}</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transparent Live 3D In-Engine Machinima Stage (zero static AI art!) */}
      <div className="relative flex-1 overflow-hidden bg-transparent pointer-events-none">
        {/* Subtle 1994 35mm / Camcorder viewfinder corner brackets */}
        <div className="absolute top-5 left-6 w-6 h-6 border-t-2 border-l-2 border-[#ece7dc]/30" />
        <div className="absolute top-5 right-6 w-6 h-6 border-t-2 border-r-2 border-[#ece7dc]/30" />
        <div className="absolute bottom-5 left-6 w-6 h-6 border-b-2 border-l-2 border-[#ece7dc]/30" />
        <div className="absolute bottom-5 right-6 w-6 h-6 border-b-2 border-r-2 border-[#ece7dc]/30" />
        <div className="absolute top-6 right-14 font-mono-num text-[10px] tracking-[0.22em] text-[#ece7dc]/50 uppercase hud-text-shadow">
          NEGRUZINO · 14.10.1994 · CAM-0{cutscene.chapter}
        </div>
        <div className="absolute inset-0 vhs-scanlines opacity-35" />
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background:
              'linear-gradient(to top, rgba(6,9,15,0.82) 0%, rgba(6,9,15,0) 100%)',
          }}
        />
      </div>

      {/* Bottom Cinematic Dialogue Letterbox */}
      <div className="bg-[#06090f]/95 border-t border-[#ece7dc]/14 px-6 md:px-14 py-5 md:py-6 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center flex-wrap gap-3 text-xs font-mono-num tracking-widest uppercase">
              <span className="text-[#e8963a] font-semibold">{beatSpeaker}</span>
              <span className="text-[#9aa3b0]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#5fa88e]">{beat.timestamp}</span>
              <span className="text-[#9aa3b0]" aria-hidden="true">
                ·
              </span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {cutscene.beats.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-xs transition-all ${
                      idx === beatIndex
                        ? 'w-5 bg-[#e8963a]'
                        : idx < beatIndex
                          ? 'w-2.5 bg-[#5fa88e]/75'
                          : 'w-2.5 bg-[#ece7dc]/20'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[#9aa3b0]">
                {beatIndex + 1} / {cutscene.beats.length}
              </span>
            </div>
            <p className="text-base md:text-lg text-[#ece7dc] leading-relaxed min-h-[3.5rem]">
              {shownText}
            </p>
            <div className="text-[11px] font-mono-num text-[#9aa3b0]/75 tracking-wide">
              {t.cutsceneKeyHint}
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              if (visibleChars < beatText.length) {
                setVisibleChars(beatText.length);
              } else {
                onAdvance();
              }
            }}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded bg-[#e8963a] text-[#0b0f17] font-display text-lg font-bold tracking-wider uppercase hover:bg-[#f2a853] transition-colors cursor-pointer"
          >
            <span>{isLastBeat ? t.enterNegruzino : t.continueBtn}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
