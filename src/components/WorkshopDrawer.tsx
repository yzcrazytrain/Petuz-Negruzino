import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Disc3,
  Download,
  Globe,
  HardDriveDownload,
  Keyboard,
  Move,
  Music,
  Paintbrush,
  Play,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  DIFFICULTY_ORDER,
  MUSIC_TRACKS,
  TEXTURE_PACKS,
  WEAPON_ORDER,
  WEAPONS,
} from '../game/constants';
import { localizeRoosterCopy, stripPcKeyHints, TRANSLATIONS } from '../game/i18n';
import {
  BINDABLE_ACTION_ORDER,
  formatBindingLabel,
  isValidBindingCode,
  mouseButtonToBindingCode,
} from '../game/keybinds';
import type {
  BindableAction,
  CutsceneDef,
  CustomTextureSpec,
  DifficultyId,
  KeybindMap,
  Language,
  MusicSettings,
  RoosterNameId,
  ScreamerIntensity,
  TexturePatternKind,
  TextureSlot,
} from '../game/types';

export type WorkshopTabId = 'music' | 'textures' | 'story';

interface WorkshopDrawerProps {
  language: Language;
  roosterName: RoosterNameId;
  difficulty: DifficultyId;
  mouseSensitivity: number;
  keybinds: KeybindMap;
  initialTab?: WorkshopTabId;
  screamerIntensity: ScreamerIntensity;
  musicSettings: MusicSettings;
  collectedTapes: string[];
  isTouchDevice?: boolean;
  onOpenHudEditor?: () => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeRoosterName: (name: RoosterNameId) => void;
  onChangeDifficulty: (difficulty: DifficultyId) => void;
  onChangeSensitivity: (sensitivity: number) => void;
  onRebindAction: (action: BindableAction, code: string) => void;
  onResetKeybinds: () => void;
  onKeybindCaptureChange: (active: boolean) => void;
  onChangeScreamerIntensity: (mode: ScreamerIntensity) => void;
  onUpdateMusic: (partial: Partial<MusicSettings>) => void;
  onAddCustomMusicFiles: (files: File[]) => Promise<void>;
  onSelectCustomTrack: (id: string) => void;
  onRemoveCustomTrack: (id: string) => Promise<void>;
  onStopCustomPlayback: () => void;
  onClearAllCustomTracks: () => Promise<void>;
  onApplyTexturePack: (packId: string) => void;
  onApplyCustomTexture: (spec: CustomTextureSpec) => void;
  onUploadTexture: (slot: TextureSlot, file: File) => Promise<void>;
  onPlayCutscene: (cutscene: CutsceneDef) => void;
  onPreviewScreamer: () => void;
  onClose: () => void;
}

const PATTERN_KEYS: TexturePatternKind[] = [
  'stucco_brick',
  'timber_planks',
  'cracked_asphalt',
  'concrete_panels',
  'night_grass',
  'anomaly_grid',
];

export function WorkshopDrawer({
  language,
  roosterName,
  difficulty,
  mouseSensitivity,
  keybinds,
  initialTab = 'music',
  screamerIntensity,
  musicSettings,
  collectedTapes,
  isTouchDevice = false,
  onOpenHudEditor,
  onChangeLanguage,
  onChangeRoosterName,
  onChangeDifficulty,
  onChangeSensitivity,
  onRebindAction,
  onResetKeybinds,
  onKeybindCaptureChange,
  onChangeScreamerIntensity,
  onUpdateMusic,
  onAddCustomMusicFiles,
  onSelectCustomTrack,
  onRemoveCustomTrack,
  onStopCustomPlayback,
  onClearAllCustomTracks,
  onApplyTexturePack,
  onApplyCustomTexture,
  onUploadTexture,
  onPlayCutscene,
  onPreviewScreamer,
  onClose,
}: WorkshopDrawerProps) {
  const t = TRANSLATIONS[language];
  const loc = (text: string) => localizeRoosterCopy(text, language, roosterName);
  const [tab, setTab] = useState<WorkshopTabId>(initialTab);
  const [activePack, setActivePack] = useState('classic_1994');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [listeningAction, setListeningAction] = useState<BindableAction | null>(null);

  useEffect(() => {
    onKeybindCaptureChange(listeningAction !== null);
    if (!listeningAction) return;

    const handleCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      if (isValidBindingCode(e.code)) {
        onRebindAction(listeningAction, e.code);
        setListeningAction(null);
      }
    };

    const handleCaptureMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code = mouseButtonToBindingCode(e.button);
      if (code) {
        onRebindAction(listeningAction, code);
      }
      setListeningAction(null);
    };

    const blockBrowserSideNav = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleCaptureKey, true);
    window.addEventListener('mousedown', handleCaptureMouseDown, true);
    window.addEventListener('mouseup', blockBrowserSideNav, true);
    window.addEventListener('auxclick', blockBrowserSideNav, true);
    window.addEventListener('contextmenu', blockBrowserSideNav, true);
    return () => {
      window.removeEventListener('keydown', handleCaptureKey, true);
      window.removeEventListener('mousedown', handleCaptureMouseDown, true);
      window.removeEventListener('mouseup', blockBrowserSideNav, true);
      window.removeEventListener('auxclick', blockBrowserSideNav, true);
      window.removeEventListener('contextmenu', blockBrowserSideNav, true);
    };
  }, [listeningAction, onKeybindCaptureChange, onRebindAction]);

  useEffect(() => {
    return () => onKeybindCaptureChange(false);
  }, [onKeybindCaptureChange]);

  const [texSpec, setTexSpec] = useState<CustomTextureSpec>({
    slot: 'house',
    pattern: 'stucco_brick',
    primaryHex: '#9d9585',
    secondaryHex: '#635345',
    grime: 0.6,
    wear: 0.55,
  });

  const handleApplyCustom = () => {
    onApplyCustomTexture(texSpec);
    setActivePack('custom');
    setStatusMessage(
      t.msgAppliedCustom(t.patterns[texSpec.pattern], t.surfaceSlots[texSpec.slot])
    );
  };

  const handleTextureUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onUploadTexture(texSpec.slot, file);
      setActivePack('custom');
      setStatusMessage(t.msgAppliedUpload(file.name, t.surfaceSlots[texSpec.slot]));
    } catch {
      setStatusMessage(t.msgUploadError);
    }
    e.target.value = '';
  };

  const handleAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    e.target.value = '';
    setUploadingAudio(true);
    setStatusMessage(t.audioUploading);
    try {
      await onAddCustomMusicFiles(files);
      const rawMsg =
        files.length === 1
          ? t.msgLoadedAudio(files[0].name)
          : t.cassetteTracksLoaded(files.length);
      setStatusMessage(isTouchDevice ? stripPcKeyHints(rawMsg) : rawMsg);
    } catch {
      setStatusMessage(t.audioUploadError);
    } finally {
      setUploadingAudio(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-[#070a10]/82 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.studioTitle}
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded bg-[#0e141f] border border-[#ece7dc]/18 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ece7dc]/12 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wider uppercase text-[#ece7dc]">
              {t.studioTitle}
            </h2>
            <p className="text-xs text-[#9aa3b0]">{t.studioSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeStudio}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded border border-[#ece7dc]/18 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Controls */}
        <div className="px-6 pt-4 flex flex-wrap items-center gap-2 border-b border-[#ece7dc]/10 pb-3">
          <button
            type="button"
            onClick={() => setTab('music')}
            className={`px-4 py-2 rounded text-xs font-mono-num uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer ${
              tab === 'music'
                ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                : 'bg-[#141c2a] text-[#9aa3b0] hover:text-[#ece7dc]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{t.tabMusic}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('textures')}
            className={`px-4 py-2 rounded text-xs font-mono-num uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer ${
              tab === 'textures'
                ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                : 'bg-[#141c2a] text-[#9aa3b0] hover:text-[#ece7dc]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{t.tabTextures}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('story')}
            className={`px-4 py-2 rounded text-xs font-mono-num uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer ${
              tab === 'story'
                ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                : 'bg-[#141c2a] text-[#9aa3b0] hover:text-[#ece7dc]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.tabStorySettings}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMessage && (
            <div className="px-3.5 py-2 rounded bg-[#142420] border border-[#5fa88e]/45 text-xs text-[#9de0c7]">
              {statusMessage}
            </div>
          )}

          {/* TAB 1: REAL MP3 CASSETTE DECK & BUILT-IN SOUNDTRACKS */}
          {tab === 'music' && (
            <div className="space-y-5">
              {/* Persistent IndexedDB Multi-Track Cassette Deck for Real Studio MP3s */}
              <div
                data-testid="cassette-deck-card"
                className="p-4 rounded bg-[#141c2a] border border-[#e8963a]/40 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-bold">
                      <Disc3 className="w-4 h-4 shrink-0" />
                      <span>{t.cassetteDeckHeading}</span>
                    </div>
                    <p className="text-xs text-[#c7cfd9] mt-1.5 leading-relaxed">
                      {isTouchDevice ? stripPcKeyHints(t.cassetteDeckNote) : t.cassetteDeckNote}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={`px-3.5 py-2 rounded bg-[#e8963a] text-[#0b0f17] font-mono-num text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${
                      uploadingAudio
                        ? 'opacity-60 pointer-events-none'
                        : 'hover:bg-[#f2a853] cursor-pointer'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadingAudio ? t.audioUploading : t.cassetteAddFiles}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      disabled={uploadingAudio}
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>

                  {musicSettings.activeCustomTrackId && (
                    <button
                      type="button"
                      onClick={() => onStopCustomPlayback()}
                      className="px-3 py-2 rounded border border-[#ece7dc]/22 text-xs font-mono-num text-[#ece7dc] hover:border-[#e8963a] cursor-pointer"
                    >
                      {t.restoreSynth}
                    </button>
                  )}

                  {musicSettings.customPlaylist.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void onClearAllCustomTracks()}
                      className="px-3 py-2 rounded border border-[#c93b3b]/45 text-xs font-mono-num text-[#f3baba] hover:bg-[#c93b3b]/20 cursor-pointer"
                    >
                      {t.cassetteClearAll}
                    </button>
                  )}
                </div>

                {musicSettings.customPlaylist.length === 0 ? (
                  <div className="px-3 py-2 rounded bg-[#0c121c] border border-[#ece7dc]/10 text-xs text-[#9aa3b0]">
                    {t.cassetteEmpty}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {musicSettings.customPlaylist.map((tr, index) => {
                      const isActive = musicSettings.activeCustomTrackId === tr.id;
                      return (
                        <div
                          key={tr.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded border ${
                            isActive
                              ? 'bg-[#1f293b] border-[#e8963a]'
                              : 'bg-[#0e1522] border-[#ece7dc]/10'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCustomTrack(tr.id);
                              setStatusMessage(t.msgNowPlaying(tr.name));
                            }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <Play
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? 'text-[#e8963a]' : 'text-[#9aa3b0]'
                              }`}
                            />
                            <span className="font-mono-num text-[11px] text-[#9aa3b0] shrink-0">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="text-xs font-medium text-[#ece7dc] truncate">
                              {tr.name}
                            </span>
                            {isActive && (
                              <span className="ml-auto px-1.5 py-0.5 rounded bg-[#e8963a]/20 text-[10px] font-mono-num font-bold text-[#e8963a] shrink-0">
                                {t.cassettePlayingTag}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={t.cassetteRemoveTrack(tr.name)}
                            onClick={() => void onRemoveCustomTrack(tr.id)}
                            className="p-1 text-[#9aa3b0] hover:text-[#f3baba] cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] mb-2.5">
                  {t.originalSoundtracks}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MUSIC_TRACKS.map((track) => {
                    const trackCopy = t.musicTracks[track.id];
                    const selected =
                      !musicSettings.activeCustomTrackId &&
                      musicSettings.trackId === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          onStopCustomPlayback();
                          onUpdateMusic({
                            trackId: track.id,
                            bpm: track.defaultBpm,
                          });
                          setStatusMessage(t.msgNowPlaying(loc(trackCopy.name)));
                        }}
                        className={`text-left p-3 rounded border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#1c2535] border-[#e8963a]'
                            : 'bg-[#121926] border-[#ece7dc]/10 hover:border-[#ece7dc]/30'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#ece7dc]">
                          {loc(trackCopy.name)}
                        </div>
                        <div className="text-xs text-[#9aa3b0] mt-0.5">
                          {loc(trackCopy.mood)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Synth Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#9aa3b0]">{t.tempoBpm}</span>
                    <span className="text-[#e8963a]">{musicSettings.bpm}</span>
                  </div>
                  <input
                    type="range"
                    min={65}
                    max={145}
                    value={musicSettings.bpm}
                    onChange={(e) =>
                      onUpdateMusic({ bpm: Number(e.target.value) })
                    }
                    className="w-full accent-[#e8963a]"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#9aa3b0]">{t.fogDrone}</span>
                    <span className="text-[#e8963a]">
                      {Math.round(musicSettings.fogDrone * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(musicSettings.fogDrone * 100)}
                    onChange={(e) =>
                      onUpdateMusic({ fogDrone: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-[#e8963a]"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#9aa3b0]">{t.tapeWarble}</span>
                    <span className="text-[#e8963a]">
                      {Math.round(musicSettings.tapeWarble * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(musicSettings.tapeWarble * 100)}
                    onChange={(e) =>
                      onUpdateMusic({
                        tapeWarble: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full accent-[#e8963a]"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span className="text-[#9aa3b0]">{t.musicVolume}</span>
                    <span className="text-[#e8963a]">
                      {Math.round(musicSettings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(musicSettings.volume * 100)}
                    onChange={(e) =>
                      onUpdateMusic({ volume: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-[#e8963a]"
                  />
                </label>
              </div>

            </div>
          )}

          {/* TAB 2: CUSTOM 3D TEXTURE LAB */}
          {tab === 'textures' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] mb-2.5">
                  {t.texturePacksHeading}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEXTURE_PACKS.map((pack) => {
                    const packCopy = t.texturePacks[pack.id] ?? {
                      name: pack.name,
                      description: pack.description,
                    };
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          onApplyTexturePack(pack.id);
                          setActivePack(pack.id);
                          setStatusMessage(t.msgAppliedPack(packCopy.name));
                        }}
                        className={`text-left p-3 rounded border transition-colors cursor-pointer ${
                          activePack === pack.id
                            ? 'bg-[#1c2535] border-[#e8963a]'
                            : 'bg-[#121926] border-[#ece7dc]/10 hover:border-[#ece7dc]/30'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#ece7dc]">
                          {packCopy.name}
                        </div>
                        <div className="text-xs text-[#9aa3b0] mt-0.5">
                          {packCopy.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Procedural Per-Surface Forge */}
              <div className="pt-3 border-t border-[#ece7dc]/10 space-y-3">
                <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                  {t.surfaceBuilderHeading}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['house', 'fence', 'road', 'lawn'] as TextureSlot[]).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTexSpec((s) => ({ ...s, slot }))}
                      className={`py-2 rounded text-xs font-mono-num uppercase border cursor-pointer ${
                        texSpec.slot === slot
                          ? 'bg-[#e8963a] border-[#e8963a] text-[#0b0f17] font-bold'
                          : 'bg-[#141c2a] border-[#ece7dc]/12 text-[#ece7dc]'
                      }`}
                    >
                      {t.surfaceSlots[slot]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs text-[#9aa3b0]">{t.patternLabel}</span>
                    <select
                      value={texSpec.pattern}
                      onChange={(e) =>
                        setTexSpec((s) => ({
                          ...s,
                          pattern: e.target.value as TexturePatternKind,
                        }))
                      }
                      className="w-full px-2.5 py-2 rounded bg-[#141c2a] border border-[#ece7dc]/18 text-xs text-[#ece7dc]"
                    >
                      {PATTERN_KEYS.map((pk) => (
                        <option key={pk} value={pk}>
                          {t.patterns[pk]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-[#9aa3b0]">
                      {t.baseColorLabel}
                    </span>
                    <input
                      type="color"
                      value={texSpec.primaryHex}
                      onChange={(e) =>
                        setTexSpec((s) => ({ ...s, primaryHex: e.target.value }))
                      }
                      className="w-full h-9 rounded bg-[#141c2a] border border-[#ece7dc]/18 cursor-pointer"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-[#9aa3b0]">
                      {t.accentColorLabel}
                    </span>
                    <input
                      type="color"
                      value={texSpec.secondaryHex}
                      onChange={(e) =>
                        setTexSpec((s) => ({
                          ...s,
                          secondaryHex: e.target.value,
                        }))
                      }
                      className="w-full h-9 rounded bg-[#141c2a] border border-[#ece7dc]/18 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-xs font-mono-num">
                      <span className="text-[#9aa3b0]">{t.grimeLabel}</span>
                      <span className="text-[#e8963a]">
                        {Math.round(texSpec.grime * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(texSpec.grime * 100)}
                      onChange={(e) =>
                        setTexSpec((s) => ({
                          ...s,
                          grime: Number(e.target.value) / 100,
                        }))
                      }
                      className="w-full accent-[#e8963a]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex justify-between text-xs font-mono-num">
                      <span className="text-[#9aa3b0]">{t.wearLabel}</span>
                      <span className="text-[#e8963a]">
                        {Math.round(texSpec.wear * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(texSpec.wear * 100)}
                      onChange={(e) =>
                        setTexSpec((s) => ({
                          ...s,
                          wear: Number(e.target.value) / 100,
                        }))
                      }
                      className="w-full accent-[#e8963a]"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="px-4 py-2 rounded bg-[#e8963a] text-[#0b0f17] font-display text-sm font-bold tracking-wider uppercase hover:bg-[#f2a853] cursor-pointer"
                  >
                    {t.applyToSurface(texSpec.slot)}
                  </button>

                  <label className="px-3.5 py-2 rounded bg-[#141c2a] border border-[#ece7dc]/20 text-xs font-medium text-[#ece7dc] inline-flex items-center gap-1.5 hover:border-[#e8963a] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.uploadImageTexture}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTextureUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LANGUAGE SETTINGS, CUTSCENES & ARSENAL DOSSIER */}
          {tab === 'story' && (
            <div className="space-y-5">
              {/* Language & Screamer Settings Panel */}
              <div className="p-4 rounded bg-[#121926] border border-[#ece7dc]/14 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-semibold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{t.languageSettingsHeading}</span>
                    </div>
                    <p className="text-xs text-[#9aa3b0] mt-1">
                      {loc(t.languageSettingsDesc)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12 shrink-0">
                    <button
                      type="button"
                      data-studio-lang="ru"
                      onClick={() => onChangeLanguage('ru')}
                      className={`px-3.5 py-1.5 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        language === 'ru'
                          ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      Русский
                    </button>
                    <button
                      type="button"
                      data-studio-lang="en"
                      onClick={() => onChangeLanguage('en')}
                      className={`px-3.5 py-1.5 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        language === 'en'
                          ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Rooster Companion Name Selector (Grisha default / Vanya) */}
                <div className="pt-3 border-t border-[#ece7dc]/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] font-semibold">
                      {t.roosterNameLabel}
                    </div>
                    <p className="text-xs text-[#9aa3b0] mt-0.5">
                      {t.roosterNameDesc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12 shrink-0">
                    <button
                      type="button"
                      data-studio-rooster="grisha"
                      onClick={() => onChangeRoosterName('grisha')}
                      className={`px-3.5 py-1.5 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        roosterName === 'grisha'
                          ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      {t.roosterGrisha}
                    </button>
                    <button
                      type="button"
                      data-studio-rooster="vanya"
                      onClick={() => onChangeRoosterName('vanya')}
                      className={`px-3.5 py-1.5 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        roosterName === 'vanya'
                          ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      {t.roosterVanya}
                    </button>
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="pt-3 border-t border-[#ece7dc]/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] font-semibold">
                      {t.difficultyLabel}
                    </div>
                    <p className="text-xs text-[#9aa3b0] mt-0.5">
                      {t.difficulties[difficulty].hint}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12 shrink-0">
                    {DIFFICULTY_ORDER.map((diffId) => (
                      <button
                        key={diffId}
                        type="button"
                        data-studio-difficulty={diffId}
                        onClick={() => onChangeDifficulty(diffId)}
                        className={`px-3 py-1.5 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                          difficulty === diffId
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

                {/* Mouse Sensitivity Slider */}
                <div className="pt-3 border-t border-[#ece7dc]/10">
                  <label className="block space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono-num">
                      <span className="uppercase tracking-wider text-[#ece7dc] font-semibold">
                        {t.sensitivityLabel}
                      </span>
                      <span className="text-[#e8963a] font-bold">
                        ×{mouseSensitivity.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={mouseSensitivity}
                      onChange={(e) => onChangeSensitivity(Number(e.target.value))}
                      className="w-full accent-[#e8963a]"
                    />
                  </label>
                </div>

                <div className="pt-3 border-t border-[#ece7dc]/10 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono-num uppercase tracking-wider text-[#ece7dc]">
                    {t.screamerIntensityLabel}
                  </span>
                  <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12">
                    <button
                      type="button"
                      onClick={() => onChangeScreamerIntensity('full')}
                      className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        screamerIntensity === 'full'
                          ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      {t.screamerFull}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeScreamerIntensity('reduced')}
                      className={`px-3 py-1 text-xs font-mono-num uppercase rounded transition-colors cursor-pointer ${
                        screamerIntensity === 'reduced'
                          ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                      }`}
                    >
                      {t.screamerReduced}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Touch HUD Editor Card (Touch) vs PC Keyboard & Mouse Rebind Panel (Desktop) */}
              {isTouchDevice ? (
                <div
                  data-testid="mobile-hud-editor-card"
                  className="p-4 rounded bg-[#121926] border border-[#e8963a]/35 space-y-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-semibold">
                      <Move className="w-3.5 h-3.5" />
                      <span>{t.hudEditorTitle}</span>
                    </div>
                    <p className="text-xs text-[#9aa3b0] mt-1 leading-relaxed">
                      {t.hudEditorDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="open-hud-editor-btn"
                    onClick={() => onOpenHudEditor?.()}
                    className="w-full py-2.5 px-4 rounded bg-[#e8963a] text-[#0b0f17] font-display text-sm font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-[#f2a853] transition-colors cursor-pointer"
                  >
                    <Move className="w-4 h-4 shrink-0" />
                    <span>{t.hudEditorOpenBtn}</span>
                  </button>
                </div>
              ) : (
                <div
                  data-testid="keybinds-panel"
                  className="p-4 rounded bg-[#121926] border border-[#e8963a]/30 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-semibold">
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>{t.controlsHeading}</span>
                      </div>
                      <p className="text-xs text-[#9aa3b0] mt-1 leading-relaxed">
                        {t.controlsDesc}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="reset-keybinds-btn"
                      onClick={() => {
                        setListeningAction(null);
                        onResetKeybinds();
                      }}
                      className="px-2.5 py-1.5 rounded border border-[#ece7dc]/18 bg-[#0b1019] text-[11px] font-mono-num uppercase tracking-wider text-[#9aa3b0] hover:border-[#e8963a] hover:text-[#e8963a] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.controlsResetBtn}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BINDABLE_ACTION_ORDER.map((action) => {
                      const isListening = listeningAction === action;
                      const label = localizeRoosterCopy(
                        t.bindActions[action],
                        language,
                        roosterName
                      );
                      return (
                        <button
                          key={action}
                          type="button"
                          data-rebind-action={action}
                          onClick={() =>
                            setListeningAction(isListening ? null : action)
                          }
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded border text-left transition-colors cursor-pointer ${
                            isListening
                              ? 'bg-[#2a1d10] border-[#e8963a] text-[#fff2de]'
                              : 'bg-[#0b1019] border-[#ece7dc]/14 text-[#ece7dc] hover:border-[#e8963a]/60'
                          }`}
                        >
                          <span className="text-xs truncate">{label}</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono-num text-[11px] font-bold shrink-0 ${
                              isListening
                                ? 'bg-[#e8963a] text-[#0b0f17] animate-pulse'
                                : 'bg-[#1a2334] border border-[#ece7dc]/16 text-[#e8963a]'
                            }`}
                          >
                            {isListening
                              ? t.controlsListening
                              : formatBindingLabel(keybinds[action], language)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standalone Offline HTML & Desktop Electron .EXE Export Card */}
              <div className="p-4 rounded bg-[#121926] border border-[#e8963a]/30 space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-semibold">
                    <HardDriveDownload className="w-3.5 h-3.5" />
                    <span>{t.exportHeading}</span>
                  </div>
                  <p className="text-xs text-[#9aa3b0] mt-1 leading-relaxed">
                    {t.exportDesc}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="/downloads/NEGRUZINO.html"
                    download="NEGRUZINO.html"
                    data-export="html"
                    className="px-3.5 py-2.5 rounded bg-[#e8963a] text-[#0b0f17] font-mono-num text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:bg-[#f2a853] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.downloadHtmlBtn}</span>
                  </a>
                  <a
                    href="/downloads/NEGRUZINO-Desktop-EXE-Project.zip"
                    download="NEGRUZINO-Desktop-EXE-Project.zip"
                    data-export="exe-zip"
                    className="px-3.5 py-2.5 rounded bg-[#1a2436] border border-[#ece7dc]/25 text-[#ece7dc] font-mono-num text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.downloadDesktopBtn}</span>
                  </a>
                </div>
              </div>

              {/* Recovered MK-60 Story Cassette Tapes Dossier */}
              <div
                data-testid="story-tapes-dossier"
                className="p-4 rounded bg-[#121926] border border-[#e8963a]/30 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-semibold">
                    <Disc3 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.tapeArchiveHeading}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0b1019] border border-[#e8963a]/40 font-mono-num text-[11px] font-bold text-[#e8963a]">
                    {collectedTapes.length} / {Object.keys(t.storyTapes).length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(t.storyTapes).map(([tapeId, meta]) => {
                    const unlocked = collectedTapes.includes(tapeId);
                    return (
                      <div
                        key={tapeId}
                        data-tape-id={tapeId}
                        className={`p-3 rounded border space-y-1 ${
                          unlocked
                            ? 'bg-[#172132] border-[#e8963a]/45'
                            : 'bg-[#0c111b] border-[#ece7dc]/10 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num uppercase tracking-wider">
                          <span className={unlocked ? 'text-[#e8963a] font-bold' : 'text-[#9aa3b0]'}>
                            {meta.code}
                          </span>
                          <span className="text-[#9aa3b0] truncate">{meta.location}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#ece7dc]">
                          {unlocked ? loc(meta.title) : '???'}
                        </div>
                        {unlocked ? (
                          <>
                            <div className="text-[10px] font-mono-num text-[#5fa88e] uppercase">
                              {loc(meta.speaker)}
                            </div>
                            <p className="text-[11px] text-[#d5dce6] leading-relaxed">
                              {loc(meta.text)}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-[#7f8999] leading-snug">
                            {t.tapeLockedHint}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                    {t.cutsceneArchiveHeading}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onPreviewScreamer();
                    }}
                    className="px-3 py-1 rounded bg-[#2a1216] border border-[#c93b3b]/60 text-xs font-mono-num text-[#f3baba] inline-flex items-center gap-1.5 hover:bg-[#c93b3b] hover:text-white transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>{t.testScreamer}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ...t.chapterMeta.map((c) => c.introCutscene),
                    t.victoryCutscene,
                  ].map((cs) => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onPlayCutscene(cs);
                      }}
                      className="text-left p-3 rounded bg-[#121926] border border-[#ece7dc]/12 hover:border-[#e8963a] transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-semibold text-[#ece7dc]">
                        {loc(cs.title)}
                      </div>
                      <div className="text-xs text-[#9aa3b0] mt-0.5 line-clamp-1">
                        {loc(cs.subtitle)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#ece7dc]/10">
                <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0] mb-2">
                  {t.arsenalGuideHeading}
                </h3>
                <div className="space-y-1.5 text-xs">
                  {WEAPON_ORDER.map((wid) => {
                    const w = WEAPONS[wid];
                    const wText = t.weapons[wid];
                    return (
                      <div
                        key={wid}
                        className="flex items-center justify-between py-1.5 border-b border-[#ece7dc]/8 gap-2"
                      >
                        <div>
                          <span className="font-mono-num text-[#e8963a] mr-2">
                            [{w.slotKey}]
                          </span>
                          <span className="font-semibold text-[#ece7dc]">
                            {wText.name}
                          </span>
                        </div>
                        <span className="text-[#9aa3b0] text-right">
                          {wText.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
